"# 圖片浮水印工具 (Image Watermark Tool)

一個簡單易用的線上圖片浮水印工具，支援自訂文字和預設浮水印類型。

## 🚀 線上體驗

**GitHub Pages 部署版本**: [點擊這裡體驗](https://[你的用戶名].github.io/water_marker/)

> 注意：請將上面的 `[你的用戶名]` 替換為你的實際 GitHub 用戶名

## ✨ 功能特色

- 🖼️ **多格式支援**：JPG、PNG、GIF
- 🎨 **預設浮水印**：台灣身分證驗證、文件備份等
- ✏️ **自訂文字**：可輸入任意文字作為浮水印
- 📱 **響應式設計**：完美支援桌面和行動裝置
- 🎯 **精確控制**：9個預設位置 + 透明度/字體大小調整
- 🚀 **即時預覽**：所見即所得的預覽效果
- 💾 **多格式下載**：PNG (高品質) 和 JPG (小檔案)
- ♿ **無障礙設計**：支援鍵盤導航和螢幕閱讀器
- 🔒 **隱私保護**：所有處理都在瀏覽器本地進行
- 🎭 **嵌入支援**：可嵌入到其他網站使用

## 🛠️ 技術架構

### 前端技術
- **HTML5**: 語義化標記和無障礙設計
- **CSS3**: 響應式設計、動畫效果、暗色主題支援
- **JavaScript (ES6+)**: 模組化架構、Web Workers、Canvas API
- **Bootstrap 5**: UI 框架和響應式網格系統

### 核心功能
- **模組化設計**: 錯誤處理、設定管理、檔案處理、Canvas 渲染、下載管理
- **效能優化**: 離屏渲染、防抖動/節流、記憶體管理、Web Workers
- **無障礙功能**: WCAG 2.1 AA 標準、鍵盤導航、螢幕閱讀器支援
- **跨瀏覽器**: Chrome 80+、Firefox 75+、Safari 13+、Edge 80+

## 📁 專案結構

```
├── docs/                    # 🚀 GitHub Pages 部署資料夾
│   ├── index.html          # 主頁面
│   ├── css/style.css       # 樣式檔案
│   ├── js/app.js           # 主要應用程式邏輯
│   └── README.md           # 使用說明
├── js/                     # 開發和測試檔案
│   ├── app.js              # 主要應用程式（開發版）
│   ├── *.test.js           # 單元測試
│   └── test-*.js           # 測試工具
├── css/style.css           # 樣式檔案（開發版）
├── index.html              # 主頁面（開發版）
├── embed-test.html         # 嵌入模式測試
├── test-results.md         # 測試結果報告
├── DEPLOYMENT.md           # 部署指南
└── package.json            # 開發依賴
```

## 🚀 快速開始

### 線上使用
直接訪問 GitHub Pages 部署的版本，無需安裝任何軟體。

### 本地開發

1. **克隆專案**
   ```bash
   git clone https://github.com/[你的用戶名]/water_marker.git
   cd water_marker
   ```

2. **安裝開發依賴**（僅用於測試）
   ```bash
   npm install
   ```

3. **運行測試**
   ```bash
   npm test
   ```

4. **本地預覽**
   ```bash
   # 使用任何靜態檔案伺服器
   cd docs
   python -m http.server 8000
   # 或
   npx http-server docs -p 8000
   ```

## 📖 使用指南

### 基本使用
1. **上傳圖片**: 點擊上傳區域或拖放圖片檔案
2. **選擇浮水印**: 預設類型或自訂文字
3. **調整樣式**: 設定透明度、字體大小和位置
4. **預覽效果**: 即時查看浮水印效果
5. **下載圖片**: 選擇格式並下載

### 鍵盤快捷鍵
- `Alt + U`: 開啟檔案選擇
- `Alt + D`: 下載圖片
- `Escape`: 取消操作

### 嵌入使用
```html
<iframe src="https://[你的用戶名].github.io/water_marker/" 
        width="800" height="600" 
        frameborder="0">
</iframe>
```

## 🧪 測試

專案包含完整的測試套件：

- **單元測試**: 核心功能測試
- **整合測試**: 模組間協作測試
- **跨瀏覽器測試**: 相容性測試
- **無障礙測試**: WCAG 標準驗證
- **效能測試**: 載入和運行效能

```bash
# 運行所有測試
npm test

# 運行特定測試
npm run test:unit
npm run test:integration
npm run test:accessibility
```

## 🌐 部署到 GitHub Pages

詳細部署指南請參考 [DEPLOYMENT.md](DEPLOYMENT.md)

### 快速部署
1. Fork 這個專案
2. 在 GitHub 儲存庫設定中啟用 Pages
3. 選擇 `main` 分支的 `/docs` 資料夾
4. 等待部署完成

## 🤝 貢獻指南

歡迎貢獻！請遵循以下步驟：

1. Fork 專案
2. 創建功能分支 (`git checkout -b feature/AmazingFeature`)
3. 提交變更 (`git commit -m 'Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 開啟 Pull Request

### 開發規範
- 遵循現有的程式碼風格
- 添加適當的測試
- 更新相關文件
- 確保無障礙功能正常

## 📊 測試結果

最新測試結果請參考 [test-results.md](test-results.md)

- **總體相容性**: 79.5% (良好)
- **瀏覽器支援**: 優秀
- **行動裝置**: 良好
- **無障礙功能**: 優秀
- **效能表現**: 良好

## 🔧 技術細節

### 效能優化
- Web Workers 處理大檔案
- 離屏 Canvas 渲染
- 記憶體自動管理
- 資源預載入
- 防抖動/節流機制

### 無障礙功能
- WCAG 2.1 AA 標準
- 鍵盤完整導航
- 螢幕閱讀器支援
- 高對比模式
- 動畫偏好設定

### 瀏覽器支援
| 瀏覽器 | 版本 | 支援狀態 |
|--------|------|----------|
| Chrome | 80+ | ✅ 完全支援 |
| Firefox | 75+ | ✅ 完全支援 |
| Safari | 13+ | ✅ 完全支援 |
| Edge | 80+ | ✅ 完全支援 |

## 📄 授權

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案

## 🙏 致謝

- [Bootstrap](https://getbootstrap.com/) - UI 框架
- [Bootstrap Icons](https://icons.getbootstrap.com/) - 圖示庫
- 所有貢獻者和測試者

## 📞 聯絡

如有問題或建議，請：
- 開啟 [Issue](https://github.com/[你的用戶名]/water_marker/issues)
- 發送 Pull Request
- 聯絡專案維護者

---

⭐ 如果這個專案對你有幫助，請給它一個星星！

© 2024 圖片浮水印工具. 簡單易用的線上浮水印工具." 
