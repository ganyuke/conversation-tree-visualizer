/** Compute layout extents from node positions (x = vertical, y = horizontal) */
function layoutExtents() {
    const nodes = root.descendants();
    const minX = d3.min(nodes, d => d.x - NODE_H / 2);
    const maxX = d3.max(nodes, d => d.x + NODE_H / 2);
    const minY = d3.min(nodes, d => d.y - NODE_W / 2);
    const maxY = d3.max(nodes, d => d.y + NODE_W / 2);
    let w = (maxY - minY) || NODE_W;
    let h = (maxX - minX) || NODE_H;
    return { minX, maxX, minY, maxY, w, h };
}

/** Minimap module */
function createMinimap({
    container = '#minimap',
    height = 160,
    pad = 8,
    svg,    // main SVG selection
    g,      // main <g> selection
    zoom,   // main zoom behavior
    getExtents = layoutExtents
}) {
    const [kMin, kMax] = zoom.scaleExtent();
    const state = { w: window.innerWidth, h: height, pad, k: 1, tx: 0, ty: 0 };

    // Build SVG
    const miniSvg = d3.select(container).append('svg')
        .attr('width', state.w).attr('height', state.h);
    const miniG = miniSvg.append('g');           // simplified content
    const miniView = miniSvg.append('rect')      // current viewport rect
        .attr('class', 'viewbox');

    // Brush (2D like your original; can switch to brushX if you prefer)
    const brush = d3.brush()
        .extent([[0, 0], [state.w, state.h]])
        .on('brush end', brushed);
    const brushG = miniSvg.append('g').attr('class', 'mini-brush').call(brush);

    function size() {
        state.w = window.innerWidth;
        miniSvg.attr('width', state.w).attr('height', state.h);
        brush.extent([[0, 0], [state.w, state.h]]);
        brushG.call(brush);
    }

    // tree → minimap coords
    function toMini(y, x) {
        return [state.tx + state.k * y, state.ty + state.k * x];
    }
    // minimap → tree coords
    function fromMini(mx, my) {
        return [(mx - state.tx) / state.k, (my - state.ty) / state.k]; // returns [y, x]
    }

    function rebuild() {
        const { minX, maxX, minY, maxY, w, h } = getExtents();

        // fit whole content into minimap with padding; prefer filling width
        const kx = (state.w - state.pad * 2) / w;
        const ky = (state.h - state.pad * 2) / h;
        state.k = Math.max(0.0001, Math.min(kx, ky));
        state.tx = state.pad - state.k * minY;
        const contentH = state.k * h;
        state.ty = (state.h - contentH) / 2 - state.k * minX;

        // Links (straight lines = cheap)
        const links = root.links();
        const miniLinks = miniG.selectAll('line.mini-link').data(links, d => d.target.id);
        miniLinks.enter().append('line')
            .attr('class', 'mini-link')
            .attr('stroke', '#3a466f').attr('stroke-width', 1).attr('opacity', 0.7)
            .merge(miniLinks)
            .attr('x1', d => state.tx + state.k * d.source.y)
            .attr('y1', d => state.ty + state.k * d.source.x)
            .attr('x2', d => state.tx + state.k * d.target.y)
            .attr('y2', d => state.ty + state.k * d.target.x);
        miniLinks.exit().remove();

        // Node ticks
        const nodes = root.descendants();
        const miniNodes = miniG.selectAll('rect.mini-node').data(nodes, d => d.id);
        miniNodes.enter().append('rect')
            .attr('class', 'mini-node')
            .attr('width', 3).attr('height', 3)
            .attr('fill', d => d.data.speaker === 'user' ? '#8cb2ff' : '#c6a4ff')
            .merge(miniNodes)
            .attr('x', d => state.tx + state.k * d.y - 1.5)
            .attr('y', d => state.ty + state.k * d.x - 1.5);
        miniNodes.exit().remove();

        api.syncViewbox();
    }

    function syncViewbox() {
        const t = d3.zoomTransform(svg.node());
        const svgW = +svg.attr('width'), svgH = +svg.attr('height');
        const cx0 = -t.x / t.k;          // content left  (Y)
        const cy0 = -t.y / t.k;          // content top   (X)
        const cw = svgW / t.k;
        const ch = svgH / t.k;
        miniView
            .attr('x', state.tx + state.k * cx0)
            .attr('y', state.ty + state.k * cy0)
            .attr('width', state.k * cw)
            .attr('height', state.k * ch);
    }

    function brushed(ev) {
        if (!ev.selection) return;
        const [[x0, y0], [x1, y1]] = ev.selection;

        const [selY0, selX0] = fromMini(x0, y0);
        const [selY1, selX1] = fromMini(x1, y1);

        const svgW = +svg.attr('width'), svgH = +svg.attr('height');
        let k = Math.min(svgW / Math.max(1, (selY1 - selY0)), svgH / Math.max(1, (selX1 - selX0)));
        k = Math.max(kMin, Math.min(kMax, k));

        const tx = (svgW / 2) - k * ((selY0 + selY1) / 2);
        const ty = (svgH / 2) - k * ((selX0 + selX1) / 2);

        svg.transition().duration(220)
            .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(k));
    }

    const api = {
        rebuild,
        syncViewbox,
        resize: () => { size(); rebuild(); }
    };
    size(); // initial
    return api;
}

// ==== Instantiate the minimap and hook lifecycle points ====
const minimap = createMinimap({ container: '#minimap', height: 160, pad: 8, svg, g, zoom });

// After any update(root) / expand / collapse / fitToScreen:
setTimeout(() => minimap.rebuild(), 420);

// Keep it responsive:
window.addEventListener('resize', () => {
    // (your existing main SVG resize code here)
    minimap.resize();
});
