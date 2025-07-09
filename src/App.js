import React, { useEffect, useState } from 'react';
import './App.css';
import { supabase } from './supabaseClient';

function App() {
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]); // ✅ Added state to store file list
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ✅ File Upload Handler
  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const filePath = `${Date.now()}_${file.name}`;

    const { error } = await supabase.storage
      .from('uploads')
      .upload(filePath, file);

    if (error) {
      alert('❌ Upload failed: ' + error.message);
    } else {
      fetchFiles();
      const { data: publicUrl } = supabase.storage
        .from('uploads')
        .getPublicUrl(filePath);

      alert('✅ File uploaded! Link: ' + publicUrl.publicUrl);
    }
  };

  // ✅ Fetch file list
  const fetchFiles = async () => {
    const { data, error } = await supabase.storage.from('uploads').list();
    if (error) {
      console.error('File fetch error:', error.message);
    } else {
      setFiles(data);
    }
  };

  // ✅ Fetch Messages
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Fetch error:', error.message);
    } else {
      setMessages(data);
    }
  };

  // ✅ On Mount
  useEffect(() => {
    fetchMessages();
    fetchFiles();

    const subscription = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => [...prev, payload.new]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  // ✅ Send Chat Message
  const sendMessage = async (e) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return;

    const { error } = await supabase.from('messages').insert([
      {
        user_name: name.trim(),
        content: text.trim(),
      },
    ]);

    if (error) {
      alert('Error sending message: ' + error.message);
    } else {
      setText('');
    }
  };

  return (
    <div className="container">
      <h1>Supabase + React (Live Chat)</h1>

      <button
        className="toggle-button"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        🧑‍🤝‍🧑 Team Hub
      </button>

      {isSidebarOpen && (
        <div className="sidebar">
          <h2>👥 Team Chat Panel</h2>
          <p>This is where shared content or team list can appear.</p>

          <h3>📁 Uploaded Files</h3>
          <ul>
            {files.map((file) => (
              <li key={file.name}>
                <a
                  href={`https://lepchwekkrmubmpyzdio.supabase.co/storage/v1/object/public/uploads/${file.name}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {file.name}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="upload-section">
        <h3>📤 Upload File</h3>
        <input type="file" onChange={handleFileUpload} />
      </div>

      <form onSubmit={sendMessage} className="form">
        <input
          type="text"
          placeholder="Your name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <input
          type="text"
          placeholder="Write a message..."
          value={text}
          onChange={(e) => setText(e.target.value)}
          required
        />
        <button type="submit">Send</button>
      </form>

      <ul>
        {messages.map((msg) => (
          <li key={msg.id}>
            <strong>{msg.user_name}:</strong> {msg.content} <br />
            <small>{new Date(msg.created_at).toLocaleString()}</small>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default App;