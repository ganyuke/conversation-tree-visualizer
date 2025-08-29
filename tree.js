const updateTree = (() => {
    const tree = d3.tree().nodeSize([NODE_H + NODE_H_GAP, NODE_W + H_GAP]);

    function diagonal(s, d) {
        // Smooth horizontal edge
        const path = `M ${s.y + NODE_W / 2} ${s.x}
                        C ${s.y + NODE_W / 2 + V_GAP} ${s.x},
                        ${d.y - NODE_W / 2 - V_GAP} ${d.x},
                        ${d.y - NODE_W / 2} ${d.x}`;
        return path;
    }

    return function update(source) {
        // Compute new tree layout
        const nodes = root.descendants();
        const links = root.links();
        tree(root);

        // Normalize for fixed-depth columns
        nodes.forEach(d => d.y = d.depth * (NODE_W + H_GAP));

        // ----- LINKS -----
        const link = g.selectAll('path.link')
            .data(links, d => d.target.id);

        link.enter()
            .insert('path', 'g')
            .attr('class', 'link')
            .attr('d', d => {
                const o = { x: source.x0 ?? source.x, y: source.y0 ?? source.y };
                return diagonal(o, o);
            })
            .merge(link)
            .transition().duration(350)
            .attr('d', d => diagonal(d.source, d.target));

        link.exit()
            .transition().duration(300)
            .attr('d', d => {
                const o = { x: source.x, y: source.y };
                return diagonal(o, o);
            })
            .remove();

        // ----- NODES -----
        const node = g.selectAll('g.node')
            .data(nodes, d => d.id);

        /*const nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${source.y0 ?? source.y},${source.x0 ?? source.x})`)
            .on('click', (event, d) => {
                d3.selectAll('.node-fo').classed('node-focused', false);
                const fo = d3.select(event.currentTarget).select('.node-fo');
                fo.classed('node-focused', true);
                // toggle
                if (d.children) { d._children = d.children; d.children = null; }
                else { d.children = d._children; d._children = null; }
                update(d);
                event.stopPropagation();
            });*/

        const nodeEnter = node.enter().append('g')
        .attr('class', 'node')
        .attr('transform', d => `translate(${source.y0 ?? source.y},${source.x0 ?? source.x})`)
        .on('click', (event, d) => {
            d3.selectAll('.node-fo').classed('node-focused', false);
            const fo = d3.select(event.currentTarget).select('.node-fo');
            fo.classed('node-focused', true);

            event.stopPropagation();
            // openSidebox(d);
              panel.open(d);
        });


        // Use foreignObject to render an HTML card inside SVG
        const fo = nodeEnter.append('foreignObject')
            .attr('class', 'node-fo node-hover')
            .attr('x', -NODE_W / 2)
            .attr('y', -NODE_H / 2)
            .attr('width', NODE_W)
            .attr('height', NODE_H);

        const card = fo.append('xhtml:div')
            .attr('class', d => `node-card ${d.data.speaker}`)
            .attr('title', d => d.data.text);

        const meta = card.append('div').attr('class', 'node-meta');
        meta.append('div')
            .attr('class', d => `badge ${d.data.speaker}`)
            .text(d => (d.data.speaker || 'node').toUpperCase());
        meta.append('div')
            .attr('class', 'timestamp')
            .text(d => d.data.timestamp || '');

        card.append('div')
            .attr('class', 'node-text')
            .text(d => d.data.text || '');

        // (Optional) Inline node actions
        const actions = card.append('div').attr('class', 'node-actions');
        actions.append('button').attr('class', 'node-btn').text('Toggle').on('click', (e, d) => {
            e.stopPropagation();
            if (d.children) { d._children = d.children; d.children = null; }
            else { d.children = d._children; d._children = null; }
            update(d);
        });

        // UPDATE + TRANSITION
        const nodeMerge = nodeEnter.merge(node);

        nodeMerge.transition().duration(350)
            .attr('transform', d => `translate(${d.y},${d.x})`);

        // EXIT
        // var isunused but the exit call is needed
        const nodeExit = node.exit().transition().duration(300)
            .attr('transform', d => `translate(${source.y},${source.x})`)
            .remove();

        // Stash old positions for smooth transitions
        nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });

        minimap.rebuild();
        updateStats(root);
        // rebuildNavOrder();
        panel.onTreeUpdated();
    }
})();

const panel = SidePanel.init({
  container: '#sidebox',
  svg, zoom,
  getRoot: () => root,
  updateTree   // pass your existing update(source) function
});

function fitToScreen(pad = 40) {
    const { minX, maxX, minY, maxY, w, h } = layoutExtents();

    // 2) Compute scale to fit inside the SVG with padding
    const svgW = +svg.attr('width');
    const svgH = +svg.attr('height');
    let scale = Math.min(
        (svgW - pad * 2) / Math.max(1, w),
        (svgH - pad * 2) / Math.max(1, h)
    );
    scale = Math.max(0.3, Math.min(2.0, scale)); // clamp like before

    // 3) Center the content rect in the SVG
    const contentCx = (minY + maxY) / 2;
    const contentCy = (minX + maxX) / 2;

    const tx = (svgW / 2) - scale * contentCx;
    const ty = (svgH / 2) - scale * contentCy;

    svg.transition().duration(400)
        .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
}

document.getElementById('fit').addEventListener('click', () => fitToScreen());
document.getElementById('expand').addEventListener('click', () => {
    root.each(d => { if (d._children) { d.children = d._children; d._children = null; } });
    updateTree(root);
    setTimeout(() => fitToScreen(60), 410);
});

document.getElementById('collapse').addEventListener('click', () => {
    // Collapse ALL nodes under the root, including the first visible level
    const kids = root.children;
    if (kids && kids.length) {
        // 1) Recursively move all descendants from `children` -> `_children`
        kids.forEach(function collapse(d) {
            if (d.children) {
                d._children = d.children;
                d.children = null;
            }
            if (d._children) d._children.forEach(collapse);
        });
        // 2) Hide level 1: move root.children itself to root._children
        root._children = kids;
        root.children = null;
    }

    updateTree(root);
    setTimeout(() => fitToScreen(60), 410);
});

subscribeToResize(() => {
    const w = chartEl.clientWidth || window.innerWidth;
    const h = chartEl.clientHeight || (window.innerHeight - 64);
    svg.attr('width', w).attr('height', h).attr('viewBox', [0, 0, w, h]);
    fitToScreen(60);
})

function setRoot(data) {
    root = buildRoot(data);
    // First render
    updateTree(root);
    // Slight delay to allow layout, then fit
    setTimeout(() => {
        fitToScreen(60);
    }, 50);
}

setRoot(data);
