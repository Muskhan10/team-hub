import React, { useEffect, useState } from 'react';
import './App.css';
import { supabase } from './supabaseClient';

function App() {
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const getRandomColor = () => {
    const neonColors = [
      '#FF6B6B', '#FF9F43', '#FFD93D', '#6BCB77',
      '#4D96FF', '#A66DD4', '#FF61C3', '#F72585'
    ];
    return neonColors[Math.floor(Math.random() * neonColors.length)];
  };

  const userColors = {};

  const getColorForUser = (user) => {
    if (!userColors[user]) {
      userColors[user] = getRandomColor();
    }
    return userColors[user];
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const filePath = `${Date.now()}_${file.name}`;
    const { error: uploadError } = await supabase.storage
      .from('uploads')
      .upload(filePath, file);

    if (uploadError) {
      alert('❌ Upload failed: ' + uploadError.message);
      return;
    }

    const { data: publicUrl } = supabase.storage
      .from('uploads')
      .getPublicUrl(filePath);

    const { error: insertError } = await supabase.from('messages').insert([
      {
        user_name: name.trim() || 'Anonymous',
        content: JSON.stringify({
          type: 'file',
          name: file.name,
          url: publicUrl.publicUrl,
        }),
      },
    ]);

    if (insertError) {
      alert('❌ Failed to send file message: ' + insertError.message);
    } else {
      alert('✅ File uploaded and shared!');
    }
  };

  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (!error) setMessages(data);
  };

  const deleteMessage = async (id) => {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (!error) {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    }
  };

  useEffect(() => {
    fetchMessages();

    const subscription = supabase
      .channel('realtime-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          setMessages((prev) => [payload.new, ...prev]);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!name.trim() || !text.trim()) return;

    const { error } = await supabase.from('messages').insert([
      {
        user_name: name.trim(),
        content: text.trim(),
      },
    ]);

    if (!error) setText('');
  };

  return (
    <div className="container">
      <h1>Live Chat</h1>

      <button
        className="toggle-button"
        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
      >
        🧑‍🤝‍🧑 Toggle Panel
      </button>

      {isSidebarOpen && (
        <div className="sidebar">
          <h2>👥 Team Panel</h2>
          <p>Upload and view shared content here.</p>
        </div>
      )}

      <div className="upload-section">
        <label htmlFor="file-upload">📤 Upload File:</label>
        <input type="file" id="file-upload" onChange={handleFileUpload} />
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
        {messages.map((msg) => {
          let content;
          try {
            content = JSON.parse(msg.content);
          } catch {
            content = msg.content;
          }

          const color = getColorForUser(msg.user_name);

          return (
            <li key={msg.id}>
              <strong style={{ color }}>{msg.user_name}:</strong>{' '}
              {typeof content === 'string' ? (
                content
              ) : content?.type === 'file' ? (
                <a href={content.url} target="_blank" rel="noopener noreferrer">
                  📎 {content.name}
                </a>
              ) : (
                '[Unsupported message]'
              )}
              <br />
              <small>{new Date(msg.created_at).toLocaleString()}</small> <br />
              <button onClick={() => deleteMessage(msg.id)}>🗑 Delete</button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default App;
