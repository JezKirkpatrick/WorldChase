'use client'

export const dynamic = 'force-dynamic'
import { useState, useEffect } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase'

interface GeoQuiz {
  id: string
  title: string
  scheduled_at: string
  started_at: string | null
  ended_at: string | null
  status: 'upcoming' | 'live' | 'completed'
  questions: any[]
}

interface Standing {
  user_id: string
  username: string
  display_name: string | null
  score: number
  correct: number
}

export default function AdminGeoQuizPage() {
  const [quiz, setQuiz] = useState<GeoQuiz | null>(null)
  const [title, setTitle] = useState('Geo Quiz')
  const [scheduledAt, setScheduledAt] = useState('')
  const [saving, setSaving] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [starting, setStarting] = useState(false)
  const [finalizing, setFinalizing] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)
  const [standings, setStandings] = useState<Standing[]>([])
  const [showQuestions, setShowQuestions] = useState(false)
  const supabase = createClient()

  useEffect(() => {
    loadQuiz()
  }, [])

  useEffect(() => {
    if (!quiz || (quiz.status !== 'live' && quiz.status !== 'completed')) return
    loadStandings()
    const interval = setInterval(loadStandings, 5000)
    return () => clearInterval(interval)
  }, [quiz?.id, quiz?.status])

  async function loadQuiz() {
    const { data } = await supabase
      .from('geo_quizzes')
      .select('*')
      .order('scheduled_at', { ascending: false })
      .limit(1)
      .maybeSingle()
    if (data) {
      setQuiz(data)
      setTitle(data.title)
      // Convert to local datetime-local format
      const d = new Date(data.scheduled_at)
      const pad = (n: number) => String(n).padStart(2, '0')
      setScheduledAt(
        `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
      )
    }
  }

  async function loadStandings() {
    if (!quiz) return
    const { data } = await supabase
      .from('geo_quiz_answers')
      .select('user_id, points_earned, is_correct, profiles(username, display_name)')
      .eq('quiz_id', quiz.id)
    if (!data) return
    const map = new Map<string, Standing>()
    for (const a of data) {
      const prof = (a as any).profiles
      const prev = map.get(a.user_id)
      map.set(a.user_id, {
        user_id: a.user_id,
        username: prev?.username ?? prof?.username ?? '???',
        display_name: prev?.display_name ?? prof?.display_name ?? null,
        score: (prev?.score ?? 0) + (a.points_earned ?? 0),
        correct: (prev?.correct ?? 0) + (a.is_correct ? 1 : 0),
      })
    }
    setStandings(Array.from(map.values()).sort((a, b) => b.score - a.score))
  }

  async function handleSave() {
    if (!scheduledAt) return
    setSaving(true); setMsg(null)
    const res = await fetch('/api/admin/geo-quiz/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizId: quiz?.id,
        title,
        scheduledAt: new Date(scheduledAt).toISOString(),
        generateQuestions: false,
      }),
    })
    const data = await res.json()
    if (data.quiz) { setQuiz(data.quiz); setMsg('✅ Saved!') }
    else setMsg('❌ ' + data.error)
    setSaving(false)
  }

  async function handleGenerate() {
    if (!quiz) { setMsg('Save schedule first'); return }
    setGenerating(true); setMsg('⚡ Generating 20 questions (this takes ~30 seconds)...')
    const res = await fetch('/api/admin/geo-quiz/setup', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        quizId: quiz.id,
        scheduledAt: quiz.scheduled_at,
        generateQuestions: true,
      }),
    })
    const data = await res.json()
    if (data.quiz) { setQuiz(data.quiz); setMsg(`✅ ${data.quiz.questions.length} questions generated!`) }
    else setMsg('❌ ' + data.error)
    setGenerating(false)
  }

  async function handleStart() {
    if (!quiz) return
    setStarting(true); setMsg(null)
    const res = await fetch('/api/admin/geo-quiz/start', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: quiz.id }),
    })
    const data = await res.json()
    if (data.quiz) { setQuiz(data.quiz); setMsg('🚀 Quiz started! 5-second countdown begun.') }
    else setMsg('❌ ' + data.error)
    setStarting(false)
  }

  async function handleFinalize() {
    if (!quiz) return
    if (!confirm('Finalise results and award tokens to all players? This cannot be undone.')) return
    setFinalizing(true); setMsg(null)
    const res = await fetch('/api/admin/geo-quiz/finalize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quizId: quiz.id }),
    })
    const data = await res.json()
    if (data.awarded !== undefined) {
      setMsg(`✅ Results finalised — tokens awarded to ${data.awarded} players.`)
      loadQuiz()
    } else setMsg('❌ ' + data.error)
    setFinalizing(false)
  }

  const questionCount = quiz?.questions?.length ?? 0
  const isLive = quiz?.status === 'live'
  const isDone = quiz?.status === 'completed'

  return (
    <div className="min-h-screen bg-navy text-text">
      <nav className="h-14 bg-navy-light border-b border-white/8 flex items-center gap-4 px-6">
        <Link href="/admin" className="text-text-muted font-head text-sm">← ADMIN</Link>
        <span className="font-head font-bold text-gold tracking-widest">GEO QUIZ CONTROL</span>
        {quiz && (
          <span className={`ml-auto text-xs font-head font-bold px-2 py-0.5 border ${
            isLive ? 'border-success/50 text-success' :
            isDone ? 'border-text-muted/30 text-text-muted' :
            'border-warning/50 text-warning'
          }`}>
            {quiz.status.toUpperCase()}
          </span>
        )}
      </nav>

      <div className="max-w-3xl mx-auto px-6 py-10 space-y-6">

        {/* Schedule */}
        <div className="bg-navy-light border border-white/10 p-6">
          <h2 className="font-head font-bold text-gold text-sm tracking-widest mb-4">SCHEDULE QUIZ</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs font-head text-text-muted tracking-widest mb-1 block">TITLE</label>
              <input
                value={title}
                onChange={e => setTitle(e.target.value)}
                className="w-full bg-navy border border-white/20 px-4 py-3 text-white font-head outline-none focus:border-gold/60"
              />
            </div>
            <div>
              <label className="text-xs font-head text-text-muted tracking-widest mb-1 block">DATE & TIME</label>
              <input
                type="datetime-local"
                value={scheduledAt}
                onChange={e => setScheduledAt(e.target.value)}
                className="w-full bg-navy border border-white/20 px-4 py-3 text-white font-head outline-none focus:border-gold/60"
              />
            </div>
          </div>
          <button
            onClick={handleSave}
            disabled={saving || !scheduledAt}
            className="px-6 py-2 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim disabled:opacity-50"
          >
            {saving ? 'SAVING...' : quiz ? 'UPDATE SCHEDULE' : 'CREATE QUIZ'}
          </button>
        </div>

        {/* Questions */}
        {quiz && (
          <div className="bg-navy-light border border-white/10 p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-head font-bold text-gold text-sm tracking-widest">QUESTIONS</h2>
              <span className="font-mono text-sm text-text-muted">{questionCount} / 20</span>
            </div>
            <div className="flex gap-3 flex-wrap">
              <button
                onClick={handleGenerate}
                disabled={generating || isLive || isDone}
                className="px-6 py-2 bg-electric text-navy font-head font-bold text-sm tracking-widest hover:bg-electric-dim disabled:opacity-50"
              >
                {generating ? '⚡ GENERATING...' : questionCount > 0 ? '⚡ REGENERATE ALL' : '⚡ GENERATE 20 QUESTIONS'}
              </button>
              {questionCount > 0 && (
                <button
                  onClick={() => setShowQuestions(p => !p)}
                  className="px-4 py-2 border border-white/20 text-text-muted font-head text-sm hover:border-white/40 hover:text-white transition-colors"
                >
                  {showQuestions ? 'HIDE QUESTIONS' : 'PREVIEW QUESTIONS'}
                </button>
              )}
            </div>

            {showQuestions && questionCount > 0 && (
              <div className="mt-4 space-y-3 max-h-96 overflow-y-auto">
                {quiz.questions.map((q: any, i: number) => (
                  <div key={i} className="border border-white/10 p-3">
                    <div className="flex items-start gap-2 mb-2">
                      <span className="font-mono text-text-muted text-xs shrink-0 mt-0.5">{i + 1}.</span>
                      <div>
                        <span className="text-[10px] font-head text-electric border border-electric/20 px-1.5 py-0.5 mr-2">{q.category}</span>
                        <span className="font-head text-sm text-white">{q.question}</span>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1 pl-5">
                      {q.options?.map((opt: string, j: number) => (
                        <div key={j} className={`text-xs font-head px-2 py-1 ${j === q.correct ? 'text-success border border-success/30' : 'text-text-muted'}`}>
                          {['A','B','C','D'][j]}: {opt}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Control */}
        {quiz && !isDone && (
          <div className="bg-navy-light border border-white/10 p-6">
            <h2 className="font-head font-bold text-gold text-sm tracking-widest mb-4">QUIZ CONTROL</h2>
            {!isLive ? (
              <div>
                <p className="text-text-muted font-head text-sm mb-4">
                  {questionCount === 0
                    ? 'Generate questions before starting.'
                    : 'Quiz is ready. Click START to launch with a 5-second countdown for all players.'}
                </p>
                <button
                  onClick={handleStart}
                  disabled={starting || questionCount === 0}
                  className="px-8 py-3 bg-success text-navy font-head font-bold text-sm tracking-widest hover:bg-success/80 disabled:opacity-40 transition-colors"
                >
                  {starting ? 'STARTING...' : '▶ START QUIZ NOW'}
                </button>
              </div>
            ) : (
              <div>
                <div className="mb-4 border border-success/30 bg-success/5 px-4 py-3 font-head text-success text-sm font-bold">
                  ● QUIZ IS LIVE
                </div>
                <p className="text-text-muted font-head text-xs">
                  Quiz running. After all 20 questions complete, finalise results below.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Finalise */}
        {quiz && (isLive || isDone) && (
          <div className="bg-navy-light border border-white/10 p-6">
            <h2 className="font-head font-bold text-gold text-sm tracking-widest mb-2">FINALISE RESULTS</h2>
            <p className="text-text-muted font-head text-xs mb-4">
              Calculates final rankings from all answers and awards tokens. Run after the last question has elapsed.
              {isDone && ' Results already finalised.'}
            </p>
            <button
              onClick={handleFinalize}
              disabled={finalizing || isDone}
              className="px-6 py-2 bg-gold text-navy font-head font-bold text-sm tracking-widest hover:bg-gold-dim disabled:opacity-50"
            >
              {finalizing ? 'FINALISING...' : isDone ? '✓ ALREADY FINALISED' : 'FINALISE & AWARD TOKENS'}
            </button>
          </div>
        )}

        {/* Message */}
        {msg && (
          <div className="border border-white/20 px-4 py-3 font-head text-sm text-white">{msg}</div>
        )}

        {/* Live standings */}
        {standings.length > 0 && (
          <div className="border border-white/10">
            <div className="px-4 py-3 border-b border-white/10 font-head font-bold text-xs text-electric tracking-widest">
              {isLive ? 'LIVE STANDINGS' : 'FINAL STANDINGS'} — {standings.length} players
            </div>
            <div className="divide-y divide-white/5">
              {standings.map((s, i) => (
                <div key={s.user_id} className="flex items-center justify-between px-4 py-2">
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-text-muted text-xs w-5">{i + 1}</span>
                    <span className="font-head text-sm text-white">{s.display_name || s.username}</span>
                    <span className="text-xs text-text-muted font-head">{s.correct}✓</span>
                  </div>
                  <span className="font-mono text-electric text-sm">{s.score.toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* SQL setup */}
        <GeoQuizSqlSetup />
      </div>
    </div>
  )
}

function GeoQuizSqlSetup() {
  const [copied, setCopied] = useState(false)
  const [open, setOpen] = useState(false)

  const SQL = `-- Run once in Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql/new

create table if not exists public.geo_quizzes (
  id            uuid        primary key default gen_random_uuid(),
  title         text        not null default 'Geo Quiz',
  scheduled_at  timestamptz not null,
  started_at    timestamptz,
  ended_at      timestamptz,
  status        text        not null default 'upcoming',
  questions     jsonb       not null default '[]',
  created_at    timestamptz not null default now()
);
alter table public.geo_quizzes enable row level security;
create policy "Public read geo_quizzes" on public.geo_quizzes for select using (true);
alter publication supabase_realtime add table public.geo_quizzes;

create table if not exists public.geo_quiz_answers (
  id              uuid        primary key default gen_random_uuid(),
  quiz_id         uuid        not null references public.geo_quizzes(id),
  user_id         uuid        not null references public.profiles(id),
  question_index  int         not null,
  answer          int         not null default -1,
  is_correct      boolean     not null default false,
  answer_time_ms  int         not null default 10000,
  points_earned   int         not null default 0,
  created_at      timestamptz not null default now(),
  unique(quiz_id, user_id, question_index)
);
alter table public.geo_quiz_answers enable row level security;
create policy "Public read geo_quiz_answers" on public.geo_quiz_answers for select using (true);
create policy "Auth insert geo_quiz_answers" on public.geo_quiz_answers for insert with check (auth.uid() = user_id);

create table if not exists public.geo_quiz_results (
  id               uuid        primary key default gen_random_uuid(),
  quiz_id          uuid        not null references public.geo_quizzes(id),
  user_id          uuid        not null references public.profiles(id),
  final_rank       int,
  total_score      int         not null default 0,
  correct_answers  int         not null default 0,
  tokens_awarded   int         not null default 0,
  created_at       timestamptz not null default now(),
  unique(quiz_id, user_id)
);
alter table public.geo_quiz_results enable row level security;
create policy "Public read geo_quiz_results" on public.geo_quiz_results for select using (true);`

  return (
    <div className="border border-gold/20 p-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <div className="text-xs font-head text-gold tracking-widest mb-1">DB SETUP (ONE-TIME)</div>
          <div className="text-text-muted font-head text-xs">
            Run this SQL in{' '}
            <a href="https://supabase.com/dashboard/project/_/sql/new" target="_blank" rel="noreferrer"
              className="text-gold underline hover:text-gold-dim">Supabase SQL Editor ↗</a>{' '}
            before using this feature. Safe to run again — uses IF NOT EXISTS.
          </div>
        </div>
        <button onClick={() => setOpen(p => !p)} className="text-xs font-head text-text-muted border border-white/20 px-3 py-1 hover:text-white ml-4 shrink-0">
          {open ? 'HIDE' : 'SHOW SQL'}
        </button>
      </div>
      {open && (
        <div className="border border-white/10">
          <div className="flex items-center justify-between px-4 py-2.5 bg-white/[0.03] border-b border-white/10">
            <span className="text-xs font-head text-text-muted tracking-widest">geo_quizzes + geo_quiz_answers + geo_quiz_results</span>
            <button
              onClick={() => { navigator.clipboard.writeText(SQL); setCopied(true); setTimeout(() => setCopied(false), 2500) }}
              className={`text-xs font-head font-bold tracking-widest px-3 py-1 border transition-all ${copied ? 'border-success/50 text-success' : 'border-gold/40 text-gold hover:border-gold'}`}
            >
              {copied ? '✓ COPIED!' : 'COPY SQL'}
            </button>
          </div>
          <pre className="bg-black/40 p-4 text-xs font-mono text-green-300 overflow-x-auto whitespace-pre leading-relaxed">{SQL}</pre>
        </div>
      )}
    </div>
  )
}
