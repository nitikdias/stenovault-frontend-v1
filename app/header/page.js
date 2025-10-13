"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

export default function Header({ handleLogout }) {
  const router = useRouter();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);

  // Fetch user on mount
  useEffect(() => {
    async function fetchUser() {
      try {
        const res = await fetch("/api/me");
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
        } else {
          console.error("Failed to fetch user");
        }
      } catch (err) {
        console.error("Error fetching user:", err);
      }
    }
    fetchUser();
  }, []);

  // Helper to get initials from email or name
  const getInitials = () => {
    if (!user) return "DS";
    if (user.name) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    }
    if (user.email) return user.email.slice(0, 2).toUpperCase();
    return "DS";
  };

  return (
    <div
      style={{
        backgroundColor: '#012537',
        borderBottom: '1px solid #012537',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}
    >
      {/* Left section - Logo only on mobile, full content on larger screens */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        <div
          style={{
            width: '52px',
            height: '32px',
            backgroundColor: '#ffffffff',
            borderRadius: '6px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <span style={{ display: 'inline-block', width: '24px', height: '24px' }}>
            <img 
              src="/images/app-logo.png" 
              alt="Logo" 
              style={{ width: '100%', height: '100%', objectFit: 'contain' }} 
            />
          </span>
        </div>
        
        {/* Title and subtitle - Hidden on mobile, visible on md and up */}
        <div className="hidden md:block">
          <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#ffffffff' }}>
            ARCA EMR Lite
          </h1>
          <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Ambient Listening</p>
        </div>
      </div>

      {/* Right section - Different layouts for mobile vs desktop */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Desktop view - Avatar and email dropdown */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: '16px' }}>
          {/* Account Avatar */}
          <div
            style={{
              width: '32px',
              height: '32px',
              backgroundColor: '#eceef0ff',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}
          >
            <span style={{ color: 'black', fontSize: '12px', fontWeight: 'bold' }}>
              {getInitials()}
            </span>
          </div>

          {/* User dropdown */}
          <div style={{ position: "relative" }}>
            <div
              style={{ cursor: "pointer", fontSize: "14px", fontWeight: 500, color: "#fefefeff" }}
              onClick={() => setDropdownOpen(!dropdownOpen)}
            >
              {user?.email || "Loading..."}
            </div>

            {dropdownOpen && (
              <div
                style={{
                  position: "absolute",
                  top: "100%",
                  right: 0,
                  backgroundColor: "white",
                  border: "1px solid #e2e8f0",
                  borderRadius: "6px",
                  boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                  padding: "8px",
                  zIndex: 10,
                  marginTop: "4px"
                }}
              >
                <button
                  onClick={handleLogout}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "4px 8px",
                    width: "100%",
                    textAlign: "left",
                    fontSize: "14px",
                    color: "black",
                  }}
                >
                  Logout
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Mobile menu icon - Only visible on mobile */}
        <div className="md:hidden" style={{ position: "relative" }}>
          <div
            onClick={() => setDropdownOpen(!dropdownOpen)}
            style={{
              cursor: "pointer",
              color: "#fefefeff",
              fontSize: "24px",
              width: "40px",
              height: "40px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center"
            }}
          >
            ☰
          </div>

          {dropdownOpen && (
            <div
              style={{
                position: "absolute",
                top: "100%",
                right: 0,
                backgroundColor: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "6px",
                boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
                padding: "8px",
                zIndex: 10,
                marginTop: "4px",
                minWidth: "180px"
              }}
            >
              <div style={{ 
                padding: "8px 12px", 
                fontSize: "13px", 
                color: "#64748b", 
                borderBottom: "1px solid #e2e8f0", 
                marginBottom: "4px",
                wordBreak: "break-word"
              }}>
                {user?.email || "Loading..."}
              </div>
              <button
                onClick={handleLogout}
                style={{
                  background: "transparent",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 12px",
                  width: "100%",
                  textAlign: "left",
                  fontSize: "14px",
                  color: "black",
                }}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
