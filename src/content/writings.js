// Writings (10/22): the pieces David writes, one entry each. The text lives
// as Markdown under public/writings/<slug>/ on this site and is rendered on
// the Writings page. Drafts are filed here first; publication is a later step.
export const WRITINGS = [
  {
    slug: 'from-player-to-maestro',
    file: 'From-Player-to-Maestro.md',
    title: 'From Player to Maestro',
    subtitle: 'What happens to the job when the machines are playing the instruments.',
    kind: 'Blog',
    date: '2026-10-22',
    status: 'draft',      // draft · final · published
    // Cross-reference: the Ledger Side Mission this piece was written under.
    mission: 'a6462ff4-d85e-4f36-9439-13dd9ef61a99',
  },
]

export const writingUrl = (w) => `/writings/${w.slug}/${w.file}`
export const STATUS_LABEL = { draft: 'Draft', final: 'Final', published: 'Published' }
