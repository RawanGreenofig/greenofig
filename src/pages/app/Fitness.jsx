import React from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Dumbbell } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'

export default function Fitness() {
  const { t } = useTranslation()

  return (
    <div className="page-enter space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">{t('fitness.title')}</h1>
        <p className="text-muted-foreground">{t('fitness.workoutPlan')}</p>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-center min-h-[60vh]"
      >
        <Card glass className="max-w-md w-full">
          <CardContent className="p-8 text-center">
            <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Dumbbell className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-xl font-semibold mb-2">{t('fitness.title')}</h2>
            <p className="text-muted-foreground">{t('placeholder.pageUnderConstruction')}</p>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
