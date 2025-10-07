/**
 * 浮水印功能專項測試
 * 專門測試浮水印生成、位置計算和渲染邏輯
 */

describe('浮水印功能測試', () => {
    let mockCanvas, mockContext;

    beforeEach(() => {
        mockCanvas = createMockCanvas(800, 600);
        mockContext = {
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
        };
    });

    describe('浮水印文字生成', () => {
        test('應該根據預設類型生成正確的文字', () => {
            const presetTypes = {
                'taiwan-id': '僅供身分驗證使用',
                'sample': 'SAMPLE',
                'confidential': 'CONFIDENTIAL'
            };

            Object.entries(presetTypes).forEach(([type, expectedText]) => {
                const config = { type: 'preset', presetType: type };
                const text = getWatermarkText(config);
                expect(text).toBe(expectedText);
            });
        });

        test('應該使用自訂文字', () => {
            const config = { type: 'custom', text: '自訂浮水印文字' };
            const text = getWatermarkText(config);
            expect(text).toBe('自訂浮水印文字');
        });

        test('應該處理空的自訂文字', () => {
            const config = { type: 'custom', text: '' };
            const text = getWatermarkText(config);
            expect(text).toBe('');
        });

        test('應該處理未知的預設類型', () => {
            const config = { type: 'preset', presetType: 'unknown' };
            const text = getWatermarkText(config);
            expect(text).toBe('僅供身分驗證使用'); // 預設值
        });
    });

    describe('浮水印位置計算', () => {
        const testCases = [
            {
                position: 'top-left',
                expected: { x: 20, y: 20 },
                description: '左上角位置'
            },
            {
                position: 'top-right',
                expected: { x: 680, y: 20 }, // 800 - 100 - 20
                description: '右上角位置'
            },
            {
                position: 'bottom-left',
                expected: { x: 20, y: 560 }, // 600 - 20 - 20
                description: '左下角位置'
            },
            {
                position: 'bottom-right',
                expected: { x: 680, y: 560 },
                description: '右下角位置'
            },
            {
                position: 'center',
                expected: { x: 350, y: 290 }, // (800-100)/2, (600-20)/2
                description: '中央位置'
            }
        ];

        testCases.forEach(({ position, expected, description }) => {
            test(`應該正確計算${description}`, () => {
                const config = { position };
                const result = calculateWatermarkPosition(config, 800, 600, 100, 20);
                expect(result.x).toBe(expected.x);
                expect(result.y).toBe(expected.y);
            });
        });

        test('應該處理自訂位置座標', () => {
            const config = { position: 'custom', x: 150, y: 200 };
            const result = calculateWatermarkPosition(config, 800, 600, 100, 20);
            expect(result.x).toBe(150);
            expect(result.y).toBe(200);
        });

        test('應該限制位置在 Canvas 範圍內', () => {
            const config = { position: 'custom', x: -50, y: -30 };
            const result = calculateWatermarkPosition(config, 800, 600, 100, 20);
            expect(result.x).toBeGreaterThanOrEqual(0);
            expect(result.y).toBeGreaterThanOrEqual(0);
        });

        test('應該處理超出 Canvas 的位置', () => {
            const config = { position: 'custom', x: 900, y: 700 };
            const result = calculateWatermarkPosition(config, 800, 600, 100, 20);
            expect(result.x).toBeLessThanOrEqual(800 - 100);
            expect(result.y).toBeLessThanOrEqual(600 - 20);
        });
    });

    describe('浮水印樣式設定', () => {
        test('應該正確設定字體樣式', () => {
            const config = {
                fontSize: 24,
                color: '#ff0000',
                opacity: 0.7
            };

            applyWatermarkStyle(mockContext, config);

            expect(mockContext.font).toContain('24px');
            expect(mockContext.fillStyle).toBe('#ff0000');
            expect(mockContext.globalAlpha).toBe(0.7);
        });

        test('應該處理無效的透明度值', () => {
            const config = { opacity: 1.5 };
            applyWatermarkStyle(mockContext, config);
            expect(mockContext.globalAlpha).toBeLessThanOrEqual(1);
        });

        test('應該處理無效的字體大小', () => {
            const config = { fontSize: -10 };
            applyWatermarkStyle(mockContext, config);
            expect(mockContext.font).toContain('24px'); // 預設值
        });
    });

    describe('浮水印渲染', () => {
        test('應該正確渲染文字浮水印', () => {
            const config = {
                text: '測試浮水印',
                position: 'bottom-right',
                fontSize: 24,
                color: '#ff0000',
                opacity: 0.5
            };

            renderWatermark(mockContext, config, 800, 600);

            expect(mockContext.fillText).toHaveBeenCalledWith(
                '測試浮水印',
                expect.any(Number),
                expect.any(Number)
            );
        });

        test('應該跳過空文字的渲染', () => {
            const config = { text: '' };
            renderWatermark(mockContext, config, 800, 600);
            expect(mockContext.fillText).not.toHaveBeenCalled();
        });

        test('應該正確保存和恢復 Canvas 狀態', () => {
            const config = { text: '測試' };
            renderWatermark(mockContext, config, 800, 600);
            
            expect(mockContext.save).toHaveBeenCalled();
            expect(mockContext.restore).toHaveBeenCalled();
        });
    });

    describe('浮水印預覽更新', () => {
        test('應該在配置變更時觸發預覽更新', () => {
            const updatePreview = jest.fn();
            const config = { text: '原始文字' };

            // 模擬配置變更
            updateWatermarkConfig(config, 'text', '新文字', updatePreview);

            expect(config.text).toBe('新文字');
            expect(updatePreview).toHaveBeenCalled();
        });

        test('應該防抖動頻繁的預覽更新', (done) => {
            const updatePreview = jest.fn();
            const debouncedUpdate = debouncePreviewUpdate(updatePreview, 100);

            // 快速連續調用
            debouncedUpdate();
            debouncedUpdate();
            debouncedUpdate();

            // 立即檢查 - 應該還沒有調用
            expect(updatePreview).not.toHaveBeenCalled();

            // 等待防抖動時間後檢查
            setTimeout(() => {
                expect(updatePreview).toHaveBeenCalledTimes(1);
                done();
            }, 150);
        });
    });

    describe('浮水印匯出', () => {
        test('應該為匯出調整浮水印尺寸', () => {
            const originalConfig = {
                fontSize: 24,
                position: 'bottom-right'
            };

            const exportConfig = adjustWatermarkForExport(
                originalConfig,
                800, 600,  // 預覽尺寸
                1600, 1200 // 匯出尺寸
            );

            expect(exportConfig.fontSize).toBe(48); // 2倍放大
        });

        test('應該保持浮水印位置比例', () => {
            const originalConfig = {
                position: 'custom',
                x: 400, // 預覽中央
                y: 300
            };

            const exportConfig = adjustWatermarkForExport(
                originalConfig,
                800, 600,
                1600, 1200
            );

            expect(exportConfig.x).toBe(800); // 匯出中央
            expect(exportConfig.y).toBe(600);
        });
    });
});

// 輔助函數實作（簡化版本，用於測試）
function getWatermarkText(config) {
    if (config.type === 'preset') {
        const presetTexts = {
            'taiwan-id': '僅供身分驗證使用',
            'sample': 'SAMPLE',
            'confidential': 'CONFIDENTIAL'
        };
        return presetTexts[config.presetType] || '僅供身分驗證使用';
    }
    return config.text || '';
}

function calculateWatermarkPosition(config, canvasWidth, canvasHeight, textWidth, textHeight) {
    const padding = 20;
    let x, y;

    if (config.position === 'custom') {
        x = Math.max(0, Math.min(config.x, canvasWidth - textWidth));
        y = Math.max(0, Math.min(config.y, canvasHeight - textHeight));
    } else {
        switch (config.position) {
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
    }

    return { x, y };
}

function applyWatermarkStyle(context, config) {
    const fontSize = Math.max(8, Math.min(100, config.fontSize || 24));
    const opacity = Math.max(0, Math.min(1, config.opacity || 0.5));
    
    context.font = `${fontSize}px Arial`;
    context.fillStyle = config.color || '#000000';
    context.globalAlpha = opacity;
    context.textAlign = 'left';
    context.textBaseline = 'top';
}

function renderWatermark(context, config, canvasWidth, canvasHeight) {
    const text = getWatermarkText(config);
    if (!text) return;

    context.save();
    
    applyWatermarkStyle(context, config);
    
    const textMetrics = context.measureText(text);
    const textWidth = textMetrics.width;
    const textHeight = config.fontSize || 24;
    
    const position = calculateWatermarkPosition(config, canvasWidth, canvasHeight, textWidth, textHeight);
    
    context.fillText(text, position.x, position.y);
    
    context.restore();
}

function updateWatermarkConfig(config, property, value, callback) {
    config[property] = value;
    if (callback) callback();
}

function debouncePreviewUpdate(callback, delay) {
    let timeoutId;
    return function() {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(callback, delay);
    };
}

function adjustWatermarkForExport(config, previewWidth, previewHeight, exportWidth, exportHeight) {
    const scaleX = exportWidth / previewWidth;
    const scaleY = exportHeight / previewHeight;
    const scale = Math.min(scaleX, scaleY);

    const exportConfig = { ...config };
    
    if (config.fontSize) {
        exportConfig.fontSize = Math.round(config.fontSize * scale);
    }
    
    if (config.position === 'custom') {
        exportConfig.x = Math.round(config.x * scaleX);
        exportConfig.y = Math.round(config.y * scaleY);
    }
    
    return exportConfig;
}