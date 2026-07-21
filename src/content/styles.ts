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
  --cn-inset-bg: rgba(0,0,0,0.25);
  --cn-scrollbar: rgba(255,255,255,0.16);
  --cn-scrollbar-hover: rgba(255,255,255,0.28);
  --cn-mono: "SF Mono", ui-monospace, Menlo, Consolas, monospace;
  --cn-sans: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Segoe UI", Helvetica, Arial, sans-serif;
  --cn-body-font: var(--cn-sans);
  --cn-ease: cubic-bezier(0.22, 1, 0.36, 1);
}
.cn-root[data-theme="light"] {
  --cn-panel: rgba(247,247,249,0.92);
  --cn-card: rgba(0,0,0,0.035);
  --cn-card-hover: rgba(0,0,0,0.06);
  --cn-hairline: rgba(0,0,0,0.1);
  --cn-hairline-soft: rgba(0,0,0,0.07);
  --cn-text: #1d1d1f;
  --cn-muted: #6e6e73;
  --cn-muted-dim: #8e8e93;
  --cn-accent: #007aff;
  --cn-accent-soft: rgba(0,122,255,0.12);
  --cn-success: #248a3d;
  --cn-success-soft: rgba(36,138,61,0.12);
  --cn-warning: #b25000;
  --cn-warning-soft: rgba(178,80,0,0.12);
  --cn-danger: #d70015;
  --cn-danger-soft: rgba(215,0,21,0.1);
  --cn-inset-bg: rgba(0,0,0,0.045);
  --cn-scrollbar: rgba(0,0,0,0.16);
  --cn-scrollbar-hover: rgba(0,0,0,0.28);
}
* { box-sizing: border-box; }
.cn-file-path, .cn-tree-file-link, .cn-result-path, .cn-bookmark-link .cn-file-path, .cn-search-input { font-family: var(--cn-body-font); }
.cn-font-mono .cn-file-path, .cn-font-mono .cn-tree-file-link, .cn-font-mono .cn-result-path, .cn-font-mono .cn-bookmark-link .cn-file-path { font-family: var(--cn-mono); }

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
  position: relative;
  width: 344px;
  height: 80vh;
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
  transition: border-radius 0.2s ease;
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
.cn-body::-webkit-scrollbar-thumb, .cn-modal::-webkit-scrollbar-thumb { background: var(--cn-scrollbar); border-radius: 8px; }
.cn-body::-webkit-scrollbar-thumb:hover, .cn-modal::-webkit-scrollbar-thumb:hover { background: var(--cn-scrollbar-hover); }

.cn-ratelimit {
  flex-shrink: 0; padding: 7px 16px; font-size: 10.5px; color: var(--cn-muted-dim);
  border-top: 1px solid var(--cn-hairline-soft); text-align: center;
}
.cn-ratelimit-low { color: var(--cn-warning); font-weight: 600; }

.cn-header-actions { display: flex; align-items: center; gap: 2px; }
.cn-bookmark-active { color: var(--cn-warning); }
.cn-pin-active { color: var(--cn-accent); }

.cn-tabs { display: flex; gap: 2px; padding: 8px 16px 0; flex-shrink: 0; }
.cn-tab {
  flex: 1; text-align: center; padding: 7px 0; font-size: 12px; font-weight: 550;
  background: none; border: none; color: var(--cn-muted); cursor: pointer;
  border-radius: 8px 8px 0 0; border-bottom: 2px solid transparent; transition: all 0.15s ease;
}
.cn-tab:hover { color: var(--cn-text); }
.cn-tab-active { color: var(--cn-accent); border-bottom: 2px solid var(--cn-accent); }

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
.cn-purpose-text { font-size: 13px; line-height: 1.65; color: var(--cn-text); }
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
  background: var(--cn-inset-bg);
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
  margin-top: 16px; font-size: 13px; line-height: 1.65; color: var(--cn-text);
  background: var(--cn-inset-bg); padding: 13px; border-radius: 12px;
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
.cn-system-header { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 4px; }
.cn-system-name { font-weight: 600; font-size: 13px; color: var(--cn-text); }
.cn-confidence { font-size: 9.5px; font-weight: 650; padding: 2px 7px; border-radius: 8px; flex-shrink: 0; white-space: nowrap; cursor: help; }
.cn-confidence-high { background: var(--cn-success-soft); color: var(--cn-success); }
.cn-confidence-medium { background: var(--cn-warning-soft); color: var(--cn-warning); }
.cn-confidence-low { background: rgba(255,255,255,0.06); color: var(--cn-muted); }
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
  background: var(--cn-inset-bg);
  border: 1px solid var(--cn-hairline-soft);
  border-radius: 14px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px;
  cursor: grab;
  touch-action: none;
}
.cn-flow-viewport.cn-flow-dragging { cursor: grabbing; }
.cn-flow-svg { transform-origin: center center; transition: transform 0.1s ease; }
.cn-flow-dragging .cn-flow-svg { transition: none; }
.cn-flow-svg svg { max-width: none; overflow: visible; display: block; }
.cn-flow-svg .edgeLabel { background-color: transparent; }
.cn-flow-svg foreignObject { overflow: visible; }
.cn-flow-svg foreignObject div { display: flex !important; align-items: center; justify-content: center; width: 100%; height: 100%; }
.cn-flow-svg .node rect, .cn-flow-svg .node polygon, .cn-flow-svg .node circle { overflow: visible; }
.cn-flow-svg .nodeLabel {
  white-space: normal !important; overflow: visible !important;
  text-align: center; display: flex !important; align-items: center; justify-content: center;
  width: 100%;
}

.cn-pr-row { display: flex; flex-direction: column; gap: 4px; padding: 10px 0; border-bottom: 1px solid var(--cn-hairline-soft); }
.cn-pr-row:last-child { border-bottom: none; }

.cn-tour-trigger { margin-top: 8px; width: 100%; justify-content: center; display: flex; }
.cn-tour-modal { width: 560px; max-height: 72vh; overflow-y: auto; }
.cn-tour-steps { display: flex; flex-direction: column; gap: 4px; }
.cn-tour-step {
  display: flex; align-items: flex-start; gap: 10px; padding: 10px; border-radius: 10px;
  background: var(--cn-card); border: 1px solid var(--cn-hairline-soft); transition: opacity 0.15s ease;
}
.cn-tour-step-done { opacity: 0.55; }
.cn-tour-check {
  flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; display: flex; align-items: center;
  justify-content: center; background: var(--cn-bg-deep); border: 1px solid var(--cn-hairline);
  color: var(--cn-text); font-size: 11px; font-weight: 700; cursor: pointer; transition: all 0.15s ease;
}
.cn-tour-step-done .cn-tour-check { background: var(--cn-success-soft); border-color: transparent; color: var(--cn-success); }
.cn-tour-step-body { flex: 1; min-width: 0; }
.cn-tour-step-path { color: var(--cn-accent); text-decoration: none; font-size: 12.5px; font-weight: 600; word-break: break-all; }
.cn-tour-step-path:hover { text-decoration: underline; }

/* Pinned mode: full-height side panel instead of a floating centered card */
.cn-root.cn-pinned { top: 0; transform: none; height: 100vh; align-items: stretch; }
.cn-root.cn-pinned .cn-panel { height: 100vh; max-height: 100vh; border-radius: 0; box-shadow: -8px 0 32px rgba(0,0,0,0.35); }
.cn-root.cn-pinned.cn-dock-left .cn-panel { box-shadow: 8px 0 32px rgba(0,0,0,0.35); }
.cn-root.cn-pinned .cn-toggle { display: none; }

.cn-resize-handle {
  position: absolute; top: 0; left: 0; width: 6px; height: 100%; cursor: ew-resize; z-index: 5;
  touch-action: none;
}
.cn-resize-handle::after {
  content: ''; position: absolute; top: 0; left: 2px; width: 2px; height: 100%;
  background: transparent; transition: background 0.15s ease;
}
.cn-resize-handle:hover::after, .cn-resize-handle:active::after { background: var(--cn-accent); }
.cn-resize-handle-left { left: auto; right: 0; }
.cn-resize-handle-left::after { left: auto; right: 2px; }

/* Dock on the left edge instead of right — mirror everything */
.cn-root.cn-dock-left { left: 0; right: auto; flex-direction: row-reverse; }
.cn-root.cn-dock-left .cn-toggle { border-radius: 0 14px 14px 0; border: 1px solid var(--cn-hairline); border-left: none; }
.cn-root.cn-dock-left.cn-collapsed .cn-toggle { border-radius: 14px; border-left: 1px solid var(--cn-hairline); }
.cn-root.cn-dock-left .cn-panel { border-radius: 0 18px 18px 0; border: 1px solid var(--cn-hairline); border-left: none; box-shadow: 8px 16px 48px rgba(0,0,0,0.45), 0 1px 0 rgba(255,255,255,0.04) inset; }
/* Pinned + dock-left both active: keep flat edges, overriding the rounded dock-left corners above (later rule wins on equal specificity). */
.cn-root.cn-pinned.cn-dock-left .cn-panel { border-radius: 0; box-shadow: 8px 0 32px rgba(0,0,0,0.35); }

.cn-tree-search-row { display: flex; align-items: center; gap: 6px; margin-bottom: 10px; }
.cn-tree-home {
  display: flex; align-items: center; justify-content: center; flex-shrink: 0;
  width: 32px; height: 32px; border-radius: 10px; background: var(--cn-card); color: var(--cn-muted);
  border: 1px solid var(--cn-hairline-soft); transition: background 0.15s ease, color 0.15s ease;
}
.cn-tree-home:hover { background: var(--cn-card-hover); color: var(--cn-accent); }
.cn-tree-search {
  flex: 1; min-width: 0; padding: 8px 12px; font-size: 12.5px; border: 1px solid var(--cn-hairline-soft);
  border-radius: 10px; background: var(--cn-inset-bg); color: var(--cn-text); outline: none;
  box-sizing: border-box; transition: border-color 0.15s ease;
}
.cn-tree-search::placeholder { color: var(--cn-muted-dim); }
.cn-tree-search:focus { border-color: var(--cn-accent); }
.cn-tree { font-size: 12.5px; }
.cn-tree-node { position: relative; }
.cn-tree-row {
  display: flex; align-items: center; gap: 6px; width: 100%; padding: 5px 8px;
  background: none; border: none; text-align: left; cursor: pointer; color: var(--cn-text);
  border-radius: 6px; transition: background 0.12s ease;
}
.cn-tree-row:hover { background: var(--cn-card); }
.cn-tree-folder-name { font-weight: 500; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.cn-tree-count { margin-left: auto; font-size: 10px; color: var(--cn-muted-dim); flex-shrink: 0; }
.cn-tree-chevron { color: var(--cn-muted); flex-shrink: 0; transition: transform 0.18s var(--cn-ease); }
.cn-tree-chevron-open { transform: rotate(90deg); }
.cn-tree-folder-icon { color: #6fa8dc; flex-shrink: 0; }
.cn-tree-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; margin-left: 3px; }
.cn-tree-file-link {
  flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
  color: var(--cn-text); text-decoration: none;
}
.cn-tree-file-link:hover { color: var(--cn-accent); }
.cn-tree-star {
  background: none; border: none; cursor: pointer; color: var(--cn-muted-dim); padding: 2px;
  display: flex; align-items: center; opacity: 0; transition: opacity 0.12s ease, color 0.12s ease; flex-shrink: 0;
}
.cn-tree-row:hover .cn-tree-star { opacity: 1; }
.cn-tree-star-on { opacity: 1; color: var(--cn-warning); }

/* Smooth expand/collapse without measuring heights in JS (grid-template-rows trick) */
.cn-tree-children-wrap { display: grid; grid-template-rows: 0fr; transition: grid-template-rows 0.18s var(--cn-ease); }
.cn-tree-children-wrap.cn-open { grid-template-rows: 1fr; }
.cn-tree-children-inner { overflow: hidden; min-height: 0; }
.cn-tree-children {
  margin-left: 15px; padding-left: 9px; border-left: 1px solid var(--cn-hairline-soft);
}
.cn-tree-children:hover { border-left-color: var(--cn-hairline); }

.cn-bookmark-group { display: flex; flex-direction: column; }
.cn-bookmark-row {
  display: flex; align-items: center; justify-content: space-between; gap: 6px;
  padding: 8px 4px; border-bottom: 1px solid var(--cn-hairline-soft);
}
.cn-bookmark-row:last-child { border-bottom: none; }
.cn-bookmark-link { display: flex; align-items: center; gap: 8px; flex: 1; min-width: 0; text-decoration: none; color: var(--cn-text); font-size: 12.5px; }
.cn-bookmark-link:hover .cn-file-path { color: var(--cn-accent); }
`
