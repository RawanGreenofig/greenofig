import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  PenSquare, Eye, Trash2, Search, Plus, Calendar, Clock,
  Tag, FileText, Image, Save, X, TrendingUp, BarChart3,
  CheckCircle, AlertCircle, Edit2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { useAuth } from '@/contexts/AuthContext'
import toast from 'react-hot-toast'

// High-ranking SEO keywords for health & nutrition
const suggestedKeywords = {
  nutrition: ['healthy eating', 'nutrition tips', 'balanced diet', 'superfoods', 'clean eating', 'dietary guidelines', 'nutrient-dense foods', 'whole foods diet'],
  weight: ['weight loss', 'fat burning', 'calorie deficit', 'metabolism boost', 'body composition', 'healthy weight', 'weight management', 'sustainable weight loss'],
  fitness: ['workout routine', 'exercise plan', 'strength training', 'cardio workout', 'HIIT training', 'home workout', 'fitness tips', 'muscle building'],
  wellness: ['mental health', 'stress relief', 'sleep quality', 'mindfulness', 'self-care', 'holistic health', 'wellness tips', 'healthy lifestyle'],
  diet: ['meal planning', 'intermittent fasting', 'keto diet', 'plant-based diet', 'Mediterranean diet', 'low carb', 'high protein', 'macro counting']
}

const categories = ['Nutrition', 'Fitness', 'Wellness', 'Meal Planning', 'Technology', 'Lifestyle']

export default function NutritionistBlog() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [posts, setPosts] = useState([])
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [filterStatus, setFilterStatus] = useState('all')
  const [showEditor, setShowEditor] = useState(false)
  const [editingPost, setEditingPost] = useState(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [postToDelete, setPostToDelete] = useState(null)

  // Form state
  const [formData, setFormData] = useState({
    title: '',
    excerpt: '',
    content: '',
    category: '',
    image: '',
    keywords: [],
    status: 'draft'
  })
  const [newKeyword, setNewKeyword] = useState('')
  const [selectedKeywordCategory, setSelectedKeywordCategory] = useState('nutrition')

  useEffect(() => {
    fetchPosts()
  }, [])

  const fetchPosts = async () => {
    if (!isSupabaseConfigured()) {
      // Mock data for demonstration
      setPosts([
        {
          id: '1',
          title: '5 Essential Nutrients Most People Are Missing',
          excerpt: 'Learn about the critical nutrients that are commonly deficient in modern diets and how to get more of them.',
          category: 'Nutrition',
          status: 'published',
          views: 1250,
          date: '2024-01-20',
          keywords: ['nutrients', 'vitamins', 'mineral deficiency', 'healthy eating']
        },
        {
          id: '2',
          title: 'How to Create a Sustainable Meal Plan',
          excerpt: 'A step-by-step guide to creating meal plans that are nutritious, delicious, and easy to maintain.',
          category: 'Meal Planning',
          status: 'published',
          views: 890,
          date: '2024-01-15',
          keywords: ['meal planning', 'healthy recipes', 'nutrition planning']
        },
        {
          id: '3',
          title: 'The Truth About Protein Supplements',
          excerpt: 'An evidence-based look at when protein supplements are helpful and when whole foods are better.',
          category: 'Nutrition',
          status: 'draft',
          views: 0,
          date: '2024-01-22',
          keywords: ['protein', 'supplements', 'muscle building']
        }
      ])
      setLoading(false)
      return
    }

    try {
      const { data, error } = await supabase
        .from('blog_posts')
        .select('*')
        .eq('author_id', user?.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      setPosts(data || [])
    } catch (error) {
      console.error('Error fetching posts:', error)
      toast.error('Failed to load posts')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.title || !formData.content || !formData.category) {
      toast.error('Please fill in all required fields')
      return
    }

    if (formData.keywords.length < 3) {
      toast.error('Please add at least 3 keywords for SEO')
      return
    }

    try {
      if (!isSupabaseConfigured()) {
        // Mock save
        const newPost = {
          id: Date.now().toString(),
          ...formData,
          date: new Date().toISOString().split('T')[0],
          views: 0,
          author: user?.user_metadata?.full_name || 'Nutritionist'
        }

        if (editingPost) {
          setPosts(posts.map(p => p.id === editingPost.id ? { ...p, ...formData } : p))
          toast.success('Post updated successfully!')
        } else {
          setPosts([newPost, ...posts])
          toast.success('Post created successfully!')
        }

        resetForm()
        return
      }

      const postData = {
        ...formData,
        author_id: user?.id,
        author_name: user?.user_metadata?.full_name || 'Nutritionist',
        slug: formData.title.toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        updated_at: new Date().toISOString()
      }

      if (editingPost) {
        const { error } = await supabase
          .from('blog_posts')
          .update(postData)
          .eq('id', editingPost.id)

        if (error) throw error
        toast.success('Post updated successfully!')
      } else {
        const { error } = await supabase
          .from('blog_posts')
          .insert([{ ...postData, created_at: new Date().toISOString() }])

        if (error) throw error
        toast.success('Post created successfully!')
      }

      fetchPosts()
      resetForm()
    } catch (error) {
      console.error('Error saving post:', error)
      toast.error('Failed to save post')
    }
  }

  const handleDelete = async () => {
    if (!postToDelete) return

    try {
      if (!isSupabaseConfigured()) {
        setPosts(posts.filter(p => p.id !== postToDelete.id))
        toast.success('Post deleted successfully!')
        setShowDeleteDialog(false)
        setPostToDelete(null)
        return
      }

      const { error } = await supabase
        .from('blog_posts')
        .delete()
        .eq('id', postToDelete.id)

      if (error) throw error

      fetchPosts()
      toast.success('Post deleted successfully!')
    } catch (error) {
      console.error('Error deleting post:', error)
      toast.error('Failed to delete post')
    } finally {
      setShowDeleteDialog(false)
      setPostToDelete(null)
    }
  }

  const resetForm = () => {
    setFormData({
      title: '',
      excerpt: '',
      content: '',
      category: '',
      image: '',
      keywords: [],
      status: 'draft'
    })
    setEditingPost(null)
    setShowEditor(false)
  }

  const addKeyword = (keyword) => {
    const trimmedKeyword = keyword.trim().toLowerCase()
    if (trimmedKeyword && !formData.keywords.includes(trimmedKeyword)) {
      setFormData({ ...formData, keywords: [...formData.keywords, trimmedKeyword] })
    }
    setNewKeyword('')
  }

  const removeKeyword = (keyword) => {
    setFormData({ ...formData, keywords: formData.keywords.filter(k => k !== keyword) })
  }

  const openEditor = (post = null) => {
    if (post) {
      setEditingPost(post)
      setFormData({
        title: post.title,
        excerpt: post.excerpt,
        content: post.content || '',
        category: post.category,
        image: post.image || '',
        keywords: post.keywords || [],
        status: post.status
      })
    } else {
      resetForm()
    }
    setShowEditor(true)
  }

  const filteredPosts = posts.filter(post => {
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesStatus = filterStatus === 'all' || post.status === filterStatus
    return matchesSearch && matchesStatus
  })

  const stats = {
    total: posts.length,
    published: posts.filter(p => p.status === 'published').length,
    drafts: posts.filter(p => p.status === 'draft').length,
    totalViews: posts.reduce((sum, p) => sum + (p.views || 0), 0)
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
          <h1 className="text-2xl font-bold">Blog Management</h1>
          <p className="text-muted-foreground">Create and manage your health & nutrition articles</p>
        </div>
        <Button onClick={() => openEditor()} className="gap-2">
          <Plus className="h-4 w-4" />
          New Article
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Articles</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/10">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.published}</p>
                <p className="text-sm text-muted-foreground">Published</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-yellow-500/10">
                <AlertCircle className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.drafts}</p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-purple-500/10">
                <Eye className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.totalViews.toLocaleString()}</p>
                <p className="text-sm text-muted-foreground">Total Views</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-full sm:w-[180px]">
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

      {/* Posts List */}
      <div className="space-y-4">
        {filteredPosts.map((post, index) => (
          <motion.div
            key={post.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
          >
            <Card className="hover:shadow-md transition-shadow">
              <CardContent className="p-4">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <Badge variant={post.status === 'published' ? 'default' : 'secondary'}>
                        {post.status}
                      </Badge>
                      <Badge variant="outline">{post.category}</Badge>
                    </div>
                    <h3 className="font-semibold text-lg mb-1">{post.title}</h3>
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{post.excerpt}</p>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {post.keywords?.slice(0, 5).map((keyword, i) => (
                        <span key={i} className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                          {keyword}
                        </span>
                      ))}
                      {post.keywords?.length > 5 && (
                        <span className="text-xs px-2 py-0.5 bg-muted rounded-full text-muted-foreground">
                          +{post.keywords.length - 5} more
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {post.date}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {post.views?.toLocaleString() || 0} views
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" onClick={() => openEditor(post)}>
                      <Edit2 className="h-4 w-4 mr-1" />
                      Edit
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        setPostToDelete(post)
                        setShowDeleteDialog(true)
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        ))}

        {filteredPosts.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
              <h3 className="font-semibold mb-2">No articles found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery || filterStatus !== 'all'
                  ? 'Try adjusting your search or filter'
                  : 'Start writing your first article to share your expertise'}
              </p>
              <Button onClick={() => openEditor()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Article
              </Button>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Editor Dialog */}
      <Dialog open={showEditor} onOpenChange={setShowEditor}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingPost ? 'Edit Article' : 'Create New Article'}</DialogTitle>
            <DialogDescription>
              Write SEO-optimized content to reach more readers
            </DialogDescription>
          </DialogHeader>

          <Tabs defaultValue="content" className="mt-4">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="content">Content</TabsTrigger>
              <TabsTrigger value="seo">SEO & Keywords</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="content" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title *</Label>
                <Input
                  id="title"
                  placeholder="Enter an engaging title..."
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Tip: Include your main keyword in the title for better SEO
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="excerpt">Excerpt / Meta Description *</Label>
                <Textarea
                  id="excerpt"
                  placeholder="Write a compelling summary (150-160 characters ideal for SEO)..."
                  value={formData.excerpt}
                  onChange={(e) => setFormData({ ...formData, excerpt: e.target.value })}
                  rows={3}
                />
                <p className="text-xs text-muted-foreground">
                  {formData.excerpt.length}/160 characters
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="content">Content *</Label>
                <Textarea
                  id="content"
                  placeholder="Write your article content... (Supports Markdown)"
                  value={formData.content}
                  onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                  rows={15}
                  className="font-mono text-sm"
                />
                <p className="text-xs text-muted-foreground">
                  Use ## for headings, **text** for bold, - for bullet points
                </p>
              </div>
            </TabsContent>

            <TabsContent value="seo" className="space-y-4 mt-4">
              <Card className="bg-muted/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base flex items-center gap-2">
                    <TrendingUp className="h-4 w-4 text-primary" />
                    SEO Keywords
                  </CardTitle>
                  <CardDescription>
                    Add relevant keywords to improve search rankings. Aim for 5-10 keywords.
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  {/* Current Keywords */}
                  <div>
                    <Label className="text-sm mb-2 block">
                      Your Keywords ({formData.keywords.length})
                    </Label>
                    <div className="flex flex-wrap gap-2 min-h-[40px] p-2 border rounded-lg bg-background">
                      {formData.keywords.map((keyword, i) => (
                        <Badge key={i} variant="secondary" className="gap-1">
                          {keyword}
                          <button
                            onClick={() => removeKeyword(keyword)}
                            className="ml-1 hover:text-destructive"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </Badge>
                      ))}
                      {formData.keywords.length === 0 && (
                        <span className="text-sm text-muted-foreground">No keywords added yet</span>
                      )}
                    </div>
                  </div>

                  {/* Add Custom Keyword */}
                  <div className="flex gap-2">
                    <Input
                      placeholder="Add custom keyword..."
                      value={newKeyword}
                      onChange={(e) => setNewKeyword(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addKeyword(newKeyword))}
                    />
                    <Button onClick={() => addKeyword(newKeyword)} disabled={!newKeyword.trim()}>
                      Add
                    </Button>
                  </div>

                  {/* Suggested Keywords */}
                  <div>
                    <Label className="text-sm mb-2 block">High-Ranking Suggested Keywords</Label>
                    <Select value={selectedKeywordCategory} onValueChange={setSelectedKeywordCategory}>
                      <SelectTrigger className="w-full mb-3">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="nutrition">Nutrition Keywords</SelectItem>
                        <SelectItem value="weight">Weight Management Keywords</SelectItem>
                        <SelectItem value="fitness">Fitness Keywords</SelectItem>
                        <SelectItem value="wellness">Wellness Keywords</SelectItem>
                        <SelectItem value="diet">Diet & Meal Planning Keywords</SelectItem>
                      </SelectContent>
                    </Select>
                    <div className="flex flex-wrap gap-2">
                      {suggestedKeywords[selectedKeywordCategory].map((keyword, i) => (
                        <Badge
                          key={i}
                          variant="outline"
                          className={`cursor-pointer transition-colors ${
                            formData.keywords.includes(keyword)
                              ? 'bg-primary/10 border-primary'
                              : 'hover:bg-muted'
                          }`}
                          onClick={() => {
                            if (formData.keywords.includes(keyword)) {
                              removeKeyword(keyword)
                            } else {
                              addKeyword(keyword)
                            }
                          }}
                        >
                          {formData.keywords.includes(keyword) ? '✓ ' : '+ '}
                          {keyword}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* SEO Score */}
                  <Card className="border-primary/20">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">SEO Score</span>
                        <span className={`font-bold ${
                          formData.keywords.length >= 5 ? 'text-green-500' :
                          formData.keywords.length >= 3 ? 'text-yellow-500' : 'text-red-500'
                        }`}>
                          {formData.keywords.length >= 5 ? 'Good' :
                           formData.keywords.length >= 3 ? 'Fair' : 'Needs Work'}
                        </span>
                      </div>
                      <div className="space-y-1 text-sm text-muted-foreground">
                        <p className="flex items-center gap-2">
                          {formData.title ? <CheckCircle className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-red-500" />}
                          Title is set
                        </p>
                        <p className="flex items-center gap-2">
                          {formData.excerpt.length >= 120 && formData.excerpt.length <= 160 ? <CheckCircle className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-yellow-500" />}
                          Meta description optimal length (120-160 chars)
                        </p>
                        <p className="flex items-center gap-2">
                          {formData.keywords.length >= 5 ? <CheckCircle className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-yellow-500" />}
                          At least 5 keywords ({formData.keywords.length}/5)
                        </p>
                        <p className="flex items-center gap-2">
                          {formData.content.length >= 1000 ? <CheckCircle className="h-3 w-3 text-green-500" /> : <AlertCircle className="h-3 w-3 text-yellow-500" />}
                          Content length (1000+ chars recommended)
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="settings" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label htmlFor="category">Category *</Label>
                <Select
                  value={formData.category}
                  onValueChange={(value) => setFormData({ ...formData, category: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a category" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.map((cat) => (
                      <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="image">Featured Image URL</Label>
                <Input
                  id="image"
                  placeholder="https://images.unsplash.com/..."
                  value={formData.image}
                  onChange={(e) => setFormData({ ...formData, image: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Use high-quality images from Unsplash or your own uploads
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Publication Status</Label>
                <Select
                  value={formData.status}
                  onValueChange={(value) => setFormData({ ...formData, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="draft">Draft - Save for later</SelectItem>
                    <SelectItem value="published">Published - Make visible to readers</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>
          </Tabs>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={resetForm}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} className="gap-2">
              <Save className="h-4 w-4" />
              {editingPost ? 'Update Article' : 'Save Article'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Article</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete "{postToDelete?.title}"? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
