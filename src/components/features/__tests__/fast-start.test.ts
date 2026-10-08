// @vitest-environment happy-dom
import { describe, it, expect } from 'vitest'
import { createElement } from 'react'
import { renderToStaticMarkup } from 'react-dom/server'
import { FastStart } from '../fast-start'

describe('FastStart', () => {
  // Found in the browser, not by a test: the first version was a <form> inside the checker's own <form>, which is invalid HTML and broke hydration.
  it('is not a form of its own, because it is rendered inside one', () => {
    const html = renderToStaticMarkup(createElement(FastStart, { onText: () => {} }))
    expect(html).not.toContain('<form')
    expect(html).toContain('Put it in the box')
  })
})
