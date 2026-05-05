import { Suspense, lazy, useEffect, useState } from 'react'
import { Routes, Route, Navigate, useLocation } from 'react-router-dom'
import { useAuth, getHomePathForRole } from '@/contexts/AuthContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageLoader } from '@/components/layout/PageLoader'
import { PopupAd, PersistentBottomBanner, InterstitialAd } from '@/components/ads'

// Scroll to top on page change
function ScrollToTop() {
  const { pathname } = useLocation()
  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])
  return null
}

// Public Pages
const Home = lazy(() => import('@/pages/Home'))
const Features = lazy(() => import('@/pages/Features'))
const Pricing = lazy(() => import('@/pages/Pricing'))
const Checkout = lazy(() => import('@/pages/Checkout'))
const Blog = lazy(() => import('@/pages/Blog'))
const BlogPost = lazy(() => import('@/pages/BlogPost'))
const Contact = lazy(() => import('@/pages/Contact'))
const About = lazy(() => import('@/pages/About'))
const Reviews = lazy(() => import('@/pages/Reviews'))
const PrivacyPolicy = lazy(() => import('@/pages/PrivacyPolicy'))
const TermsOfService = lazy(() => import('@/pages/TermsOfService'))
const CookiePolicy = lazy(() => import('@/pages/CookiePolicy'))
const Press = lazy(() => import('@/pages/Press'))
const NotFound = lazy(() => import('@/pages/NotFound'))

// Auth Pages
const Login = lazy(() => import('@/pages/auth/Login'))
const Signup = lazy(() => import('@/pages/auth/Signup'))
const AuthCallback = lazy(() => import('@/pages/auth/AuthCallback'))

// App Pages
const Dashboard = lazy(() => import('@/pages/app/Dashboard'))
const AICoach = lazy(() => import('@/pages/app/AICoach'))
const Nutrition = lazy(() => import('@/pages/app/Nutrition'))
const Fitness = lazy(() => import('@/pages/app/Fitness'))
const Progress = lazy(() => import('@/pages/app/Progress'))
const MealPlans = lazy(() => import('@/pages/app/MealPlans'))
const Appointments = lazy(() => import('@/pages/app/Appointments'))
const Settings = lazy(() => import('@/pages/app/Settings'))

// Admin Pages
const AdminDashboard = lazy(() => import('@/pages/app/admin/AdminDashboard'))
const AdminUsers = lazy(() => import('@/pages/app/admin/AdminUsers'))
const AdminLeads = lazy(() => import('@/pages/app/admin/AdminLeads'))
const AdminSubscriptions = lazy(() => import('@/pages/app/admin/AdminSubscriptions'))
const AdminAnalytics = lazy(() => import('@/pages/app/admin/AdminAnalytics'))
const AdminContent = lazy(() => import('@/pages/app/admin/AdminContent'))
const AdminSupport = lazy(() => import('@/pages/app/admin/AdminSupport'))
const AdminSettings = lazy(() => import('@/pages/app/admin/AdminSettings'))

// Nutritionist Pages
const NutritionistDashboard = lazy(() => import('@/pages/app/nutritionist/NutritionistDashboard'))
const NutritionistClients = lazy(() => import('@/pages/app/nutritionist/NutritionistClients'))
const ClientProfile = lazy(() => import('@/pages/app/nutritionist/ClientProfile'))
const NutritionistMealPlans = lazy(() => import('@/pages/app/nutritionist/NutritionistMealPlans'))
const NutritionistSchedule = lazy(() => import('@/pages/app/nutritionist/NutritionistSchedule'))
const NutritionistMessages = lazy(() => import('@/pages/app/nutritionist/NutritionistMessages'))
const NutritionistBlog = lazy(() => import('@/pages/app/nutritionist/NutritionistBlog'))

// Protected Route Component
function ProtectedRoute({ children }) {
  const { user, loading } = useAuth()

  if (loading) {
    return <PageLoader />
  }

  if (!user) {
    return <Navigate to="/login" replace />
  }

  return children
}

// Public Route Component (redirects to app if logged in)
function PublicRoute({ children }) {
  const { user, userProfile, loading } = useAuth()

  if (loading) {
    return <PageLoader />
  }

  if (user) {
    return <Navigate to={getHomePathForRole(userProfile?.role)} replace />
  }

  return children
}

// Customer-only route (blocks staff)
function CustomerRoute({ children }) {
  const { userProfile, loading } = useAuth()
  if (loading) return <PageLoader />
  const role = userProfile?.role
  if (role === 'nutritionist' || role === 'admin' || role === 'super_admin') {
    return <Navigate to={getHomePathForRole(role)} replace />
  }
  return children
}

// App index — sends each role to their own dashboard
function AppIndex() {
  const { userProfile } = useAuth()
  return <Navigate to={getHomePathForRole(userProfile?.role)} replace />
}

// Public Layout
function PublicLayout({ children }) {
  const [showInterstitial, setShowInterstitial] = useState(false)

  // Show interstitial ad after 30 seconds on first visit
  useEffect(() => {
    const hasSeenInterstitial = sessionStorage.getItem('interstitial_shown')
    if (!hasSeenInterstitial) {
      const timer = setTimeout(() => {
        setShowInterstitial(true)
        sessionStorage.setItem('interstitial_shown', 'true')
      }, 30000)
      return () => clearTimeout(timer)
    }
  }, [])

  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        {children}
      </main>
      <Footer />
      {/* One-time discount popup - collects user info and gives 25% discount code */}
      <PopupAd delay={10000} />
      {/* Persistent bottom banner - shows after 3 seconds */}
      <PersistentBottomBanner variant="upgrade" />
      {/* Interstitial ad - shows once per session after 30 seconds */}
      <InterstitialAd
        isOpen={showInterstitial}
        onClose={() => setShowInterstitial(false)}
        variant="premium"
        countdown={5}
      />
    </>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
      <ScrollToTop />
      <Routes>
        {/* Public Routes */}
        <Route
          path="/"
          element={
            <PublicLayout>
              <Home />
            </PublicLayout>
          }
        />
        <Route
          path="/features"
          element={
            <PublicLayout>
              <Features />
            </PublicLayout>
          }
        />
        <Route
          path="/pricing"
          element={
            <PublicLayout>
              <Pricing />
            </PublicLayout>
          }
        />
        <Route
          path="/blog"
          element={
            <PublicLayout>
              <Blog />
            </PublicLayout>
          }
        />
        <Route
          path="/blog/:id"
          element={
            <PublicLayout>
              <BlogPost />
            </PublicLayout>
          }
        />
        <Route
          path="/contact"
          element={
            <PublicLayout>
              <Contact />
            </PublicLayout>
          }
        />
        <Route
          path="/about"
          element={
            <PublicLayout>
              <About />
            </PublicLayout>
          }
        />
        <Route
          path="/reviews"
          element={
            <PublicLayout>
              <Reviews />
            </PublicLayout>
          }
        />
        <Route
          path="/privacy-policy"
          element={
            <PublicLayout>
              <PrivacyPolicy />
            </PublicLayout>
          }
        />
        <Route
          path="/terms-of-service"
          element={
            <PublicLayout>
              <TermsOfService />
            </PublicLayout>
          }
        />
        <Route
          path="/cookies"
          element={
            <PublicLayout>
              <CookiePolicy />
            </PublicLayout>
          }
        />
        <Route
          path="/press"
          element={
            <PublicLayout>
              <Press />
            </PublicLayout>
          }
        />
        <Route
          path="/checkout"
          element={
            <ProtectedRoute>
              <CustomerRoute>
                <PublicLayout>
                  <Checkout />
                </PublicLayout>
              </CustomerRoute>
            </ProtectedRoute>
          }
        />

        {/* Auth Routes */}
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />
        <Route
          path="/auth/callback"
          element={<AuthCallback />}
        />

        {/* Protected App Routes */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<AppIndex />} />
          <Route path="dashboard" element={<CustomerRoute><Dashboard /></CustomerRoute>} />
          <Route path="ai-coach" element={<AICoach />} />
          <Route path="nutrition" element={<CustomerRoute><Nutrition /></CustomerRoute>} />
          <Route path="fitness" element={<CustomerRoute><Fitness /></CustomerRoute>} />
          <Route path="progress" element={<CustomerRoute><Progress /></CustomerRoute>} />
          <Route path="meal-plans" element={<CustomerRoute><MealPlans /></CustomerRoute>} />
          <Route path="messages" element={<Dashboard />} />
          <Route path="appointments" element={<CustomerRoute><Appointments /></CustomerRoute>} />
          <Route path="billing" element={<CustomerRoute><Settings /></CustomerRoute>} />
          <Route path="support" element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />

          {/* Nutritionist Routes */}
          <Route path="nutritionist" element={<NutritionistDashboard />} />
          <Route path="nutritionist/clients" element={<NutritionistClients />} />
          <Route path="nutritionist/clients/:clientId" element={<ClientProfile />} />
          <Route path="nutritionist/meal-plans" element={<NutritionistMealPlans />} />
          <Route path="nutritionist/schedule" element={<NutritionistSchedule />} />
          <Route path="nutritionist/messages" element={<NutritionistMessages />} />
          <Route path="nutritionist/blog" element={<NutritionistBlog />} />

          {/* Admin Routes */}
          <Route path="admin" element={<AdminDashboard />} />
          <Route path="admin/users" element={<AdminUsers />} />
          <Route path="admin/leads" element={<AdminLeads />} />
          <Route path="admin/subscriptions" element={<AdminSubscriptions />} />
          <Route path="admin/analytics" element={<AdminAnalytics />} />
          <Route path="admin/content" element={<AdminContent />} />
          <Route path="admin/support" element={<AdminSupport />} />
          <Route path="admin/settings" element={<AdminSettings />} />
        </Route>

        {/* 404 */}
        <Route
          path="*"
          element={
            <PublicLayout>
              <NotFound />
            </PublicLayout>
          }
        />
      </Routes>
    </Suspense>
  )
}
