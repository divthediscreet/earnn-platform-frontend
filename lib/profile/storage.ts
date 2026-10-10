// Saved details: what the user typed (salary, monthly spending, big payments), kept for THIS BROWSER SESSION only so the
// Best for Me, Big Spend Planner and Trip Planner forms can share it.
//
// Lifetime: it lives in sessionStorage, which the browser itself deletes when the tab or window is closed, so there is
// nothing left on the device for the next visit (the site opens fresh). Code cannot run reliably at the moment of the
// "X" click, which is why this uses storage the browser wipes by itself instead of a cleanup handler.
// Sharing between tabs that are open at the same time uses a BroadcastChannel hand-off: a new tab asks the open tabs for
// the details and adopts them. When the last tab closes, every copy is gone.
// Nothing is sent to earnn. It is strictly opt-in: nothing is read or written until the user picks "Keep" (ProfileNotice).
import type { BulkPaymentSchedule } from '@/lib/bulk-spend-miles/api'

const KEY = 'earnn_profile_v1'
const PREF_KEY = 'earnn_profile_pref'
const CHANNEL = 'earnn-profile'
/** Safety expiry in case a browser restores an old session (e.g. "reopen closed tab") long after it was saved. */
const MAX_AGE_MS = 12 * 60 * 60 * 1000
const ADOPT_TIMEOUT_MS = 250
export const PROFILE_EVENT = 'earnn-profile-change'

export type ProfilePref = 'save' | 'skip'

export interface SavedProfile {
  v: 1
  salary?: string
  /** final monthly AED per Best-for-Me spend group (same shape the Trip Planner form keeps) */
  spend?: Record<string, string>
  /** a single monthly total typed on Big Spend Planner, used only when it is newer than `spend` */
  monthly_total?: string
  payments?: BulkPaymentSchedule[]
  savedAt: number
}

type Message =
  | { t: 'req' }
  | { t: 'sync'; pref: ProfilePref | null; profile: SavedProfile | null }

const store = () => window.sessionStorage

const notify = () => { try { window.dispatchEvent(new Event(PROFILE_EVENT)) } catch { /* ignore */ } }

let channel: BroadcastChannel | null | undefined
function getChannel(): BroadcastChannel | null {
  if (channel !== undefined) return channel
  channel = null
  try {
    if (typeof BroadcastChannel === 'undefined') return null
    const ch = new BroadcastChannel(CHANNEL)
    ch.onmessage = (event: MessageEvent<Message>) => {
      const message = event.data
      if (message.t === 'req') {
        const pref = readPref()
        if (pref) ch.postMessage({ t: 'sync', pref, profile: readProfile() } satisfies Message)
      } else if (message.t === 'sync') {
        applyRemote(message.pref, message.profile)
      }
    }
    channel = ch
  } catch { channel = null }
  return channel
}

function broadcast() {
  try { getChannel()?.postMessage({ t: 'sync', pref: readPref(), profile: readProfile() } satisfies Message) } catch { /* ignore */ }
}

function applyRemote(pref: ProfilePref | null, profile: SavedProfile | null) {
  try {
    if (pref) store().setItem(PREF_KEY, pref); else store().removeItem(PREF_KEY)
    if (profile && pref === 'save') store().setItem(KEY, JSON.stringify(profile)); else store().removeItem(KEY)
  } catch { /* ignore */ }
  notify()
}

export function readPref(): ProfilePref | null {
  try {
    const value = store().getItem(PREF_KEY)
    return value === 'save' || value === 'skip' ? value : null
  } catch {
    return null
  }
}

export function clearProfile() {
  try { store().removeItem(KEY) } catch { /* ignore */ }
  notify()
  broadcast()
}

export function writePref(pref: ProfilePref) {
  try { store().setItem(PREF_KEY, pref) } catch { /* storage unavailable: the forms still work for this visit */ }
  if (pref === 'skip') { try { store().removeItem(KEY) } catch { /* ignore */ } }
  notify()
  broadcast()
}

/** The saved details, or null when the user has not opted in, nothing is saved, or it is stale. */
export function readProfile(): SavedProfile | null {
  if (readPref() !== 'save') return null
  try {
    const value = JSON.parse(store().getItem(KEY) ?? 'null') as SavedProfile | null
    if (!value || value.v !== 1 || typeof value.savedAt !== 'number' || Date.now() - value.savedAt > MAX_AGE_MS) return null
    return value
  } catch {
    return null
  }
}

const isEmpty = (patch: Partial<SavedProfile>) =>
  !patch.salary && !Object.keys(patch.spend ?? {}).length && !patch.monthly_total && !(patch.payments ?? []).length

/**
 * Merge new values into the saved details. Does nothing unless the user opted in. A key set to undefined is removed.
 * An all-empty patch never overwrites saved details (a freshly opened tab must not wipe what another tab saved);
 * use "Clear now" to empty them.
 */
export function patchProfile(patch: Partial<Omit<SavedProfile, 'v' | 'savedAt'>>) {
  if (readPref() !== 'save') return
  const current = readProfile()
  if (current && isEmpty(patch) && !isEmpty(current)) return
  try {
    const next = { ...(current ?? { v: 1 as const }), ...patch, v: 1 as const, savedAt: Date.now() }
    store().setItem(KEY, JSON.stringify(next))
    broadcast()
  } catch { /* storage full or blocked: ignore */ }
}

/** Remove anything an earlier version left in long-lived storage, so a returning visitor always starts fresh. */
export function purgeLegacyProfile() {
  try {
    window.localStorage.removeItem('earnn_profile_v1')
    window.localStorage.removeItem('earnn_profile_pref')
  } catch { /* ignore */ }
}

let loading: Promise<void> | null = null
/**
 * Call once before reading the saved details. Deletes legacy long-lived copies, then, if this tab has nothing yet, asks
 * the other open earnn tabs for their details (up to 250 ms) and adopts them. Shared by every caller on the page.
 */
export function ensureProfileLoaded(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  loading ??= new Promise<void>(resolve => {
    purgeLegacyProfile()
    const ch = getChannel()
    if (readPref() || !ch) { resolve(); return }
    const done = () => { window.removeEventListener(PROFILE_EVENT, done); clearTimeout(timer); resolve() }
    const timer = setTimeout(done, ADOPT_TIMEOUT_MS)
    window.addEventListener(PROFILE_EVENT, done)
    try { ch.postMessage({ t: 'req' } satisfies Message) } catch { done() }
  })
  return loading
}
