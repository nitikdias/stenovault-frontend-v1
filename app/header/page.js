"use client";

import React, { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";

export default function Header({ handleLogout }) {
  const router = useRouter();
  const pathname = usePathname();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [user, setUser] = useState(null);

  // ✅ Read user info from localStorage on mount
  useEffect(() => {
    const storedUser = {
      name: localStorage.getItem("userName"),
      email: localStorage.getItem("userEmail"),
    };

    if (storedUser.name || storedUser.email) {
      setUser(storedUser);
    }
  }, []);

  // ✅ Helper to get initials from name or email
  const getInitials = () => {
    if (!user) return "DS";
    if (user.name && user.name.trim()) {
      return user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase();
    }
    if (user.email) return user.email.slice(0, 2).toUpperCase();
    return "DS";
  };

  const navButtonStyle = (path) => ({
    padding: '8px 16px',
    backgroundColor: pathname === path ? '#ffffff20' : 'transparent',
    color: '#ffffff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.2s ease',
    whiteSpace: 'nowrap'
  });

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
      {/* Left section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
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

          <div className="hidden md:block">
            <h1 style={{ fontSize: '18px', fontWeight: '600', margin: 0, color: '#ffffffff' }}>
              Stenovault
            </h1>
            <p style={{ fontSize: '14px', color: '#64748b', margin: 0 }}>Ambient Listening</p>
          </div>
        </div>

        {/* Navigation buttons */}
        <nav className="hidden md:flex" style={{ gap: '8px', alignItems: 'center' }}>
          <button
            onClick={() => router.push("/")}
            style={navButtonStyle("/")}
            onMouseEnter={(e) => {
              if (pathname !== "/") e.currentTarget.style.backgroundColor = '#ffffff10';
            }}
            onMouseLeave={(e) => {
              if (pathname !== "/") e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Home
          </button>
          <button
            onClick={() => router.push("/reports")}
            style={navButtonStyle("/reports")}
            onMouseEnter={(e) => {
              if (pathname !== "/reports") e.currentTarget.style.backgroundColor = '#ffffff10';
            }}
            onMouseLeave={(e) => {
              if (pathname !== "/reports") e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Reports
          </button>
          <button
            onClick={() => router.push("/register-speaker")}
            style={navButtonStyle("/register-speaker")}
            onMouseEnter={(e) => {
              if (pathname !== "/register-speaker") e.currentTarget.style.backgroundColor = '#ffffff10';
            }}
            onMouseLeave={(e) => {
              if (pathname !== "/register-speaker") e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Register Speaker
          </button>
          {/* <button
            onClick={() => router.push("/newEncounter")}
            style={navButtonStyle("/newEncounter")}
            onMouseEnter={(e) => {
              if (pathname !== "/newEncounter") e.currentTarget.style.backgroundColor = '#ffffff10';
            }}
            onMouseLeave={(e) => {
              if (pathname !== "/newEncounter") e.currentTarget.style.backgroundColor = 'transparent';
            }}
          >
            Meetings
          </button> */}
        </nav>
      </div>

      {/* Right section */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Desktop view */}
        <div className="hidden md:flex" style={{ alignItems: 'center', gap: '16px' }}>
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

          {/* Dropdown */}
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

        {/* Mobile menu */}
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
              <button
                onClick={() => {
                  router.push("/");
                  setDropdownOpen(false);
                }}
                style={{
                  background: pathname === "/" ? "#012537" : "transparent",
                  color: pathname === "/" ? "white" : "black",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 12px",
                  width: "100%",
                  textAlign: "left",
                  fontSize: "14px",
                  borderRadius: "4px",
                  marginBottom: "4px"
                }}
              >
                Home
              </button>
              <button
                onClick={() => {
                  router.push("/newEncounter");
                  setDropdownOpen(false);
                }}
                style={{
                  background: pathname === "/newEncounter" ? "#012537" : "transparent",
                  color: pathname === "/newEncounter" ? "white" : "black",
                  border: "none",
                  cursor: "pointer",
                  padding: "8px 12px",
                  width: "100%",
                  textAlign: "left",
                  fontSize: "14px",
                  borderRadius: "4px",
                  marginBottom: "4px"
                }}
              >
                Meetings
              </button>
              <div style={{ 
                padding: "8px 12px", 
                fontSize: "13px", 
                color: "#64748b", 
                borderTop: "1px solid #e2e8f0", 
                marginTop: "4px",
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
