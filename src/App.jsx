import { Suspense, lazy } from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Navbar } from '@/components/layout/Navbar'
import { Footer } from '@/components/layout/Footer'
import { AppLayout } from '@/components/layout/AppLayout'
import { PageLoader } from '@/components/layout/PageLoader'

// Public Pages
const Home = lazy(() => import('@/pages/Home'))
const Features = lazy(() => import('@/pages/Features'))
const Pricing = lazy(() => import('@/pages/Pricing'))
const Blog = lazy(() => import('@/pages/Blog'))
const Contact = lazy(() => import('@/pages/Contact'))
const About = lazy(() => import('@/pages/About'))
const NotFound = lazy(() => import('@/pages/NotFound'))

// Auth Pages
const Login = lazy(() => import('@/pages/auth/Login'))
const Signup = lazy(() => import('@/pages/auth/Signup'))

// App Pages
const Dashboard = lazy(() => import('@/pages/app/Dashboard'))
const AICoach = lazy(() => import('@/pages/app/AICoach'))
const Nutrition = lazy(() => import('@/pages/app/Nutrition'))
const Fitness = lazy(() => import('@/pages/app/Fitness'))
const Progress = lazy(() => import('@/pages/app/Progress'))
const Settings = lazy(() => import('@/pages/app/Settings'))

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
  const { user, loading } = useAuth()

  if (loading) {
    return <PageLoader />
  }

  if (user) {
    return <Navigate to="/app/dashboard" replace />
  }

  return children
}

// Public Layout
function PublicLayout({ children }) {
  return (
    <>
      <Navbar />
      <main className="min-h-screen pt-16">
        {children}
      </main>
      <Footer />
    </>
  )
}

export default function App() {
  return (
    <Suspense fallback={<PageLoader />}>
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

        {/* Protected App Routes */}
        <Route
          path="/app"
          element={
            <ProtectedRoute>
              <AppLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/app/dashboard" replace />} />
          <Route path="dashboard" element={<Dashboard />} />
          <Route path="ai-coach" element={<AICoach />} />
          <Route path="nutrition" element={<Nutrition />} />
          <Route path="fitness" element={<Fitness />} />
          <Route path="progress" element={<Progress />} />
          <Route path="messages" element={<Dashboard />} />
          <Route path="appointments" element={<Dashboard />} />
          <Route path="billing" element={<Dashboard />} />
          <Route path="support" element={<Dashboard />} />
          <Route path="settings" element={<Settings />} />

          {/* Nutritionist Routes */}
          <Route path="nutritionist" element={<Dashboard />} />
          <Route path="nutritionist/*" element={<Dashboard />} />

          {/* Admin Routes */}
          <Route path="admin" element={<Dashboard />} />
          <Route path="admin/*" element={<Dashboard />} />
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
