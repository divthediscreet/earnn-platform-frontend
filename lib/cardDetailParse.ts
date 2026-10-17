// Generic parser for card detail text (best_for / benefits / card_disclaimer).
// Nothing here is card-specific: it keys off the label prefixes and separators
// ("Top earn rates:", "Highlight:", "|", ";", "→") so edited backend text still renders.

export type EarnRate = { big: string; label: string }
export type TierRow = { spend: string; reward: string }
export type Benefit = { title: string; sub: string | null; icon: string; category: string | null; provider: string | null }
export type BenefitRow = { benefit_category_normalised?: string | null; featured_display_message?: string | null; provider?: string | null }
export type Note = { kind: 'warn' | 'low' | 'bonus' | 'info'; label: string; text: string }

export type ParsedDetail = {
  headline: string
  monthlyCap: string | null
  earnRates: EarnRate[]
  highlights: { text: string; icon: string }[]
  benefits: Benefit[]
  tierTitle: string | null
  tiers: TierRow[]
  notes: Note[]
}

const splitPipes = (value: string) => value.split('|').map(part => part.trim()).filter(Boolean)

const ICONS: [RegExp, string][] = [
  [/lounge/i, '🛋️'], [/cinema|movie|vox|reel/i, '🎬'], [/golf/i, '⛳'], [/valet|parking/i, '🅿️'],
  [/careem|transfer|ride|bolt|chauffeur|taxi/i, '🚗'], [/hotel|stay|night|resort|booking\.com/i, '🏨'],
  [/airline|flight|ticket|air\s?arabia|etihad|emirates|miles|airport|fast-?track/i, '✈️'],
  [/dining|restaurant|food|cafe|coffee/i, '🍽️'], [/grocery|supermarket|carrefour|lulu/i, '🛒'],
  [/fuel|petrol|adnoc|enoc/i, '⛽'], [/deliver|talabat|noon food|instashop/i, '🛵'],
  [/insurance|protection|cover/i, '🛡️'], [/spa|wellness|massage|health/i, '💆'],
  [/concierge|meet & greet|marhaba|thriwe/i, '🛎️'], [/cashback|cash back|rebate|credit/i, '💰'],
  [/free for life|no annual fee|waive|free/i, '🎁'], [/discount|off\b|save|%/i, '🏷️'],
  [/shop|mall|retail|ecommerce|online|amazon|noon/i, '🛍️'], [/bonus|welcome|reward|points|spend/i, '⭐'],
]

export function iconFor(text: string): string {
  for (const [pattern, icon] of ICONS) if (pattern.test(text)) return icon
  return '✨'
}

function parseEarnRate(part: string): EarnRate {
  const onIndex = part.search(/\s+on\s+/i)
  if (onIndex > 0) return { big: part.slice(0, onIndex).trim(), label: part.slice(onIndex).replace(/^\s+on\s+/i, 'on ').trim() }
  const lead = part.match(/^([\d.,]+\s*(?:%|x)?)\s+(.*)$/)
  if (lead) return { big: lead[1].trim(), label: lead[2].trim() }
  return { big: '', label: part }
}

function splitHighlight(text: string): string[] {
  const pieces = text
    .split(/\s*[;|]\s*|\.\s+(?=[A-Z])|,?\s+plus\s+|\.$/i)
    .map(part => part.trim().replace(/[.,]$/, ''))
    .filter(part => part.length > 1)
  // Long run-on lists ("a, b and c") become separate chips; commas inside brackets are kept.
  return pieces.flatMap(piece => piece.length <= 70 ? [piece] : piece.split(/,\s+(?:and\s+)?(?![^(]*\))|\s+and\s+(?![^(]*\))/).map(part => part.trim()).filter(part => part.length > 1))
}

function parseBenefit(raw: string, category: string | null = null, provider: string | null = null): Benefit {
  const text = raw.trim().replace(/\.$/, '')
  const match = text.match(/^(.*?)\s+[–—]\s+([^–—]+)$/)
  const title = match ? match[1].trim() : text
  const sub = match ? match[2].trim() : null
  return { title, sub, icon: iconFor(title), category, provider }
}

export function parseDetail(bestFor: string[], benefits: string[], disclaimer: string[], benefitRows: BenefitRow[] = []): ParsedDetail {
  const parsed: ParsedDetail = { headline: '', monthlyCap: null, earnRates: [], highlights: [], benefits: [], tierTitle: null, tiers: [], notes: [] }

  const extras: string[] = []
  for (const line of bestFor) {
    const match = String(line).match(/^\s*([A-Za-z][A-Za-z ]{2,25}?)\s*:\s*([\s\S]*)$/)
    const label = match?.[1].toLowerCase()
    const body = match?.[2] ?? String(line)
    if (label === 'top earn rates') parsed.earnRates.push(...splitPipes(body).map(parseEarnRate))
    else if (label === 'highlight' || label === 'highlights') parsed.highlights.push(...splitHighlight(body).map(text => ({ text, icon: iconFor(text) })))
    else if (label === 'best for') parsed.headline = splitPipes(body).join(' · ')
    else if (label === 'monthly earn cap') parsed.monthlyCap = body.trim()
    else extras.push(...splitPipes(String(line)))
  }
  // Unlabelled best_for text: still shown, never dropped.
  if (!parsed.headline && extras.length) parsed.headline = extras.shift() as string
  extras.forEach(text => parsed.highlights.push({ text, icon: iconFor(text) }))

  // Prefer category-aware rows (so each benefit gets its own visual); fall back to plain strings.
  const rows = benefitRows.filter(row => row.featured_display_message)
  parsed.benefits = (rows.length
    ? rows.map(row => parseBenefit(String(row.featured_display_message), row.benefit_category_normalised ?? null, row.provider ?? null))
    : benefits.map(text => parseBenefit(text))).filter(item => item.title)

  for (const line of disclaimer.flatMap(item => splitPipes(String(item)))) {
    if (/^spend\b.*(→|->)/i.test(line)) {
      const [spend, ...rest] = line.split(/\s*(?:→|->)\s*/)
      parsed.tiers.push({ spend: spend.trim(), reward: rest.join(' → ').trim() })
    } else if (/^tiered system/i.test(line)) {
      parsed.tierTitle = line.replace(/^tiered system\s*[—–-]?\s*/i, '').replace(/:$/, '')
    } else if (/^not ideal for\s*:/i.test(line)) parsed.notes.push({ kind: 'warn', label: 'Not ideal for', text: line.replace(/^[^:]+:\s*/, '') })
    else if (/^low earn on\s*:/i.test(line)) parsed.notes.push({ kind: 'low', label: 'Low earn on', text: line.replace(/^[^:]+:\s*/, '') })
    else if (/^bonus on\b/i.test(line)) parsed.notes.push({ kind: 'bonus', label: 'Bonus limit', text: line.replace(/^bonus on\s*/i, 'On ') })
    else parsed.notes.push({ kind: 'info', label: '', text: line })
  }
  return parsed
}
