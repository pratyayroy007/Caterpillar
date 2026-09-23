from fastapi import APIRouter
from pydantic import BaseModel
from typing import Any, Dict, List

router = APIRouter(prefix="/simulation", tags=["Cat Training Simulation"])


class SimEvaluationRequest(BaseModel):
    scenario_id: str
    selected_option_id: str
    inspection_checks: List[str] = []


SIM_SCENARIOS = [
    {
        "id": "SIM-01-HYD",
        "title": "Excavator Hydraulic Stall in Hard Rock",
        "machine_type": "Excavator",
        "difficulty": "Intermediate",
        "category": "Hydraulic Management",
        "description": (
            "While trenching compacted granite at Site 04, the hydraulic gauge spikes to 3,150 psi. "
            "Boom cylinder stalls at maximum stroke and hydraulic fluid temperature climbs past 96°C."
        ),
        "virtual_telemetry": {
            "hydraulic_psi": 3150,
            "engine_temp_c": 97.4,
            "vibration_level": 4.8,
            "idling_time_min": 2,
        },
        "question": "What is the correct Cat Simulators procedure to prevent seal blowout and hydraulic cavitation?",
        "options": [
            {
                "id": "A",
                "text": "Force joystick to full reverse stroke to snap rock loose with momentum.",
                "is_correct": False,
                "feedback": "Incorrect! Dynamic impact shock induces catastrophic relief valve fracture and pin shear.",
            },
            {
                "id": "B",
                "text": "Relieve curl pressure, reposition bucket teeth at a 45-degree fracture angle, and cycle fluid in air.",
                "is_correct": True,
                "feedback": "Correct! Cat Excavator Assist protocol dictates feathering the pilot valve and chipping along natural fracture planes.",
            },
            {
                "id": "C",
                "text": "Increase throttle to maximum high idle to power through the obstruction.",
                "is_correct": False,
                "feedback": "Incorrect! Increasing RPM under relief stall causes rapid thermal breakdown and pump cavitation.",
            },
        ],
    },
    {
        "id": "SIM-02-PROX",
        "title": "Proximity Exclusion Alert During Swing",
        "machine_type": "Wheel Loader / Excavator",
        "difficulty": "Advanced",
        "category": "Proximity & Site Safety",
        "description": (
            "During high-speed truck loading, the Cat Detect proximity sensor sounds a rapid red strobe alert: "
            "ground personnel entered the 3.8-meter rear blind spot counterweight radius."
        ),
        "virtual_telemetry": {
            "proximity_distance_m": 3.8,
            "swing_speed_deg_sec": 42.0,
            "seatbelt_status": "Fastened",
            "overspeed_events": 0,
        },
        "question": "What is the mandatory immediate action according to Cat Safety Standard 7.2?",
        "options": [
            {
                "id": "A",
                "text": "Accelerate swing to clear the counterweight before the worker approaches closer.",
                "is_correct": False,
                "feedback": "Critical Failure! Swinging towards an encroaching worker poses lethal pinch hazard.",
            },
            {
                "id": "B",
                "text": "Sound horn, lock swing brake immediately, lower bucket to ground, and establish eye contact.",
                "is_correct": True,
                "feedback": "Correct! Immediate implement grounding and horn alert neutralizes kinetic danger instantly.",
            },
            {
                "id": "C",
                "text": "Ignore radar if spotter has not radioed.",
                "is_correct": False,
                "feedback": "Failure! Sensor telemetry always takes precedence over verbal assumption.",
            },
        ],
    },
    {
        "id": "SIM-03-IDLE",
        "title": "Eco-Idle Fuel Management & 2030 Target",
        "machine_type": "Bulldozer",
        "difficulty": "Beginner",
        "category": "Sustainability & Fuel",
        "description": (
            "Your bulldozer has been idling for 18 minutes while waiting for dump trucks to position. "
            "Ambient temperature is 32°C and engine hours are accumulating without payload output."
        ),
        "virtual_telemetry": {
            "idling_time_min": 18,
            "fuel_burn_l_hr": 4.1,
            "co2_waste_kg": 19.8,
            "engine_hours": 3499.2,
        },
        "question": "How should the operator configure the Cat engine management system to hit the 30% GHG reduction goal?",
        "options": [
            {
                "id": "A",
                "text": "Keep engine running to ensure immediate throttle response when trucks arrive.",
                "is_correct": False,
                "feedback": "Inefficient! Consumes ~3.5 L/hr of wasted diesel and accelerates oil carbon buildup.",
            },
            {
                "id": "B",
                "text": "Engage Cat Auto-Idle Shutdown (AOD) set to 3 minutes, preserving turbo timer cooldown.",
                "is_correct": True,
                "feedback": "Correct! Cat AOD minimizes non-productive fuel burn while safeguarding turbo bearings.",
            },
            {
                "id": "C",
                "text": "Rev engine intermittently to prevent spark plug fouling.",
                "is_correct": False,
                "feedback": "Incorrect! Cat heavy diesel engines utilize compression ignition and excess revving wastes fuel.",
            },
        ],
    },
]


@router.get("/scenarios", response_model=List[Dict[str, Any]])
async def list_scenarios():
    """Retrieve all Cat Training Simulation interactive models and scenarios."""
    return SIM_SCENARIOS


@router.post("/evaluate", response_model=Dict[str, Any])
async def evaluate_simulation(req: SimEvaluationRequest):
    """Evaluate operator's decision in the Cat Simulation Model."""
    scenario = next((s for s in SIM_SCENARIOS if s["id"] == req.scenario_id), None)
    if not scenario:
        return {"error": "Scenario not found"}

    selected = next((o for o in scenario["options"] if o["id"] == req.selected_option_id), None)
    is_correct = selected["is_correct"] if selected else False
    score = 100 if is_correct else 35

    # Check inspection points if included
    inspection_bonus = min(len(req.inspection_checks) * 10, 30)

    total_score = min(100, score + inspection_bonus if is_correct else score)
    grade = "CERTIFIED CAT OPERATOR (A+)" if total_score >= 90 else "QUALIFIED (B)" if total_score >= 70 else "NEEDS RE-TRAINING (C)"

    return {
        "scenario_id": req.scenario_id,
        "is_correct": is_correct,
        "feedback": selected["feedback"] if selected else "No option selected.",
        "score": total_score,
        "certification_grade": grade,
        "cat_badge_earned": total_score >= 85,
    }
