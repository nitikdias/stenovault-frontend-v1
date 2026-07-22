'use client';

import { useEffect, useState, useCallback, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from '../header/page';

function TodaysMeetingContent() {
  const [meetings, setMeetings] = useState([]);
  const [scheduledBots, setScheduledBots] = useState([]);
  const [autoJoinEnabled, setAutoJoinEnabled] = useState(true);
  const [defaultMeetingType, setDefaultMeetingType] = useState("InternalMeeting");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [needsGcalAuth, setNeedsGcalAuth] = useState(false);
  const [isConnectingGcal, setIsConnectingGcal] = useState(false);
  const [now, setNow] = useState(new Date());

  const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

  // Tick every second for countdown timers
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const getRedirectUri = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/todaysmeeting`;
    }
    return '/todaysmeeting';
  };

  // Check profile
  const checkProfile = async (uid) => {
    try {
      const res = await fetch(`/api/backend/check-profile?userId=${uid}`, {
        headers: {
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY
        },
      });
      const data = await res.json();
      if (!data.exists) {
        setNeedsLogin(true);
      }
    } catch (e) {
      console.error("Failed to check profile", e);
    }
  };



  // Load userId
  useEffect(() => {
    const storedId = localStorage.getItem("userId");
    if (storedId) {
      setUserId(storedId);
      checkProfile(storedId);
    }
  }, []);

  // Handle Google Calendar OAuth callback
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state");
    if (code && userId) {
      const exchangeToken = async () => {
        try {
          toast.info("Connecting Google Calendar...");
          const res = await fetch("/api/backend/gcal-exchange-token", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${TOKEN_KEY}`,
              "X-API-KEY": API_KEY,
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ userId, code, redirectUri: getRedirectUri() })
          });
          const data = await res.json();
          if (data.success) {
            toast.success("Google Calendar connected! Auto-join is active.");
            setNeedsGcalAuth(false);
            router.replace("/todaysmeeting");
            loadMeetings(userId);
          } else {
            toast.error("Failed to connect Google Calendar: " + (data.error || "Unknown error"));
          }
        } catch (e) {
          console.error("Token exchange error:", e);
          toast.error("Error connecting Google Calendar.");
        }
      };
      exchangeToken();
    }
  }, [userId, searchParams]);

  // Load meetings
  const loadMeetings = (uid) => {
    const id = uid || userId;
    if (!id) return;
    fetch(`/api/backend/online-meetings?userId=${id}`, {
      headers: { "Authorization": `Bearer ${TOKEN_KEY}`, "X-API-KEY": API_KEY },
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        if (data.needs_auth) {
          setNeedsGcalAuth(true);
          setMeetings([]);
        } else if (Array.isArray(data)) {
          setNeedsGcalAuth(false);
          setMeetings(data);
        } else {
          setMeetings([]);
        }
      })
      .catch(() => setMeetings([]));
  };

  // Load scheduled bots
  const loadScheduledBots = useCallback((uid) => {
    const id = uid || userId;
    if (!id) return;
    fetch(`/api/backend/scheduled-bots?userId=${id}`, {
      headers: { "Authorization": `Bearer ${TOKEN_KEY}`, "X-API-KEY": API_KEY }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setScheduledBots(data);
          // Auto-redirect if a bot just joined
          data.forEach(bot => {
            if (bot.status === "joined" && !sessionStorage.getItem(`emr_auto_started_${bot.id}`)) {
              sessionStorage.setItem(`emr_auto_started_${bot.id}`, "true");
              localStorage.setItem("emr_meeting_name", bot.meeting_name || "EMR Meeting");
              localStorage.setItem("emr_meeting_type", bot.meeting_type);
              localStorage.setItem("emr_auto_start", "true");
              localStorage.setItem("emr_bot_transcript", "true");
              localStorage.setItem("emr_skip_embeddings", "true");
              toast.success(`Bot joined! Starting session for ${bot.meeting_name}...`);
              if (bot.meeting_type === "MoM") router.push("/");
              else router.push("/Live");
            }
          });
        }
      })
      .catch(err => console.error("Failed to load scheduled bots:", err));
  }, [userId, TOKEN_KEY, API_KEY, router]);

  const loadPrefs = useCallback((uid) => {
    const id = uid || userId;
    if (!id) return;
    fetch(`/api/backend/auto-join-prefs?userId=${id}`, {
      headers: { "Authorization": `Bearer ${TOKEN_KEY}`, "X-API-KEY": API_KEY }
    })
      .then(res => res.json())
      .then(data => {
        if (data.default_meeting_type) setDefaultMeetingType(data.default_meeting_type);
      })
      .catch(() => { });
  }, [userId, TOKEN_KEY, API_KEY]);

  useEffect(() => {
    if (userId) {
      const code = searchParams.get("code");
      if (!code) {
        loadMeetings(userId);
        loadScheduledBots(userId);
        loadPrefs(userId);
      }
    }
  }, [userId]);

  // Poll scheduled bots for status updates every 10s
  useEffect(() => {
    if (!userId) return;
    const interval = setInterval(() => loadScheduledBots(userId), 10000);
    return () => clearInterval(interval);
  }, [userId, loadScheduledBots]);

  // Change default meeting type
  const changeMeetingType = async (type) => {
    setDefaultMeetingType(type);
    try {
      await fetch("/api/backend/auto-join-prefs", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId, defaultMeetingType: type })
      });
      toast.success(`Default meeting type set to ${type === "MoM" ? "MoM" : "Internal Meeting"}`);
    } catch {
      toast.error("Failed to update preference");
    }
  };

  // Cancel a scheduled bot
  const handleCancelBot = async (botId) => {
    try {
      const res = await fetch(`/api/backend/scheduled-bots/${botId}`, {
        method: "DELETE",
        headers: {
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      if (data.success) {
        toast.success("Bot cancelled for this meeting.");
        loadScheduledBots(userId);
      } else {
        toast.error(data.message || "Could not cancel.");
      }
    } catch {
      toast.error("Error cancelling bot.");
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  const handlePerformLogin = async () => {
    if (!userId) return;
    setIsLoggingIn(true);
    try {
      const res = await fetch("/api/backend/perform-login", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ userId })
      });
      const data = await res.json();
      
      if (data.status === "pending") {
        toast.info("Waiting for you to complete login in noVNC...");
        // Start polling
        const pollTimer = setInterval(async () => {
          try {
            const pollRes = await fetch(`/api/backend/login-status?userId=${userId}`, {
              headers: { "Authorization": `Bearer ${TOKEN_KEY}`, "X-API-KEY": API_KEY }
            });
            const pollData = await pollRes.json();
            
            if (pollData.status === "success") {
              clearInterval(pollTimer);
              toast.success("Login completed!");
              setNeedsLogin(false);
              setIsLoggingIn(false);
            } else if (pollData.status === "error") {
              clearInterval(pollTimer);
              toast.error("Login failed or timed out.");
              setIsLoggingIn(false);
            }
          } catch (e) {
            console.error("Poll error", e);
          }
        }, 2000);
      } else {
        toast.error("Login failed or timed out.");
        setIsLoggingIn(false);
      }
    } catch { 
      toast.error("Error connecting to server for login."); 
      setIsLoggingIn(false);
    }
  };

  const handleConnectGoogleCalendar = async () => {
    if (!userId) return;
    setIsConnectingGcal(true);
    try {
      const redirectUri = getRedirectUri();
      const res = await fetch(
        `/api/backend/gcal-auth-url?userId=${userId}&redirectUri=${encodeURIComponent(redirectUri)}`,
        { headers: { "Authorization": `Bearer ${TOKEN_KEY}`, "X-API-KEY": API_KEY } }
      );
      const data = await res.json();
      if (data.auth_url) { window.location.href = data.auth_url; }
      else { toast.error("Could not get authorization URL"); setIsConnectingGcal(false); }
    } catch {
      toast.error("Error connecting to server.");
      setIsConnectingGcal(false);
    }
  };

  // ──────────────────────────────────────────────────────────
  //  HELPERS
  // ──────────────────────────────────────────────────────────

  const handleBotLogin = async () => {
    try {
      const res = await fetch(`/api/backend/bot-login`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY
        }
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.info("Browser opened! Please sign in to Google and close the browser when done.");
      } else {
        toast.error("Failed to open login browser.");
      }
    } catch (err) {
      toast.error("Error opening login browser.");
    }
  };

  const handleManualJoin = async (meeting) => {
    try {
      console.log("➡️ Joining manually for meeting:", meeting.summary, meeting.meet_link);
      const payload = {
          userId: userId,
          userEmail: "", 
          meetingUrl: meeting.meet_link || "Unknown"
      };
      console.log("➡️ Payload to send:", payload);

      const res = await fetch(`/api/backend/manual-join`, {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY,
          "Content-Type": "application/json" 
        },
        body: JSON.stringify(payload)
      });
      
      console.log("➡️ Response status:", res.status);
      const data = await res.json();
      console.log("➡️ Response data:", data);

      if (res.ok && data.success) {
        toast.success(`Automation started for ${meeting.summary}! Browser will open shortly.`);
        const meetingType = defaultMeetingType || "InternalMeeting";
        
        // Set flags for /Live or / page to auto-start session and skip local mic
        localStorage.setItem("emr_meeting_name", meeting.summary || "EMR Meeting");
        localStorage.setItem("emr_meeting_type", meetingType);
        localStorage.setItem("emr_auto_start", "true");
        localStorage.setItem("emr_bot_transcript", "true");
        localStorage.setItem("emr_skip_embeddings", "true");
        
        if (meetingType === "MoM") {
            router.push("/");
        } else {
            router.push("/Live");
        }
      } else if (data.error === "bot_not_setup") {
        toast.error(
          <div>
            <p className="mb-2">Bot account not set up.</p>
            <button 
              onClick={handleBotLogin}
              className="px-3 py-1.5 bg-white text-red-600 rounded text-sm font-medium hover:bg-gray-50 transition-colors"
            >
              Link Google Account
            </button>
          </div>,
          { autoClose: false, closeOnClick: false }
        );
      } else {
        toast.error(`Failed to join: ${data.error || data.message || 'Unknown error'}`);
      }
    } catch (err) {
      console.error("➡️ Fetch error:", err);
      toast.error("Error connecting to server.");
    }
  };

  const getScheduledBot = (meetLink) => {
    return scheduledBots.find(
      b => b.meeting_url === meetLink && ["scheduled", "joining", "joined"].includes(b.status)
    );
  };

  const getCountdown = (dateStr) => {
    const target = new Date(dateStr);
    const diff = target - now;
    if (diff <= 0) return "Starting now...";
    const hours = Math.floor(diff / 3600000);
    const mins = Math.floor((diff % 3600000) / 60000);
    const secs = Math.floor((diff % 60000) / 1000);
    if (hours > 0) return `${hours}h ${mins}m`;
    if (mins > 0) return `${mins}m ${secs}s`;
    return `${secs}s`;
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "scheduled": return { bg: "bg-blue-500/20", text: "text-blue-400", border: "border-blue-500/30", dot: "bg-blue-400" };
      case "joining": return { bg: "bg-amber-500/20", text: "text-amber-400", border: "border-amber-500/30", dot: "bg-amber-400" };
      case "joined": return { bg: "bg-emerald-500/20", text: "text-emerald-400", border: "border-emerald-500/30", dot: "bg-emerald-400" };
      case "error": return { bg: "bg-red-500/20", text: "text-red-400", border: "border-red-500/30", dot: "bg-red-400" };
      default: return { bg: "bg-zinc-500/20", text: "text-zinc-400", border: "border-zinc-500/30", dot: "bg-zinc-400" };
    }
  };

  // Auto-redirect when a scheduled bot joins
  useEffect(() => {
    const joinedBot = scheduledBots.find(b => b.status === "joined");
    if (joinedBot) {
      localStorage.setItem("emr_meeting_name", joinedBot.meeting_name || "EMR Meeting");
      localStorage.setItem("emr_meeting_type", joinedBot.meeting_type);
      localStorage.setItem("emr_auto_start", "true");
      localStorage.setItem("emr_bot_transcript", "true");
      localStorage.setItem("emr_skip_embeddings", "true");

      toast.success(`Bot auto-joined: ${joinedBot.meeting_name}`);
      setTimeout(() => {
        if (joinedBot.meeting_type === "MoM") {
          router.push("/");
        } else {
          router.push("/Live");
        }
      }, 1500);
    }
  }, [scheduledBots]);

  return (
    <>
      <Header handleLogout={handleLogout} />

      <div
        className="min-h-screen font-sans"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)' }}
      >
        <main className="px-6 sm:px-10 py-10">
          <div className="max-w-6xl mx-auto">

            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
              <div>
                <h1 className="text-3xl font-bold text-white mb-1">
                  Today's Meetings
                </h1>
                <p className="text-zinc-400 text-sm">
                  Click 'Join Now' to have the bot join and transcribe your meeting
                </p>
              </div>

              {/* Controls */}
              {!needsGcalAuth && (
                <div className="flex items-center gap-4">
                  {/* Meeting type selector */}
                  <div className="flex items-center gap-2 bg-zinc-800/60 rounded-xl px-3 py-2 border border-zinc-700/50">
                    <span className="text-zinc-400 text-xs font-medium whitespace-nowrap">Type:</span>
                    <select
                      value={defaultMeetingType}
                      onChange={(e) => changeMeetingType(e.target.value)}
                      className="bg-transparent text-white text-sm font-medium border-none outline-none cursor-pointer"
                    >
                      <option value="InternalMeeting" className="bg-zinc-900">Internal Meeting</option>
                      <option value="MoM" className="bg-zinc-900">MoM</option>
                    </select>
                  </div>
                </div>
              )}
            </div>

            {/* Google Calendar Auth Banner */}
            {needsGcalAuth && (
              <div className="mb-6 rounded-2xl border border-yellow-700/50 bg-yellow-900/20 p-6 text-center">
                <div className="text-yellow-300 text-lg font-semibold mb-2">
                  📅 Connect Your Google Calendar
                </div>
                <p className="text-zinc-400 text-sm mb-4">
                  Connect your Google Calendar to see your upcoming meetings here.
                </p>
                <button
                  onClick={handleConnectGoogleCalendar}
                  disabled={isConnectingGcal || !userId}
                  className={`px-6 py-3 rounded-xl font-bold transition-all shadow-lg text-white ${isConnectingGcal
                      ? "bg-zinc-700 cursor-not-allowed opacity-70"
                      : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"
                    }`}
                >
                  {isConnectingGcal ? "Redirecting..." : "Connect Google Calendar"}
                </button>
              </div>
            )}

            {/* Meetings List */}
            {!needsGcalAuth && meetings.length === 0 ? (
              <div className="text-center py-16">
                <div className="text-5xl mb-4">📅</div>
                <p className="text-zinc-400 text-lg">No upcoming meetings found.</p>
                <p className="text-zinc-500 text-sm mt-1">
                  When you have meetings with Google Meet links, bots will be auto-scheduled here.
                </p>
              </div>
            ) : (
              <ul className="space-y-4">
                {meetings.map((m, idx) => {
                  const bot = getScheduledBot(m.meet_link);
                  const colors = bot ? getStatusColor(bot.status) : null;
                  const meetTime = new Date(m.start);
                  const isPast = meetTime < now;
                  const hasMeetLink = m.meet_link !== "No Meet Link";

                  return (
                    <li
                      key={idx}
                      className={`rounded-2xl border shadow-lg p-6 transition-all duration-300 ${bot
                          ? `${colors.border} bg-zinc-900/80`
                          : "border-zinc-800 bg-zinc-900/60"
                        }`}
                    >
                      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                        {/* Left: Meeting Info */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <p className="text-white text-xl font-semibold truncate">
                              {m.summary}
                            </p>
                            {!hasMeetLink && (
                              <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full whitespace-nowrap">
                                No Meet link
                              </span>
                            )}
                          </div>
                          <p className="text-zinc-400 text-sm">
                            {meetTime.toLocaleString()}
                          </p>

                          {/* Bot Status Badge */}
                          {bot && (
                            <div className={`mt-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm font-medium ${colors.bg} ${colors.text} border ${colors.border}`}>
                              {/* Animated dot */}
                              <span className="relative flex h-2.5 w-2.5">
                                {(bot.status === "scheduled" || bot.status === "joining") && (
                                  <span className={`animate-ping absolute inline-flex h-full w-full rounded-full ${colors.dot} opacity-75`} />
                                )}
                                <span className={`relative inline-flex rounded-full h-2.5 w-2.5 ${colors.dot}`} />
                              </span>

                              {bot.status === "scheduled" && (
                                <span>Auto-join in <strong>{getCountdown(bot.scheduled_at)}</strong></span>
                              )}
                              {bot.status === "joining" && (
                                <span className="animate-pulse">Bot is joining the meeting...</span>
                              )}
                              {bot.status === "joined" && (
                                <span>🎤 Bot is live & capturing captions</span>
                              )}
                              {bot.status === "error" && (
                                <span>Error: {bot.error_message || "Unknown"}</span>
                              )}
                            </div>
                          )}


                        </div>

                        {/* Right: Action Buttons */}
                        <div className="flex flex-col sm:flex-row gap-2 items-center shrink-0">
                          {/* Manual Join button */}
                          {hasMeetLink && (!bot || bot.status === "scheduled") && (
                            <button
                              onClick={() => handleManualJoin(m)}
                              className="bg-blue-600 hover:bg-blue-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all duration-200 flex items-center gap-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                              </svg>
                              Join Now
                            </button>
                          )}
                          {/* Cancel button for scheduled bots */}
                          {bot && bot.status === "scheduled" && (
                            <button
                              onClick={() => handleCancelBot(bot.id)}
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10 px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 border border-red-500/20 hover:border-red-500/40"
                            >
                              Skip this meeting
                            </button>
                          )}

                          {/* View Live when bot has joined */}
                          {bot && bot.status === "joined" && (
                            <button
                              onClick={() => {
                                localStorage.setItem("emr_meeting_name", bot.meeting_name || "EMR Meeting");
                                localStorage.setItem("emr_meeting_type", bot.meeting_type);
                                localStorage.setItem("emr_auto_start", "true");
                                localStorage.setItem("emr_bot_transcript", "true");
                                localStorage.setItem("emr_skip_embeddings", "true");
                                if (bot.meeting_type === "MoM") router.push("/");
                                else router.push("/Live");
                              }}
                              className="bg-emerald-600 hover:bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all duration-200 animate-pulse flex items-center gap-2"
                            >
                              <svg xmlns="http://www.w3.org/2000/svg" className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                              </svg>
                              View Live
                            </button>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </main>
      </div>

      {/* ===== Login Modal ===== */}
      {needsLogin && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-sm shadow-2xl text-center">
            <h2 className="text-xl font-bold text-white mb-3">
              Google Account Setup
            </h2>
            <p className="text-zinc-400 text-sm mb-6 leading-relaxed">
              We need to link your Google account so the automated bot can join meetings on your behalf.
              A browser window will open on the backend host when you click below.
            </p>
            <button
              onClick={handlePerformLogin}
              disabled={isLoggingIn}
              className={`w-full py-3 rounded-xl font-bold transition-all shadow-lg text-white ${isLoggingIn
                  ? "bg-zinc-700 cursor-not-allowed opacity-70"
                  : "bg-blue-600 hover:bg-blue-500 shadow-blue-500/20"
                }`}
            >
              {isLoggingIn ? "Waiting for Login..." : "Open Log In Window"}
            </button>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" />
    </>
  );
}

export default function TodaysMeetingPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TodaysMeetingContent />
    </Suspense>
  );
}
