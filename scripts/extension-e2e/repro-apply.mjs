import { patchedExtension, launch } from './lib.mjs'
import { serve } from './mockjob.mjs'
const srv = serve(4100)
const { context } = await launch(patchedExtension())
const page = await context.newPage()
await page.goto('http://localhost:3000/api/dev-signin'); await page.waitForTimeout(6000)
const apply = await context.newPage()
await apply.goto('http://localhost:4100/acme/123/apply'); await apply.waitForTimeout(6000)
console.log('panel on the apply page:', (await apply.locator('#saaf-overlay-host').count()) > 0 ? 'YES' : 'NO — nothing appears')
await context.close(); srv.close()
