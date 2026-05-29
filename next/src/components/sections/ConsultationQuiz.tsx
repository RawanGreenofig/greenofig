'use client'

/**
 * Homepage lead-gen quiz — 15 health & nutrition questions, then a
 * compact contact form, then a confirmation panel with the free ebook.
 *
 * Submits to /api/consultation-leads which:
 *   1. saves the lead to public.consultation_leads (visible to admins
 *      and the nutritionist team), and
 *   2. fires the thank-you ebook email from health@greenofig.com.
 *
 * The questions live in QUESTIONS below — edit there to change the
 * quiz; the schema stores answers as JSONB so adding/removing
 * questions doesn't require a DB migration.
 */

import { useMemo, useState } from 'react'
import { useLocale, useTranslations } from 'next-intl'
import { ArrowRight, ArrowLeft, CheckCircle2, Sparkles, Download } from 'lucide-react'
import { ease, NUTRITIONIST } from '@/lib/tokens'

const EASE_OUT: [number, number, number, number] = [...ease.out]
void EASE_OUT

interface QuestionOption {
  value: string
  en: string
  ar: string
}

interface Question {
  id: string
  en: string
  ar: string
  /** undefined = free text */
  options?: QuestionOption[]
}

const QUESTIONS: Question[] = [
  {
    id: 'primaryGoal',
    en: 'What is your main health goal right now?',
    ar: 'ما هدفك الصحي الرئيسي الآن؟',
    options: [
      { value: 'weight_loss', en: 'Lose weight', ar: 'فقدان الوزن' },
      { value: 'muscle_gain', en: 'Build muscle', ar: 'بناء العضلات' },
      { value: 'energy', en: 'More energy', ar: 'طاقة أعلى' },
      { value: 'condition', en: 'Manage a condition', ar: 'إدارة حالة صحية' },
      { value: 'longevity', en: 'Healthier eating overall', ar: 'تغذية صحية شاملة' },
    ],
  },
  {
    id: 'ageRange',
    en: 'Your age range',
    ar: 'الفئة العمرية',
    options: [
      { value: '18-24', en: '18–24', ar: '18–24' },
      { value: '25-34', en: '25–34', ar: '25–34' },
      { value: '35-44', en: '35–44', ar: '35–44' },
      { value: '45-54', en: '45–54', ar: '45–54' },
      { value: '55+',   en: '55+',   ar: '55+' },
    ],
  },
  {
    id: 'gender',
    en: 'Gender',
    ar: 'الجنس',
    options: [
      { value: 'female', en: 'Female', ar: 'أنثى' },
      { value: 'male', en: 'Male', ar: 'ذكر' },
      { value: 'prefer_not', en: 'Prefer not to say', ar: 'أفضّل عدم الإجابة' },
    ],
  },
  {
    id: 'activityLevel',
    en: 'How active are you?',
    ar: 'ما مستوى نشاطك البدني؟',
    options: [
      { value: 'sedentary', en: 'Mostly sedentary', ar: 'قليل الحركة' },
      { value: 'light', en: 'Light (walks, light workouts)', ar: 'خفيف' },
      { value: 'moderate', en: 'Moderate (3–5 workouts/week)', ar: 'متوسط' },
      { value: 'high', en: 'High (5+ workouts/week)', ar: 'عالٍ' },
    ],
  },
  {
    id: 'mealsPerDay',
    en: 'How many meals do you eat in a typical day?',
    ar: 'كم وجبة تتناول في اليوم العادي؟',
    options: [
      { value: '1-2', en: '1–2', ar: '١–٢' },
      { value: '3', en: '3', ar: '٣' },
      { value: '4-5', en: '4–5', ar: '٤–٥' },
      { value: 'graze', en: 'I graze all day', ar: 'آكل بشكل متقطع طوال اليوم' },
    ],
  },
  {
    id: 'cookingFrequency',
    en: 'How often do you cook at home?',
    ar: 'كم مرة تطبخ في المنزل؟',
    options: [
      { value: 'daily', en: 'Daily', ar: 'يومياً' },
      { value: 'few_per_week', en: 'A few times a week', ar: 'بضع مرات في الأسبوع' },
      { value: 'weekends', en: 'Mostly weekends', ar: 'في عطلة الأسبوع غالباً' },
      { value: 'rarely', en: 'Rarely / I order in', ar: 'نادراً / أطلب طعام' },
    ],
  },
  {
    id: 'waterIntake',
    en: 'How much water do you drink per day?',
    ar: 'كم تشرب من الماء يومياً؟',
    options: [
      { value: 'lt_1l', en: 'Less than 1 L', ar: 'أقل من ١ لتر' },
      { value: '1-2l', en: '1–2 L', ar: '١–٢ لتر' },
      { value: '2-3l', en: '2–3 L', ar: '٢–٣ لتر' },
      { value: 'gt_3l', en: 'More than 3 L', ar: 'أكثر من ٣ لتر' },
    ],
  },
  {
    id: 'sleepHours',
    en: 'Average hours of sleep per night',
    ar: 'متوسط ساعات النوم ليلياً',
    options: [
      { value: 'lt_5', en: 'Less than 5', ar: 'أقل من ٥' },
      { value: '5-6', en: '5–6', ar: '٥–٦' },
      { value: '7-8', en: '7–8', ar: '٧–٨' },
      { value: 'gt_8', en: 'More than 8', ar: 'أكثر من ٨' },
    ],
  },
  {
    id: 'stressLevel',
    en: 'How would you rate your stress level?',
    ar: 'كيف تقيّم مستوى التوتر لديك؟',
    options: [
      { value: 'low', en: 'Low', ar: 'منخفض' },
      { value: 'moderate', en: 'Moderate', ar: 'متوسط' },
      { value: 'high', en: 'High', ar: 'مرتفع' },
      { value: 'overwhelming', en: 'Overwhelming', ar: 'ساحق' },
    ],
  },
  {
    id: 'dietaryRestrictions',
    en: 'Any dietary restrictions?',
    ar: 'هل لديك قيود غذائية؟',
    options: [
      { value: 'none', en: 'None', ar: 'لا يوجد' },
      { value: 'vegetarian', en: 'Vegetarian', ar: 'نباتي' },
      { value: 'vegan', en: 'Vegan', ar: 'نباتي صرف' },
      { value: 'gluten_free', en: 'Gluten-free', ar: 'خالٍ من الجلوتين' },
      { value: 'dairy_free', en: 'Dairy-free / lactose', ar: 'خالٍ من الألبان' },
      { value: 'halal', en: 'Halal only', ar: 'حلال فقط' },
    ],
  },
  {
    id: 'medicalConditions',
    en: 'Any chronic conditions we should know about?',
    ar: 'هل لديك حالات صحية مزمنة يجب أن نعرفها؟',
    options: [
      { value: 'none', en: 'None', ar: 'لا يوجد' },
      { value: 'diabetes', en: 'Diabetes / pre-diabetes', ar: 'سكري / مقدمات سكري' },
      { value: 'hypertension', en: 'High blood pressure', ar: 'ضغط مرتفع' },
      { value: 'thyroid', en: 'Thyroid', ar: 'الغدة الدرقية' },
      { value: 'pcos', en: 'PCOS / hormonal', ar: 'تكيس مبايض / هرمونات' },
      { value: 'gut', en: 'Gut / digestive issues', ar: 'مشاكل هضم' },
      { value: 'other', en: 'Something else', ar: 'حالة أخرى' },
    ],
  },
  {
    id: 'biggestChallenge',
    en: 'What is your biggest food challenge?',
    ar: 'ما أكبر تحدٍ يواجهك في الطعام؟',
    options: [
      { value: 'time', en: 'No time to cook / plan', ar: 'لا وقت للطبخ' },
      { value: 'cravings', en: 'Cravings & emotional eating', ar: 'الاشتهاء والأكل العاطفي' },
      { value: 'knowledge', en: 'Not sure what to eat', ar: 'لا أعرف ماذا آكل' },
      { value: 'consistency', en: 'Staying consistent', ar: 'الاستمرارية' },
      { value: 'social', en: 'Social events / eating out', ar: 'مناسبات اجتماعية / مطاعم' },
    ],
  },
  {
    id: 'triedBefore',
    en: 'Have you tried diets or programs before?',
    ar: 'هل جربت حميات أو برامج من قبل؟',
    options: [
      { value: 'never', en: "First time, didn't try yet", ar: 'لم أجرب' },
      { value: 'few', en: 'Tried a few', ar: 'جربت القليل' },
      { value: 'many', en: 'Tried many things', ar: 'جربت كثيراً' },
    ],
  },
  {
    id: 'timeline',
    en: 'When do you want to see results?',
    ar: 'متى تريد أن ترى نتائج؟',
    options: [
      { value: '30', en: 'In 30 days', ar: 'خلال ٣٠ يوماً' },
      { value: '90', en: 'In 3 months', ar: 'خلال ٣ أشهر' },
      { value: '180', en: 'In 6 months', ar: 'خلال ٦ أشهر' },
      { value: 'no_rush', en: 'No rush — sustainable', ar: 'لا أستعجل — مستدام' },
    ],
  },
  {
    id: 'commitment',
    en: 'How much weekly time can you commit?',
    ar: 'كم من الوقت الأسبوعي يمكنك تخصيصه؟',
    options: [
      { value: '<1h', en: 'Under 1 hour', ar: 'أقل من ساعة' },
      { value: '1-3h', en: '1–3 hours', ar: '١–٣ ساعات' },
      { value: '3-5h', en: '3–5 hours', ar: '٣–٥ ساعات' },
      { value: '5h+', en: '5+ hours', ar: '٥ ساعات أو أكثر' },
    ],
  },
]

type Step = 'intro' | 'quiz' | 'contact' | 'done'

interface ContactInfo {
  fullName: string
  email: string
  phone: string
  country: string
}

export function ConsultationQuiz() {
  const t = useTranslations('marketing')
  const locale = useLocale()
  const isAr = locale === 'ar'
  const drName = isAr ? NUTRITIONIST.nameAr : NUTRITIONIST.name
  void t

  const [step, setStep] = useState<Step>('intro')
  const [questionIdx, setQuestionIdx] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [contact, setContact] = useState<ContactInfo>({
    fullName: '',
    email: '',
    phone: '',
    country: '',
  })
  const [website, setWebsite] = useState('') // honeypot
  const [submitState, setSubmitState] = useState<
    'idle' | 'sending' | 'sent' | 'error'
  >('idle')
  const [errorMsg, setErrorMsg] = useState('')
  const [ebookUrl, setEbookUrl] = useState('/ebooks/greenofig-healthy-habits.pdf')

  const total = QUESTIONS.length
  const current = QUESTIONS[questionIdx]
  const progress = useMemo(() => {
    if (step === 'intro') return 0
    if (step === 'contact') return 100
    if (step === 'done') return 100
    return Math.round(((questionIdx + 1) / total) * 100)
  }, [step, questionIdx, total])

  function answer(value: string) {
    if (!current) return
    setAnswers((a) => ({ ...a, [current.id]: value }))
    if (questionIdx + 1 < total) {
      setQuestionIdx(questionIdx + 1)
    } else {
      setStep('contact')
    }
  }

  function back() {
    if (step === 'quiz') {
      if (questionIdx === 0) setStep('intro')
      else setQuestionIdx(questionIdx - 1)
    } else if (step === 'contact') {
      setStep('quiz')
      setQuestionIdx(total - 1)
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitState('sending')
    setErrorMsg('')
    try {
      const res = await fetch('/api/consultation-leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: contact.fullName,
          email: contact.email,
          phone: contact.phone,
          country: contact.country,
          quizAnswers: answers,
          website,
        }),
      })
      if (!res.ok) {
        const j = await res.json().catch(() => ({}))
        throw new Error(j.error ?? 'Could not submit')
      }
      const j = (await res.json()) as { ebookUrl?: string }
      if (j.ebookUrl) setEbookUrl(j.ebookUrl)
      setSubmitState('sent')
      setStep('done')
    } catch (err) {
      setSubmitState('error')
      setErrorMsg(err instanceof Error ? err.message : 'Something went wrong')
    }
  }

  return (
    <section
      id="booking"
      className="relative z-10 w-full px-6 py-16 lg:py-24"
    >
      <div className="max-w-3xl mx-auto">
        <header className="text-center mb-10">
          <p className="text-xs uppercase tracking-eyebrow font-semibold text-lime-400">
            {isAr ? 'تقييم مجاني' : 'Free assessment'}
          </p>
          <h2
            className="mt-3 font-display font-bold text-fg-1 tracking-tight"
            style={{
              fontSize: 'clamp(32px, 4.6vw, 48px)',
              lineHeight: 1.05,
              fontVariationSettings:
                "'opsz' 144, 'wght' 700, 'SOFT' 100, 'WONK' 1",
            }}
          >
            {isAr
              ? 'احصل على تقييمك الصحي + كتاب إلكتروني مجاني.'
              : 'Get your health assessment + free ebook.'}
          </h2>
          <p className="mt-3 text-sm text-fg-2 max-w-lg mx-auto leading-relaxed">
            {isAr
              ? '15 سؤالاً سريعاً تساعدنا في فهم احتياجاتك. ستحصل على كتاب إلكتروني مجاني، وستتواصل معك كوتش التغذية روان شخصياً خلال يوم أو يومين.'
              : '15 quick questions help us understand your needs. You get a free ebook, and Nutrition Coach Rawan personally reaches out within 1–2 business days.'}
          </p>
        </header>

        {/* Card — uses the marketing palette tokens
         * (#132218 surface on #243d2a border) so it sits flush
         * with the rest of the homepage cards (Stats, About,
         * Services, Reviews, etc.) instead of looking like a
         * dashboard panel dropped onto the page. */}
        <div
          className="rounded-2xl font-sans"
          style={{
            background: '#cce8b0',
            border: '1px solid #a8cc8c',
            boxShadow: '0 8px 32px rgba(40,90,40,0.12)',
            overflow: 'hidden',
          }}
        >
          {/* Progress bar */}
          <div
            style={{
              height: 4,
              background: '#b4d49e',
              overflow: 'hidden',
            }}
          >
            <div
              style={{
                height: '100%',
                width: `${progress}%`,
                background:
                  'linear-gradient(90deg, #5a9048, #3d6b2a)',
                boxShadow: '0 0 12px rgba(61,107,42,0.4)',
                transition: 'width 280ms cubic-bezier(0.16,1,0.3,1)',
              }}
            />
          </div>

          <div className="p-6 md:p-9" dir={isAr ? 'rtl' : 'ltr'}>
            {step === 'intro' && (
              <Intro
                isAr={isAr}
                onStart={() => setStep('quiz')}
                drName={drName}
              />
            )}

            {step === 'quiz' && current && (
              <QuizStep
                isAr={isAr}
                idx={questionIdx}
                total={total}
                question={current}
                value={answers[current.id]}
                onAnswer={answer}
                onBack={back}
              />
            )}

            {step === 'contact' && (
              <ContactStep
                isAr={isAr}
                contact={contact}
                setContact={setContact}
                website={website}
                setWebsite={setWebsite}
                onBack={back}
                onSubmit={submit}
                submitting={submitState === 'sending'}
                errorMsg={submitState === 'error' ? errorMsg : ''}
              />
            )}

            {step === 'done' && (
              <Done isAr={isAr} ebookUrl={ebookUrl} drName={drName} />
            )}
          </div>
        </div>
      </div>
    </section>
  )
}

function Intro({
  isAr,
  onStart,
  drName,
}: {
  isAr: boolean
  onStart: () => void
  drName: string
}) {
  return (
    <div className="text-center py-6">
      <div
        className="mx-auto mb-5 flex items-center justify-center"
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'rgba(61,107,42,0.12)',
          border: '1px solid rgba(61,107,42,0.25)',
          boxShadow: '0 0 24px rgba(61,107,42,0.18)',
        }}
      >
        <Sparkles
          className="w-7 h-7"
          strokeWidth={1.6}
          style={{ color: '#3d6b0a' }}
        />
      </div>
      <h3
        className="text-2xl md:text-[28px] mb-2 leading-tight"
        style={{
          color: '#1c2e20',
          fontWeight: 700,
          letterSpacing: '-0.015em',
        }}
      >
        {isAr ? 'ابدأ تقييمك الصحي المجاني' : 'Start your free health assessment'}
      </h3>
      <p
        className="text-sm leading-relaxed max-w-md mx-auto"
        style={{ color: '#4a6352', fontWeight: 400 }}
      >
        {isAr
          ? `15 سؤالاً سريعاً (دقيقتان). يقرؤها ${drName} شخصياً وسيتواصل معك خلال يوم أو يومين. مجاناً تماماً وبدون التزام.`
          : `15 quick questions (about 2 minutes). ${drName} reviews them personally and reaches out within 1–2 business days. Free, no commitment.`}
      </p>
      <button
        type="button"
        onClick={onStart}
        className="btn-primary mt-7 inline-flex"
        style={{ height: 48, padding: '0 28px', fontSize: 15 }}
      >
        {isAr ? 'ابدأ التقييم' : 'Start the assessment'}
        <ArrowRight
          className={`w-4 h-4 ${isAr ? 'rotate-180' : ''}`}
          strokeWidth={2}
        />
      </button>
    </div>
  )
}

function QuizStep({
  isAr,
  idx,
  total,
  question,
  value,
  onAnswer,
  onBack,
}: {
  isAr: boolean
  idx: number
  total: number
  question: Question
  value: string | undefined
  onAnswer: (v: string) => void
  onBack: () => void
}) {
  return (
    <div>
      {/* Step counter — uppercase eyebrow lined up with the dashboard
       * page-header style ("Question 1 of 15"). */}
      <p
        className="text-[11px] uppercase mb-3"
        style={{
          letterSpacing: '0.18em',
          fontWeight: 700,
          color: '#4d7c0f',
        }}
      >
        {isAr ? `سؤال ${idx + 1} من ${total}` : `Question ${idx + 1} of ${total}`}
      </p>
      <h3
        className="text-[22px] md:text-[26px] mb-7 leading-tight"
        style={{
          color: '#1c2e20',
          fontWeight: 600,
          letterSpacing: '-0.01em',
        }}
      >
        {isAr ? question.ar : question.en}
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {question.options?.map((opt) => {
          const selected = value === opt.value
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onAnswer(opt.value)}
              className="text-start rounded-xl text-sm transition-all"
              style={{
                padding: '14px 16px',
                background: selected ? 'rgba(61,107,42,0.12)' : '#d4eac6',
                border: `1px solid ${selected ? '#4d7c0f' : '#a8cc8c'}`,
                color: selected ? '#3d6b0a' : '#1c2e20',
                fontWeight: selected ? 600 : 500,
                letterSpacing: '-0.005em',
                boxShadow: selected
                  ? '0 0 0 3px rgba(61,107,42,0.12)'
                  : 'none',
              }}
              onMouseEnter={(e) => {
                if (!selected) {
                  e.currentTarget.style.background = '#c4dbb0'
                  e.currentTarget.style.borderColor = '#90bc70'
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
                  e.currentTarget.style.background = '#d4eac6'
                  e.currentTarget.style.borderColor = '#a8cc8c'
                }
              }}
            >
              {isAr ? opt.ar : opt.en}
            </button>
          )
        })}
      </div>

      <div className="mt-7 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          className="text-xs inline-flex items-center gap-1.5 rounded-full transition-colors"
          style={{
            padding: '8px 14px',
            background: '#d4eac6',
            color: '#4a6352',
            border: '1px solid #a8cc8c',
            fontWeight: 500,
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#c4dbb0'
            e.currentTarget.style.color = '#1c2e20'
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#d4eac6'
            e.currentTarget.style.color = '#4a6352'
          }}
        >
          <ArrowLeft
            className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`}
            strokeWidth={2}
          />
          {isAr ? 'رجوع' : 'Back'}
        </button>
        <span
          className="text-[11px]"
          style={{ color: '#8a9e8f', fontWeight: 500 }}
        >
          {isAr ? 'انقر إجابتك للمتابعة' : 'Tap an answer to continue'}
        </span>
      </div>
    </div>
  )
}

function ContactStep({
  isAr,
  contact,
  setContact,
  website,
  setWebsite,
  onBack,
  onSubmit,
  submitting,
  errorMsg,
}: {
  isAr: boolean
  contact: ContactInfo
  setContact: (v: ContactInfo) => void
  website: string
  setWebsite: (v: string) => void
  onBack: () => void
  onSubmit: (e: React.FormEvent) => void
  submitting: boolean
  errorMsg: string
}) {
  return (
    <form onSubmit={onSubmit}>
      <p
        className="text-[11px] uppercase mb-2"
        style={{
          letterSpacing: '0.18em',
          fontWeight: 700,
          color: '#4d7c0f',
        }}
      >
        {isAr ? 'الخطوة الأخيرة' : 'Last step'}
      </p>
      <h3
        className="text-[22px] md:text-[26px] mb-1 leading-tight"
        style={{
          color: '#1c2e20',
          fontWeight: 600,
          letterSpacing: '-0.01em',
        }}
      >
        {isAr
          ? 'أين نرسل كتابك الإلكتروني المجاني؟'
          : 'Where should we send your free ebook?'}
      </h3>
      <p
        className="text-sm mb-6 leading-relaxed"
        style={{ color: '#4a6352', fontWeight: 400 }}
      >
        {isAr
          ? 'سترى تأكيداً خلال ثوانٍ، ويصلك الكتاب الإلكتروني والتعليمات على بريدك.'
          : "You'll get a confirmation in seconds and the ebook in your inbox."}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        <Input
          label={isAr ? 'الاسم الكامل' : 'Full name'}
          required
          value={contact.fullName}
          onChange={(v) => setContact({ ...contact, fullName: v })}
          maxLength={120}
        />
        <Input
          label={isAr ? 'البريد الإلكتروني' : 'Email'}
          type="email"
          required
          value={contact.email}
          onChange={(v) => setContact({ ...contact, email: v })}
          maxLength={254}
        />
        <Input
          label={isAr ? 'رقم الهاتف (اختياري)' : 'Phone (optional)'}
          type="tel"
          value={contact.phone}
          onChange={(v) => setContact({ ...contact, phone: v })}
          maxLength={40}
        />
        <Input
          label={isAr ? 'البلد (اختياري)' : 'Country (optional)'}
          value={contact.country}
          onChange={(v) => setContact({ ...contact, country: v })}
          maxLength={80}
        />
      </div>

      {/* Honeypot */}
      <div style={{ position: 'absolute', left: '-9999px' }} aria-hidden>
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {errorMsg && (
        <p
          className="text-sm mt-3"
          style={{
            color: '#fca5a5',
            background: 'rgba(248,113,113,0.08)',
            border: '1px solid rgba(248,113,113,0.25)',
            padding: '10px 12px',
            borderRadius: 8,
          }}
        >
          {errorMsg}
        </p>
      )}

      <p
        className="text-[11px] mt-5 leading-relaxed"
        style={{ color: '#8a9e8f' }}
      >
        {isAr
          ? 'بإرسال هذا النموذج توافق على تواصلنا معك حول استشارتك المجانية. لن نشارك بياناتك مع أي طرف ثالث.'
          : "By submitting you agree we'll contact you about your free consultation. We never share your info with third parties."}
      </p>

      <div className="mt-6 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={onBack}
          disabled={submitting}
          className="text-xs inline-flex items-center gap-1.5 rounded-full transition-colors disabled:opacity-40"
          style={{
            padding: '8px 14px',
            background: '#d4eac6',
            color: '#4a6352',
            border: '1px solid #a8cc8c',
            fontWeight: 500,
          }}
        >
          <ArrowLeft
            className={`w-3.5 h-3.5 ${isAr ? 'rotate-180' : ''}`}
            strokeWidth={2}
          />
          {isAr ? 'رجوع' : 'Back'}
        </button>
        <button
          type="submit"
          disabled={submitting}
          className="btn-primary inline-flex"
          style={{ height: 44, padding: '0 24px', fontSize: 14, opacity: submitting ? 0.7 : 1 }}
        >
          {submitting
            ? (isAr ? 'جارٍ الإرسال…' : 'Sending…')
            : (isAr ? 'احصل على الكتاب الإلكتروني' : 'Get my free ebook')}
        </button>
      </div>
    </form>
  )
}

function Done({
  isAr,
  ebookUrl,
  drName,
}: {
  isAr: boolean
  ebookUrl: string
  drName: string
}) {
  return (
    <div className="text-center py-4">
      <div
        className="mx-auto mb-5 flex items-center justify-center"
        style={{
          width: 56,
          height: 56,
          borderRadius: 16,
          background: 'rgba(61,107,42,0.12)',
          border: '1px solid rgba(61,107,42,0.3)',
          boxShadow: '0 0 28px rgba(61,107,42,0.22)',
        }}
      >
        <CheckCircle2
          className="w-7 h-7"
          strokeWidth={1.6}
          style={{ color: '#3d6b0a' }}
        />
      </div>
      <h3
        className="text-2xl md:text-[28px] mb-2 leading-tight"
        style={{
          color: '#1c2e20',
          fontWeight: 700,
          letterSpacing: '-0.015em',
        }}
      >
        {isAr ? 'تم — تحقق من بريدك ✓' : "You're in — check your inbox ✓"}
      </h3>
      <p
        className="text-sm leading-relaxed max-w-md mx-auto"
        style={{ color: '#4a6352', fontWeight: 400 }}
      >
        {isAr
          ? `أرسلنا كتابك الإلكتروني إلى بريدك للتو. سيتواصل معك ${drName} شخصياً خلال يوم أو يومين لجدولة مكالمتك التعريفية المجانية.`
          : `We just emailed your free ebook. ${drName} will personally reach out within 1–2 business days to schedule your free intro call.`}
      </p>
      <a
        href={ebookUrl}
        download
        className="btn-primary mt-7 inline-flex"
        style={{ height: 44, padding: '0 24px', fontSize: 14 }}
      >
        <Download className="w-4 h-4" strokeWidth={2} />
        {isAr ? 'تنزيل الكتاب الآن' : 'Download the ebook'}
      </a>
    </div>
  )
}

function Input({
  label,
  type = 'text',
  required,
  value,
  onChange,
  maxLength,
}: {
  label: string
  type?: string
  required?: boolean
  value: string
  onChange: (v: string) => void
  maxLength?: number
}) {
  // Marketing input tokens: surface-raised #1a3320 on border #243d2a,
  // focus border #80d93d. The field-tone matches the rest of the
  // homepage cards so the quiz reads as one cohesive marketing surface.
  return (
    <div>
      <label
        className="block text-[11px] mb-1.5"
        style={{
          color: '#4a6352',
          fontWeight: 600,
          letterSpacing: '0.02em',
        }}
      >
        {label}
        {required && (
          <span style={{ color: '#4d7c0f', marginInlineStart: 4 }}>*</span>
        )}
      </label>
      <input
        type={type}
        required={required}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        maxLength={maxLength}
        className="w-full h-11 rounded-lg px-3.5 text-sm transition-colors outline-none"
        style={{
          background: '#d4eac6',
          border: '1px solid #a8cc8c',
          color: '#1c2e20',
          fontWeight: 500,
        }}
        onFocus={(e) => {
          e.currentTarget.style.borderColor = '#4d7c0f'
          e.currentTarget.style.boxShadow =
            '0 0 0 3px rgba(61,107,42,0.15)'
        }}
        onBlur={(e) => {
          e.currentTarget.style.borderColor = '#a8cc8c'
          e.currentTarget.style.boxShadow = 'none'
        }}
      />
    </div>
  )
}
