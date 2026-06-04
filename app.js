// State Management
const state = {
    brandType: 'others',       // 'others' or 'tesla'
    vehicleClass: 'Model Y',   // for Tesla: Model 3, Model Y, 新款Model Y, Model S, Model X. Default 'Model Y'
    vehicleType: 'sedan',      // for others: 'sedan', 'suv', 'van'
    vehicleMethod: 'ac',       // for others: 'ac' (後葉連 A/C 柱), 'ac_skirt' (後葉連 A/C 柱連側裙)
    vehicleSize: 'S',          // for others: S, M, L, XL, 2XL, 其他
    customerName: '',
    customerPhone: '',
    plateNumber: '',
    brandModel: '',
    selectedPartId: null,      // Database Part Key (e.g. '前保桿')
    selectedPartName: '',
    activeSelections: {},      // dbKey -> Set of serviceKeys
    discount: 100,             // percentage, e.g., 90 for 10% off
    history: []
};

// Database Part Key to SVG Element IDs mapping
const dbPartToSvgMap = {
    "前保桿": ["front-bumper", "side-front-bumper"],
    "引擎蓋": ["front-hood", "side-hood"],
    "前葉子版": ["side-fender-f", "front-fender-l", "front-fender-r"],
    "前門": ["side-door-f"],
    "後門": ["side-door-r"],
    "AC": ["side-roof", "front-roof", "rear-roof"],
    "AC(不含後葉)": ["side-roof", "front-roof", "rear-roof"],
    "後葉": ["side-fender-r", "rear-fender-l", "rear-fender-r"],
    "後葉（連著側裙）": ["side-fender-r", "rear-fender-l", "rear-fender-r", "side-skirt"],
    "AC連接後葉": ["side-fender-r", "side-roof", "rear-fender-l", "rear-fender-r", "front-roof", "rear-roof"],
    "AC連接後葉、側裙": ["side-fender-r", "side-roof", "side-skirt", "rear-fender-l", "rear-fender-r", "front-roof", "rear-roof"],
    "側裙": ["side-skirt"],
    "尾箱上": ["side-trunk", "rear-trunk"],
    "尾箱下": ["side-trunk", "rear-trunk"],
    "尾箱上左右（單邊）": ["side-trunk", "rear-trunk"],
    "尾翼": [],
    "後保桿": ["rear-bumper", "side-rear-bumper"],
    "手把（單支）": [],
    "後照鏡（單邊）": ["side-mirror", "front-mirror-l", "front-mirror-r"]
};

// Service Catalog Info for wrapping materials from Excel
const serviceCatalog = {
    axColor: { name: 'AX改色膜', desc: 'AX品牌改色膜，色彩飽滿，完美收邊' },
    threeMColor: { name: '3M改色膜', desc: '3M高品質改色膜，質地優良，耐久性強' },
    chinaGloss: { name: '國產大陸犀牛皮（透明）', desc: '透明亮面防護漆面，高性價比防刮保護' },
    chinaMatte: { name: '國產大陸犀牛皮（消光）', desc: '啞光霧面防護漆面，高性價比質感保護' },
    importGloss: { name: '進口犀牛皮（透明）', desc: '進口頂級透明防護膜，強效自愈、超強增亮' },
    importMatte: { name: '進口犀牛皮（消光）', desc: '進口頂級消光防護膜，極致絲綢霧面質感、防刮' }
};

// DOM Init
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    loadHistoryFromStorage();
    setupEventListeners();
    populateQuickPartSelector();
    renderQuote();
    renderHistory();
    updateActiveSVGView();
    showToast('報價系統初始化完成');
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

function getVehicleShape() {
    if (state.brandType === 'tesla') {
        if (state.vehicleClass === 'Model Y' || state.vehicleClass === '新款Model Y' || state.vehicleClass === 'Model X') {
            return 'suv';
        }
        return 'sedan';
    } else {
        return state.vehicleType;
    }
}

function updateActiveSVGView() {
    const activeTabEl = document.querySelector('.view-tab.active');
    if (!activeTabEl) return;
    
    const activeTab = activeTabEl.dataset.view; // side, front, rear
    const shape = getVehicleShape(); // sedan, suv, van
    
    document.querySelectorAll('.car-svg-wrapper').forEach(w => {
        w.style.display = 'none';
    });
    
    const targetWrapper = document.getElementById(`${shape}-${activeTab}-view-wrapper`);
    if (targetWrapper) {
        targetWrapper.style.display = 'flex';
    }
}

function getDbKeyFromSvgId(partId) {
    const isTesla = state.brandType === 'tesla';
    
    switch (partId) {
        case 'side-front-bumper':
        case 'front-bumper':
            return '前保桿';
        case 'side-hood':
        case 'front-hood':
            return '引擎蓋';
        case 'side-fender-f':
        case 'front-fender-l':
        case 'front-fender-r':
            return '前葉子版';
        case 'side-door-f':
            return '前門';
        case 'side-door-r':
            return '後門';
        case 'side-roof':
        case 'front-roof':
        case 'rear-roof':
            if (isTesla) {
                return 'AC';
            } else {
                return state.vehicleMethod === 'ac_skirt' ? 'AC連接後葉、側裙' : 'AC連接後葉';
            }
        case 'side-fender-r':
        case 'rear-fender-l':
        case 'rear-fender-r':
            if (isTesla) {
                return state.vehicleClass === 'Model 3' ? '後葉（連著側裙）' : '後葉';
            } else {
                return state.vehicleMethod === 'ac_skirt' ? 'AC連接後葉、側裙' : 'AC連接後葉';
            }
        case 'side-skirt':
            if (isTesla) {
                return null;
            } else {
                return state.vehicleMethod === 'ac_skirt' ? 'AC連接後葉、側裙' : '側裙';
            }
        case 'side-trunk':
        case 'rear-trunk':
            return '尾箱上';
        case 'rear-bumper':
        case 'side-rear-bumper':
            return '後保桿';
        case 'side-mirror':
        case 'front-mirror-l':
        case 'front-mirror-r':
            return '後照鏡（單邊）';
        default:
            return null;
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
            populateQuickPartSelector();
            closeConfigurator();
            updateActiveSVGView();
            renderQuote();
            updateAllSVGPartStates();
        });
    }

    // Tesla Model Buttons Click
    document.querySelectorAll('#subGroupTesla .vehicle-type-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const btnEl = e.currentTarget;
            document.querySelectorAll('#subGroupTesla .vehicle-type-btn').forEach(b => b.classList.remove('active'));
            btnEl.classList.add('active');
            state.vehicleClass = btnEl.dataset.type;
            
            closeConfigurator();
            updateActiveSVGView();
            renderQuote();
            updateAllSVGPartStates();
        });
    });

    // Others vehicle class selects
    const typeSelect = document.getElementById('vehicleTypeSelect');
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            state.vehicleType = e.target.value;
            closeConfigurator();
            updateActiveSVGView();
            renderQuote();
            updateAllSVGPartStates();
        });
    }

    const methodSelect = document.getElementById('vehicleMethodSelect');
    if (methodSelect) {
        methodSelect.addEventListener('change', (e) => {
            state.vehicleMethod = e.target.value;
            closeConfigurator();
            renderQuote();
            updateAllSVGPartStates();
        });
    }

    const sizeSelect = document.getElementById('vehicleSizeSelect');
    if (sizeSelect) {
        sizeSelect.addEventListener('change', (e) => {
            state.vehicleSize = e.target.value;
            closeConfigurator();
            renderQuote();
            updateAllSVGPartStates();
        });
    }

    // Customer Info Inputs
    const inputs = ['customerName', 'customerPhone', 'plateNumber', 'brandModel'];
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

    // View Tabs (SVG switching)
    document.querySelectorAll('.view-tab').forEach(tab => {
        tab.addEventListener('click', (e) => {
            document.querySelectorAll('.view-tab').forEach(t => t.classList.remove('active'));
            e.target.classList.add('active');
            updateActiveSVGView();
            closeConfigurator();
        });
    });

    // Car SVG Part clicks
    document.querySelectorAll('.car-part').forEach(part => {
        part.addEventListener('click', (e) => {
            e.stopPropagation();
            const partEl = e.currentTarget;
            const fullId = partEl.id;
            const partId = fullId.replace(/^(sedan-|suv-|van-)/, '');
            const dbKey = getDbKeyFromSvgId(partId);
            if (dbKey) {
                selectPart(dbKey);
            } else {
                showToast('此部位無報價資料');
            }
        });
    });

    // Setup Svg Hover Effects
    setupSvgHoverEffects();

    // Click outside car parts to deselect
    document.addEventListener('click', (e) => {
        if (!e.target.closest('.car-part') && !e.target.closest('.configurator-card') && !e.target.closest('.quick-selector-container')) {
            closeConfigurator();
        }
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
    const btnPrint = document.getElementById('btnPrintQuote');
    if (btnPrint) {
        btnPrint.addEventListener('click', triggerPrint);
    }

    // Close Configurator X button
    const btnCloseConfig = document.getElementById('btnCloseConfig');
    if (btnCloseConfig) {
        btnCloseConfig.addEventListener('click', closeConfigurator);
    }

    // Quick Part Selector Dropdown Change
    const quickPartSelect = document.getElementById('quickPartSelect');
    if (quickPartSelect) {
        quickPartSelect.addEventListener('change', (e) => {
            const dbKey = e.target.value;
            if (dbKey) {
                selectPart(dbKey);
            }
        });
    }
}

function populateQuickPartSelector() {
    const selectEl = document.getElementById('quickPartSelect');
    if (!selectEl) return;
    
    selectEl.innerHTML = '';
    
    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = '-- 選擇車身部位 --';
    placeholder.disabled = true;
    placeholder.selected = !state.selectedPartId;
    selectEl.appendChild(placeholder);
    
    const brand = state.brandType;
    let keys = [];
    if (brand === 'tesla') {
        keys = Object.keys(pricingData.tesla.axColor);
    } else {
        keys = Object.keys(pricingData.others.axColor);
    }
    
    keys.forEach(k => {
        const option = document.createElement('option');
        option.value = k;
        option.textContent = k;
        if (state.selectedPartId === k) {
            option.selected = true;
        }
        selectEl.appendChild(option);
    });
}

function selectPart(dbKey) {
    if (!dbKey) return;

    document.querySelectorAll('.car-part').forEach(p => p.classList.remove('selected'));
    
    const svgIds = dbPartToSvgMap[dbKey] || [];
    const shape = getVehicleShape();
    svgIds.forEach(svgId => {
        const partEl = document.getElementById(`${shape}-${svgId}`);
        if (partEl) {
            partEl.classList.add('selected');
        }
    });

    state.selectedPartId = dbKey;
    state.selectedPartName = dbKey;

    const configCard = document.getElementById('configCard');
    const selectedPartNameEl = document.getElementById('selectedPartName');
    
    if (selectedPartNameEl) {
        selectedPartNameEl.textContent = state.selectedPartName;
    }
    if (configCard) {
        configCard.classList.add('active');
    }
    
    renderConfiguratorServices();

    const quickPartSelect = document.getElementById('quickPartSelect');
    if (quickPartSelect) {
        quickPartSelect.value = dbKey;
    }
}

function closeConfigurator() {
    document.querySelectorAll('.car-part').forEach(p => p.classList.remove('selected'));
    state.selectedPartId = null;
    state.selectedPartName = '';
    
    const configCard = document.getElementById('configCard');
    if (configCard) {
        configCard.classList.remove('active');
    }
    
    const quickPartSelect = document.getElementById('quickPartSelect');
    if (quickPartSelect) {
        quickPartSelect.value = '';
    }
}

function calculatePrice(dbKey, serviceKey) {
    if (typeof pricingData === 'undefined' || !pricingData) return null;
    
    const brand = state.brandType;
    const materialData = pricingData[brand] ? pricingData[brand][serviceKey] : null;
    if (!materialData) return null;
    
    const partData = materialData[dbKey];
    if (!partData) return null;
    
    if (brand === 'tesla') {
        const price = partData[state.vehicleClass];
        return (price !== undefined && price !== null) ? price : null;
    } else {
        const price = partData[state.vehicleSize];
        return (price !== undefined && price !== null) ? price : null;
    }
}

function renderConfiguratorServices() {
    const servicesGrid = document.getElementById('configServicesGrid');
    if (!servicesGrid) return;
    servicesGrid.innerHTML = '';

    const selectedServices = state.activeSelections[state.selectedPartId] || new Set();

    Object.entries(serviceCatalog).forEach(([key, info]) => {
        const price = calculatePrice(state.selectedPartId, key);
        const isActive = selectedServices.has(key);
        const isAvailable = price !== null;

        const card = document.createElement('div');
        if (!isAvailable) {
            card.className = 'service-card disabled';
            card.style.opacity = '0.45';
            card.style.cursor = 'not-allowed';
            card.style.pointerEvents = 'none'; // Prevent toggle
            card.innerHTML = `
                <div class="service-name" style="color: var(--text-secondary); text-decoration: line-through;">${info.name}</div>
                <div style="font-size: 0.75rem; color: var(--accent-red); margin-top: 0.25rem; font-weight: 600;">不提供此項目施工</div>
            `;
        } else if (state.selectedPartId.includes('無') || state.selectedPartId.includes('不可施工')) {
            card.className = 'service-card disabled';
            card.style.opacity = '0.45';
            card.style.cursor = 'not-allowed';
            card.innerHTML = `
                <div class="service-name">${info.name}</div>
                <div style="font-size: 0.75rem; color: var(--accent-red); margin-top: 0.25rem;">此部位無法進行施工</div>
            `;
        } else {
            card.className = `service-card ${isActive ? 'active' : ''}`;
            if (['大燈', '尾燈'].includes(state.selectedPartId)) {
                card.innerHTML = `
                    <div class="service-name">${info.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">${info.desc}</div>
                    <div class="service-price" style="font-weight: bold; font-size: 1rem; color: var(--primary); margin-top: 0.5rem;">實際造型報價4000~10000</div>
                `;
            } else {
                card.innerHTML = `
                    <div class="service-name">${info.name}</div>
                    <div style="font-size: 0.75rem; color: var(--text-secondary); margin-bottom: 0.25rem;">${info.desc}</div>
                    <div class="service-price" style="font-weight: bold; font-size: 1rem; color: var(--primary); margin-top: 0.5rem;">NT$ ${price.toLocaleString()}</div>
                `;
            }
            
            card.addEventListener('click', () => {
                toggleServiceSelection(state.selectedPartId, key);
            });
        }

        servicesGrid.appendChild(card);
    });
}

function toggleServiceSelection(partId, serviceKey) {
    if (!state.activeSelections[partId]) {
        state.activeSelections[partId] = new Set();
    }

    const selections = state.activeSelections[partId];
    if (selections.has(serviceKey)) {
        selections.delete(serviceKey);
        if (selections.size === 0) {
            delete state.activeSelections[partId];
        }
        showToast(`已移除項目: ${partId} - ${serviceCatalog[serviceKey].name}`);
    } else {
        selections.add(serviceKey);
        showToast(`已加入項目: ${partId} - ${serviceCatalog[serviceKey].name}`);
    }

    updateAllSVGPartStates();
    renderConfiguratorServices();
    renderQuote();
}

function updateAllSVGPartStates() {
    document.querySelectorAll('.car-part').forEach(p => p.classList.remove('has-service'));

    Object.keys(state.activeSelections).forEach(partId => {
        const svgIds = dbPartToSvgMap[partId] || [];
        svgIds.forEach(svgId => {
            ['sedan', 'suv', 'van'].forEach(shape => {
                const partEl = document.getElementById(`${shape}-${svgId}`);
                if (partEl) partEl.classList.add('has-service');
            });
        });
    });
}

function setupSvgHoverEffects() {
    document.querySelectorAll('.car-part').forEach(part => {
        part.addEventListener('mouseenter', (e) => {
            const partEl = e.currentTarget;
            const fullId = partEl.id;
            const partId = fullId.replace(/^(sedan-|suv-|van-)/, '');
            const dbKey = getDbKeyFromSvgId(partId);
            if (!dbKey) return;

            const svgIds = dbPartToSvgMap[dbKey] || [];
            svgIds.forEach(svgId => {
                ['sedan', 'suv', 'van'].forEach(shape => {
                    const domEl = document.getElementById(`${shape}-${svgId}`);
                    if (domEl) domEl.classList.add('hover-highlight');
                });
            });
        });

        part.addEventListener('mouseleave', (e) => {
            const partEl = e.currentTarget;
            const fullId = partEl.id;
            const partId = fullId.replace(/^(sedan-|suv-|van-)/, '');
            const dbKey = getDbKeyFromSvgId(partId);
            if (!dbKey) return;

            const svgIds = dbPartToSvgMap[dbKey] || [];
            svgIds.forEach(svgId => {
                ['sedan', 'suv', 'van'].forEach(shape => {
                    const domEl = document.getElementById(`${shape}-${svgId}`);
                    if (domEl) domEl.classList.remove('hover-highlight');
                });
            });
        });
    });
}

function clearQuote() {
    state.activeSelections = {};
    state.selectedPartId = null;
    state.selectedPartName = '';
    
    document.getElementById('customerName').value = '';
    document.getElementById('customerPhone').value = '';
    document.getElementById('plateNumber').value = '';
    document.getElementById('brandModel').value = '';
    document.getElementById('discountInput').value = '100';
    
    state.customerName = '';
    state.customerPhone = '';
    state.plateNumber = '';
    state.brandModel = '';
    state.discount = 100;

    document.getElementById('brandType').value = 'others';
    document.getElementById('subGroupTesla').style.display = 'none';
    document.getElementById('subGroupOthers').style.display = 'block';
    
    document.getElementById('vehicleTypeSelect').value = 'sedan';
    document.getElementById('vehicleMethodSelect').value = 'ac';
    document.getElementById('vehicleSizeSelect').value = 'S';
    
    state.brandType = 'others';
    state.vehicleClass = 'Model Y';
    state.vehicleType = 'sedan';
    state.vehicleMethod = 'ac';
    state.vehicleSize = 'S';

    document.querySelectorAll('#subGroupTesla .vehicle-type-btn').forEach(b => b.classList.remove('active'));
    const defaultTeslaBtn = document.querySelector('#subGroupTesla .vehicle-type-btn[data-type="Model Y"]');
    if (defaultTeslaBtn) defaultTeslaBtn.classList.add('active');

    document.querySelectorAll('.car-part').forEach(p => {
        p.classList.remove('selected');
        p.classList.remove('has-service');
    });

    closeConfigurator();
    populateQuickPartSelector();
    updateActiveSVGView();
    renderQuote();
    showToast('報價單已清除重設');
}

function renderQuote() {
    const container = document.getElementById('quoteItemsContainer');
    if (!container) return;
    container.innerHTML = '';

    let subtotal = 0;
    let itemsCount = 0;
    const flatItemsList = [];

    // Compile items from active selections
    Object.entries(state.activeSelections).forEach(([partId, servicesSet]) => {
        servicesSet.forEach(serviceKey => {
            const price = calculatePrice(partId, serviceKey);
            if (price === null) return;
            
            subtotal += price;
            itemsCount++;
            
            flatItemsList.push({
                partId,
                partName: partId, // DB key is already the Chinese part name
                serviceKey,
                serviceName: serviceCatalog[serviceKey].name,
                price
            });
        });
    });

    if (flatItemsList.length === 0) {
        container.innerHTML = `
            <div class="empty-quote-state">
                <svg viewBox="0 0 24 24">
                    <path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-2 10H7v-2h10v2zm0-4H7V7h10v2zm0 8H7v-2h10v2z"/>
                </svg>
                <span>尚未點擊車體部位新增報價</span>
            </div>
        `;
    } else {
        flatItemsList.forEach(item => {
            const el = document.createElement('div');
            el.className = 'quote-item';
            el.innerHTML = `
                <div class="quote-item-info">
                    <div class="quote-item-part">${item.partName}</div>
                    <div class="quote-item-service">${item.serviceName}</div>
                </div>
                <div class="quote-item-price-wrapper">
                    <span class="quote-item-price">NT$ ${item.price.toLocaleString()}</span>
                    <button class="quote-item-delete" title="刪除項目">
                        <svg viewBox="0 0 24 24">
                            <path d="M6 19c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/>
                        </svg>
                    </button>
                </div>
            `;

            el.querySelector('.quote-item-delete').addEventListener('click', () => {
                toggleServiceSelection(item.partId, item.serviceKey);
            });

            container.appendChild(el);
        });
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

    // Update active configurations stats text
    const badgeText = document.getElementById('selectedItemsCount');
    if (badgeText) {
        badgeText.textContent = `${itemsCount} 項`;
    }
}

function saveCurrentQuote() {
    const selectionsCount = Object.keys(state.activeSelections).length;
    if (selectionsCount === 0) {
        alert('請先點擊車輛部位，新增報價項目後再進行儲存。');
        return;
    }

    let subtotal = 0;
    Object.entries(state.activeSelections).forEach(([partId, serviceSet]) => {
        serviceSet.forEach(key => {
            const price = calculatePrice(partId, key);
            if (price !== null) subtotal += price;
        });
    });
    const discountAmount = Math.round(subtotal * (1 - (state.discount / 100)));
    const total = subtotal - discountAmount;

    const record = {
        id: 'Q' + Date.now(),
        date: new Date().toLocaleString('zh-TW', { hour12: false }),
        customerName: state.customerName || '未填寫客戶',
        customerPhone: state.customerPhone || '無聯絡電話',
        plateNumber: state.plateNumber || '無車牌',
        brandModel: state.brandModel || '未填車型',
        brandType: state.brandType,
        vehicleClass: state.vehicleClass,
        vehicleType: state.vehicleType,
        vehicleMethod: state.vehicleMethod,
        vehicleSize: state.vehicleSize,
        activeSelections: serializeSelections(state.activeSelections),
        discount: state.discount,
        total: total
    };

    state.history.unshift(record);
    if (state.history.length > 10) {
        state.history.pop();
    }

    saveHistoryToStorage();
    renderHistory();
    showToast('報價紀錄已儲存');
}

function serializeSelections(selections) {
    const serialized = {};
    Object.entries(selections).forEach(([partId, set]) => {
        serialized[partId] = Array.from(set);
    });
    return serialized;
}

function deserializeSelections(serialized) {
    const deserialized = {};
    Object.entries(serialized).forEach(([partId, arr]) => {
        deserialized[partId] = new Set(arr);
    });
    return deserialized;
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
        state.brandType = record.brandType || 'others';
        state.vehicleClass = record.vehicleClass || 'Model Y';
        state.vehicleType = record.vehicleType || 'sedan';
        state.vehicleMethod = record.vehicleMethod || 'ac';
        state.vehicleSize = record.vehicleSize || 'S';
        state.discount = record.discount || 100;
        
        document.getElementById('customerName').value = record.customerName === '未填寫客戶' ? '' : record.customerName;
        document.getElementById('customerPhone').value = record.customerPhone === '無聯絡電話' ? '' : record.customerPhone;
        document.getElementById('plateNumber').value = record.plateNumber === '無車牌' ? '' : record.plateNumber;
        document.getElementById('brandModel').value = record.brandModel === '未填車型' ? '' : record.brandModel;
        document.getElementById('discountInput').value = record.discount || 100;

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

        state.activeSelections = deserializeSelections(record.activeSelections);
        closeConfigurator();
        populateQuickPartSelector();
        updateActiveSVGView();
        renderQuote();
        updateAllSVGPartStates();
        
        showToast('已載入歷史報價');
    }
}

function triggerPrint() {
    const printArea = document.getElementById('print-area');
    if (!printArea) return;

    let subtotal = 0;
    const itemsRows = [];

    Object.entries(state.activeSelections).forEach(([partId, servicesSet]) => {
        servicesSet.forEach(serviceKey => {
            const price = calculatePrice(partId, serviceKey);
            if (price === null) return;
            subtotal += price;

            const serviceName = serviceCatalog[serviceKey].name;
            itemsRows.push(`
                <tr>
                    <td><strong>${partId}</strong></td>
                    <td>${serviceName}</td>
                    <td>1</td>
                    <td style="text-align: right;">NT$ ${price.toLocaleString()}</td>
                </tr>
            `);
        });
    });

    if (itemsRows.length === 0) {
        alert('請先點擊車輛部位，新增報價項目後再進行列印。');
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
        <div class="print-invoice-header">
            <div>
                <div class="print-logo">好室多膜局部施工查價報價</div>
                <div style="font-size: 9pt; color: #718096; margin-top: 5px;">專業車身貼膜、犀牛皮防護、個性改色施工報價</div>
            </div>
            <div>
                <div class="print-title">局部貼膜施工估價單</div>
                <div style="font-size: 10pt; text-align: right; color: #4a5568; margin-top: 5px;">報價日期: ${dateStr}</div>
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
                <div class="print-meta-title">車輛規格</div>
                <div class="print-meta-row">
                    <span class="print-meta-label">廠牌車型:</span>
                    <span>${state.brandModel || '未填寫'}</span>
                </div>
                <div class="print-meta-row">
                    <span class="print-meta-label">車型分類:</span>
                    <span>${vehicleSpecName}</span>
                </div>
            </div>
        </div>

        <table class="print-table">
            <thead>
                <tr>
                    <th>施工部位</th>
                    <th>貼膜項目</th>
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

        <div style="margin-top: 40px; border-top: 1px dashed #ccc; padding-top: 20px;">
            <div style="font-size: 10pt; font-weight: bold; color: #2d3748; margin-bottom: 5px;">備註說明：</div>
            <ol style="font-size: 8.5pt; color: #718096; padding-left: 20px; line-height: 1.5;">
                <li>本估價單報價自開立起 30 天內有效。</li>
                <li>貼膜施工作業時間依部位多寡而定，實際進場施工作業以約定排程為準。</li>
                <li>若施工部位原漆面已有深層刮傷、凹陷或漆面剝落，施工後可能存在收邊瑕疵，會於施作前與客戶確認。</li>
            </ol>
        </div>

        <div class="print-footer">
            技術支援與維護：好室多膜局部施工查價報價系統 | 感謝您的支持，祝您行車平安！
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
