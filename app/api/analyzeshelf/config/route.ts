import { NextRequest, NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"

export async function GET(request: NextRequest) {
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

    // Return API config for client-side request
    return NextResponse.json({
      apiUrl: `${apiUrl}/analyze_shelf`,
      apiKey: apiKey,
    })
  } catch (error) {
    console.error("Config API error:", error)
    return NextResponse.json(
      { error: "設定の取得中にエラーが発生しました" },
      { status: 500 }
    )
  }
}
