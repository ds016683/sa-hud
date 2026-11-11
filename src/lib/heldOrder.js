import { useState } from 'react'

// An order that holds its place (David 11/11, a few dozen deletes into a clean-up: "when i hit delete now, the
// whole screen shifts"). The groups and the rail were ordered by size on every render, so the moment the group he
// was working in fell to a tie with another, the two swapped and the list jumped out from under him. The order is
// now set by size once, when the view, the grouping or a facet is chosen, and held while he works: a group keeps
// its place as it shrinks, a new one joins at the end, and an emptied one leaves without moving the rest.
export function useHeldOrder(bySize, resetKey) {
  const [held, setHeld] = useState({ key: resetKey, order: bySize })
  const base = held.key === resetKey ? held.order : []
  const added = bySize.filter(k => !base.includes(k))
  const next = added.length ? [...base, ...added] : base
  if (held.key !== resetKey || next !== base) setHeld({ key: resetKey, order: next })
  return next.filter(k => bySize.includes(k))
}
