'use client';

import React, { useEffect, useRef, useState } from 'react';
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

// Import contexts and components
import { useMeeting } from '../../context/meetingContext';
import { useUser } from "../../context/userContext";
import { useRecording } from '../../context/recordingContext';
import { useAudioRecorderVAD as useAudioRecorder } from '../dashboard/hooks/useAudioRecorderVAD';
import Header from '../header/page';
import Chatbot from '../chatbot/page';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export default function Live() {
  const { meetingId, setMeetingId } = useMeeting();
  const { canRecord, setCanRecord } = useRecording();
  const { user, loading } = useUser();

  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [keyPoints, setKeyPoints] = useState('');
  const [actions, setActions] = useState('');
  const [translation, setTranslation] = useState('');
  const [botRecording, setBotRecording] = useState(false);

  const {
    mics, deviceId, setDeviceId, recording, paused, recordingTime,
    startRec, stopRec, pauseRec, resumeRec
  } = useAudioRecorder();

  const transcriptPollingRef = useRef(null);
  const [creatingSession, setCreatingSession] = useState(false);

  // --- Start Session (same as RecordingPanel) ---
  const startSession = async () => {
    if (!user?.id) {
      console.error("Cannot create session: No user ID");
      toast.error("Please log in to start a session");
      return;
    }

    setCreatingSession(true);
    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    const skipEmbeddings = localStorage.getItem("emr_skip_embeddings") === "true";

    const payload = {
      user_id: String(user.id),
      ...(skipEmbeddings && { skip_embeddings: true }),
      meeting_name: localStorage.getItem("emr_meeting_name") || undefined
    };

    console.log("=== LIVE PAGE NEW ENCOUNTER REQUEST ===");
    console.log("Payload:", JSON.stringify(payload, null, 2));
    console.log("=======================================");

    try {
      const res = await fetch(`/api/backend/new_encounter`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY
        },
        credentials: "include",
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        const data = await res.json();
        setMeetingId(data.meeting_id);
        localStorage.setItem("meetingId", data.meeting_id);
        setCanRecord(true);
        setTranscript('');
        setSummary('');
        setKeyPoints('');
        setActions('');
        setTranslation('');
        // In bot mode, meet_join.py manages live_transcript.txt — don't wipe it
        const isBotMode = localStorage.getItem("emr_bot_transcript") === "true";
        if (!isBotMode) {
          await clearBackendTranscript();
        }
        toast.success("Session started! You can now record.");
        console.log("✅ New session created:", data.meeting_id);
      } else {
        const error = await res.json();
        console.error("Failed to create session:", error);
        toast.error(error.message || "Failed to create session. Please try again.");
      }
    } catch (err) {
      console.error("Error creating session:", err);
      toast.error("Error creating session. Please try again.");
    } finally {
      setCreatingSession(false);
    }
  };

  const clearBackendTranscript = async () => {
    if (!user?.id) return;

    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    try {
      const formData = new FormData();
      formData.append("user_id", user.id);

      const response = await fetch(`/api/backend/clear_transcript`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY
        },
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        console.log("✅ Backend transcript cleared successfully");
      }
    } catch (error) {
      console.error("Error clearing backend transcript:", error);
    }
  };

  // --- Transcript Polling (same as page.js) ---
  const startTranscriptPolling = () => {
    if (!user) return;
    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    const poll = async () => {
      const formData = new FormData();
      formData.append("user_id", user.id);
      try {
        const res = await fetch(`/api/backend/get_transcript`, {
          method: "POST",
          body: formData,
          headers: { "Authorization": `Bearer ${TOKEN_KEY}`, "X-API-KEY": API_KEY },
          credentials: "include"
        });
        if (res.ok) {
          const data = await res.json();
          setTranscript(data.transcript || '');
        }
      } catch (error) {
        console.error("Polling error:", error);
      }
    };
    poll();
    transcriptPollingRef.current = setInterval(poll, 3000);
  };

  const stopTranscriptPolling = () => {
    if (transcriptPollingRef.current) clearInterval(transcriptPollingRef.current);
  };

  useEffect(() => {
    if (canRecord && user) {
      startTranscriptPolling();
    } else {
      stopTranscriptPolling();
    }
    return () => stopTranscriptPolling();
  }, [canRecord, user]);

  // Auto-start when redirected from Today's Meetings → Internal Meeting
  useEffect(() => {
    const autoStart = localStorage.getItem("emr_auto_start");
    const meetingType = localStorage.getItem("emr_meeting_type");
    const meetingName = localStorage.getItem("emr_meeting_name");

    if (autoStart === "true" && meetingType === "InternalMeeting" && user) {
      localStorage.removeItem("emr_auto_start");
      toast.info(`Starting session for: ${meetingName}`);
      // Mark that recording should auto-start once session is ready
      sessionStorage.setItem("emr_pending_rec", "true");
      // Step 1: create session → sets meetingId + canRecord → triggers effect below
      startSession();
    }

    // Legacy support
    const joinedMeeting = localStorage.getItem("joinedMeeting");
    if (joinedMeeting && user) {
      const meetingData = JSON.parse(joinedMeeting);
      toast.info(`Recording started for: ${meetingData.name}`);
      const botMode = localStorage.getItem("emr_bot_transcript") === "true";
      startSession().then(() => {
        if (!botMode) setTimeout(() => { startRec(); }, 2000);
      });
      localStorage.removeItem("joinedMeeting");
    }
  }, [user, meetingId]);

  // Step 2: once session is ready (meetingId set by auto-start), start recording
  useEffect(() => {
    const meetingType = localStorage.getItem("emr_meeting_type");
    const wasAutoStart = sessionStorage.getItem("emr_pending_rec");
    const botMode = localStorage.getItem("emr_bot_transcript") === "true";
    if (meetingId && meetingType === "InternalMeeting" && wasAutoStart === "true") {
      sessionStorage.removeItem("emr_pending_rec");
      if (botMode) {
        toast.info("Bot is transcribing — mic recorder skipped.");
        setBotRecording(true);
      } else {
        // Give VAD ~2s to finish async init after deviceId resolved
        setTimeout(() => {
          startRec();
        }, 2000);
      }
    }
  }, [meetingId]);

  const getSummary = async () => {
    if (!meetingId) {
      toast.warning("No active meeting to summarize");
      return;
    }
    try {
      const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
      const res = await fetch(`/api/backend/get_summary_live?meeting_id=${meetingId}`, {
        headers: {
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY
        },
        credentials: "include"
      });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary || '---');
        setKeyPoints(data.key_points || '---');
        setActions(data.actions || '---');
        toast.success("Summary generated!");

        // End session after summary is generated
        endSession();
      } else {
        toast.error("Failed to generate summary");
      }
    } catch (err) {
      console.error('Summary error', err);
      toast.error("Error generating summary");
    }
  };

  const endSession = () => {
    setCanRecord(false);
    setMeetingId(null);
    localStorage.removeItem("meetingId");
    localStorage.removeItem("emr_bot_transcript");
    localStorage.removeItem("emr_meeting_type");
    localStorage.removeItem("emr_skip_embeddings");
    localStorage.removeItem("emr_meeting_name");
    console.log("✅ Session ended, data preserved for viewing");
  };

  const getTranslation = async () => {
    if (!user?.id) {
      toast.warning("Please log in to get translation");
      return;
    }
    try {
      const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
      const res = await fetch(`/api/backend/translate`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY
        },
        credentials: "include",
        body: JSON.stringify({ user_id: user.id })
      });
      if (res.ok) {
        const data = await res.json();
        setTranslation(data.translation || '---');
        toast.success("Translation completed!");
      } else {
        toast.error("Failed to translate");
      }
    } catch (err) {
      console.error('Translation error', err);
      toast.error("Error getting translation");
    }
  };

  // --- Recording Controls (same as page.js) ---
  const handleStartRec = () => {
    startRec();
    setCanRecord(true);
  };

  const handleStopRec = async () => {
    const botMode = localStorage.getItem("emr_bot_transcript") === "true";
    if (botMode) {
      setBotRecording(false);
      stopTranscriptPolling();

      // Signal the Playwright bot to close the browser
      try {
        const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
        await fetch(`/api/backend/stop-meet`, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${TOKEN_KEY}`,
            "X-API-KEY": process.env.NEXT_PUBLIC_API_KEY || ""
          },
          credentials: "include",
          body: JSON.stringify({ userId: user?.id })
        });
      } catch (e) {
        console.error("Failed to signal bot stop:", e);
      }

      toast.success("Bot session stopped.");
      // Clear bot flags
      localStorage.removeItem("emr_bot_transcript");
      localStorage.removeItem("emr_meeting_type");
      localStorage.removeItem("emr_skip_embeddings");
      localStorage.removeItem("emr_meeting_name");
      return;
    }
    await stopRec();
  };

  const clearData = async () => {
    if (!user?.id) {
      toast.warning("Please log in to clear data");
      return;
    }

    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    try {
      const formData = new FormData();
      formData.append("user_id", user.id);

      const response = await fetch(`/api/backend/clear_transcript`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY
        },
        credentials: "include",
        body: formData,
      });

      if (response.ok) {
        setTranscript('');
        setSummary('');
        setKeyPoints('');
        setActions('');
        setTranslation('');
        toast.success("Data cleared successfully");
      } else {
        toast.error("Failed to clear data");
      }
    } catch (error) {
      console.error("Error clearing data:", error);
      toast.error("Error clearing data");
    }
  };

  // --- Language (same as page.js) ---
  const handleLanguageChange = async (e) => {
    const lang = e.target.value;
    setSelectedLanguage(lang);

    if (!user?.id) {
      toast.error("Please log in to change language");
      return;
    }

    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    try {
      const response = await fetch(`/api/backend/select_language`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY
        },
        credentials: "include",
        body: JSON.stringify({
          language_code: lang,
          user_id: user.id
        })
      });

      if (response.ok) {
        toast.success(`Language changed to ${lang}`);
      } else {
        toast.error("Failed to change language");
      }
    } catch (error) {
      toast.error("Error changing language");
    }
  };

  // --- Logout ---
  const handleLogout = async () => {
    try {
      const res = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY
        },
        credentials: "include",
      });

      if (res.ok) {
        localStorage.clear();
        window.dispatchEvent(new Event('userUpdated'));
        window.location.href = "/login";
      } else {
        toast.error("Logout failed");
      }
    } catch (err) {
      toast.error("Logout error");
    }
  };

  // --- UI ---
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-lg text-gray-700">Loading user data...</p>
      </div>
    );
  }

  return (
    <>
      <Header user={user} handleLogout={handleLogout} />
      <div className="flex min-h-screen bg-[#17171d] font-sans">
        <main className="flex-1 px-6 sm:px-10 py-10 overflow-auto ml-0 md:ml-5">
          <ToastContainer position="top-right" autoClose={2000} hideProgressBar />

          {/* Recording Controls */}
          <section className="mx-auto max-w-6xl rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-4 md:p-6 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
            <h3 className="flex items-center gap-2 text-zinc-200 font-semibold mb-4">
              <span className="inline-block h-2 w-2 rounded-full bg-violet-500"></span>
              Recording Controls
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3 md:gap-4 items-center">
              {/* Language */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1">Language</label>
                <select
                  value={selectedLanguage}
                  onChange={handleLanguageChange}
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-600"
                >
                  <option value="en">English</option>
                  <option value="hi">Hindi</option>
                  <option value="ta">Tamil</option>
                  <option value="te">Telugu</option>
                  <option value="kn">Kannada</option>
                </select>
              </div>

              {/* Microphone */}
              <div className="md:col-span-1">
                <label className="block text-xs font-medium text-zinc-400 mb-1">Microphone</label>
                <select
                  value={deviceId ?? ''}
                  onChange={(e) => setDeviceId(e.target.value)}
                  className="w-full rounded-lg bg-zinc-900 border border-zinc-800 text-zinc-200 text-sm px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-violet-600"
                >
                  {mics.map((mic) => (
                    <option key={mic.deviceId} value={mic.deviceId}>
                      {mic.label || `Microphone ${mic.deviceId}`}
                    </option>
                  ))}
                </select>
              </div>

              {/* Actions (Start Session + Record toggle + Clear) */}
              <div className="md:col-span-2 flex items-end justify-start md:justify-end gap-2">
                {!canRecord && (
                  <button
                    onClick={startSession}
                    disabled={!user || creatingSession}
                    className={`inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold
                      bg-violet-600/90 hover:bg-violet-600 text-white border border-violet-500 
                      focus:outline-none focus:ring-2 focus:ring-violet-500 shadow-[0_0_0_3px_rgba(139,92,246,0.25)]
                      transition ${(!user || creatingSession) ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full bg-violet-300"></span>
                    {creatingSession ? 'Creating Session...' : 'Start Session'}
                  </button>
                )}

                {canRecord && (
                  <button
                    onClick={(recording || botRecording) ? handleStopRec : handleStartRec}
                    disabled={!user}
                    className={`relative inline-flex items-center gap-2 rounded-full px-5 py-2.5 text-sm font-semibold
                      border transition focus:outline-none focus:ring-2
                      ${(recording || botRecording)
                        ? 'bg-rose-600/90 hover:bg-rose-600 text-white border-rose-500 focus:ring-rose-500 shadow-[0_0_0_3px_rgba(244,63,94,0.25)]'
                        : 'bg-violet-600/90 hover:bg-violet-600 text-white border-violet-500 focus:ring-violet-500 shadow-[0_0_0_3px_rgba(139,92,246,0.25)]'
                      } ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                  >
                    <span className={`h-2.5 w-2.5 rounded-full ${(recording || botRecording) ? 'bg-rose-300' : 'bg-violet-300'}`}></span>
                    {(recording || botRecording) ? 'Stop Recording' : 'Start Recording'}
                  </button>
                )}

                {canRecord && (
                  <>
                    <button
                      onClick={clearData}
                      disabled={!user}
                      title="Clear"
                      className={`inline-flex items-center justify-center rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-zinc-300 hover:bg-zinc-800 hover:text-white text-sm ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      🗑
                    </button>

                    <button
                      onClick={getSummary}
                      disabled={!user || !meetingId}
                      className={`inline-flex items-center rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-200 px-4 py-2 text-sm hover:bg-zinc-700 ${!user || !meetingId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Summary
                    </button>

                    <button
                      onClick={getTranslation}
                      disabled={!user}
                      className={`inline-flex items-center rounded-full bg-zinc-800/80 border border-zinc-700 text-zinc-200 px-4 py-2 text-sm hover:bg-zinc-700 ${!user ? 'opacity-50 cursor-not-allowed' : ''}`}
                    >
                      Translate
                    </button>
                  </>
                )}
              </div>
            </div>
          </section>

          {/* Content grid */}
          <section className="mx-auto max-w-6xl mt-6 space-y-6">
            {/* Row 1: Transcript + Summary */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Live Transcript */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <h4 className="flex items-center gap-2 text-zinc-200 font-semibold mb-3">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-500"></span>
                  Live Transcript
                </h4>
                <pre className="h-64 md:h-72 overflow-y-auto whitespace-pre-wrap text-sm text-zinc-300 bg-transparent">
                  {transcript || 'Start recording to see live transcript...'}
                </pre>
              </div>

              {/* Summary */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <h4 className="flex items-center gap-2 text-zinc-200 font-semibold mb-3">
                  <span className="inline-block h-2 w-2 rounded-full bg-violet-500"></span>
                  Summary
                </h4>
                <pre className="h-64 md:h-72 overflow-y-auto whitespace-pre-wrap text-sm text-zinc-300 bg-transparent">
                  {summary || 'Summary will appear here...'}
                </pre>
              </div>
            </div>

            {/* Row 2: Key Points + Actions Required */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Key Points */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <h4 className="flex items-center gap-2 text-zinc-200 font-semibold mb-3">
                  <span className="inline-block h-2 w-2 rounded-full bg-amber-400"></span>
                  Key Points
                </h4>
                <pre className="h-56 overflow-y-auto whitespace-pre-wrap text-sm text-zinc-300 bg-transparent">
                  {keyPoints || 'Key points will be extracted automatically...'}
                </pre>
              </div>

              {/* Actions Required */}
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                <h4 className="flex items-center gap-2 text-zinc-200 font-semibold mb-3">
                  <span className="inline-block h-2 w-2 rounded-full bg-rose-500"></span>
                  Actions Required
                </h4>
                <pre className="h-56 overflow-y-auto whitespace-pre-wrap text-sm text-zinc-300 bg-transparent">
                  {actions || 'Action items will appear here...'}
                </pre>
              </div>
            </div>

            {/* Row 3: Translation */}
            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm p-4 md:p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <h4 className="flex items-center gap-2 text-zinc-200 font-semibold mb-3">
                <span className="inline-block h-2 w-2 rounded-full bg-violet-400"></span>
                Translation
              </h4>
              <pre className="h-56 overflow-y-auto whitespace-pre-wrap text-sm text-zinc-300 bg-transparent">
                {translation || 'Translation will appear here...'}
              </pre>
            </div>
          </section>
        </main>
        <Chatbot userId={user?.id} />
      </div>
    </>
  );
}
