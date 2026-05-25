'use client'
import { useState } from 'react'

export default function CopySqlButton({ sql }: { sql: string }) {
  const [copied, setCopied] = useState(false)

  function copy() {
    navigator.clipboard.writeText(sql).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    })
  }

  return (
    <button
      onClick={copy}
      className={`text-xs font-head font-bold tracking-widest px-4 py-2 border transition-all ${
        copied
          ? 'border-green-400/50 text-green-400'
          : 'border-gold/40 text-gold hover:border-gold hover:bg-gold/5'
      }`}
    >
      {copied ? '✓ COPIED!' : 'COPY SQL'}
    </button>
  )
}
