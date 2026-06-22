import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = "https://nbujvnrroerixivrmtxd.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idWp2bnJyb2VyaXhpdnJtdHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzM2NjUsImV4cCI6MjA5NzY0OTY2NX0.PqxtPsfExA_8BcXRIRmFz0ikcH7J_rNx4K0LKgcqaYY";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
