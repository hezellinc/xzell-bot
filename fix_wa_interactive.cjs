const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// Fix .kuis
const kuisOld = `                  const buttons = q.options.map((opt, idx) => ({
                      name: "quick_reply",
                      buttonParamsJson: JSON.stringify({ display_text: String.fromCharCode(65 + idx) + ". " + opt, id: opt })
                  }));
                  buttons.push({
                      name: "quick_reply",
                      buttonParamsJson: JSON.stringify({ display_text: "🏳️ Nyerah", id: "nyerah" })
                  });
                  
                  const msgKuis = generateWAMessageFromContent(sender, {
                      viewOnceMessage: {
                          message: {
                              interactiveMessage: {
                                  header: { title: "🎯 *GAME KUIS*", hasMediaAttachment: false },
                                  body: { text: \`Soal: \${q.question}\\n\\nPilih jawabanmu di bawah:\` },
                                  footer: { text: "Nexus AI" },
                                  nativeFlowMessage: { buttons }
                              }
                          }
                      }
                  }, { userJid: sock.user?.id });
                  await sock.relayMessage(sender, msgKuis.message!, { messageId: msgKuis.key.id! });`;

const kuisNew = `                  let optText = "";
                  q.options.forEach((opt, idx) => {
                      optText += \`\${String.fromCharCode(65 + idx)}. \${opt}\\n\`;
                  });
                  
                  const text = \`🎯 *GAME KUIS*\\n\\nSoal: \${q.question}\\n\\nPilih jawabanmu di bawah:\\n\${optText}\\n🏳️ Ketik *nyerah* jika menyerah.\\n(Balas pesan ini dengan jawabanmu!)\`;
                  
                  await sock.sendMessage(sender, { text }, { quoted: msg });`;

code = code.replace(kuisOld, kuisNew);

// Fix .rpg
const rpgOld = `                  const msgRPG = generateWAMessageFromContent(sender, {
                      viewOnceMessage: {
                          message: {
                              interactiveMessage: {
                                  header: { title: "⚠️ *PERTARUNGAN DIMULAI*", hasMediaAttachment: false },
                                  body: { text: \`Seekor \${monster} tiba-tiba muncul di hadapanmu!\\n\\n❤️ HP Kamu: \${user.hp}/\${user.maxHp}\\n🖤 HP \${monster}: 100\\n\\nApa yang akan kamu lakukan?\` },
                                  footer: { text: "Nexus AI RPG" },
                                  nativeFlowMessage: {
                                      buttons: [
                                          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "⚔️ Serang", id: ".serang" }) },
                                          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🧪 Heal", id: ".heal" }) },
                                          { name: "quick_reply", buttonParamsJson: JSON.stringify({ display_text: "🏃 Kabur", id: ".kabur" }) }
                                      ]
                                  }
                              }
                          }
                      }
                  }, { userJid: sock.user?.id });
                  await sock.relayMessage(sender, msgRPG.message!, { messageId: msgRPG.key.id! });`;

const rpgNew = `                  const text = \`⚠️ *PERTARUNGAN DIMULAI*\\n\\nSeekor \${monster} tiba-tiba muncul di hadapanmu!\\n\\n❤️ HP Kamu: \${user.hp}/\${user.maxHp}\\n🖤 HP \${monster}: 100\\n\\nApa yang akan kamu lakukan?\\n\\nKetik perintah berikut:\\n⚔️ *.serang*\\n🧪 *.heal*\\n🏃 *.kabur*\`;
                  await sock.sendMessage(sender, { text }, { quoted: msg });`;

code = code.replace(rpgOld, rpgNew);

fs.writeFileSync('server.ts', code);
console.log('done fixing WA interactive');
