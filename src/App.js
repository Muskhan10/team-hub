import React, { useEffect, useState } from 'react';
import './App.css';
import { supabase } from './supabaseClient';

function App() {
  const [messages, setMessages] = useState([]);
  const [name, setName] = useState('');
  const [text, setText] = useState('');
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // ✅ File Upload + Store as Message
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

    // ✅ Add file as a message
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

  // ✅ Fetch messages
  const fetchMessages = async () => {
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Fetch error:', error.message);
    } else {
      setMessages(data);
    }
  };

  // ✅ Delete message
  const deleteMessage = async (id) => {
    const { error } = await supabase.from('messages').delete().eq('id', id);
    if (error) {
      alert('❌ Failed to delete message: ' + error.message);
    } else {
      setMessages((prev) => prev.filter((msg) => msg.id !== id));
    }
  };

  // ✅ On mount
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

  // ✅ Send chat message
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
      <h1>Live Chat</h1>

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
          <p>Files are also shown below in chat feed.</p>
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
        {messages.map((msg) => {
          let content;
          try {
            content = JSON.parse(msg.content);
          } catch {
            content = msg.content;
          }

          return (
            <li key={msg.id}>
              <strong>{msg.user_name}:</strong>{' '}
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
              <button
                onClick={() => deleteMessage(msg.id)}
                style={{
                  backgroundColor: 'red',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  padding: '4px 8px',
                  cursor: 'pointer',
                  marginTop: '5px',
                }}
              >
                🗑 Delete
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

export default App;
