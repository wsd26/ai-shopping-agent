interface QuickReplyChipsProps {
  replies: string[]
  onSelect: (reply: string) => void
  disabled?: boolean
}

export function QuickReplyChips({ replies, onSelect, disabled }: QuickReplyChipsProps) {
  if (replies.length === 0) return null

  return (
    <div className="flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-none">
      {replies.map((reply) => (
        <button
          key={reply}
          onClick={() => onSelect(reply)}
          disabled={disabled}
          className="shrink-0 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-white/80 text-xs transition-colors disabled:opacity-30 disabled:cursor-not-allowed active:scale-95"
        >
          {reply}
        </button>
      ))}
    </div>
  )
}