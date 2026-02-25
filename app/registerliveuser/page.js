'use client'

import { useState, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Mic } from 'lucide-react'
import Recorder from 'recorder-js'

export default function RegisterLiveUser() {
  const [users, setUsers] = useState([])
  const [name, setName] = useState('')
  const [recording, setRecording] = useState(false)
  const [countdown, setCountdown] = useState(null)
  const recorderRef = useRef(null)
  const audioContextRef = useRef(null)
  const router = useRouter()

  // countdown 3 → 2 → 1
  const startCountdown = () => {
    if (!name) return
    let counter = 3
    setCountdown(counter)
    const interval = setInterval(() => {
      counter -= 1
      if (counter === 0) {
        clearInterval(interval)
        setCountdown(null)
        startRecording()
      } else {
        setCountdown(counter)
      }
    }, 1000)
  }

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
      recorderRef.current = new Recorder(audioContextRef.current, {
        onAnalysed: () => {}, // optional real-time visualization
      })

      await recorderRef.current.init(stream)
      recorderRef.current.start()
      setRecording(true)
    } catch (err) {
      console.error('Microphone access denied', err)
    }
  }

  const stopRecording = async () => {
    if (recorderRef.current) {
      const { blob } = await recorderRef.current.stop() // returns wav blob
      const timestamp = new Date().toLocaleTimeString()

      // ✅ Upload to Flask backend
      const formData = new FormData()
      formData.append('file', blob, `${name || 'user'}.wav`)
      await fetch('http://127.0.0.1:8000/upload-audio-live', {
        method: 'POST',
        body: formData,
      })

      // ✅ Add to Registered Users list
      setUsers([...users, { name, timestamp }])
      setName('')
      setRecording(false)
    }
  }

  const deleteUser = (index) => {
    const updated = [...users]
    updated.splice(index, 1)
    setUsers(updated)
  }

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <h1 className="text-xl font-semibold text-center">
        Hello, Good Morning StenoVault! I am [Your Name]. Register me as a live user.
      </h1>

      {/* Input + Round Recorder Button */}
      <div className="p-6 border rounded-lg shadow-sm space-y-4 text-center">
        <label className="block text-left font-medium">Enter Name</label>
        <input
          type="text"
          placeholder="Enter user name..."
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full border p-2 rounded"
        />

        {countdown ? (
          <div className="text-5xl font-bold text-gray-700 animate-pulse">{countdown}</div>
        ) : recording ? (
          <button
            onClick={stopRecording}
            className="mx-auto w-20 h-20 rounded-full bg-red-500 flex items-center justify-center text-white shadow-lg hover:bg-red-600"
          >
            Stop
          </button>
        ) : (
          <button
            onClick={startCountdown}
            disabled={!name}
            className="mx-auto w-20 h-20 rounded-full bg-gray-700 flex items-center justify-center text-white shadow-lg hover:bg-gray-900 disabled:opacity-50"
          >
            <Mic size={28} />
          </button>
        )}

        <div className="text-sm text-gray-500">
          {recording ? 'Recording...' : 'Click to start recording'}
        </div>

        <button
          onClick={() => setName('')}
          className="w-full py-2 rounded bg-gray-500 text-white hover:bg-gray-600"
        >
          + Add Another User
        </button>
      </div>

      {/* Registered Users List */}
      {users.length > 0 && (
        <div className="p-4 border rounded-lg space-y-2">
          <h2 className="font-semibold">Registered Users ({users.length})</h2>
          {users.map((user, index) => (
            <div
              key={index}
              className="flex items-center justify-between border p-2 rounded"
            >
              <div>
                <div className="font-medium">{user.name}</div>
                <div className="text-xs text-gray-500">
                  Registered at {user.timestamp}
                </div>
              </div>
              <button
                onClick={() => deleteUser(index)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 size={18} />
              </button>
            </div>
          ))}
        </div>
      )}

      <button
        onClick={() => router.push('/Live')}
        className="w-full bg-indigo-900 text-white py-3 rounded"
      >
        Continue →
      </button>
    </div>
  )
}
