import { useEffect, useRef, useCallback } from 'react'

export function useAutoScroll(dependency: unknown) {
  const containerRef = useRef<HTMLDivElement>(null)
  const userScrolledUpRef = useRef(false)

  const scrollToBottom = useCallback(() => {
    if (containerRef.current && !userScrolledUpRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight
    }
  }, [])

  const handleScroll = useCallback(() => {
    if (!containerRef.current) return
    const { scrollTop, scrollHeight, clientHeight } = containerRef.current
    userScrolledUpRef.current = scrollHeight - scrollTop - clientHeight > 60
  }, [])

  useEffect(() => {
    scrollToBottom()
  }, [dependency, scrollToBottom])

  return { containerRef, scrollToBottom, handleScroll, userScrolledUpRef }
}