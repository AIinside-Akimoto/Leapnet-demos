import { NextResponse } from "next/server"
import { verifySession } from "@/lib/auth"

export async function GET(request: Request) {
  // Verify authentication
  const session = await verifySession(request)
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
