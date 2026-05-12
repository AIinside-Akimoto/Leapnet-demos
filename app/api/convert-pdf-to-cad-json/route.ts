import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

// Increase timeout for external API calls (max 60s on Pro plan)
export const maxDuration = 60

export async function POST(request: NextRequest) {
  try {
    // Verify auth token
    const authHeader = request.headers.get("Authorization")
    if (!authHeader?.startsWith("Bearer ")) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

    const token = authHeader.split(" ")[1]
    const sql = neon(process.env.DATABASE_URL!)
    
    const sessions = await sql`
      SELECT s.*, u.username, u.is_admin 
      FROM sessions s 
      JOIN app_users u ON s.user_id = u.id 
      WHERE s.token = ${token} AND s.expires_at > NOW()
    `

    if (sessions.length === 0) {
      return NextResponse.json({ error: "セッションが無効です" }, { status: 401 })
    }

    const apiUrl = process.env.CAD_CONVERTER_API_URL
    const apiKey = process.env.CAD_CONVERTER_API_KEY

    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        { error: "API設定が不足しています" },
        { status: 500 }
      )
    }

    // Get form data from request
    const formData = await request.formData()
    const file = formData.get("file") as File | null
    const floor = formData.get("floor") as string | null
    
    if (!file) {
      return NextResponse.json({ error: "ファイルが必要です" }, { status: 400 })
    }
    
    if (!floor) {
      return NextResponse.json({ error: "階数の指定が必要です" }, { status: 400 })
    }

    // Create new FormData for external API
    const externalFormData = new FormData()
    externalFormData.append("file", file)
    externalFormData.append("floor", floor)
    
    // Forward the request to the external API
    const response = await fetch(`${apiUrl}/convert-pdf-to-cad-json`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
      },
      body: externalFormData,
    })

    const responseText = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        { error: `APIエラー: ${response.status}`, details: responseText },
        { status: response.status }
      )
    }

    try {
      const data = JSON.parse(responseText)
      return NextResponse.json(data)
    } catch {
      return NextResponse.json(
        { error: "APIレスポンスの解析に失敗しました", details: responseText },
        { status: 500 }
      )
    }
  } catch (error) {
    return NextResponse.json(
      { error: "CAD JSON変換中にエラーが発生しました" },
      { status: 500 }
    )
  }
}
