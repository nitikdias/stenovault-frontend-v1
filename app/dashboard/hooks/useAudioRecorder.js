"use client";
import { useState, useRef, useEffect } from 'react';
import { useUser } from '../../../context/userContext';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
const sampleRate = 44000;
const recordSec = 6;
const stepSec = 3;
const recordLen = sampleRate * recordSec;  // 288000 samples
const stepLen = sampleRate * stepSec;      // 240000 samples

// --- Helper Functions ---
function flatten(buffers) {
  const total = buffers.reduce((sum, b) => sum + b.length, 0);
  const out = new Float32Array(total);
  let offset = 0;
  for (const b of buffers) {
    out.set(b, offset);
    offset += b.length;
  }
  console.log(`🔧 [flatten] Flattened ${buffers.length} buffers into ${total} samples`);
  return out;
}

function encodeWAV(samples) {
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const writeStr = (o, s) => {
    for (let i = 0; i < s.length; i++)
      view.setUint8(o + i, s.charCodeAt(i));
  };
  writeStr(0, "RIFF");
  view.setUint32(4, 36 + samples.length * 2, true);
  writeStr(8, "WAVE");
  writeStr(12, "fmt ");
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * 2, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeStr(36, "data");
  view.setUint32(40, samples.length * 2, true);
  let offset = 44;
  for (let i = 0; i < samples.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }
  return new Blob([view], { type: 'audio/wav' });
}

async function upload(blob, name, userId) {
  if (!userId) {
    console.error("❌ [upload] User ID is required. Upload cancelled.");
    return;
  }
  const f = new FormData();
  f.append("audio", blob, name);
  f.append("user_id", userId);

  console.log(`📤 [upload] Starting upload: ${name}, size=${(blob.size / 1024).toFixed(2)}KB`);

  return fetch(`/api/backend/uploadchunk`, {
    headers: { "X-API-Key": API_KEY },
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
  const [stopping, setStopping] = useState(false);
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
  const recordingRef = useRef(false);
  const lastEmittedSampleRef = useRef(0); // Track last emitted sample position

  useEffect(() => {
    userIdRef.current = user?.id;
    console.log(`👤 [useEffect] User ID updated: ${user?.id}`);
  }, [user]);

  const startTimer = () => {
    timerRef.current = setInterval(() => {
      setRecordingTime(prev => prev + 1);
    }, 1000);
    console.log(`⏱️ [startTimer] Timer started`);
  };

  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
      console.log(`⏱️ [stopTimer] Timer stopped`);
    }
  };

  function emitChunk(chunkIndex, isFinal = false) {
    const full = flatten(pcmBuffersRef.current);
    const fullLength = full.length;

    console.log(`\n${'='.repeat(80)}`);
    console.log(`📦 [emitChunk] STARTING CHUNK ${chunkIndex}${isFinal ? ' (FINAL)' : ''}`);
    console.log(`📦 [emitChunk] Total buffer length: ${fullLength} samples (${(fullLength / sampleRate).toFixed(2)}s)`);
    console.log(`📦 [emitChunk] Last emitted position: ${lastEmittedSampleRef.current} samples`);
    console.log(`📦 [emitChunk] recordLen=${recordLen}, stepLen=${stepLen}`);

    // Calculate start and end positions
    let startOffset, endOffset;

    if (isFinal) {
      // Final chunk: from last emitted position to end of buffer
      startOffset = lastEmittedSampleRef.current;
      endOffset = fullLength;
      console.log(`📦 [emitChunk] FINAL chunk calculation:`);
    } else {
      // 🔧 FIX: Always use lastEmittedSampleRef for continuity
      startOffset = lastEmittedSampleRef.current;
      endOffset = Math.min(startOffset + recordLen, fullLength);
      console.log(`📦 [emitChunk] Regular chunk calculation (from lastEmitted):`);
    }

    console.log(`📦 [emitChunk]   startOffset = ${startOffset} samples (${(startOffset / sampleRate).toFixed(2)}s)`);
    console.log(`📦 [emitChunk]   endOffset = ${endOffset} samples (${(endOffset / sampleRate).toFixed(2)}s)`);

    // Validate boundaries
    if (startOffset >= fullLength) {
      console.error(`❌ [emitChunk] INVALID: startOffset (${startOffset}) >= buffer length (${fullLength})`);
      console.log(`${'='.repeat(80)}\n`);
      return;
    }

    const slice = full.slice(startOffset, endOffset);
    const sliceLength = slice.length;

    console.log(`📦 [emitChunk] Slice extracted: ${sliceLength} samples (${(sliceLength / sampleRate).toFixed(2)}s)`);

    if (sliceLength === 0) {
      console.warn(`⚠️ [emitChunk] Empty slice, SKIPPING`);
      console.log(`${'='.repeat(80)}\n`);
      return;
    }

    // 🔧 FIX: For final chunks, allow smaller segments; otherwise require minimum 0.5s
    if (!isFinal && sliceLength < sampleRate * 0.5) {
      console.warn(`⚠️ [emitChunk] Slice too small (${sliceLength} samples, ${(sliceLength / sampleRate).toFixed(2)}s), SKIPPING (not final chunk)`);
      console.log(`${'='.repeat(80)}\n`);
      return;
    }

    if (isFinal && sliceLength < sampleRate * 0.1) {
      console.warn(`⚠️ [emitChunk] Final chunk too small (${sliceLength} samples, ${(sliceLength / sampleRate).toFixed(2)}s < 0.1s), SKIPPING`);
      console.log(`${'='.repeat(80)}\n`);
      return;
    }

    // 🔧 FIX: Update last emitted position based on actual slice end
    lastEmittedSampleRef.current = startOffset + sliceLength;
    console.log(`📦 [emitChunk] Updated lastEmittedSample to: ${lastEmittedSampleRef.current}`);

    const wav = encodeWAV(slice);
    const name = `chunk_${chunkIndex}${isFinal ? '_final' : ''}.wav`;

    console.log(`🚀 [emitChunk] Encoding WAV: ${name}`);
    console.log(`🚀 [emitChunk]   WAV size: ${(wav.size / 1024).toFixed(2)}KB`);
    console.log(`🚀 [emitChunk]   Samples: ${sliceLength}`);
    console.log(`🚀 [emitChunk]   Duration: ${(sliceLength / sampleRate).toFixed(2)}s`);
    console.log(`${'='.repeat(80)}\n`);

    const p = upload(wav, name, userIdRef.current)
      .then(() => console.log(`✅ [emitChunk] ${name} uploaded successfully`))
      .catch(err => console.error(`❌ [emitChunk] ${name} failed:`, err));

    uploadPromisesRef.current.push(p);
    p.finally(() => {
      uploadPromisesRef.current = uploadPromisesRef.current.filter(x => x !== p);
    });
  }

  function scheduleChunks() {
    console.log(`\n🎬 [scheduleChunks] ========== STARTING CHUNK SCHEDULER ==========`);
    console.log(`🎬 [scheduleChunks] recordSec=${recordSec}, stepSec=${stepSec}`);
    console.log(`🎬 [scheduleChunks] recordLen=${recordLen}, stepLen=${stepLen}`);

    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];

    function scheduleNext(i) {
      if (!recordingRef.current) {
        console.log(`⏹️ [scheduleNext] Recording stopped, exiting scheduler at chunk ${i}`);
        return;
      }

      const delay = i === 1 ? recordSec * 1000 : stepSec * 1000;

      console.log(`\n⏰ [scheduleNext] ========== SCHEDULING CHUNK ${i} ==========`);
      console.log(`⏰ [scheduleNext] Delay: ${delay / 1000}s`);
      console.log(`⏰ [scheduleNext] Last emitted sample: ${lastEmittedSampleRef.current}`);

      const t = setTimeout(() => {
        console.log(`\n🔔 [scheduleNext] ========== TIMEOUT FIRED FOR CHUNK ${i} ==========`);

        if (!recordingRef.current) {
          console.log(`⏹️ [scheduleNext timeout] Recording stopped, skipping chunk ${i}`);
          return;
        }

        const currentBufferLength = flatten(pcmBuffersRef.current).length;
        const lastEmitted = lastEmittedSampleRef.current;
        const availableNewSamples = currentBufferLength - lastEmitted;

        console.log(`🔔 [scheduleNext] Current buffer length: ${currentBufferLength} samples (${(currentBufferLength / sampleRate).toFixed(2)}s)`);
        console.log(`🔔 [scheduleNext] Last emitted: ${lastEmitted} samples`);
        console.log(`🔔 [scheduleNext] Available new samples: ${availableNewSamples} (${(availableNewSamples / sampleRate).toFixed(2)}s)`);

        // 🔧 FIX: Check available samples relative to lastEmitted, not absolute position
        if (availableNewSamples >= sampleRate) {
          console.log(`✅ [scheduleNext] Enough audio available, emitting chunk ${i}`);
          emitChunk(i);
          scheduleNext(i + 1);
        } else {
          console.warn(`⚠️ [scheduleNext] Not enough new audio (${(availableNewSamples / sampleRate).toFixed(2)}s < 1s)`);
          console.warn(`⚠️ [scheduleNext] Retrying in 1 second...`);

          setTimeout(() => {
            if (recordingRef.current) {
              const retryBufferLength = flatten(pcmBuffersRef.current).length;
              const retryAvailable = retryBufferLength - lastEmittedSampleRef.current;
              console.log(`🔄 [scheduleNext retry] Available now: ${retryAvailable} samples (${(retryAvailable / sampleRate).toFixed(2)}s)`);

              if (retryAvailable >= sampleRate * 0.5) { // At least 0.5s
                emitChunk(i);
              }
              scheduleNext(i + 1);
            }
          }, 1000);
        }
      }, delay);

      timeoutsRef.current.push(t);
    }

    scheduleNext(1);
    console.log(`✅ [scheduleChunks] Scheduler initialized\n`);
  }

  const startRec = async (resetTimer = true) => {
    console.log(`\n🎙️ [startRec] ========== STARTING RECORDING ==========`);
    console.log(`🎙️ [startRec] resetTimer=${resetTimer}`);
    console.log(`🎙️ [startRec] deviceId=${deviceId}`);

    if (micStreamRef.current) {
      console.log(`🎙️ [startRec] Stopping existing mic stream`);
      micStreamRef.current.getTracks().forEach(track => track.stop());
    }

    if (audioCtxRef.current) {
      try {
        await audioCtxRef.current.close();
        console.log(`🎙️ [startRec] Closed existing AudioContext`);
      } catch (e) {
        console.warn("⚠️ [startRec] AudioContext close() error:", e);
      }
      audioCtxRef.current = null;
    }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId } });
    micStreamRef.current = stream;
    console.log(`🎙️ [startRec] Got microphone stream`);

    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    console.log(`🎙️ [startRec] Created AudioContext, sampleRate=${audioCtxRef.current.sampleRate}`);

    sourceRef.current = audioCtxRef.current.createMediaStreamSource(stream);
    processorRef.current = audioCtxRef.current.createScriptProcessor(4096, 1, 1);
    console.log(`🎙️ [startRec] Created ScriptProcessorNode with bufferSize=4096`);

    let audioProcessCallCount = 0;
    processorRef.current.onaudioprocess = (e) => {
      const inputData = new Float32Array(e.inputBuffer.getChannelData(0));
      pcmBuffersRef.current.push(inputData);
      audioProcessCallCount++;

      if (audioProcessCallCount % 50 === 0) { // Log every 50 calls
        const totalSamples = pcmBuffersRef.current.reduce((sum, b) => sum + b.length, 0);
        console.log(`🎤 [audioprocess] Call #${audioProcessCallCount}, Total samples: ${totalSamples} (${(totalSamples / sampleRate).toFixed(2)}s)`);
      }
    };

    sourceRef.current.connect(processorRef.current);
    processorRef.current.connect(audioCtxRef.current.destination);
    console.log(`🎙️ [startRec] Audio pipeline connected`);

    if (resetTimer) {
      pcmBuffersRef.current = [];
      chunkCounterRef.current = 1;
      lastEmittedSampleRef.current = 0;
      uploadPromisesRef.current = [];
      startTimeRef.current = Date.now();
      setRecordingTime(0);
      console.log(`🎙️ [startRec] Reset all buffers and counters`);
    } else {
      startTimeRef.current = Date.now() - recordingTime * 1000;
      console.log(`🎙️ [startRec] Resuming from ${recordingTime}s`);
    }

    setRecording(true);
    recordingRef.current = true;
    setPaused(false);
    console.log(`✅ [startRec] Recording state: recording=${true}, paused=${false}`);
    console.log(`✅ [startRec] Starting timer and scheduler\n`);

    startTimer();
    scheduleChunks();
  };

  const pauseRec = async () => {
    console.log(`\n⏸️ [pauseRec] ========== PAUSING RECORDING ==========`);
    setPaused(true);
    recordingRef.current = false;
    stopTimer();

    console.log(`⏸️ [pauseRec] Clearing ${timeoutsRef.current.length} pending timeouts`);
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      console.log(`⏸️ [pauseRec] Stopped mic stream`);
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        await audioCtxRef.current.close();
        console.log(`⏸️ [pauseRec] Closed AudioContext`);
      } catch (e) {
        console.warn("⚠️ [pauseRec] AudioContext close() error:", e);
      }
      audioCtxRef.current = null;
    }

    processorRef.current = null;
    sourceRef.current = null;
    console.log(`✅ [pauseRec] Paused successfully\n`);
  };

  const resumeRec = async () => {
    console.log(`\n▶️ [resumeRec] ========== RESUMING RECORDING ==========\n`);
    setPaused(false);
    await startRec(false);
  };

  const stopRec = async () => {
    console.log(`\n🛑 [stopRec] ========== STOPPING RECORDING ==========`);
    console.log(`🛑 [stopRec] Current chunk counter: ${chunkCounterRef.current}`);
    console.log(`🛑 [stopRec] Last emitted sample: ${lastEmittedSampleRef.current}`);

    // Show stopping state to user
    setStopping(true);

    // First, mark as stopping to prevent new chunks from being scheduled
    recordingRef.current = false;

    console.log(`🛑 [stopRec] Clearing ${timeoutsRef.current.length} pending timeouts`);
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];

    // Process final chunk BEFORE stopping streams
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      const full = flatten(pcmBuffersRef.current);
      const totalSamples = full.length;

      console.log(`🛑 [stopRec] Final buffer analysis:`);
      console.log(`🛑 [stopRec]   Total samples: ${totalSamples} (${(totalSamples / sampleRate).toFixed(2)}s)`);
      console.log(`🛑 [stopRec]   Last emitted: ${lastEmittedSampleRef.current} (${(lastEmittedSampleRef.current / sampleRate).toFixed(2)}s)`);
      console.log(`🛑 [stopRec]   Remaining: ${totalSamples - lastEmittedSampleRef.current} samples (${((totalSamples - lastEmittedSampleRef.current) / sampleRate).toFixed(2)}s)`);

      // Emit final chunk if there's remaining audio (even small segments)
      if (totalSamples > lastEmittedSampleRef.current) {
        const remainingSamples = totalSamples - lastEmittedSampleRef.current;
        console.log(`🛑 [stopRec] Emitting final chunk with ${remainingSamples} samples`);

        // Emit with isFinal=true and wait for it to be uploaded
        const finalChunkPromise = new Promise((resolve) => {
          emitChunk(chunkCounterRef.current, true);
          // Give a small delay to ensure the upload is added to uploadPromisesRef
          setTimeout(resolve, 100);
        });

        await finalChunkPromise;
      } else {
        console.log(`🛑 [stopRec] No remaining audio to emit`);
      }

      console.log(`🛑 [stopRec] Waiting for ${uploadPromisesRef.current.length} uploads to complete...`);
      await Promise.allSettled(uploadPromisesRef.current);
      console.log(`✅ [stopRec] All uploads completed`);
    }

    // Add 4 second delay for final chunk processing and sequential writes
    console.log(`🛑 [stopRec] Waiting 4 seconds for final chunk processing...`);
    await new Promise(resolve => setTimeout(resolve, 4000));
    console.log(`✅ [stopRec] Processing completed, proceeding with cleanup`);

    // Now stop all streams and clean up
    setRecording(false);
    setStopping(false);
    setPaused(false);
    stopTimer();

    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach(track => track.stop());
      console.log(`🛑 [stopRec] Stopped mic stream`);
    }

    if (processorRef.current) {
      try { processorRef.current.disconnect(); } catch (e) {/* ignore */ }
      console.log(`🛑 [stopRec] Disconnected processor`);
    }

    if (sourceRef.current) {
      try { sourceRef.current.disconnect(); } catch (e) {/* ignore */ }
      console.log(`🛑 [stopRec] Disconnected source`);
    }

    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      try {
        await audioCtxRef.current.close();
        console.log(`🛑 [stopRec] Closed AudioContext`);
      } catch (e) {
        console.warn("⚠️ [stopRec] AudioContext close() error:", e);
      }
      audioCtxRef.current = null;
    }

    console.log(`✅ [stopRec] Recording stopped successfully\n`);
  };

  useEffect(() => {
    console.log(`🎬 [useEffect] Initializing audio recorder...`);
    navigator.mediaDevices.enumerateDevices().then(devs => {
      const inputs = devs.filter(d => d.kind === 'audioinput');
      console.log(`🎬 [useEffect] Found ${inputs.length} audio input devices`);
      setMics(inputs);
      if (inputs[0]) {
        setDeviceId(inputs[0].deviceId);
        console.log(`🎬 [useEffect] Default device: ${inputs[0].label}`);
      }
    });

    return () => {
      console.log(`🧹 [cleanup] Cleaning up audio recorder`);
      stopTimer();
      timeoutsRef.current.forEach(t => clearTimeout(t));
      if (micStreamRef.current) {
        micStreamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

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
    pauseRec,
    resumeRec,
  };
}
