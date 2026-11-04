// One chassis (David 11/4: "all pages down in a card should be matching the
// parent"). A Side Mission, Milestone or Ad Hoc card is a page inside the shell,
// opened by route: #/<page>/<params>/item/<objective id | task:<task id>>. App
// reads the hash, loads the item (itemFromObjective) and renders ItemDetail in
// place of the page, sidebar and column inherited. Back is the browser's back.
export function openCard(id) {
  if (!id) return
  const base = (window.location.hash || '#/river').replace(/\/item\/.*$/, '') || '#/river'
  const page = base.replace(/^#\/?/, '').split('/')[0] || 'river'
  try { window.history.pushState({ page, card: String(id) }, '', `${base}/item/${encodeURIComponent(String(id))}`) } catch { /* no-op */ }
  window.dispatchEvent(new PopStateEvent('popstate'))
}
export function closeCard() {
  if (window.history.state && window.history.state.card) { window.history.back(); return }
  const base = (window.location.hash || '#/river').replace(/\/item\/.*$/, '') || '#/river'
  try { window.history.replaceState({ page: base.replace(/^#\/?/, '').split('/')[0] || 'river' }, '', base) } catch { /* no-op */ }
  window.dispatchEvent(new PopStateEvent('popstate'))
}
