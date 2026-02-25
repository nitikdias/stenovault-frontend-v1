"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");
    const name = formData.get("name");
    const phone = formData.get("phone");

    const endpoint = isSignup
      ? `/api/backend/registerUser`
      : `/api/proxy/login`; // ✅ Use proxy endpoint to set cookies on frontend domain

    console.log("📤 Submitting to:", endpoint);

    try {
      const body = isSignup
        ? JSON.stringify({ email, password, name, phone })
        : JSON.stringify({ email, password });

      const res = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY
        },
        credentials: "include", // ✅ Important for cookies
        body,
      });

      const data = await res.json();

      if (res.ok) {
        if (isSignup) {
          alert("✅ Registration successful! Please login.");
          setIsSignup(false);
        } else {
          console.log("✅ Login successful, storing user data...");
          console.log("📋 Response headers:", Object.fromEntries(res.headers.entries()));

          // ✅ Check if cookie was received
          console.log("🍪 Current cookies:", document.cookie);

          // ✅ Store only user info in localStorage
          localStorage.setItem("userId", data.user.id);
          localStorage.setItem("userName", data.user.name);
          localStorage.setItem("userEmail", data.user.email);
          localStorage.setItem("userPhone", data.user.phone || "");

          // ✅ Notify UserContext that user data has been updated
          window.dispatchEvent(new Event('userUpdated'));

          console.log("🚀 Redirecting to home page...");
          router.push("/");
        }

      } else {
        alert(data.error || data.message || "Something went wrong");
      }
    } catch (err) {
      console.error("❌ Error:", err);
      alert("Server error. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* ===== Left Panel (Desktop) ===== */}
      <div
        className="hidden lg:flex lg:w-2/5 xl:w-1/2 items-center justify-center p-4 lg:p-8 relative overflow-hidden"
        style={{
          background: "linear-gradient(135deg, #0a0e27 0%, #1a1f4e 30%, #0d1b3e 60%, #0f2847 100%)"
        }}
      >
        {/* Decorative animated circles */}
        <div
          className="absolute w-[500px] h-[500px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #4f8ef7 0%, transparent 70%)",
            top: "-100px",
            right: "-100px",
            animation: "pulse 6s ease-in-out infinite"
          }}
        />
        <div
          className="absolute w-[400px] h-[400px] rounded-full opacity-10"
          style={{
            background: "radial-gradient(circle, #7c5ce7 0%, transparent 70%)",
            bottom: "-80px",
            left: "-80px",
            animation: "pulse 8s ease-in-out infinite reverse"
          }}
        />

        <div className="relative z-10 text-center">
          {/* Waveform icon */}
          <div className="flex justify-center mb-6">
            <svg width="64" height="64" viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="4" y="24" width="6" height="16" rx="3" fill="url(#grad1)" opacity="0.7" />
              <rect x="14" y="16" width="6" height="32" rx="3" fill="url(#grad1)" opacity="0.85" />
              <rect x="24" y="8" width="6" height="48" rx="3" fill="url(#grad1)" />
              <rect x="34" y="12" width="6" height="40" rx="3" fill="url(#grad1)" opacity="0.9" />
              <rect x="44" y="20" width="6" height="24" rx="3" fill="url(#grad1)" opacity="0.75" />
              <rect x="54" y="26" width="6" height="12" rx="3" fill="url(#grad1)" opacity="0.6" />
              <defs>
                <linearGradient id="grad1" x1="0" y1="0" x2="0" y2="64" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#60a5fa" />
                  <stop offset="1" stopColor="#a78bfa" />
                </linearGradient>
              </defs>
            </svg>
          </div>

          <h1
            className="text-5xl xl:text-6xl font-extrabold tracking-tight mb-3"
            style={{
              background: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #60a5fa 100%)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              backgroundClip: "text"
            }}
          >
            Stenovault
          </h1>
          <p className="text-blue-300/70 text-lg font-medium tracking-widest uppercase">
            AI-Powered Transcriber
          </p>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative px-4 py-8 sm:px-6 lg:px-8 lg:bg-white">
        {/* Mobile background */}
        <div
          className="lg:hidden absolute inset-0 z-0"
          style={{
            background: "linear-gradient(135deg, #0a0e27 0%, #1a1f4e 30%, #0d1b3e 60%, #0f2847 100%)"
          }}
        />

        <div className="w-full max-w-md space-y-6 relative z-10">
          {/* Mobile branding */}
          <div className="lg:hidden text-center mb-6">
            <h1
              className="text-4xl font-extrabold tracking-tight mb-1"
              style={{
                background: "linear-gradient(135deg, #60a5fa 0%, #a78bfa 50%, #60a5fa 100%)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
                backgroundClip: "text"
              }}
            >
              Stenovault
            </h1>
            <p className="text-blue-300/70 text-sm font-medium tracking-widest uppercase">
              AI-Powered Transcriber
            </p>
          </div>

          <div className="bg-white/95 lg:bg-white backdrop-blur-sm rounded-xl shadow-lg p-6 sm:p-8 md:p-10 border border-gray-100">
            <h2
              className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-6 sm:mb-8 text-center"
              style={{ color: "oklch(0.3 0.06 253.77)" }}
            >
              {isSignup ? "Create Account" : "Welcome Back"}
            </h2>

            <form className="space-y-5" onSubmit={handleSubmit}>
              {isSignup && (
                <>
                  <div>
                    <label
                      htmlFor="name"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Full Name
                    </label>
                    <input
                      id="name"
                      name="name"
                      type="text"
                      placeholder="Enter your full name"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div>
                    <label
                      htmlFor="phone"
                      className="block text-sm font-medium text-gray-700 mb-2"
                    >
                      Phone Number
                    </label>
                    <input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </>
              )}

              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  placeholder="Enter your email"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="password"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Password
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  placeholder="Enter your password"
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-lg font-semibold text-lg hover:opacity-90 transition-all duration-200 shadow-md disabled:opacity-50"
                style={{
                  backgroundColor: "oklch(0.3 0.06 253.77)",
                  color: "white",
                }}
              >
                {loading
                  ? isSignup
                    ? "Signing up..."
                    : "Logging in..."
                  : isSignup
                    ? "Sign Up"
                    : "Login"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">
                {isSignup ? "Already have an account? " : " "}
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:underline"
                  onClick={() => setIsSignup(!isSignup)}
                  disabled={loading}
                >
                  {isSignup ? "Sign in" : ""}
                </button>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
