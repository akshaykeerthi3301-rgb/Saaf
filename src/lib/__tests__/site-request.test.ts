import { describe, it, expect } from 'vitest'
import { cleanHost } from '../site-request'

describe('cleanHost', () => {
  it('accepts a plain hostname, lower-cased', () => {
    expect(cleanHost('Careers.Acme.COM')).toBe('careers.acme.com')
    expect(cleanHost('jobs.example.co.in.')).toBe('jobs.example.co.in')
  })
  it('refuses anything that is not only a hostname — a URL, a path, an address, a port, a script', () => {
    for (const bad of ['https://acme.com/jobs/1', 'acme.com/jobs', 'acme.com:8080', '192.168.0.1', 'localhost', 'a b.com', '<script>.com', '', 'x.c', null, 42, 'a'.repeat(130) + '.com']) {
      expect(cleanHost(bad), String(bad)).toBeNull()
    }
  })
  it('refuses the sites that are excluded on purpose, and Saaf itself', () => {
    for (const h of ['linkedin.com', 'www.linkedin.com', 'naukri.com', 'saaf-ten.vercel.app']) expect(cleanHost(h), h).toBeNull()
    expect(cleanHost('notlinkedin.com')).toBe('notlinkedin.com')
  })
})
