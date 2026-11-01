import { expect, test } from '@playwright/test'
import AxeBuilder from '@axe-core/playwright'

const palette = {
  warmup: 'rgb(255, 214, 0)',
  work: 'rgb(0, 200, 83)',
  recovery: 'rgb(226, 27, 45)',
}

test('uses saturated yellow, green and red consistently in the timer and program blocks', async ({ page }) => {
  await page.clock.install({ time: new Date('2026-11-01T12:00:00Z') })
  await page.goto('/')
  const panel = page.locator('.stage-panel')
  await expect(panel).toHaveCSS('background-color', palette.warmup)
  await expect(page.locator('.program-block.kind-warmup')).toHaveCSS('background-color', palette.warmup)
  await expect(page.locator('.program-block.kind-work').first()).toHaveCSS('background-color', palette.work)
  await expect(page.locator('.program-block.kind-recovery').first()).toHaveCSS('background-color', palette.recovery)
  await page.getByRole('button', { name: '운동 시작', exact: true }).click()
  await page.clock.fastForward(600_000)
  await expect(panel).toHaveCSS('background-color', palette.work)
  await expect(panel.getByRole('heading')).toHaveText('고강도 1')
  await page.clock.fastForward(240_000)
  await expect(panel).toHaveCSS('background-color', palette.recovery)
  await expect(page.getByRole('timer')).toHaveCSS('color', 'rgb(255, 255, 255)')
  await expect(panel.getByRole('heading')).toHaveText('활동성 회복')
  // Cooldown shares the recovery color; the explicit label distinguishes it.
  await page.clock.fastForward(1_260_000)
  await expect(panel).toHaveCSS('background-color', palette.recovery)
  await expect(panel.getByRole('heading')).toHaveText('쿨다운')
  await page.clock.fastForward(300_000)
  await expect(panel.getByRole('heading')).toHaveText('오늘도, 잘했어요.')
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
