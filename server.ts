import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Server as SocketIOServer } from "socket.io";
import http from "http";
import fs from "fs";
import { makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, getContentType, generateWAMessageFromContent } from "@whiskeysockets/baileys";
import { Sticker, StickerTypes } from "wa-sticker-formatter";
import axios from "axios";
import FormData from "form-data";
import pino from "pino";
import QRCode from "qrcode";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, getCountFromServer, doc, getDoc, setDoc } from "firebase/firestore";
import { GoogleGenAI, Type } from "@google/genai";

// === Firebase Setup ===
const firebaseConfig = JSON.parse(fs.readFileSync("./firebase-applet-config.json", "utf-8"));
const appFirebase = initializeApp(firebaseConfig);
const db = getFirestore(appFirebase, firebaseConfig.firestoreDatabaseId);

// === GenAI Setup ===
let ai: GoogleGenAI | null = null;
function getAI(): GoogleGenAI {
  if (!ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      console.warn("GEMINI_API_KEY is not set. AI features will fail.");
    }
    ai = new GoogleGenAI({ apiKey: key || "dummy-key-to-prevent-crash" });
  }
  return ai;
}

// === Global State ===
const activeQuizzes = new Map<string, { question: string; answer: string; hint?: string }>();
const activeRPG = new Map<string, { monsterHp: number; monster: string }>();
let botStatus = "disconnected";
let qrCodeUrl: string | null = null;
let sock: any = null;

// === RPG Database Logic ===
interface UserProfile {
    hp: number;
    maxHp: number;
    level: number;
    xp: number;
    balance: number;
    inventory: { potion: number };
}

async function getUserProfile(sender: string): Promise<UserProfile> {
    const userRef = doc(db, "users", sender);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
        return snap.data() as UserProfile;
    } else {
        const newUser: UserProfile = { hp: 100, maxHp: 100, level: 1, xp: 0, balance: 100, inventory: { potion: 3 } };
        await setDoc(userRef, newUser);
        return newUser;
    }
}

async function updateUserProfile(sender: string, updates: Partial<UserProfile>): Promise<UserProfile> {
    const userRef = doc(db, "users", sender);
    let user = await getUserProfile(sender);
    user = { ...user, ...updates };
    
    const nextLevelXp = user.level * 100;
    if (user.xp >= nextLevelXp) {
        user.level += 1;
        user.xp -= nextLevelXp;
        user.maxHp += 20;
        user.hp = user.maxHp; // Heal on level up
    }
    
    await setDoc(userRef, user);
    return user;
}

async function startServer() {
  const app = express();
  const PORT = parseInt(process.env.PORT as string) || 3000;
  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: "*" } });

  app.use(express.json());

  // === MaxRouter Chat Proxy ===
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages } = req.body;
      const apiKey = process.env.MAXROUTER_API_KEY;
      
      if (!apiKey) {
        return res.status(401).json({ error: "MAXROUTER_API_KEY is not configured on the server." });
      }

      // MaxRouter endpoint and model based on user request
      const response = await axios.post(
        "https://maxrouter.io/llm-api/chat/completions",
        {
          model: "deepseek-v3.2",
          messages: messages,
          temperature: 0.7
        },
        {
          headers: {
            "Authorization": `Bearer ${apiKey}`,
            "Content-Type": "application/json"
          }
        }
      );

      res.json(response.data);
    } catch (error: any) {
      console.error("MaxRouter API Error:", error.response?.data || error.message);
      res.status(500).json({ error: error.response?.data || error.message });
    }
  });

  // === Anti-Sleep Keep-Alive Endpoint ===
  app.get("/api/keepalive", (req, res) => {
    res.json({ status: "alive", timestamp: Date.now() });
  });

  // === Socket.io Events ===
  io.on("connection", (socket) => {
    socket.emit("bot_status", { status: botStatus, qr: qrCodeUrl });
    
    socket.on("get_logs", async () => {
      try {
        const q = query(collection(db, "messages"), orderBy("timestamp", "desc"), limit(100));
        const snapshot = await getDocs(q);
        const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).reverse();
        socket.emit("logs_data", logs);
      } catch (e) {
        console.error("Error fetching logs", e);
      }
    });

    socket.on("get_metrics", async () => {
      try {
        // Basic metrics
        const msgSnapshot = await getCountFromServer(collection(db, "messages"));
        const schedSnapshot = await getCountFromServer(collection(db, "schedules"));
        socket.emit("metrics_data", {
           status: botStatus,
           totalMessages: msgSnapshot.data().count,
           activeSchedules: schedSnapshot.data().count,
        });
      } catch (e) {
        console.error("Error fetching metrics", e);
      }
    });

    socket.on("connect_whatsapp", (data) => {
       if (botStatus === "disconnected") {
          startWhatsAppBot(io, data?.method, data?.number);
       }
    });

    socket.on("disconnect_whatsapp", () => {
       if (sock) {
          sock.logout();
          fs.rmSync('./.baileys_auth', { recursive: true, force: true });
          botStatus = "disconnected";
          qrCodeUrl = null;
          io.emit("bot_status", { status: botStatus, qr: qrCodeUrl });
       }
    });
  });

  // === Vite Middleware for Development ===
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  // === Self-Ping Interval (Anti-Sleep) ===
  // Ping the server every 10 minutes to prevent the PaaS from putting the app to sleep.
  setInterval(async () => {
     try {
       await axios.get(`http://127.0.0.1:${PORT}/api/keepalive`);
       console.log("Internal Keep-Alive Ping Sent");
     } catch (e) {
       // Ignore error
     }
  }, 10 * 60 * 1000);

  server.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

// === WhatsApp Bot Logic ===
async function startWhatsAppBot(io: SocketIOServer, authMethod: "qr" | "pairing" = "qr", phoneNumber?: string) {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./.baileys_auth');
    botStatus = "connecting";
    io.emit("bot_status", { status: botStatus });

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }) as any,
      browser: ['NexusBot', 'Chrome', '1.0.0'],
      markOnlineOnConnect: false, // Mencegah server auto-read saat baru konek
    });

    if (authMethod === "pairing" && phoneNumber && !sock.authState.creds.registered) {
       setTimeout(async () => {
          try {
             let code = await sock.requestPairingCode(phoneNumber);
             code = code?.match(/.{1,4}/g)?.join("-") || code;
             botStatus = "waiting_for_qr"; // We reuse the state
             io.emit("bot_status", { status: botStatus, pairingCode: code });
          } catch(e) {
             console.error("Pairing code error", e);
             botStatus = "error";
             io.emit("bot_status", { status: botStatus });
          }
       }, 3000);
    }

    sock.ev.on('connection.update', async (update: any) => {
      const { connection, lastDisconnect, qr } = update;
      
      if (qr) {
         qrCodeUrl = await QRCode.toDataURL(qr);
         botStatus = "waiting_for_qr";
         io.emit("bot_status", { status: botStatus, qr: qrCodeUrl });
      }
      
      if (connection === 'close') {
          const shouldReconnect = lastDisconnect?.error?.output?.statusCode !== DisconnectReason.loggedOut;
          if (shouldReconnect) {
              startWhatsAppBot(io);
          } else {
              botStatus = "disconnected";
              qrCodeUrl = null;
              io.emit("bot_status", { status: botStatus });
              fs.rmSync('./.baileys_auth', { recursive: true, force: true });
          }
      } else if (connection === 'open') {
          botStatus = "connected";
          qrCodeUrl = null;
          io.emit("bot_status", { status: botStatus });
      }
    });

    sock.ev.on('creds.update', saveCreds);

    sock.ev.on('messages.upsert', async (m: any) => {
      // Hapus auto-read sock.readMessages jika ada (dapat memblokir RVO)

      if (m.type !== 'notify') return;
      const msg = m.messages[0];
      if (!msg.message) return;

      // MODE SUPER PRIVAT: Abaikan SEMUA pesan yang bukan dari SAYA (fromMe === false)
      if (!msg.key.fromMe) return;

      const sender = msg.key.remoteJid;
      let text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || "";
      
      if (msg.message.interactiveResponseMessage?.nativeFlowResponseMessage?.paramsJson) {
          try {
              const params = JSON.parse(msg.message.interactiveResponseMessage.nativeFlowResponseMessage.paramsJson);
              if (params.id) text = params.id;
          } catch(e){}
      } else if (msg.message.templateButtonReplyMessage?.selectedId) {
          text = msg.message.templateButtonReplyMessage.selectedId;
      } else if (msg.message.buttonsResponseMessage?.selectedButtonId) {
          text = msg.message.buttonsResponseMessage.selectedButtonId;
      }

      if (!text) return;

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
              await reply(`🎉 *Selamat Jawaban Kamu Benar*\n\nJawaban: ${quiz!.answer}\nBalance: $${user.balance + reward}\n\nIngin main lagi? Kirim perintah .kuis`);
              return;
          } else if (text.toLowerCase() === 'nyerah' || text.toLowerCase() === '.nyerah') {
              activeQuizzes.delete(sender);
              await reply(`🏳️ Kamu menyerah.\nJawaban yang benar adalah: ${quiz!.answer}`);
              return;
          } else if (text.startsWith('.') && text.length > 2 && text !== '.nyerah') {
              activeQuizzes.delete(sender); // abandon quiz on new command
          } else {
              await reply(`❌ Salah! Coba lagi.\nPertanyaan: ${quiz!.question}\n\nPilih / ketik jawaban yang benar!`);
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
                  await reply(`⚔️ *CRITICAL HIT!* Kamu menyerang ${state.monster} sebesar ${dmg} DMG!\n\n💀 ${state.monster} telah dikalahkan!\n🎉 Kamu mendapat *$${reward}* dan ${xpReward} XP!`);
                  return;
              }
              
              user.hp -= mDmg;
              if (user.hp <= 0) {
                  await updateUserProfile(sender, { hp: user.maxHp });
                  activeRPG.delete(sender);
                  await reply(`⚔️ Kamu menyerang sebesar ${dmg} DMG, tapi ${state.monster} membalas dengan ganas sebesar ${mDmg} DMG!\n\n☠️ *KAMU MATI!* Perjalananmu berakhir di sini... HP kamu telah dipulihkan di kota.`);
                  return;
              }
              
              await updateUserProfile(sender, { hp: user.hp });
              
              const msgRPG = generateWAMessageFromContent(sender, {
                  viewOnceMessage: {
                      message: {
                          interactiveMessage: {
                              header: { title: "⚠️ *PERTARUNGAN BERLANJUT*", hasMediaAttachment: false },
                              body: { text: `⚔️ Kamu menyerang sebesar ${dmg} DMG!\n${state.monster} membalas sebesar ${mDmg} DMG!\n\n❤️ HP Kamu: ${user.hp}/${user.maxHp}\n🖤 HP ${state.monster}: ${state.monsterHp}\n\nApa langkahmu selanjutnya?` },
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
                                  body: { text: `Kamu meminum Potion (Sisa: ${user.inventory.potion}). HP kamu pulih +${healAmount}!\n\n❤️ HP Kamu: ${user.hp}/${user.maxHp}\n🖤 HP ${state.monster}: ${state.monsterHp}\n\nLanjutkan serangan?` },
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
                  await reply(`❌ Potion habis! Ketik *serang* atau *kabur*.`);
              }
              return;
          } else if (cmd === 'kabur') {
              activeRPG.delete(sender);
              await reply("🏃 Kamu berhasil kabur dari pertarungan.");
              return;
          } else if (cmd.startsWith('.')) {
              activeRPG.delete(sender); // abandon rpg if new command
          } else {
              await reply(`Kamu sedang dalam pertarungan! Pilih: *serang*, *heal*, atau *kabur*.`);
              return;
          }
      }

      // MODE SUPER PRIVAT: Abaikan obrolan biasa (yang tidak diawali titik) agar tidak merespons chat normal Anda
      if (!text.startsWith('.')) return;

      // Command Parser
      const args = text.slice(1).trim().split(/ +/);
      const command = args.shift()?.toLowerCase();
      const payload = args.join(" ");

      const type = getContentType(msg.message);
      const isMedia = type === 'imageMessage' || type === 'videoMessage';
      const isQuotedMedia = type === 'extendedTextMessage' && (
          msg.message.extendedTextMessage.contextInfo?.quotedMessage?.imageMessage ||
          msg.message.extendedTextMessage.contextInfo?.quotedMessage?.videoMessage ||
          msg.message.extendedTextMessage.contextInfo?.quotedMessage?.viewOnceMessageV2
      );

      const getTargetMediaMessage = () => {
          if (isMedia) return msg;
          if (isQuotedMedia) return { message: msg.message.extendedTextMessage.contextInfo.quotedMessage };
          return null;
      };

      try {
          switch (command) {
              case 'ai':
              case 'ask':
              case 'chat': {
                  if (!payload) return await reply("Ketik pesan untuk AI, contoh: .ai halo apa kabar?");
                  try {
                      const responseText = await processWithGemini(payload, sender);
                      await sock.sendMessage(sender, { text: responseText }, { quoted: msg });
                  } catch (aiError: any) {
                      await reply(`Gemini Error: ${aiError.message || 'Pastikan GEMINI_API_KEY sudah diisi di Railway!'}`);
                  }
                  break;
              }
              case 'menu':
              case 'help': {
                  const menuText = `╭━━━〔 *NEXUS BOT* 〕━━━
┃ 👋 Halo, Selamat Datang!
┃ 🤖 Status: Aktif
╰━━━━━━━━━━━━━━━━━━━━

┏━━ ✦ *FITUR BOT* ✦
┣ ⊳ .bratgif [teks]
┣ ⊳ .fwindow [teks]
┣ ⊳ .meme [teks] atau [atas | bawah]
┣ ⊳ .remove.bg (reply foto)
┣ ⊳ .spoplay [judul lagu]
┣ ⊳ .ytplay [judul lagu]
┣ ⊳ .sticker (reply foto/video)
┗━━━━━━━━━━━━━━━

💡 *Tips:* Jangan lupa gunakan tanda titik (.) sebelum perintah!`;
                  try {
                      if (fs.existsSync('./thumbnail.menu.jpg')) {
                          await sock.sendMessage(sender, { image: fs.readFileSync('./thumbnail.menu.jpg'), caption: menuText }, { quoted: msg });
                      } else {
                          await reply(menuText);
                      }
                  } catch (e) {
                      await reply(menuText);
                  }
                  break;
              }
              case 'sticker': {
                  const target = getTargetMediaMessage();
                  if (!target) return await reply("Kirim/reply foto atau video dengan .sticker");
                  const buffer = await downloadMediaMessage(target as any, 'buffer', {}, { logger: pino({ level: 'silent' }) as any, reuploadRequest: sock.updateMediaMessage });
                  const sticker = new Sticker(buffer as Buffer, { pack: 'Nexus AI', author: 'Bot', type: StickerTypes.FULL });
                  await sock.sendMessage(sender, await sticker.toMessage(), { quoted: msg });
                  break;
              }
              case 'meme': {
                  const target = getTargetMediaMessage();
                  if (!target || !payload) return await reply("Kirim/reply foto dengan perintah .meme [teks atas] | [teks bawah]");
                  try {
                      let topText = payload;
                      let bottomText = "";
                      if (payload.includes("|")) {
                          const parts = payload.split("|");
                          topText = parts[0].trim();
                          bottomText = parts[1].trim();
                      }
                      const buffer = await downloadMediaMessage(target as any, 'buffer', {}, { logger: pino({ level: 'silent' }) as any, reuploadRequest: sock.updateMediaMessage });
                      
                      const { createCanvas, loadImage } = await import('@napi-rs/canvas');
                      const img = await loadImage(buffer as Buffer);
                      const canvas = createCanvas(img.width, img.height);
                      const ctx = canvas.getContext('2d');
                      ctx.drawImage(img, 0, 0);
                      
                      const fontSize = Math.max(20, Math.floor(img.height / 10));
                      ctx.font = `bold ${fontSize}px Impact, sans-serif`;
                      ctx.fillStyle = 'white';
                      ctx.strokeStyle = 'black';
                      ctx.lineWidth = Math.max(2, Math.floor(fontSize / 10));
                      ctx.textAlign = 'center';
                      ctx.lineJoin = 'round';
                      
                      const drawMemeText = (text: string, x: number, y: number) => {
                          const lines = text.split('\n');
                          lines.forEach((line, i) => {
                              const yPos = y + (i * fontSize * 1.2);
                              ctx.strokeText(line, x, yPos);
                              ctx.fillText(line, x, yPos);
                          });
                      };
                      
                      if (topText) {
                          ctx.textBaseline = 'top';
                          drawMemeText(topText.toUpperCase(), img.width / 2, 10);
                      }
                      if (bottomText) {
                          ctx.textBaseline = 'bottom';
                          drawMemeText(bottomText.toUpperCase(), img.width / 2, img.height - 10 - (bottomText.split('\n').length - 1) * (fontSize * 1.2));
                      }
                      
                      const memeBuffer = await canvas.encode('png');
                      const sticker = new Sticker(memeBuffer, {
                          pack: "NEXUS MEME",
                          author: "Sallverapedia",
                          type: StickerTypes.FULL,
                          quality: 50,
                      });
                      const stickerBuffer = await sticker.toBuffer();
                      await sock.sendMessage(sender, { sticker: stickerBuffer }, { quoted: msg });
                  } catch (e) {
                      console.error("Meme error:", e);
                      await reply("Gagal membuat meme stiker. Pastikan reply foto.");
                  }
                  break;
              }
              case 'brat':
              case 'bratgif': {
                  try {
                      const text = payload || "brat";
                      const { GlobalFonts, createCanvas } = await import('@napi-rs/canvas');
                      
                      if (!(global as any).fontsRegistered) {
                          GlobalFonts.registerFromPath('./assets/OpenSans-Regular.ttf', 'Open Sans');
                          GlobalFonts.registerFromPath('./assets/NotoColorEmoji.ttf', 'Noto Color Emoji');
                          (global as any).fontsRegistered = true;
                      }
                      
                      const canvas = createCanvas(512, 512);
                      const ctx = canvas.getContext('2d');
                      
                      ctx.fillStyle = '#ffffff';
                      ctx.fillRect(0, 0, 512, 512);
                      
                      let fontSize = 64;
                      if (text.length > 20) fontSize = 48;
                      if (text.length > 50) fontSize = 36;
                      
                      ctx.font = `${fontSize}px "Open Sans", "Noto Color Emoji"`;
                      ctx.fillStyle = '#000000';
                      ctx.textAlign = 'left';
                      ctx.textBaseline = 'middle';
                      
                      const paragraphs = text.split('\n');
                      const lines: string[] = [];
                      const maxWidth = 472;
                      
                      for (let p = 0; p < paragraphs.length; p++) {
                          const words = paragraphs[p].split(' ');
                          let currentLine = '';
                          for (let i = 0; i < words.length; i++) {
                              const testLine = currentLine + words[i] + ' ';
                              const testWidth = ctx.measureText(testLine).width;
                              if (testWidth > maxWidth && i > 0) {
                                  lines.push(currentLine.trim());
                                  currentLine = words[i] + ' ';
                              } else {
                                  currentLine = testLine;
                              }
                          }
                          lines.push(currentLine.trim());
                      }
                      
                      const lineHeight = fontSize * 1.2;
                      const totalHeight = lines.length * lineHeight;
                      let startY = 256 - (totalHeight / 2) + (lineHeight / 2);
                      
                      for (let i = 0; i < lines.length; i++) {
                          ctx.fillText(lines[i], 20, startY);
                          startY += lineHeight;
                      }
                      
                      const buffer = canvas.toBuffer("image/png");
                      const sticker = new Sticker(buffer as Buffer, { pack: 'Nexus AI', author: 'Bot', type: StickerTypes.FULL });
                      await sock.sendMessage(sender, await sticker.toMessage(), { quoted: msg });
                  } catch (err) {
                      console.error("Error brat:", err);
                      await reply("Maaf, terjadi kesalahan saat membuat stiker.");
                  }
                  break;
              }
              case 'remove.bg': {
                  if (!process.env.REMOVE_BG_API_KEY) return await reply("API Key Remove.bg belum diatur di .env");
                  const target = getTargetMediaMessage();
                  if (!target) return await reply("Kirim/reply foto dengan .remove.bg");
                  const buffer = await downloadMediaMessage(target as any, 'buffer', {}, { logger: pino({ level: 'silent' }) as any, reuploadRequest: sock.updateMediaMessage });
                  
                  const form = new FormData();
                  form.append('size', 'auto');
                  form.append('image_file', buffer as Buffer, { filename: 'image.jpg' });

                  const res = await axios.post('https://api.remove.bg/v1.0/removebg', form, {
                      headers: { ...form.getHeaders(), 'X-Api-Key': process.env.REMOVE_BG_API_KEY },
                      responseType: 'arraybuffer'
                  });
                  await sock.sendMessage(sender, { image: res.data }, { quoted: msg });
                  break;
              }
              case 'aiedit': {
                  await reply(`Fitur AI Edit dengan prompt "${payload}" memerlukan API Image Generation eksternal (seperti OpenAI/Fal.ai).`);
                  break;
              }
              case 'hd': {
                  if (!process.env.DEEPAI_API_KEY) return await reply("API Key DeepAI (DEEPAI_API_KEY) belum diatur di .env / variables.");
                  const target = getTargetMediaMessage();
                  if (!target) return await reply("Kirim/reply foto dengan .hd");
                  
                  await reply("⏳ Sedang memproses gambar menjadi HD, mohon tunggu sebentar...");
                  try {
                      const buffer = await downloadMediaMessage(target as any, 'buffer', {}, { logger: pino({ level: 'silent' }) as any, reuploadRequest: sock.updateMediaMessage });
                      
                      const form = new FormData();
                      form.append('image', buffer as Buffer, { filename: 'image.jpg' });

                      const res = await axios.post('https://api.deepai.org/api/torch-srgan', form, {
                          headers: { ...form.getHeaders(), 'api-key': process.env.DEEPAI_API_KEY }
                      });
                      
                      if (res.data && res.data.output_url) {
                          await sock.sendMessage(sender, { image: { url: res.data.output_url }, caption: "✨ Berhasil di-HD-kan!" }, { quoted: msg });
                      } else {
                          await reply("Gagal mengupscale gambar.");
                      }
                  } catch (err: any) {
                      console.error("DeepAI Error:", err.response?.data || err.message);
                      await reply("Maaf, terjadi kesalahan saat menghubungi server DeepAI.");
                  }
                  break;
              }
              case 'fwindow': {
                  try {
                      if (!payload) {
                          return await reply("Ketik teks yang ingin dimasukkan ke dalam gambar.");
                      }
                      
                      const { GlobalFonts, createCanvas, loadImage } = await import('@napi-rs/canvas');
                      
                      if (!(global as any).fontsRegistered) {
                          GlobalFonts.registerFromPath('./assets/OpenSans-Regular.ttf', 'Open Sans');
                          GlobalFonts.registerFromPath('./assets/NotoColorEmoji.ttf', 'Noto Color Emoji');
                          (global as any).fontsRegistered = true;
                      }
                      
                      const img = await loadImage('fwindow.jpg');
                      // Keep original ratio but scale width to 800
                      const targetWidth = 800;
                      const targetHeight = (800 / img.width) * img.height;
                      
                      const canvas = createCanvas(targetWidth, targetHeight);
                      const ctx = canvas.getContext('2d');
                      
                      ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
                      
                      const text = payload;
                      
                      let fontSize = 72;
                      if (text.length > 20) fontSize = 56;
                      if (text.length > 50) fontSize = 42;
                      
                      ctx.font = `${fontSize}px "Open Sans", "Noto Color Emoji"`;
                      ctx.fillStyle = '#000000';
                      ctx.textAlign = 'left';
                      ctx.textBaseline = 'middle';
                      
                      const startX = 60;
                      const maxWidth = targetWidth * 0.55; // Membatasi lebar agar tidak menabrak karakter
                      const startYOffset = 120; // Lower a bit for the media player title
                      
                      const paragraphs = text.split('\n');
                      const lines: string[] = [];
                      
                      for (let p = 0; p < paragraphs.length; p++) {
                          const words = paragraphs[p].split(' ');
                          let currentLine = '';
                          for (let i = 0; i < words.length; i++) {
                              const testLine = currentLine + words[i] + ' ';
                              const testWidth = ctx.measureText(testLine).width;
                              if (testWidth > maxWidth && i > 0) {
                                  lines.push(currentLine.trim());
                                  currentLine = words[i] + ' ';
                              } else {
                                  currentLine = testLine;
                              }
                          }
                          lines.push(currentLine.trim());
                      }
                      
                      const lineHeight = fontSize * 1.3;
                      const totalHeight = lines.length * lineHeight;
                      
                      // Calculate center Y within the white box area
                      // The white box starts roughly around startYOffset, and ends roughly at targetHeight - 150
                      const whiteBoxHeight = targetHeight - startYOffset - 150;
                      let startY = startYOffset + (whiteBoxHeight / 2) - (totalHeight / 2) + (lineHeight / 2);
                      
                      for (let i = 0; i < lines.length; i++) {
                          ctx.fillText(lines[i], startX, startY);
                          startY += lineHeight;
                      }
                      
                      const buffer = canvas.toBuffer("image/jpeg");
                      await sock.sendMessage(sender, { image: buffer, caption: "Windows Media Player" }, { quoted: msg });
                  } catch (err) {
                      console.error("Error fwindow:", err);
                      await reply("Maaf, terjadi kesalahan saat memproses gambar.");
                  }
                  break;
              }
              case 'ffqic': {
                  if (!payload) return await reply("Ketik perintah dengan format: .ffqic set1 NamaKamu (pilih set1 sampai set5)");
                  
                  const parts = payload.split(' ');
                  const setMatch = parts[0].toLowerCase();
                  
                  if (!setMatch.match(/^set[1-5]$/)) {
                      return await reply("Harap sertakan kode set yang valid di awal (set1, set2, set3, set4, atau set5). Contoh: .ffqic set1 Budi");
                  }
                  
                  const nameText = parts.slice(1).join(' ');
                  if (!nameText) return await reply("Teks nama tidak boleh kosong.");
                  
                  try {
                      const { createCanvas, loadImage } = await import('@napi-rs/canvas');
                      const path = await import('path');
                      const fs = await import('fs');
                      
                      const assetPath = path.join(process.cwd(), 'assets', `${setMatch}.jpeg`);
                      if (!fs.existsSync(assetPath)) return await reply(`Maaf, template ${setMatch} belum tersedia.`);
                      
                      const img = await loadImage(assetPath);
                      const canvas = createCanvas(img.width, img.height);
                      const ctx = canvas.getContext('2d');
                      
                      ctx.drawImage(img, 0, 0);
                      
                      ctx.fillStyle = '#FFE9A6'; // Warna kuning pucat
                      
                      let fontSize = 28;
                      ctx.font = `bold ${fontSize}px sans-serif`;
                      ctx.textAlign = 'center';
                      ctx.textBaseline = 'middle';
                      
                      ctx.shadowColor = 'rgba(0, 0, 0, 0.8)';
                      ctx.shadowBlur = 4;
                      ctx.shadowOffsetX = 2;
                      ctx.shadowOffsetY = 2;
                      
                      let displayText = nameText;
                      let textWidth = ctx.measureText(displayText).width;
                      const maxWidth = 180;
                      
                      if (textWidth > maxWidth) {
                          while (textWidth > maxWidth && displayText.length > 0) {
                              displayText = displayText.slice(0, -1);
                              textWidth = ctx.measureText(displayText + '...').width;
                          }
                          displayText += '...';
                      }
                      
                      const textX = 460;
                      const textY = 1045;
                      
                      ctx.fillText(displayText, textX, textY);
                      
                      const buffer = canvas.toBuffer("image/jpeg");
                      await sock.sendMessage(sender, { image: buffer, caption: "Ini hasil jadinya!" }, { quoted: msg });
                  } catch (e) {
                      console.error("FFQIC error:", e);
                      await reply("Terjadi kesalahan saat memproses gambar.");
                  }
                  break;
              }
              case 'iqc': {
                  if (!payload) return await reply("Ketik teks untuk pesan iqc.");
                  try {
                      const { createCanvas } = await import('@napi-rs/canvas');
                      const width = 1080;
                      const height = 1920;
                      const canvas = createCanvas(width, height);
                      const ctx = canvas.getContext('2d');

                      ctx.fillStyle = '#0F1010';
                      ctx.fillRect(0, 0, width, height);

                      const drawRoundRect = (x, y, w, h, r, color) => {
                          ctx.fillStyle = color;
                          ctx.beginPath();
                          ctx.roundRect(x, y, w, h, r);
                          ctx.fill();
                      }

                      const msgText = payload;
                      const date = new Date();
                      const timeText = `${date.getHours().toString().padStart(2, '0')}.${date.getMinutes().toString().padStart(2, '0')}`;

                      ctx.font = '40px sans-serif';
                      const words = msgText.split(' ');
                      let lines = [];
                      let currentLine = '';
                      const maxBubbleTextWidth = 700;

                      for (let i = 0; i < words.length; i++) {
                          let testLine = currentLine + words[i] + ' ';
                          let testWidth = ctx.measureText(testLine).width;
                          if (testWidth > maxBubbleTextWidth && i > 0) {
                              lines.push(currentLine.trim());
                              currentLine = words[i] + ' ';
                          } else {
                              currentLine = testLine;
                          }
                      }
                      lines.push(currentLine.trim());

                      ctx.font = '28px sans-serif';
                      const timeWidth = ctx.measureText(timeText).width;

                      let longestLineW = 0;
                      ctx.font = '40px sans-serif';
                      lines.forEach(l => {
                          let w = ctx.measureText(l).width;
                          if(w > longestLineW) longestLineW = w;
                      });

                      const isSingleLine = lines.length === 1;
                      let bubbleWidth = 0;
                      if (isSingleLine) {
                          bubbleWidth = longestLineW + timeWidth + 60;
                      } else {
                          bubbleWidth = Math.max(longestLineW + 40, timeWidth + 40);
                      }

                      const lineHeight = 50;
                      const bubbleHeight = (lines.length * lineHeight) + (isSingleLine ? 30 : 50);

                      const bubbleX = 40;
                      const startY = 800;

                      const reactionText = "👍 ❤️ 😂 😮 😢 🙏 ➕";
                      drawRoundRect(bubbleX, startY - 90, 480, 80, 40, '#2A2B2D');
                      ctx.font = '35px "Noto Color Emoji"';
                      ctx.fillText(reactionText, bubbleX + 20, startY - 35);

                      drawRoundRect(bubbleX, startY, bubbleWidth, bubbleHeight, 25, '#1F2023');
                      ctx.fillStyle = 'white';
                      ctx.font = '40px sans-serif';
                      lines.forEach((l, i) => {
                          ctx.fillText(l, bubbleX + 20, startY + 50 + (i * lineHeight));
                      });

                      ctx.fillStyle = '#7E7F83';
                      ctx.font = '28px sans-serif';
                      ctx.fillText(timeText, bubbleX + bubbleWidth - timeWidth - 20, startY + bubbleHeight - 15);

                      const menuWidth = 500;
                      const menuY = startY + bubbleHeight + 20;
                      const itemHeight = 85;
                      const items = [
                          { text: "Star", icon: "⭐" },
                          { text: "Reply", icon: "↩️" },
                          { text: "Forward", icon: "↪️" },
                          { text: "Copy", icon: "📄" },
                          { text: "Pin", icon: "📌" },
                          { text: "Report", icon: "⚠️" },
                          { text: "Delete", icon: "🗑️", color: "#FF453A" }
                      ];

                      drawRoundRect(bubbleX, menuY, menuWidth, items.length * itemHeight, 35, '#252525');

                      items.forEach((item, index) => {
                          const y = menuY + (index * itemHeight);
                          
                          ctx.fillStyle = item.color || 'white';
                          ctx.font = '35px sans-serif';
                          ctx.fillText(item.text, bubbleX + 40, y + 55);
                          
                          ctx.font = '35px "Noto Color Emoji"';
                          ctx.fillText(item.icon, bubbleX + menuWidth - 70, y + 55);

                          if (index < items.length - 1) {
                              ctx.fillStyle = '#3A3A3C';
                              ctx.fillRect(bubbleX + 30, y + itemHeight, menuWidth - 60, 2);
                          }
                      });

                      const buffer = canvas.toBuffer("image/jpeg");
                      await sock.sendMessage(sender, { image: buffer, caption: "Context Menu" }, { quoted: msg });
                  } catch (e) {
                      console.error("IQC error:", e);
                      await reply("Gagal membuat gambar.");
                  }
                  break;
              }
              case 'bratgif':
              case 'bratvideo': {
                  if (!payload) return await reply("Ketik teks untuk bratgif.");
                  await reply("Sedang membuat animasi teks brat... Mohon tunggu sebentar.");
                  
                  try {
                      const text = payload.replace(/^video\s+/i, '');
                      const words = text.split(' ');
                      const { spawn } = await import('child_process');
                      const { createCanvas } = await import('@napi-rs/canvas');
                      const path = await import('path');
                      const fs = await import('fs');

                      const width = 512;
                      const height = 512;
                      const fps = 10;
                      const framesPerWord = 5;
                      const tempVideoPath = path.join(process.cwd(), `brat_${Date.now()}.mp4`);
                      
                      const ffmpeg = spawn('ffmpeg', [
                          '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo',
                          '-s', `${width}x${height}`, '-pix_fmt', 'rgba', '-r', `${fps}`,
                          '-i', '-', 
                          '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
                          tempVideoPath
                      ]);

                      const canvas = createCanvas(width, height);
                      const ctx = canvas.getContext('2d');
                      
                      const videoBuffer = await new Promise<Buffer>((resolve, reject) => {
                          ffmpeg.on('close', (code) => {
                              if (code !== 0) return reject(new Error(`FFmpeg exited with ${code}`));
                              try {
                                  const buf = fs.readFileSync(tempVideoPath);
                                  fs.unlinkSync(tempVideoPath);
                                  resolve(buf);
                              } catch (err) { reject(err); }
                          });
                          ffmpeg.on('error', reject);
                          
                          let currentWords = [];
                          for (let i = 0; i < words.length; i++) {
                              currentWords.push(words[i]);
                              
                              ctx.fillStyle = '#8ACE00';
                              ctx.fillRect(0,0,width,height);
                              
                              ctx.fillStyle = 'black';
                              ctx.textAlign = 'center';
                              ctx.textBaseline = 'middle';
                              
                              ctx.filter = 'blur(2px)';
                              
                              let fontSize = 120;
                              ctx.font = `bold ${fontSize}px Arial, sans-serif`;
                              
                              let maxW = 0;
                              for(let w of currentWords) {
                                  let m = ctx.measureText(w).width * 0.7;
                                  if (m > maxW) maxW = m;
                              }
                              
                              if (maxW > width - 40) {
                                  fontSize = Math.floor(fontSize * ((width - 40) / maxW));
                              }
                              const totalHeight = currentWords.length * fontSize;
                              if (totalHeight > height - 40) {
                                  fontSize = Math.floor(fontSize * ((height - 40) / totalHeight));
                              }
                              
                              ctx.font = `${fontSize}px Arial, sans-serif`;
                              let startY = (height - (currentWords.length * fontSize)) / 2 + (fontSize/2);
                              
                              ctx.save();
                              ctx.translate(width/2, 0);
                              ctx.scale(0.7, 1.1);
                              
                              for(let j=0; j<currentWords.length; j++) {
                                  ctx.fillText(currentWords[j], 0, startY + (j*fontSize));
                              }
                              ctx.restore();
                              
                              const data = ctx.getImageData(0, 0, width, height).data;
                              const buf = Buffer.from(data.buffer);
                              
                              for(let f=0; f<framesPerWord; f++) {
                                  ffmpeg.stdin.write(buf);
                              }
                          }
                          
                          // Hold last frame
                          const data = ctx.getImageData(0, 0, width, height).data;
                          const buf = Buffer.from(data.buffer);
                          for(let f=0; f<fps * 1.5; f++) {
                              ffmpeg.stdin.write(buf);
                          }
                          
                          ffmpeg.stdin.end();
                      });
                      
                      await sock.sendMessage(sender, { video: videoBuffer, caption: "Brat text animated" }, { quoted: msg });
                  } catch (e) {
                      console.error("Bratgif error:", e);
                      await reply("Gagal membuat video bratgif.");
                  }
                  break;
              }
              case 'ytplay':
              case 'spoplay': {
                  if (!payload) return await reply("Ketik judul lagu yang dicari.");
                  await reply("Memproses lagu dan membuat video UI Spotify... Mohon tunggu (estimasi 5-10 detik).");
                  try {
                      const res = await axios.get(`https://itunes.apple.com/search?term=${encodeURIComponent(payload)}&entity=song&limit=1`);
                      const track = res.data.results[0];
                      if (track && track.previewUrl) {
                          const { spawn } = await import('child_process');
                          const { createCanvas, loadImage } = await import('@napi-rs/canvas');
                          const path = await import('path');
                          
                          // Download audio to temp file first to prevent ffmpeg network errors
                          const audioRes = await axios.get(track.previewUrl, { responseType: 'arraybuffer' });
                          const audioPath = path.join(process.cwd(), `temp_audio_${Date.now()}.m4a`);
                          fs.writeFileSync(audioPath, audioRes.data);
                          
                          const width = 540;
                          const height = 960;
                          const canvas = createCanvas(width, height);
                          const ctx = canvas.getContext('2d');
                          const fps = 15;
                          const duration = 30; // iTunes previews are 30s
                          const totalFrames = fps * duration;

                          // Load Cover
                          let coverImg;
                          try {
                              const coverUrl = track.artworkUrl100.replace('100x100bb', '600x600bb');
                              coverImg = await loadImage(coverUrl);
                          } catch (e) {
                              // fallback empty
                          }

                          // Static BG
                          ctx.fillStyle = '#121212';
                          ctx.fillRect(0, 0, width, height);
                          if (coverImg) {
                              ctx.save();
                              ctx.beginPath();
                              ctx.roundRect(50, 100, 440, 440, 20); // Rounded corners
                              ctx.clip();
                              ctx.drawImage(coverImg, 50, 100, 440, 440);
                              ctx.restore();
                          } else {
                              ctx.fillStyle = '#282828';
                              ctx.beginPath();
                              ctx.roundRect(50, 100, 440, 440, 20);
                              ctx.fill();
                          }

                          // Title
                          ctx.fillStyle = 'white';
                          ctx.font = 'bold 36px sans-serif';
                          ctx.textAlign = 'left';
                          let displayTitle = track.trackName;
                          if (displayTitle.length > 22) displayTitle = displayTitle.substring(0, 20) + '...';
                          ctx.fillText(displayTitle, 50, 600);

                          // Artist
                          ctx.fillStyle = '#b3b3b3';
                          ctx.font = '24px sans-serif';
                          let displayArtist = track.artistName;
                          if (displayArtist.length > 30) displayArtist = displayArtist.substring(0, 28) + '...';
                          ctx.fillText(displayArtist, 50, 640);

                          // Playback Controls
                          const btnY = 800;
                          ctx.fillStyle = 'white';
                          ctx.beginPath();
                          ctx.arc(width / 2, btnY, 40, 0, Math.PI * 2);
                          ctx.fill();
                          ctx.fillStyle = 'black';
                          ctx.beginPath();
                          ctx.moveTo((width / 2) - 10, btnY - 15);
                          ctx.lineTo((width / 2) + 15, btnY);
                          ctx.lineTo((width / 2) - 10, btnY + 15);
                          ctx.fill();

                          ctx.fillStyle = 'white';
                          ctx.beginPath(); ctx.moveTo(170 + 15, btnY - 12); ctx.lineTo(170 - 5, btnY); ctx.lineTo(170 + 15, btnY + 12); ctx.fill();
                          ctx.fillRect(170 - 9, btnY - 12, 4, 24);
                          ctx.beginPath(); ctx.moveTo(370 - 15, btnY - 12); ctx.lineTo(370 + 5, btnY); ctx.lineTo(370 - 15, btnY + 12); ctx.fill();
                          ctx.fillRect(370 + 5, btnY - 12, 4, 24);

                          const bgData = ctx.getImageData(0, 0, width, height);
                          const tempVideoPath = path.join(process.cwd(), `spoplay_${Date.now()}.mp4`);
                          
                          const ffmpeg = spawn('ffmpeg', [
                              '-y', '-f', 'rawvideo', '-vcodec', 'rawvideo',
                              '-s', `${width}x${height}`, '-pix_fmt', 'rgba', '-r', `${fps}`,
                              '-i', '-', '-i', audioPath,
                              '-c:v', 'libx264', '-preset', 'ultrafast', '-pix_fmt', 'yuv420p',
                              '-c:a', 'aac', '-t', `${duration}`,
                              tempVideoPath
                          ]);
                          
                          const videoBuffer = await new Promise<Buffer>((resolve, reject) => {
                              ffmpeg.on('close', (code) => {
                                  try { fs.unlinkSync(audioPath); } catch (e) {}
                                  if (code !== 0) return reject(new Error(`FFmpeg exited with ${code}`));
                                  try {
                                      const buf = fs.readFileSync(tempVideoPath);
                                      fs.unlinkSync(tempVideoPath);
                                      resolve(buf);
                                  } catch (err) { reject(err); }
                              });
                              ffmpeg.on('error', reject);
                              
                              for(let i=0; i<totalFrames; i++) {
                                  ctx.putImageData(bgData, 0, 0);
                                  const progress = i / totalFrames;
                                  const barY = 710;
                                  
                                  ctx.fillStyle = '#4d4d4d';
                                  ctx.beginPath(); ctx.roundRect(50, barY, 440, 6, 3); ctx.fill();
                                  
                                  ctx.fillStyle = 'white';
                                  ctx.beginPath(); ctx.roundRect(50, barY, 440 * progress, 6, 3); ctx.fill();
                                  
                                  ctx.beginPath(); ctx.arc(50 + 440 * progress, barY + 3, 8, 0, Math.PI * 2); ctx.fill();
                                  
                                  const currentSec = Math.floor(i / fps);
                                  ctx.fillStyle = '#b3b3b3'; ctx.font = '16px sans-serif';
                                  ctx.fillText(`0:${currentSec.toString().padStart(2, '0')}`, 50, barY + 30);
                                  ctx.textAlign = 'right';
                                  ctx.fillText('0:30', 490, barY + 30);
                                  ctx.textAlign = 'left';
                                  
                                  const data = ctx.getImageData(0, 0, width, height).data;
                                  ffmpeg.stdin.write(Buffer.from(data.buffer));
                              }
                              ffmpeg.stdin.end();
                          });
                          
                          await sock.sendMessage(sender, { video: videoBuffer, caption: `🎵 ${track.trackName} - ${track.artistName}` }, { quoted: msg });
                      } else {
                          await reply("Lagu tidak ditemukan atau tidak ada preview.");
                      }
                  } catch (e) {
                      console.error("Spoplay error:", e);
                      await reply("Gagal membuat video lagu.");
                  }
                  break;
              }
              case 'tiktok': {
                  if (!payload) return await reply("Kirim link tiktok.");
                  try {
                      const res = await axios.post("https://tikwm.com/api/", { url: payload });
                      const videoUrl = res.data?.data?.play;
                      const title = res.data?.data?.title || "TikTok Video";
                      if (videoUrl) {
                          await sock.sendMessage(sender, { video: { url: videoUrl }, caption: `${title}\n\n*Downloaded via NexusBot*` }, { quoted: msg });
                      } else {
                          await reply("Gagal mengunduh video tiktok.");
                      }
                  } catch (e) {
                      await reply("Error saat fetch tiktok.");
                  }
                  break;
              }
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
                                  body: { text: `Soal: ${q.question}\n\nPilih jawabanmu di bawah:` },
                                  footer: { text: "Nexus AI" },
                                  nativeFlowMessage: { buttons }
                              }
                          }
                      }
                  }, { userJid: sock.user?.id });
                  await sock.relayMessage(sender, msgKuis.message!, { messageId: msgKuis.key.id! });
                  break;
              }
              case 'rpg': {
                  if (activeRPG.has(sender)) return await reply("Selesaikan dulu pertarunganmu yang sekarang!");
                  const user = await getUserProfile(sender);
                  if (user.hp <= 0) {
                      await updateUserProfile(sender, { hp: user.maxHp });
                      return await reply("Membangkitkan kamu di kota... HP kamu telah dipulihkan. Silakan coba lagi.");
                  }
                  
                  const monsters = ["🐉 Naga Merah", "🧟 Zombie Gemuk", "🐺 Serigala Ganas", "🧛 Vampir Haus Darah", "👻 Hantu Gentayangan"];
                  const monster = monsters[Math.floor(Math.random() * monsters.length)];
                  activeRPG.set(sender, { monsterHp: 100, monster });
                  
                  const msgRPG = generateWAMessageFromContent(sender, {
                      viewOnceMessage: {
                          message: {
                              interactiveMessage: {
                                  header: { title: "⚠️ *PERTARUNGAN DIMULAI*", hasMediaAttachment: false },
                                  body: { text: `Seekor ${monster} tiba-tiba muncul di hadapanmu!\n\n❤️ HP Kamu: ${user.hp}/${user.maxHp}\n🖤 HP ${monster}: 100\n\nApa yang akan kamu lakukan?` },
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
                  break;
              }
              case 'slot': {
                  const cost = 20;
                  const user = await getUserProfile(sender);
                  if (user.balance < cost) return await reply(`❌ Uangmu tidak cukup! Biaya main slot adalah $${cost}.\nUangmu saat ini: $${user.balance}\n\nKetik *.rpg* atau *.kuis* untuk mencari uang.`);
                  
                  const emojis = ["🍎", "🍇", "💎", "7️⃣", "🍒"];
                  const s1 = emojis[Math.floor(Math.random() * emojis.length)];
                  const s2 = emojis[Math.floor(Math.random() * emojis.length)];
                  const s3 = emojis[Math.floor(Math.random() * emojis.length)];
                  
                  let result = `🎰 *SLOT MACHINE* 🎰\n\n[ ${s1} | ${s2} | ${s3} ]\n\n`;
                  let newBalance = user.balance - cost;
                  if (s1 === s2 && s2 === s3) {
                      newBalance += 500;
                      result += `🎉 *JACKPOT!!!* Kamu menang $500!`;
                  } else {
                      result += `❌ *Kalah!* Coba lagi boss.`;
                  }
                  await updateUserProfile(sender, { balance: newBalance });
                  await reply(result + `\n💰 Uangmu sekarang: $${newBalance}`);
                  break;
              }
              case 'profil':
              case 'stats': {
                  const user = await getUserProfile(sender);
                  const nextLevelXp = user.level * 100;
                  const profilTxt = `👤 *PROFIL KARAKTER* 👤
                  
🔰 *Level:* ${user.level}
✨ *XP:* ${user.xp} / ${nextLevelXp}
❤️ *HP:* ${user.hp} / ${user.maxHp}
💰 *Uang:* $${user.balance}

🎒 *INVENTORY*
🧪 Potion: ${user.inventory.potion}x

Ketik *.rpg* untuk mulai berpetualang!`;
                  await reply(profilTxt);
                  break;
              }
              case 'rvo': {
                  if (!isQuotedMedia) return await reply("Reply pesan 1x lihat (view once) dengan .rvo");
                  const quotedMsg = msg.message.extendedTextMessage?.contextInfo?.quotedMessage;
                  
                  // Mendukung berbagai versi View Once (v1, v2, v2Extension)
                  const viewOnce = quotedMsg?.viewOnceMessageV2Extension?.message || quotedMsg?.viewOnceMessageV2?.message || quotedMsg?.viewOnceMessage?.message;
                  if (!viewOnce) return await reply("Pesan yang di-reply bukan view once.");
                  
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
              default:
                  await reply("Perintah tidak dikenali.");
          }
          
          // Log outbound command response
          const outMsg = { sender, text: `[Command executed: ${command}]`, direction: "outbound", timestamp: Date.now() };
          await addDoc(collection(db, "messages"), outMsg).catch(console.error);
          io.emit("new_log", outMsg);
          
      } catch (err) {
          console.error("Command execution error:", err);
          await reply("Terjadi kesalahan saat memproses perintah.");
      }
    });
  } catch (error) {
    console.error("Failed to start WhatsApp bot", error);
    botStatus = "error";
    io.emit("bot_status", { status: botStatus });
  }
}

async function processWithGemini(text: string, senderId: string): Promise<string> {
  const tools = [
    { googleSearch: {} },
    {
      name: "calculate",
      description: "Evaluates a mathematical expression and returns the result.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          expression: { type: Type.STRING, description: "Math expression like '5 * 25'" }
        },
        required: ["expression"]
      }
    },
    {
      name: "schedule_event",
      description: "Schedules an event or task for the user.",
      parameters: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING, description: "Title of the event" },
          datetime: { type: Type.STRING, description: "Date and time of the event (ISO format)" }
        },
        required: ["title", "datetime"]
      }
    }
  ];

  const chat = getAI().chats.create({
    model: "gemini-3.6-flash",
    config: {
      systemInstruction: "You are a helpful, intelligent WhatsApp AI bot. You can search the web, calculate math expressions, and schedule events. Keep your answers concise, friendly, and formatted nicely for WhatsApp.",
      tools: tools
    }
  });

  let response = await chat.sendMessage({ message: text });
  
  if (response.functionCalls && response.functionCalls.length > 0) {
      const calls = response.functionCalls;
      const functionResponses = [];

      for (const call of calls) {
         if (call.name === "calculate") {
            const args = call.args as any;
            try {
               // Use Function to safely evaluate simple math expressions
               const result = new Function(`return ${args.expression}`)();
               functionResponses.push({
                   name: call.name,
                   response: { result: String(result) }
               });
            } catch (e: any) {
               functionResponses.push({ name: call.name, response: { error: e.message } });
            }
         } else if (call.name === "schedule_event") {
            const args = call.args as any;
            await addDoc(collection(db, "schedules"), {
               senderId,
               title: args.title,
               datetime: args.datetime,
               createdAt: Date.now()
            });
            functionResponses.push({
               name: call.name,
               response: { status: "Success", details: `Scheduled ${args.title} at ${args.datetime}` }
            });
         }
      }

      if (functionResponses.length > 0) {
         response = await chat.sendMessage({ message: functionResponses.map(fr => ({ functionResponse: fr })) });
      }
  }

  return response.text || "Mohon maaf, saya tidak mengerti maksud Anda.";
}

startServer();
