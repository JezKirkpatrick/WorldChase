'use client'
import { useState, useEffect, useRef } from 'react'

const QUESTION_MS = 20_000
const REVEAL_MS = 2_000

type Phase = 'pre' | 'question' | 'reveal' | 'done'

interface Question {
  id: number
  question: string
  options: string[]
  correct: number
  category: string
}

interface GeoQuiz {
  id: string
  title: string
  quiz_date: string | null
  status: 'upcoming' | 'live' | 'completed'
  questions: Question[]
  event_id: string | null
}

interface AnswerRecord {
  answer: number
  is_correct: boolean
  answer_time_ms: number
  points_earned: number
  correctAnswer?: number
}

interface Props {
  initialQuiz: GeoQuiz | null
  userId: string | null
  initialAnswers: Record<number, AnswerRecord>
  alreadyCompleted: boolean
}

export default function GeoQuizClient({ initialQuiz, userId, initialAnswers, alreadyCompleted }: Props) {
  const numQs = initialQuiz?.questions?.length ?? 20

  const firstUnanswered = () => {
    for (let i = 0; i < numQs; i++) {
      if (initialAnswers[i] === undefined) return i
    }
    return 0
  }

  const [phase, setPhase] = useState<Phase>(() => {
    if (!initialQuiz || initialQuiz.status !== 'live') return 'pre'
    if (alreadyCompleted) return 'done'
    const answered = Object.keys(initialAnswers).length
    if (answered > 0 && answered < numQs) return 'question'
    return 'pre'
  })

  const [currentQ, setCurrentQ] = useState(() => alreadyCompleted ? 0 : firstUnanswered())
  const [timeLeft, setTimeLeft] = useState(QUESTION_MS)
  const [answers, setAnswers] = useState<Record<number, AnswerRecord>>(initialAnswers)
  const [submitting, setSubmitting] = useState(false)

  const timerRef = useRef<ReturnType<typeof setInterval>>()
  const questionStartRef = useRef<number>(0)
  // Refs to avoid stale closures inside the timer interval
  const quizRef = useRef(initialQuiz)
  const userIdRef = useRef(userId)
  quizRef.current = initialQuiz
  userIdRef.current = userId

  function advanceFrom(qIdx: number) {
    if (qIdx + 1 >= numQs) {
      setPhase('done')
    } else {
      setCurrentQ(qIdx + 1)
      setPhase('question')
    }
  }

  // Per-question countdown
  useEffect(() => {
    if (phase !== 'question') return
    questionStartRef.current = Date.now()
    setTimeLeft(QUESTION_MS)
    const capturedQ = currentQ

    timerRef.current = setInterval(() => {
      const elapsed = Date.now() - questionStartRef.current
      const remaining = Math.max(0, QUESTION_MS - elapsed)
      setTimeLeft(remaining)

      if (remaining === 0) {
        clearInterval(timerRef.current)
        const quiz = quizRef.current
        const uid = userIdRef.current

        // Mark timeout (functional update so we don't need answers in deps)
        setAnswers(prev => {
          if (prev[capturedQ] !== undefined) return prev
          return { ...prev, [capturedQ]: { answer: -1, is_correct: false, answer_time_ms: QUESTION_MS, points_earned: 0 } }
        })

        if (uid && quiz) {
          fetch('/api/geo-quiz/submit-answer', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ quizId: quiz.id, questionIndex: capturedQ, answer: -1, answerTimeMs: QUESTION_MS }),
          }).catch(() => {})
        }

        setPhase('reveal')
        setTimeout(() => advanceFrom(capturedQ), REVEAL_MS)
      }
    }, 50)

    return () => clearInterval(timerRef.current)
  }, [phase, currentQ]) // eslint-disable-line react-hooks/exhaustive-deps

  async function submitAnswer(optionIdx: number) {
    const quiz = quizRef.current
    const uid = userIdRef.current
    if (!quiz || answers[currentQ] !== undefined || submitting || phase !== 'question') return

    clearInterval(timerRef.current)
    const answerTimeMs = Math.min(Date.now() - questionStartRef.current, QUESTION_MS)
    const capturedQ = currentQ

    // Compute correctness immediately from client-side data — no waiting for API
    const q = quiz.questions?.[capturedQ]
    const isCorrect = q ? optionIdx === q.correct : false

    setAnswers(prev => ({
      ...prev,
      [capturedQ]: { answer: optionIdx, is_correct: isCorrect, answer_time_ms: answerTimeMs, points_earned: 0 },
    }))
    // Transition to reveal immediately — feedback shows without flicker
    setPhase('reveal')
    setTimeout(() => advanceFrom(capturedQ), REVEAL_MS)

    // Submit to API in background to persist score (points update during the reveal window)
    if (uid) {
      setSubmitting(true)
      try {
        const res = await fetch('/api/geo-quiz/submit-answer', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ quizId: quiz.id, questionIndex: capturedQ, answer: optionIdx, answerTimeMs }),
        })
        const data = await res.json()
        setAnswers(prev => ({
          ...prev,
          [capturedQ]: {
            ...prev[capturedQ],
            is_correct: data.correct ?? isCorrect,
            points_earned: data.pointsEarned ?? 0,
            correctAnswer: data.correctAnswer,
          },
        }))
      } catch { /* keep client-computed state */ }
      setSubmitting(false)
    }
  }

  const totalScore = Object.values(answers).reduce((s, a) => s + a.points_earned, 0)
  const correctCount = Object.values(answers).filter(a => a.is_correct).length

  if (!initialQuiz || phase === 'pre') {
    return (
      <PreView
        quiz={initialQuiz}
        userId={userId}
        onStart={() => { setCurrentQ(0); setPhase('question') }}
        resumeFrom={Object.keys(initialAnswers).length > 0 ? firstUnanswered() : null}
      />
    )
  }

  if (phase === 'done') {
    return (
      <DoneView
        quiz={initialQuiz}
        answers={answers}
        totalScore={totalScore}
        correctCount={correctCount}
        numQs={numQs}
        userId={userId}
      />
    )
  }

  const q = initialQuiz.questions?.[currentQ]
  if (!q) return <div className="text-center py-20 font-head text-text-muted">Loading...</div>

  const myAnswer = answers[currentQ]
  const timerPct = timeLeft / QUESTION_MS
  const timerColor = timerPct > 0.5 ? '#22c55e' : timerPct > 0.2 ? '#f5c518' : '#ef4444'
  const isReveal = phase === 'reveal'
  const LABELS = ['A', 'B', 'C', 'D']

  return (
    <div className="max-w-3xl mx-auto px-4 py-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <span className="font-head font-bold text-white">
            Q{currentQ + 1}<span className="text-text-muted">/{numQs}</span>
          </span>
          <span className="text-xs font-head text-text-muted border border-white/10 px-2 py-0.5 uppercase tracking-wider">
            {q.category}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="font-mono text-electric font-bold">{totalScore.toLocaleString()} pts</span>
          <span className="font-head text-xs text-text-muted">{correctCount}/{currentQ} ✓</span>
        </div>
      </div>

      {/* Timer bar */}
      <div className="h-2 bg-white/10 mb-1 overflow-hidden">
        <div
          className="h-full"
          style={{
            width: isReveal ? '0%' : `${timerPct * 100}%`,
            backgroundColor: timerColor,
            transition: isReveal ? 'none' : 'width 50ms linear, background-color 0.5s',
          }}
        />
      </div>
      <div className={`text-right font-mono text-sm mb-7 ${
        isReveal ? 'text-text-muted' : timerPct < 0.2 ? 'text-danger animate-pulse' : timerPct < 0.5 ? 'text-gold' : 'text-text-muted'
      }`}>
        {isReveal ? '→ next question' : `${(timeLeft / 1000).toFixed(1)}s`}
      </div>

      {/* Question */}
      <p className="font-head font-bold text-white text-base sm:text-xl leading-relaxed mb-8 text-center px-2">
        {q.question}
      </p>

      {/* Options */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
        {q.options.map((option, i) => {
          const correctIdx = myAnswer?.correctAnswer !== undefined ? myAnswer.correctAnswer : q.correct
          let cls = 'border-white/20 text-white cursor-pointer hover:border-electric/50 hover:bg-white/5'
          if (isReveal || myAnswer !== undefined) {
            if (i === correctIdx) cls = 'border-success bg-success/15 text-success cursor-default'
            else if (myAnswer?.answer === i && i !== correctIdx) cls = 'border-danger bg-danger/15 text-danger cursor-default'
            else cls = 'border-white/10 text-text-muted cursor-default'
          }
          return (
            <button
              key={i}
              onClick={() => submitAnswer(i)}
              disabled={!!myAnswer || isReveal || !userId || submitting}
              className={`border p-4 text-left transition-colors disabled:pointer-events-none ${cls}`}
            >
              <span className="font-head font-bold text-xs mr-3 opacity-50">{LABELS[i]}</span>
              <span className="font-head text-sm">{option}</span>
            </button>
          )
        })}
      </div>

      {/* Feedback */}
      {myAnswer && (
        <div className={`text-center py-3 mb-4 border font-head font-bold text-sm ${
          myAnswer.is_correct ? 'border-success/30 bg-success/5 text-success' :
          myAnswer.answer === -1 ? 'border-white/10 text-text-muted' :
          'border-danger/30 bg-danger/5 text-danger'
        }`}>
          {myAnswer.is_correct
            ? `✓ CORRECT! +${myAnswer.points_earned} pts`
            : myAnswer.answer === -1 ? 'TIME UP'
            : '✗ WRONG'}
        </div>
      )}

      {!userId && (
        <p className="text-center text-text-muted font-head text-xs mt-2">
          <a href="/auth/login" className="text-gold underline hover:text-gold-dim">Sign in</a> to score points
        </p>
      )}
    </div>
  )
}

// ── Pre-quiz lobby ────────────────────────────────────────────────────────────
function PreView({
  quiz,
  userId,
  onStart,
  resumeFrom,
}: {
  quiz: GeoQuiz | null
  userId: string | null
  onStart: () => void
  resumeFrom: number | null
}) {
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  const numQs = quiz?.questions?.length ?? 20

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
      <div className="text-center mb-6 sm:mb-8">
        <div className="text-xs text-electric font-head tracking-[0.3em] mb-2">DAILY GEO QUIZ</div>
        <h1 className="font-head font-bold text-3xl text-white mb-1">{quiz?.title ?? 'GEO QUIZ'}</h1>
        <p className="text-text-muted font-head text-sm">{today}</p>
      </div>

      {!quiz && (
        <div className="text-center py-16 border border-white/10 text-text-muted font-head text-sm">
          No quiz today — check back tomorrow!
        </div>
      )}

      {quiz && quiz.status !== 'live' && (
        <div className="text-center py-16 border border-white/10 text-text-muted font-head text-sm">
          Today&apos;s quiz has ended. Come back tomorrow!
        </div>
      )}

      {quiz && quiz.status === 'live' && (
        <>
          <div className="mb-6 border border-white/10 p-5">
            <div className="text-xs font-head text-gold tracking-widest mb-3">HOW IT WORKS</div>
            <div className="space-y-2 text-sm font-head text-text-muted leading-relaxed">
              <div>→ {numQs} geography trivia questions, multiple choice</div>
              <div>→ 20 seconds per question — answer faster for more points</div>
              <div>→ Correct answer: 100 pts + up to 100 speed bonus</div>
              <div>→ Your score is added to the monthly leaderboard</div>
              <div>→ New quiz every day at midnight UTC</div>
            </div>
          </div>

          <div className="mb-6 border border-white/10">
            <div className="px-4 py-3 border-b border-white/10 font-head font-bold text-xs text-gold tracking-widest">
              🎁 PRIZES
            </div>
            <div className="divide-y divide-white/5">
              {[
                { label: '🥇 1st Place', tokens: 100, gold: true },
                { label: '🥈 2nd Place', tokens: 75, gold: false },
                { label: '🥉 3rd Place', tokens: 50, gold: false },
                { label: '4th – 5th Place', tokens: 30, gold: false },
                { label: '6th – 10th Place', tokens: 20, gold: false },
                { label: 'Participation (11th+)', tokens: 10, gold: false },
              ].map(row => (
                <div key={row.label} className="flex items-center justify-between px-4 py-2.5">
                  <span className={`font-head font-bold text-sm ${row.gold ? 'text-gold' : 'text-text-muted'}`}>{row.label}</span>
                  <span className={`font-mono font-bold ${row.gold ? 'text-gold' : 'text-text-muted'}`}>{row.tokens.toLocaleString()} 🪙</span>
                </div>
              ))}
            </div>
          </div>

          {!userId ? (
            <div className="border border-gold/30 p-4 text-center">
              <p className="font-head text-sm text-text-muted">
                <a href="/auth/login" className="text-gold font-bold underline hover:text-gold-dim">Sign in</a>{' '}
                to participate and score points
              </p>
            </div>
          ) : (
            <button
              onClick={onStart}
              className="w-full py-4 bg-electric text-navy font-head font-bold tracking-widest text-sm hover:bg-electric/90 transition-colors"
            >
              {resumeFrom !== null ? `RESUME — Q${resumeFrom + 1}/${numQs}` : 'START QUIZ'}
            </button>
          )}
        </>
      )}
    </div>
  )
}

// ── Results / Done ────────────────────────────────────────────────────────────
function DoneView({
  quiz,
  answers,
  totalScore,
  correctCount,
  numQs,
  userId,
}: {
  quiz: GeoQuiz | null
  answers: Record<number, AnswerRecord>
  totalScore: number
  correctCount: number
  numQs: number
  userId: string | null
}) {
  const pct = Math.round((correctCount / numQs) * 100)
  const grade =
    pct >= 90 ? { label: 'GEOGRAPHY MASTER', color: 'text-gold' } :
    pct >= 70 ? { label: 'GREAT EXPLORER', color: 'text-electric' } :
    pct >= 50 ? { label: 'SOLID HUNTER', color: 'text-white' } :
    { label: 'KEEP EXPLORING', color: 'text-text-muted' }

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 sm:py-10">
      <div className="text-center mb-6 sm:mb-8">
        <div className="text-xs text-gold font-head tracking-widest mb-1">QUIZ COMPLETE</div>
        <div className={`font-head font-bold text-2xl mb-1 ${grade.color}`}>{grade.label}</div>
        <div className="font-mono text-electric text-4xl font-bold mt-3">{totalScore.toLocaleString()}</div>
        <div className="text-text-muted font-head text-sm mt-1">
          {correctCount}/{numQs} correct · {pct}% accuracy
        </div>
        {quiz?.event_id && userId && (
          <div className="mt-3 text-xs font-head text-text-muted">
            Points added to your monthly leaderboard score
          </div>
        )}
      </div>

      {/* Per-question breakdown */}
      {quiz?.questions && (
        <div className="border border-white/10">
          <div className="px-4 py-3 border-b border-white/10 font-head font-bold text-xs text-white tracking-widest">
            ANSWERS
          </div>
          <div className="divide-y divide-white/5">
            {quiz.questions.map((q, i) => {
              const a = answers[i]
              const correctIdx = a?.correctAnswer !== undefined ? a.correctAnswer : q.correct
              const timedOut = a?.answer === -1
              const isCorrect = a?.is_correct
              return (
                <div key={i} className="px-4 py-3">
                  <div className="flex items-start gap-3 mb-1">
                    <span className={`font-head font-bold text-xs shrink-0 mt-0.5 ${
                      isCorrect ? 'text-success' : timedOut ? 'text-text-muted' : 'text-danger'
                    }`}>
                      {isCorrect ? '✓' : timedOut ? '—' : '✗'}
                    </span>
                    <span className="font-head text-sm text-white leading-snug">{q.question}</span>
                    {a && (
                      <span className="font-mono text-xs text-electric shrink-0 ml-auto">
                        +{a.points_earned}
                      </span>
                    )}
                  </div>
                  <div className="ml-6 text-xs font-head text-text-muted">
                    <span className="text-success">✓ {q.options[correctIdx]}</span>
                    {a && !isCorrect && a.answer !== -1 && (
                      <span className="text-danger ml-3">✗ {q.options[a.answer]}</span>
                    )}
                    {timedOut && <span className="text-text-muted ml-3">Time up</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}

      <div className="mt-6 text-center">
        <p className="text-text-muted font-head text-xs">Come back tomorrow for a new quiz!</p>
      </div>
    </div>
  )
}
