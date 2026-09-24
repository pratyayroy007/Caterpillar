"use client";

import { useState, useEffect, useRef } from "react";

interface InCabCameraFeedProps {
  isOpen: boolean;
  onClose: () => void;
  selectedMachineId: string;
  initialSeatbeltStatus?: string;
  operatorId?: string;
  onUpdateSeatbeltStatus?: (status: "Fastened" | "Unfastened") => void;
}

export function InCabCameraFeed({
  isOpen,
  onClose,
  selectedMachineId,
  initialSeatbeltStatus = "Fastened",
  operatorId = "OP1002",
  onUpdateSeatbeltStatus,
}: InCabCameraFeedProps) {
  const [feedMode, setFeedMode] = useState<"simulation" | "webcam">("simulation");
  const [seatbeltState, setSeatbeltState] = useState<"Fastened" | "Unfastened">(
    initialSeatbeltStatus === "Fastened" ? "Fastened" : "Unfastened"
  );
  const [fatigueState, setFatigueState] = useState<"Attentive" | "Fatigued">("Attentive");
  const [irFilter, setIrFilter] = useState<"infrared" | "daylight">("infrared");
  const [webcamAllowed, setWebcamAllowed] = useState<boolean | null>(null);
  const [webcamError, setWebcamError] = useState<string | null>(null);
  const [snapshotSuccess, setSnapshotSuccess] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Sync initial state
  useEffect(() => {
    setSeatbeltState(initialSeatbeltStatus === "Fastened" ? "Fastened" : "Unfastened");
  }, [initialSeatbeltStatus]);

  // Handle webcam stream start and stop
  useEffect(() => {
    if (!isOpen || feedMode !== "webcam") {
      stopWebcam();
      return;
    }

    startWebcam();

    return () => {
      stopWebcam();
    };
  }, [isOpen, feedMode]);

  const startWebcam = async () => {
    setWebcamError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error("Webcam API not supported in this browser environment.");
      }
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
      setWebcamAllowed(true);
    } catch (err: unknown) {
      console.warn("Webcam access error:", err);
      setWebcamAllowed(false);
      setWebcamError(err instanceof Error ? err.message : "Camera access was denied or is unavailable.");
      setFeedMode("simulation");
    }
  };

  const stopWebcam = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const handleToggleSeatbelt = () => {
    const next = seatbeltState === "Fastened" ? "Unfastened" : "Fastened";
    setSeatbeltState(next);
    if (onUpdateSeatbeltStatus) {
      onUpdateSeatbeltStatus(next);
    }
  };

  const handleCaptureSnapshot = () => {
    const timestamp = new Date().toLocaleTimeString();
    setSnapshotSuccess(`Compliance snapshot logged at ${timestamp} (Ref: DSS-${Date.now().toString().slice(-6)})`);
    setTimeout(() => setSnapshotSuccess(null), 4000);
  };

  if (!isOpen) return null;

  const isFastened = seatbeltState === "Fastened";
  const isAttentive = fatigueState === "Attentive";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl rounded-2xl border border-neutral-800 bg-neutral-950 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Top Header Bar */}
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-neutral-800 bg-neutral-900/90">
          <div className="flex items-center gap-3">
            <div className="w-7 h-7 rounded-md bg-[#FFCD11] text-black font-black flex items-center justify-center text-xs tracking-tighter">
              CAT
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-black text-white tracking-wide uppercase">
                  In-Cab Operator Optical Monitor
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  LIVE SENSOR FEED
                </span>
              </div>
              <p className="text-[11px] text-neutral-400 font-mono">
                Unit: <strong className="text-white">{selectedMachineId}</strong> • Operator: <strong className="text-white">{operatorId}</strong> • Protocol: <strong className="text-[#FFCD11]">PROT-ROPS-01</strong>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Feed Mode Switcher */}
            <div className="hidden sm:flex items-center bg-neutral-950 border border-neutral-800 p-0.5 rounded-lg text-xs font-mono">
              <button
                onClick={() => setFeedMode("simulation")}
                className={`px-2.5 py-1 rounded font-bold transition ${
                  feedMode === "simulation"
                    ? "bg-[#FFCD11] text-black"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                Cockpit Simulation
              </button>
              <button
                onClick={() => setFeedMode("webcam")}
                className={`px-2.5 py-1 rounded font-bold transition flex items-center gap-1 ${
                  feedMode === "webcam"
                    ? "bg-[#FFCD11] text-black"
                    : "text-neutral-400 hover:text-white"
                }`}
              >
                <span>Live WebCam</span>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </button>
            </div>

            <button
              onClick={() => {
                stopWebcam();
                onClose();
              }}
              className="w-8 h-8 rounded-lg bg-neutral-900 border border-neutral-800 text-neutral-400 hover:text-white flex items-center justify-center font-bold text-sm transition"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Feed Viewport Container */}
        <div className="relative flex-1 bg-black min-h-[340px] sm:min-h-[420px] flex items-center justify-center overflow-hidden">
          {/* LIVE WEBCAM MODE */}
          {feedMode === "webcam" && (
            <div className="relative w-full h-full flex items-center justify-center">
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${
                  irFilter === "infrared" ? "filter grayscale contrast-125 brightness-95" : ""
                }`}
              />

              {webcamAllowed === false && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-neutral-950/90 p-6 text-center z-30">
                  <span className="text-3xl mb-2">📷</span>
                  <h4 className="text-sm font-bold text-white mb-1">Webcam Access Unavailable</h4>
                  <p className="text-xs text-neutral-400 max-w-sm mb-4">
                    {webcamError || "Please allow camera access in your browser or switch to the industrial cockpit simulation feed."}
                  </p>
                  <button
                    onClick={() => setFeedMode("simulation")}
                    className="px-4 py-1.5 rounded-lg bg-[#FFCD11] text-black text-xs font-bold font-mono"
                  >
                    Switch to Cockpit Simulation Feed
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SIMULATED COCKPIT IR FEED MODE */}
          {feedMode === "simulation" && (
            <div
              className={`relative w-full h-full flex items-center justify-center ${
                irFilter === "infrared"
                  ? "bg-gradient-to-b from-[#0a180e] via-[#041008] to-black"
                  : "bg-gradient-to-b from-neutral-900 via-neutral-950 to-black"
              }`}
            >
              {/* Cockpit Canopy Lines */}
              <div className="absolute inset-0 pointer-events-none opacity-25">
                <div className="w-full h-full border-x-8 border-neutral-800/40 relative">
                  <div className="absolute top-10 left-0 right-0 h-0.5 bg-neutral-700/50" />
                  <div className="absolute bottom-20 left-0 right-0 h-0.5 bg-neutral-700/50" />
                </div>
              </div>

              {/* In-Cab Operator SVG Graphic */}
              <div className="relative flex flex-col items-center justify-center select-none scale-110 sm:scale-125">
                {/* Cab ROPS Frame & Seatback */}
                <div className="w-48 h-64 rounded-t-3xl border-4 border-neutral-800 bg-neutral-900/80 relative flex flex-col items-center pt-6 shadow-2xl">
                  {/* Headrest */}
                  <div className="w-24 h-14 rounded-2xl bg-neutral-800 border border-neutral-700 mb-2" />

                  {/* Operator Avatar */}
                  <div className="relative flex flex-col items-center">
                    {/* ANSI Hard Hat */}
                    <div className="w-20 h-10 rounded-t-full bg-[#FFCD11] border-2 border-amber-600 shadow-md flex items-center justify-center">
                      <span className="text-[7px] font-black text-black tracking-tighter">CAT SAFETY</span>
                    </div>

                    {/* Operator Head & Eyes */}
                    <div className="relative w-16 h-14 rounded-b-2xl bg-amber-200/90 border border-amber-300/40 flex flex-col items-center justify-center -mt-1 shadow-inner">
                      {/* Eyes / Pupils with live state */}
                      <div className="flex items-center gap-4 mt-1">
                        <div
                          className={`w-3 rounded-full transition-all ${
                            isAttentive
                              ? "h-2.5 bg-neutral-900 border border-neutral-700"
                              : "h-0.5 bg-red-700 animate-pulse"
                          }`}
                        />
                        <div
                          className={`w-3 rounded-full transition-all ${
                            isAttentive
                              ? "h-2.5 bg-neutral-900 border border-neutral-700"
                              : "h-0.5 bg-red-700 animate-pulse"
                          }`}
                        />
                      </div>
                      <div className="w-4 h-1 bg-amber-400/80 rounded-full mt-2" />
                    </div>

                    {/* Operator Torso & High-Vis Vest */}
                    <div className="relative w-36 h-28 bg-emerald-600 rounded-t-2xl border-2 border-emerald-500 flex items-center justify-center mt-1 overflow-hidden shadow-lg">
                      {/* Reflective Stripes */}
                      <div className="absolute top-3 left-0 right-0 h-3 bg-amber-300/90 -rotate-3" />
                      <div className="absolute bottom-6 left-0 right-0 h-3 bg-amber-300/90 rotate-3" />

                      {/* 3-Point Seatbelt Harness (Dynamic Render) */}
                      {isFastened ? (
                        <div className="absolute inset-0 pointer-events-none">
                          {/* Diagonal Belt */}
                          <div className="absolute top-0 right-2 w-7 h-36 bg-neutral-950 border-x-2 border-orange-500 -rotate-45 shadow-xl origin-top-right flex items-center justify-center">
                            <span className="text-[6px] font-black text-orange-400 rotate-90 tracking-widest uppercase">
                              ISO 6683
                            </span>
                          </div>
                          {/* Latch Buckle */}
                          <div className="absolute bottom-3 left-4 w-6 h-5 rounded bg-orange-600 border border-orange-400 flex items-center justify-center text-[7px] font-bold text-white shadow-md">
                            LATCH
                          </div>
                        </div>
                      ) : (
                        <div className="absolute inset-0 flex items-center justify-center bg-red-950/40 border border-red-500/50">
                          <span className="text-[10px] font-black uppercase text-red-400 animate-pulse bg-black/80 px-2 py-0.5 rounded border border-red-500">
                            HARNESS DISENGAGED
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Joystick & Cab Console in foreground */}
                <div className="w-64 h-8 bg-neutral-900 border-t-2 border-neutral-700 rounded-t-xl -mt-2 flex items-center justify-between px-6 z-10">
                  <div className="w-3 h-5 bg-neutral-700 rounded-t" />
                  <div className="text-[8px] font-mono text-[#FFCD11] font-bold">CAT ELECTRO-HYDRAULIC CAB</div>
                  <div className="w-3 h-5 bg-neutral-700 rounded-t" />
                </div>
              </div>
            </div>
          )}

          {/* SHARED AI VISION HUD OVERLAY */}
          <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between z-20">
            {/* Top HUD Line */}
            <div className="flex items-start justify-between">
              <div className="flex flex-col gap-1 text-[11px] font-mono text-emerald-400 font-bold bg-black/60 p-2 rounded-lg border border-emerald-500/30 backdrop-blur-sm">
                <div className="flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                  <span>REC [LIVE OPTICAL IR]</span>
                  <span className="text-neutral-400">| 1080P 30FPS</span>
                </div>
                <div className="text-[10px] text-neutral-300">
                  CAM: <strong className="text-white">CAT-DSS-CAB-01</strong> • IR SPECTRUM: <strong className="text-[#FFCD11] uppercase">{irFilter}</strong>
                </div>
              </div>

              {/* AI Detection Confidence */}
              <div className="text-right flex flex-col items-end gap-1">
                <span className="px-2 py-1 rounded bg-black/70 border border-neutral-800 text-[10px] font-mono font-bold text-white flex items-center gap-1.5">
                  <span>AI VISION v4.2</span>
                  <span className="text-emerald-400">99.2% ACC</span>
                </span>
                <span className="text-[9px] font-mono text-neutral-400 bg-black/60 px-1.5 py-0.5 rounded">
                  LATENCY: 14ms
                </span>
              </div>
            </div>

            {/* Center Reticle & Dynamic AI Bounding Boxes */}
            <div className="relative w-full flex-1 flex items-center justify-center">
              {/* Face/Eye Detection Bounding Box */}
              <div className="relative w-44 h-48 rounded-xl border-2 border-dashed transition-colors duration-300 flex flex-col justify-between p-1.5 border-emerald-400/80 bg-emerald-500/5">
                <div className="flex justify-between text-[9px] font-mono font-black text-emerald-400 bg-black/70 px-1 rounded">
                  <span>FACE [99.4%]</span>
                  <span>{isAttentive ? "EYES: OPEN" : "EYES: CLOSED"}</span>
                </div>

                {/* Torso/Seatbelt Vector Line */}
                <div className="relative w-full flex items-center justify-center">
                  <div
                    className={`px-2 py-0.5 rounded text-[10px] font-mono font-black transition-all ${
                      isFastened
                        ? "bg-emerald-500/30 text-emerald-300 border border-emerald-500/60"
                        : "bg-red-500/40 text-red-300 border border-red-500 animate-pulse"
                    }`}
                  >
                    {isFastened ? "✓ 3-POINT HARNESS DETECTED" : "⚠️ NO SEATBELT DETECTED"}
                  </div>
                </div>

                <div className="flex justify-between text-[9px] font-mono text-neutral-400 bg-black/70 px-1 rounded">
                  <span>TRACK ID: #001</span>
                  <span>{isFastened ? "ISO 6683 PASS" : "SOP VIOLATION"}</span>
                </div>
              </div>
            </div>

            {/* Bottom HUD Line: Watermark & Telemetry */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-2 bg-black/70 p-2 rounded-lg border border-neutral-800/80 text-[10px] font-mono backdrop-blur-sm">
              <div className="flex items-center gap-3">
                <span className={isFastened ? "text-emerald-400 font-bold" : "text-red-400 font-black animate-pulse"}>
                  ● SEATBELT: {seatbeltState.toUpperCase()}
                </span>
                <span className="text-neutral-500">|</span>
                <span className={isAttentive ? "text-emerald-400 font-bold" : "text-amber-400 font-black"}>
                  ● DSS GAZE: {fatigueState.toUpperCase()}
                </span>
                <span className="text-neutral-500">|</span>
                <span className="text-neutral-300">
                  INTERLOCK: {isFastened ? "HYDRAULICS ENABLED" : "PILOT LOCKED OUT"}
                </span>
              </div>

              <div className="text-neutral-400">
                PROT-ROPS-01 COMPLIANCE VERIFICATION
              </div>
            </div>
          </div>
        </div>

        {/* Snapshot Success Toast */}
        {snapshotSuccess && (
          <div className="bg-emerald-500 text-black text-xs font-bold font-mono px-4 py-2 text-center transition animate-in fade-in">
            ✓ {snapshotSuccess}
          </div>
        )}

        {/* Safety Protocol Interlock Action Banner */}
        <div
          className={`px-5 py-2.5 flex items-center justify-between text-xs font-mono transition-colors ${
            isFastened
              ? "bg-emerald-950/80 text-emerald-300 border-t border-emerald-500/30"
              : "bg-red-950/90 text-red-300 border-t border-red-500/40 animate-pulse"
          }`}
        >
          <div className="flex items-center gap-2">
            <span className="text-base">{isFastened ? "🛡️" : "🛑"}</span>
            <div>
              <strong className="block text-white">
                {isFastened
                  ? "PROT-ROPS-01 Verified: Pilot Hydraulic Controls Active"
                  : "PROT-ROPS-01 Violation: Hydraulic Pilot Lockout Engaged"}
              </strong>
              <span className="text-[11px] opacity-90">
                {isFastened
                  ? "Optical sensor confirms 3-point harness is securely fastened across torso. Full breakout power enabled."
                  : "Safety interlock solenoid de-energized. Work tools (boom, bucket, stick) are electronically locked out."}
              </span>
            </div>
          </div>

          <span className="hidden md:inline-block px-2.5 py-1 rounded bg-black/40 text-[10px] font-bold border border-current">
            {isFastened ? "STATUS: NOMINAL" : "STATUS: INTERLOCK ACTIVE"}
          </span>
        </div>

        {/* Interactive In-Cab Testing & Verification Controls */}
        <div className="p-4 bg-neutral-900 border-t border-neutral-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="text-neutral-400 font-bold uppercase text-[11px] mr-1">Simulate Sensor:</span>

            {/* Seatbelt Toggle Button */}
            <button
              onClick={handleToggleSeatbelt}
              className={`px-3 py-1.5 rounded-lg font-bold font-mono transition flex items-center gap-1.5 ${
                isFastened
                  ? "bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30"
                  : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 hover:bg-emerald-500/30"
              }`}
            >
              <span>{isFastened ? "Simulate Unfasten Seatbelt" : "Simulate Fasten Seatbelt"}</span>
            </button>

            {/* Fatigue Toggle Button */}
            <button
              onClick={() => setFatigueState(isAttentive ? "Fatigued" : "Attentive")}
              className={`px-3 py-1.5 rounded-lg font-bold font-mono transition flex items-center gap-1.5 ${
                isAttentive
                  ? "bg-amber-500/20 text-amber-400 border border-amber-500/40 hover:bg-amber-500/30"
                  : "bg-neutral-800 text-neutral-300 border border-neutral-700 hover:text-white"
              }`}
            >
              <span>{isAttentive ? "Simulate Eye Fatigue" : "Simulate Attentive Gaze"}</span>
            </button>

            {/* IR / Daylight Filter Toggle */}
            <button
              onClick={() => setIrFilter(irFilter === "infrared" ? "daylight" : "infrared")}
              className="px-3 py-1.5 rounded-lg bg-neutral-950 border border-neutral-800 text-neutral-300 hover:text-white font-mono font-bold text-xs"
            >
              Mode: {irFilter === "infrared" ? "Night-Vision IR" : "Standard Optical"}
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleCaptureSnapshot}
              className="px-3.5 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white font-bold font-mono text-xs border border-neutral-700 flex items-center gap-1.5 transition shadow"
            >
              <span>📸</span>
              <span>Log Snapshot</span>
            </button>

            <button
              onClick={() => {
                stopWebcam();
                onClose();
              }}
              className="px-4 py-1.5 rounded-lg bg-[#FFCD11] hover:bg-[#e5b80f] text-black font-black font-mono text-xs transition shadow-md shadow-[#FFCD11]/20"
            >
              Done / Return
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
