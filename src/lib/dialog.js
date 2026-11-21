// House dialogs (David 10/21): "a different style for when we need to prompt for
import { INK, INK2, PURPLE, RED, alpha, SERIF } from '../components/river/canon'
// an input. Bigger entry block and different colors." One overlay for the three
// browser boxes, promise-based so callers read like the natives they replace:
//   const text = await hudPrompt({ title, message, placeholder, value, multiline })  // null on cancel
//   const ok   = await hudConfirm({ title, message, confirm, danger })               // boolean
//   await hudNotice({ title, message })
// Enter submits a single-line prompt, Cmd/Ctrl+Enter a multiline one, Escape cancels. Built on the DOM so any
// handler can call it, inside React or not.
// Canon (David 11/21, on "A Step On This Gate": "let's make this better and match new cannon"): no line above the title,
// no small tracked uppercase anywhere, the entry block in the serif like every writing box, and the two actions as
// icons (an X to leave it, a check to keep it) with their names on hover. Color only on focus and for danger.
const NAVY = '#0F2334', BORDER = 'rgba(255,255,255,0.14)', ACCENT = 'var(--hud-accent, #8ACAFF)'
const ICON = { ok: '<path d="M5 12.5l4.5 4.5L19 7.5"/>', no: '<path d="M6 6l12 12M18 6L6 18"/>' }
const svg = (k, size) => `<svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICON[k]}</svg>`
const tc = (t) => String(t || '').replace(/\b\w/g, c => c.toUpperCase())

function open({ kind, title, message, placeholder = '', value = '', multiline = false, confirm, cancel = 'Cancel', danger = false }) {
  return new Promise((resolve) => {
    const prev = document.activeElement
    const root = document.createElement('div')
    root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'true'); if (title) root.setAttribute('aria-label', title)
    root.style.cssText = 'position:fixed;inset:0;z-index:9000;display:grid;place-items:center;padding:20px;background:rgba(5,14,24,0.74);backdrop-filter:blur(3px)'
    const rim = danger ? RED : ACCENT
    const panel = document.createElement('div')
    panel.style.cssText = `width:min(620px,100%);background:${NAVY};border:1px solid ${danger ? alpha(RED, 45) : BORDER};border-radius:18px;padding:26px 28px 22px;box-shadow:0 30px 90px rgba(0,0,0,0.55);color:${INK};font-family:inherit`
    const h = document.createElement('div')
    h.textContent = title || ''
    h.style.cssText = `font-family:${SERIF};font-weight:500;font-size:24px;line-height:1.25;letter-spacing:-0.01em;color:${INK};margin-bottom:${message ? 8 : 16}px`
    panel.append(h)
    if (message) { const m = document.createElement('div'); m.textContent = message; m.style.cssText = `font-size:14.5px;line-height:1.6;color:${INK2};margin-bottom:16px;white-space:pre-wrap`; panel.append(m) }
    let field = null
    if (kind === 'prompt') {
      field = document.createElement('textarea')
      field.value = value || ''; field.placeholder = placeholder || ''; field.rows = multiline ? 5 : 2
      field.setAttribute('aria-label', title || 'Your words')
      field.style.cssText = `width:100%;box-sizing:border-box;resize:vertical;font:400 16.5px/1.6 ${SERIF};color:${INK};background:rgba(255,255,255,0.05);border:1px solid ${BORDER};border-radius:12px;padding:13px 15px;outline:none;min-height:${multiline ? 132 : 70}px;transition:border-color .15s, box-shadow .15s`
      field.addEventListener('focus', () => { field.style.borderColor = rim; field.style.boxShadow = `0 0 0 3px ${alpha(rim, 15)}` })
      field.addEventListener('blur', () => { field.style.borderColor = BORDER; field.style.boxShadow = 'none' })
      panel.append(field)
    }
    const row = document.createElement('div'); row.style.cssText = `display:flex;gap:10px;justify-content:flex-end;margin-top:${kind === 'prompt' ? 16 : 6}px`
    const mk = (k, name, color) => {
      const b = document.createElement('button'); b.type = 'button'; b.innerHTML = svg(k, 18); b.title = tc(name); b.setAttribute('aria-label', tc(name))
      b.style.cssText = `width:42px;height:42px;border-radius:99px;display:inline-grid;place-items:center;padding:0;cursor:pointer;border:1.5px solid ${color};color:${color};background:transparent;transition:background .15s`
      b.addEventListener('mouseenter', () => { b.style.background = alpha(color, 18) }); b.addEventListener('mouseleave', () => { b.style.background = 'transparent' })
      b.style.outline = 'none'; b.addEventListener('focus', () => { b.style.boxShadow = `0 0 0 3px ${alpha(color, 22)}` }); b.addEventListener('blur', () => { b.style.boxShadow = 'none' })
      return b
    }
    const done = (val) => { window.removeEventListener('keydown', onKey, true); root.remove(); try { prev && prev.focus && prev.focus() } catch { /* no-op */ } resolve(val) }
    const onKey = (e) => {
      if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); done(kind === 'prompt' ? null : kind === 'confirm' ? false : undefined) }
      else if (e.key === 'Enter' && (kind !== 'prompt' || (multiline ? (e.metaKey || e.ctrlKey) : !e.shiftKey))) { e.preventDefault(); e.stopPropagation(); done(kind === 'prompt' ? field.value : kind === 'confirm' ? true : undefined) }
    }
    if (kind !== 'notice') { const c = mk('no', cancel, 'rgba(243,241,234,0.55)'); c.onclick = () => done(kind === 'prompt' ? null : false); row.append(c) }
    const ok = mk('ok', confirm || (kind === 'prompt' ? 'Save' : kind === 'confirm' ? 'Yes' : 'Continue'), danger ? RED : PURPLE)
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
