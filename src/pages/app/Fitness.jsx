import { useState } from 'react'
import { motion } from 'framer-motion'
import {
  Dumbbell,
  Play,
  Clock,
  Flame,
  Trophy,
  Calendar,
  Plus,
  ChevronRight,
  Target
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'

const workoutCategories = [
  { id: 'strength', name: 'Strength', count: 12 },
  { id: 'cardio', name: 'Cardio', count: 8 },
  { id: 'flexibility', name: 'Flexibility', count: 6 },
  { id: 'hiit', name: 'HIIT', count: 5 },
]

const recommendedWorkouts = [
  {
    id: 1,
    name: 'Full Body Strength',
    duration: 45,
    calories: 350,
    difficulty: 'Intermediate',
    exercises: 8,
  },
  {
    id: 2,
    name: 'Morning Cardio Blast',
    duration: 30,
    calories: 280,
    difficulty: 'Beginner',
    exercises: 6,
  },
  {
    id: 3,
    name: 'Core Crusher',
    duration: 20,
    calories: 150,
    difficulty: 'Advanced',
    exercises: 10,
  },
]

const recentWorkouts = [
  {
    name: 'Upper Body Strength',
    date: 'Today',
    duration: 42,
    calories: 320,
    completed: true,
  },
  {
    name: 'Morning Run',
    date: 'Yesterday',
    duration: 35,
    calories: 280,
    completed: true,
  },
  {
    name: 'Yoga Flow',
    date: '2 days ago',
    duration: 30,
    calories: 120,
    completed: true,
  },
]

const weeklyProgress = {
  workouts: { current: 4, target: 5 },
  minutes: { current: 180, target: 200 },
  calories: { current: 1200, target: 1500 },
}

export default function Fitness() {
  const [selectedCategory, setSelectedCategory] = useState('all')

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Fitness</h1>
          <p className="text-muted-foreground">Track workouts and reach your fitness goals</p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Start Workout
        </Button>
      </div>

      {/* Weekly Progress */}
      <div className="grid md:grid-cols-3 gap-4">
        {Object.entries(weeklyProgress).map(([key, { current, target }], index) => (
          <motion.div
            key={key}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <Card>
              <CardContent className="p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-muted-foreground capitalize">
                    Weekly {key}
                  </span>
                  {key === 'workouts' && <Trophy className="h-4 w-4 text-primary" />}
                  {key === 'minutes' && <Clock className="h-4 w-4 text-blue-500" />}
                  {key === 'calories' && <Flame className="h-4 w-4 text-orange-500" />}
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-2xl font-bold">{current}</span>
                  <span className="text-sm text-muted-foreground">/ {target}</span>
                </div>
                <Progress value={(current / target) * 100} className="h-2 mt-2" />
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      <Tabs defaultValue="workouts" className="space-y-6">
        <TabsList>
          <TabsTrigger value="workouts">Workouts</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
          <TabsTrigger value="exercises">Exercises</TabsTrigger>
        </TabsList>

        <TabsContent value="workouts" className="space-y-6">
          {/* Categories */}
          <div className="flex gap-2 overflow-x-auto pb-2">
            <Button
              variant={selectedCategory === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectedCategory('all')}
            >
              All
            </Button>
            {workoutCategories.map((category) => (
              <Button
                key={category.id}
                variant={selectedCategory === category.id ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedCategory(category.id)}
              >
                {category.name}
                <Badge variant="secondary" className="ml-2">
                  {category.count}
                </Badge>
              </Button>
            ))}
          </div>

          {/* Recommended Workouts */}
          <div>
            <h2 className="text-lg font-semibold mb-4">Recommended For You</h2>
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
              {recommendedWorkouts.map((workout, index) => (
                <motion.div
                  key={workout.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="card-hover cursor-pointer">
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                          <Dumbbell className="h-6 w-6 text-primary" />
                        </div>
                        <Badge variant="outline">{workout.difficulty}</Badge>
                      </div>
                      <h3 className="font-semibold mb-2">{workout.name}</h3>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Clock className="h-4 w-4" />
                          {workout.duration} min
                        </span>
                        <span className="flex items-center gap-1">
                          <Flame className="h-4 w-4" />
                          {workout.calories} cal
                        </span>
                      </div>
                      <Button className="w-full mt-4" variant="secondary">
                        <Play className="mr-2 h-4 w-4" />
                        Start Workout
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Recent Workouts</CardTitle>
              <CardDescription>Your workout history</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {recentWorkouts.map((workout, index) => (
                <motion.div
                  key={index}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="flex items-center justify-between p-4 rounded-lg bg-muted/50"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <Dumbbell className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{workout.name}</p>
                      <p className="text-sm text-muted-foreground">{workout.date}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-medium">{workout.duration} min</p>
                    <p className="text-sm text-muted-foreground">{workout.calories} cal</p>
                  </div>
                </motion.div>
              ))}
              <Button variant="outline" className="w-full">
                View All History
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exercises">
          <Card>
            <CardHeader>
              <CardTitle>Exercise Library</CardTitle>
              <CardDescription>Browse exercises by muscle group</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {['Chest', 'Back', 'Shoulders', 'Arms', 'Legs', 'Core'].map((muscle, index) => (
                  <motion.div
                    key={muscle}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: index * 0.05 }}
                    className="p-4 rounded-lg border border-border hover:border-primary/50 hover:bg-muted/50 cursor-pointer transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Target className="h-5 w-5 text-primary" />
                        <span className="font-medium">{muscle}</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </div>
                  </motion.div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
