const fs = require('fs');
let code = fs.readFileSync('src/pages/Connect.tsx', 'utf8');

code = code.replace(
  'className="w-full relative z-20 bg-black/40',
  'className="w-full relative z-50 bg-black/40 cursor-text'
);

fs.writeFileSync('src/pages/Connect.tsx', code);
console.log('Fixed input');
