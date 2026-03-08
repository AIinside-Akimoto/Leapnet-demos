import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getDb } from "@/lib/db"
import { getSession, generatePassword } from "@/lib/auth"

export async function GET(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 })
  }

  const sql = getDb()
  const users = await sql`
    SELECT id, username, expires_at, created_at
    FROM app_users
    WHERE is_admin = false
    ORDER BY created_at DESC
  `

  return NextResponse.json({ users })
}

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 })
  }

  const { username, expiresInDays = 30 } = await req.json()

  if (!username || username.trim().length === 0) {
    return NextResponse.json({ error: "ユーザー名を入力してください" }, { status: 400 })
  }

  const sql = getDb()

  // Check if username already exists
  const existing = await sql`SELECT id FROM app_users WHERE username = ${username.trim()}`
  if (existing.length > 0) {
    return NextResponse.json({ error: "このユーザー名は既に使用されています" }, { status: 400 })
  }

  const password = generatePassword()
  const hashedPassword = await bcrypt.hash(password, 10)
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

  await sql`
    INSERT INTO app_users (username, password_hash, is_admin, expires_at)
    VALUES (${username.trim()}, ${hashedPassword}, false, ${expiresAt.toISOString()})
  `

  return NextResponse.json({
    success: true,
    username: username.trim(),
    password,
    expiresAt: expiresAt.toISOString(),
  })
}

export async function DELETE(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 })
  }

  const { userId } = await req.json()

  const sql = getDb()
  // Delete sessions first
  await sql`DELETE FROM sessions WHERE user_id = ${userId}`
  await sql`DELETE FROM app_users WHERE id = ${userId} AND is_admin = false`

  return NextResponse.json({ success: true })
}

export async function PATCH(req: NextRequest) {
  const session = await getSession(req)
  if (!session?.isAdmin) {
    return NextResponse.json({ error: "権限がありません" }, { status: 403 })
  }

  const { userId, expiresInDays } = await req.json()
  const expiresAt = new Date(Date.now() + expiresInDays * 24 * 60 * 60 * 1000)

  const sql = getDb()
  await sql`
    UPDATE app_users SET expires_at = ${expiresAt.toISOString()}
    WHERE id = ${userId} AND is_admin = false
  `

  return NextResponse.json({ success: true, expiresAt: expiresAt.toISOString() })
}
