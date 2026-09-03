// pdfjs-dist ships this build without a declaration file (unlike
// 'pdfjs-dist/legacy/build/pdf.mjs', its main entry, which TS can type via
// the package's own types field). See the import site in src/lib/parse/pdf.ts
// for why this file is imported directly at all.
declare module 'pdfjs-dist/legacy/build/pdf.worker.mjs' {
  export const WorkerMessageHandler: unknown
}
