import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Utensils,
  Coffee,
  Sun,
  Moon,
  Apple,
  Search,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Flame,
  Target
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'

const meals = [
  { id: 'breakfast', name: 'Breakfast', icon: Coffee, time: '6:00 AM - 10:00 AM' },
  { id: 'lunch', name: 'Lunch', icon: Sun, time: '11:00 AM - 2:00 PM' },
  { id: 'dinner', name: 'Dinner', icon: Moon, time: '6:00 PM - 9:00 PM' },
  { id: 'snacks', name: 'Snacks', icon: Apple, time: 'Anytime' },
]

const todaysMeals = {
  breakfast: [
    { name: 'Oatmeal with Berries', calories: 350, protein: 12, carbs: 60, fat: 8 },
    { name: 'Greek Yogurt', calories: 150, protein: 15, carbs: 10, fat: 5 },
  ],
  lunch: [
    { name: 'Grilled Chicken Salad', calories: 450, protein: 35, carbs: 20, fat: 25 },
  ],
  dinner: [],
  snacks: [
    { name: 'Apple', calories: 95, protein: 0, carbs: 25, fat: 0 },
  ],
}

const macroGoals = {
  calories: { current: 1045, target: 2200 },
  protein: { current: 62, target: 120 },
  carbs: { current: 115, target: 250 },
  fat: { current: 38, target: 70 },
}

const quickAddFoods = [
  { name: 'Banana', calories: 105, protein: 1, carbs: 27, fat: 0 },
  { name: 'Chicken Breast (100g)', calories: 165, protein: 31, carbs: 0, fat: 4 },
  { name: 'Brown Rice (1 cup)', calories: 216, protein: 5, carbs: 45, fat: 2 },
  { name: 'Eggs (2)', calories: 143, protein: 13, carbs: 1, fat: 10 },
  { name: 'Avocado (half)', calories: 161, protein: 2, carbs: 9, fat: 15 },
  { name: 'Almonds (1 oz)', calories: 164, protein: 6, carbs: 6, fat: 14 },
]

export default function Nutrition() {
  const [selectedDate, setSelectedDate] = useState(new Date())
  const [addFoodOpen, setAddFoodOpen] = useState(false)
  const [selectedMealType, setSelectedMealType] = useState('breakfast')
  const [searchQuery, setSearchQuery] = useState('')

  const formatDate = (date) => {
    return date.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    })
  }

  const changeDate = (days) => {
    const newDate = new Date(selectedDate)
    newDate.setDate(newDate.getDate() + days)
    setSelectedDate(newDate)
  }

  const isToday = selectedDate.toDateString() === new Date().toDateString()

  const getMealTotals = (mealType) => {
    const mealItems = todaysMeals[mealType] || []
    return mealItems.reduce((acc, item) => ({
      calories: acc.calories + item.calories,
      protein: acc.protein + item.protein,
      carbs: acc.carbs + item.carbs,
      fat: acc.fat + item.fat,
    }), { calories: 0, protein: 0, carbs: 0, fat: 0 })
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Nutrition Tracker</h1>
          <p className="text-muted-foreground">Track your meals and monitor your macros</p>
        </div>
        <Dialog open={addFoodOpen} onOpenChange={setAddFoodOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Log Food
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Food</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search foods..."
                  className="pl-10"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
              <div className="flex gap-2 flex-wrap">
                {meals.map((meal) => (
                  <Button
                    key={meal.id}
                    variant={selectedMealType === meal.id ? 'default' : 'outline'}
                    size="sm"
                    onClick={() => setSelectedMealType(meal.id)}
                  >
                    {meal.name}
                  </Button>
                ))}
              </div>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                <p className="text-sm text-muted-foreground">Quick Add</p>
                {quickAddFoods.map((food, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer transition-colors"
                    onClick={() => setAddFoodOpen(false)}
                  >
                    <div>
                      <p className="font-medium text-sm">{food.name}</p>
                      <p className="text-xs text-muted-foreground">
                        P: {food.protein}g | C: {food.carbs}g | F: {food.fat}g
                      </p>
                    </div>
                    <Badge variant="secondary">{food.calories} cal</Badge>
                  </div>
                ))}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date Selector */}
      <div className="flex items-center justify-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => changeDate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium">
            {isToday ? 'Today' : formatDate(selectedDate)}
          </span>
        </div>
        <Button variant="ghost" size="icon" onClick={() => changeDate(1)} disabled={isToday}>
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Macro Summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {Object.entries(macroGoals).map(([macro, { current, target }], index) => (
          <motion.div
            key={macro}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground capitalize">{macro}</span>
                  {macro === 'calories' ? (
                    <Flame className="h-4 w-4 text-orange-500" />
                  ) : (
                    <Target className="h-4 w-4 text-primary" />
                  )}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{current}</span>
                  <span className="text-sm text-muted-foreground">
                    / {target}{macro !== 'calories' ? 'g' : ''}
                  </span>
                </div>
                <Progress
                  value={(current / target) * 100}
                  className="h-2 mt-2"
                />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Meals */}
      <div className="space-y-4">
        {meals.map((meal) => {
          const mealItems = todaysMeals[meal.id] || []
          const totals = getMealTotals(meal.id)

          return (
            <Card key={meal.id}>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <meal.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <CardTitle className="text-base">{meal.name}</CardTitle>
                      <p className="text-sm text-muted-foreground">{meal.time}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    {totals.calories > 0 && (
                      <Badge variant="secondary">{totals.calories} cal</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                {mealItems.length > 0 ? (
                  <div className="space-y-2">
                    {mealItems.map((item, index) => (
                      <div
                        key={index}
                        className="flex items-center justify-between p-3 rounded-lg bg-muted/50"
                      >
                        <div>
                          <p className="font-medium text-sm">{item.name}</p>
                          <p className="text-xs text-muted-foreground">
                            P: {item.protein}g | C: {item.carbs}g | F: {item.fat}g
                          </p>
                        </div>
                        <span className="text-sm font-medium">{item.calories} cal</span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <p className="text-muted-foreground text-sm mb-2">No foods logged</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedMealType(meal.id)
                        setAddFoodOpen(true)
                      }}
                    >
                      <Plus className="mr-2 h-4 w-4" />
                      Add Food
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
