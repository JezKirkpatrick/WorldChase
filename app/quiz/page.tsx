export const dynamic = 'force-dynamic'

import { getUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase-server'
import GlobalNav from '@/components/ui/GlobalNav'
import GeoQuizClient from '@/components/geo-quiz/GeoQuizClient'

export default async function QuizPage() {
  const supabase = createClient()
  const user = await getUser()

  const today = new Date().toISOString().split('T')[0]

  // Load today's daily quiz first; fall back to most recent live/upcoming
  const { data: quizzes } = await supabase
    .from('geo_quizzes')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(10)

  const all = quizzes ?? []
  const quiz =
    all.find(q => q.quiz_date === today) ??
    all.find(q => q.status === 'live') ??
    all.find(q => q.status === 'upcoming') ??
    all[0] ?? null

  let initialAnswers: Record<number, any> = {}
  let alreadyCompleted = false

  if (user && quiz && quiz.status === 'live') {
    const { data: answers } = await supabase
      .from('geo_quiz_answers')
      .select('question_index, answer, is_correct, answer_time_ms, points_earned')
      .eq('quiz_id', quiz.id)
      .eq('user_id', user.id)

    for (const a of answers ?? []) {
      initialAnswers[a.question_index] = {
        answer: a.answer,
        is_correct: a.is_correct,
        answer_time_ms: a.answer_time_ms,
        points_earned: a.points_earned,
      }
    }

    alreadyCompleted = Object.keys(initialAnswers).length >= (quiz.questions?.length ?? 20)
  }

  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />
      <GeoQuizClient
        initialQuiz={quiz}
        userId={user?.id ?? null}
        initialAnswers={initialAnswers}
        alreadyCompleted={alreadyCompleted}
      />
    </div>
  )
}
