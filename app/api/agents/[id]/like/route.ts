import { NextRequest, NextResponse } from "next/server"
import { getDb } from "@/lib/db"

// POST - Increment likes
export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const sql = getDb()

  try {
    const result = await sql`
      UPDATE agent_library
      SET likes = likes + 1
      WHERE id = ${id}
      RETURNING id, likes
    `

    if (result.length === 0) {
      return NextResponse.json({ error: "エージェントが見つかりません" }, { status: 404 })
    }

    return NextResponse.json(result[0])
  } catch (error) {
    console.error("Error liking agent:", error)
    return NextResponse.json({ error: "いいねに失敗しました" }, { status: 500 })
  }
}
