import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Calendar, Clock, ArrowRight, Search, User } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { HeroImage } from '@/components/ui/hero-slider'
import { blogPosts, getFeaturedPosts } from '@/data/blogPosts'

export default function Blog() {
  const { t } = useTranslation()
  const [selectedCategory, setSelectedCategory] = useState('all')
  const [searchQuery, setSearchQuery] = useState('')

  const categories = [
    { key: 'all', label: t('blog.categories.all') },
    { key: 'nutrition', label: t('blog.categories.nutrition') },
    { key: 'fitness', label: t('blog.categories.fitness') },
    { key: 'wellness', label: t('blog.categories.wellness') },
    { key: 'mealPlanning', label: t('blog.categories.mealPlanning') },
    { key: 'technology', label: t('blog.categories.technology') },
  ]

  const categoryMap = {
    all: 'All',
    nutrition: 'Nutrition',
    fitness: 'Fitness',
    wellness: 'Wellness',
    mealPlanning: 'Meal Planning',
    technology: 'Technology',
  }

  const filteredPosts = blogPosts.filter(post => {
    const matchesCategory = selectedCategory === 'all' || post.category === categoryMap[selectedCategory]
    const matchesSearch = post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          post.excerpt.toLowerCase().includes(searchQuery.toLowerCase())
    return matchesCategory && matchesSearch
  })

  return (
    <div>
      {/* Hero with Background Image */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        <HeroImage
          src="https://images.unsplash.com/photo-1505576399279-565b52d4ac71?w=1920&q=80"
          alt="Health and wellness blog"
          overlayOpacity={0.75}
          className="absolute inset-0"
        >
          <div className="flex items-center justify-center min-h-[60vh] pt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <Badge className="mb-4" variant="secondary">{t('blog.badge')}</Badge>
                <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                  {t('blog.heroTitle')}
                  <span className="block gradient-text">{t('blog.heroTitleHighlight')}</span>
                </h1>
                <p className="text-lg text-white/70 max-w-2xl mx-auto">
                  {t('blog.heroSubtitle')}
                </p>
              </motion.div>
            </div>
          </div>
        </HeroImage>
      </section>

      {/* Filters */}
      <section className="py-8 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="flex flex-wrap gap-2">
              {categories.map((category) => (
                <Button
                  key={category.key}
                  variant={selectedCategory === category.key ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setSelectedCategory(category.key)}
                >
                  {category.label}
                </Button>
              ))}
            </div>
            <div className="relative w-full md:w-64">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={t('blog.searchPlaceholder')}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="ps-10"
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
              <p className="text-muted-foreground">{t('blog.noResults')}</p>
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
                  <Link to={`/blog/${post.slug || post.id}`} className="block h-full">
                    <Card className="h-full overflow-hidden card-hover cursor-pointer group">
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={post.image}
                          alt={post.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <CardContent className="p-6">
                        <Badge variant="secondary" className="mb-3">
                          {post.category}
                        </Badge>
                        <h3 className="text-xl font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
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
                        <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
                          <User className="h-3 w-3" />
                          {post.author}
                        </div>
                        <span className="inline-flex items-center text-primary font-medium mt-3 group-hover:gap-2 transition-all">
                          {t('blog.readMore')}
                          <ArrowRight className="ms-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Newsletter */}
      <section className="py-24 bg-card/50">
        <div className="max-w-xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-2xl font-bold mb-4">{t('blog.newsletter.title')}</h2>
          <p className="text-muted-foreground mb-6">
            {t('blog.newsletter.subtitle')}
          </p>
          <div className="flex gap-2">
            <Input placeholder={t('blog.newsletter.placeholder')} type="email" />
            <Button>{t('blog.newsletter.button')}</Button>
          </div>
        </div>
      </section>
    </div>
  )
}
