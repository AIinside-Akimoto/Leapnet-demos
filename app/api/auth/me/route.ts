import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function GET(req: NextRequest) {
  console.log("[v0] /api/auth/me called")
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")
  console.log("[v0] Token present:", !!token)

  if (!token) {
    console.log("[v0] No token - returning 401")
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

  console.log("[v0] Session query returned rows:", rows.length)

  if (rows.length === 0) {
    console.log("[v0] No valid session found - returning 401")
    return NextResponse.json({ authenticated: false }, { status: 401 })
  }

  const session = rows[0]
  console.log("[v0] Session found for user:", session.username)

  return NextResponse.json({
    authenticated: true,
    isAdmin: session.is_admin,
    username: session.username,
  })
}
