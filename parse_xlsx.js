const XLSX = require('xlsx');

const filePath = '/Users/lauren/Desktop/報價.xlsx';

const workbook = XLSX.readFile(filePath);
const sheet = workbook.Sheets[workbook.SheetNames[0]];

const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

// Parse Left Side (Other Brands)
const leftTables = [];
let currentLeftTable = null;

// Parse Right Side (Tesla)
const rightTables = [];
let currentRightTable = null;

for (let r = 0; r < data.length; r++) {
    const row = data[r];
    if (!row) continue;

    // Check Left Table Header
    // A table starts if cell 0 is non-null and cell 1 is null (this is the title)
    if (row[0] && row[1] === undefined && row[0] !== '部位' && row[0] !== '其他車種') {
        if (currentLeftTable) {
            leftTables.push(currentLeftTable);
        }
        currentLeftTable = {
            title: row[0],
            headers: [],
            rows: {}
        };
    } else if (currentLeftTable && row[0] === '部位') {
        currentLeftTable.headers = row.slice(0, 7);
    } else if (currentLeftTable && row[0] && row[1] !== undefined) {
        currentLeftTable.rows[row[0]] = row.slice(1, 7);
    }

    // Check Right Table Header
    // Right table title is in cell 8, headers/rows follow
    if (row[8] && row[9] === undefined && row[8] !== '部位' && row[8] !== '特斯拉') {
        if (currentRightTable) {
            rightTables.push(currentRightTable);
        }
        currentRightTable = {
            title: row[8],
            headers: [],
            rows: {}
        };
    } else if (currentRightTable && row[8] === '部位') {
        currentRightTable.headers = row.slice(8, 14);
    } else if (currentRightTable && row[8] && row[9] !== undefined) {
        currentRightTable.rows[row[8]] = row.slice(9, 14);
    }
}

if (currentLeftTable) leftTables.push(currentLeftTable);
if (currentRightTable) rightTables.push(currentRightTable);

console.log('--- LEFT TABLES (Other Brands) ---');
leftTables.forEach(t => {
    console.log(`Title: ${t.title}`);
    console.log('Headers:', t.headers);
    console.log('Rows count:', Object.keys(t.rows).length);
    Object.entries(t.rows).forEach(([part, vals]) => {
        console.log(`  ${part}:`, vals);
    });
});

console.log('\n--- RIGHT TABLES (Tesla) ---');
rightTables.forEach(t => {
    console.log(`Title: ${t.title}`);
    console.log('Headers:', t.headers);
    console.log('Rows count:', Object.keys(t.rows).length);
    Object.entries(t.rows).forEach(([part, vals]) => {
        console.log(`  ${part}:`, vals);
    });
});
