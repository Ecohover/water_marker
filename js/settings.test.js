/**
 * 設定管理功能測試
 * 測試 LocalStorage 設定管理、驗證和同步功能
 */

describe('設定管理功能測試', () => {
    let mockLocalStorage;

    beforeEach(() => {
        // Mock localStorage
        mockLocalStorage = {
            data: {},
            getItem: jest.fn((key) => mockLocalStorage.data[key] || null),
            setItem: jest.fn((key, value) => {
                mockLocalStorage.data[key] = value;
            }),
            removeItem: jest.fn((key) => {
                delete mockLocalStorage.data[key];
            }),
            clear: jest.fn(() => {
                mockLocalStorage.data = {};
            })
        };
        
        global.localStorage = mockLocalStorage;
    });

    describe('設定載入和儲存', () => {
        test('應該載入有效的儲存設定', () => {
            const validSettings = {
                version: '1.0',
                watermark: {
                    type: 'preset',
                    presetType: 'taiwan-id',
                    position: 'bottom-right',
                    opacity: 0.5,
                    fontSize: 24
                }
            };

            mockLocalStorage.setItem('watermark-tool-settings', JSON.stringify(validSettings));

            const loadedSettings = loadUserSettings();
            expect(loadedSettings).toEqual(expect.objectContaining(validSettings));
        });

        test('應該在沒有儲存設定時使用預設值', () => {
            const defaultSettings = getDefaultSettings();
            const loadedSettings = loadUserSettings();
            
            expect(loadedSettings).toEqual(expect.objectContaining(defaultSettings));
        });

        test('應該在設定格式無效時使用預設值', () => {
            mockLocalStorage.setItem('watermark-tool-settings', 'invalid-json');

            const loadedSettings = loadUserSettings();
            const defaultSettings = getDefaultSettings();
            
            expect(loadedSettings).toEqual(expect.objectContaining(defaultSettings));
        });

        test('應該正確儲存設定到 localStorage', () => {
            const settings = {
                version: '1.0',
                watermark: {
                    type: 'custom',
                    text: '測試浮水印'
                }
            };

            const success = saveUserSettings(settings);
            
            expect(success).toBe(true);
            expect(mockLocalStorage.setItem).toHaveBeenCalledWith(
                'watermark-tool-settings',
                JSON.stringify(settings)
            );
        });

        test('應該處理儲存空間不足的情況', () => {
            mockLocalStorage.setItem.mockImplementation(() => {
                throw new Error('QuotaExceededError');
            });

            const settings = { test: 'data' };
            const success = saveUserSettings(settings);
            
            expect(success).toBe(false);
        });
    });

    describe('設定驗證', () => {
        test('應該驗證完整的設定結構', () => {
            const validSettings = {
                version: '1.0',
                watermark: {
                    type: 'preset',
                    position: 'bottom-right',
                    opacity: 0.5,
                    fontSize: 24
                },
                ui: {
                    theme: 'light'
                },
                advanced: {
                    imageQuality: 0.9
                },
                lastUsed: {
                    timestamp: null,
                    sessionCount: 0
                }
            };

            expect(validateSettings(validSettings)).toBe(true);
        });

        test('應該拒絕缺少必要欄位的設定', () => {
            const incompleteSettings = [
                {}, // 完全空白
                { version: '1.0' }, // 缺少 watermark
                { watermark: {} }, // 缺少 version
                {
                    version: '1.0',
                    watermark: { type: 'preset' } // 缺少必要的 watermark 欄位
                }
            ];

            incompleteSettings.forEach(settings => {
                expect(validateSettings(settings)).toBe(false);
            });
        });

        test('應該驗證數值範圍', () => {
            const testCases = [
                { opacity: -0.1, valid: false },
                { opacity: 0, valid: true },
                { opacity: 0.5, valid: true },
                { opacity: 1, valid: true },
                { opacity: 1.1, valid: false },
                { fontSize: 7, valid: false },
                { fontSize: 8, valid: true },
                { fontSize: 50, valid: true },
                { fontSize: 100, valid: true },
                { fontSize: 101, valid: false }
            ];

            testCases.forEach(({ opacity, fontSize, valid }) => {
                const settings = {
                    version: '1.0',
                    watermark: {
                        type: 'preset',
                        position: 'bottom-right',
                        opacity: opacity !== undefined ? opacity : 0.5,
                        fontSize: fontSize !== undefined ? fontSize : 24
                    }
                };

                expect(validateSettings(settings)).toBe(valid);
            });
        });

        test('應該驗證設定類型', () => {
            const invalidTypes = [
                null,
                undefined,
                'string',
                123,
                [],
                true
            ];

            invalidTypes.forEach(invalidType => {
                expect(validateSettings(invalidType)).toBe(false);
            });
        });
    });

    describe('設定更新和同步', () => {
        test('應該正確更新巢狀設定項目', () => {
            const settings = {
                watermark: {
                    type: 'preset',
                    opacity: 0.5
                }
            };

            updateSetting(settings, 'watermark.opacity', 0.8);
            expect(settings.watermark.opacity).toBe(0.8);
        });

        test('應該建立不存在的巢狀路徑', () => {
            const settings = {};

            updateSetting(settings, 'ui.theme', 'dark');
            expect(settings.ui.theme).toBe('dark');
        });

        test('應該正確取得巢狀設定值', () => {
            const settings = {
                watermark: {
                    type: 'preset',
                    style: {
                        opacity: 0.7
                    }
                }
            };

            expect(getSetting(settings, 'watermark.type')).toBe('preset');
            expect(getSetting(settings, 'watermark.style.opacity')).toBe(0.7);
            expect(getSetting(settings, 'nonexistent.path', 'default')).toBe('default');
        });

        test('應該正確合併設定', () => {
            const defaultSettings = {
                a: 1,
                b: {
                    c: 2,
                    d: 3
                },
                e: 'default'
            };

            const userSettings = {
                b: {
                    c: 5,
                    f: 6
                },
                g: 'new'
            };

            const merged = mergeSettings(defaultSettings, userSettings);

            expect(merged.a).toBe(1); // 保留預設值
            expect(merged.b.c).toBe(5); // 使用使用者值
            expect(merged.b.d).toBe(3); // 保留預設值
            expect(merged.b.f).toBe(6); // 新增使用者值
            expect(merged.e).toBe('default'); // 保留預設值
            expect(merged.g).toBe('new'); // 新增使用者值
        });
    });

    describe('設定匯出和匯入', () => {
        test('應該正確匯出設定', () => {
            const settings = {
                version: '1.0',
                watermark: { type: 'preset' }
            };

            // Mock URL.createObjectURL and document.createElement
            const mockLink = {
                href: '',
                download: '',
                click: jest.fn()
            };
            
            global.document.createElement = jest.fn(() => mockLink);
            global.document.body.appendChild = jest.fn();
            global.document.body.removeChild = jest.fn();
            global.URL.createObjectURL = jest.fn(() => 'blob:mock-url');

            const success = exportSettings(settings);

            expect(success).toBe(true);
            expect(mockLink.click).toHaveBeenCalled();
            expect(global.URL.createObjectURL).toHaveBeenCalled();
        });

        test('應該正確匯入設定', async () => {
            const importData = {
                version: '1.0',
                watermark: {
                    type: 'custom',
                    text: '匯入的浮水印'
                }
            };

            const mockFile = new File(
                [JSON.stringify(importData)],
                'settings.json',
                { type: 'application/json' }
            );

            const result = await importSettings(mockFile);
            
            expect(result).toBe(true);
            expect(mockLocalStorage.setItem).toHaveBeenCalled();
        });

        test('應該拒絕無效的匯入檔案', async () => {
            const mockFile = new File(
                ['invalid json'],
                'settings.json',
                { type: 'application/json' }
            );

            await expect(importSettings(mockFile)).rejects.toThrow();
        });
    });

    describe('設定重置和清除', () => {
        test('應該重置特定類別的設定', () => {
            const settings = {
                watermark: { type: 'custom', text: 'test' },
                ui: { theme: 'dark' }
            };

            const defaultSettings = getDefaultSettings();
            resetSettingsCategory(settings, 'watermark', defaultSettings);

            expect(settings.watermark).toEqual(defaultSettings.watermark);
            expect(settings.ui.theme).toBe('dark'); // 其他類別不受影響
        });

        test('應該重置所有設定', () => {
            const settings = {
                watermark: { type: 'custom' },
                ui: { theme: 'dark' }
            };

            const defaultSettings = getDefaultSettings();
            const resetSettings = resetAllSettings(settings, defaultSettings);

            expect(resetSettings).toEqual(defaultSettings);
        });

        test('應該清除所有儲存的設定', () => {
            mockLocalStorage.setItem('watermark-tool-settings', '{"test": "data"}');
            mockLocalStorage.setItem('watermark-tool-errors', '[]');

            clearStoredSettings();

            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('watermark-tool-settings');
            expect(mockLocalStorage.removeItem).toHaveBeenCalledWith('watermark-tool-errors');
        });
    });

    describe('設定一致性檢查', () => {
        test('應該修正缺失的設定項目', () => {
            const incompleteSettings = {
                version: '1.0',
                watermark: {
                    type: 'preset'
                    // 缺少其他必要欄位
                }
            };

            const correctedSettings = ensureSettingsConsistency(incompleteSettings);

            expect(correctedSettings.watermark.opacity).toBeDefined();
            expect(correctedSettings.watermark.fontSize).toBeDefined();
            expect(correctedSettings.watermark.position).toBeDefined();
        });

        test('應該修正超出範圍的數值', () => {
            const invalidSettings = {
                version: '1.0',
                watermark: {
                    type: 'preset',
                    position: 'bottom-right',
                    opacity: 1.5, // 超出範圍
                    fontSize: 150 // 超出範圍
                }
            };

            const correctedSettings = ensureSettingsConsistency(invalidSettings);

            expect(correctedSettings.watermark.opacity).toBeLessThanOrEqual(1);
            expect(correctedSettings.watermark.opacity).toBeGreaterThanOrEqual(0);
            expect(correctedSettings.watermark.fontSize).toBeLessThanOrEqual(100);
            expect(correctedSettings.watermark.fontSize).toBeGreaterThanOrEqual(8);
        });
    });

    describe('效能測試', () => {
        test('設定驗證應該快速完成', () => {
            const settings = testData.validSettings;
            
            const startTime = performance.now();
            for (let i = 0; i < 1000; i++) {
                validateSettings(settings);
            }
            const endTime = performance.now();

            expect(endTime - startTime).toBeLessThan(100);
        });

        test('設定合併應該快速完成', () => {
            const defaultSettings = getDefaultSettings();
            const userSettings = { watermark: { opacity: 0.8 } };

            const startTime = performance.now();
            for (let i = 0; i < 1000; i++) {
                mergeSettings(defaultSettings, userSettings);
            }
            const endTime = performance.now();

            expect(endTime - startTime).toBeLessThan(200);
        });
    });
});

// 輔助函數實作（簡化版本，用於測試）
function getDefaultSettings() {
    return {
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
    };
}

function loadUserSettings() {
    try {
        const stored = localStorage.getItem('watermark-tool-settings');
        if (!stored) {
            return getDefaultSettings();
        }

        const parsedSettings = JSON.parse(stored);
        if (!validateSettings(parsedSettings)) {
            return getDefaultSettings();
        }

        return mergeSettings(getDefaultSettings(), parsedSettings);
    } catch (error) {
        return getDefaultSettings();
    }
}

function saveUserSettings(settings) {
    try {
        const settingsJson = JSON.stringify(settings);
        localStorage.setItem('watermark-tool-settings', settingsJson);
        return true;
    } catch (error) {
        return false;
    }
}

function validateSettings(settings) {
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

function updateSetting(settings, path, value) {
    const pathArray = path.split('.');
    let current = settings;
    
    for (let i = 0; i < pathArray.length - 1; i++) {
        const key = pathArray[i];
        if (!current[key] || typeof current[key] !== 'object') {
            current[key] = {};
        }
        current = current[key];
    }
    
    const finalKey = pathArray[pathArray.length - 1];
    current[finalKey] = value;
}

function getSetting(settings, path, defaultValue = null) {
    const pathArray = path.split('.');
    let current = settings;
    
    for (const key of pathArray) {
        if (current === null || current === undefined || typeof current !== 'object') {
            return defaultValue;
        }
        current = current[key];
    }
    
    return current !== undefined ? current : defaultValue;
}

function mergeSettings(defaultSettings, userSettings) {
    const merged = JSON.parse(JSON.stringify(defaultSettings));
    
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

function exportSettings(settings) {
    try {
        const exportData = {
            ...settings,
            exportedAt: new Date().toISOString()
        };

        const dataStr = JSON.stringify(exportData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        const url = URL.createObjectURL(dataBlob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'watermark-settings.json';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        URL.revokeObjectURL(url);
        return true;
    } catch (error) {
        return false;
    }
}

function importSettings(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        
        reader.onload = (e) => {
            try {
                const importedData = JSON.parse(e.target.result);
                
                if (!validateSettings(importedData)) {
                    throw new Error('Invalid settings format');
                }
                
                saveUserSettings(importedData);
                resolve(true);
            } catch (error) {
                reject(error);
            }
        };
        
        reader.onerror = (error) => reject(error);
        reader.readAsText(file);
    });
}

function resetSettingsCategory(settings, category, defaultSettings) {
    if (defaultSettings[category]) {
        settings[category] = JSON.parse(JSON.stringify(defaultSettings[category]));
    }
}

function resetAllSettings(settings, defaultSettings) {
    return JSON.parse(JSON.stringify(defaultSettings));
}

function clearStoredSettings() {
    localStorage.removeItem('watermark-tool-settings');
    localStorage.removeItem('watermark-tool-errors');
}

function ensureSettingsConsistency(settings) {
    const defaultSettings = getDefaultSettings();
    const corrected = mergeSettings(defaultSettings, settings);
    
    // 修正數值範圍
    if (corrected.watermark.opacity < 0 || corrected.watermark.opacity > 1) {
        corrected.watermark.opacity = 0.5;
    }
    
    if (corrected.watermark.fontSize < 8 || corrected.watermark.fontSize > 100) {
        corrected.watermark.fontSize = 24;
    }
    
    return corrected;
}