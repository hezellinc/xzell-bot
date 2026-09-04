const fs = require('fs');

const content = `import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Sparkles, MessageSquare, Gamepad2, ImageIcon, Shield, ChevronDown, Mail, ArrowRight, CheckCircle2, Zap } from 'lucide-react';
import SideRays from '../components/SideRays';

export default function Landing() {
  const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-[#030303] text-white font-sans relative selection:bg-purple-500/30 overflow-x-hidden">
      
      {/* V 3.4 Modern Background Glow */}
      <div className="absolute top-[-10%] left-[20%] w-[50%] h-[50%] bg-purple-600/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] left-[-10%] w-[30%] h-[40%] bg-cyan-600/10 blur-[120px] rounded-full pointer-events-none" />

      {/* Navigation */}
      <nav className={\`fixed top-0 left-0 right-0 z-50 transition-all duration-300 \${scrolled ? 'bg-black/60 backdrop-blur-xl border-b border-white/10 py-4' : 'bg-transparent py-6'}\`}>
        <div className="w-full max-w-7xl mx-auto px-6 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-blue-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <span className="font-bold text-xl tracking-tight">Sallvera<span className="text-purple-400">Pedia</span></span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm text-gray-400 font-medium">
            <a href="#about" className="hover:text-white transition-colors">Tentang</a>
            <a href="#features" className="hover:text-white transition-colors">Fitur</a>
            <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
            <a href="#contact" className="hover:text-white transition-colors">Kontak</a>
          </div>
          
          <Link 
            to="/connect" 
            className="bg-white/10 hover:bg-white/20 border border-white/10 backdrop-blur-md text-white px-6 py-2.5 rounded-full text-sm font-semibold transition-all flex items-center gap-2 hover:shadow-[0_0_20px_rgba(255,255,255,0.1)]"
          >
            Hubungkan <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 flex flex-col items-center justify-center pt-40 pb-24 px-6 text-center min-h-[90vh]">
        
        {/* Pill Badge */}
        <div className="bg-white/5 backdrop-blur-md border border-white/10 inline-flex items-center gap-3 px-2 py-2 pr-5 rounded-full mb-8 shadow-2xl hover:scale-105 transition-transform cursor-default">
          <span className="bg-gradient-to-r from-purple-600 to-blue-600 text-white px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-[0_0_15px_rgba(147,51,234,0.3)]">
            V 3.4 Update
          </span>
          <span className="text-sm font-medium text-gray-300 flex items-center gap-2">
            Lebih cepat, stabil, & interaktif <Sparkles className="w-4 h-4 text-purple-400" />
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-8xl font-black tracking-tight mb-8 max-w-5xl mx-auto leading-[1.1] bg-gradient-to-br from-white via-white to-gray-500 text-transparent bg-clip-text">
          Evolusi WhatsApp Anda <br className="hidden md:block" /> menjadi lebih cerdas.
        </h1>
        
        <p className="text-lg md:text-xl text-gray-400 max-w-2xl mx-auto mb-12 leading-relaxed">
          Ubah obrolan biasa menjadi pusat produktivitas dan hiburan. Dilengkapi dengan AI Gemini 2.5, generator media visual, dan mesin game RPG interaktif.
        </p>
        
        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-5 mb-24">
          <Link 
            to="/connect" 
            className="group relative px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-all flex items-center gap-2 overflow-hidden shadow-[0_0_40px_-10px_rgba(255,255,255,0.5)]"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity" />
            <Zap className="w-5 h-5" />
            Mulai Sekarang Gratis
          </Link>
          <a 
            href="#features" 
            className="px-8 py-4 bg-white/5 border border-white/10 rounded-full font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-md"
          >
            Pelajari Fitur
          </a>
        </div>

        {/* Hero Chat Preview (v3.4 Style) */}
        <div className="relative w-full max-w-2xl mx-auto perspective-1000">
           {/* Decorative elements */}
           <div className="absolute -left-12 top-10 w-24 h-24 bg-purple-500/20 blur-[40px] rounded-full" />
           <div className="absolute -right-12 bottom-10 w-24 h-24 bg-blue-500/20 blur-[40px] rounded-full" />
           
           <div className="bg-[#0a0a0a]/80 backdrop-blur-xl border border-white/10 p-6 md:p-8 rounded-[2rem] w-full relative z-10 shadow-2xl overflow-hidden transform hover:-translate-y-2 transition-transform duration-500">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 pointer-events-none" />
              
              <div className="flex items-center gap-4 mb-8 border-b border-white/10 pb-6 relative z-10">
                <div className="w-14 h-14 bg-gradient-to-br from-purple-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/30">
                  <Bot className="w-7 h-7 text-white" />
                </div>
                <div className="text-left">
                  <h3 className="font-bold text-lg text-white tracking-tight">Sallvera AI</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse shadow-[0_0_10px_#4ade80]"></span>
                    <span className="text-[11px] font-mono tracking-widest uppercase text-green-400">Online Sync Active</span>
                  </div>
                </div>
              </div>
              
              <div className="space-y-6 relative z-10 text-left">
                <div className="bg-white/5 border border-white/10 rounded-3xl rounded-tl-sm p-5 text-sm md:text-base text-gray-200 w-[85%] shadow-sm">
                  Halo! Saya Sallvera, asisten cerdas Anda yang didukung oleh AI. Ada yang bisa saya bantu hari ini? 🌟
                </div>
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl rounded-tr-sm p-5 text-sm md:text-base text-white w-[85%] ml-auto shadow-lg shadow-purple-900/30 text-right font-medium">
                  .rpg
                </div>
                <div className="bg-white/5 border border-white/10 rounded-3xl rounded-tl-sm p-6 text-sm text-gray-200 w-[95%] shadow-sm relative overflow-hidden">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-[30px]" />
                  <div className="font-black text-white mb-3 text-base flex items-center gap-2">
                     <span className="text-red-400">⚠️</span> PERTARUNGAN DIMULAI
                  </div>
                  <p className="mb-4 text-base">Seekor 🐉 Naga Merah tiba-tiba muncul di hadapanmu!</p>
                  <div className="bg-black/40 rounded-xl p-3 mb-4 border border-white/5 inline-block">
                     <div className="text-red-400 font-mono text-sm">❤️ HP Kamu: 100/100</div>
                     <div className="text-gray-400 font-mono text-sm mt-1">🖤 HP Naga: 100</div>
                  </div>
                  <div className="flex flex-wrap gap-3 mt-2">
                     <div className="px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors cursor-pointer rounded-xl text-sm font-bold border border-white/5 shadow-sm flex items-center gap-2">⚔️ Serang</div>
                     <div className="px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors cursor-pointer rounded-xl text-sm font-bold border border-white/5 shadow-sm flex items-center gap-2">🧪 Heal</div>
                     <div className="px-4 py-2 bg-white/10 hover:bg-white/20 transition-colors cursor-pointer rounded-xl text-sm font-bold border border-white/5 shadow-sm flex items-center gap-2">🏃 Kabur</div>
                  </div>
                </div>
              </div>
            </div>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32 px-6 bg-black/30 border-y border-white/5">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white to-gray-500">Fitur Tanpa Batas</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg md:text-xl">Dilengkapi dengan integrasi tingkat tinggi untuk memenuhi segala kebutuhan harian Anda.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            <FeatureCard 
              icon={<MessageSquare />}
              title="Gemini AI Terintegrasi"
              desc="Tanyakan apa saja, mulai dari matematika hingga ringkasan artikel dengan respon cerdas layaknya manusia."
              color="text-blue-400"
              bg="bg-blue-500/10"
              border="border-blue-500/20"
            />
            <FeatureCard 
              icon={<Gamepad2 />}
              title="Mesin RPG Database"
              desc="Mainkan game tarung monster Turn-Based lengkap dengan sistem Leveling, HP, Uang, dan Inventory permanen."
              color="text-red-400"
              bg="bg-red-500/10"
              border="border-red-500/20"
            />
            <FeatureCard 
              icon={<ImageIcon />}
              title="Media & Stiker Editor"
              desc="Ubah gambar menjadi stiker otomatis, buat fake text, hapus background, hingga fitur penjernih foto HD."
              color="text-pink-400"
              bg="bg-pink-500/10"
              border="border-pink-500/20"
            />
            <FeatureCard 
              icon={<Sparkles />}
              title="Download & Audio"
              desc="Unduh video favorit Anda atau dengarkan preview lagu dari Spotify dan YouTube langsung di dalam chat."
              color="text-yellow-400"
              bg="bg-yellow-500/10"
              border="border-yellow-500/20"
            />
            <FeatureCard 
              icon={<Shield />}
              title="Super Private Mode"
              desc="Bot hanya akan mematuhi dan merespons pesan dari Anda sendiri. Aman dari spam dan tidak mengganggu grup."
              color="text-green-400"
              bg="bg-green-500/10"
              border="border-green-500/20"
            />
            <FeatureCard 
              icon={<Bot />}
              title="Utilitas Sehari-hari"
              desc="Sistem Anti-View Once, kuis interaktif, mesin slot, hingga penjadwalan aktivitas."
              color="text-purple-400"
              bg="bg-purple-500/10"
              border="border-purple-500/20"
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 py-32 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">Pertanyaan Umum</h2>
            <p className="text-gray-400 text-lg">Semua yang perlu Anda ketahui tentang SallveraPedia.</p>
          </div>
          <div className="space-y-4">
            <FaqItem 
              q="Apakah bot ini gratis digunakan?" 
              a="Ya, skrip dan penggunaan dasarnya gratis. Namun, fitur AI menggunakan API yang disediakan oleh Google (Gemini) yang memiliki kuota gratis berlimpah setiap harinya." 
            />
            <FaqItem 
              q="Bagaimana cara memainkan game RPG-nya?" 
              a="Setelah nomor terhubung, cukup ketik '.rpg' di chat WhatsApp Anda ke nomor Anda sendiri. Data game Anda akan tersimpan otomatis di cloud database." 
            />
            <FaqItem 
              q="Apakah bot ini bisa membaca pesan pribadi saya?" 
              a="Tidak. Bot dirancang dengan mode 'Self-Bot' dimana bot hanya merespons dan membaca perintah yang diawali dengan tanda titik (.) dari Anda sendiri." 
            />
            <FaqItem 
              q="Bagaimana cara memutuskan sambungan bot?" 
              a="Anda dapat menekan tombol 'Putuskan' di dashboard web ini, atau menghapus sesi 'NexusBot' dari menu Perangkat Tertaut di WhatsApp Anda." 
            />
          </div>
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="relative z-10 py-32 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden shadow-2xl">
            <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/20 blur-[120px] rounded-full pointer-events-none"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-blue-500/20 blur-[120px] rounded-full pointer-events-none"></div>
            
            <div className="relative z-10">
              <div className="w-20 h-20 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-8 rotate-3 shadow-lg">
                <Mail className="w-10 h-10 text-purple-400" />
              </div>
              <h2 className="text-4xl md:text-6xl font-black mb-6 tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-white to-gray-400">Siap untuk Memulai?</h2>
              <p className="text-gray-400 mb-12 max-w-xl mx-auto text-lg">
                Jika Anda memiliki pertanyaan seputar integrasi khusus, dukungan teknis, atau penawaran kerja sama, jangan ragu untuk menghubungi kami.
              </p>
              
              <form className="max-w-md mx-auto space-y-4">
                <input type="email" placeholder="Alamat Email Anda" className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-gray-600" />
                <textarea placeholder="Pesan Anda" rows={4} className="w-full bg-black/40 border border-white/10 rounded-2xl px-6 py-5 text-white resize-none focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all placeholder:text-gray-600"></textarea>
                <button type="button" className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white font-bold py-5 rounded-2xl transition-all shadow-lg shadow-purple-500/20 mt-2 text-lg">
                  Kirim Pesan
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-6 bg-[#020202]">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-3">
            <Bot className="w-6 h-6 text-gray-500" />
            <span className="font-bold text-gray-400 text-lg">SallveraPedia</span>
          </div>
          <div className="text-gray-600 text-sm font-medium">
            &copy; {new Date().getFullYear()} SallveraPedia. All rights reserved. Built with ❤️.
          </div>
          <div className="flex gap-8 text-sm text-gray-500 font-medium">
            <a href="#" className="hover:text-white transition-colors">Syarat & Ketentuan</a>
            <a href="#" className="hover:text-white transition-colors">Kebijakan Privasi</a>
          </div>
        </div>
      </footer>
    </div>
  );
}

function FeatureCard({ icon, title, desc, color, bg, border }: { icon: React.ReactNode, title: string, desc: string, color: string, bg: string, border: string }) {
  return (
    <div className="bg-white/5 border border-white/5 backdrop-blur-sm p-8 rounded-[2rem] hover:bg-white/10 transition-all duration-300 group cursor-default shadow-lg hover:shadow-xl hover:-translate-y-1">
      <div className={\`w-14 h-14 \${bg} \${border} border rounded-2xl flex items-center justify-center \${color} mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300 shadow-sm\`}>
        {React.cloneElement(icon as React.ReactElement, { className: "w-7 h-7" })}
      </div>
      <h3 className="text-xl font-bold text-white mb-3 tracking-tight">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string, a: string }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="bg-white/5 border border-white/5 backdrop-blur-sm rounded-2xl overflow-hidden transition-all duration-300 hover:bg-white/10">
      <button 
        onClick={() => setOpen(!open)} 
        className="w-full flex items-center justify-between p-6 md:p-8 text-left focus:outline-none"
      >
        <span className="font-bold text-white text-lg">{q}</span>
        <ChevronDown className={\`w-6 h-6 text-gray-400 transition-transform duration-300 \${open ? 'rotate-180' : ''}\`} />
      </button>
      <div 
        className={\`px-6 md:px-8 overflow-hidden transition-all duration-500 ease-in-out \${open ? 'max-h-60 pb-8 opacity-100' : 'max-h-0 opacity-0'}\`}
      >
        <p className="text-gray-400 text-base leading-relaxed pt-4 border-t border-white/5">
          {a}
        </p>
      </div>
    </div>
  );
}
`

fs.writeFileSync('src/pages/Landing.tsx', content);
console.log('done attractive rewrite');
