chrome.runtime.onInstalled.addListener(() => {
  console.log('Clean Telegram Web installed');
});

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'SETTINGS_UPDATED') {
    // Notify all Telegram tabs about the update
    chrome.tabs.query({ url: '*://web.telegram.org/*' }, (tabs) => {
      tabs.forEach(tab => {
        chrome.tabs.sendMessage(tab.id, { type: 'REAPPLY_SETTINGS' });
      });
    });
  }
});
