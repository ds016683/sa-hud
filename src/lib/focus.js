// A Focused Run holds the Board to one thing (David 11/18). The top bar's Protocol read and the Run dock
// set what is held here; every load, clock and Console start asks before it goes through. The server holds
// the same line for Lumen's hands (api/_run.mjs focusHold).
let hold = null
export const setFocusHold = (focus) => { hold = focus && focus.objective_id ? { objective_id: focus.objective_id, title: focus.title } : null }
export const focusHold = () => hold
export const focusBlock = (objectiveId = null) => hold && hold.objective_id !== objectiveId ? `A Focused Run is on: only "${hold.title}" is on the Board until it ends.` : null
