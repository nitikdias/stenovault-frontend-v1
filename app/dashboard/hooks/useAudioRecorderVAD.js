"use client";

import { useState, useRef, useEffect } from "react";
import { MicVAD } from "@ricky0123/vad-web";
import { useUser } from "@/context/userContext";

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
  console.log(`⬆️ [UPLOAD] start ${name}, bytes=${blob.size}`);
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
  console.log(`✅ [UPLOAD] done ${name}`);
  return res.json();
}

/* ===================== HOOK ===================== */

export function useAudioRecorderVAD() {
  const { user } = useUser();
  const [mics, setMics] = useState([]);
  const [deviceId, setDeviceId] = useState("");
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [stopping, setStopping] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);

  const vadRef = useRef(null);
  const timerRef = useRef(null);
  const uploadPromisesRef = useRef([]);
  const chunkCounterRef = useRef(1);
  const userIdRef = useRef(user?.id);
  const speakingRef = useRef(false);

  const t = () => new Date().toISOString().split("T")[1];

  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user]);

  // Defensive Cleanup Helper
  const safeDestroy = (instance) => {
    if (!instance) return;
    try {
      // Logic check: MicVAD internals throw if these aren't set yet
      // We access them via getters or standard properties
      const isInitialized = instance.stream && instance.audioContext && instance.processor;
      
      if (isInitialized) {
        instance.destroy();
        console.log(`🧹 [${t()}] VAD instance destroyed successfully.`);
      } else {
        console.warn(`⚠️ [${t()}] VAD not fully initialized, skipping destroy to prevent crash.`);
      }
    } catch (e) {
      // Final catch-all for the "null stream" internal error
      console.error("Caught internal VAD error during cleanup:", e.message);
    }
  };

  useEffect(() => {
    let isMounted = true;
    let localInstance = null;
    const originalError = console.error;

    // Suppress vendor warnings
    console.error = (...args) => {
      if (args[0]?.toString().includes('Unknown CPU vendor')) return;
      originalError(...args);
    };

    const initVAD = async () => {
      try {
        console.log(`🎙️ [${t()}] Starting Init`);
        const vad = await MicVAD.new({
          modelURL: "/silero_vad_legacy.onnx",
          workletURL: "/vad.worklet.bundle.min.js",
          ortConfig: (ort) => { ort.env.wasm.wasmPaths = "/"; },
          startOnLoad: false,
          onSpeechEnd: (audio) => {
            const wav = encodeWAV(audio);
            const name = `chunk_${chunkCounterRef.current++}.wav`;
            const p = upload(wav, name, userIdRef.current).catch(e => console.error(e));
            uploadPromisesRef.current.push(p);
            p.finally(() => {
              uploadPromisesRef.current = uploadPromisesRef.current.filter((x) => x !== p);
            });
          },
          positiveSpeechThreshold: 0.75,
          negativeSpeechThreshold: 0.7,
          redemptionMs: 250,
        });

        if (!isMounted) {
          console.log(`⏳ [${t()}] Init finished but component unmounted. Cleaning up.`);
          safeDestroy(vad);
          return;
        }

        vadRef.current = vad;
        localInstance = vad;
        console.log(`✅ [${t()}] MicVAD ready`);
      } catch (err) {
        console.error("❌ MicVAD init failed", err);
      }
    };

    initVAD();

    navigator.mediaDevices.enumerateDevices().then((devices) => {
      const inputs = devices.filter((d) => d.kind === "audioinput");
      setMics(inputs);
      if (inputs[0] && !deviceId) setDeviceId(inputs[0].deviceId);
    });

    return () => {
      isMounted = false;
      console.error = originalError;
      
      const toCleanup = localInstance || vadRef.current;
      safeDestroy(toCleanup);
      
      vadRef.current = null;
      clearInterval(timerRef.current);
    };
  }, []);

  /* ===================== CONTROLS ===================== */

  const startRec = async () => {
    if (!vadRef.current) return;
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
      if (vadRef.current.audioContext?.state === "suspended") {
        await vadRef.current.audioContext.resume();
      }
    } catch (e) { return; }

    chunkCounterRef.current = 1;
    setRecording(true);
    setPaused(false);
    setRecordingTime(0);
    timerRef.current = setInterval(() => setRecordingTime(t => t + 1), 1000);
    vadRef.current.start();
  };

  const stopRec = async () => {
    if (!vadRef.current) return;
    setStopping(true);
    await new Promise(r => setTimeout(r, 400));
    vadRef.current.pause();
    await Promise.allSettled(uploadPromisesRef.current);
    setRecording(false);
    setStopping(false);
    clearInterval(timerRef.current);
  };

  return { mics, deviceId, setDeviceId, recording, paused, stopping, recordingTime, startRec, stopRec };
}