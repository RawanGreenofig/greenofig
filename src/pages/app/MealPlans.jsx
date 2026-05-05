import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Utensils, Calendar, Clock, ChefHat, Download, Eye,
  CheckCircle, Lock, Crown, ArrowRight, Flame, Apple,
  Beef, Salad, Coffee, Cookie, MessageSquare
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Progress } from '@/components/ui/progress'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

export default function MealPlans() {
  const { t } = useTranslation()
  const { user, userProfile } = useAuth()
  const tier = userProfile?.tier || 'Free'
  const hasMealPlans = tier !== 'Free'

  const [activePlan, setActivePlan] = useState(null)
  const [pastPlans, setPastPlans] = useState([])
  const [selectedDay, setSelectedDay] = useState('monday')
  const [selectedMeal, setSelectedMeal] = useState(null)
  const [mealDialogOpen, setMealDialogOpen] = useState(false)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchMealPlans()
  }, [])

  const fetchMealPlans = async () => {
    if (!isSupabaseConfigured()) {
      // Mock data
      setActivePlan({
        id: '1',
        name: 'Weight Loss Plan - Week 3',
        nutritionist: { name: 'Dr. Sarah Johnson', avatar: null },
        startDate: '2024-01-22',
        endDate: '2024-01-28',
        dailyCalories: 1800,
        dailyProtein: 120,
        dailyCarbs: 180,
        dailyFat: 60,
        meals: {
          monday: [
            { type: 'breakfast', name: 'Greek Yogurt Parfait', calories: 350, protein: 20, time: '8:00 AM', ingredients: ['Greek yogurt', 'Mixed berries', 'Granola', 'Honey'], instructions: 'Layer yogurt with berries and granola. Drizzle with honey.' },
            { type: 'snack', name: 'Apple with Almond Butter', calories: 200, protein: 5, time: '10:30 AM', ingredients: ['1 medium apple', '2 tbsp almond butter'], instructions: 'Slice apple and serve with almond butter for dipping.' },
            { type: 'lunch', name: 'Grilled Chicken Salad', calories: 450, protein: 40, time: '1:00 PM', ingredients: ['Grilled chicken breast', 'Mixed greens', 'Cherry tomatoes', 'Cucumber', 'Olive oil dressing'], instructions: 'Grill chicken, slice and serve over mixed greens with vegetables.' },
            { type: 'snack', name: 'Protein Shake', calories: 180, protein: 25, time: '4:00 PM', ingredients: ['Protein powder', 'Almond milk', 'Banana'], instructions: 'Blend all ingredients until smooth.' },
            { type: 'dinner', name: 'Salmon with Vegetables', calories: 520, protein: 35, time: '7:00 PM', ingredients: ['Salmon fillet', 'Broccoli', 'Sweet potato', 'Olive oil'], instructions: 'Bake salmon at 400°F for 15 minutes. Roast vegetables on the side.' },
          ],
          tuesday: [
            { type: 'breakfast', name: 'Oatmeal with Fruits', calories: 380, protein: 12, time: '8:00 AM', ingredients: ['Oats', 'Banana', 'Blueberries', 'Walnuts'], instructions: 'Cook oats with milk, top with fruits and nuts.' },
            { type: 'snack', name: 'Cottage Cheese', calories: 150, protein: 18, time: '10:30 AM', ingredients: ['Low-fat cottage cheese', 'Pineapple'], instructions: 'Serve cottage cheese with pineapple chunks.' },
            { type: 'lunch', name: 'Turkey Wrap', calories: 420, protein: 35, time: '1:00 PM', ingredients: ['Whole wheat wrap', 'Turkey breast', 'Lettuce', 'Tomato', 'Mustard'], instructions: 'Layer ingredients in wrap and roll tightly.' },
            { type: 'snack', name: 'Mixed Nuts', calories: 180, protein: 6, time: '4:00 PM', ingredients: ['Almonds', 'Cashews', 'Walnuts'], instructions: 'Portion 1/4 cup of mixed nuts.' },
            { type: 'dinner', name: 'Chicken Stir-Fry', calories: 480, protein: 38, time: '7:00 PM', ingredients: ['Chicken breast', 'Bell peppers', 'Snap peas', 'Brown rice'], instructions: 'Stir-fry chicken and vegetables, serve over rice.' },
          ],
          wednesday: [
            { type: 'breakfast', name: 'Egg White Omelette', calories: 320, protein: 28, time: '8:00 AM', ingredients: ['Egg whites', 'Spinach', 'Mushrooms', 'Feta cheese'], instructions: 'Cook egg whites with vegetables, fold with cheese.' },
            { type: 'snack', name: 'Carrot Sticks with Hummus', calories: 150, protein: 5, time: '10:30 AM', ingredients: ['Baby carrots', 'Hummus'], instructions: 'Serve carrots with hummus for dipping.' },
            { type: 'lunch', name: 'Quinoa Buddha Bowl', calories: 480, protein: 22, time: '1:00 PM', ingredients: ['Quinoa', 'Chickpeas', 'Avocado', 'Cucumber', 'Tahini dressing'], instructions: 'Layer quinoa with vegetables and drizzle with dressing.' },
            { type: 'snack', name: 'Greek Yogurt', calories: 120, protein: 15, time: '4:00 PM', ingredients: ['Plain Greek yogurt', 'Cinnamon'], instructions: 'Serve yogurt with a sprinkle of cinnamon.' },
            { type: 'dinner', name: 'Grilled Shrimp Tacos', calories: 450, protein: 32, time: '7:00 PM', ingredients: ['Shrimp', 'Corn tortillas', 'Cabbage slaw', 'Lime', 'Cilantro'], instructions: 'Grill shrimp, serve in tortillas with slaw.' },
          ],
          thursday: [
            { type: 'breakfast', name: 'Smoothie Bowl', calories: 380, protein: 18, time: '8:00 AM', ingredients: ['Frozen berries', 'Banana', 'Protein powder', 'Granola'], instructions: 'Blend fruits with protein powder, top with granola.' },
            { type: 'snack', name: 'Rice Cakes with PB', calories: 180, protein: 6, time: '10:30 AM', ingredients: ['Rice cakes', 'Peanut butter'], instructions: 'Spread peanut butter on rice cakes.' },
            { type: 'lunch', name: 'Tuna Salad', calories: 400, protein: 35, time: '1:00 PM', ingredients: ['Canned tuna', 'Mixed greens', 'Olive oil', 'Lemon'], instructions: 'Mix tuna with greens and dress with oil and lemon.' },
            { type: 'snack', name: 'Edamame', calories: 150, protein: 12, time: '4:00 PM', ingredients: ['Steamed edamame', 'Sea salt'], instructions: 'Steam edamame and sprinkle with salt.' },
            { type: 'dinner', name: 'Lean Beef Steak', calories: 520, protein: 42, time: '7:00 PM', ingredients: ['Sirloin steak', 'Asparagus', 'Mashed cauliflower'], instructions: 'Grill steak to desired doneness, serve with vegetables.' },
          ],
          friday: [
            { type: 'breakfast', name: 'Avocado Toast', calories: 350, protein: 12, time: '8:00 AM', ingredients: ['Whole grain bread', 'Avocado', 'Poached egg', 'Everything seasoning'], instructions: 'Toast bread, top with mashed avocado and poached egg.' },
            { type: 'snack', name: 'Protein Bar', calories: 200, protein: 20, time: '10:30 AM', ingredients: ['Protein bar'], instructions: 'Enjoy one protein bar.' },
            { type: 'lunch', name: 'Mediterranean Bowl', calories: 450, protein: 28, time: '1:00 PM', ingredients: ['Falafel', 'Hummus', 'Tabbouleh', 'Pita'], instructions: 'Arrange all components in a bowl.' },
            { type: 'snack', name: 'String Cheese', calories: 80, protein: 8, time: '4:00 PM', ingredients: ['String cheese'], instructions: 'Enjoy one piece of string cheese.' },
            { type: 'dinner', name: 'Baked Cod with Rice', calories: 480, protein: 38, time: '7:00 PM', ingredients: ['Cod fillet', 'Wild rice', 'Green beans', 'Lemon butter'], instructions: 'Bake cod with lemon, serve with rice and beans.' },
          ],
          saturday: [
            { type: 'breakfast', name: 'Pancakes (Healthy)', calories: 400, protein: 18, time: '9:00 AM', ingredients: ['Oat flour', 'Banana', 'Eggs', 'Maple syrup'], instructions: 'Blend oats into flour, mix with banana and eggs, cook pancakes.' },
            { type: 'snack', name: 'Fruit Salad', calories: 150, protein: 2, time: '11:00 AM', ingredients: ['Mixed seasonal fruits'], instructions: 'Chop and mix fruits.' },
            { type: 'lunch', name: 'Grilled Veggie Sandwich', calories: 420, protein: 18, time: '1:30 PM', ingredients: ['Ciabatta', 'Grilled zucchini', 'Peppers', 'Goat cheese'], instructions: 'Grill vegetables, layer on bread with cheese.' },
            { type: 'snack', name: 'Dark Chocolate', calories: 100, protein: 2, time: '4:00 PM', ingredients: ['Dark chocolate (70%+)'], instructions: 'Enjoy 1-2 squares of dark chocolate.' },
            { type: 'dinner', name: 'Homemade Pizza', calories: 550, protein: 25, time: '7:30 PM', ingredients: ['Whole wheat crust', 'Tomato sauce', 'Mozzarella', 'Vegetables'], instructions: 'Assemble pizza and bake at 450°F for 12-15 minutes.' },
          ],
          sunday: [
            { type: 'breakfast', name: 'Eggs Benedict (Light)', calories: 420, protein: 25, time: '10:00 AM', ingredients: ['English muffin', 'Canadian bacon', 'Poached eggs', 'Light hollandaise'], instructions: 'Assemble with poached eggs and light sauce.' },
            { type: 'snack', name: 'Smoothie', calories: 180, protein: 15, time: '12:30 PM', ingredients: ['Spinach', 'Banana', 'Protein powder', 'Almond milk'], instructions: 'Blend all ingredients.' },
            { type: 'lunch', name: 'Chicken Caesar Salad', calories: 400, protein: 35, time: '2:00 PM', ingredients: ['Grilled chicken', 'Romaine', 'Parmesan', 'Light caesar'], instructions: 'Toss all ingredients together.' },
            { type: 'snack', name: 'Veggie Sticks', calories: 80, protein: 2, time: '5:00 PM', ingredients: ['Celery', 'Cucumber', 'Bell peppers'], instructions: 'Slice and serve with light dip.' },
            { type: 'dinner', name: 'Roast Chicken', calories: 500, protein: 45, time: '7:00 PM', ingredients: ['Chicken breast', 'Roasted potatoes', 'Brussels sprouts'], instructions: 'Roast chicken at 375°F, serve with vegetables.' },
          ],
        }
      })
      setPastPlans([
        { id: '2', name: 'Weight Loss Plan - Week 2', startDate: '2024-01-15', endDate: '2024-01-21', avgCalories: 1820 },
        { id: '3', name: 'Weight Loss Plan - Week 1', startDate: '2024-01-08', endDate: '2024-01-14', avgCalories: 1850 },
      ])
      setLoading(false)
      return
    }

    try {
      const { data: plans } = await supabase
        .from('meal_plans')
        .select('*')
        .eq('user_id', user?.id)
        .order('created_at', { ascending: false })

      if (plans && plans.length > 0) {
        setActivePlan(plans[0])
        setPastPlans(plans.slice(1))
      }
    } catch (error) {
      console.error('Error fetching meal plans:', error)
    } finally {
      setLoading(false)
    }
  }

  const getMealIcon = (type) => {
    switch (type) {
      case 'breakfast': return Coffee
      case 'lunch': return Salad
      case 'dinner': return Beef
      case 'snack': return Apple
      default: return Utensils
    }
  }

  const getMealColor = (type) => {
    switch (type) {
      case 'breakfast': return 'text-orange-500 bg-orange-500/10'
      case 'lunch': return 'text-green-500 bg-green-500/10'
      case 'dinner': return 'text-purple-500 bg-purple-500/10'
      case 'snack': return 'text-blue-500 bg-blue-500/10'
      default: return 'text-gray-500 bg-gray-500/10'
    }
  }

  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']

  const openMealDialog = (meal) => {
    setSelectedMeal(meal)
    setMealDialogOpen(true)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Free tier - show upgrade prompt
  if (!hasMealPlans) {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto text-center">
          <CardContent className="p-12">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <Lock className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4">Unlock Personalized Meal Plans</h2>
            <p className="text-muted-foreground mb-6">
              Upgrade to Basic or higher to get customized meal plans from our certified nutritionists,
              tailored to your goals and dietary preferences.
            </p>
            <div className="space-y-3 mb-8 text-left max-w-md mx-auto">
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Weekly personalized meal plans</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Detailed recipes and instructions</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Nutritional breakdown for every meal</span>
              </div>
              <div className="flex items-center gap-3">
                <CheckCircle className="h-5 w-5 text-green-500" />
                <span>Shopping lists and prep guides</span>
              </div>
            </div>
            <Button size="lg" asChild>
              <Link to="/pricing">
                <Crown className="mr-2 h-5 w-5" />
                Upgrade Now
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  // No active plan
  if (!activePlan) {
    return (
      <div className="p-6">
        <Card className="max-w-2xl mx-auto text-center">
          <CardContent className="p-12">
            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ChefHat className="h-10 w-10 text-primary" />
            </div>
            <h2 className="text-2xl font-bold mb-4">No Active Meal Plan</h2>
            <p className="text-muted-foreground mb-6">
              You don't have an active meal plan yet. Contact your nutritionist to get a personalized plan created for you.
            </p>
            <Button asChild>
              <Link to="/app/messages">
                <MessageSquare className="mr-2 h-4 w-4" />
                Message Nutritionist
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  const todayMeals = activePlan.meals?.[selectedDay] || []
  const totalCalories = todayMeals.reduce((sum, meal) => sum + meal.calories, 0)
  const totalProtein = todayMeals.reduce((sum, meal) => sum + meal.protein, 0)

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">My Meal Plans</h1>
          <p className="text-muted-foreground">View your personalized nutrition plan</p>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="outline">
            <Download className="mr-2 h-4 w-4" />
            Download PDF
          </Button>
          <Button asChild>
            <Link to="/app/messages">
              <MessageSquare className="mr-2 h-4 w-4" />
              Message Nutritionist
            </Link>
          </Button>
        </div>
      </div>

      {/* Active Plan Info */}
      <Card>
        <CardContent className="p-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-primary/10 rounded-lg">
                <ChefHat className="h-8 w-8 text-primary" />
              </div>
              <div>
                <h2 className="text-xl font-bold">{activePlan.name}</h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  <span>{new Date(activePlan.startDate).toLocaleDateString()} - {new Date(activePlan.endDate).toLocaleDateString()}</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Avatar>
                <AvatarImage src={activePlan.nutritionist?.avatar} />
                <AvatarFallback className="bg-purple-500 text-white">
                  {activePlan.nutritionist?.name?.charAt(0)}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium">{activePlan.nutritionist?.name}</p>
                <p className="text-sm text-muted-foreground">Your Nutritionist</p>
              </div>
            </div>
          </div>

          {/* Daily Targets */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <Flame className="h-5 w-5 text-orange-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{activePlan.dailyCalories}</p>
              <p className="text-sm text-muted-foreground">Daily Calories</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <Beef className="h-5 w-5 text-red-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{activePlan.dailyProtein}g</p>
              <p className="text-sm text-muted-foreground">Protein</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <Cookie className="h-5 w-5 text-amber-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{activePlan.dailyCarbs}g</p>
              <p className="text-sm text-muted-foreground">Carbs</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg text-center">
              <Apple className="h-5 w-5 text-green-500 mx-auto mb-2" />
              <p className="text-2xl font-bold">{activePlan.dailyFat}g</p>
              <p className="text-sm text-muted-foreground">Fat</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Day Selector */}
      <Tabs value={selectedDay} onValueChange={setSelectedDay}>
        <TabsList className="grid grid-cols-7 w-full">
          {days.map((day) => (
            <TabsTrigger key={day} value={day} className="capitalize text-xs md:text-sm">
              {day.slice(0, 3)}
            </TabsTrigger>
          ))}
        </TabsList>

        {days.map((day) => (
          <TabsContent key={day} value={day} className="mt-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold capitalize">{day}'s Meals</h3>
              <div className="flex gap-4 text-sm">
                <span><strong>{activePlan.meals?.[day]?.reduce((s, m) => s + m.calories, 0) || 0}</strong> cal</span>
                <span><strong>{activePlan.meals?.[day]?.reduce((s, m) => s + m.protein, 0) || 0}g</strong> protein</span>
              </div>
            </div>
            <div className="space-y-4">
              {(activePlan.meals?.[day] || []).map((meal, index) => {
                const MealIcon = getMealIcon(meal.type)
                const colorClass = getMealColor(meal.type)
                return (
                  <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => openMealDialog(meal)}>
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`p-3 rounded-lg ${colorClass}`}>
                              <MealIcon className="h-5 w-5" />
                            </div>
                            <div>
                              <div className="flex items-center gap-2">
                                <Badge variant="outline" className="capitalize text-xs">{meal.type}</Badge>
                                <span className="text-sm text-muted-foreground">{meal.time}</span>
                              </div>
                              <h4 className="font-semibold mt-1">{meal.name}</h4>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-bold">{meal.calories} cal</p>
                            <p className="text-sm text-muted-foreground">{meal.protein}g protein</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {/* Past Plans */}
      {pastPlans.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Past Meal Plans</CardTitle>
            <CardDescription>Your previous weekly plans</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {pastPlans.map((plan) => (
                <div key={plan.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">{plan.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(plan.startDate).toLocaleDateString()} - {new Date(plan.endDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm text-muted-foreground">Avg: {plan.avgCalories} cal/day</span>
                    <Button size="sm" variant="outline">
                      <Eye className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Meal Detail Dialog */}
      <Dialog open={mealDialogOpen} onOpenChange={setMealDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{selectedMeal?.name}</DialogTitle>
            <DialogDescription className="capitalize">{selectedMeal?.type} - {selectedMeal?.time}</DialogDescription>
          </DialogHeader>
          {selectedMeal && (
            <div className="space-y-4">
              {/* Nutrition */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xl font-bold">{selectedMeal.calories}</p>
                  <p className="text-xs text-muted-foreground">Calories</p>
                </div>
                <div className="p-3 bg-muted/50 rounded-lg text-center">
                  <p className="text-xl font-bold">{selectedMeal.protein}g</p>
                  <p className="text-xs text-muted-foreground">Protein</p>
                </div>
              </div>

              {/* Ingredients */}
              <div>
                <h4 className="font-semibold mb-2">Ingredients</h4>
                <ul className="space-y-1">
                  {selectedMeal.ingredients?.map((ing, i) => (
                    <li key={i} className="flex items-center gap-2 text-sm">
                      <CheckCircle className="h-3 w-3 text-green-500" />
                      {ing}
                    </li>
                  ))}
                </ul>
              </div>

              {/* Instructions */}
              <div>
                <h4 className="font-semibold mb-2">Instructions</h4>
                <p className="text-sm text-muted-foreground">{selectedMeal.instructions}</p>
              </div>

              <Button className="w-full" onClick={() => setMealDialogOpen(false)}>
                Got It
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
