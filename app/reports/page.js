'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Header from '../header/page';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ;

export default function Reports() {
  const [meetings, setMeetings] = useState([]);
  const [editingNameId, setEditingNameId] = useState(null);
  const [newMeetingName, setNewMeetingName] = useState('');
  const router = useRouter();
  const pathname = usePathname();

  const loadMeetings = () => {
    const userId = localStorage.getItem("userId");
    if (!userId) return;
    fetch(`${API_BASE_URL}/meetings?user_id=${userId}`)
      .then(res => res.json())
      .then(data => setMeetings(data));
  };

  useEffect(() => {
    loadMeetings();
  }, []);

  const handleDelete = (id) => {
    fetch(`${API_BASE_URL}/meetings/${id}`, { method: 'DELETE' })
      .then(() => loadMeetings());
  };

  const handleEditMeetingName = (id, currentName) => {
    setEditingNameId(id);
    setNewMeetingName(currentName);
  };

  const handleSaveMeetingName = (id) => {
    fetch(`${API_BASE_URL}/meetings/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name: newMeetingName })
    }).then(() => {
      setEditingNameId(null);
      loadMeetings();
    });
  };

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <>
      <Header handleLogout={handleLogout} />
      <div className="min-h-screen font-sans overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <main className="flex-1 px-6 sm:px-10 py-10 overflow-auto ml-0 md:ml-5">
          <div className="w-full max-w-5xl mx-auto">
            <h2 className="text-3xl font-bold text-white mb-6">Reports</h2>
            {meetings.length === 0 ? (
              <p className="text-zinc-400 text-center py-8">No meetings found.</p>
            ) : (
              <ul className="space-y-4">
                {meetings.map((m) => (
                  <li key={m.id} className="rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm shadow p-6 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
                    {editingNameId === m.id ? (
                      <div className="flex items-center gap-3 flex-1">
                        <input
                          type="text"
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
                      <div className="flex items-center gap-3 flex-1 mb-3 md:mb-0 mr-5">
                        <span className="text-white font-semibold text-xl flex-grow select-text truncate">{m.name}</span>
                        <button
                          onClick={() => handleEditMeetingName(m.id, m.name)}
                          className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                        >
                          Edit
                        </button>
                      </div>
                    )}
                    <div className="flex gap-4 flex-wrap">
                      <button
                        onClick={() => router.push(`/view?id=${m.id}`)}
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
