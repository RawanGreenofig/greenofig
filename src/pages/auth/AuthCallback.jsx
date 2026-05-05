import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { PageLoader } from '@/components/layout/PageLoader'

export default function AuthCallback() {
  const navigate = useNavigate()

  useEffect(() => {
    const handleCallback = async () => {
      if (!isSupabaseConfigured()) {
        navigate('/app/dashboard', { replace: true })
        return
      }

      try {
        // Get the session from the URL hash
        const { data: { session }, error } = await supabase.auth.getSession()

        if (error) {
          console.error('Auth callback error:', error)
          navigate('/login?error=auth_failed', { replace: true })
          return
        }

        if (session) {
          // Check if user profile exists, if not create one
          const { data: profile } = await supabase
            .from('user_profiles')
            .select('id')
            .eq('id', session.user.id)
            .single()

          if (!profile) {
            // Create user profile for new Google sign-in users
            const { error: profileError } = await supabase
              .from('user_profiles')
              .insert({
                id: session.user.id,
                email: session.user.email,
                full_name: session.user.user_metadata?.full_name || session.user.user_metadata?.name || 'User',
                profile_picture_url: session.user.user_metadata?.avatar_url || session.user.user_metadata?.picture || null,
                role: 'basic_user',
                tier: 'Base',
                subscription_tier: 'Base',
                is_active: true,
                community_points: 0,
              })

            if (profileError) {
              console.error('Error creating profile:', profileError)
            }

            // Create onboarding checklist for new user
            await supabase.from('onboarding_checklist').insert({
              user_id: session.user.id,
            })

            // Create notification preferences for new user
            await supabase.from('notification_preferences').insert({
              user_id: session.user.id,
            })
          }

          navigate('/app/dashboard', { replace: true })
        } else {
          navigate('/login', { replace: true })
        }
      } catch (error) {
        console.error('Auth callback error:', error)
        navigate('/login?error=auth_failed', { replace: true })
      }
    }

    handleCallback()
  }, [navigate])

  return <PageLoader />
}
