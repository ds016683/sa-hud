import { useState, useEffect, useRef } from 'react'

const NotePrompt = ({ isOpen, onSubmit, onUndo, actionLabel }) => {
  const [note, setNote] = useState('')
  const inputRef = useRef(null)

  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus()
    }
    if (!isOpen) {
      setNote('')
    }
  }, [isOpen])

  const handleSubmit = (e) => {
    e.preventDefault()
    onSubmit(note.trim() || null)
    setNote('')
  }

  const handleUndo = () => {
    onUndo()
    setNote('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      handleUndo()
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
      <div
        className="game-panel w-full max-w-md shadow-xl"
        onKeyDown={handleKeyDown}
      >
        <div className="mb-3">
          <div className="text-game-gold text-sm font-bold mb-1">Action logged</div>
          <div className="text-game-text-muted text-xs">{actionLabel}</div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="text-game-text-muted text-[10px] block mb-1">
              Add context? (optional)
            </label>
            <textarea
              ref={inputRef}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="What was this about? What triggered it?"
              className="w-full bg-white border border-game-border rounded-sm p-2 text-sm text-game-text placeholder-game-text-dim focus:border-game-accent focus:outline-none resize-none"
              rows={2}
            />
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleUndo}
              className="flex-1 py-2 bg-rose-950 hover:bg-rose-900 border border-rose-700 text-rose-400 text-xs font-bold rounded-sm transition-all"
            >
              Undo Action
            </button>
            <button
              type="submit"
              className="flex-1 py-2 bg-game-gold bg-opacity-20 hover:bg-opacity-30 border border-game-gold text-game-gold text-xs font-bold rounded-sm transition-all"
            >
              {note.trim() ? 'Save Note' : 'Confirm'}
            </button>
          </div>
        </form>

        <div className="mt-2 text-[9px] text-game-text-dim text-center">
          Press Escape to undo
        </div>
      </div>
    </div>
  )
}

export default NotePrompt
