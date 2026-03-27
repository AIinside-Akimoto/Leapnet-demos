import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")

  if (!token) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const sql = getDb()

  const rows = await sql`
    SELECT s.user_id, s.is_admin, u.username, u.expires_at
    FROM sessions s
    JOIN app_users u ON u.id = s.user_id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
  `

  if (rows.length === 0) {
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const session = rows[0]

  return NextResponse.json({
    authenticated: true,
    isAdmin: session.is_admin,
    username: session.username,
    userId: session.user_id,
  })
}
