// Default settings
const DEFAULT_SETTINGS = {
  defaultPrefix: '',
  defaultSuffix: '',
  promptBehavior: 'always',
  customTemplates: []
};

// Cache for domain preferences
const domainPreferences = {};

// Function to get domain from URL
function getDomain(url) {
  try {
    const urlObj = new URL(url);
    return urlObj.hostname;
  } catch (e) {
    console.error('Invalid URL:', url);
    return '';
  }
}

// Function to apply template to title
function applyTemplate(template, originalTitle, url) {
  const domain = getDomain(url);
  const currentDate = new Date().toLocaleDateString();
  
  return template
    .replace(/{title}/g, originalTitle)
    .replace(/{domain}/g, domain)
    .replace(/{date}/g, currentDate);
}

// Function to rename the tab
function renameTab(tabId, tab) {
  // Get settings from storage
  chrome.storage.sync.get(DEFAULT_SETTINGS, (settings) => {
    try {
      // First, get the current title
      chrome.scripting.executeScript({
        target: { tabId: tabId },
        func: () => {
          return {
            title: document.title,
            url: window.location.href
          };
        }
      }).then(results => {
        if (!results || !results[0] || !results[0].result) {
          console.error('Could not get tab info');
          showErrorBadge();
          return;
        }
        
        const data = results[0].result;
        const currentTitle = data.title;
        const url = data.url;
        const domain = getDomain(url);
        
        // Determine what to do based on prompt behavior
        if (settings.promptBehavior === 'autoApply') {
          // Auto apply prefix and suffix without prompting
          const newTitle = `${settings.defaultPrefix}${currentTitle}${settings.defaultSuffix}`;
          applyNewTitle(tabId, newTitle);
        }
        else if (settings.promptBehavior === 'askOnce' && domainPreferences[domain]) {
          // Use remembered preference for this domain
          const template = domainPreferences[domain];
          const newTitle = applyTemplate(template, currentTitle, url);
          applyNewTitle(tabId, newTitle);
        }
        else {
          // Show prompt with options
          showRenamePrompt(tabId, currentTitle, settings, url, domain);
        }
      }).catch(error => {
        console.error('Error executing script:', error);
        showErrorBadge();
      });
    } catch (error) {
      console.error('Error in rename function:', error);
      showErrorBadge();
    }
  });
}

// Function to apply new title to the tab
function applyNewTitle(tabId, newTitle) {
  if (newTitle && newTitle.trim() !== "") {
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      args: [newTitle.trim()],
      func: (newTitle) => {
        document.title = newTitle;
        return true;
      }
    }).catch(error => {
      console.error('Error setting title:', error);
      showErrorBadge();
    });
  }
}

// Show error badge on the extension icon
function showErrorBadge() {
  chrome.action.setBadgeText({ text: '!' });
  chrome.action.setBadgeBackgroundColor({ color: '#FE1817' });
  
  // Clear badge after 2 seconds
  setTimeout(() => {
    chrome.action.setBadgeText({ text: '' });
  }, 2000);
}

// Function to show rename prompt with options
function showRenamePrompt(tabId, currentTitle, settings, url, domain) {
  // Create options array combining default and custom templates
  let options = [];
  
  // Add current title as first option
  options.push(currentTitle);
  
  // Add prefix/suffix option if defined
  if (settings.defaultPrefix || settings.defaultSuffix) {
    options.push(`${settings.defaultPrefix}${currentTitle}${settings.defaultSuffix}`);
  }
  
  // Add custom templates
  settings.customTemplates.forEach(template => {
    options.push(applyTemplate(template, currentTitle, url));
  });
  
  // Inject UI for selection
  chrome.scripting.executeScript({
    target: { tabId: tabId },
    args: [options, settings.promptBehavior, domain],
    func: (options, promptBehavior, domain) => {
      // Create custom UI instead of simple prompt
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: rgba(0, 0, 0, 0.7);
        z-index: 999999;
        display: flex;
        justify-content: center;
        align-items: center;
        backdrop-filter: blur(5px);
        -webkit-backdrop-filter: blur(5px);
        font-family: 'Arial', sans-serif;
      `;
      
      const dialog = document.createElement('div');
      dialog.style.cssText = `
        background: #111111;
        color: #ffffff;
        padding: 20px;
        border-radius: 10px;
        width: 80%;
        max-width: 500px;
        max-height: 80vh;
        overflow-y: auto;
        border: 1px solid rgba(255, 255, 255, 0.1);
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      `;
      
      const title = document.createElement('h2');
      title.textContent = 'Rename This Tab';
      title.style.cssText = `
        margin-top: 0;
        margin-bottom: 15px;
        color: #37B5FE;
        font-size: 1.5rem;
        font-weight: bold;
      `;
      
      const form = document.createElement('div');
      
      // Option to enter custom name
      const customInput = document.createElement('input');
      customInput.type = 'text';
      customInput.value = options[0];
      customInput.style.cssText = `
        width: 100%;
        padding: 12px;
        margin-bottom: 15px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 5px;
        background-color: #1a1a1a;
        color: #ffffff;
        font-size: 14px;
        box-sizing: border-box;
      `;
      
      // Label for templates section
      const optionsLabel = document.createElement('p');
      optionsLabel.textContent = 'Quick templates:';
      optionsLabel.style.cssText = `
        color: rgba(255, 255, 255, 0.8);
        margin-bottom: 8px;
        font-size: 14px;
      `;
      
      // Create template options
      const optionsDiv = document.createElement('div');
      optionsDiv.style.cssText = `
        margin-bottom: 15px;
        max-height: 200px;
        overflow-y: auto;
        padding-right: 5px;
      `;
      
      options.forEach((option, index) => {
        const optionBtn = document.createElement('button');
        optionBtn.textContent = option;
        optionBtn.style.cssText = `
          width: 100%;
          text-align: left;
          padding: 10px 12px;
          margin-bottom: 8px;
          background: #0a0a0a;
          color: #ffffff;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 5px;
          cursor: pointer;
          overflow: hidden;
          text-overflow: ellipsis;
          white-space: nowrap;
          font-size: 13px;
          transition: all 0.3s ease;
        `;
        
        // Add hover styles
        optionBtn.addEventListener('mouseover', () => {
          optionBtn.style.backgroundColor = '#2a2a2a';
          optionBtn.style.borderColor = '#37B5FE';
        });
        
        optionBtn.addEventListener('mouseout', () => {
          optionBtn.style.backgroundColor = '#0a0a0a';
          optionBtn.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        });
        
        optionBtn.addEventListener('click', () => {
          customInput.value = option;
        });
        optionsDiv.appendChild(optionBtn);
      });
      
      // Remember preference checkbox
      let rememberContainer;
      if (promptBehavior === 'askOnce') {
        rememberContainer = document.createElement('div');
        rememberContainer.style.cssText = `
          margin-bottom: 15px;
          display: flex;
          align-items: center;
        `;
        
        const rememberCheckbox = document.createElement('input');
        rememberCheckbox.type = 'checkbox';
        rememberCheckbox.id = 'remember-preference';
        rememberCheckbox.style.cssText = `
          margin-right: 8px;
          accent-color: #37B5FE;
        `;
        
        const rememberLabel = document.createElement('label');
        rememberLabel.htmlFor = 'remember-preference';
        rememberLabel.textContent = 'Remember for this domain';
        rememberLabel.style.cssText = `
          color: rgba(255, 255, 255, 0.8);
          font-size: 14px;
        `;
        
        rememberContainer.appendChild(rememberCheckbox);
        rememberContainer.appendChild(rememberLabel);
      }
      
      // Buttons
      const buttonContainer = document.createElement('div');
      buttonContainer.style.cssText = `
        display: flex;
        justify-content: flex-end;
        gap: 10px;
      `;
      
      const cancelBtn = document.createElement('button');
      cancelBtn.textContent = 'Cancel';
      cancelBtn.style.cssText = `
        padding: 10px 16px;
        border: 1px solid rgba(255, 255, 255, 0.1);
        border-radius: 5px;
        background: #1a1a1a;
        color: rgba(255, 255, 255, 0.8);
        cursor: pointer;
        font-size: 14px;
        transition: all 0.3s ease;
      `;
      
      cancelBtn.addEventListener('mouseover', () => {
        cancelBtn.style.backgroundColor = '#2a2a2a';
        cancelBtn.style.color = '#ffffff';
      });
      
      cancelBtn.addEventListener('mouseout', () => {
        cancelBtn.style.backgroundColor = '#1a1a1a';
        cancelBtn.style.color = 'rgba(255, 255, 255, 0.8)';
      });
      
      const applyBtn = document.createElement('button');
      applyBtn.textContent = 'Rename';
      applyBtn.style.cssText = `
        padding: 10px 16px;
        background: #37B5FE;
        color: white;
        border: none;
        border-radius: 5px;
        cursor: pointer;
        font-size: 14px;
        transition: all 0.3s ease;
      `;
      
      applyBtn.addEventListener('mouseover', () => {
        applyBtn.style.backgroundColor = '#7DD856';
        applyBtn.style.transform = 'translateY(-2px)';
        applyBtn.style.boxShadow = '0 4px 15px rgba(55, 181, 254, 0.3)';
      });
      
      applyBtn.addEventListener('mouseout', () => {
        applyBtn.style.backgroundColor = '#37B5FE';
        applyBtn.style.transform = 'translateY(0)';
        applyBtn.style.boxShadow = 'none';
      });
      
      buttonContainer.appendChild(cancelBtn);
      buttonContainer.appendChild(applyBtn);
      
      // Assemble dialog
      form.appendChild(customInput);
      form.appendChild(optionsLabel);
      form.appendChild(optionsDiv);
      if (promptBehavior === 'askOnce') {
        form.appendChild(rememberContainer);
      }
      form.appendChild(buttonContainer);
      
      dialog.appendChild(title);
      dialog.appendChild(form);
      overlay.appendChild(dialog);
      
      // Event handlers
      cancelBtn.addEventListener('click', () => {
        document.body.removeChild(overlay);
      });
      
      applyBtn.addEventListener('click', () => {
        const newTitle = customInput.value;
        document.title = newTitle;
        
        // Remember preference if checkbox is checked
        if (promptBehavior === 'askOnce' && 
            document.getElementById('remember-preference') && 
            document.getElementById('remember-preference').checked) {
          // Using postMessage to communicate back to background script
          window.postMessage({
            type: 'REMEMBER_PREFERENCE',
            domain: domain,
            template: newTitle
          }, '*');
        }
        
        document.body.removeChild(overlay);
      });
      
      // Add to page
      document.body.appendChild(overlay);
      
      // Focus the input
      customInput.focus();
      customInput.select();
      
      // Add light/dark mode detection
      const prefersDarkScheme = window.matchMedia("(prefers-color-scheme: dark)");
      
      function updateTheme(isDark) {
        if (!isDark) {
          dialog.style.backgroundColor = '#ffffff';
          dialog.style.color = '#060606';
          title.style.color = '#37B5FE';
          customInput.style.backgroundColor = '#f8f9fa';
          customInput.style.color = '#060606';
          customInput.style.borderColor = 'rgba(0, 0, 0, 0.1)';
          
          if (optionsLabel) optionsLabel.style.color = 'rgba(6, 6, 6, 0.8)';
          
          const optionButtons = optionsDiv.querySelectorAll('button');
          optionButtons.forEach(btn => {
            btn.style.backgroundColor = '#f8f9fa';
            btn.style.color = '#060606';
            btn.style.borderColor = 'rgba(0, 0, 0, 0.1)';
            
            btn.addEventListener('mouseover', () => {
              btn.style.backgroundColor = '#e9ecef';
              btn.style.borderColor = '#37B5FE';
            });
            
            btn.addEventListener('mouseout', () => {
              btn.style.backgroundColor = '#f8f9fa';
              btn.style.borderColor = 'rgba(0, 0, 0, 0.1)';
            });
          });
          
          if (rememberContainer) {
            const label = rememberContainer.querySelector('label');
            if (label) label.style.color = 'rgba(6, 6, 6, 0.8)';
          }
          
          cancelBtn.style.backgroundColor = '#f8f9fa';
          cancelBtn.style.color = 'rgba(6, 6, 6, 0.8)';
          cancelBtn.style.borderColor = 'rgba(0, 0, 0, 0.1)';
          
          cancelBtn.addEventListener('mouseover', () => {
            cancelBtn.style.backgroundColor = '#e9ecef';
            cancelBtn.style.color = '#060606';
          });
          
          cancelBtn.addEventListener('mouseout', () => {
            cancelBtn.style.backgroundColor = '#f8f9fa';
            cancelBtn.style.color = 'rgba(6, 6, 6, 0.8)';
          });
        }
      }
      
      // Initial theme check
      updateTheme(!prefersDarkScheme.matches);
      
      // Listen for theme changes
      prefersDarkScheme.addEventListener('change', (e) => {
        updateTheme(!e.matches);
      });
    }
  }).catch(error => {
    console.error('Error showing rename prompt:', error);
    showErrorBadge();
    
    // Fall back to simple prompt if modal fails
    chrome.scripting.executeScript({
      target: { tabId: tabId },
      args: [currentTitle],
      func: (currentTitle) => {
        const newName = prompt("Enter a new name for this tab:", currentTitle);
        if (newName !== null && newName.trim() !== "") {
          document.title = newName.trim();
        }
      }
    }).catch(err => {
      console.error('Fallback prompt also failed:', err);
    });
  });
}

// Listen for clicks on the extension icon
chrome.action.onClicked.addListener((tab) => {
  renameTab(tab.id, tab);
});

// Add message listener for content script communication
chrome.runtime.onMessage.addListener((message, sender) => {
  if (message.type === 'REMEMBER_PREFERENCE') {
    domainPreferences[message.domain] = message.template;
  }
});