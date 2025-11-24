"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

export default function TokenRefreshManager() {
  const router = useRouter();
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const failureCountRef = useRef(0); // ✅ Track consecutive failures

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
          failureCountRef.current += 1;
          const errorData = await res.json();
          console.error(`❌ Token refresh failed (attempt ${failureCountRef.current}):`, errorData.error);
          
          // ✅ Only logout after 3 consecutive failures
          if (failureCountRef.current >= 3) {
            console.error("❌ 3 consecutive refresh failures, logging out...");
            localStorage.clear();
            
            // Clear intervals before redirect
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            
            router.push("/login");
          } else {
            console.warn(`⚠️ Will retry on next interval (${3 - failureCountRef.current} attempts remaining)`);
          }
          return false;
        }

        // ✅ Reset failure count on success
        if (failureCountRef.current > 0) {
          console.log(`✅ Refresh recovered after ${failureCountRef.current} failures`);
        }
        failureCountRef.current = 0;

        const data = await res.json();
        console.log(`✅ [${new Date().toLocaleTimeString()}] Token refreshed successfully`);
        console.log(`   ⏱️  Next refresh in 50 seconds (token expires in ${data.expires_in}s)`);
        return true;
        
      } catch (err) {
        failureCountRef.current += 1;
        console.error(`💥 Error during token refresh (attempt ${failureCountRef.current}):`, err);
        
        // ✅ Only logout after 3 consecutive failures
        if (failureCountRef.current >= 3) {
          console.error("❌ 3 consecutive refresh failures, logging out...");
          localStorage.clear();
          
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          
          router.push("/login");
        } else {
          console.warn(`⚠️ Network error, will retry in 50s (${3 - failureCountRef.current} attempts remaining)`);
        }
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
