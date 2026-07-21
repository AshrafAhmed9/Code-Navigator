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

// The toolbar action has no popup (see manifest), so a click always fires this —
// a manual escape hatch if a future GitHub DOM change ever breaks the automatic
// mount/remount signals the content script relies on.
chrome.action.onClicked.addListener((tab) => {
  if (tab.id) chrome.tabs.sendMessage(tab.id, { type: 'force-mount' }).catch(() => {})
})
