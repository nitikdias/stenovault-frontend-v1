"use client";
import React, { useEffect, useRef, useState } from 'react';
import gsap from "gsap";
import { useRouter } from "next/navigation";
import { toast,ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';
import { useMeeting } from '@/context/meetingContext';
import Sidebar from './sidebar/page'; 
import Header from './header/page';
import { useUser } from "@/context/userContext";
import {useRecording } from '@/context/recordingContext'; // Import the context
import jsPDF from "jspdf";


export default function App() {
  // [Existing state/hooks as in your code above]
  const [mics, setMics] = useState([]);
  const [deviceId, setDeviceId] = useState('');
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const micStreamRef = useRef(null);
  const visualizerRef = useRef(null);
  const visualAnimRef = useRef(null);


  const [selectedLanguage, setSelectedLanguage] = useState("en"); // default English

  const { meetingId } = useMeeting(); // get the current meeting ID from context

  const [segments, setSegments] = useState([]);
  const [transcript, setTranscript] = useState('');
  const [translation, setTranslation] = useState('');
  const [summary, setSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [readyForSummary, setReadyForSummary] = useState(false);


  const audioCtxRef = useRef(null);
  const processorRef = useRef(null);
  const sourceRef = useRef(null);
  const analyserRef = useRef(null); // <-- Added


  const pcmBuffersRef = useRef([]);
  const chunkCounterRef = useRef(1);
  const startTimeRef = useRef(0);
  const timeoutsRef = useRef([]);
  const uploadPromisesRef = useRef([]);
  const transcriptPollingRef = useRef(null);
  const timerRef = useRef(null);
  const animationIdRef = useRef(null); // <-- Added

  const [user, setUser] = useState(null);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [stats, setStats] = useState({ today: 0, week: 0 });


  const sampleRate = 48000;
  const recordSec = 6;
  const stepSec = 5;
  const recordLen = sampleRate * recordSec;
  const stepLen = sampleRate * stepSec;

  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  // Sample transcript text matching the UI
  const sampleTranscript = `Transcript will appear here when recording starts...`;

  const [sections, setSections] = useState({
    hpi: { title: "History of Present Illness", content: "", editingTitle: false, editingContent: false },
    physicalExam: { title: "Physical Examination", content: "", editingTitle: false, editingContent: false },
    investigations: { title: "Investigations", content: "", editingTitle: false, editingContent: false },
    prescription: { title: "Prescription and Initial Management", content: "", editingTitle: false, editingContent: false },
    assessment: { title: "Assessment and Plan", content: "", editingTitle: false, editingContent: false }
  });

  const { canRecord, setCanRecord, isRecording, setIsRecording } = useRecording();

const handleLanguageChange = async (e) => {
  const lang = e.target.value;
  setSelectedLanguage(lang);

  try {
    const response = await fetch("http://localhost:8000/select_language", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ language_code: lang })
    });

    const data = await response.json();
    if (!response.ok) {
      console.error("Failed to set language:", data);
    } else {
      console.log(`Language set to ${lang} on backend`);
    }
  } catch (error) {
    console.error("Error setting language:", error);
  }
};

const saveSectionToDB = async (meetingId, sectionKey, content) => {
  if (!meetingId || !sectionKey) {
    console.error("Missing meetingId or sectionKey");
    return;
  }

  const titles = Object.fromEntries(
    Object.entries(sections).map(([k, v]) => [k, v.title || k])
  );

  try {
    const response = await fetch("http://localhost:8000/update_transcript_section", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meeting_id: meetingId,
        section_key: sectionKey,
        content,
        titles,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Failed to save section: ${errorText}`);
    }

    console.log("Section updated successfully");
  } catch (err) {
    console.error("Error saving section:", err);
  }
};

const router = useRouter();

const handleStartRec = async () => {
    await startRec();
    setIsRecording(true);
  };

  const handleStopRec = async () => {
    await stopRec();
    setIsRecording(false);
    setCanRecord(true); // ready for summary but recording stopped
  };

  const handleGenerateSummary = async () => {
    await generateSummary();
    setCanRecord(false); // disable recording after summary
  };

const handleLogout = async () => {
  await fetch("/api/logout", { method: "POST" });
  router.push("/login");
};


  useEffect(() => {
    navigator.mediaDevices.enumerateDevices().then(devs => {
      const inputs = devs.filter(d => d.kind === 'audioinput');
      setMics(inputs);
      if (inputs[0]) setDeviceId(inputs[0].deviceId);
    });
  }, []);


//fetch user details
  useEffect(() => {
  async function fetchUser() {
    try {
      const res = await fetch("/api/me");
      if (res.ok) {
        const data = await res.json();
        setUser(data.user);
      }
    } catch (e) {
      console.error(e);
    }
  }
  fetchUser();
}, []);

//Fetch stat from backend
async function fetchStats() {
  const userId = localStorage.getItem("userId");
  if (!userId) {
    console.warn("User ID not found in localStorage");
    return;
  }

  try {
    const res = await fetch(`http://localhost:8000/stats?user_id=${userId}`);
    if (res.ok) {
      const data = await res.json();
      setStats(data);
    } else {
      console.error("Failed to fetch stats:", res.statusText);
    }
  } catch (err) {
    console.error("Failed to fetch stats:", err);
  }
}

// Call on component mount
useEffect(() => {
  fetchStats();
}, []);

  // Poll transcript every 3 seconds
const startTranscriptPolling = () => {
  const pollTranscript = async () => {
    if (!user || !user.id) {
      console.warn("Missing user or user.id");
      return;
    }

    const formData = new FormData();
    formData.append("user_id", user.id);

    // Verify data before sending
    for (const [key, value] of formData.entries()) {
      console.log("FormData:", key, value);
    }

    try {
      const response = await fetch("http://localhost:8000/get_transcript", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Fetch error: ${response.status}`);
      }

      const data = await response.json();
      setTranscript(data.transcript || sampleTranscript);
      setTranslation(data.translation || "");
    } catch (error) {
      console.error("Error fetching transcript:", error);
      setTranscript(sampleTranscript);
    }
  };

  pollTranscript();
  transcriptPollingRef.current = setInterval(pollTranscript, 3000);
};

const stopTranscriptPolling = () => {
  if (transcriptPollingRef.current) {
    clearInterval(transcriptPollingRef.current);
    transcriptPollingRef.current = null;
  }
};



const escapeRegex = (str) => str?.replace(/[.*+?^${}()|[\]\\]/g, "\\$&") || "";

const parseMedicalSummary = (summaryText, titles = {}) => {
  const parsed = {};
  const keys = Object.keys(titles || {});
  keys.forEach((key, index) => {
    const title = titles[key];
    const remainingTitles = keys
      .slice(index + 1)
      .map((k) => titles[k]);

    const regexStr = remainingTitles.length
      ? `${escapeRegex(title)}:?\\s*([\\s\\S]*?)(?=${remainingTitles.map(escapeRegex).join("|")}:?)`
      : `${escapeRegex(title)}:?\\s*([\\s\\S]*)`;

    const regex = new RegExp(regexStr, "i");
    const match = summaryText.match(regex);
    parsed[key] = match ? match[1].replace(/\*\*/g, '').trim() : "";
  });

  return parsed;
};

  // Dynamic renderSection function
const renderSection = (key) => {
  const section = sections[key];
  if (!section) return null;

  return (
    <div
      key={key}
      style={{
        backgroundColor: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "16px",
        marginBottom: "16px",
        position: "relative",
        color: "black",
      }}
    >
      {/* Title */}
      <div
        style={{
          marginBottom: "12px",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        {section.editingTitle ? (
          <input
            type="text"
            value={section.title}
            onChange={(e) =>
              setSections({
                ...sections,
                [key]: { ...section, title: e.target.value },
              })
            }
            onBlur={() =>
              setSections({
                ...sections,
                [key]: { ...section, editingTitle: false },
              })
            }
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setSections({
                  ...sections,
                  [key]: { ...section, editingTitle: false },
                });
              }
            }}
            autoFocus
            style={{
              fontSize: "16px",
              fontWeight: "600",
              border: "1px solid #cbd5e1",
              borderRadius: "4px",
              padding: "4px 8px",
              width: "100%",
              boxSizing: "border-box",
              color: "black",
            }}
          />
        ) : (
          <h3
            style={{
              fontSize: "16px",
              fontWeight: "600",
              margin: 0,
              color: "#1e293b",
              cursor: "pointer",
              flexGrow: 1,
            }}
            onClick={() =>
              setSections({
                ...sections,
                [key]: { ...section, editingTitle: true },
              })
            }
            title="Click to edit title"
          >
            {section.title}
          </h3>
        )}

        {/* Edit / Save Button */}
      <button
        onClick={async () => {
          if (section.editingContent) {
            let updatedContent = section.content || "";

            // 🧠 Bullet-aware deduplication
            const lines = updatedContent
              .split("\n")
              .map(line => line.trim())
              .filter(line => line.length > 0);

            const uniqueLines = Array.from(
              new Set(
                lines.map(line => line.replace(/^[-•\s]+/, "").trim().toLowerCase())
              )
            ).map((normalized, idx) => {
              // Find the original line (case-insensitive match)
              const original = lines.find(
                l => l.replace(/^[-•\s]+/, "").trim().toLowerCase() === normalized
              );
              return original.startsWith("-") ? original : `- ${original}`;
            });

            updatedContent = uniqueLines.join("\n");

            // Exit edit mode
            setSections({
              ...sections,
              [key]: { ...section, content: updatedContent, editingContent: false },
            });

            // ✅ Save cleaned content
            await saveSectionToDB(meetingId, key, updatedContent, section.title);

          } else {
            setSections({
              ...sections,
              [key]: { ...section, editingContent: true },
            });
          }
        }}
      >
        {section.editingContent ? (
          "💾"
        ) : (
          <img
            src="images/edit.png"
            alt="Edit"
            style={{ width: "16px", height: "16px" }}
          />
        )}
      </button>


        {/* Dictate Button */}
        <button
          onClick={async () => {
            const isDictating = section.dictating || false;

            if (!isDictating) {
              // Start dictation
              setSections({
                ...sections,
                [key]: { ...section, dictating: true },
              });

              try {
                const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
                const mediaRecorder = new MediaRecorder(stream);
                mediaRecorderRef.current = mediaRecorder;
                audioChunksRef.current = [];

                mediaRecorder.ondataavailable = (e) =>
                  audioChunksRef.current.push(e.data);

                mediaRecorder.onstop = async () => {
                  const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
                  const formData = new FormData();
                  formData.append("audio", audioBlob, "dictation.wav");

                  try {
                    const response = await fetch("http://localhost:8000/dictate", { method: "POST", body: formData });
                    const data = await response.json();

                    if (data.transcript) {
                      let newContent =
                        (section.content || "") +
                        (section.content?.trim() ? "\n- " : "- ") +
                        data.transcript.trim();

                      // 🧠 Clean duplicates bullet-aware
                      const lines = newContent
                        .split("\n")
                        .map(line => line.trim())
                        .filter(line => line.length > 0);

                      const uniqueLines = Array.from(
                        new Set(
                          lines.map(line => line.replace(/^[-•\s]+/, "").trim().toLowerCase())
                        )
                      ).map(normalized => {
                        const original = lines.find(
                          l => l.replace(/^[-•\s]+/, "").trim().toLowerCase() === normalized
                        );
                        return original.startsWith("-") ? original : `- ${original}`;
                      });

                      newContent = uniqueLines.join("\n");

                      setSections((prev) => ({
                        ...prev,
                        [key]: {
                          ...prev[key],
                          content: newContent,
                          dictating: false,
                        },
                      }));

                      await saveSectionToDB(meetingId, key, newContent, section.title);
                    }

                    else {
                      alert("No transcript received");
                      setSections((prev) => ({
                        ...prev,
                        [key]: { ...prev[key], dictating: false },
                      }));
                    }
                  } catch (err) {
                    console.error("Dictation failed:", err);
                    alert("Transcription failed");
                    setSections((prev) => ({
                      ...prev,
                      [key]: { ...prev[key], dictating: false },
                    }));
                  }
                };

                mediaRecorder.start();
              } catch (err) {
                console.error("Microphone access denied:", err);
                alert("Microphone access denied");
                setSections((prev) => ({
                  ...prev,
                  [key]: { ...prev[key], dictating: false },
                }));
              }
            } else {
              // Stop dictation
              setSections({
                ...sections,
                [key]: { ...section, dictating: false },
              });

              if (mediaRecorderRef.current) {
                mediaRecorderRef.current.stop();
                mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
              }
            }
          }}
          style={{
            border: "none",
            background: "transparent",
            cursor: "pointer",
            color: section.dictating ? "#ef4444" : "#64748b",
            fontSize: "16px",
            marginLeft: "8px",
            flexShrink: 0,
          }}
          title={section.dictating ? "Stop dictation" : "Start dictation"}
          type="button"
        >
          {section.dictating ? (
            <img src="images/stop.png" alt="Stop" style={{ width: "16px", height: "16px" }} />
          ) : (
            <img src="images/mic.png" alt="Dictate" style={{ width: "16px", height: "16px" }} />
          )}
        </button>
      </div>

      {/* Content */}
      {section.editingContent ? (
        <textarea
          value={section.content}
          onChange={(e) =>
            setSections({
              ...sections,
              [key]: { ...section, content: e.target.value },
            })
          }
          autoFocus
          style={{
            width: "100%",
            padding: "8px",
            borderRadius: "6px",
            border: "1px solid #cbd5e1",
            minHeight: "100px",
            fontSize: "14px",
            lineHeight: "1.5",
            resize: "vertical",
            boxSizing: "border-box",
          }}
        />
      ) : (
        <div
          style={{
            fontSize: "14px",
            color: section.content ? "#0f172a" : "#94a3b8",
            whiteSpace: "pre-wrap",
          }}
        >
          {section.content || "Click edit to add notes..."}
        </div>
      )}
    </div>
  );
};


//generate summary function
  const generateSummary = async () => {
  if (!meetingId) {
    toast.error("No active meeting. Start a new encounter first.");
    return;
  }

  setIsGeneratingSummary(true);

  try {
    const response = await fetch("http://localhost:8000/generate_summary", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        meeting_id: meetingId,  // ✅ use meetingId from context
        transcript,
        titles: {
          hpi: sections.hpi.title,
          physicalExam: sections.physicalExam.title,
          investigations: sections.investigations.title,
          prescription: sections.prescription.title,
          assessment: sections.assessment.title
        },
        selected_language: selectedLanguage
      }),
    });

    if (!response.ok) {
      const errData = await response.json();
      toast.error(errData.error || "Failed to generate summary.");
      return;
    }

    const data = await response.json();
    setSummary(data.summary || "");

    // Optional: parse summary into sections
    const parsed = parseMedicalSummary(data.summary || "", {
      hpi: sections.hpi.title,
      physicalExam: sections.physicalExam.title,
      investigations: sections.investigations.title,
      prescription: sections.prescription.title,
      assessment: sections.assessment.title
    });

    if (parsed) {
      const newSections = {};
      Object.keys(parsed).forEach((key) => {
        newSections[key] = {
          title: sections[key]?.title || key,
          content: parsed[key],
          editingTitle: sections[key]?.editingTitle || false,
          editingContent: sections[key]?.editingContent || false,
        };
      });
      setSections(newSections);

    }

    toast.success("Summary generated successfully.");

  } catch (error) {
    console.error("Error generating summary:", error);
    toast.error("Server error while generating summary.");
  } finally {
    setIsGeneratingSummary(false);
  }
};

// Responsive audio visualizer animation
function animateVisualizer() {
  const canvas = visualizerRef.current;
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const WIDTH = canvas.width;
  const HEIGHT = canvas.height;

  ctx.clearRect(0, 0, WIDTH, HEIGHT);

  // Responsive bar count based on canvas width
  const barCount = Math.min(28, Math.floor(WIDTH / 15)); // Fewer bars on smaller screens
  const barWidth = WIDTH < 400 ? 3 : 4; // Thinner bars on mobile
  const gap = (WIDTH - barCount * barWidth) / (barCount + 1);
  const now = Date.now();

  for (let i = 0; i < barCount; i++) {
    let phase = (now / 420) + i * 0.35;
    // Scale bar height based on canvas height
    let maxBarHeight = HEIGHT * 0.4; // 40% of canvas height
    let minBarHeight = HEIGHT * 0.2; // 20% of canvas height
    let barHeight = Math.abs(Math.sin(phase)) * maxBarHeight + minBarHeight;
    let x = gap + i * (barWidth + gap);

    ctx.fillStyle = "#3b82f6";
    ctx.fillRect(x, HEIGHT - barHeight, barWidth, barHeight);
  }

  if (recording && !paused) {
    visualAnimRef.current = requestAnimationFrame(animateVisualizer);
  }
}

// Responsive CodePen Waveform Component
function CodePenWaveform({ paused }) {
  const svgRef = useRef();
  const requestRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 400, height: 150 });

  // Resize handler for responsive SVG
  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = width < 640 ? 80 : 150; // Shorter on mobile
        setDimensions({ width: Math.min(width, 700), height });
      }
    };

    updateDimensions();
    window.addEventListener('resize', updateDimensions);
    return () => window.removeEventListener('resize', updateDimensions);
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;

    const lines = svgRef.current.querySelectorAll("line");
    if (!lines || !lines.length) return;

    // Scale amplitude based on height
    const amplitude = dimensions.height * 0.2; // 20% of height
    const wavelength = lines.length;
    const baseline = dimensions.height * 0.73; // 73% from top
    const speed = 0.005;

    const animate = () => {
      if (!paused) {
        const time = Date.now();
        lines.forEach((line, i) => {
          const y = baseline + amplitude * Math.sin((2 * Math.PI * i) / wavelength - speed * time);
          line.setAttribute("y2", y);
        });
      }
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(requestRef.current);
  }, [paused, dimensions]);

  // Responsive line count and spacing
  const lineCount = dimensions.width < 640 ? 20 : 28; // Fewer lines on mobile
  const spacing = dimensions.width / (lineCount + 2); // Dynamic spacing
  const strokeWidth = dimensions.width < 640 ? 3 : 4; // Thinner strokes on mobile

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <svg
        ref={svgRef}
        width={dimensions.width}
        height={dimensions.height}
        viewBox={`0 0 ${dimensions.width} ${dimensions.height}`}
        className="max-w-full h-auto"
        style={{ display: "block" }}
      >
        <g>
          {Array.from({ length: lineCount }).map((_, i) => {
            const x = spacing + i * spacing;
            const y1 = dimensions.height * 0.93; // 93% from top
            const y2 = dimensions.height * 0.73; // 73% from top (baseline)
            return (
              <line
                key={i}
                x1={x}
                y1={y1}
                x2={x}
                y2={y2}
                stroke="#3b82f6"
                strokeWidth={strokeWidth}
                strokeLinecap="round"
              />
            );
          })}
        </g>
      </svg>
    </div>
  );
}

// Timer for recording duration
  const startTimer = () => {
    timerRef.current = setInterval(() => { setRecordingTime(prev => prev + 1); }, 1000);
  };
  const stopTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Audio processing functions (keeping your existing audio logic)
  function onAudioProcess(e) {
    const input = e.inputBuffer.getChannelData(0);
    pcmBuffersRef.current.push(new Float32Array(input));
  }

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
  
  async function upload(blob, name) {
  if (!user) {
    console.error("User not loaded yet");
    return;
  }

  const f = new FormData();
  f.append("audio", blob, name);
  f.append("user_id", user.id); // send user ID to backend

  return fetch("http://localhost:8000/uploadchunk", {
    method: "POST",
    body: f,
  }).then((res) => {
    if (!res.ok) throw new Error("upload failed " + res.status);
    return res.json();
  });
}



  function emitChunk(startOffset, endOffset, isFinal = false) {
    const full = flatten(pcmBuffersRef.current);
    const slice = full.slice(startOffset, endOffset);
    if (!slice.length) return;

    const wav = encodeWAV(slice);
    const id = chunkCounterRef.current++;
    const name = `chunk_${id}${isFinal ? '_final' : ''}.wav`;
    const url = URL.createObjectURL(wav);

    setSegments(s => [...s, { start: startOffset, end: endOffset, url, name }]);
    const p = upload(wav, name).catch(err => {});
    uploadPromisesRef.current.push(p);
    p.finally(() => {
      uploadPromisesRef.current = uploadPromisesRef.current.filter(x => x !== p);
    });
  }

  function scheduleChunks() {
    timeoutsRef.current.forEach(t => clearTimeout(t));
    timeoutsRef.current = [];
    const startMs = startTimeRef.current || Date.now();
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
    scheduleNext(1);
  }



 // 1. Start Recording with new stream
async function startRec(resetTimer = true) {
  // stop any running audio before starting fresh
  if (audioCtxRef.current) {
    await audioCtxRef.current.close();
    audioCtxRef.current = null;
  }
  if (micStreamRef.current) {
    micStreamRef.current.getTracks().forEach(track => track.stop());
    micStreamRef.current = null;
  }

  const stream = await navigator.mediaDevices.getUserMedia({ audio: { deviceId } });
  micStreamRef.current = stream;
  audioCtxRef.current = new (window.AudioContext || window.webkitAudioContext)();
  sourceRef.current = audioCtxRef.current.createMediaStreamSource(stream);
  processorRef.current = audioCtxRef.current.createScriptProcessor(4096, 1, 1);
  processorRef.current.onaudioprocess = onAudioProcess;

  sourceRef.current.connect(processorRef.current);
  processorRef.current.connect(audioCtxRef.current.destination);

  if (resetTimer) {
    pcmBuffersRef.current = [];
    chunkCounterRef.current = 1;
    uploadPromisesRef.current = [];
    startTimeRef.current = Date.now();
    setSegments([]);
    setTranscript('');
    setTranslation('');
    setSummary('');
    setRecordingTime(0);
  } else {
    // Resume: adjust startTimeRef to continue timing properly
    startTimeRef.current = Date.now() - recordingTime * 1000;
  }

  setRecording(true);
  setPaused(false);

  startTimer();
  startTranscriptPolling();
  scheduleChunks();

  if (visualizerRef.current) {
    if (visualAnimRef.current) cancelAnimationFrame(visualAnimRef.current);
    animateVisualizer();
  }
}



// 2. PAUSE: Stop everything but don't submit summary or reset state
async function pauseRec() {
  setPaused(true);
  stopTimer();
  stopTranscriptPolling();
  if (visualAnimRef.current) cancelAnimationFrame(visualAnimRef.current);
  // Stop mic
  if (micStreamRef.current) {
    micStreamRef.current.getTracks().forEach(track => track.stop());
    micStreamRef.current = null;
  }
  // Close audio context
  if (audioCtxRef.current) {
    await audioCtxRef.current.close();
    audioCtxRef.current = null;
  }
  processorRef.current = null;
  sourceRef.current = null;
}

async function resumeRec() {
  setPaused(false);
  await startRec(false);  // DO NOT reset buffers and state
}



// 4. Stop: Full cleanup + process summary
async function stopRec() {
  setRecording(false);
  setPaused(false);
  stopTimer();
  stopTranscriptPolling();
  timeoutsRef.current.forEach(t => clearTimeout(t));
  timeoutsRef.current = [];
  if (processorRef.current) processorRef.current.disconnect();
  if (sourceRef.current) sourceRef.current.disconnect();
  if (visualAnimRef.current) cancelAnimationFrame(visualAnimRef.current);

  if (micStreamRef.current) {
    micStreamRef.current.getTracks().forEach(track => track.stop());
    micStreamRef.current = null;
  }

  if (audioCtxRef.current) {
    const full = flatten(pcmBuffersRef.current);
    const elapsedSamples = full.length;
    if (chunkCounterRef.current <= 1) {
      emitChunk(0, elapsedSamples, true);
    } else {
      const lastEmittedIndex = chunkCounterRef.current - 1;
      const lastEmittedStart = Math.max(0, (lastEmittedIndex - 1) * stepLen);
      const lastEmittedEnd = lastEmittedStart + recordLen;
      const finalStart = Math.min(lastEmittedEnd, elapsedSamples);
      const finalEnd = elapsedSamples;
      if (finalEnd > finalStart) {
        emitChunk(finalStart, finalEnd, true);
      }
    }
    try {
      await Promise.allSettled(uploadPromisesRef.current);
      await audioCtxRef.current.close();
      audioCtxRef.current = null;
    } catch (e) {}
  }
  processorRef.current = null;
  sourceRef.current = null;

  // Instead of generating summary immediately, enable the review button
  setReadyForSummary(true);
}

  useEffect(() => {
    return () => {
      stopTranscriptPolling();
      stopTimer();
      if (animationIdRef.current) cancelAnimationFrame(animationIdRef.current);
    };
  }, []);

  //save as PDF function


const generatePDF = async () => {
  const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
  const margin = 36; // ~0.5"
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const contentWidth = pageWidth - margin * 2;
  const lineHeight = 1.35; // consistent line-height
  const secHeaderH = 26;
  const secPadding = 10;

  const paginateIfNeeded = (needed, topPad = 0) => {
    if (y + needed > pageHeight - margin) {
      doc.addPage();
      y = margin + topPad;
    }
  };

  // Logo
  const logoImg = new Image();
  logoImg.src = "/images/app-logo.png";
  await new Promise((resolve) => { logoImg.onload = resolve; });
  const logoWidth = 36;
  const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
  doc.addImage(logoImg, "PNG", pageWidth - margin - logoWidth, margin, logoWidth, logoHeight);

  // Title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.text("Clinical Summary & Transcript", pageWidth / 2, margin + 24, { align: "center" });

  // Top rule
  doc.setLineWidth(0.5);
  doc.setDrawColor(200);
  doc.line(margin, margin + 34, pageWidth - margin, margin + 34);

  let y = margin + 52;

  const sectionsOrder = ["hpi", "physicalExam", "investigations", "prescription", "assessment"];

  sectionsOrder.forEach((key) => {
    const section = sections[key];
    if (!section) return;

    // Section header
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    const headerH = secHeaderH;

    // Prepare content
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setLineHeightFactor(lineHeight);
    const text = section.content && section.content.trim() ? section.content : "Not specified in the transcript.";
    const wrapped = doc.splitTextToSize(text, contentWidth - secPadding * 2);
    const lines = wrapped.length;
    const fontSize = 12;
    const textHeight = (lines * fontSize * lineHeight - fontSize * (lineHeight - 1)) / doc.internal.scaleFactor;

    // Total block height = header + content box + padding
    const contentBoxH = textHeight + secPadding * 2;
    const blockH = headerH + 8 + contentBoxH;

    paginateIfNeeded(blockH);

    // Header box
    doc.setFillColor(230);
    doc.roundedRect(margin, y, contentWidth, headerH, 5, 5, "F");
    doc.setTextColor(33, 37, 51);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(13);
    doc.text(section.title, margin + secPadding, y + headerH - 8);
    y += headerH + 8;

    // Content box
    doc.setFillColor(245);
    doc.roundedRect(margin, y, contentWidth, contentBoxH, 5, 5, "F");
    doc.setFont("helvetica", "normal");
    doc.setFontSize(12);
    doc.setTextColor(0, 0, 0);
    doc.text(wrapped, margin + secPadding, y + secPadding + 10);
    y += contentBoxH + 16;
  });

  // Transcript page
  doc.addPage();
  y = margin;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  const tHeader = "Transcript";
  const tHeaderH = secHeaderH;
  doc.setFillColor(230);
  doc.roundedRect(margin, y, contentWidth, tHeaderH, 5, 5, "F");
  doc.setTextColor(33, 37, 51);
  doc.text(tHeader, margin + secPadding, y + tHeaderH - 8);
  y += tHeaderH + 8;

  doc.setFont("helvetica", "normal");
  doc.setFontSize(12);
  doc.setTextColor(0, 0, 0);
  doc.setLineHeightFactor(lineHeight);

  const transcriptText = transcript && transcript.trim() ? transcript : "Transcript will appear here...";
  const tWrapped = doc.splitTextToSize(transcriptText, contentWidth - secPadding * 2);
  const tLineH = (12 * lineHeight) / doc.internal.scaleFactor;

  // Stream transcript across pages
  let start = 0;
  while (start < tWrapped.length) {
    const availableHeight = pageHeight - margin - y - secPadding * 2;
    const fitLines = Math.max(1, Math.floor(availableHeight / tLineH));
    const slice = tWrapped.slice(start, start + fitLines);
    const sliceHeight = slice.length * tLineH + secPadding * 2;

    doc.setFillColor(230, 245, 255);
    doc.roundedRect(margin, y, contentWidth, sliceHeight, 5, 5, "F");
    doc.text(slice, margin + secPadding, y + secPadding + 10);

    start += fitLines;
    y += sliceHeight + 12;

    if (start < tWrapped.length) {
      doc.addPage();
      y = margin;
      // Re-draw transcript header on new page
      doc.setFont("helvetica", "bold");
      doc.setFontSize(13);
      doc.setFillColor(230);
      doc.roundedRect(margin, y, contentWidth, tHeaderH, 5, 5, "F");
      doc.setTextColor(33, 37, 51);
      doc.text(tHeader + " (cont.)", margin + secPadding, y + tHeaderH - 8);
      y += tHeaderH + 8;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.setLineHeightFactor(lineHeight);
    }
  }

  doc.save("ClinicalSummary.pdf");
};


  return (
  <div className="min-h-screen bg-gray-50 font-sans">
    <ToastContainer position="top-right" autoClose={2000} hideProgressBar />
    <Header user={user} handleLogout={handleLogout} />

    <div className="flex flex-col md:flex-row">
      <Sidebar stats={stats} />

      {/* Main Content */}
      <div className="flex-1 p-4 sm:p-6 pt-20 md:pt-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-h-[calc(100vh-150px)]">
          
          {/* Left Column - Recording and Transcript */}
          <div className="flex flex-col gap-4 sm:gap-6">
            
            {/* Recording Section */}
            <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="text-gray-800">
                    <path d="M12 14c1.66 0 3-1.34 3-3V5c0-1.66-1.34-3-3-3S9 3.34 9 5v6c0 1.66 1.34 3 3 3z"/>
                    <path d="M17 11c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-3.08c3.39-.49 6-3.39 6-6.92h-2z"/>
                  </svg>
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-800 m-0">
                  Ambient Recording
                </h2>
              </div>

              {/* Timer */}
              <div className="flex items-center gap-3 sm:gap-4 mb-4 sm:mb-6 text-xs sm:text-sm text-gray-600">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2">
                    <svg viewBox="0 0 24 24" fill="currentColor">
                      <circle cx="12" cy="12" r="12"/>
                    </svg>
                  </div>
                  <span className="font-mono">{formatTime(recordingTime)}</span>
                </div>
                <span>
                  {recording ? (paused ? 'Paused' : 'Recording') : 'Ready to Record'}
                </span>
              </div>

              {/* Audio visualizer */}
              <div className="text-center my-4 sm:my-6 min-h-[60px] sm:min-h-[70px]">
                {recording && <CodePenWaveform paused={paused} />}
              </div>

              {/* Controls - Responsive Layout */}
              <div className="flex flex-col gap-3">
                {/* Dropdowns Row */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {/* Mic selection dropdown */}
                  <select
                    value={deviceId}
                    onChange={e => setDeviceId(e.target.value)}
                    className="flex-1 px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm bg-gray-50 cursor-pointer text-black"
                  >
                    {mics.map((mic, idx) => (
                      <option key={idx} value={mic.deviceId}>
                        {mic.label || `Microphone ${idx + 1}`}
                      </option>
                    ))}
                  </select>

                  {/* Language selection dropdown */}
                  <select
                    value={selectedLanguage}
                    onChange={handleLanguageChange}
                    className="flex-1 px-3 py-2 sm:py-2.5 border border-gray-300 rounded-lg text-xs sm:text-sm bg-gray-50 cursor-pointer text-black"
                  >
                    <option value="en">English</option>
                    <option value="ta">Tamil</option>
                    <option value="te">Telugu</option>
                    <option value="hi">Hindi</option>
                    <option value="ml">Malayalam</option>
                    <option value="kn">Kannada</option>
                    <option value="bn">Bengali</option>
                  </select>
                </div>

                {/* Record/Pause/Resume/Stop buttons */}
                <div className="flex flex-col sm:flex-row gap-3">
                  {!recording ? (
                    !readyForSummary ? (
                      <button
                        disabled={!canRecord}
                        onClick={handleStartRec}
                        className={`w-full py-2.5 sm:py-3 rounded-lg border-2 text-black border-blue-500 bg-transparent font-semibold text-sm sm:text-base
                          ${!canRecord ? "opacity-50 cursor-not-allowed" : "hover:bg-blue-50"}`}
                        title={!canRecord ? "Start session first to enable recording" : ""}
                      >
                        {!canRecord ? "Disabled" : "Start Recording"}
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          handleGenerateSummary();
                          setReadyForSummary(false);
                        }}
                        className="w-full py-2.5 sm:py-3 rounded-lg border-2 border-green-500 bg-transparent text-black font-semibold text-sm sm:text-base hover:bg-green-50"
                      >
                        Review Summary
                      </button>
                    )
                  ) : (
                    <>
                      <button
                        onClick={paused ? resumeRec : pauseRec}
                        className="w-full sm:flex-1 py-2.5 sm:py-3 rounded-lg border-2 border-yellow-500 bg-transparent text-black font-semibold text-sm sm:text-base hover:bg-yellow-50"
                      >
                        {paused ? "Resume" : "Pause"}
                      </button>
                      <button
                        onClick={handleStopRec}
                        className="w-full sm:flex-1 py-2.5 sm:py-3 rounded-lg border-2 border-red-500 bg-transparent text-black font-semibold text-sm sm:text-base hover:bg-red-50"
                      >
                        Stop Recording
                      </button>
                    </>
                  )}
                </div>
              </div>
            </div>

            {/* Transcript Section */}
            <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm flex-1">
              <div className="flex items-center gap-2 mb-4">
                <div className="w-5 h-5">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="text-gray-800">
                    <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
                  </svg>
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-800 m-0">
                  Transcript
                </h2>
              </div>
              <div className="text-xs sm:text-sm leading-relaxed text-gray-800 whitespace-pre-wrap h-48 sm:h-64 lg:h-80 overflow-y-auto p-3 sm:p-4 bg-gray-50 rounded-lg">
                {transcript || 'Transcript will appear here when recording starts...'}
              </div>
            </div>
          </div>
          
          {/* Right Column - Clinical Summary */}
          <div className="bg-white rounded-lg p-4 sm:p-6 border border-gray-200 shadow-sm flex flex-col">
            {/* Header with title and buttons */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 sm:gap-0 mb-4">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5">
                  <svg viewBox="0 0 24 24" fill="currentColor" className="text-gray-800">
                    <path d="M9 11H7v6h2v-6zm4 0h-2v6h2v-6zm4 0h-2v6h2v-6zm2-7h-3V2h-2v2H8V2H6v2H3c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 16H3V9h14v11z"/>
                  </svg>
                </div>
                <h2 className="text-base sm:text-lg font-semibold text-gray-800 m-0">
                  Clinical Summary
                </h2>
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2">
                {/* Copy Button */}
                <button
                  onClick={() => {
                    let content = '';
                    Object.keys(sections).forEach((key) => {
                      const sec = sections[key];
                      if (sec?.content) content += `${sec.title}:\n${sec.content}\n\n`;
                    });
                    content += transcript ? `Transcript:\n${transcript}` : '';
                    navigator.clipboard.writeText(content);
                    toast.success('Copied to clipboard!');
                  }}
                  className="p-2 border border-gray-800 rounded bg-transparent hover:bg-gray-50 transition-colors"
                  title="Copy to clipboard"
                >
                  <img src="images/copy.png" alt="Copy" className="w-4 h-4" />
                </button>

                {/* Save PDF Button */}
                <button
                  onClick={() => generatePDF()}
                  className="p-2 border border-gray-800 rounded bg-transparent hover:bg-gray-50 transition-colors"
                  title="Download as PDF"
                >
                  <img src="images/downloads.png" alt="Save PDF" className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Clinical summary content */}
            <div id="clinical-summary-content" className="flex-1 overflow-y-auto">
              {Object.keys(sections).map((key) => renderSection(key))}
            </div>
          </div>

        </div> 
      </div>
    </div>
  </div>
);
}