// Keyboard shortcut definitions — shared between useKeyboard hook and How to Play page
// This file is safe to import in both server and client components

export const KEYBOARD_SHORTCUTS: { key: string; action: string; group: string }[] = [
  { key: '↑↓←→', action: 'Pan map',             group: 'Map' },
  { key: '+/-',   action: 'Zoom in/out',         group: 'Map' },
  { key: 'V',     action: 'Toggle Street View',  group: 'Map' },
  { key: 'S',     action: 'Satellite view',      group: 'Map' },
  { key: 'R',     action: 'Reset map view',      group: 'Map' },
  { key: 'F',     action: 'Fullscreen map',      group: 'Map' },
  { key: '1',     action: 'Clue 1 (free)',       group: 'Game' },
  { key: '2',     action: 'Reveal Clue 2',       group: 'Game' },
  { key: '3',     action: 'Reveal Clue 3',       group: 'Game' },
  { key: '4',     action: 'Reveal Clue 4',       group: 'Game' },
  { key: 'Tab',   action: 'Focus answer input',  group: 'Game' },
  { key: 'Enter', action: 'Submit answer',       group: 'Game' },
  { key: 'H',     action: 'Toggle token radar',  group: 'Game' },
  { key: 'L',     action: 'Leaderboard',         group: 'Nav' },
  { key: 'D',     action: 'Dashboard',           group: 'Nav' },
  { key: 'M',     action: 'Toggle sound',        group: 'Nav' },
  { key: '?',     action: 'Show shortcuts',      group: 'Nav' },
  { key: 'Esc',   action: 'Close modal',         group: 'Nav' },
]
