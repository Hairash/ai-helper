const MY_NAME = "Ivan Grebenshchikov";

// Helper: wait for an element to exist
function waitForElement(selector, timeout = 10000) {
    return new Promise((resolve, reject) => {
      const el = document.querySelector(selector);
      if (el) return resolve(el);
  
      const observer = new MutationObserver(() => {
        const el2 = document.querySelector(selector);
        if (el2) {
          observer.disconnect();
          resolve(el2);
        }
      });
  
      observer.observe(document.body, { childList: true, subtree: true });
  
      setTimeout(() => {
        observer.disconnect();
        reject(new Error("Timeout waiting for " + selector));
      }, timeout);
    });
  }
  
  // Try to attach our button
  async function init() {
    try {
      // LinkedIn message input is usually a contenteditable div
      const input = await waitForElement("[contenteditable='true'].msg-form__contenteditable, .msg-form__contenteditable");
  
      // Avoid injecting twice
      if (document.getElementById("ai-reply-button")) return;
  
      const btn = document.createElement("button");
      btn.id = "ai-reply-button";
      btn.textContent = "✨ AI reply";
      btn.style.marginLeft = "8px";
      btn.style.padding = "4px 8px";
      btn.style.borderRadius = "4px";
      btn.style.border = "1px solid #ddd";
      btn.style.cursor = "pointer";
      btn.style.fontSize = "12px";
  
      // Put button close to the input toolbar
      const toolbar = input.closest("form") || input.parentElement;
      if (toolbar) {
        toolbar.appendChild(btn);
      } else {
        input.parentElement.appendChild(btn);
      }
  
      btn.addEventListener("click", onAiReplyClick);
    } catch (e) {
      console.warn("AI reply init failed:", e);
    }
  }
  
  async function onAiReplyClick() {
    const btn = document.getElementById("ai-reply-button");
    if (!btn) return;
  
    btn.disabled = true;
    const originalText = btn.textContent;
    btn.textContent = "Thinking…";
  
    try {
      const messages = collectConversationContext();
  
      const response = await chrome.runtime.sendMessage({
        type: "generate_reply",
        payload: { messages }
      });
  
      if (!response || !response.ok) {
        console.error(response && response.error);
        btn.textContent = "Error";
        setTimeout(() => (btn.textContent = originalText), 2000);
        return;
      }
  
      const replyText = response.text.trim();
      pasteIntoInput(replyText);
      btn.textContent = originalText;
    } catch (e) {
      console.error(e);
      btn.textContent = "Error";
      setTimeout(() => (btn.textContent = originalText), 2000);
    } finally {
      btn.disabled = false;
    }
  }
  
  // Collect last N messages from the current thread
  function collectConversationContext(maxMessages = 8) {
    const messages = [];
  
    // All message <li> elements
    const items = Array.from(
      document.querySelectorAll("li.msg-s-message-list__event")
    );
  
    if (!items.length) {
      console.warn("No message list items found");
      return messages;
    }
  
    // Take only the last N items
    const lastItems = items.slice(-maxMessages);
  
    lastItems.forEach((li) => {
      // Speaker meta (contains name like "Fanny Le Roux" or "Ivan Grebenshchikov")
      const meta = li.querySelector(".msg-s-message-group__meta");
      if (!meta) return;
  
      const nameEl = meta.querySelector(".msg-s-message-group__name");
      const speakerName = nameEl ? nameEl.innerText.trim() : "";
  
      // All message bubbles in this item
      const bubbleBodies = li.querySelectorAll(
        ".msg-s-event-listitem__message-bubble .msg-s-event-listitem__body"
      );
  
      if (!bubbleBodies.length) return;
  
      // Decide if this is "me" or "them"
      const isMe = determineIsMe(speakerName);
  
      bubbleBodies.forEach((body) => {
        const text = body.innerText
          .replace(/\s+/g, " ") // collapse whitespace / line breaks
          .trim();
  
        if (!text) return;
  
        messages.push({
          role: isMe ? "me" : "them",
          text,
        });
      });
    });
  
    return messages;
  }
  
  function determineIsMe(speakerName) {
    if (!speakerName) return false;
    if (!MY_NAME) return false;
  
    // Very simple heuristic: check if MY_NAME (or its first part) appears in speakerName
    const my = MY_NAME.toLowerCase().split(" ")[0]; // "ivan"
    const speaker = speakerName.toLowerCase();
  
    return speaker.includes(my);
  }

  function textToLinkedInHtml(text) {
    // Normalize line endings
    const normalized = text.replace(/\r\n/g, "\n");
  
    // Split into lines, preserving empty lines
    let lines = normalized.split("\n");
  
    // Trim leading and trailing completely empty lines
    while (lines.length && !lines[0].trim()) {
      lines.shift();
    }
    while (lines.length && !lines[lines.length - 1].trim()) {
      lines.pop();
    }
  
    const escapeHtml = (str) =>
      str
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
  
    const htmlParts = lines.map((line) => {
      const trimmed = line.trim();
  
      if (!trimmed) {
        // Empty line -> LinkedIn-style empty paragraph
        return "<p><br></p>";
      }
  
      return `<p>${escapeHtml(trimmed)}</p>`;
    });
  
    return htmlParts.join("");
  }
  
  // Put AI suggestion into the input field
  function pasteIntoInput(text) {
    const form = document.querySelector("form.msg-form.msg-form--thread-footer-feature");
    if (!form) {
      console.warn("AI reply: message form not found");
      return;
    }
  
    const editor = form.querySelector(".msg-form__contenteditable[contenteditable='true']");
    if (!editor) {
      console.warn("AI reply: editor not found");
      return;
    }
  
    editor.focus();
  
    // Clear existing content
    while (editor.firstChild) {
      editor.removeChild(editor.firstChild);
    }
  
    // Insert correctly formatted HTML
    editor.innerHTML = textToLinkedInHtml(text);
  
    // Fire input event so LinkedIn updates the internal send-state
    const ev = new Event("input", {
      bubbles: true,
      cancelable: true,
    });
    editor.dispatchEvent(ev);
  }
  
  // Run when script loads
  init();
  
  // LinkedIn is a SPA, so when you change conversations, DOM changes without full reload.
  // We can re-run init on URL change.
  let lastUrl = location.href;
  setInterval(() => {
    if (location.href !== lastUrl) {
      lastUrl = location.href;
      init();
    }
  }, 1500);
  