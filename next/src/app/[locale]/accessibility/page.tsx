import type { Metadata } from 'next'
import { useLocale } from 'next-intl'
import { SimplePage, H2, P } from '@/components/SimplePage'

export const metadata: Metadata = {
  title: 'Accessibility | Greenofig',
  description: "Greenofig's commitment to making nutrition tools accessible to everyone.",
}

export default function AccessibilityPage() {
  const locale = useLocale() as 'en' | 'ar'
  const isAr = locale === 'ar'

  if (isAr) {
    return (
      <SimplePage title="إمكانية الوصول" subtitle="آخر تحديث: 4 مايو 2026" isAr>
        <P>
          نلتزم في غرينوفيغ بجعل التغذية الصحية متاحة للجميع، بمن فيهم الأشخاص ذوو
          الإعاقة. نسعى لتلبية معايير WCAG 2.1 المستوى AA.
        </P>

        <H2>ما نقوم به</H2>
        <P>
          تباين ألوان مرتفع، إمكانية التنقّل بالكيبورد، نصوص بديلة لكل الصور، توافق مع قارئات
          الشاشة، ودعم لغتين (إنجليزية وعربية) مع توجيه RTL سليم.
        </P>

        <H2>تحسينات قيد التطوير</H2>
        <P>
          تكبير الخطوط الديناميكي، عرض &laquo;تقليل الحركة&raquo; لمستخدمي الحساسية البصرية، ووصف صوتي
          للفيديوهات التعليمية.
        </P>

        <H2>الإبلاغ عن مشكلة</H2>
        <P>
          إن واجهت أي عائق يمنعك من استخدام الموقع، راسلنا على support@greenofig.com.
          نعالج جميع تقارير الوصول خلال 5 أيام عمل.
        </P>
      </SimplePage>
    )
  }

  return (
    <SimplePage title="Accessibility" subtitle="Last updated: 4 May 2026">
      <P>
        At Greenofig we&apos;re committed to making healthy nutrition accessible to everyone,
        including people with disabilities. We strive to meet WCAG 2.1 Level AA standards.
      </P>

      <H2>What we do</H2>
      <P>
        High color contrast, full keyboard navigation, alt text for all images, screen reader
        compatibility, and bilingual support (English and Arabic) with proper RTL direction.
      </P>

      <H2>Improvements in progress</H2>
      <P>
        Dynamic font scaling, a &ldquo;reduce motion&rdquo; mode for users with vestibular sensitivity, and
        audio descriptions for educational videos.
      </P>

      <H2>Reporting an issue</H2>
      <P>
        If you encounter any barrier that prevents you from using the site, email us at
        support@greenofig.com. We respond to all accessibility reports within 5 working days.
      </P>
    </SimplePage>
  )
}
