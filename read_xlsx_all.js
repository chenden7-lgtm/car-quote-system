const XLSX = require('xlsx');

const filePath = '/Users/lauren/Desktop/報價.xlsx';

try {
    const workbook = XLSX.readFile(filePath);
    const worksheet = workbook.Sheets[workbook.SheetNames[0]];
    const data = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
    console.log(`Total rows: ${data.length}`);
    data.forEach((row, index) => {
        console.log(`Row ${index + 1}:`, JSON.stringify(row));
    });
} catch (error) {
    console.error(error);
}
