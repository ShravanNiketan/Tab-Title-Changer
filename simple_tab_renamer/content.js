// Listen for messages from the injected script
window.addEventListener('message', (event) => {
    // Only accept messages from the same frame
    if (event.source !== window) {
      return;
    }
  
    // Check if the message is from our injected UI
    if (event.data.type === 'REMEMBER_PREFERENCE') {
      // Forward the message to the background script
      chrome.runtime.sendMessage({
        type: 'REMEMBER_PREFERENCE',
        domain: event.data.domain,
        template: event.data.template
      });
    }
  });