"use client";

import { MachineDigitalTwin } from "@/types";

interface NavbarProps {
  machines: MachineDigitalTwin[];
  selectedMachineId: string;
  onSelectMachine: (id: string) => void;
  activeTab: string;
  onSelectTab: (tab: string) => void;
  backendStatus: "loading" | "ok" | "down";
  onRefresh: () => void;
  copilotOpen: boolean;
  onToggleCopilot: () => void;
}

export function Navbar({
  machines,
  selectedMachineId,
  onSelectMachine,
  activeTab,
  onSelectTab,
  backendStatus,
  onRefresh,
  copilotOpen,
  onToggleCopilot,
}: NavbarProps) {
  const tabs = [
    { id: "safety", label: "Safety Center" },
    { id: "twin", label: "Machine Digital Twin" },
    { id: "analytics", label: "Fleet & Operations" },
    { id: "simulation", label: "Cat Training Simulation" },
  ];

  return (
    <header className="sticky top-0 z-40 border-b border-neutral-800 bg-neutral-950/95 backdrop-blur-md px-4 py-3 shadow-xl">
      <div className="max-w-6xl mx-auto flex flex-col items-center gap-3">
        {/* Top Centered Brand & Controls Bar using balanced 3-column grid for true center alignment */}
        <div className="w-full grid grid-cols-1 md:grid-cols-3 items-center gap-3 px-2">
          {/* Left: Quick Unit Switcher */}
          <div className="flex items-center justify-center md:justify-start gap-2">
            <div className="flex items-center gap-1.5 bg-neutral-900 border border-neutral-800 rounded-lg px-2.5 py-1.5 shadow-inner">
              <span className="text-[10px] text-neutral-400 font-bold uppercase tracking-wider">Active Unit:</span>
              <select
                value={selectedMachineId}
                onChange={(e) => onSelectMachine(e.target.value)}
                className="bg-transparent text-xs font-mono font-black text-[#FFCD11] focus:outline-none cursor-pointer"
              >
                {machines.map((m) => (
                  <option key={m.machine_id} value={m.machine_id} className="bg-neutral-900 text-white">
                    {m.machine_id} &bull; {m.machine_type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Center: Brand Identity & Title (True Dead Center) */}
          <div className="flex items-center justify-center gap-3 text-center">
            <div className="w-8 h-8 rounded-md bg-[#FFCD11] text-black font-black flex items-center justify-center text-base tracking-tighter shadow-md shadow-[#FFCD11]/30 shrink-0">
              CAT
            </div>
            <div className="text-left md:text-center">
              <div className="flex items-center justify-start md:justify-center gap-2">
                <h1 className="text-sm font-black tracking-tight text-white uppercase whitespace-nowrap">
                  Smart Operator Assistant
                </h1>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-black bg-[#FFCD11]/20 text-[#FFCD11] border border-[#FFCD11]/40 tracking-wider">
                  PRO
                </span>
              </div>
              <p className="text-[10px] text-neutral-400 font-medium whitespace-nowrap">
                Caterpillar Heavy Fleet Telematics & Simulation Suite
              </p>
            </div>
          </div>

          {/* Right: Status Indicator & Copilot Action */}
          <div className="flex items-center justify-center md:justify-end gap-2.5">
            <button
              onClick={onRefresh}
              title="Click to re-check API connection"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-neutral-900 border border-neutral-800 hover:border-neutral-700 text-[11px] font-mono text-neutral-300 transition"
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  backendStatus === "ok"
                    ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.9)]"
                    : backendStatus === "down"
                    ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.9)]"
                    : "bg-amber-400 animate-pulse"
                }`}
              />
              <span>{backendStatus === "ok" ? "Live Telematics" : backendStatus === "down" ? "Offline" : "Connecting"}</span>
            </button>

            <button
              onClick={onToggleCopilot}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-black transition-all border ${
                copilotOpen
                  ? "bg-[#FFCD11] text-black border-[#FFCD11] shadow-md shadow-[#FFCD11]/30"
                  : "bg-neutral-900 text-neutral-200 border-neutral-800 hover:border-[#FFCD11]/60 hover:text-[#FFCD11]"
              }`}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-current animate-ping" />
              <span>Cat Copilot</span>
            </button>
          </div>
        </div>

        {/* Bottom Tier: Prominent Centered Navigation Dock */}
        <div className="w-full flex items-center justify-center">
          <nav className="inline-flex items-center gap-1 bg-neutral-900/90 border border-neutral-800 p-1 rounded-xl shadow-inner max-w-full overflow-x-auto scrollbar-none">
            {tabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => onSelectTab(tab.id)}
                  className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                    isActive
                      ? "bg-[#FFCD11] text-black shadow-md shadow-[#FFCD11]/20 font-black scale-[1.02]"
                      : "text-neutral-400 hover:text-white hover:bg-neutral-800/60"
                  }`}
                >
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
