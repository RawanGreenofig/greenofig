import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Calendar, Clock, ArrowRight, Search } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'

const blogPosts = [
  {
    id: 1,
    title: '10 Science-Backed Ways to Boost Your Metabolism',
    excerpt: 'Discover proven strategies to enhance your metabolic rate and support your weight management goals.',
    category: 'Nutrition',
    date: '2024-01-15',
    readTime: '8 min read',
    image: 'https://images.unsplash.com/photo-1490645935967-10de6ba17061?w=800',
  },
  {
    id: 2,
    title: 'The Complete Guide to Meal Prepping',
    excerpt: 'Learn how to plan, prepare, and store healthy meals for the entire week in just a few hours.',
    category: 'Meal Planning',
    date: '2024-01-12',
    readTime: '12 min read',
    image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=800',
  },
  {
    id: 3,
    title: 'Building a Sustainable Workout Routine',
    excerpt: 'Create an exercise plan you can actually stick to, no matter how busy your schedule gets.',
    category: 'Fitness',
    date: '2024-01-10',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=800',
  },
  {
    id: 4,
    title: 'Understanding Macronutrients: A Beginner\'s Guide',
    excerpt: 'Everything you need to know about proteins, carbs, and fats for optimal health.',
    category: 'Nutrition',
    date: '2024-01-08',
    readTime: '10 min read',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=800',
  },
  {
    id: 5,
    title: 'The Benefits of AI in Personal Health Management',
    excerpt: 'How artificial intelligence is revolutionizing the way we approach fitness and nutrition.',
    category: 'Technology',
    date: '2024-01-05',
    readTime: '7 min read',
    image: 'https://images.unsplash.com/photo-1550751827-4bd374c3f58b?w=800',
  },
  {
    id: 6,
    title: 'Sleep and Weight Loss: The Hidden Connection',
    excerpt: 'Discover why quality sleep is essential for achieving and maintaining a healthy weight.',
    category: 'Wellness',
    date: '2024-01-03',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1541781774459-bb2af2f05b55?w=800',
  },
]

const categories = ['All', 'Nutrition', 'Fitness', 'Wellness', 'Meal Planning', 'Technology']

export default function Blog() {
  const [selectedCategory, setSelectedCategory] = useState('All')
  const [searchQuery, setSearchQuery] = useState('')

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === 'All' || post.category === selectedCategory
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div className="pt-16">
      {/* Hero */}
      <section className="py-24 bg-gradient-to-b from-primary/10 to-background">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Badge className="mb-4" variant="secondary">Blog</Badge>
            <h1 className="text-4xl sm:text-5xl font-bold mb-6">
              Health & Wellness
              <span className="block gradient-text">Insights</span>
            </h1>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Expert tips, guides, and insights to help you on your wellness journey.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-8 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                >
                  {category}
                </Button>
              ))}
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search articles..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Posts */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {filteredPosts.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No articles found matching your criteria.</p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {filteredPosts.map((post, index) => (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.1 }}
                >
                  <Card className="h-full overflow-hidden card-hover">
                    <div className="aspect-video overflow-hidden">
                      <img
                        src={post.image}
                        alt={post.title}
                        className="w-full h-full object-cover transition-transform duration-300 hover:scale-105"
                      />
                    </div>
                    <CardContent className="p-6">
                      <Badge variant="secondary" className="mb-3">
                        {post.category}
                      </Badge>
                      <h3 className="text-xl font-semibold mb-2 line-clamp-2">
                        {post.title}
                      </h3>
                      <p className="text-muted-foreground text-sm mb-4 line-clamp-2">
                        {post.excerpt}
                      </p>
                      <div className="flex items-center justify-between text-sm text-muted-foreground">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-4 w-4" />
                            {new Date(post.date).toLocaleDateString()}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {post.readTime}
                          </span>
                        </div>
                      </div>
                      <Button variant="link" className="p-0 mt-4" asChild>
                        <Link to={`/blog/${post.id}`}>
                          Read More
                          <ArrowRight className="ml-1 h-4 w-4" />
                        </Link>
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-24 bg-card/50">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-4">Stay Updated</h2>
          <p className="text-muted-foreground mb-6">
            Subscribe to our newsletter for the latest health tips and insights.
          </p>
          <div className="flex gap-2">
            <Input placeholder="Enter your email" type="email" />
            <Button>Subscribe</Button>
          </div>
        </div>
      </section>
    </div>
  )
}
