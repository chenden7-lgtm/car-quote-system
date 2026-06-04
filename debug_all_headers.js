const XLSX = require('xlsx');

const filePath = '/Users/lauren/Desktop/報價.xlsx';
const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

console.log('--- LEFT HEADERS (Col 0) ---');
for (let r = 0; r < data.length; r++) {
    const v = data[r][0];
    // If it's a title (cell 0 is non-null and cell 1 is null)
    if (v && data[r][1] === undefined && v !== '部位' && v !== '其他車種') {
        console.log(`Row ${r+1}: ${v}`);
    }
}

console.log('\n--- RIGHT HEADERS (Col 8) ---');
for (let r = 0; r < data.length; r++) {
    const v = data[r][8];
    // If it's a title (cell 8 is non-null and cell 9 is null)
    if (v && data[r][9] === undefined && v !== '部位' && v !== '特斯拉') {
        console.log(`Row ${r+1}: ${v}`);
    }
}
