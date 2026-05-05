import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Eye, EyeOff, Mail, Lock, User, ArrowRight, ArrowLeft, Check,
  Target, Dumbbell, Apple, Scale, Heart, Users, Moon, Droplets,
  Clock, Activity, AlertCircle, Utensils, Brain, Flame, Crown, Star, Sparkles
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { supabase } from '@/lib/supabase'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Progress } from '@/components/ui/progress'
import { Textarea } from '@/components/ui/textarea'
import toast from 'react-hot-toast'

const TOTAL_STEPS = 17 // 15 survey questions + 1 plan recommendation + 1 account creation

export default function Signup() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const { signUp, signInWithGoogle } = useAuth()

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [recommendedPlan, setRecommendedPlan] = useState(null)

  // Account Info (Step 17 - last)
  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [acceptTerms, setAcceptTerms] = useState(false)

  // Survey Questions (Steps 1-15)
  const [primaryGoal, setPrimaryGoal] = useState('')
  const [secondaryGoal, setSecondaryGoal] = useState('')
  const [currentWeight, setCurrentWeight] = useState('')
  const [targetWeight, setTargetWeight] = useState('')
  const [height, setHeight] = useState('')
  const [activityLevel, setActivityLevel] = useState('')
  const [exerciseFrequency, setExerciseFrequency] = useState('')
  const [dietaryPreference, setDietaryPreference] = useState('')
  const [mealsPerDay, setMealsPerDay] = useState('')
  const [waterIntake, setWaterIntake] = useState('')
  const [sleepHours, setSleepHours] = useState('')
  const [healthConditions, setHealthConditions] = useState('')
  const [healthConditionsOther, setHealthConditionsOther] = useState('')
  const [allergies, setAllergies] = useState('')
  const [allergiesOther, setAllergiesOther] = useState('')
  const [ageRange, setAgeRange] = useState('')
  const [gender, setGender] = useState('')

  // Calculate recommended plan when reaching step 16
  useEffect(() => {
    if (step === 16) {
      calculateRecommendedPlan()
    }
  }, [step])

  const calculateRecommendedPlan = () => {
    let score = 0

    // Goals scoring
    if (primaryGoal === 'weight_loss' || primaryGoal === 'muscle_gain') score += 3
    if (primaryGoal === 'better_nutrition' || primaryGoal === 'overall_health') score += 2
    if (secondaryGoal !== 'none') score += 1

    // Health complexity
    if (healthConditions !== 'none') score += 3
    if (allergies !== 'none') score += 2

    // Activity & commitment
    if (activityLevel === 'very_active' || activityLevel === 'extremely_active') score += 2
    if (exerciseFrequency === 'daily' || exerciseFrequency === '5_6_week') score += 2

    // Weight goals
    if (targetWeight === 'lose_20_plus' || targetWeight === 'gain_10_plus') score += 2
    if (targetWeight === 'lose_15' || targetWeight === 'lose_10') score += 1

    // Determine plan
    if (score >= 10) {
      setRecommendedPlan({
        name: 'Premium',
        icon: Crown,
        color: 'text-yellow-500',
        bgColor: 'bg-yellow-500/10',
        borderColor: 'border-yellow-500/50',
        price: '$29.99/month',
        reasons: [
          primaryGoal === 'weight_loss' ? 'Personalized weight loss meal plans' :
          primaryGoal === 'muscle_gain' ? 'Custom muscle-building nutrition' : 'Advanced nutrition guidance',
          healthConditions !== 'none' ? 'Health condition-aware recommendations' : 'Comprehensive health tracking',
          'Unlimited AI coach consultations',
          '1-on-1 nutritionist support',
          'Priority customer support'
        ],
        features: [
          'Unlimited personalized meal plans',
          'Advanced fitness tracking',
          'AI Coach with unlimited chats',
          'Weekly nutritionist check-ins',
          'Custom workout programs',
          'Progress analytics & insights'
        ]
      })
    } else if (score >= 5) {
      setRecommendedPlan({
        name: 'Basic',
        icon: Star,
        color: 'text-primary',
        bgColor: 'bg-primary/10',
        borderColor: 'border-primary/50',
        price: '$9.99/month',
        reasons: [
          'Balanced approach to your health goals',
          'Structured meal planning support',
          'Regular progress tracking',
          dietaryPreference !== 'no_restrictions' ? `${dietaryPreference} diet-friendly recipes` : 'Wide variety of recipes'
        ],
        features: [
          'Weekly personalized meal plans',
          'Basic fitness tracking',
          'AI Coach (50 chats/month)',
          'Recipe library access',
          'Progress tracking',
          'Email support'
        ]
      })
    } else {
      setRecommendedPlan({
        name: 'Free',
        icon: Sparkles,
        color: 'text-green-500',
        bgColor: 'bg-green-500/10',
        borderColor: 'border-green-500/50',
        price: 'Free',
        reasons: [
          'Great starting point for your wellness journey',
          'Learn healthy eating basics',
          'Track your daily habits',
          'Explore what GreenoFig offers'
        ],
        features: [
          'Basic meal suggestions',
          'Daily habit tracking',
          'AI Coach (10 chats/month)',
          'Community access',
          'Basic recipes',
          'Self-guided programs'
        ]
      })
    }
  }

  // Q1: Primary Goal
  const goals = [
    { value: 'weight_loss', label: t('auth.signup.survey.goals.weightLoss', 'Lose Weight'), icon: Scale },
    { value: 'muscle_gain', label: t('auth.signup.survey.goals.muscleGain', 'Build Muscle'), icon: Dumbbell },
    { value: 'better_nutrition', label: t('auth.signup.survey.goals.betterNutrition', 'Eat Healthier'), icon: Apple },
    { value: 'overall_health', label: t('auth.signup.survey.goals.overallHealth', 'Improve Overall Health'), icon: Heart },
    { value: 'more_energy', label: t('auth.signup.survey.goals.moreEnergy', 'Increase Energy'), icon: Flame },
  ]

  // Q2: Secondary Goal
  const secondaryGoals = [
    { value: 'reduce_stress', label: t('auth.signup.survey.secondaryGoals.reduceStress', 'Reduce Stress'), icon: Brain },
    { value: 'better_sleep', label: t('auth.signup.survey.secondaryGoals.betterSleep', 'Sleep Better'), icon: Moon },
    { value: 'build_habits', label: t('auth.signup.survey.secondaryGoals.buildHabits', 'Build Healthy Habits'), icon: Target },
    { value: 'athletic_performance', label: t('auth.signup.survey.secondaryGoals.athleticPerformance', 'Improve Athletic Performance'), icon: Activity },
    { value: 'none', label: t('auth.signup.survey.secondaryGoals.none', 'No Secondary Goal'), icon: Check },
  ]

  // Q3: Current Weight
  const weightRanges = [
    { value: 'under_50', label: t('auth.signup.survey.weight.under50', 'Under 50 kg (110 lbs)') },
    { value: '50_60', label: t('auth.signup.survey.weight.50_60', '50-60 kg (110-132 lbs)') },
    { value: '60_70', label: t('auth.signup.survey.weight.60_70', '60-70 kg (132-154 lbs)') },
    { value: '70_80', label: t('auth.signup.survey.weight.70_80', '70-80 kg (154-176 lbs)') },
    { value: '80_90', label: t('auth.signup.survey.weight.80_90', '80-90 kg (176-198 lbs)') },
    { value: '90_100', label: t('auth.signup.survey.weight.90_100', '90-100 kg (198-220 lbs)') },
    { value: 'over_100', label: t('auth.signup.survey.weight.over100', 'Over 100 kg (220 lbs)') },
  ]

  // Q4: Target Weight
  const targetWeightOptions = [
    { value: 'lose_5', label: t('auth.signup.survey.targetWeight.lose5', 'Lose 5 kg (11 lbs)') },
    { value: 'lose_10', label: t('auth.signup.survey.targetWeight.lose10', 'Lose 10 kg (22 lbs)') },
    { value: 'lose_15', label: t('auth.signup.survey.targetWeight.lose15', 'Lose 15 kg (33 lbs)') },
    { value: 'lose_20_plus', label: t('auth.signup.survey.targetWeight.lose20Plus', 'Lose 20+ kg (44+ lbs)') },
    { value: 'maintain', label: t('auth.signup.survey.targetWeight.maintain', 'Maintain Current Weight') },
    { value: 'gain_5', label: t('auth.signup.survey.targetWeight.gain5', 'Gain 5 kg (11 lbs)') },
    { value: 'gain_10_plus', label: t('auth.signup.survey.targetWeight.gain10Plus', 'Gain 10+ kg (22+ lbs)') },
  ]

  // Q5: Height
  const heightRanges = [
    { value: 'under_150', label: t('auth.signup.survey.height.under150', 'Under 150 cm (4\'11")') },
    { value: '150_160', label: t('auth.signup.survey.height.150_160', '150-160 cm (4\'11"-5\'3")') },
    { value: '160_170', label: t('auth.signup.survey.height.160_170', '160-170 cm (5\'3"-5\'7")') },
    { value: '170_180', label: t('auth.signup.survey.height.170_180', '170-180 cm (5\'7"-5\'11")') },
    { value: '180_190', label: t('auth.signup.survey.height.180_190', '180-190 cm (5\'11"-6\'3")') },
    { value: 'over_190', label: t('auth.signup.survey.height.over190', 'Over 190 cm (6\'3")') },
  ]

  // Q6: Activity Level
  const activityLevels = [
    { value: 'sedentary', label: t('auth.signup.survey.activity.sedentary', 'Sedentary (desk job, little exercise)') },
    { value: 'lightly_active', label: t('auth.signup.survey.activity.lightlyActive', 'Lightly Active (light exercise 1-3 days/week)') },
    { value: 'moderately_active', label: t('auth.signup.survey.activity.moderatelyActive', 'Moderately Active (moderate exercise 3-5 days/week)') },
    { value: 'very_active', label: t('auth.signup.survey.activity.veryActive', 'Very Active (hard exercise 6-7 days/week)') },
    { value: 'extremely_active', label: t('auth.signup.survey.activity.extremelyActive', 'Extremely Active (physical job + exercise)') },
  ]

  // Q7: Exercise Frequency
  const exerciseFrequencies = [
    { value: 'never', label: t('auth.signup.survey.exercise.never', 'Never') },
    { value: '1_2_week', label: t('auth.signup.survey.exercise.1_2_week', '1-2 times per week') },
    { value: '3_4_week', label: t('auth.signup.survey.exercise.3_4_week', '3-4 times per week') },
    { value: '5_6_week', label: t('auth.signup.survey.exercise.5_6_week', '5-6 times per week') },
    { value: 'daily', label: t('auth.signup.survey.exercise.daily', 'Every day') },
  ]

  // Q8: Dietary Preference
  const dietaryPreferences = [
    { value: 'no_restrictions', label: t('auth.signup.survey.diet.noRestrictions', 'No Restrictions') },
    { value: 'vegetarian', label: t('auth.signup.survey.diet.vegetarian', 'Vegetarian') },
    { value: 'vegan', label: t('auth.signup.survey.diet.vegan', 'Vegan') },
    { value: 'keto', label: t('auth.signup.survey.diet.keto', 'Keto') },
    { value: 'paleo', label: t('auth.signup.survey.diet.paleo', 'Paleo') },
    { value: 'gluten_free', label: t('auth.signup.survey.diet.glutenFree', 'Gluten-Free') },
    { value: 'halal', label: t('auth.signup.survey.diet.halal', 'Halal') },
    { value: 'kosher', label: t('auth.signup.survey.diet.kosher', 'Kosher') },
  ]

  // Q9: Meals Per Day
  const mealsPerDayOptions = [
    { value: '1_2', label: t('auth.signup.survey.meals.1_2', '1-2 meals') },
    { value: '3', label: t('auth.signup.survey.meals.3', '3 meals') },
    { value: '4_5', label: t('auth.signup.survey.meals.4_5', '4-5 meals') },
    { value: '6_plus', label: t('auth.signup.survey.meals.6_plus', '6+ small meals') },
    { value: 'irregular', label: t('auth.signup.survey.meals.irregular', 'Irregular eating pattern') },
  ]

  // Q10: Water Intake
  const waterIntakeOptions = [
    { value: 'less_than_4', label: t('auth.signup.survey.water.lessThan4', 'Less than 4 glasses') },
    { value: '4_6', label: t('auth.signup.survey.water.4_6', '4-6 glasses') },
    { value: '6_8', label: t('auth.signup.survey.water.6_8', '6-8 glasses') },
    { value: '8_10', label: t('auth.signup.survey.water.8_10', '8-10 glasses') },
    { value: 'more_than_10', label: t('auth.signup.survey.water.moreThan10', 'More than 10 glasses') },
  ]

  // Q11: Sleep Hours
  const sleepHoursOptions = [
    { value: 'less_than_5', label: t('auth.signup.survey.sleep.lessThan5', 'Less than 5 hours') },
    { value: '5_6', label: t('auth.signup.survey.sleep.5_6', '5-6 hours') },
    { value: '6_7', label: t('auth.signup.survey.sleep.6_7', '6-7 hours') },
    { value: '7_8', label: t('auth.signup.survey.sleep.7_8', '7-8 hours') },
    { value: 'more_than_8', label: t('auth.signup.survey.sleep.moreThan8', 'More than 8 hours') },
  ]

  // Q12: Health Conditions
  const healthConditionOptions = [
    { value: 'none', label: t('auth.signup.survey.health.none', 'None') },
    { value: 'diabetes', label: t('auth.signup.survey.health.diabetes', 'Diabetes') },
    { value: 'heart_disease', label: t('auth.signup.survey.health.heartDisease', 'Heart Disease') },
    { value: 'high_blood_pressure', label: t('auth.signup.survey.health.highBloodPressure', 'High Blood Pressure') },
    { value: 'thyroid', label: t('auth.signup.survey.health.thyroid', 'Thyroid Issues') },
    { value: 'digestive', label: t('auth.signup.survey.health.digestive', 'Digestive Issues') },
    { value: 'other', label: t('auth.signup.survey.health.other', 'Other') },
  ]

  // Q13: Allergies
  const allergyOptions = [
    { value: 'none', label: t('auth.signup.survey.allergies.none', 'None') },
    { value: 'dairy', label: t('auth.signup.survey.allergies.dairy', 'Dairy') },
    { value: 'nuts', label: t('auth.signup.survey.allergies.nuts', 'Nuts') },
    { value: 'gluten', label: t('auth.signup.survey.allergies.gluten', 'Gluten') },
    { value: 'shellfish', label: t('auth.signup.survey.allergies.shellfish', 'Shellfish') },
    { value: 'eggs', label: t('auth.signup.survey.allergies.eggs', 'Eggs') },
    { value: 'soy', label: t('auth.signup.survey.allergies.soy', 'Soy') },
    { value: 'other', label: t('auth.signup.survey.allergies.other', 'Other') },
  ]

  // Q14: Age Range
  const ageRanges = [
    { value: '18-24', label: '18-24' },
    { value: '25-34', label: '25-34' },
    { value: '35-44', label: '35-44' },
    { value: '45-54', label: '45-54' },
    { value: '55-64', label: '55-64' },
    { value: '65+', label: '65+' },
  ]

  // Q15: Gender
  const genders = [
    { value: 'male', label: t('auth.signup.survey.gender.male', 'Male') },
    { value: 'female', label: t('auth.signup.survey.gender.female', 'Female') },
    { value: 'other', label: t('auth.signup.survey.gender.other', 'Other') },
    { value: 'prefer_not_to_say', label: t('auth.signup.survey.gender.preferNotToSay', 'Prefer not to say') },
  ]

  const canProceed = () => {
    switch (step) {
      case 1: return primaryGoal
      case 2: return secondaryGoal
      case 3: return currentWeight
      case 4: return targetWeight
      case 5: return height
      case 6: return activityLevel
      case 7: return exerciseFrequency
      case 8: return dietaryPreference
      case 9: return mealsPerDay
      case 10: return waterIntake
      case 11: return sleepHours
      case 12: return healthConditions && (healthConditions !== 'other' || healthConditionsOther.trim())
      case 13: return allergies && (allergies !== 'other' || allergiesOther.trim())
      case 14: return ageRange
      case 15: return gender
      case 16: return true // Plan recommendation - always can proceed
      case 17: return fullName && email && password.length >= 6 && acceptTerms
      default: return false
    }
  }

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1)
    }
  }

  const handleBack = () => {
    if (step > 1) {
      setStep(step - 1)
    }
  }

  const saveSurveyToDatabase = async (userId) => {
    try {
      const surveyData = {
        user_id: userId,
        primary_goal: primaryGoal,
        secondary_goal: secondaryGoal,
        current_weight: currentWeight,
        target_weight: targetWeight,
        height: height,
        activity_level: activityLevel,
        exercise_frequency: exerciseFrequency,
        dietary_preference: dietaryPreference,
        meals_per_day: mealsPerDay,
        water_intake: waterIntake,
        sleep_hours: sleepHours,
        health_conditions: healthConditions === 'other' ? `other: ${healthConditionsOther}` : healthConditions,
        allergies: allergies === 'other' ? `other: ${allergiesOther}` : allergies,
        age_range: ageRange,
        gender: gender,
        recommended_plan: recommendedPlan?.name || 'Free',
        completed_at: new Date().toISOString(),
      }

      const { error } = await supabase
        .from('user_surveys')
        .insert(surveyData)

      if (error) {
        console.error('Survey save error:', error)
        toast.error('Failed to save survey data')
      }
    } catch (error) {
      console.error('Error saving survey:', error)
    }
  }

  const handleSubmit = async () => {
    if (!canProceed()) return

    setLoading(true)

    try {
      const { data, error } = await signUp(email, password, fullName)
      if (error) {
        toast.error(error.message || t('auth.signup.error'))
      } else {
        if (data?.user?.id) {
          await saveSurveyToDatabase(data.user.id)
        }
        toast.success(t('auth.signup.success'))
        navigate('/login')
      }
    } catch (error) {
      toast.error(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle()
      if (error) {
        toast.error(error.message || t('auth.signup.error'))
      }
    } catch (error) {
      toast.error(t('common.error'))
    }
  }

  const renderRadioOptions = (options, value, setValue, hasIcon = false, columns = 1) => (
    <RadioGroup value={value} onValueChange={setValue} className={columns === 2 ? "grid grid-cols-2 gap-2" : "space-y-2"}>
      {options.map((option) => (
        <div
          key={option.value}
          className={`flex items-center space-x-3 rtl:space-x-reverse p-3 rounded-lg border cursor-pointer transition-all ${
            value === option.value
              ? 'border-primary bg-primary/5'
              : 'border-border hover:border-primary/50'
          }`}
          onClick={() => setValue(option.value)}
        >
          <RadioGroupItem value={option.value} id={option.value} />
          {hasIcon && option.icon && <option.icon className="h-5 w-5 text-primary" />}
          <Label htmlFor={option.value} className="flex-1 cursor-pointer text-sm">
            {option.label}
          </Label>
        </div>
      ))}
    </RadioGroup>
  )

  const renderStep = () => {
    switch (step) {
      case 1:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Target className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">{t('auth.signup.survey.q1.title', 'What is your primary goal?')}</h3>
              <p className="text-sm text-muted-foreground">{t('auth.signup.survey.q1.subtitle', 'Select the main reason you\'re joining GreenoFig')}</p>
            </div>
            {renderRadioOptions(goals, primaryGoal, setPrimaryGoal, true)}
          </div>
        )

      case 2:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Brain className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">{t('auth.signup.survey.q2.title', 'Do you have a secondary goal?')}</h3>
              <p className="text-sm text-muted-foreground">{t('auth.signup.survey.q2.subtitle', 'Select any additional goals you\'d like to achieve')}</p>
            </div>
            {renderRadioOptions(secondaryGoals, secondaryGoal, setSecondaryGoal, true)}
          </div>
        )

      case 3:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Scale className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">{t('auth.signup.survey.q3.title', 'What is your current weight?')}</h3>
              <p className="text-sm text-muted-foreground">{t('auth.signup.survey.q3.subtitle', 'Select your approximate weight range')}</p>
            </div>
            {renderRadioOptions(weightRanges, currentWeight, setCurrentWeight)}
          </div>
        )

      case 4:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Target className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">{t('auth.signup.survey.q4.title', 'What is your target weight goal?')}</h3>
              <p className="text-sm text-muted-foreground">{t('auth.signup.survey.q4.subtitle', 'How much weight do you want to lose or gain?')}</p>
            </div>
            {renderRadioOptions(targetWeightOptions, targetWeight, setTargetWeight)}
          </div>
        )

      case 5:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Users className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">{t('auth.signup.survey.q5.title', 'What is your height?')}</h3>
              <p className="text-sm text-muted-foreground">{t('auth.signup.survey.q5.subtitle', 'Select your approximate height range')}</p>
            </div>
            {renderRadioOptions(heightRanges, height, setHeight)}
          </div>
        )

      case 6:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Activity className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">{t('auth.signup.survey.q6.title', 'What is your activity level?')}</h3>
              <p className="text-sm text-muted-foreground">{t('auth.signup.survey.q6.subtitle', 'How active are you in your daily life?')}</p>
            </div>
            {renderRadioOptions(activityLevels, activityLevel, setActivityLevel)}
          </div>
        )

      case 7:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Dumbbell className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">{t('auth.signup.survey.q7.title', 'How often do you exercise?')}</h3>
              <p className="text-sm text-muted-foreground">{t('auth.signup.survey.q7.subtitle', 'Select how many times per week you work out')}</p>
            </div>
            {renderRadioOptions(exerciseFrequencies, exerciseFrequency, setExerciseFrequency)}
          </div>
        )

      case 8:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Apple className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">{t('auth.signup.survey.q8.title', 'What is your dietary preference?')}</h3>
              <p className="text-sm text-muted-foreground">{t('auth.signup.survey.q8.subtitle', 'Select your eating style or restrictions')}</p>
            </div>
            {renderRadioOptions(dietaryPreferences, dietaryPreference, setDietaryPreference, false, 2)}
          </div>
        )

      case 9:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Utensils className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">{t('auth.signup.survey.q9.title', 'How many meals do you eat per day?')}</h3>
              <p className="text-sm text-muted-foreground">{t('auth.signup.survey.q9.subtitle', 'Select your typical eating pattern')}</p>
            </div>
            {renderRadioOptions(mealsPerDayOptions, mealsPerDay, setMealsPerDay)}
          </div>
        )

      case 10:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Droplets className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">{t('auth.signup.survey.q10.title', 'How much water do you drink daily?')}</h3>
              <p className="text-sm text-muted-foreground">{t('auth.signup.survey.q10.subtitle', 'One glass is approximately 250ml (8oz)')}</p>
            </div>
            {renderRadioOptions(waterIntakeOptions, waterIntake, setWaterIntake)}
          </div>
        )

      case 11:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Moon className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">{t('auth.signup.survey.q11.title', 'How many hours do you sleep per night?')}</h3>
              <p className="text-sm text-muted-foreground">{t('auth.signup.survey.q11.subtitle', 'Select your average sleep duration')}</p>
            </div>
            {renderRadioOptions(sleepHoursOptions, sleepHours, setSleepHours)}
          </div>
        )

      case 12:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Heart className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">{t('auth.signup.survey.q12.title', 'Do you have any health conditions?')}</h3>
              <p className="text-sm text-muted-foreground">{t('auth.signup.survey.q12.subtitle', 'This helps us personalize your recommendations')}</p>
            </div>
            {renderRadioOptions(healthConditionOptions, healthConditions, setHealthConditions, false, 2)}
            {healthConditions === 'other' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3"
              >
                <Label htmlFor="healthOther" className="text-sm mb-2 block">
                  {t('auth.signup.survey.pleaseSpecify', 'Please specify your health condition:')}
                </Label>
                <Textarea
                  id="healthOther"
                  value={healthConditionsOther}
                  onChange={(e) => setHealthConditionsOther(e.target.value)}
                  placeholder={t('auth.signup.survey.describeCondition', 'Describe your health condition...')}
                  className="min-h-[80px]"
                />
              </motion.div>
            )}
          </div>
        )

      case 13:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <AlertCircle className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">{t('auth.signup.survey.q13.title', 'Do you have any food allergies?')}</h3>
              <p className="text-sm text-muted-foreground">{t('auth.signup.survey.q13.subtitle', 'We\'ll exclude these from your meal plans')}</p>
            </div>
            {renderRadioOptions(allergyOptions, allergies, setAllergies, false, 2)}
            {allergies === 'other' && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mt-3"
              >
                <Label htmlFor="allergyOther" className="text-sm mb-2 block">
                  {t('auth.signup.survey.pleaseSpecifyAllergy', 'Please specify your allergy:')}
                </Label>
                <Textarea
                  id="allergyOther"
                  value={allergiesOther}
                  onChange={(e) => setAllergiesOther(e.target.value)}
                  placeholder={t('auth.signup.survey.describeAllergy', 'Describe your food allergy...')}
                  className="min-h-[80px]"
                />
              </motion.div>
            )}
          </div>
        )

      case 14:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Clock className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">{t('auth.signup.survey.q14.title', 'What is your age range?')}</h3>
              <p className="text-sm text-muted-foreground">{t('auth.signup.survey.q14.subtitle', 'This helps us tailor recommendations to your needs')}</p>
            </div>
            <RadioGroup value={ageRange} onValueChange={setAgeRange} className="flex flex-wrap gap-2 justify-center">
              {ageRanges.map((age) => (
                <div
                  key={age.value}
                  className={`px-6 py-3 rounded-lg border cursor-pointer transition-all ${
                    ageRange === age.value
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-primary/50'
                  }`}
                  onClick={() => setAgeRange(age.value)}
                >
                  <Label className="cursor-pointer font-medium">{age.label}</Label>
                </div>
              ))}
            </RadioGroup>
          </div>
        )

      case 15:
        return (
          <div className="space-y-4">
            <div className="text-center mb-4">
              <Users className="h-10 w-10 text-primary mx-auto mb-2" />
              <h3 className="text-lg font-semibold">{t('auth.signup.survey.q15.title', 'What is your gender?')}</h3>
              <p className="text-sm text-muted-foreground">{t('auth.signup.survey.q15.subtitle', 'This helps us calculate your nutritional needs')}</p>
            </div>
            {renderRadioOptions(genders, gender, setGender, false, 2)}
          </div>
        )

      case 16:
        return (
          <div className="space-y-4">
            {recommendedPlan && (
              <>
                <div className="text-center mb-4">
                  <div className={`w-16 h-16 ${recommendedPlan.bgColor} rounded-full flex items-center justify-center mx-auto mb-3`}>
                    <recommendedPlan.icon className={`h-8 w-8 ${recommendedPlan.color}`} />
                  </div>
                  <h3 className="text-xl font-bold">{t('auth.signup.survey.recommendedPlan', 'Recommended Plan')}</h3>
                  <p className="text-sm text-muted-foreground">{t('auth.signup.survey.basedOnAnswers', 'Based on your answers, we recommend:')}</p>
                </div>

                <div className={`p-4 rounded-xl border-2 ${recommendedPlan.borderColor} ${recommendedPlan.bgColor}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h4 className={`text-2xl font-bold ${recommendedPlan.color}`}>{recommendedPlan.name}</h4>
                    <span className="text-lg font-semibold">{recommendedPlan.price}</span>
                  </div>

                  <div className="mb-4">
                    <p className="text-sm font-medium mb-2">{t('auth.signup.survey.whyThisPlan', 'Why this plan is perfect for you:')}</p>
                    <ul className="space-y-1">
                      {recommendedPlan.reasons.map((reason, index) => (
                        <li key={index} className="flex items-start gap-2 text-sm">
                          <Check className="h-4 w-4 text-primary mt-0.5 flex-shrink-0" />
                          <span>{reason}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <Separator className="my-3" />

                  <div>
                    <p className="text-sm font-medium mb-2">{t('auth.signup.survey.included', 'What\'s included:')}</p>
                    <ul className="grid grid-cols-2 gap-1">
                      {recommendedPlan.features.map((feature, index) => (
                        <li key={index} className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Check className="h-3 w-3 text-primary flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <p className="text-xs text-center text-muted-foreground">
                  {t('auth.signup.survey.canChangeLater', 'You can change your plan anytime after signing up.')}
                </p>
              </>
            )}
          </div>
        )

      case 17:
        return (
          <div className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              type="button"
            >
              <svg className="me-2 h-4 w-4" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
              </svg>
              {t('auth.signup.googleButton', 'Continue with Google')}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t('auth.signup.orContinue', 'or')}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">{t('auth.signup.fullName', 'Full Name')}</Label>
              <div className="relative">
                <User className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="name"
                  type="text"
                  placeholder={t('auth.signup.fullNamePlaceholder', 'Enter your full name')}
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="ps-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">{t('auth.signup.email', 'Email')}</Label>
              <div className="relative">
                <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  placeholder={t('auth.signup.emailPlaceholder', 'Enter your email')}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="ps-10"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">{t('auth.signup.password', 'Password')}</Label>
              <div className="relative">
                <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder={t('auth.signup.passwordPlaceholder', 'Create a password')}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="ps-10 pe-10"
                  required
                  minLength={6}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              <p className="text-xs text-muted-foreground">{t('auth.signup.passwordHint', 'At least 6 characters')}</p>
            </div>

            <div className="flex items-start space-x-2 rtl:space-x-reverse">
              <Checkbox
                id="terms"
                checked={acceptTerms}
                onCheckedChange={setAcceptTerms}
              />
              <label
                htmlFor="terms"
                className="text-sm text-muted-foreground leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
              >
                {t('auth.signup.acceptTerms', 'I agree to the')}{' '}
                <Link to="/terms-of-service" className="text-primary hover:underline">
                  {t('auth.signup.termsLink', 'Terms of Service')}
                </Link>{' '}
                {t('auth.signup.and', 'and')}{' '}
                <Link to="/privacy-policy" className="text-primary hover:underline">
                  {t('auth.signup.privacyLink', 'Privacy Policy')}
                </Link>
              </label>
            </div>
          </div>
        )

      default:
        return null
    }
  }

  const getStepTitle = () => {
    if (step === 16) return t('auth.signup.survey.yourPlan', 'Your Perfect Plan')
    if (step === 17) return t('auth.signup.cardTitle', 'Create Account')
    return t('auth.signup.survey.questionTitle', 'Question') + ` ${step}/15`
  }

  const getStepDescription = () => {
    if (step === 16) return t('auth.signup.survey.planDescription', 'We\'ve analyzed your needs')
    if (step === 17) return t('auth.signup.cardDescription', 'Enter your details to create your account')
    return t('auth.signup.survey.helpUs', 'Help us personalize your experience')
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-8 bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-6">
          <Link to="/" className="inline-flex items-center space-x-2 rtl:space-x-reverse mb-4">
            <img src="/logo.png" alt="GreenoFig" className="h-12 w-auto" />
          </Link>
          <h1 className="text-2xl font-bold">{t('auth.signup.title', 'Get Started')}</h1>
          <p className="text-muted-foreground mt-1 text-sm">{t('auth.signup.subtitle', 'Start your wellness journey today')}</p>
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">
                {getStepTitle()}
              </CardTitle>
              <span className="text-sm text-muted-foreground">
                {step}/{TOTAL_STEPS}
              </span>
            </div>
            <Progress value={(step / TOTAL_STEPS) * 100} className="h-2" />
            <CardDescription className="text-xs">
              {getStepDescription()}
            </CardDescription>
          </CardHeader>

          <CardContent className="max-h-[400px] overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={step}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
              >
                {renderStep()}
              </motion.div>
            </AnimatePresence>
          </CardContent>

          <CardFooter className="flex flex-col space-y-3 pt-3">
            <div className="flex w-full gap-3">
              {step > 1 && (
                <Button variant="outline" onClick={handleBack} className="flex-1">
                  <ArrowLeft className="me-2 h-4 w-4" />
                  {t('common.back', 'Back')}
                </Button>
              )}
              {step < TOTAL_STEPS ? (
                <Button onClick={handleNext} disabled={!canProceed()} className="flex-1">
                  {step === 16 ? t('auth.signup.survey.continueToSignup', 'Continue to Sign Up') : t('common.next', 'Next')}
                  <ArrowRight className="ms-2 h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={handleSubmit} disabled={loading || !canProceed()} className="flex-1">
                  {loading ? t('auth.signup.submitting', 'Creating...') : t('auth.signup.submit', 'Create Account')}
                  {!loading && <Check className="ms-2 h-4 w-4" />}
                </Button>
              )}
            </div>

            {step === 17 && (
              <div className="text-sm text-center w-full text-muted-foreground">
                {t('auth.signup.haveAccount', 'Already have an account?')}{' '}
                <Link to="/login" className="text-primary hover:underline font-medium">
                  {t('auth.signup.signIn', 'Sign In')}
                </Link>
              </div>
            )}
          </CardFooter>
        </Card>
      </motion.div>
    </div>
  )
}
