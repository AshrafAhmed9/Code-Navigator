export const styles = `
:host, .cn-root {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  color: #e6edf3;
}
.cn-root {
  position: fixed;
  top: 60px;
  right: 0;
  z-index: 2147483647;
  display: flex;
  align-items: flex-start;
}
.cn-toggle {
  writing-mode: vertical-rl;
  background: #000;
  color: white;
  border: 1px solid #30363d;
  border-right: none;
  padding: 12px 6px;
  border-radius: 8px 0 0 8px;
  cursor: pointer;
  font-size: 12px;
  font-weight: 600;
  letter-spacing: 0.3px;
}
.cn-root.cn-collapsed .cn-toggle { writing-mode: vertical-rl; }
.cn-panel {
  width: 320px;
  max-height: 80vh;
  overflow-y: auto;
  background: #000;
  border: 1px solid #30363d;
  border-right: none;
  border-radius: 8px 0 0 8px;
  padding: 14px;
  box-shadow: -2px 4px 24px rgba(0,0,0,0.5);
  color: #e6edf3;
}
.cn-h3 { margin: 0 0 4px 0; font-size: 15px; color: #fff; }
.cn-muted { color: #9198a1; font-size: 12px; line-height: 1.5; }
.cn-error { color: #f85149; font-size: 12px; }
.cn-section { margin-top: 14px; }
.cn-label { font-weight: 600; font-size: 12px; text-transform: uppercase; color: #9198a1; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
.cn-file-row { display: block; padding: 3px 0; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #e6edf3; text-decoration: none; }
.cn-link { color: #58a6ff; cursor: pointer; text-decoration: none; }
.cn-link:hover { text-decoration: underline; }
.cn-badge { background: #21262d; border-radius: 10px; padding: 1px 7px; font-size: 11px; color: #9198a1; border: 1px solid #30363d; }
.cn-stat { font-size: 12px; color: #9198a1; margin-bottom: 4px; }
.cn-risk { padding: 1px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
.cn-risk-low { background: #0d2818; color: #3fb950; }
.cn-risk-medium { background: #2b2111; color: #d29922; }
.cn-risk-high { background: #2d1214; color: #f85149; }
.cn-badge-inferred { background: #0c2d6b; color: #79c0ff; font-weight: 500; text-transform: none; }
.cn-purpose-text { font-size: 12.5px; line-height: 1.6; color: #e6edf3; }
.cn-cursor { animation: cn-blink 1s step-start infinite; }
@keyframes cn-blink { 50% { opacity: 0; } }

.cn-search-trigger {
  width: 100%;
  text-align: left;
  padding: 8px 10px;
  border: 1px solid #30363d;
  border-radius: 6px;
  background: #0d1117;
  color: #9198a1;
  font-size: 12px;
  cursor: pointer;
  margin-bottom: 12px;
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.cn-kbd { background: #21262d; border: 1px solid #30363d; border-radius: 4px; padding: 1px 5px; font-size: 10px; color: #e6edf3; }

.cn-modal-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0,0,0,0.6);
  z-index: 2147483647;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding-top: 12vh;
}
.cn-modal {
  width: 480px;
  max-height: 60vh;
  overflow-y: auto;
  background: #000;
  border: 1px solid #30363d;
  border-radius: 10px;
  box-shadow: 0 8px 48px rgba(0,0,0,0.6);
  padding: 16px;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  color: #e6edf3;
}
.cn-search-input {
  width: 100%;
  padding: 10px 12px;
  font-size: 15px;
  border: 1px solid #30363d;
  border-radius: 6px;
  box-sizing: border-box;
  outline: none;
  background: #0d1117;
  color: #e6edf3;
}
.cn-search-input::placeholder { color: #6e7681; }
.cn-search-input:focus { border-color: #58a6ff; }
.cn-chip-row { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 12px; }
.cn-chip {
  background: #21262d;
  border: 1px solid #30363d;
  border-radius: 14px;
  padding: 5px 12px;
  font-size: 12px;
  cursor: pointer;
  color: #e6edf3;
}
.cn-chip:hover { background: #30363d; }
.cn-narrative { margin-top: 12px; font-size: 13px; line-height: 1.6; color: #e6edf3; background: #0d1117; border: 1px solid #21262d; padding: 10px; border-radius: 6px; }
.cn-results { margin-top: 12px; }
.cn-result-row { display: flex; align-items: center; justify-content: space-between; gap: 8px; padding: 6px 0; border-bottom: 1px solid #21262d; }
.cn-result-main { background: none; border: none; text-align: left; cursor: pointer; padding: 0; font-size: 12.5px; flex: 1; min-width: 0; }
.cn-result-path { color: #58a6ff; word-break: break-all; }
.cn-flow-btn { background: #21262d; border: 1px solid #30363d; border-radius: 4px; padding: 3px 8px; font-size: 11px; cursor: pointer; white-space: nowrap; color: #e6edf3; }
.cn-flow-btn:hover { background: #30363d; }

.cn-system-row { margin-bottom: 10px; }
.cn-system-name { font-weight: 600; font-size: 12.5px; color: #fff; }
.cn-system-file { padding-left: 8px; color: #9198a1; }
.cn-entry-row { display: flex; align-items: center; justify-content: space-between; gap: 6px; }
.cn-area-label { font-weight: 600; font-size: 11.5px; color: #fff; }

.cn-flow-header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px; }
.cn-close { background: none; border: none; cursor: pointer; font-size: 14px; color: #9198a1; }
.cn-flow-svg { overflow-x: auto; background: #0d1117; border: 1px solid #21262d; border-radius: 6px; padding: 8px; }
.cn-flow-svg svg { max-width: none; }

.cn-pr-row { display: flex; flex-direction: column; gap: 2px; padding: 6px 0; border-bottom: 1px solid #21262d; }
`
