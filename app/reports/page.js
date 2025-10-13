"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "../sidebar/page";
import Header from "../header/page";
import jsPDF from "jspdf";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

export default function ReportPage({ user }) {
  const router = useRouter();
  const [meetings, setMeetings] = useState([]);
  const [filteredMeetings, setFilteredMeetings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedMeetingId, setSelectedMeetingId] = useState(null);
  const [stats, setStats] = useState({ today: 0, week: 0 });
  const [editingTranscriptId, setEditingTranscriptId] = useState(null);
  const [editData, setEditData] = useState({});

  const handleLogout = async () => {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
  };

  // Fetch meetings
  useEffect(() => {
    const fetchMeetings = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      try {
        const res = await fetch(`http://localhost:8000/meetings?user_id=${userId}`);
        if (!res.ok) throw new Error("Failed to fetch meetings");
        const data = await res.json();
        setMeetings(data);
        setFilteredMeetings(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchMeetings();
  }, []);

  // Fetch stats
  useEffect(() => {
    const fetchStats = async () => {
      const userId = localStorage.getItem("userId");
      if (!userId) return;

      try {
        const res = await fetch(`http://localhost:8000/stats?user_id=${userId}`);
        if (res.ok) {
          const data = await res.json();
          setStats(data);
        }
      } catch (err) {
        console.error(err);
      }
    };

    fetchStats();
  }, []);

  // Filter meetings by patient name
  useEffect(() => {
    const filtered = meetings.filter((meeting) =>
      meeting.patient?.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMeetings(filtered);
  }, [searchTerm, meetings]);

  if (loading) {
    return (
      <div className="flex justify-center mt-12 text-lg">Loading reports...</div>
    );
  }

  const selectedMeeting = meetings.find((m) => m.id === selectedMeetingId);

  const handleEditTranscript = (t) => {
    setEditingTranscriptId(t.id);
    setEditData({
      transcript: t.transcript || "",
      summary: t.summary || "",
    });
  };

  const handleSaveTranscript = async (id) => {
    try {
      await fetch(`http://localhost:8000/transcripts/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editData),
      });
      setEditingTranscriptId(null);

      // Refresh meetings
      const userId = localStorage.getItem("userId");
      const res = await fetch(`http://localhost:8000/meetings?user_id=${userId}`);
      const data = await res.json();
      setMeetings(data);
      setFilteredMeetings(data);
    } catch (err) {
      console.error("Error saving transcript edits:", err);
    }
  };

  return (
  <div className="flex flex-col min-h-screen bg-gray-50">
    {/* Header */}
    <Header user={user} handleLogout={handleLogout} />

    <div className="flex flex-col md:flex-row flex-1 pt-16 md:pt-0">
      {/* Sidebar */}
      <Sidebar stats={stats} />

      {/* Main reports box */}
      <div className="flex-1 px-4 md:px-6 py-4 md:py-6 overflow-y-auto">
        <div className="max-w-7xl bg-white shadow-md rounded-lg p-4 sm:p-6 mx-auto text-black">
          <h1 className="text-center text-2xl sm:text-3xl font-bold mb-4 sm:mb-6">Reports</h1>

          {!selectedMeeting && (
            <input
              type="text"
              placeholder="Search patient..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-2.5 sm:p-3 border border-gray-300 rounded-lg mb-4 sm:mb-6 text-sm sm:text-base"
            />
          )}

          {!selectedMeeting && filteredMeetings.length === 0 && (
            <p className="text-center text-gray-600 text-sm sm:text-base">No reports found.</p>
          )}

          {/* Meetings List */}
          {!selectedMeeting &&
            filteredMeetings.map((meeting) => (
              <div
                key={meeting.id}
                className="border border-gray-300 rounded-lg p-3 sm:p-4 mb-3 sm:mb-4 bg-gray-50 flex flex-col sm:flex-row justify-between sm:items-center gap-3"
              >
                <div className="flex-1">
                  <h3 className="font-semibold text-sm sm:text-base">
                    Patient: {meeting.patient?.name || "Unknown"}{" "}
                    <span className="text-gray-500 text-xs sm:text-sm block sm:inline mt-1 sm:mt-0">
                      (Meeting ID: {meeting.id})
                    </span>
                  </h3>
                  <p className="text-xs sm:text-sm text-gray-700 mt-1">
                    <strong>Created At:</strong>{" "}
                    {new Date(meeting.created_at).toLocaleString()}
                  </p>
                </div>
                <div className="flex space-x-2">
                  <button
                    onClick={() => setSelectedMeetingId(meeting.id)}
                    className="text-white px-4 py-2 rounded hover:bg-[#03405a] transition-colors text-sm sm:text-base"
                    style={{ backgroundColor: "#012537" }}
                  >
                    View
                  </button>
                </div>
              </div>
            ))}

          {/* Selected Meeting Details */}
          {selectedMeeting && (
            <div className="mt-4 sm:mt-6 w-full bg-gray-100 p-4 sm:p-6 rounded-lg">
              {/* Back Button */}
              <button
                onClick={() => setSelectedMeetingId(null)}
                className="text-blue-600 hover:underline text-xs sm:text-sm mb-3 sm:mb-4 flex items-center gap-1"
              >
                ← Back
              </button>

              {/* Patient Info */}
              <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mt-2">
                Patient: {selectedMeeting.patient?.name || "Unknown"}{" "}
                <span className="text-gray-500 text-base sm:text-lg block sm:inline mt-1 sm:mt-0">
                  (Meeting ID: {selectedMeeting.id})
                </span>
              </h2>

              <p className="text-gray-700 mb-3 sm:mb-4 text-xs sm:text-sm">
                <strong>Created At:</strong> {new Date(selectedMeeting.created_at).toLocaleString()}
              </p>

              {/* Transcripts */}
              {selectedMeeting.transcripts && selectedMeeting.transcripts.length > 0 ? (
                selectedMeeting.transcripts.map((t) => (
                  <div
                    key={t.id}
                    className="w-full bg-white border border-gray-300 rounded-lg p-4 sm:p-6 mt-3 sm:mt-4 flex flex-col space-y-3 sm:space-y-4"
                  >
                    {editingTranscriptId === t.id ? (
                      <div className="flex flex-col space-y-3 sm:space-y-4 flex-1">
                        {["transcript", "summary"].map((field) => (
                          <div key={field} className="flex flex-col flex-1">
                            <label className="font-semibold capitalize mb-1 block text-sm sm:text-base">
                              {field.replace("_", " ")}:
                            </label>
                            <textarea
                              className="w-full h-32 sm:h-48 border p-2 sm:p-3 rounded resize-none overflow-y-auto text-sm sm:text-base"
                              value={editData[field]}
                              onChange={(e) =>
                                setEditData({ ...editData, [field]: e.target.value })
                              }
                            />
                          </div>
                        ))}

                        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
                          <button
                            onClick={() => handleSaveTranscript(t.id)}
                            className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-500 transition-colors text-sm sm:text-base w-full sm:w-auto"
                          >
                            Save
                          </button>
                          <button
                            onClick={() => setEditingTranscriptId(null)}
                            className="bg-gray-400 text-white px-4 py-2 rounded hover:bg-gray-500 transition-colors text-sm sm:text-base w-full sm:w-auto"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex flex-col space-y-3 sm:space-y-4 flex-1">
                        {/* Transcript */}
                        {t.transcript && (
                          <div className="flex flex-col flex-1">
                            <h4 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Transcript</h4>
                            <div className="flex-1 max-h-48 sm:max-h-64 overflow-y-auto p-2 sm:p-3 bg-gray-50 rounded whitespace-pre-wrap text-gray-800 text-xs sm:text-sm">
                              {t.transcript}
                            </div>
                          </div>
                        )}

                        {/* Summary */}
                        {t.summary && (
                          <div className="flex flex-col flex-1">
                            <h4 className="font-semibold text-gray-800 mb-2 text-sm sm:text-base">Summary</h4>
                            <div className="flex-1 max-h-48 sm:max-h-64 overflow-y-auto p-2 sm:p-3 bg-gray-50 rounded whitespace-pre-wrap text-gray-800 text-xs sm:text-sm">
                              {t.summary}
                            </div>
                          </div>
                        )}

                        {/* Action buttons */}
                        <div className="flex flex-wrap gap-2 mt-2">
                          {/* Edit */}
                          <button
                            onClick={() => handleEditTranscript(t)}
                            className="p-2 sm:p-2.5 rounded hover:bg-gray-100 flex items-center justify-center border border-gray-200"
                            title="Edit"
                          >
                            <img src="/images/edit.png" alt="Edit" className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>

                          {/* Copy */}
                          <button
                            onClick={async () => {
                              try {
                                const textToCopy = `Transcript:\n${t.transcript || ""}\n\nSummary:\n${t.summary || ""}`;
                                await navigator.clipboard.writeText(textToCopy);
                                toast.success("Copied to clipboard!");
                              } catch (err) {
                                toast.error("Failed to copy!");
                              }
                            }}
                            className="p-2 sm:p-2.5 rounded hover:bg-gray-100 flex items-center justify-center border border-gray-200"
                            title="Copy"
                          >
                            <img src="/images/copy.png" alt="Copy" className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>

                          {/* Download PDF */}
                          <button
                            onClick={async () => {
                              if (!t) return;

                              const doc = new jsPDF({ orientation: "portrait", unit: "pt", format: "a4" });
                              const margin = 30;
                              const pageWidth = doc.internal.pageSize.getWidth();
                              let y = margin;

                              // Add logo
                              const logoImg = new Image();
                              logoImg.src = "/images/app-logo.png";
                              await new Promise((resolve) => (logoImg.onload = resolve));
                              const logoWidth = 40;
                              const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
                              doc.addImage(logoImg, "PNG", pageWidth - margin - logoWidth, margin, logoWidth, logoHeight);
                              y += logoHeight + 20;

                              // Header
                              doc.setFontSize(20);
                              doc.setFont("helvetica", "bold");
                              doc.text("Clinical Summary & Transcript", pageWidth / 2, y, { align: "center" });
                              y += 30;

                              // Draw line
                              doc.setLineWidth(0.5);
                              doc.setDrawColor(200);
                              doc.line(margin, y, pageWidth - margin, y);
                              y += 20;

                              // Summary
                              if (t.summary) {
                                doc.setFillColor(230);
                                doc.roundedRect(margin, y, pageWidth - 2 * margin, 25, 5, 5, "F");
                                doc.setFontSize(14);
                                doc.setFont("helvetica", "bold");
                                doc.setTextColor(33, 37, 51);
                                doc.text("Summary", margin + 10, y + 17);
                                y += 35;

                                const summaryLines = doc.splitTextToSize(t.summary, pageWidth - 2 * margin - 20);
                                doc.setFillColor(245);
                                doc.roundedRect(margin, y, pageWidth - 2 * margin, summaryLines.length * 18 + 10, 5, 5, "F");
                                doc.setFontSize(12);
                                doc.setFont("helvetica", "normal");
                                doc.setTextColor(0, 0, 0);
                                doc.text(summaryLines, margin + 10, y + 15);
                                y += summaryLines.length * 18 + 25;
                              }

                              // Transcript
                              if (t.transcript) {
                                doc.setFillColor(230, 245, 255);
                                doc.roundedRect(margin, y, pageWidth - 2 * margin, 25, 5, 5, "F");
                                doc.setFontSize(14);
                                doc.setFont("helvetica", "bold");
                                doc.setTextColor(33, 37, 51);
                                doc.text("Transcript", margin + 10, y + 17);
                                y += 35;

                                const transcriptLines = doc.splitTextToSize(t.transcript, pageWidth - 2 * margin - 20);
                                doc.setFillColor(245, 250, 255);
                                doc.roundedRect(margin, y, pageWidth - 2 * margin, transcriptLines.length * 18 + 10, 5, 5, "F");
                                doc.setFontSize(12);
                                doc.setFont("helvetica", "normal");
                                doc.setTextColor(0, 0, 0);
                                doc.text(transcriptLines, margin + 10, y + 15);
                                y += transcriptLines.length * 18 + 25;
                              }

                              doc.save(`report_meeting_${selectedMeeting.id}.pdf`);
                            }}
                            className="p-2 sm:p-2.5 rounded hover:bg-gray-100 flex items-center justify-center border border-gray-200"
                            title="Download PDF"
                          >
                            <img src="/images/downloads.png" alt="Save PDF" className="w-4 h-4 sm:w-5 sm:h-5" />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <p className="text-gray-600 text-sm sm:text-base">No transcripts available.</p>
              )}
            </div>
          )}
        </div>
      </div>
    </div>

    {/* Toast Container */}
    <ToastContainer position="top-right" autoClose={2000} hideProgressBar />
  </div>
);
}
