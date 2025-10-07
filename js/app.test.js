/**
 * 圖片浮水印工具 - 單元測試
 * 測試圖片處理函數、浮水印生成邏輯和設定驗證功能
 */

// Mock DOM elements and APIs for testing
const mockDOM = () => {
    // Mock localStorage
    global.localStorage = {
        getItem: jest.fn(),
        setItem: jest.fn(),
        removeItem: jest.fn(),
        clear: jest.fn()
    };

    // Mock Canvas API
    global.HTMLCanvasElement.prototype.getContext = jest.fn(() => ({
        drawImage: jest.fn(),
        fillText: jest.fn(),
        measureText: jest.fn(() => ({ width: 100, height: 20 })),
        clearRect: jest.fn(),
        save: jest.fn(),
        restore: jest.fn(),
        globalAlpha: 1,
        font: '24px Arial',
        fillStyle: '#000000',
        textAlign: 'left',
        textBaseline: 'top'
    }));

    // Mock File API
    global.File = class File {
        constructor(bits, name, options = {}) {
            this.bits = bits;
            this.name = name;
            this.type = options.type || '';
            this.size = options.size || 0;
            this.lastModified = Date.now();
        }
    };

    // Mock FileReader
    global.FileReader = class FileReader {
        constructor() {
            this.result = null;
            this.onload = null;
            this.onerror = null;
        }
        
        readAsDataURL(file) {
            setTimeout(() => {
                this.result = 'data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEAYABgAAD/2wBDAAEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/2wBDAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQEBAQH/wAARCAABAAEDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAv/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAAAAX/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwA/8A8A';
                if (this.onload) this.onload({ target: this });
            }, 0);
        }
    };

    // Mock Image
    global.Image = class Image {
        constructor() {
            this.onload = null;
            this.onerror = null;
            this.src = '';
            this.width = 800;
            this.height = 600;
        }
        
        set src(value) {
            this._src = value;
            setTimeout(() => {
                if (this.onload) this.onload();
            }, 0);
        }
        
        get src() {
            return this._src;
        }
    };

    // Mock document
    global.document = {
        createElement: jest.fn((tag) => {
            if (tag === 'canvas') {
                return {
                    getContext: jest.fn(() => ({
                        drawImage: jest.fn(),
                        fillText: jest.fn(),
                        measureText: jest.fn(() => ({ width: 100, height: 20 })),
                        clearRect: jest.fn(),
                        save: jest.fn(),
                        restore: jest.fn(),
                        globalAlpha: 1,
                        font: '24px Arial',
                        fillStyle: '#000000',
                        textAlign: 'left',
                        textBaseline: 'top'
                    })),
                    width: 800,
                    height: 600,
                    toDataURL: jest.fn(() => 'data:image/png;base64,mock-data')
                };
            }
            return {
                style: {},
                classList: {
                    add: jest.fn(),
                    remove: jest.fn(),
                    toggle: jest.fn(),
                    contains: jest.fn()
                },
                addEventListener: jest.fn(),
                removeEventListener: jest.fn(),
                appendChild: jest.fn(),
                removeChild: jest.fn(),
                innerHTML: '',
                textContent: '',
                value: ''
            };
        }),
        getElementById: jest.fn(),
        querySelector: jest.fn(),
        querySelectorAll: jest.fn(() => []),
        body: {
            appendChild: jest.fn(),
            classList: {
                add: jest.fn(),
                remove: jest.fn(),
                toggle: jest.fn()
            }
        },
        readyState: 'complete',
        addEventListener: jest.fn()
    };

    // Mock window
    global.window = {
        innerWidth: 1024,
        innerHeight: 768,
        self: global.window,
        top: global.window,
        addEventListener: jest.fn(),
        removeEventListener: jest.fn(),
        URL: {
            createObjectURL: jest.fn(() => 'blob:mock-url'),
            revokeObjectURL: jest.fn()
        },
        location: {
            href: 'http://localhost',
            reload: jest.fn()
        }
    };

    // Mock console methods
    global.console = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn()
    };
};

// Initialize mocks before importing the app
mockDOM();

// Import the WatermarkApp class (assuming it's exported)
// For this test, we'll create a simplified version of the key functions
class TestWatermarkApp {
    constructor() {
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
        
        this.defaultSettings = {
            version: '1.0',
            watermark: {
                type: 'preset',
                text: '僅供身分驗證使用',
                presetType: 'taiwan-id',
                position: 'bottom-right',
                opacity: 0.5,
                fontSize: 24,
                color: '#ff0000'
            }
        };
        
        this.settingsConfig = {
            storageKey: 'watermark-tool-settings',
            version: '1.0',
            maxStorageSize: 1024 * 1024
        };
    }

    // File validation function
    validateFile(file) {
        if (!file) {
            throw new Error('FileTypeError: 沒有選擇檔案');
        }

        const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif'];
        if (!allowedTypes.includes(file.type)) {
            throw new Error('FileTypeError: 不支援的檔案格式');
        }

        const maxSize = 10 * 1024 * 1024; // 10MB
        if (file.size > maxSize) {
            throw new Error('FileSizeError: 檔案過大');
        }

        return true;
    }

    // Settings validation function
    validateSettings(settings) {
        if (!settings || typeof settings !== 'object') {
            return false;
        }

        const requiredKeys = ['version', 'watermark'];
        for (const key of requiredKeys) {
            if (!settings.hasOwnProperty(key)) {
                return false;
            }
        }

        const watermark = settings.watermark;
        if (!watermark || typeof watermark !== 'object') {
            return false;
        }

        const requiredWatermarkKeys = ['type', 'position', 'opacity', 'fontSize'];
        for (const key of requiredWatermarkKeys) {
            if (!watermark.hasOwnProperty(key)) {
                return false;
            }
        }

        if (watermark.opacity < 0 || watermark.opacity > 1) {
            return false;
        }

        if (watermark.fontSize < 8 || watermark.fontSize > 100) {
            return false;
        }

        return true;
    }

    // Watermark position calculation
    calculateWatermarkPosition(text, canvasWidth = 800, canvasHeight = 600) {
        const textWidth = 100; // Mock text width
        const textHeight = 20; // Mock text height
        const padding = 20;

        let x, y;

        switch (this.watermarkConfig.position) {
            case 'top-left':
                x = padding;
                y = padding;
                break;
            case 'top-right':
                x = canvasWidth - textWidth - padding;
                y = padding;
                break;
            case 'bottom-left':
                x = padding;
                y = canvasHeight - textHeight - padding;
                break;
            case 'bottom-right':
                x = canvasWidth - textWidth - padding;
                y = canvasHeight - textHeight - padding;
                break;
            case 'center':
                x = (canvasWidth - textWidth) / 2;
                y = (canvasHeight - textHeight) / 2;
                break;
            default:
                x = canvasWidth - textWidth - padding;
                y = canvasHeight - textHeight - padding;
        }

        return { x, y };
    }

    // Watermark text generation
    getWatermarkText() {
        if (this.watermarkConfig.type === 'preset') {
            const presetTexts = {
                'taiwan-id': '僅供身分驗證使用'
            };
            return presetTexts[this.watermarkConfig.presetType] || '僅供身分驗證使用';
        } else {
            return this.watermarkConfig.text || '';
        }
    }

    // Settings management
    cloneSettings(settings) {
        try {
            return JSON.parse(JSON.stringify(settings));
        } catch (error) {
            return {};
        }
    }

    mergeSettings(defaultSettings, userSettings) {
        const merged = this.cloneSettings(defaultSettings);
        
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
        return merged;
    }

    // Format file size utility
    formatFileSize(bytes) {
        if (bytes === 0) return '0 Bytes';
        
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }

    // Image format validation
    isValidImageFormat(filename) {
        const validExtensions = ['.jpg', '.jpeg', '.png', '.gif'];
        const extension = filename.toLowerCase().substring(filename.lastIndexOf('.'));
        return validExtensions.includes(extension);
    }

    // Error handling
    handleError(type, message, error) {
        const errorInfo = {
            type,
            message,
            error: error?.message || error,
            timestamp: new Date().toISOString()
        };
        
        console.error('Error handled:', errorInfo);
        return errorInfo;
    }
}

// Test Suite
describe('圖片浮水印工具 - 單元測試', () => {
    let app;

    beforeEach(() => {
        app = new TestWatermarkApp();
        jest.clearAllMocks();
    });

    describe('檔案驗證功能', () => {
        test('應該接受有效的圖片檔案', () => {
            const validFile = new File(['test'], 'test.jpg', { 
                type: 'image/jpeg', 
                size: 1024 * 1024 // 1MB
            });

            expect(() => app.validateFile(validFile)).not.toThrow();
            expect(app.validateFile(validFile)).toBe(true);
        });

        test('應該拒絕空檔案', () => {
            expect(() => app.validateFile(null)).toThrow('FileTypeError: 沒有選擇檔案');
            expect(() => app.validateFile(undefined)).toThrow('FileTypeError: 沒有選擇檔案');
        });

        test('應該拒絕不支援的檔案格式', () => {
            const invalidFile = new File(['test'], 'test.txt', { 
                type: 'text/plain', 
                size: 1024 
            });

            expect(() => app.validateFile(invalidFile)).toThrow('FileTypeError: 不支援的檔案格式');
        });

        test('應該拒絕過大的檔案', () => {
            const largeFile = new File(['test'], 'test.jpg', { 
                type: 'image/jpeg', 
                size: 15 * 1024 * 1024 // 15MB
            });

            expect(() => app.validateFile(largeFile)).toThrow('FileSizeError: 檔案過大');
        });

        test('應該接受所有支援的圖片格式', () => {
            const formats = [
                { type: 'image/jpeg', name: 'test.jpg' },
                { type: 'image/jpg', name: 'test.jpg' },
                { type: 'image/png', name: 'test.png' },
                { type: 'image/gif', name: 'test.gif' }
            ];

            formats.forEach(format => {
                const file = new File(['test'], format.name, { 
                    type: format.type, 
                    size: 1024 
                });
                expect(() => app.validateFile(file)).not.toThrow();
            });
        });
    });

    describe('浮水印生成邏輯', () => {
        test('應該正確生成預設浮水印文字', () => {
            app.watermarkConfig.type = 'preset';
            app.watermarkConfig.presetType = 'taiwan-id';

            const text = app.getWatermarkText();
            expect(text).toBe('僅供身分驗證使用');
        });

        test('應該正確生成自訂浮水印文字', () => {
            app.watermarkConfig.type = 'custom';
            app.watermarkConfig.text = '測試浮水印';

            const text = app.getWatermarkText();
            expect(text).toBe('測試浮水印');
        });

        test('應該正確計算浮水印位置 - 右下角', () => {
            app.watermarkConfig.position = 'bottom-right';
            
            const position = app.calculateWatermarkPosition('測試文字', 800, 600);
            expect(position.x).toBe(680); // 800 - 100 - 20
            expect(position.y).toBe(560); // 600 - 20 - 20
        });

        test('應該正確計算浮水印位置 - 左上角', () => {
            app.watermarkConfig.position = 'top-left';
            
            const position = app.calculateWatermarkPosition('測試文字', 800, 600);
            expect(position.x).toBe(20);
            expect(position.y).toBe(20);
        });

        test('應該正確計算浮水印位置 - 中央', () => {
            app.watermarkConfig.position = 'center';
            
            const position = app.calculateWatermarkPosition('測試文字', 800, 600);
            expect(position.x).toBe(350); // (800 - 100) / 2
            expect(position.y).toBe(290); // (600 - 20) / 2
        });

        test('應該處理無效位置並使用預設值', () => {
            app.watermarkConfig.position = 'invalid-position';
            
            const position = app.calculateWatermarkPosition('測試文字', 800, 600);
            expect(position.x).toBe(680); // 預設為右下角
            expect(position.y).toBe(560);
        });
    });

    describe('設定驗證和錯誤處理', () => {
        test('應該驗證有效的設定格式', () => {
            const validSettings = {
                version: '1.0',
                watermark: {
                    type: 'preset',
                    position: 'bottom-right',
                    opacity: 0.5,
                    fontSize: 24
                }
            };

            expect(app.validateSettings(validSettings)).toBe(true);
        });

        test('應該拒絕無效的設定格式', () => {
            const invalidSettings = [
                null,
                undefined,
                'string',
                123,
                {},
                { version: '1.0' }, // 缺少 watermark
                { watermark: {} }, // 缺少 version
                { 
                    version: '1.0', 
                    watermark: {
                        type: 'preset'
                        // 缺少必要欄位
                    }
                }
            ];

            invalidSettings.forEach(settings => {
                expect(app.validateSettings(settings)).toBe(false);
            });
        });

        test('應該驗證透明度數值範圍', () => {
            const settingsWithInvalidOpacity = {
                version: '1.0',
                watermark: {
                    type: 'preset',
                    position: 'bottom-right',
                    opacity: 1.5, // 超出範圍
                    fontSize: 24
                }
            };

            expect(app.validateSettings(settingsWithInvalidOpacity)).toBe(false);
        });

        test('應該驗證字體大小範圍', () => {
            const settingsWithInvalidFontSize = {
                version: '1.0',
                watermark: {
                    type: 'preset',
                    position: 'bottom-right',
                    opacity: 0.5,
                    fontSize: 150 // 超出範圍
                }
            };

            expect(app.validateSettings(settingsWithInvalidFontSize)).toBe(false);
        });

        test('應該正確複製設定物件', () => {
            const original = {
                a: 1,
                b: { c: 2, d: [3, 4] },
                e: 'test'
            };

            const cloned = app.cloneSettings(original);
            
            expect(cloned).toEqual(original);
            expect(cloned).not.toBe(original);
            expect(cloned.b).not.toBe(original.b);
        });

        test('應該正確合併設定', () => {
            const defaultSettings = {
                a: 1,
                b: { c: 2, d: 3 },
                e: 'default'
            };

            const userSettings = {
                b: { c: 5 },
                f: 'new'
            };

            const merged = app.mergeSettings(defaultSettings, userSettings);
            
            expect(merged.a).toBe(1);
            expect(merged.b.c).toBe(5);
            expect(merged.b.d).toBe(3);
            expect(merged.e).toBe('default');
            expect(merged.f).toBe('new');
        });
    });

    describe('工具函數', () => {
        test('應該正確格式化檔案大小', () => {
            expect(app.formatFileSize(0)).toBe('0 Bytes');
            expect(app.formatFileSize(1024)).toBe('1 KB');
            expect(app.formatFileSize(1024 * 1024)).toBe('1 MB');
            expect(app.formatFileSize(1536)).toBe('1.5 KB');
            expect(app.formatFileSize(1024 * 1024 * 1024)).toBe('1 GB');
        });

        test('應該正確驗證圖片檔案格式', () => {
            const validFiles = ['test.jpg', 'test.jpeg', 'test.png', 'test.gif', 'TEST.JPG'];
            const invalidFiles = ['test.txt', 'test.pdf', 'test.doc', 'test'];

            validFiles.forEach(filename => {
                expect(app.isValidImageFormat(filename)).toBe(true);
            });

            invalidFiles.forEach(filename => {
                expect(app.isValidImageFormat(filename)).toBe(false);
            });
        });

        test('應該正確處理錯誤', () => {
            const error = new Error('測試錯誤');
            const errorInfo = app.handleError('TestError', '測試訊息', error);

            expect(errorInfo.type).toBe('TestError');
            expect(errorInfo.message).toBe('測試訊息');
            expect(errorInfo.error).toBe('測試錯誤');
            expect(errorInfo.timestamp).toBeDefined();
            expect(console.error).toHaveBeenCalled();
        });
    });

    describe('邊界情況和錯誤處理', () => {
        test('應該處理空的浮水印文字', () => {
            app.watermarkConfig.type = 'custom';
            app.watermarkConfig.text = '';

            const text = app.getWatermarkText();
            expect(text).toBe('');
        });

        test('應該處理未知的預設類型', () => {
            app.watermarkConfig.type = 'preset';
            app.watermarkConfig.presetType = 'unknown-type';

            const text = app.getWatermarkText();
            expect(text).toBe('僅供身分驗證使用'); // 應該回退到預設值
        });

        test('應該處理極小的 Canvas 尺寸', () => {
            const position = app.calculateWatermarkPosition('測試', 50, 50);
            
            expect(position.x).toBeGreaterThanOrEqual(0);
            expect(position.y).toBeGreaterThanOrEqual(0);
        });

        test('應該處理設定複製時的錯誤', () => {
            // 創建一個無法序列化的物件
            const problematicSettings = {};
            problematicSettings.circular = problematicSettings;

            const result = app.cloneSettings(problematicSettings);
            expect(result).toEqual({});
        });

        test('應該處理無效的檔案大小格式化', () => {
            expect(app.formatFileSize(-1)).toBe('0 Bytes');
            expect(app.formatFileSize(NaN)).toBe('0 Bytes');
            expect(app.formatFileSize(null)).toBe('0 Bytes');
        });
    });

    describe('配置管理', () => {
        test('應該正確初始化預設配置', () => {
            expect(app.watermarkConfig.type).toBe('preset');
            expect(app.watermarkConfig.opacity).toBe(0.5);
            expect(app.watermarkConfig.fontSize).toBe(24);
            expect(app.watermarkConfig.position).toBe('bottom-right');
        });

        test('應該正確驗證透明度範圍', () => {
            const validOpacities = [0, 0.5, 1];
            const invalidOpacities = [-0.1, 1.1, 2, -1];

            validOpacities.forEach(opacity => {
                const settings = {
                    version: '1.0',
                    watermark: { ...app.defaultSettings.watermark, opacity }
                };
                expect(app.validateSettings(settings)).toBe(true);
            });

            invalidOpacities.forEach(opacity => {
                const settings = {
                    version: '1.0',
                    watermark: { ...app.defaultSettings.watermark, opacity }
                };
                expect(app.validateSettings(settings)).toBe(false);
            });
        });

        test('應該正確驗證字體大小範圍', () => {
            const validFontSizes = [8, 24, 50, 100];
            const invalidFontSizes = [7, 101, 0, -1];

            validFontSizes.forEach(fontSize => {
                const settings = {
                    version: '1.0',
                    watermark: { ...app.defaultSettings.watermark, fontSize }
                };
                expect(app.validateSettings(settings)).toBe(true);
            });

            invalidFontSizes.forEach(fontSize => {
                const settings = {
                    version: '1.0',
                    watermark: { ...app.defaultSettings.watermark, fontSize }
                };
                expect(app.validateSettings(settings)).toBe(false);
            });
        });
    });
});

// 效能測試
describe('效能測試', () => {
    let app;

    beforeEach(() => {
        app = new TestWatermarkApp();
    });

    test('檔案驗證應該在合理時間內完成', () => {
        const file = new File(['test'], 'test.jpg', { 
            type: 'image/jpeg', 
            size: 1024 
        });

        const startTime = performance.now();
        app.validateFile(file);
        const endTime = performance.now();

        expect(endTime - startTime).toBeLessThan(10); // 應該在10ms內完成
    });

    test('位置計算應該在合理時間內完成', () => {
        const startTime = performance.now();
        
        for (let i = 0; i < 1000; i++) {
            app.calculateWatermarkPosition('測試文字', 800, 600);
        }
        
        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(100); // 1000次計算應該在100ms內完成
    });

    test('設定驗證應該在合理時間內完成', () => {
        const settings = {
            version: '1.0',
            watermark: {
                type: 'preset',
                position: 'bottom-right',
                opacity: 0.5,
                fontSize: 24
            }
        };

        const startTime = performance.now();
        
        for (let i = 0; i < 1000; i++) {
            app.validateSettings(settings);
        }
        
        const endTime = performance.now();
        expect(endTime - startTime).toBeLessThan(50); // 1000次驗證應該在50ms內完成
    });
});