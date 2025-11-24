"use client";
import React, { useState, useRef } from "react";

const SectionEditor = ({ section = {}, key, sections, setSections }) => {
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleDictateClick = async () => {
    if (!isRecording) {
      // Start recording
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        mediaRecorderRef.current = new MediaRecorder(stream);
        audioChunksRef.current = [];

        mediaRecorderRef.current.ondataavailable = (event) => {
          if (event.data.size > 0) {
            audioChunksRef.current.push(event.data);
          }
        };

        mediaRecorderRef.current.onstop = async () => {
          const audioBlob = new Blob(audioChunksRef.current, { type: "audio/wav" });
          const formData = new FormData();
          formData.append("audio", audioBlob, "recording.wav");

          try {
            const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
            const response = await fetch("/api/whisper/whisper-dictate", {
              method: "POST",
              headers: {
                "Authorization": `Bearer ${TOKEN_KEY}`
              },
              credentials: "include",
              body: formData
            });

            if (!response.ok) throw new Error("Failed to transcribe");
            const data = await response.json();
            const transcript = data.transcript || "";

            // Append transcript to the current section content
            setSections({
              ...sections,
              [key]: {
                ...section,
                content: (section.content ? section.content + "\n" : "") + transcript
              }
            });
          } catch (error) {
            console.error("Transcription error:", error);
            alert("Error transcribing audio.");
          }
        };

        mediaRecorderRef.current.start();
        setIsRecording(true);
      } catch (err) {
        console.error("Mic access error:", err);
        alert("Could not access microphone.");
      }
    } else {
      // Stop recording
      mediaRecorderRef.current.stop();
      setIsRecording(false);
    }
  };

  // Guard: If section is undefined or null, render a fallback
  if (!section) {
    return <div>No section data available.</div>;
  }

  return (
    <div>
      {/* Title Row */}
      <div style={{ marginBottom: "12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        {section.editingTitle ? (
          <input
            type="text"
            value={section.title || ""}
            onChange={(e) =>
              setSections({
                ...sections,
                [key]: { ...section, title: e.target.value }
              })
            }
            onBlur={() =>
              setSections({
                ...sections,
                [key]: { ...section, editingTitle: false }
              })
            }
            onKeyDown={e => {
              if (e.key === "Enter") {
                setSections({
                  ...sections,
                  [key]: { ...section, editingTitle: false }
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
              boxSizing: "border-box"
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
              flexGrow: 1
            }}
            onClick={() =>
              setSections({
                ...sections,
                [key]: { ...section, editingTitle: true }
              })
            }
            title="Click to edit title"
          >
            {section.title || "Untitled Section"}
          </h3>
        )}

        {/* Buttons */}
        <div style={{ display: "flex", alignItems: "center" }}>
          {/* Dictate Button */}
          <button
            onClick={handleDictateClick}
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: isRecording ? "red" : "#64748b",
              fontSize: "18px",
              marginRight: "8px"
            }}
            title={isRecording ? "Stop recording" : "Start dictation"}
          >
            {isRecording ? "⏹️ Stop" : "🎙️ Dictate"}
          </button>

          {/* Edit Icon */}
          <button
            onClick={() =>
              setSections({
                ...sections,
                [key]: {
                  ...section,
                  editingTitle: !section.editingTitle,
                  editingContent: !section.editingContent
                }
              })
            }
            style={{
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: "#64748b",
              fontSize: "16px",
              flexShrink: 0
            }}
            title="Edit section"
            aria-label={`Edit ${section.title || "section"} section`}
            type="button"
          >
            ✏️
          </button>
        </div>
      </div>

      {/* Content Area */}
      {section.editingContent ? (
        <textarea
          value={section.content || ""}
          onChange={(e) =>
            setSections({
              ...sections,
              [key]: { ...section, content: e.target.value }
            })
          }
          onBlur={() =>
            setSections({
              ...sections,
              [key]: { ...section, editingContent: false }
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
            boxSizing: "border-box"
          }}
        />
      ) : (
        <div
          style={{
            fontSize: "14px",
            color: section.content ? "#0f172a" : "#94a3b8",
            whiteSpace: "pre-wrap"
          }}
        >
          {section.content || "Click edit to add notes..."}
        </div>
      )}
    </div>
  );
};

export default SectionEditor;
