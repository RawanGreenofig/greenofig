import type { Metadata } from 'next'
import { useLocale } from 'next-intl'
import { SimplePage, H2, P } from '@/components/SimplePage'

export const metadata: Metadata = {
  title: 'Terms of Service | Greenofig',
  description: 'The terms governing your use of the Greenofig nutrition platform.',
}

export default function TermsPage() {
  const locale = useLocale() as 'en' | 'ar'
  const isAr = locale === 'ar'

  if (isAr) {
    return (
      <SimplePage title="شروط الخدمة" subtitle="آخر تحديث: 4 مايو 2026" isAr>
        <P>
          باستخدامك لمنصة غرينوفيغ فإنك توافق على هذه الشروط. اقرأها بعناية. إن لم توافق
          عليها، لا تستخدم الخدمة.
        </P>

        <H2>الخدمة</H2>
        <P>
          غرينوفيغ منصة تغذية رقمية تقدّم خطط طعام شخصية، مساعداً ذكياً، استشارات مع د. روان
          عثمان، ومنتجات مكملات. الخدمة معلوماتية ولا تحلّ محل الاستشارة الطبية.
        </P>

        <H2>الحسابات</H2>
        <P>
          أنت مسؤول عن أمان حسابك وعن جميع الأنشطة التي تحصل تحته. يجب أن تكون 18 عاماً أو
          أكبر للتسجيل.
        </P>

        <H2>المدفوعات والاشتراكات</H2>
        <P>
          الاشتراكات تجدّد تلقائياً ما لم تلغِها قبل نهاية الفترة. يمكنك الإلغاء في أي وقت من
          صفحة الإعدادات. المبالغ المدفوعة غير قابلة للاسترداد بعد 14 يوماً من الشراء.
        </P>

        <H2>المحتوى الطبي</H2>
        <P>
          المحتوى التغذوي والاستشارات على المنصة لأغراض تعليمية فقط. لا يستبدل تشخيصاً طبياً
          أو علاجاً. استشر طبيبك قبل أي تغيير غذائي كبير، خاصة إن كان لديك حالات مزمنة أو حمل
          أو رضاعة.
        </P>

        <H2>الاستخدام المحظور</H2>
        <P>
          ممنوع استخدام المنصة لأي نشاط غير قانوني، أو إساءة استخدام المساعد الذكي، أو محاولة
          الوصول لبيانات مستخدمين آخرين.
        </P>

        <H2>إنهاء الحساب</H2>
        <P>
          يحقّ لنا تعليق أو إنهاء حسابك إن انتهكت هذه الشروط. يمكنك أنت أيضاً إنهاء حسابك في
          أي وقت من الإعدادات.
        </P>

        <H2>تعديل الشروط</H2>
        <P>قد نحدّث هذه الشروط. سنُعلمك بأي تغييرات جوهرية عبر البريد الإلكتروني.</P>
      </SimplePage>
    )
  }

  return (
    <SimplePage title="Terms of Service" subtitle="Last updated: 4 May 2026">
      <P>
        By using the Greenofig platform you agree to these terms. Read them carefully. If you
        don&apos;t agree, don&apos;t use the service.
      </P>

      <H2>The service</H2>
      <P>
        Greenofig is a digital nutrition platform offering personalized meal plans, an AI
        assistant, consultations with Dr. Rawan Othman, and supplement products. The service is
        informational and not a substitute for medical advice.
      </P>

      <H2>Accounts</H2>
      <P>
        You&apos;re responsible for the security of your account and all activity under it. You must
        be 18 years or older to register.
      </P>

      <H2>Payments and subscriptions</H2>
      <P>
        Subscriptions auto-renew unless you cancel before the period ends. You can cancel at any
        time from Settings. Paid amounts are non-refundable after 14 days from purchase.
      </P>

      <H2>Medical content</H2>
      <P>
        Nutrition content and consultations on the platform are for educational purposes only.
        They do not replace medical diagnosis or treatment. Consult your doctor before making
        any major dietary change, especially if you have chronic conditions, are pregnant, or
        breastfeeding.
      </P>

      <H2>Prohibited use</H2>
      <P>
        You may not use the platform for any illegal activity, abuse the AI assistant, or attempt
        to access other users&apos; data.
      </P>

      <H2>Account termination</H2>
      <P>
        We may suspend or terminate your account if you violate these terms. You may also
        terminate your account at any time from Settings.
      </P>

      <H2>Changes to these terms</H2>
      <P>We may update these terms. We&apos;ll notify you of any material changes by email.</P>
    </SimplePage>
  )
}
