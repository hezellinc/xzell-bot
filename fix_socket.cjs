const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const target = `
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }) as any,
      browser: ['NexusBot', 'Chrome', '1.0.0'],
    });
`;

const replacement = `
    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }) as any,
      browser: ['NexusBot', 'Chrome', '1.0.0'],
      markOnlineOnConnect: false, // Mencegah server auto-read saat baru konek
    });
`;

code = code.replace(target.trim(), replacement.trim());
fs.writeFileSync('server.ts', code);
console.log('done');
