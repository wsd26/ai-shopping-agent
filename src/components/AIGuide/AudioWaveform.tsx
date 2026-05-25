import { useRef, useEffect } from 'react'
import { useConversationStore } from '../../store/useConversationStore'

export function AudioWaveform() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const isRecording = useConversationStore((s) => s.isRecording)
  const isSpeaking = useConversationStore((s) => s.isSpeaking)
  const animFrameRef = useRef<number>(0)

  useEffect(() => {
    if (!isRecording && !isSpeaking) {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
        animFrameRef.current = 0
      }
      const canvas = canvasRef.current
      if (canvas) {
        const ctx = canvas.getContext('2d')
        if (ctx) ctx.clearRect(0, 0, canvas.width, canvas.height)
      }
      return
    }

    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw)
      const { width, height } = canvas
      ctx.clearRect(0, 0, width, height)

      const barCount = 20
      const barWidth = width / barCount - 2
      const time = Date.now() / 200

      for (let i = 0; i < barCount; i++) {
        const amplitude = isRecording
          ? Math.sin(time + i * 0.5) * 0.4 + 0.6 + Math.random() * 0.3
          : Math.sin(time + i * 0.3) * 0.5 + 0.5
        const barHeight = amplitude * height * 0.8
        const x = i * (barWidth + 2)
        const y = (height - barHeight) / 2

        const gradient = ctx.createLinearGradient(0, y, 0, y + barHeight)
        gradient.addColorStop(0, '#FF6B6B')
        gradient.addColorStop(0.5, '#FF4900')
        gradient.addColorStop(1, '#FFB347')

        ctx.fillStyle = gradient
        ctx.beginPath()
        ctx.roundRect(x, y, barWidth, barHeight, barWidth / 2)
        ctx.fill()
      }
    }

    draw()

    return () => {
      if (animFrameRef.current) {
        cancelAnimationFrame(animFrameRef.current)
      }
    }
  }, [isRecording, isSpeaking])

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={40}
      className="w-full h-10"
    />
  )
}