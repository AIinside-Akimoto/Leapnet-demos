import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// PUT - Update an agent
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
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

  // Check if agent exists and user has permission
  const agents = await sql`
    SELECT * FROM agent_library WHERE id = ${id}
  `

  if (agents.length === 0) {
    return NextResponse.json({ error: "エージェントが見つかりません" }, { status: 404 })
  }

  const agent = agents[0]

  // Only creator or admin can update
  if (agent.created_by !== session.user_id && !session.is_admin) {
    return NextResponse.json({ error: "更新権限がありません" }, { status: 403 })
  }

  try {
    const body = await req.json()
    const { name, url, comment } = body

    if (!name || !url) {
      return NextResponse.json({ error: "名前とURLは必須です" }, { status: 400 })
    }

    const result = await sql`
      UPDATE agent_library
      SET name = ${name}, url = ${url}, comment = ${comment || ''}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, url, comment, likes, created_by, created_at, updated_at
    `

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error updating agent:", error)
    return NextResponse.json({ error: "エージェントの更新に失敗しました" }, { status: 500 })
  }
}

// DELETE - Delete an agent
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")

  if (!token) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  const sql = getDb()

  // Verify session
  const sessions = await sql`
    SELECT s.user_id, s.is_admin
    FROM sessions s
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
  `

  if (sessions.length === 0) {
    return NextResponse.json({ error: "無効なセッションです" }, { status: 401 })
  }

  const session = sessions[0]

  // Check if agent exists and user has permission
  const agents = await sql`
    SELECT * FROM agent_library WHERE id = ${id}
  `

  if (agents.length === 0) {
    return NextResponse.json({ error: "エージェントが見つかりません" }, { status: 404 })
  }

  const agent = agents[0]

  // Only creator or admin can delete
  if (agent.created_by !== session.user_id && !session.is_admin) {
    return NextResponse.json({ error: "削除権限がありません" }, { status: 403 })
  }

  try {
    await sql`DELETE FROM agent_library WHERE id = ${id}`
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error deleting agent:", error)
    return NextResponse.json({ error: "エージェントの削除に失敗しました" }, { status: 500 })
  }
}
