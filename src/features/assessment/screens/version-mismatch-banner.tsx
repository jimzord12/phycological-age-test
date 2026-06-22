"use client";

import type { VersionMismatch } from "@/client/assessment-context";

const bannerStyle: React.CSSProperties = {
  marginBottom: 32,
  padding: "20px 24px",
  background: "rgba(251, 191, 36, 0.08)",
  border: "1px solid rgba(251, 191, 36, 0.35)",
  borderRadius: 8,
};

const buttonRowStyle: React.CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap" as const,
  marginTop: 16,
};

type Props = {
  mismatch: VersionMismatch;
  onDiscard: () => void;
  onExport: () => void;
};

export function VersionMismatchBanner({ mismatch, onDiscard, onExport }: Props) {
  return (
    <div role="alert" aria-live="assertive" style={bannerStyle}>
      <h2 style={{ margin: "0 0 8px", fontSize: "1.1rem", color: "var(--warning)" }}>
        Saved draft from an older questionnaire version
      </h2>
      <p style={{ margin: "0 0 4px", color: "var(--text-secondary)", fontSize: "0.9rem" }}>
        You have a saved draft from version{" "}
        <strong>{mismatch.storedState.questionnaireVersion}</strong>. The current version is{" "}
        <strong>{mismatch.currentVersion}</strong>. The old draft cannot be continued.
      </p>
      <p style={{ margin: 0, color: "var(--text-muted)", fontSize: "0.875rem" }}>
        Export your previous answers as JSON before discarding if you want to keep them.
      </p>
      <div style={buttonRowStyle}>
        <button
          onClick={onExport}
          style={{
            background: "var(--surface)",
            color: "var(--text-primary)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "8px 18px",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Export old draft as JSON
        </button>
        <button
          onClick={onDiscard}
          style={{
            background: "transparent",
            color: "var(--text-muted)",
            border: "1px solid var(--border)",
            borderRadius: 6,
            padding: "8px 18px",
            fontSize: "0.875rem",
            cursor: "pointer",
          }}
        >
          Discard old draft
        </button>
      </div>
    </div>
  );
}
