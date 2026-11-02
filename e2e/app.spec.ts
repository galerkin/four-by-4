import { expect, test, type Page } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'
import { readFile } from 'node:fs/promises'
import { NORWEGIAN_PROGRAM, type Program } from '../src/lib/programs'

const tenSecondProgram: Program = { schemaVersion: 1, id: 'test-program', name: '10초 확인용', description: '타이머 검증용', steps: [{ id: 'work', name: '움직이기', kind: 'work', durationSeconds: 5, cue: '가볍게 움직이세요.' }, { id: 'cool', name: '마무리', kind: 'cooldown', durationSeconds: 5, cue: '' }] }

async function freeze(page: Page) {
  await page.clock.install({ time: new Date('2026-11-01T12:00:00Z') })
  await page.goto('/')
  await page.clock.pauseAt(new Date('2026-11-01T12:00:10Z'))
}
async function importFile(page: Page, program = tenSecondProgram) {
  await page.getByRole('button', { name: '프로그램', exact: true }).click()
  await page.getByLabel('프로그램 JSON 파일').setInputFiles({ name: 'program.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(program)) })
}

test('starts with an honest 40-minute program and no measured heart rate', async ({ page }) => {
  const errors: string[] = []
  page.on('pageerror', (error) => errors.push(error.message))
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('four by four 운동 타이머')
  await expect(page.getByRole('timer')).toHaveText('10:00')
  await expect(page.getByRole('button', { name: '운동 시작', exact: true })).toBeEnabled()
  await expect(page.getByRole('button', { name: '다음 구간으로' })).toBeDisabled()
  // Without a profile the target is a percentage, and the target opens the bpm calculator.
  await expect(page.locator('.stage-goal')).toContainText('목표 최대심박 60–70%')
  await expect(page.locator('.stage-goal')).not.toContainText('bpm ·')
  await expect(page.getByRole('button', { name: /bpm 계산/ })).toBeVisible()
  expect(errors).toEqual([])
})

test('pauses, resumes, and keeps a running timer after reload', async ({ page }) => {
  await freeze(page)
  await page.getByRole('button', { name: '운동 시작', exact: true }).click()
  await page.clock.runFor(5000)
  await expect(page.getByRole('timer')).toHaveText('09:55')
  await page.getByRole('button', { name: '일시정지', exact: true }).click()
  await page.clock.fastForward(60_000)
  await expect(page.getByRole('timer')).toHaveText('09:55')
  await page.reload()
  await expect(page.getByRole('button', { name: '이어서 운동' })).toBeVisible()
  await expect(page.getByRole('timer')).toHaveText('09:55')
  await page.getByRole('button', { name: '이어서 운동' }).click()
  await page.clock.runFor(3000)
  await expect(page.getByRole('timer')).toHaveText('09:52')
  await page.reload()
  await expect(page.getByRole('timer')).toHaveText('09:52')
  await expect(page.getByRole('button', { name: '일시정지', exact: true })).toBeVisible()
})

test('automatically transitions through work, recovery, and completion without duplicate records', async ({ page }) => {
  await freeze(page)
  await page.getByRole('button', { name: '운동 시작', exact: true }).click()
  await page.clock.fastForward(600_000)
  await expect(page.getByRole('heading', { name: '고강도 1', exact: true })).toBeVisible()
  await expect(page.getByRole('timer')).toHaveText('04:00')
  await expect(page.locator('.stage-goal')).toContainText('85–95%')
  await expect(page.getByRole('button', { name: /bpm 계산/ })).toHaveCount(0)
  await page.clock.fastForward(240_000)
  await expect(page.getByRole('heading', { name: '활동성 회복', exact: true })).toBeVisible()
  await expect(page.getByRole('timer')).toHaveText('03:00')
  await expect(page.getByLabel('운동 중 기억할 한 가지')).toBeVisible()
  await page.clock.fastForward(180_000)
  await expect(page.getByRole('heading', { name: '고강도 2', exact: true })).toBeVisible()
  await page.clock.fastForward(1_380_000)
  await expect(page.getByRole('heading', { name: '오늘도, 잘했어요.' })).toBeVisible()
  await page.getByRole('button', { name: '기록', exact: true }).click()
  await expect(page.locator('.history-list li')).toHaveCount(1)
  await expect(page.locator('.record-meta')).toContainText('40분')
  await page.getByRole('button', { name: '닫기', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: '기록', exact: true }).click()
  await expect(page.locator('.history-list li')).toHaveCount(1)
  await page.getByRole('button', { name: '모두 삭제' }).click()
  await page.getByRole('button', { name: '기록 삭제', exact: true }).click()
  await page.getByRole('button', { name: '닫기', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: '기록', exact: true }).click()
  await expect(page.getByRole('heading', { name: '첫 번째 움직임을 기다려요.' })).toBeVisible()
})

test('skip and reset require confirmation, cancellation resumes, and skipped time is not counted', async ({ page }) => {
  await freeze(page)
  await importFile(page)
  await page.getByRole('button', { name: '10초 확인용 선택' }).click()
  await page.getByRole('button', { name: '운동 시작', exact: true }).click()
  await page.clock.runFor(1000)
  await page.getByRole('button', { name: '처음부터 다시' }).click()
  await page.clock.fastForward(20_000)
  await page.getByRole('button', { name: '계속 운동하기' }).click()
  await expect(page.getByRole('timer')).toHaveText('00:04')
  await page.getByRole('button', { name: '다음 구간으로' }).click()
  await page.getByRole('button', { name: '구간 건너뛰기', exact: true }).click()
  await expect(page.getByRole('timer')).toHaveText('00:05')
  await page.clock.fastForward(5000)
  await expect(page.getByRole('heading', { name: '여기까지, 수고했어요.' })).toBeVisible()
  await page.getByRole('button', { name: '기록', exact: true }).click()
  await expect(page.locator('.record-meta')).toContainText('6초')
  await expect(page.locator('.record-meta')).toContainText('일부 진행 · 1구간 건너뜀')
})

test('reset discards the active attempt but keeps the selected program', async ({ page }) => {
  await freeze(page)
  await page.getByRole('button', { name: '운동 시작', exact: true }).click()
  await page.clock.fastForward(20_000)
  await page.getByRole('button', { name: '처음부터 다시' }).click()
  await page.getByRole('button', { name: '초기화', exact: true }).click()
  await expect(page.getByRole('timer')).toHaveText('10:00')
  await expect(page.getByRole('button', { name: '운동 시작', exact: true })).toBeVisible()
  await page.getByRole('button', { name: '기록', exact: true }).click()
  await expect(page.locator('.history-list li')).toHaveCount(0)
})

test('calculates optional targets and persists preferences without measuring heart rate', async ({ page }) => {
  await freeze(page)
  await page.getByRole('button', { name: '개인 설정' }).click()
  await page.getByLabel('나이 (만)').fill('40')
  await expect(page.locator('.preview-value')).toContainText('153–171')
  await page.getByRole('switch', { name: /구간 전환 알림음/ }).uncheck()
  await page.getByRole('button', { name: '설정 저장' }).click()
  await expect(page.locator('.stage-goal')).toContainText('목표 108–126 bpm · 추정')
  await expect(page.getByRole('button', { name: '알림음 켜기' })).toHaveAttribute('aria-pressed', 'false')
  await page.getByRole('button', { name: '운동 시작', exact: true }).click()
  await page.clock.fastForward(600_000)
  await expect(page.locator('.stage-goal')).toContainText('153–171 bpm')
  await page.reload()
  await expect(page.locator('.stage-goal')).toContainText('153–171 bpm · 추정')
  await expect(page.getByRole('button', { name: '알림음 켜기' })).toBeVisible()
})

test('creates, edits, reorders, exports and deletes a custom block program', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '프로그램', exact: true }).click()
  await page.getByRole('button', { name: '새 프로그램', exact: true }).click()
  await page.getByLabel('프로그램 이름', { exact: true }).fill('로컬 확인용')
  await page.getByLabel('1번째 구간 이름', { exact: true }).fill('가볍게 움직이기')
  await page.getByLabel('1번째 구간 분', { exact: true }).fill('0')
  await page.getByLabel('1번째 구간 초', { exact: true }).fill('5')
  await page.getByRole('button', { name: '구간 추가', exact: true }).click()
  await page.getByLabel('2번째 구간 이름', { exact: true }).fill('호흡 고르기')
  await page.getByLabel('2번째 구간 유형', { exact: true }).selectOption('recovery')
  await page.getByLabel('2번째 구간 분', { exact: true }).fill('0')
  await page.getByLabel('2번째 구간 초', { exact: true }).fill('5')
  await page.getByRole('button', { name: '2번째 구간 위로', exact: true }).click()
  await expect(page.getByLabel('1번째 구간 이름', { exact: true })).toHaveValue('호흡 고르기')
  await page.getByRole('button', { name: '프로그램 저장', exact: true }).click()
  await expect(page.getByRole('timer')).toHaveText('00:05')
  await expect(page.getByRole('heading', { name: '호흡 고르기', exact: true })).toBeVisible()
  await expect(page.locator('.stage-goal')).toContainText('내 페이스대로')
  await page.getByRole('button', { name: '편집', exact: true }).click()
  await page.getByLabel('프로그램 이름', { exact: true }).fill('수정한 프로그램')
  await page.getByRole('button', { name: '프로그램 저장', exact: true }).click()
  await page.reload()
  await page.getByRole('button', { name: '프로그램', exact: true }).click()
  await expect(page.locator('.library-item')).toHaveCount(2)
  const downloadPromise = page.waitForEvent('download')
  await page.getByRole('button', { name: '수정한 프로그램 내보내기' }).click()
  const download = await downloadPromise
  const json = JSON.parse(await readFile((await download.path())!, 'utf8')) as Program
  expect(json.name).toBe('수정한 프로그램')
  expect(json.steps.map((step) => step.durationSeconds)).toEqual([5, 5])
  expect(json.steps[0].kind).toBe('recovery')
  await page.getByRole('button', { name: '수정한 프로그램 삭제' }).click()
  await page.getByRole('button', { name: '프로그램 삭제', exact: true }).click()
  await expect(page.locator('.library-item')).toHaveCount(1)
  await page.getByRole('button', { name: '닫기', exact: true }).click()
  await expect(page.getByRole('timer')).toHaveText('10:00')
})

test('copies the default without modifying it and builds repetitions without a final recovery', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '편집', exact: true }).click()
  await page.getByText('시간·반복 빠르게 구성하기', { exact: true }).click()
  await page.getByLabel('빠른 구성 준비').fill('0')
  await page.getByLabel('빠른 구성 운동').fill('1')
  await page.getByLabel('빠른 구성 회복').fill('1')
  await page.getByLabel('빠른 구성 반복').fill('2')
  await page.getByLabel('빠른 구성 정리').fill('0')
  await page.getByRole('button', { name: '이 반복 구성 적용' }).click()
  await page.getByRole('button', { name: '구성 바꾸기' }).click()
  await expect(page.locator('.editor-block')).toHaveCount(3)
  await page.getByRole('button', { name: '프로그램 저장', exact: true }).click()
  await expect(page.getByRole('timer')).toHaveText('01:00')
  await page.getByRole('button', { name: '프로그램', exact: true }).click()
  await expect(page.locator('.library-item')).toHaveCount(2)
  await page.getByRole('button', { name: '노르웨지안 4×4 선택', exact: true }).click()
  await expect(page.getByRole('timer')).toHaveText('10:00')
})

test('rejects bad imports and does not replace the built-in on importing its ID', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '프로그램', exact: true }).click()
  const input = page.getByLabel('프로그램 JSON 파일')
  await input.setInputFiles({ name: 'invalid.json', mimeType: 'application/json', buffer: Buffer.from('{}') })
  await expect(page.getByRole('alert')).toContainText('지원하지 않는 프로그램 형식')
  await input.setInputFiles({ name: 'large.json', mimeType: 'application/json', buffer: Buffer.alloc(100001, 'a') })
  await expect(page.getByRole('alert')).toContainText('100KB')
  await input.setInputFiles({ name: 'copy.json', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(NORWEGIAN_PROGRAM)) })
  await expect(page.locator('.library-item')).toHaveCount(2)
  const data = await page.evaluate(() => JSON.parse(localStorage.getItem('four-by-four:v1:programs')!))
  expect(data.programs[0].id).not.toBe(NORWEGIAN_PROGRAM.id)
})

test('keeps imported names as plain text rather than HTML', async ({ page }) => {
  await page.goto('/')
  const name = '<img src=x onerror=alert(1)>'
  await importFile(page, { ...tenSecondProgram, name })
  await expect(page.locator('.library-list img')).toHaveCount(0)
  await expect(page.getByRole('button', { name: `${name} 선택` })).toBeVisible()
})

test('folds the header and blocks program changes while a session is under way', async ({ page }) => {
  await freeze(page)
  await expect(page.locator('.site-header')).toBeVisible()
  await page.getByRole('button', { name: '운동 시작', exact: true }).click()
  await expect(page.locator('.site-header')).toBeHidden()
  await expect(page.getByRole('button', { name: '프로그램', exact: true })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /프로그램 변경/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: '편집', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '일시정지', exact: true }).click()
  await expect(page.locator('.site-header')).toBeHidden()
  await expect(page.getByRole('button', { name: '편집', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '처음부터 다시' }).click()
  await page.getByRole('button', { name: '초기화', exact: true }).click()
  await expect(page.locator('.site-header')).toBeVisible()
  await expect(page.getByRole('button', { name: '편집', exact: true })).toBeVisible()
})

test('first iPhone screen ends at the total progress line; the program order is below the fold', async ({ page, browserName }) => {
  test.skip(browserName !== 'webkit', 'iPhone-sized layout check')
  await page.setViewportSize({ width: 440, height: 956 })
  await freeze(page)
  for (const state of ['idle', 'running']) {
    if (state === 'running') {
      await page.getByRole('button', { name: '운동 시작', exact: true }).click()
      await expect(page.locator('.site-header')).toBeHidden()
      await page.waitForTimeout(500)
    }
    await page.evaluate(() => window.scrollTo(0, 0))
    const progress = (await page.locator('.total-progress').boundingBox())!
    const order = (await page.locator('.program-overview').boundingBox())!
    expect(progress.y + progress.height, state).toBeLessThanOrEqual(956)
    expect(progress.y + progress.height, state).toBeGreaterThan(956 - 40)
    expect(order.y, state).toBeGreaterThanOrEqual(956)
  }
  // The safety line lives at the very end of the page, after the guide links.
  const safety = (await page.getByText('가슴 통증·어지럼이 있으면 즉시 중지').boundingBox())!
  const links = (await page.locator('.page-links').boundingBox())!
  expect(safety.y).toBeGreaterThan(links.y)
})

test('protects unsaved edits and restores focus when closing a dialog', async ({ page }) => {
  await page.goto('/')
  // Safari intentionally does not focus buttons on a pointer tap. Verify the
  // keyboard focus-return contract by opening from a focused keyboard trigger.
  await page.getByRole('button', { name: '편집', exact: true }).focus()
  await page.getByRole('button', { name: '편집', exact: true }).press('Enter')
  await page.getByLabel('프로그램 이름', { exact: true }).fill('저장 전 변경')
  await page.getByRole('button', { name: '닫기', exact: true }).click()
  await expect(page.getByText('저장하지 않은 변경이 있어요. 편집을 그만둘까요?')).toBeVisible()
  await page.getByRole('button', { name: '계속 편집' }).click()
  await expect(page.getByLabel('프로그램 이름', { exact: true })).toHaveValue('저장 전 변경')
  await page.getByRole('button', { name: '닫기', exact: true }).click()
  await page.getByRole('button', { name: '변경 버리기' }).click()
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(page.getByRole('button', { name: '편집', exact: true })).toBeFocused()
})

test('gracefully recovers malformed saved state and warns when writes are blocked', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('four-by-four:v1:workout', '{not json')
    localStorage.setItem('four-by-four:v1:preferences', JSON.stringify({ profile: { method: 'age', value: -3 } }))
    Storage.prototype.setItem = function () { throw new DOMException('Storage blocked', 'QuotaExceededError') }
  })
  await page.goto('/')
  await expect(page.getByRole('timer')).toHaveText('10:00')
  await expect(page.getByRole('alert')).toContainText('브라우저에 저장할 수 없어요')
  await page.getByRole('button', { name: '운동 시작', exact: true }).click()
  await expect(page.getByRole('button', { name: '일시정지', exact: true })).toBeVisible()
})

test('does not require randomUUID or Wake Lock support', async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(crypto, 'randomUUID', { value: undefined, configurable: true })
    if ('wakeLock' in navigator) Object.defineProperty(navigator.wakeLock, 'request', { value: () => Promise.reject(new Error('Not supported')) })
  })
  await page.goto('/')
  await page.getByRole('button', { name: '운동 시작', exact: true }).click()
  await expect(page.getByRole('button', { name: '일시정지', exact: true })).toBeVisible()
  await expect(page.getByText('화면 켜짐 유지 중')).toHaveCount(0)
})

test('is accessible on the main screen, dialogs and active phases', async ({ page }) => {
  await freeze(page)
  // axe schedules browser tasks; a frozen browser clock would stall the audit.
  await page.clock.resume()
  for (const section of ['main', 'settings', 'editor', 'work', 'recovery']) {
    if (section === 'settings') await page.getByRole('button', { name: '개인 설정' }).click()
    if (section === 'editor') await page.getByRole('button', { name: '편집', exact: true }).click()
    if (section === 'work') {
      await page.getByRole('button', { name: '운동 시작', exact: true }).click()
      await page.clock.fastForward(600_000)
    }
    if (section === 'recovery') await page.clock.fastForward(240_000)
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
    expect(results.violations, `${section}: ${JSON.stringify(results.violations.map((item) => ({ id: item.id, nodes: item.nodes.map((node) => node.target) })))}`).toEqual([])
    if (section === 'settings' || section === 'editor') await page.getByRole('button', { name: '닫기', exact: true }).click()
  }
})

test('fits iPhone, small phones and landscape without horizontal overflow', async ({ page }) => {
  await page.goto('/')
  for (const viewport of [{ width: 440, height: 956 }, { width: 375, height: 812 }, { width: 320, height: 740 }, { width: 956, height: 440 }]) {
    await page.setViewportSize(viewport)
    const dimensions = await page.evaluate(() => ({ scroll: document.documentElement.scrollWidth, width: window.innerWidth }))
    expect(dimensions.scroll, JSON.stringify(viewport)).toBeLessThanOrEqual(dimensions.width)
    await page.getByRole('button', { name: '편집', exact: true }).click()
    const dialog = page.getByRole('dialog')
    const box = await dialog.boundingBox()
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(viewport.width + 1)
    expect(await dialog.evaluate((element) => element.scrollWidth <= element.clientWidth + 1)).toBe(true)
    await page.getByRole('button', { name: '닫기', exact: true }).click()
  }
  // Reserve room for real Safari browser chrome, not just the full screen size.
  await page.setViewportSize({ width: 440, height: 780 })
  await page.evaluate(() => window.scrollTo(0, 0))
  const start = await page.getByRole('button', { name: '운동 시작', exact: true }).boundingBox()
  expect(start!.y + start!.height).toBeLessThan(780)
})

test('loads the cached production app offline', async ({ page, context, browserName }) => {
  test.skip(browserName !== 'chromium', 'Service-worker offline emulation is checked in Chromium; iPhone installation requires a real-device HTTPS check.')
  await page.goto('/')
  await page.evaluate(async () => { await navigator.serviceWorker.ready })
  await expect.poll(() => page.evaluate(() => Boolean(navigator.serviceWorker.controller))).toBe(true)
  await context.setOffline(true)
  await page.reload()
  await expect(page.getByRole('timer')).toHaveText('10:00')
  await page.getByRole('button', { name: '운동 시작', exact: true }).click()
  await expect(page.getByRole('button', { name: '일시정지', exact: true })).toBeVisible()
})
