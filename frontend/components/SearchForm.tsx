"use client";

import React, { useState } from "react";
import { createSearch, SearchPayload, SearchStatus } from "@/lib/api";

const ENTITY_LABELS = [
  { value: "PERSON",      label: "Person" },
  { value: "ORG",         label: "Organization" },
  { value: "GPE",         label: "Location" },
  { value: "EVENT",       label: "Event" },
  { value: "PRODUCT",     label: "Product" },
  { value: "MONEY",       label: "Money" },
  { value: "LAW",         label: "Law" },
  { value: "NORP",        label: "Group / Nation" },
  { value: "WORK_OF_ART", label: "Work of Art" },
];

const TIME_WINDOWS = ["All time", "Last 24h", "Last 7d"];

const WEIGHT_CONFIG = [
  { key: "vader", label: "VADER",      color: "#10b981", glowColor: "rgba(16,185,129,0.4)" },
  { key: "blob",  label: "TextBlob",   color: "#3b82f6", glowColor: "rgba(59,130,246,0.4)" },
  { key: "bert",  label: "DistilBERT", color: "#7c3aed", glowColor: "rgba(124,58,237,0.4)" },
] as const;

interface Props {
  onSearchStarted: (status: SearchStatus) => void;
  onError: (msg: string) => void;
}

export default function SearchForm({ onSearchStarted, onError }: Props) {
  const [keyword,  setKeyword]  = useState("Bitcoin");
  const [subreddit, setSubreddit] = useState("CryptoCurrency");
  const [timeWindow, setTimeWindow] = useState("Last 24h");
  const [postCount, setPostCount]   = useState(50);
  const [weights, setWeights] = useState({ vader: 0.4, blob: 0.3, bert: 0.3 });
  const [entities, setEntities] = useState<string[]>(["ORG", "MONEY", "PRODUCT"]);
  const [loading, setLoading] = useState(false);

  const totalW = weights.vader + weights.blob + weights.bert || 1;

  const setWeight = (key: "vader" | "blob" | "bert", val: number) =>
    setWeights((prev) => ({ ...prev, [key]: val }));

  const toggleEntity = (v: string) =>
    setEntities((prev) => prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyword.trim()) { onError("Please enter a keyword."); return; }
    setLoading(true);
    try {
      const payload: SearchPayload = {
        keyword:        keyword.trim(),
        subreddit:      subreddit.trim() || null,
        time_window:    timeWindow,
        post_count:     postCount,
        entity_filters: entities,
        w_vader:        weights.vader,
        w_blob:         weights.blob,
        w_bert:         weights.bert,
      };
      const status = await createSearch(payload);
      onSearchStarted(status);
    } catch (err: unknown) {
      onError(err instanceof Error ? err.message : "Unknown error — is the backend running?");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} noValidate>
      <div className="card fade-up">

        {/* ── Section 1: Query ── */}
        <div className="card-section">
          <p className="field-label" style={{ marginBottom: 20 }}>Search Configuration</p>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
            <div>
              <label className="field-label" htmlFor="keyword">Keyword / Topic</label>
              <input
                id="keyword"
                className="field-input"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="Bitcoin, AI, Climate…"
                required
              />
            </div>
            <div>
              <label className="field-label" htmlFor="subreddit">
                Subreddit
                <span style={{ fontWeight: 400, color: "var(--text-muted)", marginLeft: 6, textTransform: "none", letterSpacing: 0 }}>
                  (optional — blank = all)
                </span>
              </label>
              <input
                id="subreddit"
                className="field-input"
                value={subreddit}
                onChange={(e) => setSubreddit(e.target.value)}
                placeholder="CryptoCurrency"
              />
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginTop: 20 }}>
            <div>
              <label className="field-label" htmlFor="time-window">Time Window</label>
              <select
                id="time-window"
                className="field-input"
                value={timeWindow}
                onChange={(e) => setTimeWindow(e.target.value)}
              >
                {TIME_WINDOWS.map((w) => <option key={w}>{w}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">
                Posts to Fetch&nbsp;
                <span style={{ color: "#a78bfa", fontWeight: 700, fontSize: 13, textTransform: "none", letterSpacing: 0 }}>
                  {postCount}
                </span>
              </label>
              <div style={{ paddingTop: 8 }}>
                <input
                  type="range" min={10} max={200} step={5}
                  className="slider"
                  value={postCount}
                  onChange={(e) => setPostCount(Number(e.target.value))}
                />
                <div style={{ display: "flex", justifyContent: "space-between", marginTop: 4 }}>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>10</span>
                  <span style={{ fontSize: 11, color: "var(--text-muted)" }}>200</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="divider" />

        {/* ── Section 2: Model Weights ── */}
        <div className="card-section">
          <p className="field-label" style={{ marginBottom: 20 }}>
            Model Weights
            <span style={{ marginLeft: 8, color: "var(--text-muted)", fontWeight: 400, textTransform: "none", letterSpacing: 0 }}>
              — auto-normalised to 100%
            </span>
          </p>
          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {WEIGHT_CONFIG.map(({ key, label, color, glowColor }) => {
              const val = weights[key];
              const pct = Math.round((val / totalW) * 100);
              return (
                <div key={key}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                    <span style={{ fontSize: 13, color: "var(--text-secondary)", fontWeight: 500 }}>{label}</span>
                    <span style={{ fontSize: 13, fontWeight: 700, color, textShadow: `0 0 8px ${glowColor}` }}>
                      {pct}%
                    </span>
                  </div>
                  {/* Visual fill bar */}
                  <div className="weight-bar-track" style={{ marginBottom: 8 }}>
                    <div
                      className="weight-bar-fill"
                      style={{ width: `${pct}%`, background: `linear-gradient(90deg, ${color}88, ${color})` }}
                    />
                  </div>
                  <input
                    type="range" min={0} max={1} step={0.05}
                    className="slider"
                    value={val}
                    onChange={(e) => setWeight(key, Number(e.target.value))}
                  />
                </div>
              );
            })}
          </div>
        </div>

        <div className="divider" />

        {/* ── Section 3: Entity Filters ── */}
        <div className="card-section">
          <p className="field-label" style={{ marginBottom: 16 }}>Extract Entity Types</p>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {ENTITY_LABELS.map(({ value, label }) => {
              const on = entities.includes(value);
              return (
                <button
                  key={value}
                  type="button"
                  onClick={() => toggleEntity(value)}
                  className={`chip ${on ? "chip-on" : "chip-off"}`}
                >
                  {on && (
                    <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                      <path d="M1.5 5l2.5 2.5 4.5-4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  )}
                  {label}
                </button>
              );
            })}
          </div>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 12 }}>
            {entities.length === 0
              ? "No entities will be extracted."
              : `${entities.length} type${entities.length > 1 ? "s" : ""} selected`}
          </p>
        </div>

        <div className="divider" />

        {/* ── Section 4: Submit ── */}
        <div className="card-section">
          <button type="submit" className="btn-primary" disabled={loading}>
            {loading ? (
              <>
                <svg className="spin" width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25"/>
                  <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round"/>
                </svg>
                Starting analysis…
              </>
            ) : (
              <>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
                </svg>
                Run Analysis
              </>
            )}
          </button>
        </div>

      </div>
    </form>
  );
}
