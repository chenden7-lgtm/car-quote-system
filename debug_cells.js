const XLSX = require('xlsx');

const filePath = '/Users/lauren/Desktop/報價.xlsx';
const workbook = XLSX.readFile(filePath);
const worksheet = workbook.Sheets[workbook.SheetNames[0]];

for (let r = 90; r <= 100; r++) {
    const cellA = worksheet[XLSX.utils.encode_cell({ r: r - 1, c: 0 })];
    const cellI = worksheet[XLSX.utils.encode_cell({ r: r - 1, c: 8 })];
    console.log(`Row ${r}: Col A = ${cellA ? cellA.v : 'undefined'}, Col I = ${cellI ? cellI.v : 'undefined'}`);
}
