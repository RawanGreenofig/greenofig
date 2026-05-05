import { useState } from 'react'
import { Link, useNavigate, useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, ArrowRight, Users, Crown, Shield, Sparkles } from 'lucide-react'
import { useAuth, DEMO_ACCOUNTS, getHomePathForRole } from '@/contexts/AuthContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import toast from 'react-hot-toast'

export default function Login() {
  const { t } = useTranslation()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const { signIn, signInWithGoogle } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()

  const from = location.state?.from?.pathname

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { error, data } = await signIn(email, password)
      if (error) {
        toast.error(error.message || t('auth.login.error'))
      } else {
        toast.success(t('auth.login.welcomeBack'))
        // Demo accounts return their profile inline; real auth profile is loaded async,
        // so use /app and let AppIndex route by role.
        navigate(from || '/app', { replace: true })
      }
    } catch (error) {
      toast.error(t('common.error'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignIn = async () => {
    try {
      const { error } = await signInWithGoogle()
      if (error) {
        toast.error(error.message || t('auth.login.error'))
      }
    } catch (error) {
      toast.error(t('common.error'))
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center px-4 py-12 bg-gradient-to-br from-background via-background to-primary/5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="text-center mb-8">
          <Link to="/" className="inline-flex items-center space-x-2 rtl:space-x-reverse mb-6">
            <img src="/logo.png" alt="GreenoFig" className="h-12 w-auto" />
          </Link>
          <h1 className="text-2xl font-bold">{t('auth.login.title')}</h1>
          <p className="text-muted-foreground mt-2">{t('auth.login.subtitle')}</p>
        </div>

        <Card>
          <CardHeader className="space-y-1 pb-4">
            <CardTitle className="text-xl">{t('auth.login.cardTitle')}</CardTitle>
            <CardDescription>
              {t('auth.login.cardDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button
              variant="outline"
              className="w-full"
              onClick={handleGoogleSignIn}
              type="button"
            >
              <svg className="me-2 h-4 w-4" viewBox="0 0 24 24">
                <path
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  fill="#4285F4"
                />
                <path
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  fill="#34A853"
                />
                <path
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  fill="#FBBC05"
                />
                <path
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  fill="#EA4335"
                />
              </svg>
              {t('auth.login.googleButton')}
            </Button>

            <div className="relative">
              <div className="absolute inset-0 flex items-center">
                <Separator className="w-full" />
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-card px-2 text-muted-foreground">{t('auth.login.orContinue')}</span>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">{t('auth.login.email')}</Label>
                <div className="relative">
                  <Mail className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    type="email"
                    placeholder={t('auth.login.emailPlaceholder')}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="ps-10"
                    required
                  />
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="password">{t('auth.login.password')}</Label>
                  <Link
                    to="/forgot-password"
                    className="text-sm text-primary hover:underline"
                  >
                    {t('auth.login.forgotPassword')}
                  </Link>
                </div>
                <div className="relative">
                  <Lock className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={t('auth.login.passwordPlaceholder')}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="ps-10 pe-10"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? t('auth.login.submitting') : t('auth.login.submit')}
                {!loading && <ArrowRight className="ms-2 h-4 w-4" />}
              </Button>
            </form>
          </CardContent>
          <CardFooter className="flex flex-col space-y-4">
            <div className="text-sm text-center text-muted-foreground">
              {t('auth.login.noAccount')}{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">
                {t('auth.login.signUp')}
              </Link>
            </div>
          </CardFooter>
        </Card>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {t('auth.login.terms')}{' '}
          <Link to="/terms-of-service" className="underline hover:text-foreground">
            {t('auth.login.termsLink')}
          </Link>{' '}
          {t('auth.login.and')}{' '}
          <Link to="/privacy-policy" className="underline hover:text-foreground">
            {t('auth.login.privacyLink')}
          </Link>
        </p>

        {/* Demo Accounts Section */}
        <Card className="mt-6 bg-muted/30">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm flex items-center gap-2">
              <Users className="h-4 w-4" />
              Demo Accounts
            </CardTitle>
            <CardDescription className="text-xs">
              Click to auto-fill login credentials
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="grid grid-cols-2 gap-2">
              {/* User accounts */}
              <button
                type="button"
                onClick={() => { setEmail(DEMO_ACCOUNTS.user.email); setPassword(DEMO_ACCOUNTS.user.password); }}
                className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-accent text-left text-xs transition-colors"
              >
                <Sparkles className="h-3 w-3 text-gray-500" />
                <div>
                  <div className="font-medium">Free User</div>
                  <div className="text-muted-foreground">Sees ads</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail(DEMO_ACCOUNTS.basic.email); setPassword(DEMO_ACCOUNTS.basic.password); }}
                className="flex items-center gap-2 p-2 rounded-lg border border-border hover:bg-accent text-left text-xs transition-colors"
              >
                <Badge className="h-3 w-3 bg-blue-500" />
                <div>
                  <div className="font-medium">Basic User</div>
                  <div className="text-muted-foreground">Sees ads</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail(DEMO_ACCOUNTS.premium.email); setPassword(DEMO_ACCOUNTS.premium.password); }}
                className="flex items-center gap-2 p-2 rounded-lg border border-yellow-500/50 hover:bg-yellow-500/10 text-left text-xs transition-colors"
              >
                <Crown className="h-3 w-3 text-yellow-500" />
                <div>
                  <div className="font-medium">Premium User</div>
                  <div className="text-muted-foreground">No ads</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail(DEMO_ACCOUNTS.elite.email); setPassword(DEMO_ACCOUNTS.elite.password); }}
                className="flex items-center gap-2 p-2 rounded-lg border border-purple-500/50 hover:bg-purple-500/10 text-left text-xs transition-colors"
              >
                <Crown className="h-3 w-3 text-purple-500" />
                <div>
                  <div className="font-medium">Elite User</div>
                  <div className="text-muted-foreground">No ads</div>
                </div>
              </button>
            </div>

            <Separator className="my-2" />

            {/* Staff accounts */}
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => { setEmail(DEMO_ACCOUNTS.nutritionist.email); setPassword(DEMO_ACCOUNTS.nutritionist.password); }}
                className="flex items-center gap-2 p-2 rounded-lg border border-green-500/50 hover:bg-green-500/10 text-left text-xs transition-colors"
              >
                <Shield className="h-3 w-3 text-green-500" />
                <div>
                  <div className="font-medium">Nutritionist</div>
                  <div className="text-muted-foreground">Staff - No ads</div>
                </div>
              </button>
              <button
                type="button"
                onClick={() => { setEmail(DEMO_ACCOUNTS.superadmin.email); setPassword(DEMO_ACCOUNTS.superadmin.password); }}
                className="flex items-center gap-2 p-2 rounded-lg border border-red-500/50 hover:bg-red-500/10 text-left text-xs transition-colors"
              >
                <Shield className="h-3 w-3 text-red-500" />
                <div>
                  <div className="font-medium">Super Admin</div>
                  <div className="text-muted-foreground">Full access</div>
                </div>
              </button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
