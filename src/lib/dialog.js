// House dialogs (David 10/21): "a different style for when we need to prompt for
// an input. Bigger entry block and different colors." One overlay for the three
// browser boxes, promise-based so callers read like the natives they replace:
//   const text = await hudPrompt({ title, message, placeholder, value, multiline })  // null on cancel
//   const ok   = await hudConfirm({ title, message, confirm, danger })               // boolean
//   await hudNotice({ title, message })
// Navy-deep panel, a periwinkle rim (red for danger), serif title, mono eyebrow,
// an entry block that is a real textarea at 15px. Enter submits a single-line
// prompt, Cmd/Ctrl+Enter a multiline one, Escape cancels. Built on the DOM so
// any handler can call it, inside React or not.
const NAVY = '#0E2336', INK = '#EAF1F8', INK2 = 'rgba(234,241,248,0.72)', LABEL = '#7FA8D4', PERI = '#96A8F0', RED = '#E8836F', BORDER = 'rgba(255,255,255,0.12)'
const MONO = 'var(--font-mono, ui-monospace, monospace)', SERIF = "'Lora', Georgia, serif", SANS = 'inherit'

function open({ kind, title, message, placeholder = '', value = '', multiline = false, confirm, cancel = 'Cancel', danger = false, eyebrow }) {
  return new Promise((resolve) => {
    const prev = document.activeElement
    const root = document.createElement('div')
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true')
    root.style.cssText = 'position:fixed;inset:0;z-index:9000;display:grid;place-items:center;padding:20px;background:rgba(5,14,24,0.74);backdrop-filter:blur(2px)'
    const rim = danger ? RED : PERI
    const panel = document.createElement('div')
    panel.style.cssText = `width:min(640px,100%);background:${NAVY};border:1px solid ${rim}66;border-radius:16px;padding:24px 26px 20px;box-shadow:0 30px 90px rgba(0,0,0,0.55),0 0 0 1px rgba(255,255,255,0.04) inset;color:${INK};font-family:${SANS}`
    const eb = document.createElement('div')
    eb.textContent = eyebrow || (kind === 'prompt' ? 'Your Words' : kind === 'confirm' ? (danger ? 'Careful' : 'Confirm') : 'Notice')
    eb.style.cssText = `font-family:${MONO};font-size:10.5px;letter-spacing:0.16em;text-transform:uppercase;color:${danger ? RED : LABEL};margin-bottom:8px`
    const h = document.createElement('div')
    h.textContent = title || ''
    h.style.cssText = `font-family:${SERIF};font-weight:500;font-size:22px;line-height:1.3;color:#fff;margin-bottom:${message ? 8 : 14}px`
    panel.append(eb, h)
    if (message) { const m = document.createElement('div'); m.textContent = message; m.style.cssText = `font-size:14px;line-height:1.6;color:${INK2};margin-bottom:16px;white-space:pre-wrap`; panel.append(m) }
    let field = null
    if (kind === 'prompt') {
      field = document.createElement('textarea')
      field.value = value || ''; field.placeholder = placeholder || ''; field.rows = multiline ? 5 : 2
      field.style.cssText = `width:100%;box-sizing:border-box;resize:vertical;font:15px/1.55 ${SANS};color:${INK};background:rgba(255,255,255,0.05);border:1px solid ${rim}88;border-radius:10px;padding:12px 14px;outline:none;min-height:${multiline ? 128 : 64}px`
      field.addEventListener('focus', () => { field.style.borderColor = rim; field.style.boxShadow = `0 0 0 3px ${rim}26` })
      field.addEventListener('blur', () => { field.style.borderColor = `${rim}88`; field.style.boxShadow = 'none' })
      panel.append(field)
      const hint = document.createElement('div'); hint.textContent = multiline ? 'Cmd+Enter to confirm · Esc to cancel' : 'Enter to confirm · Esc to cancel'
      hint.style.cssText = `font-family:${MONO};font-size:10px;letter-spacing:0.1em;text-transform:uppercase;color:rgba(234,241,248,0.4);margin-top:8px`
      panel.append(hint)
    }
    const row = document.createElement('div'); row.style.cssText = 'display:flex;gap:8px;justify-content:flex-end;margin-top:18px'
    const mk = (label, primary) => { const b = document.createElement('button'); b.type = 'button'; b.textContent = label; b.style.cssText = `font-family:${MONO};font-size:10.5px;letter-spacing:0.12em;text-transform:uppercase;padding:9px 16px;border-radius:999px;cursor:pointer;border:1px solid ${primary ? rim : BORDER};background:${primary ? `${rim}26` : 'transparent'};color:${primary ? (danger ? RED : '#fff') : INK2}`; return b }
    const done = (val) => { window.removeEventListener('keydown', onKey, true); root.remove(); try { prev && prev.focus && prev.focus() } catch { /* no-op */ } resolve(val) }
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(kind === 'prompt' ? null : kind === 'confirm' ? false : undefined) }
      else if (e.key === 'Enter' && (kind !== 'prompt' || (multiline ? (e.metaKey || e.ctrlKey) : !e.shiftKey))) { e.preventDefault(); e.stopPropagation(); done(kind === 'prompt' ? field.value : kind === 'confirm' ? true : undefined) }
    }
    if (kind !== 'notice') { const c = mk(cancel, false); c.onclick = () => done(kind === 'prompt' ? null : false); row.append(c) }
    const ok = mk(confirm || (kind === 'prompt' ? 'Save' : kind === 'confirm' ? 'Yes' : 'Continue'), true)
    ok.onclick = () => done(kind === 'prompt' ? field.value : kind === 'confirm' ? true : undefined)
    row.append(ok); panel.append(row); root.append(panel); document.body.append(root)
    root.addEventListener('mousedown', (e) => { if (e.target === root) done(kind === 'prompt' ? null : kind === 'confirm' ? false : undefined) })
    window.addEventListener('keydown', onKey, true)
    setTimeout(() => { (field || ok).focus(); if (field) field.select() }, 0)
  })
}

// The natives took (message, default). These take an object, or a message string.
const norm = (a, b) => (typeof a === 'string' ? { title: a, value: b } : (a || {}))
export const hudPrompt = (a, b) => open({ kind: 'prompt', ...norm(a, b) })
export const hudConfirm = (a) => open({ kind: 'confirm', ...norm(a) })
export const hudNotice = (a) => open({ kind: 'notice', ...norm(a) })
