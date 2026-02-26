import { expect, test } from '@playwright/test'

test('lookup mode returns cangjie and quick code for known character', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: '查碼' }).click()

  const lookupInput = page.getByPlaceholder('輸入中文字查詢倉頡/速成碼...')
  await expect(lookupInput).toBeVisible()
  await expect(lookupInput).toBeEnabled()

  await lookupInput.fill('日')

  const firstItem = page.locator('.lookup-item').first()
  await expect(firstItem.locator('.lookup-char')).toHaveText('日')
  await expect(firstItem.getByText('倉頡')).toBeVisible()
  await expect(firstItem.getByText('速成')).toBeVisible()
  await expect(firstItem.locator('.code-value').first()).toHaveText('A')
})
