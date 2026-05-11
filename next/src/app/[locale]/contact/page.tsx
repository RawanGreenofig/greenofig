import type { Metadata } from 'next'
import { useLocale } from 'next-intl'
import { SimplePage, H2, P } from '@/components/SimplePage'

export const metadata: Metadata = {
  title: 'Contact | Greenofig',
  description:
    'Get in touch with Greenofig — questions about plans, billing, or your nutrition journey. We reply within one business day.',
  alternates: { canonical: 'https://greenofig.com/contact' },
}

export default function ContactPage() {
  const locale = useLocale() as 'en' | 'ar'
  const isAr = locale === 'ar'

  if (isAr) {
    return (
      <SimplePage
        title="تواصل معنا"
        subtitle="نحن هنا للمساعدة. نرد عادةً خلال يوم عمل واحد."
        isAr
      >
        <section>
          <H2>للأسئلة الصحية والتغذوية</H2>
          <P>
            للاستفسارات حول الصحة، التغذية، الخطط، أو مكالمتك التعريفية:
            <br />
            <a
              href="mailto:health@greenofig.com"
              className="text-lime-400 hover:underline"
            >
              health@greenofig.com
            </a>
          </P>
        </section>

        <section>
          <H2>للدعم العام</H2>
          <P>
            للفوترة، الحساب، أو أي استفسار آخر:
            <br />
            <a
              href="mailto:support@greenofig.com"
              className="text-lime-400 hover:underline"
            >
              support@greenofig.com
            </a>
          </P>
        </section>

        <section>
          <H2>تريد بدء رحلتك معنا؟</H2>
          <P>
            خذ <a href="/#booking" className="text-lime-400 hover:underline">
              تقييمنا الصحي المجاني
            </a>{' '}
            (15 سؤالاً فقط). ستحصل على كتاب إلكتروني مجاني وستتواصل معك أخصائية تغذية كوتش روان
            شخصياً خلال يوم أو يومين.
          </P>
        </section>
      </SimplePage>
    )
  }

  return (
    <SimplePage
      title="Contact us"
      subtitle="We're here to help. We typically reply within one business day."
    >
      <section>
        <H2>Health &amp; nutrition questions</H2>
        <P>
          For anything related to your health, nutrition, plans, or your free
          intro call:
          <br />
          <a
            href="mailto:health@greenofig.com"
            className="text-lime-400 hover:underline"
          >
            health@greenofig.com
          </a>
        </P>
      </section>

      <section>
        <H2>General support</H2>
        <P>
          For billing, your account, or anything else:
          <br />
          <a
            href="mailto:support@greenofig.com"
            className="text-lime-400 hover:underline"
          >
            support@greenofig.com
          </a>
        </P>
      </section>

      <section>
        <H2>Want to start working with us?</H2>
        <P>
          Take our{' '}
          <a href="/#booking" className="text-lime-400 hover:underline">
            free 15-question health assessment
          </a>
          . You&rsquo;ll get a free ebook and Nutritionist Coach Rawan will personally reach
          out within 1–2 business days.
        </P>
      </section>
    </SimplePage>
  )
}
