import { createClient } from '@supabase/supabase-js'

// New Supabase project - GreenoFig V2
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://xdzoikocriuvgkoenjqk.supabase.co'
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inhkem9pa29jcml1dmdrb2VuanFrIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzY0MTU3MywiZXhwIjoyMDc5MDAxNTczfQ.VqGsjMDc64LvrjxBJID7JDHREGj2TSLci-PZ7eb45JU'

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
})

// Auth helpers
export const signUp = async (email, password, metadata = {}) => {
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: metadata,
    },
  })
  return { data, error }
}

export const signIn = async (email, password) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })
  return { data, error }
}

export const signInWithGoogle = async () => {
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/auth/callback`,
    },
  })
  return { data, error }
}

export const signOut = async () => {
  const { error } = await supabase.auth.signOut()
  return { error }
}

export const resetPassword = async (email) => {
  const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  })
  return { data, error }
}

export const updatePassword = async (newPassword) => {
  const { data, error } = await supabase.auth.updateUser({
    password: newPassword,
  })
  return { data, error }
}

export const getSession = async () => {
  const { data: { session }, error } = await supabase.auth.getSession()
  return { session, error }
}

export const getUser = async () => {
  const { data: { user }, error } = await supabase.auth.getUser()
  return { user, error }
}

// Database helpers - User Profile
export const fetchProfile = async (userId) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .eq('id', userId)
    .single()
  return { data, error }
}

export const updateProfile = async (userId, updates) => {
  const { data, error } = await supabase
    .from('user_profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single()
  return { data, error }
}

export const fetchSubscription = async (userId) => {
  const { data, error } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', userId)
    .single()
  return { data, error }
}

// Pricing Plans
export const fetchPricingPlans = async () => {
  const { data, error } = await supabase
    .from('pricing_plans')
    .select('*')
    .order('display_order', { ascending: true })
  return { data, error }
}

// Features
export const fetchFeatures = async (planTier = null) => {
  let query = supabase
    .from('features')
    .select('*')
    .eq('is_active', true)
    .order('display_order', { ascending: true })

  if (planTier) {
    query = query.eq('plan_tier', planTier)
  }

  const { data, error } = await query
  return { data, error }
}

// Testimonials
export const fetchTestimonials = async (featured = false) => {
  let query = supabase
    .from('testimonials')
    .select('*')
    .eq('is_approved', true)
    .order('display_order', { ascending: true })

  if (featured) {
    query = query.eq('is_featured', true)
  }

  const { data, error } = await query
  return { data, error }
}

// Homepage Content
export const fetchHomepageContent = async () => {
  const { data, error } = await supabase
    .from('homepage_content')
    .select('*')
    .eq('is_active', true)
    .order('section_order', { ascending: true })
  return { data, error }
}

// Site Content (About, FAQ, etc.)
export const fetchSiteContent = async (pageKey) => {
  const { data, error } = await supabase
    .from('site_content')
    .select('*')
    .eq('page_key', pageKey)
    .single()
  return { data, error }
}

// Blog Posts
export const fetchBlogPosts = async (status = 'published', limit = 10) => {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('status', status)
    .order('published_at', { ascending: false })
    .limit(limit)
  return { data, error }
}

export const fetchBlogPost = async (slug) => {
  const { data, error } = await supabase
    .from('blog_posts')
    .select('*')
    .eq('slug', slug)
    .single()
  return { data, error }
}

// Blog Categories
export const fetchBlogCategories = async () => {
  const { data, error } = await supabase
    .from('blog_categories')
    .select('*')
    .order('name', { ascending: true })
  return { data, error }
}

// AI helpers
export const fetchAISettings = async () => {
  const { data, error } = await supabase
    .from('ai_coach_settings')
    .select('*')
    .eq('is_active', true)
    .single()
  return { data, error }
}

export const saveAIChatHistory = async (userId, message, response, provider) => {
  const { data, error } = await supabase
    .from('ai_chat_history')
    .insert({
      user_id: userId,
      message,
      response,
      provider,
    })
    .select()
    .single()
  return { data, error }
}

export const fetchAIChatHistory = async (userId, limit = 50) => {
  const { data, error } = await supabase
    .from('ai_chat_history')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit)
  return { data, error }
}

// Storage helpers
export const uploadFile = async (bucket, path, file) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .upload(path, file)
  return { data, error }
}

export const getPublicUrl = (bucket, path) => {
  const { data } = supabase.storage
    .from(bucket)
    .getPublicUrl(path)
  return data.publicUrl
}

export const deleteFile = async (bucket, path) => {
  const { data, error } = await supabase.storage
    .from(bucket)
    .remove([path])
  return { data, error }
}
