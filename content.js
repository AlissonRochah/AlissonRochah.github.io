// Content script injected into Airbnb messaging pages
// Listens for scrape requests from the extension and returns conversation data

(function () {
  chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
    if (request.action !== "scrapeConversation") return false;

    try {
      const messages = scrapeMessages();
      sendResponse({ success: true, messages: messages });
    } catch (error) {
      sendResponse({ success: false, error: error.message });
    }

    return true; // keep message channel open for async response
  });

  function scrapeMessages() {
    const messages = [];

    // Airbnb messaging thread container
    // These selectors need to be verified against the live Airbnb DOM
    // and updated if Airbnb changes their markup
    const threadContainer = document.querySelector(
      '[data-testid="messaging-thread"], ' +
      '[class*="message-thread"], ' +
      '[class*="messaging_thread"], ' +
      '.messaging-thread'
    );

    if (!threadContainer) {
      throw new Error("Could not find message thread on this page.");
    }

    // Find all message elements within the thread
    const messageElements = threadContainer.querySelectorAll(
      '[data-testid="message-content"], ' +
      '[class*="message-content"], ' +
      '[class*="MessageContent"], ' +
      '[class*="message_content"]'
    );

    if (messageElements.length === 0) {
      // Fallback: try to find any text blocks that look like messages
      const fallbackElements = threadContainer.querySelectorAll(
        'div[dir="ltr"], [class*="message"] p, [class*="Message"] span'
      );

      if (fallbackElements.length === 0) {
        throw new Error("Could not find messages in the thread.");
      }

      fallbackElements.forEach(function (el) {
        const text = el.textContent.trim();
        if (!text || text.length < 2) return;

        // Try to determine role by checking parent classes/attributes
        const parent = el.closest('[class*="outgoing"], [class*="sent"], [class*="host"], [class*="Outgoing"]');
        const role = parent ? "host" : "guest";

        messages.push({ role: role, text: text });
      });
    } else {
      messageElements.forEach(function (el) {
        const text = el.textContent.trim();
        if (!text) return;

        const parent = el.closest('[class*="outgoing"], [class*="sent"], [class*="host"], [class*="Outgoing"]');
        const role = parent ? "host" : "guest";

        messages.push({ role: role, text: text });
      });
    }

    if (messages.length === 0) {
      throw new Error("No messages found in the conversation.");
    }

    return messages;
  }
})();
