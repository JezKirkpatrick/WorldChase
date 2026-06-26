import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { anthropic } from '@/lib/anthropic'

export const dynamic = 'force-dynamic'

// Guarantee truly random answer positions regardless of what Claude outputs
function shuffleOptions(questions: any[]): any[] {
  return questions.map(q => {
    const correctAnswer = q.options[q.correct]
    const opts = [...q.options]
    for (let i = opts.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [opts[i], opts[j]] = [opts[j], opts[i]]
    }
    return { ...q, options: opts, correct: opts.indexOf(correctAnswer) }
  })
}

export async function GET(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET) return NextResponse.json({ error: 'Server misconfigured' }, { status: 500 })
  if (auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const service = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  try {
    const today = new Date().toISOString().split('T')[0]

    // Idempotent — skip if today's quiz already exists
    const { data: existing } = await service
      .from('geo_quizzes')
      .select('id')
      .eq('quiz_date', today)
      .maybeSingle()

    if (existing) {
      return NextResponse.json({ message: 'Already exists', quizId: existing.id })
    }

    // Get active event for leaderboard scoring
    const { data: event } = await service
      .from('monthly_events')
      .select('id')
      .eq('status', 'active')
      .maybeSingle()

    // Complete yesterday's daily quiz
    const yesterday = new Date(Date.now() - 86_400_000).toISOString().split('T')[0]
    await service
      .from('geo_quizzes')
      .update({ status: 'completed', ended_at: new Date().toISOString() })
      .eq('quiz_date', yesterday)
      .eq('status', 'live')

    // Fetch last 14 days of questions so we never repeat them
    const { data: recentQuizzes } = await service
      .from('geo_quizzes')
      .select('questions')
      .neq('quiz_date', today)
      .order('quiz_date', { ascending: false })
      .limit(14)

    const recentQTexts: string[] = []
    for (const quiz of recentQuizzes ?? []) {
      for (const q of (quiz.questions as any[] ?? [])) {
        if (q?.question) recentQTexts.push(q.question)
      }
    }

    // Rotating daily theme — cycles through 7 distinct focus areas
    const DAILY_THEMES = [
      'Focus heavily on African and Middle Eastern geography — countries, rivers, capitals, deserts.',
      'Focus heavily on Asian geography — South Asia, Southeast Asia, East Asia, Central Asia.',
      'Focus heavily on the Americas — North, Central, South America, Caribbean islands.',
      'Focus heavily on European geography — including lesser-known countries, rivers, regions.',
      'Focus heavily on Oceania, Pacific islands, polar regions, and extreme geography.',
      'Focus heavily on physical geography worldwide — mountain ranges, rivers, lakes, oceans, climate zones.',
      'Mix of geography world records, historical place names, enclaves, disputed territories, and flags.',
    ]
    const dayOfWeek = new Date().getDay() // 0-6
    const todayTheme = DAILY_THEMES[dayOfWeek]

    const avoidBlock = recentQTexts.length > 0
      ? `\n\nDO NOT use or rephrase any of these questions from recent days:\n${recentQTexts.map((q, i) => `${i + 1}. ${q}`).join('\n')}`
      : ''

    // Generate 20 questions
    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 4000,
      messages: [{
        role: 'user',
        content: `Generate exactly 20 challenging geography trivia questions for today's daily quiz (${today}). Players are geography enthusiasts, so questions must be genuinely difficult.

TODAY'S THEME: ${todayTheme}

Mix these categories across the 20 questions:
- Obscure world capitals and country seats of government
- Physical geography: rivers, lakes, mountains, deserts, oceans
- Country borders, territories, and enclaves
- Island nations and archipelagos
- Geography records (deepest, highest, longest, largest, smallest)
- Historical and renamed places
- Time zones and hemispheres
- Flags and emblems (describe colors/patterns — no images)
- Population and demographic geography
- Extreme and unusual geography

Rules:
- Exactly 4 answer options per question (just the text — no A/B/C/D labels)
- One unambiguously correct answer
- Wrong options must be plausible but clearly incorrect to an expert
- No trick questions — straightforward factual geography
- Avoid very easy questions (Eiffel Tower in Paris, etc.)
- CRITICAL: The correct answer must be placed at a DIFFERENT random position in each question. Vary "correct" across 0, 1, 2, and 3 — do NOT use 0 for every question. Spread answers so positions 0, 1, 2, and 3 each appear roughly 5 times.
- Every question must be completely different in topic and wording from all others in this set${avoidBlock}

Respond with ONLY a valid JSON array — no markdown, no commentary:
[
  {
    "id": 0,
    "question": "Which country has the most UNESCO World Heritage Sites?",
    "options": ["France", "Spain", "China", "Italy"],
    "correct": 2,
    "category": "World Records"
  }
]
Generate all 20 questions. Start from id 0.`,
      }],
    })

    const raw = response.content[0].type === 'text' ? response.content[0].text : '[]'
    const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
    const questions = shuffleOptions(JSON.parse(cleaned))

    const label = new Date().toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })
    const { data: quiz, error } = await service
      .from('geo_quizzes')
      .insert({
        title: `Daily Geo Quiz — ${label}`,
        quiz_date: today,
        scheduled_at: new Date().toISOString(),
        status: 'live',
        questions,
        event_id: event?.id ?? null,
      })
      .select()
      .maybeSingle()

    if (error) throw error

    return NextResponse.json({ success: true, quizId: quiz.id, date: today })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
