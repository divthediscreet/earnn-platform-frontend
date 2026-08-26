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

export async function simulateMilesGoal(
  request: MilesGoalSimulationRequest,
  options: { signal?: AbortSignal } = {},
): Promise<MilesGoalSimulationResponse> {
  const response = await fetch('/api/miles-goal/simulate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
    signal: options.signal,
  })
  const payload: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const body = payload && typeof payload === 'object' ? payload as Record<string, unknown> : {}
    const detail = body.detail && typeof body.detail === 'object' ? body.detail as Record<string, unknown> : body
    throw new MilesGoalApiError(
      typeof detail.message === 'string' ? detail.message : 'We could not calculate this miles plan right now.',
      response.status,
      typeof detail.code === 'string' ? detail.code : 'miles_goal_request_failed',
    )
  }
  if (!isMilesGoalResponse(payload)) {
    throw new MilesGoalApiError('The Miles Goal response version is not supported.', 502, 'unsupported_contract_version')
  }
  return payload
}
