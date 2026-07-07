"use client";

import { useEffect, useState, useRef } from "react";
import { Zap, TrendingUp, Shield, ArrowRight, CheckCircle, XCircle, Bot, Play, Square, Activity, Brain, Wallet, MessageCircle, Send } from "lucide-react";
import { payAndFetch, checkBalance, depositToGateway, connectWallet } from "@/lib/x402-client";
import { useCopyAgent } from "@/hooks/use-copy-agent";

interface Signal {
  id: string; symbol: string; side: "LONG" | "SHORT"; confidence: number; priceUsdc: string; teaser: string;
}

interface ChatMessage {
  role: "user" | "agent"; content: string; timestamp: string;
}

export default function MiniApp() {
  const [signals, setSignals] = useState<Signal[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSignal, setSelectedSignal] = useState<Signal | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<"idle" | "processing" | "success" | "failed">("idle");
  const [unlockedData, setUnlockedData] = useState<any>(null);
  const [activeTab, setActiveTab] = useState<"signals" | "agent">("signals");
  const [gatewayBalance, setGatewayBalance] = useState("0");
  const [walletBalance, setWalletBalance] = useState("0");
  const [balanceAddress, setBalanceAddress] = useState("");
  const [depositing, setDepositing] = useState(false);
  const [walletAddress, setWalletAddress] = useState("");
  const [walletConnected, setWalletConnected] = useState(false);
  const [paymentError, setPaymentError] = useState("");

  // Chat
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const { state: agent, start: startAgent, stop: stopAgent } = useCopyAgent();

  useEffect(() => {
    const initSDK = async () => {
      try { const sdk = await import("@farcaster/frame-sdk"); await sdk.sdk.actions.ready(); } catch {}
    };
    initSDK();
    fetch("/api/signals")
      .then(r => r.json())
      .then(data => { setSignals(data.signals || []); setLoading(false); })
      .catch(() => setLoading(false));
    checkBalance()
      .then(b => { setGatewayBalance(b.gateway); setWalletBalance(b.wallet); setBalanceAddress(b.address); })
      .catch(() => {});
  }, []);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  const handleDeposit = async () => {
    setDepositing(true);
    try {
      await depositToGateway("1");
      const b = await checkBalance();
      setGatewayBalance(b.gateway); setWalletBalance(b.wallet);
    } finally { setDepositing(false); }
  };

  const handleUnlockSignal = (signal: Signal) => {
    setSelectedSignal(signal); setPaymentStatus("idle"); setUnlockedData(null); setPaymentError("");
  };

  const handlePayAndUnlock = async () => {
    setPaymentStatus("processing");
    try {
      const url = `${window.location.origin}/api/signals/${selectedSignal!.id}`;
      const data = await payAndFetch(url);
      setUnlockedData(data); setPaymentStatus("success");
    } catch (err: any) {
      setPaymentError(err?.message || "Payment failed");
      setPaymentStatus("failed");
    }
  };

  const handleChatSend = async () => {
    const msg = chatInput.trim(); if (!msg || chatLoading) return;
    setChatInput("");
    const userMsg: ChatMessage = { role: "user", content: msg, timestamp: new Date().toISOString() };
    setChatMessages(prev => [...prev, userMsg]);
    setChatLoading(true);
    try {
      const res = await fetch("/api/agent/decide", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat: msg, signals, agent }) });
      const data = await res.json();
      const agentMsg: ChatMessage = { role: "agent", content: data.reply || data.reason || "I'm not sure about that.", timestamp: new Date().toISOString() };
      setChatMessages(prev => [...prev, agentMsg]);
    } catch {
      setChatMessages(prev => [...prev, { role: "agent", content: "Error reaching the agent.", timestamp: new Date().toISOString() }]);
    } finally { setChatLoading(false); }
  };

  const confidenceColor = (c: number) => c >= 0.7 ? "text-green-400" : c >= 0.5 ? "text-yellow-400" : "text-red-400";

  if (loading) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <Zap className="w-12 h-12 mx-auto mb-4 animate-pulse text-purple-400" />
          <p className="text-zinc-400">Loading signals...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-zinc-950 via-black to-zinc-950 text-white">
      <header className="sticky top-0 z-50 bg-black/80 backdrop-blur-xl border-b border-zinc-800/50 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-purple-500/20">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-purple-400 to-cyan-400 bg-clip-text text-transparent">capcat</h1>
              <p className="text-xs text-zinc-500">AI Copy Agent + x402</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {!agent.running ? (
              <button onClick={startAgent} className="px-3 py-1.5 rounded-full bg-purple-500/10 border border-purple-500/20 hover:bg-purple-500/20 flex items-center gap-1.5 text-xs text-purple-400 transition-colors">
                <Play className="w-3 h-3" /> Start Agent
              </button>
            ) : (
              <button onClick={stopAgent} className="px-3 py-1.5 rounded-full bg-red-500/10 border border-red-500/20 hover:bg-red-500/20 flex items-center gap-1.5 text-xs text-red-400 transition-colors">
                <Square className="w-3 h-3" /> Stop Agent
              </button>
            )}
            {!walletConnected ? (
              <button onClick={async () => { const r = await connectWallet(); if (r.connected) { setWalletAddress(r.address); setWalletConnected(true); } }} className="px-3 py-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 hover:bg-cyan-500/20 flex items-center gap-1.5 text-xs text-cyan-400 transition-colors">
                <Wallet className="w-3 h-3" /> Connect Wallet
              </button>
            ) : (
              <span className="text-xs text-zinc-500 font-mono truncate max-w-[100px]">{walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}</span>
            )}
            <div className={`px-3 py-1 rounded-full ${agent.running ? 'bg-green-500/10 border border-green-500/20' : 'bg-zinc-800 border border-zinc-700'}`}>
              <div className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${agent.running ? 'bg-green-400 animate-pulse' : 'bg-zinc-500'}`} />
                <span className={`text-xs font-medium ${agent.running ? 'text-green-400' : 'text-zinc-500'}`}>{agent.running ? 'Agent Live' : 'Agent Idle'}</span>
              </div>
            </div>
          </div>
        </div>
      </header>

      {!walletConnected && Number(walletBalance) > 0 && (
        <div className="bg-zinc-900/30 border-b border-zinc-800/50 px-4 py-2">
          <div className="flex items-center justify-end gap-4 max-w-2xl mx-auto text-xs">
            <span className="text-zinc-500">Demo: <span className="text-white font-mono">{balanceAddress.slice(0, 6)}...{balanceAddress.slice(-4)}</span></span>
            <span className="text-zinc-500">Gateway: <span className="text-white font-mono">{Number(gatewayBalance).toFixed(4)}</span> USDC</span>
            <span className="text-zinc-500">Wallet: <span className="text-white font-mono">{Number(walletBalance).toFixed(4)}</span> USDC</span>
            <button onClick={handleDeposit} disabled={depositing || Number(walletBalance) < 0.5} className="px-2 py-1 rounded bg-purple-500/20 text-purple-400 hover:bg-purple-500/30 disabled:opacity-30 disabled:cursor-not-allowed transition-colors">{depositing ? "..." : "Deposit 1 USDC"}</button>
          </div>
        </div>
      )}

      <main className="px-4 py-6 max-w-2xl mx-auto pb-20">
        {agent.running && (
          <div className="grid grid-cols-4 gap-3 mb-6">
            <div className="bg-purple-500/5 border border-purple-500/10 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-purple-400">{agent.stats.totalSignals}</p>
              <p className="text-xs text-zinc-500">Signals</p>
            </div>
            <div className="bg-green-500/5 border border-green-500/10 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-green-400">{agent.stats.bought}</p>
              <p className="text-xs text-zinc-500">Bought</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-yellow-400">{agent.stats.skipped}</p>
              <p className="text-xs text-zinc-500">Skipped</p>
            </div>
            <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-3 text-center">
              <p className="text-lg font-bold text-cyan-400">{agent.stats.wins}/{agent.stats.losses}</p>
              <p className="text-xs text-zinc-500">W/L</p>
            </div>
          </div>
        )}

        <div className="flex gap-2 mb-6">
          <button onClick={() => setActiveTab("signals")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "signals" ? "bg-purple-500/20 text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}>
            <TrendingUp className="w-4 h-4 inline mr-1.5" /> Signals ({signals.length})
          </button>
          <button onClick={() => setActiveTab("agent")} className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${activeTab === "agent" ? "bg-purple-500/20 text-purple-400" : "text-zinc-500 hover:text-zinc-300"}`}>
            <Brain className="w-4 h-4 inline mr-1.5" /> Agent ({agent.activities.length})
          </button>
        </div>

        {selectedSignal && (
          <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-zinc-900 border border-zinc-800 rounded-2xl max-w-md w-full p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold">{selectedSignal.symbol}</h2>
                <button onClick={() => { setSelectedSignal(null); setPaymentStatus("idle"); setUnlockedData(null); setPaymentError(""); }} className="text-zinc-400 hover:text-white"><XCircle className="w-6 h-6" /></button>
              </div>

              {paymentStatus === "idle" && (
                <div className="space-y-4">
                  <div className="bg-zinc-800/50 rounded-xl p-4"><p className="text-sm text-zinc-300">{selectedSignal.teaser}</p></div>
                  <button onClick={handlePayAndUnlock} className="w-full bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-semibold py-3 rounded-xl flex items-center justify-center gap-2 transition-all">
                    <Zap className="w-5 h-5" /> Unlock for {selectedSignal.priceUsdc}
                  </button>
                </div>
              )}

              {paymentStatus === "processing" && (
                <div className="text-center py-8">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full border-4 border-purple-500 border-t-transparent animate-spin" />
                  <p className="text-zinc-400">Processing x402 payment...</p>
                </div>
              )}

              {paymentStatus === "failed" && (
                <div className="space-y-4">
                  <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                      <div>
                        <p className="font-semibold text-red-400 mb-1">Payment Failed</p>
                        <p className="text-sm text-zinc-400">{paymentError || "Could not process your payment."}</p>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { setPaymentStatus("idle"); setPaymentError(""); }} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl transition-all">Try Again</button>
                </div>
              )}

              {paymentStatus === "success" && unlockedData && (
                <div className="space-y-4">
                  <div className="bg-green-500/10 border border-green-500/20 rounded-xl p-4">
                    <div className="flex items-center gap-3"><CheckCircle className="w-6 h-6 text-green-400" /><p className="font-semibold text-green-400">Signal Unlocked!</p></div>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-zinc-800/50 rounded-xl p-4"><p className="text-xs text-zinc-500 mb-1">Entry Price</p><p className="text-lg font-mono">${unlockedData.entry}</p></div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-zinc-800/50 rounded-xl p-4"><p className="text-xs text-zinc-500 mb-1">Stop Loss</p><p className="text-sm font-mono text-red-400">${unlockedData.stopLoss}</p></div>
                      <div className="bg-zinc-800/50 rounded-xl p-4"><p className="text-xs text-zinc-500 mb-1">Take Profit</p><p className="text-sm font-mono text-green-400">${unlockedData.takeProfit}</p></div>
                    </div>
                    <div className="bg-zinc-800/50 rounded-xl p-4"><p className="text-xs text-zinc-500 mb-1">Rationale</p><p className="text-sm text-zinc-300">{unlockedData.rationale}</p></div>
                  </div>
                  <button onClick={() => { setSelectedSignal(null); setPaymentStatus("idle"); setUnlockedData(null); }} className="w-full bg-zinc-800 hover:bg-zinc-700 text-white font-semibold py-3 rounded-xl transition-all">Close</button>
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === "signals" && (
          <div className="space-y-3">
            <h2 className="text-lg font-semibold mb-3 flex items-center gap-2"><TrendingUp className="w-5 h-5 text-purple-400" />Trading Signals</h2>
            {signals.map((signal) => (
              <div key={signal.id} onClick={() => handleUnlockSignal(signal)} className="bg-zinc-900/50 border border-zinc-800/50 hover:border-purple-500/50 rounded-xl p-4 cursor-pointer transition-all hover:shadow-lg hover:shadow-purple-500/10">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${signal.side === "LONG" ? "bg-green-500/10" : "bg-red-500/10"}`}>
                      <TrendingUp className={`w-6 h-6 ${signal.side === "LONG" ? "text-green-400" : "text-red-400 rotate-180"}`} />
                    </div>
                    <div><h3 className="font-semibold text-lg">{signal.symbol}</h3><p className={`text-sm font-medium ${signal.side === "LONG" ? "text-green-400" : "text-red-400"}`}>{signal.side}</p></div>
                  </div>
                  <div className="text-right"><p className={`text-sm font-mono ${confidenceColor(signal.confidence)}`}>{Math.round(signal.confidence * 100)}%</p><p className="text-xs text-zinc-500">confidence</p></div>
                </div>
                <p className="text-sm text-zinc-400 mb-3">{signal.teaser}</p>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2"><Zap className="w-4 h-4 text-purple-400" /><span className="text-sm font-mono text-purple-400">{signal.priceUsdc}</span></div>
                  <button className="text-xs text-zinc-400 hover:text-white flex items-center gap-1">Unlock <ArrowRight className="w-3 h-3" /></button>
                </div>
              </div>
            ))}
          </div>
        )}

        {activeTab === "agent" && (
          <div className="space-y-3">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-lg font-semibold flex items-center gap-2"><Activity className="w-5 h-5 text-purple-400" />Agent Activity</h2>
              {!agent.running && (
                <button onClick={startAgent} className="px-3 py-1.5 rounded-lg bg-purple-500/20 text-purple-400 text-xs flex items-center gap-1 hover:bg-purple-500/30 transition-colors"><Play className="w-3 h-3" /> Start Agent</button>
              )}
            </div>

            {agent.activities.length === 0 && (
              <div className="bg-zinc-900/50 border border-zinc-800/50 rounded-xl p-8 text-center">
                <Bot className="w-10 h-10 mx-auto mb-3 text-zinc-600" />
                <p className="text-zinc-500">Agent is idle. Start it to auto-evaluate and buy signals.</p>
              </div>
            )}

            {agent.activities.map((activity) => (
              <div key={activity.id} className={`rounded-xl p-4 border ${activity.type === "bought" ? "bg-green-500/5 border-green-500/10" : "bg-zinc-900/50 border-zinc-800/50"}`}>
                <div className="flex items-start gap-3">
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${activity.type === "bought" ? "bg-green-500/10" : activity.type === "skipped" ? "bg-yellow-500/10" : "bg-purple-500/10"}`}>
                    {activity.type === "bought" ? <CheckCircle className="w-4 h-4 text-green-400" /> : activity.type === "skipped" ? <XCircle className="w-4 h-4 text-yellow-400" /> : <Brain className="w-4 h-4 text-purple-400" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold text-sm">{activity.signal.symbol}</span>
                      <span className={`text-xs ${activity.signal.side === "LONG" ? "text-green-400" : "text-red-400"}`}>{activity.signal.side}</span>
                      <span className="text-xs text-zinc-500">by {activity.signal.trader}</span>
                    </div>
                    {activity.decision && <p className="text-xs text-zinc-400 mb-1">{activity.decision.reason}</p>}
                  </div>
                  <div className={`px-2 py-1 rounded text-xs font-medium ${activity.type === "bought" ? "bg-green-500/10 text-green-400" : activity.type === "skipped" ? "bg-yellow-500/10 text-yellow-400" : "bg-purple-500/10 text-purple-400"}`}>
                    {activity.type === "bought" ? `—${activity.signal.priceUsdc}` : activity.type === "skipped" ? "SKIP" : "EVAL"}
                  </div>
                </div>
              </div>
            ))}

            {agent.ledger.length > 0 && (
              <div className="mt-8 bg-gradient-to-br from-purple-500/5 to-cyan-500/5 border border-zinc-800/50 rounded-2xl p-6">
                <h3 className="font-semibold mb-3 flex items-center gap-2"><Shield className="w-5 h-5 text-cyan-400" />Trader Reputation</h3>
                <div className="space-y-2">
                  {agent.ledger.map((rep) => (
                    <div key={rep.trader} className="flex items-center justify-between py-2 border-b border-zinc-800/50 last:border-0">
                      <div><p className="text-sm font-medium">{rep.trader}</p><p className="text-xs text-zinc-500">{rep.copiesTaken} copies • {rep.wins}W / {rep.losses}L</p></div>
                      <div className="text-right"><p className="text-sm font-mono text-zinc-400">{rep.wins}W / {rep.losses}L</p></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Agent Chat FAB + Popup */}
      {!chatOpen && (
        <button onClick={() => setChatOpen(true)} className="fixed bottom-4 right-4 z-50 w-14 h-14 rounded-full bg-gradient-to-br from-purple-600 to-cyan-600 shadow-lg shadow-purple-500/30 flex items-center justify-center hover:scale-105 transition-transform">
          <MessageCircle className="w-6 h-6 text-white" />
        </button>
      )}

      {chatOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center">
          <div className="bg-zinc-900 border border-zinc-800 rounded-t-2xl sm:rounded-2xl w-full sm:max-w-md max-h-[80vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between p-4 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center"><Bot className="w-4 h-4 text-white" /></div>
                <div><p className="font-semibold text-sm">capcat Agent</p><p className="text-xs text-zinc-500">Ask about signals, traders, or strategy</p></div>
              </div>
              <button onClick={() => setChatOpen(false)} className="text-zinc-400 hover:text-white"><XCircle className="w-5 h-5" /></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[300px]">
              {chatMessages.length === 0 && (
                <div className="text-center py-8 text-zinc-500 text-sm">
                  <Bot className="w-8 h-8 mx-auto mb-2 text-zinc-600" />
                  <p>Ask me about the signals, which traders to follow, or strategy tips.</p>
                </div>
              )}
              {chatMessages.map((m, i) => (
                <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div className={`max-w-[80%] rounded-xl px-4 py-2 text-sm ${m.role === "user" ? "bg-purple-500/20 text-purple-100" : "bg-zinc-800 text-zinc-300"}`}>
                    {m.content}
                  </div>
                </div>
              ))}
              {chatLoading && (
                <div className="flex justify-start">
                  <div className="bg-zinc-800 rounded-xl px-4 py-2">
                    <div className="flex gap-1"><div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" /><div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0.1s" }} /><div className="w-2 h-2 rounded-full bg-zinc-500 animate-bounce" style={{ animationDelay: "0.2s" }} /></div>
                  </div>
                </div>
              )}
              <div ref={chatEndRef} />
            </div>
            <div className="p-3 border-t border-zinc-800">
              <div className="flex gap-2">
                <input value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && handleChatSend()} placeholder="Ask the agent..." className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-white placeholder-zinc-500 focus:outline-none focus:border-purple-500" />
                <button onClick={handleChatSend} disabled={chatLoading || !chatInput.trim()} className="bg-purple-600 hover:bg-purple-500 disabled:opacity-30 rounded-lg px-3 py-2 text-white transition-colors"><Send className="w-4 h-4" /></button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
