export type AgentKey =
  | "leave_manager"
  | "tax_manager"
  | "recruiting_manager"
  | "onboarding_manager"
  | "welfare_manager"
  | "offboarding_manager"

export interface AgentConfig {
  title: string
  icon: string
  description: string
  loadingMsg: string
  envUrlKey: string
  envApiKey: string
}

export const AGENTS: Record<AgentKey, AgentConfig> = {
  leave_manager: {
    title: "休暇・勤怠 申請担当",
    icon: "CalendarDays",
    description:
      "就業規則および慶弔規定を参照し、取得可能な休暇日数、具体的な申請手続き、注意点を案内します。",
    loadingMsg: "就業規則(休暇)・慶弔規程を確認しています...",
    envUrlKey: "AGENT_LEAVE_URL",
    envApiKey: "AGENT_LEAVE_KEY",
  },
  tax_manager: {
    title: "給与・年末調整",
    icon: "Coins",
    description:
      "給与規程と年末調整の手引きに基づき、書類提出の手順や期限、諸証明の発行依頼をサポートします。",
    loadingMsg: "給与規程および年末調整ガイドブックを参照しています...",
    envUrlKey: "AGENT_TAX_URL",
    envApiKey: "AGENT_TAX_KEY",
  },
  recruiting_manager: {
    title: "採用・面接ガイド",
    icon: "Handshake",
    description:
      "採用選考ガイドラインに基づき、コンピテンシーを測る質問案の提示や、禁止質問のチェックを行います。",
    loadingMsg: "採用基準・面接ガイドラインを検索中...",
    envUrlKey: "AGENT_RECRUIT_URL",
    envApiKey: "AGENT_RECRUIT_KEY",
  },
  onboarding_manager: {
    title: "入社手続き・オンボ",
    icon: "UserPlus",
    description:
      "入社受入マニュアルを参照し、実施すべきタスクリスト、必要な申請、期限を構造化して提示します。",
    loadingMsg: "入社受入・オンボーディング手順書を確認しています...",
    envUrlKey: "AGENT_ONBOARD_URL",
    envApiKey: "AGENT_ONBOARD_KEY",
  },
  welfare_manager: {
    title: "福利厚生・手当",
    icon: "Gift",
    description:
      "福利厚生規程を検索し、各制度の支給額、利用条件、具体的な申請フローを分かりやすく解説します。",
    loadingMsg: "福利厚生規程を照会しています...",
    envUrlKey: "AGENT_WELFARE_URL",
    envApiKey: "AGENT_WELFARE_KEY",
  },
  offboarding_manager: {
    title: "退職手続き・引継ぎ",
    icon: "LogOut",
    description:
      "退職手続きガイドラインに基づき、退職までのスケジュール、返却物リスト、留意事項を案内します。",
    loadingMsg: "退職手続・貸与品返却リストを確認しています...",
    envUrlKey: "AGENT_OFFBOARD_URL",
    envApiKey: "AGENT_OFFBOARD_KEY",
  },
}

export const AGENT_KEYS = Object.keys(AGENTS) as AgentKey[]

export function createStructuredPrompt(
  agentKey: AgentKey,
  params: Record<string, string>,
  todayDate: string
): string {
  const baseInstruction = `
あなたは人事労務・総務のプロフェッショナルAIです。
現在日時: ${todayDate}
社内規定（RAGデータ）に基づき、以下のユーザーの依頼に対して正確かつ親切に回答してください。
回答には必ず「根拠となる規定名」を含めてください。
推測での回答は避け、情報がない場合はその旨を伝えてください。
`

  switch (agentKey) {
    case "leave_manager":
      return (
        baseInstruction +
        `
【ユーザー情報】
- 雇用区分: ${params.employee_type}
- 勤続年数: ${params.years_of_service}
- 取得希望日: ${params.target_date}
- 休暇種別: ${params.leave_type}
- 事由: ${params.reason}

【依頼内容】
勤続${params.years_of_service}の社員が、${params.target_date}に${params.leave_type}を取得希望。
付与日数と申請期限日を計算して提示し、申請メールのドラフトを作成すること。

【出力フォーマット】
1. **付与日数**: (詳細)
2. **申請期限**: (日付と計算根拠)
3. **申請用テンプレート**:
   （件名と本文のみ。見出しは「【申請用テンプレート】」固定）
`
      )

    case "tax_manager":
      return (
        baseInstruction +
        `
【ユーザー情報】
- 相談カテゴリ: ${params.category}
- 対象年度: ${params.target_year}
- 世帯状況: ${params.family_status}
- 具体的な質問: ${params.query}

【依頼内容】
${params.target_year}の${params.category}について。ユーザーは${params.family_status}。
必要な手続き、書類、期限を案内すること。

【重要なお願い】
「諸証明発行依頼テンプレート」は、ユーザーが「源泉徴収票の発行」や「住宅ローン審査」について質問した場合のみ出力してください。
単なる年末調整の質問（期限やシステム操作）の場合は、このテンプレートを出力しないでください。

【出力フォーマット】
1. **回答・解説**:
2. **必要なアクション**:
3. **注意点**:
4. **申請用テンプレート**:
   （件名と本文のみ。見出しは「【申請用テンプレート】」固定。不要な場合は「なし」とすること）
`
      )

    case "recruiting_manager":
      return (
        baseInstruction +
        `
【ターゲット情報】
- 職種: ${params.job_title}
- 選考フェーズ: ${params.phase}
- 評価ポイント: ${params.focus_point}

【依頼内容】
${params.job_title}の${params.phase}における、評価シートまたは質問リストを作成してください。
社内の採用基準（コンピテンシー）に基づき、${params.focus_point}を見極めるための質問を重点的に挙げること。

【出力フォーマット】
1. **見極めポイント**: (規定に基づく基準)
2. **推奨質問リスト**: (5つ程度)
3. **評価記入テンプレート**:
   （ガイドラインの「面接評価シート」の項目をそのまま引用して出力すること。）
   （見出しは「【面接評価シート】」または「【申請用テンプレート】」とすること）
`
      )

    case "onboarding_manager":
      return (
        baseInstruction +
        `
【新入社員情報】
- 入社予定日: ${params.join_date}
- 雇用形態: ${params.contract_type} (新卒/中途/業務委託)
- 配属部署: ${params.department}

【依頼内容】
${params.join_date}に入社する${params.contract_type}の方のオンボーディング・手続きリストを作成してください。
PC手配、アカウント発行、初日のスケジュール案などを含めること。

【出力フォーマット】
1. **入社までの準備リスト**: (総務側対応)
2. **初日のスケジュール案**:
3. **本人への案内メール**:
   （件名と本文のみ。見出しは「【申請用テンプレート】」固定）
`
      )

    case "welfare_manager":
      return (
        baseInstruction +
        `
【相談内容】
- カテゴリ: ${params.welfare_type} (住宅/育児/介護/健康など)
- ユーザー状況: ${params.user_status}

【依頼内容】
${params.welfare_type}に関する利用可能な制度を全て挙げ、申請条件と補助金額を提示すること。

【出力フォーマット】
1. **利用可能な制度一覧**:
2. **支給条件・金額**:
3. **申請フロー**:
4. **申請用テンプレート**:
   （件名と本文のみ。見出しは「【申請用テンプレート】」固定）
`
      )

    case "offboarding_manager":
      return (
        baseInstruction +
        `
【退職予定者情報】
- 退職希望日: ${params.retire_date}
- 退職理由: ${params.reason}
- 現在の役職: ${params.position}

【依頼内容】
${params.retire_date}付での退職手続きフローを提示してください。
就業規則に基づき、退職届の提出期限、返却物（PC/証/保険証）、秘密保持契約の締結について網羅すること。

【出力フォーマット】
1. **退職までのスケジュール**: (期限逆算)
2. **返却物・提出書類リスト**:
3. **留意事項**: (競業避止義務など)
4. **退職届テンプレート**:
   （件名と本文のみ。見出しは「【申請用テンプレート】」固定）
`
      )

    default:
      return "エラー: エージェントが定義されていません"
  }
}
