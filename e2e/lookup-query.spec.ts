import { expect, test } from '@playwright/test'

test('lookup mode returns cangjie and quick code for known character', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: '查碼' }).click()

  await expect(page.getByRole('button', { name: '倉頡' })).toBeVisible()
  await expect(page.getByRole('button', { name: '速成' })).toBeVisible()
  await expect(page.getByRole('button', { name: '拼音' })).toBeVisible()
  await expect(page.getByRole('button', { name: '注音' })).toBeVisible()

  const lookupInput = page.getByPlaceholder('輸入中文字查詢倉頡/速成碼...')
  await expect(lookupInput).toBeVisible()
  await expect(lookupInput).toBeEnabled()

  await lookupInput.fill('日')

  const firstItem = page.locator('.lookup-item').first()
  await expect(firstItem.locator('.lookup-char')).toHaveText('日')
  await expect(firstItem.getByText('倉頡')).toBeVisible()
  await expect(firstItem.getByText('速成')).toBeVisible()
  await expect(firstItem.locator('.code-chinese').first()).toHaveText('日')
})

test('lookup mode renders pronunciation rows and filter toggles for characters with pronunciation data', async ({ page }) => {
  await page.goto('/')

  await page.getByRole('button', { name: '查碼' }).click()

  const lookupInput = page.getByPlaceholder('輸入中文字查詢倉頡/速成碼...')
  await expect(lookupInput).toBeVisible()
  await expect(lookupInput).toBeEnabled()

  await lookupInput.fill('中')

  const firstItem = page.locator('.lookup-item').first()
  await expect(firstItem.locator('.lookup-char')).toHaveText('中')
  await expect(firstItem.getByText('拼音')).toBeVisible()
  await expect(firstItem.getByText('注音')).toBeVisible()
  await expect(firstItem.getByText('zhōng')).toBeVisible()
  await expect(firstItem.getByText('zhòng')).toBeVisible()
  await expect(firstItem.getByText('ㄓㄨㄥ')).toBeVisible()
  await expect(firstItem.getByText('ㄓㄨㄥˋ')).toBeVisible()

  await page.getByRole('button', { name: '拼音' }).click()
  await expect(firstItem.getByText('zhōng')).toHaveCount(0)
  await expect(firstItem.getByText('ㄓㄨㄥ')).toBeVisible()
})
