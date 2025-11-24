"use client";
import React, { useState, useRef } from 'react';
import { toast } from 'react-toastify';
import { useUser } from '@/context/userContext';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY || "";

// WAV Conversion Utilities
async function convertWebMToWav(webmBlob) {
  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioContext = new AudioContext();
  const decoded = await audioContext.decodeAudioData(arrayBuffer);
  const wavBuffer = audioBufferToWav(decoded);
  return new Blob([wavBuffer], { type: "audio/wav" });
}

function audioBufferToWav(buffer) {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);
  const channels = [];
  const sampleRate = buffer.sampleRate;

  let offset = 0;
  function writeString(s) {
    for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
  }

  writeString("RIFF"); offset += 4;
  view.setUint32(offset, 36 + buffer.length * numOfChan * 2, true); offset += 4;
  writeString("WAVE"); offset += 4;
  writeString("fmt "); offset += 4;
  view.setUint32(offset, 16, true); offset += 4;
  view.setUint16(offset, 1, true); offset += 2;
  view.setUint16(offset, numOfChan, true); offset += 2;
  view.setUint32(offset, sampleRate, true); offset += 4;
  view.setUint32(offset, sampleRate * numOfChan * 2, true); offset += 4;
  view.setUint16(offset, numOfChan * 2, true); offset += 2;
  view.setUint16(offset, 16, true); offset += 2;
  writeString("data"); offset += 4;
  view.setUint32(offset, buffer.length * numOfChan * 2, true); offset += 4;

  for (let i = 0; i < numOfChan; i++) channels.push(buffer.getChannelData(i));
  const interleaved = interleave(channels);
  floatTo16BitPCM(view, 44, interleaved);
  return bufferArray;
}

function interleave(channels) {
  const length = channels[0].length;
  const result = new Float32Array(length * channels.length);
  let index = 0;
  for (let i = 0; i < length; i++) {
    for (let j = 0; j < channels.length; j++) result[index++] = channels[j][i];
  }
  return result;
}

function floatTo16BitPCM(output, offset, input) {
  for (let i = 0; i < input.length; i++, offset += 2) {
    let s = Math.max(-1, Math.min(1, input[i]));
    output.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
  }
}

export default function SummarySection({ sectionKey, section, onUpdate, onSave, onRemove, canRemove }) {
  const { user } = useUser();
  const [isDictating, setIsDictating] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const mediaRecorderRef = useRef(null);
  const audioChunksRef = useRef([]);

  const handleDictateClick = async () => {
    if (!isDictating) {
      const userId = user?.id;
      if (!userId) {
        console.error("User not authenticated");
        toast.error("Please log in to use dictation");
        return;
      }

      setIsDictating(true);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        const mediaRecorder = new MediaRecorder(stream);
        mediaRecorderRef.current = mediaRecorder;
        audioChunksRef.current = [];

        mediaRecorder.ondataavailable = (e) => audioChunksRef.current.push(e.data);

        mediaRecorder.onstop = async () => {
          try {
            const webmBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
            const wavBlob = await convertWebMToWav(webmBlob);

            const formData = new FormData();
            formData.append("audio", wavBlob, "dictation.wav");
            formData.append("user_id", userId);

            const response = await fetch("/api/whisper/whisper-dictate", {
              method: "POST",
              headers: { "Authorization": `Bearer ${TOKEN_KEY}` },
              credentials: "include",
              body: formData,
            });

            if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

            const data = await response.json();
            const transcript = data.transcript?.trim();

            if (transcript) {
              onUpdate(sectionKey, (prevSection) => {
                const currentContent = prevSection.content || "";
                const newContent =
                  currentContent +
                  (currentContent.trim() ? "\n- " : "- ") +
                  transcript;
                onSave(sectionKey, newContent);
                return { ...prevSection, content: newContent };
              });
              toast.success("Dictation added!");
            } else if (data.error) {
              console.error("Transcription error:", data.error);
              toast.error("Transcription failed");
            }
          } catch (err) {
            console.error("Dictation failed:", err);
            toast.error("Dictation failed");
          } finally {
            setIsDictating(false);
          }
        };

        mediaRecorder.start();
      } catch (err) {
        console.error("Mic access denied:", err);
        toast.error("Microphone access denied");
        setIsDictating(false);
      }
    } else {
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.stop();
        mediaRecorderRef.current.stream.getTracks().forEach((track) => track.stop());
      }
    }
  };

  const handleEditSaveClick = async () => {
    if (section.editingContent) {
      // Saving mode - first update state to show we're saving
      setIsSaving(true);
      
      try {
        // Wait for save to complete
        await onSave(sectionKey, section.content);
        
        // After successful save, toggle edit mode OFF
        onUpdate(sectionKey, (prev) => ({
          ...prev,
          editingContent: false,
        }));
        
        toast.success("Saved!");
      } catch (error) {
        console.error("Error saving section:", error);
        toast.error("Failed to save");
      } finally {
        // Always reset saving state
        setIsSaving(false);
      }
    } else {
      // Edit mode - toggle ON
      onUpdate(sectionKey, (prev) => ({
        ...prev,
        editingContent: true,
      }));
    }
  };

  const handleCopySection = () => {
    const content = `${section.title}:\n${section.content || 'No content'}`;
    navigator.clipboard.writeText(content);
    toast.success(`${section.title} copied!`);
  };

  const decodeHtml = (html) => {
    const txt = document.createElement("textarea");
    txt.innerHTML = html;
    return txt.value;
  };

  return (
    <div className="bg-slate-50 border border-slate-200 rounded-lg p-4 mb-3 relative text-black">
      <div className="mb-3 flex items-center justify-between">
        {section.editingTitle ? (
          <input
            type="text"
            value={section.title}
            onChange={(e) =>
              onUpdate(sectionKey, (prev) => ({ ...prev, title: e.target.value }))
            }
            onBlur={() => onUpdate(sectionKey, (prev) => ({ ...prev, editingTitle: false }))}
            onKeyDown={(e) => {
              if (e.key === "Enter")
                onUpdate(sectionKey, (prev) => ({ ...prev, editingTitle: false }));
            }}
            autoFocus
            className="text-base font-semibold border border-slate-300 rounded px-2 py-1 w-full box-border text-black"
          />
        ) : (
          <h3
            onClick={() => onUpdate(sectionKey, (prev) => ({ ...prev, editingTitle: true }))}
            className="text-base font-semibold text-slate-800 m-0 cursor-pointer flex-grow"
            title="Click to edit title"
          >
            {section.title}
          </h3>
        )}
        <div className="flex items-center gap-1">
          {/* Edit/Save Button */}
          <button
            onClick={handleEditSaveClick}
            disabled={isSaving || isDictating}
            className="p-2 border-none bg-transparent hover:bg-slate-200 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title={section.editingContent ? (isSaving ? "Saving..." : "Save") : "Edit"}
          >
            {isSaving ? (
              <span className="text-base">⏳</span>
            ) : section.editingContent ? (
              <span className="text-base">💾</span>
            ) : (
              <img src="/images/edit.png" alt="Edit" className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleDictateClick}
            disabled={isSaving || section.editingContent === false}
            className="p-2 border-none bg-transparent hover:bg-slate-200 rounded transition-colors disabled:opacity-50"
            title={isDictating ? "Stop dictation" : "Start dictation"}
          >
            {isDictating ? (
              <img src="/images/stop.png" alt="Stop" className="w-4 h-4" />
            ) : (
              <img src="/images/mic.png" alt="Dictate" className="w-4 h-4" />
            )}
          </button>

          <button
            onClick={handleCopySection}
            disabled={isSaving}
            className="p-2 border-none bg-transparent hover:bg-slate-200 rounded transition-colors disabled:opacity-50"
            title="Copy section"
          >
            <img src="/images/copy.png" alt="Copy" className="w-4 h-4" />
          </button>

          {canRemove && (
            <button
              onClick={() => onRemove(sectionKey)}
              disabled={isSaving}
              className="p-2 border-none bg-transparent hover:bg-red-100 rounded transition-colors disabled:opacity-50"
              title="Remove section"
            >
              <span className="text-red-600 font-bold text-lg">×</span>
            </button>
          )}
        </div>
      </div>

      {section.editingContent ? (
        <textarea
          value={section.content}
          onChange={(e) =>
            onUpdate(sectionKey, (prev) => ({ ...prev, content: e.target.value }))
          }
          disabled={isSaving}
          autoFocus
          className="w-full p-2 rounded-md border border-slate-300 min-h-[100px] text-sm resize-vertical box-border disabled:opacity-50 disabled:cursor-not-allowed"
        />
      ) : (
        <div className="text-sm whitespace-pre-wrap text-slate-900">
          {section.content ? (
            decodeHtml(section.content)
          ) : (
            <span className="text-slate-400">Click edit to add notes...</span>
          )}
        </div>
      )}
    </div>
  );
}
