
const NODE_TEMPLATE = (msg_data) => {
    const { text, speaker, timestamp } = msg_data;
    const meta_template = `<div class="node-meta"><div class="badge ${speaker}">${speaker}</div><div class="timestamp">${timestamp}</div></div>`
    const template = `<div class="node-card ${speaker}" title="${text}">${meta_template}<div class="node-text">${text}</div>`//<div class="node-actions"><button class="node-btn">Toggle</button></div></div>;
    return template;
}

// SidePanel: self-contained, no globals leaked
const SidePanel = (() => {
    let opts, els, state;

    const ensure = (root, sel, maker) => {
        let el = root.querySelector(sel);
        if (!el) { el = maker(); root.appendChild(el); }
        return el;
    };

    const text = (el, s) => { if (el) el.textContent = s ?? ""; };
    const clear = (el) => { while (el && el.firstChild) el.removeChild(el.firstChild); };
    const preview = (s, n = 180) => {
        const t = (s || "").replace(/\s+/g, " ").trim();
        return t.length > n ? t.slice(0, n) + "…" : t;
    };

    function buildSkeleton(container) {
        const box = document.querySelector(container) || (() => {
            const d = document.createElement("div");
            d.id = container.replace(/^#/, "");
            document.body.appendChild(d);
            return d;
        })();

        const header = ensure(box, "header", () => {
            const h = document.createElement("header"); return h;
        });

        const title = ensure(header, "[data-title]", () => {
            const d = document.createElement("div"); d.setAttribute("data-title", ""); return d;
        });
        const time = ensure(header, "[data-time]", () => {
            const d = document.createElement("div"); d.setAttribute("data-time", ""); return d;
        });

        const body = ensure(box, "[data-body]", () => {
            const d = document.createElement("div"); d.setAttribute("data-body", ""); return d;
        });

        const nav = ensure(box, ".nav", () => {
            const d = document.createElement("div"); d.className = "nav"; return d;
        });
        const prev = ensure(nav, "[data-prev]", () => { const b = document.createElement("button"); b.setAttribute("data-prev", ""); b.textContent = "◀ Prev"; return b; });
        const next = ensure(nav, "[data-next]", () => { const b = document.createElement("button"); b.setAttribute("data-next", ""); b.textContent = "Next ▶"; return b; });
        const up = ensure(nav, "[data-up]", () => { const b = document.createElement("button"); b.setAttribute("data-up", ""); b.textContent = "↑ Parent"; return b; });
        const down = ensure(nav, "[data-down]", () => { const b = document.createElement("button"); b.setAttribute("data-down", ""); b.textContent = "↓ First child"; return b; });
        const closeBtn = ensure(nav, "[data-close]", () => {
            const b = document.createElement("button"); b.setAttribute("data-close", ""); b.textContent = "×"; return b;
        });
        
        const forks = ensure(box, "[data-forks]", () => { const d = document.createElement("div"); d.className = "list"; d.setAttribute("data-forks", ""); return d; });
        const siblings = ensure(box, "[data-siblings]", () => { const d = document.createElement("div"); d.className = "list"; d.setAttribute("data-siblings", ""); return d; });

        return { box, header, title, time, closeBtn, body, nav, prev, next, up, down, forks, siblings };
    }

    function ensureVisible(d) {
        let a = d.parent, changed = false;
        while (a) {
            if (a._children) { a.children = a._children; a._children = null; changed = true; }
            a = a.parent;
        }
        if (changed) opts.update(d);
    }

    function centerOn(d, dur = 200) {
        const t = d3.zoomTransform(opts.svg.node());
        const k = t.k, svgW = +opts.svg.attr("width"), svgH = +opts.svg.attr("height");
        const tx = (svgW / 2) - k * d.y, ty = (svgH / 2) - k * d.x;
        opts.svg.transition().duration(dur).call(opts.zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
    }

    function rebuildOrder() {
        const nodes = opts.getRoot().descendants().slice();
        nodes.sort((a, b) => (a.y - b.y) || (a.x - b.x));
        state.order = nodes;
    }
    const nextOf = d => state.order[state.order.indexOf(d) + 1] || null;
    const prevOf = d => state.order[state.order.indexOf(d) - 1] || null;

    function renderList(container, items) {
        clear(container);
        const frag = document.createDocumentFragment();
        items.forEach(n => {
            const item = document.createElement("button");
            item.className = "item";
            item.type = "button";
            item.dataset.id = n.id;
            // const meta = document.createElement("div");
            // meta.className = "meta";
            // meta.textContent = `${(n.data.speaker || "").toUpperCase()}  ${n.data.timestamp || ""}`;
            // const prev = document.createElement("div");
            // prev.className = "preview";
            // prev.textContent = preview(n.data.text);
            // item.appendChild(meta);
            // item.appendChild(prev);
            
            const node = NODE_TEMPLATE({
                text: preview(n.data.text),
                speaker: n.data.speaker || "",
                timestamp: n.data.timestamp || ""
            })
            item.innerHTML = node;
            
            item.addEventListener("click", () => api.open(n));
            frag.appendChild(item);
        });
        container.appendChild(frag);
    }

    function render(d) {
        text(els.title, (d.data.speaker || "NODE").toUpperCase());
        els.title.className = "badge " + d.data.speaker || ""

        text(els.time, d.data.timestamp || "");
        // Use textContent to avoid HTML injection; preserve newlines visually with CSS.
        els.body.textContent = d.data.text || "";

        // Lists
        const kids = d.children || [];
        const sibs = d.parent ? (d.parent.children || []).filter(s => s !== d) : [];
        renderList(els.forks, kids);
        renderList(els.siblings, sibs);

        els.box.classList.add("open");
    }

    function bindNav() {
        window.addEventListener('keydown', (e) => {
        if (!state.selected) return;
        if (e.key === 'ArrowDown')  { const n = nextOf(state.selected); if (n) api.open(n); };
        if (e.key === 'ArrowUp')  { const n = prevOf(state.selected); if (n) api.open(n); }
        if (e.key === 'ArrowLeft')    { if (state.selected?.parent) api.open(state.selected.parent); };
        if (e.key === 'ArrowRight')  { const c = state.selected?.children?.[0]; if (c) api.open(c); };
        });

        els.prev.addEventListener("click", () => { const n = prevOf(state.selected); if (n) api.open(n); });
        els.next.addEventListener("click", () => { const n = nextOf(state.selected); if (n) api.open(n); });
        els.up.addEventListener("click", () => { if (state.selected?.parent) api.open(state.selected.parent); });
        els.down.addEventListener("click", () => { const c = state.selected?.children?.[0]; if (c) api.open(c); });
        els.closeBtn.addEventListener("click", () => { els.box.classList.remove("open"); state.selected = null; });
    }

    function markSelected(d) {
    // remove previous highlight
    d3.selectAll('.node-fo').classed('node-focused', false);

    // add highlight to the currently selected node
    const fo = opts.svg
        .selectAll('g.node')
        .filter(n => n.id === d.id)
        .select('.node-fo');

    fo.classed('node-focused', true);
    }


    const api = {
        init({
            container = "#sidebox",
            svg, zoom,
            getRoot,        // () => root
            update          // (source) => void
        }) {
            opts = { container, svg, zoom, getRoot, update };
            els = buildSkeleton(container);
            state = { selected: null, order: [] };
            bindNav();
            return api;
        },

        open(d) {
            state.selected = d;
            ensureVisible(d);
            rebuildOrder();
            centerOn(d, 160);
            render(d);
            markSelected(d);
        },

        onTreeUpdated() {            // call after your update(root) completes
            rebuildOrder();
            if (state.selected) {
                render(state.selected);
            }
        }
    };

    return api;
})();
