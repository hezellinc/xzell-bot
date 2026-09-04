const fs = require('fs');
let code = fs.readFileSync('src/pages/Connect.tsx', 'utf8');

// Find the <button containing "Mulai Tautkan" and replace its className.
const btnRegex = /<button\s+onClick=\{handleConnect\}[\s\S]*?>\s*Mulai Tautkan\s*<\/button>/;

const newBtn = `<button 
                    onClick={handleConnect}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-base transition-colors relative z-50 shadow-md cursor-pointer"
                  >
                    Mulai Tautkan
                  </button>`;

code = code.replace(btnRegex, newBtn);

fs.writeFileSync('src/pages/Connect.tsx', code);
console.log('Button simplified');
