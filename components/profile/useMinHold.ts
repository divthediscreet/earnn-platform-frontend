'use client'

// Keeps a holding screen up for at least `ms` once it has started, even if the results arrive sooner.
// `active` = "we are waiting for results". The returned value stays true until both the wait and the minimum are over.
import { useEffect, useRef, useState } from 'react'

export function useMinHold(active: boolean, ms = 3000): boolean {
  const [done, setDone] = useState(true) // true = no minimum running
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => {
    if (!active || timer.current) return
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setDone(false)
    timer.current = setTimeout(() => { timer.current = undefined; setDone(true) }, ms)
  }, [active, ms])

  useEffect(() => () => { if (timer.current) { clearTimeout(timer.current); timer.current = undefined } }, [])

  return active || !done
}
