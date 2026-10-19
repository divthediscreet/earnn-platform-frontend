import assert from 'node:assert/strict'
import test from 'node:test'

// @ts-expect-error Node's native TypeScript runner requires the source extension.
import { formatFrequency, formatGuestNote, formatMinimumSpend, formatPeriod } from './format.ts'

test('frequency renders Unlimited even without a period', () => {
  assert.equal(formatFrequency({ benefit_rule_id: 'one', quantity_per_period: 999999 }), 'Unlimited')
})

test('blank frequency and spend fields are omitted without becoming zero', () => {
  assert.equal(formatFrequency({ benefit_rule_id: 'one' }), null)
  assert.equal(formatMinimumSpend({ benefit_rule_id: 'one', requires_min_spend_on_card: false }), null)
  assert.equal(formatMinimumSpend({ benefit_rule_id: 'one', requires_min_spend_on_card: true }), 'Minimum spend applies — see conditions.')
})

test('minimum spend appears only when the source flag is true', () => {
  assert.equal(formatMinimumSpend({ benefit_rule_id: 'one', min_spend_aed_on_card: 500, min_spend_period: 'monthly' }), null)
  assert.equal(formatMinimumSpend({ benefit_rule_id: 'one', requires_min_spend_on_card: true, min_spend_aed_on_card: 500, min_spend_period: 'monthly' }), 'Minimum spend AED 500 in that month')
})

test('guest note only renders for the exact stored value', () => {
  assert.equal(formatGuestNote({ benefit_rule_id: 'one', applicable_to: 'primary_cardholder_plus_1_guest' }), '+1 guest')
  assert.equal(formatGuestNote({ benefit_rule_id: 'one', applicable_to: 'primary_cardholder' }), null)
})

test('period labels use the approved display text', () => {
  assert.equal(formatPeriod('annual'), '/ year')
  assert.equal(formatPeriod('month'), '/ month')
  assert.equal(formatPeriod('quarterly'), '/ quarter')
  assert.equal(formatPeriod('per_transaction'), 'per transaction')
  assert.equal(formatPeriod('one_time'), 'one-time')
  assert.equal(formatPeriod('custom'), 'custom')
})

test('minimum spend wording is per period while frequency labels keep their own style', () => {
  const spend = (period: string) => formatMinimumSpend({ benefit_rule_id: 'one', requires_min_spend_on_card: true, min_spend_aed_on_card: 5000, min_spend_period: period })
  assert.equal(spend('monthly'), 'Minimum spend AED 5,000 in that month')
  assert.equal(spend('annual'), 'Minimum spend AED 5,000 in that year')
  assert.equal(spend('quarterly'), 'Minimum spend AED 5,000 in that quarter')
  assert.equal(spend('per_transaction'), 'Minimum spend AED 5,000 per transaction')
  assert.equal(formatMinimumSpend({ benefit_rule_id: 'one', requires_min_spend_on_card: true, min_spend_aed_on_card: 5000 }), 'Minimum spend AED 5,000')
  // frequency is untouched
  assert.equal(formatFrequency({ benefit_rule_id: 'one', quantity_per_period: 4, quantity_period: 'annual' }), '4 / year')
  assert.equal(formatFrequency({ benefit_rule_id: 'one', quantity_per_period: 2, quantity_period: 'monthly' }), '2 / month')
  assert.equal(formatPeriod('monthly'), '/ month')
})
