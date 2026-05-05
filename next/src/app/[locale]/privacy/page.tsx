import type { Metadata } from 'next'
import { useLocale } from 'next-intl'
import { SimplePage, H2, P } from '@/components/SimplePage'

export const metadata: Metadata = {
  title: 'Privacy Policy | Greenofig',
  description: 'How Greenofig collects, uses, and protects your personal data.',
}

export default function PrivacyPage() {
  const locale = useLocale() as 'en' | 'ar'
  const isAr = locale === 'ar'

  if (isAr) {
    return (
      <SimplePage
        title="سياسة الخصوصية"
        subtitle="آخر تحديث: 4 مايو 2026"
        isAr
      >
        <P>
          نحن في غرينوفيغ نأخذ خصوصيتك بجدية. توضح هذه السياسة البيانات التي نجمعها، وكيف
          نستخدمها، وحقوقك في التحكم بها.
        </P>

        <H2>البيانات التي نجمعها</H2>
        <P>
          نجمع المعلومات التي تقدّمها عند التسجيل (الاسم، البريد الإلكتروني، تاريخ الميلاد،
          أهداف الصحة)، وبيانات الاستخدام داخل التطبيق (سجلات الطعام، التقدّم، التفاعلات مع
          المساعد الذكي)، وبيانات تقنية أساسية (نوع الجهاز، نظام التشغيل، عنوان IP) لضمان
          الأمان.
        </P>

        <H2>كيف نستخدم بياناتك</H2>
        <P>
          نستخدم بياناتك لتقديم الخدمة، تخصيص خطط التغذية، تحسين دقة المساعد الذكي، ومعالجة
          المدفوعات. لا نبيع بياناتك لأطراف ثالثة أبداً.
        </P>

        <H2>حقوقك</H2>
        <P>
          يمكنك في أي وقت طلب نسخة من بياناتك، تصحيح المعلومات الخاطئة، أو حذف حسابك بالكامل.
          راسلنا على support@greenofig.com لتقديم أي طلب.
        </P>

        <H2>الكوكيز والتتبّع</H2>
        <P>
          نستخدم كوكيز ضرورية للحفاظ على جلسة تسجيل الدخول، وكوكيز اختيارية لتحليل أداء الموقع.
          راجع <a href="/cookies" className="text-lime-400 hover:underline">سياسة الكوكيز</a> للتفاصيل.
        </P>

        <H2>الأطفال</H2>
        <P>غرينوفيغ غير مخصص لمن هم دون 18 عاماً. لا نجمع بيانات الأطفال عمداً.</P>

        <H2>التواصل</H2>
        <P>لأي سؤال حول الخصوصية: support@greenofig.com</P>
      </SimplePage>
    )
  }

  return (
    <SimplePage title="Privacy Policy" subtitle="Last updated: 4 May 2026">
      <P>
        At Greenofig we take your privacy seriously. This policy explains what data we collect,
        how we use it, and your rights to control it.
      </P>

      <H2>What we collect</H2>
      <P>
        Information you provide when you sign up (name, email, date of birth, health goals),
        in-app usage data (food logs, progress, AI assistant interactions), and basic technical
        data (device type, operating system, IP address) for security.
      </P>

      <H2>How we use your data</H2>
      <P>
        We use your data to deliver the service, personalize meal plans, improve the accuracy of
        our AI assistant, and process payments. We never sell your data to third parties.
      </P>

      <H2>Your rights</H2>
      <P>
        You can at any time request a copy of your data, correct inaccurate information, or
        delete your account entirely. Email support@greenofig.com to make any request.
      </P>

      <H2>Cookies and tracking</H2>
      <P>
        We use essential cookies to maintain your login session and optional analytics cookies.
        See our <a href="/cookies" className="text-lime-400 hover:underline">cookie policy</a> for details.
      </P>

      <H2>Children</H2>
      <P>Greenofig is not intended for users under 18. We do not knowingly collect data from children.</P>

      <H2>Contact</H2>
      <P>For any privacy question: support@greenofig.com</P>
    </SimplePage>
  )
}
