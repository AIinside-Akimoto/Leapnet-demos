import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(req: NextRequest) {
  // Verify authentication
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")

  if (!token) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  const sql = getDb()
  const rows = await sql`
    SELECT s.user_id FROM sessions s
    WHERE s.token = ${token} AND s.expires_at > NOW()
  `

  if (rows.length === 0) {
    return NextResponse.json({ error: "セッションが無効です" }, { status: 401 })
  }

  try {
    const formData = await req.formData()
    const audioFile = formData.get("audio") as File

    if (!audioFile) {
      return NextResponse.json({ error: "音声ファイルが必要です" }, { status: 400 })
    }

    // Get OpenAI API key from environment
    const openaiApiKey = process.env.OPENAI_API_KEY
    if (!openaiApiKey) {
      return NextResponse.json({ error: "OpenAI APIキーが設定されていません" }, { status: 500 })
    }

    // Prepare form data for OpenAI Whisper API
    const whisperFormData = new FormData()
    whisperFormData.append("file", audioFile, "audio.webm")
    whisperFormData.append("model", "whisper-1")
    whisperFormData.append("language", "ja")
    whisperFormData.append("response_format", "json")

    // Call OpenAI Whisper API
    const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
      },
      body: whisperFormData,
    })

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      console.error("Whisper API error:", errorData)
      return NextResponse.json(
        { error: "音声の文字起こしに失敗しました" },
        { status: response.status }
      )
    }

    const result = await response.json()
    return NextResponse.json({ text: result.text })

  } catch (error) {
    console.error("Transcription error:", error)
    return NextResponse.json(
      { error: "音声の文字起こし中にエラーが発生しました" },
      { status: 500 }
    )
  }
}
