import { NextResponse } from 'next/server'
import { pingIndexNow, PUBLIC_URLS } from '@/lib/indexnow'

export const dynamic = 'force-dynamic'

export async function GET() {
  await pingIndexNow(PUBLIC_URLS)
  return NextResponse.json({ ok: true, submitted: PUBLIC_URLS.length })
}
