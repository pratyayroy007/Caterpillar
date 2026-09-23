"use client";

import { MachineDigitalTwin } from "@/types";

interface DigitalTwinProps {
  machine: MachineDigitalTwin | null;
  allMachines: MachineDigitalTwin[];
  onSelectMachine: (id: string) => void;
  onAskCopilot: (query: string) => void;
}

export function DigitalTwin({
  machine,
  allMachines,
  onSelectMachine,
  onAskCopilot,
}: DigitalTwinProps) {
  if (!machine) {
    return (
      <div className="p-8 text-center text-neutral-400 animate-pulse">
        Loading Machine Digital Twin profile...
      </div>
    );
  }

  // Get technical machine specs based on type
  const getMachineSpecs = (type: string) => {
    switch (type.toLowerCase()) {
      case "excavator":
        return {
          model: "Cat 320 Next Gen",
          rated_power: "174 hp (129 kW)",
          operating_weight: "22,500 kg",
          hydraulic_capacity: "3,500 psi (241 bar)",
          standard_bucket: "1.19 m³",
        };
      case "bulldozer":
        return {
          model: "Cat D6 Track-Type Tractor",
          rated_power: "215 hp (161 kW)",
          operating_weight: "22,900 kg",
          blade_capacity: "3.8 m³ Semi-Universal",
          transmission: "4-Speed Fully Automatic",
        };
      case "motor grader":
        return {
          model: "Cat 140 Motor Grader",
          rated_power: "198 hp (148 kW)",
          moldboard_width: "3.7 m (12 ft)",
          articulation_angle: "20 degrees",
          blade_pull: "21,800 kg",
        };
      case "wheel loader":
        return {
          model: "Cat 950M Medium Wheel Loader",
          rated_power: "250 hp (186 kW)",
          operating_weight: "19,200 kg",
          breakout_force: "181 kN",
          payload_rating: "5,400 kg",
        };
      default:
        return {
          model: "Cat 420F2 Center Pivot",
          rated_power: "93 hp (69 kW)",
          dig_depth: "4.36 m (14.3 ft)",
          loader_capacity: "1.0 m³",
          pump_flow: "160 L/min",
        };
    }
  };

  const specs = getMachineSpecs(machine.machine_type);

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-neutral-800 pb-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded bg-[#FFCD11]/10 border border-[#FFCD11]/30 text-[#FFCD11] text-xs font-bold uppercase tracking-wider mb-1">
            Live Machine Digital Twin
          </div>
          <h2 className="text-xl font-black text-white tracking-tight flex items-center gap-3">
            <span>{machine.machine_id}</span>
            <span className="text-sm font-semibold text-neutral-400">({machine.machine_type})</span>
          </h2>
          <p className="text-xs text-neutral-400">
            Deployed at <strong className="text-white">{machine.current_site_location}</strong> ({machine.current_site_id}) • Operator: <strong className="text-white">{machine.current_operator_id}</strong>
          </p>
        </div>

        {/* Machine Quick Select Pill Bar */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-md scrollbar-none">
          {allMachines.map((m) => (
            <button
              key={m.machine_id}
              onClick={() => onSelectMachine(m.machine_id)}
              className={`px-2.5 py-1 rounded text-xs font-mono font-bold transition whitespace-nowrap ${
                m.machine_id === machine.machine_id
                  ? "bg-[#FFCD11] text-black shadow-md shadow-[#FFCD11]/20"
                  : "bg-neutral-900 text-neutral-400 border border-neutral-800 hover:text-white"
              }`}
            >
              {m.machine_id}
            </button>
          ))}
        </div>
      </div>

      {/* Triple Composite Radial Metric Strip (Health %, Utilization %, Safety Compliance %) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Health % */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs font-bold uppercase text-neutral-400 block">Machine Health</span>
            <div className="text-3xl font-black text-white font-mono mt-1">
              {machine.health_score}%
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold block mt-1">
              {machine.health_score >= 80 ? "Optimal Operational Condition" : "Flagged for Inspection"}
            </span>
          </div>
          <div className="w-14 h-14 rounded-full border-4 border-neutral-800 border-t-[#FFCD11] border-r-[#FFCD11] flex items-center justify-center font-mono text-xs font-bold text-white">
            {machine.health_score > 85 ? "A" : "B"}
          </div>
        </div>

        {/* Utilization Rate % */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs font-bold uppercase text-neutral-400 block">Fleet Utilization</span>
            <div className="text-3xl font-black text-white font-mono mt-1">
              {machine.utilization_rate}%
            </div>
            <span className="text-[11px] text-neutral-400 block mt-1">
              Avg Idle: <strong className="text-white">{machine.avg_idling_time_min}m</strong> / task
            </span>
          </div>
          <div className="w-14 h-14 rounded-full border-4 border-neutral-800 border-t-sky-400 border-r-sky-400 flex items-center justify-center font-mono text-xs font-bold text-white">
            UTL
          </div>
        </div>

        {/* Safety Compliance % */}
        <div className="rounded-xl border border-neutral-800 bg-neutral-900/60 p-5 flex items-center justify-between shadow-md">
          <div>
            <span className="text-xs font-bold uppercase text-neutral-400 block">Safety Compliance</span>
            <div className="text-3xl font-black text-white font-mono mt-1">
              {machine.safety_compliance}%
            </div>
            <span className="text-[11px] text-emerald-400 font-semibold block mt-1">
              Seatbelt & ROPS Integrity
            </span>
          </div>
          <div className="w-14 h-14 rounded-full border-4 border-neutral-800 border-t-emerald-400 border-r-emerald-400 flex items-center justify-center font-mono text-xs font-bold text-white">
            SAFE
          </div>
        </div>
      </div>

      {/* Main Spec & Live Telemetry Dials */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Machine Specification & Technical Profile */}
        <div className="rounded-xl border border-neutral-800 bg-gradient-to-b from-neutral-900 to-neutral-950 p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4">
              <span className="text-xs font-bold text-[#FFCD11] uppercase tracking-wider font-mono">
                Cat Equipment Spec
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-neutral-800 text-neutral-300">
                Age: {machine.machine_age_years} yrs
              </span>
            </div>
            <h3 className="text-lg font-black text-white">{specs.model}</h3>
            <p className="text-xs text-neutral-400 mt-1">
              Heavy machinery digital twin profile synced from continuous CAN-bus telemetry.
            </p>

            <div className="mt-5 space-y-2.5 text-xs">
              <div className="flex justify-between py-1.5 border-b border-neutral-800/80">
                <span className="text-neutral-400">Rated Net Power:</span>
                <span className="font-mono font-bold text-white">{specs.rated_power}</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/80">
                <span className="text-neutral-400">Total Shift Tasks:</span>
                <span className="font-mono font-bold text-white">{machine.total_tasks_completed} tasks</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/80">
                <span className="text-neutral-400">Avg Productivity Score:</span>
                <span className="font-mono font-bold text-[#FFCD11]">{machine.avg_productivity_score} / 100</span>
              </div>
              <div className="flex justify-between py-1.5 border-b border-neutral-800/80">
                <span className="text-neutral-400">Last Task Completed:</span>
                <span className="font-mono font-bold text-white">{machine.last_task.task_type}</span>
              </div>
            </div>
          </div>

          {/* Quick Action Button to Copilot */}
          <button
            onClick={() => onAskCopilot(`Provide full digital twin diagnostic for machine ${machine.machine_id}`)}
            className="mt-6 w-full py-2.5 px-4 rounded-lg bg-neutral-900 border border-neutral-800 hover:border-[#FFCD11] text-xs font-bold text-white hover:text-[#FFCD11] transition flex items-center justify-center gap-2"
          >
            <span>Ask Cat Copilot About {machine.machine_id}</span>
            <span>→</span>
          </button>
        </div>

        {/* Live Telemetry Gauges (4 Sensor Dials) */}
        <div className="lg:col-span-2 rounded-xl border border-neutral-800 bg-neutral-900/60 p-6 flex flex-col justify-between shadow-lg">
          <div>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">
                Live Sensor Telemetry Dials
              </h3>
              <span className="text-xs text-neutral-400 font-mono">Rolling Average</span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Engine Temp Dial */}
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase">Engine Temp</span>
                <div className="my-2">
                  <span className="text-2xl font-black text-white font-mono">{machine.avg_engine_temp_c}</span>
                  <span className="text-xs text-neutral-400"> °C</span>
                </div>
                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${machine.avg_engine_temp_c > 95 ? "bg-red-500" : "bg-emerald-500"}`}
                    style={{ width: `${Math.min(100, (machine.avg_engine_temp_c / 120) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-neutral-500 mt-1">Target &lt; 95°C</span>
              </div>

              {/* Hydraulic Pressure Dial */}
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase">Hydraulics</span>
                <div className="my-2">
                  <span className="text-2xl font-black text-white font-mono">{machine.avg_hydraulic_psi}</span>
                  <span className="text-xs text-neutral-400"> psi</span>
                </div>
                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${machine.avg_hydraulic_psi > 2800 ? "bg-amber-500" : "bg-sky-400"}`}
                    style={{ width: `${Math.min(100, (machine.avg_hydraulic_psi / 3500) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-neutral-500 mt-1">Relief 3,200 psi</span>
              </div>

              {/* Vibration Index */}
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase">Vibration</span>
                <div className="my-2">
                  <span className="text-2xl font-black text-white font-mono">{machine.avg_vibration_level}</span>
                  <span className="text-xs text-neutral-400"> G-idx</span>
                </div>
                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${machine.avg_vibration_level > 4.0 ? "bg-red-500" : "bg-emerald-400"}`}
                    style={{ width: `${Math.min(100, (machine.avg_vibration_level / 6.0) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-neutral-500 mt-1">Normal &lt; 3.5</span>
              </div>

              {/* Fuel Burn Rate */}
              <div className="bg-neutral-950 p-4 rounded-xl border border-neutral-800 flex flex-col justify-between">
                <span className="text-[11px] font-bold text-neutral-400 uppercase">Fuel Burn</span>
                <div className="my-2">
                  <span className="text-2xl font-black text-[#FFCD11] font-mono">{machine.avg_fuel_efficiency_l_hr}</span>
                  <span className="text-xs text-neutral-400"> L/hr</span>
                </div>
                <div className="w-full bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#FFCD11]"
                    style={{ width: `${Math.min(100, (machine.avg_fuel_efficiency_l_hr / 15.0) * 100)}%` }}
                  />
                </div>
                <span className="text-[10px] text-neutral-500 mt-1">CAT Eco Baseline</span>
              </div>
            </div>

            {/* Recent Telemetry Log Table */}
            <div className="mt-5">
              <span className="text-xs font-bold text-neutral-400 uppercase tracking-wider block mb-2">
                Recent Shift Telemetry Cycle
              </span>
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs text-neutral-300">
                  <thead className="bg-neutral-950/80 text-[10px] uppercase text-neutral-400 border-b border-neutral-800">
                    <tr>
                      <th className="py-2 px-3">Time</th>
                      <th className="py-2 px-2">Temp (°C)</th>
                      <th className="py-2 px-2">Pressure (psi)</th>
                      <th className="py-2 px-2">Vibration</th>
                      <th className="py-2 px-2">Burn (L/h)</th>
                      <th className="py-2 px-2">Idle (min)</th>
                      <th className="py-2 px-2">Prod Score</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-800/60 font-mono">
                    {machine.telemetry_recent.slice(-5).map((point, i) => (
                      <tr key={i} className="hover:bg-neutral-800/30">
                        <td className="py-2 px-3 font-sans text-neutral-400">{point.timestamp}</td>
                        <td className={`py-2 px-2 ${point.engine_temp > 95 ? "text-red-400 font-bold" : ""}`}>
                          {point.engine_temp}
                        </td>
                        <td className="py-2 px-2">{point.hydraulic_psi}</td>
                        <td className="py-2 px-2">{point.vibration}</td>
                        <td className="py-2 px-2 text-[#FFCD11]">{point.fuel_burn}</td>
                        <td className="py-2 px-2">{point.idle_min}m</td>
                        <td className="py-2 px-2 text-emerald-400">{point.productivity}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
