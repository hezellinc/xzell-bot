const fs = require('fs');
let code = fs.readFileSync('src/pages/Landing.tsx', 'utf8');

// Update versions and design
code = code.replace(/Nexus UI v2\.0/g, 'NEXUS UI v3.4');

// Improve layout elements slightly but keep overall design
code = code.replace(
  'const [scrolled, setScrolled] = useState(false);',
  `const [scrolled, setScrolled] = useState(false);
  
  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);`
);

code = code.replace(
  '<div className="aurora-glow"></div>',
  `{/* V 3.4 Modern Background Glow */}
      <div className="absolute top-[-10%] left-[20%] w-[50%] h-[50%] bg-purple-600/20 blur-[150px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[20%] right-[-10%] w-[40%] h-[40%] bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />`
);

code = code.replace(
  '<span className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-gray-400">Nexus UI v2.0</span>',
  '<span className="px-4 py-1.5 bg-purple-500/10 border border-purple-500/20 rounded-full text-[10px] font-black tracking-widest text-purple-400 uppercase shadow-[0_0_15px_rgba(168,85,247,0.15)]">Nexus UI v3.4</span>'
);

code = code.replace(
  '<h1 className="text-5xl md:text-7xl font-bold tracking-tight mb-6">',
  '<h1 className="text-5xl md:text-7xl font-black tracking-tight mb-6 leading-[1.1] bg-gradient-to-br from-white via-white to-gray-500 text-transparent bg-clip-text">'
);

code = code.replace(
  '<a href="/connect" className="px-8 py-4 bg-white text-black rounded-full font-bold text-lg hover:scale-105 transition-transform flex items-center gap-2">',
  '<a href="/connect" className="px-8 py-4 bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl font-bold text-lg hover:scale-105 transition-all flex items-center gap-2 shadow-lg shadow-purple-500/25">'
);

code = code.replace(
  '<a href="#features" className="px-8 py-4 bg-white/5 border border-white/10 rounded-full font-bold text-lg hover:bg-white/10 transition-colors">',
  '<a href="#features" className="px-8 py-4 bg-black/40 border border-white/10 rounded-xl font-bold text-lg hover:bg-white/10 transition-all backdrop-blur-md shadow-inner">'
);

// Update chat preview to be more modern v3.4 style
const oldChatPreview = `<div className="glass-panel p-4 md:p-6 rounded-3xl w-full max-w-lg mx-auto relative z-10 shadow-2xl">
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-blue-500 rounded-full flex items-center justify-center">
                  <Bot className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white">Sallvera AI</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
                    <span className="text-xs text-green-500">Online</span>
                  </div>
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
            </div>`;

const newChatPreview = `<div className="bg-white/5 backdrop-blur-xl border border-white/10 p-4 md:p-6 rounded-3xl w-full max-w-lg mx-auto relative z-10 shadow-2xl overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-blue-500/5 pointer-events-none" />
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4 relative z-10">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-purple-500/20">
                  <Bot className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="font-bold text-white tracking-tight">Sallvera AI</h3>
                  <div className="flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]"></span>
                    <span className="text-xs font-mono tracking-widest uppercase text-green-400">Online Sync</span>
                  </div>
                </div>
              </div>
              <div className="space-y-5 relative z-10">
                <div className="bg-white/5 border border-white/10 rounded-3xl rounded-tl-sm p-4 text-sm text-gray-200 w-[85%]">
                  Halo! Saya Sallvera, asisten cerdas Anda yang didukung oleh Gemini 2.5. Ada yang bisa saya bantu hari ini? 🌟
                </div>
                <div className="bg-gradient-to-br from-purple-600 to-indigo-700 rounded-3xl rounded-tr-sm p-4 text-sm text-white w-[85%] ml-auto shadow-lg shadow-purple-900/20">
                  .rpg
                </div>
                <div className="bg-white/5 border border-white/10 rounded-3xl rounded-tl-sm p-5 text-sm text-gray-200 w-[95%]">
                  <div className="font-bold text-white mb-2">⚠️ PERTARUNGAN DIMULAI</div>
                  Seekor 🐉 Naga Merah tiba-tiba muncul di hadapanmu!<br/><br/>
                  <div className="text-red-400 font-mono text-xs mb-3">❤️ HP Kamu: 100/100<br/>🖤 HP Naga: 100</div>
                  <div className="flex gap-2 mt-3">
                     <div className="px-3 py-1.5 bg-white/10 rounded-lg text-xs font-bold border border-white/5">⚔️ Serang</div>
                     <div className="px-3 py-1.5 bg-white/10 rounded-lg text-xs font-bold border border-white/5">🧪 Heal</div>
                  </div>
                </div>
              </div>
            </div>`;

code = code.replace(oldChatPreview, newChatPreview);

fs.writeFileSync('src/pages/Landing.tsx', code);
console.log('done updating landing page');
