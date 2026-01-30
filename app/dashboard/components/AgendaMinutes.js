"use client";
import { useState } from 'react';
import { toast } from 'react-toastify';
import { useUser } from '@/context/userContext';
import { useMeeting } from '@/context/meetingContext';
import { useRecording } from '@/context/recordingContext';
import { generateAgendaMinutesDOCX } from '../utils/docxGenerator';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY || "";

// Single Agenda Minute Section
function MinuteSection({ minute, index, onUpdate, onSave }) {
  const [isEditingAgenda, setIsEditingAgenda] = useState(false);
  const [isEditingContent, setIsEditingContent] = useState(false);

  const handleSave = (field) => {
    onSave(index, field);
    if (field === 'agenda_name') setIsEditingAgenda(false);
    if (field === 'content') setIsEditingContent(false);
  };

  return (
    <div style={{
      background: 'rgba(30, 41, 59, 0.5)',
      border: '1px solid rgba(71, 85, 105, 0.3)',
      borderRadius: '12px',
      padding: '16px',
      transition: 'all 0.2s'
    }}
    onMouseEnter={(e) => {
      e.currentTarget.style.boxShadow = '0 8px 24px rgba(0, 0, 0, 0.3)';
    }}
    onMouseLeave={(e) => {
      e.currentTarget.style.boxShadow = 'none';
    }}
    >
      {/* Agenda Number & Name */}
      <div className="mb-4">
        <div className="flex items-center gap-3 mb-3">
          <span style={{
            padding: '6px 12px',
            background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
            color: 'white',
            fontSize: '12px',
            fontWeight: '600',
            borderRadius: '8px',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
          }}>
            Agenda {minute.agenda_number}
          </span>
        </div>
        
        {isEditingAgenda ? (
          <div className="flex gap-2">
            <input
              type="text"
              value={minute.agenda_name}
              onChange={(e) => onUpdate(index, 'agenda_name', e.target.value)}
              style={{
                flex: 1,
                padding: '10px 12px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(79, 70, 229, 0.4)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '14px',
                outline: 'none'
              }}
              autoFocus
            />
            <button
              onClick={() => handleSave('agenda_name')}
              style={{
                padding: '10px 16px',
                background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
              }}
            >
              Save
            </button>
            <button
              onClick={() => setIsEditingAgenda(false)}
              style={{
                padding: '10px 16px',
                background: 'rgba(71, 85, 105, 0.3)',
                color: '#94a3b8',
                border: '1px solid rgba(71, 85, 105, 0.4)',
                borderRadius: '10px',
                fontSize: '13px',
                fontWeight: '600',
                cursor: 'pointer'
              }}
            >
              Cancel
            </button>
          </div>
        ) : (
          <div
            onClick={() => setIsEditingAgenda(true)}
            style={{
              fontWeight: '600',
              fontSize: '16px',
              color: 'white',
              cursor: 'pointer',
              padding: '12px',
              borderRadius: '10px',
              border: '1px solid transparent',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(79, 70, 229, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'transparent';
            }}
          >
            {minute.agenda_name}
          </div>
        )}
      </div>

      {/* Content Section - Single Combined Section */}
      <div>
        <label style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          fontSize: '12px',
          fontWeight: '600',
          color: '#94a3b8',
          marginBottom: '8px',
          textTransform: 'uppercase',
          letterSpacing: '0.5px'
        }}>
          <span style={{ width: '6px', height: '6px', background: '#4F46E5', borderRadius: '50%' }}></span>
          Minutes
        </label>
        {isEditingContent ? (
          <div>
            <textarea
              value={minute.content}
              onChange={(e) => onUpdate(index, 'content', e.target.value)}
              style={{
                width: '100%',
                padding: '12px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(79, 70, 229, 0.4)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '13px',
                outline: 'none',
                resize: 'vertical',
                minHeight: '200px'
              }}
              autoFocus
            />
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => handleSave('content')}
                style={{
                  padding: '8px 14px',
                  background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Save
              </button>
              <button
                onClick={() => setIsEditingContent(false)}
                style={{
                  padding: '8px 14px',
                  background: 'rgba(71, 85, 105, 0.3)',
                  color: '#94a3b8',
                  border: '1px solid rgba(71, 85, 105, 0.4)',
                  borderRadius: '8px',
                  fontSize: '12px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <div
            onClick={() => setIsEditingContent(true)}
            style={{
              color: '#e2e8f0',
              fontSize: '13px',
              background: 'rgba(15, 23, 42, 0.5)',
              padding: '12px',
              borderRadius: '10px',
              cursor: 'pointer',
              border: '1px solid rgba(71, 85, 105, 0.3)',
              whiteSpace: 'pre-wrap',
              minHeight: '120px',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(79, 70, 229, 0.1)';
              e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.3)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(15, 23, 42, 0.5)';
              e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.3)';
            }}
          >
            {minute.content || 'Click to add minutes content...'}
          </div>
        )}
      </div>
    </div>
  );
}

export default function AgendaMinutes({ minutes, setMinutes, transcript, onMinutesSaved }) {
  const { user } = useUser();
  const { meetingId, setMeetingId } = useMeeting();
  const { setCanRecord } = useRecording();
  const [isGenerating, setIsGenerating] = useState(false);
  const [agendaFile, setAgendaFile] = useState(null);
  const [isSaving, setIsSaving] = useState(false);

  const handleUpdateMinute = (index, field, value) => {
    setMinutes((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  };

  const handleSaveMinute = async (index, field) => {
    // You can add API call here to save to database if needed
    toast.success(`${field.replace('_', ' ')} saved`);
  };

  const handleGenerateMinutes = async () => {
    if (!agendaFile) {
      toast.error("Please upload an agenda file");
      return;
    }

    if (!transcript || transcript.trim() === '') {
      toast.error("No transcript available");
      return;
    }

    const userId = user?.id || localStorage.getItem("userId");
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    if (!meetingId) {
      toast.error("No active session. Please start a session first.");
      return;
    }

    setIsGenerating(true);
    try {
      // First, extract agendas from the file
      const formData = new FormData();
      formData.append("file", agendaFile);
      formData.append("user_id", userId);

      const agendaResponse = await fetch("/api/backend/agendas", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY
        },
        body: formData,
      });

      if (!agendaResponse.ok) {
        throw new Error("Failed to extract agendas");
      }

      const agendaData = await agendaResponse.json();
      const agendas = agendaData.agendas || [];

      if (agendas.length === 0) {
        toast.error("No agendas found in the file");
        return;
      }

      // Now generate minutes
      const minutesResponse = await fetch("/api/backend/generate-minutes-from-file", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY
        },
        body: JSON.stringify({
          user_id: userId,
          agendas: agendas,
        }),
      });

      if (!minutesResponse.ok) {
        throw new Error("Failed to generate minutes");
      }

      const minutesData = await minutesResponse.json();
      const generatedMinutes = minutesData.minutes || [];
      setMinutes(generatedMinutes);
      toast.success(`Generated minutes for ${generatedMinutes.length} agenda items`);
      
      // Automatically save to database
      await handleSaveMinutes(generatedMinutes);
      
    } catch (error) {
      console.error("Error generating minutes:", error);
      toast.error(error.message || "Failed to generate minutes");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveMinutes = async (minutesToSave = null) => {
    const minutesData = minutesToSave || minutes;
    
    if (!minutesData || minutesData.length === 0) {
      toast.error("No minutes to save");
      return;
    }

    if (!meetingId) {
      toast.error("No active session");
      return;
    }

    const userId = user?.id || localStorage.getItem("userId");
    if (!userId) {
      toast.error("User not authenticated");
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch("/api/backend/save-minutes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY
        },
        body: JSON.stringify({
          meeting_id: meetingId,
          user_id: userId,
          minutes: minutesData,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || "Failed to save minutes");
      }

      const result = await response.json();
      console.log("✅ Minutes saved to database:", result);
      toast.success("Minutes saved successfully!");
      
      // End session after successful save
      console.log("📝 Minutes saved, ending session...");
      setCanRecord(false);
      
      // ✅ DON'T clear meetingId or minutes - keep them visible until NEW session starts
      // Minutes will be cleared automatically when user starts a new session (handled in page.js useEffect)
      
      toast.success("Session ended - minutes remain visible!");
      
      // Notify parent component if callback provided
      if (onMinutesSaved) {
        onMinutesSaved();
      }
      
    } catch (error) {
      console.error("Error saving minutes:", error);
      toast.error(error.message || "Failed to save minutes");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyToClipboard = () => {
    let content = "MEETING MINUTES\n\n";
    minutes.forEach((minute) => {
      content += `AGENDA ${minute.agenda_number}: ${minute.agenda_name}\n\n`;
      content += `${minute.content}\n\n`;
      content += "─".repeat(80) + "\n\n";
    });
    navigator.clipboard.writeText(content);
    toast.success("Copied to clipboard!");
  };

  const decodeHtmlEntities = (text) => {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = text;
    return textarea.value;
  };

  const handleDownloadDOCX = async () => {
    if (minutes.length === 0) {
      toast.error("No minutes to download");
      return;
    }

    try {
      await generateAgendaMinutesDOCX(minutes);
      toast.success("DOCX downloaded successfully!");
    } catch (error) {
      console.error("Error generating DOCX:", error);
      toast.error("Failed to generate DOCX");
    }
  };

  return (
    <div style={{
      background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
      borderRadius: '20px',
      border: '1px solid rgba(71, 85, 105, 0.3)',
      boxShadow: '0 10px 40px rgba(0, 0, 0, 0.3)',
      display: 'flex',
      flexDirection: 'column',
      height: '100%',
      overflow: 'hidden'
    }}>
      {/* Fixed Header */}
      <div style={{
        flexShrink: 0,
        padding: '20px',
        borderBottom: '1px solid rgba(71, 85, 105, 0.3)',
        background: 'rgba(30, 41, 59, 0.5)'
      }}>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 mb-4">
          <div className="flex items-center gap-3">
            <div style={{
              width: '32px',
              height: '32px',
              background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
              borderRadius: '8px',
              padding: '6px',
              boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)'
            }}>
              <svg viewBox="0 0 24 24" fill="white">
                <path d="M14 2H6c-1.1 0-2 .9-2 2v16c0 1.1.9 2 2 2h12c1.1 0 2-.9 2-2V8l-6-6zm4 18H6V4h7v5h5v11zM8 15.01l1.41 1.41L11 14.84V19h2v-4.16l1.59 1.59L16 15.01 12.01 11z"/>
              </svg>
            </div>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '700',
              color: 'white',
              margin: 0
            }}>
              Agenda Minutes
            </h2>
            {minutes.length > 0 && (
              <span style={{
                padding: '4px 10px',
                background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                color: 'white',
                fontSize: '11px',
                fontWeight: '600',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(79, 70, 229, 0.3)'
              }}>
                {minutes.length} {minutes.length === 1 ? 'item' : 'items'}
              </span>
            )}
          </div>
          <div className="flex gap-2 flex-wrap">
            {minutes.length > 0 && (
              <>
                <button
                  onClick={handleCopyToClipboard}
                  style={{
                    padding: '8px',
                    border: '1px solid rgba(71, 85, 105, 0.4)',
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(79, 70, 229, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(79, 70, 229, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)';
                    e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.4)';
                  }}
                  title="Copy all to clipboard"
                >
                  <img src="/images/copy.png" alt="Copy" className="w-5 h-5" />
                </button>
                <button
                  onClick={handleDownloadDOCX}
                  style={{
                    padding: '8px',
                    border: '1px solid rgba(71, 85, 105, 0.4)',
                    background: 'rgba(30, 41, 59, 0.5)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = 'rgba(34, 197, 94, 0.2)';
                    e.currentTarget.style.borderColor = 'rgba(34, 197, 94, 0.4)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = 'rgba(30, 41, 59, 0.5)';
                    e.currentTarget.style.borderColor = 'rgba(71, 85, 105, 0.4)';
                  }}
                  title="Download as DOCX"
                >
                  <img src="/images/downloads.png" alt="Save DOCX" className="w-5 h-5" />
                </button>
              </>
            )}
          </div>
        </div>

        {/* File Upload & Generate Button */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="flex-1">
            <label style={{
              display: 'block',
              fontSize: '12px',
              fontWeight: '600',
              color: '#94a3b8',
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              Upload Agenda Document (.docx or .pdf)
            </label>
            <input
              type="file"
              accept=".doc,.docx,.pdf"
              onChange={(e) => setAgendaFile(e.target.files[0])}
              style={{
                width: '100%',
                padding: '10px 12px',
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(71, 85, 105, 0.4)',
                borderRadius: '10px',
                color: 'white',
                fontSize: '13px',
                outline: 'none'
              }}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={handleGenerateMinutes}
              disabled={isGenerating || isSaving || !agendaFile}
              style={{
                padding: '10px 20px',
                background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: (isGenerating || isSaving || !agendaFile) ? 'not-allowed' : 'pointer',
                opacity: (isGenerating || isSaving || !agendaFile) ? 0.5 : 1,
                transition: 'all 0.2s',
                boxShadow: '0 4px 12px rgba(79, 70, 229, 0.3)',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                if (!isGenerating && !isSaving && agendaFile) {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 6px 16px rgba(79, 70, 229, 0.4)';
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(79, 70, 229, 0.3)';
              }}
            >
              {isGenerating ? "Generating..." : isSaving ? "Saving..." : "Generate Minutes"}
            </button>
          </div>
        </div>
      </div>

      {/* Scrollable Content */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        padding: '16px 20px'
      }} className="custom-scrollbar">
        {minutes.length === 0 ? (
          <div style={{
            textAlign: 'center',
            padding: '48px 16px',
            color: '#94a3b8'
          }}>
            <div style={{
              display: 'inline-block',
              padding: '20px',
              background: 'rgba(79, 70, 229, 0.1)',
              borderRadius: '50%',
              marginBottom: '16px'
            }}>
              <svg
                style={{ height: '48px', width: '48px' }}
                fill="none"
                viewBox="0 0 24 24"
                stroke="#4F46E5"
                strokeWidth={2}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                />
              </svg>
            </div>
            <h3 style={{
              fontSize: '16px',
              fontWeight: '600',
              color: 'white',
              marginBottom: '8px'
            }}>No Minutes Yet</h3>
            <p style={{
              fontSize: '13px',
              maxWidth: '400px',
              margin: '0 auto',
              color: '#94a3b8',
              lineHeight: '1.6'
            }}>Upload an agenda document (.docx or .pdf) and click "Generate Minutes" to create meeting minutes from the transcript</p>
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {minutes.map((minute, index) => (
              <MinuteSection
                key={index}
                minute={minute}
                index={index}
                onUpdate={handleUpdateMinute}
                onSave={handleSaveMinute}
              />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: rgba(15, 23, 42, 0.5);
          borderRadius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: linear-gradient(135deg, #4F46E5 0%, #4338CA 100%);
          borderRadius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: linear-gradient(135deg, #4338CA 0%, #3730A3 100%);
        }
        .custom-scrollbar {
          scrollbar-width: thin;
          scrollbar-color: #4F46E5 rgba(15, 23, 42, 0.5);
        }
      `}</style>
    </div>
  );
}
