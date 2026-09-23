"""Dataset Service: Loads, processes, and aggregates the 1,000-row synthetic operator dataset.
Provides data for Machine Digital Twins, Safety Center, Fleet Analytics, and Sustainability metrics.
"""

import os
from typing import Any, Dict, List, Optional
import pandas as pd

CANDIDATE_PATHS = [
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "data", "synthetic_operator_dataset_1000.csv"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))), "synthetic_operator_dataset_1000.csv"),
    os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "data", "synthetic_operator_dataset_1000.csv"),
    r"c:\Users\praty\Desktop\Caterpillar\data\synthetic_operator_dataset_1000.csv",
    r"c:\Users\praty\Desktop\Caterpillar\synthetic_operator_dataset_1000.csv",
]



class DatasetService:
    def __init__(self):
        self.df: pd.DataFrame = self._load_data()
        self.machines_cache: Dict[str, Dict[str, Any]] = {}
        self._precompute()

    def _load_data(self) -> pd.DataFrame:
        path_to_use = None
        for p in CANDIDATE_PATHS:
            if os.path.exists(p):
                path_to_use = p
                break

        if not path_to_use:
            raise FileNotFoundError(f"Dataset CSV not found in any of: {CANDIDATE_PATHS}")

        df = pd.read_csv(path_to_use)
        df["Timestamp"] = pd.to_datetime(df["Timestamp"])
        df["Task_Start_Time"] = pd.to_datetime(df["Task_Start_Time"])
        df["Task_End_Time"] = pd.to_datetime(df["Task_End_Time"])
        return df


    def _precompute(self):
        # Calculate machine profiles
        machine_ids = sorted(self.df["Machine_ID"].unique())
        for m_id in machine_ids:
            m_df = self.df[self.df["Machine_ID"] == m_id].sort_values("Timestamp")
            latest_record = m_df.iloc[-1].to_dict()

            # Health calculation: starts at 100%, penalized by alerts, downtime, temperature, vibration
            total_records = len(m_df)
            safety_alerts = len(m_df[m_df["Safety_Alert_Triggered"] == "Yes"])
            maint_alerts = len(m_df[m_df["Maintenance_Alert"] == "Yes"])
            avg_temp = float(m_df["Engine_Temperature_C"].mean())
            avg_vib = float(m_df["Vibration_Level"].mean())
            avg_psi = float(m_df["Hydraulic_Pressure_psi"].mean())
            avg_idle = float(m_df["Idling_Time_min"].mean())
            avg_fuel = float(m_df["Fuel_Efficiency_L_per_hr"].mean())
            avg_productivity = float(m_df["Productivity_Score"].mean())

            # Composite Health Score (0 - 100)
            penalty = (safety_alerts * 3.5) + (maint_alerts * 5.0) + (max(0, avg_temp - 95.0) * 1.2) + (max(0, avg_vib - 3.5) * 4.0)
            health_score = max(55.0, min(99.5, 100.0 - penalty))

            # Utilization % (working vs idle time)
            total_task_time = m_df["Task_Duration_min"].sum()
            total_idle_time = m_df["Idling_Time_min"].sum()
            utilization_rate = max(45.0, min(96.0, (total_task_time / (total_task_time + total_idle_time + 1e-5)) * 100.0))

            # Safety compliance % (records with fastened seatbelt and no alerts)
            fastened = len(m_df[m_df["Seatbelt_Status"] == "Fastened"])
            safety_compliance = (fastened / total_records) * 100.0

            self.machines_cache[m_id] = {
                "machine_id": m_id,
                "machine_type": latest_record["Machine_Type"],
                "machine_age_years": float(latest_record["Machine_Age_Years"]),
                "current_site_id": latest_record["Site_ID"],
                "current_site_location": latest_record["Site_Location"],
                "current_operator_id": latest_record["Operator_ID"],
                "health_score": round(health_score, 1),
                "utilization_rate": round(utilization_rate, 1),
                "safety_compliance": round(safety_compliance, 1),
                "avg_engine_temp_c": round(avg_temp, 1),
                "avg_vibration_level": round(avg_vib, 2),
                "avg_hydraulic_psi": round(avg_psi, 1),
                "avg_fuel_efficiency_l_hr": round(avg_fuel, 2),
                "avg_idling_time_min": round(avg_idle, 1),
                "avg_productivity_score": round(avg_productivity, 1),
                "total_tasks_completed": total_records,
                "last_task": {
                    "task_type": latest_record["Task_Type"],
                    "timestamp": latest_record["Timestamp"].strftime("%Y-%m-%d %H:%M"),
                    "duration_min": float(latest_record["Task_Duration_min"]),
                    "fuel_used_l": float(latest_record["Fuel_Used_L"]),
                    "productivity_score": float(latest_record["Productivity_Score"]),
                    "safety_alert": latest_record["Safety_Alert_Triggered"],
                    "weather": latest_record["Weather_Condition"],
                    "terrain": latest_record["Terrain_Type"],
                },
                "telemetry_recent": [
                    {
                        "timestamp": row["Timestamp"].strftime("%m/%d %H:%M"),
                        "engine_temp": round(float(row["Engine_Temperature_C"]), 1),
                        "hydraulic_psi": round(float(row["Hydraulic_Pressure_psi"]), 1),
                        "vibration": round(float(row["Vibration_Level"]), 2),
                        "fuel_burn": round(float(row["Fuel_Efficiency_L_per_hr"]), 2),
                        "idle_min": int(row["Idling_Time_min"]),
                        "productivity": round(float(row["Productivity_Score"]), 1),
                    }
                    for _, row in m_df.tail(12).iterrows()
                ],
            }

    def get_all_machines(self) -> List[Dict[str, Any]]:
        return list(self.machines_cache.values())

    def get_machine_digital_twin(self, machine_id: str) -> Optional[Dict[str, Any]]:
        return self.machines_cache.get(machine_id)

    def get_safety_summary(self, machine_id: Optional[str] = None) -> Dict[str, Any]:
        df = self.df if not machine_id else self.df[self.df["Machine_ID"] == machine_id]
        latest = df.iloc[-1].to_dict()

        total = len(df)
        unfastened = len(df[df["Seatbelt_Status"] == "Unfastened"])
        fatigue_alerts = len(df[df["Fatigue_Alert"] == "Yes"])
        harsh_braking_total = int(df["Harsh_Braking_Events"].sum())
        overspeed_total = int(df["Overspeed_Events"].sum())
        safety_alerts = len(df[df["Safety_Alert_Triggered"] == "Yes"])

        # Safety Risk Score: 0 = Ideal safe, 100 = Critical Danger
        risk_score = min(
            98.0,
            round(
                (unfastened / total * 40.0)
                + (fatigue_alerts / total * 30.0)
                + (min(harsh_braking_total, 100) * 0.15)
                + (min(overspeed_total, 100) * 0.20),
                1,
            ),
        )

        risk_level = "LOW" if risk_score < 25 else "MODERATE" if risk_score < 60 else "CRITICAL"

        # Auto-logged incident records
        incident_rows = df[
            (df["Safety_Alert_Triggered"] == "Yes")
            | (df["Seatbelt_Status"] == "Unfastened")
            | (df["Harsh_Braking_Events"] > 1)
            | (df["Overspeed_Events"] > 1)
        ].sort_values("Timestamp", ascending=False).head(20)

        incidents = []
        for _, row in incident_rows.iterrows():
            incidents.append({
                "record_id": int(row["Record_ID"]),
                "timestamp": row["Timestamp"].strftime("%Y-%m-%d %H:%M"),
                "machine_id": row["Machine_ID"],
                "machine_type": row["Machine_Type"],
                "operator_id": row["Operator_ID"],
                "site_location": row["Site_Location"],
                "shift": row["Shift"],
                "task_type": row["Task_Type"],
                "seatbelt": row["Seatbelt_Status"],
                "fatigue": row["Fatigue_Alert"],
                "harsh_braking": int(row["Harsh_Braking_Events"]),
                "overspeed": int(row["Overspeed_Events"]),
                "severity": "HIGH" if row["Safety_Alert_Triggered"] == "Yes" or row["Seatbelt_Status"] == "Unfastened" else "MEDIUM",
            })

        return {
            "safety_risk_score": risk_score,
            "risk_level": risk_level,
            "current_status": {
                "seatbelt_status": latest["Seatbelt_Status"],
                "fatigue_alert": latest["Fatigue_Alert"],
                "harsh_braking_recent": int(latest["Harsh_Braking_Events"]),
                "overspeed_recent": int(latest["Overspeed_Events"]),
                "simulated_proximity_distance_m": 4.2,  # Cat Sim sensor default
                "proximity_warning": "PERSONNEL_IN_SWING_RADIUS",
            },
            "aggregate_stats": {
                "total_records_analyzed": total,
                "total_incidents_logged": len(incident_rows),
                "unfastened_rate_pct": round((unfastened / total) * 100.0, 1),
                "fatigue_rate_pct": round((fatigue_alerts / total) * 100.0, 1),
            },
            "incidents_timeline": incidents,
        }

    def get_fleet_analytics(self) -> Dict[str, Any]:
        # Fuel efficiency by machine type
        fuel_by_type = (
            self.df.groupby("Machine_Type")["Fuel_Efficiency_L_per_hr"]
            .mean()
            .round(2)
            .reset_index()
            .to_dict(orient="records")
        )

        # Idling trend by site
        idle_by_site = (
            self.df.groupby("Site_Location")["Idling_Time_min"]
            .mean()
            .round(1)
            .reset_index()
            .to_dict(orient="records")
        )

        # Safety alerts by shift
        alerts_by_shift = (
            self.df[self.df["Safety_Alert_Triggered"] == "Yes"]
            .groupby("Shift")["Record_ID"]
            .count()
            .reset_index()
            .rename(columns={"Record_ID": "alert_count"})
            .to_dict(orient="records")
        )

        # Caterpillar 2030 Sustainability Target Metrics
        # Diesel burned produces ~2.68 kg CO2 per liter
        total_fuel_l = float(self.df["Fuel_Used_L"].sum())
        # Average idle fuel burn estimate: ~3.5 L/hr during idling
        total_idle_hours = float(self.df["Idling_Time_min"].sum()) / 60.0
        wasted_idle_fuel_l = round(total_idle_hours * 3.2, 1)
        total_co2_kg = round(total_fuel_l * 2.68, 1)
        wasted_co2_kg = round(wasted_idle_fuel_l * 2.68, 1)
        # 30% reduction potential (CAT 2030 corporate goal)
        potential_co2_saved_kg = round(wasted_co2_kg * 0.30, 1)

        # Machine names mapping
        cat_model_names = {
            "Excavator": "Cat 320 Next Gen Excavator",
            "Bulldozer": "Cat D6 Track-Type Tractor",
            "Motor Grader": "Cat 140 Motor Grader",
            "Wheel Loader": "Cat 950M Wheel Loader",
            "Backhoe Loader": "Cat 420F2 Backhoe Loader",
        }

        # Detailed Fleet Issues by specific Machine Name & ID
        fleet_issues = []
        for m_id, m_data in self.machines_cache.items():
            issues_found = []
            severity = "MEDIUM"

            if m_data["avg_idling_time_min"] > 25.0:
                issues_found.append(f"Excessive Idling ({m_data['avg_idling_time_min']}m/task vs 15m benchmark)")
                severity = "HIGH"

            if m_data["safety_compliance"] < 80.0:
                issues_found.append(f"Low Seatbelt Compliance ({m_data['safety_compliance']}% fastened)")
                severity = "CRITICAL"

            if m_data["avg_engine_temp_c"] > 94.0:
                issues_found.append(f"Thermal Elevation ({m_data['avg_engine_temp_c']} °C avg)")
                severity = "HIGH"

            if m_data["avg_hydraulic_psi"] > 2600.0:
                issues_found.append(f"High Hydraulic Load ({m_data['avg_hydraulic_psi']} psi)")

            if m_data["health_score"] < 70.0:
                severity = "CRITICAL"

            if issues_found:
                model_name = cat_model_names.get(m_data["machine_type"], f"Cat {m_data['machine_type']}")
                fleet_issues.append({
                    "machine_id": m_id,
                    "machine_name": f"{model_name} [{m_id}]",
                    "machine_type": m_data["machine_type"],
                    "site_location": m_data["current_site_location"],
                    "current_operator": m_data["current_operator_id"],
                    "health_score": m_data["health_score"],
                    "severity": severity,
                    "primary_issues": issues_found,
                    "avg_idle_min": m_data["avg_idling_time_min"],
                    "safety_compliance_pct": m_data["safety_compliance"],
                    "recommended_action": (
                        "Mandate Cat AOD auto-shutdown & inspect hydraulic line relief"
                        if "Idling" in str(issues_found)
                        else "Initiate in-cab seatbelt compliance review and operator coaching"
                    ),
                })

        # Sort by severity (CRITICAL first, then HIGH, then MEDIUM)
        severity_order = {"CRITICAL": 0, "HIGH": 1, "MEDIUM": 2}
        fleet_issues.sort(key=lambda x: (severity_order.get(x["severity"], 3), -x["avg_idle_min"]))

        return {
            "fuel_by_machine_type": fuel_by_type,
            "idle_by_site": idle_by_site,
            "alerts_by_shift": alerts_by_shift,
            "fleet_issues": fleet_issues,
            "sustainability_2030": {
                "total_fuel_consumed_l": round(total_fuel_l, 1),
                "total_co2_emissions_kg": total_co2_kg,
                "idle_fuel_waste_l": wasted_idle_fuel_l,
                "idle_co2_emissions_kg": wasted_co2_kg,
                "target_reduction_pct": 30.0,
                "projected_co2_cut_kg": potential_co2_saved_kg,
                "cat_goal_description": "Caterpillar 2030 Goal: 30% reduction in Scope 1+2 GHG emissions from 2018 baseline.",
            },
        }



# Singleton instance
dataset_service = DatasetService()
