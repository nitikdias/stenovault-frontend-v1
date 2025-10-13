"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const router = useRouter();
  const [isSignup, setIsSignup] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const formData = new FormData(e.target);
    const email = formData.get("email");
    const password = formData.get("password");

    const endpoint = isSignup ? "/api/signup" : "/api/login";

    try {
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();
      if (data.success) {
        localStorage.setItem("userId", data.userId);
        if (data.redirect) {
          router.push(data.redirect);
        } else {
          router.push("/");
        }
      } else {
        alert(data.message || "Something went wrong");
      }
    } catch (err) {
      alert("Server error. Please try again later.");
    }
  };

  return (
    <div className="flex flex-col lg:flex-row min-h-screen">
      {/* Left Side (Image Section) - Hidden on mobile, visible on larger screens */}
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

      {/* Right Side (Form Section) with Mobile Background */}
      <div className="flex-1 flex items-center justify-center relative px-4 py-8 sm:px-6 lg:px-8 lg:bg-white">
        {/* Background Image for Mobile - Only visible on small screens */}
        <div className="lg:hidden absolute inset-0 z-0">
          <img
            src="images/auth-image.png"
            alt="Background"
            className="w-full h-full object-cover"
          />
          {/* Dark overlay for better readability */}
          <div className="absolute inset-0 "></div>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-md space-y-6 relative z-10">
          {/* Logo for mobile - only visible on small screens */}
          <div className="lg:hidden flex justify-center mb-6">
            <img
              src="images/auth-logo.png"
              alt="StenoVault Logo"
              className="w-32 sm:w-40 h-auto drop-shadow-2xl"
            />
          </div>

          {/* Form Card */}
          <div className="bg-white/95 lg:bg-white backdrop-blur-sm rounded-xl shadow-lg p-6 sm:p-8 md:p-10 border border-gray-100">
            <h2
              className="text-2xl sm:text-3xl font-semibold text-gray-800 mb-6 sm:mb-8 text-center"
              style={{ color: "oklch(0.3 0.06 253.77)" }}
            >
              {isSignup ? "Create Account" : "Welcome Back"}
            </h2>

            <form className="space-y-5" onSubmit={handleSubmit}>
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 sm:py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black text-base transition-all duration-200"
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
                  className="w-full border border-gray-300 rounded-lg px-4 py-3 sm:py-3.5 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-black text-base transition-all duration-200"
                  required
                />
              </div>

              <button
                type="submit"
                className="w-full py-3 sm:py-3.5 rounded-lg font-semibold text-base sm:text-lg hover:opacity-90 transition-all duration-200 active:scale-98 shadow-md"
                style={{
                  backgroundColor: "oklch(0.3 0.06 253.77)",
                  color: "white",
                }}
              >
                {isSignup ? "Sign Up" : "Login"}
              </button>
            </form>

            <div className="mt-6 text-center">
              <p className="text-sm sm:text-base text-gray-600">
                {isSignup ? "Already have an account? " : "New here? "}
                <button
                  type="button"
                  className="font-medium text-blue-600 hover:text-blue-700 hover:underline focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 rounded px-1"
                  onClick={() => setIsSignup(!isSignup)}
                >
                  {isSignup ? "Sign in" : "Create an account"}
                </button>
              </p>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
}
