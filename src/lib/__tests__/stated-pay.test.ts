import { describe, it, expect } from 'vitest'
import { findStatedPay } from '../stated-pay'

describe('findStatedPay — reads pay only where the posting states it', () => {
  it.each([
    ['CTC: ₹12-18 LPA plus ESOPs', '₹12–18 LPA'],
    ['Salary range INR 12,00,000 - 18,00,000 per annum', '₹12–18 LPA'],
    ['Compensation: 15 to 20 lakhs per annum', '₹15–20 LPA'],
    ['We offer up to 25 LPA for the right candidate', '₹25 LPA'],
    ['Stipend: ₹25,000 per month', '₹25,000/month'],
    ['The base salary range is $120,000 - $150,000 per year', '$120K–150K/yr'],
    ['Pay band: $95k–$120k', '$95K–120K/yr'],
  ])('%s → %s', (text, want) => {
    expect(findStatedPay(text)?.text).toBe(want)
  })

  it.each([
    'We process ₹500 crore in payments every month',
    'Backed by $50M from Sequoia',
    'Join a $2 billion company',
    'You will manage a budget of ₹10 lakh', // money, but no pay word and no pay unit
    '5-7 years of experience required',
    'Series B, raised $40M-$60M',
  ])('ignores money that is not pay: %s', (text) => {
    expect(findStatedPay(text)).toBeNull()
  })

  it('reads through HTML', () => {
    expect(findStatedPay('<p><strong>Salary:</strong> ₹8 - 10 LPA</p>')?.text).toBe('₹8–10 LPA')
  })
})
