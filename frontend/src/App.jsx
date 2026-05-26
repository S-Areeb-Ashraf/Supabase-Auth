import React, { useState } from 'react';

const API_BASE = 'http://127.0.0.1:8000';

export default function App() {
  // Auth state
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [token, setToken] = useState(localStorage.getItem('test_jwt') || '');
  const [message, setMessage] = useState('');

  // App state
  const [notes, setNotes] = useState([]);
  const [newNote, setNewNote] = useState('');

  // Handle Signup
  const handleSignup = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Signup failed');
      setMessage(`Signup successful for ID: ${data.user_id}! You can log in now.`);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  // Handle Login
  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Login failed');
      
      setToken(data.access_token);
      localStorage.setItem('test_jwt', data.access_token);
      setMessage('Logged in successfully!');
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  // Fetch Notes (Protected)
  const fetchNotes = async () => {
    try {
      const res = await fetch(`${API_BASE}/notes`, {
        method: 'GET',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to fetch notes');
      setNotes(data.notes || []);
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  // Create Note (Protected)
  const createNote = async (e) => {
    e.preventDefault();
    try {
      const res = await fetch(`${API_BASE}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ content: newNote }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to create note');
      
      setNewNote('');
      setMessage('Note added!');
      fetchNotes(); // Refresh list automatically
    } catch (err) {
      setMessage(`Error: ${err.message}`);
    }
  };

  const handleLogout = () => {
    setToken('');
    setNotes([]);
    localStorage.removeItem('test_jwt');
    setMessage('Logged out.');
  };

  return (
    <div style={{ maxWidth: '500px', margin: '40px auto', padding: '20px', fontFamily: 'sans-serif' }}>
      <h2>Supabase Auth + FastAPI Test Sandbox</h2>
      
      {message && (
        <div style={{ padding: '10px', background: '#f0f0f0', borderLeft: '4px solid #0070f3', marginBottom: '20px', fontSize: '14px' }}>
          {message}
        </div>
      )}

      
      {!token ? (
        <fieldset style={{ marginBottom: '20px', padding: '15px', borderRadius: '8px' }}>
          <legend><strong>Sign In / Sign Up</strong></legend>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            <input 
              type="email" 
              placeholder="Email" 
              value={email} 
              onChange={e => setEmail(e.target.value)} 
              required 
              style={{ padding: '8px' }}
            />
            <input 
              type="password" 
              placeholder="Password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              required 
              style={{ padding: '8px' }}
            />
            <div style={{ display: 'flex', gap: '10px' }}>
              <button onClick={handleLogin} style={{ flex: 1, padding: '10px', background: '#0070f3', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Log In</button>
              <button onClick={handleSignup} style={{ flex: 1, padding: '10px', background: '#222', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Sign Up</button>
            </div>
          </form>
        </fieldset>
      ) : (
        <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#eaf5ff', padding: '10px', borderRadius: '6px' }}>
          <span style={{ fontSize: '14px', color: '#0051b3' }}>🔐 Authenticated (Token saved)</span>
          <button onClick={handleLogout} style={{ padding: '5px 10px', background: '#ff4d4d', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Logout</button>
        </div>
      )}

      
      {token && (
        <fieldset style={{ padding: '15px', borderRadius: '8px' }}>
          <legend><strong>Your Secret Notes (RLS Protected)</strong></legend>
          
          <form onSubmit={createNote} style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <input 
              type="text" 
              placeholder="Write a secret note..." 
              value={newNote} 
              onChange={e => setNewNote(e.target.value)} 
              required 
              style={{ flex: 1, padding: '8px' }}
            />
            <button type="submit" style={{ padding: '8px 15px', background: '#10b981', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Save</button>
          </form>

          <button onClick={fetchNotes} style={{ width: '100%', padding: '8px', background: '#6366f1', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', marginBottom: '15px' }}>
            🔄 Load / Sync Notes from DB
          </button>

          {notes.length === 0 ? (
            <p style={{ color: '#666', fontSize: '14px', textAlign: 'center' }}>No notes found. Create one or sync with the database!</p>
          ) : (
            <ul style={{ paddingLeft: '20px', margin: 0 }}>
              {notes.map(note => (
                <li key={note.id} style={{ marginBottom: '8px', fontSize: '15px' }}>
                  {note.content} <span style={{ color: '#999', fontSize: '11px' }}>({new Date(note.created_at).toLocaleTimeString()})</span>
                </li>
              ))}
            </ul>
          )}
        </fieldset>
      )}
    </div>
  );
}