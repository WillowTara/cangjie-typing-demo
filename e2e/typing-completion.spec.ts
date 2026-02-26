import { expect, test } from '@playwright/test'

test('typing full target text reaches result screen', async ({ page }) => {
  await page.goto('/')

  const input = page.locator('#typing-input')
  await expect(input).toBeVisible()

  await input.fill('我們學中文白話文練習')

  await expect(page.getByText('測試完成')).toBeVisible()
  await expect(page.getByRole('button', { name: '去查碼' })).toBeVisible()
})
