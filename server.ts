import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { Server as SocketIOServer } from "socket.io";
import http from "http";
import fs from "fs";
import { makeWASocket, useMultiFileAuthState, DisconnectReason, downloadMediaMessage, getContentType } from "@whiskeysockets/baileys";
import { Sticker, StickerTypes } from "wa-sticker-formatter";
import axios from "axios";
import pino from "pino";
import QRCode from "qrcode";
import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, query, orderBy, limit, getCountFromServer } from "firebase/firestore";
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
const activeQuizzes = new Map<string, { question: string; answer: string }>();
let botStatus = "disconnected";
let qrCodeUrl: string | null = null;
let sock: any = null;

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

    socket.on("connect_whatsapp", () => {
       if (botStatus === "disconnected") {
          startWhatsAppBot(io);
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
async function startWhatsAppBot(io: SocketIOServer) {
  try {
    const { state, saveCreds } = await useMultiFileAuthState('./.baileys_auth');
    botStatus = "connecting";
    io.emit("bot_status", { status: botStatus });

    sock = makeWASocket({
      auth: state,
      printQRInTerminal: false,
      logger: pino({ level: 'silent' }) as any,
    });

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
      if (m.type !== 'notify') return;
      const msg = m.messages[0];
      if (!msg.message) return;

      // MODE SUPER PRIVAT: Abaikan SEMUA pesan yang bukan dari SAYA (fromMe === false)
      if (!msg.key.fromMe) return;

      const sender = msg.key.remoteJid;
      const text = msg.message.conversation || msg.message.extendedTextMessage?.text || msg.message.imageMessage?.caption || msg.message.videoMessage?.caption || "";
      if (!text) return;

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
              await reply("🎉 Benar! Jawaban kamu tepat.");
              return;
          } else if (text.startsWith('.')) {
              activeQuizzes.delete(sender); // abandon quiz on new command
          } else {
              await reply(`❌ Salah! Coba lagi.\nPertanyaan: ${quiz!.question}`);
              return;
          }
      }

      // Semua pesan sudah pasti berawalan titik karena pengecekan di atas

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
                  const responseText = await processWithGemini(payload, sender);
                  await sock.sendMessage(sender, { text: responseText }, { quoted: msg });
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
              case 'bratgif': {
                  // Mocking brat using a public dummy image generator for pure JS approach
                  const t = encodeURIComponent(payload || "brat");
                  const url = `https://dummyimage.com/500x500/8aE31E/000000.png&text=${t}`;
                  const res = await axios.get(url, { responseType: 'arraybuffer' });
                  const sticker = new Sticker(res.data, { pack: 'Nexus AI', author: 'Bot', type: StickerTypes.FULL });
                  await sock.sendMessage(sender, await sticker.toMessage(), { quoted: msg });
                  break;
              }
              case 'remove.bg': {
                  if (!process.env.REMOVE_BG_API_KEY) return await reply("API Key Remove.bg belum diatur di .env");
                  const target = getTargetMediaMessage();
                  if (!target) return await reply("Kirim/reply foto dengan .remove.bg");
                  const buffer = await downloadMediaMessage(target as any, 'buffer', {}, { logger: pino({ level: 'silent' }) as any, reuploadRequest: sock.updateMediaMessage });
                  
                  const FormData = require('form-data');
                  const form = new FormData();
                  form.append('size', 'auto');
                  form.append('image_file', buffer as Buffer, 'image.jpg');

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
                  await reply("Fitur penjernih (HD) memerlukan API upscaling (seperti DeepAI). Harap konfigurasikan API key Anda.");
                  break;
              }
              case 'fwindow': {
                  const t = encodeURIComponent(payload || "Windows");
                  const url = `https://dummyimage.com/600x400/cccccc/000000.png&text=${t}`;
                  await sock.sendMessage(sender, { image: { url }, caption: "Windows Media Player" }, { quoted: msg });
                  break;
              }
              case 'iqc': {
                  await reply(`[Fake Chat]\n${payload}`);
                  break;
              }
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
                      if (videoUrl) {
                          await sock.sendMessage(sender, { video: { url: videoUrl }, caption: "TikTok Video" }, { quoted: msg });
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
                      { question: "Apa ibukota negara Indonesia?", answer: "Jakarta" },
                      { question: "Hewan apa yang bernapas dengan insang?", answer: "Ikan" },
                      { question: "Siapa penemu lampu pijar?", answer: "Thomas Edison" }
                  ];
                  const q = questions[Math.floor(Math.random() * questions.length)];
                  activeQuizzes.set(sender, q);
                  await reply(`[KUIS]\n${q.question}\nKetik jawabanmu!`);
                  break;
              }
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
    model: "gemini-2.5-pro",
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
