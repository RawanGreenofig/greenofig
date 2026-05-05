import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router-dom'
import {
  Sun,
  Moon,
  Smartphone,
  Loader2,
  CreditCard,
  CheckCircle,
  XCircle,
  Crown,
} from 'lucide-react'
import { useAuth } from '@/contexts/AuthContext'
import { useTheme } from '@/contexts/ThemeContext'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Separator } from '@/components/ui/separator'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { getUserSubscription, cancelSubscription, getPaymentHistory, PLAN_CATALOG } from '@/lib/stripe'
import toast from 'react-hot-toast'

const NOTIF_KEY = 'greenofig_notifications'

export default function Settings() {
  const { t, i18n } = useTranslation()
  const { user, userProfile, signOut, refreshUserProfile } = useAuth()
  const { theme, setTheme } = useTheme()
  const navigate = useNavigate()

  const [language, setLanguage] = useState(i18n.language)
  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [deleting, setDeleting] = useState(false)

  const [profileForm, setProfileForm] = useState({
    full_name: '',
    phone: '',
    date_of_birth: '',
    gender: '',
    height: '',
    current_weight: '',
    target_weight: '',
    activity_level: '',
    dietary_preference: '',
    allergies: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    new_password: '',
    confirm_password: '',
  })

  const [notifications, setNotifications] = useState({
    email: true,
    push: true,
    mealReminders: true,
    workoutReminders: true,
    weeklyReports: true,
  })

  // Billing state
  const [subscription, setSubscription] = useState(null)
  const [paymentHistory, setPaymentHistory] = useState([])
  const [billingLoading, setBillingLoading] = useState(true)
  const [cancelling, setCancelling] = useState(false)

  // Load profile into form
  useEffect(() => {
    if (userProfile) {
      setProfileForm({
        full_name: userProfile.full_name || '',
        phone: userProfile.phone || '',
        date_of_birth: userProfile.date_of_birth || '',
        gender: userProfile.gender || '',
        height: userProfile.height ?? '',
        current_weight: userProfile.current_weight ?? '',
        target_weight: userProfile.target_weight ?? '',
        activity_level: userProfile.activity_level || '',
        dietary_preference: userProfile.dietary_preference || '',
        allergies: userProfile.allergies || '',
      })
    }
  }, [userProfile])

  // Load notif prefs from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem(NOTIF_KEY)
      if (stored) setNotifications(JSON.parse(stored))
    } catch {}
  }, [])

  // Load billing
  useEffect(() => {
    let cancelled = false
    const load = async () => {
      if (!user?.id || !isSupabaseConfigured()) {
        setBillingLoading(false)
        return
      }
      try {
        const [sub, history] = await Promise.all([
          getUserSubscription(user.id),
          getPaymentHistory(user.id),
        ])
        if (!cancelled) {
          setSubscription(sub)
          setPaymentHistory(history)
        }
      } catch (e) {
        console.error(e)
      } finally {
        if (!cancelled) setBillingLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [user?.id])

  const handleProfileChange = (field) => (e) => {
    const value = e?.target ? e.target.value : e
    setProfileForm(prev => ({ ...prev, [field]: value }))
  }

  const handleSaveProfile = async () => {
    if (!user?.id) return toast.error('Not signed in')
    setSavingProfile(true)
    try {
      const staffRoles = ['nutritionist', 'admin', 'super_admin']
      const isStaffUser = staffRoles.includes(userProfile?.role)
      const payload = {
        full_name: profileForm.full_name || null,
        phone: profileForm.phone || null,
        date_of_birth: profileForm.date_of_birth || null,
        gender: profileForm.gender || null,
        updated_at: new Date().toISOString(),
        ...(isStaffUser ? {} : {
          height: profileForm.height === '' ? null : Number(profileForm.height),
          current_weight: profileForm.current_weight === '' ? null : Number(profileForm.current_weight),
          target_weight: profileForm.target_weight === '' ? null : Number(profileForm.target_weight),
          activity_level: profileForm.activity_level || null,
          dietary_preference: profileForm.dietary_preference || null,
          allergies: profileForm.allergies || null,
        }),
      }

      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('user_profiles')
          .update(payload)
          .eq('id', user.id)
        if (error) throw error
        await refreshUserProfile()
      }
      toast.success('Profile updated')
    } catch (e) {
      console.error(e)
      toast.error(e.message || 'Failed to save profile')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleSaveNotifications = () => {
    try {
      localStorage.setItem(NOTIF_KEY, JSON.stringify(notifications))
      toast.success('Notification preferences saved')
    } catch {
      toast.error('Failed to save preferences')
    }
  }

  const handleChangePassword = async () => {
    if (!passwordForm.new_password || passwordForm.new_password.length < 8) {
      return toast.error('Password must be at least 8 characters')
    }
    if (passwordForm.new_password !== passwordForm.confirm_password) {
      return toast.error('Passwords do not match')
    }
    setSavingPassword(true)
    try {
      if (isSupabaseConfigured()) {
        const { error } = await supabase.auth.updateUser({ password: passwordForm.new_password })
        if (error) throw error
      }
      setPasswordForm({ new_password: '', confirm_password: '' })
      toast.success('Password updated')
    } catch (e) {
      toast.error(e.message || 'Failed to update password')
    } finally {
      setSavingPassword(false)
    }
  }

  const handleDeleteAccount = async () => {
    if (!user?.id) return
    setDeleting(true)
    try {
      // Soft-delete: deactivate the profile (auth user requires service_role key to delete)
      if (isSupabaseConfigured()) {
        const { error } = await supabase
          .from('user_profiles')
          .update({ is_active: false })
          .eq('id', user.id)
        if (error) throw error
      }
      await signOut()
      toast.success('Account deactivated. Contact support to permanently delete.')
      navigate('/')
    } catch (e) {
      toast.error(e.message || 'Failed to deactivate account')
    } finally {
      setDeleting(false)
    }
  }

  const handleCancelSubscription = async () => {
    if (!user?.id) return
    setCancelling(true)
    try {
      await cancelSubscription(user.id)
      const fresh = await getUserSubscription(user.id)
      setSubscription(fresh)
      await refreshUserProfile()
      toast.success('Subscription cancelled')
    } catch (e) {
      toast.error(e.message || 'Failed to cancel')
    } finally {
      setCancelling(false)
    }
  }

  const tier = userProfile?.tier || 'Free'
  const isStaff = ['nutritionist', 'admin', 'super_admin'].includes(userProfile?.role)
  const roleLabel = userProfile?.role === 'super_admin' ? 'Super Admin'
    : userProfile?.role === 'admin' ? 'Admin'
    : userProfile?.role === 'nutritionist' ? 'Nutritionist'
    : null

  return (
    <div className="p-6 space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold">{t('settings.title')}</h1>
        <p className="text-muted-foreground">{t('settings.subtitle')}</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className={isStaff ? 'grid grid-cols-4 w-full' : 'grid grid-cols-5 w-full'}>
          <TabsTrigger value="profile">{t('settings.tabs.profile')}</TabsTrigger>
          <TabsTrigger value="notifications">{t('settings.tabs.notifications')}</TabsTrigger>
          <TabsTrigger value="appearance">{t('settings.tabs.appearance')}</TabsTrigger>
          <TabsTrigger value="security">{t('settings.tabs.security')}</TabsTrigger>
          {!isStaff && <TabsTrigger value="billing">Billing</TabsTrigger>}
        </TabsList>

        <TabsContent value="profile">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Your details — saved to your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center gap-6">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={userProfile?.profile_picture_url} />
                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                    {profileForm.full_name?.charAt(0) || userProfile?.email?.charAt(0) || 'U'}
                  </AvatarFallback>
                </Avatar>
                <div className="flex items-center gap-2">
                  {isStaff ? (
                    <Badge variant="outline">{roleLabel}</Badge>
                  ) : (
                    <Badge variant="secondary" className="gap-1">
                      <Crown className="h-3 w-3" /> {tier}
                    </Badge>
                  )}
                </div>
              </div>

              <Separator />

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="full_name">Full name</Label>
                  <Input id="full_name" value={profileForm.full_name} onChange={handleProfileChange('full_name')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" value={userProfile?.email || user?.email || ''} disabled />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input id="phone" type="tel" value={profileForm.phone} onChange={handleProfileChange('phone')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="dob">Date of birth</Label>
                  <Input id="dob" type="date" value={profileForm.date_of_birth || ''} onChange={handleProfileChange('date_of_birth')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gender">Gender</Label>
                  <Select value={profileForm.gender} onValueChange={handleProfileChange('gender')}>
                    <SelectTrigger id="gender"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                      <SelectItem value="prefer_not_to_say">Prefer not to say</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {!isStaff && (
                  <>
                    <div className="space-y-2">
                      <Label htmlFor="activity_level">Activity level</Label>
                      <Select value={profileForm.activity_level} onValueChange={handleProfileChange('activity_level')}>
                        <SelectTrigger id="activity_level"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="sedentary">Sedentary</SelectItem>
                          <SelectItem value="light">Lightly active</SelectItem>
                          <SelectItem value="moderate">Moderately active</SelectItem>
                          <SelectItem value="active">Very active</SelectItem>
                          <SelectItem value="extra">Extra active</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="height">Height (cm)</Label>
                      <Input id="height" type="number" step="0.1" value={profileForm.height} onChange={handleProfileChange('height')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="current_weight">Current weight (kg)</Label>
                      <Input id="current_weight" type="number" step="0.1" value={profileForm.current_weight} onChange={handleProfileChange('current_weight')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="target_weight">Target weight (kg)</Label>
                      <Input id="target_weight" type="number" step="0.1" value={profileForm.target_weight} onChange={handleProfileChange('target_weight')} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="dietary_preference">Dietary preference</Label>
                      <Select value={profileForm.dietary_preference} onValueChange={handleProfileChange('dietary_preference')}>
                        <SelectTrigger id="dietary_preference"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="omnivore">Omnivore</SelectItem>
                          <SelectItem value="vegetarian">Vegetarian</SelectItem>
                          <SelectItem value="vegan">Vegan</SelectItem>
                          <SelectItem value="pescatarian">Pescatarian</SelectItem>
                          <SelectItem value="keto">Keto</SelectItem>
                          <SelectItem value="paleo">Paleo</SelectItem>
                          <SelectItem value="halal">Halal</SelectItem>
                          <SelectItem value="kosher">Kosher</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </>
                )}
              </div>

              {!isStaff && (
                <div className="space-y-2">
                  <Label htmlFor="allergies">Allergies / restrictions</Label>
                  <Input id="allergies" placeholder="e.g. peanuts, shellfish" value={profileForm.allergies} onChange={handleProfileChange('allergies')} />
                </div>
              )}

              <Button onClick={handleSaveProfile} disabled={savingProfile}>
                {savingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save changes
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="notifications">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.notifications.title')}</CardTitle>
              <CardDescription>Stored locally on this device.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {[
                { key: 'email', label: 'Email notifications', desc: 'Receive product updates and account info via email' },
                { key: 'push', label: 'Push notifications', desc: 'Browser and mobile push notifications' },
                { key: 'mealReminders', label: 'Meal reminders', desc: 'Reminders to log meals throughout the day' },
                { key: 'workoutReminders', label: 'Workout reminders', desc: 'Reminders to complete planned workouts' },
                { key: 'weeklyReports', label: 'Weekly reports', desc: 'Weekly summary of your nutrition and fitness progress' },
              ].map((item, idx) => (
                <div key={item.key}>
                  {idx > 0 && <Separator className="mb-6" />}
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label>{item.label}</Label>
                      <p className="text-sm text-muted-foreground">{item.desc}</p>
                    </div>
                    <Switch
                      checked={notifications[item.key]}
                      onCheckedChange={(checked) => setNotifications(prev => ({ ...prev, [item.key]: checked }))}
                    />
                  </div>
                </div>
              ))}

              <Button onClick={handleSaveNotifications}>Save preferences</Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>{t('settings.appearance.title')}</CardTitle>
              <CardDescription>{t('settings.appearance.subtitle')}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <Label>{t('settings.appearance.theme')}</Label>
                <div className="grid grid-cols-3 gap-4">
                  <Button variant={theme === 'light' ? 'default' : 'outline'} className="flex flex-col gap-2 h-auto py-4" onClick={() => setTheme('light')}>
                    <Sun className="h-5 w-5" />
                    <span>{t('settings.appearance.light')}</span>
                  </Button>
                  <Button variant={theme === 'dark' ? 'default' : 'outline'} className="flex flex-col gap-2 h-auto py-4" onClick={() => setTheme('dark')}>
                    <Moon className="h-5 w-5" />
                    <span>{t('settings.appearance.dark')}</span>
                  </Button>
                  <Button variant={theme === 'system' ? 'default' : 'outline'} className="flex flex-col gap-2 h-auto py-4" onClick={() => setTheme('system')}>
                    <Smartphone className="h-5 w-5" />
                    <span>{t('settings.appearance.system')}</span>
                  </Button>
                </div>
              </div>

              <Separator />

              <div className="space-y-2">
                <Label>{t('settings.appearance.language')}</Label>
                <Select value={language} onValueChange={(v) => { setLanguage(v); i18n.changeLanguage(v) }}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="en">English</SelectItem>
                    <SelectItem value="ar">العربية</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="security">
          <Card>
            <CardHeader>
              <CardTitle>Security</CardTitle>
              <CardDescription>Change your password and manage your account.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="new_password">New password</Label>
                  <Input
                    id="new_password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.new_password}
                    onChange={(e) => setPasswordForm(p => ({ ...p, new_password: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm_password">Confirm new password</Label>
                  <Input
                    id="confirm_password"
                    type="password"
                    autoComplete="new-password"
                    value={passwordForm.confirm_password}
                    onChange={(e) => setPasswordForm(p => ({ ...p, confirm_password: e.target.value }))}
                  />
                </div>
                <Button onClick={handleChangePassword} disabled={savingPassword}>
                  {savingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update password
                </Button>
              </div>

              <Separator />

              <div className="space-y-4">
                <h3 className="font-medium text-destructive">Danger zone</h3>
                <div className="flex items-center justify-between p-4 rounded-lg border border-destructive/50 bg-destructive/5">
                  <div>
                    <p className="font-medium">Deactivate account</p>
                    <p className="text-sm text-muted-foreground">Marks your profile inactive and signs you out. Contact support for full deletion.</p>
                  </div>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button variant="destructive" disabled={deleting}>
                        {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Deactivate
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Deactivate this account?</AlertDialogTitle>
                        <AlertDialogDescription>
                          You will be signed out and your profile marked inactive. Your data is retained — contact support@greenofig.com to permanently delete.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleDeleteAccount}>Deactivate</AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="billing">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" /> Subscription & Billing
              </CardTitle>
              <CardDescription>Your current plan and payment history.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {billingLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                </div>
              ) : (
                <>
                  <div className="flex items-center justify-between p-4 rounded-lg border border-border bg-muted/30">
                    <div>
                      <div className="flex items-center gap-2 mb-1">
                        <p className="font-semibold">Current plan</p>
                        <Badge>{subscription?.plan || tier}</Badge>
                        {subscription?.status === 'active' && (
                          <Badge variant="secondary" className="gap-1"><CheckCircle className="h-3 w-3" /> Active</Badge>
                        )}
                        {subscription?.status === 'cancelled' && (
                          <Badge variant="destructive" className="gap-1"><XCircle className="h-3 w-3" /> Cancelled</Badge>
                        )}
                      </div>
                      {subscription ? (
                        <p className="text-sm text-muted-foreground">
                          ${Number(subscription.price).toFixed(2)} / {subscription.billing_cycle}
                          {subscription.end_date && ` · ${subscription.status === 'active' ? 'Renews' : 'Ended'} ${new Date(subscription.end_date).toLocaleDateString()}`}
                        </p>
                      ) : (
                        <p className="text-sm text-muted-foreground">No paid subscription on file.</p>
                      )}
                    </div>
                    <div className="flex gap-2">
                      {subscription?.status === 'active' ? (
                        <Button variant="outline" onClick={handleCancelSubscription} disabled={cancelling}>
                          {cancelling && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Cancel
                        </Button>
                      ) : (
                        <Button onClick={() => navigate('/pricing')}>Upgrade</Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <h3 className="font-medium mb-3">Available plans</h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      {PLAN_CATALOG.map(p => (
                        <div key={p.id} className={`p-4 rounded-lg border ${(subscription?.plan || tier).toLowerCase() === p.id ? 'border-primary bg-primary/5' : 'border-border'}`}>
                          <p className="font-semibold">{p.name}</p>
                          <p className="text-2xl font-bold mt-1">${p.price_monthly}<span className="text-sm font-normal text-muted-foreground">/mo</span></p>
                          {p.price_yearly > 0 && <p className="text-xs text-muted-foreground">${p.price_yearly}/year</p>}
                        </div>
                      ))}
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <h3 className="font-medium mb-3">Payment history</h3>
                    {paymentHistory.length === 0 ? (
                      <p className="text-sm text-muted-foreground">No transactions yet.</p>
                    ) : (
                      <div className="space-y-2">
                        {paymentHistory.map(p => (
                          <div key={p.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 text-sm">
                            <div>
                              <p className="font-medium">{p.plan} · {p.billing_cycle}</p>
                              <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</p>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-medium">${Number(p.price).toFixed(2)}</span>
                              <Badge variant={p.status === 'active' ? 'secondary' : 'outline'} className="capitalize">{p.status}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
