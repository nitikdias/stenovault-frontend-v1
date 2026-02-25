// app/context/MeetingContext.js
"use client";

import { createContext, useContext, useState, useEffect } from "react";

const MeetingContext = createContext();

export const MeetingProvider = ({ children }) => {
  const [meetingId, setMeetingId] = useState(null);
  const [currentPatient, setCurrentPatient] = useState(null);

  // ✅ Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('meetingId');
    if (stored) {
      console.log("♻️ Hydrating meetingId from localStorage:", stored);
      setMeetingId(stored);
    }
  }, []);

  // ✅ Helper to update both state and localStorage
  const updateMeetingId = (id) => {
    console.log("📍 Updating meetingId:", id);
    setMeetingId(id);
    if (id) {
      localStorage.setItem('meetingId', id);
    } else {
      localStorage.removeItem('meetingId');
    }
  };

  return (
    <MeetingContext.Provider
      value={{ meetingId, setMeetingId: updateMeetingId, currentPatient, setCurrentPatient }}
    >
      {children}
    </MeetingContext.Provider>
  );
};

export const useMeeting = () => useContext(MeetingContext);
