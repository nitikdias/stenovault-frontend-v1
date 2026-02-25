"use client";

import { useState, useRef, useEffect } from "react";
import { MicVAD } from "@ricky0123/vad-web";
import { useUser } from "../../../context/userContext";

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

/* ===================== WAV ENCODER ===================== */

function encodeWAV(samples) {
  const sampleRate = 16000;
  const buffer = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buffer);

  const writeString = (offset, string) => {
    for (let i = 0; i < string.length; i++) {
      view.setUint8(offset + i, string.charCodeAt(i));
    }
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(36, "data");
  view.setUint32(40, samples.length * 2, true);

  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }

  return new Blob([view], { type: "audio/wav" });
}

/* ===================== UPLOAD ===================== */

async function upload(blob, name, userId) {
  if (!userId) return;

  console.log(`⬆️ Uploading ${name} (${blob.size} bytes)`);

  const form = new FormData();
  form.append("audio", blob, name);
  form.append("user_id", userId);

  const res = await fetch("/api/backend/uploadchunk", {
    method: "POST",
    headers: { "X-API-Key": API_KEY },
    credentials: "include",
    body: form,
  });

  if (!res.ok) throw new Error(`Upload failed ${res.status}`);
  return res.json();
}

/* ===================== HOOK ===================== */

export function useAudioRecorderVAD() {
  const { user } = useUser();

  const [mics, setMics] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  // Suppress ONNX runtime warnings globally
  const originalWarn = console.warn;
  const originalError = console.error;
  console.warn = function (...args) {
    if (typeof args[0] === 'string' && args[0].includes('onnxruntime')) return;
    if (typeof args[0] === 'string' && args[0].includes('Unknown CPU vendor')) return;
    originalWarn.apply(console, args);
  };
  console.error = function (...args) {
    if (typeof args[0] === 'string' && args[0].includes('onnxruntime')) return;
    if (typeof args[0] === 'string' && args[0].includes('Unknown CPU vendor')) return;
    originalError.apply(console, args);
  };
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const vadRef = useRef(null);
  const activeStreamRef = useRef(null); // track the open mic stream separately
  const timerRef = useRef(null);
  const uploadPromisesRef = useRef([]);
  const chunkCounterRef = useRef(1);
  const userIdRef = useRef(user?.id);

  const t = () => new Date().toISOString().split("T")[1];

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user]);

  /* ===================== SAFE DESTROY ===================== */

  const destroyVAD = () => {
    // Stop mic stream tracks first — this is what actually releases the hardware
    if (activeStreamRef.current) {
      activeStreamRef.current.getTracks().forEach((track) => {
        track.stop();
        console.log("🎤 Stopped track:", track.label);
      });
      activeStreamRef.current = null;
    }
    // Destroy VAD instance
    if (vadRef.current) {
      try {
        vadRef.current.destroy();
        console.log("🧹 VAD destroyed");
      } catch (e) {
        console.warn("⚠️ VAD destroy error:", e.message);
      }
      vadRef.current = null;
    }
  };

  /* ===================== ENUMERATE DEVICES ===================== */

  useEffect(() => {
    const initDevices = async () => {
      try {
        // Try to enumerate with labels if permission already granted (no prompt)
        let devices = await navigator.mediaDevices.enumerateDevices();
        let inputs = devices.filter((d) => d.kind === "audioinput");

        // If labels are empty, permission hasn't been granted yet — don't set a real deviceId.
        // getUserMedia will be called lazily inside startRec (triggered by user click).
        if (inputs.length > 0 && inputs[0].label === "") {
          console.log("🎤 Mic permission not yet granted — will request on first recording");
          setMics(inputs);
          // Leave deviceId as "" — startRec will use "default" constraint
          return;
        }

        setMics(inputs);
        if (inputs.length > 0) {
          setDeviceId(inputs[0].deviceId);
          console.log("🎤 Mics found:", inputs.map((m) => m.label));
        }
      } catch (err) {
        console.error("enumerateDevices failed", err);
      }
    };
    initDevices();
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      destroyVAD();
      clearInterval(timerRef.current);
    };
  }, []);

  /* ===================== CONTROLS ===================== */

  const startRec = async () => {
    // Always destroy previous VAD/stream and re-init with current deviceId.
    // This ensures mic changes take effect and getUserMedia fires from user interaction.
    destroyVAD();

    const targetDeviceId = deviceId || "default";
    console.log(`🔄 Initialising mic for recording, deviceId: ${targetDeviceId}`);

    // --- Open stream (user-gesture context = no permission error) ---
    let stream;
    try {
      const audioConstraints =
        targetDeviceId === "default"
          ? { echoCancellation: false, noiseSuppression: false, autoGainControl: false }
          : { deviceId: { exact: targetDeviceId }, echoCancellation: false, noiseSuppression: false, autoGainControl: false };

      stream = await navigator.mediaDevices.getUserMedia({ audio: audioConstraints });
    } catch (err) {
      console.error("❌ getUserMedia failed:", err);
      return;
    }

    const track = stream.getAudioTracks()[0];
    console.log("✅ Stream opened on:", track.label, "deviceId:", track.getSettings().deviceId);
    activeStreamRef.current = stream;

    // After first grant, re-enumerate to get labelled mic names for the dropdown
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const inputs = devices.filter((d) => d.kind === "audioinput");
      if (inputs.length > 0 && inputs[0].label !== "") {
        setMics(inputs);
        // If we were on "default", now switch deviceId to the real one so dropdown shows correctly
        if (targetDeviceId === "default") {
          const realId = track.getSettings().deviceId;
          if (realId) setDeviceId(realId);
        }
      }
    } catch (_) { }

    // --- Init MicVAD with the stream ---
    let vad;
    try {
      vad = await MicVAD.new({
        modelURL: "/silero_vad_legacy.onnx",
        workletURL: "/vad.worklet.bundle.min.js",
        ortConfig: (ort) => { ort.env.wasm.wasmPaths = "/"; },
        startOnLoad: false,
        stream,
        onSpeechEnd: (audio) => {
          const wav = encodeWAV(audio);
          const name = `chunk_${chunkCounterRef.current++}.wav`;
          const p = upload(wav, name, userIdRef.current).catch(console.error);
          uploadPromisesRef.current.push(p);
          p.finally(() => {
            uploadPromisesRef.current = uploadPromisesRef.current.filter((x) => x !== p);
          });
        },
        positiveSpeechThreshold: 0.75,
        negativeSpeechThreshold: 0.7,
        redemptionMs: 250,
      });
    } catch (err) {
      console.error("❌ MicVAD init failed:", err);
      stream.getTracks().forEach((t) => t.stop());
      activeStreamRef.current = null;
      return;
    }

    vadRef.current = vad;
    console.log(`✅ MicVAD ready — recording on: ${track.label}`);

    try {
      if (vad.audioContext?.state === "suspended") {
        await vad.audioContext.resume();
      }
    } catch (e) {
      console.warn("AudioContext resume failed:", e.message);
    }

    chunkCounterRef.current = 1;
    setRecording(true);
    setPaused(false);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime((s) => s + 1), 1000);
    vad.start();
  };

  const stopRec = async () => {
    if (!vadRef.current) return;

    setStopping(true);
    await new Promise((r) => setTimeout(r, 400));
    vadRef.current.pause();
    await Promise.allSettled(uploadPromisesRef.current);
    setRecording(false);
    setStopping(false);
    clearInterval(timerRef.current);
    console.log("✅ Recording stopped");
  };

  return {
    mics,
    deviceId,
    setDeviceId,
    recording,
    paused,
    stopping,
    recordingTime,
    startRec,
    stopRec,
  };
}