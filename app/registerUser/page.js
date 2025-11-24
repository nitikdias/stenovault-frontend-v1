"use client";

import React, { useState, useEffect } from "react";
import Sidebar from "../sidebar/page"; // adjust path
import Header from "../header/page"; // adjust path
import { usePathname } from "next/navigation";

export default function Register({ stats }) {
  const pathname = usePathname(); // used to highlight Register in Sidebar
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [user, setUser] = useState(null);
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";

  //fetch user details
    useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        }
      } catch (e) {
        console.error(e);
      }
    }
    fetchUser();
  }, []);

  const handleFileChange = (e) => {
    setFiles(e.target.files);
  };

  const handleRegister = async () => {
  if (!files.length) {
    setMessage("Please select at least one file.");
    return;
  }

  if (!user) {
    setMessage("User not loaded yet.");
    return;
  }

  const formData = new FormData();
  Array.from(files).forEach((file) => formData.append("files", file));
  formData.append("user_id", user.id); // ✅ attach user_id

  setLoading(true);
  setMessage("");

  const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
  try {
    const res = await fetch(`/api/backend/register`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${TOKEN_KEY}`,
      },
      credentials: "include",
      body: formData,
    });

    const data = await res.json();
    if (res.ok) {
      setMessage("Registration successful!");
      setFiles([]); // clear selected files
    } else {
      setMessage(data.error || "Registration failed.");
    }
  } catch (err) {
    console.error(err);
    setMessage("Server error. Try again later.");
  } finally {
    setLoading(false);
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
      {/* Header */}
      <Header />

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
            <h2 style={{ textAlign: "center", marginBottom: "20px", color: "black" }}>
              Register
            </h2>

            {/* File Upload */}
            <div
              style={{
                position: "relative",
                border: "2px dashed #ccc",
                borderRadius: "6px",
                padding: "40px 20px",
                textAlign: "center",
                cursor: "pointer",
                marginBottom: "20px",
                backgroundColor: "#f9fafb",
              }}
            >
              <input
                key={files.length} // ✅ force re-render when files are cleared
                type="file"
                multiple
                onChange={handleFileChange}
                style={{
                  position: "absolute",
                  inset: 0,
                  width: "100%",
                  height: "100%",
                  opacity: 0,
                  cursor: "pointer",
                }}
              />
              <p style={{ color: "#64748b" }}>
                Drag and drop files here, or click to select files
              </p>
              {files.length > 0 && (
                <ul
                  style={{
                    marginTop: "12px",
                    textAlign: "left",
                    listStyle: "none",
                    paddingLeft: "0",
                    color: "#1e293b",
                  }}
                >
                  {Array.from(files).map((file, idx) => (
                    <li key={idx}>• {file.name}</li>
                  ))}
                </ul>
              )}
            </div>

            {/* Register Button */}
            <button
              onClick={handleRegister}
              disabled={loading}
              style={{
                width: "100%",
                padding: "10px",
                backgroundColor: "#012537",
                color: "white",
                borderRadius: "6px",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
              }}
            >
              {loading ? "Registering..." : "Register"}
            </button>

            {/* Message */}
            {message && (
              <p
                style={{
                  marginTop: "12px",
                  textAlign: "center",
                  color: message.includes("success") ? "green" : "red",
                }}
              >
                {message}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
