import { useState, useEffect, useRef } from 'react'
import { useParams, Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'
import {
  Calendar, Clock, ArrowLeft, ArrowRight, Share2, Bookmark,
  Facebook, Twitter, Linkedin, Link2, ChevronRight, User, List,
  ChevronUp, Tag
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { getBlogPost, getRelatedPosts, blogPosts } from '@/data/blogPosts'
import toast from 'react-hot-toast'

export default function BlogPost() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { t } = useTranslation()
  const [post, setPost] = useState(null)
  const [relatedPosts, setRelatedPosts] = useState([])
  const [activeSection, setActiveSection] = useState('')
  const [showToc, setShowToc] = useState(true)
  const [readingProgress, setReadingProgress] = useState(0)
  const [showBackToTop, setShowBackToTop] = useState(false)
  const articleRef = useRef(null)

  useEffect(() => {
    const foundPost = getBlogPost(id)
    if (foundPost) {
      setPost(foundPost)
      setRelatedPosts(getRelatedPosts(foundPost.id, foundPost.category))
    } else {
      navigate('/blog')
    }
  }, [id, navigate])

  useEffect(() => {
    const handleScroll = () => {
      // Calculate reading progress
      const article = articleRef.current
      if (article) {
        const articleTop = article.offsetTop
        const articleHeight = article.offsetHeight
        const windowHeight = window.innerHeight
        const scrollY = window.scrollY

        const start = articleTop - windowHeight
        const end = articleTop + articleHeight - windowHeight
        const progress = Math.min(Math.max((scrollY - start) / (end - start) * 100, 0), 100)
        setReadingProgress(progress)
      }

      // Show/hide back to top button
      setShowBackToTop(window.scrollY > 500)

      // Track active section
      if (!post?.tableOfContents) return

      const sections = post.tableOfContents.map(item => {
        const element = document.getElementById(item.id)
        return {
          id: item.id,
          element,
          top: element ? element.getBoundingClientRect().top : 9999
        }
      }).filter(s => s.element)

      // Find the section that is currently in view (closest to top but past the threshold)
      const threshold = 200 // pixels from top
      let activeId = sections[0]?.id || ''

      for (let i = 0; i < sections.length; i++) {
        if (sections[i].top <= threshold) {
          activeId = sections[i].id
        } else {
          break
        }
      }

      if (activeId && activeId !== activeSection) {
        setActiveSection(activeId)
      }
    }

    window.addEventListener('scroll', handleScroll, { passive: true })

    // Set initial active section after a short delay to let DOM render
    const timer = setTimeout(() => {
      handleScroll()
      // If no section is active, set the first one
      if (!activeSection && post?.tableOfContents?.length > 0) {
        setActiveSection(post.tableOfContents[0].id)
      }
    }, 100)

    return () => {
      window.removeEventListener('scroll', handleScroll)
      clearTimeout(timer)
    }
  }, [post, activeSection])

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const scrollToSection = (sectionId) => {
    const element = document.getElementById(sectionId)
    if (element) {
      // Set active section immediately for visual feedback
      setActiveSection(sectionId)

      // Scroll to element with offset for fixed header
      const yOffset = -120
      const y = element.getBoundingClientRect().top + window.scrollY + yOffset
      window.scrollTo({ top: y, behavior: 'smooth' })
    } else {
      console.log('Section not found:', sectionId)
    }
  }

  const sharePost = (platform) => {
    const url = window.location.href
    const title = post?.title || ''

    const shareUrls = {
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`,
      twitter: `https://twitter.com/intent/tweet?url=${encodeURIComponent(url)}&text=${encodeURIComponent(title)}`,
      linkedin: `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(url)}&title=${encodeURIComponent(title)}`,
    }

    if (platform === 'copy') {
      navigator.clipboard.writeText(url)
      toast.success('Link copied to clipboard!')
    } else {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400')
    }
  }

  // Helper to extract text from React children (handles nested elements)
  const extractText = (children) => {
    if (!children) return ''
    if (typeof children === 'string') return children
    if (Array.isArray(children)) {
      return children.map(child => extractText(child)).join('')
    }
    if (children.props && children.props.children) {
      return extractText(children.props.children)
    }
    return String(children)
  }

  // Custom renderer for markdown headings to add IDs
  const HeadingRenderer = ({ level, children, node }) => {
    // Extract plain text from children
    const text = extractText(children)

    // Generate ID that matches tableOfContents format
    const id = text.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-+|-+$/g, '')
      .trim()

    const Tag = `h${level}`
    const styles = {
      2: 'text-2xl font-bold mt-8 mb-4 scroll-mt-28',
      3: 'text-xl font-semibold mt-6 mb-3 scroll-mt-28',
      4: 'text-lg font-medium mt-4 mb-2 scroll-mt-28'
    }

    return (
      <Tag id={id} className={styles[level] || ''}>
        {children}
      </Tag>
    )
  }

  if (!post) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  // Get current section index for progress display
  const currentSectionIndex = post?.tableOfContents?.findIndex(item => item.id === activeSection) ?? -1
  const totalSections = post?.tableOfContents?.length ?? 0

  return (
    <div className="min-h-screen pt-16">
      {/* Reading Progress Bar */}
      <div className="fixed top-16 left-0 right-0 z-50 h-1 bg-muted">
        <motion.div
          className="h-full bg-gradient-to-r from-primary to-lime-400"
          style={{ width: `${readingProgress}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${readingProgress}%` }}
          transition={{ duration: 0.1 }}
        />
      </div>

      {/* Back to Top Button */}
      <AnimatePresence>
        {showBackToTop && (
          <motion.button
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            onClick={scrollToTop}
            className="fixed bottom-8 right-8 z-50 p-3 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-colors"
          >
            <ChevronUp className="h-6 w-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Hero Section */}
      <section className="relative h-[50vh] min-h-[400px] flex items-end">
        <div className="absolute inset-0">
          <img
            src={post.image}
            alt={post.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/50 to-black/20" />
        </div>
        <div className="relative z-10 max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pb-12 w-full">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <Button variant="ghost" className="text-white mb-4" asChild>
              <Link to="/blog">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Blog
              </Link>
            </Button>
            <Badge className="mb-4">{post.category}</Badge>
            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-white mb-4">
              {post.title}
            </h1>
            <div className="flex flex-wrap items-center gap-4 text-white/80">
              <div className="flex items-center gap-2">
                <Avatar className="h-10 w-10 border-2 border-white/20">
                  <AvatarFallback className="bg-primary text-primary-foreground">
                    {post.author?.charAt(0)}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <p className="font-medium text-white">{post.author}</p>
                  <p className="text-sm text-white/60">{post.authorRole}</p>
                </div>
              </div>
              <Separator orientation="vertical" className="h-8 bg-white/20" />
              <span className="flex items-center gap-1">
                <Calendar className="h-4 w-4" />
                {new Date(post.date).toLocaleDateString('en', {
                  year: 'numeric',
                  month: 'long',
                  day: 'numeric'
                })}
              </span>
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                {post.readTime}
              </span>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Content Section */}
      <section className="py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="relative flex flex-col lg:flex-row gap-8">
            {/* Table of Contents - Sidebar */}
            <aside className="lg:w-80 flex-shrink-0">
              <div className="lg:sticky lg:top-24 space-y-4">
                <Card className="overflow-hidden border-2">
                  <div
                    className="p-4 bg-gradient-to-r from-primary/10 to-lime-400/10 flex items-center justify-between cursor-pointer lg:cursor-default"
                    onClick={() => setShowToc(!showToc)}
                  >
                    <div className="flex items-center gap-2 font-semibold">
                      <List className="h-5 w-5 text-primary" />
                      Table of Contents
                    </div>
                    <div className="flex items-center gap-2">
                      {currentSectionIndex >= 0 && (
                        <span className="text-xs text-muted-foreground hidden lg:block">
                          {currentSectionIndex + 1}/{totalSections}
                        </span>
                      )}
                      <ChevronRight className={`h-5 w-5 lg:hidden transition-transform ${showToc ? 'rotate-90' : ''}`} />
                    </div>
                  </div>
                  <motion.div
                    initial={false}
                    animate={{ height: showToc ? 'auto' : 0 }}
                    className="overflow-hidden lg:!h-auto"
                  >
                    <CardContent className="p-4 pt-2">
                      {/* Currently Reading Indicator */}
                      {activeSection && currentSectionIndex >= 0 && (
                        <div className="mb-3 p-2 bg-primary/5 border border-primary/20 rounded-lg">
                          <p className="text-xs text-muted-foreground mb-1">Currently reading:</p>
                          <p className="text-sm font-medium text-primary truncate">
                            {post.tableOfContents[currentSectionIndex]?.title}
                          </p>
                        </div>
                      )}
                      {/* Section Progress */}
                      <div className="mb-4 pb-3 border-b">
                        <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                          <span>Reading Progress</span>
                          <span className="font-medium">{Math.round(readingProgress)}%</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            className="h-full bg-gradient-to-r from-primary to-lime-400 rounded-full"
                            style={{ width: `${readingProgress}%` }}
                          />
                        </div>
                      </div>
                      <nav className="space-y-1.5 relative">
                        {/* Active indicator line */}
                        <div className="absolute left-0 top-0 bottom-0 w-1 bg-muted rounded-full" />
                        {post.tableOfContents?.map((item, index) => {
                          const isActive = activeSection === item.id
                          const isPassed = currentSectionIndex > index
                          return (
                            <motion.button
                              key={item.id}
                              onClick={() => scrollToSection(item.id)}
                              animate={isActive ? { scale: 1.02 } : { scale: 1 }}
                              transition={{ duration: 0.2 }}
                              className={`w-full text-left pl-4 pr-3 py-3 rounded-lg text-sm transition-all relative ${
                                isActive
                                  ? 'bg-primary text-primary-foreground font-semibold shadow-md'
                                  : isPassed
                                  ? 'text-foreground/80 hover:bg-muted'
                                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                              }`}
                            >
                              {/* Active indicator bar */}
                              <span
                                className={`absolute left-0 top-1/2 -translate-y-1/2 w-1 rounded-full transition-all ${
                                  isActive
                                    ? 'h-full bg-lime-400'
                                    : isPassed
                                    ? 'h-4 bg-primary/50'
                                    : 'h-2 bg-transparent'
                                }`}
                              />
                              <span className="flex items-center gap-3">
                                <span className={`w-6 h-6 flex items-center justify-center rounded-full text-xs font-bold transition-all ${
                                  isActive
                                    ? 'bg-white text-primary shadow-sm'
                                    : isPassed
                                    ? 'bg-primary/20 text-primary'
                                    : 'bg-muted text-muted-foreground'
                                }`}>
                                  {isPassed ? '✓' : index + 1}
                                </span>
                                <span className={isActive ? 'text-white' : ''}>{item.title}</span>
                              </span>
                            </motion.button>
                          )
                        })}
                      </nav>
                    </CardContent>
                  </motion.div>
                </Card>

                {/* Share Section */}
                <Card className="mt-4">
                  <CardContent className="p-4">
                    <p className="font-semibold mb-3 flex items-center gap-2">
                      <Share2 className="h-4 w-4" />
                      Share this article
                    </p>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => sharePost('facebook')}
                      >
                        <Facebook className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => sharePost('twitter')}
                      >
                        <Twitter className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => sharePost('linkedin')}
                      >
                        <Linkedin className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => sharePost('copy')}
                      >
                        <Link2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>

                {/* Keywords/Tags Section */}
                {post.keywords && post.keywords.length > 0 && (
                  <Card className="mt-4">
                    <CardContent className="p-4">
                      <p className="font-semibold mb-3 flex items-center gap-2">
                        <Tag className="h-4 w-4" />
                        Keywords
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {post.keywords.map((keyword, index) => (
                          <Badge key={index} variant="secondary" className="text-xs">
                            {keyword}
                          </Badge>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>
            </aside>

            {/* Main Content */}
            <article ref={articleRef} className="flex-1 min-w-0">
              <Card>
                <CardContent className="p-6 sm:p-8 lg:p-12">
                  <div className="prose prose-lg dark:prose-invert max-w-none">
                    <ReactMarkdown
                      components={{
                        h2: (props) => <HeadingRenderer level={2} {...props} />,
                        h3: (props) => <HeadingRenderer level={3} {...props} />,
                        h4: (props) => <HeadingRenderer level={4} {...props} />,
                        p: ({ children }) => (
                          <p className="mb-4 text-muted-foreground leading-relaxed">{children}</p>
                        ),
                        ul: ({ children }) => (
                          <ul className="mb-4 space-y-2 list-disc list-inside text-muted-foreground">{children}</ul>
                        ),
                        ol: ({ children }) => (
                          <ol className="mb-4 space-y-2 list-decimal list-inside text-muted-foreground">{children}</ol>
                        ),
                        li: ({ children }) => (
                          <li className="text-muted-foreground">{children}</li>
                        ),
                        strong: ({ children }) => (
                          <strong className="font-semibold text-foreground">{children}</strong>
                        ),
                        blockquote: ({ children }) => (
                          <blockquote className="border-l-4 border-primary pl-4 italic my-4 text-muted-foreground">
                            {children}
                          </blockquote>
                        ),
                      }}
                    >
                      {post.content}
                    </ReactMarkdown>
                  </div>

                  {/* Author Box */}
                  <Separator className="my-8" />
                  <div className="flex items-start gap-4 p-6 bg-muted/50 rounded-lg">
                    <Avatar className="h-16 w-16">
                      <AvatarFallback className="bg-primary text-primary-foreground text-xl">
                        {post.author?.charAt(0)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-semibold text-lg">{post.author}</p>
                      <p className="text-muted-foreground mb-2">{post.authorRole}</p>
                      <p className="text-sm text-muted-foreground">
                        Expert contributor at GreenoFig, sharing insights on health, nutrition, and wellness.
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </article>
          </div>

          {/* Related Posts - Outside the flex container so TOC stops here */}
          {relatedPosts.length > 0 && (
            <div className="mt-12">
              <h2 className="text-2xl font-bold mb-6">Related Articles</h2>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {relatedPosts.map((relatedPost) => (
                  <Link key={relatedPost.id} to={`/blog/${relatedPost.slug || relatedPost.id}`} className="block">
                    <Card className="overflow-hidden card-hover cursor-pointer group h-full">
                      <div className="aspect-video overflow-hidden">
                        <img
                          src={relatedPost.image}
                          alt={relatedPost.title}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                      </div>
                      <CardContent className="p-4">
                        <Badge variant="secondary" className="mb-2">
                          {relatedPost.category}
                        </Badge>
                        <h3 className="font-semibold mb-2 line-clamp-2 group-hover:text-primary transition-colors">
                          {relatedPost.title}
                        </h3>
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                          <Clock className="h-3 w-3" />
                          {relatedPost.readTime}
                        </div>
                        <span className="inline-flex items-center text-primary font-medium mt-2 group-hover:gap-2 transition-all">
                          Read More
                          <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-1" />
                        </span>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center mt-12 pt-8 border-t">
            {blogPosts.findIndex(p => p.id === post.id) > 0 ? (
              <Button variant="outline" asChild>
                <Link to={`/blog/${blogPosts[blogPosts.findIndex(p => p.id === post.id) - 1].slug || blogPosts[blogPosts.findIndex(p => p.id === post.id) - 1].id}`}>
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Previous Article
                </Link>
              </Button>
            ) : <div />}
            {blogPosts.findIndex(p => p.id === post.id) < blogPosts.length - 1 ? (
              <Button variant="outline" asChild>
                <Link to={`/blog/${blogPosts[blogPosts.findIndex(p => p.id === post.id) + 1].slug || blogPosts[blogPosts.findIndex(p => p.id === post.id) + 1].id}`}>
                  Next Article
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
            ) : <div />}
          </div>
        </div>
      </section>
    </div>
  )
}
