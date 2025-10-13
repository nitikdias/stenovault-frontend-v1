"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useMeeting } from "@/context/meetingContext";
import Sidebar from "../sidebar/page"; // adjust path if needed
import Header from "../header/page"; // adjust path if needed
import { useRecording } from "@/context/recordingContext";
import { toast } from "react-toastify";

export default function NewEncounter() {
  const router = useRouter();
  const { setMeetingId, setCurrentPatient } = useMeeting();

  const [patients, setPatients] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showNewPatientForm, setShowNewPatientForm] = useState(false);
  const [newPatient, setNewPatient] = useState({ name: "", email: "", phone: "" });
  const [userId, setUserId] = useState(null);
  const [stats, setStats] = useState({ today: 0, week: 0 });

  const { setCanRecord } = useRecording();

  const handleLogout = async () => {
  await fetch("/api/logout", { method: "POST" });
  router.push("/login");
};


  // Fetch stats from backend
  async function fetchStats() {
    const userId = localStorage.getItem("userId");
    if (!userId) {
      console.warn("User ID not found in localStorage");
      return;
    }
  
    try {
      const res = await fetch(`http://localhost:8000/stats?user_id=${userId}`);
      if (res.ok) {
        const data = await res.json();
        setStats(data);
      } else {
        console.error("Failed to fetch stats:", res.statusText);
      }
    } catch (err) {
      console.error("Failed to fetch stats:", err);
    }
  }

  // Call on component mount
  useEffect(() => {
    fetchStats();
  }, []);

  // Load userId from localStorage
  useEffect(() => {
    if (typeof window !== "undefined") {
      const id = localStorage.getItem("userId");
      setUserId(id);
    }
  }, []);

  // Fetch patients
  useEffect(() => {
    const fetchPatients = async () => {
      try {
        const res = await fetch("http://localhost:8000/patients");
        if (!res.ok) throw new Error("Failed to fetch patients");
        const data = await res.json();
        setPatients(data);
      } catch (err) {
        console.error(err);
      }
    };
    fetchPatients();
  }, []);

  const filteredPatients = patients.filter((p) =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartSession = async () => {
    if (!userId || !selectedPatient) return alert("Select user & patient");

    setLoading(true);
    try {
      const res = await fetch("http://localhost:8000/new_encounter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId, patient_id: selectedPatient.id }),
      });

      const data = await res.json();
      if (res.ok) {
        setMeetingId(data.meeting_id);
        setCurrentPatient(selectedPatient);
        localStorage.setItem("meetingId", data.meeting_id);
        setCanRecord(true); // ✅ Enable recording in app
        toast.success("Session started! You can now start recording.");
        router.push("/"); // go to app
      } else {
        alert("Failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Error starting session");
    } finally {
      setLoading(false);
    }
  };

  const handleCreatePatient = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch("http://localhost:8000/patients", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newPatient),
      });
      const data = await res.json();
      if (res.ok) {
        setPatients((prev) => [...prev, data]);
        setSelectedPatient(data);
        setSearchTerm(data.name);
        setShowNewPatientForm(false);
        setNewPatient({ name: "", email: "", phone: "" });
        setCurrentPatient(data);
      } else {
        alert("Failed: " + (data.error || "Unknown error"));
      }
    } catch (err) {
      console.error(err);
      alert("Error creating patient");
    }
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#f9fafb",
      }}
    >
      {/* Header spans full width */}
      <Header handleLogout={handleLogout} />

      <div style={{ display: "flex", flex: 1 }}>
        {/* Sidebar */}
        <Sidebar stats={stats} />

        {/* Main Content */}
        <div
          style={{
            flex: 1,
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "20px",
          }}
        >
          <div
            style={{
              width: "100%",
              maxWidth: "500px",
              padding: "20px",
              backgroundColor: "white",
              borderRadius: "8px",
              boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
            }}
          >
            <h2 style={{ textAlign: "center", marginBottom: "20px", color:"black" }}>
              Start New Encounter
            </h2>

            {/* Patient Search */}
            <div style={{ marginBottom: "29px" }}>
              <input
                type="text"
                placeholder="Search patient..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setSelectedPatient(null);
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  color:"black"
                }}
              />
              {searchTerm && filteredPatients.length > 0 && (
                <ul
                  style={{
                    listStyle: "none",
                    margin: "8px 0 0 0",
                    padding: "8px",
                    border: "1px solid #ccc",
                    borderRadius: "6px",
                    background: "white",
                    maxHeight: "150px",
                    overflowY: "auto",
                    width: "100%",
                    zIndex: 10,
                    color:"black"
                  }}
                >
                  {filteredPatients.map((p) => (
                    <li
                      key={p.id}
                      onClick={() => {
                        setSelectedPatient(p);
                        setSearchTerm(p.name);
                      }}
                      style={{
                        padding: "6px",
                        cursor: "pointer",
                        background:
                          selectedPatient?.id === p.id ? "#e0e7ff" : "transparent",
                      }}
                    >
                      {p.name}
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {selectedPatient && (
              <div style={{ marginBottom: "12px", color:"black" }}>
                <strong>Selected Patient:</strong> {selectedPatient.name}
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", gap: "12px", marginBottom: "12px" }}>
              <button
                onClick={handleStartSession}
                disabled={loading}
                style={{
                  backgroundColor: "transparent",
                  color: "#012537",
                  border: "2px solid #012537",
                  borderRadius: "6px",
                  padding: "10px 16px",
                  cursor: "pointer",
                  flex: 1,
                }}
              >
                {loading ? "Starting..." : "Start Session"}
              </button>

              <button
                onClick={() => setShowNewPatientForm((prev) => !prev)}
                style={{
                  backgroundColor: "transparent",
                  color: "#012537",
                  border: "2px solid #012537",
                  borderRadius: "6px",
                  padding: "10px 16px",
                  cursor: "pointer",
                  flex: 1,
                }}
              >
                New Patient
              </button>
            </div>

            {/* New Patient Form */}
            {showNewPatientForm && (
              <form
                onSubmit={handleCreatePatient}
                style={{
                  border: "1px solid #ccc",
                  borderRadius: "6px",
                  padding: "16px",
                  background: "white",
                  color:"black"
                }}
              >
                <h3 style={{ marginBottom: "12px", textAlign: "center" }}>
                  Create New Patient
                </h3>

                <label>
                  Name:
                  <input
                    type="text"
                    value={newPatient.name}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, name: e.target.value })
                    }
                    required
                    style={{
                      width: "100%",
                      padding: "6px",
                      marginBottom: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                    }}
                  />
                </label>

                <label>
                  Email:
                  <input
                    type="email"
                    value={newPatient.email}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, email: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "6px",
                      marginBottom: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                    }}
                  />
                </label>

                <label>
                  Phone:
                  <input
                    type="text"
                    value={newPatient.phone}
                    onChange={(e) =>
                      setNewPatient({ ...newPatient, phone: e.target.value })
                    }
                    style={{
                      width: "100%",
                      padding: "6px",
                      marginBottom: "8px",
                      border: "1px solid #ccc",
                      borderRadius: "6px",
                    }}
                  />
                </label>

                <button
                  type="submit"
                  style={{
                    backgroundColor: "transparent",
                    color: "#012537",
                    border: "2px solid #012537",
                    borderRadius: "6px",
                    padding: "10px 16px",
                    cursor: "pointer",
                    width: "100%",
                  }}
                >
                  Create Patient
                </button>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
