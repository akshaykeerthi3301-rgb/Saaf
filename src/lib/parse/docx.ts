import mammoth from 'mammoth'

/** Extract plain text from a .docx buffer. In memory only — nothing is stored. */
export async function docxToText(buffer: Buffer): Promise<string> {
  const { value } = await mammoth.extractRawText({ buffer })
  return value
}
