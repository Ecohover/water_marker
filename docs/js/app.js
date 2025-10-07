/**
 * 圖片浮水印工具 - 主要應用程式邏輯
 * 整合版本 - 優化效能和程式碼結構
 */

// 應用程式狀態管理
class WatermarkApp {
    constructor() {
        // 核心狀態
        this.imageData = null;
        this.canvas = null;
        this.context = null;
        
        // 浮水印配置
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
        
        // 視圖狀態
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
        
        // 效能優化 - 防抖動和節流
        this.debounceTimers = new Map();
        this.throttleTimers = new Map();
        
        // 模組整合狀態
        this.modules = {
            errorHandler: null,
            settingsManager: null,
            fileProcessor: null,
            canvasRenderer: null,
            downloadManager: null,
            responsiveHandler: null
        };
        
        // 初始化標記
        this.isInitialized = false;
        this.initializationPromise = null;
        
        this.init();
    }

    /**
     * 設定檔案處理模組
     */
    setupFileProcessor() {
        return {
            validateFile: (file) => this.validateFile(file),
            processFile: (file) => this.processImageFile(file),
            supportedFormats: ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'],
            maxFileSize: 10 * 1024 * 1024, // 10MB
            
            // 效能優化的檔案處理
            processFileOptimized: async (file) => {
                return this._processFileWithOptimization(file);
            }
        };
    }

    /**
     * 設定 Canvas 渲染模組
     */
    setupCanvasRenderer() {
        return {
            setupCanvas: (image) => this.setupCanvas(image),
            renderWatermark: () => this.renderWatermark(),
            updatePreview: () => this.updatePreview(),
            
            // 優化的渲染方法
            renderOptimized: () => this._renderWithOptimization(),
            
            // 批次渲染支援
            batchRender: (operations) => this._batchRenderOperations(operations)
        };
    }

    /**
     * 設定下載管理模組
     */
    setupDownloadManager() {
        return {
            downloadImage: (format) => this.downloadImage(format),
            generateBlob: (format, quality) => this._generateImageBlob(format, quality),
            
            // 優化的下載方法
            downloadOptimized: (options) => this._downloadWithOptimization(options),
            
            // 批次下載支援
            batchDownload: (formats) => this._batchDownload(formats)
        };
    }

    /**
     * 優化的檔案處理
     */
    async _processFileWithOptimization(file) {
        return new Promise((resolve, reject) => {
            // 使用 Web Workers 處理大檔案（如果支援）
            if (window.Worker && file.size > 5 * 1024 * 1024) {
                this._processFileWithWorker(file, resolve, reject);
            } else {
                this._processFileStandard(file, resolve, reject);
            }
        });
    }

    /**
     * 使用 Web Worker 處理檔案
     */
    _processFileWithWorker(file, resolve, reject) {
        try {
            // 創建 inline worker
            const workerCode = `
                self.onmessage = function(e) {
                    const { file, maxSize } = e.data;
                    
                    // 在 worker 中處理檔案
                    const reader = new FileReader();
                    reader.onload = function(event) {
                        self.postMessage({
                            success: true,
                            result: event.target.result,
                            size: file.size
                        });
                    };
                    reader.onerror = function(error) {
                        self.postMessage({
                            success: false,
                            error: error.message
                        });
                    };
                    reader.readAsDataURL(file);
                };
            `;
            
            const blob = new Blob([workerCode], { type: 'application/javascript' });
            const worker = new Worker(URL.createObjectURL(blob));
            
            worker.onmessage = (e) => {
                const { success, result, error } = e.data;
                worker.terminate();
                URL.revokeObjectURL(blob);
                
                if (success) {
                    resolve(result);
                } else {
                    reject(new Error(error));
                }
            };
            
            worker.onerror = (error) => {
                worker.terminate();
                URL.revokeObjectURL(blob);
                reject(error);
            };
            
            worker.postMessage({ file, maxSize: this.modules.fileProcessor.maxFileSize });
            
        } catch (error) {
            // 降級到標準處理
            this._processFileStandard(file, resolve, reject);
        }
    }

    /**
     * 標準檔案處理
     */
    _processFileStandard(file, resolve, reject) {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            resolve(e.target.result);
        };
        
        reader.onerror = (error) => {
            reject(error);
        };
        
        reader.readAsDataURL(file);
    }

    /**
     * 優化的渲染方法
     */
    _renderWithOptimization() {
        // 使用 requestAnimationFrame 優化渲染
        if (this.renderAnimationFrame) {
            cancelAnimationFrame(this.renderAnimationFrame);
        }
        
        this.renderAnimationFrame = requestAnimationFrame(() => {
            this._performOptimizedRender();
        });
    }

    /**
     * 執行優化渲染
     */
    _performOptimizedRender() {
        if (!this.canvas || !this.context || !this.imageData) {
            return;
        }
        
        // 使用離屏 Canvas 提升效能
        const offscreenCanvas = this._getOffscreenCanvas();
        const offscreenContext = offscreenCanvas.getContext('2d');
        
        // 在離屏 Canvas 上渲染
        this._renderToOffscreenCanvas(offscreenContext);
        
        // 將結果複製到主 Canvas
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.context.drawImage(offscreenCanvas, 0, 0);
        
        // 更新效能指標
        this.performanceMetrics.renderCount++;
    }

    /**
     * 取得離屏 Canvas
     */
    _getOffscreenCanvas() {
        if (!this.offscreenCanvas) {
            this.offscreenCanvas = document.createElement('canvas');
        }
        
        // 確保尺寸匹配
        if (this.offscreenCanvas.width !== this.canvas.width || 
            this.offscreenCanvas.height !== this.canvas.height) {
            this.offscreenCanvas.width = this.canvas.width;
            this.offscreenCanvas.height = this.canvas.height;
        }
        
        return this.offscreenCanvas;
    }

    /**
     * 在離屏 Canvas 上渲染
     */
    _renderToOffscreenCanvas(context) {
        // 繪製圖片
        if (this.imageData && this.imageData.image) {
            context.drawImage(
                this.imageData.image,
                0, 0,
                this.canvas.width,
                this.canvas.height
            );
        }
        
        // 繪製浮水印
        this._renderWatermarkToContext(context);
    }

    /**
     * 渲染浮水印到指定 Context
     */
    _renderWatermarkToContext(context) {
        const text = this.getWatermarkText();
        if (!text) return;
        
        context.save();
        
        // 設定浮水印樣式
        context.globalAlpha = this.watermarkConfig.opacity;
        context.font = `${this.watermarkConfig.fontSize}px Arial`;
        context.fillStyle = this.watermarkConfig.color;
        context.textAlign = 'left';
        context.textBaseline = 'top';
        
        // 計算位置
        const position = this.calculateWatermarkPosition(text);
        
        // 繪製浮水印
        context.fillText(text, position.x, position.y);
        
        context.restore();
    }

    /**
     * 批次渲染操作
     */
    _batchRenderOperations(operations) {
        return new Promise((resolve) => {
            const batchSize = 5;
            let currentBatch = 0;
            
            const processBatch = () => {
                const start = currentBatch * batchSize;
                const end = Math.min(start + batchSize, operations.length);
                
                for (let i = start; i < end; i++) {
                    operations[i]();
                }
                
                currentBatch++;
                
                if (end < operations.length) {
                    requestAnimationFrame(processBatch);
                } else {
                    resolve();
                }
            };
            
            processBatch();
        });
    }

    /**
     * 優化的下載方法
     */
    async _downloadWithOptimization(options = {}) {
        const {
            format = 'png',
            quality = 0.9,
            filename = null,
            showProgress = true
        } = options;
        
        try {
            if (showProgress) {
                this.showOperationProgress('生成高品質圖片', [
                    { name: '準備 Canvas', progress: 0 },
                    { name: '渲染圖片', progress: 25 },
                    { name: '應用浮水印', progress: 50 },
                    { name: '生成檔案', progress: 75 },
                    { name: '開始下載', progress: 100 }
                ]);
            }
            
            // 使用高品質渲染
            const blob = await this._generateHighQualityBlob(format, quality);
            
            // 生成檔案名
            const finalFilename = filename || this._generateDownloadFilename(format);
            
            // 執行下載
            this._performDownload(blob, finalFilename);
            
            if (showProgress) {
                this.hideOperationProgress();
                this.showSuccessMessage('圖片下載成功');
            }
            
        } catch (error) {
            if (showProgress) {
                this.hideOperationProgress();
            }
            this.handleDownloadError(error, format);
        }
    }

    /**
     * 生成高品質 Blob
     */
    async _generateHighQualityBlob(format, quality) {
        return new Promise((resolve, reject) => {
            // 創建高解析度 Canvas
            const highResCanvas = document.createElement('canvas');
            const scale = 2; // 2x 解析度
            
            highResCanvas.width = this.canvas.width * scale;
            highResCanvas.height = this.canvas.height * scale;
            
            const highResContext = highResCanvas.getContext('2d');
            highResContext.scale(scale, scale);
            
            // 渲染到高解析度 Canvas
            this._renderToOffscreenCanvas(highResContext);
            
            // 轉換為 Blob
            highResCanvas.toBlob((blob) => {
                if (blob) {
                    resolve(blob);
                } else {
                    reject(new Error('無法生成圖片檔案'));
                }
            }, `image/${format}`, quality);
        });
    }

    /**
     * 收集效能指標
     */
    _collectPerformanceMetrics() {
        if (performance.memory) {
            this.performanceMetrics.memoryUsage = performance.memory.usedJSHeapSize;
        }
        
        // 檢查記憶體洩漏
        if (this.performanceMetrics.memoryUsage > 100 * 1024 * 1024) { // 100MB
            console.warn('⚠️ 記憶體使用量過高:', this.performanceMetrics.memoryUsage);
            this._performMemoryCleanup();
        }
        
        // 記錄效能數據
        console.log('📊 效能指標:', {
            renderCount: this.performanceMetrics.renderCount,
            memoryUsage: Math.round(this.performanceMetrics.memoryUsage / 1024 / 1024) + 'MB',
            errorCount: this.performanceMetrics.errorCount
        });
    }

    /**
     * 執行記憶體清理
     */
    _performMemoryCleanup() {
        // 清理離屏 Canvas
        if (this.offscreenCanvas) {
            this.offscreenCanvas.width = 1;
            this.offscreenCanvas.height = 1;
        }
        
        // 清理快取的圖片資料
        if (this.imageDataCache) {
            this.imageDataCache.clear();
        }
        
        // 強制垃圾回收（如果支援）
        if (window.gc) {
            window.gc();
        }
        
        console.log('🧹 記憶體清理完成');
    }

    /**
     * 執行健康檢查
     */
    _performHealthCheck() {
        const healthStatus = {
            timestamp: new Date().toISOString(),
            modules: {},
            performance: this.performanceMetrics,
            errors: []
        };
        
        // 檢查各模組狀態
        for (const [name, module] of Object.entries(this.modules)) {
            healthStatus.modules[name] = {
                loaded: !!module,
                functional: this._testModuleFunctionality(name, module)
            };
        }
        
        // 檢查 DOM 狀態
        healthStatus.dom = {
            elementsPresent: this._checkRequiredElements(),
            eventListenersActive: this._checkEventListeners()
        };
        
        // 記錄健康狀態
        if (this.isDebugMode()) {
            console.log('🏥 健康檢查結果:', healthStatus);
        }
        
        // 如果發現問題，嘗試自動修復
        this._attemptAutoRepair(healthStatus);
    }

    /**
     * 測試模組功能性
     */
    _testModuleFunctionality(name, module) {
        try {
            switch (name) {
                case 'errorHandler':
                    return typeof this.handleError === 'function';
                case 'settingsManager':
                    return typeof this.loadUserSettings === 'function';
                case 'fileProcessor':
                    return typeof module.validateFile === 'function';
                case 'canvasRenderer':
                    return typeof module.updatePreview === 'function';
                case 'downloadManager':
                    return typeof module.downloadImage === 'function';
                default:
                    return true;
            }
        } catch (error) {
            return false;
        }
    }

    /**
     * 嘗試自動修復
     */
    _attemptAutoRepair(healthStatus) {
        let repairAttempts = 0;
        
        // 修復缺失的 DOM 元素
        if (!healthStatus.dom.elementsPresent) {
            this._repairDOMElements();
            repairAttempts++;
        }
        
        // 修復失效的事件監聽器
        if (!healthStatus.dom.eventListenersActive) {
            this._repairEventListeners();
            repairAttempts++;
        }
        
        // 修復失效的模組
        for (const [name, status] of Object.entries(healthStatus.modules)) {
            if (!status.functional) {
                this._repairModule(name);
                repairAttempts++;
            }
        }
        
        if (repairAttempts > 0) {
            console.log(`🔧 執行了 ${repairAttempts} 項自動修復`);
        }
    }

    /**
     * 設定錯誤處理系統 - 整合版本
     */
    setupErrorHandling() {
        // 全域錯誤處理器
        window.addEventListener('error', (event) => {
            this.handleGlobalError('JavaScript 錯誤', event.error, {
                filename: event.filename,
                lineno: event.lineno,
                colno: event.colno
            });
        });

        // Promise 拒絕處理器
        window.addEventListener('unhandledrejection', (event) => {
            this.handleGlobalError('Promise 拒絕', event.reason);
            event.preventDefault();
        });

        // 錯誤狀態管理
        this.errorState = {
            hasError: false,
            lastError: null,
            errorCount: 0,
            retryCount: 0,
            maxRetries: 3
        };

        console.log('錯誤處理系統已設定');
        
        return {
            handleError: (type, error, context) => this.handleError(type, error, context),
            handleGlobalError: (type, error, details) => this.handleGlobalError(type, error, details),
            handleCriticalError: (message, error) => this.handleCriticalError(message, error),
            showErrorAlert: (title, message, type, options) => this.showErrorAlert(title, message, type, options),
            logError: (type, error, details) => this.logErrorToStorage(type, error, details)
        };
    }

    /**
     * 防抖動函數 - 優化版本
     */
    debounce(key, func, delay = 300) {
        // 清除現有計時器
        if (this.debounceTimers.has(key)) {
            clearTimeout(this.debounceTimers.get(key));
        }
        
        // 設定新計時器
        const timerId = setTimeout(() => {
            func();
            this.debounceTimers.delete(key);
        }, delay);
        
        this.debounceTimers.set(key, timerId);
    }

    /**
     * 節流函數 - 優化版本
     */
    throttle(key, func, delay = 100) {
        if (this.throttleTimers.has(key)) {
            return; // 仍在節流期間
        }
        
        func();
        
        const timerId = setTimeout(() => {
            this.throttleTimers.delete(key);
        }, delay);
        
        this.throttleTimers.set(key, timerId);
    }

    /**
     * 優化的預覽更新 - 使用防抖動
     */
    updatePreview() {
        this.debounce('preview-update', () => {
            this._performPreviewUpdate();
        }, 150);
    }

    /**
     * 執行預覽更新
     */
    _performPreviewUpdate() {
        if (!this.imageData || !this.canvas || !this.imageData.image) {
            console.warn('預覽更新條件不滿足，跳過更新');
            return;
        }

        try {
            // 使用優化渲染
            if (this.modules.canvasRenderer) {
                this.modules.canvasRenderer.renderOptimized();
            } else {
                // 降級到標準渲染
                this._performStandardRender();
            }
            
            // 更新浮水印邊界
            this.updateWatermarkBounds();
            
            // 觸發預覽更新事件
            this.eventBus?.dispatchEvent(new CustomEvent('preview-updated', {
                detail: { timestamp: Date.now() }
            }));
            
        } catch (error) {
            console.error('預覽更新失敗:', error);
            this.handleImageProcessingError(error, '預覽更新');
        }
    }

    /**
     * 標準渲染方法（降級選項）
     */
    _performStandardRender() {
        // 清除 Canvas
        this.context.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // 繪製圖片
        if (this.imageData && this.imageData.image) {
            this.context.drawImage(
                this.imageData.image,
                0, 0,
                this.canvas.width,
                this.canvas.height
            );
        }
        
        // 繪製浮水印
        this.renderWatermark();
    }

    /**
     * 預載入資源
     */
    _preloadResources() {
        // 預載入常用圖示
        const icons = ['bi-cloud-upload', 'bi-download', 'bi-check-circle', 'bi-exclamation-triangle'];
        icons.forEach(icon => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'font';
            link.href = `https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/fonts/bootstrap-icons.woff2`;
            document.head.appendChild(link);
        });
        
        console.log('✅ 資源預載入完成');
    }

    /**
     * 優化 DOM 結構
     */
    _optimizeDOMStructure() {
        // 移除不必要的空白節點
        this._removeEmptyTextNodes(document.body);
        
        // 優化圖片載入
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (!img.loading) {
                img.loading = 'lazy';
            }
        });
        
        // 設定 CSS containment
        const mainContainer = document.querySelector('main');
        if (mainContainer) {
            mainContainer.style.contain = 'layout style paint';
        }
        
        console.log('✅ DOM 結構優化完成');
    }

    /**
     * 移除空白文字節點
     */
    _removeEmptyTextNodes(element) {
        const walker = document.createTreeWalker(
            element,
            NodeFilter.SHOW_TEXT,
            {
                acceptNode: (node) => {
                    return node.textContent.trim() === '' ? 
                        NodeFilter.FILTER_ACCEPT : 
                        NodeFilter.FILTER_REJECT;
                }
            }
        );
        
        const emptyNodes = [];
        let node;
        while (node = walker.nextNode()) {
            emptyNodes.push(node);
        }
        
        emptyNodes.forEach(node => {
            if (node.parentNode) {
                node.parentNode.removeChild(node);
            }
        });
    }

    /**
     * 設定記憶體管理
     */
    _setupMemoryManagement() {
        // 設定圖片快取限制
        this.imageDataCache = new Map();
        this.maxCacheSize = 5; // 最多快取5張圖片
        
        // 監聽頁面可見性變化
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) {
                this._performMemoryCleanup();
            }
        });
        
        // 監聽記憶體壓力（如果支援）
        if ('memory' in performance) {
            this._setupMemoryPressureHandling();
        }
        
        console.log('✅ 記憶體管理設定完成');
    }

    /**
     * 設定記憶體壓力處理
     */
    _setupMemoryPressureHandling() {
        const checkMemoryPressure = () => {
            const memInfo = performance.memory;
            const usageRatio = memInfo.usedJSHeapSize / memInfo.jsHeapSizeLimit;
            
            if (usageRatio > 0.8) { // 使用超過80%
                console.warn('⚠️ 記憶體壓力過高，執行清理');
                this._performMemoryCleanup();
            }
        };
        
        // 每30秒檢查一次記憶體壓力
        setInterval(checkMemoryPressure, 30000);
    }

    /**
     * 通知父頁面準備就緒
     */
    _notifyParentOfReadiness() {
        try {
            const message = {
                type: 'watermark-tool-ready',
                data: {
                    version: '1.0',
                    capabilities: {
                        fileUpload: true,
                        dragDrop: 'draggable' in document.createElement('div'),
                        canvas: !!document.createElement('canvas').getContext,
                        webWorkers: !!window.Worker,
                        offscreenCanvas: !!window.OffscreenCanvas
                    },
                    performance: {
                        initTime: performance.now() - this.performanceMetrics.initTime,
                        memoryUsage: this.performanceMetrics.memoryUsage
                    }
                }
            };
            
            window.parent.postMessage(message, '*');
            console.log('📤 已通知父頁面準備就緒');
            
        } catch (error) {
            console.warn('⚠️ 無法通知父頁面:', error);
        }
    }

    /**
     * 處理設定變更
     */
    handleSettingsChange(detail) {
        const { category, key, value, oldValue } = detail;
        
        console.log(`⚙️ 設定變更: ${category}.${key} = ${value} (舊值: ${oldValue})`);
        
        // 根據設定類別執行相應動作
        switch (category) {
            case 'watermark':
                this.updatePreview();
                break;
            case 'ui':
                this._applyUISettings();
                break;
            case 'performance':
                this._applyPerformanceSettings();
                break;
        }
        
        // 自動儲存設定
        this.debounce('save-settings', () => {
            this.saveUserSettings();
        }, 1000);
    }

    /**
     * 處理圖片處理完成
     */
    handleImageProcessed(detail) {
        const { success, imageData, processingTime } = detail;
        
        if (success) {
            console.log(`✅ 圖片處理完成，耗時: ${processingTime}ms`);
            this.imageData = imageData;
            this.updatePreview();
        } else {
            console.error('❌ 圖片處理失敗');
        }
    }

    /**
     * 處理模組錯誤
     */
    handleModuleError(detail) {
        const { module, error, context } = detail;
        
        console.error(`❌ 模組錯誤 [${module}]:`, error);
        
        // 嘗試恢復模組
        this._attemptModuleRecovery(module, error);
        
        // 更新錯誤計數
        this.performanceMetrics.errorCount++;
    }

    /**
     * 嘗試模組恢復
     */
    _attemptModuleRecovery(moduleName, error) {
        console.log(`🔧 嘗試恢復模組: ${moduleName}`);
        
        try {
            switch (moduleName) {
                case 'canvasRenderer':
                    this.modules.canvasRenderer = this.setupCanvasRenderer();
                    break;
                case 'fileProcessor':
                    this.modules.fileProcessor = this.setupFileProcessor();
                    break;
                case 'downloadManager':
                    this.modules.downloadManager = this.setupDownloadManager();
                    break;
                default:
                    console.warn(`⚠️ 不知道如何恢復模組: ${moduleName}`);
                    return false;
            }
            
            console.log(`✅ 模組 ${moduleName} 恢復成功`);
            return true;
            
        } catch (recoveryError) {
            console.error(`❌ 模組 ${moduleName} 恢復失敗:`, recoveryError);
            return false;
        }
    }

    /**
     * 檢查必要元素
     */
    _checkRequiredElements() {
        const requiredElements = [
            '#file-input',
            '#preview-canvas',
            '#control-panel',
            '#download-btn'
        ];
        
        return requiredElements.every(selector => {
            const element = document.querySelector(selector);
            return element !== null;
        });
    }

    /**
     * 檢查事件監聽器
     */
    _checkEventListeners() {
        // 簡化檢查 - 檢查關鍵元素是否有事件監聽器
        const fileInput = document.getElementById('file-input');
        return fileInput && fileInput.onchange !== null;
    }

    /**
     * 修復 DOM 元素
     */
    _repairDOMElements() {
        console.log('🔧 修復 DOM 元素...');
        
        // 檢查並修復檔案輸入
        if (!document.getElementById('file-input')) {
            const fileInput = document.createElement('input');
            fileInput.type = 'file';
            fileInput.id = 'file-input';
            fileInput.className = 'd-none';
            fileInput.accept = 'image/*';
            document.body.appendChild(fileInput);
        }
        
        // 檢查並修復 Canvas
        if (!document.getElementById('preview-canvas')) {
            const canvas = document.createElement('canvas');
            canvas.id = 'preview-canvas';
            canvas.className = 'd-none img-fluid';
            const previewArea = document.getElementById('preview-area');
            if (previewArea) {
                previewArea.appendChild(canvas);
            }
        }
    }

    /**
     * 修復事件監聽器
     */
    _repairEventListeners() {
        console.log('🔧 修復事件監聽器...');
        
        // 重新設定關鍵事件監聽器
        const fileInput = document.getElementById('file-input');
        if (fileInput && !fileInput.onchange) {
            fileInput.addEventListener('change', (e) => this.handleFileSelect(e));
        }
        
        const canvas = document.getElementById('preview-canvas');
        if (canvas && !canvas.onmousedown) {
            this._setupCanvasDragEvents(canvas);
        }
    }

    /**
     * 修復模組
     */
    _repairModule(moduleName) {
        console.log(`🔧 修復模組: ${moduleName}`);
        
        try {
            switch (moduleName) {
                case 'errorHandler':
                    this.modules.errorHandler = this.setupErrorHandling();
                    break;
                case 'settingsManager':
                    this.modules.settingsManager = this.setupSettingsManager();
                    break;
                case 'fileProcessor':
                    this.modules.fileProcessor = this.setupFileProcessor();
                    break;
                case 'canvasRenderer':
                    this.modules.canvasRenderer = this.setupCanvasRenderer();
                    break;
                case 'downloadManager':
                    this.modules.downloadManager = this.setupDownloadManager();
                    break;
                case 'responsiveHandler':
                    this.modules.responsiveHandler = this.setupResponsiveHandlers();
                    break;
            }
        } catch (error) {
            console.error(`❌ 修復模組 ${moduleName} 失敗:`, error);
        }
    }

    /**
     * 是否為除錯模式
     */
    isDebugMode() {
        return localStorage.getItem('watermark-debug') === 'true' || 
               new URLSearchParams(window.location.search).has('debug');
    }

    /**
     * 重置為預設設定
     */
    resetToDefaultSettings() {
        console.log('🔄 重置為預設設定');
        
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
        
        // 應用到 UI
        this.applySettingsToUI();
        
        // 儲存預設設定
        this.saveUserSettings();
    }

    /**
     * 應用 UI 設定
     */
    _applyUISettings() {
        // 根據 UI 設定調整介面
        const uiSettings = this.getSetting('ui', {});
        
        if (uiSettings.theme) {
            document.body.setAttribute('data-theme', uiSettings.theme);
        }
        
        if (uiSettings.compactMode) {
            document.body.classList.toggle('compact-mode', uiSettings.compactMode);
        }
    }

    /**
     * 應用效能設定
     */
    _applyPerformanceSettings() {
        const perfSettings = this.getSetting('performance', {});
        
        // 調整渲染品質
        if (perfSettings.renderQuality) {
            this.renderQuality = perfSettings.renderQuality;
        }
        
        // 調整防抖動延遲
        if (perfSettings.debounceDelay) {
            this.defaultDebounceDelay = perfSettings.debounceDelay;
        }
    }

    /**
     * 清理資源
     */
    cleanup() {
        console.log('🧹 清理應用程式資源...');
        
        // 清理計時器
        if (this.performanceInterval) {
            clearInterval(this.performanceInterval);
        }
        
        if (this.healthCheckInterval) {
            clearInterval(this.healthCheckInterval);
        }
        
        // 清理防抖動和節流計時器
        this.debounceTimers.forEach(timerId => clearTimeout(timerId));
        this.throttleTimers.forEach(timerId => clearTimeout(timerId));
        
        // 清理 Canvas 資源
        if (this.offscreenCanvas) {
            this.offscreenCanvas.width = 1;
            this.offscreenCanvas.height = 1;
        }
        
        // 清理快取
        if (this.imageDataCache) {
            this.imageDataCache.clear();
        }
        
        // 移除事件監聽器
        if (this.eventBus) {
            this.eventBus.removeEventListener('settings-changed', this.handleSettingsChange);
            this.eventBus.removeEventListener('image-processed', this.handleImageProcessed);
            this.eventBus.removeEventListener('error-occurred', this.handleModuleError);
        }
        
        console.log('✅ 資源清理完成');
    }

    /**
     * UX 優化功能 - 動畫和過渡效果
     */
    setupUXEnhancements() {
        console.log('🎨 設定 UX 增強功能...');
        
        // 設定頁面載入動畫
        this.setupPageLoadAnimations();
        
        // 設定互動回饋
        this.setupInteractionFeedback();
        
        // 設定無障礙功能
        this.setupAccessibilityFeatures();
        
        // 設定效能監控 UI
        this.setupPerformanceUI();
        
        // 設定載入狀態管理
        this.setupLoadingStateManager();
        
        console.log('✅ UX 增強功能設定完成');
    }

    /**
     * 設定頁面載入動畫
     */
    setupPageLoadAnimations() {
        // 為主要區塊添加載入動畫
        const animateElements = [
            { selector: 'header', animation: 'slide-in-left', delay: 0 },
            { selector: '#upload-section', animation: 'fade-in', delay: 100 },
            { selector: '#preview-area', animation: 'scale-in', delay: 200 },
            { selector: '#control-panel', animation: 'slide-in-right', delay: 300 },
            { selector: 'footer', animation: 'fade-in', delay: 400 }
        ];

        animateElements.forEach(({ selector, animation, delay }) => {
            const element = document.querySelector(selector);
            if (element) {
                setTimeout(() => {
                    element.classList.add(animation);
                }, delay);
            }
        });

        // 為按鈕添加互動動畫
        const buttons = document.querySelectorAll('.btn');
        buttons.forEach(btn => {
            btn.classList.add('interactive-feedback', 'enhanced-hover');
        });

        // 為表單控制項添加焦點增強
        const formControls = document.querySelectorAll('.form-control, .form-select, .form-range');
        formControls.forEach(control => {
            control.classList.add('focus-enhanced');
        });
    }

    /**
     * 設定互動回饋
     */
    setupInteractionFeedback() {
        // 檔案拖放視覺回饋增強
        const uploadSection = document.getElementById('upload-section');
        if (uploadSection) {
            uploadSection.addEventListener('dragenter', (e) => {
                e.preventDefault();
                uploadSection.classList.add('state-processing');
                this.showDragFeedback('準備接收檔案...');
            });

            uploadSection.addEventListener('dragleave', (e) => {
                e.preventDefault();
                if (!uploadSection.contains(e.relatedTarget)) {
                    uploadSection.classList.remove('state-processing');
                    this.hideDragFeedback();
                }
            });

            uploadSection.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadSection.classList.remove('state-processing');
                uploadSection.classList.add('state-success');
                this.showDragFeedback('檔案接收成功！', 'success');
                
                setTimeout(() => {
                    uploadSection.classList.remove('state-success');
                    this.hideDragFeedback();
                }, 2000);
            });
        }

        // 按鈕點擊回饋
        document.addEventListener('click', (e) => {
            if (e.target.matches('.btn')) {
                this.addClickFeedback(e.target);
            }
        });

        // 表單輸入即時驗證回饋
        const inputs = document.querySelectorAll('input, select, textarea');
        inputs.forEach(input => {
            input.addEventListener('input', (e) => {
                this.debounce(`validate-${input.id}`, () => {
                    this.validateInputWithFeedback(input);
                }, 300);
            });

            input.addEventListener('blur', () => {
                this.validateInputWithFeedback(input);
            });
        });
    }

    /**
     * 設定無障礙功能
     */
    setupAccessibilityFeatures() {
        // 添加跳過連結
        this.addSkipLinks();
        
        // 設定鍵盤導航
        this.setupKeyboardNavigation();
        
        // 設定螢幕閱讀器支援
        this.setupScreenReaderSupport();
        
        // 設定高對比模式檢測
        this.setupHighContrastMode();
        
        // 設定動畫偏好檢測
        this.setupMotionPreferences();
    }

    /**
     * 添加跳過連結
     */
    addSkipLinks() {
        const skipLink = document.createElement('a');
        skipLink.href = '#main-content';
        skipLink.className = 'skip-link';
        skipLink.textContent = '跳到主要內容';
        
        document.body.insertBefore(skipLink, document.body.firstChild);
        
        // 為主要內容添加 ID
        const mainContent = document.querySelector('main');
        if (mainContent) {
            mainContent.id = 'main-content';
            mainContent.setAttribute('tabindex', '-1');
        }
    }

    /**
     * 設定鍵盤導航
     */
    setupKeyboardNavigation() {
        // 檢測鍵盤使用
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                document.body.classList.add('keyboard-navigation');
            }
        });

        document.addEventListener('mousedown', () => {
            document.body.classList.remove('keyboard-navigation');
        });

        // 鍵盤快捷鍵
        document.addEventListener('keydown', (e) => {
            // Alt + U: 上傳檔案
            if (e.altKey && e.key === 'u') {
                e.preventDefault();
                const fileInput = document.getElementById('file-input');
                if (fileInput) {
                    fileInput.click();
                    this.announceToScreenReader('開啟檔案選擇對話框');
                }
            }

            // Alt + D: 下載圖片
            if (e.altKey && e.key === 'd') {
                e.preventDefault();
                const downloadBtn = document.getElementById('download-btn');
                if (downloadBtn && !downloadBtn.disabled) {
                    downloadBtn.click();
                    this.announceToScreenReader('開始下載圖片');
                }
            }

            // Escape: 關閉對話框或取消操作
            if (e.key === 'Escape') {
                this.handleEscapeKey();
            }
        });
    }

    /**
     * 設定螢幕閱讀器支援
     */
    setupScreenReaderSupport() {
        // 創建狀態公告區域
        const announcer = document.createElement('div');
        announcer.id = 'status-announcer';
        announcer.className = 'status-announcer';
        announcer.setAttribute('aria-live', 'polite');
        announcer.setAttribute('aria-atomic', 'true');
        document.body.appendChild(announcer);

        // 為重要元素添加 ARIA 標籤
        this.enhanceARIALabels();
    }

    /**
     * 增強 ARIA 標籤
     */
    enhanceARIALabels() {
        // 上傳區域
        const uploadSection = document.getElementById('upload-section');
        if (uploadSection) {
            uploadSection.setAttribute('role', 'button');
            uploadSection.setAttribute('aria-label', '點擊或拖放圖片檔案到此區域上傳');
            uploadSection.setAttribute('tabindex', '0');
        }

        // 預覽區域
        const previewArea = document.getElementById('preview-area');
        if (previewArea) {
            previewArea.setAttribute('role', 'img');
            previewArea.setAttribute('aria-label', '圖片預覽區域');
        }

        // 控制面板
        const controlPanel = document.getElementById('control-panel');
        if (controlPanel) {
            controlPanel.setAttribute('role', 'region');
            controlPanel.setAttribute('aria-label', '浮水印設定控制面板');
        }

        // 範圍滑桿
        const ranges = document.querySelectorAll('input[type="range"]');
        ranges.forEach(range => {
            range.addEventListener('input', (e) => {
                const value = e.target.value;
                const label = e.target.previousElementSibling?.textContent || '數值';
                this.announceToScreenReader(`${label}已調整為 ${value}`);
            });
        });
    }

    /**
     * 向螢幕閱讀器公告訊息
     */
    announceToScreenReader(message) {
        const announcer = document.getElementById('status-announcer');
        if (announcer) {
            announcer.textContent = message;
            
            // 清除訊息以便下次公告
            setTimeout(() => {
                announcer.textContent = '';
            }, 1000);
        }
    }

    /**
     * 設定高對比模式
     */
    setupHighContrastMode() {
        // 檢測系統高對比偏好
        const highContrastQuery = window.matchMedia('(prefers-contrast: high)');
        
        const applyHighContrast = (matches) => {
            if (matches) {
                document.body.classList.add('high-contrast-mode');
                this.announceToScreenReader('已啟用高對比模式');
            } else {
                document.body.classList.remove('high-contrast-mode');
            }
        };

        applyHighContrast(highContrastQuery.matches);
        highContrastQuery.addEventListener('change', (e) => applyHighContrast(e.matches));

        // 手動切換高對比模式
        const toggleHighContrast = () => {
            const isHighContrast = document.body.classList.toggle('high-contrast-mode');
            this.announceToScreenReader(isHighContrast ? '已啟用高對比模式' : '已停用高對比模式');
            localStorage.setItem('high-contrast', isHighContrast.toString());
        };

        // 從本地儲存載入偏好
        const savedPreference = localStorage.getItem('high-contrast');
        if (savedPreference === 'true') {
            document.body.classList.add('high-contrast-mode');
        }
    }

    /**
     * 設定動畫偏好
     */
    setupMotionPreferences() {
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
        
        const applyMotionPreference = (matches) => {
            if (matches) {
                document.body.classList.add('reduced-motion');
                this.announceToScreenReader('已停用動畫效果');
            } else {
                document.body.classList.remove('reduced-motion');
            }
        };

        applyMotionPreference(motionQuery.matches);
        motionQuery.addEventListener('change', (e) => applyMotionPreference(e.matches));
    }

    /**
     * 設定效能監控 UI
     */
    setupPerformanceUI() {
        if (!this.isDebugMode()) return;

        const indicator = document.createElement('div');
        indicator.className = 'performance-indicator';
        indicator.id = 'performance-indicator';
        document.body.appendChild(indicator);

        // 定期更新效能指標
        setInterval(() => {
            this.updatePerformanceIndicator();
        }, 5000);
    }

    /**
     * 更新效能指標顯示
     */
    updatePerformanceIndicator() {
        const indicator = document.getElementById('performance-indicator');
        if (!indicator) return;

        const metrics = this.performanceMetrics;
        const memoryMB = Math.round(metrics.memoryUsage / 1024 / 1024);
        
        let status = 'good';
        if (memoryMB > 50 || metrics.errorCount > 5) {
            status = 'warning';
        }
        if (memoryMB > 100 || metrics.errorCount > 10) {
            status = 'poor';
        }

        indicator.className = `performance-indicator ${status} visible`;
        indicator.innerHTML = `
            <div>記憶體: ${memoryMB}MB</div>
            <div>渲染: ${metrics.renderCount}</div>
            <div>錯誤: ${metrics.errorCount}</div>
        `;

        // 5秒後隱藏
        setTimeout(() => {
            indicator.classList.remove('visible');
        }, 3000);
    }

    /**
     * 設定載入狀態管理
     */
    setupLoadingStateManager() {
        this.loadingStates = new Map();
    }

    /**
     * 顯示拖放回饋
     */
    showDragFeedback(message, type = 'info') {
        let feedback = document.getElementById('drag-feedback');
        if (!feedback) {
            feedback = document.createElement('div');
            feedback.id = 'drag-feedback';
            feedback.className = 'drag-feedback';
            document.body.appendChild(feedback);
        }

        feedback.textContent = message;
        feedback.className = `drag-feedback ${type} visible`;
        feedback.setAttribute('role', 'status');
        feedback.setAttribute('aria-live', 'polite');
    }

    /**
     * 隱藏拖放回饋
     */
    hideDragFeedback() {
        const feedback = document.getElementById('drag-feedback');
        if (feedback) {
            feedback.classList.remove('visible');
        }
    }

    /**
     * 添加點擊回饋
     */
    addClickFeedback(button) {
        button.classList.add('clicked');
        
        // 創建漣漪效果
        const ripple = document.createElement('span');
        ripple.className = 'ripple-effect';
        button.appendChild(ripple);

        setTimeout(() => {
            button.classList.remove('clicked');
            if (ripple.parentNode) {
                ripple.parentNode.removeChild(ripple);
            }
        }, 300);
    }

    /**
     * 輸入驗證回饋
     */
    validateInputWithFeedback(input) {
        const isValid = this.validateInput(input);
        
        // 移除現有狀態
        input.classList.remove('form-field-error', 'state-success', 'state-error');
        
        // 移除現有錯誤訊息
        const existingError = input.parentNode.querySelector('.field-error-message');
        if (existingError) {
            existingError.remove();
        }

        if (isValid) {
            input.classList.add('state-success');
            input.setAttribute('aria-invalid', 'false');
        } else {
            input.classList.add('form-field-error', 'state-error');
            input.setAttribute('aria-invalid', 'true');
            
            // 添加錯誤訊息
            const errorMessage = this.getInputErrorMessage(input);
            if (errorMessage) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'field-error-message';
                errorDiv.textContent = errorMessage;
                errorDiv.setAttribute('role', 'alert');
                input.parentNode.appendChild(errorDiv);
            }
        }
    }

    /**
     * 驗證輸入
     */
    validateInput(input) {
        switch (input.type) {
            case 'file':
                return input.files.length > 0;
            case 'text':
                return input.value.trim().length > 0;
            case 'range':
                const value = parseFloat(input.value);
                const min = parseFloat(input.min);
                const max = parseFloat(input.max);
                return value >= min && value <= max;
            default:
                return true;
        }
    }

    /**
     * 取得輸入錯誤訊息
     */
    getInputErrorMessage(input) {
        switch (input.type) {
            case 'file':
                return '請選擇一個檔案';
            case 'text':
                if (input.id === 'custom-text') {
                    return '請輸入浮水印文字';
                }
                return '此欄位為必填';
            case 'range':
                return '數值超出允許範圍';
            default:
                return '輸入無效';
        }
    }

    /**
     * 處理 Escape 鍵
     */
    handleEscapeKey() {
        // 關閉任何開啟的對話框
        const dialogs = document.querySelectorAll('.confirmation-dialog, .modal');
        dialogs.forEach(dialog => {
            if (dialog.style.display !== 'none') {
                dialog.style.display = 'none';
                this.announceToScreenReader('對話框已關閉');
            }
        });

        // 取消任何進行中的操作
        if (this.isDragging) {
            this.cancelDragOperation();
        }

        // 清除錯誤狀態
        this.clearErrorStates();
    }

    /**
     * 取消拖拽操作
     */
    cancelDragOperation() {
        this.isDragging = false;
        document.body.classList.remove('dragging');
        this.announceToScreenReader('拖拽操作已取消');
    }

    /**
     * 清除錯誤狀態
     */
    clearErrorStates() {
        const errorElements = document.querySelectorAll('.state-error, .form-field-error');
        errorElements.forEach(element => {
            element.classList.remove('state-error', 'form-field-error');
        });

        const errorMessages = document.querySelectorAll('.field-error-message');
        errorMessages.forEach(message => message.remove());
    }

    /**
     * 顯示確認對話框
     */
    showConfirmationDialog(title, message, onConfirm, onCancel) {
        const dialog = document.createElement('div');
        dialog.className = 'confirmation-dialog';
        dialog.setAttribute('role', 'dialog');
        dialog.setAttribute('aria-labelledby', 'dialog-title');
        dialog.setAttribute('aria-describedby', 'dialog-message');
        dialog.setAttribute('tabindex', '-1');

        dialog.innerHTML = `
            <div class="dialog-title" id="dialog-title">${title}</div>
            <div id="dialog-message">${message}</div>
            <div class="dialog-actions">
                <button type="button" class="btn btn-secondary" id="dialog-cancel">取消</button>
                <button type="button" class="btn btn-primary" id="dialog-confirm">確認</button>
            </div>
        `;

        document.body.appendChild(dialog);
        dialog.focus();

        // 事件處理
        const confirmBtn = dialog.querySelector('#dialog-confirm');
        const cancelBtn = dialog.querySelector('#dialog-cancel');

        confirmBtn.addEventListener('click', () => {
            document.body.removeChild(dialog);
            if (onConfirm) onConfirm();
        });

        cancelBtn.addEventListener('click', () => {
            document.body.removeChild(dialog);
            if (onCancel) onCancel();
        });

        // 鍵盤處理
        dialog.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(dialog);
                if (onCancel) onCancel();
            }
        });

        this.announceToScreenReader(`對話框已開啟：${title}`);
    }

    /**
     * 載入時間優化
     */
    optimizeLoadingTime() {
        // 預載入關鍵資源
        const criticalResources = [
            'https://cdn.jsdelivr.net/npm/bootstrap@5.3.2/dist/css/bootstrap.min.css',
            'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/font/bootstrap-icons.css'
        ];

        criticalResources.forEach(url => {
            const link = document.createElement('link');
            link.rel = 'preload';
            link.as = 'style';
            link.href = url;
            document.head.appendChild(link);
        });

        // 延遲載入非關鍵資源
        setTimeout(() => {
            this.loadNonCriticalResources();
        }, 1000);
    }

    /**
     * 載入非關鍵資源
     */
    loadNonCriticalResources() {
        // 延遲載入分析腳本、廣告等非關鍵資源
        console.log('📦 載入非關鍵資源...');
    }

    /**
     * 響應速度優化
     */
    optimizeResponseSpeed() {
        // 使用 requestIdleCallback 執行非關鍵任務
        if (window.requestIdleCallback) {
            requestIdleCallback(() => {
                this.performNonCriticalTasks();
            });
        } else {
            setTimeout(() => {
                this.performNonCriticalTasks();
            }, 100);
        }
    }

    /**
     * 執行非關鍵任務
     */
    performNonCriticalTasks() {
        // 預載入圖示字體
        this._preloadIconFont();
        
        // 初始化分析
        this._initializeAnalytics();
        
        // 設定效能監控
        this._setupPerformanceObserver();
    }

    /**
     * 預載入圖示字體
     */
    _preloadIconFont() {
        const link = document.createElement('link');
        link.rel = 'preload';
        link.as = 'font';
        link.type = 'font/woff2';
        link.crossOrigin = 'anonymous';
        link.href = 'https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.1/fonts/bootstrap-icons.woff2';
        document.head.appendChild(link);
    }

    /**
     * 初始化分析
     */
    _initializeAnalytics() {
        // 這裡可以初始化 Google Analytics 或其他分析工具
        console.log('📊 分析工具已初始化');
    }

    /**
     * 設定效能觀察器
     */
    _setupPerformanceObserver() {
        if ('PerformanceObserver' in window) {
            const observer = new PerformanceObserver((list) => {
                const entries = list.getEntries();
                entries.forEach(entry => {
                    if (entry.entryType === 'largest-contentful-paint') {
                        console.log('📊 LCP:', entry.startTime);
                    }
                    if (entry.entryType === 'first-input') {
                        console.log('📊 FID:', entry.processingStart - entry.startTime);
                    }
                });
            });

            observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input'] });
        }
    }

    /**
     * 處理全域錯誤
     */
    handleGlobalError(type, error, details = {}) {
        console.error(`${type}:`, error, details);
        
        this.errorState.hasError = true;
        this.errorState.lastError = error;
        this.errorState.errorCount++;

        // 顯示使用者友善的錯誤訊息
        this.showErrorAlert('系統錯誤', '發生未預期的錯誤，請重新整理頁面或稍後再試。', 'danger', {
            showRetry: true,
            retryAction: () => window.location.reload()
        });

        // 記錄錯誤到本地儲存以供除錯
        this.logErrorToStorage(type, error, details);
    }

    /**
     * 處理關鍵錯誤
     */
    handleCriticalError(message, error) {
        console.error('關鍵錯誤:', message, error);
        
        this.errorState.hasError = true;
        this.errorState.lastError = error;

        // 顯示關鍵錯誤訊息
        this.showErrorAlert('系統無法啟動', message + '，請重新整理頁面。', 'danger', {
            persistent: true,
            showRetry: true,
            retryAction: () => window.location.reload()
        });

        // 停用所有功能
        this.disableAllFeatures();
    }

    /**
     * 處理檔案上傳錯誤
     */
    handleFileError(error, file = null) {
        console.error('檔案錯誤:', error, file);

        let message = '檔案處理失敗';
        let suggestions = [];

        if (error.name === 'FileTypeError') {
            message = '不支援的檔案格式';
            suggestions = [
                '請選擇 JPG、PNG 或 GIF 格式的圖片',
                '確認檔案副檔名正確'
            ];
        } else if (error.name === 'FileSizeError') {
            message = '檔案過大';
            suggestions = [
                '請選擇小於 10MB 的圖片',
                '可以使用圖片壓縮工具減小檔案大小'
            ];
        } else if (error.name === 'FileReadError') {
            message = '檔案讀取失敗';
            suggestions = [
                '請確認檔案沒有損壞',
                '嘗試重新選擇檔案'
            ];
        }

        this.showErrorAlert(message, suggestions.join('，'), 'warning', {
            showRetry: true,
            retryAction: () => this.elements.fileInput.click()
        });

        // 重置上傳狀態
        this.resetUploadState();
    }

    /**
     * 處理圖片處理錯誤
     */
    handleImageProcessingError(error, context = '') {
        console.error('圖片處理錯誤:', error, context);

        let message = '圖片處理失敗';
        let suggestions = [];

        if (error.name === 'CanvasError') {
            message = 'Canvas 渲染失敗';
            suggestions = [
                '圖片可能過大或格式不相容',
                '嘗試使用較小的圖片'
            ];
        } else if (error.name === 'MemoryError') {
            message = '記憶體不足';
            suggestions = [
                '圖片尺寸過大',
                '請使用較小的圖片或關閉其他應用程式'
            ];
        } else if (error.name === 'WatermarkError') {
            message = '浮水印生成失敗';
            suggestions = [
                '請檢查浮水印設定',
                '嘗試使用不同的浮水印文字或位置'
            ];
        }

        this.showErrorAlert(message, suggestions.join('，'), 'warning', {
            showRetry: true,
            retryAction: () => this.retryImageProcessing()
        });
    }

    /**
     * 處理下載錯誤
     */
    handleDownloadError(error, format = '') {
        console.error('下載錯誤:', error, format);

        let message = '下載失敗';
        let suggestions = [];

        if (error.name === 'BrowserCompatibilityError') {
            message = '瀏覽器不支援直接下載';
            suggestions = [
                '請使用較新版本的瀏覽器',
                '或右鍵點擊圖片選擇「另存圖片」'
            ];
        } else if (error.name === 'FileGenerationError') {
            message = '圖片生成失敗';
            suggestions = [
                '請檢查圖片和浮水印設定',
                '嘗試重新生成圖片'
            ];
        }

        this.showErrorAlert(message, suggestions.join('，'), 'danger', {
            showRetry: true,
            retryAction: () => this.retryDownload(format)
        });

        // 隱藏下載狀態指示器
        this.hideDownloadStatus();
    }

    /**
     * 處理網路錯誤
     */
    handleNetworkError(error, context = '') {
        console.error('網路錯誤:', error, context);

        this.showErrorAlert('網路連線問題', '請檢查網路連線並重試。', 'warning', {
            showRetry: true,
            retryAction: () => this.retryLastAction()
        });
    }

    /**
     * 處理瀏覽器相容性錯誤
     */
    handleCompatibilityError(feature, error) {
        console.error('相容性錯誤:', feature, error);

        let message = `您的瀏覽器不支援 ${feature} 功能`;
        let suggestions = [];

        if (feature === 'Canvas') {
            suggestions = [
                '請使用支援 HTML5 Canvas 的現代瀏覽器',
                '建議使用 Chrome、Firefox、Safari 或 Edge'
            ];
        } else if (feature === 'File API') {
            suggestions = [
                '請使用支援檔案上傳的現代瀏覽器',
                '或嘗試重新整理頁面'
            ];
        }

        this.showErrorAlert(message, suggestions.join('，'), 'warning', {
            persistent: true
        });

        // 提供降級功能
        this.enableFallbackFeatures(feature);
    }

    /**
     * 顯示錯誤警告
     */
    showErrorAlert(title, message, type = 'danger', options = {}) {
        const {
            persistent = false,
            showRetry = false,
            retryAction = null,
            dismissible = true,
            autoHide = !persistent,
            hideDelay = 5000
        } = options;

        // 移除現有的錯誤警告
        this.hideErrorAlerts();

        // 創建錯誤警告元素
        const alertId = `error-alert-${Date.now()}`;
        const alertHtml = `
            <div id="${alertId}" class="alert alert-${type} ${dismissible ? 'alert-dismissible' : ''} fade show" role="alert">
                <div class="d-flex align-items-start">
                    <i class="bi bi-${this.getAlertIcon(type)} me-3 mt-1 flex-shrink-0"></i>
                    <div class="flex-grow-1">
                        <h6 class="alert-heading mb-2">${title}</h6>
                        <p class="mb-0">${message}</p>
                        ${showRetry ? `
                            <div class="mt-3">
                                <button type="button" class="btn btn-sm btn-outline-${type}" onclick="app.handleRetryAction('${alertId}')">
                                    <i class="bi bi-arrow-clockwise me-1"></i>
                                    重試
                                </button>
                            </div>
                        ` : ''}
                    </div>
                    ${dismissible ? `
                        <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="關閉"></button>
                    ` : ''}
                </div>
            </div>
        `;

        // 插入到頁面中
        const container = this.getErrorContainer();
        container.insertAdjacentHTML('beforeend', alertHtml);

        // 儲存重試動作
        if (retryAction) {
            this.retryActions = this.retryActions || {};
            this.retryActions[alertId] = retryAction;
        }

        // 自動隱藏
        if (autoHide && hideDelay > 0) {
            setTimeout(() => {
                this.hideErrorAlert(alertId);
            }, hideDelay);
        }

        // 添加動畫效果
        const alertElement = document.getElementById(alertId);
        if (alertElement) {
            alertElement.classList.add('slide-up');
        }

        console.log(`錯誤警告已顯示: ${title}`);
    }

    /**
     * 取得警告圖示
     */
    getAlertIcon(type) {
        const icons = {
            danger: 'exclamation-triangle-fill',
            warning: 'exclamation-triangle',
            info: 'info-circle',
            success: 'check-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * 取得錯誤容器
     */
    getErrorContainer() {
        let container = document.getElementById('error-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'error-container';
            container.className = 'position-fixed top-0 start-50 translate-middle-x mt-3';
            container.style.cssText = 'z-index: 9999; max-width: 500px; width: 90%;';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * 隱藏錯誤警告
     */
    hideErrorAlert(alertId) {
        const alert = document.getElementById(alertId);
        if (alert) {
            alert.classList.remove('show');
            setTimeout(() => {
                if (alert.parentNode) {
                    alert.remove();
                }
            }, 150);
        }

        // 清除重試動作
        if (this.retryActions && this.retryActions[alertId]) {
            delete this.retryActions[alertId];
        }
    }

    /**
     * 隱藏所有錯誤警告
     */
    hideErrorAlerts() {
        const container = document.getElementById('error-container');
        if (container) {
            const alerts = container.querySelectorAll('.alert');
            alerts.forEach(alert => {
                alert.classList.remove('show');
                setTimeout(() => {
                    if (alert.parentNode) {
                        alert.remove();
                    }
                }, 150);
            });
        }

        // 清除所有重試動作
        this.retryActions = {};
    }

    /**
     * 處理重試動作
     */
    handleRetryAction(alertId) {
        if (this.retryActions && this.retryActions[alertId]) {
            const retryAction = this.retryActions[alertId];
            
            // 隱藏錯誤警告
            this.hideErrorAlert(alertId);
            
            // 執行重試動作
            try {
                retryAction();
                this.errorState.retryCount++;
                console.log('重試動作已執行');
            } catch (error) {
                console.error('重試動作失敗:', error);
                this.showErrorAlert('重試失敗', '無法執行重試動作，請手動重新操作。', 'danger');
            }
        }
    }

    /**
     * 重試圖片處理
     */
    retryImageProcessing() {
        if (this.imageData && this.imageData.image) {
            try {
                this.updatePreview();
                this.showSuccessMessage('圖片處理已重試');
            } catch (error) {
                this.handleImageProcessingError(error, '重試處理');
            }
        } else {
            this.showErrorAlert('無法重試', '請重新上傳圖片。', 'warning');
        }
    }

    /**
     * 重試下載
     */
    retryDownload(format = '') {
        try {
            if (format) {
                this.downloadImage(format);
            } else {
                this.downloadImage();
            }
        } catch (error) {
            this.handleDownloadError(error, format);
        }
    }

    /**
     * 重試最後動作
     */
    retryLastAction() {
        // 這裡可以根據應用程式狀態決定重試什麼動作
        if (this.imageData) {
            this.retryImageProcessing();
        } else {
            this.elements.fileInput.click();
        }
    }

    /**
     * 重置上傳狀態
     */
    resetUploadState() {
        if (this.elements.fileInput) {
            this.elements.fileInput.value = '';
        }
        
        if (this.elements.uploadSection) {
            this.elements.uploadSection.classList.remove('loading');
        }
        
        this.hideLoadingSpinner();
    }

    /**
     * 停用所有功能
     */
    disableAllFeatures() {
        // 停用檔案輸入
        if (this.elements.fileInput) {
            this.elements.fileInput.disabled = true;
        }

        // 停用控制面板
        if (this.elements.controlPanel) {
            const inputs = this.elements.controlPanel.querySelectorAll('input, select, button');
            inputs.forEach(input => {
                input.disabled = true;
            });
        }

        // 停用下載按鈕
        if (this.elements.downloadBtn) {
            this.elements.downloadBtn.disabled = true;
        }

        console.log('所有功能已停用');
    }

    /**
     * 啟用降級功能
     */
    enableFallbackFeatures(feature) {
        if (feature === 'Canvas') {
            // 提供基本的圖片顯示功能
            this.enableBasicImageDisplay();
        } else if (feature === 'File API') {
            // 提供替代的檔案上傳方式
            this.enableAlternativeFileUpload();
        }

        console.log(`已啟用 ${feature} 的降級功能`);
    }

    /**
     * 啟用基本圖片顯示
     */
    enableBasicImageDisplay() {
        // 使用 img 元素替代 Canvas
        const previewArea = this.elements.previewArea;
        if (previewArea) {
            previewArea.innerHTML = `
                <div class="text-center">
                    <div class="alert alert-info" role="alert">
                        <i class="bi bi-info-circle me-2"></i>
                        您的瀏覽器不支援進階預覽功能，但仍可以查看圖片。
                    </div>
                    <img id="fallback-preview" class="img-fluid" style="max-height: 400px; display: none;" alt="圖片預覽">
                </div>
            `;
        }
    }

    /**
     * 啟用替代檔案上傳
     */
    enableAlternativeFileUpload() {
        const uploadSection = this.elements.uploadSection;
        if (uploadSection) {
            uploadSection.innerHTML = `
                <div class="card border-2 border-dashed h-100">
                    <div class="card-body text-center p-4">
                        <i class="bi bi-exclamation-triangle fs-1 text-warning mb-3"></i>
                        <h5 class="card-title">相容性模式</h5>
                        <p class="card-text text-muted">您的瀏覽器不支援拖放上傳，請使用下方按鈕選擇檔案。</p>
                        <button type="button" class="btn btn-primary btn-lg" onclick="document.getElementById('file-input').click()">
                            <i class="bi bi-folder2-open me-2"></i>
                            選擇圖片
                        </button>
                    </div>
                </div>
            `;
        }
    }

    /**
     * 記錄錯誤到本地儲存
     */
    logErrorToStorage(type, error, details = {}) {
        try {
            const errorLog = {
                timestamp: new Date().toISOString(),
                type: type,
                message: error.message || error.toString(),
                stack: error.stack,
                details: details,
                userAgent: navigator.userAgent,
                url: window.location.href
            };

            // 取得現有的錯誤記錄
            let errorLogs = [];
            try {
                const stored = localStorage.getItem('watermark-tool-errors');
                if (stored) {
                    errorLogs = JSON.parse(stored);
                }
            } catch (e) {
                console.warn('無法讀取錯誤記錄:', e);
            }

            // 添加新的錯誤記錄
            errorLogs.push(errorLog);

            // 保持最多 50 條記錄
            if (errorLogs.length > 50) {
                errorLogs = errorLogs.slice(-50);
            }

            // 儲存到本地儲存
            localStorage.setItem('watermark-tool-errors', JSON.stringify(errorLogs));
            
            console.log('錯誤已記錄到本地儲存');
        } catch (e) {
            console.warn('無法記錄錯誤到本地儲存:', e);
        }
    }

    /**
     * 顯示成功訊息
     */
    showSuccessMessage(message, autoHide = true) {
        this.showErrorAlert('成功', message, 'success', {
            autoHide: autoHide,
            hideDelay: 3000,
            showRetry: false
        });
    }

    /**
     * 顯示資訊訊息
     */
    showInfoMessage(message, autoHide = true) {
        this.showErrorAlert('提示', message, 'info', {
            autoHide: autoHide,
            hideDelay: 4000,
            showRetry: false
        });
    }

    /**
     * 顯示警告訊息
     */
    showWarningMessage(message, autoHide = true) {
        this.showErrorAlert('注意', message, 'warning', {
            autoHide: autoHide,
            hideDelay: 4000,
            showRetry: false
        });
    }

    /**
     * 檢查錯誤狀態
     */
    checkErrorState() {
        return {
            hasError: this.errorState.hasError,
            errorCount: this.errorState.errorCount,
            retryCount: this.errorState.retryCount,
            canRetry: this.errorState.retryCount < this.errorState.maxRetries
        };
    }

    /**
     * 重置錯誤狀態
     */
    resetErrorState() {
        this.errorState = {
            hasError: false,
            lastError: null,
            errorCount: 0,
            retryCount: 0,
            maxRetries: 3
        };
        
        this.hideErrorAlerts();
        console.log('錯誤狀態已重置');
    }

    /**
     * 初始化應用程式 - 整合版本
     */
    async init() {
        if (this.initializationPromise) {
            return this.initializationPromise;
        }

        this.initializationPromise = this._performInitialization();
        return this.initializationPromise;
    }

    /**
     * 執行初始化流程
     */
    async _performInitialization() {
        try {
            console.log('🚀 開始初始化圖片浮水印工具...');
            
            // 階段 1: 核心系統初始化
            await this._initializeCoreModules();
            
            // 階段 2: UI 和事件系統初始化
            await this._initializeUIModules();
            
            // 階段 3: 功能模組整合
            await this._integrateModules();
            
            // 階段 4: 最終驗證和優化
            await this._finalizeInitialization();
            
            this.isInitialized = true;
            console.log('✅ 圖片浮水印工具初始化完成');
            
            // 觸發初始化完成事件
            this._dispatchInitializationComplete();
            
        } catch (error) {
            console.error('❌ 初始化失敗:', error);
            this.handleCriticalError('應用程式初始化失敗', error);
            throw error;
        }
    }

    /**
     * 初始化核心模組
     */
    async _initializeCoreModules() {
        console.log('📦 初始化核心模組...');
        
        // 錯誤處理系統 - 最優先
        this.modules.errorHandler = this.setupErrorHandling();
        
        // 設定管理系統
        this.modules.settingsManager = this.setupSettingsManager();
        
        // 檔案處理模組
        this.modules.fileProcessor = this.setupFileProcessor();
        
        // Canvas 渲染模組
        this.modules.canvasRenderer = this.setupCanvasRenderer();
        
        // 下載管理模組
        this.modules.downloadManager = this.setupDownloadManager();
        
        console.log('✅ 核心模組初始化完成');
    }

    /**
     * 初始化 UI 模組
     */
    async _initializeUIModules() {
        console.log('🎨 初始化 UI 模組...');
        
        // 響應式處理器
        this.modules.responsiveHandler = this.setupResponsiveHandlers();
        
        // 事件監聽器
        this.setupEventListeners();
        
        // 嵌入模式檢查
        this.checkEmbeddedMode();
        
        // 預設選項初始化
        this.initializePresetOptions();
        
        console.log('✅ UI 模組初始化完成');
    }

    /**
     * 整合所有模組
     */
    async _integrateModules() {
        console.log('🔗 整合功能模組...');
        
        // 載入和應用使用者設定
        await this._loadAndApplySettings();
        
        // 設定模組間通訊
        this._setupModuleCommunication();
        
        // 設定效能監控
        this._setupPerformanceMonitoring();
        
        // 設定自動儲存機制
        this.setupAutoSave();
        
        // 設定 UX 增強功能
        this.setupUXEnhancements();
        
        // 優化載入時間和響應速度
        this.optimizeLoadingTime();
        this.optimizeResponseSpeed();
        
        console.log('✅ 模組整合完成');
    }

    /**
     * 最終化初始化
     */
    async _finalizeInitialization() {
        console.log('🏁 最終化初始化...');
        
        // 驗證所有模組狀態
        this._validateModuleIntegrity();
        
        // 執行初始化後優化
        this._performInitialOptimizations();
        
        // 設定健康檢查
        this._setupHealthCheck();
        
        console.log('✅ 初始化最終化完成');
    }

    /**
     * 載入和應用設定
     */
    async _loadAndApplySettings() {
        try {
            // 載入使用者設定
            this.loadUserSettings();
            
            // 確保設定一致性
            this.ensureSettingsConsistency();
            
            // 應用設定到 UI
            this.applySettingsToUI();
            
            console.log('✅ 設定載入和應用完成');
        } catch (error) {
            console.warn('⚠️ 設定載入失敗，使用預設設定:', error);
            this.resetToDefaultSettings();
        }
    }

    /**
     * 設定模組間通訊
     */
    _setupModuleCommunication() {
        // 建立事件匯流排
        this.eventBus = new EventTarget();
        
        // 設定模組間事件監聽
        this.eventBus.addEventListener('settings-changed', (e) => {
            this.handleSettingsChange(e.detail);
        });
        
        this.eventBus.addEventListener('image-processed', (e) => {
            this.handleImageProcessed(e.detail);
        });
        
        this.eventBus.addEventListener('error-occurred', (e) => {
            this.handleModuleError(e.detail);
        });
        
        console.log('✅ 模組通訊設定完成');
    }

    /**
     * 設定效能監控
     */
    _setupPerformanceMonitoring() {
        // 監控關鍵效能指標
        this.performanceMetrics = {
            initTime: performance.now(),
            renderCount: 0,
            errorCount: 0,
            memoryUsage: 0
        };
        
        // 定期收集效能數據
        this.performanceInterval = setInterval(() => {
            this._collectPerformanceMetrics();
        }, 30000); // 每30秒收集一次
        
        console.log('✅ 效能監控設定完成');
    }

    /**
     * 驗證模組完整性
     */
    _validateModuleIntegrity() {
        const requiredModules = ['errorHandler', 'settingsManager', 'fileProcessor', 'canvasRenderer', 'downloadManager'];
        const missingModules = [];
        
        for (const moduleName of requiredModules) {
            if (!this.modules[moduleName]) {
                missingModules.push(moduleName);
            }
        }
        
        if (missingModules.length > 0) {
            throw new Error(`缺少必要模組: ${missingModules.join(', ')}`);
        }
        
        console.log('✅ 模組完整性驗證通過');
    }

    /**
     * 執行初始化後優化
     */
    _performInitialOptimizations() {
        // 預載入常用資源
        this._preloadResources();
        
        // 優化 DOM 結構
        this._optimizeDOMStructure();
        
        // 設定記憶體管理
        this._setupMemoryManagement();
        
        console.log('✅ 初始化優化完成');
    }

    /**
     * 設定健康檢查
     */
    _setupHealthCheck() {
        this.healthCheckInterval = setInterval(() => {
            this._performHealthCheck();
        }, 60000); // 每分鐘檢查一次
        
        console.log('✅ 健康檢查設定完成');
    }

    /**
     * 觸發初始化完成事件
     */
    _dispatchInitializationComplete() {
        const event = new CustomEvent('watermark-app-ready', {
            detail: {
                version: '1.0',
                modules: Object.keys(this.modules),
                isEmbedded: this.isEmbedded,
                initTime: performance.now() - this.performanceMetrics.initTime
            }
        });
        
        window.dispatchEvent(event);
        
        // 如果在嵌入模式，通知父頁面
        if (this.isEmbedded) {
            this._notifyParentOfReadiness();
        }
    }

    /**
     * 設定 LocalStorage 設定管理系統
     */
    setupSettingsManager() {
        // 設定管理器配置
        this.settingsConfig = {
            storageKey: 'watermark-tool-settings',
            version: '1.0',
            maxStorageSize: 1024 * 1024, // 1MB 限制
            autoSaveDelay: 500 // 自動儲存延遲 (毫秒)
        };

        // 預設設定
        this.defaultSettings = {
            version: this.settingsConfig.version,
            watermark: {
                type: 'preset',
                text: '僅供身分驗證使用',
                presetType: 'taiwan-id',
                position: 'bottom-right',
                opacity: 0.5,
                fontSize: 24,
                color: '#ff0000'
            },
            ui: {
                theme: 'light',
                language: 'zh-TW',
                showHints: true,
                compactMode: false
            },
            advanced: {
                imageQuality: 0.9,
                maxImageSize: 10 * 1024 * 1024, // 10MB
                enableDebugMode: false,
                autoPreview: true
            },
            lastUsed: {
                timestamp: null,
                sessionCount: 0
            }
        };

        // 初始化設定狀態
        this.settingsState = {
            loaded: false,
            dirty: false,
            lastSaved: null,
            autoSaveTimer: null
        };

        console.log('LocalStorage 設定管理系統已設定');
    }

    /**
     * 載入使用者設定
     */
    loadUserSettings() {
        try {
            const stored = localStorage.getItem(this.settingsConfig.storageKey);
            
            if (!stored) {
                console.log('未找到儲存的設定，使用預設設定');
                this.userSettings = this.cloneSettings(this.defaultSettings);
                this.settingsState.loaded = true;
                return this.userSettings;
            }

            const parsedSettings = JSON.parse(stored);
            
            // 驗證設定格式和版本
            if (!this.validateSettings(parsedSettings)) {
                console.warn('設定格式無效，使用預設設定');
                this.userSettings = this.cloneSettings(this.defaultSettings);
                this.saveUserSettings(); // 儲存修正後的設定
                this.settingsState.loaded = true;
                return this.userSettings;
            }

            // 合併設定（處理新增的設定項目）
            this.userSettings = this.mergeSettings(this.defaultSettings, parsedSettings);
            
            // 更新最後使用時間和會話計數
            this.userSettings.lastUsed.timestamp = new Date().toISOString();
            this.userSettings.lastUsed.sessionCount = (this.userSettings.lastUsed.sessionCount || 0) + 1;
            
            this.settingsState.loaded = true;
            this.settingsState.lastSaved = Date.now();
            
            console.log('使用者設定已載入', this.userSettings);
            return this.userSettings;
            
        } catch (error) {
            console.error('載入設定時發生錯誤:', error);
            this.handleSettingsError('載入設定失敗', error);
            
            // 使用預設設定作為後備
            this.userSettings = this.cloneSettings(this.defaultSettings);
            this.settingsState.loaded = true;
            return this.userSettings;
        }
    }

    /**
     * 儲存使用者設定
     */
    saveUserSettings(immediate = false) {
        try {
            if (!this.userSettings) {
                console.warn('沒有設定可儲存');
                return false;
            }

            // 清除之前的自動儲存計時器
            if (this.settingsState.autoSaveTimer) {
                clearTimeout(this.settingsState.autoSaveTimer);
                this.settingsState.autoSaveTimer = null;
            }

            const saveAction = () => {
                try {
                    // 更新版本和時間戳
                    this.userSettings.version = this.settingsConfig.version;
                    this.userSettings.lastUsed.timestamp = new Date().toISOString();

                    const settingsJson = JSON.stringify(this.userSettings);
                    
                    // 檢查儲存大小限制
                    if (settingsJson.length > this.settingsConfig.maxStorageSize) {
                        throw new Error('設定資料過大，超過儲存限制');
                    }

                    localStorage.setItem(this.settingsConfig.storageKey, settingsJson);
                    
                    this.settingsState.dirty = false;
                    this.settingsState.lastSaved = Date.now();
                    
                    console.log('使用者設定已儲存');
                    return true;
                    
                } catch (error) {
                    console.error('儲存設定時發生錯誤:', error);
                    this.handleSettingsError('儲存設定失敗', error);
                    return false;
                }
            };

            if (immediate) {
                return saveAction();
            } else {
                // 延遲儲存以避免頻繁寫入
                this.settingsState.autoSaveTimer = setTimeout(saveAction, this.settingsConfig.autoSaveDelay);
                return true;
            }
            
        } catch (error) {
            console.error('設定儲存程序發生錯誤:', error);
            this.handleSettingsError('設定儲存程序失敗', error);
            return false;
        }
    }

    /**
     * 更新特定設定項目
     */
    updateSetting(path, value) {
        try {
            if (!this.userSettings) {
                console.warn('設定尚未載入，無法更新');
                return false;
            }

            // 使用路徑字串更新巢狀物件
            const pathArray = path.split('.');
            let current = this.userSettings;
            
            // 導航到目標物件
            for (let i = 0; i < pathArray.length - 1; i++) {
                const key = pathArray[i];
                if (!current[key] || typeof current[key] !== 'object') {
                    current[key] = {};
                }
                current = current[key];
            }
            
            // 設定值
            const finalKey = pathArray[pathArray.length - 1];
            const oldValue = current[finalKey];
            current[finalKey] = value;
            
            // 標記為需要儲存
            this.settingsState.dirty = true;
            
            console.log(`設定已更新: ${path} = ${value} (舊值: ${oldValue})`);
            
            // 自動儲存
            this.saveUserSettings();
            
            return true;
            
        } catch (error) {
            console.error('更新設定時發生錯誤:', error);
            this.handleSettingsError('更新設定失敗', error);
            return false;
        }
    }

    /**
     * 取得特定設定項目
     */
    getSetting(path, defaultValue = null) {
        try {
            if (!this.userSettings) {
                console.warn('設定尚未載入，返回預設值');
                return defaultValue;
            }

            const pathArray = path.split('.');
            let current = this.userSettings;
            
            for (const key of pathArray) {
                if (current === null || current === undefined || typeof current !== 'object') {
                    return defaultValue;
                }
                current = current[key];
            }
            
            return current !== undefined ? current : defaultValue;
            
        } catch (error) {
            console.error('取得設定時發生錯誤:', error);
            return defaultValue;
        }
    }

    /**
     * 重置設定為預設值
     */
    resetSettings(category = null) {
        try {
            if (category) {
                // 重置特定類別
                if (this.defaultSettings[category]) {
                    this.userSettings[category] = this.cloneSettings(this.defaultSettings[category]);
                    console.log(`${category} 設定已重置為預設值`);
                } else {
                    console.warn(`未知的設定類別: ${category}`);
                    return false;
                }
            } else {
                // 重置所有設定
                this.userSettings = this.cloneSettings(this.defaultSettings);
                console.log('所有設定已重置為預設值');
            }
            
            this.settingsState.dirty = true;
            this.saveUserSettings(true); // 立即儲存
            
            // 觸發設定重置事件
            this.onSettingsReset(category);
            
            return true;
            
        } catch (error) {
            console.error('重置設定時發生錯誤:', error);
            this.handleSettingsError('重置設定失敗', error);
            return false;
        }
    }

    /**
     * 驗證設定格式
     */
    validateSettings(settings) {
        try {
            if (!settings || typeof settings !== 'object') {
                return false;
            }

            // 檢查必要的設定結構
            const requiredKeys = ['version', 'watermark', 'ui', 'advanced', 'lastUsed'];
            for (const key of requiredKeys) {
                if (!settings.hasOwnProperty(key)) {
                    console.warn(`缺少必要的設定鍵: ${key}`);
                    return false;
                }
            }

            // 檢查浮水印設定
            const watermark = settings.watermark;
            if (!watermark || typeof watermark !== 'object') {
                return false;
            }

            const requiredWatermarkKeys = ['type', 'position', 'opacity', 'fontSize'];
            for (const key of requiredWatermarkKeys) {
                if (!watermark.hasOwnProperty(key)) {
                    console.warn(`缺少必要的浮水印設定: ${key}`);
                    return false;
                }
            }

            // 驗證數值範圍
            if (watermark.opacity < 0 || watermark.opacity > 1) {
                console.warn('透明度值超出範圍');
                return false;
            }

            if (watermark.fontSize < 8 || watermark.fontSize > 100) {
                console.warn('字體大小超出範圍');
                return false;
            }

            return true;
            
        } catch (error) {
            console.error('驗證設定時發生錯誤:', error);
            return false;
        }
    }

    /**
     * 合併設定（處理版本升級）
     */
    mergeSettings(defaultSettings, userSettings) {
        try {
            const merged = this.cloneSettings(defaultSettings);
            
            // 遞迴合併設定
            const mergeRecursive = (target, source) => {
                for (const key in source) {
                    if (source.hasOwnProperty(key)) {
                        if (target.hasOwnProperty(key) && 
                            typeof target[key] === 'object' && 
                            typeof source[key] === 'object' &&
                            target[key] !== null && 
                            source[key] !== null &&
                            !Array.isArray(target[key]) && 
                            !Array.isArray(source[key])) {
                            mergeRecursive(target[key], source[key]);
                        } else {
                            target[key] = source[key];
                        }
                    }
                }
            };
            
            mergeRecursive(merged, userSettings);
            
            console.log('設定已合併');
            return merged;
            
        } catch (error) {
            console.error('合併設定時發生錯誤:', error);
            return this.cloneSettings(defaultSettings);
        }
    }

    /**
     * 深度複製設定物件
     */
    cloneSettings(settings) {
        try {
            return JSON.parse(JSON.stringify(settings));
        } catch (error) {
            console.error('複製設定時發生錯誤:', error);
            return {};
        }
    }

    /**
     * 匯出設定
     */
    exportSettings() {
        try {
            if (!this.userSettings) {
                throw new Error('沒有設定可匯出');
            }

            const exportData = {
                ...this.userSettings,
                exportedAt: new Date().toISOString(),
                exportVersion: this.settingsConfig.version
            };

            const dataStr = JSON.stringify(exportData, null, 2);
            const dataBlob = new Blob([dataStr], { type: 'application/json' });
            
            const url = URL.createObjectURL(dataBlob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `watermark-tool-settings-${new Date().toISOString().split('T')[0]}.json`;
            
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            URL.revokeObjectURL(url);
            
            console.log('設定已匯出');
            this.showSuccessMessage('設定已匯出到檔案');
            
            return true;
            
        } catch (error) {
            console.error('匯出設定時發生錯誤:', error);
            this.handleSettingsError('匯出設定失敗', error);
            return false;
        }
    }

    /**
     * 匯入設定
     */
    importSettings(file) {
        return new Promise((resolve, reject) => {
            try {
                const reader = new FileReader();
                
                reader.onload = (e) => {
                    try {
                        const importedData = JSON.parse(e.target.result);
                        
                        // 驗證匯入的設定
                        if (!this.validateSettings(importedData)) {
                            throw new Error('匯入的設定格式無效');
                        }
                        
                        // 合併匯入的設定
                        this.userSettings = this.mergeSettings(this.defaultSettings, importedData);
                        this.settingsState.dirty = true;
                        
                        // 儲存設定
                        this.saveUserSettings(true);
                        
                        // 應用設定到 UI
                        this.applySettingsToUI();
                        
                        console.log('設定已匯入');
                        this.showSuccessMessage('設定已成功匯入');
                        
                        resolve(true);
                        
                    } catch (parseError) {
                        console.error('解析匯入檔案時發生錯誤:', parseError);
                        this.handleSettingsError('匯入檔案格式錯誤', parseError);
                        reject(parseError);
                    }
                };
                
                reader.onerror = (error) => {
                    console.error('讀取匯入檔案時發生錯誤:', error);
                    this.handleSettingsError('讀取匯入檔案失敗', error);
                    reject(error);
                };
                
                reader.readAsText(file);
                
            } catch (error) {
                console.error('匯入設定時發生錯誤:', error);
                this.handleSettingsError('匯入設定失敗', error);
                reject(error);
            }
        });
    }

    /**
     * 清除所有儲存的設定
     */
    clearStoredSettings() {
        try {
            localStorage.removeItem(this.settingsConfig.storageKey);
            localStorage.removeItem('watermark-tool-errors'); // 同時清除錯誤記錄
            
            // 重置為預設設定
            this.userSettings = this.cloneSettings(this.defaultSettings);
            this.settingsState.dirty = false;
            this.settingsState.lastSaved = null;
            
            console.log('所有儲存的設定已清除');
            this.showSuccessMessage('所有設定已清除');
            
            return true;
            
        } catch (error) {
            console.error('清除設定時發生錯誤:', error);
            this.handleSettingsError('清除設定失敗', error);
            return false;
        }
    }

    /**
     * 取得設定統計資訊
     */
    getSettingsStats() {
        try {
            const stats = {
                loaded: this.settingsState.loaded,
                dirty: this.settingsState.dirty,
                lastSaved: this.settingsState.lastSaved,
                version: this.userSettings?.version || 'unknown',
                sessionCount: this.userSettings?.lastUsed?.sessionCount || 0,
                lastUsed: this.userSettings?.lastUsed?.timestamp || null,
                storageSize: 0,
                storageUsage: 0
            };

            // 計算儲存大小
            try {
                const stored = localStorage.getItem(this.settingsConfig.storageKey);
                if (stored) {
                    stats.storageSize = stored.length;
                    stats.storageUsage = (stats.storageSize / this.settingsConfig.maxStorageSize * 100).toFixed(2);
                }
            } catch (e) {
                console.warn('無法計算儲存大小:', e);
            }

            return stats;
            
        } catch (error) {
            console.error('取得設定統計時發生錯誤:', error);
            return null;
        }
    }

    /**
     * 處理設定相關錯誤
     */
    handleSettingsError(message, error) {
        console.error(`設定錯誤: ${message}`, error);
        
        // 記錄錯誤但不顯示給使用者（除非是關鍵錯誤）
        this.logErrorToStorage('SettingsError', error, { message });
        
        // 只有在關鍵錯誤時才顯示警告
        if (message.includes('載入') || message.includes('初始化')) {
            this.showWarningMessage(`${message}，將使用預設設定`);
        }
    }

    /**
     * 設定重置事件處理
     */
    onSettingsReset(category) {
        try {
            if (category === 'watermark' || !category) {
                // 重新應用浮水印設定到 UI
                this.applyWatermarkSettingsToUI();
            }
            
            if (category === 'ui' || !category) {
                // 重新應用 UI 設定
                this.applyUISettingsToUI();
            }
            
            console.log(`設定重置事件已處理: ${category || 'all'}`);
            
        } catch (error) {
            console.error('處理設定重置事件時發生錯誤:', error);
        }
    }

    /**
     * 應用浮水印設定到 UI
     */
    applyWatermarkSettingsToUI() {
        try {
            if (!this.userSettings || !this.userSettings.watermark) {
                console.warn('浮水印設定不存在，無法應用到 UI');
                return;
            }

            const watermarkSettings = this.userSettings.watermark;

            // 應用浮水印類型
            if (watermarkSettings.type) {
                const typeRadio = document.querySelector(`input[name="watermark-type"][value="${watermarkSettings.type}"]`);
                if (typeRadio) {
                    typeRadio.checked = true;
                    this.watermarkConfig.type = watermarkSettings.type;
                    
                    // 根據類型顯示對應的選項
                    if (watermarkSettings.type === 'preset') {
                        this.elements.presetOptions?.classList.remove('d-none');
                        this.elements.customOptions?.classList.add('d-none');
                    } else {
                        this.elements.presetOptions?.classList.add('d-none');
                        this.elements.customOptions?.classList.remove('d-none');
                    }
                }
            }

            // 應用預設類型
            if (watermarkSettings.presetType && this.elements.presetSelect) {
                this.elements.presetSelect.value = watermarkSettings.presetType;
                this.watermarkConfig.presetType = watermarkSettings.presetType;
            }

            // 應用自訂文字
            if (watermarkSettings.text !== undefined && this.elements.customText) {
                this.elements.customText.value = watermarkSettings.text;
                this.watermarkConfig.text = watermarkSettings.text;
            }

            // 應用透明度
            if (watermarkSettings.opacity !== undefined && this.elements.opacityRange) {
                this.elements.opacityRange.value = watermarkSettings.opacity * 100;
                this.watermarkConfig.opacity = watermarkSettings.opacity;
                if (this.elements.opacityValue) {
                    this.elements.opacityValue.textContent = Math.round(watermarkSettings.opacity * 100) + '%';
                }
            }

            // 應用字體大小
            if (watermarkSettings.fontSize && this.elements.fontsizeRange) {
                this.elements.fontsizeRange.value = watermarkSettings.fontSize;
                this.watermarkConfig.fontSize = watermarkSettings.fontSize;
                if (this.elements.fontsizeValue) {
                    this.elements.fontsizeValue.textContent = watermarkSettings.fontSize + 'px';
                }
            }

            // 應用位置
            if (watermarkSettings.position) {
                const positionRadio = document.querySelector(`input[name="position"][value="${watermarkSettings.position}"]`);
                if (positionRadio) {
                    positionRadio.checked = true;
                    this.watermarkConfig.position = watermarkSettings.position;
                }
            }

            // 應用顏色
            if (watermarkSettings.color) {
                this.watermarkConfig.color = watermarkSettings.color;
            }

            // 應用自訂位置座標
            if (watermarkSettings.x !== undefined) {
                this.watermarkConfig.x = watermarkSettings.x;
            }
            if (watermarkSettings.y !== undefined) {
                this.watermarkConfig.y = watermarkSettings.y;
            }

            console.log('浮水印設定已應用到 UI');

        } catch (error) {
            console.error('應用浮水印設定到 UI 時發生錯誤:', error);
        }
    }

    /**
     * 應用 UI 設定到介面
     */
    applyUISettingsToUI() {
        try {
            if (!this.userSettings || !this.userSettings.ui) {
                console.warn('UI 設定不存在，無法應用到介面');
                return;
            }

            const uiSettings = this.userSettings.ui;

            // 應用主題設定
            if (uiSettings.theme) {
                document.body.setAttribute('data-theme', uiSettings.theme);
            }

            // 應用緊湊模式
            if (uiSettings.compactMode !== undefined) {
                document.body.classList.toggle('compact-mode', uiSettings.compactMode);
            }

            // 應用提示顯示設定
            if (uiSettings.showHints !== undefined) {
                document.body.classList.toggle('hide-hints', !uiSettings.showHints);
            }

            console.log('UI 設定已應用到介面');

        } catch (error) {
            console.error('應用 UI 設定到介面時發生錯誤:', error);
        }
    }

    /**
     * 應用所有設定到 UI
     */
    applySettingsToUI() {
        try {
            if (!this.userSettings) {
                console.warn('設定尚未載入，無法應用到 UI');
                return;
            }

            // 等待 DOM 元素載入完成
            if (document.readyState === 'loading') {
                document.addEventListener('DOMContentLoaded', () => {
                    this.applySettingsToUI();
                });
                return;
            }

            // 應用浮水印設定
            this.applyWatermarkSettingsToUI();
            
            // 應用 UI 設定
            this.applyUISettingsToUI();

            console.log('所有設定已應用到 UI');

        } catch (error) {
            console.error('應用設定到 UI 時發生錯誤:', error);
        }
    }

    /**
     * 同步浮水印配置到設定系統
     */
    syncWatermarkConfigToSettings() {
        try {
            if (!this.userSettings || !this.watermarkConfig) {
                return;
            }

            // 更新浮水印設定
            this.updateSetting('watermark.type', this.watermarkConfig.type);
            this.updateSetting('watermark.text', this.watermarkConfig.text);
            this.updateSetting('watermark.presetType', this.watermarkConfig.presetType);
            this.updateSetting('watermark.position', this.watermarkConfig.position);
            this.updateSetting('watermark.opacity', this.watermarkConfig.opacity);
            this.updateSetting('watermark.fontSize', this.watermarkConfig.fontSize);
            this.updateSetting('watermark.color', this.watermarkConfig.color);

            console.log('浮水印配置已同步到設定系統');

        } catch (error) {
            console.error('同步浮水印配置時發生錯誤:', error);
        }
    }

    /**
     * 更新浮水印配置並自動儲存設定
     */
    updateWatermarkConfig(property, value) {
        try {
            if (!this.watermarkConfig) {
                console.warn('浮水印配置不存在');
                return false;
            }

            // 更新本地配置
            this.watermarkConfig[property] = value;

            // 同步到設定系統
            this.updateSetting(`watermark.${property}`, value);

            console.log(`浮水印配置已更新: ${property} = ${value}`);
            return true;

        } catch (error) {
            console.error('更新浮水印配置時發生錯誤:', error);
            return false;
        }
    }

    /**
     * 提供設定重置功能的公開介面
     */
    resetSettingsUI(category = null) {
        try {
            // 顯示確認對話框
            const categoryText = category ? `${category} ` : '';
            const confirmMessage = `確定要重置${categoryText}設定為預設值嗎？此操作無法復原。`;
            
            if (confirm(confirmMessage)) {
                const success = this.resetSettings(category);
                
                if (success) {
                    this.showSuccessMessage(`${categoryText}設定已重置為預設值`);
                    
                    // 重新載入頁面以確保所有設定正確應用
                    setTimeout(() => {
                        window.location.reload();
                    }, 1500);
                } else {
                    this.showErrorAlert('重置失敗', '無法重置設定，請稍後再試。', 'danger');
                }
            }

        } catch (error) {
            console.error('重置設定 UI 操作失敗:', error);
            this.showErrorAlert('操作失敗', '重置設定時發生錯誤。', 'danger');
        }
    }

    /**
     * 取得設定狀態資訊
     */
    getSettingsInfo() {
        try {
            return {
                loaded: this.settingsState.loaded,
                dirty: this.settingsState.dirty,
                lastSaved: this.settingsState.lastSaved,
                version: this.userSettings?.version || 'unknown',
                sessionCount: this.userSettings?.lastUsed?.sessionCount || 0,
                lastUsed: this.userSettings?.lastUsed?.timestamp || null,
                storageSize: this.getStorageSize(),
                storageUsage: this.getStorageUsage()
            };
        } catch (error) {
            console.error('取得設定資訊時發生錯誤:', error);
            return null;
        }
    }

    /**
     * 取得儲存空間使用量
     */
    getStorageSize() {
        try {
            const settings = localStorage.getItem(this.settingsConfig.storageKey);
            return settings ? settings.length : 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * 取得儲存空間使用率
     */
    getStorageUsage() {
        try {
            const size = this.getStorageSize();
            const maxSize = this.settingsConfig.maxStorageSize;
            return maxSize > 0 ? (size / maxSize) * 100 : 0;
        } catch (error) {
            return 0;
        }
    }

    /**
     * 確保設定在不同會話間保持一致
     */
    ensureSettingsConsistency() {
        try {
            if (!this.userSettings) {
                console.warn('設定尚未載入，無法檢查一致性');
                return false;
            }

            let needsUpdate = false;

            // 檢查並修正缺失的設定項目
            const requiredPaths = [
                'watermark.type',
                'watermark.opacity',
                'watermark.fontSize',
                'watermark.position',
                'ui.theme',
                'ui.showHints',
                'advanced.imageQuality'
            ];

            for (const path of requiredPaths) {
                const value = this.getSetting(path);
                if (value === null || value === undefined) {
                    // 從預設設定中取得值
                    const defaultValue = this.getSetting(path, this.getDefaultValueForPath(path));
                    this.updateSetting(path, defaultValue);
                    needsUpdate = true;
                    console.log(`修正缺失的設定項目: ${path} = ${defaultValue}`);
                }
            }

            // 檢查數值範圍
            const opacity = this.getSetting('watermark.opacity');
            if (opacity < 0 || opacity > 1) {
                this.updateSetting('watermark.opacity', 0.5);
                needsUpdate = true;
                console.log('修正透明度數值範圍');
            }

            const fontSize = this.getSetting('watermark.fontSize');
            if (fontSize < 8 || fontSize > 100) {
                this.updateSetting('watermark.fontSize', 24);
                needsUpdate = true;
                console.log('修正字體大小範圍');
            }

            if (needsUpdate) {
                this.saveUserSettings(true);
                console.log('設定一致性檢查完成，已修正問題');
            }

            return true;

        } catch (error) {
            console.error('檢查設定一致性時發生錯誤:', error);
            return false;
        }
    }

    /**
     * 取得路徑的預設值
     */
    getDefaultValueForPath(path) {
        const pathArray = path.split('.');
        let current = this.defaultSettings;
        
        for (const key of pathArray) {
            if (current && typeof current === 'object' && current.hasOwnProperty(key)) {
                current = current[key];
            } else {
                return null;
            }
        }
        
        return current;
    }

    /**
     * 自動儲存設定變更
     */
    autoSaveSettings() {
        try {
            if (this.settingsState.dirty) {
                this.saveUserSettings();
                console.log('設定已自動儲存');
            }
        } catch (error) {
            console.error('自動儲存設定時發生錯誤:', error);
        }
    }

    /**
     * 設定定期自動儲存
     */
    setupAutoSave() {
        // 每30秒檢查一次是否需要自動儲存
        setInterval(() => {
            this.autoSaveSettings();
        }, 30000);

        // 頁面卸載時儲存設定
        window.addEventListener('beforeunload', () => {
            if (this.settingsState.dirty) {
                this.saveUserSettings(true);
            }
        });

        console.log('自動儲存機制已設定');
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
            
            // 自動儲存位置設定
            this.syncWatermarkConfigToSettings();
            
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
            
            // 自動儲存位置設定
            this.syncWatermarkConfigToSettings();
            
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
        try {
            // 重置錯誤狀態
            this.resetErrorState();
            
            // 檔案驗證
            if (!this.validateFile(file)) {
                return;
            }
            
            // 顯示檔案處理進度
            const progressIndicator = this.showFileProcessingProgress(file.name);
            
            // 顯示載入狀態
            this.showLoading(true, '正在讀取檔案...', {
                showProgress: true,
                progress: 10,
                showCancel: true,
                cancelAction: () => this.cancelCurrentOperation()
            });
            
            const reader = new FileReader();
            this.currentFileReader = reader; // 儲存引用以供取消使用
            
            reader.onload = (e) => {
                try {
                    this.showLoading(true, '正在載入圖片...', {
                        showProgress: true,
                        progress: 60
                    });
                    this.loadImage(e.target.result);
                } catch (error) {
                    this.handleFileError(new Error('FileReadError'), file);
                    this.showLoading(false);
                }
            };
            
            reader.onerror = (error) => {
                console.error('檔案讀取錯誤:', error);
                const fileError = new Error('檔案讀取失敗');
                fileError.name = 'FileReadError';
                this.handleFileError(fileError, file);
                this.showLoading(false);
            };
            
            reader.onabort = () => {
                console.warn('檔案讀取被中止');
                this.showWarningMessage('檔案讀取被中止');
                this.showLoading(false);
            };
            
            // 設定讀取超時
            const timeout = setTimeout(() => {
                reader.abort();
                const timeoutError = new Error('檔案讀取超時');
                timeoutError.name = 'FileReadError';
                this.handleFileError(timeoutError, file);
                this.showLoading(false);
            }, 30000); // 30秒超時
            
            reader.addEventListener('loadend', () => {
                clearTimeout(timeout);
            });
            
            // 開始讀取檔案
            reader.readAsDataURL(file);
            
            console.log('開始處理檔案:', {
                名稱: file.name,
                大小: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                類型: file.type
            });
            
        } catch (error) {
            console.error('檔案處理錯誤:', error);
            this.handleFileError(error, file);
            this.showLoading(false);
        }
    }

    /**
     * 驗證檔案
     */
    validateFile(file) {
        try {
            if (!file) {
                const error = new Error('未選擇檔案');
                error.name = 'FileTypeError';
                this.handleFileError(error);
                return false;
            }

            const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
            const maxSize = 10 * 1024 * 1024; // 10MB
            
            // 檢查檔案類型
            if (!validTypes.includes(file.type)) {
                const error = new Error('不支援的檔案格式');
                error.name = 'FileTypeError';
                this.handleFileError(error, file);
                return false;
            }
            
            // 檢查檔案大小
            if (file.size > maxSize) {
                const error = new Error('檔案過大');
                error.name = 'FileSizeError';
                this.handleFileError(error, file);
                return false;
            }
            
            // 檢查檔案是否為空
            if (file.size === 0) {
                const error = new Error('檔案為空');
                error.name = 'FileTypeError';
                this.handleFileError(error, file);
                return false;
            }
            
            // 檢查檔案名稱
            if (!file.name || file.name.trim() === '') {
                const error = new Error('檔案名稱無效');
                error.name = 'FileTypeError';
                this.handleFileError(error, file);
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('檔案驗證錯誤:', error);
            this.handleFileError(error, file);
            return false;
        }
    }

    /**
     * 載入圖片
     */
    loadImage(src) {
        try {
            if (!src) {
                throw new Error('圖片來源無效');
            }

            const img = new Image();
            this.currentImageLoad = img; // 儲存引用以供取消使用
            
            // 設定載入超時
            const timeout = setTimeout(() => {
                const timeoutError = new Error('圖片載入超時');
                timeoutError.name = 'ImageLoadError';
                this.handleImageProcessingError(timeoutError, '圖片載入');
                this.showLoading(false);
            }, 15000); // 15秒超時
            
            img.onload = () => {
                try {
                    clearTimeout(timeout);
                    
                    // 驗證圖片尺寸
                    if (img.naturalWidth === 0 || img.naturalHeight === 0) {
                        throw new Error('圖片尺寸無效');
                    }
                    
                    // 檢查圖片尺寸限制
                    const maxDimension = 8000; // 最大尺寸限制
                    if (img.naturalWidth > maxDimension || img.naturalHeight > maxDimension) {
                        const error = new Error('圖片尺寸過大');
                        error.name = 'MemoryError';
                        throw error;
                    }
                    
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
                    
                    // 顯示成功訊息
                    this.showSuccessMessage('圖片載入成功');
                    
                    console.log('圖片載入完成:', {
                        原始尺寸: `${this.imageData.originalWidth}x${this.imageData.originalHeight}`,
                        顯示尺寸: `${this.canvas.width}x${this.canvas.height}`,
                        長寬比: this.imageData.aspectRatio.toFixed(2)
                    });
                    
                } catch (error) {
                    console.error('圖片處理失敗:', error);
                    this.handleImageProcessingError(error, '圖片載入後處理');
                } finally {
                    this.showLoading(false);
                }
            };
            
            img.onerror = (error) => {
                clearTimeout(timeout);
                console.error('圖片載入錯誤:', error);
                
                const loadError = new Error('圖片載入失敗');
                loadError.name = 'ImageLoadError';
                this.handleImageProcessingError(loadError, '圖片載入');
                this.showLoading(false);
            };
            
            img.onabort = () => {
                clearTimeout(timeout);
                console.warn('圖片載入被中止');
                this.showWarningMessage('圖片載入被中止');
                this.showLoading(false);
            };
            
            // 開始載入圖片
            img.src = src;
            
        } catch (error) {
            console.error('載入圖片錯誤:', error);
            this.handleImageProcessingError(error, '圖片載入初始化');
            this.showLoading(false);
        }
    }

    /**
     * 設定 Canvas
     */
    setupCanvas(img) {
        try {
            // 取得 Canvas 元素和上下文
            this.canvas = this.elements.previewCanvas;
            
            if (!this.canvas) {
                throw new Error('找不到預覽 Canvas 元素');
            }
            
            this.context = this.canvas.getContext('2d');
            
            // 檢查 Canvas 支援
            if (!this.context) {
                const error = new Error('瀏覽器不支援 Canvas');
                error.name = 'CanvasError';
                throw error;
            }
            
            // 檢查 Canvas 功能
            try {
                this.context.createImageData(1, 1);
            } catch (e) {
                const error = new Error('Canvas 功能受限');
                error.name = 'CanvasError';
                throw error;
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
            
        } catch (error) {
            console.error('Canvas 設定錯誤:', error);
            this.handleCompatibilityError('Canvas', error);
            throw error;
        }
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
        this.updateWatermarkConfig('type', type);
        
        if (type === 'preset') {
            this.elements.presetOptions.classList.remove('d-none');
            this.elements.customOptions.classList.add('d-none');
            this.applyPresetWatermark(this.elements.presetSelect.value);
        } else {
            this.elements.presetOptions.classList.add('d-none');
            this.elements.customOptions.classList.remove('d-none');
            this.updateWatermarkConfig('text', this.elements.customText.value);
        }
        
        this.updatePreview();
        console.log('浮水印類型已變更:', type);
    }

    /**
     * 處理預設類型變更
     */
    handlePresetChange(e) {
        const presetType = e.target.value;
        this.updateWatermarkConfig('presetType', presetType);
        this.applyPresetWatermark(presetType);
        this.updatePreview();
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

        // 使用新的設定系統更新配置
        this.updateWatermarkConfig('text', preset.text);
        this.updateWatermarkConfig('fontSize', preset.fontSize);
        this.updateWatermarkConfig('color', preset.color);
        this.updateWatermarkConfig('opacity', preset.opacity);
        this.updateWatermarkConfig('position', preset.position);

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
        this.updateWatermarkConfig('text', e.target.value);
        this.updatePreview();
        console.log('自訂文字已變更:', e.target.value);
    }

    /**
     * 處理透明度變更
     */
    handleOpacityChange(e) {
        const opacity = parseInt(e.target.value) / 100;
        this.updateWatermarkConfig('opacity', opacity);
        this.elements.opacityValue.textContent = e.target.value + '%';
        this.updatePreview();
        console.log('透明度已變更:', opacity);
    }

    /**
     * 處理字體大小變更
     */
    handleFontsizeChange(e) {
        this.updateWatermarkConfig('fontSize', parseInt(e.target.value));
        this.elements.fontsizeValue.textContent = e.target.value + 'px';
        this.updatePreview();
        console.log('字體大小已變更:', e.target.value);
    }

    /**
     * 處理位置變更
     */
    handlePositionChange(e) {
        this.updateWatermarkConfig('position', e.target.value);
        // 重置自訂位置
        this.updateWatermarkConfig('x', 0);
        this.updateWatermarkConfig('y', 0);
        this.updatePreview();
        console.log('位置已變更:', e.target.value);
    }

    /**
     * 下載圖片
     */
    downloadImage(format = 'png') {
        try {
            if (!this.validateDownloadConditions()) {
                return;
            }
            
            // 顯示下載狀態
            this.showDownloadProgress(true, format);
            
            // 生成高品質圖片
            const imageData = this.generateHighQualityImage(format);
            
            // 生成檔名
            const filename = this.generateDownloadFilename(format);
            
            // 執行下載
            this.performDownload(imageData, filename);
            
            // 顯示成功回饋
            this.showDownloadSuccess(filename);
            
        } catch (error) {
            console.error('下載失敗:', error);
            this.handleDownloadError(error, format);
        } finally {
            this.showDownloadProgress(false);
        }
    }

    /**
     * 驗證下載條件
     */
    validateDownloadConditions() {
        try {
            if (!this.canvas) {
                const error = new Error('沒有可下載的圖片');
                error.name = 'FileGenerationError';
                this.handleDownloadError(error);
                return false;
            }
            
            if (!this.imageData || !this.imageData.image) {
                const error = new Error('圖片資料不完整，請重新上傳圖片');
                error.name = 'FileGenerationError';
                this.handleDownloadError(error);
                return false;
            }
            
            if (!this.context) {
                const error = new Error('Canvas 上下文無效');
                error.name = 'CanvasError';
                this.handleDownloadError(error);
                return false;
            }
            
            // 檢查瀏覽器下載支援
            if (!this.checkDownloadSupport()) {
                const error = new Error('瀏覽器不支援直接下載');
                error.name = 'BrowserCompatibilityError';
                this.handleDownloadError(error);
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.error('下載條件驗證錯誤:', error);
            this.handleDownloadError(error);
            return false;
        }
    }

    /**
     * 檢查下載支援
     */
    checkDownloadSupport() {
        try {
            // 檢查 Canvas toBlob 支援
            if (!this.canvas.toBlob) {
                return false;
            }
            
            // 檢查 URL.createObjectURL 支援
            if (!window.URL || !window.URL.createObjectURL) {
                return false;
            }
            
            // 檢查 document.createElement('a').download 支援
            const testLink = document.createElement('a');
            if (typeof testLink.download === 'undefined') {
                return false;
            }
            
            return true;
            
        } catch (error) {
            console.warn('下載支援檢查失敗:', error);
            return false;
        }
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
    showDownloadProgress(show, format = 'png') {
        const formatNames = {
            'png': 'PNG (高品質)',
            'jpg': 'JPG (較小檔案)',
            'jpeg': 'JPEG (較小檔案)'
        };
        
        const formatName = formatNames[format] || format.toUpperCase();
        
        if (show) {
            // 顯示詳細的下載進度
            this.showDownloadProgressSteps(formatName);
            
            // 同時顯示全域載入提示
            this.showLoading(true, `正在生成 ${formatName} 圖片...`, {
                showProgress: true,
                progress: 0,
                showCancel: true,
                cancelAction: () => this.cancelDownload(),
                type: 'success'
            });
            
            // 模擬下載進度
            this.simulateDownloadProgress();
            
        } else {
            this.hideDownloadProgressSteps();
            this.showLoading(false);
        }
    }

    /**
     * 顯示下載進度步驟
     */
    showDownloadProgressSteps(formatName) {
        const statusElement = this.elements.downloadStatus;
        const statusText = this.elements.downloadStatusText;
        
        if (statusElement && statusText) {
            statusText.textContent = `正在生成 ${formatName} 圖片`;
            statusElement.classList.remove('d-none');
            statusElement.classList.add('fade-in');
        }
        
        // 停用下載按鈕並顯示載入狀態
        this.setDownloadButtonState('loading');
    }

    /**
     * 隱藏下載進度步驟
     */
    hideDownloadProgressSteps() {
        const statusElement = this.elements.downloadStatus;
        
        if (statusElement) {
            statusElement.classList.add('d-none');
            statusElement.classList.remove('fade-in');
        }
        
        // 恢復下載按鈕狀態
        this.setDownloadButtonState('ready');
    }

    /**
     * 模擬下載進度
     */
    simulateDownloadProgress() {
        const steps = [
            { progress: 20, message: '正在處理圖片...' },
            { progress: 40, message: '正在應用浮水印...' },
            { progress: 60, message: '正在優化品質...' },
            { progress: 80, message: '正在生成檔案...' },
            { progress: 100, message: '準備下載...' }
        ];
        
        let currentStep = 0;
        
        const updateStep = () => {
            if (currentStep < steps.length) {
                const step = steps[currentStep];
                
                // 更新全域載入進度
                this.updateLoadingProgress(step.progress, 100);
                
                // 更新下載狀態文字
                const statusText = this.elements.downloadStatusText;
                if (statusText) {
                    statusText.textContent = step.message;
                }
                
                currentStep++;
                
                // 設定下一步的延遲
                const delay = currentStep === steps.length ? 500 : 800 + Math.random() * 400;
                setTimeout(updateStep, delay);
            }
        };
        
        // 開始進度更新
        setTimeout(updateStep, 300);
    }

    /**
     * 設定下載按鈕狀態
     */
    setDownloadButtonState(state) {
        const downloadBtn = this.elements.downloadBtn;
        const downloadOptionsBtn = this.elements.downloadOptionsBtn;
        
        if (!downloadBtn) return;
        
        // 清除所有狀態類別
        downloadBtn.classList.remove('btn-loading', 'btn-success-flash', 'btn-error-flash');
        
        switch (state) {
            case 'loading':
                downloadBtn.disabled = true;
                downloadBtn.classList.add('btn-loading');
                downloadBtn.innerHTML = `
                    <div class="spinner-border spinner-border-sm me-2" role="status">
                        <span class="visually-hidden">處理中...</span>
                    </div>
                    處理中...
                `;
                if (downloadOptionsBtn) {
                    downloadOptionsBtn.disabled = true;
                }
                break;
                
            case 'success':
                downloadBtn.classList.add('btn-success-flash');
                downloadBtn.innerHTML = `
                    <i class="bi bi-check-circle me-2"></i>
                    下載完成
                `;
                setTimeout(() => {
                    this.setDownloadButtonState('ready');
                }, 2000);
                break;
                
            case 'error':
                downloadBtn.classList.add('btn-error-flash');
                downloadBtn.innerHTML = `
                    <i class="bi bi-exclamation-triangle me-2"></i>
                    下載失敗
                `;
                setTimeout(() => {
                    this.setDownloadButtonState('ready');
                }, 2000);
                break;
                
            case 'ready':
            default:
                downloadBtn.disabled = false;
                downloadBtn.innerHTML = `
                    <i class="bi bi-download me-2"></i>
                    下載圖片
                `;
                if (downloadOptionsBtn) {
                    downloadOptionsBtn.disabled = false;
                }
                break;
        }
    }

    /**
     * 取消下載
     */
    cancelDownload() {
        console.log('使用者取消了下載操作');
        
        // 停止任何進行中的下載處理
        if (this.downloadTimeout) {
            clearTimeout(this.downloadTimeout);
            this.downloadTimeout = null;
        }
        
        // 重置下載狀態
        this.hideDownloadProgressSteps();
        this.setDownloadButtonState('ready');
        
        // 顯示取消訊息
        this.showInfoMessage('下載已取消');
    }

    /**
     * 顯示下載成功回饋
     */
    showDownloadSuccess(filename = '') {
        // 顯示成功狀態
        const successElement = this.elements.downloadSuccess;
        const successText = this.elements.downloadSuccessText;
        
        if (successElement && successText) {
            const message = filename ? 
                `圖片 "${filename}" 已成功儲存到您的裝置` : 
                '圖片已成功儲存到您的裝置';
                
            successText.textContent = message;
            successElement.classList.remove('d-none');
            successElement.classList.add('fade-in');
            
            // 自動隱藏成功訊息
            setTimeout(() => {
                successElement.classList.add('d-none');
                successElement.classList.remove('fade-in');
            }, 4000);
        }
        
        // 設定按鈕成功狀態
        this.setDownloadButtonState('success');
        
        // 顯示成功 Toast
        this.showSuccessToast('下載完成', filename ? 
            `檔案 "${filename}" 已儲存` : 
            '圖片已成功下載');
        
        // 啟用手機版下載功能
        this.enableMobileDownloadFeatures();
        
        console.log('下載成功回饋已顯示:', filename);
    }

    /**
     * 顯示操作進度指示器
     */
    showOperationProgress(operation, steps = []) {
        const progressContainer = this.getProgressContainer();
        
        const progressHtml = `
            <div class="operation-progress card shadow-sm border-0" id="operation-progress-${Date.now()}">
                <div class="card-body p-3">
                    <div class="d-flex align-items-center mb-2">
                        <div class="spinner-border spinner-border-sm text-primary me-3" role="status">
                            <span class="visually-hidden">處理中...</span>
                        </div>
                        <h6 class="mb-0">${operation}</h6>
                    </div>
                    <div class="progress mb-2" style="height: 6px;">
                        <div class="progress-bar progress-bar-striped progress-bar-animated" 
                             role="progressbar" 
                             style="width: 0%"
                             aria-valuenow="0" 
                             aria-valuemin="0" 
                             aria-valuemax="100">
                        </div>
                    </div>
                    <small class="text-muted operation-step">準備中...</small>
                </div>
            </div>
        `;
        
        progressContainer.insertAdjacentHTML('beforeend', progressHtml);
        const progressElement = progressContainer.lastElementChild;
        
        // 執行步驟
        if (steps.length > 0) {
            this.executeProgressSteps(progressElement, steps);
        }
        
        return progressElement;
    }

    /**
     * 執行進度步驟
     */
    executeProgressSteps(progressElement, steps) {
        let currentStep = 0;
        const progressBar = progressElement.querySelector('.progress-bar');
        const stepText = progressElement.querySelector('.operation-step');
        
        const executeStep = () => {
            if (currentStep < steps.length) {
                const step = steps[currentStep];
                const progress = ((currentStep + 1) / steps.length) * 100;
                
                // 更新進度條
                progressBar.style.width = `${progress}%`;
                progressBar.setAttribute('aria-valuenow', progress);
                
                // 更新步驟文字
                stepText.textContent = step.message || `步驟 ${currentStep + 1}`;
                
                // 執行步驟動作
                if (step.action && typeof step.action === 'function') {
                    try {
                        step.action();
                    } catch (error) {
                        console.error('步驟執行錯誤:', error);
                    }
                }
                
                currentStep++;
                
                // 設定下一步延遲
                const delay = step.delay || 800;
                setTimeout(executeStep, delay);
                
            } else {
                // 完成所有步驟
                this.completeOperationProgress(progressElement);
            }
        };
        
        // 開始執行步驟
        setTimeout(executeStep, 300);
    }

    /**
     * 完成操作進度
     */
    completeOperationProgress(progressElement) {
        const spinner = progressElement.querySelector('.spinner-border');
        const progressBar = progressElement.querySelector('.progress-bar');
        const stepText = progressElement.querySelector('.operation-step');
        
        // 更新為完成狀態
        spinner.classList.remove('spinner-border');
        spinner.innerHTML = '<i class="bi bi-check-circle-fill text-success"></i>';
        
        progressBar.classList.remove('progress-bar-striped', 'progress-bar-animated');
        progressBar.classList.add('bg-success');
        progressBar.style.width = '100%';
        
        stepText.textContent = '完成';
        stepText.classList.add('text-success');
        
        // 自動移除
        setTimeout(() => {
            progressElement.classList.add('fade-out');
            setTimeout(() => {
                if (progressElement.parentNode) {
                    progressElement.remove();
                }
            }, 300);
        }, 2000);
    }

    /**
     * 取得進度容器
     */
    getProgressContainer() {
        let container = document.getElementById('progress-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'progress-container';
            container.className = 'position-fixed bottom-0 end-0 p-3';
            container.style.cssText = 'z-index: 9998; max-width: 350px;';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * 顯示檔案處理進度
     */
    showFileProcessingProgress(filename) {
        const steps = [
            { message: '驗證檔案格式...', delay: 500 },
            { message: '讀取檔案內容...', delay: 800 },
            { message: '載入圖片資料...', delay: 1000 },
            { message: '初始化預覽...', delay: 600 },
            { message: '準備編輯工具...', delay: 400 }
        ];
        
        return this.showOperationProgress(`處理檔案: ${filename}`, steps);
    }

    /**
     * 顯示圖片載入進度
     */
    showImageLoadingProgress() {
        const steps = [
            { message: '解析圖片資料...', delay: 600 },
            { message: '計算顯示尺寸...', delay: 400 },
            { message: '設定 Canvas...', delay: 500 },
            { message: '渲染預覽...', delay: 700 }
        ];
        
        return this.showOperationProgress('載入圖片', steps);
    }

    /**
     * 顯示浮水印應用進度
     */
    showWatermarkProgress() {
        const steps = [
            { message: '計算浮水印位置...', delay: 300 },
            { message: '渲染浮水印文字...', delay: 500 },
            { message: '應用透明度效果...', delay: 400 },
            { message: '更新預覽...', delay: 300 }
        ];
        
        return this.showOperationProgress('應用浮水印', steps);
    }

    /**
     * 顯示系統狀態指示器
     */
    showSystemStatus(status, message, type = 'info') {
        const statusContainer = this.getSystemStatusContainer();
        
        const statusHtml = `
            <div class="system-status alert alert-${type} alert-dismissible fade show" role="alert">
                <div class="d-flex align-items-center">
                    <i class="bi bi-${this.getStatusIcon(type)} me-2"></i>
                    <div class="flex-grow-1">
                        <strong>${status}</strong>
                        <div class="small">${message}</div>
                    </div>
                    <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
                </div>
            </div>
        `;
        
        statusContainer.insertAdjacentHTML('beforeend', statusHtml);
        
        // 自動清理
        const statusElement = statusContainer.lastElementChild;
        setTimeout(() => {
            if (statusElement && statusElement.parentNode) {
                statusElement.classList.remove('show');
                setTimeout(() => {
                    if (statusElement.parentNode) {
                        statusElement.remove();
                    }
                }, 150);
            }
        }, 5000);
    }

    /**
     * 取得狀態圖示
     */
    getStatusIcon(type) {
        const icons = {
            success: 'check-circle-fill',
            warning: 'exclamation-triangle-fill',
            danger: 'x-circle-fill',
            info: 'info-circle-fill',
            primary: 'gear-fill'
        };
        return icons[type] || 'info-circle-fill';
    }

    /**
     * 取得系統狀態容器
     */
    getSystemStatusContainer() {
        let container = document.getElementById('system-status-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'system-status-container';
            container.className = 'position-fixed top-0 start-50 translate-middle-x mt-3';
            container.style.cssText = 'z-index: 9997; max-width: 500px; width: 90%;';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * 顯示成功 Toast
     */
    showSuccessToast(title, message, duration = 3000) {
        const toastHtml = `
            <div class="toast align-items-center text-white bg-success border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body d-flex align-items-center">
                        <i class="bi bi-check-circle-fill me-3"></i>
                        <div>
                            <div class="fw-bold">${title}</div>
                            <small>${message}</small>
                        </div>
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        const toastContainer = this.getToastContainer();
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);

        const toastElement = toastContainer.lastElementChild;
        const toast = new bootstrap.Toast(toastElement, {
            delay: duration
        });
        
        toast.show();

        // 自動清理
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });

        return toast;
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
    showLoading(show, message = '載入中...', options = {}) {
        const {
            showProgress = false,
            progress = 0,
            showCancel = false,
            cancelAction = null,
            persistent = false,
            type = 'primary'
        } = options;

        const spinner = this.elements.loadingSpinner;
        
        if (!spinner) {
            console.warn('載入指示器元素不存在');
            return;
        }

        if (show) {
            this.updateLoadingContent(message, {
                showProgress,
                progress,
                showCancel,
                cancelAction,
                type
            });
            
            // 顯示載入指示器
            spinner.classList.remove('d-none');
            spinner.classList.add('fade-in');
            
            // 設定持續性
            if (persistent) {
                spinner.setAttribute('data-persistent', 'true');
            } else {
                spinner.removeAttribute('data-persistent');
            }
            
            // 防止背景互動
            this.setBackgroundInteraction(false);
            
            console.log(`載入狀態已顯示: ${message}`);
            
        } else {
            // 隱藏載入指示器
            spinner.classList.add('d-none');
            spinner.classList.remove('fade-in');
            spinner.removeAttribute('data-persistent');
            
            // 恢復背景互動
            this.setBackgroundInteraction(true);
            
            // 清除載入狀態
            this.clearLoadingState();
            
            console.log('載入狀態已隱藏');
        }
    }

    /**
     * 更新載入內容
     */
    updateLoadingContent(message, options = {}) {
        const {
            showProgress = false,
            progress = 0,
            showCancel = false,
            cancelAction = null,
            type = 'primary'
        } = options;

        const spinner = this.elements.loadingSpinner;
        const cardBody = spinner.querySelector('.card-body');
        
        if (!cardBody) return;

        // 建立載入內容
        let content = `
            <div class="text-center">
                <div class="spinner-border text-${type} mb-3" role="status" style="width: 3rem; height: 3rem;">
                    <span class="visually-hidden">載入中...</span>
                </div>
                <h6 class="card-title mb-2">${message}</h6>
        `;

        // 添加進度條
        if (showProgress) {
            content += `
                <div class="progress mb-3" style="height: 8px;">
                    <div class="progress-bar progress-bar-striped progress-bar-animated bg-${type}" 
                         role="progressbar" 
                         style="width: ${Math.max(0, Math.min(100, progress))}%"
                         aria-valuenow="${progress}" 
                         aria-valuemin="0" 
                         aria-valuemax="100">
                    </div>
                </div>
                <small class="text-muted">進度: ${Math.round(progress)}%</small>
            `;
        } else {
            content += `
                <p class="card-text text-muted small mb-0">
                    <span class="loading-message">${message}</span>
                </p>
            `;
        }

        // 添加取消按鈕
        if (showCancel && cancelAction) {
            content += `
                <div class="mt-3">
                    <button type="button" class="btn btn-sm btn-outline-secondary" id="loading-cancel-btn">
                        <i class="bi bi-x-circle me-1"></i>
                        取消
                    </button>
                </div>
            `;
        }

        content += '</div>';
        cardBody.innerHTML = content;

        // 綁定取消按鈕事件
        if (showCancel && cancelAction) {
            const cancelBtn = cardBody.querySelector('#loading-cancel-btn');
            if (cancelBtn) {
                cancelBtn.addEventListener('click', () => {
                    try {
                        cancelAction();
                        this.showLoading(false);
                    } catch (error) {
                        console.error('取消操作失敗:', error);
                    }
                });
            }
        }
    }

    /**
     * 設定背景互動
     */
    setBackgroundInteraction(enabled) {
        const body = document.body;
        
        if (enabled) {
            body.classList.remove('loading-active');
            body.style.pointerEvents = '';
            body.style.userSelect = '';
        } else {
            body.classList.add('loading-active');
            body.style.pointerEvents = 'none';
            body.style.userSelect = 'none';
            
            // 載入指示器本身保持可互動
            const spinner = this.elements.loadingSpinner;
            if (spinner) {
                spinner.style.pointerEvents = 'auto';
            }
        }
    }

    /**
     * 清除載入狀態
     */
    clearLoadingState() {
        // 清除任何載入相關的狀態
        if (this.loadingTimeout) {
            clearTimeout(this.loadingTimeout);
            this.loadingTimeout = null;
        }
        
        if (this.progressInterval) {
            clearInterval(this.progressInterval);
            this.progressInterval = null;
        }
    }

    /**
     * 顯示進度載入
     */
    showProgressLoading(message, totalSteps = 100) {
        let currentStep = 0;
        
        this.showLoading(true, message, {
            showProgress: true,
            progress: 0,
            showCancel: true,
            cancelAction: () => {
                this.cancelCurrentOperation();
            }
        });

        // 模擬進度更新
        this.progressInterval = setInterval(() => {
            currentStep += Math.random() * 10;
            
            if (currentStep >= totalSteps) {
                currentStep = totalSteps;
                clearInterval(this.progressInterval);
                this.progressInterval = null;
            }
            
            this.updateLoadingProgress(currentStep, totalSteps);
        }, 200);

        return {
            updateProgress: (step) => this.updateLoadingProgress(step, totalSteps),
            complete: () => {
                if (this.progressInterval) {
                    clearInterval(this.progressInterval);
                    this.progressInterval = null;
                }
                this.showLoading(false);
            }
        };
    }

    /**
     * 更新載入進度
     */
    updateLoadingProgress(current, total) {
        const progress = Math.round((current / total) * 100);
        const spinner = this.elements.loadingSpinner;
        
        if (!spinner) return;

        const progressBar = spinner.querySelector('.progress-bar');
        const progressText = spinner.querySelector('small.text-muted');
        
        if (progressBar) {
            progressBar.style.width = `${progress}%`;
            progressBar.setAttribute('aria-valuenow', progress);
        }
        
        if (progressText) {
            progressText.textContent = `進度: ${progress}%`;
        }
    }

    /**
     * 顯示載入 Toast
     */
    showLoadingToast(message, duration = 3000) {
        const toastHtml = `
            <div class="toast align-items-center text-white bg-primary border-0" role="alert" aria-live="assertive" aria-atomic="true">
                <div class="d-flex">
                    <div class="toast-body d-flex align-items-center">
                        <div class="spinner-border spinner-border-sm me-3" role="status">
                            <span class="visually-hidden">載入中...</span>
                        </div>
                        ${message}
                    </div>
                    <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast"></button>
                </div>
            </div>
        `;

        const toastContainer = this.getToastContainer();
        toastContainer.insertAdjacentHTML('beforeend', toastHtml);

        const toastElement = toastContainer.lastElementChild;
        const toast = new bootstrap.Toast(toastElement, {
            delay: duration
        });
        
        toast.show();

        // 自動清理
        toastElement.addEventListener('hidden.bs.toast', () => {
            toastElement.remove();
        });

        return toast;
    }

    /**
     * 取得 Toast 容器
     */
    getToastContainer() {
        let container = document.getElementById('toast-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'toast-container';
            container.className = 'toast-container position-fixed top-0 end-0 p-3';
            container.style.zIndex = '9999';
            document.body.appendChild(container);
        }
        return container;
    }

    /**
     * 隱藏載入 Spinner
     */
    hideLoadingSpinner() {
        this.showLoading(false);
    }

    /**
     * 顯示載入 Spinner
     */
    showLoadingSpinner(message = '載入中...', options = {}) {
        this.showLoading(true, message, options);
    }

    /**
     * 取消當前操作
     */
    cancelCurrentOperation() {
        console.log('使用者取消了當前操作');
        
        // 取消檔案讀取
        if (this.currentFileReader) {
            this.currentFileReader.abort();
            this.currentFileReader = null;
        }
        
        // 取消圖片載入
        if (this.currentImageLoad) {
            this.currentImageLoad.src = '';
            this.currentImageLoad = null;
        }
        
        // 重置狀態
        this.resetUploadState();
        
        // 顯示取消訊息
        this.showInfoMessage('操作已取消');
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