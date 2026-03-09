import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

export async function POST(req: NextRequest) {
  const authHeader = req.headers.get("authorization")
  const token = authHeader?.replace("Bearer ", "")

  if (token) {
    const sql = getDb()
    await sql`DELETE FROM sessions WHERE token = ${token}`
  }

  return NextResponse.json({ success: true })
}
