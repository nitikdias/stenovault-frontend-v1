'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Chatbot from '../chatbot/page';

export default function ViewPage() {
  const [data, setData] = useState(null);
  const [editMode, setEditMode] = useState(false);
  const [editData, setEditData] = useState({});
  const router = useRouter();
  const searchParams = useSearchParams();
  const meetingId = searchParams.get('id');

  useEffect(() => {
    if (!meetingId) return;
    console.log('🔄 Fetching meeting transcript for ID:', meetingId);
    fetch(`http://localhost:8000/meetings/${meetingId}/transcript`)
      .then(res => {
        console.log('📡 Backend response status:', res.status, res.statusText);
        return res.json();
      })
      .then(d => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('📄 MEETING DATA RECEIVED FROM BACKEND');
        console.log('Full data keys:', Object.keys(d));
        console.log('Transcript details:', {
          exists: !!d.transcript,
          type: typeof d.transcript,
          length: d.transcript?.length || 0,
          preview: d.transcript?.substring(0, 200) || 'N/A',
          isEmptyString: d.transcript === '',
          isNull: d.transcript === null,
          isUndefined: d.transcript === undefined
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        setData(d);
        setEditData(d);
      })
      .catch(err => {
        console.error('❌ Error fetching meeting data:', err);
      });
  }, [meetingId]);

  const handleSave = () => {
    fetch(`http://localhost:8000/transcripts/${data.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editData)
    }).then(() => {
      setData(editData);
      setEditMode(false);
    });
  };

  if (!data) return <p className="p-10 text-lg">Loading...</p>;

  return (
    <div className="p-8 max-w-8xl mx-auto">
      {/* Navigation buttons for Live, File, Reports */}
      <div className="flex gap-4 mb-8">
        <button
          onClick={() => router.push('/Live')}
          className="bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-800 transition"
        >
          Live
        </button>
        <button
          onClick={() => router.push('/File')}
          className="bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-800 transition"
        >
          File
        </button>
        <button
          onClick={() => router.push('/Home')}
          className="bg-indigo-700 text-white px-4 py-2 rounded-lg font-semibold hover:bg-indigo-800 transition"
        >
          Reports
        </button>
      </div>

      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold text-indigo-900">Meeting Details</h1>
        <button
          onClick={() => router.push('/Home')}
          className="bg-white border border-indigo-700 text-indigo-700 hover:bg-indigo-50 px-5 py-2 rounded-lg font-semibold transition"
        >
          b05 Back
        </button>
      </div>

      <button
        onClick={() => setEditMode(!editMode)}
        className="bg-white border border-yellow-500 text-yellow-500 hover:bg-yellow-50 px-6 py-2 rounded-xl font-semibold transition shadow-md"
      >
        {editMode ? 'Cancel' : 'Edit'}
      </button>

      {editMode ? (
        <div className="flex flex-col md:flex-row md:space-x-8">
          <div className="md:w-1/2 space-y-6">
            {['transcript', 'translation'].map(field => (
              <div key={field}>
                <label className="block mb-2 font-semibold text-indigo-700 uppercase tracking-wide">
                  {field.replace('_', ' ').toUpperCase()}
                </label>
                <textarea
                  className="w-full border border-indigo-300 rounded-2xl p-4 text-indigo-900 bg-indigo-50 resize-none min-h-[120px]"
                  value={editData[field] || ''}
                  onChange={(e) => setEditData({ ...editData, [field]: e.target.value })}
                />
              </div>
            ))}
          </div>
          <div className="md:w-1/2 space-y-6 mt-8 md:mt-0">
            {['summary', 'key_points', 'actions'].map(field => (
              <div key={field}>
                <label className="block mb-2 font-semibold text-indigo-700 uppercase tracking-wide">
                  {field.replace('_', ' ').toUpperCase()}
                </label>
                <textarea
                  className="w-full border border-indigo-300 rounded-2xl p-4 text-indigo-900 bg-indigo-50 resize-none min-h-[120px]"
                  value={editData[field] || ''}
                  onChange={(e) => setEditData({ ...editData, [field]: e.target.value })}
                />
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-col md:flex-row md:space-x-8">
          <div className="md:w-1/2 space-y-6">
            {['transcript', 'translation'].map(field => 
              data[field] && (
                <div key={field}>
                  <h2 className="text-xl font-semibold mb-2">{field.replace('_', ' ').toUpperCase()}</h2>
                  <pre className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 whitespace-pre-wrap">{data[field]}</pre>
                </div>
              )
            )}
          </div>
          <div className="md:w-1/2 space-y-6 mt-8 md:mt-0">
            {['summary', 'key_points', 'actions'].map(field => 
              data[field] && (
                <div key={field}>
                  <h2 className="text-xl font-semibold mb-2">{field.replace('_', ' ').toUpperCase()}</h2>
                  <pre className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 whitespace-pre-wrap">{data[field]}</pre>
                </div>
              )
            )}
          </div>
        </div>
      )}
      {editMode && (
        <div className="mt-8 flex justify-end">
          <button
            onClick={handleSave}
            className="bg-white border border-green-600 text-green-600 hover:bg-green-50 px-5 py-2 rounded-xl font-semibold transition"
          >
            Save
          </button>
        </div>
      )}
      {data && (() => {
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        console.log('🤖 PASSING TRANSCRIPT TO CHATBOT COMPONENT');
        console.log('data.transcript:', {
          exists: !!data.transcript,
          type: typeof data.transcript,
          length: data.transcript?.length || 0,
          preview: data.transcript?.substring(0, 100) || 'N/A'
        });
        console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
        return null;
      })()}
      <Chatbot transcript={data?.transcript} />

    </div>
  );
}
