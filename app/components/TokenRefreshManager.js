"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function TokenRefreshManager() {
  const router = useRouter();
  const timeoutRef = useRef(null);
  const failureCountRef = useRef(0);
  const [isReady, setIsReady] = useState(false);

  // Check for user login periodically
  useEffect(() => {
    if (typeof window === 'undefined') return;

    console.log("🔍 TokenRefreshManager mounted - checking for logged in user...");

    const checkUserLogin = () => {
      const userId = localStorage.getItem("userId");
      
      // If userId exists, user is logged in
      const isLoggedIn = !!userId;
      
      console.log(`🔍 Login check: userId=${isLoggedIn ? '✓' : '✗'}, isReady=${isReady}`);
      
      if (isLoggedIn && !isReady) {
        console.log("✅ User logged in detected, starting token refresh manager");
        setIsReady(true);
      } else if (!isLoggedIn && isReady) {
        console.log("⚠️ User logged out, stopping token refresh manager");
        setIsReady(false);
      }
    };

    // Check immediately
    checkUserLogin();

    // Check every 1 second for login state changes
    const checkInterval = setInterval(checkUserLogin, 1000);

    return () => {
      console.log("🧹 TokenRefreshManager login checker cleanup");
      clearInterval(checkInterval);
    };
  }, [isReady]);

  useEffect(() => {
    if (!isReady) {
      console.log("⚠️ Token refresh manager waiting for active session...");
      return;
    }

    console.log("🕒 Token refresh manager started - first refresh in 50 seconds after login");

    // ✅ Refresh function that doesn't cause re-renders
    const refreshAccessToken = async () => {
      const timestamp = new Date().toLocaleTimeString();
      try {
        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`🔄 [${timestamp}] CALLING /api/refresh endpoint...`);
        console.log(`   User ID: ${localStorage.getItem("userId")}`);
        console.log(`   (session_id cookie sent automatically via credentials: 'include')`);
        
        const res = await fetch("/api/refresh", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            'X-API-KEY': process.env.NEXT_PUBLIC_API_KEY || "",
          },
        });
        
        console.log(`📡 [${timestamp}] Response received: ${res.status} ${res.statusText}`);

        if (!res.ok) {
          failureCountRef.current += 1;
          const errorData = await res.json().catch(() => ({ error: 'Unknown error' }));
          console.error(`❌ [${timestamp}] Token refresh FAILED (attempt ${failureCountRef.current}/3)`);
          console.error(`   Status: ${res.status}`);
          console.error(`   Error: ${errorData.error}`);
          console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
          
          // ✅ If 401 (tokens missing from Redis), logout immediately
          if (res.status === 401) {
            console.error("❌ Session expired (tokens not in Redis), logging out immediately...");
            localStorage.clear();
            // Notify UserContext that session expired
            window.dispatchEvent(new Event('userUpdated'));
            
            // Clear timeout before redirect
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            
            router.push("/login");
            return false;
          }
          
          // ✅ For other errors, retry up to 3 times
          if (failureCountRef.current >= 3) {
            console.error("❌ 3 consecutive refresh failures, logging out...");
            localStorage.clear();
            // Notify UserContext that session expired
            window.dispatchEvent(new Event('userUpdated'));
            
            // Clear timeout before redirect
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
        console.log(`✅ [${timestamp}] Token refreshed successfully!`);
        console.log(`   Token expires in: ${data.expires_in}s`);
        console.log(`   Refreshed at: ${data.refreshed_at}`);
        console.log(`   ⏱️  Next refresh scheduled in: 50 seconds`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        return true;
        
      } catch (err) {
        failureCountRef.current += 1;
        const timestamp = new Date().toLocaleTimeString();
        console.error(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.error(`💥 [${timestamp}] NETWORK ERROR during token refresh (attempt ${failureCountRef.current}/3)`);
        console.error(`   Error type: ${err.name}`);
        console.error(`   Error message: ${err.message}`);
        console.error(`   Stack: ${err.stack?.substring(0, 200)}...`);
        console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`);
        
        // ✅ Only logout after 3 consecutive failures
        if (failureCountRef.current >= 3) {
          console.error("❌ 3 consecutive refresh failures, logging out...");
          localStorage.clear();
          // Notify UserContext that session expired
          window.dispatchEvent(new Event('userUpdated'));
          
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          
          router.push("/login");
        } else {
          console.warn(`⚠️ Network error, will retry in 50 seconds (${3 - failureCountRef.current} attempts remaining)`);
        }
        return false;
      }
    };

    // ✅ Recursive refresh function that schedules the next refresh after completion
    const scheduleNextRefresh = async () => {
      const success = await refreshAccessToken();
      
      // Schedule next refresh in 50 seconds regardless of success/failure
      // (failure handling already logs user out after 3 attempts)
      timeoutRef.current = setTimeout(() => {
        console.log("\n⏰ ════════════════════════════════════");
        console.log("🔁 SCHEDULED TOKEN REFRESH TRIGGERED (every 50s)");
        console.log("════════════════════════════════════\n");
        scheduleNextRefresh();
      }, 50000);
    };

    // ✅ Initial refresh after 50 seconds (before token expires at 60s)
    timeoutRef.current = setTimeout(() => {
      console.log("\n⏰ ════════════════════════════════════");
      console.log("🚀 INITIAL TOKEN REFRESH TRIGGERED (after 50s)");
      console.log("════════════════════════════════════\n");
      scheduleNextRefresh();
    }, 50000); // 50 seconds

    console.log("\n┌────────────────────────────────────────────────────┐");
    console.log("│ ✅ Token Refresh Manager Initialized               │");
    console.log("│                                                    │");
    console.log("│ ⏱️  Refresh Interval: Every 50 seconds             │");
    console.log("│ 🕒 Token Expiry: 60 seconds                        │");
    console.log("│ 🛡️ Safety Margin: 10 seconds                       │");
    console.log("│ 📍 First refresh in: 50 seconds                    │");
    console.log("└────────────────────────────────────────────────────┘\n");

    // ✅ Cleanup function - IMPORTANT to prevent memory leaks
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        console.log("🛑 Token refresh timeout cleared");
      }
    };
  }, [isReady, router]); // ✅ Re-run when session state changes

  // ✅ Return null - this component renders nothing
  return null;
}
