export const styles = `
:host, .cn-root {
  all: initial;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
  font-size: 13px;
  color: #1f2328;
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
  background: #1f6feb;
  color: white;
  border: none;
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
  background: white;
  border: 1px solid #d0d7de;
  border-right: none;
  border-radius: 8px 0 0 8px;
  padding: 14px;
  box-shadow: -2px 4px 16px rgba(0,0,0,0.12);
}
.cn-h3 { margin: 0 0 4px 0; font-size: 15px; }
.cn-muted { color: #656d76; font-size: 12px; line-height: 1.5; }
.cn-error { color: #cf222e; font-size: 12px; }
.cn-section { margin-top: 14px; }
.cn-label { font-weight: 600; font-size: 12px; text-transform: uppercase; color: #656d76; margin-bottom: 6px; display: flex; align-items: center; gap: 6px; }
.cn-file-row { display: block; padding: 3px 0; font-size: 12px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; color: #1f2328; text-decoration: none; }
.cn-link { color: #1f6feb; cursor: pointer; text-decoration: none; }
.cn-link:hover { text-decoration: underline; }
.cn-badge { background: #eaeef2; border-radius: 10px; padding: 1px 7px; font-size: 11px; color: #57606a; }
.cn-stat { font-size: 12px; color: #656d76; margin-bottom: 4px; }
.cn-risk { padding: 1px 8px; border-radius: 10px; font-size: 10px; font-weight: 700; }
.cn-risk-low { background: #dafbe1; color: #1a7f37; }
.cn-risk-medium { background: #fff8c5; color: #9a6700; }
.cn-risk-high { background: #ffebe9; color: #cf222e; }
`
