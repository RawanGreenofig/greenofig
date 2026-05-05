import { motion } from 'framer-motion'
import { Target, Heart, Users, Award, Globe, Zap } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

const values = [
  {
    icon: Heart,
    title: 'Health First',
    description: 'We believe everyone deserves access to quality health guidance.',
  },
  {
    icon: Users,
    title: 'Community Driven',
    description: 'Building a supportive community of health-conscious individuals.',
  },
  {
    icon: Zap,
    title: 'Innovation',
    description: 'Leveraging AI and technology to make health management effortless.',
  },
  {
    icon: Globe,
    title: 'Accessibility',
    description: 'Making wellness tools available to everyone, everywhere.',
  },
]

const team = [
  {
    name: 'Dr. Sarah Johnson',
    role: 'Chief Medical Officer',
    bio: 'Board-certified nutritionist with 15+ years of experience.',
  },
  {
    name: 'Michael Chen',
    role: 'CEO & Founder',
    bio: 'Former tech executive passionate about democratizing health.',
  },
  {
    name: 'Emily Rodriguez',
    role: 'Head of Product',
    bio: 'UX expert focused on making health tech intuitive.',
  },
  {
    name: 'James Williams',
    role: 'CTO',
    bio: 'AI specialist with background in health informatics.',
  },
]

const milestones = [
  { year: '2021', event: 'GreenoFig founded with a mission to democratize health' },
  { year: '2022', event: 'Launched AI coach feature, reached 10K users' },
  { year: '2023', event: 'Expanded to 50K users, added nutritionist network' },
  { year: '2024', event: 'Introduced video consultations and DNA-based nutrition' },
]

export default function About() {
  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="py-24 bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge className="mb-4" variant="secondary">About Us</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Our Mission is to Make
              <span className="block gradient-text">Health Accessible</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We're building the future of personal health management, powered by AI and guided by science.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Story */}
      <section className="py-24">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="prose prose-lg dark:prose-invert mx-auto">
            <h2 className="text-3xl font-bold mb-6 text-center">Our Story</h2>
            <p className="text-muted-foreground">
              GreenoFig was born from a simple observation: while health information is more abundant than ever, personalized guidance remains out of reach for most people. Traditional nutritionists and personal trainers are expensive, and generic advice often fails to account for individual needs.
            </p>
            <p className="text-muted-foreground">
              Our founder, Michael Chen, experienced this firsthand when trying to manage his health while working demanding hours in tech. He envisioned a platform that could provide the same quality of personalized health guidance that the wealthy receive, but accessible to everyone.
            </p>
            <p className="text-muted-foreground">
              Today, GreenoFig combines cutting-edge AI technology with evidence-based health science to provide personalized nutrition, fitness, and wellness guidance to users worldwide. Our platform learns from each interaction, continuously improving its recommendations to help you achieve your unique health goals.
            </p>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="py-24 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Our Values</h2>
            <p className="text-muted-foreground">The principles that guide everything we do</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {values.map((value, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="h-full text-center">
                  <CardContent className="pt-6">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <value.icon className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="font-semibold mb-2">{value.title}</h3>
                    <p className="text-sm text-muted-foreground">{value.description}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Timeline */}
      <section className="py-24">
        <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Our Journey</h2>
            <p className="text-muted-foreground">Key milestones in our growth</p>
          </div>
          <div className="space-y-8">
            {milestones.map((milestone, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
                className="flex gap-4"
              >
                <div className="flex-shrink-0 w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <span className="font-bold text-primary">{milestone.year}</span>
                </div>
                <div className="pt-4">
                  <p className="text-foreground">{milestone.event}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section className="py-24 bg-card/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold mb-4">Meet Our Team</h2>
            <p className="text-muted-foreground">The passionate people behind GreenoFig</p>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {team.map((member, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1 }}
              >
                <Card className="text-center">
                  <CardContent className="pt-6">
                    <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                      <span className="text-2xl font-bold text-primary">
                        {member.name.split(' ').map(n => n[0]).join('')}
                      </span>
                    </div>
                    <h3 className="font-semibold">{member.name}</h3>
                    <p className="text-sm text-primary mb-2">{member.role}</p>
                    <p className="text-sm text-muted-foreground">{member.bio}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
