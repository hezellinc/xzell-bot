const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const oldKuis = `
              case 'kuis': {
                  const questions = [
                      { question: "Apa yang sebesar gajah tetapi beratnya 0 kg?", hint: "B_y_ng_n g_j_h", answer: "bayangan gajah" },
                      { question: "Apa ibukota negara Indonesia?", hint: "J_k_rt_", answer: "Jakarta" },
                      { question: "Hewan apa yang bernapas dengan insang?", hint: "I_k_n", answer: "Ikan" },
                      { question: "Siapa penemu lampu pijar?", hint: "T_h_m_s E_i_s_n", answer: "Thomas Edison" }
                  ];
                  const q = questions[Math.floor(Math.random() * questions.length)];
                  activeQuizzes.set(sender, q);
                  await reply(\`*GAME KUIS*\\n\\nSoal: \${q.question}\\nPetunjuk: \${q.hint}\\n\\nBalas soal ini dengan *nyerah* jika ingin menyerah.\`);
                  break;
              }
`;

const newKuis = `
              case 'kuis': {
                  const questions = [
                      { question: "Apa yang sebesar gajah tetapi beratnya 0 kg?", options: ["Bayangan gajah", "Anak gajah", "Balon gajah", "Patung gajah"], answer: "Bayangan gajah" },
                      { question: "Apa ibukota negara Indonesia?", options: ["Surabaya", "Jakarta", "Bandung", "Medan"], answer: "Jakarta" },
                      { question: "Hewan apa yang bernapas dengan insang?", options: ["Kucing", "Burung", "Ikan", "Katak"], answer: "Ikan" },
                      { question: "Siapa penemu lampu pijar?", options: ["Nikola Tesla", "Albert Einstein", "Thomas Edison", "Isaac Newton"], answer: "Thomas Edison" }
                  ];
                  const q = questions[Math.floor(Math.random() * questions.length)];
                  activeQuizzes.set(sender, q);
                  
                  const buttons = q.options.map((opt, idx) => ({
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
                  await sock.relayMessage(sender, msgKuis.message!, { messageId: msgKuis.key.id! });
                  break;
              }
`;

code = code.replace(oldKuis.trim(), newKuis.trim());
fs.writeFileSync('server.ts', code);
console.log('done');
