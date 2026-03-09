"use client"

import { useState, useEffect, useRef } from "react"
import { type AgentKey } from "@/lib/agents"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

interface AgentFormProps {
  agentKey: AgentKey
  onParamsChange: (params: Record<string, string>) => void
}

function getDefaultDate(daysFromNow: number) {
  const d = new Date()
  d.setDate(d.getDate() + daysFromNow)
  return d.toISOString().split("T")[0]
}

function formatDateJP(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("ja-JP", { year: "numeric", month: "long", day: "numeric" })
}

// Default params for each agent
function getDefaultParams(agentKey: AgentKey): Record<string, string> {
  switch (agentKey) {
    case "leave_manager":
      return {
        employee_type: "正社員",
        years_of_service: "6ヶ月",
        target_date: formatDateJP(getDefaultDate(14)),
        leave_type: "有給休暇",
        reason: "私用のため（旅行）",
      }
    case "tax_manager":
      return {
        category: "年末調整",
        target_year: "2024年度(今年)",
        family_status: "独身",
        query: "今年の提出期限はいつですか？また、提出はどのシステムから行えばいいですか？",
      }
    case "recruiting_manager":
      return {
        job_title: "法人営業（リーダー候補）",
        phase: "書類選考",
        focus_point: "営業経験年数と、マネジメント経験の有無、過去の達成率",
      }
    case "onboarding_manager":
      return {
        join_date: formatDateJP(getDefaultDate(30)),
        contract_type: "中途入社",
        department: "開発部 バックエンドチーム（リーダー）",
      }
    case "welfare_manager":
      return {
        welfare_type: "住宅手当・社宅",
        user_status: "現在、賃貸マンションに一人暮らし（家賃8万円）です。",
      }
    case "offboarding_manager":
      return {
        retire_date: formatDateJP(getDefaultDate(45)),
        position: "営業部 課長",
        reason: "自己都合（転職）",
      }
    default:
      return {}
  }
}

const LEAVE_REASON_DEFAULTS: Record<string, string> = {
  "有給休暇": "私用のため（旅行）",
  "慶弔休暇": "祖母の葬儀のため",
  "リフレッシュ休暇": "心身の休養のため",
}

const TAX_QUERY_DEFAULTS: Record<string, string> = {
  "年末調整": "今年の提出期限はいつですか？また、提出はどのシステムから行えばいいですか？",
  "源泉徴収票": "住宅ローンの審査で必要になったため、昨年度分の源泉徴収票（原本）を発行してほしいです。",
  "住民税": "住民税の決定通知書はいつ頃配布されますか？また、給与天引きはいつから変わりますか？",
  "扶養変更": "先月結婚しました。妻を扶養に入れたいのですが、必要な手続きと提出書類を教えてください。",
}

const RECRUIT_FOCUS_DEFAULTS: Record<string, string> = {
  "書類選考": "営業経験年数と、マネジメント経験の有無、過去の達成率",
  "一次面接": "カルチャーフィット、コミュニケーション能力、論理的思考力",
  "最終面接": "入社意欲の高さ、キャリアビジョンとの整合性、リーダーシップ",
}

const ONBOARD_DEPT_DEFAULTS: Record<string, string> = {
  "中途入社": "開発部 バックエンドチーム（リーダー）",
  "新卒入社": "営業部 第1チーム（総合職）",
  "業務委託": "マーケティング部（週3日稼働）",
}

const WELFARE_STATUS_DEFAULTS: Record<string, string> = {
  "住宅手当・社宅": "現在、賃貸マンションに一人暮らし（家賃8万円）です。",
  "育児・介護支援": "来月、第一子が生まれる予定です。男性の育休について知りたいです。",
  "資格取得支援": "業務に関連するクラウドサービスの認定資格を取りたいと考えています。",
  "慶弔見舞金": "自身の結婚が決まりました。",
}

export function AgentForm({ agentKey, onParamsChange }: AgentFormProps) {
  const [params, setParams] = useState<Record<string, string>>(() => getDefaultParams(agentKey))
  const onParamsChangeRef = useRef(onParamsChange)
  onParamsChangeRef.current = onParamsChange

  // Reset params with defaults when agent changes
  useEffect(() => {
    const defaults = getDefaultParams(agentKey)
    setParams(defaults)
  }, [agentKey])

  // Notify parent of param changes
  useEffect(() => {
    onParamsChangeRef.current(params)
  }, [params])

  function update(key: string, value: string) {
    setParams((prev) => ({ ...prev, [key]: value }))
  }

  function updateMulti(updates: Record<string, string>) {
    setParams((prev) => ({ ...prev, ...updates }))
  }

  switch (agentKey) {
    case "leave_manager":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>雇用区分</Label>
              <Select
                value={params.employee_type}
                onValueChange={(v) => update("employee_type", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="正社員">正社員</SelectItem>
                  <SelectItem value="契約社員">契約社員</SelectItem>
                  <SelectItem value="パート">パート</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>勤続年数</Label>
              <Select
                value={params.years_of_service}
                onValueChange={(v) => update("years_of_service", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="6ヶ月">6ヶ月</SelectItem>
                  <SelectItem value="1年6ヶ月">1年6ヶ月</SelectItem>
                  <SelectItem value="2年6ヶ月">2年6ヶ月</SelectItem>
                  <SelectItem value="6年以上">6年以上</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>取得希望日</Label>
              <Input
                type="date"
                defaultValue={getDefaultDate(14)}
                onChange={(e) => {
                  update("target_date", formatDateJP(e.target.value))
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>休暇種別</Label>
              <Select
                value={params.leave_type}
                onValueChange={(v) => {
                  updateMulti({
                    leave_type: v,
                    reason: LEAVE_REASON_DEFAULTS[v] || "",
                  })
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="有給休暇">有給休暇</SelectItem>
                  <SelectItem value="慶弔休暇">慶弔休暇</SelectItem>
                  <SelectItem value="リフレッシュ休暇">リフレッシュ休暇</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>申請事由</Label>
            <Input
              value={params.reason || ""}
              onChange={(e) => update("reason", e.target.value)}
            />
          </div>
        </div>
      )

    case "tax_manager":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>相談カテゴリ</Label>
            <Select
              value={params.category}
              onValueChange={(v) => {
                updateMulti({
                  category: v,
                  query: TAX_QUERY_DEFAULTS[v] || "",
                })
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="年末調整">年末調整</SelectItem>
                <SelectItem value="源泉徴収票">源泉徴収票</SelectItem>
                <SelectItem value="住民税">住民税</SelectItem>
                <SelectItem value="扶養変更">扶養変更</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>対象年度</Label>
              <Select
                value={params.target_year}
                onValueChange={(v) => update("target_year", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="2024年度(今年)">2024年度(今年)</SelectItem>
                  <SelectItem value="2023年度(昨年)">2023年度(昨年)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>世帯状況</Label>
              <Select
                value={params.family_status}
                onValueChange={(v) => update("family_status", v)}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="独身">独身</SelectItem>
                  <SelectItem value="配偶者あり(扶養内)">配偶者あり(扶養内)</SelectItem>
                  <SelectItem value="配偶者あり(共働き)">配偶者あり(共働き)</SelectItem>
                  <SelectItem value="子供あり">子供あり</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>詳細な質問</Label>
            <Textarea
              rows={3}
              value={params.query || ""}
              onChange={(e) => update("query", e.target.value)}
            />
          </div>
        </div>
      )

    case "recruiting_manager":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>職種</Label>
            <Input
              value={params.job_title || ""}
              onChange={(e) => update("job_title", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>選考フェーズ</Label>
            <Select
              value={params.phase}
              onValueChange={(v) => {
                updateMulti({
                  phase: v,
                  focus_point: RECRUIT_FOCUS_DEFAULTS[v] || "",
                })
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="書類選考">書類選考</SelectItem>
                <SelectItem value="一次面接">一次面接</SelectItem>
                <SelectItem value="最終面接">最終面接</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>重視したいポイント</Label>
            <Textarea
              rows={3}
              value={params.focus_point || ""}
              onChange={(e) => update("focus_point", e.target.value)}
            />
          </div>
        </div>
      )

    case "onboarding_manager":
      return (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>入社予定日</Label>
              <Input
                type="date"
                defaultValue={getDefaultDate(30)}
                onChange={(e) => {
                  update("join_date", formatDateJP(e.target.value))
                }}
              />
            </div>
            <div className="space-y-2">
              <Label>採用区分</Label>
              <Select
                value={params.contract_type}
                onValueChange={(v) => {
                  updateMulti({
                    contract_type: v,
                    department: ONBOARD_DEPT_DEFAULTS[v] || "",
                  })
                }}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="中途入社">中途入社</SelectItem>
                  <SelectItem value="新卒入社">新卒入社</SelectItem>
                  <SelectItem value="業務委託">業務委託</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="space-y-2">
            <Label>配属部署・役割</Label>
            <Input
              value={params.department || ""}
              onChange={(e) => update("department", e.target.value)}
            />
          </div>
        </div>
      )

    case "welfare_manager":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>知りたい制度</Label>
            <Select
              value={params.welfare_type}
              onValueChange={(v) => {
                updateMulti({
                  welfare_type: v,
                  user_status: WELFARE_STATUS_DEFAULTS[v] || "",
                })
              }}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="住宅手当・社宅">住宅手当・社宅</SelectItem>
                <SelectItem value="育児・介護支援">育児・介護支援</SelectItem>
                <SelectItem value="資格取得支援">資格取得支援</SelectItem>
                <SelectItem value="慶弔見舞金">慶弔見舞金</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>現在の状況</Label>
            <Textarea
              rows={3}
              value={params.user_status || ""}
              onChange={(e) => update("user_status", e.target.value)}
            />
          </div>
        </div>
      )

    case "offboarding_manager":
      return (
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>退職希望日</Label>
            <Input
              type="date"
              defaultValue={getDefaultDate(45)}
              onChange={(e) => {
                update("retire_date", formatDateJP(e.target.value))
              }}
            />
          </div>
          <div className="space-y-2">
            <Label>現在の役職</Label>
            <Input
              value={params.position || ""}
              onChange={(e) => update("position", e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>退職理由（分類）</Label>
            <Select
              value={params.reason}
              onValueChange={(v) => update("reason", v)}
            >
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="自己都合（転職）">自己都合（転職）</SelectItem>
                <SelectItem value="定年退職">定年退職</SelectItem>
                <SelectItem value="期間満了">期間満了</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )

    default:
      return null
  }
}
