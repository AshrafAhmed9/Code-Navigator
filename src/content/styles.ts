export const styles = `
:host, .cn-root {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 13px;
  color: var(--cn-text);
  -webkit-font-smoothing: antialiased;

  --cn-bg: rgba(28,28,30,0.88);
  --cn-bg-solid: #1c1c1e;
  --cn-bg-deep: #131314;
  --cn-panel: rgba(36,36,38,0.9);
  --cn-card: rgba(255,255,255,0.045);
  --cn-card-hover: rgba(255,255,255,0.075);
  --cn-hairline: rgba(255,255,255,0.09);
  --cn-hairline-soft: rgba(255,255,255,0.06);
  --cn-text: #f5f5f7;
  --cn-muted: #98989d;
  --cn-muted-dim: #6e6e73;
  --cn-accent: #0a84ff;
  --cn-accent-soft: rgba(10,132,255,0.16);
  --cn-success: #32d74b;
  --cn-success-soft: rgba(50,215,75,0.14);
  --cn-warning: #ffd60a;
  --cn-warning-soft: rgba(255,214,10,0.14);
  --cn-danger: #ff453a;
  --cn-danger-soft: rgba(255,69,58,0.14);
  --cn-ease: cubic-bezier(0.22, 1, 0.36, 1);
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
}

.cn-toggle {
  width: 42px;
  height: 42px;
  min-width: 42px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--cn-panel);
  backdrop-filter: blur(20px) saturate(1.4);
  -webkit-backdrop-filter: blur(20px) saturate(1.4);
  color: var(--cn-muted);
  border: 1px solid var(--cn-hairline);
  border-right: none;
  border-radius: 14px 0 0 14px;
  cursor: pointer;
  transition: background 0.2s var(--cn-ease), color 0.2s var(--cn-ease), transform 0.2s var(--cn-ease);
}
.cn-toggle:hover { color: var(--cn-accent); transform: scale(1.04); }
.cn-toggle:active { transform: scale(0.97); }
.cn-root.cn-collapsed .cn-toggle { border-radius: 14px; border-right: 1px solid var(--cn-hairline); }

.cn-panel {
  width: 344px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  background: var(--cn-panel);
  backdrop-filter: blur(24px) saturate(1.5);
  -webkit-backdrop-filter: blur(24px) saturate(1.5);
  border: 1px solid var(--cn-hairline);
  border-right: none;
  border-radius: 18px 0 0 18px;
  box-shadow: -8px 16px 48px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.04) inset;
  color: var(--cn-text);
  overflow: hidden;
}

.cn-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid var(--cn-hairline-soft);
  flex-shrink: 0;
}
.cn-brand { display: flex; align-items: center; gap: 8px; font-weight: 600; font-size: 13.5px; color: var(--cn-text); letter-spacing: -0.1px; }
.cn-brand-dot { width: 6px; height: 6px; border-radius: 50%; background: var(--cn-success); box-shadow: 0 0 6px var(--cn-success); flex-shrink: 0; }
.cn-back {
  display: flex; align-items: center; gap: 4px;
  background: none; border: none; color: var(--cn-accent); font-size: 13px; font-weight: 500;
  cursor: pointer; padding: 2px 4px 2px 0; transition: opacity 0.15s ease;
}
.cn-back:hover { opacity: 0.7; }
.cn-collapse-btn {
  display: flex; align-items: center; justify-content: center;
  width: 26px; height: 26px; background: none; border: none; color: var(--cn-muted-dim);
  cursor: pointer; border-radius: 8px; transition: background 0.15s ease, color 0.15s ease;
}
.cn-collapse-btn:hover { background: var(--cn-card); color: var(--cn-text); }

.cn-body {
  padding: 16px;
  overflow-y: auto;
  flex: 1;
}
.cn-body::-webkit-scrollbar, .cn-panel::-webkit-scrollbar, .cn-modal::-webkit-scrollbar { width: 7px; }
.cn-body::-webkit-scrollbar-track, .cn-modal::-webkit-scrollbar-track { background: transparent; }
.cn-body::-webkit-scrollbar-thumb, .cn-modal::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.16); border-radius: 8px; }
.cn-body::-webkit-scrollbar-thumb:hover, .cn-modal::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.28); }

.cn-h3 { margin: 0 0 4px 0; font-size: 17px; font-weight: 650; color: var(--cn-text); letter-spacing: -0.3px; }
.cn-muted { color: var(--cn-muted); font-size: 12px; line-height: 1.55; }
.cn-error { color: var(--cn-danger); font-size: 12px; }
.cn-error-block { background: var(--cn-danger-soft); color: #ff9088; padding: 11px 13px; border-radius: 12px; font-size: 12px; line-height: 1.5; }

.cn-section { margin-top: 20px; }
.cn-section:first-of-type { margin-top: 16px; }
.cn-label {
  font-weight: 600; font-size: 12px; letter-spacing: -0.05px;
  color: var(--cn-muted); margin-bottom: 8px; display: flex; align-items: center; gap: 6px;
}
.cn-card {
  background: var(--cn-card);
  border: 1px solid var(--cn-hairline-soft);
  border-radius: 12px;
  padding: 4px 12px;
}
.cn-file-row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 8px 0; font-size: 12.5px; color: var(--cn-text); text-decoration: none;
  border-bottom: 1px solid var(--cn-hairline-soft);
}
.cn-file-row:last-child { border-bottom: none; }
.cn-file-path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
a.cn-file-row.cn-link:hover { color: var(--cn-accent); }
.cn-link { color: var(--cn-accent); cursor: pointer; text-decoration: none; transition: opacity 0.15s ease; }
.cn-link:hover { opacity: 0.7; }
.cn-hint { display: inline-block; margin-top: 8px; font-size: 12px; }

.cn-badge {
  background: rgba(255,255,255,0.07); border-radius: 8px; padding: 2px 7px; font-size: 10.5px;
  color: var(--cn-muted); flex-shrink: 0; font-variant-numeric: tabular-nums; font-weight: 500;
}
.cn-stat { font-size: 12.5px; color: var(--cn-muted); margin-bottom: 2px; }

.cn-risk { padding: 3px 10px; border-radius: 8px; font-size: 10px; font-weight: 650; letter-spacing: 0.2px; }
.cn-risk-low { background: var(--cn-success-soft); color: var(--cn-success); }
.cn-risk-medium { background: var(--cn-warning-soft); color: var(--cn-warning); }
.cn-risk-high { background: var(--cn-danger-soft); color: var(--cn-danger); }

.cn-badge-inferred {
  background: var(--cn-accent-soft); color: #6cb6ff; font-weight: 600; text-transform: none;
  letter-spacing: 0; font-size: 10px; padding: 3px 9px; border-radius: 8px;
}
.cn-purpose-text { font-size: 13px; line-height: 1.65; color: #e2e2e6; }
.cn-cursor { animation: cn-blink 1s step-start infinite; color: var(--cn-accent); }
@keyframes cn-blink { 50% { opacity: 0; } }

.cn-loading { display: flex; align-items: center; gap: 9px; color: var(--cn-muted); font-size: 12.5px; }
.cn-loading-block { display: flex; flex-direction: column; gap: 10px; }
.cn-spinner {
  width: 14px; height: 14px; border-radius: 50%;
  border: 2px solid rgba(255,255,255,0.14); border-top-color: var(--cn-accent);
  animation: cn-spin 0.8s linear infinite; flex-shrink: 0;
}
@keyframes cn-spin { to { transform: rotate(360deg); } }
.cn-progress-track { height: 4px; background: rgba(255,255,255,0.08); border-radius: 4px; overflow: hidden; }
.cn-progress-fill { height: 100%; background: var(--cn-accent); transition: width 0.25s var(--cn-ease); border-radius: 4px; }

.cn-search-trigger {
  width: 100%;
  text-align: left;
  padding: 10px 13px;
  border: 1px solid var(--cn-hairline-soft);
  border-radius: 12px;
  background: var(--cn-card);
  color: var(--cn-muted);
  font-size: 13px;
  cursor: pointer;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 9px;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.cn-search-trigger:hover { background: var(--cn-card-hover); border-color: rgba(255,255,255,0.14); }
.cn-search-trigger span:nth-child(2) { flex: 1; }
.cn-kbd { background: rgba(255,255,255,0.09); border-radius: 5px; padding: 2px 6px; font-size: 10.5px; color: var(--cn-muted); font-weight: 500; }

.cn-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.5);
  backdrop-filter: blur(6px);
  -webkit-backdrop-filter: blur(6px);
  z-index: 2147483647;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
  animation: cn-fade-in 0.15s var(--cn-ease);
}
@keyframes cn-fade-in { from { opacity: 0; } to { opacity: 1; } }
.cn-modal {
  width: 520px;
  max-height: 60vh;
  overflow-y: auto;
  background: var(--cn-panel);
  backdrop-filter: blur(28px) saturate(1.6);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
  border: 1px solid var(--cn-hairline);
  border-radius: 18px;
  box-shadow: 0 24px 64px rgba(0,0,0,0.5);
  padding: 18px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--cn-text);
  animation: cn-pop-in 0.18s var(--cn-ease);
}
@keyframes cn-pop-in { from { opacity: 0; transform: translateY(-8px) scale(0.98); } to { opacity: 1; transform: none; } }
.cn-search-input {
  width: 100%;
  padding: 12px 15px;
  font-size: 16px;
  border: 1px solid var(--cn-hairline);
  border-radius: 12px;
  box-sizing: border-box;
  outline: none;
  background: rgba(0,0,0,0.25);
  color: var(--cn-text);
  transition: border-color 0.15s ease, box-shadow 0.15s ease;
}
.cn-search-input::placeholder { color: var(--cn-muted-dim); }
.cn-search-input:focus { border-color: var(--cn-accent); box-shadow: 0 0 0 4px var(--cn-accent-soft); }
.cn-chip-row { display: flex; flex-wrap: wrap; gap: 7px; margin-top: 16px; }
.cn-chip {
  background: var(--cn-card);
  border: 1px solid var(--cn-hairline-soft);
  border-radius: 20px;
  padding: 6px 14px;
  font-size: 12.5px;
  font-weight: 500;
  cursor: pointer;
  color: var(--cn-text);
  transition: background 0.15s ease, transform 0.15s var(--cn-ease);
}
.cn-chip:hover { background: var(--cn-accent-soft); color: #6cb6ff; transform: translateY(-1px); }
.cn-narrative {
  margin-top: 16px; font-size: 13px; line-height: 1.65; color: #e2e2e6;
  background: rgba(0,0,0,0.25); padding: 13px; border-radius: 12px;
}
.cn-results { margin-top: 16px; }
.cn-result-row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 9px 8px; border-radius: 10px;
  transition: background 0.15s ease;
}
.cn-result-row:hover { background: var(--cn-card); }
.cn-result-main { background: none; border: none; text-align: left; cursor: pointer; padding: 0; font-size: 13px; flex: 1; min-width: 0; }
.cn-result-path { color: var(--cn-accent); word-break: break-all; }
.cn-flow-btn {
  background: var(--cn-card); border: 1px solid var(--cn-hairline-soft); border-radius: 8px; padding: 5px 10px;
  font-size: 11px; font-weight: 500; cursor: pointer; white-space: nowrap; color: var(--cn-text); transition: all 0.15s ease;
}
.cn-flow-btn:hover { background: var(--cn-accent-soft); border-color: transparent; color: #6cb6ff; }

.cn-system-row { padding: 10px 0; border-bottom: 1px solid var(--cn-hairline-soft); }
.cn-system-row:last-child { border-bottom: none; }
.cn-system-name { font-weight: 600; font-size: 13px; color: var(--cn-text); margin-bottom: 4px; }
.cn-system-file { padding-left: 10px; color: var(--cn-muted); border-bottom: none; padding-top: 2px; padding-bottom: 2px; font-size: 11.5px; }
.cn-entry-row { }
.cn-area-label { font-weight: 600; font-size: 12px; color: var(--cn-text); }
.cn-lang-row { display: flex; flex-wrap: wrap; gap: 7px; padding: 10px 0; }
.cn-lang-pill {
  display: inline-flex; align-items: center; gap: 6px; background: rgba(255,255,255,0.06);
  border-radius: 16px; padding: 4px 7px 4px 11px; font-size: 12px; color: var(--cn-text); font-weight: 500;
}

.cn-close { background: none; border: none; cursor: pointer; color: var(--cn-muted); border-radius: 8px; padding: 5px 9px; transition: all 0.15s ease; display: flex; align-items: center; }
.cn-close:hover { background: var(--cn-card); color: var(--cn-text); }

.cn-flow-modal {
  width: min(92vw, 1200px);
  height: min(86vh, 820px);
  display: flex;
  flex-direction: column;
  background: var(--cn-panel);
  backdrop-filter: blur(28px) saturate(1.6);
  -webkit-backdrop-filter: blur(28px) saturate(1.6);
  border: 1px solid var(--cn-hairline);
  border-radius: 20px;
  box-shadow: 0 28px 72px rgba(0,0,0,0.55);
  padding: 20px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: var(--cn-text);
  animation: cn-pop-in 0.18s var(--cn-ease);
}
.cn-flow-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 14px; gap: 12px; flex-shrink: 0; }
.cn-flow-controls { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.cn-flow-viewport {
  flex: 1;
  overflow: hidden;
  background: rgba(0,0,0,0.3);
  border: 1px solid var(--cn-hairline-soft);
  border-radius: 14px;
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
.cn-flow-svg .edgeLabel { background-color: transparent; }

.cn-pr-row { display: flex; flex-direction: column; gap: 4px; padding: 10px 0; border-bottom: 1px solid var(--cn-hairline-soft); }
.cn-pr-row:last-child { border-bottom: none; }
`
