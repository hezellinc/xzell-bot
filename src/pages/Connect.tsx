import React, { useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { QrCode, LogOut, Activity, Smartphone, MessageSquare, Clock, ShieldCheck, ArrowLeft, Hash } from 'lucide-react';
import { Link } from 'react-router-dom';

type BotStatus = "disconnected" | "connecting" | "waiting_for_qr" | "connected" | "error";

export default function Connect() {
  const [status, setStatus] = useState<BotStatus>("disconnected");
  const [qrCode, setQrCode] = useState<string>("");
  const [pairingCode, setPairingCode] = useState<string>("");
  const [pairingNumber, setPairingNumber] = useState<string>("");
  const [authMethod, setAuthMethod] = useState<"qr" | "pairing">("qr");
  
  const [metrics, setMetrics] = useState({ totalMessages: 0, activeSchedules: 0 });
  const [logs, setLogs] = useState<any[]>([]);
  const socketRef = useRef<Socket | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const socket = io(window.location.origin, { path: "/socket.io" });
    socketRef.current = socket;

    socket.on("bot_status", (data: { status: BotStatus, qr?: string, pairingCode?: string }) => {
      setStatus(data.status);
      if (data.qr) setQrCode(data.qr);
      if (data.pairingCode) setPairingCode(data.pairingCode);
    });

    socket.on("metrics_update", (data) => setMetrics(data));
    
    socket.on("new_log", (log) => {
      setLogs((prev) => [...prev, log].slice(-50));
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleConnect = () => {
    setStatus("connecting");
    socketRef.current?.emit("connect_whatsapp", { method: authMethod, number: pairingNumber });
  };

  const handleDisconnect = () => {
    socketRef.current?.emit("disconnect_whatsapp");
    setStatus("disconnected");
    setQrCode("");
    setPairingCode("");
  };

  return (
    <div className="min-h-screen p-6 md:p-10">
      <div className="max-w-7xl mx-auto space-y-8">
        
        {/* Header */}
        <header className="clay-panel p-6 flex flex-col md:flex-row justify-between items-center gap-6">
          <div className="flex items-center gap-4">
            <Link to="/" className="w-10 h-10 clay-btn flex items-center justify-center text-slate-600 hover:text-violet-500">
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-slate-800">Bot Dashboard</h1>
              <p className="text-sm text-slate-500">Kelola koneksi dan aktivitas bot Anda</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <StatusBadge status={status} />
            {status === "connected" ? (
              <button onClick={handleDisconnect} className="clay-btn px-6 py-2.5 text-red-500 font-semibold flex items-center gap-2">
                <LogOut className="w-4 h-4" /> Disconnect
              </button>
            ) : status === "connecting" ? (
              <button disabled className="clay-btn px-6 py-2.5 text-slate-400 font-semibold flex items-center gap-2">
                <Activity className="w-4 h-4 animate-spin" /> Menghubungkan...
              </button>
            ) : null}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Connection & Metrics */}
          <div className="space-y-8">
            {/* Connection Card */}
            <div className="clay-card p-6">
              <h2 className="text-lg font-bold text-slate-700 mb-6 flex items-center gap-2">
                <Smartphone className="w-5 h-5 text-violet-500" /> Tautkan Perangkat
              </h2>
              
              {status === "connected" ? (
                <div className="flex flex-col items-center justify-center py-8">
                  <div className="w-20 h-20 clay-card-inner rounded-full flex items-center justify-center text-green-500 mb-4">
                    <ShieldCheck className="w-10 h-10" />
                  </div>
                  <h3 className="font-bold text-slate-800 text-lg">Bot Aktif</h3>
                  <p className="text-slate-500 text-sm mt-1">Bot sedang mendengarkan pesan Anda.</p>
                </div>
              ) : status === "waiting_for_qr" ? (
                <div className="flex flex-col items-center justify-center py-4">
                  {authMethod === "qr" && qrCode ? (
                    <>
                      <div className="clay-card-inner p-4 rounded-3xl mb-4 bg-white/50">
                        <img src={qrCode} alt="QR Code" className="w-48 h-48 rounded-xl object-contain mix-blend-multiply" />
                      </div>
                      <p className="text-slate-500 text-sm text-center">Buka WhatsApp &gt; Perangkat Tertaut &gt; Pindai QR</p>
                    </>
                  ) : authMethod === "pairing" && pairingCode ? (
                    <>
                      <div className="clay-card-inner px-8 py-6 rounded-3xl mb-4 flex items-center justify-center">
                        <span className="text-4xl font-black text-violet-600 tracking-widest">{pairingCode}</span>
                      </div>
                      <p className="text-slate-500 text-sm text-center">Buka notifikasi WhatsApp dan masukkan kode di atas.</p>
                    </>
                  ) : (
                    <Activity className="w-8 h-8 text-violet-500 animate-spin" />
                  )}
                </div>
              ) : (
                <div className="space-y-6">
                  <div className="flex bg-slate-200/50 p-1 rounded-xl">
                    <button 
                      onClick={() => setAuthMethod("qr")}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${authMethod === 'qr' ? 'clay-btn-primary' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      QR Code
                    </button>
                    <button 
                      onClick={() => setAuthMethod("pairing")}
                      className={`flex-1 py-2 rounded-lg text-sm font-semibold transition-all ${authMethod === 'pairing' ? 'clay-btn-primary' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                      Pairing Code
                    </button>
                  </div>

                  {authMethod === "pairing" && (
                    <div>
                      <label className="block text-xs font-semibold text-slate-500 mb-2">Nomor WhatsApp (Cth: 62812...)</label>
                      <input 
                        type="text" 
                        value={pairingNumber} 
                        onChange={(e) => setPairingNumber(e.target.value.replace(/[^0-9]/g, ''))}
                        className="w-full clay-input px-4 py-3 text-slate-700"
                        placeholder="628..."
                      />
                    </div>
                  )}

                  <button 
                    onClick={handleConnect} 
                    disabled={authMethod === "pairing" && pairingNumber.length < 10}
                    className="w-full clay-btn clay-btn-primary py-4 font-bold text-lg disabled:opacity-50"
                  >
                    Mulai Tautkan
                  </button>
                </div>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-6">
              <div className="clay-card p-6 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 clay-card-inner rounded-full flex items-center justify-center text-violet-500 mb-3">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-500 font-semibold uppercase mb-1">Pesan</span>
                <span className="text-3xl font-black text-slate-800">{metrics.totalMessages}</span>
              </div>
              <div className="clay-card p-6 flex flex-col items-center justify-center text-center">
                <div className="w-10 h-10 clay-card-inner rounded-full flex items-center justify-center text-orange-500 mb-3">
                  <Clock className="w-5 h-5" />
                </div>
                <span className="text-xs text-slate-500 font-semibold uppercase mb-1">Jadwal</span>
                <span className="text-3xl font-black text-slate-800">{metrics.activeSchedules}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Terminal / Logs */}
          <div className="lg:col-span-2 h-[600px] lg:h-auto flex flex-col">
            <div className="clay-card p-6 flex-1 flex flex-col relative overflow-hidden">
              <div className="flex items-center gap-2 mb-6">
                <Activity className="w-5 h-5 text-violet-500" />
                <h2 className="text-lg font-bold text-slate-700">Live Log Aktivitas</h2>
              </div>
              
              <div className="flex-1 clay-card-inner rounded-2xl p-4 overflow-y-auto">
                <div className="space-y-4">
                  {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-slate-400 text-sm font-medium">
                      Belum ada aktivitas terekam.
                    </div>
                  ) : (
                    logs.map((log, idx) => (
                      <div key={idx} className={`flex w-full ${log.direction === "outbound" ? "justify-end" : "justify-start"}`}>
                        <div className={`max-w-[80%] rounded-2xl px-5 py-3 ${
                          log.direction === "outbound" 
                            ? "bg-violet-500 text-white rounded-tr-sm shadow-md" 
                            : "clay-panel text-slate-700 rounded-tl-sm"
                        }`}>
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className={`text-xs font-bold ${log.direction === "outbound" ? "text-violet-100" : "text-slate-500"}`}>
                              {log.direction === "outbound" ? "AI Bot" : (log.sender || "Unknown").split('@')[0]}
                            </span>
                            <span className={`text-[10px] ${log.direction === "outbound" ? "text-violet-200" : "text-slate-400"}`}>
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
    disconnected: { label: "Terputus", color: "text-slate-500 bg-slate-200/50" },
    connecting: { label: "Menghubungkan", color: "text-orange-500 bg-orange-100" },
    waiting_for_qr: { label: "Menunggu Scan", color: "text-blue-500 bg-blue-100" },
    connected: { label: "Terhubung", color: "text-green-600 bg-green-100" },
    error: { label: "Error", color: "text-red-500 bg-red-100" },
  };
  const { label, color } = map[status] || map.disconnected;
  
  return (
    <div className={`px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wide flex items-center gap-2 ${color}`}>
      {status === "connected" && <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />}
      {label}
    </div>
  );
}
