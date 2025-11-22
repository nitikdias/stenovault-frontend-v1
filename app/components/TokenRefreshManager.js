"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function TokenRefreshManager() {
  const router = useRouter();
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);

  useEffect(() => {
    // ✅ Only run on client side
    if (typeof window === 'undefined') return;

    // Check if user is logged in
    const userId = localStorage.getItem("userId");
    
    if (!userId) {
      console.log("⚠️ No user logged in, skipping token refresh setup");
      return;
    }

    console.log("🕒 Token refresh manager started - will refresh every 50 seconds");

    // ✅ Refresh function that doesn't cause re-renders
    const refreshAccessToken = async () => {
      try {
        console.log(`🔄 [${new Date().toLocaleTimeString()}] Refreshing token...`);
        
        const res = await fetch("/api/refresh", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
        });

        if (!res.ok) {
          const errorData = await res.json();
          console.error("❌ Token refresh failed:", errorData.error);
          
          // Clear storage and redirect to login
          console.warn("⚠️ Session expired, logging out...");
          localStorage.clear();
          
          // Clear intervals before redirect
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          
          router.push("/login");
          return false;
        }

        const data = await res.json();
        console.log(`✅ [${new Date().toLocaleTimeString()}] Token refreshed successfully`);
        console.log(`   ⏱️  Next refresh in 50 seconds (token expires in ${data.expires_in}s)`);
        return true;
        
      } catch (err) {
        console.error("💥 Error during token refresh:", err);
        
        // Don't logout on network errors, just log and retry on next interval
        console.warn("⚠️ Network error during refresh, will retry in 50s");
        return false;
      }
    };

    // ✅ Initial refresh after 5 seconds (to verify everything works)
    timeoutRef.current = setTimeout(() => {
      console.log("🚀 Performing initial token refresh...");
      refreshAccessToken();
    }, 5000);

    // ✅ Set up interval to refresh every 50 seconds
    intervalRef.current = setInterval(() => {
      refreshAccessToken();
    }, 50000); // 50 seconds

    console.log("✅ Token refresh intervals set up successfully");

    // ✅ Cleanup function - IMPORTANT to prevent memory leaks
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        console.log("🛑 Token refresh interval cleared");
      }
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        console.log("🛑 Initial refresh timeout cleared");
      }
    };
  }, []); // ✅ Empty deps = runs once on mount, never re-runs

  // ✅ Return null - this component renders nothing
  return null;
}
