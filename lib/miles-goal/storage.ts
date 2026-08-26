import { isMilesGoalResponse } from './contracts'
import type { Airline, AirlineScope, MilesGoalSimulationResponse, PersonalizedProfile, StrategyId, ToggleState } from './contracts'

const KEY = 'earnn_miles_goal_v1'
const STORAGE_VERSION = 1
const SESSION_TTL_MS = 30 * 60 * 1000

export interface MilesGoalSession {
  version: 1
  region_id: string
  mode: 'personalized'
  airline_scope: AirlineScope
  focused_strategy: StrategyId
  profile: PersonalizedProfile | null
  responses: Partial<Record<Airline, MilesGoalSimulationResponse>>
  toggles: Partial<Record<Airline, ToggleState>>
  saved_at: number
  expires_at: number
}

export function readMilesGoalSession(): MilesGoalSession | null {
  if (typeof window === 'undefined') return null
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? 'null')
    if (!value || typeof value !== 'object') return null
    const session = value as Partial<MilesGoalSession>
    if (session.version !== STORAGE_VERSION || typeof session.region_id !== 'string') return null
    if (typeof session.expires_at !== 'number' || session.expires_at <= Date.now()) return null
    if (!session.responses || !Object.values(session.responses).every(isMilesGoalResponse)) return null
    return session as MilesGoalSession
  } catch {
    return null
  }
}

export function writeMilesGoalSession(session: MilesGoalSession): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(KEY, JSON.stringify({ ...session, expires_at: Date.now() + SESSION_TTL_MS }))
}

export function clearMilesGoalSession(): void {
  if (typeof window !== 'undefined') sessionStorage.removeItem(KEY)
}
