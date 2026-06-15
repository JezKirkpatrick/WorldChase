import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAuthClient } from '@/lib/supabase-server'
import { createClient } from '@supabase/supabase-js'
import { anthropic } from '@/lib/anthropic'
import { calculateScore } from '@/lib/scoring'
import { sendPushToUser } from '@/lib/pushNotifications'

export const dynamic = 'force-dynamic'

// ── DB-backed rate limit: max 10 AI calls per user per minute ──────────
// Uses the guesses table (already written to on every attempt) so the
// limit works correctly across all Vercel function instances.
async function checkRateLimit(supabase: any, userId: string): Promise<boolean> {
  const since = new Date(Date.now() - 60_000).toISOString()
  const { count } = await supabase
    .from('guesses')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', userId)
    .eq('is_correct', false)
    .gte('created_at', since)
  return (count ?? 0) < 10
}

function keywordMatch(guess: string, keywords: string[]): boolean {
  const g      = guess.toLowerCase().trim()
  const gWords = g.split(/[\s,]+/).filter(Boolean)

  return keywords.some(k => {
    const kw      = k.toLowerCase().trim()
    const kwWords = kw.split(/[\s,]+/).filter(Boolean)
    if (g === kw) return true
    return kwWords.every(w => gWords.includes(w))
  })
}

export async function POST(req: NextRequest) {
  // Verify the caller's identity from their session cookie — never trust body userId
  const authClient = createAuthClient()
  const { data: { user } } = await authClient.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const userId = user.id

  const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  try {
    const { guessText, challengeId } = await req.json()
    if (!guessText || !challengeId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const [challengeRes, progressRes] = await Promise.all([
      supabase.from('challenges').select('*').eq('id', challengeId).single(),
      supabase.from('player_progress').select('*').eq('challenge_id', challengeId).eq('user_id', userId).maybeSingle(),
    ])

    if (challengeRes.error || !challengeRes.data) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })

    const challenge = challengeRes.data

    // Auto-create progress row if missing (race condition with useGameState on first load)
    let progress = progressRes.data
    if (!progress) {
      const { data: created, error: upsertErr } = await supabase.from('player_progress').upsert({
        user_id: userId, event_id: challenge.event_id, challenge_id: challengeId,
        status: 'active', started_at: new Date().toISOString(),
      }, { onConflict: 'user_id,challenge_id' }).select().single()
      if (!created) return NextResponse.json({ error: 'Progress not found', detail: upsertErr?.message }, { status: 404 })
      progress = created
    }

    const maxAttempts = challenge.difficulty === 'easy' ? 10 : 5
    if (progress.attempts >= maxAttempts) return NextResponse.json({ error: 'Max attempts reached' }, { status: 400 })

    const quickMatch = keywordMatch(guessText, challenge.answer_keywords ?? [])

    let is_correct: boolean
    let feedback: string
    let confidence: number

    if (quickMatch) {
      is_correct = true
      feedback   = 'Confirmed! Your geographical instincts are razor sharp.'
      confidence = 1.0
    } else {
      if (!await checkRateLimit(supabase, userId)) {
        return NextResponse.json({ error: 'Too many attempts — wait a moment and try again.' }, { status: 429 })
      }
      const aiResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        messages: [{
          role: 'user',
          content: `Geography game judge. Correct location: "${challenge.location_name}, ${challenge.location_country}". Player answered: "${guessText}". Keywords: ${JSON.stringify(challenge.answer_keywords)}. Is this correct? Be generous with spelling/transliterations. Reply ONLY valid JSON: {"is_correct":true,"feedback":"one energetic sentence — congratulate if correct, tiny non-spoiler nudge if wrong, never reveal answer","confidence":0.9}`
        }],
      })

      const raw     = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '{}'
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      let result: any = {}
      try { result = JSON.parse(cleaned) } catch { /* fall through to safe defaults */ }
      // Strict boolean — !! would convert the string "false" to true, marking wrong answers correct
      is_correct  = result.is_correct === true
      feedback    = typeof result.feedback === 'string' ? result.feedback : (is_correct ? 'Correct!' : 'Not quite — keep hunting.')
      confidence  = typeof result.confidence === 'number' ? result.confidence : (is_correct ? 1.0 : 0.0)
    }

    await supabase.from('guesses').insert({
      user_id: userId, challenge_id: challengeId,
      guess_text: guessText, is_correct, ai_feedback: feedback, ai_confidence: confidence,
    })

    const newAttempts  = progress.attempts + 1
    const wrongAttempts = is_correct ? newAttempts - 1 : newAttempts

    if (is_correct) {
      const timeTaken = progress.started_at
        ? Math.floor((Date.now() - new Date(progress.started_at).getTime()) / 1000)
        : 0
      const score       = calculateScore(challenge.difficulty, progress.clues_revealed, wrongAttempts, timeTaken)
      const tokenReward = challenge.difficulty === 'easy' ? 0 : 1

      const progressUpdate = supabase.from('player_progress').update({
        status: 'completed', attempts: newAttempts, score_earned: score.finalScore,
        completed_at: new Date().toISOString(), time_taken_seconds: timeTaken,
        speed_bonus_earned: score.speedMultiplier > 1.0,
      }).eq('id', progress.id)

      // Fetch current leaderboard entry so we can increment atomically
      const { data: lbEntry } = await supabase
        .from('leaderboard')
        .select('total_score, challenges_completed')
        .eq('user_id', userId)
        .eq('event_id', challenge.event_id)
        .maybeSingle()

      const leaderboardUpsert = supabase.from('leaderboard').upsert({
        user_id:              userId,
        event_id:             challenge.event_id,
        total_score:          (lbEntry?.total_score          ?? 0) + score.finalScore,
        challenges_completed: (lbEntry?.challenges_completed ?? 0) + 1,
      }, { onConflict: 'user_id,event_id' })

      if (tokenReward > 0) {
        await Promise.all([
          progressUpdate,
          supabase.rpc('adjust_tokens', { p_user_id: userId, p_amount: tokenReward }),
          supabase.from('token_transactions').insert({
            user_id: userId, type: 'earned_round', amount: tokenReward, challenge_id: challengeId,
            description: `Completed round: ${challenge.location_name}`,
          }),
          leaderboardUpsert,
        ])
      } else {
        await Promise.all([progressUpdate, leaderboardUpsert])
      }

      const { data: profileData } = await supabase.from('profiles').select('tokens').eq('id', userId).maybeSingle()

      // Notify players who just got overtaken (fire-and-forget, don't block response)
      try {
        const { data: newRankData } = await supabase
          .from('leaderboard')
          .select('rank')
          .eq('user_id', userId)
          .eq('event_id', challenge.event_id)
          .single()
        if (newRankData?.rank) {
          // Find players we just passed (rank was between their old rank and new rank)
          const { data: overtaken } = await supabase
            .from('leaderboard')
            .select('user_id, rank')
            .eq('event_id', challenge.event_id)
            .gte('rank', newRankData.rank)
            .lt('rank', newRankData.rank + 3)
            .neq('user_id', userId)
          if (overtaken?.length) {
            const { data: myProfile } = await supabase.from('profiles').select('username, display_name').eq('id', userId).single()
            const myName = myProfile?.display_name || myProfile?.username || 'A hunter'
            await Promise.allSettled(
              overtaken.map(entry =>
                sendPushToUser(entry.user_id, '⚡ You\'ve been overtaken!', `${myName} just jumped ahead of you on the leaderboard. Fight back!`, '/leaderboard')
              )
            )
          }
        }
      } catch { /* push notifications are non-critical */ }

      return NextResponse.json({ is_correct: true, feedback, score, newTokenBalance: profileData?.tokens ?? null })
    } else {
      await supabase.from('player_progress').update({ attempts: newAttempts }).eq('id', progress.id)
      return NextResponse.json({ is_correct: false, feedback })
    }
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
