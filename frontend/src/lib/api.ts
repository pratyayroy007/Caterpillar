/**
 * Typed API client for Smart Operator Assistant for CAT Machinery
 */

import {
  MachineDigitalTwin,
  SafetyOverview,
  SafetyProtocolItem,
  FleetAnalytics,
  SimScenario,
  SimEvaluationResult,
  CopilotResponse,
} from "@/types";

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8001";

export interface HealthResponse {
  status: string;
}

export async function apiFetch<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;

  const headers: HeadersInit = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
  };

  try {
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status} (${res.statusText})`);
    }

    return (await res.json()) as T;
  } catch (error) {
    if (error instanceof Error) {
      throw error;
    }
    throw new Error("An unknown error occurred while contacting the backend API.");
  }
}

// Health Check
export async function checkHealth(): Promise<HealthResponse> {
  return apiFetch<HealthResponse>("/api/health");
}

// Module 7: Machine Digital Twin
export async function fetchMachines(): Promise<MachineDigitalTwin[]> {
  return apiFetch<MachineDigitalTwin[]>("/api/machines");
}

export async function fetchMachineDigitalTwin(machineId: string): Promise<MachineDigitalTwin> {
  return apiFetch<MachineDigitalTwin>(`/api/machines/${machineId}`);
}

// Module 2: Safety Center
export async function fetchSafetyOverview(machineId?: string): Promise<SafetyOverview> {
  const q = machineId ? `?machine_id=${encodeURIComponent(machineId)}` : "";
  return apiFetch<SafetyOverview>(`/api/safety${q}`);
}

export async function fetchSafetyProtocols(): Promise<{ protocols: SafetyProtocolItem[] }> {
  return apiFetch<{ protocols: SafetyProtocolItem[] }>("/api/safety/protocols");
}

// Module 8: Fleet Analytics & Sustainability
export async function fetchFleetAnalytics(): Promise<FleetAnalytics> {
  return apiFetch<FleetAnalytics>("/api/analytics/fleet");
}

// Cat Training Simulation
export async function fetchSimScenarios(): Promise<SimScenario[]> {
  return apiFetch<SimScenario[]>("/api/simulation/scenarios");
}

export async function evaluateSimulation(
  scenarioId: string,
  selectedOptionId: string,
  inspectionChecks: string[] = []
): Promise<SimEvaluationResult> {
  return apiFetch<SimEvaluationResult>("/api/simulation/evaluate", {
    method: "POST",
    body: JSON.stringify({
      scenario_id: scenarioId,
      selected_option_id: selectedOptionId,
      inspection_checks: inspectionChecks,
    }),
  });
}

// Module 6: Grounded AI Copilot
export async function sendCopilotMessage(
  query: string,
  machineId?: string
): Promise<CopilotResponse> {
  return apiFetch<CopilotResponse>("/api/copilot/chat", {
    method: "POST",
    body: JSON.stringify({
      query,
      machine_id: machineId || null,
    }),
  });
}

export default {
  apiFetch,
  checkHealth,
  fetchMachines,
  fetchMachineDigitalTwin,
  fetchSafetyOverview,
  fetchSafetyProtocols,
  fetchFleetAnalytics,
  fetchSimScenarios,
  evaluateSimulation,
  sendCopilotMessage,
  API_BASE_URL,
};
