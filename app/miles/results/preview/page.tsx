'use client'

import { Suspense } from 'react'
import MilesResultPreview from '@/components/miles-goal/MilesResultPreview'

export default function PreviewResultsPage() {
  return <Suspense fallback={null}><MilesResultPreview /></Suspense>
}
