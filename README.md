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
│   ├── README.md           # 使用說明
│   └── CNAME.example       # 自訂網域範例
├── .kiro/                  # Kiro IDE 設定檔案
├── README.md               # 專案說明
├── DEPLOYMENT.md           # 部署指南
└── .gitignore              # Git 忽略規則
```

## 🚀 快速開始

### 線上使用
直接訪問 GitHub Pages 部署的版本，無需安裝任何軟體。

### 本地預覽

1. **克隆專案**
   ```bash
   git clone https://github.com/[你的用戶名]/water_marker.git
   cd water_marker
   ```

2. **本地預覽**（可選）
   ```bash
   # 使用 Python 內建伺服器
   cd docs
   python -m http.server 8000
   
   # 或使用 PHP 內建伺服器
   cd docs
   php -S localhost:8000
   
   # 然後在瀏覽器開啟 http://localhost:8000
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

本專案已通過完整的測試驗證：

- ✅ **跨瀏覽器相容性**: Chrome、Firefox、Safari、Edge
- ✅ **響應式設計**: 桌面、平板、手機完美適配
- ✅ **無障礙功能**: WCAG 2.1 AA 標準
- ✅ **效能優化**: 快速載入和流暢操作
- ✅ **功能完整性**: 所有核心功能正常運作

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

## 📊 功能特色

- **總體相容性**: 優秀 - 支援所有主流瀏覽器
- **瀏覽器支援**: 完整 - Chrome、Firefox、Safari、Edge
- **行動裝置**: 完美 - 響應式設計，觸控優化
- **無障礙功能**: 完整 - WCAG 2.1 AA 標準
- **效能表現**: 優秀 - 快速載入，流暢操作

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
