// Shared app state + hooks that main.js fills in (avoids circular imports between screens and main).
import { toast } from './ui.js';

export const S = {
  unlocked: false,
  pin: '',
  screen: 'today',      // today | train | food | progress | more | workout
  st: null,             // /a/state result
  foodDate: null,
  day: null,            // /a/day result for foodDate
  prog: null,           // /a/progress result
  hist: null,           // /a/history result
  wo: null,             // active workout (see workout.js)
  open: {},             // which collapsible cards are open
};

export const app = {
  render: () => {},
  refresh: async () => {},
  go: async () => {},
};

// Run an async action; show a friendly error instead of crashing.
export async function run(fn) {
  try { return await fn(); }
  catch (e) { console.error(e); toast(e.message || 'Xəta oldu, qağa'); return null; }
}
