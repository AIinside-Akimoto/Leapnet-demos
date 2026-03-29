import { NextResponse } from "next/server"
import { neon } from "@neondatabase/serverless"
import { handleUpload, type HandleUploadBody } from "@vercel/blob/client"

// Handle client-side upload - generates upload token
export async function POST(request: Request) {
  try {
    // Get token from query parameter
    const url = new URL(request.url)
    const token = url.searchParams.get("token")
    
    if (!token) {
      return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
    }

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

    const body = (await request.json()) as HandleUploadBody

    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        return {
          allowedContentTypes: ["image/jpeg", "image/png", "image/webp", "image/heic"],
          tokenPayload: JSON.stringify({
            userId: sessions[0].user_id,
          }),
        }
      },
      onUploadCompleted: async () => {
        // Upload completed
      },
    })

    return NextResponse.json(jsonResponse)
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "アップロードに失敗しました" },
      { status: 500 }
    )
  }
}
