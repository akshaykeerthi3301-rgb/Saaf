import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

export default defineConfig({
  // scripts/ is included because the registry tooling now makes product
  // decisions — which boards enter the moat, and what company name a candidate
  // sees on a card — and those were being written with no test coverage at all.
  test: {
    environment: 'node',
    // extension/ is included because it writes into real job applications —
    // the wrong pattern there puts somebody's salary expectation into a form a
    // stranger reads, which is a worse failure than any wrong score.
    include: [
      'src/**/*.test.ts', 'ingest/**/*.test.ts', 'scripts/**/*.test.ts',
      'extension/**/*.test.ts',
    ],
  },
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
})
