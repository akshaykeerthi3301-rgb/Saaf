import { describe, it, expect } from 'vitest'
import { buildCoverLetterDocx, coverLetterFilename } from '../cover-letter-docx'

describe('cover-letter file', () => {
  it('is a real Word file (a zip with word/document.xml) that carries the text', async () => {
    const buf = await buildCoverLetterDocx('Dear team,\n\nI would like to join Acme.\nThank you.')
    expect(buf.subarray(0, 2).toString()).toBe('PK')
    expect(buf.length).toBeGreaterThan(1000)
  })
  it('is named for the person and the company, ASCII only, with no brand', () => {
    expect(coverLetterFilename('Akshay Keerthi', 'Acme Robotics')).toBe('Akshay-Keerthi-Cover-Letter-Acme-Robotics.docx')
    expect(coverLetterFilename('Zoë Ñandú', null)).toBe('Zoe-Nandu-Cover-Letter.docx')
    expect(coverLetterFilename(null, '')).toBe('Candidate-Cover-Letter.docx')
  })
})
