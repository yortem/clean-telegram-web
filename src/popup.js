const mainToggle = document.getElementById('main-toggle');
const subSettings = document.getElementById('sub-settings');
const promoSettingsBtn = document.getElementById('promo-settings-btn');
const promoSettingsPanel = document.getElementById('promo-settings');
const promoTextArea = document.getElementById('promo-list');

const switches = [
  'clean-promos',
  'clean-emojis',
  'clean-reactions',
  'clean-comments',
  'clean-input'
];

const DEFAULT_PROMOS = [
  "לשיתוף ב WhatsApp לחצו כאן",
  "חדשות ישראל ללא צנזורה",
  "חדשות 360",
  "קבוצת הדיונים",
  "כדי להגיב לכתבה לחצו כאן"
];

// Load initial state
chrome.storage.local.get(['enabled', 'customPromos', ...switches], (result) => {
  mainToggle.checked = result.enabled !== false;
  updateSubSettingsVisibility(mainToggle.checked);

  switches.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.checked = result[id] !== false; // Default to true
    }
  });

  // Load custom promos or defaults
  if (result.customPromos) {
    promoTextArea.value = result.customPromos.join('\n');
  } else {
    promoTextArea.value = DEFAULT_PROMOS.join('\n');
  }
});

function updateSubSettingsVisibility(enabled) {
  subSettings.style.opacity = enabled ? '1' : '0.5';
  subSettings.style.pointerEvents = enabled ? 'auto' : 'none';
}

function saveAndNotify() {
  const settings = {
    enabled: mainToggle.checked,
    customPromos: promoTextArea.value.split('\n').map(s => s.trim()).filter(s => s.length > 0)
  };
  switches.forEach(id => {
    settings[id] = document.getElementById(id).checked;
  });

  chrome.storage.local.set(settings, () => {
    // Notify the background script that settings have changed
    chrome.runtime.sendMessage({ type: 'SETTINGS_UPDATED' });
  });
}

mainToggle.addEventListener('change', () => {
  updateSubSettingsVisibility(mainToggle.checked);
  saveAndNotify();
});

switches.forEach(id => {
  document.getElementById(id).addEventListener('change', saveAndNotify);
});

// Settings panel toggle
promoSettingsBtn.addEventListener('click', () => {
  promoSettingsPanel.classList.toggle('hidden');
});

// Save textarea changes on blur (when user finishes editing)
promoTextArea.addEventListener('blur', saveAndNotify);
