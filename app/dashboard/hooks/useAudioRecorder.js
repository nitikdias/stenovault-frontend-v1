"use client";
import { useState, useRef, useEffect } from 'react';
import { useUser } from '@/context/userContext';


const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const sampleRate = 48000;
const recordSec = 6;
const stepSec = 5;
const recordLen = sampleRate * recordSec;
const stepLen = sampleRate * stepSec;


// --- Helper Functions (unchanged) ---
function flatten(buffers) {
  const total = buffers.reduce((sum, b) => sum + b.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const b of buffers) { out.set(b, offset); offset += b.length; }
  return out;
}


function encodeWAV(samples) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const writeStr = (o, s) => { for (let i = 0; i < s.length; i++) view.setUint8(o + i, s.charCodeAt(i)); };
  writeStr(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE"); writeStr(12, "fmt "); view.setUint32(16, 16, true);
  view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true); view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  writeStr(36, "data"); view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([view], { type: 'audio/wav' });
}


async function upload(blob, name, userId) {
  if (!userId) {
    console.error("User ID is required for upload. Upload cancelled.");
    return;
  }
  const f = new FormData();
  f.append("audio", blob, name);
  f.append("user_id", userId);

  const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
  return fetch(`/api/backend/uploadchunk`, {
    headers: { "Authorization": `Bearer ${TOKEN_KEY}` },
    credentials: "include",
    method: "POST",
    body: f,
  }).then((res) => {
    if (!res.ok) throw new Error("upload failed " + res.status);
    return res.json();
  });
}


export function useAudioRecorder() {
  const { user } = useUser(); 


  const [mics, setMics] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);


  const userIdRef = useRef(user?.id);


  const micStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const pcmBuffersRef = useRef([]);
  const chunkCounterRef = useRef(1);
  const startTimeRef = useRef(0);
  const timeoutsRef = useRef([]);
  const uploadPromisesRef = useRef([]);
  const timerRef = useRef(null);


  useEffect(() => {
    userIdRef.current = user?.id;
  }, [user]);


  const startTimer = () => {
    timerRef.current = setInterval(() => { setRecordingTime(prev => prev + 1); }, 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };


  function emitChunk(startOffset, endOffset, isFinal = false) {
    const full = flatten(pcmBuffersRef.current);
    const slice = full.slice(startOffset, endOffset);
    if (!slice.length) return;       
    const wav = encodeWAV(slice);
    const id = chunkCounterRef.current++;
    const name = `chunk_${id}${isFinal ? '_final' : ''}.wav`;
    
    const p = upload(wav, name, userIdRef.current).catch(err => console.error(err));
    uploadPromisesRef.current.push(p);
    p.finally(() => {
      uploadPromisesRef.current = uploadPromisesRef.current.filter(x => x !== p);
    });
  }


  function scheduleChunks() {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
    const startMs = startTimeRef.current || Date.now();
    
    // ✅ CHANGE: use the chunk counter as the authoritative next chunk index,
    // falling back to compute from recordingTime if counter is unset.
    const fallbackIndex = (recordingTime <= recordSec) ? 1 : Math.floor((recordingTime - recordSec) / stepSec) + 2;
    const nextChunkIndex = Math.max(1, Math.floor(chunkCounterRef.current) || fallbackIndex);

    function scheduleNext(i) {
      const fireTimeAbs = startMs + recordSec * 1000 + (i - 1) * stepSec * 1000;
      const delay = Math.max(0, fireTimeAbs - Date.now());
      const startSample = (i - 1) * stepLen;
      const endSample = startSample + recordLen;
      const t = setTimeout(() => {
        emitChunk(startSample, endSample);
        scheduleNext(i + 1);
      }, delay);
      timeoutsRef.current.push(t);
    }
    scheduleNext(nextChunkIndex);  // Start from chunkCounterRef if available
  }


  const startRec = async (resetTimer = true) => {
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach(track => track.stop());
    if (audioCtxRef.current) {
      try {
        await audioCtxRef.current.close();
      } catch (e) {
        console.warn("AudioContext close() error on startRec:", e);
      }
      audioCtxRef.current = null;
    }


    const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId } });
    micStreamRef.current = stream;
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    sourceRef.current = audioCtxRef.current.createMediaStreamSource(stream);
    processorRef.current = audioCtxRef.current.createScriptProcessor(4096, 1, 1);
    processorRef.current.onaudioprocess = (e) => pcmBuffersRef.current.push(new Float32Array(e.inputBuffer.getChannelData(0)));


    sourceRef.current.connect(processorRef.current);
    processorRef.current.connect(audioCtxRef.current.destination);


    if (resetTimer) {
      pcmBuffersRef.current = [];
      chunkCounterRef.current = 1;
      uploadPromisesRef.current = [];
      startTimeRef.current = Date.now();
      setRecordingTime(0);
    } else {
      startTimeRef.current = Date.now() - recordingTime * 1000;
    }


    setRecording(true);
    setPaused(false);
    startTimer();
    scheduleChunks();
  };


  const pauseRec = async () => {
    setPaused(true);
    stopTimer();
    // ✅ CHANGE 2: Clear pending timeouts when pausing
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach(track => track.stop());
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        await audioCtxRef.current.close();
      } catch (e) {
        console.warn("AudioContext close() error on pauseRec:", e);
      }
      audioCtxRef.current = null;
    }
    processorRef.current = null;
    sourceRef.current = null;
  };


  const resumeRec = async () => {
    setPaused(false);
    await startRec(false);
  };


  const stopRec = async () => {
    setRecording(false);
    setPaused(false);
    stopTimer();
    timeoutsRef.current.forEach(t => clearTimeout(t));
    if (micStreamRef.current) micStreamRef.current.getTracks().forEach(track => track.stop());
    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch(e){/* ignore */ }
    }
    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch(e){/* ignore */ }
    }


    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      const full = flatten(pcmBuffersRef.current);
      const elapsedSamples = full.length;
      if (chunkCounterRef.current <= 1) {
        emitChunk(0, elapsedSamples, true);
      } else {
        const lastEmittedIndex = chunkCounterRef.current - 1;
        const lastEmittedStart = Math.max(0, (lastEmittedIndex - 1) * stepLen);
        const lastEmittedEnd = lastEmittedStart + recordLen;
        const finalStart = Math.min(lastEmittedEnd, elapsedSamples);
        if (elapsedSamples > finalStart) {
          emitChunk(finalStart, elapsedSamples, true);
        }
      }
      await Promise.allSettled(uploadPromisesRef.current);
      try {
        await audioCtxRef.current.close();
      } catch(e) {
        console.warn("AudioContext close() error on stopRec:", e);
      }
      audioCtxRef.current = null;
    }
  };


  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devs => {
      const inputs = devs.filter(d => d.kind === 'audioinput');
      setMics(inputs);
      if (inputs[0]) setDeviceId(inputs[0].deviceId);
    });
    return () => {
      stopTimer();
      timeoutsRef.current.forEach(t => clearTimeout(t));
      if (micStreamRef.current) micStreamRef.current.getTracks().forEach(track => track.stop());
    };
  }, []);


  return {
    mics,
    deviceId,
    setDeviceId,
    recording,
    paused,
    recordingTime,
    startRec,
    stopRec,
    pauseRec,
    resumeRec,
  };
}
