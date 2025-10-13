"use client";
import { createContext, useContext, useState } from "react";

const RecordingContext = createContext();

export const RecordingProvider = ({ children }) => {
  const [canRecord, setCanRecord] = useState(false);   // Start recording allowed
  const [isRecording, setIsRecording] = useState(false); // Actual recording in progress

  return (
    <RecordingContext.Provider
      value={{ canRecord, setCanRecord, isRecording, setIsRecording }}
    >
      {children}
    </RecordingContext.Provider>
  );
};

export const useRecording = () => useContext(RecordingContext);
