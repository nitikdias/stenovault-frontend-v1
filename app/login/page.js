"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
  const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || "";
  const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY ;

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
      <div className="hidden lg:flex lg:w-2/5 xl:w-1/2 items-center justify-center p-4 lg:p-8 relative overflow-hidden">
        <img
          src="images/auth-image.png"
          alt="Auth Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
        <div className="relative z-10 text-center">
          <img
            src="images/auth-logo.png"
            alt="StenoVault Logo"
            className="mx-auto w-48 md:w-56 lg:w-64 xl:w-72 h-auto drop-shadow-lg"
          />
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center relative px-4 py-8 sm:px-6 lg:px-8 lg:bg-white">
        <div className="lg:hidden absolute inset-0 z-0">
          <img
            src="images/auth-image.png"
            alt="Background"
            className="w-full h-full object-cover"
          />
        </div>

        <div className="w-full max-w-md space-y-6 relative z-10">
          <div className="lg:hidden flex justify-center mb-6">
            <img
              src="images/auth-logo.png"
              alt="StenoVault Logo"
              className="w-32 sm:w-40 h-auto drop-shadow-2xl"
            />
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
