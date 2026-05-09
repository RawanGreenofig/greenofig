import { createClient } from '@supabase/supabase-js'
import { config as loadEnv } from 'dotenv'
import { resolve } from 'node:path'

loadEnv({ path: resolve(process.cwd(), '.env.local') })

const url = process.env.NEXT_PUBLIC_SUPABASE_URL
const key = process.env.SUPABASE_SERVICE_ROLE_KEY
const sb = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false }})

const targets = [
  { email: 'greenofig@gmail.com', role: 'admin' },
  { email: 'rawanothman21@gmail.com', role: 'nutritionist' },
]
const PWD = 'GreenDemo2025!'

for (const { email, role } of targets) {
  const { data: list } = await sb.auth.admin.listUsers({ perPage: 1000 })
  const user = list.users.find(u => u.email === email)
  if (!user) { console.log(`[${role}] not found`); continue }
  const { error } = await sb.auth.admin.updateUserById(user.id, { password: PWD, email_confirm: true })
  if (error) console.log(`[${role}] error:`, error.message)
  else console.log(`[${role}] ${email} password set to GreenDemo2025!`)
}
