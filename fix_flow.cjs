const fs = require('fs');

let code = fs.readFileSync('server.ts', 'utf8');

const target = `
      // MODE SUPER PRIVAT: Abaikan obrolan biasa (yang tidak diawali titik) agar tidak merespons chat normal Anda
      if (!text.startsWith('.')) return;

      const reply = async (t: string) => sock.sendMessage(sender, { text: t }, { quoted: msg });

      // Save incoming message
      const inMsg = { sender, text, direction: "inbound", timestamp: Date.now() };
      await addDoc(collection(db, "messages"), inMsg).catch(console.error);
      io.emit("new_log", inMsg);

      // Quiz State check
      if (activeQuizzes.has(sender)) {
          const quiz = activeQuizzes.get(sender);
          if (text.toLowerCase() === quiz!.answer.toLowerCase()) {
              activeQuizzes.delete(sender);
              const user = await getUserProfile(sender);
              const reward = Math.floor(Math.random() * 50) + 50;
              await updateUserProfile(sender, { balance: user.balance + reward });
              await reply(\`🎉 *Selamat Jawaban Kamu Benar*\\n\\nJawaban: \${quiz!.answer}\\nBalance: $\${user.balance + reward}\\n\\nIngin main lagi? Kirim perintah .kuis\`);
              return;
          } else if (text.toLowerCase() === 'nyerah') {
              activeQuizzes.delete(sender);
              await reply(\`🏳️ Kamu menyerah.\\nJawaban yang benar adalah: \${quiz!.answer}\`);
              return;
          } else if (text.startsWith('.')) {
              activeQuizzes.delete(sender); // abandon quiz on new command
          } else {
              await reply(\`❌ Salah! Coba lagi.\\nPertanyaan: \${quiz!.question}\\n\\nBalas soal ini dengan *nyerah* jika ingin menyerah.\`);
              return;
          }
      }

      // RPG State check
      if (activeRPG.has(sender)) {
          const state = activeRPG.get(sender)!;
          const user = await getUserProfile(sender);
          const cmd = text.toLowerCase();
          
          if (cmd === 'serang') {
              const dmg = Math.floor(Math.random() * 25) + 10;
              const mDmg = Math.floor(Math.random() * 20) + 5;
              state.monsterHp -= dmg;
              
              if (state.monsterHp <= 0) {
                  const reward = Math.floor(Math.random() * 300) + 100;
                  const xpReward = Math.floor(Math.random() * 50) + 20;
                  await updateUserProfile(sender, { balance: user.balance + reward, xp: user.xp + xpReward });
                  activeRPG.delete(sender);
                  await reply(\`⚔️ *CRITICAL HIT!* Kamu menyerang \${state.monster} sebesar \${dmg} DMG!\\n\\n💀 \${state.monster} telah dikalahkan!\\n🎉 Kamu mendapat *$\${reward}* dan \${xpReward} XP!\`);
                  return;
              }
              
              user.hp -= mDmg;
              if (user.hp <= 0) {
                  await updateUserProfile(sender, { hp: user.maxHp });
                  activeRPG.delete(sender);
                  await reply(\`⚔️ Kamu menyerang sebesar \${dmg} DMG, tapi \${state.monster} membalas dengan ganas sebesar \${mDmg} DMG!\\n\\n☠️ *KAMU MATI!* Perjalananmu berakhir di sini... HP kamu telah dipulihkan di kota.\`);
                  return;
              }
              
              await updateUserProfile(sender, { hp: user.hp });
              await reply(\`⚔️ Kamu menyerang sebesar \${dmg} DMG!\\n\${state.monster} membalas sebesar \${mDmg} DMG!\\n\\n❤️ HP Kamu: \${user.hp}/\${user.maxHp}\\n🖤 HP \${state.monster}: \${state.monsterHp}\\n\\nKetik *serang*, *heal*, atau *kabur*\`);
              return;
          } else if (cmd === 'heal') {
              if (user.inventory.potion > 0) {
                  const healAmount = 50;
                  user.hp = Math.min(user.maxHp, user.hp + healAmount);
                  user.inventory.potion -= 1;
                  await updateUserProfile(sender, { hp: user.hp, inventory: user.inventory });
                  await reply(\`✨ Kamu meminum Potion (Sisa: \${user.inventory.potion}). HP kamu pulih +\${healAmount}!\\n\\n❤️ HP Kamu: \${user.hp}/\${user.maxHp}\`);
              } else {
                  await reply(\`❌ Potion habis! Ketik *serang* atau *kabur*.\`);
              }
              return;
          } else if (cmd === 'kabur') {
              activeRPG.delete(sender);
              await reply("🏃 Kamu berhasil kabur dari pertarungan.");
              return;
          } else if (cmd.startsWith('.')) {
              activeRPG.delete(sender); // abandon rpg if new command
          } else {
              await reply(\`Kamu sedang dalam pertarungan! Pilih: *serang*, *heal*, atau *kabur*.\`);
              return;
          }
      }

      try {
          const args = text.trim().split(' ');
          const command = args.shift()?.toLowerCase().substring(1);
`;

const replacement = `
      const reply = async (t: string) => sock.sendMessage(sender, { text: t }, { quoted: msg });

      // Save incoming message
      const inMsg = { sender, text, direction: "inbound", timestamp: Date.now() };
      await addDoc(collection(db, "messages"), inMsg).catch(console.error);
      io.emit("new_log", inMsg);

      // Quiz State check
      if (activeQuizzes.has(sender)) {
          const quiz = activeQuizzes.get(sender);
          if (text.toLowerCase() === quiz!.answer.toLowerCase()) {
              activeQuizzes.delete(sender);
              const user = await getUserProfile(sender);
              const reward = Math.floor(Math.random() * 50) + 50;
              await updateUserProfile(sender, { balance: user.balance + reward });
              await reply(\`🎉 *Selamat Jawaban Kamu Benar*\\n\\nJawaban: \${quiz!.answer}\\nBalance: $\${user.balance + reward}\\n\\nIngin main lagi? Kirim perintah .kuis\`);
              return;
          } else if (text.toLowerCase() === 'nyerah' || text.toLowerCase() === '.nyerah') {
              activeQuizzes.delete(sender);
              await reply(\`🏳️ Kamu menyerah.\\nJawaban yang benar adalah: \${quiz!.answer}\`);
              return;
          } else if (text.startsWith('.') && text.length > 2 && text !== '.nyerah') {
              activeQuizzes.delete(sender); // abandon quiz on new command
          } else {
              await reply(\`❌ Salah! Coba lagi.\\nPertanyaan: \${quiz!.question}\\n\\nPilih / ketik jawaban yang benar!\`);
              return;
          }
      }

      // RPG State check
      if (activeRPG.has(sender)) {
          const state = activeRPG.get(sender)!;
          const user = await getUserProfile(sender);
          const cmd = text.toLowerCase().replace('.', ''); // allow 'serang' or '.serang'
          
          if (cmd === 'serang') {
              const dmg = Math.floor(Math.random() * 25) + 10;
              const mDmg = Math.floor(Math.random() * 20) + 5;
              state.monsterHp -= dmg;
              
              if (state.monsterHp <= 0) {
                  const reward = Math.floor(Math.random() * 300) + 100;
                  const xpReward = Math.floor(Math.random() * 50) + 20;
                  await updateUserProfile(sender, { balance: user.balance + reward, xp: user.xp + xpReward });
                  activeRPG.delete(sender);
                  await reply(\`⚔️ *CRITICAL HIT!* Kamu menyerang \${state.monster} sebesar \${dmg} DMG!\\n\\n💀 \${state.monster} telah dikalahkan!\\n🎉 Kamu mendapat *$\${reward}* dan \${xpReward} XP!\`);
                  return;
              }
              
              user.hp -= mDmg;
              if (user.hp <= 0) {
                  await updateUserProfile(sender, { hp: user.maxHp });
                  activeRPG.delete(sender);
                  await reply(\`⚔️ Kamu menyerang sebesar \${dmg} DMG, tapi \${state.monster} membalas dengan ganas sebesar \${mDmg} DMG!\\n\\n☠️ *KAMU MATI!* Perjalananmu berakhir di sini... HP kamu telah dipulihkan di kota.\`);
                  return;
              }
              
              await updateUserProfile(sender, { hp: user.hp });
              
              const msgRPG = generateWAMessageFromContent(sender, {
                  viewOnceMessage: {
                      message: {
                          interactiveMessage: {
                              header: { title: "⚠️ *PERTARUNGAN BERLANJUT*", hasMediaAttachment: false },
                              body: { text: \`⚔️ Kamu menyerang sebesar \${dmg} DMG!\\n\${state.monster} membalas sebesar \${mDmg} DMG!\\n\\n❤️ HP Kamu: \${user.hp}/\${user.maxHp}\\n🖤 HP \${state.monster}: \${state.monsterHp}\\n\\nApa langkahmu selanjutnya?\` },
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
              await sock.relayMessage(sender, msgRPG.message!, { messageId: msgRPG.key.id! });
              return;
          } else if (cmd === 'heal') {
              if (user.inventory.potion > 0) {
                  const healAmount = 50;
                  user.hp = Math.min(user.maxHp, user.hp + healAmount);
                  user.inventory.potion -= 1;
                  await updateUserProfile(sender, { hp: user.hp, inventory: user.inventory });
                  
                  const msgRPG = generateWAMessageFromContent(sender, {
                      viewOnceMessage: {
                          message: {
                              interactiveMessage: {
                                  header: { title: "✨ *HEALING*", hasMediaAttachment: false },
                                  body: { text: \`Kamu meminum Potion (Sisa: \${user.inventory.potion}). HP kamu pulih +\${healAmount}!\\n\\n❤️ HP Kamu: \${user.hp}/\${user.maxHp}\\n🖤 HP \${state.monster}: \${state.monsterHp}\\n\\nLanjutkan serangan?\` },
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
                  await sock.relayMessage(sender, msgRPG.message!, { messageId: msgRPG.key.id! });
              } else {
                  await reply(\`❌ Potion habis! Ketik *serang* atau *kabur*.\`);
              }
              return;
          } else if (cmd === 'kabur') {
              activeRPG.delete(sender);
              await reply("🏃 Kamu berhasil kabur dari pertarungan.");
              return;
          } else if (cmd.startsWith('.')) {
              activeRPG.delete(sender); // abandon rpg if new command
          } else {
              await reply(\`Kamu sedang dalam pertarungan! Pilih: *serang*, *heal*, atau *kabur*.\`);
              return;
          }
      }

      // MODE SUPER PRIVAT: Abaikan obrolan biasa (yang tidak diawali titik) agar tidak merespons chat normal Anda
      if (!text.startsWith('.')) return;

      try {
          const args = text.trim().split(' ');
          const command = args.shift()?.toLowerCase().substring(1);
`;

code = code.replace(target.trim(), replacement.trim());
fs.writeFileSync('server.ts', code);
console.log('done');
