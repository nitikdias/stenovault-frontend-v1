"use client";
import React, { useState, useEffect, useRef } from "react";

export default function Recorder({
  mics,
  deviceId,
  setDeviceId,
  recording,
  setRecording,
  paused,
  setPaused,
  recordingTime,
  setRecordingTime,
  transcript,
  setTranscript,
  translation,
  setTranslation,
  segments,
  setSegments,
  readyForSummary,
  setReadyForSummary,
  onGenerateSummary
}) {
  const micStreamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const visualAnimRef = useRef(null);

  const pcmBuffersRef = useRef([]);
  const chunkCounterRef = useRef(1);
  const startTimeRef = useRef(0);
  const timeoutsRef = useRef([]);
  const uploadPromisesRef = useRef([]);
  const transcriptPollingRef = useRef(null);
  const timerRef = useRef(null);

  const sampleRate = 48000;
  const recordSec = 6;
  const stepSec = 5;
  const recordLen = sampleRate * recordSec;
  const stepLen = sampleRate * stepSec;

  const sampleTranscript = "Transcript will appear here when recording starts...";

  // -------------------- Timer --------------------
  const startTimer = () => {
    timerRef.current = setInterval(() => setRecordingTime(prev => prev + 1), 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) { clearInterval(timerRef.current); timerRef.current = null; }
  };
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2,"0")}:${secs.toString().padStart(2,"0")}`;
  };

  // -------------------- Transcript Polling --------------------
  const startTranscriptPolling = () => {
    const pollTranscript = async () => {
      try {
        const res = await fetch("http://localhost:8000/get_transcript");
        if (res.ok) {
          const data = await res.json();
          setTranscript(data.transcript || sampleTranscript);
          setTranslation(data.translation || "");
        }
      } catch (err) {
        setTranscript(sampleTranscript);
      }
    };
    pollTranscript();
    transcriptPollingRef.current = setInterval(pollTranscript, 3000);
  };
  const stopTranscriptPolling = () => {
    if (transcriptPollingRef.current) { clearInterval(transcriptPollingRef.current); transcriptPollingRef.current = null; }
  };

  // -------------------- Audio Processing --------------------
  function onAudioProcess(e) {
    const input = e.inputBuffer.getChannelData(0);
    pcmBuffersRef.current.push(new Float32Array(input));
  }

  function flatten(buffers) {
    const total = buffers.reduce((sum,b) => sum + b.length,0);
    const out = new Float32Array(total);
    let offset = 0;
    for (const b of buffers) { out.set(b, offset); offset += b.length; }
    return out;
  }

  function encodeWAV(samples) {
    const buf = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buf);
    const writeStr = (o, s) => { for (let i=0;i<s.length;i++) view.setUint8(o+i, s.charCodeAt(i)); };
    writeStr(0,"RIFF"); view.setUint32(4,36 + samples.length*2,true);
    writeStr(8,"WAVE"); writeStr(12,"fmt "); view.setUint32(16,16,true);
    view.setUint16(20,1,true); view.setUint16(22,1,true); view.setUint32(24,sampleRate,true);
    view.setUint32(28,sampleRate*2,true); view.setUint16(32,2,true); view.setUint16(34,16,true);
    writeStr(36,"data"); view.setUint32(40,samples.length*2,true);
    let offset = 44;
    for (let i=0;i<samples.length;i++, offset+=2){
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s<0 ? s*0x8000 : s*0x7FFF, true);
    }
    return new Blob([view], { type: "audio/wav" });
  }

  async function upload(blob, name) {
    const f = new FormData();
    f.append("audio", blob, name);
    return fetch("http://localhost:8000/uploadchunk", { method: "POST", body: f }).then(res => res.json());
  }

  function emitChunk(startOffset, endOffset, isFinal=false) {
    const full = flatten(pcmBuffersRef.current);
    const slice = full.slice(startOffset, endOffset);
    if (!slice.length) return;
    const wav = encodeWAV(slice);
    const id = chunkCounterRef.current++;
    const name = `chunk_${id}${isFinal?"_final":""}.wav`;
    const p = upload(wav,name).catch(()=>{});
    uploadPromisesRef.current.push(p);
    p.finally(()=>{uploadPromisesRef.current = uploadPromisesRef.current.filter(x=>x!==p)});
    const url = URL.createObjectURL(wav);
    setSegments(s => [...s, { start: startOffset, end: endOffset, url, name }]);
  }

  function scheduleChunks() {
    timeoutsRef.current.forEach(t=>clearTimeout(t));
    timeoutsRef.current=[];
    const startMs = startTimeRef.current || Date.now();
    function scheduleNext(i){
      const fireTime = startMs + recordSec*1000 + (i-1)*stepSec*1000;
      const delay = Math.max(0, fireTime - Date.now());
      const startSample = (i-1)*stepLen;
      const endSample = startSample + recordLen;
      const t = setTimeout(()=>{ emitChunk(startSample,endSample); scheduleNext(i+1); }, delay);
      timeoutsRef.current.push(t);
    }
    scheduleNext(1);
  }

  // -------------------- Visualizer --------------------
  const visualizerRef = useRef(null);
  function animateVisualizer() {
    const canvas = visualizerRef.current;
    if(!canvas) return;
    const ctx = canvas.getContext("2d");
    const WIDTH = canvas.width, HEIGHT = canvas.height;
    ctx.clearRect(0,0,WIDTH,HEIGHT);
    const barCount = 28, barWidth = 4, gap = (WIDTH - barCount*barWidth)/(barCount+1);
    const now = Date.now();
    for(let i=0;i<barCount;i++){
      const phase = (now/420)+i*0.35;
      const barHeight = Math.abs(Math.sin(phase))*32 + 16;
      const x = gap + i*(barWidth+gap);
      ctx.fillStyle="#3b82f6";
      ctx.fillRect(x, HEIGHT-barHeight, barWidth, barHeight);
    }
    if(recording && !paused) visualAnimRef.current = requestAnimationFrame(animateVisualizer);
  }

  // -------------------- Start / Pause / Resume / Stop --------------------
  async function startRec(resetTimer=true) {
    if(audioCtxRef.current){ await audioCtxRef.current.close(); audioCtxRef.current=null; }
    if(micStreamRef.current){ micStreamRef.current.getTracks().forEach(t=>t.stop()); micStreamRef.current=null; }

    const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId }});
    micStreamRef.current = stream;
    audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
    sourceRef.current = audioCtxRef.current.createMediaStreamSource(stream);
    processorRef.current = audioCtxRef.current.createScriptProcessor(4096,1,1);
    processorRef.current.onaudioprocess = onAudioProcess;

    sourceRef.current.connect(processorRef.current);
    processorRef.current.connect(audioCtxRef.current.destination);

    if(resetTimer){
      pcmBuffersRef.current = [];
      chunkCounterRef.current=1;
      uploadPromisesRef.current=[];
      startTimeRef.current=Date.now();
      setSegments([]);
      setTranscript('');
      setTranslation('');
      setRecordingTime(0);
    }

    setRecording(true);
    setPaused(false);
    startTimer();
    startTranscriptPolling();
    scheduleChunks();
    animateVisualizer();
  }

  async function pauseRec(){
    setPaused(true); stopTimer(); stopTranscriptPolling();
    if(visualAnimRef.current) cancelAnimationFrame(visualAnimRef.current);
    if(micStreamRef.current){ micStreamRef.current.getTracks().forEach(t=>t.stop()); micStreamRef.current=null; }
    if(audioCtxRef.current){ await audioCtxRef.current.close(); audioCtxRef.current=null; }
    processorRef.current = null; sourceRef.current = null;
  }

  async function resumeRec(){ setPaused(false); await startRec(false); }

  async function stopRec(){
    setRecording(false); setPaused(false);
    stopTimer(); stopTranscriptPolling();
    timeoutsRef.current.forEach(t=>clearTimeout(t)); timeoutsRef.current=[];
    if(processorRef.current) processorRef.current.disconnect();
    if(sourceRef.current) sourceRef.current.disconnect();
    if(visualAnimRef.current) cancelAnimationFrame(visualAnimRef.current);

    if(micStreamRef.current){ micStreamRef.current.getTracks().forEach(t=>t.stop()); micStreamRef.current=null; }

    if(audioCtxRef.current){
      const full = flatten(pcmBuffersRef.current);
      const elapsedSamples = full.length;
      const finalStart = Math.max(0,(chunkCounterRef.current-1)*stepLen);
      if(elapsedSamples>finalStart) emitChunk(finalStart,elapsedSamples,true);
      try{ await Promise.allSettled(uploadPromisesRef.current); await audioCtxRef.current.close(); audioCtxRef.current=null; } catch(e){}
    }
    processorRef.current=null; sourceRef.current=null;

    setReadyForSummary(true);
  }

  useEffect(()=>{ return ()=>{ stopTranscriptPolling(); stopTimer(); if(visualAnimRef.current) cancelAnimationFrame(visualAnimRef.current); }},[]);

  return (
    <div>
      {/* Mic select */}
      <select value={deviceId} onChange={e=>setDeviceId(e.target.value)}>
        {mics.map((mic,i)=><option key={i} value={mic.deviceId}>{mic.label||`Microphone ${i+1}`}</option>)}
      </select>

      <div>{formatTime(recordingTime)}</div>

      <canvas ref={visualizerRef} width="400" height="100" style={{backgroundColor:"#f1f5f9"}}></canvas>

      {!recording ? (
        !readyForSummary ? (
          <button onClick={startRec}>Start Recording</button>
        ) : (
          <button onClick={onGenerateSummary}>Review Summary</button>
        )
      ) : (
        <>
          <button onClick={paused?resumeRec:pauseRec}>{paused?"Resume":"Pause"}</button>
          <button onClick={stopRec}>Stop Recording</button>
        </>
      )}
    </div>
  );
}
