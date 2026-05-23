'use client'
import { useEffect, useCallback } from 'react'

export type KeyboardAction =
  | 'map_pan_north' | 'map_pan_south' | 'map_pan_west' | 'map_pan_east'
  | 'map_zoom_in' | 'map_zoom_out' | 'toggle_streetview' | 'toggle_satellite'
  | 'reset_map_view' | 'toggle_fullscreen_map'
  | 'submit_answer' | 'close_modal'
  | 'reveal_clue_1' | 'reveal_clue_2' | 'reveal_clue_3' | 'reveal_clue_4'
  | 'focus_answer_input' | 'toggle_token_radar'
  | 'goto_leaderboard' | 'goto_dashboard' | 'show_keyboard_shortcuts' | 'toggle_sound'

const KEYBOARD_MAP: Record<string, KeyboardAction> = {
  ArrowUp:   'map_pan_north',
  ArrowDown: 'map_pan_south',
  ArrowLeft: 'map_pan_west',
  ArrowRight:'map_pan_east',
  '+':       'map_zoom_in',
  '=':       'map_zoom_in',
  '-':       'map_zoom_out',
  'v':       'toggle_streetview',
  's':       'toggle_satellite',
  'r':       'reset_map_view',
  'f':       'toggle_fullscreen_map',
  'Enter':   'submit_answer',
  'Escape':  'close_modal',
  '1':       'reveal_clue_1',
  '2':       'reveal_clue_2',
  '3':       'reveal_clue_3',
  '4':       'reveal_clue_4',
  'Tab':     'focus_answer_input',
  'h':       'toggle_token_radar',
  'l':       'goto_leaderboard',
  'd':       'goto_dashboard',
  '?':       'show_keyboard_shortcuts',
  'm':       'toggle_sound',
}

type ActionHandler = Partial<Record<KeyboardAction, () => void>>

export function useKeyboard(handlers: ActionHandler, enabled = true) {
  const handleKey = useCallback((e: KeyboardEvent) => {
    if (!enabled) return
    const target = e.target as HTMLElement
    const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA'

    // Allow Enter in input fields for submit_answer
    if (isInput && e.key !== 'Enter' && e.key !== 'Escape') return

    const action = KEYBOARD_MAP[e.key]
    if (!action) return
    const handler = handlers[action]
    if (!handler) return

    // Don't prevent default for Tab (browser needs it for focus)
    if (e.key !== 'Tab') e.preventDefault()
    handler()
  }, [handlers, enabled])

  useEffect(() => {
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [handleKey])
}

export const KEYBOARD_SHORTCUTS: { key: string; action: string; group: string }[] = [
  { key: '↑↓←→', action: 'Pan map', group: 'Map' },
  { key: '+/-',   action: 'Zoom in/out', group: 'Map' },
  { key: 'V',     action: 'Toggle Street View', group: 'Map' },
  { key: 'S',     action: 'Toggle Satellite', group: 'Map' },
  { key: 'R',     action: 'Reset map view', group: 'Map' },
  { key: 'F',     action: 'Fullscreen map', group: 'Map' },
  { key: '1',     action: 'Clue 1 (free)', group: 'Game' },
  { key: '2',     action: 'Reveal Clue 2 (1 token)', group: 'Game' },
  { key: '3',     action: 'Reveal Clue 3 (1 token)', group: 'Game' },
  { key: '4',     action: 'Reveal Clue 4 (1 token)', group: 'Game' },
  { key: 'Tab',   action: 'Focus answer input', group: 'Game' },
  { key: 'Enter', action: 'Submit answer', group: 'Game' },
  { key: 'H',     action: 'Toggle token radar', group: 'Game' },
  { key: 'L',     action: 'Go to leaderboard', group: 'Nav' },
  { key: 'D',     action: 'Go to dashboard', group: 'Nav' },
  { key: 'M',     action: 'Toggle sound', group: 'Nav' },
  { key: '?',     action: 'Show shortcuts', group: 'Nav' },
  { key: 'Esc',   action: 'Close modal', group: 'Nav' },
]
