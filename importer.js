/**
* Convert ChatGPT export JSON -> array of D3 trees
* Output items: { title, id, created, tree }
*
* Supports:
* - Full export: { conversations: [...] } or [ ... ]
* - Single conversation object with `mapping`
*/
function chatgptExportToD3(exportData, opts = {}) {
    const conversations = Array.isArray(exportData?.conversations)
        ? exportData.conversations
        : Array.isArray(exportData)
            ? exportData
            : exportData?.mapping
                ? [exportData]
                : [];

    return conversations
        .filter(c => !opts.conversationId || c.id === opts.conversationId)
        .map(c => {
            const tree = chatgptConversationToD3(c, opts);
            return {
                title: c.title || "Untitled conversation",
                id: c.id || c.conversation_id || "",
                created: toISO(c.create_time),
                tree
            };
        });
}

/**
 * Convert a single ChatGPT conversation object -> D3 tree
 * Expected D3 node shape: { speaker: 'user'|'assistant', text, timestamp, children: [...] }
 */
function chatgptConversationToD3(conv, opts = {}) {
    const { includeSystem = false, includeTool = false } = opts;

    // Newer exports still use a `mapping` object of { id: { parent, children, message } }
    const mapping = conv.mapping || {};
    if (!mapping || !Object.keys(mapping).length) {
        // Fallback: some very old formats had a flat messages array
        if (Array.isArray(conv.messages)) {
            return flatMessagesToTree(conv.messages, { includeSystem, includeTool });
        }
        return { speaker: "assistant", text: "(empty)", children: [] };
    }

    // Find root(s). Typically there is one entry with parent === null
    const rootId = Object.keys(mapping).find(id => mapping[id]?.parent == null)
        || Object.keys(mapping)[0];

    // Build a node recursively from mapping id
    const buildNode = (id) => {
        const entry = mapping[id];
        if (!entry) return null;

        const msg = entry.message;
        const role = (msg?.author?.role) || "assistant";
        const text = extractText(msg);
        const timestamp = toISO(msg?.create_time);

        // Recursively build children
        const kids = (entry.children || [])
            .map(buildNode)
            .filter(Boolean);

        // Role filtering (optional)
        const keep =
            role === "user" ||
            role === "assistant" ||
            (includeSystem && role === "system") ||
            (includeTool && (role === "tool" || role === "function"));

        // Some mapping nodes are structural (no message); hoist children
        if (!msg || (!text && kids.length === 1)) {
            return kids[0] || null;
        }
        if (!msg && kids.length > 1) {
            // Create a container to keep branching (rare)
            return { speaker: "assistant", text: "", timestamp: "", children: kids };
        }

        if (!keep) {
            // If filtered out but has children, hoist them
            if (kids.length === 1) return kids[0];
            if (kids.length > 1) return { speaker: "assistant", text: "", timestamp: "", children: kids };
            return null;
        }

        return {
            speaker: role === "user" ? "user" : "assistant", // collapse tool/system into assistant style if kept
            text,
            timestamp,
            children: kids
        };
    };

    let rootNode = buildNode(rootId);

    // If root collapsed to null (e.g., all filtered), create a stub
    if (!rootNode) {
        rootNode = { speaker: "assistant", text: "(no visible messages)", children: [] };
    }

    return rootNode;
}

/** Extracts human-readable text from various ChatGPT export message shapes */
function extractText(msg) {
    if (!msg || !msg.content) return "";
    const c = msg.content;

    // Most common: { content_type: "text", parts: [ "...", ... ] }
    if (Array.isArray(c.parts)) {
        return c.parts.filter(Boolean).join("\n\n");
    }

    // Some newer shapes: { text: "..." }
    if (typeof c.text === "string") return c.text;

    // Sometimes content is an array of blocks with `text`
    if (Array.isArray(c)) {
        return c.map(part => part?.text || part?.string_value || "").filter(Boolean).join("\n\n");
    }

    // Fallbacks
    if (typeof c === "string") return c;
    if (typeof c?.value === "string") return c.value;

    return "";
}

/** Convert epoch seconds -> ISO local string (or empty) */
function toISO(epochSeconds) {
    if (!epochSeconds) return "";
    try {
        const d = new Date(epochSeconds * 1000);
        if (isNaN(d.getTime())) return "";
        return d.toISOString().replace("T", " ").replace(/\.\d{3}Z$/, "Z");
    } catch { return ""; }
}

/** Very old fallback: linear messages array => simple chain */
function flatMessagesToTree(messages, { includeSystem = false, includeTool = false } = {}) {
    const nodes = [];
    for (const m of messages) {
        const role = m?.author?.role || m?.role || "assistant";
        const keep =
            role === "user" ||
            role === "assistant" ||
            (includeSystem && role === "system") ||
            (includeTool && (role === "tool" || role === "function"));
        if (!keep) continue;
        nodes.push({
            speaker: role === "user" ? "user" : "assistant",
            text: extractText(m),
            timestamp: toISO(m?.create_time),
            children: []
        });
    }
    // Chain them into a simple forward-only tree
    for (let i = 0; i < nodes.length - 1; i++) nodes[i].children = [nodes[i + 1]];
    return nodes[0] || { speaker: "assistant", text: "(empty)", children: [] };
}


/* HOOK */
document.getElementById('convfile').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const text = await file.text();
    const exportJson = JSON.parse(text);

    // Get all trees
    const results = chatgptExportToD3(exportJson, {
        includeSystem: false, // set true if you want system prompts in the tree
        includeTool: false    // set true if you want tool/function messages
    });

    console.log("Converted trees:", results);

    // Example: pick the first conversation
    const first = results[0];
    // `first.tree` is the object your D3 code expects as `data`
    // e.g., window.data = first.tree; update(root) ... (where applicable)
    setRoot(first.tree)
});