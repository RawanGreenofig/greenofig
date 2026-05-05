'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useLocale } from 'next-intl'
import { Link } from '@/i18n/navigation'
import { Check, X, Plus, Minus } from 'lucide-react'
import { NUTRITIONIST } from '@/lib/tokens'

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
      currency: 'SAR',
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
      price: { monthly: 29, annual: 23 },
      currency: 'SAR',
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
      price: { monthly: 79, annual: 63 },
      currency: 'SAR',
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
      price: { monthly: 149, annual: 119 },
      currency: 'SAR',
      description: 'The complete Greenofig experience',
      cta: 'Go VIP',
      href: '/sign-up?plan=vip',
      featured: false,
      badge: 'Best Value',
      accentColor: '#c9a84c',
      features: [
        'Everything in Premium',
        '✉️ Direct messaging with Dr. Rawan',
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
      currency: 'SAR',
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
      price: { monthly: 29, annual: 23 },
      currency: 'SAR',
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
      price: { monthly: 79, annual: 63 },
      currency: 'SAR',
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
      price: { monthly: 149, annual: 119 },
      currency: 'SAR',
      description: 'تجربة Greenofig الكاملة',
      cta: 'انضم لـ VIP',
      href: '/sign-up?plan=vip',
      featured: false,
      badge: 'أفضل قيمة',
      accentColor: '#c9a84c',
      features: [
        'كل ما في المميز',
        '✉️ تواصل مباشر مع د. روان',
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
      a: '7-day money-back guarantee on your first paid subscription. Contact support@greenofig.com.',
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
      a: 'ضمان استرداد خلال 7 أيام على أول اشتراك مدفوع. تواصل مع support@greenofig.com.',
    },
  ],
}

const COPY = {
  en: {
    eyebrow: 'SIMPLE PRICING',
    h1: 'Choose your plan',
    sub: 'Start free. Upgrade when ready. Cancel anytime.',
    monthly: 'Monthly',
    annual: 'Annual',
    save: 'Save 20%',
    free: 'Free',
    perMo: '/ mo',
    billedAnnually: 'Billed annually',
    faqTitle: 'Frequently asked questions',
    guaranteeQuote:
      'I stand behind every plan. If you are not seeing results within 30 days, we will work together to find out why — or refund you.',
    guaranteeAttr: '— Dr. Rawan Othman',
  },
  ar: {
    eyebrow: 'أسعار بسيطة',
    h1: 'اختر خطتك',
    sub: 'ابدأ مجاناً. قم بالترقية عندما تكون مستعداً. ألغِ في أي وقت.',
    monthly: 'شهري',
    annual: 'سنوي',
    save: 'وفّر 20%',
    free: 'مجاني',
    perMo: '/ شهر',
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

  const plans = PLANS[locale]
  const faqs = FAQS[locale]
  const copy = COPY[locale]

  return (
    <main className="bg-bg min-h-screen">
      <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28">
        {/* Header */}
        <header className="text-center mb-12">
          <span className="inline-flex items-center gap-2 rounded-full bg-surface border border-primary/40 px-5 py-2 mb-6">
            <span aria-hidden className="w-1.5 h-1.5 rounded-full bg-lime-400" />
            <span className="text-xs uppercase tracking-eyebrow font-semibold text-lime-400">
              {copy.eyebrow}
            </span>
          </span>
          <h1
            className="font-display font-bold text-fg-1 tracking-tight"
            style={{
              fontSize: 'clamp(2.2rem, 5vw, 3.5rem)',
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
          <div className="mt-8 inline-flex items-center gap-1 rounded-full bg-surface border border-border p-1">
            <button
              type="button"
              onClick={() => setBilling('monthly')}
              className={`px-5 h-10 rounded-full text-sm font-semibold transition-colors ${
                billing === 'monthly' ? 'bg-primary text-fg-1' : 'text-fg-2 hover:text-fg-1'
              }`}
            >
              {copy.monthly}
            </button>
            <button
              type="button"
              onClick={() => setBilling('annual')}
              className={`relative px-5 h-10 rounded-full text-sm font-semibold transition-colors ${
                billing === 'annual' ? 'bg-primary text-fg-1' : 'text-fg-2 hover:text-fg-1'
              }`}
            >
              {copy.annual}
              <span
                className="absolute -top-2 -end-3 inline-flex items-center rounded-full bg-lime-400 text-bg text-[10px] font-bold px-2 py-0.5 leading-none"
                style={{ minHeight: 18 }}
              >
                {copy.save}
              </span>
            </button>
          </div>
        </header>

        {/* Plans grid */}
        <ul
          dir={isAr ? 'rtl' : 'ltr'}
          className="grid gap-6 md:grid-cols-2 lg:grid-cols-4 items-start mt-16"
        >
          {plans.map((plan) => (
            <PlanCard key={plan.tier} plan={plan} billing={billing} copy={copy} />
          ))}
        </ul>

        {/* Dr. Rawan guarantee */}
        <section className="max-w-xl mx-auto bg-surface border border-border rounded-2xl p-10 text-center mt-12">
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
    </main>
  )
}

function PlanCard({
  plan,
  billing,
  copy,
}: {
  plan: Plan
  billing: 'monthly' | 'annual'
  copy: typeof COPY.en
}) {
  const price = billing === 'monthly' ? plan.price.monthly : plan.price.annual
  const isFree = price === 0
  const isFeatured = plan.featured
  const badgeBg = plan.tier === 'vip' ? '#c9a84c' : plan.accentColor

  return (
    <li
      className={`relative rounded-2xl bg-surface p-8 transition-all ${
        isFeatured
          ? 'border-[1.5px] border-primary lg:scale-[1.02]'
          : 'border border-border'
      }`}
      style={
        isFeatured
          ? { boxShadow: '0 0 48px rgba(61,122,74,0.15)' }
          : undefined
      }
    >
      {plan.badge && (
        <span
          className="absolute -top-3 start-1/2 -translate-x-1/2 rounded-full px-4 py-1.5 text-xs font-bold text-bg whitespace-nowrap"
          style={{ background: badgeBg }}
        >
          {plan.badge}
        </span>
      )}

      <div className="mb-3">
        <h3 className="font-sans font-bold text-fg-1 text-xl mb-1">{plan.name}</h3>
        <span
          className="inline-block rounded-full text-[10px] uppercase tracking-eyebrow font-bold px-2 py-0.5"
          style={{
            border: `1px solid ${plan.accentColor}`,
            color: plan.accentColor,
          }}
        >
          {plan.tier}
        </span>
      </div>

      <p className="text-sm text-fg-2 mb-5 leading-relaxed">{plan.description}</p>

      {/* Price */}
      <div className="mb-6 min-h-[80px]">
        {isFree ? (
          <p
            className="font-display font-bold leading-none"
            style={{ fontSize: '2.5rem', color: '#a3e635' }}
          >
            {copy.free}
          </p>
        ) : (
          <>
            <div className="flex items-baseline gap-2" dir="ltr">
              <span
                className="font-mono font-bold leading-none"
                style={{ fontSize: '2.75rem', color: plan.accentColor }}
              >
                {price}
              </span>
              <span className="text-sm text-fg-2 font-semibold">{plan.currency}</span>
              <span className="text-xs text-fg-3">{copy.perMo}</span>
            </div>
            {billing === 'annual' && (
              <p className="text-[11px] text-fg-3 mt-1.5">{copy.billedAnnually}</p>
            )}
          </>
        )}
      </div>

      {/* CTA */}
      <Link
        href={plan.href}
        className={`block w-full rounded-full py-3 text-center text-sm font-semibold transition-all ${
          isFeatured
            ? 'bg-gradient-to-b from-lime-400 to-lime-600 text-bg shadow-lime-glow border border-lime-600/60 hover:-translate-y-px'
            : 'bg-transparent border hover:opacity-90'
        }`}
        style={
          isFeatured
            ? undefined
            : { borderColor: plan.accentColor, color: plan.accentColor }
        }
      >
        {plan.cta}
      </Link>

      <hr className="border-border my-5" />

      {/* Features */}
      <ul className="space-y-2.5">
        {plan.features.map((f) => {
          const isDirectMessaging = f.includes('✉️')
          return (
            <li key={f} className="flex items-start gap-2.5">
              <span
                aria-hidden
                className="shrink-0 w-5 h-5 rounded-full inline-flex items-center justify-center mt-0.5"
                style={{
                  background: 'rgba(61,122,74,0.18)',
                  border: '1px solid rgba(61,122,74,0.4)',
                }}
              >
                <Check className="w-3 h-3 text-lime-400" strokeWidth={2.5} />
              </span>
              <span
                className={`text-sm leading-snug ${
                  isDirectMessaging ? 'text-fg-1 font-semibold' : 'text-fg-2'
                }`}
              >
                {f}
              </span>
            </li>
          )
        })}
        {plan.missing.map((f) => (
          <li key={f} className="flex items-start gap-2.5" style={{ opacity: 0.45 }}>
            <span
              aria-hidden
              className="shrink-0 w-5 h-5 rounded-full inline-flex items-center justify-center mt-0.5 bg-bg-deeper"
            >
              <X className="w-3 h-3 text-fg-3" strokeWidth={2} />
            </span>
            <span className="text-sm text-fg-3 line-through leading-snug">{f}</span>
          </li>
        ))}
      </ul>
    </li>
  )
}
