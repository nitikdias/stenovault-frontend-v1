// app/context/MeetingContext.js
"use client";

import { createContext, useContext, useState } from "react";

const MeetingContext = createContext();

export const MeetingProvider = ({ children }) => {
  const [meetingId, setMeetingId] = useState(null);
  const [currentPatient, setCurrentPatient] = useState(null);

  return (
    <MeetingContext.Provider
      value={{ meetingId, setMeetingId, currentPatient, setCurrentPatient }}
    >
      {children}
    </MeetingContext.Provider>
  );
};

export const useMeeting = () => useContext(MeetingContext);
