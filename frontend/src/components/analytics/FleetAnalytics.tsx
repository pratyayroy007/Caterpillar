"use client";

import { useState } from "react";
import { FleetAnalytics as FleetAnalyticsType } from "@/types";

interface FleetAnalyticsProps {
  data: FleetAnalyticsType | null;
  onSelectMachine?: (id: string) => void;
  onAskCopilot?: (query: string) => void;
}

export function FleetAnalytics({ data, onSelectMachine, onAskCopilot }: FleetAnalyticsProps) {
  const [targetCutPct, setTargetCutPct] = useState<number>(30);
  const [issueFilter, setIssueFilter] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  if (!data) {
    return (
      <div className="p-8 text-center text-neutral-400 animate-pulse font-mono">
        Loading Fleet Equipment & Field Operations Data...
      </div>
    );
  }

  const { fuel_by_machine_type, idle_by_site, alerts_by_shift, fleet_issues = [], sustainability_2030 } = data;

  // Dynamic calculations for operator's interactive idle reduction target
  const simulatedIdleSavingsL = Math.round(sustainability_2030.idle_fuel_waste_l * (targetCutPct / 100));
  const simulatedCO2AvoidedKg = Math.round(sustainability_2030.idle_co2_emissions_kg * (targetCutPct / 100));
  const simulatedCostSavedUSD = Math.round(simulatedIdleSavingsL * 1.15); // ~$1.15 / Liter diesel estimate

  // Combined severity and keyword search filter
  const filteredIssues = fleet_issues.filter((iss) => {
    const matchesSeverity = issueFilter === "ALL" || iss.severity === issueFilter;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return matchesSeverity;

    const matchesSearch =
      iss.machine_id.toLowerCase().includes(query) ||
      iss.machine_name.toLowerCase().includes(query) ||
      iss.machine_type.toLowerCase().includes(query) ||
      iss.site_location.toLowerCase().includes(query) ||
      iss.current_operator.toLowerCase().includes(query);

    return matchesSeverity && matchesSearch;
  });

  // Calculate fleet-wide summary metrics
  const criticalCount = fleet_issues.filter((i) => i.severity === "CRITICAL").length;
  const highCount = fleet_issues.filter((i) => i.severity === "HIGH").length;
  const avgFleetFuel =
    fuel_by_machine_type.length > 0
      ? (fuel_by_machine_type.reduce((acc, curr) => acc + curr.Fuel_Efficiency_L_per_hr, 0) / fuel_by_machine_type.length).toFixed(1)
      : "7.2";

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header - Clean, No "Module X" Quotation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold uppercase tracking-wider mb-1">
            Fleet Equipment & Field Operations
          </div>
          <h2 className="text-xl md:text-2xl font-black text-white tracking-tight">
            Fleet Status & Equipment Health
          </h2>
          <p className="text-xs text-neutral-400 mt-0.5">
            Real-time status across 17 machines, active field alerts, and daily fuel-saving targets.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="px-3 py-1 rounded-full bg-neutral-900 border border-neutral-800 text-xs font-mono text-neutral-300">
            Active Fleet: 17 Units • 8 Sites
          </span>
        </div>
      </div>

      {/* Operator Quick Vital Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-neutral-900/70 p-3.5 rounded-xl border border-neutral-800 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Active Machines</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-white font-mono">17</span>
            <span className="text-xs text-emerald-400 font-semibold">100% Deployed</span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-1">5 Equipment Types</span>
        </div>

        <div className="bg-neutral-900/70 p-3.5 rounded-xl border border-neutral-800 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Needs Attention</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-amber-400 font-mono">{fleet_issues.length}</span>
            <span className="text-xs text-red-400 font-semibold">{criticalCount} Critical</span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-1">Maintenance & Safety</span>
        </div>

        <div className="bg-neutral-900/70 p-3.5 rounded-xl border border-neutral-800 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Mean Fuel Burn</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-[#FFCD11] font-mono">{avgFleetFuel}</span>
            <span className="text-xs text-neutral-400 font-mono">L / hour</span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-1">Across all models</span>
        </div>

        <div className="bg-neutral-900/70 p-3.5 rounded-xl border border-neutral-800 flex flex-col justify-between">
          <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider">Daily Idle Benchmark</span>
          <div className="flex items-baseline gap-2 mt-1">
            <span className="text-2xl font-black text-sky-400 font-mono">15</span>
            <span className="text-xs text-neutral-400 font-mono">min / task</span>
          </div>
          <span className="text-[10px] text-neutral-500 mt-1">Target for operators</span>
        </div>
      </div>

      {/* Operator Fuel & Eco-Idle Action Guide (Caterpillar 2030 Target Made Practical) */}
      <div className="rounded-xl border border-neutral-800 bg-gradient-to-br from-neutral-900 via-neutral-900/90 to-neutral-950 p-6 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="max-w-2xl">
            <div className="flex items-center gap-2 mb-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
              <span className="text-xs font-bold uppercase text-emerald-400 tracking-wider">
                Operator Action Plan &bull; Caterpillar 2030 Target
              </span>
            </div>
            <h3 className="text-lg md:text-xl font-black text-white">
              Cut Idling, Save Fuel, Hit the 30% Climate Target
            </h3>
            <p className="text-xs md:text-sm text-neutral-300 mt-1 leading-relaxed">
              Every 15 minutes of idle time you avoid saves <strong className="text-white">~1.0 Liter of diesel</strong> and prevents <strong className="text-white">2.7 kg of carbon</strong> emissions.
              Use the target slider below to see how our combined daily habits add up across the fleet:
            </p>

            {/* Interactive Target Slider */}
            <div className="mt-5 max-w-md flex flex-col gap-2">
              <div className="flex justify-between text-xs">
                <span className="text-neutral-400 font-semibold">Simulate Fleet Idle Cut Target:</span>
                <span className="font-mono font-bold text-[#FFCD11] text-sm">{targetCutPct}% Idle Cut</span>
              </div>
              <input
                type="range"
                min="10"
                max="50"
                step="5"
                value={targetCutPct}
                onChange={(e) => setTargetCutPct(parseInt(e.target.value))}
                className="w-full h-2 bg-neutral-800 rounded-lg appearance-none cursor-pointer accent-[#FFCD11]"
              />
              <div className="flex justify-between text-[10px] text-neutral-500 font-mono">
                <span>10% (Quick Start)</span>
                <span className="text-[#FFCD11] font-bold">30% (Cat 2030 Target)</span>
                <span>50% (Eco-Master)</span>
              </div>
            </div>

            {/* 3 Practical In-Cab Habits for Operators */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 mt-5 pt-4 border-t border-neutral-800/80">
              <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800/70">
                <div className="text-[11px] font-bold text-[#FFCD11] flex items-center gap-1.5 mb-1">
                  <span>⏱️</span> <span>Auto-Idle 3 Min</span>
                </div>
                <p className="text-[10px] text-neutral-400 leading-snug">
                  Set cab display timer to 3 mins when waiting on haul trucks.
                </p>
              </div>

              <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800/70">
                <div className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5 mb-1">
                  <span>🟢</span> <span>Use Eco-Mode</span>
                </div>
                <p className="text-[10px] text-neutral-400 leading-snug">
                  Keep throttle dial in Eco-Mode to optimize RPM without loss of breakout force.
                </p>
              </div>

              <div className="bg-neutral-950/60 p-2.5 rounded-lg border border-neutral-800/70">
                <div className="text-[11px] font-bold text-sky-400 flex items-center gap-1.5 mb-1">
                  <span>🛑</span> <span>Key-Off at Breaks</span>
                </div>
                <p className="text-[10px] text-neutral-400 leading-snug">
                  Shut down during shift lunches instead of leaving engine idling.
                </p>
              </div>
            </div>
          </div>

          {/* Savings Metric Box */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 w-full lg:w-auto">
            <div className="bg-neutral-950/90 p-4 rounded-xl border border-neutral-800 text-center shadow-lg">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Diesel Saved</span>
              <span className="text-2xl font-black text-[#FFCD11] font-mono mt-1 block">
                {simulatedIdleSavingsL.toLocaleString()} L
              </span>
              <span className="text-[10px] text-neutral-500">Idle diesel preserved</span>
            </div>

            <div className="bg-neutral-950/90 p-4 rounded-xl border border-neutral-800 text-center shadow-lg">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">CO2 Avoided</span>
              <span className="text-2xl font-black text-emerald-400 font-mono mt-1 block">
                {simulatedCO2AvoidedKg.toLocaleString()} kg
              </span>
              <span className="text-[10px] text-neutral-500">Direct emission cut</span>
            </div>

            <div className="bg-neutral-950/90 p-4 rounded-xl border border-neutral-800 text-center col-span-2 sm:col-span-1 shadow-lg">
              <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block">Cost Saved</span>
              <span className="text-2xl font-black text-white font-mono mt-1 block">
                ${simulatedCostSavedUSD.toLocaleString()}
              </span>
              <span className="text-[10px] text-neutral-500">Fuel dollar savings</span>
            </div>
          </div>
        </div>
      </div>

      {/* Equipment Health & Field Alerts */}
      <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 shadow-xl flex flex-col gap-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-neutral-800/80 pb-3">
          <div>
            <h3 className="text-base font-extrabold text-white flex items-center gap-2">
              <span>⚠️ Equipment Health & Field Alerts</span>
              <span className="px-2 py-0.5 rounded text-[11px] font-mono bg-neutral-800 text-neutral-300">
                {filteredIssues.length} Machines Listed
              </span>
            </h3>
            <p className="text-xs text-neutral-400 mt-0.5">
              Specific machine names, active sites, and plain-language action items for operators.
            </p>
          </div>

          {/* Quick Search & Filter Controls */}
          <div className="flex flex-wrap items-center gap-2">
            <input
              type="text"
              placeholder="Search machine, model, or site..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-neutral-950 border border-neutral-800 rounded-lg px-2.5 py-1 text-xs text-white placeholder-neutral-500 focus:outline-none focus:border-[#FFCD11] font-mono w-48"
            />

            <div className="flex items-center gap-1 bg-neutral-950 border border-neutral-800 p-0.5 rounded-lg">
              {["ALL", "CRITICAL", "HIGH", "MEDIUM"].map((sev) => (
                <button
                  key={sev}
                  onClick={() => setIssueFilter(sev)}
                  className={`px-2.5 py-1 rounded text-[11px] font-bold transition font-mono ${
                    issueFilter === sev
                      ? "bg-[#FFCD11] text-black"
                      : "text-neutral-400 hover:text-white"
                  }`}
                >
                  {sev}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Fleet Issues List */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredIssues.length === 0 ? (
            <div className="bg-neutral-950/60 p-8 rounded-xl border border-neutral-800/80 text-center col-span-2">
              <span className="text-2xl block mb-2">✅</span>
              <p className="text-sm font-bold text-white">No Machines Flagged Under Current Filter</p>
              <p className="text-xs text-neutral-400 mt-1">
                All machines are running within normal parameters or match your search criteria.
              </p>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  className="mt-3 px-3 py-1 bg-neutral-800 hover:bg-neutral-700 text-xs font-bold text-white rounded-lg transition"
                >
                  Clear Search Filter
                </button>
              )}
            </div>
          ) : (
            filteredIssues.map((iss) => {
              const isCrit = iss.severity === "CRITICAL";
              const isHigh = iss.severity === "HIGH";

              return (
                <div
                  key={iss.machine_id}
                  className="bg-neutral-950 p-4 rounded-xl border border-neutral-800/80 hover:border-neutral-700 transition flex flex-col justify-between gap-3 shadow-md"
                >
                  <div>
                    {/* Machine Name & Status Tag */}
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <h4 className="text-sm font-black text-white flex items-center gap-2">
                          <span>{iss.machine_name}</span>
                        </h4>
                        <p className="text-xs text-neutral-400 mt-0.5 flex items-center gap-1.5">
                          <span>📍 {iss.site_location}</span>
                          <span>&bull;</span>
                          <span>Assigned Op: <strong className="text-neutral-200">{iss.current_operator}</strong></span>
                        </p>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded font-mono uppercase ${
                            isCrit
                              ? "bg-red-500/20 text-red-400 border border-red-500/40 animate-pulse"
                              : isHigh
                              ? "bg-amber-500/20 text-amber-400 border border-amber-500/40"
                              : "bg-yellow-500/20 text-yellow-300 border border-yellow-500/30"
                          }`}
                        >
                          {isCrit ? "🚨 Critical Check" : isHigh ? "⚠️ High Priority" : "🔧 Routine Check"}
                        </span>
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-neutral-900 text-neutral-200 border border-neutral-800">
                          {iss.health_score}% HLT
                        </span>
                      </div>
                    </div>

                    {/* What's Happening (Bullet Issues) */}
                    <div className="bg-neutral-900/40 p-2.5 rounded-lg border border-neutral-800/60 my-2">
                      <span className="text-[10px] font-bold text-neutral-400 uppercase tracking-wider block mb-1">
                        Active Telematics Warnings:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {iss.primary_issues.map((prob, idx) => (
                          <span
                            key={idx}
                            className="px-2 py-0.5 rounded bg-neutral-900 border border-neutral-800 text-[11px] text-red-300 font-medium"
                          >
                            &bull; {prob}
                          </span>
                        ))}
                      </div>
                    </div>

                    {/* What the Operator Should Do */}
                    <div className="p-2.5 rounded-lg bg-neutral-900/60 border border-neutral-800/80 leading-relaxed">
                      <span className="text-[10px] font-bold text-[#FFCD11] uppercase tracking-wider block mb-0.5">
                        👉 What The Operator Should Do:
                      </span>
                      <p className="text-[11px] text-neutral-300">
                        {iss.recommended_action}
                      </p>
                    </div>
                  </div>

                  {/* Card Action Shortcuts */}
                  <div className="flex items-center justify-between pt-2 border-t border-neutral-900 text-xs">
                    {onSelectMachine && (
                      <button
                        onClick={() => onSelectMachine(iss.machine_id)}
                        className="text-xs font-bold text-neutral-400 hover:text-white transition flex items-center gap-1 group"
                      >
                        <span>Open Machine Digital Twin</span>
                        <span className="group-hover:translate-x-0.5 transition-transform">→</span>
                      </button>
                    )}

                    {onAskCopilot && (
                      <button
                        onClick={() => onAskCopilot(`Why is machine ${iss.machine_id} flagged in the fleet report?`)}
                        className="text-xs font-bold text-[#FFCD11] hover:underline flex items-center gap-1"
                      >
                        <span>Ask Copilot Why</span>
                        <span>💬</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Fleet Field Comparisons Made Simple */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Fuel Consumption Guide */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Hourly Fuel Burn by Type
              </h4>
              <span className="text-[10px] text-neutral-400 font-mono">L / hour</span>
            </div>
            <p className="text-xs text-neutral-400 mb-4">
              Typical diesel consumption per hour of active machine operation.
            </p>

            <div className="space-y-3">
              {fuel_by_machine_type.map((item) => (
                <div key={item.Machine_Type} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-neutral-300">{item.Machine_Type}</span>
                    <span className="font-mono text-white font-bold">{item.Fuel_Efficiency_L_per_hr} L/h</span>
                  </div>
                  <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#FFCD11]"
                      style={{ width: `${Math.min(100, (item.Fuel_Efficiency_L_per_hr / 12) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-800/80 text-[10px] text-neutral-400">
            💡 <strong className="text-neutral-200">Operator Tip:</strong> Wheel Loaders burn highest (~8.6 L/h) during heavy bank pushing; Backhoes burn lowest (~5.5 L/h).
          </div>
        </div>

        {/* Idling Watch by Site */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Idling Watch by Job Site
              </h4>
              <span className="text-[10px] text-neutral-400 font-mono">Avg Wait Time</span>
            </div>
            <p className="text-xs text-neutral-400 mb-4">
              Average non-working idle minutes while waiting on haul trucks.
            </p>

            <div className="space-y-2.5">
              {idle_by_site.slice(0, 5).map((site) => (
                <div key={site.Site_Location} className="flex flex-col gap-1">
                  <div className="flex justify-between text-xs font-medium">
                    <span className="text-neutral-300">{site.Site_Location}</span>
                    <span className="font-mono text-sky-400 font-bold">{site.Idling_Time_min} min</span>
                  </div>
                  <div className="w-full bg-neutral-800 h-2 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-400"
                      style={{ width: `${Math.min(100, (site.Idling_Time_min / 35) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-800/80 text-[10px] text-neutral-400">
            💡 <strong className="text-neutral-200">Operator Tip:</strong> Nagpur and Chennai have longest haul queues. Cut engine to standby if wait exceeds 3 minutes.
          </div>
        </div>

        {/* Safety Watch by Shift */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/50 p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-white">
                Safety Alerts by Shift
              </h4>
              <span className="text-[10px] text-neutral-400 font-mono">Incident Vol</span>
            </div>
            <p className="text-xs text-neutral-400 mb-4">
              When safety alerts occur across morning, afternoon, and night shift teams.
            </p>

            <div className="space-y-3">
              {alerts_by_shift.map((shift) => (
                <div key={shift.Shift} className="bg-neutral-950 p-3 rounded-lg border border-neutral-800 flex items-center justify-between">
                  <div>
                    <span className="text-xs font-bold text-white block">{shift.Shift} Shift</span>
                    <span className="text-[10px] text-neutral-400">
                      {shift.Shift === "Night" ? "Elevated fatigue risk" : "High traffic loading"}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-black text-red-400 font-mono">{shift.alert_count}</span>
                    <span className="text-[10px] text-neutral-500 block">alerts</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="mt-4 pt-3 border-t border-neutral-800/80 text-[10px] text-neutral-400">
            💡 <strong className="text-neutral-200">Safety Tip:</strong> Night shifts account for 2x more fatigue and seatbelt alarms. Take a 10-minute stretch break every 2 hours.
          </div>
        </div>
      </div>
    </div>
  );
}
