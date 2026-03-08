import { NextRequest, NextResponse } from "next/server"
import { getSession } from "@/lib/auth"
import { AGENTS, type AgentKey, createStructuredPrompt } from "@/lib/agents"

export async function POST(req: NextRequest) {
  const session = await getSession(req)
  if (!session) {
    return NextResponse.json({ error: "認証が必要です" }, { status: 401 })
  }

  const { agentKey, params } = await req.json()

  if (!agentKey || !AGENTS[agentKey as AgentKey]) {
    return NextResponse.json({ error: "無効なエージェントです" }, { status: 400 })
  }

  const agent = AGENTS[agentKey as AgentKey]
  const apiUrl = process.env[agent.envUrlKey]
  const apiKey = process.env[agent.envApiKey]

  if (!apiUrl || !apiKey) {
    return NextResponse.json(
      { error: "エージェントのAPI設定が見つかりません。環境変数を確認してください。" },
      { status: 500 }
    )
  }

  const today = new Date().toLocaleDateString("ja-JP", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  const prompt = createStructuredPrompt(agentKey as AgentKey, params, today)

  const maxRetries = 2
  let lastError = ""

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const res = await fetch(`${apiUrl.replace(/\/$/, "")}/hrapp`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
        },
        body: JSON.stringify({ query: prompt }),
        signal: AbortSignal.timeout(60000),
      })

      if (res.ok) {
        const data = await res.json()
        const answer = data.answer || data.response || "回答データが見つかりませんでした。"
        return NextResponse.json({ answer, prompt })
      } else {
        lastError = `サーバーエラー: ${res.status}`
        break
      }
    } catch (e) {
      if (e instanceof DOMException && e.name === "TimeoutError") {
        if (attempt < maxRetries - 1) continue
        lastError = "サーバーからの応答がありませんでした（タイムアウト）。"
      } else {
        lastError = `接続エラー: ${e instanceof Error ? e.message : String(e)}`
        break
      }
    }
  }

  return NextResponse.json({ error: lastError || "不明なエラーが発生しました。" }, { status: 502 })
}
