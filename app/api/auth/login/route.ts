import { NextRequest, NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { getDb } from "@/lib/db"
import { generateSessionToken } from "@/lib/auth"

export async function POST(req: NextRequest) {
  const { username, password } = await req.json()

  if (!username || !password) {
    return NextResponse.json({ error: "ユーザー名とパスワードを入力してください" }, { status: 400 })
  }

  const sql = getDb()

  // Check if admin
  const adminUsername = process.env.ADMIN_USERNAME
  const adminPassword = process.env.ADMIN_PASSWORD

  if (username === adminUsername && password === adminPassword) {
    // Admin login
    const token = generateSessionToken()
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000) // 24 hours

    // Check if admin user exists in DB
    const existingAdmin = await sql`SELECT id FROM app_users WHERE username = ${adminUsername} AND is_admin = true`

    let adminId: number
    if (existingAdmin.length === 0) {
      const hashedPw = await bcrypt.hash(password, 10)
      const result = await sql`
        INSERT INTO app_users (username, password_hash, is_admin, expires_at)
        VALUES (${adminUsername}, ${hashedPw}, true, NULL)
        RETURNING id
      `
      adminId = result[0].id as number
    } else {
      adminId = existingAdmin[0].id as number
    }

    await sql`
      INSERT INTO sessions (user_id, token, is_admin, expires_at)
      VALUES (${adminId}, ${token}, true, ${expiresAt.toISOString()})
    `

    return NextResponse.json({ success: true, isAdmin: true, token })
  }

  // Regular user login
  const users = await sql`
    SELECT id, password_hash, expires_at FROM app_users
    WHERE username = ${username} AND is_admin = false
  `

  if (users.length === 0) {
    return NextResponse.json({ error: "ユーザー名またはパスワードが正しくありません" }, { status: 401 })
  }

  const user = users[0]

  // Check if user account expired
  if (user.expires_at && new Date(user.expires_at) < new Date()) {
    return NextResponse.json({ error: "アカウントの有効期限が切れています。管理者にお問い合わせください。" }, { status: 401 })
  }

  const valid = await bcrypt.compare(password, user.password_hash as string)
  if (!valid) {
    return NextResponse.json({ error: "ユーザー名またはパスワードが正しくありません" }, { status: 401 })
  }

  const token = generateSessionToken()
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000)

  await sql`
    INSERT INTO sessions (user_id, token, is_admin, expires_at)
    VALUES (${user.id}, ${token}, false, ${expiresAt.toISOString()})
  `

  return NextResponse.json({ success: true, isAdmin: false, token })
}
