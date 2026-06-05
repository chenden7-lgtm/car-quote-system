// State Management for Full Car Quote
const state = {
    brandType: 'others',       // 'others' or 'tesla'
    vehicleClass: 'Model Y',   // for Tesla: Model 3, Model Y, 新款Model Y, Model S, Model X. Default 'Model Y'
    vehicleType: 'sedan',      // for others: 'sedan', 'suv', 'van'
    vehicleMethod: 'ac',       // for others: 'ac', 'ac_skirt'
    vehicleSize: 'S',          // for others: S, M, L, XL, 2XL, 其他
    customerName: '',
    customerPhone: '',
    plateNumber: '',
    brandModel: '',
    usedMaterial: '',
    material: 'axColor',       // 'axColor', 'threeMColor', 'chinaGloss', 'chinaMatte', 'importGloss', 'importMatte'
    discount: 100,             // percentage, e.g., 90 for 10% off
    activeSelections: {},      // dbKey -> { checked: boolean, qty: number, customPrice: number | null }
    history: []
};

const serviceCatalog = {
    axColor: { name: 'AX改色膜', desc: 'AX品牌改色膜，色彩飽滿，完美收邊' },
    threeMColor: { name: '3M改色膜', desc: '3M高品質改色膜，質地優良，耐久性強' },
    chinaGloss: { name: '國產大陸犀牛皮（透明）', desc: '透明亮面防護漆面，高性價比防刮保護' },
    chinaMatte: { name: '國產大陸犀牛皮（消光）', desc: '啞光霧面防護漆面，高性價比質感保護' },
    importGloss: { name: '進口犀牛皮（透明）', desc: '進口頂級透明防護膜，強效自愈、超強增亮' },
    importMatte: { name: '進口犀牛皮（消光）', desc: '進口頂級消光防膜，極致絲綢霧面質感、防刮' }
};

// Default quantities for each part key
const defaultQuantities = {
    "前保桿": 1,
    "引擎蓋": 1,
    "前葉子版": 2,
    "前門": 2,
    "後門": 2,
    "AC": 1,
    "後葉": 2,
    "後葉（連著側裙）": 2,
    "尾箱上": 1,
    "尾箱上左右（單邊）": 2,
    "尾箱下": 1,
    "尾翼": 1,
    "後保桿": 1,
    "手把（單支）": 4,
    "後照鏡（單邊）": 2,
    "AC連接後葉": 1,
    "AC連接後葉、側裙": 1,
    "側裙": 2,
    "AC(不含後葉)": 1
};

// DOM Init
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadHistoryFromStorage();
    setupEventListeners();
    resetSelectionsForCurrentVehicle();
    renderQuote();
    renderHistory();
}

function loadHistoryFromStorage() {
    const stored = localStorage.getItem('car_quote_history');
    if (stored) {
        try {
            state.history = JSON.parse(stored);
        } catch (e) {
            console.error('Error parsing history', e);
            state.history = [];
        }
    }
}

function saveHistoryToStorage() {
    localStorage.setItem('car_quote_history', JSON.stringify(state.history));
}

function getDbPrice(dbKey) {
    if (typeof pricingData === 'undefined' || !pricingData) return 0;
    
    const brand = state.brandType;
    const materialData = pricingData[brand] ? pricingData[brand][state.material] : null;
    if (!materialData) return 0;
    
    const partData = materialData[dbKey];
    if (!partData) return 0;
    
    if (brand === 'tesla') {
        const price = partData[state.vehicleClass];
        return (price !== undefined && price !== null) ? price : 0;
    } else {
        const price = partData[state.vehicleSize];
        return (price !== undefined && price !== null) ? price : 0;
    }
}

function getIncludedPartsList() {
    if (typeof pricingData === 'undefined' || !pricingData) return [];
    
    const brand = state.brandType;
    const materialData = pricingData[brand] ? pricingData[brand][state.material] : null;
    if (!materialData) return [];
    
    const allKeys = Object.keys(materialData);
    
    if (brand === 'tesla') {
        // Filter parts that have a valid price for the selected model
        return allKeys.filter(k => {
            const price = materialData[k][state.vehicleClass];
            return price !== undefined && price !== null && price !== 0;
        });
    } else {
        // Filter parts based on others vehicle method
        return allKeys.filter(k => {
            // General parts always included
            const generalParts = ["前保桿", "引擎蓋", "前葉子版", "前門", "後門", "尾箱上", "尾箱下", "尾翼", "後保桿", "手把（單支）", "後照鏡（單邊）"];
            if (generalParts.includes(k)) return true;
            
            // Method specific parts
            if (state.vehicleMethod === 'ac') {
                return k === "AC連接後葉" || k === "側裙";
            } else if (state.vehicleMethod === 'ac_skirt') {
                return k === "AC連接後葉、側裙";
            }
            return false;
        });
    }
}

function resetSelectionsForCurrentVehicle() {
    const includedParts = getIncludedPartsList();
    const newSelections = {};
    
    includedParts.forEach(partKey => {
        // Retain custom price if it already existed for this part
        const oldSelection = state.activeSelections[partKey];
        const customPrice = oldSelection ? oldSelection.customPrice : null;
        const qty = oldSelection ? oldSelection.qty : (defaultQuantities[partKey] || 1);
        const checked = oldSelection ? oldSelection.checked : true;
        
        newSelections[partKey] = {
            checked,
            qty,
            customPrice
        };
    });
    
    state.activeSelections = newSelections;
    renderPartsTable();
}

function renderPartsTable() {
    const tbody = document.getElementById('partsTableBody');
    if (!tbody) return;
    tbody.innerHTML = '';
    
    const includedParts = getIncludedPartsList();
    
    if (includedParts.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" style="text-align: center; color: var(--text-secondary);">該車型規格查無施工項目</td></tr>`;
        return;
    }
    
    includedParts.forEach(partKey => {
        const selection = state.activeSelections[partKey] || { checked: true, qty: 1, customPrice: null };
        const basePrice = getDbPrice(partKey);
        const currentPrice = selection.customPrice !== null ? selection.customPrice : basePrice;
        const total = currentPrice * selection.qty;
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: center;">
                <input type="checkbox" class="part-checkbox" data-part="${partKey}" ${selection.checked ? 'checked' : ''}>
            </td>
            <td><strong>${partKey}</strong></td>
            <td class="part-price-cell">
                <span class="price-display" data-part="${partKey}" style="cursor: pointer; border-bottom: 1px dashed var(--primary);" title="雙擊可修改單價">
                    NT$ ${currentPrice.toLocaleString()}
                </span>
            </td>
            <td style="text-align: center;">
                <input type="number" class="qty-input" data-part="${partKey}" value="${selection.qty}" min="0">
            </td>
            <td class="part-price-cell" style="text-align: right; font-weight: bold; color: var(--primary);">
                NT$ ${total.toLocaleString()}
            </td>
        `;
        
        // Checkbox listener
        tr.querySelector('.part-checkbox').addEventListener('change', (e) => {
            state.activeSelections[partKey].checked = e.target.checked;
            renderPartsTable();
            renderQuote();
        });
        
        // Qty input listener
        tr.querySelector('.qty-input').addEventListener('change', (e) => {
            let val = parseInt(e.target.value);
            if (isNaN(val) || val < 0) val = 0;
            state.activeSelections[partKey].qty = val;
            renderPartsTable();
            renderQuote();
        });
        
        // Double click price edit listener
        const priceDisplay = tr.querySelector('.price-display');
        priceDisplay.addEventListener('dblclick', () => {
            const currentVal = currentPrice;
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.value = currentVal;
            input.style.width = '100px';
            input.className = 'qty-input';
            
            const commit = () => {
                const newVal = parseInt(input.value);
                if (!isNaN(newVal) && newVal >= 0) {
                    state.activeSelections[partKey].customPrice = newVal;
                } else {
                    state.activeSelections[partKey].customPrice = null;
                }
                renderPartsTable();
                renderQuote();
            };
            
            input.addEventListener('blur', commit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commit();
                }
            });
            
            priceDisplay.replaceWith(input);
            input.focus();
        });
        
        tbody.appendChild(tr);
    });
}

function renderQuote() {
    const container = document.getElementById('quoteItemsContainer');
    if (!container) return;
    container.innerHTML = '';
    
    let subtotal = 0;
    let itemsCount = 0;
    
    Object.entries(state.activeSelections).forEach(([partKey, selection]) => {
        if (!selection.checked || selection.qty === 0) return;
        
        const basePrice = getDbPrice(partKey);
        const price = selection.customPrice !== null ? selection.customPrice : basePrice;
        const partTotal = price * selection.qty;
        
        subtotal += partTotal;
        itemsCount++;
        
        const el = document.createElement('div');
        el.className = 'quote-item';
        el.innerHTML = `
            <div class="quote-item-info">
                <div class="quote-item-part">${partKey} (x${selection.qty})</div>
                <div class="quote-item-service">${serviceCatalog[state.material].name}</div>
            </div>
            <div class="quote-item-price-wrapper">
                <span class="quote-item-price">NT$ ${partTotal.toLocaleString()}</span>
                <button class="quote-item-delete" title="排除此部位">
                    <svg viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>
        `;
        
        el.querySelector('.quote-item-delete').addEventListener('click', () => {
            state.activeSelections[partKey].checked = false;
            renderPartsTable();
            renderQuote();
        });
        
        // Enable double click price edit in the sidebar quote list too!
        const quoteItemPriceSpan = el.querySelector('.quote-item-price');
        quoteItemPriceSpan.addEventListener('dblclick', () => {
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.value = price; // edit single item price
            input.style.width = '90px';
            
            const commit = () => {
                const newVal = parseInt(input.value);
                if (!isNaN(newVal) && newVal >= 0) {
                    state.activeSelections[partKey].customPrice = newVal;
                } else {
                    state.activeSelections[partKey].customPrice = null;
                }
                renderPartsTable();
                renderQuote();
            };
            
            input.addEventListener('blur', commit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commit();
                }
            });
            
            quoteItemPriceSpan.replaceWith(input);
            input.focus();
        });
        
        container.appendChild(el);
    });
    
    if (itemsCount === 0) {
        container.innerHTML = `
            <div class="empty-quote-state">
                <svg viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z"/>
                </svg>
                <span>尚未選取或載入施工部位</span>
            </div>
        `;
    }
    
    // Calculations
    const discountAmount = Math.round(subtotal * (1 - (state.discount / 100)));
    const total = subtotal - discountAmount;
    const vat = Math.round(total * 0.05);
    
    // Update screen UI values
    document.getElementById('valSubtotal').textContent = `NT$ ${subtotal.toLocaleString()}`;
    document.getElementById('valDiscount').textContent = `- NT$ ${discountAmount.toLocaleString()} (${state.discount === 100 ? '無' : state.discount + ' 折'})`;
    document.getElementById('valVat').textContent = `NT$ ${vat.toLocaleString()}`;
    document.getElementById('valTotal').textContent = `NT$ ${total.toLocaleString()}`;
    
    const badgeText = document.getElementById('selectedItemsCount');
    if (badgeText) {
        badgeText.textContent = `${itemsCount} 項`;
    }
}

function setupEventListeners() {
    // Brand Type Dropdown Toggle
    const brandTypeSelect = document.getElementById('brandType');
    const subGroupTesla = document.getElementById('subGroupTesla');
    const subGroupOthers = document.getElementById('subGroupOthers');

    if (brandTypeSelect) {
        brandTypeSelect.addEventListener('change', (e) => {
            state.brandType = e.target.value;
            if (state.brandType === 'tesla') {
                subGroupTesla.style.display = 'block';
                subGroupOthers.style.display = 'none';
                
                const activeTesla = document.querySelector('#subGroupTesla .vehicle-type-btn.active');
                state.vehicleClass = activeTesla ? activeTesla.dataset.type : 'Model Y';
            } else {
                subGroupTesla.style.display = 'none';
                subGroupOthers.style.display = 'block';
                
                state.vehicleType = document.getElementById('vehicleTypeSelect').value;
                state.vehicleMethod = document.getElementById('vehicleMethodSelect').value;
                state.vehicleSize = document.getElementById('vehicleSizeSelect').value;
            }
            resetSelectionsForCurrentVehicle();
            renderQuote();
        });
    }

    // Tesla Model Buttons Click
    document.querySelectorAll('#subGroupTesla .vehicle-type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnEl = e.currentTarget;
            document.querySelectorAll('#subGroupTesla .vehicle-type-btn').forEach(b => b.classList.remove('active'));
            btnEl.classList.add('active');
            state.vehicleClass = btnEl.dataset.type;
            
            resetSelectionsForCurrentVehicle();
            renderQuote();
        });
    });

    // Others vehicle class selects
    const typeSelect = document.getElementById('vehicleTypeSelect');
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            state.vehicleType = e.target.value;
            resetSelectionsForCurrentVehicle();
            renderQuote();
        });
    }

    const methodSelect = document.getElementById('vehicleMethodSelect');
    if (methodSelect) {
        methodSelect.addEventListener('change', (e) => {
            state.vehicleMethod = e.target.value;
            resetSelectionsForCurrentVehicle();
            renderQuote();
        });
    }

    const sizeSelect = document.getElementById('vehicleSizeSelect');
    if (sizeSelect) {
        sizeSelect.addEventListener('change', (e) => {
            state.vehicleSize = e.target.value;
            resetSelectionsForCurrentVehicle();
            renderQuote();
        });
    }

    // Customer Info Inputs
    const inputs = ['customerName', 'customerPhone', 'plateNumber', 'brandModel', 'usedMaterial'];
    inputs.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', (e) => {
                state[id] = e.target.value;
            });
        }
    });

    // Discount Input
    const discountEl = document.getElementById('discountInput');
    if (discountEl) {
        discountEl.addEventListener('input', (e) => {
            let val = parseInt(e.target.value);
            if (isNaN(val) || val < 0) val = 100;
            if (val > 100) val = 100;
            state.discount = val;
            renderQuote();
        });
    }

    // Material Dropdown Select
    const materialSelect = document.getElementById('materialSelect');
    if (materialSelect) {
        materialSelect.addEventListener('change', (e) => {
            state.material = e.target.value;
            resetSelectionsForCurrentVehicle();
            renderQuote();
        });
    }

    // All select / deselect buttons
    document.getElementById('btnSelectAllParts').addEventListener('click', () => {
        Object.keys(state.activeSelections).forEach(k => {
            state.activeSelections[k].checked = true;
        });
        renderPartsTable();
        renderQuote();
    });

    document.getElementById('btnDeselectAllParts').addEventListener('click', () => {
        Object.keys(state.activeSelections).forEach(k => {
            state.activeSelections[k].checked = false;
        });
        renderPartsTable();
        renderQuote();
    });

    // Save Quote Button
    const btnSave = document.getElementById('btnSaveQuote');
    if (btnSave) {
        btnSave.addEventListener('click', saveCurrentQuote);
    }

    // Clear Quote Button
    const btnClear = document.getElementById('btnClearQuote');
    if (btnClear) {
        btnClear.addEventListener('click', clearQuote);
    }

    // Print Quote Button
    const btnPrint = document.getElementById('btnPrintFullQuote');
    if (btnPrint) {
        btnPrint.addEventListener('click', triggerPrint);
    }
}

function clearQuote() {
    state.customerName = '';
    state.customerPhone = '';
    state.plateNumber = '';
    state.brandModel = '';
    state.usedMaterial = '';
    state.discount = 100;
    state.material = 'axColor';
    
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('plateNumber').value = '';
    document.getElementById('brandModel').value = '';
    document.getElementById('usedMaterial').value = '';
    document.getElementById('discountInput').value = '100';
    document.getElementById('materialSelect').value = 'axColor';

    state.brandType = 'others';
    state.vehicleClass = 'Model Y';
    state.vehicleType = 'sedan';
    state.vehicleMethod = 'ac';
    state.vehicleSize = 'S';

    document.getElementById('brandType').value = 'others';
    document.getElementById('subGroupTesla').style.display = 'none';
    document.getElementById('subGroupOthers').style.display = 'block';
    
    document.getElementById('vehicleTypeSelect').value = 'sedan';
    document.getElementById('vehicleMethodSelect').value = 'ac';
    document.getElementById('vehicleSizeSelect').value = 'S';

    document.querySelectorAll('#subGroupTesla .vehicle-type-btn').forEach(b => b.classList.remove('active'));
    const defaultTeslaBtn = document.querySelector('#subGroupTesla .vehicle-type-btn[data-type="Model Y"]');
    if (defaultTeslaBtn) defaultTeslaBtn.classList.add('active');

    resetSelectionsForCurrentVehicle();
    renderQuote();
    showToast('報價單已清除重設');
}

function serializeSelections(selections) {
    const serialized = {};
    Object.entries(selections).forEach(([partId, item]) => {
        serialized[partId] = {
            checked: item.checked,
            qty: item.qty,
            customPrice: item.customPrice
        };
    });
    return serialized;
}

function saveCurrentQuote() {
    let activeItemsCount = 0;
    let subtotal = 0;
    
    Object.entries(state.activeSelections).forEach(([partKey, selection]) => {
        if (selection.checked && selection.qty > 0) {
            activeItemsCount++;
            const basePrice = getDbPrice(partKey);
            const price = selection.customPrice !== null ? selection.customPrice : basePrice;
            subtotal += price * selection.qty;
        }
    });

    if (activeItemsCount === 0) {
        alert('請先選取施工部位，新增報價項目後再進行儲存。');
        return;
    }

    const discountAmount = Math.round(subtotal * (1 - (state.discount / 100)));
    const total = subtotal - discountAmount;
    const vat = Math.round(total * 0.05);

    const record = {
        id: 'Q' + Date.now(),
        date: new Date().toLocaleString('zh-TW', { hour12: false }) + ' (全車)',
        customerName: state.customerName || '未填寫客戶',
        customerPhone: state.customerPhone || '無聯絡電話',
        plateNumber: state.plateNumber || '無車牌',
        brandModel: state.brandModel || '未填車型',
        usedMaterial: state.usedMaterial || '',
        brandType: state.brandType,
        vehicleClass: state.vehicleClass,
        vehicleType: state.vehicleType,
        vehicleMethod: state.vehicleMethod,
        vehicleSize: state.vehicleSize,
        material: state.material,
        isFullQuote: true,
        activeSelections: serializeSelections(state.activeSelections),
        discount: state.discount,
        subtotal: subtotal,
        discountAmount: discountAmount,
        vat: vat,
        total: total
    };

    state.history.unshift(record);
    if (state.history.length > 10) {
        state.history.pop();
    }

    saveHistoryToStorage();
    renderHistory();
    showToast('全車報價紀錄已儲存');
}

function renderHistory() {
    const container = document.getElementById('historyContainer');
    if (!container) return;

    container.innerHTML = '';

    if (state.history.length === 0) {
        container.innerHTML = `
            <div style="text-align: center; color: var(--text-secondary); padding: 1.5rem 0; font-size: 0.85rem;">
                暫無歷史報價紀錄
            </div>
        `;
        return;
    }

    state.history.forEach(record => {
        const item = document.createElement('div');
        item.className = 'history-item';
        item.innerHTML = `
            <div class="history-info">
                <div class="history-plate">${record.plateNumber} (${record.customerName})</div>
                <div class="history-date">${record.date}</div>
            </div>
            <div class="history-price">NT$ ${record.total.toLocaleString()}</div>
        `;

        item.addEventListener('click', () => {
            loadQuoteRecord(record);
        });

        container.appendChild(item);
    });
}

function loadQuoteRecord(record) {
    if (confirm(`確定要載入 ${record.plateNumber} (${record.customerName}) 的歷史報價嗎？目前的報價資料將會被覆蓋。`)) {
        state.customerName = record.customerName;
        state.customerPhone = record.customerPhone;
        state.plateNumber = record.plateNumber;
        state.brandModel = record.brandModel;
        state.usedMaterial = record.usedMaterial || '';
        state.brandType = record.brandType || 'others';
        state.vehicleClass = record.vehicleClass || 'Model Y';
        state.vehicleType = record.vehicleType || 'sedan';
        state.vehicleMethod = record.vehicleMethod || 'ac';
        state.vehicleSize = record.vehicleSize || 'S';
        state.discount = record.discount || 100;
        state.material = record.material || 'axColor';
        
        document.getElementById('customerName').value = record.customerName === '未填寫客戶' ? '' : record.customerName;
        document.getElementById('customerPhone').value = record.customerPhone === '無聯絡電話' ? '' : record.customerPhone;
        document.getElementById('plateNumber').value = record.plateNumber === '無車牌' ? '' : record.plateNumber;
        document.getElementById('brandModel').value = record.brandModel === '未填車型' ? '' : record.brandModel;
        document.getElementById('usedMaterial').value = record.usedMaterial || '';
        document.getElementById('discountInput').value = record.discount || 100;
        document.getElementById('materialSelect').value = state.material;

        const brandTypeSelect = document.getElementById('brandType');
        const subGroupTesla = document.getElementById('subGroupTesla');
        const subGroupOthers = document.getElementById('subGroupOthers');
        
        if (brandTypeSelect) {
            brandTypeSelect.value = state.brandType;
            if (state.brandType === 'tesla') {
                subGroupTesla.style.display = 'block';
                subGroupOthers.style.display = 'none';
                
                document.querySelectorAll('#subGroupTesla .vehicle-type-btn').forEach(b => {
                    if (b.dataset.type === state.vehicleClass) {
                        b.classList.add('active');
                    } else {
                        b.classList.remove('active');
                    }
                });
            } else {
                subGroupTesla.style.display = 'none';
                subGroupOthers.style.display = 'block';
                
                document.getElementById('vehicleTypeSelect').value = state.vehicleType;
                document.getElementById('vehicleMethodSelect').value = state.vehicleMethod;
                document.getElementById('vehicleSizeSelect').value = state.vehicleSize;
            }
        }

        // Restore selections
        if (record.isFullQuote && record.activeSelections) {
            const restoredSelections = {};
            Object.entries(record.activeSelections).forEach(([partKey, item]) => {
                restoredSelections[partKey] = {
                    checked: item.checked,
                    qty: item.qty,
                    customPrice: item.customPrice
                };
            });
            state.activeSelections = restoredSelections;
            renderPartsTable();
        } else {
            // If it's a partial quote loaded into full-quote, convert it nicely
            const restoredSelections = {};
            // For partial quotes, activeSelections is dbKey -> Set of serviceKeys
            // Since it's a Set serialized as array:
            Object.entries(record.activeSelections || {}).forEach(([partKey, serviceKeysArray]) => {
                restoredSelections[partKey] = {
                    checked: true,
                    qty: defaultQuantities[partKey] || 1,
                    customPrice: null
                };
            });
            state.activeSelections = restoredSelections;
            renderPartsTable();
        }

        renderQuote();
        showToast('已載入歷史報價');
    }
}

function triggerPrint() {
    const printArea = document.getElementById('print-area');
    if (!printArea) return;

    let subtotal = 0;
    const itemsRows = [];

    Object.entries(state.activeSelections).forEach(([partKey, selection]) => {
        if (!selection.checked || selection.qty === 0) return;
        
        const basePrice = getDbPrice(partKey);
        const price = selection.customPrice !== null ? selection.customPrice : basePrice;
        const partTotal = price * selection.qty;
        subtotal += partTotal;

        itemsRows.push(`
            <tr>
                <td><strong>${partKey}</strong></td>
                <td>${serviceCatalog[state.material].name}</td>
                <td>${selection.qty}</td>
                <td style="text-align: right;">NT$ ${partTotal.toLocaleString()}</td>
            </tr>
        `);
    });

    if (itemsRows.length === 0) {
        alert('請先選取施工部位，新增報價項目後再進行列印。');
        return;
    }

    const discountAmount = Math.round(subtotal * (1 - (state.discount / 100)));
    const total = subtotal - discountAmount;
    const vat = Math.round(total * 0.05);

    let vehicleSpecName = '';
    if (state.brandType === 'tesla') {
        vehicleSpecName = `Tesla ${state.vehicleClass}`;
    } else {
        const typeNames = { sedan: '轎車/跑車', suv: '休旅車', van: '箱型車' };
        const methodNames = { ac: '後葉連 A/C 柱', ac_skirt: '後葉連 A/C 柱連側裙' };
        vehicleSpecName = `其他品牌 (${typeNames[state.vehicleType] || state.vehicleType}) - ${methodNames[state.vehicleMethod]} - 尺寸: ${state.vehicleSize}`;
    }
    
    const dateStr = new Date().toLocaleString('zh-TW', { hour12: false, dateStyle: 'long', timeStyle: 'short' });

    printArea.innerHTML = `
        <div class="print-invoice-header" style="display: flex; flex-direction: column; align-items: center; text-align: center; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 25px;">
            <div style="font-size: 22pt; font-weight: bold; color: #1a365d; letter-spacing: 2px;">好室多膜 - 全車貼膜施工估價單</div>
            <div style="font-size: 9.5pt; color: #4a5568; margin-top: 6px; display: flex; gap: 20px; justify-content: center;">
                <span>專業車身貼膜、犀牛皮防護、個性改色施工報價</span>
                <span>•</span>
                <span>報價日期: ${dateStr}</span>
            </div>
        </div>

        <div class="print-meta-grid">
            <div class="print-meta-box">
                <div class="print-meta-title">顧客與車輛資訊</div>
                <div class="print-meta-row">
                    <span class="print-meta-label">車主姓名:</span>
                    <span>${state.customerName || '未填寫'}</span>
                </div>
                <div class="print-meta-row">
                    <span class="print-meta-label">聯絡電話:</span>
                    <span>${state.customerPhone || '未填寫'}</span>
                </div>
                <div class="print-meta-row">
                    <span class="print-meta-label">車牌號碼:</span>
                    <span style="font-family: monospace; font-weight: bold; letter-spacing: 1px;">${state.plateNumber || '未填寫'}</span>
                </div>
            </div>
            <div class="print-meta-box">
                <div class="print-meta-title">車輛與施工資訊</div>
                <div class="print-meta-row">
                    <span class="print-meta-label">廠牌車型:</span>
                    <span>${state.brandModel || '未填寫'}</span>
                </div>
                <div class="print-meta-row">
                    <span class="print-meta-label">車型分類:</span>
                    <span>${vehicleSpecName}</span>
                </div>
                <div class="print-meta-row">
                    <span class="print-meta-label">使用膜料:</span>
                    <span>${state.usedMaterial || '未填寫'}</span>
                </div>
            </div>
        </div>

        <table class="print-table">
            <thead>
                <tr>
                    <th>施工部位</th>
                    <th>貼膜材質項目</th>
                    <th>數量</th>
                    <th style="text-align: right;">金額 (NTD)</th>
                </tr>
            </thead>
            <tbody>
                ${itemsRows.join('')}
            </tbody>
        </table>

        <div class="print-total-box">
            <div class="print-total-row">
                <span>項目小計:</span>
                <span>NT$ ${subtotal.toLocaleString()}</span>
            </div>
            <div class="print-total-row">
                <span>折扣折抵:</span>
                <span>${state.discount === 100 ? '無折扣' : `- NT$ ${discountAmount.toLocaleString()} (${state.discount} 折)`}</span>
            </div>
            <div class="print-total-row">
                <span>營業稅 (5% 內含):</span>
                <span>NT$ ${vat.toLocaleString()}</span>
            </div>
            <div class="print-total-row grand-total">
                <span>總計金額:</span>
                <span>NT$ ${total.toLocaleString()}</span>
            </div>
        </div>

        <div style="margin-top: 30px; display: flex; justify-content: space-between; align-items: flex-start;">
            <div style="flex: 1; border-top: 1px dashed #ccc; padding-top: 15px; margin-right: 20px;">
                <div style="font-size: 10pt; font-weight: bold; color: #2d3748; margin-bottom: 5px;">備註說明：</div>
                <ol style="font-size: 8.5pt; color: #718096; padding-left: 20px; line-height: 1.5;">
                    <li>本估價單報價自開立起 30 天內有效。</li>
                    <li>貼膜施工作業時間依部位多寡而定，實際進場施工作業以約定排程為準。</li>
                    <li>若施工部位原漆面已有深層刮傷、凹陷或漆面剝落，施工後可能存在收邊瑕疵，會於施作前與客戶確認。</li>
                </ol>
            </div>
            <div style="width: 220px; text-align: center; border-top: 1px dashed #ccc; padding-top: 15px; display: flex; flex-direction: column; align-items: center; justify-content: center;">
                <div style="font-size: 9.5pt; font-weight: bold; color: #2d3748; margin-bottom: 10px;">公司蓋章處：</div>
                <div style="height: 90px; display: flex; align-items: center; justify-content: center;">
                    <img src="company-stamp.jpg" style="max-height: 85px; max-width: 200px; mix-blend-mode: multiply; opacity: 0.9;" alt="公司蓋章">
                </div>
            </div>
        </div>

        <div class="print-footer">
            技術支援與維護：好室多膜全車施工查價報價系統 | 感謝您的支持，祝您行車平安！
        </div>
    `;

    window.print();
}

function showToast(message) {
    const toast = document.getElementById('toastNotification');
    if (!toast) return;

    toast.querySelector('.toast-message').textContent = message;
    toast.classList.add('show');

    setTimeout(() => {
        toast.classList.remove('show');
    }, 3000);
}
