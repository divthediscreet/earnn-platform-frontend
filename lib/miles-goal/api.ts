import type { MilesGoalSimulationRequest, MilesGoalSimulationResponse } from './contracts'
import { isMilesGoalResponse } from './contracts'

export class MilesGoalApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly code: string,
  ) {
    super(message)
    this.name = 'MilesGoalApiError'
  }
}

function retryDelay(): Promise<void> {
  return new Promise(resolve => window.setTimeout(resolve, 350))
}

export async function simulateMilesGoal(
  request: MilesGoalSimulationRequest,
  options: { signal?: AbortSignal } = {},
): Promise<MilesGoalSimulationResponse> {
  // Simulation is read-only. A short retry masks a transient proxy/database
  // failure without duplicating any user action or changing a valid response.
  for (let attempt = 0; attempt < 2; attempt += 1) {
    let response: Response
    try {
      response = await fetch('/api/miles-goal/simulate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(request),
        signal: options.signal,
      })
    } catch (error) {
      if (options.signal?.aborted || attempt === 1) {
        if (error instanceof Error && error.name === 'AbortError') throw error
        throw new MilesGoalApiError('We could not calculate this miles plan right now.', 0, 'miles_goal_request_failed')
      }
      await retryDelay()
      continue
    }

    const payload: unknown = await response.json().catch(() => null)
    if (!response.ok) {
      const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
      const detail = body.detail && typeof body.detail === 'object' ? body.detail as Record<string, unknown> : body
      const error = new MilesGoalApiError(
        typeof detail.message === 'string' ? detail.message : 'We could not calculate this miles plan right now.',
        response.status,
        typeof detail.code === 'string' ? detail.code : 'miles_goal_request_failed',
      )
      if (attempt === 0 && response.status >= 500) {
        await retryDelay()
        continue
      }
      throw error
    }
    if (!isMilesGoalResponse(payload)) {
      throw new MilesGoalApiError('The Miles Goal response version is not supported.', 502, 'unsupported_contract_version')
    }
    return payload
  }
  throw new MilesGoalApiError('We could not calculate this miles plan right now.', 0, 'miles_goal_request_failed')
}
