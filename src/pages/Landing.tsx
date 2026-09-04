import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Sparkles, MessageSquare, Gamepad2, ImageIcon, Shield, ChevronDown, Mail, ArrowRight, CheckCircle2 } from 'lucide-react';
import SideRays from '../components/SideRays';

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans relative selection:bg-purple-500/30 overflow-x-hidden">
      
      {/* SideRays Background */}
      <div className="fixed inset-0 z-0 opacity-50 pointer-events-none">
        <SideRays
          origin="top-right"
          rayColor1="#ec4899"
          rayColor2="#a855f7"
          intensity={1.5}
        />
      </div>
      
      {/* Background Aurora Glow */}
      <div className="aurora-glow fixed z-0 pointer-events-none"></div>

      {/* Navigation */}
      <nav className="relative z-50 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between border-b border-white/5">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-500 to-purple-600 flex items-center justify-center">
            <Bot className="w-5 h-5 text-white" />
          </div>
          <span className="font-bold text-xl tracking-tight">SallveraPedia</span>
        </div>
        
        <div className="hidden md:flex items-center gap-8 text-sm text-gray-400 font-medium">
          <a href="#about" className="hover:text-white transition-colors">Tentang</a>
          <a href="#features" className="hover:text-white transition-colors">Fitur</a>
          <a href="#faq" className="hover:text-white transition-colors">FAQ</a>
          <a href="#contact" className="hover:text-white transition-colors">Kontak</a>
        </div>
        
        <Link 
          to="/connect" 
          className="bg-white text-black px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-gray-200 transition-colors flex items-center gap-2"
        >
          Hubungkan <ArrowRight className="w-4 h-4" />
        </Link>
      </nav>

      {/* Hero Section */}
      <header className="relative z-10 flex flex-col items-center justify-center pt-32 pb-24 px-6 text-center">
        {/* Pill Badge */}
        <div className="glass-panel inline-flex items-center gap-3 px-1.5 py-1.5 pr-4 rounded-full mb-10 shadow-2xl">
          <span className="bg-white text-black px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
            V 2.0
          </span>
          <span className="text-sm font-medium text-gray-300">
            Sallvera<span className="bg-gradient-to-r from-pink-500 via-purple-500 to-cyan-500 bg-clip-text text-transparent font-bold">Pedia</span>
          </span>
        </div>

        {/* Headline */}
        <h1 className="text-5xl md:text-7xl font-extrabold tracking-tight mb-8 max-w-4xl mx-auto leading-[1.1]">
          Evolusi WhatsApp Anda <br className="hidden md:block" /> menjadi lebih cerdas!
        </h1>
        <p className="text-lg text-gray-400 max-w-2xl mx-auto mb-10 leading-relaxed">
          Ubah obrolan biasa menjadi pusat produktivitas dan hiburan. Dilengkapi dengan AI Gemini, generator media, dan mesin game RPG interaktif.
        </p>

        {/* Call to Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-4">
          <Link 
            to="/connect" 
            className="bg-white text-black px-8 py-4 rounded-full font-bold text-base hover:bg-gray-200 transition-all shadow-[0_0_40px_-10px_rgba(255,255,255,0.3)]"
          >
            Mulai Sekarang Gratis
          </Link>
          <a 
            href="#features" 
            className="glass-panel text-white px-8 py-4 rounded-full font-semibold text-base hover:bg-white/10 transition-colors"
          >
            Pelajari Fitur
          </a>
        </div>
      </header>

      {/* About / Purpose Section */}
      <section id="about" className="relative z-10 py-24 px-6 bg-black/40 border-y border-white/5">
        <div className="max-w-6xl mx-auto grid md:grid-cols-2 gap-16 items-center">
          <div>
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Bukan Sekadar <br/><span className="bg-gradient-to-r from-cyan-400 to-purple-500 bg-clip-text text-transparent">Bot Biasa.</span></h2>
            <p className="text-gray-400 leading-relaxed mb-6 text-lg">
              SallveraPedia dirancang dengan tujuan utama: <strong>memberikan otomatisasi cerdas langsung ke dalam genggaman Anda.</strong> Kami percaya bahwa WhatsApp bukan hanya sekadar alat komunikasi, tetapi bisa menjadi asisten virtual 24/7 Anda.
            </p>
            <ul className="space-y-4">
              {['Produktivitas tanpa batas waktu', 'Hiburan game interaktif dalam chat', 'Privasi 100% dengan mode Self-Bot', 'Terkoneksi dengan teknologi AI terbaru'].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-gray-300">
                  <CheckCircle2 className="w-5 h-5 text-purple-500 flex-shrink-0" />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          <div className="relative">
            <div className="absolute inset-0 bg-gradient-to-tr from-purple-500/20 to-cyan-500/20 blur-3xl rounded-full"></div>
            <div className="glass-panel rounded-3xl p-8 relative">
              <div className="flex items-center gap-4 border-b border-white/10 pb-4 mb-4">
                <div className="w-12 h-12 bg-white/10 rounded-full flex items-center justify-center">
                  <Bot className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                  <h4 className="font-bold text-white">SallveraPedia</h4>
                  <p className="text-xs text-green-400">Online</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="bg-white/10 rounded-2xl rounded-tl-sm p-4 text-sm text-gray-200 border border-white/5 w-[85%]">
                  Halo! Saya Sallvera, asisten cerdas Anda. Ada yang bisa saya bantu hari ini? 🌟
                </div>
                <div className="bg-purple-600/80 rounded-2xl rounded-tr-sm p-4 text-sm text-white w-[85%] ml-auto shadow-lg">
                  .rpg
                </div>
                <div className="bg-white/10 rounded-2xl rounded-tl-sm p-4 text-sm text-gray-200 border border-white/5 w-[90%]">
                  ⚠️ *AWAS!* Seekor 🐉 Naga Merah tiba-tiba muncul di hadapanmu! Apa yang akan kamu lakukan? (serang/heal/kabur)
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="relative z-10 py-32 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-bold mb-6">Fitur Tanpa Batas</h2>
            <p className="text-gray-400 max-w-2xl mx-auto text-lg">Dilengkapi dengan integrasi tingkat tinggi untuk memenuhi segala kebutuhan harian Anda.</p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            <FeatureCard 
              icon={<MessageSquare />}
              title="Gemini AI Terintegrasi"
              desc="Tanyakan apa saja, mulai dari matematika hingga ringkasan artikel dengan respon cerdas layaknya manusia."
            />
            <FeatureCard 
              icon={<Gamepad2 />}
              title="Mesin RPG Database"
              desc="Mainkan game tarung monster Turn-Based lengkap dengan sistem Leveling, HP, Uang, dan Inventory yang tersimpan permanen."
            />
            <FeatureCard 
              icon={<ImageIcon />}
              title="Media & Stiker Editor"
              desc="Ubah gambar menjadi stiker otomatis, buat fake text, hapus background, hingga fitur penjernih foto HD."
            />
            <FeatureCard 
              icon={<Sparkles />}
              title="Download & Audio"
              desc="Unduh video favorit Anda atau dengarkan preview lagu dari Spotify dan YouTube langsung di dalam chat."
            />
            <FeatureCard 
              icon={<Shield />}
              title="Super Private Mode"
              desc="Bot hanya akan mematuhi dan merespons pesan dari Anda sendiri. Aman dari spam dan tidak mengganggu grup."
            />
            <FeatureCard 
              icon={<Bot />}
              title="Utilitas Sehari-hari"
              desc="Sistem Anti-View Once, kuis interaktif, mesin slot, hingga penjadwalan aktivitas."
            />
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="relative z-10 py-24 px-6 bg-black/40 border-y border-white/5">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Pertanyaan Umum</h2>
            <p className="text-gray-400">Semua yang perlu Anda ketahui tentang SallveraPedia.</p>
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
        <div className="max-w-4xl mx-auto">
          <div className="glass-panel rounded-3xl p-10 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-64 h-64 bg-purple-500/20 blur-[100px] rounded-full"></div>
            <div className="relative z-10">
              <Mail className="w-12 h-12 text-purple-400 mx-auto mb-6" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">Siap untuk Memulai?</h2>
              <p className="text-gray-400 mb-10 max-w-xl mx-auto">
                Jika Anda memiliki pertanyaan seputar integrasi khusus, dukungan teknis, atau penawaran kerja sama, jangan ragu untuk menghubungi kami.
              </p>
              <form className="max-w-md mx-auto space-y-4">
                <input type="email" placeholder="Alamat Email Anda" className="w-full bg-black/50 border border-white/10 rounded-xl px-6 py-4 text-white focus:outline-none focus:border-purple-500 transition-colors" />
                <textarea placeholder="Pesan Anda" rows={4} className="w-full bg-black/50 border border-white/10 rounded-xl px-6 py-4 text-white resize-none focus:outline-none focus:border-purple-500 transition-colors"></textarea>
                <button type="button" className="w-full bg-white text-black font-bold py-4 rounded-xl hover:bg-gray-200 transition-colors">
                  Kirim Pesan
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/5 py-12 px-6 bg-[#020202]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-2">
            <Bot className="w-5 h-5 text-gray-400" />
            <span className="font-bold text-gray-400">SallveraPedia</span>
          </div>
          <div className="text-gray-500 text-sm">
            &copy; {new Date().getFullYear()} SallveraPedia. All rights reserved. Built with ❤️.
          </div>
          <div className="flex gap-6 text-sm text-gray-500">
            <a href="#" className="hover:text-white transition-colors">Syarat & Ketentuan</a>
            <a href="#" className="hover:text-white transition-colors">Kebijakan Privasi</a>
          </div>
        </div>
      </footer>

    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="glass-panel p-8 rounded-3xl hover:bg-white/[0.05] transition-colors group cursor-default">
      <div className="w-14 h-14 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-purple-400 mb-6 group-hover:scale-110 transition-transform duration-300">
        {React.cloneElement(icon as React.ReactElement, { className: "w-7 h-7" })}
      </div>
      <h3 className="text-xl font-bold text-white mb-3">{title}</h3>
      <p className="text-gray-400 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function FaqItem({ q, a }: { q: string, a: string }) {
  const [open, setOpen] = useState(false);
  
  return (
    <div className="glass-panel rounded-2xl overflow-hidden transition-all duration-300">
      <button 
        onClick={() => setOpen(!open)} 
        className="w-full flex items-center justify-between p-6 text-left focus:outline-none"
      >
        <span className="font-semibold text-white">{q}</span>
        <ChevronDown className={`w-5 h-5 text-gray-400 transition-transform duration-300 ${open ? 'rotate-180' : ''}`} />
      </button>
      <div 
        className={`px-6 overflow-hidden transition-all duration-300 ${open ? 'max-h-40 pb-6 opacity-100' : 'max-h-0 opacity-0'}`}
      >
        <p className="text-gray-400 text-sm leading-relaxed pt-2 border-t border-white/5">
          {a}
        </p>
      </div>
    </div>
  );
}
