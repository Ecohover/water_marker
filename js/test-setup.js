/**
 * Jest 測試環境設定
 * 配置測試所需的全域變數和 Mock
 */

// 設定 Jest 超時時間
jest.setTimeout(10000);

// Mock performance API
global.performance = {
    now: jest.fn(() => Date.now())
};

// Mock URL API
global.URL = global.URL || {
    createObjectURL: jest.fn(() => 'blob:mock-url'),
    revokeObjectURL: jest.fn()
};

// Mock Blob API
global.Blob = global.Blob || class Blob {
    constructor(parts, options = {}) {
        this.parts = parts;
        this.type = options.type || '';
        this.size = parts.reduce((size, part) => size + (part.length || 0), 0);
    }
};

// 抑制 console 輸出（除非測試失敗）
const originalConsole = global.console;
global.console = {
    ...originalConsole,
    log: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
};

// 在測試失敗時顯示 console 輸出
afterEach(() => {
    if (global.console.error.mock.calls.length > 0) {
        console.error('Test errors:', global.console.error.mock.calls);
    }
});

// 清理函數
afterEach(() => {
    jest.clearAllMocks();
    
    // 清理 localStorage
    if (global.localStorage) {
        global.localStorage.clear();
    }
    
    // 清理 DOM
    if (global.document && global.document.body) {
        global.document.body.innerHTML = '';
    }
});

// 全域測試工具函數
global.createMockFile = (name, type, size = 1024) => {
    return new File(['mock content'], name, { type, size });
};

global.createMockImage = (width = 800, height = 600) => {
    const img = new Image();
    img.width = width;
    img.height = height;
    return img;
};

global.createMockCanvas = (width = 800, height = 600) => {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
};

// 測試資料
global.testData = {
    validImageFile: createMockFile('test.jpg', 'image/jpeg', 1024 * 1024),
    invalidImageFile: createMockFile('test.txt', 'text/plain', 1024),
    largeImageFile: createMockFile('large.jpg', 'image/jpeg', 15 * 1024 * 1024),
    
    validSettings: {
        version: '1.0',
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
            maxImageSize: 10 * 1024 * 1024,
            enableDebugMode: false,
            autoPreview: true
        },
        lastUsed: {
            timestamp: null,
            sessionCount: 0
        }
    },
    
    invalidSettings: {
        version: '1.0',
        watermark: {
            type: 'preset',
            position: 'bottom-right',
            opacity: 1.5, // 無效值
            fontSize: 150 // 無效值
        }
    }
};

console.log('Jest 測試環境設定完成');