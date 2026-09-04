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
          }
       }, 2000);
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
          } else if (text.toLowerCase() === 'nyerah') {
              activeQuizzes.delete(sender);
              await reply(`🏳️ Kamu menyerah.\nJawaban yang benar adalah: ${quiz!.answer}`);
              return;
          } else if (text.startsWith('.')) {
              activeQuizzes.delete(sender); // abandon quiz on new command
          } else {
              await reply(`❌ Salah! Coba lagi.\nPertanyaan: ${quiz!.question}\n\nBalas soal ini dengan *nyerah* jika ingin menyerah.`);
              return;
          }
      }

      // RPG State check
      if (activeRPG.has(sender)) {
          const state = activeRPG.get(sender)!;
          const user = await getUserProfile(sender);
          const cmd = text.toLowerCase().replace(/^\./, ''); // remove dot from button id or typed command
          
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
              await reply(`⚔️ Kamu menyerang sebesar ${dmg} DMG!\n👹 ${state.monster} membalas sebesar ${mDmg} DMG!\n\n❤️ HP Kamu: ${user.hp}/${user.maxHp}\n🖤 HP ${state.monster}: ${state.monsterHp}\n\nKetik: *serang*, *heal*, atau *kabur*`);
              return;
          } else if (cmd === 'heal') {
              if (user.inventory.potion <= 0) {
                  await reply(`❌ Kamu tidak memiliki Potion! Ketik *serang* atau *kabur*.`);
                  return;
              }
              const heal = Math.floor(Math.random() * 20) + 15;
              const mDmg = Math.floor(Math.random() * 15) + 5;
              const newHp = Math.min(user.maxHp, user.hp + heal - mDmg);
              await updateUserProfile(sender, { hp: newHp, inventory: { ...user.inventory, potion: user.inventory.potion - 1 } });
              await reply(`✨ Kamu meminum potion dan memulihkan ${heal} HP (Sisa: ${user.inventory.potion - 1}).\nNamun ${state.monster} tetap menyerangmu sebesar ${mDmg} DMG!\n\n❤️ HP Kamu: ${newHp}/${user.maxHp}\n🖤 HP ${state.monster}: ${state.monsterHp}\n\nKetik: *serang*, *heal*, atau *kabur*`);
              return;
          } else if (cmd === 'kabur') {
              const penalty = Math.floor(Math.random() * 50) + 10;
              await updateUserProfile(sender, { balance: Math.max(0, user.balance - penalty) });
              activeRPG.delete(sender);
              await reply(`🏃‍♂️💨 Kamu lari terbirit-birit dari ${state.monster} dan menjatuhkan *$${penalty}* uangmu di jalan.`);
              return;
          } else if (text.startsWith('.')) {
              activeRPG.delete(sender); // abandon rpg if new command
          } else {
              return; // ignore non-rpg chat while in battle
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

┏━━ ✦ *AI & CHAT* ✦
┣ ⊳ .ai [pertanyaan]
┣ ⊳ .chat / .ask
┗━━━━━━━━━━━━━━━

┏━━ ✦ *MEDIA & STIKER* ✦
┣ ⊳ .sticker (reply foto/video)
┣ ⊳ .brat [teks]
┣ ⊳ .fwindow [teks]
┣ ⊳ .iqc [teks]
┗━━━━━━━━━━━━━━━

┏━━ ✦ *DOWNLOAD & AUDIO* ✦
┣ ⊳ .ytplay [judul lagu]
┣ ⊳ .spoplay [judul lagu]
┣ ⊳ .tiktok [link video]
┗━━━━━━━━━━━━━━━

┏━━ ✦ *AI EDITOR (PRO)* ✦
┣ ⊳ .remove.bg (reply foto)
┣ ⊳ .hd (reply foto)
┣ ⊳ .aiedit [prompt]
┗━━━━━━━━━━━━━━━

┏━━ ✦ *GAMES & RPG* ✦
┣ ⊳ .rpg (berburu monster)
┣ ⊳ .profil (cek status hero)
┣ ⊳ .slot (spin dapet uang)
┣ ⊳ .kuis (tebak-tebakan)
┗━━━━━━━━━━━━━━━

┏━━ ✦ *UTILITY* ✦
┣ ⊳ .rvo (buka 1x lihat)
┣ ⊳ .menu (tampilkan menu)
┗━━━━━━━━━━━━━━━

💡 *Tips:* Jangan lupa gunakan tanda titik (.) sebelum perintah!`;
                  await reply(menuText);
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
                      
                      let fontSize = 64;
                      if (text.length > 20) fontSize = 48;
                      if (text.length > 50) fontSize = 36;
                      
                      ctx.font = `${fontSize}px "Open Sans", "Noto Color Emoji"`;
                      ctx.fillStyle = '#000000';
                      ctx.textAlign = 'left';
                      ctx.textBaseline = 'middle';
                      
                      // The character is on the right, so we restrict text to the left 60%
                      const textAreaWidth = targetWidth * 0.60;
                      const startX = 40; // Absolut kiri
                      const maxWidth = textAreaWidth - 40;
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
                      
                      const lineHeight = fontSize * 1.2;
                      const totalHeight = lines.length * lineHeight;
                      
                      // Calculate center Y within the white box area
                      const whiteBoxHeight = targetHeight - startYOffset - 150;
                      let startY = startYOffset + (whiteBoxHeight / 2) - (totalHeight / 2) + (lineHeight / 2) - 20; // Shift up a little
                      
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
              case 'iqc': {
                  await reply(`[Fake Chat]\n${payload}`);
                  break;
              }
              case 'ytplay':
              case 'spoplay': {
                  if (!payload) return await reply("Ketik judul lagu yang dicari.");
                  try {
                      const res = await axios.get(`https://api.deezer.com/search?q=${encodeURIComponent(payload)}`);
                      const track = res.data.data[0];
                      if (track && track.preview) {
                          await sock.sendMessage(sender, { audio: { url: track.preview }, mimetype: 'audio/mp4' }, { quoted: msg });
                      } else {
                          await reply("Lagu tidak ditemukan atau tidak ada preview.");
                      }
                  } catch (e) {
                      await reply("Gagal mencari lagu.");
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
                      
                      await reply(`📝 *Transkrip Audio:*\n\n${response.text}`);
                  } catch (err) {
                      await reply(`❌ Gagal mentranskrip: ${err.message}`);
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
                  
                  let optText = "";
                  q.options.forEach((opt, idx) => {
                      optText += `${String.fromCharCode(65 + idx)}. ${opt}\n`;
                  });
                  
                  const text = `🎯 *GAME KUIS*\n\nSoal: ${q.question}\n\nPilih jawabanmu di bawah:\n${optText}\n🏳️ Ketik *nyerah* jika menyerah.\n(Balas pesan ini dengan jawabanmu!)`;
                  
                  await sock.sendMessage(sender, { text }, { quoted: msg });
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
                  
                  const text = `⚠️ *PERTARUNGAN DIMULAI*\n\nSeekor ${monster} tiba-tiba muncul di hadapanmu!\n\n❤️ HP Kamu: ${user.hp}/${user.maxHp}\n🖤 HP ${monster}: 100\n\nApa yang akan kamu lakukan?\n\nKetik perintah berikut:\n⚔️ *.serang*\n🧪 *.heal*\n🏃 *.kabur*`;
                  await sock.sendMessage(sender, { text }, { quoted: msg });
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
    model: "gemini-2.5-flash",
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
