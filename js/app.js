/**
 * 圖片浮水印工具 - 主要應用程式邏輯
 */

// 應用程式狀態管理
class WatermarkApp {
    constructor() {
        this.imageData = null;
        this.canvas = null;
        this.context = null;
        this.watermarkConfig = {
            type: 'preset',
            text: '僅供身分驗證使用',
            presetType: 'taiwan-id',
            position: 'bottom-right',
            opacity: 0.5,
            fontSize: 24,
            color: '#ff0000',
            x: 0,
            y: 0
        };
        this.zoomLevel = 1;
        this.minZoom = 0.1;
        this.maxZoom = 3;
        this.isEmbedded = window.self !== window.top;
        
        // 拖拽狀態管理
        this.isDragging = false;
        this.dragStartX = 0;
        this.dragStartY = 0;
        this.dragOffsetX = 0;
        this.dragOffsetY = 0;
        this.watermarkBounds = { x: 0, y: 0, width: 0, height: 0 };
        
        this.init();
    }

    /**
     * 初始化應用程式
     */
    init() {
        this.setupEventListeners();
        this.setupResponsiveHandlers();
        this.checkEmbeddedMode();
        this.initializePresetOptions();
        this.loadUserPreferences();
        console.log('圖片浮水印工具已初始化');
    }

    /**
     * 設定響應式處理器
     */
    setupResponsiveHandlers() {
        // 初始化響應式佈局
        this.updateResponsiveLayout();
        
        // 監聽視窗大小變化
        window.addEventListener('resize', () => {
            this.debounceResponsiveUpdate();
        });
        
        // 監聽螢幕方向變化
        window.addEventListener('orientationchange', () => {
            // 延遲處理以確保方向變化完成
            setTimeout(() => {
                this.handleOrientationChange();
            }, 100);
        });
        
        console.log('響應式處理器設定完成');
    }

    /**
     * 防抖動響應式更新
     */
    debounceResponsiveUpdate() {
        if (this.responsiveUpdateTimeout) {
            clearTimeout(this.responsiveUpdateTimeout);
        }
        
        this.responsiveUpdateTimeout = setTimeout(() => {
            this.updateResponsiveLayout();
        }, 250);
    }

    /**
     * 更新響應式佈局
     */
    updateResponsiveLayout() {
        const screenWidth = window.innerWidth;
        const body = document.body;
        
        // 移除所有佈局類別
        body.classList.remove('mobile-layout', 'tablet-layout', 'desktop-layout');
        
        // 根據螢幕寬度添加對應的佈局類別
        if (screenWidth < 768) {
            body.classList.add('mobile-layout');
            this.setupMobileLayout();
        } else if (screenWidth < 992) {
            body.classList.add('tablet-layout');
            this.setupTabletLayout();
        } else {
            body.classList.add('desktop-layout');
            this.setupDesktopLayout();
        }
        
        // 如果有圖片載入，重新調整 Canvas 尺寸
        if (this.imageData && this.canvas) {
            this.resizeCanvasForCurrentLayout();
        }
        
        console.log(`佈局已更新為: ${screenWidth < 768 ? 'mobile' : screenWidth < 992 ? 'tablet' : 'desktop'}`);
    }

    /**
     * 設定手機版佈局
     */
    setupMobileLayout() {
        // 顯示底部固定操作按鈕
        const mobileActions = document.getElementById('mobile-fixed-actions');
        if (mobileActions) {
            mobileActions.classList.remove('d-none');
            this.setupMobileActionButtons();
        }
        
        // 調整控制面板順序和樣式
        this.optimizeMobileControlPanel();
        
        // 調整預覽區域
        this.optimizeMobilePreview();
        
        console.log('手機版佈局已設定');
    }

    /**
     * 設定平板版佈局
     */
    setupTabletLayout() {
        // 隱藏底部固定操作按鈕
        const mobileActions = document.getElementById('mobile-fixed-actions');
        if (mobileActions) {
            mobileActions.classList.add('d-none');
        }
        
        console.log('平板版佈局已設定');
    }

    /**
     * 設定桌面版佈局
     */
    setupDesktopLayout() {
        // 隱藏底部固定操作按鈕
        const mobileActions = document.getElementById('mobile-fixed-actions');
        if (mobileActions) {
            mobileActions.classList.add('d-none');
        }
        
        console.log('桌面版佈局已設定');
    }

    /**
     * 設定手機版操作按鈕
     */
    setupMobileActionButtons() {
        const mobileDownloadBtn = document.getElementById('mobile-download-btn');
        const mobilePngBtn = document.getElementById('mobile-download-png');
        const mobileJpgBtn = document.getElementById('mobile-download-jpg');
        
        if (mobileDownloadBtn) {
            mobileDownloadBtn.addEventListener('click', () => this.downloadImage());
        }
        
        if (mobilePngBtn) {
            mobilePngBtn.addEventListener('click', () => this.downloadImage('png'));
        }
        
        if (mobileJpgBtn) {
            mobileJpgBtn.addEventListener('click', () => this.downloadImage('jpg'));
        }
        
        console.log('手機版操作按鈕已設定');
    }

    /**
     * 優化手機版控制面板
     */
    optimizeMobileControlPanel() {
        const controlPanel = this.elements.controlPanel;
        if (!controlPanel) return;
        
        // 調整卡片間距
        const cards = controlPanel.querySelectorAll('.card');
        cards.forEach(card => {
            card.style.marginBottom = '1.5rem';
        });
        
        // 優化按鈕組
        const buttonGroups = controlPanel.querySelectorAll('.btn-group');
        buttonGroups.forEach(group => {
            group.classList.add('w-100');
        });
        
        console.log('手機版控制面板已優化');
    }

    /**
     * 優化手機版預覽
     */
    optimizeMobilePreview() {
        const previewArea = this.elements.previewArea;
        if (!previewArea) return;
        
        // 調整預覽區域最小高度
        previewArea.style.minHeight = '250px';
        
        console.log('手機版預覽已優化');
    }

    /**
     * 為當前佈局調整 Canvas 尺寸
     */
    resizeCanvasForCurrentLayout() {
        if (!this.imageData || !this.canvas) return;
        
        const img = this.imageData.image;
        this.setupCanvas(img);
        this.updatePreview();
        
        console.log('Canvas 已為當前佈局調整尺寸');
    }

    /**
     * 處理螢幕方向變化
     */
    handleOrientationChange() {
        const currentOrientation = this.getCurrentOrientation();
        console.log(`螢幕方向已變化為: ${currentOrientation}`);
        
        // 顯示方向變化指示器
        this.showOrientationChangeIndicator();
        
        // 儲存當前方向
        this.currentOrientation = currentOrientation;
        
        // 更新響應式佈局
        this.updateResponsiveLayout();
        
        // 根據方向調整佈局
        this.adjustLayoutForOrientation(currentOrientation);
        
        // 如果有圖片，重新調整顯示
        if (this.imageData && this.canvas) {
            this.resizeCanvasForCurrentLayout();
            this.optimizeCanvasForOrientation(currentOrientation);
        }
        
        // 調整控制面板佈局
        this.adjustControlPanelForOrientation(currentOrientation);
        
        // 確保所有功能在新方向下正常運作
        this.validateFunctionalityAfterOrientationChange();
        
        // 延遲顯示完成提示和隱藏指示器
        setTimeout(() => {
            this.hideOrientationChangeIndicator();
            this.showOrientationChangeHint(currentOrientation);
        }, 300);
    }

    /**
     * 顯示方向變化指示器
     */
    showOrientationChangeIndicator() {
        const body = document.body;
        body.classList.add('orientation-changing');
        
        // 創建方向變化提示
        let indicator = document.getElementById('orientation-indicator');
        if (!indicator) {
            indicator = document.createElement('div');
            indicator.id = 'orientation-indicator';
            indicator.className = 'position-fixed top-50 start-50 translate-middle';
            indicator.style.cssText = `
                background: rgba(13, 110, 253, 0.9);
                color: white;
                padding: 1rem 1.5rem;
                border-radius: 0.75rem;
                font-size: 0.9rem;
                font-weight: 500;
                z-index: 9999;
                box-shadow: 0 0.5rem 1rem rgba(0, 0, 0, 0.2);
                backdrop-filter: blur(10px);
                opacity: 0;
                transform: translate(-50%, -50%) scale(0.9);
                transition: all 0.3s ease;
                pointer-events: none;
            `;
            indicator.innerHTML = `
                <div class="d-flex align-items-center">
                    <div class="spinner-border spinner-border-sm me-2" role="status">
                        <span class="visually-hidden">調整中...</span>
                    </div>
                    <span>正在調整佈局...</span>
                </div>
            `;
            document.body.appendChild(indicator);
        }
        
        // 顯示指示器
        setTimeout(() => {
            indicator.style.opacity = '1';
            indicator.style.transform = 'translate(-50%, -50%) scale(1)';
        }, 50);
    }

    /**
     * 隱藏方向變化指示器
     */
    hideOrientationChangeIndicator() {
        const body = document.body;
        body.classList.remove('orientation-changing');
        
        const indicator = document.getElementById('orientation-indicator');
        if (indicator) {
            indicator.style.opacity = '0';
            indicator.style.transform = 'translate(-50%, -50%) scale(0.9)';
            setTimeout(() => {
                if (indicator.parentNode) {
                    indicator.remove();
                }
            }, 300);
        }
    }

    /**
     * 取得當前螢幕方向
     */
    getCurrentOrientation() {
        const width = window.innerWidth;
        const height = window.innerHeight;
        
        if (width > height) {
            return 'landscape'; // 橫向
        } else {
            return 'portrait'; // 直向
        }
    }

    /**
     * 根據方向調整佈局
     */
    adjustLayoutForOrientation(orientation) {
        const body = document.body;
        
        // 移除之前的方向類別
        body.classList.remove('orientation-portrait', 'orientation-landscape');
        
        // 添加當前方向類別
        body.classList.add(`orientation-${orientation}`);
        
        if (orientation === 'landscape') {
            this.setupLandscapeLayout();
        } else {
            this.setupPortraitLayout();
        }
        
        console.log(`佈局已調整為${orientation}模式`);
    }

    /**
     * 設定橫向佈局
     */
    setupLandscapeLayout() {
        const screenWidth = window.innerWidth;
        
        if (screenWidth < 768) {
            // 手機橫向模式
            this.setupMobileLandscapeLayout();
        } else {
            // 平板/桌面橫向模式
            this.setupTabletLandscapeLayout();
        }
    }

    /**
     * 設定直向佈局
     */
    setupPortraitLayout() {
        const screenWidth = window.innerWidth;
        
        if (screenWidth < 768) {
            // 手機直向模式
            this.setupMobilePortraitLayout();
        } else {
            // 平板/桌面直向模式
            this.setupTabletPortraitLayout();
        }
    }

    /**
     * 設定手機橫向佈局
     */
    setupMobileLandscapeLayout() {
        // 調整預覽區域高度以適應橫向螢幕
        const previewArea = this.elements.previewArea;
        if (previewArea) {
            previewArea.style.minHeight = '200px';
            previewArea.style.maxHeight = `${window.innerHeight * 0.6}px`;
        }
        
        // 調整底部操作按鈕
        const mobileActions = document.getElementById('mobile-fixed-actions');
        if (mobileActions) {
            mobileActions.style.padding = '0.75rem 1rem';
        }
        
        console.log('手機橫向佈局已設定');
    }

    /**
     * 設定手機直向佈局
     */
    setupMobilePortraitLayout() {
        // 恢復預覽區域高度
        const previewArea = this.elements.previewArea;
        if (previewArea) {
            previewArea.style.minHeight = '250px';
            previewArea.style.maxHeight = `${window.innerHeight * 0.5}px`;
        }
        
        // 恢復底部操作按鈕
        const mobileActions = document.getElementById('mobile-fixed-actions');
        if (mobileActions) {
            mobileActions.style.padding = '1rem';
        }
        
        console.log('手機直向佈局已設定');
    }

    /**
     * 設定平板橫向佈局
     */
    setupTabletLandscapeLayout() {
        // 平板橫向時可以使用更寬的佈局
        const previewArea = this.elements.previewArea;
        if (previewArea) {
            previewArea.style.minHeight = '350px';
            previewArea.style.maxHeight = `${window.innerHeight * 0.7}px`;
        }
        
        console.log('平板橫向佈局已設定');
    }

    /**
     * 設定平板直向佈局
     */
    setupTabletPortraitLayout() {
        // 平板直向時使用較高的預覽區域
        const previewArea = this.elements.previewArea;
        if (previewArea) {
            previewArea.style.minHeight = '400px';
            previewArea.style.maxHeight = `${window.innerHeight * 0.6}px`;
        }
        
        console.log('平板直向佈局已設定');
    }

    /**
     * 為方向優化 Canvas
     */
    optimizeCanvasForOrientation(orientation) {
        if (!this.canvas || !this.imageData) return;
        
        // 根據方向調整 Canvas 的最大尺寸
        const containerPadding = 40;
        const containerWidth = this.elements.previewArea.clientWidth - containerPadding;
        const containerHeight = this.elements.previewArea.clientHeight - containerPadding;
        
        const img = this.imageData.image;
        const aspectRatio = img.naturalWidth / img.naturalHeight;
        
        let maxWidth, maxHeight;
        
        if (orientation === 'landscape') {
            // 橫向時優先考慮寬度
            maxWidth = Math.min(containerWidth, window.innerWidth * 0.6);
            maxHeight = Math.min(containerHeight, window.innerHeight * 0.5);
        } else {
            // 直向時優先考慮高度
            maxWidth = Math.min(containerWidth, window.innerWidth * 0.9);
            maxHeight = Math.min(containerHeight, window.innerHeight * 0.4);
        }
        
        let displayWidth, displayHeight;
        
        if (maxWidth / maxHeight > aspectRatio) {
            displayHeight = maxHeight;
            displayWidth = displayHeight * aspectRatio;
        } else {
            displayWidth = maxWidth;
            displayHeight = displayWidth / aspectRatio;
        }
        
        // 更新 Canvas 尺寸
        this.canvas.width = Math.round(displayWidth);
        this.canvas.height = Math.round(displayHeight);
        
        // 更新顯示資訊
        this.imageData.displayWidth = this.canvas.width;
        this.imageData.displayHeight = this.canvas.height;
        this.imageData.scaleFactor = this.canvas.width / img.naturalWidth;
        
        console.log(`Canvas 已為${orientation}方向優化:`, {
            尺寸: `${this.canvas.width}x${this.canvas.height}`,
            縮放比例: this.imageData.scaleFactor.toFixed(3)
        });
    }

    /**
     * 根據方向調整控制面板
     */
    adjustControlPanelForOrientation(orientation) {
        const controlPanel = this.elements.controlPanel;
        if (!controlPanel) return;
        
        if (orientation === 'landscape' && window.innerWidth < 768) {
            // 手機橫向時壓縮控制面板
            const cards = controlPanel.querySelectorAll('.card');
            cards.forEach(card => {
                card.style.marginBottom = '1rem';
                const cardBody = card.querySelector('.card-body');
                if (cardBody) {
                    cardBody.style.padding = '1rem';
                }
            });
        } else {
            // 其他情況恢復正常間距
            const cards = controlPanel.querySelectorAll('.card');
            cards.forEach(card => {
                card.style.marginBottom = '';
                const cardBody = card.querySelector('.card-body');
                if (cardBody) {
                    cardBody.style.padding = '';
                }
            });
        }
        
        console.log(`控制面板已為${orientation}方向調整`);
    }

    /**
     * 驗證方向變化後的功能完整性
     */
    validateFunctionalityAfterOrientationChange() {
        // 檢查關鍵功能是否正常
        const checks = [
            { name: '預覽區域', element: this.elements.previewArea },
            { name: '控制面板', element: this.elements.controlPanel },
            { name: 'Canvas', element: this.canvas }
        ];
        
        const failedChecks = checks.filter(check => !check.element || !check.element.offsetParent);
        
        if (failedChecks.length > 0) {
            console.warn('方向變化後部分功能可能受影響:', failedChecks.map(c => c.name));
            // 嘗試修復
            setTimeout(() => {
                this.updateResponsiveLayout();
            }, 500);
        } else {
            console.log('方向變化後所有功能正常');
        }
    }

    /**
     * 顯示方向變化提示
     */
    showOrientationChangeHint(orientation) {
        const orientationText = orientation === 'landscape' ? '橫向' : '直向';
        this.showToast(`螢幕已切換至${orientationText}模式`, 'info');
    }

    /**
     * 啟用手機版下載功能
     */
    enableMobileDownloadFeatures() {
        const mobileDownloadBtn = document.getElementById('mobile-download-btn');
        const mobilePngBtn = document.getElementById('mobile-download-png');
        const mobileJpgBtn = document.getElementById('mobile-download-jpg');
        
        if (mobileDownloadBtn) {
            mobileDownloadBtn.disabled = false;
        }
        
        if (mobilePngBtn) {
            mobilePngBtn.disabled = false;
        }
        
        if (mobileJpgBtn) {
            mobileJpgBtn.disabled = false;
        }
        
        console.log('手機版下載功能已啟用');
    }

    /**
     * 設定事件監聽器
     */
    setupEventListeners() {
        // DOM 元素引用
        this.elements = {
            fileInput: document.getElementById('file-input'),
            uploadSection: document.getElementById('upload-section'),
            controlPanel: document.getElementById('control-panel'),
            previewArea: document.getElementById('preview-area'),
            previewCanvas: document.getElementById('preview-canvas'),
            loadingSpinner: document.getElementById('loading-spinner'),
            
            // 控制項
            watermarkTypeRadios: document.querySelectorAll('input[name="watermark-type"]'),
            presetOptions: document.getElementById('preset-options'),
            customOptions: document.getElementById('custom-options'),
            presetSelect: document.getElementById('preset-select'),
            customText: document.getElementById('custom-text'),
            
            // 樣式控制
            opacityRange: document.getElementById('opacity-range'),
            opacityValue: document.getElementById('opacity-value'),
            fontsizeRange: document.getElementById('fontsize-range'),
            fontsizeValue: document.getElementById('fontsize-value'),
            
            // 位置控制
            positionRadios: document.querySelectorAll('input[name="position"]'),
            
            // 操作按鈕
            downloadBtn: document.getElementById('download-btn'),
            downloadOptionsBtn: document.getElementById('download-options-btn'),
            downloadOptionsMenu: document.getElementById('download-options-menu'),
            downloadStatus: document.getElementById('download-status'),
            downloadSuccess: document.getElementById('download-success'),
            downloadStatusText: document.getElementById('download-status-text'),
            downloadSuccessText: document.getElementById('download-success-text')
        };

        // 檔案上傳事件
        this.elements.fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        this.elements.uploadSection.addEventListener('click', () => this.elements.fileInput.click());
        
        // 拖放事件
        this.setupDragAndDrop();
        
        // 浮水印類型切換
        this.elements.watermarkTypeRadios.forEach(radio => {
            radio.addEventListener('change', (e) => this.handleWatermarkTypeChange(e));
        });
        
        // 預設類型選擇
        this.elements.presetSelect.addEventListener('change', (e) => this.handlePresetChange(e));
        
        // 自訂文字輸入
        this.elements.customText.addEventListener('input', (e) => this.handleCustomTextChange(e));
        
        // 樣式控制
        this.elements.opacityRange.addEventListener('input', (e) => this.handleOpacityChange(e));
        this.elements.fontsizeRange.addEventListener('input', (e) => this.handleFontsizeChange(e));
        
        // 位置控制
        this.elements.positionRadios.forEach(radio => {
            radio.addEventListener('change', (e) => this.handlePositionChange(e));
        });
        
        // 下載按鈕和選項
        this.elements.downloadBtn.addEventListener('click', () => this.downloadImage());
        this.setupDownloadOptions();
        
        console.log('事件監聽器設定完成');
    }  
  /**
     * 設定浮水印拖拽功能
     */
    setupWatermarkDrag() {
        if (!this.canvas) return;

        // 滑鼠事件
        this.canvas.addEventListener('mousedown', (e) => this.handleDragStart(e));
        this.canvas.addEventListener('mousemove', (e) => this.handleDragMove(e));
        this.canvas.addEventListener('mouseup', (e) => this.handleDragEnd(e));
        this.canvas.addEventListener('mouseleave', (e) => this.handleDragEnd(e));

        // 觸控事件
        this.canvas.addEventListener('touchstart', (e) => this.handleTouchStart(e), { passive: false });
        this.canvas.addEventListener('touchmove', (e) => this.handleTouchMove(e), { passive: false });
        this.canvas.addEventListener('touchend', (e) => this.handleTouchEnd(e));
        this.canvas.addEventListener('touchcancel', (e) => this.handleTouchEnd(e));

        console.log('浮水印拖拽功能已設定');
    }

    /**
     * 處理拖拽開始 (滑鼠)
     */
    handleDragStart(e) {
        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 檢查是否點擊在浮水印區域內
        if (this.isPointInWatermark(x, y)) {
            this.isDragging = true;
            this.dragStartX = x;
            this.dragStartY = y;
            this.dragOffsetX = x - this.watermarkConfig.x;
            this.dragOffsetY = y - this.watermarkConfig.y;
            
            // 顯示拖拽視覺回饋
            this.showDragVisualFeedback();
            
            console.log('開始拖拽浮水印:', { x, y });
        }
    }

    /**
     * 處理拖拽移動 (滑鼠)
     */
    handleDragMove(e) {
        if (!this.isDragging) {
            // 檢查是否懸停在浮水印上，更新游標
            const rect = this.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            
            if (this.isPointInWatermark(x, y)) {
                this.canvas.style.cursor = 'grab';
            } else {
                this.canvas.style.cursor = 'crosshair';
            }
            return;
        }

        e.preventDefault();
        
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        // 計算新位置並應用邊界限制
        const newX = x - this.dragOffsetX;
        const newY = y - this.dragOffsetY;
        
        const constrainedPosition = this.constrainWatermarkPosition(newX, newY);
        
        // 更新浮水印位置
        this.watermarkConfig.x = constrainedPosition.x;
        this.watermarkConfig.y = constrainedPosition.y;
        
        // 更新拖拽視覺回饋
        this.updateDragFeedback(constrainedPosition.x, constrainedPosition.y);
        
        // 更新預覽
        this.updatePreview();
    }

    /**
     * 處理拖拽結束 (滑鼠)
     */
    handleDragEnd(e) {
        if (this.isDragging) {
            this.isDragging = false;
            
            // 隱藏拖拽視覺回饋
            this.hideDragVisualFeedback();
            
            // 顯示拖拽完成回饋
            this.showDragCompleteFeedback();
            
            // 儲存使用者偏好
            this.saveUserPreferences();
            
            console.log('拖拽結束，浮水印位置:', { 
                x: this.watermarkConfig.x, 
                y: this.watermarkConfig.y 
            });
        }
    }

    /**
     * 處理觸控開始
     */
    handleTouchStart(e) {
        e.preventDefault();
        
        if (e.touches.length !== 1) return;
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // 檢查是否觸控在浮水印區域內
        if (this.isPointInWatermark(x, y)) {
            this.isDragging = true;
            this.dragStartX = x;
            this.dragStartY = y;
            this.dragOffsetX = x - this.watermarkConfig.x;
            this.dragOffsetY = y - this.watermarkConfig.y;
            
            // 顯示拖拽視覺回饋（觸控版本）
            this.showDragVisualFeedback();
            
            console.log('開始觸控拖拽浮水印:', { x, y });
        }
    }

    /**
     * 處理觸控移動
     */
    handleTouchMove(e) {
        if (!this.isDragging || e.touches.length !== 1) return;
        
        e.preventDefault();
        
        const touch = e.touches[0];
        const rect = this.canvas.getBoundingClientRect();
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        // 計算新位置並應用邊界限制
        const newX = x - this.dragOffsetX;
        const newY = y - this.dragOffsetY;
        
        const constrainedPosition = this.constrainWatermarkPosition(newX, newY);
        
        // 更新浮水印位置
        this.watermarkConfig.x = constrainedPosition.x;
        this.watermarkConfig.y = constrainedPosition.y;
        
        // 更新拖拽視覺回饋
        this.updateDragFeedback(constrainedPosition.x, constrainedPosition.y);
        
        // 更新預覽
        this.updatePreview();
    }

    /**
     * 處理觸控結束
     */
    handleTouchEnd(e) {
        if (this.isDragging) {
            this.isDragging = false;
            
            // 隱藏拖拽視覺回饋
            this.hideDragVisualFeedback();
            
            // 顯示拖拽完成回饋
            this.showDragCompleteFeedback();
            
            // 儲存使用者偏好
            this.saveUserPreferences();
            
            console.log('觸控拖拽結束，浮水印位置:', { 
                x: this.watermarkConfig.x, 
                y: this.watermarkConfig.y 
            });
        }
    }

    /**
     * 檢查點是否在浮水印區域內
     */
    isPointInWatermark(x, y) {
        if (!this.watermarkBounds || this.watermarkBounds.width === 0) {
            return false;
        }
        
        return x >= this.watermarkBounds.x && 
               x <= this.watermarkBounds.x + this.watermarkBounds.width &&
               y >= this.watermarkBounds.y && 
               y <= this.watermarkBounds.y + this.watermarkBounds.height;
    }

    /**
     * 約束浮水印位置在邊界內
     */
    constrainWatermarkPosition(x, y) {
        if (!this.canvas || !this.watermarkBounds) {
            return { x, y };
        }
        
        const canvasWidth = this.canvas.width;
        const canvasHeight = this.canvas.height;
        const watermarkWidth = this.watermarkBounds.width;
        const watermarkHeight = this.watermarkBounds.height;
        
        // 邊界限制
        const minX = 0;
        const maxX = canvasWidth - watermarkWidth;
        const minY = 0;
        const maxY = canvasHeight - watermarkHeight;
        
        const constrainedX = Math.max(minX, Math.min(maxX, x));
        const constrainedY = Math.max(minY, Math.min(maxY, y));
        
        return { x: constrainedX, y: constrainedY };
    }

    /**
     * 更新浮水印邊界資訊
     */
    updateWatermarkBounds(x, y, width, height) {
        this.watermarkBounds = { x, y, width, height };
    }   
 /**
     * 顯示拖拽視覺回饋
     */
    showDragVisualFeedback() {
        if (!this.canvas) return;

        // 添加拖拽樣式類
        this.canvas.classList.add('dragging');
        document.body.classList.add('dragging');
        
        // 更新游標樣式
        this.canvas.style.cursor = 'grabbing';
        
        // 添加拖拽提示
        this.showDragHint();
        
        console.log('拖拽視覺回饋已啟用');
    }

    /**
     * 隱藏拖拽視覺回饋
     */
    hideDragVisualFeedback() {
        if (!this.canvas) return;

        // 移除拖拽樣式類
        this.canvas.classList.remove('dragging');
        document.body.classList.remove('dragging');
        
        // 恢復游標樣式
        this.canvas.style.cursor = 'crosshair';
        
        // 隱藏拖拽提示
        this.hideDragHint();
        
        console.log('拖拽視覺回饋已停用');
    }

    /**
     * 顯示拖拽提示
     */
    showDragHint() {
        const previewArea = this.elements.previewArea;
        if (!previewArea) return;

        let dragHint = previewArea.querySelector('.drag-hint');
        if (!dragHint) {
            dragHint = document.createElement('div');
            dragHint.className = 'drag-hint position-absolute';
            dragHint.style.cssText = `
                top: 10px;
                left: 10px;
                background: rgba(13, 110, 253, 0.9);
                color: white;
                padding: 0.5rem 1rem;
                border-radius: 0.5rem;
                font-size: 0.875rem;
                font-weight: 500;
                z-index: 20;
                opacity: 0;
                transform: translateY(-10px);
                transition: all 0.3s ease;
                pointer-events: none;
                box-shadow: 0 0.25rem 0.5rem rgba(0, 0, 0, 0.2);
            `;
            dragHint.innerHTML = `
                <i class="bi bi-arrows-move me-2"></i>
                拖拽移動浮水印位置
            `;
            previewArea.appendChild(dragHint);
        }

        // 顯示提示動畫
        setTimeout(() => {
            dragHint.style.opacity = '1';
            dragHint.style.transform = 'translateY(0)';
        }, 100);
    }

    /**
     * 隱藏拖拽提示
     */
    hideDragHint() {
        const dragHint = this.elements.previewArea.querySelector('.drag-hint');
        if (dragHint) {
            dragHint.style.opacity = '0';
            dragHint.style.transform = 'translateY(-10px)';
            setTimeout(() => {
                if (dragHint.parentNode) {
                    dragHint.remove();
                }
            }, 300);
        }
    }

    /**
     * 更新拖拽過程中的視覺回饋
     */
    updateDragFeedback(x, y) {
        // 這裡可以添加更多的拖拽過程中的視覺回饋
        console.log('拖拽位置更新:', { x, y });
    }

    /**
     * 顯示拖拽完成回饋
     */
    showDragCompleteFeedback() {
        // 顯示成功提示
        this.showToast('浮水印位置已更新', 'success');
        
        // 添加完成動畫效果
        if (this.canvas) {
            this.canvas.style.transform = 'scale(1.02)';
            setTimeout(() => {
                this.canvas.style.transform = 'scale(1)';
            }, 200);
        }
        
        console.log('拖拽完成回饋已顯示');
    }

    /**
     * 顯示 Toast 訊息
     */
    showToast(message, type = 'info') {
        // 創建 toast 容器（如果不存在）
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'toast-container position-fixed top-0 end-0 p-3';
            toastContainer.style.zIndex = '9999';
            document.body.appendChild(toastContainer);
        }
        
        // 創建 toast 元素
        const toastId = 'toast-' + Date.now();
        const toast = document.createElement('div');
        toast.id = toastId;
        toast.className = `toast align-items-center text-white bg-${type} border-0`;
        toast.setAttribute('role', 'alert');
        toast.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">
                    <i class="bi bi-${type === 'success' ? 'check-circle' : type === 'warning' ? 'exclamation-triangle' : 'info-circle'} me-2"></i>
                    ${message}
                </div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
            </div>
        `;
        
        toastContainer.appendChild(toast);
        
        // 初始化並顯示 toast
        if (typeof bootstrap !== 'undefined') {
            const bsToast = new bootstrap.Toast(toast, {
                autohide: true,
                delay: 3000
            });
            bsToast.show();
            
            // 移除已隱藏的 toast
            toast.addEventListener('hidden.bs.toast', () => {
                toast.remove();
            });
        } else {
            // 如果沒有 Bootstrap，使用簡單的顯示/隱藏
            toast.style.display = 'block';
            setTimeout(() => {
                toast.remove();
            }, 3000);
        }
    }    
/**
     * 設定拖放功能
     */
    setupDragAndDrop() {
        const uploadCard = this.elements.uploadSection.querySelector('.card');
        
        // 防止預設拖放行為
        ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
            uploadCard.addEventListener(eventName, this.preventDefaults, false);
            document.body.addEventListener(eventName, this.preventDefaults, false);
        });
        
        // 拖放視覺效果
        ['dragenter', 'dragover'].forEach(eventName => {
            uploadCard.addEventListener(eventName, () => uploadCard.classList.add('drag-over'), false);
        });
        
        ['dragleave', 'drop'].forEach(eventName => {
            uploadCard.addEventListener(eventName, () => uploadCard.classList.remove('drag-over'), false);
        });
        
        // 處理檔案拖放
        uploadCard.addEventListener('drop', (e) => this.handleDrop(e), false);
        
        console.log('拖放功能設定完成');
    }

    /**
     * 防止預設事件行為
     */
    preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }

    /**
     * 處理檔案拖放
     */
    handleDrop(e) {
        const files = e.dataTransfer.files;
        if (files.length > 0) {
            this.processFile(files[0]);
        }
    }

    /**
     * 處理檔案選擇
     */
    handleFileSelect(e) {
        const file = e.target.files[0];
        if (file) {
            this.processFile(file);
        }
    }

    /**
     * 處理檔案處理
     */
    processFile(file) {
        // 檔案驗證
        if (!this.validateFile(file)) {
            return;
        }
        
        // 顯示載入狀態
        this.showLoading(true, '正在讀取檔案...');
        
        const reader = new FileReader();
        
        reader.onload = (e) => {
            this.showLoading(true, '正在載入圖片...');
            this.loadImage(e.target.result);
        };
        
        reader.onerror = (error) => {
            console.error('檔案讀取錯誤:', error);
            this.showError('檔案讀取失敗，請檢查檔案是否損壞');
            this.showLoading(false);
        };
        
        // 開始讀取檔案
        reader.readAsDataURL(file);
        
        console.log('開始處理檔案:', {
            名稱: file.name,
            大小: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
            類型: file.type
        });
    }

    /**
     * 驗證檔案
     */
    validateFile(file) {
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        const maxSize = 10 * 1024 * 1024; // 10MB
        
        if (!validTypes.includes(file.type)) {
            this.showError('請選擇有效的圖片檔案 (JPG, PNG, GIF)');
            return false;
        }
        
        if (file.size > maxSize) {
            this.showError('檔案大小不能超過 10MB');
            return false;
        }
        
        return true;
    }

    /**
     * 載入圖片
     */
    loadImage(src) {
        const img = new Image();
        
        img.onload = () => {
            try {
                // 儲存原始圖片資料
                this.imageData = {
                    image: img,
                    originalWidth: img.naturalWidth,
                    originalHeight: img.naturalHeight,
                    aspectRatio: img.naturalWidth / img.naturalHeight
                };
                
                // 設定 Canvas 並計算顯示尺寸
                this.setupCanvas(img);
                
                // 顯示控制面板和預覽
                this.showControlPanel();
                this.updatePreview();
                
                console.log('圖片載入完成:', {
                    原始尺寸: `${this.imageData.originalWidth}x${this.imageData.originalHeight}`,
                    顯示尺寸: `${this.canvas.width}x${this.canvas.height}`,
                    長寬比: this.imageData.aspectRatio.toFixed(2)
                });
            } catch (error) {
                console.error('圖片處理失敗:', error);
                this.showError('圖片處理失敗，請重試');
            } finally {
                this.showLoading(false);
            }
        };
        
        img.onerror = (error) => {
            console.error('圖片載入錯誤:', error);
            this.showError('圖片載入失敗，請檢查檔案格式或重試');
            this.showLoading(false);
        };
        
        img.src = src;
    }

    /**
     * 設定 Canvas
     */
    setupCanvas(img) {
        // 取得 Canvas 元素和上下文
        this.canvas = this.elements.previewCanvas;
        this.context = this.canvas.getContext('2d');
        
        // 檢查 Canvas 支援
        if (!this.context) {
            throw new Error('瀏覽器不支援 Canvas，請使用現代瀏覽器');
        }
        
        // 計算響應式顯示尺寸
        const containerPadding = 40;
        const containerWidth = this.elements.previewArea.clientWidth - containerPadding;
        
        // 根據螢幕尺寸調整最大高度
        const screenWidth = window.innerWidth;
        let maxHeight;
        if (screenWidth < 768) {
            maxHeight = Math.min(300, window.innerHeight * 0.4);
        } else if (screenWidth < 992) {
            maxHeight = Math.min(450, window.innerHeight * 0.5);
        } else {
            maxHeight = Math.min(600, window.innerHeight * 0.6);
        }
        
        const originalWidth = img.naturalWidth;
        const originalHeight = img.naturalHeight;
        const aspectRatio = originalWidth / originalHeight;
        
        let displayWidth, displayHeight;
        
        // 根據容器大小和圖片長寬比計算最適顯示尺寸
        if (containerWidth / maxHeight > aspectRatio) {
            displayHeight = Math.min(maxHeight, originalHeight);
            displayWidth = displayHeight * aspectRatio;
        } else {
            displayWidth = Math.min(containerWidth, originalWidth);
            displayHeight = displayWidth / aspectRatio;
        }
        
        // 設定 Canvas 尺寸
        this.canvas.width = Math.round(displayWidth);
        this.canvas.height = Math.round(displayHeight);
        
        // 設定 CSS 樣式確保響應式顯示
        this.canvas.style.maxWidth = '100%';
        this.canvas.style.height = 'auto';
        this.canvas.style.display = 'block';
        this.canvas.style.margin = '0 auto';
        
        // 儲存顯示尺寸資訊
        this.imageData.displayWidth = this.canvas.width;
        this.imageData.displayHeight = this.canvas.height;
        this.imageData.scaleFactor = this.canvas.width / originalWidth;
        
        // 設定 Canvas 渲染品質
        this.context.imageSmoothingEnabled = true;
        this.context.imageSmoothingQuality = 'high';
        
        console.log('Canvas 設定完成:', {
            原始尺寸: `${originalWidth}x${originalHeight}`,
            顯示尺寸: `${this.canvas.width}x${this.canvas.height}`,
            縮放比例: this.imageData.scaleFactor.toFixed(3)
        });
    }

    /**
     * 顯示控制面板
     */
    showControlPanel() {
        this.elements.controlPanel.classList.remove('d-none');
        this.elements.controlPanel.classList.add('fade-in');
        
        // 隱藏預覽區域的提示文字，顯示 canvas
        this.elements.previewArea.querySelector('.text-center').classList.add('d-none');
        this.elements.previewCanvas.classList.remove('d-none');
        
        // 設定浮水印拖拽功能
        this.setupWatermarkDrag();
        
        console.log('控制面板已顯示');
    }    
/**
     * 更新預覽
     */
    updatePreview() {
        if (!this.imageData || !this.canvas || !this.imageData.image) {
            console.warn('預覽更新條件不滿足，跳過更新');
            return;
        }
        
        // 防抖動處理 - 避免過度渲染
        this.debouncePreviewUpdate();
    }

    /**
     * 防抖動預覽更新處理
     * 在短時間內多次調用時，只執行最後一次更新
     */
    debouncePreviewUpdate() {
        // 清除之前的更新計時器
        if (this.previewUpdateTimeout) {
            clearTimeout(this.previewUpdateTimeout);
        }
        
        // 根據操作類型設定不同的延遲時間
        const delay = this.isDragging ? 16 : 150; // 拖拽時使用更短延遲以保持流暢性
        
        this.previewUpdateTimeout = setTimeout(() => {
            this.performPreviewUpdate();
        }, delay);
        
        console.log(`預覽更新已排程，延遲: ${delay}ms`);
    }

    /**
     * 執行預覽更新
     */
    performPreviewUpdate() {
        if (!this.validatePreviewConditions()) {
            return;
        }
        
        const startTime = performance.now();
        
        try {
            // 使用高效的 Canvas 重繪策略
            this.efficientCanvasRedraw();
            
            // 啟用下載功能
            this.enableDownloadFeatures();
            
            // 記錄效能指標
            const endTime = performance.now();
            const renderTime = endTime - startTime;
            
            if (renderTime > 50) {
                console.warn(`預覽渲染時間較長: ${renderTime.toFixed(2)}ms`);
            } else {
                console.log(`預覽更新完成，耗時: ${renderTime.toFixed(2)}ms`);
            }
            
        } catch (error) {
            console.error('預覽更新失敗:', error);
            this.showError('預覽更新失敗，請重試');
        }
    }

    /**
     * 驗證預覽更新條件
     */
    validatePreviewConditions() {
        if (!this.imageData || !this.canvas || !this.imageData.image) {
            console.warn('預覽更新條件不滿足');
            return false;
        }
        
        if (!this.context) {
            console.error('Canvas 上下文不可用');
            return false;
        }
        
        return true;
    }

    /**
     * 高效的 Canvas 重繪實作
     * 優化渲染效能，減少不必要的重繪操作
     */
    efficientCanvasRedraw() {
        const ctx = this.context;
        
        // 儲存當前 Canvas 狀態
        ctx.save();
        
        try {
            // 使用高效能的清除方法
            this.clearCanvasEfficiently();
            
            // 優化的圖片繪製
            this.drawImageOptimized();
            
            // 優化的浮水印繪製
            this.drawWatermarkOptimized();
            
        } finally {
            // 恢復 Canvas 狀態
            ctx.restore();
        }
    }

    /**
     * 高效能的 Canvas 清除方法
     */
    clearCanvasEfficiently() {
        const ctx = this.context;
        
        // 使用 clearRect 而非 fillRect 以獲得更好的效能
        ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 重置合成操作以確保正確的渲染
        ctx.globalCompositeOperation = 'source-over';
    }

    /**
     * 優化的圖片繪製方法
     */
    drawImageOptimized() {
        const ctx = this.context;
        const img = this.imageData.image;
        
        // 設定圖片渲染品質
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        // 繪製原始圖片到 Canvas
        ctx.drawImage(
            img,
            0, 0, this.imageData.originalWidth, this.imageData.originalHeight,
            0, 0, this.canvas.width, this.canvas.height
        );
    }

    /**
     * 優化的浮水印繪製方法
     */
    drawWatermarkOptimized() {
        const text = this.watermarkConfig.text?.trim();
        
        // 如果沒有文字，不繪製浮水印
        if (!text) {
            console.log('浮水印文字為空，跳過繪製');
            this.updateWatermarkBounds(0, 0, 0, 0);
            return;
        }
        
        const ctx = this.context;
        
        try {
            // 儲存 Canvas 狀態
            ctx.save();
            
            // 批量設定所有樣式屬性以減少狀態變更
            this.applyWatermarkStyles(ctx);
            
            // 計算文字尺寸和位置
            const textMetrics = this.calculateTextMetrics(ctx, text);
            const position = this.calculateOptimalPosition(textMetrics);
            
            // 檢查位置有效性
            if (this.isPositionValid(position)) {
                // 繪製浮水印文字
                this.renderWatermarkText(ctx, text, position);
                
                // 更新浮水印邊界資訊
                this.updateWatermarkBounds(
                    position.x - textMetrics.width / 2,
                    position.y - textMetrics.height / 2,
                    textMetrics.width,
                    textMetrics.height
                );
                
                console.log('浮水印已優化繪製:', {
                    文字: text,
                    位置: position,
                    尺寸: textMetrics
                });
            } else {
                console.warn('浮水印位置無效，跳過繪製:', position);
                this.updateWatermarkBounds(0, 0, 0, 0);
            }
            
        } catch (error) {
            console.error('浮水印繪製失敗:', error);
            this.updateWatermarkBounds(0, 0, 0, 0);
        } finally {
            // 恢復 Canvas 狀態
            ctx.restore();
        }
    }

    /**
     * 批量應用浮水印樣式
     */
    applyWatermarkStyles(ctx) {
        const fontFamily = 'Arial, "Microsoft JhengHei", "PingFang TC", "Helvetica Neue", sans-serif';
        
        // 批量設定所有樣式屬性
        ctx.font = `${this.watermarkConfig.fontSize}px ${fontFamily}`;
        ctx.fillStyle = this.watermarkConfig.color;
        ctx.globalAlpha = this.watermarkConfig.opacity;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        // 設定陰影效果
        ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
        ctx.shadowBlur = 2;
        ctx.shadowOffsetX = 1;
        ctx.shadowOffsetY = 1;
    }

    /**
     * 計算文字尺寸資訊
     */
    calculateTextMetrics(ctx, text) {
        const textMetrics = ctx.measureText(text);
        return {
            width: textMetrics.width,
            height: this.watermarkConfig.fontSize,
            actualBoundingBoxAscent: textMetrics.actualBoundingBoxAscent || this.watermarkConfig.fontSize * 0.8,
            actualBoundingBoxDescent: textMetrics.actualBoundingBoxDescent || this.watermarkConfig.fontSize * 0.2
        };
    }

    /**
     * 計算最佳浮水印位置
     */
    calculateOptimalPosition(textMetrics) {
        // 如果有自訂拖拽位置，優先使用
        if (this.watermarkConfig.x !== undefined && this.watermarkConfig.y !== undefined && 
            (this.watermarkConfig.x !== 0 || this.watermarkConfig.y !== 0)) {
            return { 
                x: this.watermarkConfig.x + textMetrics.width / 2, 
                y: this.watermarkConfig.y + textMetrics.height / 2 
            };
        }
        
        // 使用預設位置計算
        const position = this.calculateWatermarkPositionOptimized(textMetrics);
        
        // 更新配置中的位置（用於拖拽）
        this.watermarkConfig.x = position.x - textMetrics.width / 2;
        this.watermarkConfig.y = position.y - textMetrics.height / 2;
        
        return position;
    }

    /**
     * 渲染浮水印文字
     */
    renderWatermarkText(ctx, text, position) {
        // 使用 fillText 繪製文字
        ctx.fillText(text, position.x, position.y);
    }

    /**
     * 優化的浮水印位置計算
     */
    calculateWatermarkPositionOptimized(textMetrics) {
        const textWidth = textMetrics.width;
        const textHeight = textMetrics.height;
        const padding = 20;
        let x, y;
        
        switch (this.watermarkConfig.position) {
            case 'top-left':
                x = padding + textWidth / 2;
                y = padding + textHeight / 2;
                break;
            case 'top-center':
                x = this.canvas.width / 2;
                y = padding + textHeight / 2;
                break;
            case 'top-right':
                x = this.canvas.width - padding - textWidth / 2;
                y = padding + textHeight / 2;
                break;
            case 'center-left':
                x = padding + textWidth / 2;
                y = this.canvas.height / 2;
                break;
            case 'center':
                x = this.canvas.width / 2;
                y = this.canvas.height / 2;
                break;
            case 'center-right':
                x = this.canvas.width - padding - textWidth / 2;
                y = this.canvas.height / 2;
                break;
            case 'bottom-left':
                x = padding + textWidth / 2;
                y = this.canvas.height - padding - textHeight / 2;
                break;
            case 'bottom-center':
                x = this.canvas.width / 2;
                y = this.canvas.height - padding - textHeight / 2;
                break;
            case 'bottom-right':
            default:
                x = this.canvas.width - padding - textWidth / 2;
                y = this.canvas.height - padding - textHeight / 2;
                break;
        }
        
        return { x, y };
    }

    /**
     * 繪製浮水印
     */
    drawWatermark() {
        const text = this.watermarkConfig.text?.trim();
        
        // 如果沒有文字，不繪製浮水印
        if (!text) {
            console.log('浮水印文字為空，跳過繪製');
            this.updateWatermarkBounds(0, 0, 0, 0);
            return;
        }
        
        const ctx = this.context;
        
        try {
            // 儲存 Canvas 狀態
            ctx.save();
            
            // 設定字體樣式
            const fontFamily = 'Arial, "Microsoft JhengHei", "PingFang TC", "Helvetica Neue", sans-serif';
            ctx.font = `${this.watermarkConfig.fontSize}px ${fontFamily}`;
            ctx.fillStyle = this.watermarkConfig.color;
            ctx.globalAlpha = this.watermarkConfig.opacity;
            ctx.textAlign = 'center';
            ctx.textBaseline = 'middle';
            
            // 計算文字尺寸
            const textMetrics = ctx.measureText(text);
            const textWidth = textMetrics.width;
            const textHeight = this.watermarkConfig.fontSize;
            
            // 計算位置
            let position;
            if (this.watermarkConfig.x !== undefined && this.watermarkConfig.y !== undefined && 
                (this.watermarkConfig.x !== 0 || this.watermarkConfig.y !== 0)) {
                // 使用拖拽設定的自訂位置
                position = { 
                    x: this.watermarkConfig.x + textWidth / 2, 
                    y: this.watermarkConfig.y + textHeight / 2 
                };
            } else {
                // 使用預設位置計算
                position = this.calculateWatermarkPosition(text);
                // 更新配置中的位置（用於拖拽）
                this.watermarkConfig.x = position.x - textWidth / 2;
                this.watermarkConfig.y = position.y - textHeight / 2;
            }
            
            // 檢查位置是否在 Canvas 範圍內
            if (this.isPositionValid(position)) {
                // 添加文字陰影效果
                ctx.shadowColor = 'rgba(0, 0, 0, 0.3)';
                ctx.shadowBlur = 2;
                ctx.shadowOffsetX = 1;
                ctx.shadowOffsetY = 1;
                
                // 繪製文字
                ctx.fillText(text, position.x, position.y);
                
                // 更新浮水印邊界資訊（用於拖拽檢測）
                const boundingX = position.x - textWidth / 2;
                const boundingY = position.y - textHeight / 2;
                this.updateWatermarkBounds(boundingX, boundingY, textWidth, textHeight);
                
                console.log('浮水印已繪製:', {
                    文字: text,
                    位置: position,
                    邊界: this.watermarkBounds
                });
            } else {
                console.warn('浮水印位置超出 Canvas 範圍:', position);
                this.updateWatermarkBounds(0, 0, 0, 0);
            }
            
        } catch (error) {
            console.error('浮水印繪製失敗:', error);
            this.updateWatermarkBounds(0, 0, 0, 0);
        } finally {
            // 恢復 Canvas 狀態
            ctx.restore();
        }
    }

    /**
     * 檢查位置是否有效
     */
    isPositionValid(position) {
        return position.x >= 0 && 
               position.x <= this.canvas.width && 
               position.y >= 0 && 
               position.y <= this.canvas.height;
    }

    /**
     * 計算浮水印位置
     */
    calculateWatermarkPosition(text) {
        const ctx = this.context;
        const textMetrics = ctx.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = this.watermarkConfig.fontSize;
        
        const padding = 20;
        let x, y;
        
        switch (this.watermarkConfig.position) {
            case 'top-left':
                x = padding + textWidth / 2;
                y = padding + textHeight / 2;
                break;
            case 'top-center':
                x = this.canvas.width / 2;
                y = padding + textHeight / 2;
                break;
            case 'top-right':
                x = this.canvas.width - padding - textWidth / 2;
                y = padding + textHeight / 2;
                break;
            case 'center-left':
                x = padding + textWidth / 2;
                y = this.canvas.height / 2;
                break;
            case 'center':
                x = this.canvas.width / 2;
                y = this.canvas.height / 2;
                break;
            case 'center-right':
                x = this.canvas.width - padding - textWidth / 2;
                y = this.canvas.height / 2;
                break;
            case 'bottom-left':
                x = padding + textWidth / 2;
                y = this.canvas.height - padding - textHeight / 2;
                break;
            case 'bottom-center':
                x = this.canvas.width / 2;
                y = this.canvas.height - padding - textHeight / 2;
                break;
            case 'bottom-right':
            default:
                x = this.canvas.width - padding - textWidth / 2;
                y = this.canvas.height - padding - textHeight / 2;
                break;
        }
        
        return { x, y };
    }    /**

     * 處理浮水印類型變更
     */
    handleWatermarkTypeChange(e) {
        const type = e.target.value;
        this.watermarkConfig.type = type;
        
        if (type === 'preset') {
            this.elements.presetOptions.classList.remove('d-none');
            this.elements.customOptions.classList.add('d-none');
            this.applyPresetWatermark(this.elements.presetSelect.value);
        } else {
            this.elements.presetOptions.classList.add('d-none');
            this.elements.customOptions.classList.remove('d-none');
            this.watermarkConfig.text = this.elements.customText.value;
        }
        
        this.updatePreview();
        this.saveUserPreferences();
        console.log('浮水印類型已變更:', type);
    }

    /**
     * 處理預設類型變更
     */
    handlePresetChange(e) {
        const presetType = e.target.value;
        this.watermarkConfig.presetType = presetType;
        this.applyPresetWatermark(presetType);
        this.updatePreview();
        this.saveUserPreferences();
        console.log('預設類型已變更:', presetType);
    }

    /**
     * 應用預設浮水印設定
     */
    applyPresetWatermark(presetType) {
        const preset = PRESET_WATERMARKS[presetType];
        if (!preset) {
            console.warn('未找到預設浮水印類型:', presetType);
            return;
        }

        this.watermarkConfig.text = preset.text;
        this.watermarkConfig.fontSize = preset.fontSize;
        this.watermarkConfig.color = preset.color;
        this.watermarkConfig.opacity = preset.opacity;
        this.watermarkConfig.position = preset.position;

        // 更新 UI 控制項
        this.elements.opacityRange.value = preset.opacity * 100;
        this.elements.opacityValue.textContent = Math.round(preset.opacity * 100) + '%';
        this.elements.fontsizeRange.value = preset.fontSize;
        this.elements.fontsizeValue.textContent = preset.fontSize + 'px';

        // 更新位置選擇
        const positionRadio = document.querySelector(`input[name="position"][value="${preset.position}"]`);
        if (positionRadio) {
            this.elements.positionRadios.forEach(radio => radio.checked = false);
            positionRadio.checked = true;
        }

        console.log('已應用預設浮水印:', presetType, preset);
    }

    /**
     * 處理自訂文字變更
     */
    handleCustomTextChange(e) {
        this.watermarkConfig.text = e.target.value;
        this.updatePreview();
        this.saveUserPreferences();
        console.log('自訂文字已變更:', e.target.value);
    }

    /**
     * 處理透明度變更
     */
    handleOpacityChange(e) {
        const opacity = parseInt(e.target.value) / 100;
        this.watermarkConfig.opacity = opacity;
        this.elements.opacityValue.textContent = e.target.value + '%';
        this.updatePreview();
        this.saveUserPreferences();
        console.log('透明度已變更:', opacity);
    }

    /**
     * 處理字體大小變更
     */
    handleFontsizeChange(e) {
        this.watermarkConfig.fontSize = parseInt(e.target.value);
        this.elements.fontsizeValue.textContent = e.target.value + 'px';
        this.updatePreview();
        this.saveUserPreferences();
        console.log('字體大小已變更:', e.target.value);
    }

    /**
     * 處理位置變更
     */
    handlePositionChange(e) {
        this.watermarkConfig.position = e.target.value;
        // 重置自訂位置
        this.watermarkConfig.x = 0;
        this.watermarkConfig.y = 0;
        this.updatePreview();
        this.saveUserPreferences();
        console.log('位置已變更:', e.target.value);
    }

    /**
     * 下載圖片
     */
    downloadImage() {
        if (!this.validateDownloadConditions()) {
            return;
        }
        
        // 顯示下載狀態
        this.showDownloadProgress(true);
        
        try {
            // 生成高品質圖片
            const imageData = this.generateHighQualityImage();
            
            // 生成檔名
            const filename = this.generateDownloadFilename();
            
            // 執行下載
            this.performDownload(imageData, filename);
            
            // 顯示成功回饋
            this.showDownloadSuccess();
            
        } catch (error) {
            console.error('下載失敗:', error);
            this.showDownloadError(error);
        } finally {
            this.showDownloadProgress(false);
        }
    }

    /**
     * 驗證下載條件
     */
    validateDownloadConditions() {
        if (!this.canvas) {
            this.showError('沒有可下載的圖片');
            return false;
        }
        
        if (!this.imageData || !this.imageData.image) {
            this.showError('圖片資料不完整，請重新上傳圖片');
            return false;
        }
        
        return true;
    }

    /**
     * 生成高品質圖片
     */
    generateHighQualityImage() {
        // 創建高解析度 Canvas 用於匯出
        const exportCanvas = document.createElement('canvas');
        const exportContext = exportCanvas.getContext('2d');
        
        // 使用原始圖片尺寸以保持最佳品質
        exportCanvas.width = this.imageData.originalWidth;
        exportCanvas.height = this.imageData.originalHeight;
        
        // 設定高品質渲染
        exportContext.imageSmoothingEnabled = true;
        exportContext.imageSmoothingQuality = 'high';
        
        // 繪製原始圖片
        exportContext.drawImage(
            this.imageData.image,
            0, 0,
            this.imageData.originalWidth,
            this.imageData.originalHeight
        );
        
        // 繪製浮水印（按原始尺寸比例調整）
        this.drawWatermarkForExport(exportContext, exportCanvas);
        
        // 根據原始格式決定匯出格式和品質
        const originalFormat = this.detectOriginalImageFormat();
        const exportFormat = this.getOptimalExportFormat(originalFormat);
        const quality = this.getExportQuality(exportFormat);
        
        console.log('高品質圖片生成完成:', {
            尺寸: `${exportCanvas.width}x${exportCanvas.height}`,
            格式: exportFormat,
            品質: quality
        });
        
        return {
            dataUrl: exportCanvas.toDataURL(exportFormat, quality),
            format: exportFormat,
            width: exportCanvas.width,
            height: exportCanvas.height
        };
    }

    /**
     * 為匯出繪製浮水印
     */
    drawWatermarkForExport(context, canvas) {
        const text = this.watermarkConfig.text?.trim();
        if (!text) return;
        
        // 儲存上下文狀態
        context.save();
        
        try {
            // 計算原始尺寸的縮放比例
            const scaleFactor = canvas.width / this.canvas.width;
            
            // 調整字體大小以適應原始尺寸
            const exportFontSize = Math.round(this.watermarkConfig.fontSize * scaleFactor);
            const fontFamily = 'Arial, "Microsoft JhengHei", "PingFang TC", "Helvetica Neue", sans-serif';
            
            // 設定浮水印樣式
            context.font = `${exportFontSize}px ${fontFamily}`;
            context.fillStyle = this.watermarkConfig.color;
            context.globalAlpha = this.watermarkConfig.opacity;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            
            // 設定陰影效果
            context.shadowColor = 'rgba(0, 0, 0, 0.3)';
            context.shadowBlur = Math.round(2 * scaleFactor);
            context.shadowOffsetX = Math.round(1 * scaleFactor);
            context.shadowOffsetY = Math.round(1 * scaleFactor);
            
            // 計算浮水印位置（按原始尺寸調整）
            const position = this.calculateExportWatermarkPosition(context, text, canvas, scaleFactor);
            
            // 繪製浮水印文字
            context.fillText(text, position.x, position.y);
            
            console.log('匯出浮水印已繪製:', {
                文字: text,
                位置: position,
                字體大小: exportFontSize,
                縮放比例: scaleFactor.toFixed(3)
            });
            
        } finally {
            context.restore();
        }
    }

    /**
     * 計算匯出用浮水印位置
     */
    calculateExportWatermarkPosition(context, text, canvas, scaleFactor) {
        const textMetrics = context.measureText(text);
        const textWidth = textMetrics.width;
        const textHeight = this.watermarkConfig.fontSize * scaleFactor;
        
        // 邊距（按比例調整）
        const margin = Math.round(20 * scaleFactor);
        
        let x, y;
        
        // 如果有自訂位置（拖拽設定），使用自訂位置
        if (this.watermarkConfig.x !== 0 || this.watermarkConfig.y !== 0) {
            x = Math.round(this.watermarkConfig.x * scaleFactor);
            y = Math.round(this.watermarkConfig.y * scaleFactor);
        } else {
            // 使用預設位置
            switch (this.watermarkConfig.position) {
                case 'top-left':
                    x = margin + textWidth / 2;
                    y = margin + textHeight / 2;
                    break;
                case 'top-center':
                    x = canvas.width / 2;
                    y = margin + textHeight / 2;
                    break;
                case 'top-right':
                    x = canvas.width - margin - textWidth / 2;
                    y = margin + textHeight / 2;
                    break;
                case 'center-left':
                    x = margin + textWidth / 2;
                    y = canvas.height / 2;
                    break;
                case 'center':
                    x = canvas.width / 2;
                    y = canvas.height / 2;
                    break;
                case 'center-right':
                    x = canvas.width - margin - textWidth / 2;
                    y = canvas.height / 2;
                    break;
                case 'bottom-left':
                    x = margin + textWidth / 2;
                    y = canvas.height - margin - textHeight / 2;
                    break;
                case 'bottom-center':
                    x = canvas.width / 2;
                    y = canvas.height - margin - textHeight / 2;
                    break;
                case 'bottom-right':
                default:
                    x = canvas.width - margin - textWidth / 2;
                    y = canvas.height - margin - textHeight / 2;
                    break;
            }
        }
        
        // 確保位置在畫布範圍內
        x = Math.max(textWidth / 2, Math.min(canvas.width - textWidth / 2, x));
        y = Math.max(textHeight / 2, Math.min(canvas.height - textHeight / 2, y));
        
        return { x, y };
    }

    /**
     * 偵測原始圖片格式
     */
    detectOriginalImageFormat() {
        if (!this.imageData || !this.imageData.image || !this.imageData.image.src) {
            return 'image/png';
        }
        
        const src = this.imageData.image.src;
        
        if (src.includes('data:image/jpeg') || src.includes('data:image/jpg')) {
            return 'image/jpeg';
        } else if (src.includes('data:image/png')) {
            return 'image/png';
        } else if (src.includes('data:image/gif')) {
            return 'image/png'; // GIF 轉為 PNG 以保持品質
        } else if (src.includes('data:image/webp')) {
            return 'image/png'; // WebP 轉為 PNG 以確保相容性
        }
        
        return 'image/png'; // 預設格式
    }

    /**
     * 取得最佳匯出格式
     */
    getOptimalExportFormat(originalFormat) {
        // 如果原始格式是 JPEG 且沒有透明度需求，保持 JPEG
        if (originalFormat === 'image/jpeg' && this.watermarkConfig.opacity >= 0.9) {
            return 'image/jpeg';
        }
        
        // 其他情況使用 PNG 以保持最佳品質
        return 'image/png';
    }

    /**
     * 取得匯出品質設定
     */
    getExportQuality(format) {
        if (format === 'image/jpeg') {
            return 0.95; // JPEG 高品質
        }
        return 1.0; // PNG 無損品質
    }

    /**
     * 生成下載檔名
     */
    generateDownloadFilename() {
        const now = new Date();
        const timestamp = now.toISOString().slice(0, 19).replace(/[:-]/g, '').replace('T', '_');
        
        // 根據浮水印類型生成描述性檔名
        let prefix = 'watermarked';
        
        if (this.watermarkConfig.type === 'preset') {
            const presetNames = {
                'taiwan-id': 'id_verified',
                'document-copy': 'doc_copy',
                'sample': 'sample'
            };
            prefix = presetNames[this.watermarkConfig.presetType] || 'watermarked';
        } else if (this.watermarkConfig.type === 'custom' && this.watermarkConfig.text) {
            // 清理自訂文字作為檔名的一部分
            const cleanText = this.watermarkConfig.text
                .replace(/[^\w\u4e00-\u9fff]/g, '_')
                .substring(0, 20);
            prefix = `custom_${cleanText}`;
        }
        
        const extension = this.detectOriginalImageFormat() === 'image/jpeg' ? 'jpg' : 'png';
        
        return `${prefix}_${timestamp}.${extension}`;
    }

    /**
     * 執行下載操作
     */
    performDownload(imageData, filename) {
        // 嘗試使用現代下載 API
        if (this.canUseModernDownload()) {
            this.downloadWithModernAPI(imageData, filename);
        } else {
            // 降級到傳統下載方法
            this.downloadWithLegacyMethod(imageData, filename);
        }
        
        console.log('下載操作完成:', {
            檔名: filename,
            尺寸: `${imageData.width}x${imageData.height}`,
            格式: imageData.format
        });
    }

    /**
     * 檢查是否可使用現代下載 API
     */
    canUseModernDownload() {
        return typeof window.showSaveFilePicker === 'function' && 
               window.isSecureContext;
    }

    /**
     * 使用現代 API 下載
     */
    async downloadWithModernAPI(imageData, filename) {
        try {
            // 將 data URL 轉換為 Blob
            const response = await fetch(imageData.dataUrl);
            const blob = await response.blob();
            
            // 使用 File System Access API
            const fileHandle = await window.showSaveFilePicker({
                suggestedName: filename,
                types: [{
                    description: '圖片檔案',
                    accept: {
                        'image/png': ['.png'],
                        'image/jpeg': ['.jpg', '.jpeg']
                    }
                }]
            });
            
            const writable = await fileHandle.createWritable();
            await writable.write(blob);
            await writable.close();
            
            console.log('使用現代 API 下載完成');
        } catch (error) {
            if (error.name !== 'AbortError') {
                console.warn('現代 API 下載失敗，降級到傳統方法:', error);
                this.downloadWithLegacyMethod(imageData, filename);
            }
        }
    }

    /**
     * 使用傳統方法下載
     */
    downloadWithLegacyMethod(imageData, filename) {
        const link = document.createElement('a');
        link.download = filename;
        link.href = imageData.dataUrl;
        link.style.display = 'none';
        
        // 添加到 DOM，觸發下載，然後移除
        document.body.appendChild(link);
        link.click();
        
        // 延遲移除以確保下載開始
        setTimeout(() => {
            if (link.parentNode) {
                document.body.removeChild(link);
            }
        }, 100);
        
        console.log('使用傳統方法下載完成');
    }

    /**
     * 顯示下載進度狀態
     */
    showDownloadProgress(show, message = '正在生成高品質圖片...') {
        // 使用增強版本的進度顯示
        this.showEnhancedDownloadProgress(show, message);
        
        // 同時顯示全域載入提示
        if (show) {
            this.showLoading(true, message);
        } else {
            this.showLoading(false);
        }
    }

    /**
     * 顯示下載成功回饋
     */
    showDownloadSuccess(message = '圖片下載成功！') {
        // 使用增強版本的成功回饋
        this.showEnhancedDownloadSuccess(message);
    }

    /**
     * 顯示下載錯誤回饋
     */
    showDownloadError(error) {
        let errorMessage = '下載失敗，請重試';
        
        // 根據錯誤類型提供具體訊息
        if (error.name === 'SecurityError') {
            errorMessage = '安全限制導致下載失敗，請檢查瀏覽器設定';
        } else if (error.name === 'QuotaExceededError') {
            errorMessage = '儲存空間不足，請清理磁碟空間後重試';
        } else if (error.message && error.message.includes('canvas')) {
            errorMessage = '圖片處理失敗，請重新上傳圖片';
        }
        
        // 顯示錯誤訊息
        this.showError(errorMessage);
        
        // 按鈕錯誤動畫
        const downloadBtn = this.elements.downloadBtn;
        downloadBtn.classList.add('btn-error-flash');
        
        setTimeout(() => {
            downloadBtn.classList.remove('btn-error-flash');
        }, 1000);
        
        console.error('下載錯誤回饋已顯示:', error);
    }

    /**
     * 設定下載選項功能
     */
    setupDownloadOptions() {
        // PNG 下載選項
        document.getElementById('download-png').addEventListener('click', (e) => {
            e.preventDefault();
            this.downloadImageWithFormat('png');
        });
        
        // JPG 下載選項
        document.getElementById('download-jpg').addEventListener('click', (e) => {
            e.preventDefault();
            this.downloadImageWithFormat('jpg');
        });
        
        // 原始尺寸下載
        document.getElementById('download-original-size').addEventListener('click', (e) => {
            e.preventDefault();
            this.downloadImageWithSize('original');
        });
        
        // 預覽尺寸下載
        document.getElementById('download-preview-size').addEventListener('click', (e) => {
            e.preventDefault();
            this.downloadImageWithSize('preview');
        });
        
        console.log('下載選項功能已設定');
    }

    /**
     * 以指定格式下載圖片
     */
    downloadImageWithFormat(format) {
        if (!this.validateDownloadConditions()) {
            return;
        }
        
        // 顯示下載狀態
        this.showEnhancedDownloadProgress(true, `正在生成 ${format.toUpperCase()} 格式圖片...`);
        
        try {
            // 生成指定格式的圖片
            const imageData = this.generateImageWithFormat(format);
            
            // 生成檔名
            const filename = this.generateDownloadFilename(format);
            
            // 執行下載
            this.performDownload(imageData, filename);
            
            // 顯示成功回饋
            this.showEnhancedDownloadSuccess(`${format.toUpperCase()} 格式圖片下載成功！`);
            
        } catch (error) {
            console.error(`${format} 格式下載失敗:`, error);
            this.showDownloadError(error);
        } finally {
            this.showEnhancedDownloadProgress(false);
        }
    }

    /**
     * 以指定尺寸下載圖片
     */
    downloadImageWithSize(sizeType) {
        if (!this.validateDownloadConditions()) {
            return;
        }
        
        const sizeText = sizeType === 'original' ? '原始尺寸' : '預覽尺寸';
        
        // 顯示下載狀態
        this.showEnhancedDownloadProgress(true, `正在生成${sizeText}圖片...`);
        
        try {
            // 生成指定尺寸的圖片
            const imageData = this.generateImageWithSize(sizeType);
            
            // 生成檔名
            const filename = this.generateDownloadFilename(null, sizeType);
            
            // 執行下載
            this.performDownload(imageData, filename);
            
            // 顯示成功回饋
            this.showEnhancedDownloadSuccess(`${sizeText}圖片下載成功！`);
            
        } catch (error) {
            console.error(`${sizeType} 尺寸下載失敗:`, error);
            this.showDownloadError(error);
        } finally {
            this.showEnhancedDownloadProgress(false);
        }
    }

    /**
     * 生成指定格式的圖片
     */
    generateImageWithFormat(format) {
        // 創建匯出 Canvas
        const exportCanvas = document.createElement('canvas');
        const exportContext = exportCanvas.getContext('2d');
        
        // 使用原始圖片尺寸
        exportCanvas.width = this.imageData.originalWidth;
        exportCanvas.height = this.imageData.originalHeight;
        
        // 設定高品質渲染
        exportContext.imageSmoothingEnabled = true;
        exportContext.imageSmoothingQuality = 'high';
        
        // 如果是 JPG 格式，先填充白色背景
        if (format === 'jpg') {
            exportContext.fillStyle = '#ffffff';
            exportContext.fillRect(0, 0, exportCanvas.width, exportCanvas.height);
        }
        
        // 繪製原始圖片
        exportContext.drawImage(
            this.imageData.image,
            0, 0,
            this.imageData.originalWidth,
            this.imageData.originalHeight
        );
        
        // 繪製浮水印
        this.drawWatermarkForExport(exportContext, exportCanvas);
        
        // 決定匯出格式和品質
        const mimeType = format === 'jpg' ? 'image/jpeg' : 'image/png';
        const quality = format === 'jpg' ? 0.92 : 1.0;
        
        console.log(`${format.toUpperCase()} 格式圖片生成完成:`, {
            尺寸: `${exportCanvas.width}x${exportCanvas.height}`,
            格式: mimeType,
            品質: quality
        });
        
        return {
            dataUrl: exportCanvas.toDataURL(mimeType, quality),
            format: mimeType,
            width: exportCanvas.width,
            height: exportCanvas.height
        };
    }

    /**
     * 生成指定尺寸的圖片
     */
    generateImageWithSize(sizeType) {
        // 創建匯出 Canvas
        const exportCanvas = document.createElement('canvas');
        const exportContext = exportCanvas.getContext('2d');
        
        // 根據尺寸類型設定 Canvas 大小
        if (sizeType === 'original') {
            exportCanvas.width = this.imageData.originalWidth;
            exportCanvas.height = this.imageData.originalHeight;
        } else {
            exportCanvas.width = this.canvas.width;
            exportCanvas.height = this.canvas.height;
        }
        
        // 設定高品質渲染
        exportContext.imageSmoothingEnabled = true;
        exportContext.imageSmoothingQuality = 'high';
        
        // 繪製圖片
        exportContext.drawImage(
            this.imageData.image,
            0, 0,
            exportCanvas.width,
            exportCanvas.height
        );
        
        // 繪製浮水印
        if (sizeType === 'original') {
            this.drawWatermarkForExport(exportContext, exportCanvas);
        } else {
            // 預覽尺寸使用預覽的浮水印設定
            this.drawWatermarkForPreview(exportContext, exportCanvas);
        }
        
        // 使用最佳格式
        const originalFormat = this.detectOriginalImageFormat();
        const exportFormat = this.getOptimalExportFormat(originalFormat);
        const quality = this.getExportQuality(exportFormat);
        
        console.log(`${sizeType} 尺寸圖片生成完成:`, {
            尺寸: `${exportCanvas.width}x${exportCanvas.height}`,
            格式: exportFormat,
            品質: quality
        });
        
        return {
            dataUrl: exportCanvas.toDataURL(exportFormat, quality),
            format: exportFormat,
            width: exportCanvas.width,
            height: exportCanvas.height
        };
    }

    /**
     * 為預覽尺寸繪製浮水印
     */
    drawWatermarkForPreview(context, canvas) {
        const text = this.watermarkConfig.text?.trim();
        if (!text) return;
        
        // 儲存上下文狀態
        context.save();
        
        try {
            // 使用預覽的字體大小和設定
            const fontFamily = 'Arial, "Microsoft JhengHei", "PingFang TC", "Helvetica Neue", sans-serif';
            
            // 設定浮水印樣式
            context.font = `${this.watermarkConfig.fontSize}px ${fontFamily}`;
            context.fillStyle = this.watermarkConfig.color;
            context.globalAlpha = this.watermarkConfig.opacity;
            context.textAlign = 'center';
            context.textBaseline = 'middle';
            
            // 設定陰影效果
            context.shadowColor = 'rgba(0, 0, 0, 0.3)';
            context.shadowBlur = 2;
            context.shadowOffsetX = 1;
            context.shadowOffsetY = 1;
            
            // 使用當前的浮水印位置
            let x = this.watermarkConfig.x;
            let y = this.watermarkConfig.y;
            
            // 如果沒有自訂位置，使用預設位置計算
            if (x === 0 && y === 0) {
                const textMetrics = context.measureText(text);
                const textWidth = textMetrics.width;
                const textHeight = this.watermarkConfig.fontSize;
                const margin = 20;
                
                switch (this.watermarkConfig.position) {
                    case 'bottom-right':
                    default:
                        x = canvas.width - margin - textWidth / 2;
                        y = canvas.height - margin - textHeight / 2;
                        break;
                    // 其他位置的計算...
                }
            }
            
            // 繪製浮水印文字
            context.fillText(text, x, y);
            
        } finally {
            context.restore();
        }
    }

    /**
     * 增強的下載進度顯示
     */
    showEnhancedDownloadProgress(show, message = '處理中...') {
        const downloadBtn = this.elements.downloadBtn;
        const downloadOptionsBtn = this.elements.downloadOptionsBtn;
        const downloadStatus = this.elements.downloadStatus;
        const downloadStatusText = this.elements.downloadStatusText;
        
        if (show) {
            // 保存原始按鈕內容
            if (!downloadBtn.dataset.originalContent) {
                downloadBtn.dataset.originalContent = downloadBtn.innerHTML;
            }
            
            // 顯示載入狀態
            downloadBtn.disabled = true;
            downloadOptionsBtn.disabled = true;
            downloadBtn.innerHTML = `
                <span class="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                處理中...
            `;
            downloadBtn.classList.add('btn-loading');
            
            // 顯示狀態指示器
            downloadStatus.classList.remove('d-none');
            downloadStatusText.textContent = message;
            
            // 隱藏成功指示器
            this.elements.downloadSuccess.classList.add('d-none');
            
        } else {
            // 恢復按鈕狀態
            downloadBtn.disabled = false;
            downloadOptionsBtn.disabled = false;
            downloadBtn.innerHTML = downloadBtn.dataset.originalContent || `
                <i class="bi bi-download me-2"></i>
                下載圖片
            `;
            downloadBtn.classList.remove('btn-loading');
            
            // 隱藏狀態指示器
            downloadStatus.classList.add('d-none');
        }
    }

    /**
     * 增強的下載成功回饋
     */
    showEnhancedDownloadSuccess(message = '圖片下載成功！') {
        // 顯示成功指示器
        const downloadSuccess = this.elements.downloadSuccess;
        const downloadSuccessText = this.elements.downloadSuccessText;
        
        downloadSuccess.classList.remove('d-none');
        downloadSuccessText.textContent = message;
        
        // 自動隱藏成功訊息
        setTimeout(() => {
            downloadSuccess.classList.add('d-none');
        }, 5000);
        
        // 顯示 Toast
        this.showToast(message, 'success');
        
        // 按鈕成功動畫
        const downloadBtn = this.elements.downloadBtn;
        downloadBtn.classList.add('btn-success-flash');
        
        setTimeout(() => {
            downloadBtn.classList.remove('btn-success-flash');
        }, 1000);
        
        console.log('下載成功回饋已顯示:', message);
    }

    /**
     * 啟用下載功能
     */
    enableDownloadFeatures() {
        this.elements.downloadBtn.disabled = false;
        if (this.elements.downloadOptionsBtn) {
            this.elements.downloadOptionsBtn.disabled = false;
        }
        
        // 同時啟用手機版下載功能
        this.enableMobileDownloadFeatures();
        
        console.log('下載功能已啟用');
    }

    /**
     * 停用下載功能
     */
    disableDownloadFeatures() {
        this.elements.downloadBtn.disabled = true;
        if (this.elements.downloadOptionsBtn) {
            this.elements.downloadOptionsBtn.disabled = true;
        }
        
        console.log('下載功能已停用');
    }

    /**
     * 設定響應式處理器
     */
    setupResponsiveHandlers() {
        let resizeTimeout;
        window.addEventListener('resize', () => {
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                if (this.imageData && this.canvas) {
                    this.setupCanvas(this.imageData.image);
                    this.updatePreview();
                }
            }, 250);
        });
        
        console.log('響應式處理器設定完成');
    }

    /**
     * 檢查嵌入模式
     */
    checkEmbeddedMode() {
        // 基本 iframe 檢測
        const isInIframe = window.self !== window.top;
        
        // 進階嵌入環境檢測
        const embedDetection = this.detectEmbedEnvironment();
        
        // 更新嵌入狀態
        this.isEmbedded = isInIframe || embedDetection.isEmbedded;
        this.embedInfo = embedDetection;
        
        if (this.isEmbedded) {
            // 添加嵌入模式樣式類
            document.body.classList.add('embedded-mode');
            
            // 調整嵌入模式介面
            this.adjustEmbeddedInterface();
            
            // 移除不必要的元素
            this.removeUnnecessaryElements();
            
            // 設定嵌入模式特定功能
            this.setupEmbeddedFeatures();
            
            console.log('嵌入模式已啟用', this.embedInfo);
        } else {
            console.log('獨立模式運行');
        }
    }

    /**
     * 檢測嵌入環境詳細資訊
     */
    detectEmbedEnvironment() {
        const detection = {
            isEmbedded: false,
            parentDomain: null,
            embedType: 'unknown',
            hasParentAccess: false,
            viewportConstraints: null,
            referrer: document.referrer
        };

        try {
            // 檢查是否在 iframe 中
            if (window.self !== window.top) {
                detection.isEmbedded = true;
                detection.embedType = 'iframe';
                
                // 嘗試獲取父頁面資訊
                try {
                    detection.parentDomain = window.parent.location.hostname;
                    detection.hasParentAccess = true;
                } catch (e) {
                    // 跨域限制，無法訪問父頁面
                    detection.hasParentAccess = false;
                    
                    // 從 referrer 獲取父域名
                    if (document.referrer) {
                        try {
                            const referrerUrl = new URL(document.referrer);
                            detection.parentDomain = referrerUrl.hostname;
                        } catch (e) {
                            console.warn('無法解析 referrer URL');
                        }
                    }
                }
            }

            // 檢查視窗大小限制（可能表示嵌入環境）
            const viewport = {
                width: window.innerWidth,
                height: window.innerHeight,
                screenWidth: window.screen.width,
                screenHeight: window.screen.height
            };

            // 如果視窗明顯小於螢幕，可能是嵌入的
            if (viewport.width < viewport.screenWidth * 0.8 || 
                viewport.height < viewport.screenHeight * 0.8) {
                detection.viewportConstraints = viewport;
            }

            // 檢查 URL 參數中的嵌入標識
            const urlParams = new URLSearchParams(window.location.search);
            if (urlParams.has('embed') || urlParams.has('embedded')) {
                detection.isEmbedded = true;
                detection.embedType = 'parameter';
            }

        } catch (error) {
            console.warn('嵌入環境檢測時發生錯誤:', error);
        }

        return detection;
    }

    /**
     * 調整嵌入模式介面
     */
    adjustEmbeddedInterface() {
        // 調整容器樣式
        const container = document.querySelector('.container');
        if (container) {
            container.style.maxWidth = '100%';
            container.style.paddingLeft = '0.5rem';
            container.style.paddingRight = '0.5rem';
        }

        // 調整主要內容區域
        const main = document.querySelector('main');
        if (main) {
            main.style.marginTop = '1rem';
            main.style.marginBottom = '1rem';
        }

        // 調整卡片間距
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.style.marginBottom = '1rem';
        });

        // 調整預覽區域最小高度
        const previewArea = this.elements.previewArea;
        if (previewArea) {
            previewArea.style.minHeight = '300px';
        }

        console.log('嵌入模式介面已調整');
    }

    /**
     * 移除不必要的 header/footer 元素
     */
    removeUnnecessaryElements() {
        // 隱藏 header
        const header = document.querySelector('header');
        if (header) {
            header.style.display = 'none';
        }

        // 隱藏 footer
        const footer = document.querySelector('footer');
        if (footer) {
            footer.style.display = 'none';
        }

        // 隱藏不必要的導航元素
        const navElements = document.querySelectorAll('nav, .navbar');
        navElements.forEach(nav => {
            nav.style.display = 'none';
        });

        // 移除頁面標題相關的 meta 標籤顯示
        const pageTitle = document.querySelector('h1');
        if (pageTitle && pageTitle.textContent.includes('圖片浮水印工具')) {
            pageTitle.style.display = 'none';
        }

        console.log('不必要的元素已移除');
    }

    /**
     * 設定嵌入模式特定功能
     */
    setupEmbeddedFeatures() {
        // 調整最小高度以適應嵌入容器
        this.adjustMinimumHeight();
        
        // 設定 postMessage 通訊（如果需要）
        this.setupPostMessageCommunication();
        
        // 防止影響父頁面的樣式
        this.preventParentPageInterference();
        
        // 優化嵌入模式的使用者體驗
        this.optimizeEmbeddedUX();
        
        // 動態調整嵌入模式佈局
        this.dynamicEmbeddedLayoutAdjustment();
        
        // 增強的 postMessage 通訊機制
        this.enhancedPostMessageCommunication();
        
        // 增強的父頁面保護措施
        this.enhancedParentPageProtection();
        
        // 嵌入模式錯誤處理
        this.embeddedModeErrorHandling();
        
        // 嵌入模式效能優化
        this.embeddedModePerformanceOptimization();
        
        // 嵌入模式無障礙設計增強
        this.embeddedModeAccessibilityEnhancement();
        
        // 監聽視窗大小變化以動態調整佈局
        window.addEventListener('resize', () => {
            this.dynamicEmbeddedLayoutAdjustment();
        });
        
        // 監聽頁面卸載事件以清理資源
        window.addEventListener('beforeunload', () => {
            this.cleanupEmbeddedMode();
        });
        
        console.log('嵌入模式特定功能已設定');
    }

    /**
     * 調整最小高度
     */
    adjustMinimumHeight() {
        // 設定最小高度以確保功能完整性
        const minHeight = Math.max(500, window.innerHeight);
        document.body.style.minHeight = `${minHeight}px`;
        
        // 調整主要內容區域
        const main = document.querySelector('main');
        if (main) {
            main.style.minHeight = `${minHeight - 100}px`;
        }
    }

    /**
     * 設定 postMessage 通訊機制
     */
    setupPostMessageCommunication() {
        if (!this.isEmbedded || !this.embedInfo.hasParentAccess) return;

        // 監聽來自父頁面的訊息
        window.addEventListener('message', (event) => {
            this.handleParentMessage(event);
        });

        // 向父頁面發送初始化完成訊息
        this.sendMessageToParent({
            type: 'watermark_tool_ready',
            data: {
                version: '1.0.0',
                features: ['upload', 'watermark', 'download'],
                embedInfo: this.embedInfo
            }
        });

        console.log('postMessage 通訊機制已設定');
    }

    /**
     * 處理來自父頁面的訊息
     */
    handleParentMessage(event) {
        // 安全檢查：驗證來源
        if (!this.isValidParentOrigin(event.origin)) {
            console.warn('收到來自未知來源的訊息:', event.origin);
            return;
        }

        const { type, data } = event.data;

        switch (type) {
            case 'resize_container':
                this.handleContainerResize(data);
                break;
            case 'load_image':
                this.handleExternalImageLoad(data);
                break;
            case 'get_status':
                this.sendStatusToParent();
                break;
            default:
                console.log('收到未知類型的父頁面訊息:', type);
        }
    }

    /**
     * 驗證父頁面來源是否有效
     */
    isValidParentOrigin(origin) {
        // 如果有已知的父域名，進行驗證
        if (this.embedInfo.parentDomain) {
            return origin.includes(this.embedInfo.parentDomain);
        }
        
        // 如果沒有特定限制，允許所有來源（在生產環境中應該更嚴格）
        return true;
    }

    /**
     * 向父頁面發送訊息
     */
    sendMessageToParent(message) {
        if (!this.isEmbedded) return;

        try {
            window.parent.postMessage(message, '*');
        } catch (error) {
            console.warn('無法向父頁面發送訊息:', error);
        }
    }

    /**
     * 處理容器大小調整
     */
    handleContainerResize(data) {
        if (data.width) {
            document.body.style.width = `${data.width}px`;
        }
        if (data.height) {
            document.body.style.height = `${data.height}px`;
        }
        
        // 觸發響應式佈局更新
        this.updateResponsiveLayout();
        
        console.log('容器大小已調整:', data);
    }

    /**
     * 處理外部圖片載入
     */
    handleExternalImageLoad(data) {
        if (data.imageUrl) {
            this.loadImageFromUrl(data.imageUrl);
        } else if (data.imageData) {
            this.loadImageFromData(data.imageData);
        }
    }

    /**
     * 向父頁面發送狀態資訊
     */
    sendStatusToParent() {
        const status = {
            hasImage: !!this.imageData,
            watermarkConfig: this.watermarkConfig,
            isReady: true
        };

        this.sendMessageToParent({
            type: 'status_response',
            data: status
        });
    }

    /**
     * 防止影響父頁面
     */
    preventParentPageInterference() {
        // 防止事件冒泡到父頁面
        document.addEventListener('click', (e) => {
            e.stopPropagation();
        }, true);

        document.addEventListener('keydown', (e) => {
            e.stopPropagation();
        }, true);

        // 防止樣式洩漏
        const style = document.createElement('style');
        style.textContent = `
            body.embedded-mode {
                margin: 0 !important;
                padding: 0 !important;
                overflow-x: hidden !important;
            }
            
            .embedded-mode * {
                box-sizing: border-box !important;
            }
        `;
        document.head.appendChild(style);

        console.log('父頁面干擾防護已啟用');
    }

    /**
     * 優化嵌入模式使用者體驗
     */
    optimizeEmbeddedUX() {
        // 調整 Toast 訊息位置
        const toastContainer = document.querySelector('.toast-container');
        if (toastContainer) {
            toastContainer.style.position = 'fixed';
            toastContainer.style.top = '1rem';
            toastContainer.style.right = '1rem';
            toastContainer.style.zIndex = '9999';
        }

        // 調整載入指示器
        const loadingSpinner = this.elements.loadingSpinner;
        if (loadingSpinner) {
            loadingSpinner.style.position = 'fixed';
            loadingSpinner.style.zIndex = '10000';
        }

        // 優化按鈕大小以適應較小的嵌入空間
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            if (btn.classList.contains('btn-lg')) {
                btn.classList.remove('btn-lg');
                btn.classList.add('btn-sm');
            }
        });

        console.log('嵌入模式使用者體驗已優化');
    }

    /**
     * 初始化預設浮水印選項
     */
    initializePresetOptions() {
        const presetSelect = this.elements.presetSelect;
        if (!presetSelect) return;

        presetSelect.innerHTML = '';

        Object.keys(PRESET_WATERMARKS).forEach(key => {
            const preset = PRESET_WATERMARKS[key];
            const option = document.createElement('option');
            option.value = key;
            option.textContent = preset.text;
            option.title = preset.description;
            presetSelect.appendChild(option);
        });

        presetSelect.value = 'taiwan-id';
        console.log('預設浮水印選項已初始化');
    }

    /**
     * 載入使用者偏好設定
     */
    loadUserPreferences() {
        try {
            const saved = localStorage.getItem('watermark-preferences');
            if (saved) {
                const preferences = JSON.parse(saved);
                
                if (preferences.type !== undefined) {
                    const typeRadio = document.querySelector(`input[name="watermark-type"][value="${preferences.type}"]`);
                    if (typeRadio) {
                        typeRadio.checked = true;
                        this.watermarkConfig.type = preferences.type;
                    }
                }
                
                if (preferences.presetType !== undefined && this.elements.presetSelect) {
                    this.elements.presetSelect.value = preferences.presetType;
                    this.watermarkConfig.presetType = preferences.presetType;
                }
                
                if (preferences.opacity !== undefined) {
                    this.elements.opacityRange.value = preferences.opacity * 100;
                    this.watermarkConfig.opacity = preferences.opacity;
                    this.elements.opacityValue.textContent = (preferences.opacity * 100) + '%';
                }
                
                if (preferences.fontSize !== undefined) {
                    this.elements.fontsizeRange.value = preferences.fontSize;
                    this.watermarkConfig.fontSize = preferences.fontSize;
                    this.elements.fontsizeValue.textContent = preferences.fontSize + 'px';
                }
                
                if (preferences.position !== undefined) {
                    const positionRadio = document.querySelector(`input[name="position"][value="${preferences.position}"]`);
                    if (positionRadio) {
                        positionRadio.checked = true;
                        this.watermarkConfig.position = preferences.position;
                    }
                }
                
                console.log('使用者偏好設定已載入');
            }
        } catch (error) {
            console.error('載入偏好設定失敗:', error);
        }
    }

    /**
     * 儲存使用者偏好設定
     */
    saveUserPreferences() {
        try {
            const preferences = {
                type: this.watermarkConfig.type,
                presetType: this.watermarkConfig.presetType,
                opacity: this.watermarkConfig.opacity,
                fontSize: this.watermarkConfig.fontSize,
                position: this.watermarkConfig.position
            };
            
            localStorage.setItem('watermark-preferences', JSON.stringify(preferences));
            console.log('使用者偏好設定已儲存');
        } catch (error) {
            console.error('儲存偏好設定失敗:', error);
        }
    }

    /**
     * 顯示載入狀態
     */
    showLoading(show, message = '載入中...') {
        const spinner = this.elements.loadingSpinner;
        const loadingMessage = spinner.querySelector('.loading-message');
        
        if (show) {
            if (loadingMessage) {
                loadingMessage.textContent = message;
            }
            spinner.classList.remove('d-none');
            spinner.classList.add('fade-in');
        } else {
            spinner.classList.add('d-none');
            spinner.classList.remove('fade-in');
        }
    }

    /**
     * 顯示錯誤訊息
     */
    showError(message) {
        this.showAlert(message, 'danger');
    }

    /**
     * 顯示成功訊息
     */
    showSuccess(message) {
        this.showAlert(message, 'success');
    }

    /**
     * 顯示警告訊息
     */
    showAlert(message, type = 'info') {
        const existingAlert = document.querySelector('.alert');
        if (existingAlert) {
            existingAlert.remove();
        }
        
        const alert = document.createElement('div');
        alert.className = `alert alert-${type} alert-dismissible fade show`;
        alert.innerHTML = `
            <i class="bi bi-${type === 'danger' ? 'exclamation-triangle' : type === 'success' ? 'check-circle' : 'info-circle'}-fill me-2"></i>
            ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        const container = document.querySelector('.container');
        container.insertBefore(alert, container.firstChild);
        
        setTimeout(() => {
            if (alert.parentNode) {
                alert.remove();
            }
        }, 5000);
        
        console.log(`${type.toUpperCase()}: ${message}`);
    }

    /**
     * 從 URL 載入圖片
     */
    loadImageFromUrl(imageUrl) {
        this.showLoadingSpinner('載入外部圖片...');
        
        const img = new Image();
        img.crossOrigin = 'anonymous'; // 處理跨域圖片
        
        img.onload = () => {
            this.hideLoadingSpinner();
            this.handleImageLoad(img);
            
            // 通知父頁面圖片載入成功
            if (this.isEmbedded) {
                this.sendMessageToParent({
                    type: 'image_loaded',
                    data: {
                        success: true,
                        width: img.naturalWidth,
                        height: img.naturalHeight
                    }
                });
            }
        };
        
        img.onerror = () => {
            this.hideLoadingSpinner();
            this.showToast('無法載入外部圖片', 'error');
            
            // 通知父頁面圖片載入失敗
            if (this.isEmbedded) {
                this.sendMessageToParent({
                    type: 'image_loaded',
                    data: {
                        success: false,
                        error: '圖片載入失敗'
                    }
                });
            }
        };
        
        img.src = imageUrl;
    }

    /**
     * 從 Base64 資料載入圖片
     */
    loadImageFromData(imageData) {
        this.showLoadingSpinner('載入圖片資料...');
        
        const img = new Image();
        
        img.onload = () => {
            this.hideLoadingSpinner();
            this.handleImageLoad(img);
            
            // 通知父頁面圖片載入成功
            if (this.isEmbedded) {
                this.sendMessageToParent({
                    type: 'image_loaded',
                    data: {
                        success: true,
                        width: img.naturalWidth,
                        height: img.naturalHeight
                    }
                });
            }
        };
        
        img.onerror = () => {
            this.hideLoadingSpinner();
            this.showToast('無法載入圖片資料', 'error');
            
            // 通知父頁面圖片載入失敗
            if (this.isEmbedded) {
                this.sendMessageToParent({
                    type: 'image_loaded',
                    data: {
                        success: false,
                        error: '圖片資料無效'
                    }
                });
            }
        };
        
        // 支援 Base64 和 Blob URL
        if (typeof imageData === 'string') {
            img.src = imageData;
        } else if (imageData instanceof Blob) {
            img.src = URL.createObjectURL(imageData);
        }
    }

    /**
     * 處理圖片載入（統一處理邏輯）
     */
    handleImageLoad(img) {
        // 創建圖片資料物件
        this.imageData = {
            image: img,
            originalWidth: img.naturalWidth,
            originalHeight: img.naturalHeight,
            displayWidth: 0,
            displayHeight: 0,
            scaleFactor: 1
        };

        // 設定 Canvas
        this.setupCanvas(img);
        
        // 顯示控制面板
        this.elements.controlPanel.classList.remove('d-none');
        
        // 更新預覽
        this.updatePreview();
        
        // 啟用下載功能
        this.enableDownloadFeatures();
        
        // 如果是手機版，啟用手機版下載功能
        if (document.body.classList.contains('mobile-layout')) {
            this.enableMobileDownloadFeatures();
        }
        
        console.log('圖片載入完成:', {
            尺寸: `${img.naturalWidth}x${img.naturalHeight}`,
            類型: img.src.substring(0, 20) + '...'
        });
    }

    /**
     * 動態調整嵌入模式佈局
     */
    dynamicEmbeddedLayoutAdjustment() {
        if (!this.isEmbedded) return;

        const viewportHeight = window.innerHeight;
        const viewportWidth = window.innerWidth;

        // 根據可用空間動態調整佈局
        if (viewportHeight < 600) {
            this.setupCompactEmbeddedLayout();
        } else if (viewportHeight < 800) {
            this.setupStandardEmbeddedLayout();
        } else {
            this.setupExpandedEmbeddedLayout();
        }

        // 根據寬度調整控制面板佈局
        if (viewportWidth < 500) {
            this.setupNarrowEmbeddedLayout();
        }

        console.log(`嵌入模式佈局已調整為: ${viewportWidth}x${viewportHeight}`);
    }

    /**
     * 設定緊湊型嵌入佈局
     */
    setupCompactEmbeddedLayout() {
        const previewArea = this.elements.previewArea;
        if (previewArea) {
            previewArea.style.minHeight = '200px';
            previewArea.style.maxHeight = '250px';
        }

        // 壓縮控制面板
        const cards = document.querySelectorAll('.card');
        cards.forEach(card => {
            card.style.marginBottom = '0.5rem';
            const cardBody = card.querySelector('.card-body');
            if (cardBody) {
                cardBody.style.padding = '0.75rem';
            }
        });

        // 使用較小的按鈕
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.style.fontSize = '0.8rem';
            btn.style.padding = '0.25rem 0.5rem';
        });

        console.log('緊湊型嵌入佈局已設定');
    }

    /**
     * 設定標準嵌入佈局
     */
    setupStandardEmbeddedLayout() {
        const previewArea = this.elements.previewArea;
        if (previewArea) {
            previewArea.style.minHeight = '300px';
            previewArea.style.maxHeight = '400px';
        }

        console.log('標準嵌入佈局已設定');
    }

    /**
     * 設定擴展型嵌入佈局
     */
    setupExpandedEmbeddedLayout() {
        const previewArea = this.elements.previewArea;
        if (previewArea) {
            previewArea.style.minHeight = '400px';
            previewArea.style.maxHeight = '500px';
        }

        console.log('擴展型嵌入佈局已設定');
    }

    /**
     * 設定窄屏嵌入佈局
     */
    setupNarrowEmbeddedLayout() {
        // 強制單欄佈局
        const row = document.querySelector('.row');
        if (row) {
            row.style.flexDirection = 'column';
        }

        // 調整控制面板寬度
        const controlColumn = document.querySelector('.col-lg-4');
        if (controlColumn) {
            controlColumn.style.width = '100%';
            controlColumn.style.maxWidth = '100%';
        }

        // 調整預覽區域寬度
        const previewColumn = document.querySelector('.col-lg-8');
        if (previewColumn) {
            previewColumn.style.width = '100%';
            previewColumn.style.maxWidth = '100%';
        }

        console.log('窄屏嵌入佈局已設定');
    }

    /**
     * 增強的 postMessage 通訊機制
     */
    enhancedPostMessageCommunication() {
        if (!this.isEmbedded) return;

        // 定期向父頁面報告狀態
        this.statusReportInterval = setInterval(() => {
            this.sendStatusToParent();
        }, 5000);

        // 監聽視窗大小變化並通知父頁面
        window.addEventListener('resize', () => {
            this.sendMessageToParent({
                type: 'size_changed',
                data: {
                    width: window.innerWidth,
                    height: window.innerHeight,
                    scrollHeight: document.body.scrollHeight
                }
            });
        });

        // 監聽圖片載入事件並通知父頁面
        this.addEventListener('imageLoaded', (imageData) => {
            this.sendMessageToParent({
                type: 'image_processed',
                data: {
                    width: imageData.originalWidth,
                    height: imageData.originalHeight,
                    hasWatermark: !!this.watermarkConfig.text || !!this.watermarkConfig.presetType
                }
            });
        });

        console.log('增強的 postMessage 通訊機制已設定');
    }

    /**
     * 防止嵌入模式影響父頁面的增強措施
     */
    enhancedParentPageProtection() {
        // 防止樣式洩漏的更嚴格措施
        const isolationStyle = document.createElement('style');
        isolationStyle.textContent = `
            .embedded-mode {
                all: initial !important;
                font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
                line-height: 1.5 !important;
                color: #212529 !important;
                background-color: #ffffff !important;
            }
            
            .embedded-mode * {
                all: unset !important;
                display: revert !important;
                box-sizing: border-box !important;
            }
            
            .embedded-mode .btn,
            .embedded-mode .form-control,
            .embedded-mode .card {
                all: revert !important;
            }
        `;
        document.head.appendChild(isolationStyle);

        // 防止全域事件監聽器影響父頁面
        const originalAddEventListener = window.addEventListener;
        window.addEventListener = function(type, listener, options) {
            // 確保事件不會冒泡到父頁面
            const wrappedListener = function(event) {
                event.stopPropagation();
                return listener.call(this, event);
            };
            return originalAddEventListener.call(this, type, wrappedListener, options);
        };

        // 防止 focus 事件影響父頁面
        document.addEventListener('focusin', (e) => {
            e.stopPropagation();
        }, true);

        document.addEventListener('focusout', (e) => {
            e.stopPropagation();
        }, true);

        // 防止滾動事件影響父頁面
        document.addEventListener('scroll', (e) => {
            e.stopPropagation();
        }, true);

        console.log('增強的父頁面保護措施已啟用');
    }

    /**
     * 嵌入模式的錯誤處理
     */
    embeddedModeErrorHandling() {
        // 捕獲並處理嵌入模式特有的錯誤
        window.addEventListener('error', (event) => {
            if (this.isEmbedded) {
                // 向父頁面報告錯誤
                this.sendMessageToParent({
                    type: 'error_occurred',
                    data: {
                        message: event.message,
                        filename: event.filename,
                        lineno: event.lineno,
                        colno: event.colno,
                        timestamp: new Date().toISOString()
                    }
                });

                // 防止錯誤冒泡到父頁面
                event.stopPropagation();
            }
        });

        // 處理未捕獲的 Promise 拒絕
        window.addEventListener('unhandledrejection', (event) => {
            if (this.isEmbedded) {
                this.sendMessageToParent({
                    type: 'promise_rejection',
                    data: {
                        reason: event.reason.toString(),
                        timestamp: new Date().toISOString()
                    }
                });

                event.stopPropagation();
            }
        });

        console.log('嵌入模式錯誤處理已設定');
    }

    /**
     * 嵌入模式的效能優化
     */
    embeddedModePerformanceOptimization() {
        if (!this.isEmbedded) return;

        // 減少不必要的動畫以提升效能
        const style = document.createElement('style');
        style.textContent = `
            .embedded-mode * {
                animation-duration: 0.1s !important;
                transition-duration: 0.1s !important;
            }
            
            .embedded-mode .fade-in,
            .embedded-mode .slide-up {
                animation: none !important;
            }
        `;
        document.head.appendChild(style);

        // 優化圖片處理
        this.embeddedImageOptimization = true;

        // 減少狀態報告頻率
        if (this.statusReportInterval) {
            clearInterval(this.statusReportInterval);
            this.statusReportInterval = setInterval(() => {
                this.sendStatusToParent();
            }, 10000); // 從 5 秒改為 10 秒
        }

        console.log('嵌入模式效能優化已啟用');
    }

    /**
     * 嵌入模式的無障礙設計增強
     */
    embeddedModeAccessibilityEnhancement() {
        // 設定適當的 ARIA 標籤
        document.body.setAttribute('role', 'application');
        document.body.setAttribute('aria-label', '圖片浮水印工具');

        // 為嵌入模式添加鍵盤導航支援
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.isEmbedded) {
                // ESC 鍵通知父頁面關閉嵌入工具
                this.sendMessageToParent({
                    type: 'close_requested',
                    data: { reason: 'escape_key' }
                });
            }
        });

        // 確保焦點管理
        const focusableElements = document.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );

        if (focusableElements.length > 0) {
            // 設定初始焦點
            focusableElements[0].focus();
        }

        console.log('嵌入模式無障礙設計增強已啟用');
    }

    /**
     * 清理嵌入模式資源
     */
    cleanupEmbeddedMode() {
        if (this.statusReportInterval) {
            clearInterval(this.statusReportInterval);
        }

        // 移除事件監聽器
        window.removeEventListener('message', this.handleParentMessage);

        // 通知父頁面工具即將關閉
        if (this.isEmbedded) {
            this.sendMessageToParent({
                type: 'tool_closing',
                data: { timestamp: new Date().toISOString() }
            });
        }

        console.log('嵌入模式資源已清理');
    }
}

// 當 DOM 載入完成時初始化應用程式
document.addEventListener('DOMContentLoaded', () => {
    window.watermarkApp = new WatermarkApp();
});

// 預設浮水印類型定義
const PRESET_WATERMARKS = {
    'taiwan-id': {
        text: '僅供身分驗證使用',
        fontSize: 20,
        color: '#ff0000',
        opacity: 0.6,
        position: 'center',
        description: '台灣身分證專用浮水印'
    },
    'document-copy': {
        text: '僅供文件備份使用',
        fontSize: 18,
        color: '#0066cc',
        opacity: 0.5,
        position: 'bottom-right',
        description: '文件備份專用浮水印'
    },
    'sample': {
        text: 'SAMPLE',
        fontSize: 32,
        color: '#888888',
        opacity: 0.4,
        position: 'center',
        description: '樣本標記浮水印'
    }
};