import React, { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Eye, EyeOff, Mail, Lock, User, Loader2 } from 'lucide-react'
import { toast } from 'react-hot-toast'
import { cn } from '@/lib/utils'
import { useLanguage } from '@/contexts/LanguageContext'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Separator } from '@/components/ui/separator'
import Logo from '@/components/layout/Logo'
import { ThemeToggle } from '@/components/ui/theme-toggle'
import { LanguageToggle } from '@/components/ui/language-toggle'
import { signUp, signInWithGoogle } from '@/lib/supabase'

export default function Signup() {
  const { t } = useTranslation()
  const { isRTL } = useLanguage()
  const navigate = useNavigate()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error(t('auth.passwordsMatch'))
      return
    }

    if (password.length < 8) {
      toast.error(t('auth.passwordRequirements'))
      return
    }

    setLoading(true)

    try {
      const { data, error } = await signUp(email, password, { full_name: fullName })
      if (error) throw error

      toast.success(t('auth.signupSuccess'))
      navigate('/app/dashboard')
    } catch (error) {
      toast.error(t('auth.signupError'))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogleSignup = async () => {
    try {
      const { error } = await signInWithGoogle()
      if (error) throw error
    } catch (error) {
      toast.error(error.message)
    }
  }

  return (
    <div className="min-h-screen flex" dir={isRTL ? 'rtl' : 'ltr'}>
      {/* Left Side - Image */}
      <div className="hidden lg:block lg:w-1/2 relative">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-primary/5" />
        <img
          src="https://images.unsplash.com/photo-1517836357463-d25dfeac3438?w=1920&q=80"
          alt=""
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-background/80 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-8">
          <blockquote className="text-lg font-medium">
            "{t('app.description')}"
          </blockquote>
          <p className="mt-2 text-muted-foreground">— {t('app.name')}</p>
        </div>
      </div>

      {/* Right Side - Form */}
      <div className="flex-1 flex flex-col p-4 md:p-8">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <Logo />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </div>

        {/* Form */}
        <div className="flex-1 flex items-center justify-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full max-w-md"
          >
            <Card>
              <CardHeader className="text-center">
                <CardTitle className="text-2xl">{t('auth.createAccount')}</CardTitle>
                <CardDescription>{t('auth.signup')}</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('auth.fullName')}</label>
                    <div className="relative">
                      <User className={cn('absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground', isRTL ? 'right-3' : 'left-3')} />
                      <Input
                        type="text"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        placeholder={t('auth.fullName')}
                        className={cn(isRTL ? 'pr-10' : 'pl-10')}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('auth.email')}</label>
                    <div className="relative">
                      <Mail className={cn('absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground', isRTL ? 'right-3' : 'left-3')} />
                      <Input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="name@example.com"
                        className={cn(isRTL ? 'pr-10' : 'pl-10')}
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('auth.password')}</label>
                    <div className="relative">
                      <Lock className={cn('absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground', isRTL ? 'right-3' : 'left-3')} />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className={cn(isRTL ? 'pr-10 pl-10' : 'pl-10 pr-10')}
                        required
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword(!showPassword)}
                        className={cn('absolute top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground', isRTL ? 'left-3' : 'right-3')}
                      >
                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    <p className="text-xs text-muted-foreground">{t('auth.passwordRequirements')}</p>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">{t('auth.confirmPassword')}</label>
                    <div className="relative">
                      <Lock className={cn('absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground', isRTL ? 'right-3' : 'left-3')} />
                      <Input
                        type={showPassword ? 'text' : 'password'}
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className={cn(isRTL ? 'pr-10' : 'pl-10')}
                        required
                      />
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    {t('auth.signup')}
                  </Button>
                </form>

                <div className="my-6">
                  <div className="relative">
                    <Separator />
                    <span className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-2 text-xs text-muted-foreground">
                      {t('auth.orContinueWith')}
                    </span>
                  </div>
                </div>

                <Button variant="outline" className="w-full" onClick={handleGoogleSignup}>
                  <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24">
                    <path fill="currentColor" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="currentColor" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="currentColor" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
                    <path fill="currentColor" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
                  </svg>
                  {t('auth.signInWithGoogle')}
                </Button>

                <p className="mt-6 text-center text-sm text-muted-foreground">
                  {t('auth.agreeToTerms')}{' '}
                  <Link to="/terms" className="text-primary hover:underline">{t('auth.termsOfService')}</Link>
                  {' '}{t('auth.and')}{' '}
                  <Link to="/privacy" className="text-primary hover:underline">{t('auth.privacyPolicy')}</Link>
                </p>

                <p className="mt-4 text-center text-sm text-muted-foreground">
                  {t('auth.haveAccount')}{' '}
                  <Link to="/auth/login" className="text-primary hover:underline font-medium">
                    {t('auth.login')}
                  </Link>
                </p>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>
    </div>
  )
}
