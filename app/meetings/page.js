'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Header from '../header/page';

export default function MeetingsPage() {
  const [meetings, setMeetings] = useState([]);
  const [editingNameId, setEditingNameId] = useState(null);
  const [newMeetingName, setNewMeetingName] = useState('');
  const router = useRouter();

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  // Load meetings list
  // Load meetings list
const loadMeetings = () => {
  const userId = localStorage.getItem("userId"); 
  if (!userId) {
    console.error("No userId found in localStorage");
    setMeetings([]);
    return;
  }

  const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
  const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

  fetch(`/api/backend/meetings?user_id=${userId}`, {
    headers: {
      "Authorization": `Bearer ${TOKEN_KEY}`,
      "X-API-KEY": API_KEY
    },
    credentials: "include"
  })
    .then(res => res.json())
    .then(data => {
      // Handle both array response and error object with meetings array
      if (Array.isArray(data)) {
        setMeetings(data);
      } else if (data.meetings && Array.isArray(data.meetings)) {
        setMeetings(data.meetings);
      } else {
        console.error('Invalid meetings data:', data);
        setMeetings([]);
      }
    })
    .catch(err => {
      console.error('Error fetching meetings:', err);
      setMeetings([]);
    });
};


  useEffect(() => {
    loadMeetings();
  }, []);

  // View meeting details
  const handleView = (id) => {
    // Navigate to a separate page for viewing the meeting
    router.push(`/meetings/${id}`);
  };

  // Delete meeting
  const handleDelete = (id) => {
    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

    fetch(`/api/backend/meetings/${id}`, {
      method: 'DELETE',
      headers: {
        "Authorization": `Bearer ${TOKEN_KEY}`,
        "X-API-KEY": API_KEY
      },
      credentials: "include"
    })
      .then(() => {
        loadMeetings();
      });
  };

  // Edit meeting name
  const handleEditMeetingName = (id, currentName) => {
    setEditingNameId(id);
    setNewMeetingName(currentName);
  };

  const handleSaveMeetingName = (id) => {
    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

    fetch(`/api/backend/meetings/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        "Authorization": `Bearer ${TOKEN_KEY}`,
        "X-API-KEY": API_KEY
      },
      credentials: "include",
      body: JSON.stringify({ name: newMeetingName })
    })
      .then(() => {
        setEditingNameId(null);
        loadMeetings();
      })
      .catch(err => console.error('Error updating meeting name:', err));
  };

  return (
    <>
      <Header handleLogout={handleLogout} />
      <div className="min-h-screen font-sans overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <main className="flex-1 px-6 sm:px-10 py-10 overflow-auto ml-0 md:ml-5">
          <div className="w-full max-w-6xl mx-auto">
            <h1 className="text-3xl font-bold text-white mb-6">Meetings</h1>

            {meetings.length === 0 ? (
              <p className="text-zinc-400 text-center py-8">No meetings yet.</p>
            ) : (
              <ul className="space-y-4">
                {meetings.map(m => (
                  <li key={m.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm shadow p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    {editingNameId === m.id ? (
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          value={newMeetingName}
                          onChange={(e) => setNewMeetingName(e.target.value)}
                          className="flex-1 px-4 py-2 rounded-lg bg-zinc-800 border border-zinc-700 text-white focus:outline-none focus:ring-2 focus:ring-violet-600"
                        />
                        <button
                          onClick={() => handleSaveMeetingName(m.id)}
                          className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingNameId(null)}
                          className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-2 rounded-lg font-semibold transition"
                        >
                          Cancel
                        </button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 flex-1">
                        <span className="text-white font-semibold text-xl flex-grow">{m.name}</span>
                        <button
                          onClick={() => handleEditMeetingName(m.id, m.name)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                        >
                          Edit Name
                        </button>
                      </div>
                    )}

                    <div className="flex gap-4 flex-wrap">
                      <button
                        onClick={() => handleView(m.id)}
                        className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                      >
                        View
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="bg-rose-600 hover:bg-rose-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                      >
                        Delete
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
