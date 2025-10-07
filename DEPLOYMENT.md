# GitHub Pages 部署指南

本專案已經準備好部署到 GitHub Pages。所有生產環境需要的檔案都已經整理到 `docs/` 資料夾中。

## 檔案結構

```
docs/                    # GitHub Pages 部署資料夾
├── index.html          # 主頁面
├── css/
│   └── style.css       # 樣式檔案
├── js/
│   └── app.js          # 主要應用程式邏輯
└── README.md           # 專案說明

# 開發和測試檔案（不會部署到 GitHub Pages）
├── js/
│   ├── *.test.js       # 測試檔案
│   ├── test-*.js       # 測試工具
│   └── *.backup        # 備份檔案
├── embed-test.html     # 嵌入測試頁面
├── test-results.md     # 測試結果報告
├── package.json        # Node.js 依賴（僅用於開發）
└── package-lock.json   # 鎖定版本（僅用於開發）
```

## 部署步驟

### 1. 推送到 GitHub

```bash
git add .
git commit -m "準備 GitHub Pages 部署"
git push origin main
```

### 2. 設定 GitHub Pages

1. 前往你的 GitHub 儲存庫
2. 點擊 **Settings** 標籤
3. 在左側選單中找到 **Pages**
4. 在 **Source** 部分選擇：
   - **Deploy from a branch**
   - **Branch**: `main`
   - **Folder**: `/docs`
5. 點擊 **Save**

### 3. 等待部署完成

- GitHub 會自動建置和部署你的網站
- 通常需要幾分鐘時間
- 部署完成後，你會看到綠色的勾選標記

### 4. 訪問你的網站

你的網站將會在以下網址可用：
```
https://[你的用戶名].github.io/[儲存庫名稱]/
```

## 自訂網域（可選）

如果你有自己的網域，可以設定自訂網域：

1. 在 `docs/` 資料夾中創建 `CNAME` 檔案
2. 在檔案中輸入你的網域名稱（例如：`watermark.example.com`）
3. 在你的 DNS 提供商設定 CNAME 記錄指向 `[你的用戶名].github.io`

## 更新網站

要更新網站內容：

1. 修改 `docs/` 資料夾中的檔案
2. 提交並推送變更：
   ```bash
   git add docs/
   git commit -m "更新網站內容"
   git push origin main
   ```
3. GitHub Pages 會自動重新部署

## 本地開發

如果需要在本地開發和測試：

1. 安裝依賴（僅用於測試）：
   ```bash
   npm install
   ```

2. 運行測試：
   ```bash
   npm test
   ```

3. 本地預覽（使用任何靜態檔案伺服器）：
   ```bash
   # 使用 Python
   cd docs
   python -m http.server 8000
   
   # 使用 Node.js (需要安裝 http-server)
   npx http-server docs -p 8000
   
   # 使用 PHP
   cd docs
   php -S localhost:8000
   ```

## 效能優化

`docs/` 資料夾中的檔案已經過優化：

- ✅ 移除了所有測試檔案
- ✅ 移除了開發依賴
- ✅ 使用 CDN 載入 Bootstrap 和圖示
- ✅ 優化了 CSS 和 JavaScript
- ✅ 包含完整的無障礙功能
- ✅ 支援響應式設計

## 功能特色

部署的網站包含以下功能：

- 🖼️ 圖片上傳和處理
- 🎨 浮水印添加（預設和自訂）
- 📱 響應式設計
- ♿ 無障礙支援
- 🚀 效能優化
- 🔒 隱私保護（本地處理）

## 故障排除

### 網站無法載入
- 檢查 GitHub Pages 設定是否正確
- 確認 `docs/` 資料夾包含 `index.html`
- 檢查瀏覽器控制台是否有錯誤

### 樣式或功能異常
- 確認所有檔案路徑正確
- 檢查 CDN 資源是否可用
- 驗證 JavaScript 是否有語法錯誤

### 更新未生效
- 等待幾分鐘讓 GitHub Pages 重新部署
- 清除瀏覽器快取
- 檢查 Git 提交是否成功推送

## 支援

如果遇到問題，請檢查：

1. [GitHub Pages 文件](https://docs.github.com/en/pages)
2. 瀏覽器開發者工具的控制台
3. GitHub Actions 標籤中的部署日誌

---

© 2024 圖片浮水印工具