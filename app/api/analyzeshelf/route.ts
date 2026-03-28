import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

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

    const apiUrl = process.env.SHELF_ANALYZER_API_URL
    const apiKey = process.env.SHELF_ANALYZER_API_KEY

    if (!apiUrl || !apiKey) {
      return NextResponse.json(
        { error: "API設定が不足しています" },
        { status: 500 }
      )
    }

    // Get form data from request
    const formData = await request.formData()
    const imageFile = formData.get("image") as File | null
    
    if (!imageFile) {
      return NextResponse.json({ error: "画像ファイルが必要です" }, { status: 400 })
    }

    console.log("[v0] Image file:", imageFile.name, imageFile.size, imageFile.type)
    console.log("[v0] API URL:", `${apiUrl}/analyze-shelf`)

    // Create new FormData for external API
    const externalFormData = new FormData()
    externalFormData.append("image", imageFile)
    
    // Forward the request to the external API
    const response = await fetch(`${apiUrl}/analyze-shelf`, {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
      },
      body: externalFormData,
    })

    console.log("[v0] API Response status:", response.status)
    
    const responseText = await response.text()
    console.log("[v0] API Response text:", responseText.substring(0, 200))

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
    console.error("Shelf analyzer API error:", error)
    return NextResponse.json(
      { error: "棚分析処理中にエラーが発生しました" },
      { status: 500 }
    )
  }
}
