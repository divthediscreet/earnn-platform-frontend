import { NextRequest, NextResponse } from 'next/server'

// Override Next.js default 30s timeout for this route
export const maxDuration = 120

const RAILWAY_URL = 'https://earnn-platform-production.up.railway.app/api/statements/upload'

export async function POST(req: NextRequest) {
  let formData: FormData
  try {
    formData = await req.formData()
  } catch {
    return NextResponse.json({ error: 'Invalid form data.' }, { status: 400 })
  }

  try {
    const res = await fetch(RAILWAY_URL, {
      method: 'POST',
      body: formData,
      signal: AbortSignal.timeout(115_000),
    })
    const data = await res.json()
    return NextResponse.json(data, { status: res.status })
  } catch (err: any) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return NextResponse.json(
        { success: false, error_code: 'GATEWAY_TIMEOUT', error_message: 'The server took too long to respond. Please try uploading again — it should be faster now.' },
        { status: 504 }
      )
    }
    return NextResponse.json(
      { success: false, error_code: 'GATEWAY_ERROR', error_message: 'Upload failed. Please try again.' },
      { status: 502 }
    )
  }
}
