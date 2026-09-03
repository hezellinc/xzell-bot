import React from 'react';
import { Link } from 'react-router-dom';
import { Bot, MessageSquare, Zap, Shield, CheckCircle, ChevronDown } from 'lucide-react';

export default function Landing() {
  return (
    <div className="min-h-screen pb-20">
      {/* Navigation */}
      <nav className="p-6">
        <div className="max-w-6xl mx-auto clay-panel px-8 py-4 flex justify-between items-center">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 clay-card-inner flex items-center justify-center rounded-xl text-violet-500">
              <Bot className="w-6 h-6" />
            </div>
            <span className="font-bold text-xl text-slate-700">NexusBot</span>
          </div>
          <div className="hidden md:flex gap-8 text-slate-600 font-medium">
            <a href="#features" className="hover:text-violet-500 transition">Fitur</a>
            <a href="#pricing" className="hover:text-violet-500 transition">Harga</a>
            <a href="#faq" className="hover:text-violet-500 transition">FAQ</a>
            <a href="#contact" className="hover:text-violet-500 transition">Kontak</a>
          </div>
          <Link to="/connect" className="clay-btn clay-btn-primary px-6 py-2.5 font-semibold text-sm">
            Hubungkan Bot
          </Link>
        </div>
      </nav>

      {/* Hero Section */}
      <header className="max-w-6xl mx-auto px-6 py-20 text-center">
        <div className="inline-block clay-card-inner px-6 py-2 rounded-full text-violet-600 font-semibold text-sm mb-6">
          ✨ Asisten AI Pribadi di WhatsApp Anda
        </div>
        <h1 className="text-5xl md:text-7xl font-extrabold text-slate-800 mb-8 leading-tight">
          Supercharge WhatsApp <br/>dengan <span className="text-violet-500">Kekuatan AI</span>
        </h1>
        <p className="text-lg text-slate-600 mb-12 max-w-2xl mx-auto leading-relaxed">
          Tingkatkan produktivitas Anda dengan asisten cerdas yang membalas pesan, membuat stiker, mencari informasi, dan banyak lagi secara otomatis 24/7.
        </p>
        <div className="flex justify-center gap-6">
          <Link to="/connect" className="clay-btn clay-btn-primary px-8 py-4 font-bold text-lg flex items-center gap-2">
            <Zap className="w-5 h-5" /> Mulai Sekarang
          </Link>
          <a href="#features" className="clay-btn px-8 py-4 font-bold text-lg text-slate-600 flex items-center gap-2">
            Pelajari Fitur
          </a>
        </div>
      </header>

      {/* Features Section */}
      <section id="features" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Fitur Utama AI Bot</h2>
          <p className="text-slate-600 max-w-xl mx-auto">Kami mengintegrasikan teknologi Gemini terbaru dan berbagai tools pendukung untuk pengalaman WhatsApp terbaik.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          <FeatureCard icon={<MessageSquare />} title="Chat Pintar (Gemini)" desc="Ngobrol seperti dengan manusia. Bot memahami konteks, bisa merangkum, dan mencari informasi realtime." />
          <FeatureCard icon={<Zap />} title="Pembuat Stiker Otomatis" desc="Kirim gambar apapun dengan caption .sticker dan langsung berubah menjadi stiker WhatsApp berkualitas." />
          <FeatureCard icon={<Shield />} title="Mode Super Privat" desc="Keamanan maksimal! Bot hanya merespons perintah dari nomor Anda sendiri. Tidak akan mengganggu grup." />
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="max-w-6xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">Paket Harga</h2>
          <p className="text-slate-600 max-w-xl mx-auto">Pilih paket yang sesuai dengan kebutuhan produktivitas Anda.</p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 items-center">
          <PricingCard title="Starter" price="Gratis" features={["Chat AI Terbatas", "Pembuat Stiker", "Dukungan Komunitas"]} />
          <PricingCard title="Pro" price="Rp 49.000" features={["Chat AI Tanpa Batas", "Semua 11+ Tools", "Hapus Background", "Prioritas Server"]} isPopular />
          <PricingCard title="Enterprise" price="Kustom" features={["Server Dedicated", "Custom API Keys", "Dukungan 24/7", "Integrasi Database"]} />
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="max-w-3xl mx-auto px-6 py-20">
        <div className="text-center mb-16">
          <h2 className="text-3xl md:text-4xl font-bold text-slate-800 mb-4">FAQ</h2>
          <p className="text-slate-600">Pertanyaan yang sering diajukan</p>
        </div>
        <div className="space-y-6">
          <FaqItem question="Apakah ini aman untuk nomor WhatsApp saya?" answer="Sangat aman. Bot berjalan di server pribadi Anda dan diatur dalam mode self-bot (hanya merespons perintah Anda sendiri)." />
          <FaqItem question="Apakah saya perlu membayar API Gemini?" answer="Tidak, bot ini dioptimalkan menggunakan Google Gemini Flash tier gratis yang menyediakan kuota sangat besar setiap harinya." />
          <FaqItem question="Bagaimana cara menghubungkan nomor saya?" answer="Anda bisa memindai QR Code di halaman dashboard, atau menggunakan Pairing Code 8 digit. Keduanya sangat mudah!" />
        </div>
      </section>

      {/* Contact Section */}
      <section id="contact" className="max-w-4xl mx-auto px-6 py-20">
        <div className="clay-panel p-10 text-center">
          <h2 className="text-3xl font-bold text-slate-800 mb-4">Butuh Bantuan?</h2>
          <p className="text-slate-600 mb-8">Tim kami siap membantu Anda 24/7. Hubungi kami untuk integrasi custom.</p>
          <div className="max-w-md mx-auto space-y-4">
            <input type="email" placeholder="Email Anda" className="w-full clay-input px-6 py-4 text-slate-700" />
            <textarea placeholder="Pesan" rows={4} className="w-full clay-input px-6 py-4 text-slate-700 resize-none"></textarea>
            <button className="w-full clay-btn clay-btn-primary px-6 py-4 font-bold text-lg">Kirim Pesan</button>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, title, desc }: { icon: React.ReactNode, title: string, desc: string }) {
  return (
    <div className="clay-card p-8 flex flex-col items-center text-center">
      <div className="w-16 h-16 clay-card-inner flex items-center justify-center rounded-2xl text-violet-500 mb-6">
        {React.cloneElement(icon as React.ReactElement, { className: "w-8 h-8" })}
      </div>
      <h3 className="text-xl font-bold text-slate-800 mb-3">{title}</h3>
      <p className="text-slate-600 text-sm leading-relaxed">{desc}</p>
    </div>
  );
}

function PricingCard({ title, price, features, isPopular }: { title: string, price: string, features: string[], isPopular?: boolean }) {
  return (
    <div className={`clay-card p-8 relative ${isPopular ? 'transform md:-translate-y-4 border-2 border-violet-400' : ''}`}>
      {isPopular && (
        <span className="absolute top-0 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-violet-500 text-white px-4 py-1 rounded-full text-xs font-bold uppercase tracking-wide shadow-md">
          Terpopuler
        </span>
      )}
      <h3 className="text-xl font-bold text-slate-700 mb-2">{title}</h3>
      <div className="mb-6"><span className="text-4xl font-extrabold text-slate-800">{price}</span> {price !== "Kustom" && <span className="text-slate-500">/bulan</span>}</div>
      <ul className="space-y-4 mb-8">
        {features.map((f, i) => (
          <li key={i} className="flex items-center gap-3 text-slate-600 text-sm">
            <div className="text-green-500 clay-card-inner rounded-full p-1"><CheckCircle className="w-4 h-4" /></div>
            {f}
          </li>
        ))}
      </ul>
      <button className={`w-full clay-btn py-3 font-bold ${isPopular ? 'clay-btn-primary' : 'text-slate-600'}`}>
        Pilih {title}
      </button>
    </div>
  );
}

function FaqItem({ question, answer }: { question: string, answer: string }) {
  const [open, setOpen] = React.useState(false);
  return (
    <div className="clay-panel overflow-hidden">
      <button onClick={() => setOpen(!open)} className="w-full flex items-center justify-between p-6 text-left focus:outline-none">
        <span className="font-semibold text-slate-800">{question}</span>
        <ChevronDown className={`w-5 h-5 text-violet-500 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {open && (
        <div className="px-6 pb-6 text-slate-600 text-sm leading-relaxed border-t border-slate-200/50 pt-4">
          {answer}
        </div>
      )}
    </div>
  );
}
