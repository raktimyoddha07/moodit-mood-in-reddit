"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import SearchForm from "@/components/SearchForm";
import StatusProgress from "@/components/StatusProgress";
import { SearchStatus, getSearchStatus } from "@/lib/api";

type AppState = "idle" | "polling" | "completed" | "failed" | "error";

export default function HomePage() {
  const [appState,     setAppState]     = useState<AppState>("idle");
  const [searchStatus, setSearchStatus] = useState<SearchStatus | null>(null);
  const [errorMsg,     setErrorMsg]     = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) { clearInterval(intervalRef.current); intervalRef.current = null; }
  }, []);

  const poll = useCallback(async (id: number) => {
    try {
      const s = await getSearchStatus(id);
      setSearchStatus(s);
      if (s.status === "completed") {
        stopPolling();
        setAppState("completed");
        setTimeout(() => { window.location.href = `/results/${id}`; }, 600);
      } else if (s.status === "failed") {
        stopPolling();
        setAppState("failed");
        setErrorMsg(s.error_message || "The analysis pipeline encountered an error.");
      }
    } catch {
      stopPolling();
      setAppState("error");
      setErrorMsg("Lost connection to the backend. Is the server running on port 8000?");
    }
  }, [stopPolling]);

  const handleSearchStarted = useCallback((status: SearchStatus) => {
    setSearchStatus(status);
    setAppState("polling");
    setErrorMsg(null);
    intervalRef.current = setInterval(() => poll(status.id), 3000);
    poll(status.id);
  }, [poll]);

  const handleReset = useCallback(() => {
    stopPolling();
    setAppState("idle");
    setSearchStatus(null);
    setErrorMsg(null);
  }, [stopPolling]);

  useEffect(() => () => stopPolling(), [stopPolling]);

  const showForm   = appState === "idle" || appState === "error";
  const showStatus = appState === "polling" || appState === "failed" || appState === "completed";

  return (
    <div className="page-bg" style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>

      {/* ── Sticky Header ── */}
      <header style={{
        position:     "sticky",
        top:          0,
        zIndex:       50,
        borderBottom: "1px solid rgba(255,255,255,0.05)",
        backdropFilter: "blur(20px)",
        background:   "rgba(8,8,18,0.7)",
      }}>
        <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 24px", height: 60, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          {/* Logo */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 22 }}>🌡️</span>
            <span style={{ fontSize: 18, fontWeight: 800, background: "linear-gradient(90deg,#a78bfa,#60a5fa)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
              Moodit
            </span>
            <span style={{ color: "rgba(255,255,255,0.2)", fontSize: 13, marginLeft: 4 }}>· Mood of Reddit</span>
          </div>

          {/* Back button */}
          {!showForm && (
            <button
              onClick={handleReset}
              style={{
                display: "flex", alignItems: "center", gap: 6,
                padding: "6px 14px", borderRadius: 8,
                border: "1px solid rgba(255,255,255,0.08)",
                background: "rgba(255,255,255,0.04)",
                color: "rgba(255,255,255,0.5)",
                fontSize: 13, cursor: "pointer",
                transition: "color 0.2s, background 0.2s",
              }}
              onMouseOver={(e) => { (e.currentTarget as HTMLButtonElement).style.color="#fff"; (e.currentTarget as HTMLButtonElement).style.background="rgba(255,255,255,0.08)"; }}
              onMouseOut={(e)  => { (e.currentTarget as HTMLButtonElement).style.color="rgba(255,255,255,0.5)"; (e.currentTarget as HTMLButtonElement).style.background="rgba(255,255,255,0.04)"; }}
            >
              ← New Search
            </button>
          )}
        </div>
      </header>

      {/* ── Main Content ── */}
      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", padding: "56px 24px 80px" }}>
        <div style={{ width: "100%", maxWidth: 680 }}>

          {/* Hero — only shown on idle */}
          {showForm && (
            <div style={{ textAlign: "center", marginBottom: 48 }} className="fade-up">
              <div style={{
                display: "inline-flex", alignItems: "center", gap: 8,
                padding: "6px 14px", borderRadius: 999,
                border: "1px solid rgba(124,58,237,0.3)",
                background: "rgba(124,58,237,0.08)",
                marginBottom: 24,
              }}>
                <span style={{ fontSize: 12 }}>✨</span>
                <span style={{ fontSize: 12, fontWeight: 600, color: "#c4b5fd", letterSpacing: "0.06em" }}>
                  VADER · TextBlob · DistilBERT · Gemini AI
                </span>
              </div>

              <h1 style={{
                fontSize: "clamp(36px, 6vw, 52px)",
                fontWeight: 900,
                lineHeight: 1.15,
                marginBottom: 16,
                color: "var(--text-primary)",
                letterSpacing: "-0.02em",
              }}>
                What is Reddit<br />
                <span style={{
                  background: "linear-gradient(120deg, #a78bfa 0%, #60a5fa 50%, #34d399 100%)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}>
                  feeling right now?
                </span>
              </h1>

              <p style={{ fontSize: 17, color: "var(--text-secondary)", maxWidth: 480, margin: "0 auto", lineHeight: 1.7 }}>
                Enter any topic to fetch Reddit posts and score their sentiment using a weighted ensemble of three NLP models.
              </p>
            </div>
          )}

          {/* Error banner */}
          {appState === "error" && errorMsg && (
            <div
              className="fade-up"
              style={{
                display: "flex", alignItems: "flex-start", gap: 14,
                borderRadius: 14, border: "1px solid rgba(239,68,68,0.2)",
                background: "rgba(239,68,68,0.06)",
                padding: "16px 20px", marginBottom: 20,
              }}
            >
              <span style={{ fontSize: 20, marginTop: 1 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <p style={{ fontWeight: 600, color: "#f87171", fontSize: 14, marginBottom: 2 }}>Connection Error</p>
                <p style={{ color: "rgba(248,113,113,0.7)", fontSize: 13 }}>{errorMsg}</p>
              </div>
              <button
                onClick={handleReset}
                style={{ color: "rgba(255,255,255,0.3)", fontSize: 20, lineHeight: 1, cursor: "pointer", border: "none", background: "none" }}
              >×</button>
            </div>
          )}

          {/* Form */}
          {showForm && <SearchForm onSearchStarted={handleSearchStarted} onError={(m) => { setErrorMsg(m); setAppState("error"); }} />}

          {/* Status tracker */}
          {showStatus && searchStatus && (
            <StatusProgress
              status={searchStatus.status as "pending" | "running" | "completed" | "failed"}
              keyword={searchStatus.keyword}
              errorMessage={errorMsg}
            />
          )}

        </div>
      </main>

      {/* ── Footer ── */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,0.04)", padding: "20px 24px", textAlign: "center" }}>
        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
          Moodit · Reddit Sentiment Analysis · VADER + TextBlob + DistilBERT + Gemini
        </p>
      </footer>
    </div>
  );
}
