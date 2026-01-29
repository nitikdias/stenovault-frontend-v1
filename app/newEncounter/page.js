// Simplified New Encounter page - just start a session
"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMeeting } from "@/context/meetingContext";
import Header from "../header/page";
import { useRecording } from "@/context/recordingContext";
import { toast } from "react-toastify";

export default function NewEncounter() {
  const router = useRouter();
  const { setMeetingId } = useMeeting();
  const { setCanRecord } = useRecording();

  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [stats, setStats] = useState({ today: 0, week: 0 });
  const [embeddingStatus, setEmbeddingStatus] = useState(null); // Track embedding load status
  const [pollingInterval, setPollingInterval] = useState(null);

  const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";

  // ---------------------- DESIGN ONLY ----------------------
  const containerStyle = {
    backgroundImage: "url('/images/auth-image.png')",
    backgroundSize: "cover",
    backgroundPosition: "center",
    backgroundRepeat: "no-repeat",
    minHeight: "100vh",
    width: "100%",
    display: "flex",
    flexDirection: "column"
  };

  const contentWrapperStyle = {
    flex: 1,
    display: "flex",
    justifyContent: "center",
    alignItems: "center",
    padding: "20px"
  };

  const formWrapperStyle = {
    width: "100%",
    maxWidth: "480px",
    padding: "24px",
    backgroundColor: "rgba(255,255,255,0.92)",
    borderRadius: "12px",
    backdropFilter: "blur(10px)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.15)"
  };

  const logoStyle = {
    width: "150px",
    margin: "0 auto 25px auto",
    display: "block"
  };
  // ---------------------------------------------------------

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/logout", { method: "POST", headers: { "Content-Type": "application/json", "X-API-KEY": API_KEY } });
      if (res.ok) {
        localStorage.clear();
        router.push("/login");
        setTimeout(() => (window.location.href = "/login"), 100);
      }
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  async function fetchStats() {
    const id = localStorage.getItem("userId");
    if (!id) return;
    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    try {
      const res = await fetch(`/api/backend/stats?user_id=${id}`, {
        headers: { "Content-Type": "application/json", "Authorization": `Bearer ${TOKEN_KEY}`,"X-API-KEY": API_KEY },
        credentials: "include"
      });
      if (res.ok) setStats(await res.json());
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => { fetchStats(); }, []);

  useEffect(() => {
    if (typeof window !== "undefined") setUserId(localStorage.getItem("userId"));
  }, []);

  // Poll embedding status
  const checkEmbeddingStatus = async (userId) => {
    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    try {
      const res = await fetch(`/api/backend/embedding_status/${userId}`, {
        headers: { 
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY 
        },
        credentials: "include"
      });

      if (res.ok) {
        const data = await res.json();
        setEmbeddingStatus(data);
        
        if (data.status === "ready") {
          // Embeddings loaded, stop polling and allow user to proceed
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          setCanRecord(true);
          toast.success(`Embeddings loaded! ${data.speakers_count} speakers ready`);
          setTimeout(() => router.push("/"), 1000);
        } else if (data.status === "failed") {
          // Failed to load embeddings
          if (pollingInterval) {
            clearInterval(pollingInterval);
            setPollingInterval(null);
          }
          toast.error("Failed to load speaker embeddings");
          setLoading(false);
        }
      }
    } catch (error) {
      console.error("Error checking embedding status:", error);
    }
  };

  // Cleanup polling on unmount
  useEffect(() => {
    return () => {
      if (pollingInterval) {
        clearInterval(pollingInterval);
      }
    };
  }, [pollingInterval]);

  const handleStartSession = async () => {
    if (!userId) return alert("User not found");
    
    setLoading(true);
    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    
    const payload = { 
      user_id: String(userId)
    };
    
    console.log("=== NEW ENCOUNTER REQUEST ===");
    console.log("Payload:", JSON.stringify(payload, null, 2));
    console.log("User ID type:", typeof userId);
    console.log("User ID value:", userId);
    console.log("=============================");
    
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

      const data = await res.json();
      if (res.ok) {
        setMeetingId(data.meeting_id);
        localStorage.setItem("meetingId", data.meeting_id);
        
        // Start polling for embedding status
        toast.info("Loading speaker embeddings...");
        setEmbeddingStatus({ status: "loading" });
        
        // Poll every 2 seconds
        const interval = setInterval(() => {
          checkEmbeddingStatus(userId);
        }, 2000);
        setPollingInterval(interval);
        
        // Do initial check immediately
        checkEmbeddingStatus(userId);
        
      } else {
        console.error("Backend error:", data);
        toast.error(data.error || data.message || JSON.stringify(data.errors || data));
        setLoading(false);
      }
    } catch (err) {
      console.error("Failed to create session:", err);
      toast.error("Failed to create session");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={containerStyle}>
      <Header handleLogout={handleLogout} />

      <div style={contentWrapperStyle}>
        <div style={formWrapperStyle}>
          <img src="/images/auth-logo.png" alt="Auth Logo" style={logoStyle} />

          <h2 style={{ textAlign: "center", marginBottom: "20px", color: "black", fontWeight: "600" }}>
            Start New Session
          </h2>

          {/* Stats Display */}
          <div style={{ 
            display: "flex", 
            gap: "15px", 
            marginBottom: "25px",
            padding: "15px",
            backgroundColor: "rgba(1, 37, 55, 0.05)",
            borderRadius: "8px"
          }}>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#012537" }}>
                {stats.today}
              </div>
              <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
                Today's Sessions
              </div>
            </div>
            <div style={{ flex: 1, textAlign: "center" }}>
              <div style={{ fontSize: "24px", fontWeight: "700", color: "#012537" }}>
                {stats.week}
              </div>
              <div style={{ fontSize: "13px", color: "#666", marginTop: "4px" }}>
                This Week
              </div>
            </div>
          </div>

          {/* Start Session Button */}
          <button
            onClick={handleStartSession}
            disabled={loading}
            style={{ 
              width: "100%",
              padding: "14px", 
              border: "2px solid #012537", 
              color: loading ? "#999" : "#012537", 
              background: "transparent", 
              borderRadius: "8px", 
              fontSize: "16px",
              fontWeight: "600",
              cursor: loading ? "not-allowed" : "pointer",
              transition: "all 0.2s"
            }}
          >
            {loading ? "Starting..." : "Start Session"}
          </button>

          {/* Embedding Status Indicator */}
          {embeddingStatus && embeddingStatus.status === "loading" && (
            <div style={{
              marginTop: "20px",
              padding: "15px",
              backgroundColor: "rgba(59, 130, 246, 0.1)",
              borderRadius: "8px",
              border: "1px solid rgba(59, 130, 246, 0.3)",
              textAlign: "center"
            }}>
              <div style={{
                display: "inline-block",
                width: "20px",
                height: "20px",
                border: "3px solid rgba(59, 130, 246, 0.3)",
                borderTop: "3px solid #3b82f6",
                borderRadius: "50%",
                animation: "spin 1s linear infinite",
                marginBottom: "10px"
              }} />
              <div style={{ color: "#3b82f6", fontWeight: "600", fontSize: "14px" }}>
                Loading speaker embeddings from Azure...
              </div>
              <div style={{ color: "#666", fontSize: "12px", marginTop: "5px" }}>
                Please wait, this may take a few seconds
              </div>
            </div>
          )}

          <style jsx>{`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </div>
      </div>
    </div>
  );
}
