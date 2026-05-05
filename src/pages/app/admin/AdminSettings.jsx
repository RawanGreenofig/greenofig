import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import {
  Settings, Save, Globe, Mail, Bell, Shield, Database,
  Key, CreditCard, Palette, Upload, RefreshCw, Check, X,
  Plus, Trash2, DollarSign, Layers
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { useAuth } from '@/contexts/AuthContext'
import { useNavigate } from 'react-router-dom'
import toast from 'react-hot-toast'

export default function AdminSettings() {
  const { t } = useTranslation()
  const { userProfile } = useAuth()
  const navigate = useNavigate()
  const isSuperAdmin = userProfile?.role === 'super_admin'

  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('general')
  const [editTierDialog, setEditTierDialog] = useState(false)
  const [selectedTier, setSelectedTier] = useState(null)

  // Redirect non-super admins
  useEffect(() => {
    if (userProfile && !isSuperAdmin) {
      toast.error('Only super admins can access settings')
      navigate('/app/admin')
    }
  }, [userProfile, isSuperAdmin, navigate])

  const [settings, setSettings] = useState({
    // General
    siteName: 'GreenoFig',
    siteDescription: 'Your Professional Health Companion',
    supportEmail: 'support@greenofig.com',
    defaultLanguage: 'en',
    maintenanceMode: false,

    // Email
    smtpHost: 'smtp.example.com',
    smtpPort: '587',
    smtpUser: '',
    smtpPassword: '',
    emailFromName: 'GreenoFig',
    emailFromAddress: 'noreply@greenofig.com',

    // Notifications
    enableEmailNotifications: true,
    enablePushNotifications: true,
    notifyOnNewUser: true,
    notifyOnNewSubscription: true,
    notifyOnSupportTicket: true,

    // Security
    requireEmailVerification: true,
    enable2FA: false,
    sessionTimeout: '30',
    maxLoginAttempts: '5',
    passwordMinLength: '8',

    // Stripe
    stripePublishableKey: '',
    stripeSecretKey: '',
    stripeWebhookSecret: '',
    stripeTestMode: true,

    // Billing
    currency: 'USD',
    trialDays: '14',
    enableCoupons: true,

    // AI
    aiModel: 'gemini-pro',
    aiMaxTokens: '2048',
    aiTemperature: '0.7',
    dailyAiLimit: '50'
  })

  const [tiers, setTiers] = useState([
    {
      id: 'free',
      name: 'Free',
      description: 'Get started with basic features',
      priceMonthly: 0,
      priceYearly: 0,
      stripePriceIdMonthly: '',
      stripePriceIdYearly: '',
      features: [
        { name: 'Basic meal/workout logging', included: true },
        { name: 'AI coach (5 messages/day)', included: true },
        { name: 'Basic progress tracking', included: true },
        { name: 'Community access', included: true },
        { name: 'Meal planning', included: false },
        { name: 'Recipe database', included: false },
        { name: 'Nutritionist messaging', included: false },
        { name: 'Video consultations', included: false },
      ],
    },
    {
      id: 'basic',
      name: 'Basic',
      description: 'Perfect for getting started',
      priceMonthly: 9.99,
      priceYearly: 99,
      stripePriceIdMonthly: 'price_basic_monthly',
      stripePriceIdYearly: 'price_basic_yearly',
      features: [
        { name: 'Unlimited AI coach messages', included: true },
        { name: 'Full meal planning', included: true },
        { name: 'Recipe database access', included: true },
        { name: 'Macro tracking', included: true },
        { name: 'Exercise library', included: true },
        { name: 'Wearable device sync', included: false },
        { name: 'No ads', included: true },
        { name: 'Video consultations', included: false },
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      description: 'For serious health enthusiasts',
      priceMonthly: 19.99,
      priceYearly: 199,
      stripePriceIdMonthly: 'price_premium_monthly',
      stripePriceIdYearly: 'price_premium_yearly',
      popular: true,
      features: [
        { name: 'Everything in Basic', included: true },
        { name: 'Nutritionist messaging', included: true },
        { name: 'Video consultations (2/month)', included: true },
        { name: 'Wearable device sync', included: true },
        { name: 'Advanced analytics', included: true },
        { name: 'Custom meal plans', included: true },
        { name: 'Progress reports', included: true },
        { name: 'Priority support', included: false },
      ],
    },
    {
      id: 'elite',
      name: 'Elite',
      description: 'The complete wellness experience',
      priceMonthly: 39.99,
      priceYearly: 399,
      stripePriceIdMonthly: 'price_elite_monthly',
      stripePriceIdYearly: 'price_elite_yearly',
      features: [
        { name: 'Everything in Premium', included: true },
        { name: 'Unlimited video consultations', included: true },
        { name: 'Doctor consultations', included: true },
        { name: 'DNA-based nutrition', included: true },
        { name: 'Photo food recognition', included: true },
        { name: 'Priority support', included: true },
        { name: 'Custom integrations', included: true },
        { name: 'Dedicated support', included: true },
      ],
    },
  ])

  const handleSave = async () => {
    setLoading(true)

    // Simulate saving
    await new Promise(resolve => setTimeout(resolve, 1000))

    toast.success('Settings saved successfully')
    setLoading(false)
  }

  const updateSetting = (key, value) => {
    setSettings({ ...settings, [key]: value })
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Platform Settings</h1>
          <p className="text-muted-foreground">Configure your platform settings</p>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Save Changes
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid grid-cols-4 md:grid-cols-8 w-full">
          <TabsTrigger value="general">
            <Globe className="mr-2 h-4 w-4 hidden sm:inline" />
            General
          </TabsTrigger>
          <TabsTrigger value="email">
            <Mail className="mr-2 h-4 w-4 hidden sm:inline" />
            Email
          </TabsTrigger>
          <TabsTrigger value="notifications">
            <Bell className="mr-2 h-4 w-4 hidden sm:inline" />
            Alerts
          </TabsTrigger>
          <TabsTrigger value="security">
            <Shield className="mr-2 h-4 w-4 hidden sm:inline" />
            Security
          </TabsTrigger>
          <TabsTrigger value="stripe">
            <DollarSign className="mr-2 h-4 w-4 hidden sm:inline" />
            Stripe
          </TabsTrigger>
          <TabsTrigger value="tiers">
            <Layers className="mr-2 h-4 w-4 hidden sm:inline" />
            Tiers
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="mr-2 h-4 w-4 hidden sm:inline" />
            Billing
          </TabsTrigger>
          <TabsTrigger value="ai">
            <Database className="mr-2 h-4 w-4 hidden sm:inline" />
            AI
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          {/* General Settings */}
          <TabsContent value="general">
            <Card>
              <CardHeader>
                <CardTitle>General Settings</CardTitle>
                <CardDescription>Basic platform configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Site Name</Label>
                    <Input
                      value={settings.siteName}
                      onChange={(e) => updateSetting('siteName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Support Email</Label>
                    <Input
                      type="email"
                      value={settings.supportEmail}
                      onChange={(e) => updateSetting('supportEmail', e.target.value)}
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Site Description</Label>
                  <Textarea
                    value={settings.siteDescription}
                    onChange={(e) => updateSetting('siteDescription', e.target.value)}
                    rows={3}
                  />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Default Language</Label>
                    <Select
                      value={settings.defaultLanguage}
                      onValueChange={(v) => updateSetting('defaultLanguage', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="en">English</SelectItem>
                        <SelectItem value="ar">Arabic</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Maintenance Mode</Label>
                    <div className="flex items-center gap-2 pt-2">
                      <Switch
                        checked={settings.maintenanceMode}
                        onCheckedChange={(v) => updateSetting('maintenanceMode', v)}
                      />
                      <span className="text-sm text-muted-foreground">
                        {settings.maintenanceMode ? 'Enabled' : 'Disabled'}
                      </span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Email Settings */}
          <TabsContent value="email">
            <Card>
              <CardHeader>
                <CardTitle>Email Configuration</CardTitle>
                <CardDescription>SMTP and email settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>SMTP Host</Label>
                    <Input
                      value={settings.smtpHost}
                      onChange={(e) => updateSetting('smtpHost', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Port</Label>
                    <Input
                      value={settings.smtpPort}
                      onChange={(e) => updateSetting('smtpPort', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Username</Label>
                    <Input
                      value={settings.smtpUser}
                      onChange={(e) => updateSetting('smtpUser', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>SMTP Password</Label>
                    <Input
                      type="password"
                      value={settings.smtpPassword}
                      onChange={(e) => updateSetting('smtpPassword', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>From Name</Label>
                    <Input
                      value={settings.emailFromName}
                      onChange={(e) => updateSetting('emailFromName', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>From Address</Label>
                    <Input
                      type="email"
                      value={settings.emailFromAddress}
                      onChange={(e) => updateSetting('emailFromAddress', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Notifications Settings */}
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>Configure notification preferences</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Email Notifications</p>
                      <p className="text-sm text-muted-foreground">Send notifications via email</p>
                    </div>
                    <Switch
                      checked={settings.enableEmailNotifications}
                      onCheckedChange={(v) => updateSetting('enableEmailNotifications', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Push Notifications</p>
                      <p className="text-sm text-muted-foreground">Send browser push notifications</p>
                    </div>
                    <Switch
                      checked={settings.enablePushNotifications}
                      onCheckedChange={(v) => updateSetting('enablePushNotifications', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">New User Notifications</p>
                      <p className="text-sm text-muted-foreground">Notify admins when new users register</p>
                    </div>
                    <Switch
                      checked={settings.notifyOnNewUser}
                      onCheckedChange={(v) => updateSetting('notifyOnNewUser', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">New Subscription Notifications</p>
                      <p className="text-sm text-muted-foreground">Notify on new subscriptions</p>
                    </div>
                    <Switch
                      checked={settings.notifyOnNewSubscription}
                      onCheckedChange={(v) => updateSetting('notifyOnNewSubscription', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Support Ticket Notifications</p>
                      <p className="text-sm text-muted-foreground">Notify on new support tickets</p>
                    </div>
                    <Switch
                      checked={settings.notifyOnSupportTicket}
                      onCheckedChange={(v) => updateSetting('notifyOnSupportTicket', v)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Security Settings */}
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security Settings</CardTitle>
                <CardDescription>Authentication and security configuration</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Require Email Verification</p>
                      <p className="text-sm text-muted-foreground">Users must verify email to access the app</p>
                    </div>
                    <Switch
                      checked={settings.requireEmailVerification}
                      onCheckedChange={(v) => updateSetting('requireEmailVerification', v)}
                    />
                  </div>
                  <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                    <div>
                      <p className="font-medium">Two-Factor Authentication</p>
                      <p className="text-sm text-muted-foreground">Allow users to enable 2FA</p>
                    </div>
                    <Switch
                      checked={settings.enable2FA}
                      onCheckedChange={(v) => updateSetting('enable2FA', v)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="space-y-2">
                    <Label>Session Timeout (minutes)</Label>
                    <Input
                      type="number"
                      value={settings.sessionTimeout}
                      onChange={(e) => updateSetting('sessionTimeout', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Max Login Attempts</Label>
                    <Input
                      type="number"
                      value={settings.maxLoginAttempts}
                      onChange={(e) => updateSetting('maxLoginAttempts', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Min Password Length</Label>
                    <Input
                      type="number"
                      value={settings.passwordMinLength}
                      onChange={(e) => updateSetting('passwordMinLength', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Stripe Settings */}
          <TabsContent value="stripe">
            <Card>
              <CardHeader>
                <CardTitle>Stripe Configuration</CardTitle>
                <CardDescription>Connect your Stripe account for payment processing</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Test Mode</p>
                    <p className="text-sm text-muted-foreground">Use Stripe test keys for development</p>
                  </div>
                  <Switch
                    checked={settings.stripeTestMode}
                    onCheckedChange={(v) => updateSetting('stripeTestMode', v)}
                  />
                </div>
                {settings.stripeTestMode && (
                  <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                    <p className="text-sm text-yellow-600 dark:text-yellow-400">
                      Test mode is enabled. Use test API keys from your Stripe dashboard.
                    </p>
                  </div>
                )}
                <div className="space-y-2">
                  <Label>Publishable Key</Label>
                  <Input
                    value={settings.stripePublishableKey}
                    onChange={(e) => updateSetting('stripePublishableKey', e.target.value)}
                    placeholder={settings.stripeTestMode ? 'pk_test_...' : 'pk_live_...'}
                  />
                  <p className="text-xs text-muted-foreground">Found in Stripe Dashboard → Developers → API keys</p>
                </div>
                <div className="space-y-2">
                  <Label>Secret Key</Label>
                  <Input
                    type="password"
                    value={settings.stripeSecretKey}
                    onChange={(e) => updateSetting('stripeSecretKey', e.target.value)}
                    placeholder={settings.stripeTestMode ? 'sk_test_...' : 'sk_live_...'}
                  />
                  <p className="text-xs text-muted-foreground">Keep this key secure and never expose it publicly</p>
                </div>
                <div className="space-y-2">
                  <Label>Webhook Secret</Label>
                  <Input
                    type="password"
                    value={settings.stripeWebhookSecret}
                    onChange={(e) => updateSetting('stripeWebhookSecret', e.target.value)}
                    placeholder="whsec_..."
                  />
                  <p className="text-xs text-muted-foreground">Used to verify webhook events from Stripe</p>
                </div>
                <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                  <p className="font-medium text-blue-600 dark:text-blue-400 mb-2">Webhook Endpoint URL</p>
                  <code className="text-sm bg-muted px-2 py-1 rounded">
                    https://greenofig.com/api/webhooks/stripe
                  </code>
                  <p className="text-xs text-muted-foreground mt-2">
                    Add this URL to your Stripe webhook settings to receive payment events
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Tiers Settings */}
          <TabsContent value="tiers">
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle>Subscription Tiers</CardTitle>
                  <CardDescription>Configure pricing plans and features for each tier</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {tiers.map((tier) => (
                      <div
                        key={tier.id}
                        className={`relative p-4 border rounded-lg cursor-pointer hover:border-primary transition-colors ${tier.popular ? 'border-primary border-2' : ''}`}
                        onClick={() => {
                          setSelectedTier(tier)
                          setEditTierDialog(true)
                        }}
                      >
                        {tier.popular && (
                          <Badge className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary">
                            Popular
                          </Badge>
                        )}
                        <h3 className="font-semibold text-lg">{tier.name}</h3>
                        <p className="text-sm text-muted-foreground mb-3">{tier.description}</p>
                        <div className="mb-3">
                          <span className="text-2xl font-bold">${tier.priceMonthly}</span>
                          <span className="text-muted-foreground">/mo</span>
                        </div>
                        <div className="text-xs text-muted-foreground mb-3">
                          ${tier.priceYearly}/year
                        </div>
                        <div className="space-y-1">
                          {tier.features.slice(0, 4).map((feature, i) => (
                            <div key={i} className="flex items-center gap-1 text-xs">
                              {feature.included ? (
                                <Check className="h-3 w-3 text-green-500" />
                              ) : (
                                <X className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className={!feature.included ? 'text-muted-foreground' : ''}>
                                {feature.name}
                              </span>
                            </div>
                          ))}
                          {tier.features.length > 4 && (
                            <p className="text-xs text-muted-foreground">
                              +{tier.features.length - 4} more features
                            </p>
                          )}
                        </div>
                        <Button size="sm" variant="outline" className="w-full mt-3">
                          Edit Tier
                        </Button>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Billing Settings */}
          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Billing Configuration</CardTitle>
                <CardDescription>General billing and subscription settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Currency</Label>
                    <Select
                      value={settings.currency}
                      onValueChange={(v) => updateSetting('currency', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="USD">USD ($)</SelectItem>
                        <SelectItem value="EUR">EUR (€)</SelectItem>
                        <SelectItem value="GBP">GBP (£)</SelectItem>
                        <SelectItem value="AED">AED (د.إ)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Trial Period (days)</Label>
                    <Input
                      type="number"
                      value={settings.trialDays}
                      onChange={(e) => updateSetting('trialDays', e.target.value)}
                    />
                  </div>
                </div>
                <div className="flex items-center justify-between p-4 bg-muted/50 rounded-lg">
                  <div>
                    <p className="font-medium">Enable Coupons</p>
                    <p className="text-sm text-muted-foreground">Allow discount coupons for subscriptions</p>
                  </div>
                  <Switch
                    checked={settings.enableCoupons}
                    onCheckedChange={(v) => updateSetting('enableCoupons', v)}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* AI Settings */}
          <TabsContent value="ai">
            <Card>
              <CardHeader>
                <CardTitle>AI Configuration</CardTitle>
                <CardDescription>Configure AI Coach settings</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>AI Model</Label>
                    <Select
                      value={settings.aiModel}
                      onValueChange={(v) => updateSetting('aiModel', v)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                        <SelectItem value="gemini-pro-vision">Gemini Pro Vision</SelectItem>
                        <SelectItem value="gemini-ultra">Gemini Ultra</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Daily AI Limit (per user)</Label>
                    <Input
                      type="number"
                      value={settings.dailyAiLimit}
                      onChange={(e) => updateSetting('dailyAiLimit', e.target.value)}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label>Max Tokens</Label>
                    <Input
                      type="number"
                      value={settings.aiMaxTokens}
                      onChange={(e) => updateSetting('aiMaxTokens', e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Temperature (0-1)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min="0"
                      max="1"
                      value={settings.aiTemperature}
                      onChange={(e) => updateSetting('aiTemperature', e.target.value)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </div>
      </Tabs>

      {/* Edit Tier Dialog */}
      <Dialog open={editTierDialog} onOpenChange={setEditTierDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit {selectedTier?.name} Tier</DialogTitle>
            <DialogDescription>
              Update pricing and features for this subscription tier
            </DialogDescription>
          </DialogHeader>
          {selectedTier && (
            <div className="space-y-6 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Tier Name</Label>
                  <Input
                    value={selectedTier.name}
                    onChange={(e) => setSelectedTier({...selectedTier, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Description</Label>
                  <Input
                    value={selectedTier.description}
                    onChange={(e) => setSelectedTier({...selectedTier, description: e.target.value})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Monthly Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={selectedTier.priceMonthly}
                    onChange={(e) => setSelectedTier({...selectedTier, priceMonthly: parseFloat(e.target.value) || 0})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Yearly Price ($)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={selectedTier.priceYearly}
                    onChange={(e) => setSelectedTier({...selectedTier, priceYearly: parseFloat(e.target.value) || 0})}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Stripe Monthly Price ID</Label>
                  <Input
                    value={selectedTier.stripePriceIdMonthly}
                    onChange={(e) => setSelectedTier({...selectedTier, stripePriceIdMonthly: e.target.value})}
                    placeholder="price_..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stripe Yearly Price ID</Label>
                  <Input
                    value={selectedTier.stripePriceIdYearly}
                    onChange={(e) => setSelectedTier({...selectedTier, stripePriceIdYearly: e.target.value})}
                    placeholder="price_..."
                  />
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="popular"
                  checked={selectedTier.popular || false}
                  onChange={(e) => setSelectedTier({...selectedTier, popular: e.target.checked})}
                  className="rounded border-gray-300"
                />
                <Label htmlFor="popular">Mark as Popular (highlighted on pricing page)</Label>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label>Features</Label>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelectedTier({
                      ...selectedTier,
                      features: [...selectedTier.features, { name: 'New Feature', included: true }]
                    })}
                  >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Feature
                  </Button>
                </div>
                <div className="space-y-2 max-h-64 overflow-y-auto border rounded-lg p-3">
                  {selectedTier.features.map((feature, index) => (
                    <div key={index} className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={feature.included}
                        onChange={(e) => {
                          const newFeatures = [...selectedTier.features]
                          newFeatures[index].included = e.target.checked
                          setSelectedTier({...selectedTier, features: newFeatures})
                        }}
                        className="rounded border-gray-300"
                      />
                      <Input
                        value={feature.name}
                        onChange={(e) => {
                          const newFeatures = [...selectedTier.features]
                          newFeatures[index].name = e.target.value
                          setSelectedTier({...selectedTier, features: newFeatures})
                        }}
                        className="flex-1"
                      />
                      <Button
                        size="icon"
                        variant="ghost"
                        className="text-destructive hover:text-destructive"
                        onClick={() => {
                          const newFeatures = selectedTier.features.filter((_, i) => i !== index)
                          setSelectedTier({...selectedTier, features: newFeatures})
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTierDialog(false)}>Cancel</Button>
            <Button onClick={() => {
              if (selectedTier) {
                setTiers(tiers.map(t => t.id === selectedTier.id ? selectedTier : t))
                toast.success(`${selectedTier.name} tier updated successfully`)
                setEditTierDialog(false)
              }
            }}>
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
