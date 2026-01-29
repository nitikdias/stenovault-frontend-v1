"use client";
import React, { useRef, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useMeeting } from '@/context/meetingContext';
import { useRecording } from '@/context/recordingContext';
import { toast } from 'react-toastify';

// --- Waveform Component ---
function CodePenWaveform({ paused }) {
  const svgRef = useRef(null);
  const requestRef = useRef();
  const containerRef = useRef();
  const [dimensions, setDimensions] = useState({ width: 400, height: 150 });

  useEffect(() => {
    const updateDimensions = () => {
      if (containerRef.current) {
        const width = containerRef.current.offsetWidth;
        const height = width < 640 ? 80 : 150;
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
    const amplitude = dimensions.height * 0.2;
    const wavelength = lines.length;
    const baseline = dimensions.height * 0.73;
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

  const lineCount = dimensions.width < 640 ? 20 : 28;
  const spacing = dimensions.width / (lineCount + 2);
  const strokeWidth = dimensions.width < 640 ? 3 : 4;

  return (
    <div ref={containerRef} className="w-full flex justify-center">
      <svg ref={svgRef} width={dimensions.width} height={dimensions.height} viewBox={`0 0 ${dimensions.width} ${dimensions.height}`} className="max-w-full h-auto" style={{ display: "block" }}>
        <g>
          {Array.from({ length: lineCount }).map((_, i) => {
            const x = spacing + i * spacing;
            const y1 = dimensions.height * 0.93;
            const y2 = dimensions.height * 0.73;
            return <line key={i} x1={x} y1={y1} x2={x} y2={y2} stroke="#4F46E5" strokeWidth={strokeWidth} strokeLinecap="round" />;
          })}
        </g>
      </svg>
    </div>
  );
}

// --- Main Panel Component ---
export default function RecordingPanel({
  // Add user prop
  user,
  userLoading,
  // Props from audio hook
  mics, deviceId, setDeviceId, recording, paused, recordingTime,
  startRec, stopRec, pauseRec, resumeRec,
  // Props for transcript and other controls
  transcript, selectedLanguage, handleLanguageChange, canRecord,
  readyForSummary, setReadyForSummary, handleGenerateSummary
}) {
  const router = useRouter();
  const [creatingSession, setCreatingSession] = useState(false);
  const [processingRecording, setProcessingRecording] = useState(false);
  const { meetingId, setMeetingId } = useMeeting();
  const { setCanRecord } = useRecording();
  
  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleStart = async () => {
    // If no session active, create one directly
    if (!canRecord) {
      await createNewSession();
      return;
    }
    // Otherwise start recording
    setReadyForSummary(false);
    startRec();
  };

  const handleStopRecording = async () => {
    if (!user?.id) {
      console.error("Cannot stop recording: No user ID");
      toast.error("Missing user information");
      return;
    }

    try {
      // Show processing popup
      setProcessingRecording(true);
      toast.info("Processing final segment...", { autoClose: false, toastId: "processing" });

      // Stop the recorder and wait for all uploads to complete
      console.log("🛑 Stopping recorder and uploading final chunk...");
      await stopRec();
      console.log("✅ Recorder stopped, all chunks uploaded (including chunk_X_final.wav)");

      // Now wait for backend to process the final chunk
      console.log("⏳ Waiting for backend to process final chunk...");
      
      const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
      const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
      
      // Get initial transcript length
      const beforeFormData = new FormData();
      beforeFormData.append("user_id", user.id);
      
      const beforeRes = await fetch(`/api/backend/get_transcript`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY
        },
        credentials: "include",
        body: beforeFormData
      });
      
      const beforeData = await beforeRes.json();
      const beforeLength = (beforeData.transcript || "").length;
      console.log(`📊 Initial transcript length: ${beforeLength} chars`);

      // Poll get_transcript until final chunk is processed
      let attempts = 0;
      const maxAttempts = 45; // 45 seconds max (processing can take time)
      let finalChunkProcessed = false;
      
      while (attempts < maxAttempts && !finalChunkProcessed) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        attempts++;
        
        const pollFormData = new FormData();
        pollFormData.append("user_id", user.id);
        
        const pollRes = await fetch(`/api/backend/get_transcript`, {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${TOKEN_KEY}`,
            "X-API-KEY": API_KEY
          },
          credentials: "include",
          body: pollFormData
        });
        
        const pollData = await pollRes.json();
        const currentLength = (pollData.transcript || "").length;
        
        console.log(`📊 Poll ${attempts}/${maxAttempts}: Transcript length = ${currentLength} chars`);
        
        // Check if transcript has been updated (grown significantly)
        // The final chunk should add some text
        if (currentLength > beforeLength) {
          console.log(`✅ Final chunk processed! Transcript grew from ${beforeLength} to ${currentLength} chars (+${currentLength - beforeLength})`);
          finalChunkProcessed = true;
          
          // Wait one more second to ensure everything is written
          await new Promise(resolve => setTimeout(resolve, 1000));
          break;
        }
        
        // If no change after 10 attempts, it might already be processed or empty
        if (attempts >= 10 && currentLength === beforeLength && beforeLength > 0) {
          console.log(`ℹ️ No new content after ${attempts} attempts, final chunk might be empty or already processed`);
          finalChunkProcessed = true;
          break;
        }
      }
      
      if (!finalChunkProcessed && attempts >= maxAttempts) {
        console.warn("⚠️ Timeout waiting for final chunk processing");
        toast.warning("Processing took longer than expected, but recording is saved");
      }

      // Success!
      toast.dismiss("processing");
      toast.success("Recording stopped successfully!");
      setReadyForSummary(true);

    } catch (error) {
      console.error("❌ Error stopping recording:", error);
      toast.dismiss("processing");
      toast.error(`Failed to stop recording: ${error.message}`);
    } finally {
      setProcessingRecording(false);
    }
  };

  const createNewSession = async () => {
    if (!user?.id) {
      console.error("Cannot create session: No user ID");
      toast.error("Please log in to start a session");
      return;
    }

    setCreatingSession(true);
    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    const API_KEY = process.env.NEXT_PUBLIC_API_KEY;
    
    const payload = { 
      user_id: String(user.id)
    };
    
    console.log("=== RECORDING PANEL NEW ENCOUNTER REQUEST ===");
    console.log("Payload:", JSON.stringify(payload, null, 2));
    console.log("User object:", user);
    console.log("User ID type:", typeof user.id);
    console.log("User ID value:", user.id);
    console.log("===========================================");
    
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
        
        // Update contexts
        setMeetingId(data.meeting_id);
        localStorage.setItem("meetingId", data.meeting_id);
        setCanRecord(true);
        
        toast.success("Session started! You can now record.");
      } else {
        const error = await res.json();
        console.error("Failed to create session:", error);
        toast.error("Failed to create session. Please try again.");
      }
    } catch (err) {
      console.error("Error creating session:", err);
      toast.error("Error creating session. Please try again.");
    } finally {
      setCreatingSession(false);
    }
  };

  return (
    <div className="flex flex-col h-full" style={{ minHeight: 0 }}>
      {/* Recording Section - Dark Theme */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '20px',
        padding: '24px 20px',
        border: '1px solid rgba(71, 85, 105, 0.3)',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        flexShrink: 0
      }}>
        {/* Title */}
        <div className="text-center mb-6">
          <h3 style={{
            fontSize: 'clamp(24px, 4vw, 32px)',
            fontWeight: '700',
            color: 'white',
            marginBottom: '4px',
            letterSpacing: '-0.5px'
          }}>Ambient Listening</h3>
          
        </div>

        {/* Settings Card or Waveform */}
        {!recording ? (
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(71, 85, 105, 0.3)',
            borderRadius: '12px',
            padding: '16px',
            marginBottom: '16px'
          }}>
            {/* Language Section */}
            <div className="mb-4">
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: '500',
                color: '#94a3b8',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"/>
                  <line x1="2" y1="12" x2="22" y2="12"/>
                  <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
                </svg>
                Language
              </label>
              <select 
                value={selectedLanguage} 
                onChange={handleLanguageChange}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(71, 85, 105, 0.4)',
                  borderRadius: '10px',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '36px'
                }}
              >
                <option value="en">English (US)</option>
                <option value="ta">Tamil</option>
                <option value="te">Telugu</option>
                <option value="hi">Hindi</option>
                <option value="ml">Malayalam</option>
                <option value="kn">Kannada</option>
                <option value="bn">Bengali</option>
              </select>
            </div>

            {/* Microphone Section */}
            <div>
              <label style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: '500',
                color: '#94a3b8',
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                  <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                  <line x1="12" y1="19" x2="12" y2="23"/>
                  <line x1="8" y1="23" x2="16" y2="23"/>
                </svg>
                Microphone Source
              </label>
              <select 
                value={deviceId} 
                onChange={e => setDeviceId(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  background: 'rgba(15, 23, 42, 0.8)',
                  border: '1px solid rgba(71, 85, 105, 0.4)',
                  borderRadius: '10px',
                  color: mics.length > 0 ? 'white' : '#94a3b8',
                  fontSize: '14px',
                  cursor: 'pointer',
                  outline: 'none',
                  appearance: 'none',
                  backgroundImage: `url("data:image/svg+xml,%3Csvg width='12' height='8' viewBox='0 0 12 8' fill='none' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1.5L6 6.5L11 1.5' stroke='%2394a3b8' stroke-width='2' stroke-linecap='round'/%3E%3C/svg%3E")`,
                  backgroundRepeat: 'no-repeat',
                  backgroundPosition: 'right 12px center',
                  paddingRight: '36px'
                }}
              >
                {mics.length > 0 ? (
                  mics.map((mic, idx) => (
                    <option key={idx} value={mic.deviceId}>
                      {mic.label || `Microphone ${idx + 1}`}
                    </option>
                  ))
                ) : (
                  <option value="">Requesting permissions...</option>
                )}
              </select>
              {mics.length === 0 && (
                <p style={{
                  marginTop: '6px',
                  fontSize: '11px',
                  color: '#fbbf24',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  * Please allow microphone access to see devices.
                </p>
              )}
            </div>
          </div>
        ) : (
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(71, 85, 105, 0.3)',
            borderRadius: '12px',
            padding: '20px 16px',
            marginBottom: '16px',
            minHeight: '160px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <CodePenWaveform paused={false} />
          </div>
        )}

        {/* Action Buttons */}
        {!recording ? (
          <button 
            disabled={userLoading || !user || creatingSession} 
            onClick={handleStart}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: (userLoading || !user || creatingSession) ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              opacity: (userLoading || !user || creatingSession) ? 0.5 : 1,
              transition: 'all 0.2s ease',
              boxShadow: '0 8px 24px rgba(79, 70, 229, 0.3)'
            }}
            onMouseEnter={(e) => {
              if (!userLoading && user && !creatingSession) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(79, 70, 229, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = 'translateY(0)';
              e.currentTarget.style.boxShadow = '0 8px 24px rgba(79, 70, 229, 0.3)';
            }}
            title={userLoading ? "Loading user..." : (!user ? "User not found" : (creatingSession ? "Creating session..." : ""))}
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
              <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              <line x1="12" y1="19" x2="12" y2="23" stroke="white" strokeWidth="2"/>
              <line x1="8" y1="23" x2="16" y2="23" stroke="white" strokeWidth="2"/>
            </svg>
            {userLoading ? "Loading..." : (creatingSession ? "Creating Session..." : (!canRecord ? "Start Session" : "Start Recording"))}
          </button>
        ) : (
          <button 
            onClick={handleStopRecording}
            disabled={processingRecording}
            style={{
              width: '100%',
              padding: '14px 20px',
              background: processingRecording 
                ? 'linear-gradient(135deg, #64748b 0%, #475569 100%)' 
                : 'linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)',
              border: 'none',
              borderRadius: '12px',
              color: 'white',
              fontSize: '16px',
              fontWeight: '600',
              cursor: processingRecording ? 'not-allowed' : 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              transition: 'all 0.2s ease',
              boxShadow: processingRecording 
                ? '0 8px 24px rgba(100, 116, 139, 0.3)' 
                : '0 8px 24px rgba(220, 38, 38, 0.3)',
              opacity: processingRecording ? 0.7 : 1
            }}
            onMouseEnter={(e) => {
              if (!processingRecording) {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 12px 32px rgba(220, 38, 38, 0.4)';
              }
            }}
            onMouseLeave={(e) => {
              if (!processingRecording) {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 8px 24px rgba(220, 38, 38, 0.3)';
              }
            }}
          >
            {processingRecording ? (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="animate-spin">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
                Processing...
              </>
            ) : (
              <>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="6" width="12" height="12" rx="2"/>
                </svg>
                Stop Recording
              </>
            )}
          </button>
        )}

        {/* Recording Status */}
        {recording && (
          <div style={{
            marginTop: '12px',
            textAlign: 'center',
            color: '#94a3b8',
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px'
          }}>
            <div style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#ef4444',
              animation: 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite'
            }}/>
            <span className="font-mono">{formatTime(recordingTime)}</span>
            <span>Recording...</span>
          </div>
        )}
      </div>

      {/* Transcript Section - Scrollable */}
      <div style={{
        background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
        borderRadius: '20px',
        padding: '20px',
        border: '1px solid rgba(71, 85, 105, 0.3)',
        boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        minHeight: 0,
        marginTop: '16px'
      }}>
        <div className="flex items-center gap-2 mb-4" style={{ flexShrink: 0 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="white">
            <path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 2 2h8c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/>
          </svg>
          <h2 style={{ fontSize: '16px', fontWeight: '600', color: 'white', margin: 0 }}>Transcript</h2>
        </div>
        <div style={{
          fontSize: '14px',
          lineHeight: '1.6',
          color: '#e2e8f0',
          whiteSpace: 'pre-wrap',
          overflowY: 'auto',
          padding: '16px',
          background: 'rgba(15, 23, 42, 0.5)',
          borderRadius: '12px',
          border: '1px solid rgba(71, 85, 105, 0.3)',
          flex: 1,
          minHeight: 0
        }}
        className="transcript-scroll"
        >
          {transcript || 'Transcript will appear here...'}
        </div>
      </div>
      
      <style jsx>{`
        .transcript-scroll::-webkit-scrollbar {
          width: 8px;
        }
        .transcript-scroll::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          borderRadius: 4px;
        }
        .transcript-scroll::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #4F46E5 0%, #4338CA 100%);
          borderRadius: 4px;
        }
        .transcript-scroll::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #4338CA 0%, #3730A3 100%);
        }
        .transcript-scroll {
          scrollbar-width: thin;
          scrollbar-color: #4F46E5 rgba(15, 23, 42, 0.5);
        }
      `}</style>

      {/* Processing Overlay */}
      {processingRecording && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.8)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999
        }}>
          <div style={{
            background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
            borderRadius: '20px',
            padding: '40px 60px',
            border: '1px solid rgba(71, 85, 105, 0.3)',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
            textAlign: 'center',
            maxWidth: '400px'
          }}>
            <div style={{ marginBottom: '20px' }}>
              <svg 
                width="60" 
                height="60" 
                viewBox="0 0 24 24" 
                fill="none" 
                stroke="#4F46E5" 
                strokeWidth="2"
                style={{
                  animation: 'spin 1s linear infinite',
                  margin: '0 auto'
                }}
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            </div>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: 'white',
              marginBottom: '10px'
            }}>
              Processing Final Segment
            </h3>
            <p style={{
              fontSize: '14px',
              color: '#94a3b8',
              marginBottom: '20px'
            }}>
              Finalizing audio chunks...
            </p>
            <div style={{
              height: '4px',
              background: 'rgba(79, 70, 229, 0.2)',
              borderRadius: '2px',
              overflow: 'hidden'
            }}>
              <div style={{
                height: '100%',
                background: 'linear-gradient(90deg, #4F46E5, #7C3AED)',
                animation: 'progress 2s ease-in-out infinite',
                width: '50%'
              }} />
            </div>
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes progress {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
