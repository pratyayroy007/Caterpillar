export interface TelemetryPoint {
  timestamp: string;
  engine_temp: number;
  hydraulic_psi: number;
  vibration: number;
  fuel_burn: number;
  idle_min: number;
  productivity: number;
}

export interface LastTaskInfo {
  task_type: string;
  timestamp: string;
  duration_min: number;
  fuel_used_l: number;
  productivity_score: number;
  safety_alert: string;
  weather: string;
  terrain: string;
}

export interface MachineDigitalTwin {
  machine_id: string;
  machine_type: string;
  machine_age_years: number;
  current_site_id: string;
  current_site_location: string;
  current_operator_id: string;
  health_score: number;
  utilization_rate: number;
  safety_compliance: number;
  avg_engine_temp_c: number;
  avg_vibration_level: number;
  avg_hydraulic_psi: number;
  avg_fuel_efficiency_l_hr: number;
  avg_idling_time_min: number;
  avg_productivity_score: number;
  total_tasks_completed: number;
  last_task: LastTaskInfo;
  telemetry_recent: TelemetryPoint[];
}

export interface SafetyIncident {
  record_id: number;
  timestamp: string;
  machine_id: string;
  machine_type: string;
  operator_id: string;
  site_location: string;
  shift: string;
  task_type: string;
  seatbelt: string;
  fatigue: string;
  harsh_braking: number;
  overspeed: number;
  severity: "HIGH" | "MEDIUM" | "LOW";
}

export interface SafetyOverview {
  safety_risk_score: number;
  risk_level: "LOW" | "MODERATE" | "CRITICAL";
  current_status: {
    seatbelt_status: string;
    fatigue_alert: string;
    harsh_braking_recent: number;
    overspeed_recent: number;
    simulated_proximity_distance_m: number;
    proximity_warning: string;
  };
  aggregate_stats: {
    total_records_analyzed: number;
    total_incidents_logged: number;
    unfastened_rate_pct: number;
    fatigue_rate_pct: number;
  };
  incidents_timeline: SafetyIncident[];
}

export interface SafetyProtocolItem {
  id: string;
  title: string;
  category: string;
  summary: string;
  checklist: string[];
}

export interface MachineFuelStat {
  Machine_Type: string;
  Fuel_Efficiency_L_per_hr: number;
}

export interface SiteIdleStat {
  Site_Location: string;
  Idling_Time_min: number;
}

export interface ShiftAlertStat {
  Shift: string;
  alert_count: number;
}

export interface SustainabilityMetrics {
  total_fuel_consumed_l: number;
  total_co2_emissions_kg: number;
  idle_fuel_waste_l: number;
  idle_co2_emissions_kg: number;
  target_reduction_pct: number;
  projected_co2_cut_kg: number;
  cat_goal_description: string;
}

export interface FleetIssue {
  machine_id: string;
  machine_name: string;
  machine_type: string;
  site_location: string;
  current_operator: string;
  health_score: number;
  severity: "CRITICAL" | "HIGH" | "MEDIUM";
  primary_issues: string[];
  avg_idle_min: number;
  safety_compliance_pct: number;
  recommended_action: string;
}

export interface FleetAnalytics {
  fuel_by_machine_type: MachineFuelStat[];
  idle_by_site: SiteIdleStat[];
  alerts_by_shift: ShiftAlertStat[];
  fleet_issues: FleetIssue[];
  sustainability_2030: SustainabilityMetrics;
}


export interface SimOption {
  id: string;
  text: string;
  is_correct: boolean;
  feedback: string;
}

export interface SimScenario {
  id: string;
  title: string;
  machine_type: string;
  difficulty: string;
  category: string;
  description: string;
  virtual_telemetry: Record<string, number | string>;
  question: string;
  options: SimOption[];
}

export interface SimEvaluationResult {
  scenario_id: string;
  is_correct: boolean;
  feedback: string;
  score: number;
  certification_grade: string;
  cat_badge_earned: boolean;
}

export interface CopilotResponse {
  query: string;
  machine_id: string | null;
  response: string;
  context_tags: string[];
  action_recommendation: string;
  matching_sim_module: string;
}
