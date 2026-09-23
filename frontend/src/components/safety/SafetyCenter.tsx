"use client";

import { useState } from "react";
import { SafetyOverview, SafetyProtocolItem } from "@/types";

interface SafetyCenterProps {
  data: SafetyOverview | null;
  protocols: SafetyProtocolItem[];
  selectedMachineId: string;
}

export function SafetyCenter({ data, protocols, selectedMachineId }: SafetyCenterProps) {
  const [viewMode, setViewMode] = useState<"incidents" | "protocols">("incidents");
  const [simDistance, setSimDistance] = useState<number>(4.2);
  const [filterSeverity, setFilterSeverity] = useState<string>("ALL");

  if (!data) {
    return (
      <div className="p-8 text-center text-neutral-400 animate-pulse">
        Loading Safety Center telemetry...
      </div>
    );
  }

  // Calculate dynamic proximity alert state based on interactive slider
  const isProximityDanger = simDistance < 3.0;
  const isProximityWarning = simDistance >= 3.0 && simDistance < 5.0;

  const filteredIncidents = data.incidents_timeline.filter((inc) => {
    if (filterSeverity === "ALL") return true;
    return inc.severity === filterSeverity;
  });

  return (
    <div className="flex flex-col gap-6">
      {/* Top Banner / Headline */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold uppercase tracking-wider mb-1">
            Real-Time Safety Command
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Safety Monitoring & Proximity Incident Log
          </h2>
          <p className="text-xs text-neutral-400">
            Active monitoring for {selectedMachineId || "Fleet"} grounded in Cat Training Simulation standards.
          </p>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center gap-1 bg-neutral-900 border border-neutral-800 p-1 rounded-lg">
          <button
            onClick={() => setViewMode("incidents")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition ${
              viewMode === "incidents"
                ? "bg-[#FFCD11] text-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Incident Timeline ({data.incidents_timeline.length})
          </button>
          <button
            onClick={() => setViewMode("protocols")}
            className={`px-3 py-1 text-xs font-bold rounded-md transition ${
              viewMode === "protocols"
                ? "bg-[#FFCD11] text-black"
                : "text-neutral-400 hover:text-white"
            }`}
          >
            Cat Simulation Protocols ({protocols.length})
          </button>
        </div>
      </div>

      {/* Safety Score & Telemetry Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Safety Risk Score Dial */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col justify-between relative overflow-hidden">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-neutral-400">Safety Risk Score</span>
            <span
              className={`text-[10px] font-black px-2 py-0.5 rounded uppercase font-mono ${
                data.risk_level === "LOW"
                  ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40"
                  : data.risk_level === "MODERATE"
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                  : "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
              }`}
            >
              {data.risk_level}
            </span>
          </div>

          <div className="my-4 flex items-baseline gap-2">
            <span className="text-4xl font-black text-white font-mono">{data.safety_risk_score}</span>
            <span className="text-xs text-neutral-400">/ 100 max risk</span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 ${
                data.risk_level === "LOW"
                  ? "bg-emerald-500"
                  : data.risk_level === "MODERATE"
                  ? "bg-amber-500"
                  : "bg-red-500"
              }`}
              style={{ width: `${Math.min(100, data.safety_risk_score)}%` }}
            />
          </div>
          <p className="text-[11px] text-neutral-400 mt-2">
            Calculated from unfastened seatbelt events, ocular fatigue signals, and overspeed frequency.
          </p>
        </div>

        {/* Seatbelt Compliance */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-neutral-400">Seatbelt Status</span>
            <span className="text-[10px] text-neutral-400 font-mono">Sensors Live</span>
          </div>
          <div className="my-3">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm ${
                data.current_status.seatbelt_status === "Fastened"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  data.current_status.seatbelt_status === "Fastened" ? "bg-emerald-500" : "bg-red-500"
                }`}
              />
              {data.current_status.seatbelt_status}
            </div>
          </div>
          <p className="text-[11px] text-neutral-400">
            Unfastened shift rate: <span className="text-white font-bold">{data.aggregate_stats.unfastened_rate_pct}%</span>
          </p>
        </div>

        {/* Fatigue Status */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-neutral-400">Fatigue Alert (DSS)</span>
            <span className="text-[10px] text-neutral-400 font-mono">Camera Active</span>
          </div>
          <div className="my-3">
            <div
              className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg font-bold text-sm ${
                data.current_status.fatigue_alert === "No"
                  ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                  : "bg-amber-500/20 text-amber-400 border border-amber-500/40 animate-pulse"
              }`}
            >
              <span
                className={`w-2.5 h-2.5 rounded-full ${
                  data.current_status.fatigue_alert === "No" ? "bg-emerald-500" : "bg-amber-400"
                }`}
              />
              {data.current_status.fatigue_alert === "No" ? "Operator Alert" : "Fatigue Detected"}
            </div>
          </div>
          <p className="text-[11px] text-neutral-400">
            Fatigue incidence: <span className="text-white font-bold">{data.aggregate_stats.fatigue_rate_pct}%</span> of shifts
          </p>
        </div>

        {/* Dynamic Events Counter */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase text-neutral-400">High-G & Overspeed</span>
            <span className="text-[10px] text-neutral-400 font-mono">Last Shift</span>
          </div>
          <div className="my-2 grid grid-cols-2 gap-2">
            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Braking</span>
              <span className="text-lg font-black text-white font-mono">
                {data.current_status.harsh_braking_recent}
              </span>
            </div>
            <div className="bg-neutral-950 p-2.5 rounded-lg border border-neutral-800">
              <span className="text-[10px] text-neutral-400 uppercase font-semibold block">Overspeed</span>
              <span className="text-lg font-black text-white font-mono">
                {data.current_status.overspeed_recent}
              </span>
            </div>
          </div>
          <p className="text-[11px] text-neutral-400">
            Harsh events auto-trigger telematics flags into supervisor log.
          </p>
        </div>
      </div>

      {/* Proximity Radar Simulator Widget (Clearly-Labeled Simulated Signal) */}
      <div className="rounded-xl border border-neutral-800 bg-gradient-to-r from-neutral-900 via-neutral-900/90 to-neutral-950 p-6 shadow-lg">
        <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              <span className="px-2 py-0.5 rounded text-[10px] font-black uppercase tracking-wider bg-sky-500/20 text-sky-400 border border-sky-500/40">
                Simulated Telemetry Signal
              </span>
              <span className="text-xs text-neutral-400">Cat Detect Radar (5m Bubble)</span>
            </div>
            <h3 className="text-lg font-black text-white">
              Dynamic Proximity Exclusion Zone Simulator
            </h3>
            <p className="text-xs text-neutral-300 max-w-xl mt-1 leading-relaxed">
              As permitted by the design brief, proximity distance is a simulated sensor field.
              Use the interactive slider to test real-time threshold warnings as obstacles or personnel enter the machine swing radius.
            </p>

            {/* Distance Slider */}
            <div className="mt-4 flex flex-col gap-2 max-w-md">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400">Proximity Distance:</span>
                <span className="font-mono font-bold text-white text-sm">{simDistance.toFixed(1)} meters</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="8.0"
                step="0.1"
                value={simDistance}
                onChange={(e) => setSimDistance(parseFloat(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#FFCD11]"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                <span>0.5m (Lethal Pinch)</span>
                <span>3.0m (Critical Zone)</span>
                <span>5.0m (Exclusion Boundary)</span>
                <span>8.0m (Safe)</span>
              </div>
            </div>
          </div>

          {/* Visual Radar Display Ring */}
          <div className="flex items-center gap-4">
            <div className="relative w-36 h-36 rounded-full border-2 border-dashed border-neutral-700 bg-neutral-950/80 flex items-center justify-center">
              {/* Inner Danger Zone */}
              <div className="absolute w-20 h-20 rounded-full border border-red-500/40 bg-red-500/5 animate-pulse" />
              {/* Mid Warning Zone */}
              <div className="absolute w-28 h-28 rounded-full border border-amber-500/30" />
              {/* Center Machine Dot */}
              <div className="w-5 h-5 rounded-full bg-[#FFCD11] text-black font-extrabold text-[9px] flex items-center justify-center z-10 shadow-lg">
                CAT
              </div>
              {/* Target Blip */}
              <div
                className={`absolute w-3 h-3 rounded-full transition-all duration-300 z-20 ${
                  isProximityDanger
                    ? "bg-red-500 shadow-[0_0_10px_red] animate-ping"
                    : isProximityWarning
                    ? "bg-amber-400 shadow-[0_0_8px_orange]"
                    : "bg-emerald-400"
                }`}
                style={{
                  top: `${Math.max(10, Math.min(80, 50 - simDistance * 6))}%`,
                  right: `${Math.max(10, Math.min(80, 50 + simDistance * 4))}%`,
                }}
              />
            </div>

            {/* Radar Telemetry Feedback */}
            <div className="flex flex-col gap-1.5 min-w-[150px]">
              <div
                className={`px-3 py-2 rounded-lg border text-xs font-bold text-center ${
                  isProximityDanger
                    ? "bg-red-500/20 text-red-400 border-red-500/50 animate-pulse"
                    : isProximityWarning
                    ? "bg-amber-500/20 text-amber-400 border-amber-500/50"
                    : "bg-emerald-500/20 text-emerald-400 border-emerald-500/50"
                }`}
              >
                {isProximityDanger
                  ? "CRITICAL PINCH HAZARD"
                  : isProximityWarning
                  ? "PERSONNEL IN SWING RADIUS"
                  : "CLEAR ZONE"}
              </div>
              <p className="text-[10px] text-neutral-400 text-center font-mono">
                {isProximityDanger
                  ? "Protocol: Emergency stop implements!"
                  : isProximityWarning
                  ? "Protocol: Sound horn twice & hold"
                  : "Nominal operational clearance"}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Conditional: Incidents Timeline vs Cat Simulation Protocols */}
      {viewMode === "incidents" ? (
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/40 p-5 flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Real-Time Incident Timeline Log
              </h3>
              <p className="text-xs text-neutral-400">
                All records with active safety alerts, unfastened seatbelts, or harsh handling.
              </p>
            </div>

            {/* Filter buttons */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-neutral-400 mr-1">Filter:</span>
              {["ALL", "HIGH", "MEDIUM"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setFilterSeverity(sev)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition ${
                    filterSeverity === sev
                      ? "bg-neutral-200 text-black"
                      : "bg-neutral-800 text-neutral-400 hover:text-white"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>

          {/* Incidents Table / Cards */}
          <div className="divide-y divide-neutral-800 max-h-96 overflow-y-auto pr-1">
            {filteredIncidents.length === 0 ? (
              <p className="text-xs text-neutral-400 py-6 text-center">No incidents match the selected filter.</p>
            ) : (
              filteredIncidents.map((inc) => (
                <div key={inc.record_id} className="py-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-neutral-900/40 px-2 rounded-lg transition">
                  <div className="flex items-start gap-3">
                    <span
                      className={`text-[10px] font-black px-2 py-0.5 rounded uppercase font-mono mt-0.5 ${
                        inc.severity === "HIGH"
                          ? "bg-red-500/20 text-red-400 border border-red-500/40"
                          : "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                      }`}
                    >
                      {inc.severity}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white">{inc.machine_id} ({inc.machine_type})</span>
                        <span className="text-[11px] text-neutral-400">• Op: {inc.operator_id}</span>
                        <span className="text-[11px] text-neutral-500">• {inc.site_location}</span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-neutral-400 mt-1">
                        <span>Task: {inc.task_type}</span>
                        <span>| Shift: {inc.shift}</span>
                        <span>| Seatbelt: <strong className={inc.seatbelt === "Unfastened" ? "text-red-400" : "text-emerald-400"}>{inc.seatbelt}</strong></span>
                        {inc.fatigue === "Yes" && <span className="text-amber-400 font-semibold">• Fatigue Alert</span>}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-mono text-neutral-400 block">{inc.timestamp}</span>
                    <span className="text-[10px] text-neutral-500">Rec #{inc.record_id}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        /* Cat Simulation Safety Protocols Guide */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {protocols.map((prot) => (
            <div key={prot.id} className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-[#FFCD11] uppercase tracking-wider font-mono">
                  {prot.id} • {prot.category}
                </span>
              </div>
              <h4 className="text-sm font-bold text-white">{prot.title}</h4>
              <p className="text-xs text-neutral-300 leading-relaxed bg-neutral-950 p-3 rounded-lg border border-neutral-800/80">
                {prot.summary}
              </p>
              <div className="flex flex-col gap-1.5 mt-1">
                <span className="text-[11px] font-bold text-neutral-400 uppercase">Cat Sim Operator Steps:</span>
                {prot.checklist.map((step, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs text-neutral-300">
                    <span className="text-[#FFCD11] font-bold">✓</span>
                    <span>{step}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
