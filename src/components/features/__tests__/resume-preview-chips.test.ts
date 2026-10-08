// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { ResumePreview } from '../resume-preview'
import { parseSections } from '@/lib/parse/sections'

const sections = parseSections(`Priya Iyer
priya@example.com

Experience
Product Manager, Paytm  Jan 2023 – Present
- Responsible for the UPI autopay launch
- Cut churn by 12%
`)

describe('ResumePreview — inline fix chips', () => {
  it('draws a chip beside the line it belongs to and nowhere else', () => {
    const html = renderToStaticMarkup(createElement(ResumePreview, { sections, chips: { '0:0': [{ label: 'Fix: stronger opening', onClick: () => {} }] } }))
    expect(html.match(/data-testid="fix-chip"/g)).toHaveLength(1)
    const line = html.slice(html.indexOf('Responsible for'), html.indexOf('Cut churn'))
    expect(line).toContain('Fix: stronger opening')
    expect(html.slice(html.indexOf('Cut churn'))).not.toContain('Fix: stronger opening')
  })
  it('draws nothing without chips', () => {
    expect(renderToStaticMarkup(createElement(ResumePreview, { sections }))).not.toContain('fix-chip')
  })
})
