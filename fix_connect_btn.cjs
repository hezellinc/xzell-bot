const fs = require('fs');
let code = fs.readFileSync('src/pages/Connect.tsx', 'utf8');

code = code.replace(
  'disabled={authMethod === "pairing" && pairingNumber.length < 10}',
  ''
);

code = code.replace(
  'const handleConnect = () => {',
  `const handleConnect = () => {
    if (authMethod === "pairing" && pairingNumber.length < 10) {
      alert("Masukkan nomor WhatsApp yang valid (minimal 10 angka, awali dengan kode negara, contoh: 628...)");
      return;
    }`
);

fs.writeFileSync('src/pages/Connect.tsx', code);
console.log('done fixing connect');
