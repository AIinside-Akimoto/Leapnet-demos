import { getDb } from "./db"
import { NextRequest } from "next/server"

export function getTokenFromRequest(req: NextRequest): string | null {
  const authHeader = req.headers.get("authorization")
  return authHeader?.replace("Bearer ", "") || null
}

export async function getSession(req: NextRequest) {
  const token = getTokenFromRequest(req)
  if (!token) return null

  const sql = getDb()
  const rows = await sql`
    SELECT s.user_id, s.is_admin, u.username, u.expires_at
    FROM sessions s
    JOIN app_users u ON u.id = s.user_id
    WHERE s.token = ${token}
      AND s.expires_at > NOW()
  `
  if (rows.length === 0) return null

  const session = rows[0]

  // Check if user account has expired (non-admin only)
  if (!session.is_admin && session.expires_at && new Date(session.expires_at) < new Date()) {
    await sql`DELETE FROM sessions WHERE token = ${token}`
    return null
  }

  return {
    userId: session.user_id as number,
    isAdmin: session.is_admin as boolean,
    username: session.username as string,
  }
}

export function generatePassword(length = 12): string {
  const charset = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789"
  let password = ""
  const array = new Uint8Array(length)
  crypto.getRandomValues(array)
  for (let i = 0; i < length; i++) {
    password += charset[array[i] % charset.length]
  }
  return password
}

export function generateSessionToken(): string {
  const array = new Uint8Array(32)
  crypto.getRandomValues(array)
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("")
}
