export const dynamic = 'force-dynamic'

import { Suspense } from 'react'
import GlobalNav from '@/components/ui/GlobalNav'
import TokensContent from '@/components/tokens/TokensContent'

function TokensSkeleton() {
  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-12 animate-pulse">
      <div className="text-center mb-10">
        <div className="h-3 w-24 bg-white/10 mb-3 mx-auto" />
        <div className="h-8 w-64 bg-white/10 mb-2 mx-auto" />
        <div className="h-4 w-48 bg-white/5 mx-auto" />
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {[1, 2, 3, 4].map(i => (
          <div key={i} className="border border-white/10 p-6">
            <div className="h-5 w-28 bg-white/10 mb-2" />
            <div className="h-10 w-20 bg-white/10 mb-2" />
            <div className="h-3 w-full bg-white/5 mb-1" />
            <div className="h-3 w-16 bg-white/5 mb-5" />
            <div className="h-12 bg-white/5" />
          </div>
        ))}
      </div>
    </div>
  )
}

export default function TokensPage() {
  return (
    <div className="min-h-screen bg-navy text-text">
      <GlobalNav />
      <Suspense fallback={<TokensSkeleton />}>
        <TokensContent />
      </Suspense>
    </div>
  )
}
