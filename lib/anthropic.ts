import Anthropic from '@anthropic-ai/sdk'

// Lazy-initialize so API key is never accessed at module load time
let _anthropic: Anthropic | null = null
export const anthropic = new Proxy({} as Anthropic, {
  get(_target, prop) {
    if (!_anthropic) {
      _anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })
    }
    return (_anthropic as any)[prop]
  },
})
