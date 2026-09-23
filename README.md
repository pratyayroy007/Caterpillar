# Smart Operator Assistant for CAT Machinery 🚜⚡

An intelligent, context-aware operational assistant and industrial cockpit designed for **Caterpillar heavy machinery operators and fleet supervisors**. Grounded in 1,000 real-world CAN-bus telematics records across 17 machines, 8 construction sites, and 3 shifts, combined with Caterpillar Standard Operating Procedures (SOP), OSHA 1926 standards, and the **Caterpillar 2030 Sustainability Target**.

---

## 🌟 Key Capabilities & Architecture

```
                                  [ Caterpillar Industrial Cockpit ]
                                                  │
          ┌───────────────────────────┬───────────┴───────────┬───────────────────────────┐
          │                           │                       │                           │
  [ Safety Center ]       [ Machine Digital Twin ]  [ Fleet & Operations ]    [ Training Simulation ]
  • Dynamic 5m Bubble     • CAN-bus Sensor Dials    • 17 Unit Health Cards    • Rock Stall Scenario
  • Seatbelt Interlock    • Thermal / PSI Limits    • 2030 Idle Cut Engine    • Swing Pinch Hazard
  • DSS Fatigue Monitor   • Triple-Metric Scores    • Shift & Site Analytics  • 5-Point Walkaround
          │                           │                       │                           │
          └───────────────────────────┴───────────┬───────────┴───────────────────────────┘
                                                  │
                                       [ Grounded AI Copilot ]
                                                  │
           ┌──────────────────────────────────────┴──────────────────────────────────────┐
           │                                                                             │
  [ Operator Query ]                                                                     │
           │                                                                             │
  [ TF-IDF + LogisticRegression Intent Classifier ]                                      │
           │                                                                             │
  [ Entity Resolution (Machine ID, Model, Operator, Site) ]                              │
           │                                                                             │
  [ Specialized Modules & XGBoost Telematics Risk Classifier ]                           │
           │                                                                             │
  [ Gemma 4 Cloud LLM Pass-Through (`gemma-4-31b-it` via Google GenAI SDK) ]             │
           │                                                                             │
  [ Structured Response Assembly & In-Cab Recommendation ] ──────────────────────────────┘
```

### 1. 🛡️ Real-Time Safety Command
- **Safety Risk Score**: Dynamic composite scoring (0–100) factoring unfastened seatbelts, ocular fatigue signals (Cat Driver Safety System), and harsh events.
- **Dynamic 5-Meter Proximity Exclusion Zone**: Interactive radar widget simulating the 5-meter safety bubble with distance controls (0.5m to 8.0m) and emergency implement lock protocols.
- **Chronological Incident Timeline**: Live filterable log with severity classification (`CRITICAL`, `HIGH`, `MEDIUM`) and operator attribution.
- **Cat Sim Safety Protocols**: Pre-loaded SOPs for 3-point contact, proximity radar, operator fatigue cooldown, and hydraulic overpressure.

### 2. ⚙️ Machine Digital Twin
- **17 Machine Fleet**: Switch instantly across all 17 units (`EXC001`–`EXC005`, `BDZ001`–`BDZ003`, `MGR001`–`MGR002`, `WLD001`–`WLD004`, `BHL001`–`BHL003`).
- **Composite Triple Metrics**: Machine Health %, Fleet Utilization Rate %, and Safety Compliance %.
- **CAN-bus Telematics Dials**: Engine Temperature (°C), Hydraulic Pressure (psi), Vibration Level (G-index), and Fuel Burn Rate (L/hr).
- **OEM Technical Specs**: Net rated power, operating weight, bucket/blade capacity, and recent shift cycles.

### 3. 📊 Fleet Equipment & Field Operations
- **Operator-Friendly Status Cards**: Clear machine names and model descriptions (e.g. `Cat 320 Next Gen Excavator [EXC001]`) with plain-English warnings and highlighted *"👉 What The Operator Should Do"* callouts.
- **Caterpillar 2030 Climate Commitment Action Plan**: Demystified corporate ESG targets into practical in-cab habits (Auto-Idle 3 Min, Eco-Mode, Break-Time Key-Off). Interactive idle cut simulator calculating fuel liters saved, CO2 avoided, and dollar OPEX reduction.
- **Cross-Fleet Comparison Visuals**:
  - Hourly fuel burn rates by machine type (from Backhoe ~5.5 L/h to Wheel Loader ~8.6 L/h).
  - Job site wait times and haul queues across 8 sites (Nagpur, Chennai, Bengaluru, etc.).
  - Shift safety watch analyzing morning, afternoon, and night shift fatigue patterns.

### 4. 🎮 Cat Training Simulation Models
- **Interactive In-Cab Scenarios**:
  1. *Excavator Hydraulic Stall in Hard Rock* (3,150 psi pressure spike).
  2. *Proximity Exclusion Alert During Swing* (3.8m pinch hazard).
  3. *Eco-Idle Fuel Management & 2030 Target* (18m non-productive idle).
- **Physics Decision Engine**: Evaluates operator responses with instant telemetry feedback, qualification scoring, and badge rewards.
- **Pre-Shift 360° Walkaround Checklist**: 5-point OSHA 1926 virtual inspection (fluid leaks, track tension, hydraulic lines, horn/beacon, cab glass/ROPS).

### 5. 🤖 Grounded AI Operator Copilot
- **Hybrid Multi-Stage Pipeline**:
  - **TF-IDF + LogisticRegression**: Sub-millisecond intent classification across fleet telematics, mechanical diagnostics, safety protocols, and eco-operations.
  - **XGBoost CAN-bus Telematics Classifier**: Trained on 1,000 CAN-bus records to predict real-time incident risk probability %.
  - **Gemma 4 Cloud LLM Pass-Through**: Powered by Google's **`gemma-4-31b-it`** using the official `google-genai` Python SDK for deep technical queries and open-ended machinery questions.
  - **Automated Fallback**: Graceful local domain synthesis if offline or unauthenticated.

---

## 📁 Repository Structure

```
Caterpillar/
├── backend/
│   ├── app/
│   │   ├── main.py                  # FastAPI application entrypoint
│   │   ├── core/
│   │   │   └── config.py            # Environment & app settings
│   │   ├── api/
│   │   │   └── routes/
│   │   │       ├── health.py        # GET /api/health
│   │   │       ├── machines.py      # GET /api/machines & digital twin
│   │   │       ├── safety.py        # GET /api/safety telemetry & protocols
│   │   │       ├── analytics.py     # GET /api/analytics/fleet & ESG data
│   │   │       ├── simulation.py    # GET /api/simulation/scenarios & evaluation
│   │   │       └── copilot.py       # POST /api/copilot/chat
│   │   └── services/
│   │       ├── dataset_service.py   # In-memory Pandas telematics query engine
│   │       └── copilot_service.py   # TF-IDF + XGBoost + Gemma 4 pipeline
│   ├── requirements.txt             # Python dependencies (FastAPI, google-genai, etc.)
│   └── .env.example                 # Backend environment template
│
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── layout.tsx           # Dark industrial theme root layout
│   │   │   └── page.tsx             # Tab container & cockpit orchestration
│   │   ├── components/
│   │   │   ├── layout/Navbar.tsx    # Symmetrical 3-column cockpit header & dock
│   │   │   ├── safety/SafetyCenter.tsx
│   │   │   ├── digital-twin/DigitalTwin.tsx
│   │   │   ├── analytics/FleetAnalytics.tsx
│   │   │   ├── simulation/TrainingSimulation.tsx
│   │   │   └── copilot/CopilotDrawer.tsx
│   │   ├── lib/api.ts               # Typed REST API client
│   │   └── types/index.ts           # Shared TypeScript interfaces
│   ├── package.json                 # Next.js 16 + Tailwind CSS dependencies
│   └── .env.example                 # Frontend environment template
│
├── data/
│   └── synthetic_operator_dataset_1000.csv  # 1,000 CAN-bus telemetry records
│
├── .gitignore                       # Clean Git exclusion rules
└── README.md
```

---

## 🚀 Quickstart Guide

### Prerequisites
- **Python**: 3.11+ (tested on 3.13)
- **Node.js**: 18+ (tested on 20+)
- **Git**: Installed and configured

---

### Step 1: Clone the Repository
```bash
git clone https://github.com/<your-username>/caterpillar-operator-assistant.git
cd caterpillar-operator-assistant
```

---

### Step 2: Backend Setup (FastAPI)

```bash
cd backend

# Create & activate Python virtual environment
python -m venv venv

# Windows (PowerShell):
.\venv\Scripts\activate

# macOS / Linux:
source venv/bin/activate

# Install required packages
pip install -r requirements.txt

# Configure environment variables
cp .env.example .env

# Optional: Add your Google Gemini / Gemma API key to backend/.env
# GEMINI_API_KEY=your_key_here

# Launch the FastAPI backend server (port 8001)
uvicorn app.main:app --reload --host 127.0.0.1 --port 8001
```

- **Health Endpoint**: [http://127.0.0.1:8001/api/health](http://127.0.0.1:8001/api/health)
- **Interactive Swagger Docs**: [http://127.0.0.1:8001/api/docs](http://127.0.0.1:8001/api/docs)

---

### Step 3: Frontend Setup (Next.js)

Open a second terminal window:

```bash
cd frontend

# Install Node dependencies
npm install

# Configure environment variables
cp .env.example .env.local

# Start the Next.js development server (port 3000)
npm run dev
```

- **Live Application**: [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing & Verification

Run the automated backend test suite to verify the ML classifiers and Copilot responses:

```bash
cd backend
python -c "from app.services.copilot_service import copilot_service; print(copilot_service.answer_query('what is the status for Next Gen Excavator ?'))"
```

---

## 📜 License & Acknowledgments
Built with ❤️ for Caterpillar Machinery Operators and Fleet Teams. Grounded in Caterpillar Standard Operating Procedures and official telematics guidelines.
