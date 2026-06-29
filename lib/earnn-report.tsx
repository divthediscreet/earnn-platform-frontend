'use client'
/**
 * earnn-report.tsx — Professional PDF Report
 * Design: vibrant financial intelligence style
 */

import { Document, Page, Text, View, StyleSheet, Image, pdf } from '@react-pdf/renderer'

const RAILWAY = 'https://earnn-platform-production.up.railway.app'
const cardImg  = (id: string) => `${RAILWAY}/api/cards/images/${id}`

// ── Palette ────────────────────────────────────────────────────────────────────
const C = {
  navy:    '#0E3785',
  navyDk:  '#091F52',
  blue:    '#1D4ED8',
  teal:    '#0891b2',
  emerald: '#059669',
  red:     '#DC2626',
  amber:   '#D97706',
  slate:   '#475569',
  silver:  '#94a3b8',
  light:   '#EEF3FF',
  white:   '#FFFFFF',
  row0:    '#F8FAFF',
  row1:    '#FFFFFF',
  border:  '#CBD5E1',
  text:    '#1E293B',
  muted:   '#64748B',
}

const CAT: Record<string,string> = {
  dining:'Dining', grocery:'Grocery', travel:'Travel', fuel:'Fuel',
  online:'Online', international:'International', entertainment:'Entertainment',
  retail:'Retail', telecom:'Telecom', transport:'Transport',
  utility:'Utilities', education:'Education', miscellaneous:'Other',
  all_spend:'All Spend',
}

const fmt = (n: number) => Math.round(n).toLocaleString('en-AE')

// ── Styles ─────────────────────────────────────────────────────────────────────
const S = StyleSheet.create({
  page:      { fontFamily:'Helvetica', fontSize:8.5, color:C.text, backgroundColor:'#F1F5F9', paddingBottom:52 },
  pageWhite: { fontFamily:'Helvetica', fontSize:8.5, color:C.text, backgroundColor:C.white,  paddingBottom:52 },

  // ── Header ──
  header: { backgroundColor:C.navyDk, paddingHorizontal:30, paddingVertical:14, flexDirection:'row', justifyContent:'space-between', alignItems:'flex-end' },
  logoMark: { color:C.white, fontSize:22, fontFamily:'Helvetica-Bold', letterSpacing:-0.5 },
  logoTag:  { color:'rgba(255,255,255,0.45)', fontSize:6.5, letterSpacing:1.2, marginTop:2 },
  hdrRight: { color:'rgba(255,255,255,0.6)', fontSize:7, textAlign:'right', lineHeight:1.6 },

  // ── Accent stripe ──
  stripe: { height:4, backgroundColor:C.teal },

  // ── Cover hero ──
  hero: { backgroundColor:C.navy, paddingHorizontal:30, paddingTop:24, paddingBottom:28 },
  heroLabel:  { color:'rgba(255,255,255,0.5)', fontSize:7, letterSpacing:1.5, textTransform:'uppercase', marginBottom:6 },
  heroTitle:  { color:C.white, fontSize:26, fontFamily:'Helvetica-Bold', letterSpacing:-0.5, lineHeight:1.2 },
  heroSub:    { color:'rgba(255,255,255,0.65)', fontSize:9, marginTop:6, lineHeight:1.5 },

  // ── Metric strip (horizontal 4 cards) ──
  metricStrip: { flexDirection:'row', marginHorizontal:30, marginTop:-16, gap:10 },
  metricCard:  { flex:1, backgroundColor:C.white, borderRadius:6, padding:10, borderTopWidth:3, borderTopColor:C.navy },
  metricCardG: { flex:1, backgroundColor:C.white, borderRadius:6, padding:10, borderTopWidth:3, borderTopColor:C.emerald },
  metricCardR: { flex:1, backgroundColor:C.white, borderRadius:6, padding:10, borderTopWidth:3, borderTopColor:C.red },
  metricCardT: { flex:1, backgroundColor:C.white, borderRadius:6, padding:10, borderTopWidth:3, borderTopColor:C.teal },
  metricLbl:   { fontSize:6.5, color:C.muted, letterSpacing:0.8, textTransform:'uppercase', marginBottom:4 },
  metricVal:   { fontSize:16, fontFamily:'Helvetica-Bold', color:C.navy, lineHeight:1 },
  metricValG:  { fontSize:16, fontFamily:'Helvetica-Bold', color:C.emerald, lineHeight:1 },
  metricValR:  { fontSize:16, fontFamily:'Helvetica-Bold', color:C.red, lineHeight:1 },
  metricValT:  { fontSize:16, fontFamily:'Helvetica-Bold', color:C.teal, lineHeight:1 },
  metricSub:   { fontSize:6.5, color:C.silver, marginTop:3 },

  // ── Body ──
  body: { paddingHorizontal:30, paddingTop:20 },

  // ── Section header ──
  secHead: { flexDirection:'row', alignItems:'center', gap:8, marginBottom:10, marginTop:18 },
  secLine: { flex:1, height:0.5, backgroundColor:C.border },
  secTitle:{ fontSize:7, fontFamily:'Helvetica-Bold', color:C.navy, letterSpacing:1.2, textTransform:'uppercase' },
  secBadge:{ backgroundColor:C.navy, borderRadius:2, paddingHorizontal:5, paddingVertical:1.5 },
  secBadgeTxt:{ fontSize:6, color:C.white, fontFamily:'Helvetica-Bold' },

  // ── Card tiles ──
  cardTiles: { flexDirection:'row', gap:10 },
  cardTile:  { flex:1, backgroundColor:C.white, borderRadius:6, overflow:'hidden', borderWidth:0.5, borderColor:C.border },
  cardImg:   { width:'100%', height:62, objectFit:'cover' },
  cardBody:  { padding:8 },
  cardName:  { fontSize:7.5, fontFamily:'Helvetica-Bold', color:C.navy, marginBottom:2, lineHeight:1.3 },
  cardBank:  { fontSize:6.5, color:C.muted, marginBottom:6 },
  cardStat:  { flexDirection:'row', justifyContent:'space-between', borderTopWidth:0.5, borderTopColor:C.border, paddingTop:5 },
  cardStatG: { fontSize:9, fontFamily:'Helvetica-Bold', color:C.emerald },
  cardStatR: { fontSize:7, color:C.red },
  cardTag:   { backgroundColor:'#EEF3FF', borderRadius:20, paddingHorizontal:5, paddingVertical:1.5, marginTop:5 },
  cardTagTxt:{ fontSize:6, color:C.navy, fontFamily:'Helvetica-Bold' },
  rateRow:   { flexDirection:'row', flexWrap:'wrap', gap:3, marginTop:5 },
  ratePill:  { backgroundColor:'#F0F9FF', borderRadius:3, paddingHorizontal:4, paddingVertical:1.5 },
  rateTxt:   { fontSize:6, color:C.teal },

  // ── Table ──
  tblHead: { flexDirection:'row', backgroundColor:C.navy, paddingVertical:5, paddingHorizontal:8, borderRadius:3 },
  tblHC:   { fontSize:6.5, fontFamily:'Helvetica-Bold', color:C.white, letterSpacing:0.5 },
  tblRow:  { flexDirection:'row', paddingVertical:6, paddingHorizontal:8, borderBottomWidth:0.5, borderBottomColor:'#EEF3FF' },
  tblC:    { fontSize:7.5, color:C.text },
  tblCB:   { fontSize:7.5, fontFamily:'Helvetica-Bold', color:C.text },
  tblCG:   { fontSize:7.5, fontFamily:'Helvetica-Bold', color:C.emerald },
  tblCR:   { fontSize:7.5, color:C.red },
  tblCM:   { fontSize:7, color:C.muted },

  // ── Bar ──
  barBg:   { height:5, backgroundColor:'#E2E8F0', borderRadius:2.5, flex:1 },
  barFill: { height:5, backgroundColor:C.navy, borderRadius:2.5 },

  // ── Total row ──
  tblTotal:{ flexDirection:'row', paddingVertical:7, paddingHorizontal:8, backgroundColor:'#EEF3FF', borderTopWidth:1.5, borderTopColor:C.navy },

  // ── Disclaimer ──
  disc:    { fontSize:6.5, color:C.silver, lineHeight:1.6, marginTop:12 },

  // ── Footer ──
  footer: { position:'absolute', bottom:0, left:0, right:0, backgroundColor:C.navyDk, paddingHorizontal:30, paddingVertical:9, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  footTxt:{ fontSize:6.5, color:'rgba(255,255,255,0.4)' },
  footBrand:{ fontSize:7, color:'rgba(255,255,255,0.7)', fontFamily:'Helvetica-Bold' },

  // ── P2 allocation hero ──
  allocHero:{ backgroundColor:C.navy, paddingHorizontal:30, paddingVertical:16, flexDirection:'row', justifyContent:'space-between', alignItems:'center' },
  allocHeroL:{ color:C.white, fontSize:14, fontFamily:'Helvetica-Bold' },
  allocHeroStat:{ textAlign:'right' },
  allocHeroVal: { color:'#4ADE80', fontSize:20, fontFamily:'Helvetica-Bold' },
  allocHeroLbl: { color:'rgba(255,255,255,0.5)', fontSize:7, marginTop:2 },
})

// ── Types ──────────────────────────────────────────────────────────────────────
interface Card {
  earnn_card_id:string; card_name:string; bank_name?:string
  expected_annual_return_aed:number; true_annual_fee_aed:number; net_annual_value_aed:number
  category_effective_rates:Record<string,number>; card_summary_tag?:string
}
interface Route { card_id:string; card_name:string; rate:number; annual_aed:number; monthly_spend_chunk:number }
export interface ReportProps {
  cards:Card[]; wallet:any; userSpend:Record<string,number>; totalMonthly:number
  categoryRouting:Record<string,Route[]>; generatedDate:string
  net:number; gross:number; fees:number
}

// ── Footer component ───────────────────────────────────────────────────────────
function Footer({ page }: { page: number }) {
  return (
    <View style={S.footer}>
      <Text style={S.footTxt}>Confidential · For personal use only</Text>
      <Text style={S.footBrand}>earnn.money</Text>
      <Text style={S.footTxt}>Page {page} of 2  ·  {new Date().toLocaleDateString('en-AE')}</Text>
    </View>
  )
}

// ── Page 1 — Summary ──────────────────────────────────────────────────────────
function Page1({ cards, userSpend, totalMonthly, gross, fees, net, generatedDate }: ReportProps) {
  const totalAnnual = totalMonthly * 12
  const rate = totalAnnual > 0 ? ((gross / totalAnnual) * 100).toFixed(2) : '0'
  const topCats = Object.entries(userSpend).filter(([,v])=>v>0).sort(([,a],[,b])=>b-a).slice(0,5)
    .map(([k,v])=>`${CAT[k]||k}: AED ${fmt(v)}`).join('  ·  ')

  return (
    <Page size="A4" style={S.page}>
      {/* Header */}
      <View style={S.header}>
        <View>
          <Text style={S.logoMark}>earnn</Text>
          <Text style={S.logoTag}>REWARDS INTELLIGENCE  ·  UAE</Text>
        </View>
        <View>
          <Text style={S.hdrRight}>PERSONALISED WALLET REPORT</Text>
          <Text style={S.hdrRight}>{generatedDate}</Text>
        </View>
      </View>
      <View style={S.stripe}/>

      {/* Hero */}
      <View style={S.hero}>
        <Text style={S.heroLabel}>earnn.money · Credit Card Optimisation</Text>
        <Text style={S.heroTitle}>Your Optimised{'\n'}Card Wallet</Text>
        <Text style={S.heroSub}>
          Based on AED {fmt(totalMonthly)}/month spending across {Object.values(userSpend).filter(v=>v>0).length} categories
        </Text>
      </View>

      {/* Metric strip */}
      <View style={S.metricStrip}>
        <View style={S.metricCardG}>
          <Text style={S.metricLbl}>Est. Annual Rewards</Text>
          <Text style={S.metricValG}>AED {fmt(gross)}</Text>
          <Text style={S.metricSub}>Gross before fees</Text>
        </View>
        <View style={S.metricCardR}>
          <Text style={S.metricLbl}>Annual Fees</Text>
          <Text style={S.metricValR}>AED {fmt(fees)}</Text>
          <Text style={S.metricSub}>Combined all cards</Text>
        </View>
        <View style={S.metricCard}>
          <Text style={S.metricLbl}>Net Annual Value</Text>
          <Text style={[S.metricVal,{color:C.emerald}]}>AED {fmt(net)}</Text>
          <Text style={S.metricSub}>Rewards minus fees</Text>
        </View>
        <View style={S.metricCardT}>
          <Text style={S.metricLbl}>Effective Rate</Text>
          <Text style={S.metricValT}>{rate}%</Text>
          <Text style={S.metricSub}>Blended reward rate</Text>
        </View>
      </View>

      <View style={S.body}>
        {/* Spend context */}
        <View style={{backgroundColor:C.white, borderRadius:4, padding:10, borderLeftWidth:3, borderLeftColor:C.teal, marginTop:4, marginBottom:0}}>
          <Text style={{fontSize:6.5, color:C.muted, letterSpacing:0.8, textTransform:'uppercase', marginBottom:3}}>Your Spending Profile</Text>
          <Text style={{fontSize:8, color:C.text, lineHeight:1.5}}>{topCats}</Text>
        </View>

        {/* Card tiles */}
        <View style={S.secHead}>
          <Text style={S.secTitle}>Recommended Wallet — {cards.length} Card{cards.length!==1?'s':''}</Text>
          <View style={S.secLine}/>
          <View style={S.secBadge}><Text style={S.secBadgeTxt}>OPTIMISED</Text></View>
        </View>

        <View style={S.cardTiles}>
          {cards.map(c => {
            const topRates = Object.entries(c.category_effective_rates)
              .filter(([,r])=>r>0).sort(([,a],[,b])=>b-a).slice(0,4)
            return (
              <View key={c.earnn_card_id} style={S.cardTile}>
                <Image src={cardImg(c.earnn_card_id)} style={S.cardImg} />
                <View style={S.cardBody}>
                  <Text style={S.cardName}>{c.card_name}</Text>
                  <Text style={S.cardBank}>{c.bank_name ?? ''}</Text>
                  <View style={S.rateRow}>
                    {topRates.map(([cat,r]) => (
                      <View key={cat} style={S.ratePill}>
                        <Text style={S.rateTxt}>{CAT[cat]||cat} {(r*100).toFixed(1)}%</Text>
                      </View>
                    ))}
                  </View>
                  {c.card_summary_tag && (
                    <View style={S.cardTag}><Text style={S.cardTagTxt}>{c.card_summary_tag}</Text></View>
                  )}
                  <View style={S.cardStat}>
                    <Text style={S.cardStatG}>+AED {fmt(c.expected_annual_return_aed)}/yr</Text>
                    <Text style={S.cardStatR}>Fee AED {fmt(c.true_annual_fee_aed)}</Text>
                  </View>
                </View>
              </View>
            )
          })}
        </View>

        {/* Summary table */}
        <View style={S.secHead}>
          <Text style={S.secTitle}>Financial Summary</Text>
          <View style={S.secLine}/>
        </View>

        <View style={S.tblHead}>
          {['Card','Est. Annual Reward','Annual Fee','Net Value','Top Categories'].map((h,i)=>(
            <Text key={h} style={[S.tblHC, {flex:i===0?3:i===4?2:1.2, textAlign:i>0&&i<4?'right':'left'}]}>{h}</Text>
          ))}
        </View>
        {cards.map((c,i)=>{
          const top = Object.entries(c.category_effective_rates).filter(([,r])=>r>0).sort(([,a],[,b])=>b-a).slice(0,3)
            .map(([k,r])=>`${CAT[k]||k} ${(r*100).toFixed(1)}%`).join(' · ')
          return (
            <View key={c.earnn_card_id} style={[S.tblRow,{backgroundColor:i%2===0?C.row0:C.row1}]}>
              <View style={{flex:3}}>
                <Text style={S.tblCB}>{c.card_name}</Text>
                <Text style={S.tblCM}>{c.bank_name??''}</Text>
              </View>
              <Text style={[S.tblCG,{flex:1.2,textAlign:'right'}]}>AED {fmt(c.expected_annual_return_aed)}</Text>
              <Text style={[S.tblCR,{flex:1.2,textAlign:'right'}]}>AED {fmt(c.true_annual_fee_aed)}</Text>
              <Text style={[S.tblCB,{flex:1.2,textAlign:'right',color:C.emerald}]}>AED {fmt(c.net_annual_value_aed)}</Text>
              <Text style={[S.tblCM,{flex:2,paddingLeft:6}]}>{top}</Text>
            </View>
          )
        })}
        <View style={S.tblTotal}>
          <Text style={[S.tblCB,{flex:3}]}>TOTAL</Text>
          <Text style={[S.tblCG,{flex:1.2,textAlign:'right',fontFamily:'Helvetica-Bold'}]}>AED {fmt(gross)}</Text>
          <Text style={[S.tblCR,{flex:1.2,textAlign:'right',fontFamily:'Helvetica-Bold'}]}>AED {fmt(fees)}</Text>
          <Text style={[S.tblCB,{flex:1.2,textAlign:'right',color:C.emerald}]}>AED {fmt(net)}</Text>
          <Text style={{flex:2}}/>
        </View>

        <Text style={S.disc}>
          Disclaimer: Reward estimates are generated by earnn.money using publicly available card information and the spending profile provided. Actual rewards may vary based on merchant category codes, card terms, and individual transactions. earnn.money is not a licensed financial advisor. Verify all card terms directly with the issuing bank before applying.
        </Text>
      </View>

      <Footer page={1}/>
    </Page>
  )
}

// ── Page 2 — Spend Allocation ─────────────────────────────────────────────────
function Page2({ cards, userSpend, totalMonthly, categoryRouting, gross, generatedDate }: ReportProps) {
  const cats = Object.keys(categoryRouting).filter(k=>{
    const routes = categoryRouting[k]
    return routes && routes.length>0 && (userSpend[k]??0)>0
  })
  const maxSpend = Math.max(...cats.map(k=>userSpend[k]??0),1)

  return (
    <Page size="A4" style={S.pageWhite}>
      {/* Header */}
      <View style={S.header}>
        <View>
          <Text style={S.logoMark}>earnn</Text>
          <Text style={S.logoTag}>REWARDS INTELLIGENCE  ·  UAE</Text>
        </View>
        <View>
          <Text style={S.hdrRight}>SPEND ALLOCATION ANALYSIS</Text>
          <Text style={S.hdrRight}>{generatedDate}</Text>
        </View>
      </View>
      <View style={S.stripe}/>

      {/* Allocation hero banner */}
      <View style={S.allocHero}>
        <View>
          <Text style={[S.heroLabel,{marginBottom:4}]}>Category-by-Category Routing</Text>
          <Text style={S.allocHeroL}>How Your Spend Is{'\n'}Distributed & Rewarded</Text>
        </View>
        <View style={S.allocHeroStat}>
          <Text style={S.allocHeroVal}>AED {fmt(gross/12)}</Text>
          <Text style={S.allocHeroLbl}>estimated monthly rewards</Text>
          <Text style={[S.allocHeroVal,{fontSize:14,marginTop:6}]}>AED {fmt(gross)}</Text>
          <Text style={S.allocHeroLbl}>estimated annual rewards</Text>
        </View>
      </View>

      <View style={[S.body,{paddingTop:16}]}>

        {/* Category routing table */}
        <View style={[S.secHead,{marginTop:0}]}>
          <Text style={S.secTitle}>Category Routing Table</Text>
          <View style={S.secLine}/>
        </View>

        <View style={S.tblHead}>
          {['Category','Monthly Spend','Spend Share','Routed to Card','Earn Rate','Monthly Reward','Annual Reward'].map((h,i)=>(
            <Text key={h} style={[S.tblHC,{
              flex:i===0?1.5:i===2?1:i===3?2:1,
              textAlign:i===3||i===0?'left':'right'
            }]}>{h}</Text>
          ))}
        </View>

        {cats.map((cat,i)=>{
          const spend    = userSpend[cat]??0
          const routes   = categoryRouting[cat]??[]
          const mthReward= routes.reduce((s,r)=>s+r.annual_aed/12,0)
          const annReward= routes.reduce((s,r)=>s+r.annual_aed,0)
          const pct      = Math.round((spend/totalMonthly)*100)
          const barW     = Math.round((spend/maxSpend)*100)
          const primary  = routes[0]
          return (
            <View key={cat} style={[S.tblRow,{backgroundColor:i%2===0?C.row0:C.row1,alignItems:'flex-start'}]}>
              <View style={{flex:1.5}}>
                <Text style={S.tblCB}>{CAT[cat]||cat}</Text>
                <View style={{flexDirection:'row',alignItems:'center',gap:3,marginTop:3}}>
                  <View style={S.barBg}>
                    <View style={[S.barFill,{width:`${barW}%` as any}]}/>
                  </View>
                </View>
              </View>
              <Text style={[S.tblC,{flex:1,textAlign:'right'}]}>AED {fmt(spend)}</Text>
              <Text style={[S.tblCM,{flex:1,textAlign:'right'}]}>{pct}%</Text>
              <View style={{flex:2,paddingLeft:8}}>
                {routes.slice(0,2).map(r=>(
                  <Text key={r.card_id} style={[S.tblCM,{marginBottom:1}]}>
                    {r.card_name.length>26?r.card_name.slice(0,25)+'…':r.card_name}
                    {routes.length>1?` (AED ${fmt(r.monthly_spend_chunk)}/mo)`:''}
                  </Text>
                ))}
              </View>
              <Text style={[S.tblC,{flex:1,textAlign:'right'}]}>
                {primary?`${(primary.rate*100).toFixed(1)}%`:'—'}
              </Text>
              <Text style={[S.tblCG,{flex:1,textAlign:'right'}]}>AED {fmt(mthReward)}</Text>
              <Text style={[S.tblCB,{flex:1,textAlign:'right',color:C.emerald}]}>AED {fmt(annReward)}</Text>
            </View>
          )
        })}

        <View style={S.tblTotal}>
          <Text style={[S.tblCB,{flex:1.5}]}>TOTAL</Text>
          <Text style={[S.tblCB,{flex:1,textAlign:'right'}]}>AED {fmt(totalMonthly)}</Text>
          <Text style={[S.tblCB,{flex:1,textAlign:'right'}]}>100%</Text>
          <Text style={{flex:2}}/>
          <Text style={{flex:1}}/>
          <Text style={[S.tblCG,{flex:1,textAlign:'right',fontFamily:'Helvetica-Bold'}]}>AED {fmt(gross/12)}</Text>
          <Text style={[S.tblCB,{flex:1,textAlign:'right',color:C.emerald}]}>AED {fmt(gross)}</Text>
        </View>

        {/* Card performance */}
        <View style={S.secHead}>
          <Text style={S.secTitle}>Card Performance Summary</Text>
          <View style={S.secLine}/>
        </View>

        <View style={{flexDirection:'row',gap:10}}>
          {cards.map((card,i)=>{
            const cardReward = cats.reduce((s,cat)=>{
              const r=(categoryRouting[cat]??[]).find(r=>r.card_id===card.earnn_card_id)
              return s+(r?.annual_aed??0)
            },0)
            const share = gross>0?Math.round((cardReward/gross)*100):0
            const covCats = cats.filter(cat=>(categoryRouting[cat]??[]).some(r=>r.card_id===card.earnn_card_id))
              .map(k=>CAT[k]||k)
            const colors = [C.navy,C.teal,C.emerald,C.amber]
            const col = colors[i%colors.length]
            return (
              <View key={card.earnn_card_id} style={{flex:1,backgroundColor:'#F8FAFF',borderRadius:6,overflow:'hidden',borderWidth:0.5,borderColor:C.border}}>
                <Image src={cardImg(card.earnn_card_id)} style={{width:'100%',height:50,objectFit:'cover'}}/>
                <View style={{height:3,backgroundColor:col}}/>
                <View style={{padding:8}}>
                  <Text style={{fontSize:7,fontFamily:'Helvetica-Bold',color:C.navy,marginBottom:2,lineHeight:1.3}}>{card.card_name}</Text>
                  <Text style={{fontSize:6.5,color:C.muted,marginBottom:6}}>{card.bank_name??''}</Text>
                  <View style={{flexDirection:'row',justifyContent:'space-between',borderTopWidth:0.5,borderTopColor:C.border,paddingTop:5}}>
                    <View>
                      <Text style={{fontSize:6,color:C.muted}}>Share of Rewards</Text>
                      <Text style={{fontSize:12,fontFamily:'Helvetica-Bold',color:col}}>{share}%</Text>
                    </View>
                    <View style={{textAlign:'right'}}>
                      <Text style={{fontSize:6,color:C.muted}}>Annual Reward</Text>
                      <Text style={{fontSize:9,fontFamily:'Helvetica-Bold',color:C.emerald}}>AED {fmt(cardReward)}</Text>
                    </View>
                  </View>
                  <View style={{flexDirection:'row',flexWrap:'wrap',gap:2,marginTop:5}}>
                    {covCats.slice(0,5).map(c=>(
                      <View key={c} style={{backgroundColor:C.light,borderRadius:2,paddingHorizontal:4,paddingVertical:1.5}}>
                        <Text style={{fontSize:5.5,color:C.navy}}>{c}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </View>
            )
          })}
        </View>

      </View>
      <Footer page={2}/>
    </Page>
  )
}

// ── Document ──────────────────────────────────────────────────────────────────
function EarnnReport(props: ReportProps) {
  return (
    <Document title="earnn Wallet Report" author="earnn.money" creator="earnn.money">
      <Page1 {...props}/>
      <Page2 {...props}/>
    </Document>
  )
}

// ── Download — wait for full blob before triggering ───────────────────────────
export async function downloadEarnnReport(props: ReportProps) {
  const blob = await pdf(<EarnnReport {...props}/>).toBlob()
  // Wait for full generation before triggering download
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download= `earnn-wallet-report-${new Date().toISOString().slice(0,10)}.pdf`
  a.style.display = 'none'
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  // Revoke after browser has had time to start the download
  setTimeout(() => URL.revokeObjectURL(url), 10000)
}
