"use client";
import { useState, useEffect } from 'react';
import { toast, ToastContainer } from 'react-toastify';
import { useUser } from '@/context/userContext';
import Header from '../header/page';
import 'react-toastify/dist/ReactToastify.css';

const API_KEY = process.env.NEXT_PUBLIC_API_KEY || "";
const TOKEN_KEY = process.env.NEXT_PUBLIC_TOKEN_KEY || "";

export default function RegisterSpeaker() {
  const { user } = useUser();
  const [speakers, setSpeakers] = useState([]);
  const [selectedSpeaker, setSelectedSpeaker] = useState(null);
  const [newSpeakerName, setNewSpeakerName] = useState('');
  const [audioFiles, setAudioFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [showAddSpeaker, setShowAddSpeaker] = useState(false);
  const [loading, setLoading] = useState(true);

  // Fetch registered speakers from Azure Blob Storage
  const fetchSpeakers = async () => {
    if (!user?.id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`/api/backend/list-speakers/${user.id}`, {
        headers: {
          'Authorization': `Bearer ${TOKEN_KEY}`,
          'X-API-KEY': API_KEY
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success && data.speakers) {
          // Transform speakers to match UI format
          const transformedSpeakers = data.speakers.map((speaker, idx) => ({
            id: `${user.id}_${speaker.name}`,
            name: speaker.name,
            audioCount: speaker.audio_count,
            files: speaker.files || []
          }));
          setSpeakers(transformedSpeakers);
        }
      } else {
        console.error('Failed to fetch speakers:', await response.text());
      }
    } catch (error) {
      console.error('Error fetching speakers:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Fetch speakers from Azure when user is loaded
    if (user?.id) {
      fetchSpeakers();
    }
  }, [user]);

  const saveSpeakersToStorage = (updatedSpeakers) => {
    // No longer using localStorage - speakers are stored in Azure
    setSpeakers(updatedSpeakers);
  };

  const handleAddSpeaker = () => {
    if (!newSpeakerName.trim()) {
      toast.error('Please enter a speaker name');
      return;
    }

    const speakerExists = speakers.find(s => s.name.toLowerCase() === newSpeakerName.trim().toLowerCase());
    if (speakerExists) {
      toast.error('Speaker already exists');
      return;
    }

    const newSpeaker = {
      id: `${user.id}_${newSpeakerName.trim()}`,
      name: newSpeakerName.trim(),
      audioCount: 0,
      files: []
    };

    const updatedSpeakers = [...speakers, newSpeaker];
    setSpeakers(updatedSpeakers);
    setNewSpeakerName('');
    setShowAddSpeaker(false);
    toast.success('Speaker added. Now upload audio files for this speaker.');
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    const wavFiles = files.filter(f => f.name.toLowerCase().endsWith('.wav'));
    
    if (wavFiles.length !== files.length) {
      toast.warning('Only .wav files are allowed. Some files were filtered out.');
    }
    
    setAudioFiles(wavFiles);
  };

  const handleUpload = async () => {
    if (!selectedSpeaker) {
      toast.error('Please select a speaker');
      return;
    }

    if (audioFiles.length === 0) {
      toast.error('Please select audio files to upload');
      return;
    }

    if (!user?.id) {
      toast.error('User not authenticated');
      return;
    }

    setUploading(true);
    let successCount = 0;
    let failCount = 0;

    try {
      for (const file of audioFiles) {
        try {
          const formData = new FormData();
          formData.append('user_id', user.id);
          formData.append('name', selectedSpeaker.name);
          formData.append('audio', file);

          const response = await fetch('/api/backend/register-speaker', {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${TOKEN_KEY}`,
              'X-API-KEY': API_KEY
            },
            body: formData
          });

          if (response.ok) {
            successCount++;
          } else {
            const errorData = await response.json();
            console.error(`Failed to upload ${file.name}:`, errorData);
            failCount++;
          }
        } catch (error) {
          console.error(`Error uploading ${file.name}:`, error);
          failCount++;
        }
      }

      // Update speaker audio count
      const updatedSpeakers = speakers.map(s => 
        s.id === selectedSpeaker.id 
          ? { ...s, audioCount: s.audioCount + successCount }
          : s
      );
      setSpeakers(updatedSpeakers);

      if (successCount > 0) {
        toast.success(`Successfully uploaded ${successCount} audio file(s)`);
        // Refresh speakers from Azure to get updated counts
        await fetchSpeakers();
      }
      if (failCount > 0) {
        toast.error(`Failed to upload ${failCount} audio file(s)`);
      }

      // Clear selected files
      setAudioFiles([]);
      document.getElementById('audio-input').value = '';

    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleDeleteSpeaker = async (speakerId) => {
    // Note: Deletion from Azure not implemented yet - would require backend endpoint
    if (confirm('Note: This will only remove from the UI. To delete from Azure, please contact support.')) {
      const updatedSpeakers = speakers.filter(s => s.id !== speakerId);
      setSpeakers(updatedSpeakers);
      if (selectedSpeaker?.id === speakerId) {
        setSelectedSpeaker(null);
      }
      toast.warning('Speaker removed from UI only');
    }
  };

  const handleLogout = async () => {
    try {
      const res = await fetch("/api/logout", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-API-KEY": API_KEY
        },
        credentials: "include",
      });

      if (res.ok) {
        localStorage.clear();
        window.dispatchEvent(new Event('userUpdated'));
        window.location.href = "/login";
      } else {
        toast.error("Logout failed");
      }
    } catch (err) {
      console.error("Error during logout:", err);
      toast.error("Logout error");
    }
  };

  return (
    <div className="min-h-screen" style={{ 
      background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      <ToastContainer position="top-right" autoClose={3000} />
      <Header user={user} handleLogout={handleLogout} />
      
      <div className="flex-1" style={{ padding: '24px' }}>
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="mb-8">
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: 'white',
              marginBottom: '8px'
            }}>Speaker Registration</h1>
            <p style={{ color: '#94a3b8', fontSize: '14px' }}>
              User ID: {user?.id || 'Loading...'}
            </p>
          </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left Panel - Speakers List */}
          <div style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(71, 85, 105, 0.3)',
            borderRadius: '16px',
            padding: '20px'
          }}>
            <div className="flex justify-between items-center mb-4">
              <h2 style={{
                fontSize: '18px',
                fontWeight: '600',
                color: 'white'
              }}>Speakers</h2>
              <button
                onClick={() => setShowAddSpeaker(true)}
                style={{
                  padding: '8px 16px',
                  background: 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '13px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                + Add Speaker
              </button>
            </div>

            {/* Add Speaker Form */}
            {showAddSpeaker && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.8)',
                border: '1px solid rgba(71, 85, 105, 0.4)',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '16px'
              }}>
                <input
                  type="text"
                  placeholder="Speaker name"
                  value={newSpeakerName}
                  onChange={(e) => setNewSpeakerName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleAddSpeaker()}
                  style={{
                    width: '100%',
                    padding: '10px',
                    background: 'rgba(30, 41, 59, 0.5)',
                    border: '1px solid rgba(71, 85, 105, 0.4)',
                    borderRadius: '8px',
                    color: 'white',
                    fontSize: '13px',
                    marginBottom: '12px',
                    outline: 'none'
                  }}
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleAddSpeaker}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: '#22c55e',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => {
                      setShowAddSpeaker(false);
                      setNewSpeakerName('');
                    }}
                    style={{
                      flex: 1,
                      padding: '8px',
                      background: 'rgba(71, 85, 105, 0.3)',
                      color: 'white',
                      border: '1px solid rgba(71, 85, 105, 0.4)',
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '600',
                      cursor: 'pointer'
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* Speakers List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {loading ? (
                <div style={{ 
                  color: '#94a3b8', 
                  fontSize: '13px', 
                  textAlign: 'center', 
                  padding: '20px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <div style={{
                    width: '24px',
                    height: '24px',
                    border: '3px solid rgba(148, 163, 184, 0.3)',
                    borderTop: '3px solid #94a3b8',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }} />
                  Loading speakers from Azure...
                </div>
              ) : speakers.length === 0 ? (
                <p style={{ color: '#94a3b8', fontSize: '13px', textAlign: 'center', padding: '20px' }}>
                  No speakers added yet
                </p>
              ) : (
                speakers.map(speaker => (
                  <div
                    key={speaker.id}
                    onClick={() => setSelectedSpeaker(speaker)}
                    style={{
                      padding: '12px',
                      background: selectedSpeaker?.id === speaker.id 
                        ? 'rgba(79, 70, 229, 0.2)' 
                        : 'rgba(15, 23, 42, 0.5)',
                      border: selectedSpeaker?.id === speaker.id
                        ? '1px solid rgba(79, 70, 229, 0.5)'
                        : '1px solid rgba(71, 85, 105, 0.3)',
                      borderRadius: '10px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                  >
                    <div className="flex justify-between items-start">
                      <div style={{ flex: 1 }}>
                        <div style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: 'white',
                          marginBottom: '4px'
                        }}>
                          {speaker.name}
                        </div>
                        <div style={{
                          fontSize: '12px',
                          color: '#94a3b8'
                        }}>
                          {speaker.audioCount} audio file(s)
                        </div>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteSpeaker(speaker.id);
                        }}
                        style={{
                          padding: '4px 8px',
                          background: 'rgba(239, 68, 68, 0.2)',
                          border: '1px solid rgba(239, 68, 68, 0.3)',
                          borderRadius: '6px',
                          color: '#ef4444',
                          fontSize: '11px',
                          cursor: 'pointer'
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Panel - Upload Area */}
          <div className="lg:col-span-2" style={{
            background: 'rgba(30, 41, 59, 0.5)',
            border: '1px solid rgba(71, 85, 105, 0.3)',
            borderRadius: '16px',
            padding: '24px'
          }}>
            <h2 style={{
              fontSize: '18px',
              fontWeight: '600',
              color: 'white',
              marginBottom: '20px'
            }}>
              {selectedSpeaker ? `Upload Audio for ${selectedSpeaker.name}` : 'Select a Speaker'}
            </h2>

            {selectedSpeaker ? (
              <>
                {/* File Upload Area */}
                <div style={{
                  border: '2px dashed rgba(79, 70, 229, 0.4)',
                  borderRadius: '12px',
                  padding: '40px',
                  textAlign: 'center',
                  marginBottom: '20px',
                  background: 'rgba(15, 23, 42, 0.3)'
                }}>
                  <input
                    id="audio-input"
                    type="file"
                    multiple
                    accept=".wav"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />
                  <label
                    htmlFor="audio-input"
                    style={{
                      cursor: 'pointer',
                      display: 'block'
                    }}
                  >
                    <div style={{
                      fontSize: '48px',
                      marginBottom: '16px'
                    }}>
                      🎤
                    </div>
                    <div style={{
                      fontSize: '16px',
                      fontWeight: '600',
                      color: 'white',
                      marginBottom: '8px'
                    }}>
                      Click to select audio files
                    </div>
                    <div style={{
                      fontSize: '13px',
                      color: '#94a3b8'
                    }}>
                      Only .wav files are supported
                    </div>
                  </label>
                </div>

                {/* Selected Files */}
                {audioFiles.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h3 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: 'white',
                      marginBottom: '12px'
                    }}>
                      Selected Files ({audioFiles.length})
                    </h3>
                    <div style={{
                      maxHeight: '200px',
                      overflowY: 'auto',
                      background: 'rgba(15, 23, 42, 0.5)',
                      border: '1px solid rgba(71, 85, 105, 0.3)',
                      borderRadius: '8px',
                      padding: '12px'
                    }}>
                      {audioFiles.map((file, index) => (
                        <div
                          key={index}
                          style={{
                            padding: '8px',
                            borderBottom: index < audioFiles.length - 1 ? '1px solid rgba(71, 85, 105, 0.2)' : 'none',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <span style={{ color: 'white', fontSize: '13px' }}>
                            {file.name}
                          </span>
                          <span style={{ color: '#94a3b8', fontSize: '12px' }}>
                            {(file.size / 1024).toFixed(2)} KB
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Upload Button */}
                <button
                  onClick={handleUpload}
                  disabled={uploading || audioFiles.length === 0}
                  style={{
                    width: '100%',
                    padding: '14px',
                    background: uploading || audioFiles.length === 0 
                      ? 'rgba(71, 85, 105, 0.3)'
                      : 'linear-gradient(135deg, #4F46E5 0%, #4338CA 100%)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '10px',
                    fontSize: '15px',
                    fontWeight: '600',
                    cursor: uploading || audioFiles.length === 0 ? 'not-allowed' : 'pointer',
                    opacity: uploading || audioFiles.length === 0 ? 0.5 : 1,
                    transition: 'all 0.2s'
                  }}
                >
                  {uploading ? 'Uploading...' : `Upload ${audioFiles.length} File(s)`}
                </button>

                {/* Info */}
                <div style={{
                  marginTop: '20px',
                  padding: '16px',
                  background: 'rgba(79, 70, 229, 0.1)',
                  border: '1px solid rgba(79, 70, 229, 0.2)',
                  borderRadius: '10px'
                }}>
                  <div style={{
                    fontSize: '13px',
                    color: '#a5b4fc',
                    lineHeight: '1.6'
                  }}>
                    <strong>Azure Storage Path:</strong><br/>
                    embeddings/{user?.id}/{selectedSpeaker.name}/[filename].wav
                    <br/><br/>
                    <strong>💡 Tip:</strong> You can add more audio files to existing speakers anytime to improve recognition accuracy.
                  </div>
                </div>
              </>
            ) : (
              <div style={{
                textAlign: 'center',
                padding: '60px 20px',
                color: '#94a3b8'
              }}>
                <div style={{ fontSize: '64px', marginBottom: '16px' }}>👤</div>
                <p style={{ fontSize: '14px' }}>
                  Select a speaker from the list or add a new one to start uploading audio files
                </p>
              </div>
            )}
          </div>
          </div>
        </div>
      </div>
      
      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}