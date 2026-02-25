'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from '../header/page';

export default function TodaysMeetingPage() {
  const [meetings, setMeetings] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const router = useRouter();
  const searchParams = useSearchParams();
  const [userId, setUserId] = useState(null);
  const [needsLogin, setNeedsLogin] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [needsGcalAuth, setNeedsGcalAuth] = useState(false);
  const [isConnectingGcal, setIsConnectingGcal] = useState(false);
  const [botJoining, setBotJoining] = useState(false);
  const [botStatusMsg, setBotStatusMsg] = useState("");
  const [pendingMeetingType, setPendingMeetingType] = useState(null);

  const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

  // The redirect URI used for Google Calendar OAuth — must match exactly
  const getRedirectUri = () => {
    if (typeof window !== "undefined") {
      return `${window.location.origin}/todaysmeeting`;
    }
    return "http://localhost:3000/todaysmeeting";
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
  // When user returns from Google consent, the URL will have ?code=xxx&state=userId
  useEffect(() => {
    const code = searchParams.get("code");
    const state = searchParams.get("state"); // this is the userId we passed

    if (code && userId) {
      // Exchange the authorization code for tokens
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
            body: JSON.stringify({
              userId,
              code,
              redirectUri: getRedirectUri()
            })
          });

          const data = await res.json();

          if (data.success) {
            toast.success("Google Calendar connected!");
            setNeedsGcalAuth(false);
            // Clean URL params and reload meetings
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

  // Load meetings for the logged-in user
  const loadMeetings = (uid) => {
    const id = uid || userId;
    if (!id) return;

    fetch(`/api/backend/online-meetings?userId=${id}`, {
      headers: {
        "Authorization": `Bearer ${TOKEN_KEY}`,
        "X-API-KEY": API_KEY
      },
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        // Check if the response indicates user needs Google Calendar auth
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

  useEffect(() => {
    if (userId) {
      // Don't load meetings if we're in the middle of an OAuth callback
      const code = searchParams.get("code");
      if (!code) {
        loadMeetings(userId);
      }
    }
  }, [userId]);

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
      if (data.success) {
        toast.success("Login completed!");
        setNeedsLogin(false);
      } else {
        toast.error("Login failed or timed out.");
      }
    } catch (e) {
      toast.error("Error connecting to server for login.");
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Connect Google Calendar — redirect user to Google OAuth consent page
  const handleConnectGoogleCalendar = async () => {
    if (!userId) return;
    setIsConnectingGcal(true);

    try {
      const redirectUri = getRedirectUri();
      const res = await fetch(
        `/api/backend/gcal-auth-url?userId=${userId}&redirectUri=${encodeURIComponent(redirectUri)}`,
        {
          headers: {
            "Authorization": `Bearer ${TOKEN_KEY}`,
            "X-API-KEY": API_KEY
          }
        }
      );
      const data = await res.json();

      if (data.auth_url) {
        // Redirect the user to Google's consent screen
        window.location.href = data.auth_url;
      } else {
        toast.error("Could not get authorization URL: " + (data.error || "Unknown error"));
        setIsConnectingGcal(false);
      }
    } catch (e) {
      console.error("Error getting auth URL:", e);
      toast.error("Error connecting to server.");
      setIsConnectingGcal(false);
    }
  };

  // Final join API
  const handleJoinMeeting = async (meetingType) => {
    if (!userId || !selectedMeeting) return;

    const meetingSummary = selectedMeeting.summary;
    const meetLink = selectedMeeting.meet_link;

    // Close the meeting-type modal and show the bot-joining popup
    setSelectedMeeting(null);
    setBotJoining(true);
    setBotStatusMsg("Starting automation bot...");
    setPendingMeetingType(meetingType);

    try {
      const res = await fetch("/api/backend/join-meet", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${TOKEN_KEY}`,
          "X-API-KEY": API_KEY,
          "Content-Type": "application/json"
        },
        credentials: "include",
        body: JSON.stringify({
          userId,
          meetingName: meetingSummary,
          meetLink: meetLink,
          meetingType
        })
      });

      if (!res.ok) throw new Error("Join request failed");

      // Store meeting context for the recording page
      localStorage.setItem("emr_meeting_name", meetingSummary || "EMR Meeting");
      localStorage.setItem("emr_meeting_type", meetingType);
      localStorage.setItem("emr_auto_start", "true");
      localStorage.setItem("emr_bot_transcript", "true");
      localStorage.setItem("emr_skip_embeddings", "true");

      // Poll bot status until "joined" or "error"
      const pollInterval = setInterval(async () => {
        try {
          const statusRes = await fetch(`/api/backend/bot-status?userId=${userId}`, {
            headers: {
              "Authorization": `Bearer ${TOKEN_KEY}`,
              "X-API-KEY": API_KEY
            }
          });
          const statusData = await statusRes.json();
          setBotStatusMsg(statusData.message || statusData.status);

          if (statusData.status === "joined") {
            clearInterval(pollInterval);
            setBotJoining(false);
            toast.success("Bot joined and capturing captions!");

            // Redirect to correct recording page
            if (meetingType === "MoM") {
              router.push("/");
            } else {
              router.push("/Live");
            }
          } else if (statusData.status === "error") {
            clearInterval(pollInterval);
            setBotJoining(false);
            toast.error("Bot error: " + (statusData.message || "Unknown error"));
          }
        } catch (e) {
          console.error("Status poll error:", e);
        }
      }, 2000);

      // Safety timeout: stop polling after 3 minutes
      setTimeout(() => {
        clearInterval(pollInterval);
        setBotJoining((prev) => {
          if (prev) {
            toast.warning("Bot is taking longer than expected. Redirecting...");
            if (meetingType === "MoM") {
              router.push("/");
            } else {
              router.push("/Live");
            }
          }
          return false;
        });
      }, 180000);

    } catch {
      setBotJoining(false);
      toast.error("Unable to join meeting. Is the backend running?");
    }
  };

  return (
    <>
      <Header handleLogout={handleLogout} />

      <div
        className="min-h-screen font-sans"
        style={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)'
        }}
      >
        <main className="px-6 sm:px-10 py-10">
          <div className="max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">
              Today's Meetings
            </h1>

            {/* Google Calendar Authorization Banner */}
            {needsGcalAuth && (
              <div className="mb-6 rounded-2xl border border-yellow-700/50 bg-yellow-900/20 p-6 text-center">
                <div className="text-yellow-300 text-lg font-semibold mb-2">
                  📅 Connect Your Google Calendar
                </div>
                <p className="text-zinc-400 text-sm mb-4">
                  To see your upcoming meetings, please authorize access to your Google Calendar.
                  This is a one-time setup for your account.
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

            {!needsGcalAuth && meetings.length === 0 ? (
              <p className="text-zinc-400 text-center py-8">
                No meetings found.
              </p>
            ) : (
              <ul className="space-y-4">
                {meetings.map((m, idx) => (
                  <li
                    key={idx}
                    className="rounded-2xl border border-zinc-800 bg-zinc-900/60 shadow p-6 flex flex-col md:flex-row justify-between items-center gap-4"
                  >
                    <div>
                      <p className="text-white text-xl font-semibold">
                        {m.summary}
                      </p>
                      <p className="text-zinc-400 text-sm">
                        {new Date(m.start).toLocaleString()}
                      </p>
                    </div>

                    {m.meet_link !== "No Meet Link" && (
                      <button
                        disabled={!userId}
                        onClick={() => setSelectedMeeting(m)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold disabled:opacity-50"
                      >
                        Join Meeting
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>

      {/* ===== Modal Popup ===== */}
      {selectedMeeting && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 w-[320px] shadow-xl text-center">
            <h2 className="text-xl font-bold text-white mb-6">
              Select Meeting Type
            </h2>

            <button
              onClick={() => handleJoinMeeting("MoM")}
              className="w-full mb-3 bg-blue-600 hover:bg-blue-700 text-white py-2 rounded-lg font-semibold"
            >
              MoM
            </button>

            <button
              onClick={() => handleJoinMeeting("InternalMeeting")}
              className="w-full mb-4 bg-green-600 hover:bg-green-700 text-white py-2 rounded-lg font-semibold"
            >
              Internal Meeting
            </button>

            <button
              onClick={() => setSelectedMeeting(null)}
              className="text-zinc-400 hover:text-white text-sm"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* ===== Login Modal Popup ===== */}
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

      {/* ===== Bot Joining Popup ===== */}
      {botJoining && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl p-8 max-w-sm shadow-2xl text-center">
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin" />
            </div>
            <h2 className="text-xl font-bold text-white mb-3">
              Bot is Joining...
            </h2>
            <p className="text-zinc-400 text-sm mb-2 leading-relaxed">
              Please wait while the bot joins your meeting and starts capturing captions.
            </p>
            <p className="text-blue-400 text-sm font-medium animate-pulse">
              {botStatusMsg}
            </p>
          </div>
        </div>
      )}

      <ToastContainer position="bottom-right" />
    </>
  );
}
