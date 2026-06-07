import { NextRequest, NextResponse } from 'next/server'
import { anthropic } from '@/lib/anthropic'
import { createClient } from '@/lib/supabase-server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

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

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single()
    if (!profile?.is_admin) return NextResponse.json({ error: 'Forbidden' }, { status: 403 })

    const { quizId, title, scheduledAt, generateQuestions = false } = await req.json()
    if (!scheduledAt) return NextResponse.json({ error: 'Missing scheduledAt' }, { status: 400 })

    const service = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    let questions: any[] | undefined
    if (generateQuestions) {
      const response = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 4000,
        messages: [{
          role: 'user',
          content: `Generate exactly 20 challenging geography trivia questions for a competitive live quiz. Players are geography enthusiasts, so questions must be genuinely difficult.

Mix these categories evenly:
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
- Exactly 4 answer options per question (not A/B/C/D labels — just the text)
- One unambiguously correct answer
- Wrong options must be plausible but clearly incorrect to someone who knows geography
- No trick questions — straightforward factual geography
- Avoid very easy questions (Eiffel Tower in Paris, etc.)
- CRITICAL: The correct answer must be placed at a DIFFERENT random position in each question. Vary "correct" across 0, 1, 2, and 3 — do NOT use 0 for every question. Shuffle the options so the answer appears in positions 0, 1, 2 and 3 roughly equally across the 20 questions.

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
      questions = shuffleOptions(JSON.parse(cleaned))
    }

    let quiz
    if (quizId) {
      const update: any = { scheduled_at: scheduledAt }
      if (title) update.title = title
      if (questions) update.questions = questions
      const { data, error } = await service.from('geo_quizzes').update(update).eq('id', quizId).select().single()
      if (error) throw error
      quiz = data
    } else {
      const { data, error } = await service.from('geo_quizzes').insert({
        title: title || 'Geo Quiz',
        scheduled_at: scheduledAt,
        status: 'upcoming',
        questions: questions ?? [],
      }).select().single()
      if (error) throw error
      quiz = data
    }

    return NextResponse.json({ quiz })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
