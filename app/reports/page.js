"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Header from "../header/page";
import { ToastContainer, toast } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { useUser } from "@/context/userContext";
import { generateAgendaMinutesDOCX } from '../dashboard/utils/docxGenerator';
import { Download, Edit2, Save, X, Calendar, Clock, FileText } from 'lucide-react';

export default function ReportPage() {
  const { user, loading: userLoading } = useUser();
  const router = useRouter();
  const [meetings, setMeetings] = useState([]);
  const [filteredMeetings, setFilteredMeetings] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [loading, setLoading] = useState(true);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [editingMeetingId, setEditingMeetingId] = useState(null);
  const [editMeetingName, setEditMeetingName] = useState("");

  const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
  const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY
        },
      });

      if (res.ok) {
        localStorage.clear();
        window.dispatchEvent(new Event('userUpdated'));
        window.location.href = "/login";
      } else {
        toast.error("Logout failed");
      }
    } catch (err) {
      console.error("Error during logout:", err);
      toast.error("Logout error");
    }
  };

  // Fetch all meetings with minutes and transcripts
  useEffect(() => {
    if (user?.id) {
      fetchMeetings();
    }
  }, [user?.id]);

  const fetchMeetings = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/backend/get-all-meetings?user_id=${user.id}`, {
        method: "GET",
        headers: {
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY
        },
        credentials: "include",
      });
      
      if (response.ok) {
        const data = await response.json();
        setMeetings(data.meetings || []);
        setFilteredMeetings(data.meetings || []);
        console.log("✅ Loaded meetings:", data.meetings?.length);
      } else {
        console.error("Failed to load meetings");
        toast.error("Failed to load meetings");
      }
    } catch (error) {
      console.error("Error loading meetings:", error);
      toast.error("Error loading meetings");
    } finally {
      setLoading(false);
    }
  };

  // Filter meetings by name
  useEffect(() => {
    const filtered = meetings.filter((meeting) =>
      meeting.meeting_name?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    setFilteredMeetings(filtered);
  }, [searchTerm, meetings]);

  const handleEditMeetingName = (meeting) => {
    setEditingMeetingId(meeting.meeting_id);
    setEditMeetingName(meeting.meeting_name || getDefaultMeetingName(meeting.created_at));
  };

  const handleSaveMeetingName = async (meetingId) => {
    try {
      const response = await fetch(`/api/backend/update-meeting-name`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY
        },
        credentials: "include",
        body: JSON.stringify({
          meeting_id: meetingId,
          meeting_name: editMeetingName,
          user_id: user.id
        }),
      });

      if (response.ok) {
        toast.success("Meeting name updated!");
        setEditingMeetingId(null);
        fetchMeetings(); // Refresh the list
      } else {
        toast.error("Failed to update meeting name");
      }
    } catch (error) {
      console.error("Error updating meeting name:", error);
      toast.error("Error updating meeting name");
    }
  };

  const handleViewMeeting = (meeting) => {
    setSelectedMeeting(meeting);
  };

  const handleDownloadMinutes = async (meeting) => {
    try {
      if (!meeting.minutes || meeting.minutes.length === 0) {
        toast.error("No minutes to download");
        return;
      }

      const blob = await generateAgendaMinutesDOCX(meeting.minutes, {
        meetingId: meeting.meeting_id,
        meetingName: meeting.meeting_name,
        date: new Date(meeting.created_at).toLocaleDateString(),
      });
      
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meeting.meeting_name || getDefaultMeetingName(meeting.created_at)}_minutes.docx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Minutes downloaded!");
    } catch (error) {
      console.error("Error downloading minutes:", error);
      toast.error("Failed to download minutes");
    }
  };

  const handleDownloadTranscript = async (meeting) => {
    try {
      if (!meeting.transcript) {
        toast.error("No transcript available");
        return;
      }

      const blob = new Blob([meeting.transcript], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${meeting.meeting_name || getDefaultMeetingName(meeting.created_at)}_transcript.txt`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
      
      toast.success("Transcript downloaded!");
    } catch (error) {
      console.error("Error downloading transcript:", error);
      toast.error("Failed to download transcript");
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getDefaultMeetingName = (dateString) => {
    const date = new Date(dateString);
    const datePart = date.toLocaleDateString('en-US', {
      month: 'short',
      day: '2-digit',
      year: 'numeric',
    }).replace(/\s+/g, '-');
    const timePart = date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).replace(/:/g, '-');
    return `${datePart}_${timePart}`;
  };

  if (userLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-lg text-gray-700">Loading...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen font-sans" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}>
      <ToastContainer position="top-right" autoClose={2000} hideProgressBar />
      <Header user={user} handleLogout={handleLogout} />
      
      <div className="p-6 max-w-7xl mx-auto">
        {!selectedMeeting ? (
          <>
            {/* Header */}
            <div className="mb-6">
              <h1 className="text-3xl font-bold text-white mb-2">Past Meetings</h1>
              <p className="text-gray-300">View and manage your meeting history</p>
            </div>

            {/* Search */}
            <input
              type="text"
              placeholder="Search meetings..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full p-3 border border-white/20 rounded-lg mb-6 bg-white/10 backdrop-blur-sm text-white placeholder-gray-400"
            />

            {/* Meetings Grid */}
            {filteredMeetings.length === 0 ? (
              <div className="bg-white/10 backdrop-blur-sm rounded-lg p-12 text-center">
                <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-semibold text-white mb-2">No Meetings Yet</h3>
                <p className="text-gray-300">Start a meeting to see it here</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {filteredMeetings.map((meeting) => (
                  <div
                    key={meeting.meeting_id}
                    className="bg-white/10 backdrop-blur-sm rounded-lg p-6 hover:bg-white/15 transition-all duration-200 border border-white/20"
                  >
                    {/* Meeting Name - Editable */}
                    {editingMeetingId === meeting.meeting_id ? (
                      <div className="flex items-center gap-2 mb-4">
                        <input
                          type="text"
                          value={editMeetingName}
                          onChange={(e) => setEditMeetingName(e.target.value)}
                          className="flex-1 px-3 py-2 bg-white/20 border border-white/30 rounded text-white"
                          autoFocus
                        />
                        <button
                          onClick={() => handleSaveMeetingName(meeting.meeting_id)}
                          className="p-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                        >
                          <Save className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => setEditingMeetingId(null)}
                          className="p-2 bg-gray-600 hover:bg-gray-700 text-white rounded transition-colors"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center justify-between mb-4">
                        <h3 className="text-lg font-semibold text-white flex-1">
                          {meeting.meeting_name || getDefaultMeetingName(meeting.created_at)}
                        </h3>
                        <button
                          onClick={() => handleEditMeetingName(meeting)}
                          className="p-2 hover:bg-white/10 rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4 text-gray-300" />
                        </button>
                      </div>
                    )}

                    {/* Meeting Info */}
                    <div className="flex items-center text-gray-300 text-sm mb-1">
                      <Calendar className="w-4 h-4 mr-2" />
                      {formatDate(meeting.created_at)}
                    </div>
                    <div className="flex items-center text-gray-300 text-sm mb-4">
                      <Clock className="w-4 h-4 mr-2" />
                      {formatTime(meeting.created_at)}
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-2 mb-4 text-sm">
                      <div className="bg-white/5 rounded p-2">
                        <div className="text-gray-400">Minutes</div>
                        <div className="text-white font-semibold">
                          {meeting.minutes?.length || 0} items
                        </div>
                      </div>
                      <div className="bg-white/5 rounded p-2">
                        <div className="text-gray-400">Transcript</div>
                        <div className="text-white font-semibold">
                          {meeting.transcript ? 'Available' : 'N/A'}
                        </div>
                      </div>
                    </div>

                    {/* Actions */}
                    <button
                      onClick={() => handleViewMeeting(meeting)}
                      className="w-full px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-semibold"
                    >
                      View Details
                    </button>
                  </div>
                ))}
              </div>
            )}
          </>
        ) : (
          <>
            {/* Meeting Details View */}
            <button
              onClick={() => setSelectedMeeting(null)}
              className="text-blue-400 hover:text-blue-300 mb-4 flex items-center gap-2"
            >
              ← Back to Meetings
            </button>

            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-6 border border-white/20">
              {/* Header */}
              <div className="mb-6">
                <h1 className="text-3xl font-bold text-white mb-2">
                  {selectedMeeting.meeting_name || getDefaultMeetingName(selectedMeeting.created_at)}
                </h1>
                <p className="text-gray-300">
                  {formatDate(selectedMeeting.created_at)} at {formatTime(selectedMeeting.created_at)}
                </p>
              </div>

              {/* Minutes Section */}
              {selectedMeeting.minutes && selectedMeeting.minutes.length > 0 && (
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">Minutes</h2>
                    <button
                      onClick={() => handleDownloadMinutes(selectedMeeting)}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Minutes
                    </button>
                  </div>
                  <div className="space-y-4">
                    {selectedMeeting.minutes.map((minute, index) => (
                      <div key={index} className="bg-white/5 rounded-lg p-6 border border-white/10">
                        <div className="flex items-center gap-4 mb-4">
                          <div className="bg-blue-600 text-white rounded-full w-10 h-10 flex items-center justify-center font-bold">
                            {minute.agenda_number}
                          </div>
                          <h3 className="text-xl font-semibold text-white">{minute.agenda_name}</h3>
                        </div>
                        <div className="text-gray-300 whitespace-pre-wrap leading-relaxed">
                          {minute.content}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Transcript Section */}
              {selectedMeeting.transcript && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-2xl font-bold text-white">Transcript</h2>
                    <button
                      onClick={() => handleDownloadTranscript(selectedMeeting)}
                      className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors"
                    >
                      <Download className="w-4 h-4" />
                      Download Transcript
                    </button>
                  </div>
                  <div className="bg-white/5 rounded-lg p-6 border border-white/10">
                    <div className="text-gray-300 whitespace-pre-wrap leading-relaxed max-h-96 overflow-y-auto">
                      {selectedMeeting.transcript}
                    </div>
                  </div>
                </div>
              )}

              {!selectedMeeting.minutes?.length && !selectedMeeting.transcript && (
                <div className="text-center py-12">
                  <FileText className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                  <p className="text-gray-400">No minutes or transcript available for this meeting</p>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
