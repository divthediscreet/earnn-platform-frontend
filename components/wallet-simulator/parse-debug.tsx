'use client'

// Bank-name formatter and the raw parse-data panel, carried over from the old Analyse page (app/analyse-old).

import { useState } from 'react'

const BANK_ABBREV: Record<string, string> = {
  'Emirates NBD':                        'ENBD',
  'First Abu Dhabi Bank':                'FAB',
  'Abu Dhabi Commercial Bank':           'ADCB',
  'Abu Dhabi Islamic Bank':              'ADIB',
  'Dubai Islamic Bank':                  'DIB',
  'Emirates Islamic Bank':               'EIB',
  'Commercial Bank of Dubai':            'CBD',
  'Sharjah Islamic Bank':                'SIB',
  'Standard Chartered Bank':             'SCB',
  'Citibank Bank UAE':                   'CITI',
  'The National Bank of Ras Al Khaimah': 'RAK',
}

const BANK_NO_ABBREV = new Set([
  'First Abu Dhabi Bank PJSC',
  'Ajman Bank',
  'HSBC Middle East Limited',
])

export const formatBankName = (name: string) => {
  if (BANK_NO_ABBREV.has(name)) return name
  const abbrev = BANK_ABBREV[name]
  if (abbrev) return `${name} (${abbrev})`
  return name
}

const HEADER_LABELS: Record<string, string> = {
  bank_name_code: 'Bank', bank_country: 'Country', card_last4: 'Card Last 4', card_type: 'Card Type', earnn_card_id: 'earnn Card ID',
  statement_start_date: 'Statement Start', statement_end_date: 'Statement End', statement_generation_date: 'Statement Date', payment_due_date: 'Payment Due Date',
  total_credit_limit_aed: 'Credit Limit (AED)', available_credit_limit_aed: 'Available Credit (AED)',
  minimum_payment_due_aed: 'Min Payment Due (AED)', total_amount_due_aed: 'Total Amount Due (AED)', outstanding_current_balance: 'Outstanding Balance (AED)',
  previous_balance_aed: 'Previous Balance (AED)', purchase_cash_advances: 'Purchases & Cash Advances (AED)', payment_received_credit: 'Payment Received (AED)',
  interest: 'Interest (AED)', fee_and_other_charges: 'Fees & Charges (AED)',
  parsed_total_debits_aed: 'Parsed Total Debits (AED)', parsed_total_credits_aed: 'Parsed Total Credits (AED)',
  stated_purchases_aed: 'Stated Purchases (AED)', stated_credits_aed: 'Stated Credits (AED)',
  confidence_score: 'Confidence Score', confidence_verdict: 'Confidence Verdict', statement_parsing_flag: 'Parser Path',
  mapper_used: 'Mapper Used', pdf_type_detected: 'PDF Type',
  chk_dates_in_window_pass: 'Check: Dates in Window', chk_debit_reconciliation_pass: 'Check: Debit Recon',
  chk_credit_reconciliation_pass: 'Check: Credit Recon', chk_descriptions_valid_pass: 'Check: Descriptions Valid',
  debit_reconciliation_ratio: 'Debit Recon Ratio', credit_reconciliation_ratio: 'Credit Recon Ratio',
}

export function ParseDataDebug({ data }: { data: any }) {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState<'header' | 'transactions'>('header')

  if (!data) return null

  const header: Record<string, any> = data.statement_header || {}
  const transactions: any[] = data.transactions_raw || []

  return (
    <div style={{ marginTop: 24, borderTop: '1px dashed #D6E0F5', paddingTop: 16 }}>
      <button
        onClick={() => setOpen(v => !v)}
        style={{
          display: 'flex', alignItems: 'center', gap: 8, width: '100%',
          background: 'none', border: '1px dashed #C8D4E8', borderRadius: 8,
          padding: '10px 16px', cursor: 'pointer', color: '#5A6A85', fontSize: 13,
          fontWeight: 600, textAlign: 'left',
        }}
      >
        <span style={{ fontSize: 16 }}>{open ? '▾' : '▸'}</span>
        🔍 View raw parse data ({transactions.length} transactions)
        <span style={{ marginLeft: 'auto', fontSize: 11, fontWeight: 400, color: '#9DAEC8' }}>for parse validation only</span>
      </button>

      {open && (
        <div style={{ marginTop: 12, background: '#F8FAFF', borderRadius: 12, border: '1px solid #D6E0F5', overflow: 'hidden' }}>

          {/* Tab bar */}
          <div style={{ display: 'flex', borderBottom: '1px solid #D6E0F5' }}>
            {([['header', '📋 Statement Header'], ['transactions', `📄 Transactions (${transactions.length})`]] as const).map(([k, label]) => (
              <button key={k} onClick={() => setTab(k)} style={{
                flex: 1, padding: '10px 0', border: 'none', cursor: 'pointer', fontSize: 13, fontWeight: 600,
                background: tab === k ? 'white' : 'transparent',
                color: tab === k ? '#0E3785' : '#5A6A85',
                borderBottom: tab === k ? '2px solid #0E3785' : '2px solid transparent',
              }}>
                {label}
              </button>
            ))}
          </div>

          {/* Statement header tab */}
          {tab === 'header' && (
            <div style={{ padding: '16px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0' }}>
              {Object.entries(header).map(([k, v], i) => {
                const label = HEADER_LABELS[k] || k
                const isNull = v === null || v === undefined || v === ''
                const isCheck = k.startsWith('chk_')
                const displayVal = isNull ? '—' : isCheck ? (v ? '✅ Pass' : '❌ Fail') : String(v)
                return (
                  <div key={k} style={{
                    padding: '8px 12px',
                    borderBottom: '1px solid #EEF3FF',
                    background: i % 2 === 0 ? 'white' : '#F8FAFF',
                    display: 'flex', flexDirection: 'column', gap: 2,
                  }}>
                    <div style={{ fontSize: 10, color: '#9DAEC8', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{label}</div>
                    <div style={{ fontSize: 13, color: isNull ? '#C8D4E8' : '#0D1828', fontWeight: isNull ? 400 : 500, fontFamily: 'monospace' }}>{displayVal}</div>
                  </div>
                )
              })}
            </div>
          )}

          {/* Transactions tab */}
          {tab === 'transactions' && (
            <div style={{ overflowX: 'auto' }}>
              {transactions.length === 0 ? (
                <div style={{ padding: 24, textAlign: 'center', fontSize: 13, color: '#9DAEC8' }}>No transactions found</div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#EEF3FF' }}>
                      {['#', 'Date', 'Description', 'Merchant (clean)', 'Category', 'Debit AED', 'Credit AED', 'Instalment'].map(h => (
                        <th key={h} style={{ padding: '8px 10px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#5A6A85', textTransform: 'uppercase', letterSpacing: '0.04em', whiteSpace: 'nowrap', borderBottom: '1px solid #D6E0F5' }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.map((t, i) => (
                      <tr key={i} style={{ background: i % 2 === 0 ? 'white' : '#F8FAFF' }}>
                        <td style={{ padding: '7px 10px', color: '#9DAEC8', fontFamily: 'monospace' }}>{i + 1}</td>
                        <td style={{ padding: '7px 10px', color: '#5A6A85', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>{t.transaction_date || '—'}</td>
                        <td style={{ padding: '7px 10px', color: '#0D1828', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={t.description_raw}>{t.description_raw || '—'}</td>
                        <td style={{ padding: '7px 10px', color: '#5A6A85', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.parent_merchant || t.merchant_name_clean || '—'}</td>
                        <td style={{ padding: '7px 10px' }}>
                          {t.earnn_category_granular_code ? (
                            <span style={{ background: '#EEF3FF', color: '#0E3785', borderRadius: 4, padding: '2px 7px', fontWeight: 600, fontSize: 11 }}>{t.earnn_category_granular_code}</span>
                          ) : <span style={{ color: '#C8D4E8' }}>—</span>}
                        </td>
                        <td style={{ padding: '7px 10px', color: t.debit_amount_aed ? '#C0392B' : '#C8D4E8', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                          {t.debit_amount_aed ? t.debit_amount_aed.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </td>
                        <td style={{ padding: '7px 10px', color: t.credit_amount_aed ? '#00A67E' : '#C8D4E8', fontWeight: 600, textAlign: 'right', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
                          {t.credit_amount_aed ? t.credit_amount_aed.toLocaleString('en-AE', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '—'}
                        </td>
                        <td style={{ padding: '7px 10px', textAlign: 'center', color: '#9DAEC8' }}>{t.is_installment ? '✅' : ''}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
