import type { Metadata } from 'next'
import { useLocale } from 'next-intl'
import { SimplePage, H2, P } from '@/components/SimplePage'

export const metadata: Metadata = {
  title: 'About Greenofig | Personalized Nutrition Coaching',
  description:
    "Greenofig is a personalized nutrition coaching platform combining certified clinical nutritionists with AI-powered tools — meal plans, food tracking, and 1-on-1 consultations.",
}

export default function AboutPage() {
  const locale = useLocale() as 'en' | 'ar'
  const isAr = locale === 'ar'

  if (isAr) {
    return (
      <SimplePage
        title="عن غرينوفيغ"
        subtitle="منصة تغذية شخصية تجمع بين الخبرة السريرية والذكاء الاصطناعي — مصممة لتساعدك على بناء عادات صحية تدوم."
        isAr
      >
        <section>
          <H2>مهمتنا</H2>
          <P>
            نؤمن في غرينوفيغ بأن التغذية الصحية يجب أن تكون شخصية وعلمية وعملية. لا حميات
            عامة، لا حلول مؤقتة — فقط خطط مبنية على جسمك، أهدافك، ونمط حياتك.
          </P>
        </section>

        <section>
          <H2>كيف نعمل</H2>
          <P>
            نجمع بين أخصائيي تغذية إكلينيكيين معتمدين وذكاء اصطناعي متطور. تحصل على استشارات
            فردية، خطط وجبات مخصصة، ماسح طعام بالذكاء الاصطناعي، ومكمّلات مفحوصة سريرياً —
            كل ذلك في مكان واحد.
          </P>
        </section>

        <section>
          <H2>فريقنا</H2>
          <P>
            يقود فريق التغذية لدينا كوتش روان عثمان — أخصائية تغذية إكلينيكية معتمدة بثلاث
            سنوات من الخبرة المتخصصة. تعمل كوتش روان مع فريق من الأخصائيين والمستشارين لضمان
            أن كل خطة وكل توصية مبنية على آخر الأدلة العلمية.
          </P>
        </section>

        <section>
          <H2>قيمنا</H2>
          <P>
            <strong>قائم على الأدلة:</strong> كل توصية مدعومة بأبحاث علمية حديثة.
            <br />
            <strong>شخصي:</strong> خطط مصممة لك، لا قوالب جاهزة.
            <br />
            <strong>مستدام:</strong> بناء عادات تدوم، لا حميات قاسية.
            <br />
            <strong>شفاف:</strong> أسعار واضحة، نتائج قابلة للقياس، ضمان استرداد لمدة 30 يوماً.
          </P>
        </section>

        <section>
          <H2>تواصل معنا</H2>
          <P>
            هل لديك سؤال؟ نحن هنا للمساعدة. تواصل معنا على
            {' '}<a href="mailto:health@greenofig.com" className="text-lime-400 hover:underline">health@greenofig.com</a>.
          </P>
        </section>
      </SimplePage>
    )
  }

  return (
    <SimplePage
      title="About Greenofig"
      subtitle="A personalized nutrition coaching platform that combines clinical expertise with AI — built to help you create habits that actually stick."
    >
      <section>
        <H2>Our mission</H2>
        <P>
          Greenofig exists because nutrition advice should be personal, evidence-based,
          and practical. No generic diets, no quick fixes — just plans built around
          your body, your goals, and your real life.
        </P>
      </section>

      <section>
        <H2>How we work</H2>
        <P>
          We pair certified clinical nutritionists with AI-powered tools. You get
          1-on-1 consultations, custom meal plans, an AI food scanner that tracks
          nutrition in seconds, and clinically-vetted supplements — all in one place,
          all working together.
        </P>
      </section>

      <section>
        <H2>The team</H2>
        <P>
          Our nutrition team is led by <strong>Coach Rawan Othman</strong> — a certified
          clinical nutritionist with three years of specialized practice. Coach Rawan
          works alongside a team of nutritionists and advisors to make sure every plan
          and every recommendation is grounded in the latest peer-reviewed evidence.
        </P>
      </section>

      <section>
        <H2>What we believe</H2>
        <P>
          <strong>Evidence-based:</strong> Every recommendation is backed by current
          research.
          <br />
          <strong>Personalized:</strong> Plans built for you — not templates.
          <br />
          <strong>Sustainable:</strong> Habits that last, not crash diets.
          <br />
          <strong>Transparent:</strong> Honest pricing, measurable results, and a
          30-day money-back guarantee.
        </P>
      </section>

      <section>
        <H2>Get in touch</H2>
        <P>
          Have a question? We&apos;re here to help. Reach us at{' '}
          <a href="mailto:health@greenofig.com" className="text-lime-400 hover:underline">
            health@greenofig.com
          </a>
          .
        </P>
      </section>
    </SimplePage>
  )
}
