'use client'

class SoundSystem {
  private ctx: AudioContext | null = null
  private muted = false

  init() {
    if (typeof window === 'undefined') return
    this.muted = localStorage.getItem('wc_muted') === '1'
  }

  setMuted(m: boolean) {
    this.muted = m
    if (typeof window !== 'undefined') localStorage.setItem('wc_muted', m ? '1' : '0')
  }

  isMuted() { return this.muted }

  private ctx_() {
    if (!this.ctx) this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    return this.ctx
  }

  private tone(freq: number, type: OscillatorType, gainVal: number, start: number, dur: number, ctx: AudioContext) {
    const osc = ctx.createOscillator()
    const g = ctx.createGain()
    osc.type = type
    osc.frequency.setValueAtTime(freq, ctx.currentTime + start)
    g.gain.setValueAtTime(gainVal, ctx.currentTime + start)
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + dur)
    osc.connect(g)
    g.connect(ctx.destination)
    osc.start(ctx.currentTime + start)
    osc.stop(ctx.currentTime + start + dur + 0.05)
  }

  correct() {
    if (this.muted) return
    try {
      const ctx = this.ctx_()
      // Ascending C-E-G arpeggio
      [[523, 0], [659, 0.1], [784, 0.2], [1047, 0.35]].forEach(([f, t]) =>
        this.tone(f, 'sine', 0.18, t, 0.4, ctx))
    } catch {}
  }

  wrong() {
    if (this.muted) return
    try {
      const ctx = this.ctx_()
      this.tone(180, 'sawtooth', 0.15, 0, 0.25, ctx)
      this.tone(140, 'sawtooth', 0.12, 0.12, 0.3, ctx)
    } catch {}
  }

  token() {
    if (this.muted) return
    try {
      const ctx = this.ctx_()
      [[1200, 0], [1400, 0.07], [1600, 0.14]].forEach(([f, t]) =>
        this.tone(f, 'sine', 0.12, t, 0.15, ctx))
    } catch {}
  }

  reveal() {
    if (this.muted) return
    try {
      const ctx = this.ctx_()
      this.tone(440, 'sine', 0.1, 0, 0.5, ctx)
      this.tone(554, 'sine', 0.08, 0.05, 0.45, ctx)
      this.tone(659, 'sine', 0.07, 0.1, 0.4, ctx)
    } catch {}
  }

  click() {
    if (this.muted) return
    try {
      const ctx = this.ctx_()
      this.tone(800, 'square', 0.05, 0, 0.06, ctx)
    } catch {}
  }

  levelUp() {
    if (this.muted) return
    try {
      const ctx = this.ctx_()
      [[523, 0], [659, 0.12], [784, 0.24], [1047, 0.36], [1319, 0.5]].forEach(([f, t]) =>
        this.tone(f, 'sine', 0.2, t, 0.35, ctx))
    } catch {}
  }
}

export const sounds = new SoundSystem()
