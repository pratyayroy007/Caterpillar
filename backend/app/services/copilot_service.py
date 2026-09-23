"""Grounded AI Copilot Service for CAT Machinery Operators.
Features:
- Dynamic Machine Type & Machine ID Entity Resolution (prioritizing user prompt over UI background selection)
- Independent Question Answering (never forces UI machine ID unless user specifically asks about their current machine)
- Live Fleet Aggregation Query Engine (Highest Idle, Best/Worst Health, Fuel Burn, Site Reports, Operator Lookups)
- Comprehensive Heavy Machinery Knowledge Base for Arbitrary / Random Questions
- Grounded Cat Training Simulation and Sustainability Guidelines
- Dynamic Intent Synthesizer for arbitrary dynamic questions
- Optional live Gemini API pass-through if GEMINI_API_KEY is configured
"""

import os
import json
import re
import logging
import urllib.request
import urllib.error
from typing import Any, Dict, List, Optional
import pandas as pd
from sklearn.feature_extraction.text import TfidfVectorizer
from sklearn.linear_model import LogisticRegression
from sklearn.pipeline import Pipeline
import xgboost as xgb
from google import genai
from google.genai import types
from app.core.config import settings
from app.services.dataset_service import dataset_service

logger = logging.getLogger(__name__)

CAT_MODEL_NAMES = {
    "Excavator": "Cat 320 Next Gen Hydraulic Excavator",
    "Bulldozer": "Cat D6 Track-Type Tractor",
    "Motor Grader": "Cat 140 Motor Grader",
    "Wheel Loader": "Cat 950M Medium Wheel Loader",
    "Backhoe Loader": "Cat 420F2 Center Pivot Backhoe",
}

# Exported simulation safety protocols referenced across routes (e.g. safety.py)
CAT_SIM_PROTOCOLS = {
    "seatbelt": "Cat Safety Simulation Module 01: 3-point seatbelt engagement is electronically locked with pilot hydraulic enablement to prevent sudden machine displacement.",
    "proximity": "Cat Detect Object Detection: 5-meter proximity exclusion boundary with dual ultrasonic/radar sensors and in-cab directional buzzer alert.",
    "fatigue": "Cat Driver Safety System (DSS): In-cab infrared optical camera tracking pupil movement, eye closure duration, and head tilt with seat rumble alert.",
    "hydraulic_pressure": "Cat Implement Hydraulic Safeguard: Relief valve calibration limit at 2,800 psi. Cylinder bottoming or stalling requires immediate pilot neutralization.",
}

# Comprehensive domain knowledge base for technical, mechanical, operational, and safety questions
TECHNICAL_KNOWLEDGE_BASE = {
    "torque_converter": {
        "keywords": ["torque converter", "transmission", "powershift", "drive train", "fluid coupling", "lockup clutch"],
        "answer": (
            "A Cat torque converter is a hydrodynamic fluid coupling connecting the diesel engine to the planetary powershift transmission. "
            "It multiplies engine torque dynamically when the machine pushes heavy soil or hard bank material, preventing engine stall. "
            "Cat machines utilize a Lock-Up Clutch torque converter that automatically locks into direct mechanical drive at transport speeds, "
            "eliminating fluid slip, reducing drivetrain parasitic drag, and cutting fuel consumption by up to 15%."
        ),
        "recommendation": "Maintain transmission oil within 80°C–95°C; inspect torque converter inlet relief valve during 500-hour service.",
        "sim_module": "Cat Simulators: Powershift Transmission & Drivetrain Diagnostics",
    },
    "diesel_vs_petrol": {
        "keywords": ["diesel", "petrol", "gasoline", "compression ignition", "fuel density", "spark plug"],
        "answer": (
            "Caterpillar heavy equipment utilizes high-displacement industrial diesel engines (such as the Cat C4.4, C7.1, C9.3, and C13) "
            "because diesel fuel has roughly 15% higher energy density by volume than gasoline. More importantly, compression-ignition "
            "produces massive low-end torque (often over 1,200 Nm at just 1,400 RPM), which is critical for digging, breakout force, and continuous pushing power under heavy load."
        ),
        "recommendation": "Use ultra-low sulfur diesel (ULSD) and inspect water separator daily to protect high-pressure common rail injectors.",
        "sim_module": "Cat Simulators: Cat ACERT Diesel Engine Technology",
    },
    "engine_overheat": {
        "keywords": ["overheat", "hot engine", "coolant", "radiator", "high temp", "temperature spike", "temperature high", "engine hot"],
        "answer": (
            "Cat Engine Overheating Recovery Protocol: "
            "\n1. Shift immediately to neutral, set parking brake, and reduce engine speed to low-idle (900 RPM). Do NOT shut down immediately; low-idle allows coolant circulation and fan airflow to cool turbo bearings and prevent cylinder head warpage. "
            "\n2. Check the hydraulic reversing fan status and clear mud/debris compacted in the radiator cooling pack cores. "
            "\n3. Monitor Cat Messenger display. Normal coolant operating temp is 82°C–93°C; exceeding 102°C triggers electronic power de-rate."
        ),
        "recommendation": "Allow 3-minute idle cooldown, clear cooling cores with an air lance, and check coolant surge tank once cold.",
        "sim_module": "Cat Simulators: Engine Thermal Management & Cooling Core Maintenance",
    },
    "hydraulic_cavitation": {
        "keywords": ["cavitation", "hydraulic noise", "chatter", "sponge", "spongy", "slow boom", "cylinder shudder", "hydraulic leak", "whine"],
        "answer": (
            "Hydraulic shudder or loud whining from the main implement pump indicates oil aeration or cavitation. "
            "Common causes include: cold hydraulic oil below 20°C, low tank reservoir fluid level, air ingress through pump suction hose clamps, or restricted suction strainers. "
            "Cat Next Gen excavators use electro-hydraulic main control valves operating at 3,500 psi (241 bar) — operating with aerated oil can pit pump swashplates within hours."
        ),
        "recommendation": "Warm hydraulic oil to minimum 40°C before high-speed trenching; verify hydraulic sight glass oil level with implements retracted.",
        "sim_module": "Cat Simulators: Hydraulic Diagnostics & Proportional Valve Calibration",
    },
    "slope_stability": {
        "keywords": ["slope", "steep", "hill", "rollover", "grade", "slide", "tip", "tipping", "incline", "sidehill"],
        "answer": (
            "Cat Steep Slope Safety Rules (ROPS ISO 3471): "
            "\n1. Never travel across a hillside steeper than 15 degrees (side-hilling); always travel straight up or straight down. "
            "\n2. Keep the work implement (blade or bucket) 30–40 cm off the surface to maintain the lowest center of gravity and act as an emergency brake if traction slips. "
            "\n3. On excavators, position drive sprockets to the rear when climbing slopes to prevent track recoil tension loss and maintain track stability."
        ),
        "recommendation": "Engage Cat Grade with Assist, avoid high-speed slewing on grades, and keep 3-point seatbelt clicked.",
        "sim_module": "Cat Simulators: Extreme Terrain Stability & Slope Assist",
    },
    "trench_safety": {
        "keywords": ["trench", "cave in", "shoring", "bench", "benching", "muddy trench", "trenching", "deep cut", "excavation safety"],
        "answer": (
            "OSHA 1926 Subpart P & Cat Trenching Protocol: "
            "\n• Keep spoil piles and heavy machines at least 0.6m (2 ft) back from the trench edge to prevent surcharge collapse. "
            "\n• Excavator tracks must sit perpendicular (90°) to the trench line so tracks bridge potential wall slumps. "
            "\n• Any trench exceeding 1.5m (5 ft) requires certified trench boxes, hydraulic shoring, or 1:1 soil benching before personnel enter."
        ),
        "recommendation": "Position tracks perpendicular to excavation cut, deploy trench shields, and maintain the 5-meter exclusion radar zone.",
        "sim_module": "Cat Simulators: Trenching Stability & Implement Shielding",
    },
    "def_emissions": {
        "keywords": ["def", "diesel exhaust", "emissions", "regen", "regeneration", "scr", "dpf", "soot", "adblue", "clean emissions"],
        "answer": (
            "Cat Clean Emissions Module (CEM): Tier 4 Final / Stage V engines use Diesel Exhaust Fluid (32.5% high-purity urea) injected into an SCR catalyst. "
            "Automatic DPF soot regeneration runs transparently during normal load cycles. "
            "If a Level 3 DPF warning appears, park in a well-ventilated open area clear of combustible dry brush, lower implements, and initiate stationary manual regeneration via the in-cab display."
        ),
        "recommendation": "Top off DEF tank at every fuel fill; never add water or fuel to the blue DEF filler neck.",
        "sim_module": "Cat Simulators: Aftertreatment System & DPF Regeneration",
    },
    "proximity_radar": {
        "keywords": ["proximity", "radar", "blind spot", "pinch", "horn", "backup", "detect", "pedestrian", "personnel", "swing radius"],
        "answer": (
            "Cat Detect 5-Meter Proximity Protocol: "
            "Cat machines are equipped with pulsed radar and ultrasonic sensors defining a 5-meter safety bubble around the machine perimeter. "
            "If an obstacle or worker enters the swing radius: "
            "\n1) Sound two sharp horn blasts. "
            "\n2) Lock swing brake and lower bucket or blade to ground. "
            "\n3) Establish direct visual eye contact with ground crew before re-engaging hydraulics."
        ),
        "recommendation": "Verify rear-camera cleanliness during morning walkaround and monitor in-cab radar range rings.",
        "sim_module": "Cat Simulators: Proximity Hazard Avoidance & Exclusion Radar",
    },
    "seatbelt": {
        "keywords": ["seatbelt", "buckle", "belt", "fasten", "interlock", "rops", "restraint"],
        "answer": (
            "Cat Seatbelt Interlock Protocol 4.1: "
            "Fastening the high-visibility orange 3-point seatbelt is mandatory before lowering the hydraulic pilot lockout lever. "
            "In rollover accidents, the Rollover Protective Structure (ROPS) only preserves life if the operator remains restrained within the protective envelope. "
            "Telemetry shows 90% of rollover fatalities occur when unrestrained operators are ejected."
        ),
        "recommendation": "Confirm audible click and green in-cab seatbelt icon before moving gear selector out of neutral.",
        "sim_module": "Cat Simulators: In-Cab Safety Restraint Systems",
    },
    "walkaround": {
        "keywords": ["walkaround", "inspection", "pre-shift", "pre-trip", "checklist", "morning check", "walk-around"],
        "answer": (
            "Cat 360-Degree Pre-Shift Walkaround (OSHA 1926.602): "
            "\n1. Ground inspection: check beneath belly pan for hydraulic, coolant, or engine oil puddles. "
            "\n2. Ground engagement tools: inspect bucket teeth, cutting edges, blade trunnions, and track sag (30–50mm). "
            "\n3. Hydraulic system: inspect boom/stick cylinders for chrome rod scoring and hose weeping. "
            "\n4. Safety systems: test dual horn, reverse backup alarm, beacon light, and clean cab windows."
        ),
        "recommendation": "Complete the 5-point virtual walkaround inspection in the Cat Simulation module before daily startup.",
        "sim_module": "Cat Simulators: 360 Pre-Shift Walkaround Protocol",
    },
    "sustainability": {
        "keywords": ["sustainability", "emission", "fuel", "carbon", "co2", "2030", "idle", "greenhouse", "ghg", "eco-mode", "eco mode"],
        "answer": (
            "Caterpillar 2030 Climate Commitment: 30% reduction in Scope 1 and 2 absolute GHG emissions. "
            "Every hour of non-productive idling burns ~3.2–3.5 Liters of diesel and releases ~9.2 kg of CO2 into the atmosphere. "
            "Enabling Cat Auto-Idle Shutdown (AOD) set to 3 minutes allows fleet operators to immediately eliminate up to 70% of idle fuel waste. "
            "Additionally, using Cat Eco-Mode optimizes engine RPM to load, saving 10-15% fuel during light duty cycles."
        ),
        "recommendation": "Engage Cat Eco-Mode and set Auto-Idle shutdown timer to 3 minutes on the touchscreen.",
        "sim_module": "Cat Simulators: Eco-Operator Fuel Reduction Certification",
    },
    "cat_assist_features": {
        "keywords": ["cat assist", "auto dig", "grade assist", "lift assist", "e-fence", "command", "payload", "grade with assist"],
        "answer": (
            "Caterpillar On-Board Assist Technologies: "
            "\n• Cat Grade Assist: Automates boom, stick, and bucket movement to cut slopes to target grade within 1 centimeter. "
            "\n• Cat E-Fence: Prevents the work tool from moving outside operator-defined ceiling, floor, swing, or cab boundaries (essential near power lines). "
            "\n• Cat Lift Assist: Weighs heavy pipe or trench boxes dynamically and alerts before tipping limits are reached. "
            "\n• Cat Payload: Weighs bucket loads on-the-go to hit target truck payload without underfilling or overloading."
        ),
        "recommendation": "Use E-Fence when operating beneath powerlines or next to active highway traffic.",
        "sim_module": "Cat Simulators: Next Gen Technology Suite",
    },
    "smoke_diagnostics": {
        "keywords": ["black smoke", "white smoke", "blue smoke", "exhaust smoke", "smoke from exhaust"],
        "answer": (
            "Cat Exhaust Smoke Diagnostic Matrix: "
            "\n• Black Smoke: Incomplete combustion caused by restricted air intake filters, overloaded engine, faulty turbocharger, or leaking fuel injectors. "
            "\n• Blue Smoke: Engine oil burning in combustion chamber due to worn piston rings, degraded valve stem seals, or turbocharger oil seal leakage. "
            "\n• White Smoke: Raw unburnt fuel (cold cylinder or delayed timing) or coolant vapor entering combustion chamber from a blown head gasket or cracked cylinder liner."
        ),
        "recommendation": "Inspect air filter restriction indicator and check engine oil and coolant levels immediately.",
        "sim_module": "Cat Simulators: Diesel Engine Troubleshooting & Exhaust Diagnostics",
    },
    "undercarriage": {
        "keywords": ["track sag", "undercarriage", "track tension", "sprocket", "idler", "track roller", "tracks vs tires", "track shoes"],
        "answer": (
            "Cat Undercarriage Maintenance: "
            "The undercarriage represents up to 50% of machine lifetime maintenance cost. "
            "Proper track sag should be maintained at 30–50 mm (measured between front idler and top carrier roller). "
            "Over-tight tracks cause extreme bushing wear and horsepower loss, while loose tracks risk derailment and sprocket tooth damage. "
            "Clean packed mud and clay from track frames daily to prevent premature seal failure."
        ),
        "recommendation": "Measure track sag weekly with a straightedge; grease track tensioner cylinder with Cat MP Grease.",
        "sim_module": "Cat Simulators: Undercarriage Inspection & Tension Calibration",
    },
    "cold_weather": {
        "keywords": ["cold weather", "winter", "freezing", "glow plug", "block heater", "cold start", "ether"],
        "answer": (
            "Cat Cold Weather Operating Protocol: "
            "\n1. Plug in engine block heater at temperatures below -5°C for minimum 2 hours prior to start. "
            "\n2. Allow glow plugs to cycle fully before cranking; limit starter motor duty cycle to 30 seconds maximum. "
            "\n3. After startup, run at low-idle (900 RPM) for 3 minutes, then cycle hydraulic cylinders slowly to circulate warm oil through coolers before applying full digging load. "
            "\n4. Ensure 50/50 Cat ELC (Extended Life Coolant) protection down to -37°C."
        ),
        "recommendation": "Store machines with full fuel tanks to prevent overnight water condensation; cycle implements before loading.",
        "sim_module": "Cat Simulators: Extreme Cold Operations & Pre-Heating",
    },
    "electrical_system": {
        "keywords": ["battery", "alternator", "24v", "electrical", "jump start", "master disconnect", "power cut"],
        "answer": (
            "Cat Heavy Equipment 24V Electrical System: "
            "Caterpillar machinery operates on a heavy-duty 24-volt electrical system (two 12V batteries in series). "
            "Normal alternator charging voltage is 27.5V to 28.5V while engine is running. "
            "Always turn off the master electrical disconnect switch when parking overnight or performing welding on the chassis to protect electronic control modules (ECMs)."
        ),
        "recommendation": "Inspect battery terminal clamps for corrosion during walkaround; keep master switch locked out during maintenance.",
        "sim_module": "Cat Simulators: Electrical Systems & ECM Diagnostics",
    },
    "utility_strike": {
        "keywords": ["underground cable", "electric wire", "electric line", "overhead line", "power line", "powerline", "hit pipe", "utility strike", "gas line", "call 811", "electrocution", "overhead wire", "wire strike", "touches wire", "touches line", "electrical contact"],
        "answer": (
            "Cat Emergency Protocol for Underground / Overhead Utility Strike: "
            "\n1. Stop all machine movement immediately. Do NOT lower implements if contacting an overhead power line — breaking contact can cause massive electrical arcing. "
            "\n2. Stay inside the cab! The metal ROPS cab and rubber tires / steel tracks create an equipotential Faraday cage; you are safe inside as long as you do not touch the outside ground. "
            "\n3. Warn ground personnel to stay at least 10 meters (33 ft) away from the machine and tracks. "
            "\n4. Call emergency services and the power utility immediately. "
            "\n5. If electrical fire forces cab evacuation: JUMP clear of the machine without touching metal and ground simultaneously, landing with both feet tightly together. Shuffle or hop with feet together away from the site to avoid lethal ground step-potential shock."
        ),
        "recommendation": "Always verify 811 Call-Before-You-Dig utility markings and calibrate Cat E-Fence ceiling limits before digging.",
        "sim_module": "Cat Simulators: Underground & Overhead Hazard Mitigation",
    },
    "hydraulic_leaks": {
        "keywords": ["hydraulic leak", "pinhole leak", "hydraulic injection", "fluid leak", "hose burst"],
        "answer": (
            "Cat Hydraulic Safety & High-Pressure Injection Warning: "
            "Cat hydraulic systems operate up to 3,500–5,000 psi. A pinhole leak can pierce skin and inject toxic hydraulic fluid into tissues, requiring emergency surgical amputation. "
            "NEVER use bare hands to search for hydraulic leaks — always use a piece of cardboard or wood. "
            "Depressurize the hydraulic tank and actuate control levers with engine off before breaking any hydraulic coupling."
        ),
        "recommendation": "Relieve system pressure before loosening fittings; wear heavy leather gloves and safety glasses.",
        "sim_module": "Cat Simulators: Hydraulic High-Pressure Safety Certification",
    },
    "differential_lock": {
        "keywords": ["differential lock", "diff lock", "traction control", "wheel slip", "mud traction"],
        "answer": (
            "Cat Differential Lock Operation (Wheel Loaders & Motor Graders): "
            "The differential lock locks both axle shafts together, providing 100% tractive torque to both wheels when one wheel slips in mud or loose gravel. "
            "Rules for operation: Engage only when traveling in a straight line. NEVER engage differential lock when turning or on hard dry surfaces, as severe driveline windup and axle shaft damage will occur."
        ),
        "recommendation": "Release differential lock switch immediately before steering into haul road curves.",
        "sim_module": "Cat Simulators: Powertrain Traction & Diff Lock Management",
    },
    "truck_loading": {
        "keywords": ["truck loading", "load haul truck", "bench loading", "swing angle", "cycle time"],
        "answer": (
            "Cat High-Efficiency Truck Loading Technique: "
            "\n• Optimal Spotting: Position haul trucks at a 45° to 90° angle relative to the excavation face to minimize swing time. "
            "\n• Shelf Loading: Keep the excavator elevated on a bench above the haul truck so the operator looks down into the truck bed, cutting hoist cycle time by 20%. "
            "\n• Centering Payload: Drop first bucket load gently in the center of the bed as a cushion, then distribute subsequent passes evenly to balance axle weights."
        ),
        "recommendation": "Use Cat Payload to verify target payload (100% ± 5%) before releasing haul truck.",
        "sim_module": "Cat Simulators: Production Excavator Truck Loading",
    },
}


class CopilotService:
    def __init__(self):
        self.api_key: Optional[str] = None
        self.genai_client: Optional[genai.Client] = None
        self._get_api_key()
        self._init_nlp_model()
        self._init_xgb_model()

    def _get_api_key(self) -> Optional[str]:
        """Resolves GEMINI_API_KEY from environment, settings, or .env file dynamically."""
        if self.api_key:
            return self.api_key
        key = os.environ.get("GEMINI_API_KEY") or getattr(settings, "GEMINI_API_KEY", None) or os.environ.get("GOOGLE_API_KEY")
        if not key:
            env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(__file__))), ".env")
            if os.path.exists(env_path):
                try:
                    with open(env_path, "r", encoding="utf-8") as f:
                        for line in f:
                            if line.strip().startswith("GEMINI_API_KEY="):
                                key = line.strip().split("=", 1)[1].strip().strip('"').strip("'")
                                break
                except Exception:
                    pass
        if key:
            self.api_key = key
            if not self.genai_client:
                try:
                    self.genai_client = genai.Client(api_key=key)
                except Exception as e:
                    logger.warning(f"Failed to initialize Google GenAI Client: {e}")
        return self.api_key

    def _init_nlp_model(self):
        """Initializes and trains a Scikit-Learn TF-IDF + Logistic Regression Intent Classifier."""
        intent_training_samples = [
            ("what is the status for next gen excavator", "fleet_telematics"),
            ("how many machines are active in the fleet", "fleet_telematics"),
            ("which machine has the highest idle time", "fleet_telematics"),
            ("which unit has the lowest health score", "fleet_telematics"),
            ("site report for chennai or nagpur", "fleet_telematics"),
            ("who is operator op1012 profile and score", "operator_profile"),
            ("how does the torque converter lockup clutch work", "mechanical_engineering"),
            ("explain hydraulic cavitation and pump shudder", "mechanical_engineering"),
            ("what causes black smoke from the exhaust", "mechanical_engineering"),
            ("engine overheating recovery protocol and coolant temp", "mechanical_engineering"),
            ("how does cat grade with assist operate", "mechanical_engineering"),
            ("undercarriage track sag measurement guidelines", "mechanical_engineering"),
            ("what should i do if boom touches overhead electric wire", "emergency_hazard"),
            ("underground high voltage utility strike emergency", "emergency_hazard"),
            ("high pressure pinhole hydraulic fluid injection leak", "emergency_hazard"),
            ("how to safely operate heavy machinery in heavy rain", "safety_protocol"),
            ("cat detect 5 meter proximity exclusion zone protocol", "safety_protocol"),
            ("mandatory 3 point seatbelt interlock requirements", "safety_protocol"),
            ("360 degree pre-shift walkaround inspection checklist", "safety_protocol"),
            ("steep slope rollover stability rules and rops", "safety_protocol"),
            ("how to cut fuel to hit caterpillar 2030 sustainability target", "sustainability_eco"),
            ("configure cat auto-idle shutdown timer to 3 minutes", "sustainability_eco"),
            ("eco mode fuel savings and greenhouse gas reduction", "sustainability_eco"),
            ("troubleshoot active diagnostic trouble codes dtc", "diagnostics_troubleshooting"),
            ("machine engine stall warning alarm repair", "diagnostics_troubleshooting"),
        ]
        try:
            X_text = [sample[0] for sample in intent_training_samples]
            y_intents = [sample[1] for sample in intent_training_samples]
            self.nlp_pipeline = Pipeline([
                ("tfidf", TfidfVectorizer(ngram_range=(1, 2), min_df=1)),
                ("clf", LogisticRegression(C=1.0, random_state=42, max_iter=200))
            ])
            self.nlp_pipeline.fit(X_text, y_intents)
            logger.info("Scikit-Learn NLP Intent Classifier successfully trained.")
        except Exception as e:
            logger.warning(f"Failed to train Scikit-Learn NLP pipeline: {e}")
            self.nlp_pipeline = None

    def _init_xgb_model(self):
        """Initializes and trains an XGBoost Classifier on 1,000 CAN-bus telematics records."""
        try:
            df = dataset_service.df
            features = ["Engine_Temperature_C", "Hydraulic_Pressure_psi", "Vibration_Level", "Idling_Time_min", "Fuel_Efficiency_L_per_hr"]
            X = df[features]
            y = (df["Safety_Alert_Triggered"] == "Yes").astype(int)
            self.xgb_features = features
            self.xgb_model = xgb.XGBClassifier(
                n_estimators=45,
                max_depth=3,
                learning_rate=0.1,
                random_state=42,
                eval_metric="logloss"
            )
            self.xgb_model.fit(X, y)
            logger.info("XGBoost Machine Telematics Risk Classifier successfully trained.")
        except Exception as e:
            logger.warning(f"Failed to train XGBoost Classifier: {e}")
            self.xgb_model = None

    def predict_machine_risk(self, machine_id: str) -> Optional[float]:
        """Calculates ML safety risk probability for a machine using trained XGBoost model."""
        if not self.xgb_model:
            return None
        twin = dataset_service.get_machine_digital_twin(machine_id)
        if not twin:
            return None
        try:
            input_df = pd.DataFrame([{
                "Engine_Temperature_C": twin["avg_engine_temp_c"],
                "Hydraulic_Pressure_psi": twin["avg_hydraulic_psi"],
                "Vibration_Level": twin.get("avg_vibration_level", twin.get("avg_vibration_g", 2.0)),
                "Idling_Time_min": twin["avg_idling_time_min"],
                "Fuel_Efficiency_L_per_hr": twin["avg_fuel_efficiency_l_hr"],
            }])
            prob = float(self.xgb_model.predict_proba(input_df)[0][1])
            return prob
        except Exception as e:
            logger.warning(f"XGBoost risk prediction failed for {machine_id}: {e}")
            return None

    def classify_intent(self, text: str) -> str:
        """Classifies text intent using Scikit-Learn TF-IDF pipeline."""
        if self.nlp_pipeline:
            try:
                return str(self.nlp_pipeline.predict([text])[0])
            except Exception:
                return "general_inquiry"
        return "general_inquiry"

    def _call_gemma_api(self, prompt: str, system_context: str) -> Optional[str]:
        """Calls Gemma 4 (gemma-4-31b-it) via the official Google GenAI Python SDK."""
        api_key = self._get_api_key()
        if not api_key:
            return None

        try:
            client = self.genai_client or genai.Client(api_key=api_key)
            full_prompt = f"{system_context}\n\nUser Question: {prompt}"
            response = client.models.generate_content(
                model="gemma-4-31b-it",
                contents=full_prompt,
                config=types.GenerateContentConfig(
                    temperature=0.3,
                    max_output_tokens=600,
                ),
            )
            if response and response.text:
                return response.text.strip()
        except Exception as e:
            logger.warning(f"Gemma 4 API call failed, falling back to local domain engine: {e}")
            return None

        return None

    # Backward compatibility alias
    _call_gemini_api = _call_gemma_api

    def _detect_machine_type(self, query_lower: str) -> Optional[str]:
        """Detects if the query is asking about a specific machine type (e.g. Next Gen Excavator)."""
        if any(w in query_lower for w in ["excavator", "next gen excavator", "cat 320", "digger"]):
            return "Excavator"
        if any(w in query_lower for w in ["bulldozer", "dozer", "track-type", "cat d6"]):
            return "Bulldozer"
        if any(w in query_lower for w in ["motor grader", "grader", "cat 140", "blade grader"]):
            return "Motor Grader"
        if any(w in query_lower for w in ["wheel loader", "loader", "cat 950"]) and "backhoe" not in query_lower:
            return "Wheel Loader"
        if any(w in query_lower for w in ["backhoe", "backhoe loader", "cat 420", "center pivot"]):
            return "Backhoe Loader"
        return None

    def _detect_machine_id(self, query_lower: str) -> Optional[str]:
        """Detects if query explicitly names a machine unit ID (e.g. EXC003, BDZ001)."""
        all_ids = [m["machine_id"] for m in dataset_service.get_all_machines()]
        for m_id in all_ids:
            if m_id.lower() in query_lower:
                return m_id
        return None

    def _detect_site(self, query_lower: str) -> Optional[str]:
        """Detects if query asks about a specific site."""
        sites = ["bengaluru", "chennai", "hyderabad", "nagpur", "vizag", "pune", "vellore", "coimbatore"]
        for s in sites:
            if s in query_lower:
                return s.title()
        return None

    def _detect_operator(self, query_lower: str) -> Optional[str]:
        """Detects if query asks about an operator ID."""
        df = dataset_service.df
        for op in df["Operator_ID"].unique():
            if op.lower() in query_lower:
                return op
        return None

    def answer_query(self, query: str, machine_id: Optional[str] = None) -> Dict[str, Any]:
        query_clean = query.strip()
        query_lower = query_clean.lower()
        df = dataset_service.df

        # 1. SMART CONTEXT RESOLUTION:
        # Does the user explicitly name a unit ID?
        explicit_id = self._detect_machine_id(query_lower)

        # Does the user explicitly ask about their current/selected machine?
        current_unit_triggers = [
            "this machine", "my machine", "current machine", "selected machine",
            "this unit", "my unit", "current unit", "selected unit",
            "why is it flagged", "is it flagged", "is this unit flagged", "is my machine ok",
            "why is my machine flagged", "tell me about this machine", "diagnose this machine"
        ]
        asks_about_current_unit = any(t in query_lower for t in current_unit_triggers)

        # Only bind machine_id if the user named an ID or specifically referred to their selected machine!
        if explicit_id:
            resolved_machine_id = explicit_id
        elif asks_about_current_unit:
            resolved_machine_id = machine_id
        else:
            resolved_machine_id = None

        # Check if user mentioned a machine TYPE (e.g. "Next Gen Excavator", "Bulldozer")
        mentioned_type = self._detect_machine_type(query_lower)

        # 2. TF-IDF + LogisticRegression Intent Classification
        detected_intent = self.classify_intent(query_clean)

        # 3. AUTONOMOUS LOCAL SPECIALIZED MODULES

        # CHECK 1: Explicit Operator Lookup Query ("Who is operator OP1012?")
        target_operator = self._detect_operator(query_lower)
        if target_operator:
            op_df = df[df["Operator_ID"] == target_operator]
            first_row = op_df.iloc[0]
            avg_prod = op_df["Productivity_Score"].mean()
            seatbelt_rate = (len(op_df[op_df["Seatbelt_Status"] == "Fastened"]) / len(op_df)) * 100.0
            avg_idle = op_df["Idling_Time_min"].mean()
            return {
                "query": query_clean,
                "machine_id": first_row["Machine_ID"],
                "response": (
                    f"Operator Profile for {target_operator}: "
                    f"\n• Age: {first_row['Operator_Age']} years | Experience: {first_row['Operator_Experience_Years']} years. "
                    f"\n• Primary Assigned Machine: {first_row['Machine_ID']} ({first_row['Machine_Type']}). "
                    f"\n• Mean Productivity Score: {avg_prod:.1f} / 100. "
                    f"\n• Average Idling Time: {avg_idle:.1f} minutes per task. "
                    f"\n• Seatbelt Compliance Rate: {seatbelt_rate:.1f}%. "
                    f"\n• Shift Distribution: {op_df['Shift'].mode().iloc[0]} shift primary. "
                    f"\n• Total Logged Telemetry Tasks: {len(op_df)}."
                ),
                "context_tags": [f"Operator: {target_operator}", f"Exp: {first_row['Operator_Experience_Years']}y", f"Score: {avg_prod:.1f}"],
                "action_recommendation": "Assign Cat Simulation Eco-Driving module if idle time exceeds baseline.",
                "matching_sim_module": "Cat Simulators: Operator Performance Coaching",
            }

        # CHECK 2: Superlative Fleet & Analytics Queries
        if any(w in query_lower for w in ["highest idle", "most idle", "who idles most", "max idle", "longest idle", "worst idle"]):
            all_m = dataset_service.get_all_machines()
            worst_idle = max(all_m, key=lambda x: x["avg_idling_time_min"])
            return {
                "query": query_clean,
                "machine_id": worst_idle["machine_id"],
                "response": (
                    f"Machine {worst_idle['machine_id']} ({worst_idle['machine_type']}) stationed at {worst_idle['current_site_location']} "
                    f"has the highest idle time across the fleet, averaging {worst_idle['avg_idling_time_min']:.1f} minutes of non-productive idling per task. "
                    f"Current assigned operator is {worst_idle['current_operator_id']}."
                ),
                "context_tags": [f"Unit: {worst_idle['machine_id']}", "Peak Idle", f"{worst_idle['avg_idling_time_min']}m"],
                "action_recommendation": "Configure Cat Auto-Idle Shutdown (AOD) set to 3 minutes to eliminate diesel waste.",
                "matching_sim_module": "Cat Simulators: Eco-Operator Idle Reduction",
            }

        if any(w in query_lower for w in ["lowest idle", "least idle", "minimum idle", "best idle"]):
            all_m = dataset_service.get_all_machines()
            best_idle = min(all_m, key=lambda x: x["avg_idling_time_min"])
            return {
                "query": query_clean,
                "machine_id": best_idle["machine_id"],
                "response": (
                    f"Machine {best_idle['machine_id']} ({best_idle['machine_type']}) at {best_idle['current_site_location']} "
                    f"has the lowest idle time across the fleet at only {best_idle['avg_idling_time_min']:.1f} minutes per task. "
                    f"Operated by {best_idle['current_operator_id']}, it achieves exceptional efficiency."
                ),
                "context_tags": [f"Unit: {best_idle['machine_id']}", "Optimal Idle", f"{best_idle['avg_idling_time_min']}m"],
                "action_recommendation": "Replicate this operator's shut-down and cycling habits across shift teams.",
                "matching_sim_module": "Cat Simulators: Eco-Operator Master Class",
            }

        if any(w in query_lower for w in ["lowest health", "worst health", "most damaged", "critical machine", "least healthy"]):
            all_m = dataset_service.get_all_machines()
            worst_health = min(all_m, key=lambda x: x["health_score"])
            return {
                "query": query_clean,
                "machine_id": worst_health["machine_id"],
                "response": (
                    f"Machine {worst_health['machine_id']} ({worst_health['machine_type']}) at {worst_health['current_site_location']} "
                    f"registers the lowest health rating in the fleet at {worst_health['health_score']}%. "
                    f"Key telemetry indicators include elevated idling ({worst_health['avg_idling_time_min']}m), "
                    f"hydraulic pressure at {worst_health['avg_hydraulic_psi']} psi, and logged safety alerts."
                ),
                "context_tags": [f"Unit: {worst_health['machine_id']}", f"Health: {worst_health['health_score']}%", "Critical"],
                "action_recommendation": "Schedule immediate shop walkaround inspection, oil sampling (S•O•S), and hydraulic relief calibration.",
                "matching_sim_module": f"Cat Simulators: {worst_health['machine_type']} Maintenance & Overhaul",
            }

        if any(w in query_lower for w in ["best health", "highest health", "healthiest", "top machine"]):
            all_m = dataset_service.get_all_machines()
            best_health = max(all_m, key=lambda x: x["health_score"])
            return {
                "query": query_clean,
                "machine_id": best_health["machine_id"],
                "response": (
                    f"Machine {best_health['machine_id']} ({best_health['machine_type']}) at {best_health['current_site_location']} "
                    f"leads the fleet with a top health rating of {best_health['health_score']}%. "
                    f"It maintains {best_health['safety_compliance']}% safety compliance and ideal operating temperatures."
                ),
                "context_tags": [f"Unit: {best_health['machine_id']}", f"Health: {best_health['health_score']}%", "Top Condition"],
                "action_recommendation": "Maintain scheduled 250-hour greasing and fluid level checks.",
                "matching_sim_module": f"Cat Simulators: {best_health['machine_type']} Operator Maintenance",
            }

        if any(w in query_lower for w in ["highest fuel", "most fuel", "worst fuel", "fuel burner"]):
            all_m = dataset_service.get_all_machines()
            worst_fuel = max(all_m, key=lambda x: x["avg_fuel_efficiency_l_hr"])
            return {
                "query": query_clean,
                "machine_id": worst_fuel["machine_id"],
                "response": (
                    f"Machine {worst_fuel['machine_id']} ({worst_fuel['machine_type']}) consumes the highest fuel burn rate at "
                    f"{worst_fuel['avg_fuel_efficiency_l_hr']:.2f} Liters/hour at {worst_fuel['current_site_location']}. "
                    f"High engine load and terrain drag contribute to elevated fuel consumption."
                ),
                "context_tags": [f"Unit: {worst_fuel['machine_id']}", f"Burn: {worst_fuel['avg_fuel_efficiency_l_hr']} L/hr"],
                "action_recommendation": "Engage Cat Eco-Mode and calibrate torque converter lock-up clutch.",
                "matching_sim_module": "Cat Simulators: Fuel Reduction & Efficiency",
            }

        if any(w in query_lower for w in ["most fuel efficient", "lowest fuel", "best fuel", "best mileage"]):
            all_m = dataset_service.get_all_machines()
            best_fuel = min(all_m, key=lambda x: x["avg_fuel_efficiency_l_hr"])
            return {
                "query": query_clean,
                "machine_id": best_fuel["machine_id"],
                "response": (
                    f"Machine {best_fuel['machine_id']} ({best_fuel['machine_type']}) is the most fuel-efficient unit in the fleet, "
                    f"averaging just {best_fuel['avg_fuel_efficiency_l_hr']:.2f} Liters/hour at {best_fuel['current_site_location']}."
                ),
                "context_tags": [f"Unit: {best_fuel['machine_id']}", f"Burn: {best_fuel['avg_fuel_efficiency_l_hr']} L/hr", "Efficient"],
                "action_recommendation": "Benchmark cycle operations against this unit's telematics profile.",
                "matching_sim_module": "Cat Simulators: Eco-Operator Master Class",
            }

        if any(w in query_lower for w in ["best operator", "highest productivity", "top operator", "most productive"]):
            top_op_id = df.groupby("Operator_ID")["Productivity_Score"].mean().idxmax()
            top_op_score = df.groupby("Operator_ID")["Productivity_Score"].mean().max()
            top_row = df[df["Operator_ID"] == top_op_id].iloc[0]
            return {
                "query": query_clean,
                "machine_id": top_row["Machine_ID"],
                "response": (
                    f"The top-performing operator in the fleet is {top_op_id}, achieving an average productivity rating of {top_op_score:.1f}/100. "
                    f"Operating primarily on {top_row['Machine_ID']} ({top_row['Machine_Type']}) at {top_row['Site_Location']}, "
                    f"they consistently maintain high load rates and minimal cycle delays."
                ),
                "context_tags": [f"Top Operator: {top_op_id}", f"Score: {top_op_score:.1f}"],
                "action_recommendation": "Recognize operator with Cat Certified Master Operator badge.",
                "matching_sim_module": "Cat Simulators: Productivity & Cycle Optimization",
            }

        if any(w in query_lower for w in ["how many machines", "fleet size", "total machines", "machine count", "how many units", "fleet breakdown"]):
            all_m = dataset_service.get_all_machines()
            counts = {}
            for m in all_m:
                counts[m["machine_type"]] = counts.get(m["machine_type"], 0) + 1
            summary_counts = ", ".join([f"{count} {m_type}s" for m_type, count in counts.items()])
            return {
                "query": query_clean,
                "machine_id": None,
                "response": (
                    f"The fleet contains a total of {len(all_m)} active Caterpillar machines distributed across 8 regional job sites: "
                    f"{summary_counts}. All units report CAN-bus telematics into the Digital Twin."
                ),
                "context_tags": ["Fleet Overview", f"Total: {len(all_m)} Units"],
                "action_recommendation": "Select individual machines in the Digital Twin to inspect telemetry.",
                "matching_sim_module": "Cat Simulators: Fleet Management Orientation",
            }

        # CHECK 3: Site-specific Queries ("What is happening in Nagpur / Chennai?")
        site_name = self._detect_site(query_lower)
        if site_name:
            site_df = df[df["Site_Location"].str.contains(site_name, case=False, na=False)]
            if len(site_df) > 0:
                site_machines = site_df["Machine_ID"].unique().tolist()
                avg_idle_site = site_df["Idling_Time_min"].mean()
                incidents_site = len(site_df[site_df["Safety_Alert_Triggered"] == "Yes"])
                avg_prod = site_df["Productivity_Score"].mean()
                primary_terrain = site_df["Terrain_Type"].mode().iloc[0]
                return {
                    "query": query_clean,
                    "machine_id": site_machines[0] if site_machines else None,
                    "response": (
                        f"Site Telematics Report for {site_name}: "
                        f"\n• Active Units: {', '.join(site_machines)} ({len(site_machines)} total machines). "
                        f"\n• Average Idling Time: {avg_idle_site:.1f} min/task across {len(site_df)} shift tasks. "
                        f"\n• Safety Incident Count: {incidents_site} automated alerts recorded. "
                        f"\n• Mean Productivity Score: {avg_prod:.1f} / 100. "
                        f"\n• Dominant Terrain: {primary_terrain}."
                    ),
                    "context_tags": [f"Site: {site_name}", f"Units: {len(site_machines)}", f"Alerts: {incidents_site}"],
                    "action_recommendation": "Review site haul road conditions and enforce proximity exclusion zones.",
                    "matching_sim_module": "Cat Simulators: Site Layout & Traffic Management",
                }

        # CHECK 4: User asked about a MACHINE TYPE (e.g. "what is the status for Next Gen Excavator ?")
        if mentioned_type and not explicit_id and not asks_about_current_unit:
            model_full_name = CAT_MODEL_NAMES.get(mentioned_type, f"Cat {mentioned_type}")
            type_machines = [m for m in dataset_service.get_all_machines() if m["machine_type"] == mentioned_type]
            unit_ids = [m["machine_id"] for m in type_machines]

            avg_health = sum(m["health_score"] for m in type_machines) / max(len(type_machines), 1)
            avg_util = sum(m["utilization_rate"] for m in type_machines) / max(len(type_machines), 1)
            avg_safety = sum(m["safety_compliance"] for m in type_machines) / max(len(type_machines), 1)
            avg_burn = sum(m["avg_fuel_efficiency_l_hr"] for m in type_machines) / max(len(type_machines), 1)
            avg_idle = sum(m["avg_idling_time_min"] for m in type_machines) / max(len(type_machines), 1)

            flagged_units = [m for m in type_machines if m["health_score"] < 75 or m["avg_idling_time_min"] > 25]
            if flagged_units:
                flagged_list = [f"{m['machine_id']} (Health: {m['health_score']}%, Idle: {m['avg_idling_time_min']:.0f}m)" for m in flagged_units]
                flagged_summary = f"Flagged units requiring attention: {', '.join(flagged_list)}"
            else:
                flagged_summary = "All units are currently operating within factory nominal limits."

            sites_active = sorted(list(set(m["current_site_location"] for m in type_machines)))

            response_text = (
                f"Status report for {model_full_name} ({len(type_machines)} units active: {', '.join(unit_ids)}): "
                f"\n• Overall Segment Health: {avg_health:.1f}% average. "
                f"\n• Utilization Rate: {avg_util:.1f}% | Safety Compliance: {avg_safety:.1f}%. "
                f"\n• Average Fuel Consumption: {avg_burn:.2f} L/hr | Average Idling: {avg_idle:.1f} min/task. "
                f"\n• Active Job Sites: {', '.join(sites_active)}. "
                f"\n• Maintenance Status: {flagged_summary}"
            )

            return {
                "query": query_clean,
                "machine_id": unit_ids[0] if unit_ids else None,
                "response": response_text,
                "context_tags": [f"Fleet: {mentioned_type}", f"Units: {len(unit_ids)}", f"Health: {avg_health:.1f}%"],
                "action_recommendation": f"Inspect individual {mentioned_type} units in the Machine Digital Twin tab.",
                "matching_sim_module": f"Cat Simulators: {mentioned_type} Advanced Operations",
            }

        # CHECK 5: Targeted Technical / Operational / Safety Knowledge Base
        for topic_key, topic_data in TECHNICAL_KNOWLEDGE_BASE.items():
            if any(k in query_lower for k in topic_data["keywords"]):
                return {
                    "query": query_clean,
                    "machine_id": resolved_machine_id,
                    "response": topic_data["answer"],
                    "context_tags": [topic_key.replace("_", " ").title(), "Cat Technical Base"],
                    "action_recommendation": topic_data["recommendation"],
                    "matching_sim_module": topic_data["sim_module"],
                }

        # CHECK 6: Single Machine Diagnostic Query (EXC001, BDZ002, or "why is my machine flagged")
        if resolved_machine_id:
            m_info = dataset_service.get_machine_digital_twin(resolved_machine_id)
            if m_info:
                m_type = m_info["machine_type"]
                health = m_info["health_score"]
                temp = m_info["avg_engine_temp_c"]
                psi = m_info["avg_hydraulic_psi"]
                idle = m_info["avg_idling_time_min"]
                context_tags = [f"Unit: {resolved_machine_id}", f"Type: {m_type}", f"Health: {health}%"]

                issues = []
                if idle > 25:
                    issues.append(f"excessive idling ({idle:.0f} min/task vs 15m benchmark)")
                if temp > 94:
                    issues.append(f"elevated engine temperature ({temp:.1f} °C)")
                if psi > 2600:
                    issues.append(f"high hydraulic pressure ({psi:.0f} psi)")
                if m_info["safety_compliance"] < 80:
                    issues.append(f"reduced seatbelt compliance ({m_info['safety_compliance']:.1f}%)")
                # Calculate real-time XGBoost ML Risk Score
                xgb_risk = self.predict_machine_risk(resolved_machine_id)
                xgb_line = f"\n• XGBoost Anomaly Model: {xgb_risk * 100:.1f}% incident risk probability based on 5 CAN-bus telemetry dimensions." if xgb_risk is not None else ""
                if xgb_risk is not None:
                    context_tags.append(f"XGBoost Risk: {xgb_risk * 100:.1f}%")

                if issues:
                    response_text = (
                        f"Diagnostic report for {resolved_machine_id} ({m_type}) at {m_info['current_site_location']}: "
                        f"Current health rating is {health}%. Notable telemetry signals include: "
                        + ", ".join(issues)
                        + f". This machine requires immediate operational and preventive maintenance review.{xgb_line}"
                    )
                    action_recommendation = "Engage Cat Auto-Idle Shutdown, inspect hydraulic fluid levels, and mandate 3-point seatbelt compliance."
                else:
                    response_text = (
                        f"Machine {resolved_machine_id} ({m_type}) is running in nominal status with a healthy rating of {health}%. "
                        f"Engine temp ({temp}°C), hydraulic pressure ({psi} psi), and fuel burn ({m_info['avg_fuel_efficiency_l_hr']} L/hr) "
                        f"are well within Caterpillar factory tolerances.{xgb_line}"
                    )
                    action_recommendation = "Continue planned shift production cycles."

                return {
                    "query": query_clean,
                    "machine_id": resolved_machine_id,
                    "response": response_text,
                    "context_tags": context_tags,
                    "action_recommendation": action_recommendation,
                    "matching_sim_module": f"Cat Simulators: {m_type} Maintenance & Diagnostics",
                }

        # 4. CLOUD LLM PASS-THROUGH: Gemma 4 (gemma-4-31b-it)
        # Passes dynamic and open-ended machinery queries to Gemma 4 via official Google GenAI SDK
        if self._get_api_key():
            system_context = (
                "You are the Cat Smart Operator Assistant for Caterpillar heavy machinery. "
                "You are grounded in Cat Simulators training protocols, OSHA standards, and Caterpillar's 2030 Sustainability Goal. "
                f"Query Machine Context: {resolved_machine_id or 'General'}. "
                f"Classified Intent: {detected_intent}. "
                "Provide direct, professional, expert answers formatted clearly with bullet points."
            )
            llm_response = self._call_gemma_api(query_clean, system_context)
            if llm_response:
                return {
                    "query": query_clean,
                    "machine_id": resolved_machine_id,
                    "response": llm_response,
                    "context_tags": ["Gemma 4 Live", f"Intent: {detected_intent}", resolved_machine_id or "Fleet-Wide"],
                    "action_recommendation": "Follow in-cab Cat Messenger prompts and standard operating procedures.",
                    "matching_sim_module": "Cat Simulators: Operator Master Class",
                }

        # 5. LOCAL FALLBACK: Dynamic Intent Synthesizer for arbitrary dynamic questions
        # Never forces a specific machine ID; analyzes query structure to provide an expert Caterpillar answer
        return self._synthesize_dynamic_response(query_clean, query_lower)

    def _synthesize_dynamic_response(self, query: str, query_lower: str) -> Dict[str, Any]:
        """Synthesizes an intelligent, structured response for arbitrary heavy machinery questions."""

        # 1. Action / Troubleshooting questions ("how do i fix", "troubleshoot", "why does", "problem")
        if any(w in query_lower for w in ["troubleshoot", "fix", "repair", "broken", "issue", "failure", "stall", "alarm", "code", "warning"]):
            response = (
                f"Caterpillar Diagnostic Analysis for '{query}': "
                f"\n1. Safety Isolation: Park the machine on level ground, lower all implements to rest on the grade, engage the hydraulic lockout lever, and shut down the engine. "
                f"\n2. Electronic Fault Log: Check the in-cab Cat Messenger or Product Link display for active Diagnostic Trouble Codes (DTCs) in FMI (Failure Mode Identifier) and CID (Component Identifier) format. "
                f"\n3. Fluid & Sensor Check: Inspect fluid levels (hydraulic reservoir sight glass, engine oil dipstick, coolant surge tank) and examine wire harnesses for chafe damage. "
                f"\n4. Electronic De-rate: If the machine enters derate mode, do NOT clear codes without logging — notify site fleet maintenance for Cat Electronic Technician (Cat ET) hookup."
            )
            return {
                "query": query,
                "machine_id": None,
                "response": response,
                "context_tags": ["Diagnostics & Troubleshooting", "Cat ET Protocols"],
                "action_recommendation": "Connect Cat Electronic Technician (Cat ET) handheld tool and verify active DTCs.",
                "matching_sim_module": "Cat Simulators: Electronic Troubleshooting & Fault Isolation",
            }

        # 2. Safety & Protocol questions ("is it safe", "safety", "danger", "hazard", "ppe", "regulation")
        if any(w in query_lower for w in ["safe", "danger", "hazard", "ppe", "regulation", "injury", "protect", "lightning", "storm", "flood"]):
            response = (
                f"Caterpillar Job-Site Safety Protocol for '{query}': "
                f"\n• Personal Protective Equipment (PPE): Steel-toe composite boots, high-visibility Class 3 vest, ANSI Z87 hard hat, and safety glasses are mandatory at all times on site. "
                f"\n• Cab Envelope: In adverse weather (heavy rain, lightning, high winds), the ROPS cab provides the safest protected shelter. Keep windows closed and avoid dismounting. "
                f"\n• 5-Meter Zone: Ground personnel must never enter the 5-meter equipment swing radius without two-way radio confirmation and horn acknowledgment from the operator. "
                f"\n• Three Points of Contact: Always maintain 2 hands and 1 foot (or 2 feet and 1 hand) when ascending or descending cab ladders."
            )
            return {
                "query": query,
                "machine_id": None,
                "response": response,
                "context_tags": ["Safety Center", "OSHA Compliance"],
                "action_recommendation": "Review the OSHA 1926 Heavy Equipment Job Safety Analysis (JSA).",
                "matching_sim_module": "Cat Simulators: Job Site Hazard Assessment",
            }

        # 3. Operational & Technique questions ("how to operate", "how to dig", "best way", "technique")
        if any(w in query_lower for w in ["how to", "technique", "method", "best way", "procedure", "start", "stop", "drive", "grade"]):
            response = (
                f"Caterpillar Standard Operating Procedure (SOP) for '{query}': "
                f"\n• Pre-Operation: Conduct the 360-degree walkaround, verify fluid levels, buckle 3-point seatbelt, and sound horn before releasing hydraulic pilot lock. "
                f"\n• Smooth Joystick Modulation: Avoid slamming joystick endpoints. Modern Cat electro-hydraulics operate via proportional solenoid valves — feathering the controls produces higher breakout forces and cuts fuel burn. "
                f"\n• Eco-Mode Operation: Keep the throttle dial in Eco-Mode. The engine electronic governor will automatically bump RPM only when the hydraulic pump senses load pressure. "
                f"\n• Post-Shift Cooldown: Idle for 3 minutes before engine shutdown to prevent oil coking in turbocharger journal bearings."
            )
            return {
                "query": query,
                "machine_id": None,
                "response": response,
                "context_tags": ["Standard Operating Procedure", "Cat Master Operator"],
                "action_recommendation": "Practice smooth hydraulic cycling in the Cat Training Simulation module.",
                "matching_sim_module": "Cat Simulators: Precision Machine Control",
            }

        # 4. Hydraulics & Fluid Systems ("hydraulic pressure", "cylinder", "pump", "oil", "fluid", "filter")
        if any(w in query_lower for w in ["hydraulic", "fluid", "psi", "pump", "valve", "cylinder", "oil level", "reservoir", "filter", "hose", "leak"]):
            response = (
                f"Caterpillar Hydraulic System Protocol for '{query}': "
                f"\n• Fluid Specifications: Cat heavy equipment requires Cat HYDO Advanced 10 or Cat BIO HYDO Advanced hydraulic fluid, featuring special anti-wear additives for high-pressure piston pumps (up to 3,500 psi / 241 bar). "
                f"\n• Temperature Window: Optimal hydraulic oil operating temperature is 50°C to 80°C. Never subject cold hydraulic oil (under 20°C) to full-throttle loading; warm by slowly cycling boom and stick cylinders. "
                f"\n• Contamination Prevention: 80% of hydraulic component failures stem from particle contamination. Always wipe quick-couplers clean before connecting work tools."
            )
            return {
                "query": query,
                "machine_id": None,
                "response": response,
                "context_tags": ["Hydraulic Systems", "Cat Fluid Standards"],
                "action_recommendation": "Inspect hydraulic sight glass and relief valve settings before heavy excavation cycles.",
                "matching_sim_module": "Cat Simulators: Hydraulic Diagnostics & Proportional Valve Calibration",
            }

        # 5. Engine, Powertrain & Emissions ("engine", "rpm", "turbo", "fuel", "transmission", "exhaust")
        if any(w in query_lower for w in ["engine", "diesel", "rpm", "turbo", "fuel", "injector", "exhaust", "transmission", "clutch", "radiator", "coolant"]):
            response = (
                f"Caterpillar Powertrain & ACERT Technology Guide for '{query}': "
                f"\n• ACERT Engine Management: Cat industrial diesel engines utilize electronic unit injectors (MEUI / HEUI) and twin turbochargers with cross-flow cylinder heads for maximum low-end torque. "
                f"\n• Fluid Standards: Use Cat DEO-ULS 15W-40 multi-grade engine oil and maintain 50/50 Cat Extended Life Coolant (ELC). Drain fuel water separator daily to avoid damaging high-pressure common rail components. "
                f"\n• Turbo Cooldown: Always run engine at low-idle (800-900 RPM) for 3 minutes before turning off key to allow oil lubrication to dissipate turbo heat."
            )
            return {
                "query": query,
                "machine_id": None,
                "response": response,
                "context_tags": ["Engine & Powertrain", "ACERT Diesel Diagnostics"],
                "action_recommendation": "Schedule 250-hour oil sample (S•O•S Services) to detect microscopic wear metals.",
                "matching_sim_module": "Cat Simulators: Cat ACERT Diesel Engine Technology",
            }

        # 6. General Machinery / Telematics Fallback
        response = (
            f"Regarding your query on '{query}': "
            f"\nCaterpillar engineering and fleet telematics prioritize operator safety, maximum equipment uptime, and Caterpillar's 2030 sustainability benchmarks. "
            f"\n• Fleet Grounding: The 17 machines in this fleet are actively tracked across 8 sites with CAN-bus telematics monitoring engine temperatures, hydraulic pressures, and idle time. "
            f"\n• Recommended Best Practice: Verify in-cab Cat Messenger status messages, maintain strict adherence to 5-meter exclusion zones, and set Auto-Idle Shutdown to 3 minutes to cut fuel burn by up to 15%."
        )
        return {
            "query": query,
            "machine_id": None,
            "response": response,
            "context_tags": ["Cat Operator Assistant", "Fleet-Wide Guidelines"],
            "action_recommendation": "Consult the Cat Operation and Maintenance Manual (OMM) or ask a specific operational question.",
            "matching_sim_module": "Cat Simulators: Standard Operating Procedures Hub",
        }


copilot_service = CopilotService()
