import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Utensils, Plus, Search, Edit, Trash2, Eye, MoreVertical,
  Copy, Send, Calendar, User, Flame
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

export default function NutritionistMealPlans() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [mealPlans, setMealPlans] = useState([])
  const [templates, setTemplates] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [activeTab, setActiveTab] = useState('assigned')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    client_id: '',
    duration_days: '7',
    calories_target: '2000',
    meals: []
  })

  useEffect(() => {
    fetchMealPlans()
  }, [])

  const fetchMealPlans = async () => {
    if (!isSupabaseConfigured()) {
      // Mock data
      setMealPlans([
        { id: '1', name: 'Weight Loss Plan - Sarah', client_name: 'Sarah Johnson', calories: 1500, duration: 30, status: 'active', created_at: '2024-01-20', meals_count: 90 },
        { id: '2', name: 'Muscle Building Plan - Mike', client_name: 'Mike Chen', calories: 2800, duration: 30, status: 'active', created_at: '2024-01-18', meals_count: 90 },
        { id: '3', name: 'Balanced Diet - Emma', client_name: 'Emma Wilson', calories: 2000, duration: 14, status: 'completed', created_at: '2024-01-10', meals_count: 42 },
      ])
      setTemplates([
        { id: 't1', name: 'Weight Loss Template', description: 'Low calorie, high protein plan', calories: 1500, meals_count: 21 },
        { id: 't2', name: 'Muscle Gain Template', description: 'High protein, high calorie plan', calories: 2800, meals_count: 21 },
        { id: 't3', name: 'Balanced Lifestyle', description: 'Moderate calories, balanced macros', calories: 2000, meals_count: 21 },
        { id: 't4', name: 'Vegan Plan', description: 'Plant-based nutrition plan', calories: 1800, meals_count: 21 },
      ])
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('meal_plans')
        .select(`
          *,
          user_profiles (full_name)
        `)
        .eq('created_by', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error

      setMealPlans(data?.map(plan => ({
        ...plan,
        client_name: plan.user_profiles?.full_name
      })) || [])
    } catch (error) {
      console.error('Error fetching meal plans:', error)
      toast.error('Failed to fetch meal plans')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.name) {
      toast.error('Plan name is required')
      return
    }

    if (!isSupabaseConfigured()) {
      const newPlan = {
        id: Date.now().toString(),
        name: formData.name,
        client_name: 'New Client',
        calories: parseInt(formData.calories_target),
        duration: parseInt(formData.duration_days),
        status: 'active',
        created_at: new Date().toISOString(),
        meals_count: parseInt(formData.duration_days) * 3
      }
      setMealPlans([newPlan, ...mealPlans])
      toast.success('Meal plan created')
      setCreateDialogOpen(false)
      resetForm()
      return
    }

    try {
      const { error } = await supabase
        .from('meal_plans')
        .insert([{
          ...formData,
          created_by: user?.id
        }])

      if (error) throw error

      toast.success('Meal plan created')
      setCreateDialogOpen(false)
      resetForm()
      fetchMealPlans()
    } catch (error) {
      console.error('Error creating meal plan:', error)
      toast.error('Failed to create meal plan')
    }
  }

  const handleDelete = async (plan) => {
    if (!isSupabaseConfigured()) {
      setMealPlans(mealPlans.filter(p => p.id !== plan.id))
      toast.success('Meal plan deleted')
      return
    }

    try {
      const { error } = await supabase
        .from('meal_plans')
        .delete()
        .eq('id', plan.id)

      if (error) throw error

      toast.success('Meal plan deleted')
      fetchMealPlans()
    } catch (error) {
      console.error('Error deleting meal plan:', error)
      toast.error('Failed to delete meal plan')
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      client_id: '',
      duration_days: '7',
      calories_target: '2000',
      meals: []
    })
  }

  const filteredPlans = mealPlans.filter(plan =>
    plan.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    plan.client_name?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const getStatusBadge = (status) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500">Active</Badge>
      case 'completed':
        return <Badge variant="secondary">Completed</Badge>
      case 'draft':
        return <Badge variant="outline">Draft</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Meal Plans</h1>
          <p className="text-muted-foreground">Create and manage client meal plans</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create Plan
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="assigned">
            <User className="mr-2 h-4 w-4" />
            Assigned Plans ({mealPlans.length})
          </TabsTrigger>
          <TabsTrigger value="templates">
            <Copy className="mr-2 h-4 w-4" />
            Templates ({templates.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          {/* Search */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search meal plans..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
            </CardContent>
          </Card>

          <TabsContent value="assigned" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredPlans.map((plan, index) => (
                <motion.div
                  key={plan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between">
                        <div>
                          <CardTitle className="text-lg">{plan.name}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-1">
                            <User className="h-3 w-3" />
                            {plan.client_name}
                          </CardDescription>
                        </div>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <Eye className="mr-2 h-4 w-4" />
                              View Details
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Edit className="mr-2 h-4 w-4" />
                              Edit Plan
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <Copy className="mr-2 h-4 w-4" />
                              Duplicate
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleDelete(plan)}
                              className="text-destructive"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Status</span>
                          {getStatusBadge(plan.status)}
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Daily Calories</span>
                          <div className="flex items-center gap-1">
                            <Flame className="h-4 w-4 text-orange-500" />
                            <span className="font-medium">{plan.calories}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Duration</span>
                          <span className="font-medium">{plan.duration} days</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Total Meals</span>
                          <span className="font-medium">{plan.meals_count}</span>
                        </div>
                      </div>
                      <div className="flex gap-2 mt-4">
                        <Button variant="outline" size="sm" className="flex-1">
                          <Eye className="mr-2 h-4 w-4" />
                          View
                        </Button>
                        <Button size="sm" className="flex-1">
                          <Send className="mr-2 h-4 w-4" />
                          Send
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>

            {filteredPlans.length === 0 && (
              <Card>
                <CardContent className="p-12 text-center">
                  <Utensils className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium">No meal plans found</h3>
                  <p className="text-muted-foreground mb-4">Create your first meal plan for a client</p>
                  <Button onClick={() => setCreateDialogOpen(true)}>
                    <Plus className="mr-2 h-4 w-4" />
                    Create Plan
                  </Button>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          <TabsContent value="templates" className="mt-0">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {templates.map((template, index) => (
                <motion.div
                  key={template.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.description}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Daily Calories</span>
                          <div className="flex items-center gap-1">
                            <Flame className="h-4 w-4 text-orange-500" />
                            <span className="font-medium">{template.calories}</span>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-sm text-muted-foreground">Meals Included</span>
                          <span className="font-medium">{template.meals_count}</span>
                        </div>
                      </div>
                      <Button variant="outline" className="w-full mt-4">
                        <Copy className="mr-2 h-4 w-4" />
                        Use Template
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* Create Plan Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Create Meal Plan</DialogTitle>
            <DialogDescription>
              Create a new meal plan for a client
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Plan Name</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g., Weight Loss Plan - John"
              />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Brief description of the meal plan..."
                rows={3}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Duration (days)</Label>
                <Select
                  value={formData.duration_days}
                  onValueChange={(v) => setFormData({ ...formData, duration_days: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="7">1 Week (7 days)</SelectItem>
                    <SelectItem value="14">2 Weeks (14 days)</SelectItem>
                    <SelectItem value="21">3 Weeks (21 days)</SelectItem>
                    <SelectItem value="30">1 Month (30 days)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Daily Calories Target</Label>
                <Input
                  type="number"
                  value={formData.calories_target}
                  onChange={(e) => setFormData({ ...formData, calories_target: e.target.value })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Select Client</Label>
              <Select
                value={formData.client_id}
                onValueChange={(v) => setFormData({ ...formData, client_id: v })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Choose a client..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Sarah Johnson</SelectItem>
                  <SelectItem value="2">Mike Chen</SelectItem>
                  <SelectItem value="3">Emma Wilson</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>Create Plan</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
