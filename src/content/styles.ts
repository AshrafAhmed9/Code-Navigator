export const styles = `
:host, .cn-root {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 13px;
  color: var(--cn-text);
  -webkit-font-smoothing: antialiased;

  --cn-bg: #17182a;
  --cn-bg-deep: #101120;
  --cn-panel: #1c1e33;
  --cn-card: #20223b;
  --cn-border: #34365a;
  --cn-border-soft: #292b47;
  --cn-text: #eceafd;
  --cn-muted: #9d9fc4;
  --cn-accent: #8b7cf6;
  --cn-accent-soft: #4c3fa8;
  --cn-accent-bg: #2a2456;
  --cn-success: #4ade80;
  --cn-warning: #fbbf24;
  --cn-danger: #f87171;
}
* { box-sizing: border-box; }

.cn-root {
  position: fixed;
  top: 50%;
  right: 0;
  transform: translateY(-50%);
  z-index: 2147483647;
  display: flex;
  align-items: center;
  gap: 0;
}

.cn-toggle {
  width: 40px;
  height: 40px;
  min-width: 40px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cn-panel);
  color: var(--cn-text);
  border: 1px solid var(--cn-border);
  border-right: none;
  border-radius: 10px 0 0 10px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.cn-toggle:hover { background: var(--cn-card); color: var(--cn-accent); }
.cn-root.cn-collapsed .cn-toggle { border-radius: 10px; border-right: 1px solid var(--cn-border); }

.cn-panel {
  width: 340px;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  background: var(--cn-bg);
  border: 1px solid var(--cn-border);
  border-right: none;
  border-radius: 12px 0 0 12px;
  box-shadow: -4px 8px 32px rgba(6,7,15,0.55);
  color: var(--cn-text);
  overflow: hidden;
}

.cn-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid var(--cn-border-soft);
  background: var(--cn-panel);
  flex-shrink: 0;
}
.cn-brand { display: flex; align-items: center; gap: 7px; font-weight: 600; font-size: 13px; color: #fff; }
.cn-brand-dot { width: 7px; height: 7px; border-radius: 50%; background: var(--cn-accent); box-shadow: 0 0 7px var(--cn-accent); flex-shrink: 0; }
.cn-back {
  display: flex; align-items: center; gap: 4px;
  background: none; border: none; color: var(--cn-muted); font-size: 12.5px; font-weight: 500;
  cursor: pointer; padding: 2px 4px 2px 0; transition: color 0.15s ease;
}
.cn-back:hover { color: var(--cn-text); }
.cn-collapse-btn {
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; background: none; border: none; color: var(--cn-muted);
  cursor: pointer; border-radius: 6px; transition: background 0.15s ease, color 0.15s ease;
}
.cn-collapse-btn:hover { background: var(--cn-card); color: var(--cn-text); }

.cn-body {
  padding: 14px;
  overflow-y: auto;
  flex: 1;
}
.cn-body::-webkit-scrollbar, .cn-panel::-webkit-scrollbar, .cn-modal::-webkit-scrollbar { width: 8px; }
.cn-body::-webkit-scrollbar-track, .cn-modal::-webkit-scrollbar-track { background: transparent; }
.cn-body::-webkit-scrollbar-thumb, .cn-modal::-webkit-scrollbar-thumb { background: var(--cn-border); border-radius: 8px; }
.cn-body::-webkit-scrollbar-thumb:hover, .cn-modal::-webkit-scrollbar-thumb:hover { background: var(--cn-accent-soft); }

.cn-h3 { margin: 0 0 4px 0; font-size: 15.5px; font-weight: 650; color: #fff; letter-spacing: -0.1px; }
.cn-muted { color: var(--cn-muted); font-size: 12px; line-height: 1.55; }
.cn-error { color: var(--cn-danger); font-size: 12px; }
.cn-error-block { background: #3a1a24; border: 1px solid #6b2a3a; color: #ff9fb0; padding: 10px 12px; border-radius: 8px; font-size: 12px; line-height: 1.5; }

.cn-section { margin-top: 18px; }
.cn-section:first-of-type { margin-top: 14px; }
.cn-label {
  font-weight: 650; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px;
  color: var(--cn-muted); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;
}
.cn-card {
  background: var(--cn-card);
  border: 1px solid var(--cn-border-soft);
  border-radius: 10px;
  padding: 8px 10px;
}
.cn-file-row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 5px 0; font-size: 12px; color: #d6d7f0; text-decoration: none;
  border-bottom: 1px solid var(--cn-border-soft);
}
.cn-file-row:last-child { border-bottom: none; }
.cn-file-path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
a.cn-file-row.cn-link:hover { color: var(--cn-accent); }
.cn-link { color: #a99bff; cursor: pointer; text-decoration: none; transition: opacity 0.15s ease; }
.cn-link:hover { text-decoration: underline; opacity: 0.9; }
.cn-hint { display: inline-block; margin-top: 8px; font-size: 11.5px; }

.cn-badge {
  background: var(--cn-bg-deep); border-radius: 10px; padding: 1px 7px; font-size: 10.5px;
  color: var(--cn-muted); border: 1px solid var(--cn-border); flex-shrink: 0; font-variant-numeric: tabular-nums;
}
.cn-stat { font-size: 12px; color: var(--cn-muted); margin-bottom: 2px; }

.cn-risk { padding: 2px 9px; border-radius: 10px; font-size: 10px; font-weight: 700; letter-spacing: 0.3px; }
.cn-risk-low { background: #123a26; color: var(--cn-success); }
.cn-risk-medium { background: #3d3111; color: var(--cn-warning); }
.cn-risk-high { background: #3a1a24; color: var(--cn-danger); }

.cn-badge-inferred {
  background: var(--cn-accent-bg); color: #c4b8ff; font-weight: 600; text-transform: none;
  letter-spacing: 0; font-size: 10px; padding: 2px 8px; border-radius: 10px;
}
.cn-purpose-text { font-size: 12.5px; line-height: 1.65; color: #d6d7f0; }
.cn-cursor { animation: cn-blink 1s step-start infinite; color: var(--cn-accent); }
@keyframes cn-blink { 50% { opacity: 0; } }

.cn-loading { display: flex; align-items: center; gap: 8px; color: var(--cn-muted); font-size: 12.5px; }
.cn-loading-block { display: flex; flex-direction: column; gap: 8px; }
.cn-spinner {
  width: 13px; height: 13px; border-radius: 50%;
  border: 2px solid var(--cn-border); border-top-color: var(--cn-accent);
  animation: cn-spin 0.7s linear infinite; flex-shrink: 0;
}
@keyframes cn-spin { to { transform: rotate(360deg); } }
.cn-progress-track { height: 4px; background: var(--cn-border-soft); border-radius: 4px; overflow: hidden; }
.cn-progress-fill { height: 100%; background: linear-gradient(90deg, var(--cn-accent-soft), var(--cn-accent)); transition: width 0.2s ease; border-radius: 4px; }

.cn-search-trigger {
  width: 100%;
  text-align: left;
  padding: 9px 11px;
  border: 1px solid var(--cn-border);
  border-radius: 8px;
  background: var(--cn-panel);
  color: var(--cn-muted);
  font-size: 12.5px;
  cursor: pointer;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.cn-search-trigger:hover { border-color: var(--cn-accent); background: var(--cn-card); }
.cn-search-trigger span:nth-child(2) { flex: 1; }
.cn-kbd { background: var(--cn-bg-deep); border: 1px solid var(--cn-border); border-radius: 4px; padding: 1px 5px; font-size: 10px; color: #d6d7f0; }

.cn-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(8,8,18,0.72);
  backdrop-filter: blur(3px);
  z-index: 2147483647;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
}
.cn-modal {
  width: 500px;
  max-height: 62vh;
  overflow-y: auto;
  background: var(--cn-panel);
  border: 1px solid var(--cn-border);
  border-radius: 12px;
  box-shadow: 0 16px 56px rgba(6,7,15,0.65);
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--cn-text);
}
.cn-search-input {
  width: 100%;
  padding: 11px 14px;
  font-size: 15px;
  border: 1px solid var(--cn-border);
  border-radius: 8px;
  box-sizing: border-box;
  outline: none;
  background: var(--cn-bg-deep);
  color: var(--cn-text);
  transition: border-color 0.15s ease;
}
.cn-search-input::placeholder { color: #6b6d94; }
.cn-search-input:focus { border-color: var(--cn-accent); box-shadow: 0 0 0 3px rgba(139,124,246,0.2); }
.cn-chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.cn-chip {
  background: var(--cn-card);
  border: 1px solid var(--cn-border);
  border-radius: 16px;
  padding: 5px 13px;
  font-size: 12px;
  cursor: pointer;
  color: #d6d7f0;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.cn-chip:hover { background: var(--cn-accent-bg); border-color: var(--cn-accent); color: #fff; }
.cn-narrative {
  margin-top: 14px; font-size: 12.5px; line-height: 1.65; color: #d6d7f0;
  background: var(--cn-bg-deep); border: 1px solid var(--cn-border-soft); padding: 12px; border-radius: 8px;
}
.cn-results { margin-top: 14px; }
.cn-result-row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 8px 4px; border-bottom: 1px solid var(--cn-border-soft); border-radius: 6px;
  transition: background 0.15s ease;
}
.cn-result-row:hover { background: var(--cn-card); }
.cn-result-main { background: none; border: none; text-align: left; cursor: pointer; padding: 0; font-size: 12.5px; flex: 1; min-width: 0; }
.cn-result-path { color: var(--cn-accent); word-break: break-all; }
.cn-flow-btn {
  background: var(--cn-card); border: 1px solid var(--cn-border); border-radius: 6px; padding: 4px 9px;
  font-size: 11px; cursor: pointer; white-space: nowrap; color: #d6d7f0; transition: all 0.15s ease;
}
.cn-flow-btn:hover { background: var(--cn-accent-bg); border-color: var(--cn-accent); color: #c4b8ff; }

.cn-system-row { margin-bottom: 12px; }
.cn-system-row:last-child { margin-bottom: 0; }
.cn-system-name { font-weight: 650; font-size: 12.5px; color: #fff; margin-bottom: 3px; }
.cn-system-file { padding-left: 8px; color: var(--cn-muted); border-bottom: none; padding-top: 2px; padding-bottom: 2px; }
.cn-entry-row { }
.cn-area-label { font-weight: 650; font-size: 11.5px; color: #fff; }
.cn-lang-row { display: flex; flex-wrap: wrap; gap: 6px; }
.cn-lang-pill {
  display: inline-flex; align-items: center; gap: 5px; background: var(--cn-card);
  border: 1px solid var(--cn-border-soft); border-radius: 14px; padding: 3px 6px 3px 10px; font-size: 11.5px; color: #d6d7f0;
}

.cn-close { background: none; border: none; cursor: pointer; font-size: 14px; color: var(--cn-muted); border-radius: 6px; padding: 4px 8px; transition: all 0.15s ease; }
.cn-close:hover { background: var(--cn-card); color: #fff; }

.cn-flow-modal {
  width: min(92vw, 1200px);
  height: min(86vh, 820px);
  display: flex;
  flex-direction: column;
  background: var(--cn-panel);
  border: 1px solid var(--cn-border);
  border-radius: 14px;
  box-shadow: 0 20px 64px rgba(6,7,15,0.7);
  padding: 18px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--cn-text);
}
.cn-flow-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; gap: 12px; flex-shrink: 0; }
.cn-flow-controls { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.cn-flow-viewport {
  flex: 1;
  overflow: hidden;
  background: var(--cn-bg-deep);
  border: 1px solid var(--cn-border-soft);
  border-radius: 10px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
  cursor: grab;
  touch-action: none;
}
.cn-flow-viewport.cn-flow-dragging { cursor: grabbing; }
.cn-flow-svg { transform-origin: top center; transition: transform 0.1s ease; }
.cn-flow-dragging .cn-flow-svg { transition: none; }
.cn-flow-svg svg { max-width: none; min-width: 500px; }
.cn-flow-svg .edgeLabel { background-color: var(--cn-bg-deep); }

.cn-pr-row { display: flex; flex-direction: column; gap: 3px; padding: 8px 0; border-bottom: 1px solid var(--cn-border-soft); }
.cn-pr-row:last-child { border-bottom: none; }
`
