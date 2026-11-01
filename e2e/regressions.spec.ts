import { expect, test } from '@playwright/test'
import { NORWEGIAN_PROGRAM } from '../src/lib/programs'

test('recovers a completed background session exactly once on startup', async ({ page }) => {
  await page.addInitScript((program) => {
    if (localStorage.getItem('four-by-four:v1:workout')) return
    const start = Date.now() - 41 * 60 * 1000
    localStorage.setItem('four-by-four:v1:workout', JSON.stringify({
      version: 1,
      session: { version: 1, program, id: 'background-session', status: 'running', elapsedMs: 0, activeMs: 0, anchorAt: start, startedAt: start, finishedAt: null, skippedStages: 0 },
      history: [],
    }))
  }, NORWEGIAN_PROGRAM)
  await page.goto('/')
  await expect(page.getByRole('heading', { name: '오늘도, 잘했어요.' })).toBeVisible()
  await page.getByRole('button', { name: '기록', exact: true }).click()
  await expect(page.locator('.history-list li')).toHaveCount(1)
  await expect(page.locator('.record-meta')).toContainText('40분')
  await page.reload()
  await page.getByRole('button', { name: '기록', exact: true }).click()
  await expect(page.locator('.history-list li')).toHaveCount(1)
})

test('reports invalid block fields including fields inside collapsed details', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '프로그램', exact: true }).click()
  await page.getByRole('button', { name: '새 프로그램', exact: true }).click()
  await page.getByLabel('1번째 구간 분', { exact: true }).fill('0')
  await page.getByLabel('1번째 구간 초', { exact: true }).fill('0')
  await page.getByRole('button', { name: '프로그램 저장', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('5초~120분')
  await page.getByLabel('1번째 구간 초', { exact: true }).fill('60')
  await page.getByRole('button', { name: '프로그램 저장', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('초(0~59)')
  await page.getByLabel('1번째 구간 초', { exact: true }).fill('5')
  await page.locator('.step-details summary').click()
  await page.getByRole('checkbox', { name: '최대 심박수 기준 목표 설정' }).check()
  await page.getByLabel('1번째 구간 최소 심박수 비율', { exact: true }).fill('90')
  await page.getByLabel('1번째 구간 최대 심박수 비율', { exact: true }).fill('80')
  await page.locator('.step-details summary').click()
  await page.getByRole('button', { name: '프로그램 저장', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('최솟값 < 최댓값')
  await expect(page.getByRole('dialog')).toBeVisible()
})

test('warns only when the screen cannot be kept awake', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'wakeLock', {
      configurable: true,
      value: { request: async () => {
        const sentinel = Object.assign(new EventTarget(), { released: false, release: async () => { sentinel.released = true; sentinel.dispatchEvent(new Event('release')) } })
        return sentinel
      } },
    })
  })
  await page.goto('/')
  await page.getByRole('button', { name: '운동 시작', exact: true }).click()
  await page.waitForTimeout(2500)
  await expect(page.getByText('화면이 꺼질 수 있어요')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '일시정지', exact: true })).toBeVisible()
})

test('shows a keep-screen-on warning when Wake Lock is unavailable', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, 'wakeLock', { configurable: true, value: { request: () => Promise.reject(new Error('blocked')) } })
  })
  await page.goto('/')
  await page.getByRole('button', { name: '운동 시작', exact: true }).click()
  await expect(page.getByText('화면이 꺼질 수 있어요')).toBeVisible({ timeout: 5000 })
  await page.getByRole('button', { name: '일시정지', exact: true }).click()
  await expect(page.getByText('화면이 꺼질 수 있어요')).toHaveCount(0)
})

test('keeps long countdowns and full program lists within a small viewport', async ({ page }) => {
  const program = { ...NORWEGIAN_PROGRAM, id: 'long-custom', name: '긴 프로그램', steps: [{ id: 'long', name: '길게 움직이기', kind: 'work', durationSeconds: 7200, cue: '' }] }
  await page.addInitScript((value) => {
    localStorage.setItem('four-by-four:v1:workout', JSON.stringify({ version: 1, session: { version: 1, program: value, id: null, status: 'idle', elapsedMs: 0, activeMs: 0, anchorAt: null, startedAt: null, finishedAt: null, skippedStages: 0 }, history: [] }))
  }, program)
  await page.setViewportSize({ width: 320, height: 740 })
  await page.goto('/')
  await expect(page.getByRole('timer')).toHaveText('120:00')
  const fits = await page.getByRole('timer').evaluate((element) => element.scrollWidth <= element.clientWidth + 1)
  expect(fits).toBe(true)
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true)
})
