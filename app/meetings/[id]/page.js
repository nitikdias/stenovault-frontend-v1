'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Header from '../../header/page';

export default function MeetingDetailPage() {
  const params = useParams();
  const router = useRouter();
  const meetingId = params.id;

  const [selectedData, setSelectedData] = useState({
    transcript: '',
    translation: '',
    summary: '',
    key_points: '',
    actions: ''
  });
  const [transcriptId, setTranscriptId] = useState(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState({});
  const [loading, setLoading] = useState(true);

  const handleLogout = async () => {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/login');
  };

  useEffect(() => {
    if (!meetingId) return;

    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

    fetch(`/api/backend/meetings/${meetingId}/transcript`, {
      headers: {
        "Authorization": `Bearer ${TOKEN_KEY}`,
        "X-API-KEY": API_KEY
      },
      credentials: "include"
    })
      .then(res => res.json())
      .then(data => {
        setTranscriptId(data.id);
        setSelectedData({
          transcript: data.transcript || '',
          translation: data.translation || '',
          summary: data.summary || '',
          key_points: data.key_points || '',
          actions: data.actions || ''
        });
        setEditData({
          transcript: data.transcript || '',
          translation: data.translation || '',
          summary: data.summary || '',
          key_points: data.key_points || '',
          actions: data.actions || ''
        });
        setLoading(false);
      })
      .catch(err => {
        console.error('Error fetching transcript:', err);
        setLoading(false);
      });
  }, [meetingId]);

  const handleSaveEdits = () => {
    if (!transcriptId) {
      console.error("No transcript ID selected");
      return;
    }

    const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY;
    const API_KEY = process.env.NEXT_PUBLIC_API_KEY;

    // Map 'actions' to 'action' for backend compatibility
    const dataToSend = {
      transcript: editData.transcript,
      translation: editData.translation,
      summary: editData.summary,
      key_points: editData.key_points,
      action: editData.actions  // Backend expects 'action' not 'actions'
    };

    console.log('💾 Saving transcript changes:', { transcriptId, dataToSend });

    fetch(`/api/backend/transcripts/${transcriptId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        "Authorization": `Bearer ${TOKEN_KEY}`,
        "X-API-KEY": API_KEY
      },
      credentials: "include",
      body: JSON.stringify(dataToSend)
    })
      .then(res => {
        console.log('📥 Response status:', res.status);
        return res.json();
      })
      .then(data => {
        console.log('✅ Save successful:', data);
        setSelectedData({ ...editData });
        setEditing(false);
      })
      .catch(err => {
        console.error('❌ Error saving edits:', err);
      });
  };

  return (
    <>
      <Header handleLogout={handleLogout} />
      <div className="min-h-screen font-sans overflow-hidden" style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
        <main className="flex-1 px-6 sm:px-10 py-10 overflow-auto ml-0 md:ml-5">
          <div className="w-full max-w-6xl mx-auto">
            <div className="flex items-center gap-4 mb-6">
              <button
                onClick={() => router.push('/meetings')}
                className="bg-zinc-700 hover:bg-zinc-600 text-white px-6 py-2 rounded-lg font-semibold transition"
              >
                ← Back to Meetings
              </button>
              <h1 className="text-3xl font-bold text-white">Meeting Details</h1>
            </div>

            {loading ? (
              <p className="text-zinc-400 text-center py-8">Loading...</p>
            ) : (
              <div className="p-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 backdrop-blur-sm space-y-4">
                <div className="flex justify-between items-center">
                  <h2 className="text-2xl font-semibold text-white">Transcript & Summary</h2>
                  <button
                    onClick={() => setEditing(!editing)}
                    className="bg-yellow-600 hover:bg-yellow-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                  >
                    {editing ? 'Cancel' : 'Edit'}
                  </button>
                </div>

                {editing ? (
                  <div className="space-y-4">
                    {['transcript', 'translation', 'summary', 'key_points', 'actions'].map((field) => (
                      <div key={field}>
                        <label className="font-semibold text-zinc-300 block mb-2">
                          {field.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                        </label>
                        <textarea
                          className="w-full border border-zinc-700 bg-zinc-800 text-white p-4 rounded-lg focus:outline-none focus:ring-2 focus:ring-violet-600"
                          rows="6"
                          value={editData[field]}
                          onChange={(e) => setEditData({ ...editData, [field]: e.target.value })}
                        />
                      </div>
                    ))}
                    <button
                      onClick={handleSaveEdits}
                      className="bg-green-600 hover:bg-green-700 text-white px-6 py-2 rounded-lg font-semibold transition"
                    >
                      Save Changes
                    </button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {Object.entries(selectedData).map(([key, value]) => (
                      value && (
                        <div key={key} className="rounded-xl border border-zinc-800 bg-zinc-800/40 p-4">
                          <h3 className="font-semibold text-zinc-300 mb-2">
                            {key.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}:
                          </h3>
                          <pre className="whitespace-pre-wrap text-zinc-200 text-sm">{value}</pre>
                        </div>
                      )
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}
