'use client'

export default function FooterFeedbackLink({ style }: { style?: React.CSSProperties }) {
  return (
    <button
      onClick={() => window.dispatchEvent(new Event('earnn:open-feedback'))}
      style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', textAlign: 'left', font: 'inherit', ...style }}
    >
      Feedback
    </button>
  )
}
