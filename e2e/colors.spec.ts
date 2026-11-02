import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const palette = {
  warmup: 'rgb(255, 214, 0)',
  work: 'rgb(0, 200, 83)',
  recovery: 'rgb(226, 27, 45)',
}

test('fills the screen with yellow, green and red phase gradients and keeps controls gray', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-01T12:00:00Z') })
  await page.goto('/')
  const panel = page.locator('.stage-panel')
  const core = () => page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--phase-core').trim())
  const phase = () => page.evaluate(() => document.documentElement.dataset.phase)
  // Fill mode: a pale full-screen layer plus a saturated layer scaled to the step progress.
  const pale = () => page.evaluate(() => getComputedStyle(document.body, '::before').backgroundColor)
  const fill = () => page.evaluate(() => { const style = getComputedStyle(document.body, '::after'); return { color: style.backgroundColor, transform: style.transform, position: style.position } })
  expect(await pale()).toBe('rgb(255, 241, 166)')
  expect((await fill()).position).toBe('fixed')
  expect((await fill()).color).toBe(palette.warmup)
  expect((await fill()).transform).toMatch(/^matrix\(0, 0, 0, 1|^none$|^matrix\(0,/)
  expect(await phase()).toBe('warmup')
  expect(await core()).toBe('#ffd600')
  await expect(page.locator('.start-button')).toHaveCSS('background-color', 'rgb(52, 55, 60)')
  await expect(page.locator('.program-block.kind-warmup')).toHaveCSS('background-color', palette.warmup)
  await expect(page.locator('.program-block.kind-work').first()).toHaveCSS('background-color', palette.work)
  await expect(page.locator('.program-block.kind-recovery').first()).toHaveCSS('background-color', palette.recovery)
  await page.getByRole('button', { name: '운동 시작', exact: true }).click()
  // Halfway through the warmup, the saturated color covers half the screen.
  await page.clock.fastForward(300_000)
  const stepProgress = () => page.evaluate(() => Math.round(Number(getComputedStyle(document.documentElement).getPropertyValue('--step-progress')) * 100) / 100)
  await expect.poll(stepProgress).toBe(0.5)
  await page.clock.fastForward(300_000)
  await expect.poll(phase).toBe('work')
  expect(await pale()).toBe('rgb(168, 240, 196)')
  expect((await fill()).color).toBe(palette.work)
  await page.clock.fastForward(60_000)
  await expect.poll(stepProgress).toBe(0.25)
  expect(await core()).toBe('#00c853')
  await expect(panel.getByRole('heading')).toHaveText('고강도 1')
  await expect(page.locator('.start-button')).toHaveCSS('background-color', 'rgb(52, 55, 60)')
  await page.clock.fastForward(180_000)
  await expect.poll(phase).toBe('recovery')
  expect(await core()).toBe('#ff1f33')
  expect(await pale()).toBe('rgb(255, 177, 184)')
  expect((await fill()).color).toBe('rgb(255, 31, 51)')
  await expect(panel.getByRole('heading')).toHaveText('활동성 회복')
  // Cooldown shares the recovery color; the explicit label distinguishes it.
  await page.clock.fastForward(1_260_000)
  await expect.poll(phase).toBe('cooldown')
  expect(await core()).toBe('#ff1f33')
  await expect(panel.getByRole('heading')).toHaveText('쿨다운')
  await page.clock.fastForward(300_000)
  await expect(panel.getByRole('heading')).toHaveText('오늘도, 잘했어요.')
  // The header folds back in after the workout; audit once the transition has finished.
  await page.clock.resume()
  await expect(page.locator('.site-header')).toHaveCSS('opacity', '1')
  expect((await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa']).analyze()).violations).toEqual([])
})

test('keeps the block editor palette and expanded recovery labels legible', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('button', { name: '편집', exact: true }).click()
  const blocks = page.locator('.editor-block')
  await expect(blocks.nth(0)).toHaveCSS('background-color', palette.warmup)
  await expect(blocks.nth(1)).toHaveCSS('background-color', palette.work)
  await expect(blocks.nth(2)).toHaveCSS('background-color', palette.recovery)
  await blocks.nth(2).locator('summary').click()
  const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21aa']).analyze()
  expect(results.violations).toEqual([])
})

test('circle fill option grows from the countdown and is saved in settings', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-01T12:00:00Z') })
  await page.goto('/')
  expect(await page.evaluate(() => document.documentElement.dataset.bg)).toBe('sweep')
  await page.getByRole('button', { name: '개인 설정' }).click()
  await page.getByRole('button', { name: '가운데서 퍼지는 원' }).click()
  await page.getByRole('button', { name: '설정 저장' }).click()
  await expect.poll(() => page.evaluate(() => document.documentElement.dataset.bg)).toBe('circle')
  await page.getByRole('button', { name: '운동 시작', exact: true }).click()
  await page.clock.fastForward(300_000)
  await page.clock.resume()
  // Halfway through, the circle is centered on the countdown with half its full reach.
  await expect.poll(() => page.evaluate(() => {
    const timer = document.querySelector('[role="timer"]')!.getBoundingClientRect()
    const reach = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--fill-reach'))
    const clip = getComputedStyle(document.body, '::after').clipPath
    // Interpolated values can serialize as calc(≈0% + Npx); normalize those to Npx.
    const match = clip.replace(/calc\([-\d.e]+% \+ ([\d.]+px)\)/g, '$1').match(/circle\(([\d.]+)px at ([\d.]+)px ([\d.]+)px\)/)
    if (!match) return clip
    const [radius, x, y] = match.slice(1).map(Number)
    return Math.abs(x - (timer.left + timer.width / 2)) < 2 && Math.abs(y - (timer.top + timer.height / 2)) < 2 && Math.abs(radius / reach - 0.5) < 0.02
  }), { timeout: 3000 }).toBe(true)
  await page.reload()
  expect(await page.evaluate(() => document.documentElement.dataset.bg)).toBe('circle')
})
