import { useState } from 'react'
import { formatEntryNarrative } from '../hooks/useActivityLog'

const ActivityLog = ({ entries, onExport, onClear, onAddNote, onEditNote, onDelete, stats }) => {
  const [showStats, setShowStats] = useState(false)
  const [manualNote, setManualNote] = useState('')
  const [showNoteInput, setShowNoteInput] = useState(false)
  const [editingId, setEditingId] = useState(null)
  const [editingNote, setEditingNote] = useState('')

  const handleAddManualNote = (e) => {
    e.preventDefault()
    if (manualNote.trim()) {
      onAddNote(manualNote.trim())
      setManualNote('')
      setShowNoteInput(false)
    }
  }

  const handleStartEdit = (entry) => {
    setEditingId(entry.id)
    setEditingNote(entry.note || '')
  }

  const handleSaveEdit = () => {
    if (editingId) {
      onEditNote(editingId, editingNote.trim() || null)
      setEditingId(null)
      setEditingNote('')
    }
  }

  const handleCancelEdit = () => {
    setEditingId(null)
    setEditingNote('')
  }

  const handleDelete = (entryId) => {
    if (window.confirm('Delete this entry?')) {
      onDelete(entryId)
    }
  }

  // Get skill and shadow names for stats display
  const skillNames = {
    gordian_cut: 'Gordian Cut',
    decisive_intervention: 'Decisive Intervention',
    galvanic_surge: 'Galvanic Surge',
    sovereign_yield: 'Sovereign Yield',
    walling: 'Walling'
  }

  const shadowNames = {
    over_control: 'Over-Control',
    isolation_spiral: 'Isolation Spiral',
    intensity_addiction: 'Intensity Addiction',
    false_responsibility: 'False Responsibility'
  }

  return (
    <div className="game-panel p-3 flex flex-col" style={{ height: '400px', maxHeight: '400px' }}>
      <div className="flex justify-between items-center mb-2">
        <h3 className="font-game text-base text-game-gold">ACTIVITY LOG</h3>
        <div className="flex gap-1">
          <button
            onClick={() => setShowStats(!showStats)}
            className={`px-2 py-1 text-[10px] rounded transition-all ${
              showStats
                ? 'bg-game-accent-light text-game-accent border border-game-accent/30'
                : 'bg-game-darker text-game-text-muted hover:text-game-text border border-game-border'
            }`}
          >
            Stats
          </button>
          <button
            onClick={onExport}
            className="px-2 py-1 bg-game-darker hover:bg-game-accent-light text-game-text-muted hover:text-game-text text-[10px] rounded transition-all border border-game-border"
            title="Download log as .txt file"
          >
            Export
          </button>
        </div>
      </div>

      {/* Stats Panel */}
      {showStats && stats && (
        <div className="mb-3 p-2 bg-game-darker rounded border border-game-border shadow-sm">
          <div className="text-[10px] text-game-text-muted mb-2">THIS WEEK</div>

          {Object.keys(stats.skillCounts).length > 0 && (
            <div className="mb-2">
              <div className="text-[9px] text-game-gold mb-1">Skills Used:</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(stats.skillCounts).map(([skill, count]) => (
                  <span
                    key={skill}
                    className="px-1.5 py-0.5 bg-game-accent-light text-game-accent text-[9px] rounded border border-game-accent/20"
                  >
                    {skillNames[skill] || skill}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Object.keys(stats.shadowCounts).length > 0 && (
            <div className="mb-2">
              <div className="text-[9px] text-game-red mb-1">Shadows Detected:</div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(stats.shadowCounts).map(([shadow, count]) => (
                  <span
                    key={shadow}
                    className="px-1.5 py-0.5 bg-red-50 text-red-600 text-[9px] rounded border border-red-200"
                  >
                    {shadowNames[shadow] || shadow}: {count}
                  </span>
                ))}
              </div>
            </div>
          )}

          {Object.keys(stats.skillCounts).length === 0 && Object.keys(stats.shadowCounts).length === 0 && (
            <div className="text-[10px] text-game-text-dim italic">No activity this week</div>
          )}

          <div className="text-[9px] text-game-text-dim mt-2">
            {stats.thisWeekEntries} entries this week • {stats.totalEntries} total
          </div>
        </div>
      )}

      {/* Add Note Button */}
      {!showNoteInput ? (
        <button
          onClick={() => setShowNoteInput(true)}
          className="mb-2 w-full py-1.5 border border-dashed border-game-border hover:border-game-accent/40 text-game-text-dim hover:text-game-text text-[10px] rounded transition-all"
        >
          + Add journal note
        </button>
      ) : (
        <form onSubmit={handleAddManualNote} className="mb-2">
          <textarea
            value={manualNote}
            onChange={(e) => setManualNote(e.target.value)}
            placeholder="What's on your mind?"
            className="w-full bg-white border border-game-border rounded p-2 text-xs text-game-text placeholder-game-text-dim focus:border-game-accent focus:outline-none resize-none mb-1"
            rows={2}
            autoFocus
          />
          <div className="flex gap-1">
            <button
              type="button"
              onClick={() => {
                setShowNoteInput(false)
                setManualNote('')
              }}
              className="flex-1 py-1 bg-game-darker hover:bg-game-border text-game-text-muted text-[10px] rounded border border-game-border"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!manualNote.trim()}
              className="flex-1 py-1 bg-game-gold/10 hover:bg-game-gold/20 border border-game-gold/40 text-game-gold text-[10px] font-bold rounded disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Add
            </button>
          </div>
        </form>
      )}

      {/* Log Entries */}
      <div className="flex-1 overflow-y-auto space-y-2 min-h-0">
        {entries.length === 0 ? (
          <div className="text-center py-8">
            <div className="text-game-text-dim text-sm mb-1">No activity yet</div>
            <div className="text-game-text-subtle text-[10px]">
              Use skills or track shadows to start logging
            </div>
          </div>
        ) : (
          entries.slice(0, 50).map((entry) => {
            const formatted = formatEntryNarrative(entry)
            const isEditing = editingId === entry.id
            return (
              <div
                key={entry.id}
                className={`p-2 rounded border transition-all group ${
                  entry.type === 'shadow'
                    ? 'bg-red-50 border-red-200'
                    : entry.type === 'note'
                    ? 'bg-game-darker border-game-border'
                    : 'bg-game-accent-light border-game-accent/20'
                }`}
              >
                <div className="flex items-start gap-2">
                  <span className="text-sm flex-shrink-0">{formatted.icon}</span>
                  <div className="flex-1 min-w-0">
                    <div className="flex justify-between items-start">
                      <div className="text-[10px] text-game-text-muted mb-0.5">
                        {formatted.timestamp}
                      </div>
                      {/* Edit/Delete buttons - visible on hover */}
                      <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => handleStartEdit(entry)}
                          className="text-[9px] text-game-text-dim hover:text-game-gold px-1"
                          title="Edit note"
                        >
                          edit
                        </button>
                        <button
                          onClick={() => handleDelete(entry.id)}
                          className="text-[9px] text-game-text-dim hover:text-game-red px-1"
                          title="Delete entry"
                        >
                          ×
                        </button>
                      </div>
                    </div>
                    <div className="text-xs text-game-text">
                      {formatted.narrative}
                    </div>
                    {isEditing ? (
                      <div className="mt-1">
                        <textarea
                          value={editingNote}
                          onChange={(e) => setEditingNote(e.target.value)}
                          placeholder="Add a note..."
                          className="w-full bg-white border border-game-border rounded p-1.5 text-[10px] text-game-text placeholder-game-text-dim focus:border-game-accent focus:outline-none resize-none"
                          rows={2}
                          autoFocus
                        />
                        <div className="flex gap-1 mt-1">
                          <button
                            onClick={handleCancelEdit}
                            className="px-2 py-0.5 text-[9px] text-game-text-muted hover:text-game-text"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleSaveEdit}
                            className="px-2 py-0.5 text-[9px] bg-game-gold/10 text-game-gold rounded border border-game-gold/30"
                          >
                            Save
                          </button>
                        </div>
                      </div>
                    ) : entry.note ? (
                      <div className="text-[10px] text-game-text-muted italic mt-1 border-l-2 border-game-accent/30 pl-2">
                        "{entry.note}"
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            )
          })
        )}

        {entries.length > 50 && (
          <div className="text-center py-2 text-[10px] text-game-text-dim">
            Showing 50 most recent • Export to see all {entries.length}
          </div>
        )}
      </div>

      {/* Footer */}
      {entries.length > 0 && (
        <div className="mt-2 pt-2 border-t border-game-border flex justify-between items-center">
          <span className="text-[9px] text-game-text-dim">
            {entries.length} entries • Stored locally
          </span>
          <button
            onClick={onClear}
            className="text-[9px] text-game-text-dim hover:text-game-red transition-all"
          >
            Clear log
          </button>
        </div>
      )}
    </div>
  )
}

export default ActivityLog
