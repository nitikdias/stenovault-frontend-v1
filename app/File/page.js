'use client';

import { useState, useRef, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import dynamic from 'next/dynamic';
const Header = dynamic(() => import('../header/page'), { ssr: false });
import Chatbot from "../chatbot/page";

export default function File() {
  const router = useRouter();
  const pathname = usePathname();
  const [file, setFile] = useState(null);
  const [alertVisible, setAlertVisible] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [processSuccess, setProcessSuccess] = useState(false);
  const [summary, setSummary] = useState("");
  const [keyPoints, setKeyPoints] = useState("");
  const [actions, setActions] = useState("");
  const [translation, setTranslation] = useState("");
  const [language, setLanguage] = useState("en-IN");
  const [transcript, setTranscript] = useState("");
  const intervalIdRef = useRef(null);
  const transcriptRef = useRef(null);

  useEffect(() => {
    fetch("http://127.0.0.1:8000/clear_live", { method: "POST" });
    return () => {
      if (intervalIdRef.current) clearInterval(intervalIdRef.current);
    };
  }, []);

  useEffect(() => {
    if (transcriptRef.current) {
      transcriptRef.current.scrollTop = transcriptRef.current.scrollHeight;
    }
  }, [transcript]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    try {
      const res = await fetch("http://127.0.0.1:8000/upload", {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.success) {
        setAlertVisible(true);
        setTimeout(() => setAlertVisible(false), 2500);
        toast.success("File uploaded successfully!");
      } else {
        toast.error("Upload failed: " + data.message);
      }
    } catch {
      toast.error("An error occurred during upload.");
    }
  };

  const startProcessing = async () => {
    setProcessing(true);
    setProcessSuccess(false);

    if (!intervalIdRef.current) {
      intervalIdRef.current = setInterval(fetchTranscript, 3000);
    }

    try {
      const userId = localStorage.getItem("userId");
      if (!userId) {
        toast.error("User not logged in.");
        setProcessing(false);
        return;
      }

      const res = await fetch("http://127.0.0.1:8000/process", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });

      if (!res.ok) {
        toast.error("Failed to process recording.");
        return;
      }

      const data = await res.json();
      if (data.success) {
        setProcessSuccess(true);
        toast.success(`Processing completed for meeting ${data.meeting_id}`);
      } else {
        toast.error(data.message || "Processing failed.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error during processing.");
    } finally {
      setProcessing(false);
    }
  };

  const fetchTranscript = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/get_transcript");
      const data = await res.json();
      setTranscript(data.transcript || "");
      setTranslation(data.translation || "");
    } catch {}
  };

  const clearFiles = async () => {
    if (intervalIdRef.current) {
      clearInterval(intervalIdRef.current);
      intervalIdRef.current = null;
    }
    await fetch("http://127.0.0.1:8000/clear", { method: "POST" });
    setTranscript("");
    setSummary("");
    setKeyPoints("");
    setActions("");
    setTranslation("");
    setFile(null);
    setProcessing(false);
    setProcessSuccess(false);
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/get_summary_live");
      const data = await res.json();
      setSummary(data.summary || "No summary available.");
      setKeyPoints(data.key_points || "No key points.");
      setActions(data.actions || "No action items.");
    } catch {}
  };

  const fetchTranslation = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/get-translation");
      const data = await res.json();
      setTranslation(data.translation || "No translation available.");
    } catch {}
  };

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  const links = [
    { label: "Start Meeting", path: "/Live",icon: <img src="/rec-button.png" alt="rec" style={{ width: 20, height: 20 }} />  },
    { label: "Upload File", path: "/File",  icon: <img src="/folder.png" alt="upload" style={{ width: 20, height: 20 }} />  },
    { label: "Reports", path: "/Home", icon: <img src="/report.png" alt="report" style={{ width: 20, height: 20 }} />},
  ];

  return (
    <>
      <Header handleLogout={handleLogout} />
      <div className="flex min-h-screen bg-[#17171d] font-sans">


      <main className="flex-1 px-6 sm:px-10 py-10 overflow-auto ml-0 md:ml-5">
        {/* ToastContainer for notifications */}
        <ToastContainer position="top-right" autoClose={3000} />

        <button
          onClick={() => router.push("/register")}
          className="hidden md:inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 ml-310 rounded-lg font-semibold shadow-md transition"
        >
          Register
        </button>

        <div className="w-full max-w-5xl mx-auto">
          {/* Upload section */}
          <div className="bg-[#222331] rounded-2xl border border-zinc-800 shadow-lg p-8 mb-8 mt-2">
            <h3 className="flex items-center gap-2 text-violet-300 font-bold mb-3 text-xl">
              Upload File
            </h3>
            <form onSubmit={handleUpload}>
              <label
                htmlFor="file-input"
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  if (e.dataTransfer.files?.[0]) setFile(e.dataTransfer.files[0]);
                }}
                className="group relative flex flex-col items-center justify-center w-full h-24 md:h-28 rounded-xl border-2 border-dashed border-violet-500 bg-[#181926] hover:bg-violet-900/20 hover:border-violet-400 transition cursor-pointer mb-5"
              >
                <div className="flex items-center gap-2">
                  <span className="text-3xl text-violet-400">☁️</span>
                  <span className="text-zinc-200 font-medium">
                    Drop your file or click to choose
                  </span>
                </div>
                <input
                  id="file-input"
                  type="file"
                  className="hidden"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  accept=".mp4,.mov,.avi,.webm,.mp3,.wav,.m4a"
                  required
                />
              </label>
              <div className="text-xs text-zinc-400 mb-3">
                Supported: MP4, MOV, AVI, WebM, MP3, WAV, M4A
              </div>
              <button
                type="submit"
                disabled={!file}
                className={`rounded-md w-full px-4 py-2 text-base font-semibold shadow-sm transition ${
                  file
                    ? "bg-violet-600 text-white hover:bg-violet-700"
                    : "bg-zinc-700 text-zinc-400 cursor-not-allowed"
                }`}
              >
                Upload
              </button>
            </form>
            {alertVisible && (
              <div className="mt-4 rounded-lg border border-emerald-300 bg-emerald-900/40 px-4 py-2 text-emerald-300 text-center">
                File uploaded successfully!
              </div>
            )}
          </div>

          {/* Controls */}
          <section className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm shadow p-6 md:p-8 mb-6">
            <div className="flex flex-col md:flex-row md:items-center md:gap-8 gap-4 mb-8">
              <div className="min-w-[210px]">
                <label className="block mb-2 text-zinc-400 font-medium">🎯 Language</label>
                <select
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-600"
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value);
                    fetch("http://127.0.0.1:8000/set_language", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ language: e.target.value }),
                    });
                  }}
                >
                  <option value="en-IN">English (India)</option>
                  <option value="hi-IN">Hindi (India)</option>
                  <option value="ta-IN">Tamil (India)</option>
                  <option value="te-IN">Telugu (India)</option>
                  <option value="kn-IN">Kannada (India)</option>
                </select>
              </div>
              <div className="flex flex-wrap gap-4 justify-center md:justify-end flex-1">
                <button
                  onClick={startProcessing}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-2 text-base font-semibold transition bg-violet-600 hover:bg-violet-700 text-white border border-violet-500 focus:ring-2 focus:ring-violet-700 shadow"
                >
                  Start Process
                </button>
                <button
                  onClick={clearFiles}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-2 text-base font-semibold transition bg-rose-600 hover:bg-rose-700 text-white border border-rose-500 focus:ring-2 focus:ring-rose-700 shadow"
                >
                  Clear
                </button>
                <button
                  onClick={fetchSummary}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-2 text-base font-semibold transition bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 focus:ring-2 focus:ring-zinc-700"
                >
                  Summary
                </button>
                <button
                  onClick={fetchTranslation}
                  className="inline-flex items-center gap-2 rounded-full px-6 py-2 text-base font-semibold transition bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 focus:ring-2 focus:ring-zinc-700"
                >
                  Translate
                </button>
              </div>
            </div>

            {/* Transcript, Summary, Key Points, Translation */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-7">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-7 shadow">
                <h4 className="flex items-center gap-2 text-zinc-200 font-semibold mb-3">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500"></span>
                  Live Transcript
                </h4>
                <pre
                  ref={transcriptRef}
                  className="h-60 overflow-y-auto whitespace-pre-wrap text-sm text-zinc-300 bg-transparent"
                >
                  {transcript || "Transcript will appear here..."}
                </pre>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-7 shadow">
                <h4 className="flex items-center gap-2 text-zinc-200 font-semibold mb-3">
                  <span className="inline-block h-2 w-2 rounded-full bg-violet-500"></span>
                  Summary
                </h4>
                <pre className="h-60 overflow-y-auto whitespace-pre-wrap text-sm text-zinc-300 bg-transparent">
                  {summary}
                </pre>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-7 shadow">
                <h4 className="flex items-center gap-2 text-zinc-200 font-semibold mb-3">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-400"></span>
                  Key Points & Actions Required
                </h4>
                <pre className="h-56 overflow-y-auto whitespace-pre-wrap text-sm text-zinc-300 bg-transparent">
                  {keyPoints}
                </pre>
              </div>

              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5 md:p-7 shadow">
                <h4 className="flex items-center gap-2 text-zinc-200 font-semibold mb-3">
                  <span className="inline-block h-2 w-2 rounded-full bg-violet-400"></span>
                  Translation
                </h4>
                <pre className="h-56 overflow-y-auto whitespace-pre-wrap text-sm text-zinc-300 bg-transparent">
                  {translation}
                </pre>
              </div>
            </div>
          </section>
        </div>

        {/* Notifications for processing */}
        {processing && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg bg-blue-900 text-blue-200 z-50">
            Processing file, updating transcript...
          </div>
        )}
        {processSuccess && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 px-6 py-3 rounded-lg shadow-lg bg-green-900 text-green-200 z-50">
            ✅ Processing complete. Transcript updated.
          </div>
        )}
      </main>
      <Chatbot />
      </div>
    </>
  );
}
