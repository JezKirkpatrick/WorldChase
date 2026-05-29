/**
 * Run a SQL string against the Supabase project via the Management API.
 * Usage: node scripts/migrate.mjs "SELECT 1"
 *        node scripts/migrate.mjs "$(cat supabase/some.sql)"
 *
 * Reads SUPABASE_ACCESS_TOKEN and NEXT_PUBLIC_SUPABASE_URL from .env.local.
 */
import { readFileSync } from 'fs'
import { resolve } from 'path'

// Parse .env.local manually (no dotenv dependency needed)
const env = {}
try {
  const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
  for (const line of raw.split('\n')) {
    const m = line.match(/^([^#=]+)=["']?(.+?)["']?\s*$/)
    if (m) env[m[1].trim()] = m[2].trim()
  }
} catch {}

const PAT        = env.SUPABASE_ACCESS_TOKEN
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL

if (!PAT || !supabaseUrl) {
  console.error('Missing SUPABASE_ACCESS_TOKEN or NEXT_PUBLIC_SUPABASE_URL in .env.local')
  process.exit(1)
}

// Extract project ref from URL  e.g. https://abcxyz.supabase.co → abcxyz
const ref = new URL(supabaseUrl).hostname.split('.')[0]

let sql = process.argv[2]
if (!sql) { console.error('Usage: node scripts/migrate.mjs "<SQL or file.sql>"'); process.exit(1) }

// If arg looks like a file path, read it
if (sql.endsWith('.sql') || sql.includes('/') || sql.includes('\\')) {
  sql = readFileSync(resolve(process.cwd(), sql), 'utf8')
}

const res = await fetch(`https://api.supabase.com/v1/projects/${ref}/database/query`, {
  method:  'POST',
  headers: { 'Authorization': `Bearer ${PAT}`, 'Content-Type': 'application/json' },
  body:    JSON.stringify({ query: sql }),
})

const body = await res.json()
if (!res.ok) {
  console.error('Migration failed:', body.message ?? JSON.stringify(body))
  process.exit(1)
}
console.log('✓ Migration applied')
if (Array.isArray(body) && body.length) console.log(JSON.stringify(body, null, 2))
process.exit(0)
