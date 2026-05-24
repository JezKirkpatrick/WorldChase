'use client'
import { useEffect, useRef } from 'react'

export type KeyboardAction =
  | 'map_pan_north' | 'map_pan_south' | 'map_pan_west' | 'map_pan_east'
  | 'map_zoom_in' | 'map_zoom_out' | 'toggle_streetview' | 'toggle_satellite'
  | 'reset_map_view' | 'toggle_fullscreen_map'
  | 'submit_answer' | 'close_modal'
  | 'reveal_clue_1' | 'reveal_clue_2' | 'reveal_clue_3' | 'reveal_clue_4'
  | 'focus_answer_input' | 'toggle_token_radar'
  | 'goto_leaderboard' | 'goto_dashboard' | 'show_keyboard_shortcuts' | 'toggle_sound'

const KEYBOARD_MAP: Record<string, KeyboardAction> = {
  ArrowUp:    'map_pan_north',
  ArrowDown:  'map_pan_south',
  ArrowLeft:  'map_pan_west',
  ArrowRight: 'map_pan_east',
  '+':        'map_zoom_in',
  '=':        'map_zoom_in',
  '-':        'map_zoom_out',
  'v':        'toggle_streetview',
  's':        'toggle_satellite',
  'r':        'reset_map_view',
  'f':        'toggle_fullscreen_map',
  'Enter':    'submit_answer',
  'Escape':   'close_modal',
  '1':        'reveal_clue_1',
  '2':        'reveal_clue_2',
  '3':        'reveal_clue_3',
  '4':        'reveal_clue_4',
  'Tab':      'focus_answer_input',
  'h':        'toggle_token_radar',
  'l':        'goto_leaderboard',
  'd':        'goto_dashboard',
  '?':        'show_keyboard_shortcuts',
  'm':        'toggle_sound',
}

type ActionHandler = Partial<Record<KeyboardAction, () => void>>

export function useKeyboard(handlers: ActionHandler, enabled = true) {
  // Store handlers in a ref so the event listener never needs to be replaced
  const handlersRef = useRef(handlers)
  const enabledRef = useRef(enabled)
  handlersRef.current = handlers
  enabledRef.current = enabled

  useEffect(() => {
    function handleKey(e: KeyboardEvent) {
      if (!enabledRef.current) return
      const target = e.target as HTMLElement
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

      // Only allow Enter and Escape through when typing in an input
      if (isInput && e.key !== 'Enter' && e.key !== 'Escape') return

      const action = KEYBOARD_MAP[e.key]
      if (!action) return
      const handler = handlersRef.current[action]
      if (!handler) return

      if (e.key !== 'Tab') e.preventDefault()
      handler()
    }

    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, []) // Empty deps — listener is added once, reads current values via refs
}

// Re-export from shared lib so both the hook and server components can use it
export { KEYBOARD_SHORTCUTS } from '@/lib/keyboard-shortcuts'
