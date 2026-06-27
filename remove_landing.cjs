const fs = require('fs');
let code = fs.readFileSync('src/App.tsx', 'utf8');
const lines = code.split('\n');

// Keep lines before 2226 (index 2225) and lines from 2783 (index 2783) onwards
const newLines = [...lines.slice(0, 2225), ...lines.slice(2783)];

fs.writeFileSync('src/App.tsx', newLines.join('\n'), 'utf8');
console.log('Removed leftover landing code');
