"use client";

import { useState } from "react";
import { SimScenario, SimEvaluationResult } from "@/types";
import { evaluateSimulation } from "@/lib/api";

interface TrainingSimulationProps {
  scenarios: SimScenario[];
}

export function TrainingSimulation({ scenarios }: TrainingSimulationProps) {
  const [selectedScenarioId, setSelectedScenarioId] = useState<string>(scenarios[0]?.id || "SIM-01-HYD");
  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(null);
  const [evalResult, setEvalResult] = useState<SimEvaluationResult | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Pre-shift virtual walkaround inspection points
  const [walkaroundChecks, setWalkaroundChecks] = useState<Record<string, boolean>>({
    fluid_leaks: false,
    track_tension: false,
    hydraulic_hoses: false,
    horn_backup_alarm: false,
    mirrors_cab_glass: false,
  });

  const activeScenario = scenarios.find((s) => s.id === selectedScenarioId) || scenarios[0];

  const handleToggleCheck = (key: string) => {
    setWalkaroundChecks((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleEvaluate = async () => {
    if (!selectedOptionId || !activeScenario) return;
    setIsSubmitting(true);

    const completedChecks = Object.entries(walkaroundChecks)
      .filter(([_, checked]) => checked)
      .map(([key, _]) => key);

    try {
      const res = await evaluateSimulation(activeScenario.id, selectedOptionId, completedChecks);
      setEvalResult(res);
    } catch (err) {
      console.error("Failed to evaluate simulation", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResetScenario = (scenId: string) => {
    setSelectedScenarioId(scenId);
    setSelectedOptionId(null);
    setEvalResult(null);
  };

  if (!activeScenario) {
    return (
      <div className="p-8 text-center text-neutral-400 animate-pulse">
        Loading Cat Training Simulation Models...
      </div>
    );
  }

  const completedCount = Object.values(walkaroundChecks).filter(Boolean).length;

  return (
    <div className="flex flex-col gap-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-[#FFCD11]/10 border border-[#FFCD11]/30 text-[#FFCD11] text-xs font-bold uppercase tracking-wider mb-1">
            Cat Simulators Interactive Cockpit
          </div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Operator Training Simulation Models
          </h2>
          <p className="text-xs text-neutral-400">
            Realistic physics-based simulation scenarios, in-cab telemetry responses, and pre-shift walkaround inspection.
          </p>
        </div>

        {/* Scenario Selectors */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-md scrollbar-none">
          {scenarios.map((scen) => (
            <button
              key={scen.id}
              onClick={() => handleResetScenario(scen.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap ${
                scen.id === activeScenario.id
                  ? "bg-[#FFCD11] text-black shadow-md shadow-[#FFCD11]/20 font-black"
                  : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white"
              }`}
            >
              {scen.category}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Simulation Cockpit & Scenario Decision Engine */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          {/* Virtual In-Cab Simulator Display */}
          <div className="rounded-xl border border-neutral-800 bg-neutral-950 p-6 shadow-xl relative overflow-hidden">
            <div className="flex items-center justify-between border-b border-neutral-800/80 pb-3 mb-4">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-pulse" />
                <span className="text-xs font-mono font-bold text-neutral-300">
                  CAT SIMULATOR HUD // {activeScenario.machine_type.toUpperCase()}
                </span>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-900 border border-neutral-800 text-neutral-400">
                Difficulty: {activeScenario.difficulty}
              </span>
            </div>

            {/* Virtual Telemetry Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
              {Object.entries(activeScenario.virtual_telemetry).map(([key, val]) => (
                <div key={key} className="bg-neutral-900/80 p-2.5 rounded-lg border border-neutral-800">
                  <span className="text-[10px] uppercase text-neutral-400 font-mono block truncate">
                    {key.replace(/_/g, " ")}
                  </span>
                  <span className="text-base font-black text-[#FFCD11] font-mono mt-0.5 block">
                    {val}
                  </span>
                </div>
              ))}
            </div>

            {/* Scenario Narrative */}
            <div className="rounded-lg bg-neutral-900/60 border border-neutral-800 p-4">
              <h3 className="text-base font-extrabold text-white mb-1.5">
                {activeScenario.title}
              </h3>
              <p className="text-xs text-neutral-300 leading-relaxed">
                {activeScenario.description}
              </p>
            </div>

            {/* Operator Decision Prompt */}
            <div className="mt-5">
              <span className="text-xs font-bold text-[#FFCD11] uppercase tracking-wider block mb-3 font-mono">
                Operator Decision Required:
              </span>
              <p className="text-xs text-white font-semibold mb-3">
                {activeScenario.question}
              </p>

              {/* Options */}
              <div className="flex flex-col gap-2.5">
                {activeScenario.options.map((opt) => {
                  const isSelected = selectedOptionId === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => {
                        setSelectedOptionId(opt.id);
                        setEvalResult(null);
                      }}
                      className={`text-left p-3 rounded-lg border text-xs transition-all flex items-start gap-3 ${
                        isSelected
                          ? "bg-[#FFCD11]/15 border-[#FFCD11] text-white shadow-md shadow-[#FFCD11]/5"
                          : "bg-neutral-900/50 border-neutral-800 text-neutral-300 hover:border-neutral-700 hover:bg-neutral-900"
                      }`}
                    >
                      <span
                        className={`w-5 h-5 rounded flex items-center justify-center font-bold text-[11px] font-mono shrink-0 mt-0.5 ${
                          isSelected ? "bg-[#FFCD11] text-black" : "bg-neutral-800 text-neutral-400"
                        }`}
                      >
                        {opt.id}
                      </span>
                      <span className="leading-snug">{opt.text}</span>
                    </button>
                  );
                })}
              </div>

              {/* Action Buttons */}
              <div className="mt-5 flex items-center justify-between gap-3">
                <span className="text-[11px] text-neutral-500 font-mono">
                  {selectedOptionId ? `Selected Action: Option ${selectedOptionId}` : "Select an action choice above"}
                </span>
                <button
                  onClick={handleEvaluate}
                  disabled={!selectedOptionId || isSubmitting}
                  className="py-2 px-5 rounded-lg bg-[#FFCD11] hover:bg-[#EAA400] text-black font-extrabold text-xs transition disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#FFCD11]/20"
                >
                  {isSubmitting ? "Running Simulator Telemetry..." : "Submit to Cat Sim Evaluator"}
                </button>
              </div>
            </div>

            {/* Evaluation Result Feedback */}
            {evalResult && (
              <div
                className={`mt-5 p-4 rounded-xl border flex flex-col gap-2 transition-all ${
                  evalResult.is_correct
                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
                    : "bg-red-500/10 border-red-500/30 text-red-200"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-base">{evalResult.is_correct ? "✓" : "✗"}</span>
                    <span className="text-xs font-black uppercase tracking-wider font-mono">
                      {evalResult.certification_grade}
                    </span>
                  </div>
                  <span className="text-sm font-black font-mono">
                    Score: {evalResult.score} / 100
                  </span>
                </div>

                <p className="text-xs leading-relaxed text-white">
                  {evalResult.feedback}
                </p>

                {evalResult.cat_badge_earned && (
                  <div className="mt-2 inline-flex items-center gap-2 self-start px-2.5 py-1 rounded bg-[#FFCD11] text-black text-[10px] font-black uppercase tracking-wider shadow">
                    ★ Cat Operator Safety Qualification Badge Earned
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Col: Virtual Pre-Shift 360 Walkaround Checklist */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-bold text-[#FFCD11] uppercase tracking-wider font-mono">
                Cat Simulators Protocol
              </span>
              <span className="text-[10px] text-neutral-400 font-mono">
                {completedCount}/5 Complete
              </span>
            </div>

            <h3 className="text-base font-black text-white">
              Virtual Pre-Shift Walkaround
            </h3>
            <p className="text-xs text-neutral-400 mt-1 mb-4 leading-relaxed">
              Mandatory OSHA 1926.602 safety inspection. Completing all 5 check items adds bonus points to your Cat simulator evaluation.
            </p>

            {/* Checklist */}
            <div className="space-y-3">
              {[
                {
                  id: "fluid_leaks",
                  label: "1. Under-Machine Fluid Leaks",
                  desc: "Inspect ground beneath engine, swing drive, and final drives for oil/coolant puddles.",
                },
                {
                  id: "track_tension",
                  label: "2. Track / Tire Condition",
                  desc: "Inspect track sag, missing grousers, loose pad bolts, or sidewall gouges.",
                },
                {
                  id: "hydraulic_hoses",
                  label: "3. Hydraulic Cylinders & Lines",
                  desc: "Inspect boom and arm cylinders for chrome scoring or weeping gland seals.",
                },
                {
                  id: "horn_backup_alarm",
                  label: "4. Warning Systems & Horn",
                  desc: "Test dual horn blasts, reverse alarm, and beacon strobe operation.",
                },
                {
                  id: "mirrors_cab_glass",
                  label: "5. Cab Glass & ROPS Clearance",
                  desc: "Clean windshield, adjust camera view, and verify emergency exit path.",
                },
              ].map((item) => {
                const checked = walkaroundChecks[item.id] || false;
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleCheck(item.id)}
                    className={`p-3 rounded-lg border text-xs cursor-pointer transition flex items-start gap-3 ${
                      checked
                        ? "bg-emerald-500/10 border-emerald-500/40 text-neutral-200"
                        : "bg-neutral-950/80 border-neutral-800 text-neutral-400 hover:border-neutral-700"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => {}}
                      className="mt-0.5 rounded accent-[#FFCD11] cursor-pointer"
                    />
                    <div>
                      <span className={`font-bold block ${checked ? "text-white" : "text-neutral-300"}`}>
                        {item.label}
                      </span>
                      <span className="text-[10px] text-neutral-500 mt-0.5 block leading-normal">
                        {item.desc}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mt-5 p-3 rounded-lg bg-neutral-950 border border-neutral-800 text-center">
            <span className="text-[11px] text-neutral-400 font-mono block">
              Inspection Status:{" "}
              <strong className={completedCount === 5 ? "text-emerald-400" : "text-amber-400"}>
                {completedCount === 5 ? "All 5 Checks Verified" : `${5 - completedCount} Checks Pending`}
              </strong>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
