import { expect, test } from '@playwright/test'

test('typing full target text reaches result screen', async ({ page }) => {
  await page.goto('/')

  const input = page.locator('#typing-input')
  await expect(input).toBeVisible()
  const expectedChars = await page.locator('.target-char').allTextContents()
  const expectedText = expectedChars.join('')

  await input.fill(expectedText)

  await expect(page.getByText('測試完成')).toBeVisible()
  await expect(page.getByRole('button', { name: '去查碼' })).toBeVisible()
})
