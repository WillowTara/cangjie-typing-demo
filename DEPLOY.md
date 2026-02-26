# 倉頡/速成打字練習 - Demo 部署指南

## 快速部署選項

### 選項 A：Vercel（推薦，自動部署）

1. **建立 GitHub Repo**
   - 打開 https://github.com/new
   - Repository name: `cangjie-typing-demo`
   - 選擇 `Public`
   - 點 `Create repository`

2. **在本機執行**
   ```bash
   # 取代下面的 YOUR_USERNAME 為你的 GitHub 用戶名
   git remote add origin https://github.com/YOUR_USERNAME/cangjie-typing-demo.git
   git branch -M main
   git push -u origin main
   ```

3. **部署到 Vercel**
   - 打開 https://vercel.com/new
   - 選擇 `Import Project`
   - 選擇你剛才建立的 GitHub repo
   - 設定：
     - Framework Preset: `Vite`
     - Build Command: `npm run build`
     - Output Directory: `dist`
   - 點 `Deploy`

4. **完成！** 會拿到一個 `*.vercel.app` 網址

---

### 選項 B：Netlify（最快，不用 Git）

1. **安裝 Netlify CLI**
   ```bash
   npm install -g netlify-cli
   ```

2. **部署**
   ```bash
   netlify deploy --prod --dir=dist
   ```

3. **綁定 GitHub（可選）**
   - 在 Netlify 後台設定

---

## 現有資料夾結構

```
newproject/
├── dist/                 # npm run build 產出
├── public/dict/          # 範例字典
│   ├── sample-dictionary.csv
│   └── sample-dictionary.json
├── src/
│   ├── App.tsx           # 主應用程式
│   ├── App.css           # 樣式
│   ├── index.css         # 全域樣式
│   ├── config/runtime.ts # 執行期設定（VITE_*）
│   ├── features/         # typing/lookup/dictionary 模組
│   ├── observability/    # 錯誤可觀測模組
│   └── lib/dictionary.ts # 字典解析模組
├── e2e/                  # Playwright E2E
├── playwright.config.ts
├── package.json
└── vite.config.ts
```

## 部署前檢查

```bash
# 確保 build 成功
npm run build

# 全量品質關卡
npm run check

# E2E 測試
npm run test:e2e

# 預覽本地部署
npm run preview
```

## Demo 網址範例

部署完成後分享：
- `https://cangjie-typing-demo.vercel.app`
- 或任何你獲得的網址

## 後續更新

每次推送更新到 GitHub main 分支，Vercel 會自動重新部署。

---

## 技術規格

- **Framework**: Vite + React 19 + TypeScript
- **Node 版本**: 25.7.0（以 `.nvmrc` 為準）
- **建置輸出**: `dist/`
- **依賴**: 無後端，純靜態部署
