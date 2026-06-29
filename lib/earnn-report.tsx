'use client'
/**
 * earnn-report.tsx
 * ================
 * Professional PDF report generator — earnn.money
 *
 * Layout:
 *   Page 1  — Summary: recommended wallet, key metrics, card list
 *   Page 2  — Spend Allocation: category-by-category routing breakdown
 *
 * Style reference: S&P Global / Moody's research report format
 *   - Navy header/footer bar
 *   - Compact serif-adjacent sans typography
 *   - Alternating table rows
 *   - Clear section dividers
 *   - earnn blue (#0E3785) as brand accent
 */

import {
  Document, Page, Text, View, StyleSheet, Font, pdf,
} from '@react-pdf/renderer'

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  navy:     '#0E3785',
  navyDark: '#091f52',
  teal:     '#0e7490',
  emerald:  '#047857',
  amber:    '#b45309',
  red:      '#b91c1c',
  slate:    '#475569',
  gray:     '#64748b',
  silver:   '#94a3b8',
  linen:    '#f8fafc',
  rowOdd:   '#f0f5ff',
  rowEven:  '#ffffff',
  border:   '#cbd5e1',
  bodyText: '#1e293b',
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 8.5,
    color: C.bodyText,
    backgroundColor: '#fff',
    paddingBottom: 48,
  },

  // Header bar
  header: {
    backgroundColor: C.navy,
    paddingHorizontal: 28,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerLogo: { color: '#fff', fontSize: 16, fontFamily: 'Helvetica-Bold', letterSpacing: 0.5 },
  headerLogoSub: { color: 'rgba(255,255,255,0.6)', fontSize: 7.5, letterSpacing: 1, marginTop: 1 },
  headerRight: { color: 'rgba(255,255,255,0.7)', fontSize: 7.5, textAlign: 'right' },

  // Title block (below header)
  titleBlock: {
    backgroundColor: C.linen,
    borderBottomWidth: 3,
    borderBottomColor: C.navy,
    paddingHorizontal: 28,
    paddingVertical: 14,
  },
  reportLabel: { fontSize: 7, letterSpacing: 1.5, color: C.silver, textTransform: 'uppercase', marginBottom: 4 },
  reportTitle: { fontSize: 20, fontFamily: 'Helvetica-Bold', color: C.navy, letterSpacing: -0.3 },
  reportSub:   { fontSize: 8.5, color: C.slate, marginTop: 3 },

  // Body padding
  body: { paddingHorizontal: 28, paddingTop: 16 },

  // Section header
  sectionHead: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginTop: 16,
    gap: 6,
  },
  sectionLine: { flex: 1, height: 0.75, backgroundColor: C.border },
  sectionTitle: { fontSize: 7.5, fontFamily: 'Helvetica-Bold', color: C.navy, letterSpacing: 1, textTransform: 'uppercase' },

  // Key metric cards (3-col)
  metricRow: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  metricBox: {
    flex: 1,
    backgroundColor: C.linen,
    borderWidth: 0.75,
    borderColor: C.border,
    borderRadius: 4,
    padding: 10,
  },
  metricBoxAccent: {
    flex: 1,
    backgroundColor: C.navy,
    borderRadius: 4,
    padding: 10,
  },
  metricLabel:  { fontSize: 7, color: C.silver, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  metricLabelW: { fontSize: 7, color: 'rgba(255,255,255,0.65)', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  metricValue:  { fontSize: 18, fontFamily: 'Helvetica-Bold', color: C.navy },
  metricValueW: { fontSize: 18, fontFamily: 'Helvetica-Bold', color: '#4ade80' },
  metricSub:    { fontSize: 7, color: C.gray, marginTop: 2 },
  metricSubW:   { fontSize: 7, color: 'rgba(255,255,255,0.55)', marginTop: 2 },

  // Card list table
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: C.navy,
    paddingVertical: 5,
    paddingHorizontal: 8,
    borderRadius: 3,
    marginBottom: 0,
  },
  tableHeaderCell: { fontSize: 7, fontFamily: 'Helvetica-Bold', color: '#fff', letterSpacing: 0.6 },
  tableRow: { flexDirection: 'row', paddingVertical: 7, paddingHorizontal: 8, borderBottomWidth: 0.5, borderBottomColor: C.border },
  tableCell: { fontSize: 8, color: C.bodyText },
  tableCellBold: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.bodyText },
  tableCellGreen: { fontSize: 8, fontFamily: 'Helvetica-Bold', color: C.emerald },
  tableCellRed:   { fontSize: 8, color: C.red },
  tableCellMuted: { fontSize: 7.5, color: C.gray },

  // Tag pill
  tag: {
    backgroundColor: '#e0f2fe',
    borderRadius: 20,
    paddingHorizontal: 5,
    paddingVertical: 1.5,
    marginRight: 3,
  },
  tagText: { fontSize: 6.5, color: C.teal, fontFamily: 'Helvetica-Bold' },

  // Allocation bar
  barBg: { height: 6, backgroundColor: '#e2e8f0', borderRadius: 3, flex: 1 },
  barFill: { height: 6, borderRadius: 3, backgroundColor: C.navy },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: C.navyDark,
    paddingHorizontal: 28,
    paddingVertical: 8,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  footerText: { fontSize: 6.5, color: 'rgba(255,255,255,0.45)' },

  // Highlight box
  highlight: {
    backgroundColor: '#eff6ff',
    borderLeftWidth: 3,
    borderLeftColor: C.navy,
    paddingHorizontal: 10,
    paddingVertical: 8,
    marginBottom: 14,
    borderRadius: 2,
  },
  highlightText: { fontSize: 8, color: C.navy },
})

// ── Helpers ────────────────────────────────────────────────────────────────────
const fmt = (n: number) => Math.round(n).toLocaleString('en-AE')
const CAT_LABELS: Record<string, string> = {
  dining:'Dining', grocery:'Grocery', travel:'Travel', fuel:'Fuel',
  online:'Online', international:'International', entertainment:'Entertainment',
  retail:'Retail', telecom:'Telecom', transport:'Transport',
  utility:'Utilities', education:'Education', miscellaneous:'Other',
  all_spend:'All Spend',
}

// ── Types ──────────────────────────────────────────────────────────────────────
interface CardRow {
  earnn_card_id: string
  card_name: string
  bank_name?: string
  expected_annual_return_aed: number
  true_annual_fee_aed: number
  net_annual_value_aed: number
  category_effective_rates: Record<string, number>
  card_summary_tag?: string
}

interface WalletEntry {
  n_cards: number
  gross_annual_aed: number
  total_fee_aed: number
  net_annual_value_aed: number
  card_ids: string[]
}

interface CategoryRoute {
  card_id: string
  card_name: string
  rate: number
  annual_aed: number
  monthly_spend_chunk: number
}

interface ReportProps {
  cards: CardRow[]
  wallet: WalletEntry | null
  userSpend: Record<string, number>
  totalMonthly: number
  categoryRouting: Record<string, CategoryRoute[]>
  generatedDate: string
  net: number
  gross: number
  fees: number
}

// ── Page 1 — Wallet Summary ────────────────────────────────────────────────────
function Page1({ cards, wallet, net, gross, fees, totalMonthly, generatedDate, userSpend }: ReportProps) {
  const totalAnnual = totalMonthly * 12
  const effectiveRate = totalAnnual > 0 ? ((gross / totalAnnual) * 100).toFixed(2) : '0.00'
  const topCats = Object.entries(userSpend)
    .filter(([, v]) => v > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 4)
    .map(([k, v]) => `${CAT_LABELS[k] || k} (AED ${fmt(v)}/mo)`)
    .join('  ·  ')

  return (
    <Page size="A4" style={S.page}>
      {/* Header */}
      <View style={S.header}>
        <View>
          <Text style={S.headerLogo}>earnn</Text>
          <Text style={S.headerLogoSub}>REWARDS INTELLIGENCE · UAE</Text>
        </View>
        <View>
          <Text style={S.headerRight}>PERSONALISED WALLET REPORT</Text>
          <Text style={S.headerRight}>Generated {generatedDate}</Text>
        </View>
      </View>

      {/* Title */}
      <View style={S.titleBlock}>
        <Text style={S.reportLabel}>Optimised Credit Card Strategy</Text>
        <Text style={S.reportTitle}>Your earnn Wallet Report</Text>
        <Text style={S.reportSub}>
          Based on AED {fmt(totalMonthly)}/month spend across {Object.values(userSpend).filter(v => v > 0).length} categories
        </Text>
      </View>

      <View style={S.body}>

        {/* Key metrics */}
        <View style={[S.sectionHead, { marginTop: 0 }]}>
          <Text style={S.sectionTitle}>Key Metrics</Text>
          <View style={S.sectionLine} />
        </View>

        <View style={S.metricRow}>
          <View style={S.metricBoxAccent}>
            <Text style={S.metricLabelW}>Est. Annual Rewards</Text>
            <Text style={S.metricValueW}>AED {fmt(gross)}</Text>
            <Text style={S.metricSubW}>Gross rewards before fees</Text>
          </View>
          <View style={S.metricBox}>
            <Text style={S.metricLabel}>Annual Fees</Text>
            <Text style={[S.metricValue, { color: C.red }]}>AED {fmt(fees)}</Text>
            <Text style={S.metricSub}>Combined for all cards</Text>
          </View>
          <View style={S.metricBox}>
            <Text style={S.metricLabel}>Net Annual Value</Text>
            <Text style={[S.metricValue, { color: C.emerald }]}>AED {fmt(net)}</Text>
            <Text style={S.metricSub}>After all fees deducted</Text>
          </View>
          <View style={S.metricBox}>
            <Text style={S.metricLabel}>Effective Rate</Text>
            <Text style={[S.metricValue, { fontSize: 18 }]}>{effectiveRate}%</Text>
            <Text style={S.metricSub}>Blended reward rate</Text>
          </View>
        </View>

        {/* Spend context */}
        <View style={S.highlight}>
          <Text style={S.highlightText}>Top spending categories: {topCats}</Text>
        </View>

        {/* Card list */}
        <View style={S.sectionHead}>
          <Text style={S.sectionTitle}>Recommended Wallet — {cards.length} Card{cards.length !== 1 ? 's' : ''}</Text>
          <View style={S.sectionLine} />
        </View>

        <View style={S.tableHeader}>
          <Text style={[S.tableHeaderCell, { flex: 3 }]}>Card Name / Bank</Text>
          <Text style={[S.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Est. Annual Reward</Text>
          <Text style={[S.tableHeaderCell, { flex: 1.2, textAlign: 'right' }]}>Annual Fee</Text>
          <Text style={[S.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Net Value</Text>
          <Text style={[S.tableHeaderCell, { flex: 2 }]}>  Top Earn Rates</Text>
        </View>

        {cards.map((c, i) => {
          const topRates = Object.entries(c.category_effective_rates)
            .filter(([, r]) => r > 0)
            .sort(([, a], [, b]) => b - a)
            .slice(0, 3)
            .map(([cat, r]) => `${CAT_LABELS[cat] || cat} ${(r * 100).toFixed(1)}%`)
            .join('  ·  ')
          return (
            <View key={c.earnn_card_id} style={[S.tableRow, { backgroundColor: i % 2 === 0 ? C.rowEven : C.rowOdd }]}>
              <View style={{ flex: 3 }}>
                <Text style={S.tableCellBold}>{c.card_name}</Text>
                <Text style={S.tableCellMuted}>{c.bank_name ?? ''}</Text>
                {c.card_summary_tag && (
                  <View style={{ flexDirection: 'row', marginTop: 2 }}>
                    <View style={S.tag}><Text style={S.tagText}>{c.card_summary_tag}</Text></View>
                  </View>
                )}
              </View>
              <Text style={[S.tableCellGreen, { flex: 1.5, textAlign: 'right' }]}>AED {fmt(c.expected_annual_return_aed)}</Text>
              <Text style={[S.tableCellRed, { flex: 1.2, textAlign: 'right' }]}>AED {fmt(c.true_annual_fee_aed)}</Text>
              <Text style={[S.tableCellBold, { flex: 1.5, textAlign: 'right', color: C.emerald }]}>AED {fmt(c.net_annual_value_aed)}</Text>
              <Text style={[S.tableCellMuted, { flex: 2, paddingLeft: 8 }]}>{topRates}</Text>
            </View>
          )
        })}

        {/* Totals row */}
        <View style={[S.tableRow, { backgroundColor: '#e8f0fb', borderTopWidth: 1.5, borderTopColor: C.navy }]}>
          <Text style={[S.tableCellBold, { flex: 3 }]}>TOTAL</Text>
          <Text style={[S.tableCellGreen, { flex: 1.5, textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>AED {fmt(gross)}</Text>
          <Text style={[S.tableCellRed, { flex: 1.2, textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>AED {fmt(fees)}</Text>
          <Text style={[S.tableCellBold, { flex: 1.5, textAlign: 'right', color: C.emerald }]}>AED {fmt(net)}</Text>
          <Text style={{ flex: 2 }} />
        </View>

        {/* Disclaimer */}
        <View style={S.sectionHead}>
          <Text style={S.sectionTitle}>Disclaimer</Text>
          <View style={S.sectionLine} />
        </View>
        <Text style={{ fontSize: 7, color: C.silver, lineHeight: 1.5 }}>
          This report is generated by earnn.money based on the spending profile provided and publicly available card information. Reward estimates are illustrative and may vary based on actual transactions, merchant category codes, and card-specific terms. earnn.money is not a licensed financial advisor. Always verify card terms with the issuing bank before applying.
        </Text>
      </View>

      {/* Footer */}
      <View style={S.footer}>
        <Text style={S.footerText}>earnn.money — UAE Credit Card Rewards Intelligence</Text>
        <Text style={S.footerText}>Page 1 of 2  ·  For personal use only</Text>
        <Text style={S.footerText}>earnn.money</Text>
      </View>
    </Page>
  )
}

// ── Page 2 — Spend Allocation Breakdown ───────────────────────────────────────
function Page2({ cards, categoryRouting, userSpend, totalMonthly, gross, generatedDate }: ReportProps) {
  const cats = Object.keys(categoryRouting).filter(k => {
    const routes = categoryRouting[k]
    return routes && routes.length > 0 && (userSpend[k] ?? 0) > 0
  })

  const maxMonthly = Math.max(...cats.map(k => userSpend[k] ?? 0), 1)

  return (
    <Page size="A4" style={S.page}>
      {/* Header */}
      <View style={S.header}>
        <View>
          <Text style={S.headerLogo}>earnn</Text>
          <Text style={S.headerLogoSub}>REWARDS INTELLIGENCE · UAE</Text>
        </View>
        <View>
          <Text style={S.headerRight}>SPEND ALLOCATION BREAKDOWN</Text>
          <Text style={S.headerRight}>Generated {generatedDate}</Text>
        </View>
      </View>

      {/* Title */}
      <View style={S.titleBlock}>
        <Text style={S.reportLabel}>Category-by-Category Routing Analysis</Text>
        <Text style={S.reportTitle}>Spend Allocation & Reward Routing</Text>
        <Text style={S.reportSub}>
          How AED {fmt(totalMonthly)}/month is optimally distributed across your wallet to maximise rewards
        </Text>
      </View>

      <View style={S.body}>

        {/* Summary bar */}
        <View style={S.highlight}>
          <Text style={[S.highlightText, { fontFamily: 'Helvetica-Bold' }]}>
            Total monthly spend: AED {fmt(totalMonthly)}  ·  Estimated monthly rewards: AED {fmt(gross / 12)}  ·  {cards.length} card{cards.length !== 1 ? 's' : ''} in wallet
          </Text>
        </View>

        {/* Table header */}
        <View style={[S.sectionHead, { marginTop: 0 }]}>
          <Text style={S.sectionTitle}>Category Routing Table</Text>
          <View style={S.sectionLine} />
        </View>

        <View style={S.tableHeader}>
          <Text style={[S.tableHeaderCell, { flex: 2 }]}>Category</Text>
          <Text style={[S.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Monthly Spend</Text>
          <Text style={[S.tableHeaderCell, { flex: 2.5 }]}>  Routed to Card</Text>
          <Text style={[S.tableHeaderCell, { flex: 1, textAlign: 'right' }]}>Earn Rate</Text>
          <Text style={[S.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Monthly Reward</Text>
          <Text style={[S.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Annual Reward</Text>
        </View>

        {cats.map((cat, i) => {
          const spend = userSpend[cat] ?? 0
          const routes = categoryRouting[cat] ?? []
          const monthlyReward = routes.reduce((s, r) => s + r.annual_aed / 12, 0)
          const annualReward  = routes.reduce((s, r) => s + r.annual_aed, 0)
          const barWidth = Math.round((spend / maxMonthly) * 100)
          const primaryCard = routes[0]

          return (
            <View key={cat} style={[S.tableRow, { backgroundColor: i % 2 === 0 ? C.rowEven : C.rowOdd, alignItems: 'flex-start' }]}>
              <View style={{ flex: 2 }}>
                <Text style={S.tableCellBold}>{CAT_LABELS[cat] || cat}</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 3, gap: 3 }}>
                  <View style={[S.barBg]}>
                    <View style={[S.barFill, { width: `${barWidth}%` as any }]} />
                  </View>
                </View>
              </View>
              <Text style={[S.tableCell, { flex: 1.5, textAlign: 'right' }]}>AED {fmt(spend)}</Text>
              <View style={{ flex: 2.5, paddingLeft: 8 }}>
                {routes.slice(0, 2).map(r => (
                  <Text key={r.card_id} style={[S.tableCellMuted, { marginBottom: 1 }]}>
                    {r.card_name.length > 28 ? r.card_name.slice(0, 27) + '…' : r.card_name}
                    {routes.length > 1 ? ` (AED ${fmt(r.monthly_spend_chunk)}/mo)` : ''}
                  </Text>
                ))}
              </View>
              <Text style={[S.tableCell, { flex: 1, textAlign: 'right' }]}>
                {primaryCard ? `${(primaryCard.rate * 100).toFixed(1)}%` : '—'}
              </Text>
              <Text style={[S.tableCellGreen, { flex: 1.5, textAlign: 'right' }]}>AED {fmt(monthlyReward)}</Text>
              <Text style={[S.tableCellBold, { flex: 1.5, textAlign: 'right', color: C.emerald }]}>AED {fmt(annualReward)}</Text>
            </View>
          )
        })}

        {/* Total row */}
        <View style={[S.tableRow, { backgroundColor: '#e8f0fb', borderTopWidth: 1.5, borderTopColor: C.navy }]}>
          <Text style={[S.tableCellBold, { flex: 2 }]}>TOTAL</Text>
          <Text style={[S.tableCellBold, { flex: 1.5, textAlign: 'right' }]}>AED {fmt(totalMonthly)}</Text>
          <Text style={{ flex: 2.5 }} />
          <Text style={{ flex: 1 }} />
          <Text style={[S.tableCellGreen, { flex: 1.5, textAlign: 'right', fontFamily: 'Helvetica-Bold' }]}>AED {fmt(gross / 12)}</Text>
          <Text style={[S.tableCellBold, { flex: 1.5, textAlign: 'right', color: C.emerald }]}>AED {fmt(gross)}</Text>
        </View>

        {/* Card summary at bottom */}
        <View style={S.sectionHead}>
          <Text style={S.sectionTitle}>Card Performance Summary</Text>
          <View style={S.sectionLine} />
        </View>

        <View style={S.tableHeader}>
          <Text style={[S.tableHeaderCell, { flex: 3 }]}>Card</Text>
          <Text style={[S.tableHeaderCell, { flex: 2, textAlign: 'right' }]}>Categories Covered</Text>
          <Text style={[S.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Annual Reward</Text>
          <Text style={[S.tableHeaderCell, { flex: 1.5, textAlign: 'right' }]}>Share of Rewards</Text>
        </View>

        {cards.map((card, i) => {
          const cardReward = cats.reduce((s, cat) => {
            const r = (categoryRouting[cat] ?? []).find(r => r.card_id === card.earnn_card_id)
            return s + (r?.annual_aed ?? 0)
          }, 0)
          const coveredCats = cats.filter(cat =>
            (categoryRouting[cat] ?? []).some(r => r.card_id === card.earnn_card_id)
          ).map(k => CAT_LABELS[k] || k).join(', ')
          const share = gross > 0 ? `${Math.round((cardReward / gross) * 100)}%` : '—'
          return (
            <View key={card.earnn_card_id} style={[S.tableRow, { backgroundColor: i % 2 === 0 ? C.rowEven : C.rowOdd }]}>
              <View style={{ flex: 3 }}>
                <Text style={S.tableCellBold}>{card.card_name}</Text>
                <Text style={S.tableCellMuted}>{card.bank_name ?? ''}</Text>
              </View>
              <Text style={[S.tableCellMuted, { flex: 2, textAlign: 'right' }]}>{coveredCats || '—'}</Text>
              <Text style={[S.tableCellGreen, { flex: 1.5, textAlign: 'right' }]}>AED {fmt(cardReward)}</Text>
              <Text style={[S.tableCellBold, { flex: 1.5, textAlign: 'right' }]}>{share}</Text>
            </View>
          )
        })}
      </View>

      {/* Footer */}
      <View style={S.footer}>
        <Text style={S.footerText}>earnn.money — UAE Credit Card Rewards Intelligence</Text>
        <Text style={S.footerText}>Page 2 of 2  ·  For personal use only</Text>
        <Text style={S.footerText}>earnn.money</Text>
      </View>
    </Page>
  )
}

// ── Main Document ─────────────────────────────────────────────────────────────
function EarnnReport(props: ReportProps) {
  return (
    <Document title="earnn Wallet Report" author="earnn.money" creator="earnn.money" producer="earnn.money">
      <Page1 {...props} />
      <Page2 {...props} />
    </Document>
  )
}

// ── Export: download PDF ───────────────────────────────────────────────────────
export async function downloadEarnnReport(props: ReportProps) {
  const blob = await pdf(<EarnnReport {...props} />).toBlob()
  const url  = URL.createObjectURL(blob)
  const a    = document.createElement('a')
  a.href     = url
  a.download = `earnn-wallet-report-${new Date().toISOString().slice(0, 10)}.pdf`
  a.click()
  URL.revokeObjectURL(url)
}
