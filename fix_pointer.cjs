const fs = require('fs');
let code = fs.readFileSync('src/pages/Connect.tsx', 'utf8');

code = code.replace(
  '<div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />',
  '<div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />'
);

fs.writeFileSync('src/pages/Connect.tsx', code);
console.log('fixed pointer events block');
