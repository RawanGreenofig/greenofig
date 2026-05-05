/**
 * Leads Service - API operations for lead management and discount codes
 */

import { supabase, isSupabaseConfigured } from './supabase'

/**
 * Generate a unique discount code
 * @param {string} prefix - Code prefix (default: GREENOFIG)
 * @param {number} length - Random suffix length (default: 6)
 * @returns {string} Generated discount code
 */
export const generateDiscountCode = (prefix = 'GREENOFIG', length = 6) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let code = prefix
  for (let i = 0; i < length; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

/**
 * Create a new lead from popup/form submission
 * @param {Object} leadData - Lead information
 * @returns {Promise<{success: boolean, code?: string, error?: string}>}
 */
export const createLead = async (leadData) => {
  const code = generateDiscountCode()

  if (!isSupabaseConfigured()) {
    // Demo mode - return mock success
    return {
      success: true,
      code,
      lead: {
        id: 'demo-' + Date.now(),
        ...leadData,
        discount_code: code,
        created_at: new Date().toISOString()
      }
    }
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .insert({
        name: leadData.name.trim(),
        email: leadData.email.trim().toLowerCase(),
        phone: leadData.phone?.trim() || null,
        discount_code: code,
        discount_percentage: leadData.discount_percentage || 25,
        source: leadData.source || 'popup_discount',
        status: 'new',
        user_id: leadData.user_id || null,
        metadata: {
          user_agent: typeof navigator !== 'undefined' ? navigator.userAgent : null,
          referrer: typeof document !== 'undefined' ? document.referrer : null,
          page: typeof window !== 'undefined' ? window.location.pathname : null,
          timestamp: new Date().toISOString(),
          ...leadData.metadata
        }
      })
      .select()
      .single()

    if (error) throw error

    return { success: true, code, lead: data }
  } catch (error) {
    console.error('Error creating lead:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Validate a discount code
 * @param {string} code - Discount code to validate
 * @returns {Promise<{valid: boolean, percentage?: number, email?: string, error?: string}>}
 */
export const validateDiscountCode = async (code) => {
  if (!code) {
    return { valid: false, error: 'No code provided' }
  }

  // Check localStorage for locally stored discount
  const stored = localStorage.getItem('greenofig_discount_claimed')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (parsed.code === code) {
        // Check if already used from localStorage
        if (parsed.used) {
          return { valid: false, error: 'This discount code has already been used' }
        }
        return { valid: true, percentage: 25, email: parsed.email, isLocal: true }
      }
    } catch (e) {
      // Invalid stored data, continue with database check
    }
  }

  if (!isSupabaseConfigured()) {
    // Demo mode - accept any GREENOFIG prefixed code
    if (code.startsWith('GREENOFIG')) {
      return { valid: true, percentage: 25 }
    }
    return { valid: false, error: 'Invalid discount code' }
  }

  try {
    // Use the database function for validation
    const { data, error } = await supabase.rpc('validate_discount_code', {
      code: code.toUpperCase()
    })

    if (error) throw error

    if (!data || data.length === 0) {
      return { valid: false, error: 'Invalid discount code' }
    }

    const result = data[0]
    if (!result.valid) {
      return { valid: false, error: 'This discount code has already been used' }
    }

    return {
      valid: true,
      percentage: result.percentage,
      email: result.lead_email
    }
  } catch (error) {
    console.error('Error validating discount code:', error)
    return { valid: false, error: 'Unable to validate code' }
  }
}

/**
 * Mark a discount code as used
 * @param {string} code - Discount code to mark as used
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const useDiscountCode = async (code) => {
  if (!code) {
    return { success: false, error: 'No code provided' }
  }

  // Update localStorage if it was a local discount
  const stored = localStorage.getItem('greenofig_discount_claimed')
  if (stored) {
    try {
      const parsed = JSON.parse(stored)
      if (parsed.code === code) {
        localStorage.setItem('greenofig_discount_claimed', JSON.stringify({
          ...parsed,
          used: true,
          usedAt: new Date().toISOString()
        }))
      }
    } catch (e) {
      // Ignore localStorage errors
    }
  }

  if (!isSupabaseConfigured()) {
    return { success: true }
  }

  try {
    const { data, error } = await supabase.rpc('use_discount_code', {
      code: code.toUpperCase()
    })

    if (error) throw error

    return { success: data === true }
  } catch (error) {
    console.error('Error using discount code:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get all leads (admin only)
 * @param {Object} options - Query options
 * @returns {Promise<{data: Array, count: number, error?: string}>}
 */
export const getLeads = async (options = {}) => {
  const {
    page = 1,
    limit = 20,
    status = null,
    source = null,
    search = null,
    sortBy = 'created_at',
    sortOrder = 'desc'
  } = options

  if (!isSupabaseConfigured()) {
    // Return demo data
    return {
      data: getDemoLeads(),
      count: 5
    }
  }

  try {
    let query = supabase
      .from('leads')
      .select('*', { count: 'exact' })

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (source && source !== 'all') {
      query = query.eq('source', source)
    }
    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,discount_code.ilike.%${search}%`)
    }

    // Apply sorting
    query = query.order(sortBy, { ascending: sortOrder === 'asc' })

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1
    query = query.range(from, to)

    const { data, error, count } = await query

    if (error) throw error

    return { data: data || [], count: count || 0 }
  } catch (error) {
    console.error('Error fetching leads:', error)
    return { data: [], count: 0, error: error.message }
  }
}

/**
 * Get a single lead by ID
 * @param {string} id - Lead ID
 * @returns {Promise<{data: Object|null, error?: string}>}
 */
export const getLead = async (id) => {
  if (!isSupabaseConfigured()) {
    const demoLeads = getDemoLeads()
    return { data: demoLeads.find(l => l.id === id) || null }
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .select('*')
      .eq('id', id)
      .single()

    if (error) throw error

    return { data }
  } catch (error) {
    console.error('Error fetching lead:', error)
    return { data: null, error: error.message }
  }
}

/**
 * Update a lead
 * @param {string} id - Lead ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<{success: boolean, data?: Object, error?: string}>}
 */
export const updateLead = async (id, updates) => {
  if (!isSupabaseConfigured()) {
    return { success: true, data: { id, ...updates } }
  }

  try {
    const { data, error } = await supabase
      .from('leads')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) throw error

    return { success: true, data }
  } catch (error) {
    console.error('Error updating lead:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Delete a lead (super admin only)
 * @param {string} id - Lead ID
 * @returns {Promise<{success: boolean, error?: string}>}
 */
export const deleteLead = async (id) => {
  if (!isSupabaseConfigured()) {
    return { success: true }
  }

  try {
    const { error } = await supabase
      .from('leads')
      .delete()
      .eq('id', id)

    if (error) throw error

    return { success: true }
  } catch (error) {
    console.error('Error deleting lead:', error)
    return { success: false, error: error.message }
  }
}

/**
 * Get lead statistics (admin dashboard)
 * @returns {Promise<Object>}
 */
export const getLeadStats = async () => {
  if (!isSupabaseConfigured()) {
    return {
      total: 5,
      new: 3,
      contacted: 1,
      converted: 1,
      conversionRate: 20,
      thisWeek: 3,
      thisMonth: 5
    }
  }

  try {
    // Get counts by status
    const { data: statusCounts, error: statusError } = await supabase
      .from('leads')
      .select('status')

    if (statusError) throw statusError

    const counts = {
      total: statusCounts?.length || 0,
      new: 0,
      contacted: 0,
      converted: 0,
      unsubscribed: 0
    }

    statusCounts?.forEach(lead => {
      if (counts[lead.status] !== undefined) {
        counts[lead.status]++
      }
    })

    // Calculate conversion rate
    const conversionRate = counts.total > 0
      ? Math.round((counts.converted / counts.total) * 100)
      : 0

    // Get this week's leads
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)

    const { count: thisWeek } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', weekAgo.toISOString())

    // Get this month's leads
    const monthAgo = new Date()
    monthAgo.setMonth(monthAgo.getMonth() - 1)

    const { count: thisMonth } = await supabase
      .from('leads')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthAgo.toISOString())

    return {
      ...counts,
      conversionRate,
      thisWeek: thisWeek || 0,
      thisMonth: thisMonth || 0
    }
  } catch (error) {
    console.error('Error fetching lead stats:', error)
    return {
      total: 0,
      new: 0,
      contacted: 0,
      converted: 0,
      conversionRate: 0,
      thisWeek: 0,
      thisMonth: 0
    }
  }
}

/**
 * Export leads to CSV
 * @param {Array} leads - Array of lead objects
 * @returns {string} CSV string
 */
export const exportLeadsToCSV = (leads) => {
  const headers = [
    'Name',
    'Email',
    'Phone',
    'Discount Code',
    'Discount %',
    'Used',
    'Status',
    'Source',
    'Created At'
  ]

  const rows = leads.map(lead => [
    lead.name,
    lead.email,
    lead.phone || '',
    lead.discount_code,
    lead.discount_percentage,
    lead.discount_used ? 'Yes' : 'No',
    lead.status,
    lead.source,
    new Date(lead.created_at).toLocaleDateString()
  ])

  const csvContent = [
    headers.join(','),
    ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
  ].join('\n')

  return csvContent
}

/**
 * Download leads as CSV file
 * @param {Array} leads - Array of lead objects
 * @param {string} filename - File name (default: leads-export.csv)
 */
export const downloadLeadsCSV = (leads, filename = 'leads-export.csv') => {
  const csv = exportLeadsToCSV(leads)
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
  const link = document.createElement('a')
  link.href = URL.createObjectURL(blob)
  link.download = filename
  link.click()
  URL.revokeObjectURL(link.href)
}

// Demo data for development/testing
const getDemoLeads = () => [
  {
    id: 'demo-1',
    name: 'John Smith',
    email: 'john.smith@example.com',
    phone: '+1 555-123-4567',
    discount_code: 'GREENOFIG7X9K2P',
    discount_percentage: 25,
    discount_used: false,
    status: 'new',
    source: 'popup_discount',
    created_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { page: '/', referrer: 'google.com' }
  },
  {
    id: 'demo-2',
    name: 'Sarah Johnson',
    email: 'sarah.j@example.com',
    phone: '+1 555-987-6543',
    discount_code: 'GREENOFIGM3N8Q1',
    discount_percentage: 25,
    discount_used: true,
    discount_used_at: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    status: 'converted',
    source: 'popup_discount',
    created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { page: '/pricing', referrer: 'facebook.com' }
  },
  {
    id: 'demo-3',
    name: 'Mike Wilson',
    email: 'mike.w@example.com',
    phone: null,
    discount_code: 'GREENOFIGR5T2W8',
    discount_percentage: 25,
    discount_used: false,
    status: 'contacted',
    source: 'popup_discount',
    created_at: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
    metadata: { page: '/features' }
  },
  {
    id: 'demo-4',
    name: 'Emily Davis',
    email: 'emily.d@example.com',
    phone: '+1 555-456-7890',
    discount_code: 'GREENOFIGK9L4M7',
    discount_percentage: 25,
    discount_used: false,
    status: 'new',
    source: 'popup_discount',
    created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
    metadata: { page: '/', referrer: 'instagram.com' }
  },
  {
    id: 'demo-5',
    name: 'Alex Chen',
    email: 'alex.chen@example.com',
    phone: '+1 555-321-0987',
    discount_code: 'GREENOFIGP2S6Y3',
    discount_percentage: 25,
    discount_used: false,
    status: 'new',
    source: 'popup_discount',
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    metadata: { page: '/pricing', referrer: 'twitter.com' }
  }
]
