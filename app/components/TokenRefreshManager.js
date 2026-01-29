"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

export default function TokenRefreshManager() {
  console.log("🏁 TokenRefreshManager: Component render started");
  
  const router = useRouter();
  const intervalRef = useRef(null);
  const timeoutRef = useRef(null);
  const failureCountRef = useRef(0);
  const isRefreshingRef = useRef(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  console.log("📍 TokenRefreshManager: Component body executing, isAuthenticated:", isAuthenticated);

  useEffect(() => {
    console.log("🔍 TokenRefreshManager: useEffect triggered, isAuthenticated:", isAuthenticated);
    
    if (typeof window === 'undefined') {
      console.log("❌ Not running on client side, skipping");
      return;
    }

    const hasSessionCookie = () => {
      const cookies = document.cookie.split(';');
      console.log("🍪 All cookies:", cookies);
      return cookies.some(cookie => cookie.trim().startsWith('session_id='));
    };

    const checkAuth = () => {
      const userId = localStorage.getItem("userId");
      const hasSession = hasSessionCookie();
      
      console.log("📊 User state check:");
      console.log("   userId:", userId);
      console.log("   hasSession:", hasSession);
      
      return !!(userId && hasSession);
    };

    // ✅ Check auth state immediately
    const initialAuth = checkAuth();
    console.log("✅ Initial auth check:", initialAuth);
    
    // ✅ If not authenticated, set up a polling check every 2 seconds to detect login
    if (!initialAuth) {
      console.log("⚠️ No active session yet, will check every 2s for login...");
      
      const authCheckInterval = setInterval(() => {
        console.log("🔄 Checking for auth state change...");
        const nowAuth = checkAuth();
        if (nowAuth) {
          console.log("✅ User logged in! Setting up token refresh...");
          clearInterval(authCheckInterval);
          setIsAuthenticated(true);
        }
      }, 2000);
      
      return () => {
        clearInterval(authCheckInterval);
        console.log("🛑 Auth check interval cleared");
      };
    }
    
    // ✅ If already authenticated, set up refresh timers immediately
    console.log("✅ User already authenticated, setting up token refresh...");

    console.log("🕒 Token refresh manager started");
    console.log("   📅 Refresh schedule: Every 45 seconds");
    console.log("   ⏰ Token expiry: 60 seconds");
    console.log("   🛡️ Safety buffer: 15 seconds");

    const refreshAccessToken = async () => {
      console.log(`\n========== REFRESH TOKEN ATTEMPT ==========`);
      console.log(`Time: ${new Date().toLocaleTimeString()}`);
      console.log(`Timestamp: ${new Date().toISOString()}`);
      
      if (isRefreshingRef.current) {
        console.log("⏭️ Skipping refresh - already in progress");
        return false;
      }

      isRefreshingRef.current = true;
      console.log("🔓 Lock acquired - starting refresh");

      try {
        console.log(`🔄 Calling /api/refresh endpoint...`);
        console.log(`   URL: ${window.location.origin}/api/refresh`);
        console.log(`   Method: POST`);
        console.log(`   Credentials: include`);
        console.log(`   Cookies before request:`, document.cookie);
        
        const res = await fetch("/api/refresh", {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "X-API-KEY": process.env.NEXT_PUBLIC_API_KEY || ""
          },
        });
        
        console.log(`📥 Response received from /api/refresh:`);
        console.log(`   Status: ${res.status} ${res.statusText}`);
        console.log(`   Headers:`, Object.fromEntries(res.headers.entries()));

        if (!res.ok) {
          failureCountRef.current += 1;
          const errorData = await res.json();
          console.error(`❌ Token refresh failed (attempt ${failureCountRef.current}):`, errorData.error);
          
          if (failureCountRef.current >= 3) {
            console.error("❌ 3 consecutive refresh failures, logging out...");
            localStorage.clear();
            if (intervalRef.current) clearInterval(intervalRef.current);
            if (timeoutRef.current) clearTimeout(timeoutRef.current);
            isRefreshingRef.current = false;
            router.push("/login");
          } else {
            console.warn(`⚠️ Will retry on next interval (${3 - failureCountRef.current} attempts remaining)`);
            isRefreshingRef.current = false;
          }
          return false;
        }

        if (failureCountRef.current > 0) {
          console.log(`✅ Refresh recovered after ${failureCountRef.current} failures`);
        }
        failureCountRef.current = 0;

        const data = await res.json();
        console.log(`✅ [${new Date().toLocaleTimeString()}] Token refreshed successfully`);
        console.log(`   ⏱️  Next refresh in 45 seconds`);
        console.log(`   🔒 Session valid until: ${new Date(Date.now() + (data.expires_in * 1000)).toLocaleTimeString()}`);
        
        isRefreshingRef.current = false;
        return true;
        
      } catch (err) {
        failureCountRef.current += 1;
        console.error(`💥 Error during token refresh (attempt ${failureCountRef.current}):`, err);
        
        if (failureCountRef.current >= 3) {
          console.error("❌ 3 consecutive refresh failures, logging out...");
          localStorage.clear();
          if (intervalRef.current) clearInterval(intervalRef.current);
          if (timeoutRef.current) clearTimeout(timeoutRef.current);
          isRefreshingRef.current = false;
          router.push("/login");
        } else {
          console.warn(`⚠️ Will retry on next interval (${3 - failureCountRef.current} attempts remaining)`);
          isRefreshingRef.current = false;
        }
        return false;
      }
    };

    console.log("⏰ Setting up timers...");
    
    timeoutRef.current = setTimeout(() => {
      console.log("🚀 ===== INITIAL REFRESH TIMER FIRED =====");
      console.log("   Time elapsed: 10 seconds since component mount");
      refreshAccessToken();
    }, 10000);
    console.log("   ✓ Initial refresh timer set (10s)");

    intervalRef.current = setInterval(() => {
      console.log("🔁 ===== INTERVAL REFRESH TIMER FIRED =====");
      refreshAccessToken();
    }, 45000);
    console.log("   ✓ Interval timer set (45s)");

    console.log("✅ Token refresh intervals set up successfully");
    console.log("   ⏰ First refresh: 10 seconds from now");
    console.log("   🔁 Then every: 45 seconds");
    console.log("==========================================\n");

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
  }, [router, isAuthenticated]);

  return null;
}
