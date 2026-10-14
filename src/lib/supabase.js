import { createClient } from '@supabase/supabase-js'

export const supabaseUrl = 'https://cmuvomnmaoseccxpeuxq.supabase.co'
export const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNtdXZvbW5tYW9zZWNjeHBldXhxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU0MDM5NjMsImV4cCI6MjA5MDk3OTk2M30.s_sIdbTqE5NdMhi-ZfiWTpneswGvi2U4bmNgNWF22UY'

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// A caught failure that only showed as a note on screen tells nobody on the
// other side. Write it to the Ledger next to the crash log (daily_logs,
// what 'hud-error', note prefixed 'soft') so Claude can read it.
export function reportSoft(where, err) {
  try {
    supabase.from('daily_logs').insert({
      day: new Date().toLocaleDateString('en-CA', { timeZone: 'America/Chicago' }), kind: 'note', what: 'hud-error',
      note: `soft · ${where} · ${location.hash || '#/'}\n${String(err && (err.stack || err.message) || err).slice(0, 1200)}`, source: 'hud',
    }).then(() => {}, () => {})
  } catch { /* best effort */ }
}
