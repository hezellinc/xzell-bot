const fs = require('fs');
let code = fs.readFileSync('src/pages/Landing.tsx', 'utf8');

code = code.replace(
  '<span className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">\n            V 2.0\n          </span>',
  '<span className="bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider shadow-[0_0_10px_rgba(147,51,234,0.5)]">\n            V 3.4\n          </span>'
);

code = code.replace(
  'V 2.0',
  'V 3.4'
);

fs.writeFileSync('src/pages/Landing.tsx', code);
console.log('done fixing landing 2');
