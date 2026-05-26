import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { anthropic } from '@/lib/anthropic'
import { calculateScore } from '@/lib/scoring'

export const dynamic = 'force-dynamic'

// ── Simple in-memory rate limiter: max 10 AI calls per user per minute ──
const aiCallLog = new Map<string, number[]>()
function checkRateLimit(userId: string): boolean {
  const now   = Date.now()
  const cutoff = now - 60_000
  const calls  = (aiCallLog.get(userId) ?? []).filter(t => t > cutoff)
  if (calls.length >= 10) return false
  aiCallLog.set(userId, [...calls, now])
  return true
}

function keywordMatch(guess: string, keywords: string[]): boolean {
  const g      = guess.toLowerCase().trim()
  const gWords = g.split(/[\s,]+/).filter(Boolean)

  return keywords.some(k => {
    const kw      = k.toLowerCase().trim()
    const kwWords = kw.split(/[\s,]+/).filter(Boolean)

    // Exact full match
    if (g === kw) return true

    // Every word in the keyword must appear as a whole word in the guess.
    // e.g. guess "paris france" matches keyword "paris" ✓
    //      guess "france"       does NOT match keyword "paris" ✗
    //      guess "france"       does NOT match keyword "paris, france" ✗ (paris missing)
    return kwWords.every(w => gWords.includes(w))
  })
}

export async function POST(req: NextRequest) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  try {
    const { guessText, challengeId, userId } = await req.json()
    if (!guessText || !challengeId || !userId) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
    }

    const [challengeRes, progressRes] = await Promise.all([
      supabase.from('challenges').select('*').eq('id', challengeId).single(),
      supabase.from('player_progress').select('*').eq('challenge_id', challengeId).eq('user_id', userId).single(),
    ])

    if (challengeRes.error || !challengeRes.data) return NextResponse.json({ error: 'Challenge not found' }, { status: 404 })
    if (progressRes.error || !progressRes.data) return NextResponse.json({ error: 'Progress not found' }, { status: 404 })

    const challenge = challengeRes.data
    const progress = progressRes.data

    if (progress.attempts >= 5) return NextResponse.json({ error: 'Max attempts reached' }, { status: 400 })

    // Free keyword check — skip AI if obvious match
    const quickMatch = keywordMatch(guessText, challenge.answer_keywords ?? [])

    let is_correct: boolean
    let feedback: string
    let confidence: number

    if (quickMatch) {
      is_correct = true
      feedback = 'Confirmed! Your geographical instincts are razor sharp.'
      confidence = 1.0
    } else {
      // Rate limit AI calls
      if (!checkRateLimit(userId)) {
        return NextResponse.json({ error: 'Too many attempts — wait a moment and try again.' }, { status: 429 })
      }
      // Only call AI for ambiguous guesses — use Haiku (10x cheaper than Sonnet)
      const aiResponse = await anthropic.messages.create({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 120,
        messages: [{
          role: 'user',
          content: `Geography game judge. Correct location: "${challenge.location_name}, ${challenge.location_country}". Player answered: "${guessText}". Keywords: ${JSON.stringify(challenge.answer_keywords)}. Is this correct? Be generous with spelling/transliterations. Reply ONLY valid JSON: {"is_correct":true,"feedback":"one energetic sentence — congratulate if correct, tiny non-spoiler nudge if wrong, never reveal answer","confidence":0.9}`
        }],
      })

      const raw = aiResponse.content[0].type === 'text' ? aiResponse.content[0].text : '{}'
      const cleaned = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '').trim()
      const result = JSON.parse(cleaned)
      is_correct = result.is_correct
      feedback = result.feedback
      confidence = result.confidence
    }

    await supabase.from('guesses').insert({
      user_id: userId, challenge_id: challengeId,
      guess_text: guessText, is_correct, ai_feedback: feedback, ai_confidence: confidence,
    })

    const newAttempts = progress.attempts + 1
    const wrongAttempts = is_correct ? newAttempts - 1 : newAttempts

    if (is_correct) {
      const timeTaken = progress.started_at
        ? Math.floor((Date.now() - new Date(progress.started_at).getTime()) / 1000)
        : 0
      const score = calculateScore(challenge.difficulty, progress.clues_revealed, wrongAttempts, timeTaken)

      await Promise.all([
        supabase.from('player_progress').update({
          status: 'completed', attempts: newAttempts, score_earned: score.finalScore,
          completed_at: new Date().toISOString(), time_taken_seconds: timeTaken,
          speed_bonus_earned: score.speedBonus > 0,
        }).eq('id', progress.id),
        supabase.rpc('adjust_tokens', { p_user_id: userId, p_amount: 1 }),
        supabase.from('token_transactions').insert({
          user_id: userId, type: 'earned_round', amount: 1, challenge_id: challengeId,
          description: `Completed round: ${challenge.location_name}`,
        }),
        supabase.rpc('update_player_leaderboard', {
          p_user_id: userId, p_event_id: challenge.event_id, p_score: score.finalScore,
        }),
      ])

      return NextResponse.json({ is_correct: true, feedback, score })
    } else {
      await supabase.from('player_progress').update({ attempts: newAttempts }).eq('id', progress.id)
      return NextResponse.json({ is_correct: false, feedback })
    }
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
