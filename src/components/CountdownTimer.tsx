import { useEffect, useState } from 'react'

interface CountdownTimerProps {
  deadline: string
}

export default function CountdownTimer({ deadline }: CountdownTimerProps) {
  const [now, setNow] = useState(Date.now())

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 60000)
    return () => clearInterval(timer)
  }, [])

  const deadlineMs = new Date(deadline).getTime()
  const diff = deadlineMs - now

  if (diff <= 0) {
    return (
      <span className="inline-flex items-center gap-1 text-critical-500 font-semibold animate-flash">
        已逾期
      </span>
    )
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24))
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

  if (days < 7) {
    return (
      <span className="inline-flex items-center gap-1 text-warning-600 font-semibold">
        {days > 0 && `${days}天`}{hours}小时
      </span>
    )
  }

  return (
    <span className="inline-flex items-center gap-1 text-accent-600 font-medium">
      {days}天{hours}小时
    </span>
  )
}
