import './domShim' // must run before any dynamic import() (see file comment)
import { handleParseSymbols, type ParseSymbolsRequest } from './symbols'

chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.runtime.openOptionsPage()
  }
})

chrome.runtime.onMessage.addListener((message: ParseSymbolsRequest, _sender, sendResponse) => {
  if (message?.type !== 'parse-symbols') return undefined
  handleParseSymbols(message).then(sendResponse)
  return true // keep the message channel open for the async sendResponse above
})

// chrome.runtime.openOptionsPage() only works from an extension page context
// (this background worker), not from content scripts — every "add a token" /
// "add an LLM key" link in the sidebar routes through this instead of calling
// it directly (see src/lib/openOptions.ts).
chrome.runtime.onMessage.addListener((message: { type?: string }) => {
  if (message?.type !== 'open-options') return undefined
  chrome.runtime.openOptionsPage()
  return undefined
})

// The toolbar action has no popup (see manifest), so a click always fires this —
// a manual escape hatch if a future GitHub DOM change ever breaks the automatic
// mount/remount signals the content script relies on.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'force-mount' }).catch(() => {})
})
