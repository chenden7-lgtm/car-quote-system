const XLSX = require('xlsx');
const fs = require('fs');
const path = require('path');

const filePath = '/Users/lauren/Desktop/報價.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

    const pricingData = {
        others: {},
        tesla: {}
    };

    // Material keys mapping
    const leftMaterialKeys = {
        2: 'axColor',
        21: 'threeMColor',
        40: 'chinaGloss',
        59: 'chinaMatte',
        78: 'importGloss',
        97: 'importMatte'
    };

    const rightMaterialKeys = {
        2: 'axColor',
        20: 'threeMColor',
        38: 'chinaGloss',
        56: 'chinaMatte',
        74: 'importGloss',
        92: 'importMatte'
    };

    // Parse Left Side (Other Brands)
    let currentLeftKey = null;
    let leftHeaders = [];

    // Parse Right Side (Tesla)
    let currentRightKey = null;
    let rightHeaders = [];

    for (let r = 0; r < data.length; r++) {
        const row = data[r];
        if (!row) continue;

        const rowNum = r + 1;

        // --- LEFT SIDE ---
        if (leftMaterialKeys[rowNum - 1]) {
            currentLeftKey = leftMaterialKeys[rowNum - 1];
            pricingData.others[currentLeftKey] = {};
        }

        if (currentLeftKey) {
            if (row[0] === '部位') {
                leftHeaders = row.slice(1, 7).map(h => String(h).trim()); // ['S', 'M', 'L', 'XL', '2XL', '其他']
            } else if (row[0] && row[0] !== '部位' && row[0] !== '其他車種' && !row[0].includes('犀牛皮') && !row[0].includes('改色')) {
                const partName = String(row[0]).trim();
                const prices = {};
                leftHeaders.forEach((h, idx) => {
                    const val = row[idx + 1];
                    if (val !== undefined && val !== null) {
                        prices[h] = Number(val);
                    }
                });
                pricingData.others[currentLeftKey][partName] = prices;
            }
        }

        // --- RIGHT SIDE ---
        if (rightMaterialKeys[rowNum - 1]) {
            currentRightKey = rightMaterialKeys[rowNum - 1];
            pricingData.tesla[currentRightKey] = {};
        }

        if (currentRightKey) {
            if (row[8] === '部位') {
                rightHeaders = row.slice(9, 14).map(h => String(h).trim()); // ['Model 3', 'Model Y', '新款Model Y', 'Model S', 'Model X']
            } else if (row[8] && row[8] !== '部位' && row[8] !== '特斯拉' && !row[8].includes('犀牛皮') && !row[8].includes('改色')) {
                const partName = String(row[8]).trim();
                const prices = {};
                rightHeaders.forEach((h, idx) => {
                    const val = row[idx + 9];
                    if (val !== undefined && val !== null) {
                        prices[h] = Number(val);
                    }
                });
                pricingData.tesla[currentRightKey][partName] = prices;
            }
        }
    }

    // Write pricingData to pricingData.js
    const outPath = path.join(__dirname, 'pricingData.js');
    const content = `// Auto-generated pricing database from Excel
const pricingData = ${JSON.stringify(pricingData, null, 4)};

if (typeof module !== 'undefined') {
    module.exports = pricingData;
}
`;
    fs.writeFileSync(outPath, content, 'utf8');
    console.log('Successfully wrote pricingData.js to:', outPath);

} catch (error) {
    console.error('Error building pricing DB:', error);
}
