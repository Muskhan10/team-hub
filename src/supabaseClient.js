// src/supabaseClient.js

import { createClient } from '@supabase/supabase-js';

// ✅ Replace the values below with your actual Supabase project info
const supabaseUrl = 'https://lepchwekkrmubmpyzdio.supabase.co';     // 🔁 Supabase Project URL
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxlcGNod2Vra3JtdWJtcHl6ZGlvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIwMDYyNTksImV4cCI6MjA2NzU4MjI1OX0.uX0DAXJnMsmQgH7YJQyc29lhO_51aw-PAGZV0TDgXLo';                           // 🔁 Supabase anon/public API key

export const supabase = createClient(supabaseUrl, supabaseKey);
