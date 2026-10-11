'use client'

// One-time choice for "keep my entries while I use earnn", shown as a small bar along the bottom of the screen (like a
// cookie bar) only after the user has typed something, and never again once they have chosen.
// Wording and buttons follow DIFC Data Protection Regulations 9.2.3 / 9.3.3: plain language, equal-weight buttons,
// nothing pre-selected. Until they choose "Keep for this visit", what they typed is held in memory only.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { PROFILE_EVENT, ensureProfileLoaded, hasPendingInput, readPref, writePref, type ProfilePref } from '@/lib/profile/storage'

function subscribe(onChange: () => void) {
  window.addEventListener(PROFILE_EVENT, onChange)
  return () => window.removeEventListener(PROFILE_EVENT, onChange)
}

/** The user's choice: 'save' | 'skip' | 'ask' (not chosen yet); 'pending' during server render and the first moments of a new tab. */
export function useProfilePref(): ProfilePref | 'ask' | 'pending' {
  const pref = useSyncExternalStore(subscribe, () => readPref() ?? 'ask', () => 'pending' as const)
  const [loaded, setLoaded] = useState(false)
  useEffect(() => {
    let alive = true
    ensureProfileLoaded().then(() => { if (alive) setLoaded(true) })
    return () => { alive = false }
  }, [])
  return loaded ? pref : 'pending'
}

const btn: React.CSSProperties = { padding: '9px 18px', borderRadius: 8, border: '1.5px solid #0E3785', background: '#fff', color: '#0E3785', fontWeight: 700, fontSize: 13, cursor: 'pointer' }

export default function ProfileNotice() {
  const pref = useProfilePref()
  const typed = useSyncExternalStore(subscribe, hasPendingInput, () => false)
  if (pref !== 'ask' || !typed) return null

  return (
    <div
      role="region"
      aria-label="Keep your details while you use earnn"
      style={{
        position: 'fixed', left: 0, right: 0, bottom: 0, zIndex: 1200, background: '#fff', borderTop: '1px solid #D6E0F5',
        boxShadow: '0 -4px 18px rgba(14,55,133,0.10)', padding: '14px 16px', color: '#0D1828', fontSize: 13, lineHeight: 1.5,
      }}
    >
      <div style={{ maxWidth: 1100, margin: '0 auto', display: 'flex', gap: 16, alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
        <div style={{ flex: '1 1 420px', minWidth: 0 }}>
          <strong style={{ display: 'block', marginBottom: 2 }}>Keep your details while you browse earnn?</strong>
          <span style={{ color: '#5A6A85' }}>
            We can remember your salary, monthly spending and big payments so you don&apos;t have to type them again on Best for Me,
            Big Spend Planner and Trip Planner, including in another tab. They are held only in this browser, never sent to us, and are
            deleted as soon as you close the site. See our <a href="/privacy-policy" style={{ color: '#0E3785', textDecoration: 'underline' }}>Privacy Policy</a>.
          </span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
          <button type="button" style={btn} onClick={() => writePref('save')}>Keep for this visit</button>
          <button type="button" style={btn} onClick={() => writePref('skip')}>Don&apos;t keep</button>
        </div>
      </div>
    </div>
  )
}
