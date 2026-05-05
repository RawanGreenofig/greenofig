import type { Metadata } from 'next'
import { useLocale } from 'next-intl'
import { SimplePage, H2, P } from '@/components/SimplePage'

export const metadata: Metadata = {
  title: 'Cookie Policy | Greenofig',
  description: 'How and why Greenofig uses cookies on its website.',
}

export default function CookiesPage() {
  const locale = useLocale() as 'en' | 'ar'
  const isAr = locale === 'ar'

  if (isAr) {
    return (
      <SimplePage title="سياسة الكوكيز" subtitle="آخر تحديث: 4 مايو 2026" isAr>
        <P>
          تستخدم منصة غرينوفيغ ملفات الكوكيز لتشغيل الموقع وتحسين تجربتك. تشرح هذه الصفحة
          الأنواع التي نستخدمها وكيف تتحكم بها.
        </P>

        <H2>الكوكيز الأساسية</H2>
        <P>
          ضرورية لعمل الموقع: تحافظ على جلسة تسجيل الدخول، اللغة المفضّلة، وعربة التسوّق. لا
          يمكن تعطيلها لأن الموقع لن يعمل بدونها.
        </P>

        <H2>كوكيز التحليلات</H2>
        <P>
          تساعدنا على فهم كيف يستخدم الزوار الموقع (الصفحات الأكثر زيارة، أوقات التحميل،
          الأخطاء). البيانات مجمّعة ومجهولة الهوية.
        </P>

        <H2>كوكيز التسويق</H2>
        <P>
          نستخدمها لقياس فعالية حملاتنا الإعلانية. يمكنك تعطيلها من بانر الموافقة على
          الكوكيز عند زيارتك الأولى.
        </P>

        <H2>إدارة الكوكيز</H2>
        <P>
          يمكنك تعديل تفضيلاتك في أي وقت من إعدادات حسابك، أو من إعدادات متصفّحك. تعطيل
          الكوكيز التحليلية والتسويقية لا يؤثر على وظائف الموقع.
        </P>
      </SimplePage>
    )
  }

  return (
    <SimplePage title="Cookie Policy" subtitle="Last updated: 4 May 2026">
      <P>
        Greenofig uses cookies to operate the site and improve your experience. This page
        explains what types we use and how you can control them.
      </P>

      <H2>Essential cookies</H2>
      <P>
        Required for the site to function: keep you signed in, remember your language, and hold
        your shopping cart. These cannot be disabled because the site won&apos;t work without them.
      </P>

      <H2>Analytics cookies</H2>
      <P>
        Help us understand how visitors use the site (most-visited pages, load times, errors).
        Data is aggregated and anonymous.
      </P>

      <H2>Marketing cookies</H2>
      <P>
        We use these to measure our advertising campaigns. You can disable them from the cookie
        consent banner on your first visit.
      </P>

      <H2>Managing your cookies</H2>
      <P>
        You can change your preferences at any time in your account settings or your browser
        settings. Disabling analytics and marketing cookies does not affect site functionality.
      </P>
    </SimplePage>
  )
}
