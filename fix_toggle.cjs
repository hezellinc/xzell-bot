const fs = require('fs');
let code = fs.readFileSync('src/pages/Connect.tsx', 'utf8');

const regex = /<div className="flex bg-black\/40 p-1\.5 rounded-xl border border-white\/5">[\s\S]*?<\/div>/;

const replacement = `<div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5 relative z-50">
                    <button 
                       onClick={() => setAuthMethod("qr")}
                      className={\`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all relative z-50 cursor-pointer \${authMethod === 'qr' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}\`}
                    >
                      QR Code
                    </button>
                    <button 
                       onClick={() => setAuthMethod("pairing")}
                      className={\`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all relative z-50 cursor-pointer \${authMethod === 'pairing' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}\`}
                    >
                      Pairing Code
                    </button>
                  </div>`;

code = code.replace(regex, replacement);
fs.writeFileSync('src/pages/Connect.tsx', code);
console.log('Fixed toggle buttons');
