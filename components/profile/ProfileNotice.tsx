'use client'

// First-use choice for "keep my entries while I use earnn", plus a small status line afterwards.
// Wording and buttons follow DIFC Data Protection Regulations 9.2.3 / 9.3.3: plain language, equal-weight buttons,
// nothing pre-selected, and the choice can be changed at any time.
import { useEffect, useState, useSyncExternalStore } from 'react'
import { PROFILE_EVENT, clearProfile, ensureProfileLoaded, readPref, writePref, type ProfilePref } from '@/lib/profile/storage'

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

const card: React.CSSProperties = { background: '#EEF3FF', border: '1px solid #D6E0F5', borderRadius: 12, padding: '12px 14px', margin: '0 0 14px', color: '#0D1828', fontSize: 13, lineHeight: 1.5 }
const btn: React.CSSProperties = { padding: '7px 14px', borderRadius: 8, border: '1.5px solid #0E3785', background: '#fff', color: '#0E3785', fontWeight: 700, fontSize: 13, cursor: 'pointer' }
const link: React.CSSProperties = { background: 'none', border: 0, padding: 0, color: '#0E3785', fontWeight: 600, fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }

export default function ProfileNotice() {
  const pref = useProfilePref()
  if (pref === 'pending') return null

  if (pref === 'ask') {
    return (
      <div role="region" aria-label="Keep your details while you use earnn" style={card}>
        <strong style={{ display: 'block', marginBottom: 2 }}>Keep your details while you browse earnn?</strong>
        <span style={{ color: '#5A6A85' }}>
          We can remember your salary, monthly spending and big payments so you don&apos;t have to type them again on Best for Me,
          Big Spend Planner and Trip Planner, including in another tab. They are held only in this browser, never sent to us, and are
          deleted as soon as you close the site. See our <a href="/privacy-policy" style={{ color: '#0E3785' }}>Privacy Policy</a>.
        </span>
        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button type="button" style={btn} onClick={() => writePref('save')}>Keep for this visit</button>
          <button type="button" style={btn} onClick={() => writePref('skip')}>Don&apos;t keep</button>
        </div>
      </div>
    )
  }

  if (pref === 'save') {
    return (
      <p style={{ ...card, background: '#F8FAFF', padding: '8px 12px', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'center' }}>
        <span>Your entries are kept for this visit only and deleted when you close the site.</span>
        <button type="button" style={link} onClick={() => clearProfile()}>Clear now</button>
        <button type="button" style={link} onClick={() => writePref('skip')}>Stop keeping</button>
      </p>
    )
  }

  return (
    <p style={{ ...card, background: '#F8FAFF', padding: '8px 12px' }}>
      <button type="button" style={link} onClick={() => writePref('save')}>Keep my entries for this visit</button>
    </p>
  )
}
