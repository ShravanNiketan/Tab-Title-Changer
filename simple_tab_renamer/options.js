// DOM Helper Functions
const $ = (selector) => document.querySelector(selector);
const $$ = (selector) => document.querySelectorAll(selector);

// Tab Navigation System
function setupTabs() {
  const tabButtons = $$('.tab-btn');
  const tabContents = $$('.tab-content');
  
  tabButtons.forEach(button => {
    button.addEventListener('click', () => {
      const tabId = button.id.replace('tab-', '');
      const contentId = `${tabId}-content`;
      
      // Update button states
      tabButtons.forEach(btn => btn.classList.remove('active'));
      button.classList.add('active');
      
      // Update content visibility
      tabContents.forEach(content => content.classList.remove('active'));
      $(`#${contentId}`).classList.add('active');
      
      // Save active tab to storage
      saveActiveTab(tabId);
    });
  });
}

// Save active tab to storage
function saveActiveTab(tabId) {
  chrome.storage.sync.set({ activeTab: tabId });
}

// Restore active tab from storage
function restoreActiveTab() {
  chrome.storage.sync.get({ activeTab: 'general' }, (data) => {
    const tabId = data.activeTab;
    const tabButton = $(`#tab-${tabId}`);
    if (tabButton) {
      tabButton.click();
    }
  });
}

// Save options to chrome.storage.sync
function saveOptions() {
  const defaultPrefix = $('#defaultPrefix').value;
  const defaultSuffix = $('#defaultSuffix').value;
  const promptBehavior = $('#promptBehavior').value;
  const customTemplates = $('#customTemplates').value.split('\n')
    .filter(template => template.trim() !== '');
  
  chrome.storage.sync.set({
    defaultPrefix: defaultPrefix,
    defaultSuffix: defaultSuffix,
    promptBehavior: promptBehavior,
    customTemplates: customTemplates,
    lastUpdated: new Date().toISOString()
  }, () => {
    showStatus('Settings saved!', 'success');
  });
}

// Restore options from chrome.storage.sync
function restoreOptions() {
  chrome.storage.sync.get({
    // Default values
    defaultPrefix: '',
    defaultSuffix: '',
    promptBehavior: 'always',
    customTemplates: []
  }, (items) => {
    $('#defaultPrefix').value = items.defaultPrefix;
    $('#defaultSuffix').value = items.defaultSuffix;
    $('#promptBehavior').value = items.promptBehavior;
    $('#customTemplates').value = items.customTemplates.join('\n');
  });
}

// Show status message
function showStatus(message, type = 'success') {
  const status = $('#status');
  status.textContent = message;
  status.className = `status ${type}`;
  status.style.display = 'block';
  
  setTimeout(() => {
    status.style.display = 'none';
  }, 3000);
}

// Set up example cards as clickable to copy template
function setupExampleCards() {
  const examples = $$('.example-card .example-body');
  
  examples.forEach(example => {
    // Only add click handler for single line examples
    if (!example.innerHTML.includes('<br>')) {
      example.style.cursor = 'pointer';
      example.title = 'Click to copy this template';
      
      example.addEventListener('click', () => {
        // Get the example text and copy to clipboard
        const templateText = example.textContent.trim();
        
        // Append to custom templates
        const customTemplates = $('#customTemplates');
        let currentTemplates = customTemplates.value.trim();
        
        if (currentTemplates) {
          currentTemplates += '\n' + templateText;
        } else {
          currentTemplates = templateText;
        }
        
        customTemplates.value = currentTemplates;
        
        // Show status message
        showStatus('Template added to your list!', 'success');
        
        // Switch to general tab
        $('#tab-general').click();
        
        // Highlight the templates field
        customTemplates.focus();
        customTemplates.scrollTop = customTemplates.scrollHeight;
      });
    }
  });
}

// Event listeners
document.addEventListener('DOMContentLoaded', () => {
  // Restore settings from storage
  restoreOptions();
  
  // Set up tab navigation
  setupTabs();
  
  // Restore active tab
  restoreActiveTab();
  
  // Set up example cards
  setupExampleCards();
  
  // Save button click handler
  $('#save').addEventListener('click', saveOptions);
  
  // Add keyboard shortcut (Ctrl+S / Cmd+S)
  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key === 's') {
      e.preventDefault();
      saveOptions();
    }
  });
});