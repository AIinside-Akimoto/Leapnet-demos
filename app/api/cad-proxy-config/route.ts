import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"

export async function GET(request: NextRequest) {
  // Verify authentication
  const session = await getSession(request)
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  const proxyUrl = process.env.CAD_PROXY_URL

  if (!proxyUrl) {
    return NextResponse.json(
      { error: "CAD_PROXY_URL が設定されていません" },
      { status: 500 }
    )
  }

  return NextResponse.json({ proxyUrl })
}
