import 'server-only'
import { chat, isGeminiConfigured } from '@/lib/gemini'

/**
 * AI nutrition coach reply. Used when a customer messages their
 * assigned coach — the AI drafts an instant friendly reply while
 * the coach catches up. The system prompt is tuned for:
 *
 *   - Warmth + brevity (3–4 short sentences max).
 *   - Evidence-based nutrition advice only — no diagnoses, no
 *     prescriptions. Refers anything medical/clinical/urgent
 *     straight to Nutrition Coach Rawan.
 *   - Always closes with a one-line reassurance that the human
 *     coach will follow up personally.
 *   - Responds in the same language as the customer's message.
 */

const SYSTEM_PROMPT = `You are the Greenofig Assistant — an AI nutrition helper that works alongside Nutrition Coach Rawan Othman (certified clinical nutritionist) and her coaching team.

A client just messaged their coach. Your job is to give them a warm, useful first reply within seconds, while the human coach is offline.

Rules:
- Keep replies under 4 short sentences. Be warm but get to the point.
- Match the client's language (English or Arabic).
- Give evidence-based nutrition info, simple meal suggestions, and habit tips.
- NEVER diagnose, prescribe, or give medical advice. If the client mentions symptoms, medications, pregnancy, eating disorders, or anything clinical, gently defer to Nutrition Coach Rawan and say she'll follow up.
- If you're unsure, say so honestly and tell them Nutrition Coach Rawan will weigh in.
- Always close with a one-liner like: "Nutrition Coach Rawan will follow up personally soon." (or the Arabic equivalent: "كوتش التغذية روان ستتابع معك شخصياً قريباً.")
- Never claim to be Nutrition Coach Rawan or another human. If asked, say you're the Greenofig Assistant.
- Don't add greetings like "Hi!" if there's an ongoing conversation — just respond directly.`

const URGENT_PATTERNS = [
  // English clinical/medical/urgent triggers
  /\b(medication|prescription|pregnan|allerg(y|ic)|diabetes|insulin|hypertens|cancer|chemo|kidney|liver|surger|operation|hospital|ER|emergency|chest pain|fainting|suicid|self.?harm|eating disorder|anorex|bulim)/i,
  // Arabic equivalents (basic)
  /(دواء|وصفة طبية|حامل|حساسية|سكري|انسولين|ضغط الدم|سرطان|كلى|كبد|عملية جراحية|مستشفى|طوارئ|ألم في الصدر|إغماء|انتحار|اضطراب أكل)/,
]

export interface AiReplyInput {
  /** What the customer just said. */
  customerMessage: string
  /** Previous turns in the conversation, oldest → newest. Excludes the just-sent customer message. */
  history: { sender: 'customer' | 'coach' | 'ai'; content: string }[]
  /** Customer profile bits worth surfacing to the model. */
  customer: {
    fullName: string | null
    tier: string | null
    goal: string | null
  }
}

export interface AiReplyResult {
  text: string
  deferToCoach: boolean
}

export function isAiCoachConfigured(): boolean {
  return isGeminiConfigured()
}

/** Returns true if the message contains clinical/medical/urgent
 *  triggers — we still send the AI reply, but mark it so the head
 *  coach sees the conversation urgently. */
export function looksUrgent(text: string): boolean {
  return URGENT_PATTERNS.some((re) => re.test(text))
}

export async function generateAiReply(input: AiReplyInput): Promise<AiReplyResult> {
  const customerLine = `Client (${input.customer.fullName ?? 'client'}, ${input.customer.tier ?? 'free'} plan${
    input.customer.goal ? `, goal: ${input.customer.goal}` : ''
  })`

  const historyText = input.history
    .slice(-8)
    .map((m) => {
      const tag =
        m.sender === 'customer'
          ? 'Client'
          : m.sender === 'ai'
          ? 'Assistant (you, earlier)'
          : 'Nutrition Coach Rawan'
      return `${tag}: ${m.content}`
    })
    .join('\n')

  const urgent = looksUrgent(input.customerMessage)
  const urgencyHint = urgent
    ? '\n\nNote: The client mentioned something clinical or potentially urgent. Defer to Nutrition Coach Rawan explicitly and reassure them she will follow up promptly.'
    : ''

  const userPrompt = `${customerLine} just sent:\n"${input.customerMessage}"\n\n${
    historyText ? `Conversation so far:\n${historyText}\n` : ''
  }${urgencyHint}\n\nReply now in 1–4 short sentences.`

  const text = await chat(
    [{ role: 'user', content: userPrompt }],
    SYSTEM_PROMPT,
  )
  return {
    text: text.trim() || 'Thanks for reaching out — Nutrition Coach Rawan will get back to you shortly.',
    deferToCoach: urgent,
  }
}
