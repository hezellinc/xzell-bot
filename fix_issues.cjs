const fs = require('fs');
let code = fs.readFileSync('server.ts', 'utf8');

// 1. Fix gemini model
code = code.replace('model: "gemini-1.5-flash",', 'model: "gemini-2.5-flash",');

// 2. Add FormData import
if (!code.includes('import FormData from "form-data";')) {
    code = code.replace('import axios from "axios";', 'import axios from "axios";\nimport FormData from "form-data";');
}

// 3. Fix remove.bg require
code = code.replace("const FormData = require('form-data');\n                  const form = new FormData();", "const form = new FormData();");
code = code.replace("form.append('image_file', buffer as Buffer, 'image.jpg');", "form.append('image_file', buffer as Buffer, { filename: 'image.jpg' });");

// 4. Implement hd using DeepAI
const oldHd = `
              case 'hd': {
                  await reply("Fitur penjernih (HD) memerlukan API upscaling (seperti DeepAI). Harap konfigurasikan API key Anda.");
                  break;
              }
`;

const newHd = `
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
`;

code = code.replace(oldHd.trim(), newHd.trim());

fs.writeFileSync('server.ts', code);
console.log('done');
