"use client";

import { useEffect, useState, useCallback } from "react";
import {
  MachineDigitalTwin,
  SafetyOverview,
  SafetyProtocolItem,
  FleetAnalytics as FleetAnalyticsType,
  SimScenario,
} from "@/types";
import {
  checkHealth,
  fetchMachines,
  fetchMachineDigitalTwin,
  fetchSafetyOverview,
  fetchSafetyProtocols,
  fetchFleetAnalytics,
  fetchSimScenarios,
} from "@/lib/api";
import { Navbar } from "@/components/layout/Navbar";
import { SafetyCenter } from "@/components/safety/SafetyCenter";
import { DigitalTwin } from "@/components/digital-twin/DigitalTwin";
import { FleetAnalytics } from "@/components/analytics/FleetAnalytics";
import { TrainingSimulation } from "@/components/simulation/TrainingSimulation";
import { CopilotDrawer } from "@/components/copilot/CopilotDrawer";

export default function Home() {
  const [backendStatus, setBackendStatus] = useState<"loading" | "ok" | "down">("loading");
  const [machines, setMachines] = useState<MachineDigitalTwin[]>([]);
  const [selectedMachineId, setSelectedMachineId] = useState<string>("EXC001");
  const [activeMachineTwin, setActiveMachineTwin] = useState<MachineDigitalTwin | null>(null);

  const [activeTab, setActiveTab] = useState<string>("safety");
  const [safetyData, setSafetyData] = useState<SafetyOverview | null>(null);
  const [protocols, setProtocols] = useState<SafetyProtocolItem[]>([]);
  const [fleetData, setFleetData] = useState<FleetAnalyticsType | null>(null);
  const [simScenarios, setSimScenarios] = useState<SimScenario[]>([]);

  const [copilotOpen, setCopilotOpen] = useState<boolean>(false);
  const [initialCopilotQuery, setInitialCopilotQuery] = useState<string | null>(null);

  // Load backend data
  const loadData = useCallback(async () => {
    setBackendStatus("loading");
    try {
      const health = await checkHealth();
      if (health.status === "ok") {
        setBackendStatus("ok");
      } else {
        setBackendStatus("down");
      }

      // Fetch all fleet data in parallel
      const [mList, sOverview, sProtocols, fAnalytics, scenarios] = await Promise.all([
        fetchMachines(),
        fetchSafetyOverview(selectedMachineId),
        fetchSafetyProtocols(),
        fetchFleetAnalytics(),
        fetchSimScenarios(),
      ]);

      setMachines(mList);
      if (mList.length > 0 && !selectedMachineId) {
        setSelectedMachineId(mList[0].machine_id);
      }
      setSafetyData(sOverview);
      setProtocols(sProtocols.protocols || []);
      setFleetData(fAnalytics);
      setSimScenarios(scenarios);
    } catch (err) {
      console.error("Failed to load initial data", err);
      setBackendStatus("down");
    }
  }, [selectedMachineId]);

  // Load specific machine twin when selectedMachineId changes
  useEffect(() => {
    if (!selectedMachineId) return;

    fetchMachineDigitalTwin(selectedMachineId)
      .then((twin) => setActiveMachineTwin(twin))
      .catch((err) => console.error("Error fetching machine twin", err));

    fetchSafetyOverview(selectedMachineId)
      .then((s) => setSafetyData(s))
      .catch((err) => console.error("Error updating safety for machine", err));
  }, [selectedMachineId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleAskCopilot = (query: string) => {
    setInitialCopilotQuery(query);
    setCopilotOpen(true);
  };

  return (
    <div className="min-h-screen bg-neutral-950 text-neutral-100 flex flex-col font-sans">
      {/* Top Industrial Navbar */}
      <Navbar
        machines={machines}
        selectedMachineId={selectedMachineId}
        onSelectMachine={setSelectedMachineId}
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        backendStatus={backendStatus}
        onRefresh={loadData}
        copilotOpen={copilotOpen}
        onToggleCopilot={() => setCopilotOpen(!copilotOpen)}
      />

      {/* Main Workspace Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 md:p-8">
        {/* Module 2: Safety Center */}
        {activeTab === "safety" && (
          <SafetyCenter
            data={safetyData}
            protocols={protocols}
            selectedMachineId={selectedMachineId}
          />
        )}

        {/* Module 7: Machine Digital Twin */}
        {activeTab === "twin" && (
          <DigitalTwin
            machine={activeMachineTwin}
            allMachines={machines}
            onSelectMachine={setSelectedMachineId}
            onAskCopilot={handleAskCopilot}
          />
        )}

        {/* Module 8: Fleet Analytics & Sustainability */}
        {activeTab === "analytics" && (
          <FleetAnalytics
            data={fleetData}
            onSelectMachine={(id) => {
              setSelectedMachineId(id);
              setActiveTab("twin");
            }}
            onAskCopilot={handleAskCopilot}
          />
        )}


        {/* Cat Training Simulation Models */}
        {activeTab === "simulation" && (
          <TrainingSimulation scenarios={simScenarios} />
        )}
      </main>

      {/* Grounded AI Copilot Drawer */}
      <CopilotDrawer
        isOpen={copilotOpen}
        onClose={() => setCopilotOpen(false)}
        selectedMachineId={selectedMachineId}
      />

      {/* Footer */}
      <footer className="border-t border-neutral-900 bg-neutral-950 py-4 px-6 text-center text-xs text-neutral-500 flex flex-col sm:flex-row items-center justify-between gap-2 max-w-7xl mx-auto w-full">
        <span>Smart Operator Assistant for CAT Machinery &bull; Autonomous Hackathon Suite</span>
        <span className="font-mono text-[11px] text-neutral-400">
          Powered by FastAPI &bull; Next.js &bull; Cat Simulators Engine
        </span>
      </footer>
    </div>
  );
}
