const XLSX = require('xlsx');
const path = require('path');

const filePath = '/Users/lauren/Desktop/報價.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const sheetNames = workbook.SheetNames;
    console.log('Sheets found:', sheetNames);

    sheetNames.forEach(sheetName => {
        console.log(`\n--- Sheet: ${sheetName} ---`);
        const worksheet = workbook.Sheets[sheetName];
        const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
        data.slice(0, 50).forEach((row, index) => {
            console.log(`Row ${index + 1}:`, JSON.stringify(row));
        });
    });
} catch (error) {
    console.error('Error reading xlsx:', error);
}
