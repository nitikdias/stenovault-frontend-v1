'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import Header from '../header/page';

export default function BotStatusPage() {
  const [meetingInfo, setMeetingInfo] = useState(null);
  const [status, setStatus] = useState('connecting');
  const router = useRouter();

  useEffect(() => {
    // Load bot meeting info from localStorage
    const storedMeeting = localStorage.getItem("botMeeting");
    if (storedMeeting) {
      const meeting = JSON.parse(storedMeeting);
      setMeetingInfo(meeting);
      setStatus(meeting.status || 'running');
    } else {
      // No bot meeting found, redirect back
      router.push('/todaysmeeting');
    }
  }, [router]);

  const handleStopBot = async () => {
    try {
      toast.info("Stopping bot...");

      // Call API to stop bot (we'll need to implement this)
      const stopRes = await fetch("/api/bot/stop", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          processId: meetingInfo?.botProcessId
        }),
      });

      if (stopRes.ok) {
        toast.success("Bot stopped successfully");
        localStorage.removeItem("botMeeting");
        router.push('/todaysmeeting');
      } else {
        toast.error("Failed to stop bot");
      }
    } catch (error) {
      console.error("Error stopping bot:", error);
      toast.error("Error stopping bot");
    }
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'running': return 'text-green-400';
      case 'connecting': return 'text-yellow-400';
      case 'error': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'running': return '🟢';
      case 'connecting': return '🟡';
      case 'error': return '🔴';
      default: return '⚪';
    }
  };

  if (!meetingInfo) {
    return (
      <>
        <Header handleLogout={handleLogout} />
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 to-slate-800">
          <div className="text-white">Loading...</div>
        </div>
      </>
    );
  }

  return (
    <>
      <Header handleLogout={handleLogout} />
      <div className="min-h-screen font-sans overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <main className="flex-1 px-6 sm:px-10 py-10 overflow-auto ml-0 md:ml-5">
          <div className="w-full max-w-4xl mx-auto">
            <div className="mb-6">
              <button
                onClick={() => router.push('/todaysmeeting')}
                className="text-zinc-400 hover:text-white transition mb-4"
              >
                ← Back to Today's Meetings
              </button>
              <h1 className="text-3xl font-bold text-white">Bot Status</h1>
            </div>

            <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm shadow p-8">
              <div className="flex items-center gap-4 mb-6">
                <div className="text-4xl">{getStatusIcon(status)}</div>
                <div>
                  <h2 className="text-2xl font-semibold text-white">{meetingInfo.name}</h2>
                  <p className={`text-lg ${getStatusColor(status)}`}>
                    Status: {status.charAt(0).toUpperCase() + status.slice(1)}
                  </p>
                </div>
              </div>

              <div className="space-y-4 mb-8">
                <div className="flex justify-between">
                  <span className="text-zinc-400">Meeting URL:</span>
                  <a
                    href={meetingInfo.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-400 hover:text-blue-300 transition"
                  >
                    {meetingInfo.url}
                  </a>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Start Time:</span>
                  <span className="text-white">
                    {new Date(meetingInfo.startTime).toLocaleString()}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-400">Bot Process ID:</span>
                  <span className="text-zinc-300 font-mono">
                    {meetingInfo.botProcessId || 'N/A'}
                  </span>
                </div>
              </div>

              <div className="bg-zinc-800/50 rounded-lg p-6 mb-6">
                <h3 className="text-lg font-semibold text-white mb-3">What the Bot is Doing:</h3>
                <ul className="space-y-2 text-zinc-300">
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Joining the Google Meet meeting
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Monitoring active speakers in real-time
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Recording audio chunks with speaker labels
                  </li>
                  <li className="flex items-center gap-2">
                    <span className="text-green-400">✓</span>
                    Streaming audio to your Flask backend for processing
                  </li>
                </ul>
              </div>

              <div className="flex gap-4">
                <button
                  onClick={handleStopBot}
                  className="bg-red-600 hover:bg-red-700 text-white px-6 py-3 rounded-lg font-semibold transition"
                >
                  Stop Bot
                </button>
                <button
                  onClick={() => router.push('/meetings')}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-semibold transition"
                >
                  View Recordings
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
      <ToastContainer position="bottom-right" />
    </>
  );
}