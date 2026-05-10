'use client'

import { useEffect, useState } from 'react'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Check, X, Plus, Minus, Sparkles, Leaf, Star, Crown, Edit3, type LucideIcon } from 'lucide-react'
import { NUTRITIONIST } from '@/lib/tokens'
import { SiteHeader } from '@/components/SiteHeader'
import { useAuth } from '@/context/AuthContext'

type TierKey = 'free' | 'basic' | 'premium' | 'vip'
const TIER_RANK: Record<TierKey, number> = {
  free: 0,
  basic: 1,
  premium: 2,
  vip: 3,
}

/** Per-tier visual identity. Each tier owns a single accent color used
 *  for the card border, badge tint, checkmark, and price. */
const TIER_THEME: Record<TierKey, {
  border: string
  hoverBorder: string
  badgeBg: string
  badgeText: string
  check: string
  price: string
  glow: string
  hoverGlow: string
  ringWidth: number
  Icon: LucideIcon
}> = {
  free: {
    border: '#374151',
    hoverBorder: '#4b5563',
    badgeBg: '#1f2937',
    badgeText: '#9ca3af',
    check: '#9ca3af',
    price: '#ffffff',
    glow: '0 0 32px rgba(156,163,175,0.08)',
    hoverGlow: '0 0 56px rgba(156,163,175,0.18)',
    ringWidth: 1,
    Icon: Sparkles,
  },
  basic: {
    border: 'rgba(96,165,250,0.5)',
    hoverBorder: 'rgba(96,165,250,0.85)',
    badgeBg: 'rgba(96,165,250,0.1)',
    badgeText: '#60a5fa',
    check: '#60a5fa',
    price: '#60a5fa',
    glow: '0 0 48px rgba(96,165,250,0.28)',
    hoverGlow: '0 0 80px rgba(96,165,250,0.55)',
    ringWidth: 1,
    Icon: Leaf,
  },
  premium: {
    border: 'rgba(163,230,53,0.7)',
    hoverBorder: 'rgba(163,230,53,1)',
    badgeBg: 'rgba(163,230,53,0.1)',
    badgeText: '#a3e635',
    check: '#a3e635',
    price: '#a3e635',
    glow: '0 0 60px rgba(163,230,53,0.4)',
    hoverGlow: '0 0 96px rgba(163,230,53,0.7)',
    ringWidth: 2,
    Icon: Star,
  },
  vip: {
    border: 'rgba(251,191,36,0.5)',
    hoverBorder: 'rgba(251,191,36,0.9)',
    badgeBg: 'rgba(251,191,36,0.1)',
    badgeText: '#fbbf24',
    check: '#fbbf24',
    price: '#fbbf24',
    glow: '0 0 48px rgba(251,191,36,0.28)',
    hoverGlow: '0 0 80px rgba(251,191,36,0.55)',
    ringWidth: 1,
    Icon: Crown,
  },
}

interface Plan {
  name: string
  tier: 'free' | 'basic' | 'premium' | 'vip'
  price: { monthly: number; annual: number }
  currency: string
  description: string
  cta: string
  href: string
  featured: boolean
  badge?: string
  accentColor: string
  features: string[]
  missing: string[]
}

const PLANS: Record<'en' | 'ar', Plan[]> = {
  en: [
    {
      name: 'Free',
      tier: 'free',
      price: { monthly: 0, annual: 0 },
      currency: 'USD',
      description: 'Get started with basic access',
      cta: 'Get Started Free',
      href: '/sign-up',
      featured: false,
      accentColor: '#5c7262',
      features: [
        '3 food scans per day',
        "View Dr. Rawan's posts",
        'Browse the store',
        'Free intro consultation call',
        'Community feed (read only)',
      ],
      missing: [
        'Unlimited food scanning',
        'Nutrition tracking',
        'Personalized meal plans',
        'Direct messaging with Dr. Rawan',
      ],
    },
    {
      name: 'Basic',
      tier: 'basic',
      price: { monthly: 34.99, annual: 29.99 },
      currency: 'USD',
      description: 'Everything you need to track your nutrition',
      cta: 'Start Basic',
      href: '/sign-up?plan=basic',
      featured: false,
      accentColor: '#84cc16',
      features: [
        'Unlimited food scanning',
        'Daily nutrition tracking',
        'Progress charts',
        'Full recipe library',
        'Share milestones',
        'Store access with discounts',
        'Book consultations',
        'Community feed',
      ],
      missing: [
        'Personalized meal plans',
        'AI nutrition assistant',
        'Direct messaging with Dr. Rawan',
      ],
    },
    {
      name: 'Premium',
      tier: 'premium',
      price: { monthly: 49.99, annual: 39.99 },
      currency: 'USD',
      description: 'Personalized plans and direct access to Dr. Rawan',
      cta: 'Start Premium',
      href: '/sign-up?plan=premium',
      featured: true,
      badge: 'Most Popular',
      accentColor: '#3d7a4a',
      features: [
        'Everything in Basic',
        'Custom meal plan from Dr. Rawan',
        'AI nutrition assistant',
        'Advanced health analytics',
        'Sleep & supplement tracking',
        'Auto shopping lists',
        '✉️ Direct messaging with Dr. Rawan',
        'Priority booking slots',
        'Member discounts on store',
      ],
      missing: [],
    },
    {
      name: 'VIP',
      tier: 'vip',
      price: { monthly: 79.99, annual: 59.99 },
      currency: 'USD',
      description: 'The complete Greenofig experience',
      cta: 'Go VIP',
      href: '/sign-up?plan=vip',
      featured: false,
      badge: 'Best Value',
      accentColor: '#c9a84c',
      features: [
        'Everything in Premium',
        'Monthly consultation included',
        'Fastest AI response time',
        'Exclusive VIP products',
        'First access to new features',
        'Monthly personal nutrition review',
        'Priority booking always available',
      ],
      missing: [],
    },
  ],
  ar: [
    {
      name: 'مجاني',
      tier: 'free',
      price: { monthly: 0, annual: 0 },
      currency: 'USD',
      description: 'ابدأ بالوصول الأساسي',
      cta: 'ابدأ مجاناً',
      href: '/sign-up',
      featured: false,
      accentColor: '#5c7262',
      features: [
        '3 مسح غذائي يومياً',
        'مشاهدة منشورات د. روان',
        'تصفح المتجر',
        'مكالمة استشارية تعريفية مجانية',
        'تصفح المجتمع (للقراءة فقط)',
      ],
      missing: [
        'مسح غذائي غير محدود',
        'تتبع التغذية',
        'خطط وجبات مخصصة',
        'التواصل المباشر مع د. روان',
      ],
    },
    {
      name: 'أساسي',
      tier: 'basic',
      price: { monthly: 34.99, annual: 29.99 },
      currency: 'USD',
      description: 'كل ما تحتاجه لتتبع تغذيتك',
      cta: 'ابدأ الأساسي',
      href: '/sign-up?plan=basic',
      featured: false,
      accentColor: '#84cc16',
      features: [
        'مسح غذائي غير محدود',
        'تتبع التغذية اليومية',
        'مخططات التقدم',
        'مكتبة الوصفات الكاملة',
        'مشاركة الإنجازات',
        'وصول للمتجر مع خصومات',
        'حجز الاستشارات',
        'تصفح المجتمع',
      ],
      missing: [
        'خطط وجبات مخصصة',
        'مساعد التغذية الذكي',
        'التواصل المباشر مع د. روان',
      ],
    },
    {
      name: 'مميز',
      tier: 'premium',
      price: { monthly: 49.99, annual: 39.99 },
      currency: 'USD',
      description: 'خطط مخصصة ووصول مباشر لد. روان',
      cta: 'ابدأ المميز',
      href: '/sign-up?plan=premium',
      featured: true,
      badge: 'الأكثر شعبية',
      accentColor: '#3d7a4a',
      features: [
        'كل ما في الأساسي',
        'خطة وجبات مخصصة من د. روان',
        'مساعد التغذية الذكي',
        'تحليلات صحية متقدمة',
        'تتبع النوم والمكملات',
        'قوائم تسوق تلقائية',
        '✉️ تواصل مباشر مع د. روان',
        'أولوية في حجز المواعيد',
        'خصومات حصرية على المتجر',
      ],
      missing: [],
    },
    {
      name: 'VIP',
      tier: 'vip',
      price: { monthly: 79.99, annual: 59.99 },
      currency: 'USD',
      description: 'تجربة Greenofig الكاملة',
      cta: 'انضم لـ VIP',
      href: '/sign-up?plan=vip',
      featured: false,
      badge: 'أفضل قيمة',
      accentColor: '#c9a84c',
      features: [
        'كل ما في المميز',
        'استشارة شهرية مشمولة',
        'أسرع استجابة للذكاء الاصطناعي',
        'منتجات VIP حصرية',
        'أول وصول للميزات الجديدة',
        'مراجعة تغذية شهرية',
        'أولوية حجز دائمة',
      ],
      missing: [],
    },
  ],
}

const FAQS = {
  en: [
    {
      q: 'Can I cancel anytime?',
      a: 'Yes. Cancel from Settings anytime. Your plan stays active until end of billing period with no extra charges.',
    },
    {
      q: 'Is there a free plan?',
      a: 'Yes — our free plan has no time limit. No credit card required to start.',
    },
    {
      q: 'What does direct messaging include?',
      a: 'Premium and VIP members can send private messages directly to Dr. Rawan and receive personal replies.',
    },
    {
      q: 'What payment methods are accepted?',
      a: 'All major credit and debit cards via Stripe. Payments are secure and encrypted.',
    },
    {
      q: 'Can I switch plans?',
      a: 'Yes, upgrade or downgrade anytime from account settings. Changes take effect next billing cycle.',
    },
    {
      q: 'Is there a refund policy?',
      a: '7-day money-back guarantee on your first paid subscription. Contact health@greenofig.com.',
    },
  ],
  ar: [
    {
      q: 'هل يمكن الإلغاء في أي وقت؟',
      a: 'نعم. يمكن الإلغاء من الإعدادات في أي وقت. تظل الخطة نشطة حتى نهاية فترة الفوترة.',
    },
    {
      q: 'هل هناك خطة مجانية؟',
      a: 'نعم — الخطة المجانية بلا حد زمني. لا يلزم إدخال بطاقة للبدء.',
    },
    {
      q: 'ماذا يشمل التواصل المباشر؟',
      a: 'يمكن لأعضاء المميز وVIP إرسال رسائل خاصة مباشرة إلى د. روان وتلقي ردود شخصية.',
    },
    {
      q: 'ما طرق الدفع المتاحة؟',
      a: 'جميع بطاقات الائتمان والخصم الرئيسية عبر Stripe. جميع المدفوعات آمنة ومشفرة.',
    },
    {
      q: 'هل يمكن تغيير الخطة؟',
      a: 'نعم، الترقية أو التخفيض في أي وقت من إعدادات الحساب. تسري التغييرات في الدورة التالية.',
    },
    {
      q: 'ما سياسة الاسترداد؟',
      a: 'ضمان استرداد خلال 7 أيام على أول اشتراك مدفوع. تواصل مع health@greenofig.com.',
    },
  ],
}

const COPY = {
  en: {
    eyebrow: 'SIMPLE PRICING',
    h1: 'Plans that pay for themselves.',
    sub: 'Save 33% with annual. Backed by a 30-day money-back guarantee — cancel anytime, no questions asked.',
    monthly: 'Monthly',
    annual: 'Annual',
    save: 'Save 33%',
    free: 'Free',
    perMo: '/ mo',
    year: 'year',
    orAnnual: 'or ${price}/mo billed annually',
    billedAnnually: 'Billed annually',
    faqTitle: 'Frequently asked questions',
    guaranteeQuote:
      'I stand behind every plan. If you are not seeing results within 30 days, we will work together to find out why — or refund you.',
    guaranteeAttr: '— Dr. Rawan Othman',
  },
  ar: {
    eyebrow: 'أسعار بسيطة',
    h1: 'خطط تستحق كل ريال.',
    sub: 'وفّر 33% مع الاشتراك السنوي. مدعوم بضمان استرداد لمدة 30 يومًا — ألغِ في أي وقت، بلا أسئلة.',
    monthly: 'شهري',
    annual: 'سنوي',
    save: 'وفّر 33%',
    free: 'مجاني',
    perMo: '/ شهر',
    year: 'سنة',
    orAnnual: 'أو ${price}$ شهرياً عند الاشتراك سنوياً',
    billedAnnually: 'يُحسب سنوياً',
    faqTitle: 'أسئلة متكررة',
    guaranteeQuote:
      'أقف وراء كل خطة. إذا لم تلاحظ نتائج خلال 30 يوماً، سنعمل معاً لمعرفة السبب — أو نسترد لك المبلغ.',
    guaranteeAttr: '— د. روان عثمان',
  },
}

export default function PricingPage() {
  const locale = useLocale() as 'en' | 'ar'
  const isAr = locale === 'ar'
  const [billing, setBilling] = useState<'monthly' | 'annual'>('monthly')
  const [openFaq, setOpenFaq] = useState<number | null>(0)
  const { user, tier: rawTier, role } = useAuth()
  const isLoggedIn = !!user
  const isAdmin = role === 'admin'
  const currentTier = (rawTier ?? 'free') as TierKey
  const [loadingTier, setLoadingTier] = useState<TierKey | null>(null)
  // Live sticker amounts loaded from /api/pricing (admin-editable). Falls
  // through to the hardcoded PLANS values until the fetch completes.
  type LivePricing = Record<'basic' | 'premium' | 'vip', { monthly: number; annual: number }>
  const [livePricing, setLivePricing] = useState<LivePricing | null>(null)
  const [editingTier, setEditingTier] = useState<'basic' | 'premium' | 'vip' | null>(null)

  const fetchLivePricing = async () => {
    try {
      const res = await fetch('/api/pricing')
      if (!res.ok) return
      const data = (await res.json()) as LivePricing
      setLivePricing(data)
    } catch {
      /* offline — fall back to hardcoded */
    }
  }
  useEffect(() => {
    void fetchLivePricing()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleUpgrade = async (tier: TierKey) => {
    if (loadingTier || tier === 'free') return
    setLoadingTier(tier)
    try {
      const origin = window.location.origin
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'subscription',
          tier,
          cycle: billing === 'annual' ? 'yearly' : 'monthly',
          successUrl: `${origin}/${locale}/dashboard?upgraded=1`,
          cancelUrl: `${origin}/${locale}/pricing`,
        }),
      })
      const data = (await res.json().catch(() => null)) as
        | { url?: string }
        | null
      if (data?.url) {
        window.location.href = data.url
        return
      }
      alert("Couldn't start checkout. Please try again.")
    } catch (e) {
      console.error('Checkout error:', e)
      alert('Something went wrong. Please try again.')
    } finally {
      setLoadingTier(null)
    }
  }

  const plans = PLANS[locale]
  const faqs = FAQS[locale]
  const copy = COPY[locale]

  return (
    <main className="min-h-screen" style={{ background: '#080808' }}>
      <SiteHeader />
      {/* Spacer for the fixed navbar (h-16 = 64px) */}
      <div style={{ height: 'calc(64px + env(safe-area-inset-top))' }} />
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 md:py-24">
        {/* Header */}
        <header className="text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface border border-primary/40 px-5 py-2 mb-6">
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-lime-400" />
            <span className="text-xs uppercase tracking-eyebrow font-semibold text-lime-400">
              {copy.eyebrow}
            </span>
          </span>
          <h1
            className="font-display font-bold text-white tracking-tight text-3xl md:text-4xl lg:text-5xl"
            style={{
              lineHeight: 1.1,
              fontVariationSettings: "'opsz' 144, 'wght' 700, 'SOFT' 100, 'WONK' 1",
            }}
          >
            {copy.h1}
          </h1>
          <p className="mt-4 text-base lg:text-lg text-fg-2 max-w-xl mx-auto leading-relaxed">
            {copy.sub}
          </p>

          {/* Billing toggle */}
          <div
            className="mt-8 inline-flex items-center gap-1 rounded-full p-1"
            style={{ background: '#122018', border: '1px solid #2a4a30' }}
          >
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`px-5 h-10 rounded-full text-sm font-semibold transition-colors ${
                billing === 'monthly'
                  ? 'bg-gradient-to-b from-lime-400 to-lime-600 text-bg shadow-lime-glow'
                  : 'text-fg-2 hover:text-fg-1'
              }`}
            >
              {copy.monthly}
            </button>
            <button
              type="button"
              onClick={() => setBilling('annual')}
              className={`relative px-5 h-10 rounded-full text-sm font-semibold transition-colors ${
                billing === 'annual'
                  ? 'text-bg'
                  : 'text-fg-2 hover:text-fg-1'
              }`}
              style={
                billing === 'annual'
                  ? {
                      background:
                        'linear-gradient(180deg, #f59e0b, #d97706)',
                      boxShadow: '0 0 16px rgba(245, 158, 11, 0.5)',
                    }
                  : undefined
              }
            >
              {copy.annual}
              <span
                className="absolute -top-2 -end-3 inline-flex items-center rounded-full text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 leading-none"
                style={{
                  minHeight: 18,
                  background: 'linear-gradient(135deg, #fb7185, #ef4444)',
                  color: '#ffffff',
                  boxShadow: '0 0 16px rgba(248, 113, 113, 0.7), 0 0 32px rgba(239, 68, 68, 0.35)',
                  border: '1px solid rgba(248, 113, 113, 0.8)',
                  textShadow: '0 0 6px rgba(255, 255, 255, 0.45)',
                }}
              >
                {copy.save}
              </span>
            </button>
          </div>
        </header>

        {/* Paid plans — Basic / Premium / VIP side by side. Free
         *  isn't a "plan" the same way the paid tiers are, so we
         *  pull it out into a smaller standalone card below to
         *  reduce visual noise in the comparison grid. */}
        <ul
          dir={isAr ? 'rtl' : 'ltr'}
          className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start mt-16"
        >
          {plans
            .filter((p) => p.tier !== 'free')
            .map((plan) => (
              <PlanCard
                key={plan.tier}
                plan={plan}
                billing={billing}
                copy={copy}
                isLoggedIn={isLoggedIn}
                currentTier={currentTier}
                isAr={isAr}
                loadingTier={loadingTier}
                onUpgrade={handleUpgrade}
                isAdmin={isAdmin}
                onEdit={() => setEditingTier(plan.tier as 'basic' | 'premium' | 'vip')}
                livePrice={
                  plan.tier === 'basic' || plan.tier === 'premium' || plan.tier === 'vip'
                    ? livePricing?.[plan.tier]
                    : undefined
                }
              />
            ))}
        </ul>

        {/* Free plan — standalone wide card centered below the paid grid */}
        <ul
          dir={isAr ? 'rtl' : 'ltr'}
          className="max-w-5xl mx-auto mt-6"
        >
          {plans
            .filter((p) => p.tier === 'free')
            .map((plan) => (
              <PlanCard
                key={plan.tier}
                plan={plan}
                billing={billing}
                copy={copy}
                isLoggedIn={isLoggedIn}
                currentTier={currentTier}
                isAr={isAr}
                loadingTier={loadingTier}
                onUpgrade={handleUpgrade}
                isAdmin={false}
                onEdit={() => undefined}
                livePrice={undefined}
              />
            ))}
        </ul>

        {/* Dr. Rawan guarantee */}
        <section
          className="max-w-xl mx-auto rounded-2xl p-10 text-center mt-16"
          style={{ background: '#122018', border: '1px solid #2a4a30' }}
        >
          <div className="w-16 h-16 rounded-full overflow-hidden mx-auto border-2 border-primary mb-4">
            <Image
              src="/images/dr-rawan-othman.jpg"
              alt={isAr ? NUTRITIONIST.nameAr : NUTRITIONIST.name}
              width={64}
              height={64}
              className="w-full h-full object-cover object-top"
            />
          </div>
          <p className="font-display italic text-fg-1 text-lg leading-relaxed">
            {`"${copy.guaranteeQuote}"`}
          </p>
          <p className="mt-4 text-sm text-lime-400 font-semibold">{copy.guaranteeAttr}</p>
        </section>

        {/* FAQ */}
        <section className="max-w-2xl mx-auto mt-16">
          <h2 className="font-display font-bold text-2xl lg:text-3xl text-fg-1 text-center mb-8">
            {copy.faqTitle}
          </h2>
          <ul className="space-y-1">
            {faqs.map((item, i) => {
              const open = openFaq === i
              return (
                <li key={i} className="border-b border-border">
                  <button
                    type="button"
                    onClick={() => setOpenFaq(open ? null : i)}
                    className="w-full flex items-center justify-between gap-4 py-5 text-start text-fg-1 font-medium hover:text-lime-400 transition-colors"
                    aria-expanded={open}
                  >
                    <span className="text-base">{item.q}</span>
                    {open ? (
                      <Minus className="w-4 h-4 shrink-0 text-lime-400" strokeWidth={2} />
                    ) : (
                      <Plus className="w-4 h-4 shrink-0 text-fg-3" strokeWidth={2} />
                    )}
                  </button>
                  {open && (
                    <p className="text-sm text-fg-2 pb-5 leading-relaxed">{item.a}</p>
                  )}
                </li>
              )
            })}
          </ul>
        </section>
      </div>

      {editingTier && livePricing && (
        <EditPricingModal
          tier={editingTier}
          current={livePricing[editingTier]}
          onClose={() => setEditingTier(null)}
          onSaved={async () => {
            setEditingTier(null)
            await fetchLivePricing()
          }}
        />
      )}
    </main>
  )
}

function EditPricingModal({
  tier,
  current,
  onClose,
  onSaved,
}: {
  tier: 'basic' | 'premium' | 'vip'
  current: { monthly: number; annual: number }
  onClose: () => void
  onSaved: () => void
}) {
  const [monthly, setMonthly] = useState(current.monthly.toFixed(2))
  const [annual, setAnnual] = useState(current.annual.toFixed(2))
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (busy) return
    setError(null)

    const monthlyNum = Number(monthly)
    const annualNum = Number(annual)
    if (!Number.isFinite(monthlyNum) || monthlyNum <= 0) {
      setError('Monthly price must be a positive number')
      return
    }
    if (!Number.isFinite(annualNum) || annualNum <= 0) {
      setError('Annual-per-month price must be a positive number')
      return
    }

    // Send updates only for the cycles that actually changed.
    const updates: { cycle: 'monthly' | 'yearly'; amountUsd: number }[] = []
    if (Math.abs(monthlyNum - current.monthly) > 0.001) {
      updates.push({ cycle: 'monthly', amountUsd: monthlyNum })
    }
    if (Math.abs(annualNum - current.annual) > 0.001) {
      // Stripe yearly amount = annual-per-month * 12 — the user enters
      // the per-month cost which we convert here.
      updates.push({ cycle: 'yearly', amountUsd: Number((annualNum * 12).toFixed(2)) })
    }
    if (updates.length === 0) {
      onClose()
      return
    }

    setBusy(true)
    try {
      for (const upd of updates) {
        const res = await fetch('/api/admin/pricing', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ tier, ...upd }),
        })
        if (!res.ok) {
          const data = (await res.json().catch(() => ({}))) as {
            error?: string | { message?: string }
          }
          const msg =
            typeof data.error === 'string'
              ? data.error
              : data.error?.message ?? `Save failed (${res.status})`
          setError(msg)
          setBusy(false)
          return
        }
      }
      onSaved()
    } catch {
      setError('Network error')
      setBusy(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        className="w-full max-w-md rounded-2xl border border-border bg-surface p-6 space-y-5"
      >
        <header>
          <h2 className="text-lg font-bold text-fg-1">
            Edit {tier.toUpperCase()} pricing
          </h2>
          <p className="mt-1 text-xs text-fg-3">
            Updates the Stripe price + sticker amount on this page. Existing
            subscribers keep their old price until they switch plans.
          </p>
        </header>

        <label className="block">
          <span className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5 block">
            Monthly (USD)
          </span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary"
            dir="ltr"
          />
        </label>

        <label className="block">
          <span className="text-xs uppercase tracking-eyebrow text-fg-3 font-semibold mb-1.5 block">
            Annual — per-month USD
          </span>
          <input
            type="number"
            step="0.01"
            min="0.01"
            required
            value={annual}
            onChange={(e) => setAnnual(e.target.value)}
            className="w-full h-10 rounded-md bg-bg-deeper border border-border px-3 text-sm font-mono text-fg-1 focus:outline-none focus:border-primary"
            dir="ltr"
          />
          <p className="mt-1 text-[11px] text-fg-3">
            Stripe will charge ${(Number(annual || '0') * 12).toFixed(2)} per year.
          </p>
        </label>

        {error && (
          <p className="text-xs" style={{ color: '#fca5a5' }}>
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="rounded-pill bg-surface-raised border border-border h-9 px-4 text-xs font-semibold text-fg-1 hover:border-primary/40 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-1.5 rounded-pill bg-gradient-to-b from-lime-400 to-lime-600 text-bg font-semibold h-9 px-4 text-xs shadow-lime-glow border border-lime-600/60 disabled:opacity-50 disabled:cursor-wait"
          >
            {busy ? 'Saving…' : 'Save & sync to Stripe'}
          </button>
        </div>
      </form>
    </div>
  )
}

function PlanCard({
  plan,
  billing,
  copy,
  isLoggedIn,
  currentTier,
  isAr,
  loadingTier,
  onUpgrade,
  isAdmin,
  onEdit,
  livePrice,
}: {
  plan: Plan
  billing: 'monthly' | 'annual'
  copy: typeof COPY.en
  isLoggedIn: boolean
  currentTier: TierKey
  isAr: boolean
  loadingTier: TierKey | null
  onUpgrade: (tier: TierKey) => void
  isAdmin: boolean
  onEdit: () => void
  livePrice?: { monthly: number; annual: number }
}) {
  // Effective price = live (admin-editable) OR fallback to the hardcoded
  // plan.price. Both monthly and annual.
  const monthly = livePrice?.monthly ?? plan.price.monthly
  const annual = livePrice?.annual ?? plan.price.annual
  const price = billing === 'monthly' ? monthly : annual
  const isFree = price === 0
  const theme = TIER_THEME[plan.tier]
  const [hovered, setHovered] = useState(false)

  // Tier comparison drives the entire CTA — what it says, where it
  // routes, whether it's clickable.
  const cardRank = TIER_RANK[plan.tier]
  const userRank = TIER_RANK[currentTier]
  const isCurrent = isLoggedIn && plan.tier === currentTier
  const isLowerThanCurrent = isLoggedIn && cardRank < userRank
  const isHigherThanCurrent = isLoggedIn && cardRank > userRank

  // Sign-up flow uses the existing /sign-up?plan= deep link; signed-in
  // upgrades go straight to Stripe via /api/stripe/checkout when we add
  // an inline upgrade — for now reuse the same href so it works.
  const ctaText = (() => {
    if (isCurrent) {
      return isAr ? '✓ خطتك الحالية' : '✓ Current Plan'
    }
    if (isLowerThanCurrent) {
      return isAr ? '✓ مُتضمَّن' : '✓ Included'
    }
    if (isHigherThanCurrent) {
      return isAr
        ? `الترقية إلى ${plan.name}`
        : `Upgrade to ${plan.name}`
    }
    return plan.cta
  })()

  return (
    <li
      className="relative rounded-2xl p-8"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: '#0d1117',
        border: `${theme.ringWidth}px solid ${
          hovered ? theme.hoverBorder : theme.border
        }`,
        boxShadow: hovered ? theme.hoverGlow : theme.glow,
        transform: hovered ? 'translateY(-6px)' : 'translateY(0)',
        transition:
          'transform 280ms cubic-bezier(0.16, 1, 0.3, 1), box-shadow 280ms cubic-bezier(0.16, 1, 0.3, 1), border-color 280ms cubic-bezier(0.16, 1, 0.3, 1)',
      }}
    >
      {/* Per-tier label badge above the card (Most Popular / Best Value) */}
      {plan.badge && (
        <span
          className="absolute -top-3 start-1/2 -translate-x-1/2 text-xs px-3 py-1 rounded-full font-semibold whitespace-nowrap"
          style={{
            background: theme.badgeBg,
            color: theme.badgeText,
            border: `1px solid ${theme.border}`,
          }}
        >
          {plan.badge}
        </span>
      )}

      {/* Current-plan ribbon (only when logged-in user owns this tier) */}
      {isCurrent && (
        <span
          className="absolute start-1/2 -translate-x-1/2 -translate-y-1/2 whitespace-nowrap"
          style={{
            top: 0,
            background: 'linear-gradient(to bottom, #a3e635, #65a30d)',
            color: '#0d1a12',
            fontSize: 11,
            fontWeight: 700,
            padding: '4px 16px',
            borderRadius: 999,
            border: '1px solid rgba(101, 163, 13, 0.6)',
            letterSpacing: '0.04em',
            textTransform: 'uppercase',
          }}
        >
          ✓ {isAr ? 'خطتك الحالية' : 'Your Current Plan'}
        </span>
      )}

      {/* Layout wrapper — Free splits horizontally (info left, features
       *  right) so the standalone wide card stays compact vertically.
       *  Paid tiers stack vertically inside their narrow grid cells. */}
      <div
        className={
          plan.tier === 'free'
            ? 'flex flex-col md:flex-row md:gap-10 md:items-stretch'
            : ''
        }
      >
      <div className={plan.tier === 'free' ? 'md:basis-1/3 md:shrink-0' : ''}>
      {/* Card head — tier icon + name. Drops the small "BASIC/PREMIUM/VIP"
       *  pill badge that used to sit below; the tier name is already in the
       *  h3 so it was redundant. The icon gives each card visual identity
       *  without needing a duplicate label. */}
      <div
        className="mb-3 flex items-center gap-3"
        style={{ marginTop: isCurrent ? 12 : 0 }}
      >
        <span
          aria-hidden
          className="inline-flex items-center justify-center shrink-0 rounded-xl"
          style={{
            width: 44,
            height: 44,
            background: theme.badgeBg,
            border: `1px solid ${theme.border}`,
          }}
        >
          <theme.Icon
            className="w-5 h-5"
            strokeWidth={1.75}
            style={{ color: theme.check }}
          />
        </span>
        <h3 className="font-sans font-bold text-white text-2xl">
          {plan.name}
        </h3>
      </div>

      <p className="text-sm text-fg-2 mb-6 leading-relaxed">{plan.description}</p>

      {/* Price — colored to match the tier.
       *  Monthly mode → big per-month price.
       *  Annual mode  → big per-month price + a sub-line that shows the
       *  full year total with the regular yearly cost (monthly × 12)
       *  scratched out, so the savings are obvious at a glance. */}
      <div className={`mb-6 ${isFree ? 'min-h-[56px]' : 'min-h-[100px]'}`}>
        {isFree ? (
          <p
            className="text-4xl font-bold leading-none"
            style={{ color: theme.price }}
          >
            {copy.free}
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2" dir="ltr">
              <span
                className="text-4xl font-bold leading-none"
                style={{ color: theme.price }}
              >
                ${price.toFixed(2)}
              </span>
              <span className="text-xs text-fg-3">{copy.perMo}</span>
            </div>
            {billing === 'annual' ? (
              <p
                className="text-[12px] text-fg-3 mt-2 flex items-center flex-wrap"
                style={{ gap: 6 }}
                dir="ltr"
              >
                <span className="line-through" style={{ opacity: 0.55 }}>
                  ${(monthly * 12).toFixed(2)}
                </span>
                <span className="font-semibold" style={{ color: theme.price }}>
                  ${(annual * 12).toFixed(2)}
                </span>
                <span style={{ opacity: 0.7 }}>/ {copy.year}</span>
              </p>
            ) : (
              <p className="text-[11px] text-fg-3 mt-2" style={{ opacity: 0.7 }}>
                {copy.orAnnual.replace('{price}', annual.toFixed(2))}
              </p>
            )}
            {isAdmin && plan.tier !== 'free' && (
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  onEdit()
                }}
                className="mt-3 inline-flex items-center gap-1.5 rounded-pill bg-amber-500/10 text-amber-300 border border-amber-500/30 h-8 px-3 text-[11px] font-semibold hover:bg-amber-500/20"
                title="Admin: edit pricing"
              >
                <Edit3 className="w-3 h-3" strokeWidth={2} />
                Edit pricing
              </button>
            )}
          </>
        )}
      </div>

      {/* CTA — three states: current, downgrade-disabled, upgrade.
       * Logged-in upgrades skip /sign-up and go straight to Stripe. */}
      {isCurrent || isLowerThanCurrent ? (
        <button
          type="button"
          disabled
          aria-disabled
          className="w-full inline-flex items-center justify-center font-semibold whitespace-nowrap"
          style={{
            background: 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.15)',
            color: 'rgba(255,255,255,0.5)',
            cursor: 'not-allowed',
            borderRadius: 9999,
            height: 48,
            fontSize: 15,
          }}
        >
          {ctaText}
        </button>
      ) : isLoggedIn && plan.tier !== 'free' ? (
        <button
          type="button"
          onClick={() => onUpgrade(plan.tier)}
          disabled={loadingTier !== null}
          className={
            (plan.tier === 'premium' ? 'btn-primary' : 'btn-secondary') +
            ' w-full disabled:cursor-wait disabled:opacity-70'
          }
          style={{ width: '100%' }}
        >
          {loadingTier === plan.tier ? (
            <>
              <span
                aria-hidden
                className="w-4 h-4 rounded-full border-2 animate-spin"
                style={{
                  borderColor:
                    plan.tier === 'premium'
                      ? 'rgba(13,26,18,0.2)'
                      : 'rgba(163,230,53,0.25)',
                  borderTopColor:
                    plan.tier === 'premium' ? '#0d1a12' : '#a3e635',
                }}
              />
              {isAr ? 'جارٍ التوجيه…' : 'Redirecting…'}
            </>
          ) : (
            ctaText
          )}
        </button>
      ) : (
        <Link
          href={plan.href}
          className={
            plan.tier === 'premium' ? 'btn-primary w-full' : 'btn-secondary w-full'
          }
          style={{ width: '100%' }}
        >
          {ctaText}
        </Link>
      )}

      </div>

      {plan.tier !== 'free' && (
        <hr className="my-6" style={{ borderColor: '#222' }} />
      )}

      {/* Features — flat tier-colored icons, matches the rest of the site.
       *  Free is the wide standalone card and uses a 2-column layout so
       *  included features (left) sit opposite the missing ones (right);
       *  paid cards keep a single column to fit the narrow 3-col grid. */}
      <div
        className={
          plan.tier === 'free'
            ? 'flex-1 md:border-s md:border-[#222] md:ps-10 md:flex md:items-center'
            : ''
        }
      >
      {plan.tier === 'free' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-10 gap-y-3 w-full">
          <ul className="flex flex-col gap-y-3">
            {plan.features.map((f) => {
              const text = f.replace(/^✉️\s*/, '')
              return (
                <li key={f} className="flex items-start gap-2.5">
                  <Check
                    aria-hidden
                    className="shrink-0 w-5 h-5 mt-0.5"
                    strokeWidth={2}
                    style={{ color: theme.check }}
                  />
                  <span
                    className="text-sm leading-relaxed"
                    style={{ color: '#d1d5db' }}
                  >
                    {text}
                  </span>
                </li>
              )
            })}
          </ul>
          <ul className="flex flex-col gap-y-3">
            {plan.missing.map((f) => (
              <li key={f} className="flex items-start gap-2.5">
                <X
                  aria-hidden
                  className="shrink-0 w-5 h-5 mt-0.5"
                  strokeWidth={2}
                  style={{ color: '#6b7280' }}
                />
                <span
                  className="text-sm leading-relaxed line-through"
                  style={{ color: '#6b7280' }}
                >
                  {f}
                </span>
              </li>
            ))}
          </ul>
        </div>
      ) : (
        <ul className="flex flex-col gap-y-3">
          {plan.features.map((f) => {
            const text = f.replace(/^✉️\s*/, '')
            return (
              <li key={f} className="flex items-start gap-2.5">
                <Check
                  aria-hidden
                  className="shrink-0 w-5 h-5 mt-0.5"
                  strokeWidth={2}
                  style={{ color: theme.check }}
                />
                <span
                  className="text-sm leading-relaxed"
                  style={{ color: '#d1d5db' }}
                >
                  {text}
                </span>
              </li>
            )
          })}
          {plan.missing.map((f) => (
            <li key={f} className="flex items-start gap-2.5">
              <X
                aria-hidden
                className="shrink-0 w-5 h-5 mt-0.5"
                strokeWidth={2}
                style={{ color: '#6b7280' }}
              />
              <span
                className="text-sm leading-relaxed line-through"
                style={{ color: '#6b7280' }}
              >
                {f}
              </span>
            </li>
          ))}
        </ul>
      )}
      </div>
      </div>
    </li>
  )
}
