const fs = require('fs');
let code = fs.readFileSync('src/pages/Connect.tsx', 'utf8');

code = code.replace(
  'className="w-full bg-gradient-to-r from-purple-600 to-blue-600',
  'className="w-full relative z-20 cursor-pointer bg-gradient-to-r from-purple-600 to-blue-600'
);

code = code.replace(
  'className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all',
  'className="flex-1 relative z-20 cursor-pointer py-2.5 rounded-lg text-sm font-semibold transition-all'
);

code = code.replace(
  'className="flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all', // for the second button
  'className="flex-1 relative z-20 cursor-pointer py-2.5 rounded-lg text-sm font-semibold transition-all'
);

code = code.replace(
  'className="w-full bg-black/40 border border-white/10',
  'className="w-full relative z-20 bg-black/40 border border-white/10'
);

fs.writeFileSync('src/pages/Connect.tsx', code);
console.log('applied z-20 and cursor-pointer');
