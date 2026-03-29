import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { put } from "@vercel/blob"

export async function POST(request: Request) {
  try {
    // Verify authentication
    const authHeader = request.headers.get("Authorization")
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
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
      return NextResponse.json({ error: "無効なセッションです" }, { status: 401 })
    }

    // Get form data
    const formData = await request.formData()
    const imageFile = formData.get("image") as File | null

    if (!imageFile) {
      return NextResponse.json({ error: "画像ファイルが必要です" }, { status: 400 })
    }

    // Upload to Vercel Blob
    const blob = await put(`shelf-images/${Date.now()}-${imageFile.name}`, imageFile, {
      access: "public",
    })

    return NextResponse.json({ 
      url: blob.url,
      pathname: blob.pathname 
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: "アップロードに失敗しました" },
      { status: 500 }
    )
  }
}
