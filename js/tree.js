import { NODE_H, NODE_H_GAP, NODE_W, H_GAP, V_GAP, DEFAULT_FIT_PAD, FIT_TRANSITION_DURATION } from './config.js'
import { emit, on, layoutExtents, collapse } from './utils.js';

export const createTree = (r, svg, zoom, g) => {
    const tree = d3.tree().nodeSize([NODE_H + NODE_H_GAP, NODE_W + H_GAP]);
    let nodes, links, root;

    function recomputeJoins(r) {
        nodes = r.descendants();
        links = r.links();
    }

    function setRoot(r) {
        recomputeJoins(r);
        root = r;

        // Normalize for fixed-depth columns
        nodes.forEach(d => d.y = d.depth * (NODE_W + H_GAP));

        update(root);
    }

    function diagonal(s, d) {
        // Smooth horizontal edge
        const path = `M ${s.y + NODE_W / 2} ${s.x}
                    C ${s.y + NODE_W / 2 + V_GAP} ${s.x},
                    ${d.y - NODE_W / 2 - V_GAP} ${d.x},
                    ${d.y - NODE_W / 2} ${d.x}`;
        return path;
    }

    function fitToScreen(pad = DEFAULT_FIT_PAD) {
        const { minX, maxX, minY, maxY, w, h } = layoutExtents(nodes);

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

        svg.transition().duration(FIT_TRANSITION_DURATION)
            .call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }

    function createNodeLinks(source) {
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
            .attr('d', _d => {
                const o = { x: source.x, y: source.y };
                return diagonal(o, o);
            })
            .remove();
    }

    function createNodes(source) {
        const node = g.selectAll('g.node')
            .data(nodes, d => d.id);

        // open side panel on click
        const nodeEnter = node.enter().append('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${source.y0 ?? source.y},${source.x0 ?? source.x})`)
            .on('click', (event, d) => {
                // add selection box around clicked box
                d3.selectAll('.node-fo').classed('node-focused', false);
                const fo = d3.select(event.currentTarget).select('.node-fo');
                fo.classed('node-focused', true);

                // open panel
                event.stopPropagation();
                emit('panel:open', d);
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

        const actions = card.append('div').attr('class', 'node-actions');
        actions.append('button').attr('class', 'node-btn').text('Toggle').on('click', (e, d) => {
            e.stopPropagation();
            // does NOT recursively collapse; preserves open state for descendants
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
        const _nodeExit = node.exit().transition().duration(300)
            .attr('transform', _d => `translate(${source.y},${source.x})`)
            .remove();

        // Stash old positions for smooth transitions
        nodes.forEach(d => { d.x0 = d.x; d.y0 = d.y; });
    }

    function init() {
        document.getElementById('fit').addEventListener('click', () => fitToScreen());
        document.getElementById('expand').addEventListener('click', () => {
            root.each(d => { if (d._children) { d.children = d._children; d._children = null; } });
            update(root);
            // something about waiting for DOM or animations or something
            setTimeout(() => fitToScreen(), 410);
        });

        document.getElementById('collapse').addEventListener('click', () => {
            collapse(root);
            update(root);
            setTimeout(() => fitToScreen(), 410);
        });

        on("window:resize", (evt) => {
            const {w,h} = evt.detail;
            svg.attr('width', w).attr('height', h).attr('viewBox', [0, 0, w, h]);
            fitToScreen();
        })
    }

    function update(source) {
        tree(root);
        recomputeJoins(root);
        createNodeLinks(source);
        createNodes(source);
        emit('tree:updated', { root, nodes, links });
    }
    
    setRoot(r);
    init();
    fitToScreen();

    return {
        update,
        setRoot,
        getRoot: () => root,
        getRootData: () => {
            return {
                links,
                nodes
            }
        }
    };
};