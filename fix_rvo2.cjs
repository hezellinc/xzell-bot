const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const target = `
                  const isImage = !!viewOnce.imageMessage;
                  try {
                      const buffer = await downloadMediaMessage({ message: viewOnce } as any, 'buffer', {}, { logger: pino({ level: 'silent' }) as any, reuploadRequest: sock.updateMediaMessage });
`;

const replacement = `
                  const isImage = !!viewOnce.imageMessage;
                  try {
                      // Gunakan objek pesan asli untuk meminimalkan error pemblokiran
                      const mediaMessage = {
                          key: msg.message.extendedTextMessage?.contextInfo?.stanzaId ? {
                              remoteJid: msg.key.remoteJid,
                              id: msg.message.extendedTextMessage.contextInfo.stanzaId,
                              participant: msg.message.extendedTextMessage.contextInfo.participant
                          } : msg.key,
                          message: viewOnce
                      };
                      
                      const buffer = await downloadMediaMessage(mediaMessage as any, 'buffer', {}, { logger: pino({ level: 'silent' }) as any, reuploadRequest: sock.updateMediaMessage });
`;

code = code.replace(target.trim(), replacement.trim());

fs.writeFileSync('server.ts', code);
console.log('done2');
