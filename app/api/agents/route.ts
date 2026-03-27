import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// GET - List all agents
export async function GET() {
  const sql = getDb()

  const agents = await sql`
    SELECT 
      a.id,
      a.name,
      a.url,
      a.comment,
      a.likes,
      a.created_by,
      a.created_at,
      a.updated_at,
      u.username as creator_name
    FROM agent_library a
    LEFT JOIN app_users u ON u.id = a.created_by
    ORDER BY a.likes DESC, a.updated_at DESC
  `

  return NextResponse.json(agents)
}

// POST - Create a new agent
export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")

  if (!token) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  const sql = getDb()

  // Verify session
  const sessions = await sql`
    SELECT s.user_id, s.is_admin, u.username
    FROM sessions s
    JOIN app_users u ON u.id = s.user_id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
  `

  if (sessions.length === 0) {
    return NextResponse.json({ error: "無効なセッションです" }, { status: 401 })
  }

  const session = sessions[0]

  try {
    const body = await req.json()
    const { name, url, comment } = body

    if (!name || !url) {
      return NextResponse.json({ error: "名前とURLは必須です" }, { status: 400 })
    }

    const result = await sql`
      INSERT INTO agent_library (name, url, comment, created_by)
      VALUES (${name}, ${url}, ${comment || ''}, ${session.user_id})
      RETURNING id, name, url, comment, likes, created_by, created_at, updated_at
    `

    return NextResponse.json({ 
      ...result[0], 
      creator_name: session.username 
    })
  } catch (error) {
    console.error("Error creating agent:", error)
    return NextResponse.json({ error: "エージェントの登録に失敗しました" }, { status: 500 })
  }
}
