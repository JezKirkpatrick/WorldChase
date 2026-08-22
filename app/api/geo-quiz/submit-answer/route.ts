import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase-server'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const QUESTION_MS = 20_000

export async function POST(req: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { quizId, questionIndex, answer, answerTimeMs } = await req.json()
    if (quizId === undefined || questionIndex === undefined || answer === undefined)
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 })

    const service = createSupabaseClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: quiz } = await service
      .from('geo_quizzes')
      .select('status, questions, event_id')
      .eq('id', quizId)
      .maybeSingle()

    if (!quiz) return NextResponse.json({ error: 'Quiz not found' }, { status: 404 })
    if (quiz.status !== 'live') return NextResponse.json({ error: 'Quiz not live' }, { status: 400 })

    // Prevent double-answering
    const { data: existing } = await service
      .from('geo_quiz_answers')
      .select('id')
      .eq('quiz_id', quizId)
      .eq('user_id', user.id)
      .eq('question_index', questionIndex)
      .maybeSingle()
    if (existing) return NextResponse.json({ error: 'Already answered' }, { status: 400 })

    const questions = quiz.questions as any[]
    const q = questions[questionIndex]
    if (!q) return NextResponse.json({ error: 'Question not found' }, { status: 404 })

    const is_correct = answer === q.correct
    const clampedTime = Math.min(Math.max(answerTimeMs ?? QUESTION_MS, 1000), QUESTION_MS)
    const points_earned = is_correct
      ? 100 + Math.floor(100 * (QUESTION_MS - clampedTime) / QUESTION_MS)
      : 0

    await service.from('geo_quiz_answers').insert({
      quiz_id: quizId,
      user_id: user.id,
      question_index: questionIndex,
      answer,
      is_correct,
      answer_time_ms: clampedTime,
      points_earned,
    })

    // On last question, add total quiz score to monthly event leaderboard
    const isLastQuestion = questionIndex === questions.length - 1
    if (isLastQuestion && quiz.event_id) {
      const { data: allAnswers } = await service
        .from('geo_quiz_answers')
        .select('points_earned')
        .eq('quiz_id', quizId)
        .eq('user_id', user.id)

      const totalQuizScore = (allAnswers ?? []).reduce((s: number, a: any) => s + (a.points_earned ?? 0), 0) + points_earned

      const { data: lbEntry } = await service
        .from('leaderboard')
        .select('total_score')
        .eq('user_id', user.id)
        .eq('event_id', quiz.event_id)
        .maybeSingle()

      // Live Geo Quiz score adds to the event leaderboard total (bonus content),
      // but must NOT bump challenges_completed — that field drives the "X/25" hunt
      // round-progress shown on the leaderboard, and a quiz session isn't a hunt round.
      // Was previously incrementing it by 1, silently inflating everyone's round count.
      await service.from('leaderboard').upsert({
        user_id: user.id,
        event_id: quiz.event_id,
        total_score: (lbEntry?.total_score ?? 0) + totalQuizScore,
      }, { onConflict: 'user_id,event_id' })
    }

    return NextResponse.json({
      correct: is_correct,
      pointsEarned: points_earned,
      correctAnswer: q.correct,
    })
  } catch (err: any) {
    console.error(err)
    return NextResponse.json({ error: err?.message ?? 'Internal error' }, { status: 500 })
  }
}
