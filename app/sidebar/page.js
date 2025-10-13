"use client";

import { usePathname, useRouter } from "next/navigation";
import React, { useState, useEffect, useRef } from "react";

export default function Sidebar({ stats }) {
  const router = useRouter();
  const pathname = usePathname();
  const [isOpen, setIsOpen] = useState(false);
  const sidebarRef = useRef(null);

  const buttonStyle = (path) => ({
    width: "100%",
    padding: "10px",
    backgroundColor: pathname === path ? "#012537" : "white",
    color: pathname === path ? "white" : "#012537",
    border: "1px solid #012537",
    borderRadius: "6px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: "600",
    transition: "all 0.2s ease",
  });

  // Close sidebar when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target) && !event.target.closest('.hamburger-button')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [isOpen]);

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  return (
    <>
      {/* Hamburger Button - Only visible on mobile */}
      <button
        onClick={() => setIsOpen(true)}
        className="hamburger-button md:hidden fixed top-20 left-4 z-40 p-3 bg-white border border-gray-300 rounded-lg shadow-lg hover:bg-gray-50 transition-colors"
        aria-label="Open sidebar"
      >
        <svg
          className="w-6 h-6 text-gray-700"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M4 6h16M4 12h16M4 18h16"
          />
        </svg>
      </button>

      {/* Overlay - Transparent with blur effect */}
      {isOpen && (
        <div
          className="md:hidden fixed inset-0 bg-white/10 backdrop-blur-sm z-40 transition-all duration-300"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div
        ref={sidebarRef}
        className={`
          fixed md:relative
          top-0 left-0
          h-full
          z-50 md:z-auto
          bg-white
          transition-transform duration-300 ease-in-out
          ${isOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"}
        `}
        style={{
          width: "100px",
          border: "1px solid #e2e8f0",
          minHeight: "calc(91vh - 46px)",
          padding: "16px",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          alignItems: "center",
          borderRadius: "0 13px 13px 0",
          margin: "23px 4px 23px 4px",
        }}
      >
        {/* Close button - Only visible on mobile */}
        <button
          onClick={() => setIsOpen(false)}
          className="md:hidden absolute top-4 right-4 p-1 text-gray-600 hover:text-gray-800"
          aria-label="Close sidebar"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>

        {/* --- Top Section (Buttons) --- */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "12px",
            alignItems: "center",
          }}
        >
          {/* New Encounter */}
          <button
            onClick={() => router.push("/newEncounter")}
            style={{
              ...buttonStyle("/newEncounter"),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "3px",
              gap: "1px",
              border: "none",
            }}
          >
            <img
              src="/images/new-document.png"
              alt="New Encounter"
              style={{
                width: "24px",
                height: "24px",
                filter:
                  pathname === "/newEncounter" ? "invert(100%)" : "invert(0%)",
              }}
            />
            <span style={{ fontSize: "8px", fontWeight: "800" }}>
              New Encounter
            </span>
          </button>

          {/* Home */}
          <button
            onClick={() => router.push("/")}
            style={{
              ...buttonStyle("/"),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "3px",
              gap: "1px",
              border: "none",
            }}
          >
            <img
              src="/images/home.png"
              alt="Home"
              style={{
                width: "24px",
                height: "24px",
                filter: pathname === "/" ? "invert(100%)" : "invert(0%)",
              }}
            />
            <span style={{ fontSize: "12px", fontWeight: "500" }}>Home</span>
          </button>

          {/* Reports */}
          <button
            onClick={() => router.push("/reports")}
            style={{
              ...buttonStyle("/reports"),
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "3px",
              gap: "1px",
              border: "none",
            }}
          >
            <img
              src="/images/file.png"
              alt="Reports"
              style={{
                width: "24px",
                height: "24px",
                filter: pathname === "/reports" ? "invert(100%)" : "invert(0%)",
              }}
            />
            <span style={{ fontSize: "12px", fontWeight: "500" }}>Reports</span>
          </button>
        </div>

        {/* --- Bottom Section (Quick Stats) --- */}
        <div
          style={{
            width: "100%",
            borderTop: "1px solid #e2e8f0",
            paddingTop: "8px",
            textAlign: "center",
          }}
        >
          <h3
            style={{
              fontSize: "8px",
              fontWeight: "600",
              color: "#1e293b",
              marginBottom: "8px",
            }}
          >
            Quick Stats
          </h3>
          {stats && (
            <>
              <div
                style={{ fontSize: "8px", color: "#64748b", marginBottom: "4px" }}
              >
                Today:{" "}
                <span style={{ fontWeight: "600", color: "#1e293b" }}>
                  {stats.today}
                </span>
              </div>
              <div style={{ fontSize: "8px", color: "#64748b" }}>
                This Week:{" "}
                <span style={{ fontWeight: "600", color: "#1e293b" }}>
                  {stats.week}
                </span>
              </div>
            </>
          )}
        </div>
      </div>
    </>
  );
}
