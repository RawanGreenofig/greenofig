import { useState } from 'react'
import { Droplets, Scale, Utensils, Dumbbell, Loader2, Plus, Minus } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuth } from '@/contexts/AuthContext'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import toast from 'react-hot-toast'

export function QuickLogCard({ onLogged }) {
  const { user } = useAuth()
  const [waterPending, setWaterPending] = useState(false)
  const [weightPending, setWeightPending] = useState(false)
  const [mealPending, setMealPending] = useState(false)
  const [workoutPending, setWorkoutPending] = useState(false)

  const [weight, setWeight] = useState('')
  const [meal, setMeal] = useState({ meal_type: 'breakfast', food_name: '', calories: '', protein: '' })
  const [workout, setWorkout] = useState({ workout_type: 'cardio', exercise_name: '', duration_minutes: '', calories_burned: '' })

  const requireUser = () => {
    if (!user?.id) {
      toast.error('Please sign in to log')
      return false
    }
    if (!isSupabaseConfigured()) {
      toast.error('Backend not configured')
      return false
    }
    return true
  }

  const logWater = async (glasses) => {
    if (!requireUser()) return
    setWaterPending(true)
    try {
      const { error } = await supabase
        .from('water_logs')
        .insert({ user_id: user.id, glasses })
      if (error) throw error
      toast.success(`+${glasses} glass${glasses > 1 ? 'es' : ''} logged`)
      onLogged?.('water')
    } catch (e) {
      toast.error(e.message || 'Failed to log water')
    } finally {
      setWaterPending(false)
    }
  }

  const logWeight = async () => {
    if (!requireUser()) return
    const num = Number(weight)
    if (!num || num <= 0) return toast.error('Enter a valid weight')
    setWeightPending(true)
    try {
      const { error } = await supabase
        .from('weight_logs')
        .insert({ user_id: user.id, weight: num, unit: 'kg' })
      if (error) throw error
      setWeight('')
      toast.success('Weight logged')
      onLogged?.('weight')
    } catch (e) {
      toast.error(e.message || 'Failed to log weight')
    } finally {
      setWeightPending(false)
    }
  }

  const logMeal = async () => {
    if (!requireUser()) return
    if (!meal.food_name.trim()) return toast.error('Enter a food name')
    setMealPending(true)
    try {
      const { error } = await supabase
        .from('meal_logs')
        .insert({
          user_id: user.id,
          meal_type: meal.meal_type,
          food_name: meal.food_name.trim(),
          calories: meal.calories === '' ? 0 : Number(meal.calories),
          protein: meal.protein === '' ? 0 : Number(meal.protein),
        })
      if (error) throw error
      setMeal({ meal_type: meal.meal_type, food_name: '', calories: '', protein: '' })
      toast.success('Meal logged')
      onLogged?.('meal')
    } catch (e) {
      toast.error(e.message || 'Failed to log meal')
    } finally {
      setMealPending(false)
    }
  }

  const logWorkout = async () => {
    if (!requireUser()) return
    if (!workout.exercise_name.trim()) return toast.error('Enter an exercise name')
    setWorkoutPending(true)
    try {
      const { error } = await supabase
        .from('workout_logs')
        .insert({
          user_id: user.id,
          workout_type: workout.workout_type,
          exercise_name: workout.exercise_name.trim(),
          duration_minutes: workout.duration_minutes === '' ? null : Number(workout.duration_minutes),
          calories_burned: workout.calories_burned === '' ? null : Number(workout.calories_burned),
        })
      if (error) throw error
      setWorkout({ workout_type: workout.workout_type, exercise_name: '', duration_minutes: '', calories_burned: '' })
      toast.success('Workout logged')
      onLogged?.('workout')
    } catch (e) {
      toast.error(e.message || 'Failed to log workout')
    } finally {
      setWorkoutPending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Plus className="h-5 w-5 text-primary" />
          Quick Log
        </CardTitle>
        <CardDescription>Log directly from the dashboard.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="water">
          <TabsList className="grid grid-cols-4 w-full">
            <TabsTrigger value="water" className="gap-1"><Droplets className="h-4 w-4" /> Water</TabsTrigger>
            <TabsTrigger value="weight" className="gap-1"><Scale className="h-4 w-4" /> Weight</TabsTrigger>
            <TabsTrigger value="meal" className="gap-1"><Utensils className="h-4 w-4" /> Meal</TabsTrigger>
            <TabsTrigger value="workout" className="gap-1"><Dumbbell className="h-4 w-4" /> Workout</TabsTrigger>
          </TabsList>

          <TabsContent value="water" className="pt-4">
            <p className="text-sm text-muted-foreground mb-3">Tap to log a glass.</p>
            <div className="flex gap-2 flex-wrap">
              {[1, 2, 3].map(n => (
                <Button key={n} variant="outline" disabled={waterPending} onClick={() => logWater(n)}>
                  {waterPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Droplets className="mr-2 h-4 w-4" />}
                  +{n} glass{n > 1 ? 'es' : ''}
                </Button>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="weight" className="pt-4">
            <div className="flex gap-2 items-end">
              <div className="flex-1">
                <Label htmlFor="qw" className="mb-2 block">Weight (kg)</Label>
                <Input id="qw" type="number" step="0.1" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="e.g. 72.5" />
              </div>
              <Button onClick={logWeight} disabled={weightPending}>
                {weightPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Scale className="mr-2 h-4 w-4" />}
                Log
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="meal" className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-2 block">Type</Label>
                <Select value={meal.meal_type} onValueChange={(v) => setMeal(m => ({ ...m, meal_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="breakfast">Breakfast</SelectItem>
                    <SelectItem value="lunch">Lunch</SelectItem>
                    <SelectItem value="dinner">Dinner</SelectItem>
                    <SelectItem value="snack">Snack</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Food</Label>
                <Input value={meal.food_name} onChange={(e) => setMeal(m => ({ ...m, food_name: e.target.value }))} placeholder="e.g. Greek yogurt" />
              </div>
              <div>
                <Label className="mb-2 block">Calories</Label>
                <Input type="number" value={meal.calories} onChange={(e) => setMeal(m => ({ ...m, calories: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <Label className="mb-2 block">Protein (g)</Label>
                <Input type="number" step="0.1" value={meal.protein} onChange={(e) => setMeal(m => ({ ...m, protein: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <Button onClick={logMeal} disabled={mealPending} className="w-full">
              {mealPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Utensils className="mr-2 h-4 w-4" />}
              Log meal
            </Button>
          </TabsContent>

          <TabsContent value="workout" className="pt-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label className="mb-2 block">Type</Label>
                <Select value={workout.workout_type} onValueChange={(v) => setWorkout(w => ({ ...w, workout_type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="cardio">Cardio</SelectItem>
                    <SelectItem value="strength">Strength</SelectItem>
                    <SelectItem value="flexibility">Flexibility</SelectItem>
                    <SelectItem value="hiit">HIIT</SelectItem>
                    <SelectItem value="sports">Sports</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="mb-2 block">Exercise</Label>
                <Input value={workout.exercise_name} onChange={(e) => setWorkout(w => ({ ...w, exercise_name: e.target.value }))} placeholder="e.g. Running" />
              </div>
              <div>
                <Label className="mb-2 block">Duration (min)</Label>
                <Input type="number" value={workout.duration_minutes} onChange={(e) => setWorkout(w => ({ ...w, duration_minutes: e.target.value }))} placeholder="0" />
              </div>
              <div>
                <Label className="mb-2 block">Calories burned</Label>
                <Input type="number" value={workout.calories_burned} onChange={(e) => setWorkout(w => ({ ...w, calories_burned: e.target.value }))} placeholder="0" />
              </div>
            </div>
            <Button onClick={logWorkout} disabled={workoutPending} className="w-full">
              {workoutPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Dumbbell className="mr-2 h-4 w-4" />}
              Log workout
            </Button>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
