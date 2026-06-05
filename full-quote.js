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
    material: 'axE',           // default: axE
    addonPixel8bit: false,     // checkbox status
    discount: 100,             // percentage, e.g., 90 for 10% off
    customPackagePrice: null,  // user override for package price
    customAddonPrice: null,    // user override for addon price
    activeSelections: {},      // dbKey -> { checked: boolean, qty: number, customPrice: number | null }
    history: []
};

const serviceCatalog = {
    axE: { name: 'AX改色膜 - E系列 (基本色)', desc: 'AX品牌基本色系E系列改色膜，完美包邊' },
    axV: { name: 'AX改色膜 - V系列 (特殊一階)', desc: 'AX特殊色系一階V系列改色膜' },
    axG: { name: 'AX改色膜 - G系列 (特殊二階)', desc: 'AX特殊色系二階G系列改色膜' },
    axT: { name: 'AX改色膜 - T系列 (特殊三階)', desc: 'AX特殊色系三階T系列改色膜' },
    threeMGMS: { name: '3M 2080 - G/M/S系列 (基本色)', desc: '3M 2080高品質基本色系改色膜' },
    threeMGP: { name: '3M 2080 - GP/SP系列 (特殊一階)', desc: '3M 2080特殊色系一階改色膜' },
    threeMHG: { name: '3M 2080 - HG系列 (特殊二階)', desc: '3M 2080特殊色系二階改色膜' },
    pixel8bit: { name: '車頭加強犀牛皮防護 - 國產 pixel8bit', desc: '常跑高速車頭加強犀牛皮保護（引擎蓋、前葉子版）' }
};

const packagePrices = {
    axE: { S: 60000, M: 65000, L: 70000, XL: 75000, '2XL': 80000 },
    axV: { S: 63000, M: 68000, L: 73000, XL: 78000, '2XL': 83000 },
    axG: { S: 65000, M: 70000, L: 75000, XL: 80000, '2XL': 85000 },
    axT: { S: 68000, M: 73000, L: 78000, XL: 83000, '2XL': 88000 },
    threeMGMS: { S: 70000, M: 75000, L: 80000, XL: 85000, '2XL': 90000 },
    threeMGP: { S: 75000, M: 80000, L: 85000, XL: 90000, '2XL': 95000 },
    threeMHG: { S: 80000, M: 85000, L: 90000, XL: 95000, '2XL': 100000 },
    pixel8bit: { S: 18000, M: 18000, L: 18000, XL: 18000, '2XL': 18000 }
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

function getTeslaSize(model) {
    switch (model) {
        case 'Model 3': return 'M';
        case 'Model Y': return 'L';
        case '新款Model Y': return 'L';
        case 'Model S': return 'XL';
        case 'Model X': return '2XL';
        default: return 'L';
    }
}

function getActiveSize() {
    return state.brandType === 'tesla' ? getTeslaSize(state.vehicleClass) : (state.vehicleSize === '其他' ? 'L' : state.vehicleSize);
}

function getPackageBasePrice() {
    const size = getActiveSize();
    const mat = state.material;
    if (packagePrices[mat]) {
        return packagePrices[mat][size] || 0;
    }
    return 0;
}

function getIncludedPartsList() {
    const brand = state.brandType;
    
    // For our new packages, if selected material is pixel8bit, the parts list should only contain: "引擎蓋", "前葉子版"
    if (state.material === 'pixel8bit') {
        return ["引擎蓋", "前葉子版"];
    }
    
    // For other AX/3M packages, list all standard parts:
    const generalParts = ["前保桿", "引擎蓋", "前葉子版", "前門", "後門", "尾箱上", "尾箱下", "尾翼", "後保桿", "手把（單支）", "後照鏡（單邊）"];
    if (brand === 'tesla') {
        if (state.vehicleClass === 'Model X' || state.vehicleClass === 'Model S') {
            return [...generalParts, "AC連接後葉"];
        }
        return [...generalParts, "AC連接後葉、側裙"];
    } else {
        if (state.vehicleMethod === 'ac') {
            return [...generalParts, "AC連接後葉", "側裙"];
        } else {
            return [...generalParts, "AC連接後葉、側裙"];
        }
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
        
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td style="text-align: center;">
                <input type="checkbox" class="part-checkbox" data-part="${partKey}" ${selection.checked ? 'checked' : ''}>
            </td>
            <td><strong>${partKey}</strong></td>
            <td colspan="3" class="part-price-cell" style="color: var(--text-secondary); font-style: italic;">
                ${selection.checked ? '已包含在施工方案中' : '不施作'}
            </td>
        `;
        
        // Checkbox listener
        tr.querySelector('.part-checkbox').addEventListener('change', (e) => {
            if (!state.activeSelections[partKey]) {
                state.activeSelections[partKey] = { checked: true, qty: 1, customPrice: null };
            }
            state.activeSelections[partKey].checked = e.target.checked;
            renderPartsTable();
            renderQuote();
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
    
    // 1. Base Full Car Package Item
    const basePrice = getPackageBasePrice();
    const pkgPrice = state.customPackagePrice !== null ? state.customPackagePrice : basePrice;
    subtotal += pkgPrice;
    itemsCount++;
    
    const pkgEl = document.createElement('div');
    pkgEl.className = 'quote-item';
    pkgEl.innerHTML = `
        <div class="quote-item-info">
            <div class="quote-item-part">全車貼膜施工 (${getActiveSize()} 尺寸)</div>
            <div class="quote-item-service">${serviceCatalog[state.material].name}</div>
        </div>
        <div class="quote-item-price-wrapper">
            <span class="quote-item-price" style="cursor: pointer; border-bottom: 1px dashed var(--primary);" title="雙擊可修改此方案報價">NT$ ${pkgPrice.toLocaleString()}</span>
        </div>
    `;
    
    // Double click to override package price
    const pkgPriceSpan = pkgEl.querySelector('.quote-item-price');
    pkgPriceSpan.addEventListener('dblclick', () => {
        const input = document.createElement('input');
        input.type = 'number';
        input.min = '0';
        input.value = pkgPrice;
        input.style.width = '90px';
        
        const commit = () => {
            const newVal = parseInt(input.value);
            if (!isNaN(newVal) && newVal >= 0) {
                state.customPackagePrice = newVal;
            } else {
                state.customPackagePrice = null;
            }
            renderQuote();
        };
        
        input.addEventListener('blur', commit);
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                commit();
            }
        });
        
        pkgPriceSpan.innerHTML = '';
        pkgPriceSpan.appendChild(input);
        input.focus();
    });
    
    container.appendChild(pkgEl);
    
    // 2. Add-on Item (if checked and material is not pixel8bit)
    if (state.material !== 'pixel8bit' && state.addonPixel8bit) {
        const addonPrice = state.customAddonPrice !== null ? state.customAddonPrice : 18000;
        subtotal += addonPrice;
        itemsCount++;
        
        const addonEl = document.createElement('div');
        addonEl.className = 'quote-item';
        addonEl.innerHTML = `
            <div class="quote-item-info">
                <div class="quote-item-part">加購車頭加強犀牛皮防護</div>
                <div class="quote-item-service">國產 pixel8bit (加強部位：引擎蓋、前葉子版)</div>
            </div>
            <div class="quote-item-price-wrapper">
                <span class="quote-item-price" style="cursor: pointer; border-bottom: 1px dashed var(--primary);" title="雙擊可修改加購報價">NT$ ${addonPrice.toLocaleString()}</span>
                <button class="quote-item-delete" title="取消此加購">
                    <svg viewBox="0 0 24 24">
                        <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                    </svg>
                </button>
            </div>
        `;
        
        addonEl.querySelector('.quote-item-delete').addEventListener('click', () => {
            state.addonPixel8bit = false;
            const addonCheckbox = document.getElementById('addonPixel8bit');
            if (addonCheckbox) addonCheckbox.checked = false;
            renderQuote();
        });
        
        const addonPriceSpan = addonEl.querySelector('.quote-item-price');
        addonPriceSpan.addEventListener('dblclick', () => {
            const input = document.createElement('input');
            input.type = 'number';
            input.min = '0';
            input.value = addonPrice;
            input.style.width = '90px';
            
            const commit = () => {
                const newVal = parseInt(input.value);
                if (!isNaN(newVal) && newVal >= 0) {
                    state.customAddonPrice = newVal;
                } else {
                    state.customAddonPrice = null;
                }
                renderQuote();
            };
            
            input.addEventListener('blur', commit);
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    commit();
                }
            });
            
            addonPriceSpan.innerHTML = '';
            addonPriceSpan.appendChild(input);
            input.focus();
        });
        
        container.appendChild(addonEl);
    }
    
    // Calculations
    const discountAmount = Math.round(subtotal * (1 - (state.discount / 100)));
    const total = subtotal - discountAmount;
    const vat = Math.round(total * 5 / 105);
    
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
            
            const addonContainer = document.getElementById('addonPixel8bitContainer');
            if (addonContainer) {
                if (state.material === 'pixel8bit') {
                    addonContainer.style.display = 'none';
                    state.addonPixel8bit = false;
                    const addonCheckbox = document.getElementById('addonPixel8bit');
                    if (addonCheckbox) addonCheckbox.checked = false;
                } else {
                    addonContainer.style.display = 'block';
                }
            }
            
            // Reset custom overrides when switching packages to avoid carrying over incorrect custom prices
            state.customPackagePrice = null;
            state.customAddonPrice = null;

            resetSelectionsForCurrentVehicle();
            renderQuote();
        });
    }

    // Addon Checkbox Listener
    const addonCheckbox = document.getElementById('addonPixel8bit');
    if (addonCheckbox) {
        addonCheckbox.addEventListener('change', (e) => {
            state.addonPixel8bit = e.target.checked;
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
    state.material = 'axE';
    state.addonPixel8bit = false;
    state.customPackagePrice = null;
    state.customAddonPrice = null;
    
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('plateNumber').value = '';
    document.getElementById('brandModel').value = '';
    document.getElementById('usedMaterial').value = '';
    document.getElementById('discountInput').value = '100';
    document.getElementById('materialSelect').value = 'axE';
    
    const addonCheckbox = document.getElementById('addonPixel8bit');
    if (addonCheckbox) addonCheckbox.checked = false;
    
    const addonContainer = document.getElementById('addonPixel8bitContainer');
    if (addonContainer) addonContainer.style.display = 'block';

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
    // 1. Base Full Car Package Item
    const basePrice = getPackageBasePrice();
    const pkgPrice = state.customPackagePrice !== null ? state.customPackagePrice : basePrice;
    let subtotal = pkgPrice;
    
    // 2. Add-on Item (if checked and material is not pixel8bit)
    if (state.material !== 'pixel8bit' && state.addonPixel8bit) {
        const addonPrice = state.customAddonPrice !== null ? state.customAddonPrice : 18000;
        subtotal += addonPrice;
    }

    const discountAmount = Math.round(subtotal * (1 - (state.discount / 100)));
    const total = subtotal - discountAmount;
    const vat = Math.round(total * 5 / 105);

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
        addonPixel8bit: state.addonPixel8bit,
        customPackagePrice: state.customPackagePrice,
        customAddonPrice: state.customAddonPrice,
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
        
        // Map old generic materials to new package names
        let savedMat = record.material || 'axE';
        if (savedMat === 'axColor') savedMat = 'axE';
        if (savedMat === 'threeMColor') savedMat = 'threeMGMS';
        if (['chinaGloss', 'chinaMatte', 'importGloss', 'importMatte'].includes(savedMat)) savedMat = 'pixel8bit';
        state.material = savedMat;

        state.addonPixel8bit = record.addonPixel8bit || false;
        state.customPackagePrice = record.customPackagePrice !== undefined ? record.customPackagePrice : null;
        state.customAddonPrice = record.customAddonPrice !== undefined ? record.customAddonPrice : null;
        
        document.getElementById('customerName').value = record.customerName === '未填寫客戶' ? '' : record.customerName;
        document.getElementById('customerPhone').value = record.customerPhone === '無聯絡電話' ? '' : record.customerPhone;
        document.getElementById('plateNumber').value = record.plateNumber === '無車牌' ? '' : record.plateNumber;
        document.getElementById('brandModel').value = record.brandModel === '未填車型' ? '' : record.brandModel;
        document.getElementById('usedMaterial').value = record.usedMaterial || '';
        document.getElementById('discountInput').value = record.discount || 100;
        document.getElementById('materialSelect').value = state.material;

        const addonCheckbox = document.getElementById('addonPixel8bit');
        if (addonCheckbox) addonCheckbox.checked = state.addonPixel8bit;

        const addonContainer = document.getElementById('addonPixel8bitContainer');
        if (addonContainer) {
            addonContainer.style.display = state.material === 'pixel8bit' ? 'none' : 'block';
        }

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

    // 1. Base Full Car Package Item
    const basePrice = getPackageBasePrice();
    const pkgPrice = state.customPackagePrice !== null ? state.customPackagePrice : basePrice;
    subtotal += pkgPrice;
    
    itemsRows.push(`
        <tr style="background-color: #f8fafc; font-weight: bold;">
            <td style="border-bottom: 1.5px solid #cbd5e0;"><strong>全車貼膜施工方案 (${getActiveSize()} 尺寸)</strong></td>
            <td style="border-bottom: 1.5px solid #cbd5e0;">${serviceCatalog[state.material].name}</td>
            <td style="text-align: center; border-bottom: 1.5px solid #cbd5e0;">1</td>
            <td style="text-align: right; color: #1a365d; font-weight: bold; border-bottom: 1.5px solid #cbd5e0;">NT$ ${pkgPrice.toLocaleString()}</td>
        </tr>
    `);
    
    // 2. Included parts list under full-car package
    const includedParts = getIncludedPartsList();
    const activeIncludedParts = includedParts.filter(partKey => {
        const selection = state.activeSelections[partKey];
        return selection && selection.checked;
    });

    activeIncludedParts.forEach((partKey, index) => {
        const selection = state.activeSelections[partKey];
        const isLast = index === activeIncludedParts.length - 1;
        const borderStyle = isLast ? 'border-bottom: 1.5px solid #cbd5e0;' : 'border-bottom: none;';
        
        itemsRows.push(`
            <tr style="font-size: 8.5pt; color: #4a5568; background-color: #fcfcfc;">
                <td style="padding-left: 25px; color: #4a5568; ${borderStyle}">• ${partKey}</td>
                <td style="color: #a0aec0; text-align: center; ${borderStyle}">-</td>
                <td style="text-align: center; color: #718096; ${borderStyle}">${selection.qty}</td>
                <td style="text-align: right; color: #718096; font-style: italic; font-size: 8.5pt; ${borderStyle}">已包含</td>
            </tr>
        `);
    });
    
    // 3. Add-on Item (if checked and material is not pixel8bit)
    if (state.material !== 'pixel8bit' && state.addonPixel8bit) {
        const addonPrice = state.customAddonPrice !== null ? state.customAddonPrice : 18000;
        subtotal += addonPrice;
        
        itemsRows.push(`
            <tr style="background-color: #f8fafc; font-weight: bold;">
                <td style="border-top: 1.5px solid #cbd5e0; border-bottom: 2px solid #cbd5e0;"><strong>加購：車頭加強犀牛皮防護</strong></td>
                <td style="border-top: 1.5px solid #cbd5e0; border-bottom: 2px solid #cbd5e0;">國產 pixel8bit (加強部位：引擎蓋、前葉子版)</td>
                <td style="text-align: center; border-top: 1.5px solid #cbd5e0; border-bottom: 2px solid #cbd5e0;">1</td>
                <td style="text-align: right; color: #1a365d; font-weight: bold; border-top: 1.5px solid #cbd5e0; border-bottom: 2px solid #cbd5e0;">NT$ ${addonPrice.toLocaleString()}</td>
            </tr>
        `);
    }

    const discountAmount = Math.round(subtotal * (1 - (state.discount / 100)));
    const total = subtotal - discountAmount;
    const vat = Math.round(total * 5 / 105);

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
        <div class="print-invoice-header" style="display: block; border-bottom: 2px solid #333; padding-bottom: 12px; margin-bottom: 25px;">
            <div style="font-size: 22pt; font-weight: bold; color: #1a365d; letter-spacing: 1px; white-space: nowrap;">好室多膜 - 全車貼膜施工估價單</div>
            <div style="font-size: 9.5pt; color: #4a5568; margin-top: 6px; display: flex; gap: 20px; align-items: center;">
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
                    <th style="width: 40%; text-align: left;">施工部位 / 項目</th>
                    <th style="width: 35%; text-align: left;">貼膜方案材質</th>
                    <th style="width: 10%; text-align: center;">數量</th>
                    <th style="width: 15%; text-align: right;">金額 (NTD)</th>
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
