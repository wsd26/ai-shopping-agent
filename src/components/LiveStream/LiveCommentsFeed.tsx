import { useEffect, useState } from 'react'
import { useLiveStreamStore } from '../../store/useLiveStreamStore'
import type { LiveComment } from '../../constants/liveStream'

export function LiveCommentsFeed() {
  const comments = useLiveStreamStore((s) => s.comments)
  const generateRandomComment = useLiveStreamStore((s) => s.generateRandomComment)
  const [displayComments, setDisplayComments] = useState<LiveComment[]>([])

  useEffect(() => {
    setDisplayComments(comments.slice(-6))
  }, [comments])

  useEffect(() => {
    const timer = setInterval(() => {
      generateRandomComment()
    }, 2500)
    return () => clearInterval(timer)
  }, [generateRandomComment])

  return (
    <div className="absolute right-2 bottom-20 top-20 w-36 flex flex-col gap-1.5 overflow-hidden pointer-events-none z-10">
      {displayComments.map((comment) => (
        <div
          key={comment.id}
          className="bg-black/30 backdrop-blur-sm rounded-lg px-2.5 py-1.5 text-left animate-fade-in"
        >
          <span className="text-orange-300 text-[11px] font-medium">{comment.user}: </span>
          <span className="text-white/80 text-[11px]">{comment.text}</span>
        </div>
      ))}
    </div>
  )
}