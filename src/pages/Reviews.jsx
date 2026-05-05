import { useState } from 'react'
import { Link } from 'react-router-dom'
import { motion } from 'framer-motion'
import { useTranslation } from 'react-i18next'
import { Star, MessageSquare, TrendingUp, Filter, ArrowUpDown } from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { StarRating, StarRatingDisplay } from '@/components/ui/star-rating'
import { HeroImage } from '@/components/ui/hero-slider'
import toast from 'react-hot-toast'

const sampleReviews = [
  {
    id: 1,
    user: { name: 'Sarah Johnson', avatar: null },
    rating: 5,
    title: 'Life-changing app!',
    content: 'GreenoFig has completely transformed my health journey. The AI coach is like having a personal nutritionist in my pocket. I\'ve lost 20 pounds in 3 months and feel amazing!',
    date: '2024-01-15',
  },
  {
    id: 2,
    user: { name: 'Michael Chen', avatar: null },
    rating: 5,
    title: 'Best fitness app I\'ve ever used',
    content: 'The workout recommendations are spot-on. I\'ve seen more progress in 3 months than in the past year. The integration with my Apple Watch is seamless.',
    date: '2024-01-12',
  },
  {
    id: 3,
    user: { name: 'Emily Rodriguez', avatar: null },
    rating: 4,
    title: 'Great features, minor improvements needed',
    content: 'Love the meal planning feature - it saves me hours every week. The AI coach is incredibly helpful. Would love to see more vegetarian recipe options.',
    date: '2024-01-10',
  },
  {
    id: 4,
    user: { name: 'Ahmed Al-Rashid', avatar: null },
    rating: 5,
    title: 'Finally an app with Arabic support!',
    content: 'As someone who prefers Arabic, I\'m thrilled that GreenoFig offers full Arabic language support with proper RTL layout. The nutritionist consultations have been invaluable.',
    date: '2024-01-08',
  },
  {
    id: 5,
    user: { name: 'Lisa Thompson', avatar: null },
    rating: 5,
    title: 'Worth every penny',
    content: 'I upgraded to Ultimate and it\'s been worth every cent. The video consultations with nutritionists helped me understand my dietary needs better.',
    date: '2024-01-05',
  },
  {
    id: 6,
    user: { name: 'James Wilson', avatar: null },
    rating: 4,
    title: 'Solid app for health tracking',
    content: 'The progress tracking is comprehensive and the visualizations are beautiful. The AI coach responses are helpful and personalized.',
    date: '2024-01-03',
  },
  {
    id: 7,
    user: { name: 'Fatima Hassan', avatar: null },
    rating: 5,
    title: 'Perfect for busy professionals',
    content: 'As a working mom, I barely have time for anything. GreenoFig\'s meal planning and quick workout suggestions fit perfectly into my schedule.',
    date: '2024-01-02',
  },
  {
    id: 8,
    user: { name: 'David Kim', avatar: null },
    rating: 3,
    title: 'Good but room for improvement',
    content: 'The app has great potential. The AI coach is helpful but sometimes gives generic responses. Looking forward to future updates.',
    date: '2024-01-01',
  },
]

export default function Reviews() {
  const { t } = useTranslation()
  const { user, userProfile } = useAuth()
  const [filterRating, setFilterRating] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    title: '',
    content: '',
  })
  const [submitting, setSubmitting] = useState(false)

  const filteredReviews = sampleReviews
    .filter((review) => filterRating === 'all' || review.rating === parseInt(filterRating))
    .sort((a, b) => {
      switch (sortBy) {
        case 'newest':
          return new Date(b.date) - new Date(a.date)
        case 'oldest':
          return new Date(a.date) - new Date(b.date)
        case 'highest':
          return b.rating - a.rating
        case 'lowest':
          return a.rating - b.rating
        default:
          return 0
      }
    })

  const averageRating = (sampleReviews.reduce((acc, r) => acc + r.rating, 0) / sampleReviews.length).toFixed(1)
  const fiveStarCount = sampleReviews.filter((r) => r.rating === 5).length

  const handleSubmitReview = async (e) => {
    e.preventDefault()
    if (reviewForm.rating === 0) {
      toast.error('Please select a rating')
      return
    }
    setSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    toast.success(t('reviews.writeReview.success'))
    setReviewForm({ rating: 0, title: '', content: '' })
    setSubmitting(false)
  }

  return (
    <div>
      {/* Hero with Background Image */}
      <section className="relative min-h-[60vh] flex items-center justify-center overflow-hidden">
        <HeroImage
          src="https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1920&q=80"
          alt="Customer reviews"
          overlayOpacity={0.75}
          className="absolute inset-0"
        >
          <div className="flex items-center justify-center min-h-[60vh] pt-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-white">
              <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
                <Badge className="mb-4" variant="secondary">
                  {t('reviews.badge')}
                </Badge>
                <h1 className="text-4xl sm:text-5xl font-bold mb-6">
                  {t('reviews.heroTitle')}
                  <span className="block gradient-text">{t('reviews.heroTitleHighlight')}</span>
                </h1>
                <p className="text-lg text-white/70 max-w-2xl mx-auto">
                  {t('reviews.heroSubtitle')}
                </p>
              </motion.div>
            </div>
          </div>
        </HeroImage>
      </section>

      {/* Stats */}
      <section className="py-8 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-3 gap-8 text-center">
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <MessageSquare className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{sampleReviews.length}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t('reviews.stats.totalReviews')}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <Star className="h-5 w-5 text-primary fill-primary" />
                <span className="text-2xl font-bold">{averageRating}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t('reviews.stats.averageRating')}</p>
            </div>
            <div>
              <div className="flex items-center justify-center gap-2 mb-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                <span className="text-2xl font-bold">{fiveStarCount}</span>
              </div>
              <p className="text-sm text-muted-foreground">{t('reviews.stats.fiveStarReviews')}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Filters */}
      <section className="py-6 border-b border-border">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
            <div className="flex items-center gap-4 w-full sm:w-auto">
              <div className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-muted-foreground" />
                <Select value={filterRating} onValueChange={setFilterRating}>
                  <SelectTrigger className="w-[140px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('reviews.filter.all')}</SelectItem>
                    <SelectItem value="5">{t('reviews.filter.5star')}</SelectItem>
                    <SelectItem value="4">{t('reviews.filter.4star')}</SelectItem>
                    <SelectItem value="3">{t('reviews.filter.3star')}</SelectItem>
                    <SelectItem value="2">{t('reviews.filter.2star')}</SelectItem>
                    <SelectItem value="1">{t('reviews.filter.1star')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-muted-foreground" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-[160px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="newest">{t('reviews.sort.newest')}</SelectItem>
                    <SelectItem value="oldest">{t('reviews.sort.oldest')}</SelectItem>
                    <SelectItem value="highest">{t('reviews.sort.highest')}</SelectItem>
                    <SelectItem value="lowest">{t('reviews.sort.lowest')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Reviews and Form */}
      <section className="py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid lg:grid-cols-3 gap-12">
            {/* Reviews List */}
            <div className="lg:col-span-2 space-y-6">
              {filteredReviews.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-muted-foreground">{t('reviews.noReviews')}</p>
                </div>
              ) : (
                filteredReviews.map((review, index) => (
                  <motion.div
                    key={review.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    <Card>
                      <CardContent className="p-6">
                        <div className="flex items-start gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={review.user.avatar} />
                            <AvatarFallback className="bg-primary text-primary-foreground">
                              {review.user.name
                                .split(' ')
                                .map((n) => n[0])
                                .join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 mb-2">
                              <div>
                                <h3 className="font-semibold">{review.user.name}</h3>
                                <StarRatingDisplay rating={review.rating} />
                              </div>
                              <span className="text-sm text-muted-foreground">
                                {new Date(review.date).toLocaleDateString()}
                              </span>
                            </div>
                            <h4 className="font-medium mb-2">{review.title}</h4>
                            <p className="text-muted-foreground">{review.content}</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))
              )}
            </div>

            {/* Write Review Form */}
            <div className="lg:col-span-1">
              <Card className="sticky top-24">
                <CardHeader>
                  <CardTitle>{t('reviews.writeReview.title')}</CardTitle>
                  <CardDescription>{t('reviews.writeReview.subtitle')}</CardDescription>
                </CardHeader>
                <CardContent>
                  {user ? (
                    <form onSubmit={handleSubmitReview} className="space-y-4">
                      <div className="space-y-2">
                        <Label>{t('reviews.writeReview.ratingLabel')}</Label>
                        <StarRating
                          rating={reviewForm.rating}
                          onRatingChange={(rating) =>
                            setReviewForm((prev) => ({ ...prev, rating }))
                          }
                          size="lg"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reviewTitle">{t('reviews.writeReview.titleLabel')}</Label>
                        <Input
                          id="reviewTitle"
                          value={reviewForm.title}
                          onChange={(e) =>
                            setReviewForm((prev) => ({ ...prev, title: e.target.value }))
                          }
                          placeholder={t('reviews.writeReview.titlePlaceholder')}
                          required
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="reviewContent">{t('reviews.writeReview.contentLabel')}</Label>
                        <Textarea
                          id="reviewContent"
                          value={reviewForm.content}
                          onChange={(e) =>
                            setReviewForm((prev) => ({ ...prev, content: e.target.value }))
                          }
                          placeholder={t('reviews.writeReview.contentPlaceholder')}
                          rows={4}
                          required
                        />
                      </div>
                      <Button type="submit" className="w-full" disabled={submitting}>
                        {submitting
                          ? t('reviews.writeReview.submitting')
                          : t('reviews.writeReview.submit')}
                      </Button>
                    </form>
                  ) : (
                    <div className="text-center py-6">
                      <p className="text-muted-foreground mb-4">
                        {t('reviews.writeReview.loginPrompt')}
                      </p>
                      <Button asChild>
                        <Link to="/login">{t('reviews.writeReview.signIn')}</Link>
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
