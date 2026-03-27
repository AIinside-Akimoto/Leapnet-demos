import { NextRequest, NextResponse } from "next/server"

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { transcription } = body

    if (!transcription || typeof transcription !== "string" || transcription.trim() === "") {
      return NextResponse.json(
        { error: "音声内容が取得できませんでした" },
        { status: 400 }
      )
    }

    const apiUrl = process.env.DOCS_GENERATOR_API_URL
    const apiKey = process.env.DOCS_GENERATOR_API_KEY

    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        { error: "API設定が不足しています" },
        { status: 500 }
      )
    }

    const response = await fetch(`${apiUrl}/create-specdocs`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify({ transcription }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error("API Error:", response.status, errorText)
      return NextResponse.json(
        { error: `APIエラー: ${response.status}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    return NextResponse.json(data)
  } catch (error) {
    console.error("DocsGenerator API Error:", error)
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    )
  }
}
