/**
 * Republica proyectospeed.com desde la terminal.
 * Requiere .env.local con VITE_GITHUB_PAT (y opcionalmente owner/repo).
 *
 * Uso: npm run publish:site
 */
import { writeFileSync } from "node:fs";
import { loadEnv } from "vite";
import { generateSiteFiles, getAccessibleSessions } from "../src/utils/siteGenerator.js";
import { publishToGitHub } from "../src/utils/githubPublisher.js";
import { createClient } from "@supabase/supabase-js";

const env = loadEnv("development", process.cwd(), "");
for (const [key, value] of Object.entries(env)) {
  if (key.startsWith("VITE_") && value) {
    process.env[key] = value;
  }
}

const SUPABASE_URL = env.VITE_SUPABASE_URL || "https://nbujvnrroerixivrmtxd.supabase.co";
const SUPABASE_KEY =
  env.VITE_SUPABASE_SERVICE_ROLE_KEY ||
  env.VITE_SUPABASE_ANON_KEY ||
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5idWp2bnJyb2VyaXhpdnJtdHhkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIwNzM2NjUsImV4cCI6MjA5NzY0OTY2NX0.PqxtPsfExA_8BcXRIRmFz0ikcH7J_rNx4K0LKgcqaYY";

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function fetchSessionVideosMap(sessionIds) {
  if (!sessionIds?.length) return {};
  const { data, error } = await supabase
    .from("session_videos")
    .select("*")
    .in("session_id", sessionIds)
    .order("sort_order");
  if (error) throw new Error(error.message);
  const map = {};
  for (const row of data || []) {
    if (!map[row.session_id]) map[row.session_id] = [];
    map[row.session_id].push(row);
  }
  return map;
}

async function main() {
  const token = env.VITE_GITHUB_PAT || process.env.VITE_GITHUB_PAT;
  if (!token) {
    throw new Error("Falta VITE_GITHUB_PAT en .env.local");
  }

  const { data: phases, error: phasesError } = await supabase
    .from("phases")
    .select("*")
    .order("sort_order");
  if (phasesError) throw new Error(phasesError.message);

  const { data: sessions, error: sessionsError } = await supabase
    .from("sessions")
    .select("*")
    .order("scheduled_date_iso", { ascending: true, nullsFirst: false });
  if (sessionsError) throw new Error(sessionsError.message);

  if (!sessions?.length) {
    throw new Error(
      "No se pudieron leer sesiones (RLS). Añade VITE_SUPABASE_SERVICE_ROLE_KEY en .env.local o publica desde el dashboard."
    );
  }

  const accessible = getAccessibleSessions(sessions);
  const videosBySessionId = await fetchSessionVideosMap(accessible.map((s) => s.id));
  const { files, stats } = await generateSiteFiles(phases, sessions, { videosBySessionId });

  const result = await publishToGitHub(files, {
    token,
    owner: env.VITE_GITHUB_OWNER || "artifextsp",
    repo: env.VITE_GITHUB_REPO || "PILOTO",
    branch: env.VITE_GITHUB_BRANCH || "main",
  });

  console.log("Sitio publicado correctamente.");
  console.log(`• Archivos: ${stats.totalFiles}`);
  console.log(`• PDFs: ${stats.pdfCount}`);
  console.log(`• Commit: ${result.commitUrl}`);
  console.log(`• Espera 1–2 min y recarga https://www.proyectospeed.com con Cmd+Shift+R`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
