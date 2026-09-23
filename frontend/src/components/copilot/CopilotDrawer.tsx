"use client";

import { useState, useRef, useEffect } from "react";
import { CopilotResponse } from "@/types";
import { sendCopilotMessage } from "@/lib/api";


interface CopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMachineId: string;
}

interface MessageHistoryItem {
  sender: "user" | "copilot";
  text: string;
  context_tags?: string[];
  action_recommendation?: string;
  matching_sim_module?: string;
}

export function CopilotDrawer({
  isOpen,
  onClose,
  selectedMachineId,
}: CopilotDrawerProps) {
  const [inputQuery, setInputQuery] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [messages, setMessages] = useState<MessageHistoryItem[]>([
    {
      sender: "copilot",
      text: `Hello! I am your Cat Smart Operator Assistant. I am grounded in live telemetry across the fleet, Cat Training Simulation protocols, and Caterpillar 2030 sustainability benchmarks. Ask me anything!`,
    },
  ]);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const presetQueries = [
    "What is the status for Next Gen Excavator?",
    `Why is ${selectedMachineId} flagged?`,
    "Which machine has the highest idle time?",
    "How does a torque converter work in a Cat bulldozer?",
    "Explain Cat proximity safety protocol",
    "How to reduce idling to hit 2030 target?",
  ];


  const handleSendMessage = async (textToSend: string) => {
    const trimmed = textToSend.trim();
    if (!trimmed || isLoading) return;

    // Add user message
    const userMsg: MessageHistoryItem = { sender: "user", text: trimmed };
    setMessages((prev) => [...prev, userMsg]);
    setInputQuery("");
    setIsLoading(true);

    try {
      const res: CopilotResponse = await sendCopilotMessage(trimmed, selectedMachineId);
      const copilotMsg: MessageHistoryItem = {
        sender: "copilot",
        text: res.response,
        context_tags: res.context_tags,
        action_recommendation: res.action_recommendation,
        matching_sim_module: res.matching_sim_module,
      };
      setMessages((prev) => [...prev, copilotMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: "copilot",
          text: "I encountered an error querying live telemetry. Please ensure the backend server is running.",
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:w-[440px] bg-neutral-950/95 backdrop-blur-xl border-l border-neutral-800 shadow-2xl flex flex-col justify-between font-sans">
      {/* Drawer Header */}
      <div className="p-4 border-b border-neutral-800 flex items-center justify-between bg-neutral-900/60">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded bg-[#FFCD11] text-black font-black flex items-center justify-center text-xs tracking-tighter shadow-md shadow-[#FFCD11]/20">
            CAT
          </div>
          <div>
            <h3 className="text-xs font-black uppercase text-white tracking-wider">
              Cat AI Operator Copilot
            </h3>
            <p className="text-[10px] text-neutral-400">
              Grounded on Telemetry &bull; Unit: <strong className="text-[#FFCD11] font-mono">{selectedMachineId}</strong>
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="text-neutral-400 hover:text-white p-1 rounded-md hover:bg-neutral-800 text-sm font-bold transition"
        >
          ✕
        </button>
      </div>

      {/* Messages Scroll Area */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex flex-col gap-1.5 ${
              msg.sender === "user" ? "items-end" : "items-start"
            }`}
          >
            <span className="text-[10px] text-neutral-500 font-mono">
              {msg.sender === "user" ? "Operator" : "Cat AI Copilot"}
            </span>

            <div
              className={`p-3.5 rounded-xl text-xs max-w-[90%] leading-relaxed whitespace-pre-line ${
                msg.sender === "user"
                  ? "bg-[#FFCD11] text-black font-semibold rounded-tr-none shadow-md shadow-[#FFCD11]/10"
                  : "bg-neutral-900 border border-neutral-800 text-neutral-200 rounded-tl-none"
              }`}
            >
              {msg.text}


              {/* Context Tag Chips */}
              {msg.context_tags && msg.context_tags.length > 0 && (
                <div className="mt-2.5 flex flex-wrap gap-1">
                  {msg.context_tags.map((tag, idx) => (
                    <span
                      key={idx}
                      className="px-1.5 py-0.5 rounded bg-neutral-950 border border-neutral-800 text-[10px] font-mono text-[#FFCD11]"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}

              {/* Action Recommendation Callout */}
              {msg.action_recommendation && (
                <div className="mt-3 p-2.5 rounded-lg bg-neutral-950 border border-neutral-800/80">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider block mb-0.5">
                    Recommended Action:
                  </span>
                  <span className="text-[11px] text-neutral-300">
                    {msg.action_recommendation}
                  </span>
                </div>
              )}

              {/* Matching Cat Sim Module */}
              {msg.matching_sim_module && (
                <div className="mt-2 p-2 rounded bg-neutral-950/60 border border-[#FFCD11]/20 flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-400">
                    <span className="text-[#FFCD11] font-bold">Simulator Track:</span>
                    <span className="text-white font-medium">{msg.matching_sim_module}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex items-center gap-2 text-xs text-[#FFCD11] font-mono p-3 bg-neutral-900/60 rounded-xl border border-neutral-800 max-w-[80%]">
            <span className="w-2 h-2 rounded-full bg-[#FFCD11] animate-ping" />
            <span>Consulting Cat telematics and protocols...</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>


      {/* Preset Query Chips & Input Area */}
      <div className="p-3 border-t border-neutral-800 bg-neutral-900/60 flex flex-col gap-2">
        {/* Quick query chips */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none">
          {presetQueries.map((pq, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(pq)}
              className="text-[10px] font-medium bg-neutral-900 border border-neutral-800 hover:border-[#FFCD11]/60 text-neutral-300 hover:text-white px-2 py-1 rounded-md whitespace-nowrap transition"
            >
              {pq}
            </button>
          ))}
        </div>

        {/* Text Input */}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage(inputQuery);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            placeholder="Ask Cat Copilot about telemetry, safety, or fuel..."
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-3 py-2 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FFCD11]"
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || isLoading}
            className="p-2 rounded-lg bg-[#FFCD11] text-black font-extrabold text-xs disabled:opacity-40 disabled:cursor-not-allowed hover:bg-[#EAA400] transition"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  );
}
