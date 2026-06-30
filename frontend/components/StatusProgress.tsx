"use client";

import React from "react";

interface Props {
  status: "pending" | "running" | "completed" | "failed";
  keyword: string;
  errorMessage?: string | null;
}

const STEPS = [
  { key: "pending",   label: "Queued",      desc: "Connecting to Reddit API…",                      icon: "⏳" },
  { key: "running",   label: "Analysing",   desc: "Running VADER · TextBlob · DistilBERT · spaCy…", icon: "⚙️" },
  { key: "completed", label: "Complete",    desc: "Redirecting to your dashboard…",                  icon: "✅" },
];

export default function StatusProgress({ status, keyword, errorMessage }: Props) {
  const stepIndex = STEPS.findIndex((s) => s.key === status);
  const activeStep = stepIndex === -1 ? 0 : stepIndex;

  return (
    <div className="card fade-up">
      <div className="card-section" style={{ textAlign: "center" }}>

        {/* Keyword badge */}
        <div style={{ display: "inline-flex", alignItems: "center", gap: 8, marginBottom: 28 }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "var(--violet)", boxShadow: "0 0 8px rgba(124,58,237,0.8)", animation: "pulse 1.5s ease infinite" }} />
          <span style={{ fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--text-muted)" }}>Analysing</span>
        </div>

        <h2 style={{ fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4, lineHeight: 1.2 }}>
          &ldquo;{keyword}&rdquo;
        </h2>
        <p style={{ fontSize: 14, color: "var(--text-muted)", marginBottom: 36 }}>
          {status === "failed"
            ? "The pipeline encountered an error."
            : (STEPS[activeStep]?.desc ?? "")}
        </p>

        {status === "failed" ? (
          <div style={{
            borderRadius: 14,
            border: "1px solid rgba(239,68,68,0.25)",
            background: "rgba(239,68,68,0.07)",
            padding: "20px 24px",
            textAlign: "left",
          }}>
            <p style={{ fontWeight: 600, color: "#f87171", marginBottom: 4 }}>Analysis Failed</p>
            {errorMessage && <p style={{ fontSize: 13, color: "rgba(248,113,113,0.7)" }}>{errorMessage}</p>}
          </div>
        ) : (
          <>
            {/* Step tracker */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 0, marginBottom: 36 }}>
              {STEPS.map((step, i) => {
                const done    = i < stepIndex;
                const active  = i === stepIndex;
                const pending = i > stepIndex;
                return (
                  <React.Fragment key={step.key}>
                    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10 }}>
                      <div
                        className={`step-dot ${done ? "step-done" : active ? "step-active" : "step-pending"}`}
                        style={active ? { animation: "pulse 1.8s ease infinite" } : {}}
                      >
                        {step.icon}
                      </div>
                      <span style={{
                        fontSize:   11,
                        fontWeight: 600,
                        letterSpacing: "0.06em",
                        textTransform: "uppercase",
                        color: active ? "#c4b5fd" : done ? "var(--text-secondary)" : "var(--text-muted)",
                      }}>
                        {step.label}
                      </span>
                    </div>
                    {i < STEPS.length - 1 && (
                      <div style={{
                        height:     2,
                        width:      72,
                        marginBottom: 24,
                        borderRadius: 1,
                        background: done ? "rgba(124,58,237,0.6)" : "rgba(255,255,255,0.07)",
                        transition: "background 0.5s",
                        marginLeft: 4,
                        marginRight: 4,
                      }} />
                    )}
                  </React.Fragment>
                );
              })}
            </div>

            {/* Indeterminate progress bar */}
            {(status === "pending" || status === "running") && (
              <div style={{ width: "100%", height: 4, borderRadius: 2, background: "rgba(255,255,255,0.06)", overflow: "hidden" }}>
                <div
                  className="bar-indeterminate"
                  style={{
                    height: "100%",
                    borderRadius: 2,
                    background: "linear-gradient(90deg, var(--violet), var(--blue))",
                    boxShadow: "0 0 12px rgba(124,58,237,0.6)",
                  }}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
