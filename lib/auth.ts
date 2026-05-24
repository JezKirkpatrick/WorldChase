/**
 * React.cache-wrapped auth helpers.
 * Within a single server request, calling getUser() or getProfile()
 * multiple times (e.g. from GlobalNav AND the page) makes only ONE
 * Supabase round-trip — the result is memoised for the duration of
 * the render tree.
 */
import { cache } from 'react'
import { createClient } from '@/lib/supabase-server'

export const getUser = cache(async () => {
  const supabase = createClient()
  const { data: { user } } = await supabase.auth.getUser()
  return user
})

export const getProfile = cache(async (userId: string) => {
  const supabase = createClient()
  const { data } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .maybeSingle()
  return data
})
