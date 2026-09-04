const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const target = `
              case 'rvo': {
                  if (!isQuotedMedia) return await reply("Reply pesan 1x lihat (view once) dengan .rvo");
                  const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                  const viewOnce = quotedMsg?.viewOnceMessageV2?.message || quotedMsg?.viewOnceMessage?.message;
                  if (!viewOnce) return await reply("Pesan yang di-reply bukan view once.");
                  
                  const isImage = !!viewOnce.imageMessage;
                  const buffer = await downloadMediaMessage({ message: viewOnce } as any, 'buffer', {}, { logger: pino({ level: 'silent' }) as any, reuploadRequest: sock.updateMediaMessage });
                  if (isImage) {
                      await sock.sendMessage(sender, { image: buffer as Buffer, caption: viewOnce.imageMessage?.caption || "" }, { quoted: msg });
                  } else {
                      await sock.sendMessage(sender, { video: buffer as Buffer, caption: viewOnce.videoMessage?.caption || "" }, { quoted: msg });
                  }
                  break;
              }
`;

const replacement = `
              case 'rvo': {
                  if (!isQuotedMedia) return await reply("Reply pesan 1x lihat (view once) dengan .rvo");
                  const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                  
                  // Mendukung berbagai versi View Once (v1, v2, v2Extension)
                  const viewOnce = quotedMsg?.viewOnceMessageV2Extension?.message || quotedMsg?.viewOnceMessageV2?.message || quotedMsg?.viewOnceMessage?.message;
                  if (!viewOnce) return await reply("Pesan yang di-reply bukan view once.");
                  
                  const isImage = !!viewOnce.imageMessage;
                  try {
                      const buffer = await downloadMediaMessage({ message: viewOnce } as any, 'buffer', {}, { logger: pino({ level: 'silent' }) as any, reuploadRequest: sock.updateMediaMessage });
                      if (isImage) {
                          await sock.sendMessage(sender, { image: buffer as Buffer, caption: viewOnce.imageMessage?.caption || "" }, { quoted: msg });
                      } else {
                          await sock.sendMessage(sender, { video: buffer as Buffer, caption: viewOnce.videoMessage?.caption || "" }, { quoted: msg });
                      }
                  } catch (e: any) {
                      console.error("RVO Error:", e);
                      await reply("Gagal mendownload media. WhatsApp mungkin telah memblokir unduhan ini (sudah terbuka) atau pesan terlalu lama.");
                  }
                  break;
              }
`;

code = code.replace(target.trim(), replacement.trim());
code = code.replace("sock.ev.on('messages.upsert', async (m: any) => {", "sock.ev.on('messages.upsert', async (m: any) => {\n      // Hapus auto-read sock.readMessages jika ada (dapat memblokir RVO)\n");

fs.writeFileSync('server.ts', code);
console.log('done');
