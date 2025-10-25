// background.js
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (
    changeInfo.status === 'complete' &&
    tab.url &&
    tab.url.includes("https://intra.21jumpclick.fr")
  ) {
    chrome.scripting.executeScript({
      target: { tabId },
      files: ['utils.js', 'content.js']
    })
  }
})
