// Shared planning details live only in this browser's local storage. They are never included in an API request.
// Keeping one profile lets Best for Me, Big Spend Planner and Trip Planner restore the latest entries across tabs and visits.
import type { BulkPaymentSchedule } from '@/lib/bulk-spend-miles/api'
import type { CatalogueCard } from '@/lib/life-moments/api'

const KEY = 'earnn_profile_v1'
const LEGACY_PREF_KEY = 'earnn_profile_pref'
const CHANNEL = 'earnn-profile'
export const PROFILE_EVENT = 'earnn-profile-change'

export interface SavedProfile {
  v: 1
  salary?: string
  /** Final monthly AED per Best-for-Me spend group. */
  spend?: Record<string, string>
  /** A single monthly total typed on Big Spend Planner. */
  monthly_total?: string
  payments?: BulkPaymentSchedule[]
  /** Cards the user says they already own (shared by My Benefits, Big Spend and Trip Planner). */
  owned_cards?: CatalogueCard[]
  savedAt: number
}

type Message = { t: 'sync'; profile: SavedProfile | null }

const store = () => window.localStorage
const notify = () => { try { window.dispatchEvent(new Event(PROFILE_EVENT)) } catch { /* ignore */ } }

let channel: BroadcastChannel | null | undefined
function getChannel(): BroadcastChannel | null {
  if (channel !== undefined) return channel
  channel = null
  try {
    if (typeof BroadcastChannel === 'undefined') return null
    const ch = new BroadcastChannel(CHANNEL)
    ch.onmessage = (event: MessageEvent<Message>) => {
      const { profile } = event.data
      try {
        if (profile) store().setItem(KEY, JSON.stringify(profile))
        else store().removeItem(KEY)
      } catch { /* ignore */ }
      notify()
    }
    channel = ch
  } catch { channel = null }
  return channel
}

function broadcast() {
  try { getChannel()?.postMessage({ t: 'sync', profile: readProfile() } satisfies Message) } catch { /* ignore */ }
}

/** Clear saved planning details from this browser. */
export function clearProfile() {
  try { store().removeItem(KEY) } catch { /* ignore */ }
  notify()
  broadcast()
}

/** The saved details, or null when browser storage is unavailable or invalid. */
export function readProfile(): SavedProfile | null {
  try {
    const value = JSON.parse(store().getItem(KEY) ?? 'null') as SavedProfile | null
    if (!value || value.v !== 1 || typeof value.savedAt !== 'number') return null
    return value
  } catch {
    return null
  }
}

// An explicit owned-card choice (even an empty one) is a deliberate choice, so it always counts as content.
const isEmpty = (patch: Partial<SavedProfile>) =>
  !patch.salary && !Object.keys(patch.spend ?? {}).length && !patch.monthly_total && !(patch.payments ?? []).length
  && patch.owned_cards === undefined

/**
 * Merge new values into the browser-local profile. A key set to undefined is removed.
 * An all-empty patch never overwrites an existing profile (a freshly opened planner must not wipe it).
 */
export function patchProfile(patch: Partial<Omit<SavedProfile, 'v' | 'savedAt'>>) {
  const current = readProfile()
  if (current && isEmpty(patch) && !isEmpty(current)) return
  try {
    const next = { ...(current ?? { v: 1 as const }), ...patch, v: 1 as const, savedAt: Date.now() }
    store().setItem(KEY, JSON.stringify(next))
    notify()
    broadcast()
  } catch { /* storage full or blocked: ignore */ }
}

/**
 * Move a profile saved by the previous session-only version into persistent browser storage once.
 * The old preference is deliberately ignored: saving is now automatic.
 */
function migrateSessionProfile() {
  try {
    if (!store().getItem(KEY)) {
      const previous = window.sessionStorage.getItem(KEY)
      if (previous) store().setItem(KEY, previous)
    }
    window.sessionStorage.removeItem(KEY)
    window.sessionStorage.removeItem(LEGACY_PREF_KEY)
    store().removeItem(LEGACY_PREF_KEY)
  } catch { /* ignore */ }
}

let loading: Promise<void> | null = null
/** Call before reading the profile to complete the one-time session-to-local migration. */
export function ensureProfileLoaded(): Promise<void> {
  if (typeof window === 'undefined') return Promise.resolve()
  loading ??= Promise.resolve().then(migrateSessionProfile)
  return loading
}
