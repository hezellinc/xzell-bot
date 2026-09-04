import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { ShieldCheck, Activity, MessageSquare, Clock, Smartphone, ChevronLeft, Gamepad2, BrainCircuit } from 'lucide-react';
import { Link } from 'react-router-dom';

type BotStatus = "disconnected" | "connecting" | "waiting_for_qr" | "connected" | "error";
interface LogMessage {
  direction: "inbound" | "outbound";
  text: string;
  sender: string;
  timestamp: number;
}

const RPGOverlay = () => {
  return (
    <div className="mt-3 bg-black/50 border border-red-500/20 rounded-xl p-3 flex flex-col gap-3 shadow-lg max-w-[200px]">
      <div className="flex items-center gap-2 mb-1">
         <Gamepad2 className="w-4 h-4 text-red-400" />
         <span className="text-xs font-bold text-red-400">RPG Controls</span>
      </div>
      <div className="flex flex-col items-center gap-1">
         <button className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-sm transition-colors border border-white/5">🔼</button>
         <div className="flex gap-1">
            <button className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-sm transition-colors border border-white/5">◀️</button>
            <button className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-sm transition-colors border border-white/5">🔽</button>
            <button className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-lg flex items-center justify-center text-sm transition-colors border border-white/5">▶️</button>
         </div>
      </div>
      <div className="flex gap-2 mt-2">
         <button className="flex-1 py-1.5 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded-lg text-xs font-bold transition-colors border border-red-500/20">⚔️ Serang</button>
         <button className="flex-1 py-1.5 bg-green-500/20 text-green-300 hover:bg-green-500/30 rounded-lg text-xs font-bold transition-colors border border-green-500/20">🧪 Heal</button>
      </div>
    </div>
  );
};

const QuizResponse = () => {
  return (
    <div className="mt-3 p-3 bg-black/40 border border-blue-500/20 rounded-xl flex flex-col gap-2">
      <div className="flex items-center gap-2 mb-1">
         <BrainCircuit className="w-4 h-4 text-blue-400" />
         <span className="text-xs font-bold text-blue-400">Interactive Quiz</span>
      </div>
      <div className="flex flex-wrap gap-2">
        {['A', 'B', 'C'].map((opt) => (
          <button key={opt} className="px-4 py-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/30 rounded-lg text-blue-200 text-xs font-bold transition-all hover:scale-105 shadow-sm">
            {opt}
          </button>
        ))}
        <button className="px-4 py-2 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/30 rounded-lg text-gray-300 text-xs font-bold transition-all hover:scale-105 shadow-sm">
          🏳️ Nyerah
        </button>
      </div>
    </div>
  );
};

export default function Connect() {
  const [status, setStatus] = useState<BotStatus>("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [pairingCode, setPairingCode] = useState<string | null>(null);
  const [authMethod, setAuthMethod] = useState<"qr" | "pairing">("qr");
  const [pairingNumber, setPairingNumber] = useState<string>("");
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [metrics, setMetrics] = useState({ totalMessages: 0, activeSchedules: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  
  const socketRef = useRef<any>(null);

  useEffect(() => {
    const socket = io({ path: '/socket.io' });
    socketRef.current = socket;

    socket.on("bot_status", (data: any) => {
      setStatus(data.status);
      if (data.qr) setQrCode(data.qr);
      if (data.pairingCode) setPairingCode(data.pairingCode);
    });

    socket.on("new_log", (log: LogMessage) => {
      setLogs(prev => [...prev, log]);
      setMetrics(prev => ({ ...prev, totalMessages: prev.totalMessages + 1 }));
    });

    socket.on("metrics_update", (data: any) => {
       if (data.activeSchedules !== undefined) {
           setMetrics(prev => ({ ...prev, activeSchedules: data.activeSchedules }));
       }
    });

    return () => { socket.disconnect(); };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleConnect = () => {
    if (authMethod === "pairing" && pairingNumber.length < 10) {
      alert("Masukkan nomor WhatsApp yang valid (minimal 10 angka, awali dengan kode negara, contoh: 628...)");
      return;
    }
    socketRef.current?.emit("start_bot", { authMethod, phoneNumber: pairingNumber });
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white selection:bg-purple-500/30 font-sans relative overflow-x-hidden">
      {/* V 3.4 Modern Background Glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-purple-600/20 blur-[120px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6 pt-8 pb-20 relative z-10">
        <header className="flex items-center justify-between mb-10 border-b border-white/5 pb-6">
          <Link to="/" className="flex items-center gap-3 text-gray-400 hover:text-white transition-colors group">
            <div className="p-2 bg-white/5 rounded-full group-hover:bg-white/10 transition-colors">
              <ChevronLeft className="w-5 h-5" />
            </div>
            <span className="font-semibold tracking-wide">Kembali</span>
          </Link>
          <div className="flex items-center gap-4">
             <div className="px-3 py-1 bg-white/5 border border-white/10 rounded-full text-xs font-mono text-gray-400">
               NEXUS UI v3.4
             </div>
             <StatusBadge status={status} />
          </div>
        </header>

        <div className="grid lg:grid-cols-3 gap-8">
          {/* Left Column: Control Panel */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden group">
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
              
              <div className="flex items-center gap-3 mb-8">
                <div className="p-3 bg-purple-500/20 rounded-xl text-purple-400">
                  <Smartphone className="w-6 h-6" />
                </div>
                <h2 className="text-xl font-bold text-white tracking-tight">Koneksi Perangkat</h2>
              </div>
              
              {status === "connected" ? (
                <div className="flex flex-col items-center justify-center py-10">
                  <div className="w-24 h-24 bg-green-500/10 border-2 border-green-500/20 rounded-full flex items-center justify-center text-green-400 mb-6 shadow-[0_0_30px_rgba(34,197,94,0.2)]">
                    <ShieldCheck className="w-12 h-12" />
                  </div>
                  <h3 className="font-bold text-white text-2xl mb-2">Sistem Aktif</h3>
                  <p className="text-gray-400 text-sm text-center">Bot sekarang merespons pesan secara real-time.</p>
                </div>
              ) : status === "waiting_for_qr" ? (
                <div className="flex flex-col items-center justify-center py-6">
                  {authMethod === "qr" && qrCode ? (
                    <>
                      <div className="bg-white p-5 rounded-3xl mb-6 shadow-xl">
                        <img src={qrCode} alt="QR Code" className="w-56 h-56 rounded-xl object-contain" />
                      </div>
                      <p className="text-gray-400 text-sm text-center bg-white/5 py-2 px-4 rounded-full">Buka WhatsApp &gt; Perangkat Tertaut</p>
                    </>
                  ) : authMethod === "pairing" && pairingCode ? (
                    <>
                      <div className="bg-black/40 border border-white/10 px-10 py-8 rounded-3xl mb-6 flex items-center justify-center shadow-inner">
                        <span className="text-5xl font-black text-purple-400 tracking-[0.2em]">{pairingCode}</span>
                      </div>
                      <p className="text-gray-400 text-sm text-center">Masukkan kode ini di notifikasi WhatsApp Anda.</p>
                    </>
                  ) : (
                    <Activity className="w-10 h-10 text-purple-400 animate-spin" />
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex bg-black/40 p-1.5 rounded-xl border border-white/5">
                    <button 
                      onClick={() => setAuthMethod("qr")}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${authMethod === 'qr' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      QR Code
                    </button>
                    <button 
                      onClick={() => setAuthMethod("pairing")}
                      className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${authMethod === 'pairing' ? 'bg-white/10 text-white shadow-sm' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Pairing Code
                    </button>
                  </div>
                  
                  {authMethod === "pairing" && (
                    <div className="space-y-2">
                      <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Nomor WhatsApp</label>
                      <input 
                        type="text" 
                        value={pairingNumber} 
                        onChange={(e) => setPairingNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full relative z-20 bg-black/40 border border-white/10 rounded-xl px-5 py-4 text-white focus:outline-none focus:border-purple-500/50 focus:ring-1 focus:ring-purple-500/50 transition-all font-mono text-lg placeholder:text-gray-600"
                        placeholder="628..."
                      />
                    </div>
                  )}
                  <button 
                    onClick={handleConnect}
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white py-4 rounded-xl font-bold text-base transition-colors relative z-50 shadow-md cursor-pointer"
                  >
                    Mulai Tautkan
                  </button>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-blue-500/20 rounded-full flex items-center justify-center text-blue-400">
                    <MessageSquare className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Traffic</span>
                </div>
                <div className="text-3xl font-black text-white pl-1">{metrics.totalMessages}</div>
              </div>
              <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-5 border border-white/10">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-8 h-8 bg-orange-500/20 rounded-full flex items-center justify-center text-orange-400">
                    <Clock className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cron</span>
                </div>
                <div className="text-3xl font-black text-white pl-1">{metrics.activeSchedules}</div>
              </div>
            </div>
          </div>

          {/* Right Column: Live Chat Interface (V3.4 Modern) */}
          <div className="lg:col-span-2 h-[700px] lg:h-auto flex flex-col">
            <div className="bg-white/5 backdrop-blur-xl rounded-3xl p-6 flex-1 flex flex-col relative overflow-hidden border border-white/10 shadow-2xl">
              <div className="flex items-center justify-between mb-6 pb-4 border-b border-white/10">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Activity className="w-5 h-5 text-green-400" />
                    <div className="absolute inset-0 bg-green-400 blur-sm opacity-50" />
                  </div>
                  <h2 className="text-lg font-bold text-white tracking-tight">Log Chat Interaktif</h2>
                </div>
                <div className="text-xs font-mono text-gray-500 bg-black/40 px-3 py-1 rounded-full border border-white/5">
                  REAL-TIME SYNC
                </div>
              </div>
              
              <div className="flex-1 bg-[#0a0a0a] rounded-2xl p-5 overflow-y-auto border border-white/5 shadow-inner custom-scrollbar relative">
                <div className="space-y-6">
                  {logs.length === 0 ? (
                    <div className="h-full flex flex-col items-center justify-center text-gray-600 space-y-3">
                      <MessageSquare className="w-8 h-8 opacity-20" />
                      <span className="text-sm font-medium">Menunggu pesan masuk...</span>
                    </div>
                  ) : (
                    logs.map((log, idx) => {
                      const isRPG = log.text.includes('PERTARUNGAN DIMULAI');
                      const isQuiz = log.text.includes('GAME KUIS');

                      return (
                        <div key={idx} className={`flex w-full ${log.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                          <div className={`max-w-[85%] rounded-3xl px-6 py-4 relative group ${
                            log.direction === "outbound" 
                               ? "bg-gradient-to-br from-purple-600 to-indigo-700 text-white rounded-tr-sm shadow-lg shadow-purple-900/20" 
                               : "bg-white/5 text-gray-200 rounded-tl-sm border border-white/10"
                          }`}>
                            <div className="flex items-center justify-between gap-6 mb-2">
                              <span className={`text-xs font-black tracking-wide uppercase ${log.direction === "outbound" ? "text-purple-200" : "text-gray-400"}`}>
                                {log.direction === "outbound" ? "NEXUS AI" : (log.sender || "User").split('@')[0]}
                              </span>
                              <span className={`text-[10px] font-mono ${log.direction === "outbound" ? "text-purple-300/70" : "text-gray-500"}`}>
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </span>
                            </div>
                            <p className="text-sm whitespace-pre-wrap leading-relaxed">{log.text}</p>
                            
                            {/* Inject Interactive UI Components based on pattern matching */}
                            {isRPG && log.direction === "outbound" && <RPGOverlay />}
                            {isQuiz && log.direction === "outbound" && <QuizResponse />}
                          </div>
                        </div>
                      );
                    })
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: BotStatus }) {
  const map = {
    disconnected: { label: "OFFLINE", color: "text-gray-400 bg-black/40 border-gray-500/30" },
    connecting: { label: "CONNECTING", color: "text-orange-400 bg-orange-500/10 border-orange-500/30" },
    waiting_for_qr: { label: "AWAITING LOGIN", color: "text-blue-400 bg-blue-500/10 border-blue-500/30" },
    connected: { label: "ONLINE", color: "text-green-400 bg-green-500/10 border-green-500/30" },
    error: { label: "SYSTEM FAULT", color: "text-red-400 bg-red-500/10 border-red-500/30" },
  };
  const { label, color } = map[status] || map.disconnected;
  
  return (
    <div className={`px-3 py-1 rounded-full text-[10px] font-black tracking-widest flex items-center gap-2 border ${color}`}>
      {status === "connected" && <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse shadow-[0_0_8px_#4ade80]" />}
      {label}
    </div>
  );
}
