// Function to rename the tab
function renameTab(tabId) {
  // First, get the current title to use it as default in prompt
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    func: () => { return document.title; }
  }).then(results => {
    const currentTitle = results[0].result;
    
    // Now inject a function to show prompt and rename
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      args: [currentTitle],
      func: (currentTitle) => {
        const newName = prompt("Enter a new name for this tab:", currentTitle);
        if (newName !== null && newName.trim() !== "") {
          document.title = newName.trim();
        }
      }
    });
  });
}

// Listen for clicks on the extension icon
chrome.action.onClicked.addListener((tab) => {
  renameTab(tab.id);
});