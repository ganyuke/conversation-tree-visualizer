import { data } from "./config.js";
import { createMinimap } from "./minimap.js";
import { SidePanel } from "./sidebar.js";
import { createTree } from "./tree.js";
import { collapse, emit, layoutExtents, on } from "./utils.js";
import { createImporter } from "./importer.js";
import { createStats } from "./stats.js";

const appInit = () => {
    const chartEl = document.getElementById('chart');
    let w, h;

    function recalculateWh() {
        w = chartEl.clientWidth || window.innerWidth;
        h = chartEl.clientHeight || (window.innerHeight - 64);
    }
    recalculateWh();

    window.addEventListener('resize', () => {
        recalculateWh();
        emit("window:resize", { w, h })
    })

    function buildRoot(dat) {
        const root = d3.hierarchy(dat);
        // Start with first level expanded for a nice initial view
        root.x0 = h / 2;
        root.y0 = 40;
        root.each(d => { d.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) });
        root.children && root.children.forEach(c => {
            // keep first child expanded, collapse deeper levels by default
            c.children && c.children.forEach(grand => grand && collapse(grand));
        });
        return root;
    }

    const r = buildRoot(data);

    const svg = d3.select('#chart').append('svg')
        .attr('width', w)
        .attr('height', h)
        .attr('viewBox', [0, 0, w, h])
        .style('display', 'block');

    const g = svg.append('g'); // zoom/pan container

    const zoom = d3.zoom()
        .scaleExtent([0.3, 2.5]).on('zoom.main', (event) => {
            g.attr('transform', event.transform);
            minimap.syncViewbox();
        })
    svg.call(zoom);

    const { update: updateTree, setRoot, getRoot, getRootData } = createTree(r, svg, zoom, g);

    const panel = SidePanel.init({
        container: '#sidebox',
        svg, zoom,
        getRoot,
        updateTree   // pass your existing update(source) function
    });

    function getExtents() {
        const root = getRoot();
        return layoutExtents(root);
    }

    const minimap = createMinimap({ container: '#minimap', height: 160, pad: 8, getRootData: getRootData, svg: svg, zoom: zoom, getExtents: getExtents });

    const updateStats = createStats();
    updateStats(getRoot());

    const importConversation = createImporter(setRoot);
    /* HOOK */
    document.getElementById('convfile').addEventListener('change', async (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const text = await file.text();
        const exportJson = JSON.parse(text);

        // Get all trees
        const results = importConversation(exportJson, {
            includeSystem: false, // set true if you want system prompts in the tree
            includeTool: false    // set true if you want tool/function messages
        });

        // Example: pick the first conversation
        const first = results[0];
        // `first.tree` is the object your D3 code expects as `data`
        // e.g., window.data = first.tree; update(root) ... (where applicable)
        setRoot(buildRoot(first.tree))
    });

    function updateSubroutine() {
        panel.onTreeUpdated();
        minimap.resize();
        const root = getRoot();
        updateStats(root);
    }

    on("tree:updated", updateSubroutine)

    on("panel:open", (evt) => {
        panel.open(evt.detail);
    })
}

appInit();