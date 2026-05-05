import React, { Suspense, lazy } from 'react'
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'

// Layouts
import PublicLayout from '@/components/layout/PublicLayout'
import AppLayout from '@/components/layout/AppLayout'

// Loading Component
const PageLoader = () => (
  <div className="min-h-screen flex items-center justify-center">
    <div className="spinner h-8 w-8" />
  </div>
)

// Lazy load pages for better performance
const Home = lazy(() => import('@/pages/public/Home'))
const Features = lazy(() => import('@/pages/public/Features'))
const Pricing = lazy(() => import('@/pages/public/Pricing'))
const Blog = lazy(() => import('@/pages/public/Blog'))
const Contact = lazy(() => import('@/pages/public/Contact'))
const About = lazy(() => import('@/pages/public/About'))
const NotFound = lazy(() => import('@/pages/public/NotFound'))

// Auth Pages
const Login = lazy(() => import('@/pages/auth/Login'))
const Signup = lazy(() => import('@/pages/auth/Signup'))
const ForgotPassword = lazy(() => import('@/pages/auth/ForgotPassword'))

// App Pages
const Dashboard = lazy(() => import('@/pages/app/Dashboard'))
const AICoach = lazy(() => import('@/pages/app/AICoach'))
const Nutrition = lazy(() => import('@/pages/app/Nutrition'))
const Fitness = lazy(() => import('@/pages/app/Fitness'))
const Progress = lazy(() => import('@/pages/app/Progress'))
const Appointments = lazy(() => import('@/pages/app/Appointments'))
const Messages = lazy(() => import('@/pages/app/Messages'))
const AppSettings = lazy(() => import('@/pages/app/Settings'))
const Billing = lazy(() => import('@/pages/app/Billing'))
const Support = lazy(() => import('@/pages/app/Support'))

function App() {
  return (
    <Router>
      <Suspense fallback={<PageLoader />}>
        <Routes>
          {/* Public Routes */}
          <Route element={<PublicLayout />}>
            <Route path="/" element={<Home />} />
            <Route path="/features" element={<Features />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/blog" element={<Blog />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/about" element={<About />} />
          </Route>

          {/* Auth Routes */}
          <Route path="/auth/login" element={<Login />} />
          <Route path="/auth/signup" element={<Signup />} />
          <Route path="/auth/forgot-password" element={<ForgotPassword />} />

          {/* App Routes (Protected) */}
          <Route path="/app" element={<AppLayout />}>
            <Route index element={<Dashboard />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="ai-coach" element={<AICoach />} />
            <Route path="nutrition" element={<Nutrition />} />
            <Route path="fitness" element={<Fitness />} />
            <Route path="progress" element={<Progress />} />
            <Route path="appointments" element={<Appointments />} />
            <Route path="messages" element={<Messages />} />
            <Route path="settings" element={<AppSettings />} />
            <Route path="billing" element={<Billing />} />
            <Route path="support" element={<Support />} />
          </Route>

          {/* 404 */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </Suspense>

      <Toaster
        position="top-center"
        toastOptions={{
          duration: 4000,
          style: {
            background: 'hsl(var(--card))',
            color: 'hsl(var(--card-foreground))',
            border: '1px solid hsl(var(--border))',
          },
        }}
      />
    </Router>
  )
}

export default App
