import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://xjafuykankwjaucivrzj.supabase.co';
const supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhqYWZ1eWthbmt3amF1Y2l2cnpqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM4NDAxODgsImV4cCI6MjA5OTQxNjE4OH0.AVjsr8FyfbYfHYbryl4Qg6M-gNWXRo5KOo5C4Sj7ssk';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
