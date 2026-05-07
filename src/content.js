const DEFAULT_PROMO_STRINGS = [
  "לשיתוף ב WhatsApp לחצו כאן",
  "חדשות ישראל ללא צנזורה",
  "חדשות 360",
  "קבוצת הדיונים",
  "כדי להגיב לכתבה לחצו כאן"
];

const PROMO_URL_PATTERNS = [
  "t.me/israel1",
  "nwsil.me",
  "abualiexpress.com",
  "t.me/newsil360",
  "t.me/+8HnYUwQs4ts4MjE8",
  "whatsapp.com"
];

const LINK_TEXT_PATTERNS = [
  "WhatsApp",
  "תגובות",
  "להגיב"
];

const EMOJI_REGEX = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E6}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F3FB}-\u{1F3FF}\u{1F400}-\u{1F4FF}\u{1FAD0}-\u{1FAFF}\u{1F600}-\u{1F64F}]/gu;

let settings = {};
let promoStrings = DEFAULT_PROMO_STRINGS;

function cleanMessageNode(node) {
  if (!node || !node.isConnected) return;

  // 1. Surgical removal of LINKS (<a> tags)
  if (settings['clean-promos'] !== false) {
    const links = Array.from(node.querySelectorAll('a'));
    links.forEach(link => {
      const text = (link.textContent || "").trim();
      const href = link.href || "";
      
      const matchesUrl = PROMO_URL_PATTERNS.some(p => href.includes(p));
      const matchesText = promoStrings.some(p => text.includes(p)) || LINK_TEXT_PATTERNS.some(p => text.includes(p));
      
      if (matchesUrl || matchesText) {
        link.remove();
      }
    });
  }

  // 2. Surgical removal of PROMO TEXT and Emojis within all text nodes
  const walker = document.createTreeWalker(node, NodeFilter.SHOW_TEXT, null, false);
  let textNode;
  const nodesToRemove = [];
  
  while (textNode = walker.nextNode()) {
    let content = textNode.textContent;
    let originalContent = content;

    // Remove specific promo strings
    if (settings['clean-promos'] !== false) {
      promoStrings.forEach(promo => {
        if (content.includes(promo)) {
          content = content.replace(promo, "").trim();
        }
      });
    }

    // Remove emojis
    if (settings['clean-emojis'] !== false) {
      content = content.replace(EMOJI_REGEX, "");
    }

    // If the node becomes just a separator or empty, mark for removal
    if (content.trim() === "|" || content.trim() === "") {
      nodesToRemove.push(textNode);
    } else if (content !== originalContent) {
      textNode.textContent = content;
    }
  }
  nodesToRemove.forEach(n => n.remove());

  // 3. AGGRESSIVE TRIM: Remove trailing debris
  let changed = true;
  while (changed) {
    changed = false;
    const last = node.lastChild;
    if (!last) break;

    const isBR = last.nodeName === 'BR';
    const isEmptyText = (last.nodeType === Node.TEXT_NODE && (last.textContent.trim() === "" || last.textContent.trim() === "|"));
    const isEmptyElement = (last.nodeType === Node.ELEMENT_NODE && last.textContent.trim() === "" && last.querySelectorAll('img, a').length === 0);

    if (isBR || isEmptyText || isEmptyElement) {
      last.remove();
      changed = true;
    }
  }
}

function setTranslateNoToInput() {
  if (settings['clean-input'] === false) return;

  const inputs = document.querySelectorAll('.input-message-input');
  inputs.forEach(input => {
    if (input.getAttribute('translate') !== 'no') {
      input.setAttribute('translate', 'no');
    }
  });
}

function processContainer(container) {
  if (!container) return;
  const messages = container.querySelectorAll('.translatable-message, .message, .text-content');
  messages.forEach(cleanMessageNode);
  setTranslateNoToInput();
}

function updateSettings() {
  chrome.storage.local.get(['enabled', 'clean-promos', 'clean-emojis', 'clean-reactions', 'clean-comments', 'clean-input', 'customPromos'], (result) => {
    settings = result;
    if (result.customPromos && result.customPromos.length > 0) {
      promoStrings = result.customPromos;
    } else {
      promoStrings = DEFAULT_PROMO_STRINGS;
    }

    // Toggle classes for CSS-based hiding
    const classes = ['clean-emojis', 'clean-reactions', 'clean-comments', 'clean-input'];
    classes.forEach(cls => {
      if (settings[cls] !== false && settings.enabled !== false) {
        document.body.classList.add(cls);
      } else {
        document.body.classList.remove(cls);
      }
    });

    if (settings.enabled !== false) {
      processContainer(document.body);
    }
  });
}

// Start cleaning only if enabled
chrome.storage.local.get(['enabled', 'clean-promos', 'clean-emojis', 'clean-reactions', 'clean-comments', 'clean-input', 'customPromos'], (result) => {
  settings = result;
  if (result.customPromos && result.customPromos.length > 0) {
    promoStrings = result.customPromos;
  }
  
  if (settings.enabled !== false) {
    // Add classes to body for CSS-based hiding
    if (settings['clean-emojis'] !== false) document.body.classList.add('clean-emojis');
    if (settings['clean-reactions'] !== false) document.body.classList.add('clean-reactions');
    if (settings['clean-comments'] !== false) document.body.classList.add('clean-comments');
    if (settings['clean-input'] !== false) document.body.classList.add('clean-input');

    const observer = new MutationObserver((mutations) => {
      let shouldCheckInput = false;
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType === Node.ELEMENT_NODE) {
            if (node.matches('.translatable-message, .message, .text-content')) {
              cleanMessageNode(node);
            } else if (node.matches('.input-message-input')) {
              shouldCheckInput = true;
            } else {
              processContainer(node);
              if (node.querySelector('.input-message-input')) {
                shouldCheckInput = true;
              }
            }
          }
        }
      }
      if (shouldCheckInput) {
        setTranslateNoToInput();
      }
    });
    observer.observe(document.body, { childList: true, subtree: true });
    processContainer(document.body);
    setInterval(() => processContainer(document.body), 4000);
  }
});

// Listen for updates from background script
chrome.runtime.onMessage.addListener((message) => {
  if (message.type === 'REAPPLY_SETTINGS') {
    updateSettings();
  }
});
