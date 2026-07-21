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
