import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  FileText, Plus, Search, Edit, Trash2, Eye, MoreVertical,
  Image, Calendar, Tag, CheckCircle, XCircle, Clock
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
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
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import toast from 'react-hot-toast'

export default function AdminContent() {
  const { t } = useTranslation()
  const [activeTab, setActiveTab] = useState('blog')
  const [blogPosts, setBlogPosts] = useState([])
  const [recipes, setRecipes] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    content: '',
    excerpt: '',
    category: '',
    status: 'draft',
    featured_image: ''
  })

  useEffect(() => {
    fetchContent()
  }, [activeTab])

  const fetchContent = async () => {
    setLoading(true)

    if (!isSupabaseConfigured()) {
      // Mock data
      setBlogPosts([
        { id: '1', title: '10 Tips for Healthy Eating', excerpt: 'Learn the fundamentals of nutrition...', category: 'Nutrition', status: 'published', author: 'Admin', created_at: '2024-01-20', views: 1250 },
        { id: '2', title: 'The Science of Weight Loss', excerpt: 'Understanding how your body burns fat...', category: 'Weight Loss', status: 'published', author: 'Admin', created_at: '2024-01-18', views: 890 },
        { id: '3', title: 'Building Muscle on a Plant-Based Diet', excerpt: 'Complete guide to vegan fitness...', category: 'Fitness', status: 'draft', author: 'Admin', created_at: '2024-01-15', views: 0 },
        { id: '4', title: 'Mindful Eating Practices', excerpt: 'How to develop a healthy relationship with food...', category: 'Wellness', status: 'published', author: 'Admin', created_at: '2024-01-12', views: 567 },
      ])
      setRecipes([
        { id: '1', title: 'Mediterranean Quinoa Bowl', excerpt: 'A protein-packed healthy bowl...', category: 'Lunch', status: 'published', prep_time: '20 min', calories: 450, created_at: '2024-01-19' },
        { id: '2', title: 'Green Smoothie Power', excerpt: 'Start your day with this nutritious smoothie...', category: 'Breakfast', status: 'published', prep_time: '5 min', calories: 250, created_at: '2024-01-17' },
        { id: '3', title: 'Grilled Salmon with Veggies', excerpt: 'Omega-3 rich dinner option...', category: 'Dinner', status: 'draft', prep_time: '30 min', calories: 520, created_at: '2024-01-14' },
      ])
      setLoading(false)
      return
    }

    try {
      if (activeTab === 'blog') {
        const { data, error } = await supabase
          .from('blog_posts')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setBlogPosts(data || [])
      } else {
        const { data, error } = await supabase
          .from('recipes')
          .select('*')
          .order('created_at', { ascending: false })

        if (error) throw error
        setRecipes(data || [])
      }
    } catch (error) {
      console.error('Error fetching content:', error)
      toast.error('Failed to fetch content')
    } finally {
      setLoading(false)
    }
  }

  const handleCreate = async () => {
    if (!formData.title) {
      toast.error('Title is required')
      return
    }

    if (!isSupabaseConfigured()) {
      const newItem = {
        id: Date.now().toString(),
        ...formData,
        author: 'Admin',
        created_at: new Date().toISOString(),
        views: 0
      }

      if (activeTab === 'blog') {
        setBlogPosts([newItem, ...blogPosts])
      } else {
        setRecipes([newItem, ...recipes])
      }

      toast.success('Content created successfully')
      setCreateDialogOpen(false)
      resetForm()
      return
    }

    try {
      const table = activeTab === 'blog' ? 'blog_posts' : 'recipes'
      const { error } = await supabase
        .from(table)
        .insert([formData])

      if (error) throw error

      toast.success('Content created successfully')
      setCreateDialogOpen(false)
      resetForm()
      fetchContent()
    } catch (error) {
      console.error('Error creating content:', error)
      toast.error('Failed to create content')
    }
  }

  const handleDelete = async (item) => {
    if (!isSupabaseConfigured()) {
      if (activeTab === 'blog') {
        setBlogPosts(blogPosts.filter(p => p.id !== item.id))
      } else {
        setRecipes(recipes.filter(r => r.id !== item.id))
      }
      toast.success('Content deleted')
      return
    }

    try {
      const table = activeTab === 'blog' ? 'blog_posts' : 'recipes'
      const { error } = await supabase
        .from(table)
        .delete()
        .eq('id', item.id)

      if (error) throw error

      toast.success('Content deleted')
      fetchContent()
    } catch (error) {
      console.error('Error deleting content:', error)
      toast.error('Failed to delete content')
    }
  }

  const toggleStatus = async (item) => {
    const newStatus = item.status === 'published' ? 'draft' : 'published'

    if (!isSupabaseConfigured()) {
      if (activeTab === 'blog') {
        setBlogPosts(blogPosts.map(p => p.id === item.id ? { ...p, status: newStatus } : p))
      } else {
        setRecipes(recipes.map(r => r.id === item.id ? { ...r, status: newStatus } : r))
      }
      toast.success(`Content ${newStatus}`)
      return
    }

    try {
      const table = activeTab === 'blog' ? 'blog_posts' : 'recipes'
      const { error } = await supabase
        .from(table)
        .update({ status: newStatus })
        .eq('id', item.id)

      if (error) throw error

      toast.success(`Content ${newStatus}`)
      fetchContent()
    } catch (error) {
      console.error('Error updating status:', error)
      toast.error('Failed to update status')
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      content: '',
      excerpt: '',
      category: '',
      status: 'draft',
      featured_image: ''
    })
    setEditingItem(null)
  }

  const filteredContent = (activeTab === 'blog' ? blogPosts : recipes).filter(item => {
    const matchesSearch = item.title?.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = statusFilter === 'all' || item.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusBadge = (status) => {
    switch (status) {
      case 'published':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Published</Badge>
      case 'draft':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" />Draft</Badge>
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
          <h1 className="text-2xl font-bold">Content Management</h1>
          <p className="text-muted-foreground">Manage blog posts, recipes, and resources</p>
        </div>
        <Button onClick={() => setCreateDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          Create New
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="blog">
            <FileText className="mr-2 h-4 w-4" />
            Blog Posts ({blogPosts.length})
          </TabsTrigger>
          <TabsTrigger value="recipes">
            <Image className="mr-2 h-4 w-4" />
            Recipes ({recipes.length})
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          {/* Filters */}
          <Card className="mb-4">
            <CardContent className="p-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search content..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* Content List */}
          <Card>
            <CardContent className="p-0">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-muted/50">
                    <tr>
                      <th className="text-left p-4 font-medium">Title</th>
                      <th className="text-left p-4 font-medium">Category</th>
                      <th className="text-left p-4 font-medium">Status</th>
                      <th className="text-left p-4 font-medium">
                        {activeTab === 'blog' ? 'Views' : 'Prep Time'}
                      </th>
                      <th className="text-left p-4 font-medium">Date</th>
                      <th className="text-right p-4 font-medium">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredContent.map((item, index) => (
                      <motion.tr
                        key={item.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: index * 0.05 }}
                        className="border-t border-border hover:bg-muted/30"
                      >
                        <td className="p-4">
                          <div>
                            <p className="font-medium">{item.title}</p>
                            <p className="text-sm text-muted-foreground line-clamp-1">
                              {item.excerpt}
                            </p>
                          </div>
                        </td>
                        <td className="p-4">
                          <Badge variant="outline">
                            <Tag className="w-3 h-3 mr-1" />
                            {item.category || 'Uncategorized'}
                          </Badge>
                        </td>
                        <td className="p-4">{getStatusBadge(item.status)}</td>
                        <td className="p-4 text-muted-foreground">
                          {activeTab === 'blog'
                            ? `${item.views?.toLocaleString() || 0} views`
                            : item.prep_time
                          }
                        </td>
                        <td className="p-4 text-muted-foreground">
                          {new Date(item.created_at).toLocaleDateString()}
                        </td>
                        <td className="p-4 text-right">
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon">
                                <MoreVertical className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem>
                                <Eye className="mr-2 h-4 w-4" />
                                Preview
                              </DropdownMenuItem>
                              <DropdownMenuItem>
                                <Edit className="mr-2 h-4 w-4" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => toggleStatus(item)}>
                                {item.status === 'published' ? (
                                  <><XCircle className="mr-2 h-4 w-4" />Unpublish</>
                                ) : (
                                  <><CheckCircle className="mr-2 h-4 w-4" />Publish</>
                                )}
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleDelete(item)}
                                className="text-destructive"
                              >
                                <Trash2 className="mr-2 h-4 w-4" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
                {filteredContent.length === 0 && (
                  <div className="text-center py-12 text-muted-foreground">
                    No content found
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </Tabs>

      {/* Create/Edit Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingItem ? 'Edit' : 'Create'} {activeTab === 'blog' ? 'Blog Post' : 'Recipe'}
            </DialogTitle>
            <DialogDescription>
              Fill in the details below
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
            <div className="space-y-2">
              <Label>Title</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Enter title..."
              />
            </div>
            <div className="space-y-2">
              <Label>Excerpt</Label>
              <Textarea
                value={formData.excerpt}
                onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                placeholder="Brief description..."
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Full content..."
                rows={6}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Category</Label>
                <Input
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  placeholder="e.g., Nutrition, Fitness"
                />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(v) => setFormData({ ...formData, status: v })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Featured Image URL</Label>
              <Input
                value={formData.featured_image}
                onChange={(e) => setFormData({ ...formData, featured_image: e.target.value })}
                placeholder="https://..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setCreateDialogOpen(false); resetForm() }}>
              Cancel
            </Button>
            <Button onClick={handleCreate}>
              {editingItem ? 'Save Changes' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
