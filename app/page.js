"use client";
import React, { useEffect, useState, useRef } from 'react';
import { toast, ToastContainer } from "react-toastify";
import 'react-toastify/dist/ReactToastify.css';

// Import contexts and components
import { useMeeting } from '@/context/meetingContext';
import { useUser } from "@/context/userContext";
import { useRecording } from '@/context/recordingContext';
import { useAudioRecorderVAD as useAudioRecorder } from './dashboard/hooks/useAudioRecorderVAD';
import Header from './header/page';
import RecordingPanel from './dashboard/components/RecordingPanel';
import AgendaMinutes from './dashboard/components/AgendaMinutes';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

export default function App() {
  const { meetingId, setMeetingId } = useMeeting();
  const { canRecord, setCanRecord } = useRecording();
  const { user, loading } = useUser(); 
  
  // Debug logging
  useEffect(() => {
    console.log("🔍 Debug - User state:", user);
    console.log("🔍 Debug - Loading state:", loading);
    console.log("🔍 Debug - LocalStorage userId:", localStorage.getItem("userId"));
  }, [user, loading]);
  
  const [stats, setStats] = useState({ today: 0, week: 0 });
  const [selectedLanguage, setSelectedLanguage] = useState("en");
  const [transcript, setTranscript] = useState('');
  const [summary, setSummary] = useState('');
  const [isGeneratingSummary, setIsGeneratingSummary] = useState(false);
  const [readyForSummary, setReadyForSummary] = useState(false);
  const [minutes, setMinutes] = useState([]);


  const {
    mics, deviceId, setDeviceId, recording, paused, recordingTime,
    startRec, stopRec, pauseRec, resumeRec
  } = useAudioRecorder();

  const transcriptPollingRef = useRef(null);

  // ✅ Call clear endpoint when new encounter starts
useEffect(() => {
  console.log("Meeting ID changed:", meetingId);
  
  if (meetingId && user) {
    console.log("🆕 New encounter started - clearing all data");
    
    // ✅ Clear backend transcript
    clearBackendTranscript();
    
    // Clear frontend transcript
    setTranscript("");
    
    // Clear minutes only when creating a NEW encounter
    setMinutes([]);
    
    // Reset other states
    setSummary("");
    setReadyForSummary(false);
    
    // ✅ Reset language to English for new encounter
    setSelectedLanguage("en");
    
    toast.info("New encounter started - ready for recording");
  }
}, [meetingId, user]);

// ✅ Load saved minutes for the current encounter
useEffect(() => {
  if (meetingId && user?.id) {
    loadSavedMinutes();
  }
}, [meetingId, user?.id]);

const loadSavedMinutes = async () => {
  if (!user?.id || !meetingId) return;
  
  const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
  try {
    const response = await fetch(`/api/backend/get-minutes?user_id=${user.id}&encounter_id=${meetingId}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${TOKEN_KEY}`,
        "X-API-KEY": API_KEY
      },
      credentials: "include",
    });
    
    if (response.ok) {
      const data = await response.json();
      if (data.minutes && data.minutes.length > 0) {
        setMinutes(data.minutes);
        console.log("✅ Loaded saved minutes:", data.minutes.length);
      }
    } else if (response.status !== 404) {
      // 404 is expected if no minutes exist yet
      console.error("Failed to load minutes:", await response.text());
    }
  } catch (error) {
    console.error("Error loading minutes:", error);
  }
};

// ✅ Add function to clear backend transcript
const clearBackendTranscript = async () => {
  if (!user?.id) {
    console.warn("Cannot clear transcript: No user ID");
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
      console.log("✅ Backend transcript cleared successfully");
    } else {
      const errorText = await response.text();
      console.error("❌ Failed to clear backend transcript:", errorText);
    }
  } catch (error) {
    console.error("Error clearing backend transcript:", error);
  }
};


  // --- Fetch Stats ---
  useEffect(() => {
    if (!user) return; 
    async function fetchStats() {
      const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
      try {
        const res = await fetch(`/api/backend/stats?user_id=${user.id}`, { 
          headers: { "Authorization": `Bearer ${TOKEN_KEY}`, "X-API-KEY": API_KEY },
          credentials: "include"
        });
        if (res.ok) setStats(await res.json());
      } catch (err) { console.error("Failed to fetch stats:", err); }
    }
    fetchStats();
  }, [user]);

  // --- Transcript Polling ---
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
      // Start polling when session is active (canRecord = true)
      startTranscriptPolling();
    } else {
      // Stop polling when session ends (canRecord = false)
      stopTranscriptPolling();
    }
    return () => stopTranscriptPolling();
  }, [canRecord, user]);

  // --- Language ---
  const handleLanguageChange = async (e) => {
    const lang = e.target.value;
    setSelectedLanguage(lang);
    
    if (!user?.id) {
      console.error("Cannot set language: No user ID");
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
          user_id: user.id  // ✅ Add user_id
        })
      });
      
      if (response.ok) {
        const data = await response.json();
        console.log("✅ Language set:", data);
        toast.success(`Language changed to ${lang}`);
      } else {
        const error = await response.json();
        console.error("❌ Failed to set language:", error);
        toast.error("Failed to change language");
      }
    } catch (error) { 
      console.error("Error setting language:", error);
      toast.error("Error changing language");
    }
  };
  
// --- Generate Summary (deprecated - using agenda minutes now) ---
  const generateSummary = async () => {
    toast.info("Please use the Agenda Minutes feature to generate meeting documentation.");
    return;
  };


  // --- Logout ---
 const handleLogout = async () => {
  try {
    const res = await fetch("/api/logout", {  // ✅ Use Next.js API route
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-KEY": API_KEY
      },
      credentials: "include",  // ✅ Include cookies
    });

    if (res.ok) {
      localStorage.clear();
      // ✅ Notify UserContext that user has been cleared
      window.dispatchEvent(new Event('userUpdated'));
      window.location.href = "/login";
    } else {
      const errorData = await res.json();
      console.error("❌ Logout failed:", errorData);
      toast.error("Logout failed");
    }
  } catch (err) {
    console.error("Error during logout:", err);
    toast.error("Logout error");
  }
};


  // --- Recording Controls ---
  const handleStartRec = () => {
    startRec();
    setCanRecord(true); 
  };
  
  const handleStopRec = async () => {
    await stopRec();
    setReadyForSummary(true); 
    setCanRecord(true);
  };
  
  const handleGenerateSummary = async () => {
    try {
      await generateSummary();
      
      // End session after summary is generated
      console.log("📝 Summary generated, ending session...");
      setCanRecord(false);
      setMeetingId(null);
      localStorage.removeItem("meetingId");
      toast.success("Session ended successfully!");
      
    } catch (error) {
      console.error("Error generating summary:", error);
      toast.error("Failed to generate summary");
    }
  };

  const handleMinutesSaved = () => {
    // This is called after minutes are saved successfully
    // Reset any additional state if needed
    setReadyForSummary(false);
    console.log("✅ Minutes saved callback - session ended");
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
    <div className="min-h-screen font-sans overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar />
      <Header user={user} handleLogout={handleLogout} /> 
      <div className="flex-1 p-4 sm:p-6 overflow-hidden">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 h-full">
          <RecordingPanel
            user={user}
            userLoading={loading}
            mics={mics} deviceId={deviceId} setDeviceId={setDeviceId}
            recording={recording} paused={paused} recordingTime={recordingTime}
            startRec={handleStartRec} stopRec={handleStopRec} pauseRec={pauseRec} resumeRec={resumeRec}
            transcript={transcript}
            selectedLanguage={selectedLanguage}
            handleLanguageChange={handleLanguageChange}
            canRecord={canRecord}
            readyForSummary={readyForSummary}
            setReadyForSummary={setReadyForSummary}
            handleGenerateSummary={handleGenerateSummary}
          />
          <AgendaMinutes
            minutes={minutes}
            setMinutes={setMinutes}
            transcript={transcript}
            onMinutesSaved={handleMinutesSaved}
          />
        </div>
      </div>
    </div>
  );
}
