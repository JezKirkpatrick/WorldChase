import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { anthropic } from '@/lib/anthropic'
import { DAILY_COUNTRIES } from '@/lib/countries'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const tomorrow = new Date()
    tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
    const tomorrowStr = tomorrow.toISOString().split('T')[0]

    // Idempotent — skip if already picked
    const { data: existing } = await supabase
      .from('daily_flags')
      .select('country_code')
      .eq('date', tomorrowStr)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ message: 'Already picked', date: tomorrowStr, country: existing.country_code })
    }

    // Get last 90 days to avoid repeats
    const ninetyDaysAgo = new Date()
    ninetyDaysAgo.setUTCDate(ninetyDaysAgo.getUTCDate() - 90)
    const { data: recentFlags } = await supabase
      .from('daily_flags')
      .select('date, country_code, country_name')
      .gte('date', ninetyDaysAgo.toISOString().split('T')[0])
      .order('date', { ascending: false })

    const recentCodes = new Set((recentFlags ?? []).map(f => f.country_code.toLowerCase()))
    const available = DAILY_COUNTRIES.filter(c => !recentCodes.has(c.code.toLowerCase()))
    const pool = available.length >= 10 ? available : DAILY_COUNTRIES

    const recentList = (recentFlags ?? []).slice(0, 14)
      .map(f => `${f.date}: ${f.country_name}`).join('\n') || 'None yet'
    const poolList = pool.map(c => `${c.code}: ${c.name}`).join('\n')

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 200,
      messages: [{
        role: 'user',
        content: `Pick tomorrow's daily flag puzzle country for a world geography game (adult players).

Recent picks — avoid repeating these:
${recentList}

Choose ONE from this exact list:
${poolList}

Selection criteria:
- Visually interesting flag (good as a jigsaw — distinct colours, patterns, emblems)
- Vary continents over time (Africa, Asia, Americas, Europe, Oceania)
- Avoid back-to-back similar flags (e.g. don't follow a plain tricolour with another)
- Prefer countries that teach players something interesting

Respond with ONLY valid JSON, nothing else:
{"country_code": "xx", "country_name": "Country Name"}`
      }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text.trim() : ''
    const parsed = JSON.parse(raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim())

    const match = DAILY_COUNTRIES.find(c => c.code.toLowerCase() === parsed.country_code?.toLowerCase())
    if (!match) throw new Error(`Unknown country code returned: ${parsed.country_code}`)

    await supabase.from('daily_flags').insert({
      date: tomorrowStr,
      country_code: match.code.toLowerCase(),
      country_name: match.name,
    })

    return NextResponse.json({ success: true, date: tomorrowStr, country: match.name })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
