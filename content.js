// Content script injected into Airbnb messaging pages
// Listens for scrape requests from the extension and returns conversation data

(function () {
    chrome.runtime.onMessage.addListener(function (request, sender, sendResponse) {
        if (request.action !== "scrapeConversation") return false;

        try {
            var messages = scrapeMessages();
            sendResponse({ success: true, messages: messages });
        } catch (error) {
            sendResponse({ success: false, error: error.message });
        }

        return true;
    });

    function scrapeMessages() {
        var messages = [];

        // Airbnb uses data-testid="message-list" for the message container
        var messageList = document.querySelector('[data-testid="message-list"]');

        if (!messageList) {
            throw new Error("Could not find message thread on this page.");
        }

        // Each message is a div with role="group" and data-item-id
        // The aria-label contains: "{Name} sent {message text}. Sent {time}"
        // Host messages have company name in parentheses: "⁨Name (Company)⁩ sent ..."
        // Guest messages are just: "Name sent ..."
        // System messages: "Airbnb service says ..."
        var messageItems = messageList.querySelectorAll('[role="group"][data-item-id]');

        if (!messageItems || messageItems.length === 0) {
            throw new Error("No messages found in the conversation.");
        }

        messageItems.forEach(function (item) {
            var label = item.getAttribute("aria-label");
            if (!label) return;

            // Skip system messages (Airbnb service)
            if (label.indexOf("Airbnb service says") !== -1) return;

            // Skip start of conversation marker
            if (label.indexOf("Start of Conversation") !== -1) return;

            // Extract sender and message text from aria-label
            // Format: "{Name} sent {message}. Sent {time}" or
            // "Most Recent Message. {Name} sent {message}. Sent {time}"
            var cleanLabel = label.replace(/^Most Recent Message\.\s*/, "");

            // Match: "Name sent Message. Sent Time"
            var sentMatch = cleanLabel.match(/^(.+?)\s+sent\s+(.+?)\.\s+Sent\s+/);
            if (!sentMatch) return;

            var senderName = sentMatch[1].trim();
            var messageText = sentMatch[2].trim();

            // Remove trailing period if present
            if (messageText.endsWith(".")) {
                messageText = messageText.slice(0, -1).trim();
            }

            // Clean up special unicode characters around host names
            senderName = senderName.replace(/[\u2068\u2069]/g, "");

            // Determine role: host messages contain "Master Vacation Homes"
            var isHost = senderName.toLowerCase().indexOf("master vacation homes") !== -1;

            // Replace ".." with newlines (Airbnb uses ".." as line separator in aria-label)
            messageText = messageText.replace(/\.\./g, "\n");

            messages.push({
                role: isHost ? "host" : "guest",
                sender: senderName,
                text: messageText
            });
        });

        if (messages.length === 0) {
            throw new Error("No messages found in the conversation.");
        }

        return messages;
    }
})();
