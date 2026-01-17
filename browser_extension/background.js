chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "generate_reply") {
    generateReply(request.payload)
      .then((text) => sendResponse({ ok: true, text }))
      .catch((err) => {
        console.error("AI error:", err);
        sendResponse({ ok: false, error: String(err) });
      });
    return true;
  }
});

async function generateReply({ messages }) {
  const res = await fetch("http://127.0.0.1:8000/ai_reply", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ messages })
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Backend error: ${res.status} ${text}`);
  }

  const data = await res.json();
  console.log('[DEBUG] data:', data);
  return (data.text || "").trim();
}

// function buildPrompt(messages) {
//   const history = messages
//     .map((m) => `${m.role === "me" ? "Me" : "Recruiter"}: ${m.text}`)
//     .join("\n");

//   return `
// You are helping me reply to a recruiter on LinkedIn.

// Conversation so far:
// ${history}

// Write ONE short, friendly, professional reply (3–6 sentences).
// Use the same language as the recruiter.
// Do NOT add a greeting if the recruiter already wrote one.
// Answer as "Me:", but output only the reply text without prefixes.
// `.trim();
// }

// function postprocessReply(text) {
//   if (!text) return "";

//   let t = text.trim();

//   // remove leading "Me:" or "Assistant:" if present
//   t = t.replace(/^Me:\s*/i, "").replace(/^Assistant:\s*/i, "");

//   // sometimes models echo part of the prompt; you can add extra heuristics later

//   return t.trim();
// }
