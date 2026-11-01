import { spawn } from 'node:child_process'
import { setTimeout as delay } from 'node:timers/promises'
import { chromium, expect } from '@playwright/test'

// Exercise the built artifact through HTTP at its real deployment subpath.
// Run after building with the same VITE_BASE_PATH. No files are rewritten here.
const base = process.env.VITE_BASE_PATH || '/four-by-4/'
const origin = 'http://127.0.0.1:4174'
const url = new URL(base, origin).href
const server = spawn(process.execPath, ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', '4174', '--strictPort'], {
  env: { ...process.env, VITE_BASE_PATH: base },
  stdio: ['ignore', 'pipe', 'pipe'],
})
let serverLog = ''
server.stdout.on('data', (data) => { serverLog += data })
server.stderr.on('data', (data) => { serverLog += data })
let browser
try {
  let ready = false
  for (let attempt = 0; attempt < 50; attempt++) {
    if (server.exitCode !== null) throw new Error(`Preview exited: ${serverLog}`)
    try { if ((await fetch(url)).ok) { ready = true; break } } catch { /* Startup can take a moment. */ }
    await delay(100)
  }
  if (!ready) throw new Error(`Preview did not become ready: ${serverLog}`)
  browser = await chromium.launch()
  const context = await browser.newContext()
  const page = await context.newPage()
  const failures = []
  page.on('pageerror', (error) => failures.push(error.message))
  page.on('response', (response) => { if (response.status() >= 400) failures.push(`${response.status()} ${response.url()}`) })
  await page.goto(url)
  await expect(page.getByRole('timer')).toHaveText('10:00')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  const scope = await page.evaluate(async () => (await navigator.serviceWorker.ready).scope)
  expect(scope).toBe(url)
  const manifestUrl = await page.locator('link[rel="manifest"]').evaluate((link) => link.href)
  expect(manifestUrl).toBe(new URL('manifest.webmanifest', url).href)
  const manifest = await (await fetch(manifestUrl)).json()
  expect(new URL(manifest.start_url, manifestUrl).href).toBe(url)
  for (const icon of manifest.icons) {
    expect((await fetch(new URL(icon.src, manifestUrl))).ok).toBe(true)
  }
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('timer')).toHaveText('10:00')
  await page.getByRole('button', { name: '운동 시작', exact: true }).click()
  await expect(page.getByRole('button', { name: '일시정지', exact: true })).toBeVisible()
  expect(failures).toEqual([])
  console.log(`Pages artifact verified: ${base} — app, manifest, icons, service-worker scope, offline reload and start.`)
} finally {
  await browser?.close()
  server.kill('SIGTERM')
}
