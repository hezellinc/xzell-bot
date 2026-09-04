const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

const newCase = `
              case 'tulis':
              case 'transkrip': {
                  const target = getTargetMediaMessage();
                  if (!target || (!target.audioMessage && !target.documentMessage)) return await reply("Silakan balas/reply voice note (VN) atau pesan audio dengan mengetik .tulis");
                  
                  try {
                      await reply("⏳ *Sedang mendengarkan dan mentranskrip audio...*");
                      const buffer = await downloadMediaMessage(target as any, 'buffer', {}, { logger: pino({ level: 'silent' }) as any, reuploadRequest: sock.updateMediaMessage });
                      
                      const ai = getAI();
                      const base64Audio = (buffer).toString("base64");
                      const response = await ai.models.generateContent({
                          model: "gemini-2.5-flash",
                          contents: [
                              {
                                  role: "user",
                                  parts: [
                                      { text: "Tolong tuliskan transkrip dari pesan suara ini secara akurat. Output hanya berupa teks transkrip tanpa tambahan teks lain. Jika bahasa yang diucapkan adalah Indonesia, tulis dalam bahasa Indonesia." },
                                      { inlineData: { data: base64Audio, mimeType: target.audioMessage?.mimetype || target.documentMessage?.mimetype || 'audio/ogg' } }
                                  ]
                              }
                          ]
                      });
                      
                      await reply(\`📝 *Transkrip Audio:*\\n\\n\${response.text}\`);
                  } catch (err) {
                      await reply(\`❌ Gagal mentranskrip: \${err.message}\`);
                  }
                  break;
              }
`;

// Insert the new case after case 'tiktok': { ... break; }
const hookStr = `                  break;
              }
              case 'kuis': {`;

if (code.includes(hookStr)) {
    code = code.replace(hookStr, `                  break;\n              }\n${newCase}              case 'kuis': {`);
} else {
    console.log('hookStr not found!');
}

// Update menu text
code = code.replace(
    '┣ ⊳ .tiktok [link video]\\n┗━━━━━━━━━━━━━━━',
    '┣ ⊳ .tiktok [link video]\\n┣ ⊳ .tulis (reply VN)\\n┗━━━━━━━━━━━━━━━'
);

fs.writeFileSync('server.ts', code);
console.log('Added .tulis to server.ts');
