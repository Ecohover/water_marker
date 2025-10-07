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
            downloadBtn: document.getElementById('download-btn')
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
        
        // 下載按鈕
        this.elements.downloadBtn.addEventListener('click', () => this.downloadImage());
        
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
        if (!this.imageData || !this.canvas || !this.imageData.image) return;
        
        // 防抖動處理
        if (this.previewUpdateTimeout) {
            clearTimeout(this.previewUpdateTimeout);
        }
        
        this.previewUpdateTimeout = setTimeout(() => {
            this.performPreviewUpdate();
        }, 100);
    }

    /**
     * 執行預覽更新
     */
    performPreviewUpdate() {
        if (!this.imageData || !this.canvas || !this.imageData.image) return;
        
        try {
            // 清除 canvas
            this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
            
            // 繪製原始圖片
            this.context.drawImage(
                this.imageData.image, 
                0, 0, 
                this.imageData.originalWidth, 
                this.imageData.originalHeight,
                0, 0, 
                this.canvas.width, 
                this.canvas.height
            );
            
            // 繪製浮水印
            this.drawWatermark();
            
            // 啟用下載按鈕
            this.elements.downloadBtn.disabled = false;
            
        } catch (error) {
            console.error('預覽更新失敗:', error);
            this.showError('預覽更新失敗，請重試');
        }
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
        if (!this.canvas) return;
        
        try {
            const link = document.createElement('a');
            link.download = `watermarked-image-${Date.now()}.png`;
            link.href = this.canvas.toDataURL('image/png');
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            this.showToast('圖片下載成功！', 'success');
            console.log('圖片下載完成');
        } catch (error) {
            console.error('下載失敗:', error);
            this.showError('下載失敗，請重試');
        }
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
        if (this.isEmbedded) {
            document.body.classList.add('embedded-mode');
            console.log('嵌入模式已啟用');
        }
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