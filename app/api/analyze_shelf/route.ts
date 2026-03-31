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
    const storeId = formData.get("store_id") as string
    const shelfId = formData.get("shelf_id") as string
    const timestamp = formData.get("timestamp") as string
    const imageWidth = formData.get("image_width") as string
    const imageHeight = formData.get("image_height") as string
    
    if (!imageFile) {
      return NextResponse.json({ error: "画像ファイルが必要です" }, { status: 400 })
    }

    // Create new FormData for external API with all required fields
    const externalFormData = new FormData()
    externalFormData.append("file", imageFile)
    externalFormData.append("store_id", storeId || "store-001")
    externalFormData.append("shelf_id", shelfId || "shelf-001")
    externalFormData.append("timestamp", timestamp || new Date().toISOString())
    if (imageWidth) externalFormData.append("image_width", imageWidth)
    if (imageHeight) externalFormData.append("image_height", imageHeight)
    
    // Forward the request to the external API
    const response = await fetch(`${apiUrl}/analyze_shelf`, {
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
      { error: "棚分析処理中にエラーが発生しました" },
      { status: 500 }
    )
  }
}
