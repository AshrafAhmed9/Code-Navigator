export const styles = `
:host, .cn-root {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  font-size: 13px;
  color: #e6edf3;
  -webkit-font-smoothing: antialiased;
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
  background: #0d1117;
  color: #e6edf3;
  border: 1px solid #30363d;
  border-right: none;
  border-radius: 10px 0 0 10px;
  cursor: pointer;
  transition: background 0.15s ease, color 0.15s ease;
}
.cn-toggle:hover { background: #21262d; color: #58a6ff; }
.cn-root.cn-collapsed .cn-toggle { border-radius: 10px; border-right: 1px solid #30363d; }

.cn-panel {
  width: 340px;
  max-height: 82vh;
  display: flex;
  flex-direction: column;
  background: #0a0c10;
  border: 1px solid #30363d;
  border-right: none;
  border-radius: 12px 0 0 12px;
  box-shadow: -4px 8px 32px rgba(0,0,0,0.55);
  color: #e6edf3;
  overflow: hidden;
}

.cn-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 14px;
  border-bottom: 1px solid #21262d;
  background: #0d1117;
  flex-shrink: 0;
}
.cn-brand { display: flex; align-items: center; gap: 7px; font-weight: 600; font-size: 13px; color: #fff; }
.cn-brand-dot { width: 7px; height: 7px; border-radius: 50%; background: #3fb950; box-shadow: 0 0 6px #3fb950; flex-shrink: 0; }
.cn-back {
  display: flex; align-items: center; gap: 4px;
  background: none; border: none; color: #9198a1; font-size: 12.5px; font-weight: 500;
  cursor: pointer; padding: 2px 4px 2px 0; transition: color 0.15s ease;
}
.cn-back:hover { color: #e6edf3; }
.cn-collapse-btn {
  display: flex; align-items: center; justify-content: center;
  width: 24px; height: 24px; background: none; border: none; color: #6e7681;
  cursor: pointer; border-radius: 6px; transition: background 0.15s ease, color 0.15s ease;
}
.cn-collapse-btn:hover { background: #21262d; color: #e6edf3; }

.cn-body {
  padding: 14px;
  overflow-y: auto;
  flex: 1;
}
.cn-body::-webkit-scrollbar, .cn-panel::-webkit-scrollbar, .cn-modal::-webkit-scrollbar { width: 8px; }
.cn-body::-webkit-scrollbar-track, .cn-modal::-webkit-scrollbar-track { background: transparent; }
.cn-body::-webkit-scrollbar-thumb, .cn-modal::-webkit-scrollbar-thumb { background: #30363d; border-radius: 8px; }
.cn-body::-webkit-scrollbar-thumb:hover, .cn-modal::-webkit-scrollbar-thumb:hover { background: #484f58; }

.cn-h3 { margin: 0 0 4px 0; font-size: 15.5px; font-weight: 650; color: #fff; letter-spacing: -0.1px; }
.cn-muted { color: #8b949e; font-size: 12px; line-height: 1.55; }
.cn-error { color: #f85149; font-size: 12px; }
.cn-error-block { background: #2d1214; border: 1px solid #6e2429; color: #ffa198; padding: 10px 12px; border-radius: 8px; font-size: 12px; line-height: 1.5; }

.cn-section { margin-top: 18px; }
.cn-section:first-of-type { margin-top: 14px; }
.cn-label {
  font-weight: 650; font-size: 11px; text-transform: uppercase; letter-spacing: 0.4px;
  color: #8b949e; margin-bottom: 8px; display: flex; align-items: center; gap: 6px;
}
.cn-card {
  background: #0d1117;
  border: 1px solid #21262d;
  border-radius: 10px;
  padding: 8px 10px;
}
.cn-file-row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 5px 0; font-size: 12px; color: #c9d1d9; text-decoration: none;
  border-bottom: 1px solid #161b22;
}
.cn-file-row:last-child { border-bottom: none; }
.cn-file-path { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; flex: 1; min-width: 0; }
a.cn-file-row.cn-link:hover { color: #58a6ff; }
.cn-link { color: #58a6ff; cursor: pointer; text-decoration: none; transition: opacity 0.15s ease; }
.cn-link:hover { text-decoration: underline; opacity: 0.9; }
.cn-hint { display: inline-block; margin-top: 8px; font-size: 11.5px; }

.cn-badge {
  background: #161b22; border-radius: 10px; padding: 1px 7px; font-size: 10.5px;
  color: #8b949e; border: 1px solid #30363d; flex-shrink: 0; font-variant-numeric: tabular-nums;
}
.cn-stat { font-size: 12px; color: #8b949e; margin-bottom: 2px; }

.cn-risk { padding: 2px 9px; border-radius: 10px; font-size: 10px; font-weight: 700; letter-spacing: 0.3px; }
.cn-risk-low { background: #0d2818; color: #3fb950; }
.cn-risk-medium { background: #2b2111; color: #d29922; }
.cn-risk-high { background: #2d1214; color: #f85149; }

.cn-badge-inferred {
  background: #0c2d6b; color: #79c0ff; font-weight: 600; text-transform: none;
  letter-spacing: 0; font-size: 10px; padding: 2px 8px; border-radius: 10px;
}
.cn-purpose-text { font-size: 12.5px; line-height: 1.65; color: #c9d1d9; }
.cn-cursor { animation: cn-blink 1s step-start infinite; color: #58a6ff; }
@keyframes cn-blink { 50% { opacity: 0; } }

.cn-loading { display: flex; align-items: center; gap: 8px; color: #8b949e; font-size: 12.5px; }
.cn-loading-block { display: flex; flex-direction: column; gap: 8px; }
.cn-spinner {
  width: 13px; height: 13px; border-radius: 50%;
  border: 2px solid #30363d; border-top-color: #58a6ff;
  animation: cn-spin 0.7s linear infinite; flex-shrink: 0;
}
@keyframes cn-spin { to { transform: rotate(360deg); } }
.cn-progress-track { height: 4px; background: #21262d; border-radius: 4px; overflow: hidden; }
.cn-progress-fill { height: 100%; background: linear-gradient(90deg, #1f6feb, #58a6ff); transition: width 0.2s ease; border-radius: 4px; }

.cn-search-trigger {
  width: 100%;
  text-align: left;
  padding: 9px 11px;
  border: 1px solid #30363d;
  border-radius: 8px;
  background: #0d1117;
  color: #8b949e;
  font-size: 12.5px;
  cursor: pointer;
  margin-bottom: 14px;
  display: flex;
  align-items: center;
  gap: 8px;
  transition: border-color 0.15s ease, background 0.15s ease;
}
.cn-search-trigger:hover { border-color: #58a6ff; background: #0f1420; }
.cn-search-trigger span:nth-child(2) { flex: 1; }
.cn-kbd { background: #21262d; border: 1px solid #30363d; border-radius: 4px; padding: 1px 5px; font-size: 10px; color: #c9d1d9; }

.cn-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(1,4,9,0.7);
  backdrop-filter: blur(2px);
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
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 12px;
  box-shadow: 0 16px 56px rgba(0,0,0,0.65);
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #e6edf3;
}
.cn-search-input {
  width: 100%;
  padding: 11px 14px;
  font-size: 15px;
  border: 1px solid #30363d;
  border-radius: 8px;
  box-sizing: border-box;
  outline: none;
  background: #010409;
  color: #e6edf3;
  transition: border-color 0.15s ease;
}
.cn-search-input::placeholder { color: #6e7681; }
.cn-search-input:focus { border-color: #58a6ff; box-shadow: 0 0 0 3px rgba(88,166,255,0.15); }
.cn-chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 14px; }
.cn-chip {
  background: #161b22;
  border: 1px solid #30363d;
  border-radius: 16px;
  padding: 5px 13px;
  font-size: 12px;
  cursor: pointer;
  color: #c9d1d9;
  transition: background 0.15s ease, border-color 0.15s ease;
}
.cn-chip:hover { background: #21262d; border-color: #58a6ff; color: #fff; }
.cn-narrative {
  margin-top: 14px; font-size: 12.5px; line-height: 1.65; color: #c9d1d9;
  background: #010409; border: 1px solid #21262d; padding: 12px; border-radius: 8px;
}
.cn-results { margin-top: 14px; }
.cn-result-row {
  display: flex; align-items: center; justify-content: space-between; gap: 8px;
  padding: 8px 4px; border-bottom: 1px solid #161b22; border-radius: 6px;
  transition: background 0.15s ease;
}
.cn-result-row:hover { background: #161b22; }
.cn-result-main { background: none; border: none; text-align: left; cursor: pointer; padding: 0; font-size: 12.5px; flex: 1; min-width: 0; }
.cn-result-path { color: #58a6ff; word-break: break-all; }
.cn-flow-btn {
  background: #161b22; border: 1px solid #30363d; border-radius: 6px; padding: 4px 9px;
  font-size: 11px; cursor: pointer; white-space: nowrap; color: #c9d1d9; transition: all 0.15s ease;
}
.cn-flow-btn:hover { background: #21262d; border-color: #58a6ff; color: #58a6ff; }

.cn-system-row { margin-bottom: 12px; }
.cn-system-row:last-child { margin-bottom: 0; }
.cn-system-name { font-weight: 650; font-size: 12.5px; color: #fff; margin-bottom: 3px; }
.cn-system-file { padding-left: 8px; color: #8b949e; border-bottom: none; padding-top: 2px; padding-bottom: 2px; }
.cn-entry-row { }
.cn-area-label { font-weight: 650; font-size: 11.5px; color: #fff; }
.cn-lang-row { display: flex; flex-wrap: wrap; gap: 6px; }
.cn-lang-pill {
  display: inline-flex; align-items: center; gap: 5px; background: #161b22;
  border: 1px solid #21262d; border-radius: 14px; padding: 3px 6px 3px 10px; font-size: 11.5px; color: #c9d1d9;
}

.cn-close { background: none; border: none; cursor: pointer; font-size: 14px; color: #8b949e; border-radius: 6px; padding: 4px 8px; transition: all 0.15s ease; }
.cn-close:hover { background: #21262d; color: #fff; }

.cn-flow-modal {
  width: min(92vw, 1200px);
  height: min(86vh, 820px);
  display: flex;
  flex-direction: column;
  background: #0d1117;
  border: 1px solid #30363d;
  border-radius: 14px;
  box-shadow: 0 20px 64px rgba(0,0,0,0.7);
  padding: 18px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #e6edf3;
}
.cn-flow-header { display: flex; align-items: flex-start; justify-content: space-between; margin-bottom: 12px; gap: 12px; flex-shrink: 0; }
.cn-flow-controls { display: flex; align-items: center; gap: 6px; flex-shrink: 0; }
.cn-flow-viewport {
  flex: 1;
  overflow: auto;
  background: #010409;
  border: 1px solid #21262d;
  border-radius: 10px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 24px;
}
.cn-flow-viewport::-webkit-scrollbar { width: 10px; height: 10px; }
.cn-flow-viewport::-webkit-scrollbar-track { background: transparent; }
.cn-flow-viewport::-webkit-scrollbar-thumb { background: #30363d; border-radius: 8px; }
.cn-flow-viewport::-webkit-scrollbar-thumb:hover { background: #484f58; }
.cn-flow-svg { transform-origin: top center; transition: transform 0.15s ease; }
.cn-flow-svg svg { max-width: none; min-width: 500px; }
.cn-flow-svg .edgeLabel { background-color: #0d1117; }

.cn-pr-row { display: flex; flex-direction: column; gap: 3px; padding: 8px 0; border-bottom: 1px solid #161b22; }
.cn-pr-row:last-child { border-bottom: none; }
`
