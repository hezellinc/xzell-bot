import React, { useEffect, useState, useRef } from "react";
import { io, Socket } from "socket.io-client";
import { Bot, LogOut, QrCode, MessageSquare, BarChart, Clock, ShieldCheck, Search, Activity, Smartphone } from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { cn } from "./lib/utils";

type BotStatus = "disconnected" | "connecting" | "waiting_for_qr" | "connected" | "error";

interface LogMessage {
  id?: string;
  sender: string;
  text: string;
  direction: "inbound" | "outbound";
  timestamp: number;
}

export default function App() {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [status, setStatus] = useState<BotStatus>("disconnected");
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [logs, setLogs] = useState<LogMessage[]>([]);
  const [metrics, setMetrics] = useState({ totalMessages: 0, activeSchedules: 0 });
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Connect to backend server on the same host/port
    const s = io();
    setSocket(s);

    s.on("bot_status", (data: { status: BotStatus; qr: string | null }) => {
      setStatus(data.status);
      setQrCode(data.qr || null);
    });

    s.on("logs_data", (data: LogMessage[]) => {
      setLogs(data);
    });

    s.on("new_log", (msg: LogMessage) => {
      setLogs((prev) => [...prev, msg]);
      setMetrics((prev) => ({ ...prev, totalMessages: prev.totalMessages + 1 }));
    });

    s.on("metrics_data", (data: any) => {
      setMetrics({
        totalMessages: data.totalMessages,
        activeSchedules: data.activeSchedules,
      });
    });

    // Request initial data
    s.emit("get_logs");
    s.emit("get_metrics");

    return () => {
      s.disconnect();
    };
  }, []);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [logs]);

  const handleConnect = () => {
    socket?.emit("connect_whatsapp");
  };

  const handleDisconnect = () => {
    socket?.emit("disconnect_whatsapp");
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-50 p-4 md:p-8 font-sans">
      <div className="mx-auto max-w-6xl space-y-8">
        
        {/* Header */}
        <header className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight flex items-center gap-3">
              <Bot className="w-8 h-8 text-zinc-50" />
              Nexus AI Bot
            </h1>
            <p className="text-zinc-400 mt-1">
              WhatsApp AI Agent Dashboard with Gemini & Third-Party Integrations
            </p>
          </div>
          <div className="flex items-center gap-3">
            {status === "connected" ? (
              <Button variant="destructive" onClick={handleDisconnect} className="gap-2">
                <LogOut className="w-4 h-4" /> Disconnect
              </Button>
            ) : status === "waiting_for_qr" || status === "connecting" ? (
              <Button variant="outline" disabled className="gap-2">
                <Activity className="w-4 h-4 animate-spin" /> Connecting...
              </Button>
            ) : (
              <Button onClick={handleConnect} className="gap-2 bg-zinc-50 hover:bg-zinc-200 text-zinc-950">
                <QrCode className="w-4 h-4" /> Link WhatsApp
              </Button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column: Status & Metrics */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center justify-between">
                  Connection Status
                  <StatusBadge status={status} />
                </CardTitle>
              </CardHeader>
              <CardContent>
                {status === "waiting_for_qr" && qrCode ? (
                  <div className="flex flex-col items-center justify-center p-4 bg-zinc-900 rounded-lg border border-zinc-800">
                    <img src={qrCode} alt="WhatsApp QR Code" className="w-48 h-48 rounded-md bg-white p-2 shadow-sm" />
                    <p className="text-sm text-zinc-400 mt-4 text-center">Scan QR code using WhatsApp on your phone.</p>
                  </div>
                ) : status === "connected" ? (
                  <div className="flex flex-col items-center justify-center p-8 bg-green-950/30 rounded-lg border border-green-900/50">
                    <div className="w-16 h-16 bg-green-900/50 text-green-400 rounded-full flex items-center justify-center mb-4">
                      <ShieldCheck className="w-8 h-8" />
                    </div>
                    <p className="font-medium text-green-400">Bot is active and listening</p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center p-8 bg-zinc-900 rounded-lg border border-zinc-800">
                    <div className="w-16 h-16 bg-zinc-800 text-zinc-500 rounded-full flex items-center justify-center mb-4">
                      <Smartphone className="w-8 h-8" />
                    </div>
                    <p className="font-medium text-zinc-500">Not connected</p>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid grid-cols-2 gap-4">
              <Card>
                <CardContent className="p-4 flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2">
                    <MessageSquare className="w-4 h-4" />
                    <span className="text-sm font-medium">Messages</span>
                  </div>
                  <span className="text-3xl font-bold">{metrics.totalMessages}</span>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 flex flex-col justify-center">
                  <div className="flex items-center gap-2 text-zinc-500 mb-2">
                    <Clock className="w-4 h-4" />
                    <span className="text-sm font-medium">Schedules</span>
                  </div>
                  <span className="text-3xl font-bold">{metrics.activeSchedules}</span>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Active Capabilities</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-3">
                  <CapabilityItem icon={<MessageSquare />} title="Gemini AI" desc="Live Google Search grounding" />
                  <CapabilityItem icon={<Search />} title="Multi-Tools" desc="11+ commands (.sticker, .tiktok, dll)" />
                  <CapabilityItem icon={<Clock />} title="Utility" desc="Brat generator, HD, Remove.bg, Spoplay" />
                </ul>
              </CardContent>
            </Card>

          </div>

          {/* Right Column: Live Logs */}
          <div className="lg:col-span-2">
            <Card className="h-full flex flex-col">
              <CardHeader className="border-b border-zinc-800 bg-zinc-900">
                <CardTitle className="text-lg flex items-center gap-2">
                  <Activity className="w-5 h-5 text-zinc-500" />
                  Live Activity Logs
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0 flex-1 relative bg-zinc-950/50">
                <div className="absolute inset-0 overflow-y-auto p-4 space-y-4">
                  {logs.length === 0 ? (
                    <div className="h-full flex items-center justify-center text-zinc-500 text-sm">
                      No activity recorded yet.
                    </div>
                  ) : (
                    logs.map((log, idx) => (
                      <div
                        key={log.id || idx}
                        className={cn(
                          "flex w-full",
                          log.direction === "outbound" ? "justify-end" : "justify-start"
                        )}
                      >
                        <div
                          className={cn(
                            "max-w-[80%] rounded-2xl px-4 py-3 shadow-sm",
                            log.direction === "outbound"
                              ? "bg-zinc-100 text-zinc-950 rounded-tr-sm"
                              : "bg-zinc-900 border border-zinc-800 text-zinc-100 rounded-tl-sm"
                          )}
                        >
                          <div className="flex items-center justify-between gap-4 mb-1">
                            <span className={cn("text-xs font-semibold", log.direction === "outbound" ? "text-zinc-500" : "text-zinc-500")}>
                              {log.direction === "outbound" ? "AI Bot" : log.sender.split('@')[0]}
                            </span>
                            <span className={cn("text-[10px]", log.direction === "outbound" ? "text-zinc-400" : "text-zinc-500")}>
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
              </CardContent>
            </Card>
          </div>

        </div>
      </div>
    </div>
  );
}

function StatusBadge({ status }: { status: BotStatus }) {
  const map: Record<BotStatus, { label: string; variant: "default" | "secondary" | "destructive" | "outline" | "success" }> = {
    disconnected: { label: "Disconnected", variant: "secondary" },
    connecting: { label: "Connecting", variant: "outline" },
    waiting_for_qr: { label: "Scan QR Code", variant: "outline" },
    connected: { label: "Connected", variant: "success" },
    error: { label: "Error", variant: "destructive" },
  };

  const { label, variant } = map[status] || map.disconnected;
  
  return (
    <Badge variant={variant} className="capitalize">
      {status === "connected" && <span className="w-1.5 h-1.5 rounded-full bg-white mr-1.5 animate-pulse" />}
      {label}
    </Badge>
  );
}

function CapabilityItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <li className="flex items-start gap-3">
      <div className="p-2 bg-zinc-800 text-zinc-300 rounded-lg">
        {React.cloneElement(icon as React.ReactElement, { className: "w-4 h-4" })}
      </div>
      <div>
        <p className="text-sm font-semibold text-zinc-100">{title}</p>
        <p className="text-xs text-zinc-400">{desc}</p>
      </div>
    </li>
  );
}
