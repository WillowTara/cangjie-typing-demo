import { expect, test } from '@playwright/test'

test('landing page renders primary navigation and footer', async ({ page }) => {
  await page.goto('/')

  await expect(page.getByText('cangjie')).toBeVisible()
  await expect(page.getByRole('button', { name: '打字' })).toBeVisible()
  await expect(page.getByRole('button', { name: '查碼' })).toBeVisible()
  await expect(page.getByText('倉頡/速成輸入法練習 - Demo 版本')).toBeVisible()
})
