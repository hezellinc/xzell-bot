import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { ShieldCheck, Activity, MessageSquare, Clock, Smartphone, ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

type BotStatus = "disconnected" | "connecting" | "waiting_for_qr" | "connected" | "error";

interface LogMessage {
  direction: "inbound" | "outbound";
  text: string;
  sender: string;
  timestamp: number;
}

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

    socket.on("logs_data", (data: LogMessage[]) => setLogs(data));
    socket.on("new_log", (data: LogMessage) => {
      setLogs((prev) => [...prev, data]);
      setMetrics((prev) => ({ ...prev, totalMessages: prev.totalMessages + 1 }));
    });
    socket.on("metrics_data", (data: any) => setMetrics(data));

    socket.emit("get_logs");
    socket.emit("get_metrics");

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleConnect = () => {
    socketRef.current?.emit("connect_whatsapp", { method: authMethod, number: pairingNumber });
  };

  const handleDisconnect = () => {
    socketRef.current?.emit("disconnect_whatsapp");
  };

  return (
    <div className="min-h-screen bg-[#050505] text-white font-sans selection:bg-purple-500/30 pb-20">
      
      {/* Background Aurora Glow */}
      <div className="aurora-glow opacity-50"></div>

      <nav className="relative z-10 w-full max-w-6xl mx-auto px-6 py-6 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors">
          <ChevronLeft className="w-5 h-5" />
          <span className="font-semibold text-sm">Kembali</span>
        </Link>
        <div className="flex items-center gap-4">
          <StatusBadge status={status} />
          {status !== "disconnected" && (
            <button 
              onClick={handleDisconnect}
              className="glass-panel text-red-400 hover:text-red-300 px-4 py-1.5 rounded-full text-xs font-bold transition-colors"
            >
              Putuskan
            </button>
          )}
        </div>
      </nav>

      <div className="relative z-10 max-w-6xl mx-auto px-6 mt-8">
        <div className="grid lg:grid-cols-3 gap-8">
          
          <div className="space-y-8">
            {/* Connection Card */}
            <div className="glass-panel rounded-3xl p-6">
              <h2 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-purple-400" /> Tautkan Perangkat
              </h2>
              
              {status === "connected" ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-20 h-20 bg-green-500/10 border border-green-500/20 rounded-full flex items-center justify-center text-green-400 mb-4">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <h3 className="font-bold text-white text-lg">Bot Aktif</h3>
                  <p className="text-gray-400 text-sm mt-1">Bot sedang mendengarkan pesan Anda.</p>
                </div>
              ) : status === "waiting_for_qr" ? (
                <div className="flex flex-col items-center justify-center py-4">
                  {authMethod === "qr" && qrCode ? (
                    <>
                      <div className="bg-white p-4 rounded-3xl mb-4">
                        <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded-xl object-contain" />
                      </div>
                      <p className="text-gray-400 text-sm text-center">Buka WhatsApp &gt; Perangkat Tertaut &gt; Pindai QR</p>
                    </>
                  ) : authMethod === "pairing" && pairingCode ? (
                    <>
                      <div className="glass-panel px-8 py-6 rounded-3xl mb-4 flex items-center justify-center">
                        <span className="text-4xl font-black text-purple-400 tracking-widest">{pairingCode}</span>
                      </div>
                      <p className="text-gray-400 text-sm text-center">Buka notifikasi WhatsApp dan masukkan kode di atas.</p>
                    </>
                  ) : (
                    <Activity className="w-8 h-8 text-purple-400 animate-spin" />
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex bg-white/5 p-1 rounded-xl">
                    <button 
                      onClick={() => setAuthMethod("qr")}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${authMethod === 'qr' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      QR Code
                    </button>
                    <button 
                      onClick={() => setAuthMethod("pairing")}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${authMethod === 'pairing' ? 'bg-white/10 text-white' : 'text-gray-500 hover:text-gray-300'}`}
                    >
                      Pairing Code
                    </button>
                  </div>
                  
                  {authMethod === "pairing" && (
                    <div>
                      <label className="block text-xs font-semibold text-gray-500 mb-2">Nomor WhatsApp (Cth: 62812...)</label>
                      <input 
                        type="text" 
                        value={pairingNumber} 
                        onChange={(e) => setPairingNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                        placeholder="628..."
                      />
                    </div>
                  )}

                  <button 
                    onClick={handleConnect} 
                    disabled={authMethod === "pairing" && pairingNumber.length < 10}
                    className="w-full bg-white text-black py-4 rounded-xl font-bold text-base hover:bg-gray-200 transition-colors disabled:opacity-50 disabled:hover:bg-white"
                  >
                    Mulai Tautkan
                  </button>
                </div>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-6">
              <div className="glass-panel rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 bg-purple-500/10 border border-purple-500/20 rounded-full flex items-center justify-center text-purple-400 mb-3">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-xs text-gray-500 font-semibold uppercase mb-1">Pesan</span>
                <span className="text-3xl font-black text-white">{metrics.totalMessages}</span>
              </div>
              <div className="glass-panel rounded-3xl p-6 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 bg-cyan-500/10 border border-cyan-500/20 rounded-full flex items-center justify-center text-cyan-400 mb-3">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-xs text-gray-500 font-semibold uppercase mb-1">Jadwal</span>
                <span className="text-3xl font-black text-white">{metrics.activeSchedules}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Terminal / Logs */}
          <div className="lg:col-span-2 h-[600px] lg:h-auto flex flex-col">
            <div className="glass-panel rounded-3xl p-6 flex-1 flex flex-col relative overflow-hidden">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-purple-400" />
                <h2 className="text-lg font-bold text-white">Live Log Aktivitas</h2>
              </div>
              
              <div className="flex-1 bg-black/40 rounded-2xl p-4 overflow-y-auto border border-white/5">
                <div className="space-y-4">
                  {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-gray-500 text-sm font-medium">
                      Belum ada aktivitas terekam.
                    </div>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} className={`flex w-full ${log.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                          log.direction === "outbound" 
                            ? "bg-purple-600/80 text-white rounded-tr-sm" 
                            : "bg-white/10 text-gray-200 rounded-tl-sm border border-white/5"
                        }`}>
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className={`text-xs font-bold ${log.direction === "outbound" ? "text-purple-200" : "text-gray-400"}`}>
                              {log.direction === "outbound" ? "AI Bot" : (log.sender || "Unknown").split('@')[0]}
                            </span>
                            <span className={`text-[10px] ${log.direction === "outbound" ? "text-purple-300" : "text-gray-500"}`}>
                              {new Date(log.timestamp).toLocaleTimeString()}
                            </span>
                          </div>
                          <p className="text-sm whitespace-pre-wrap">{log.text}</p>
                        </div>
                      </div>
                    ))
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
    disconnected: { label: "Terputus", color: "text-gray-400 bg-white/5 border border-white/10" },
    connecting: { label: "Menghubungkan", color: "text-orange-400 bg-orange-500/10 border border-orange-500/20" },
    waiting_for_qr: { label: "Menunggu Scan", color: "text-blue-400 bg-blue-500/10 border border-blue-500/20" },
    connected: { label: "Terhubung", color: "text-green-400 bg-green-500/10 border border-green-500/20" },
    error: { label: "Error", color: "text-red-400 bg-red-500/10 border border-red-500/20" },
  };

  const { label, color } = map[status] || map.disconnected;
  
  return (
    <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-2 ${color}`}>
      {status === "connected" && <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />}
      {label}
    </div>
  );
}
