export const createStats = (() => {
    function countAllNodes(d) {
        let n = 1;
        (d.children || []).forEach(c => n += countAllNodes(c));
        (d._children || []).forEach(c => n += countAllNodes(c));
        return n;
    }

    function countAllLeaves(d) {
        const kids = (d.children || []).concat(d._children || []);
        if (kids.length === 0) return 1;
        return kids.reduce((acc, c) => acc + countAllLeaves(c), 0);
    }

    function maxDepthAll(d) {
        const kids = (d.children || []).concat(d._children || []);
        if (kids.length === 0) return 0;
        return 1 + Math.max(...kids.map(maxDepthAll));
    }

    function countForksAll(d) {
        const deg = (d.children?.length || 0) + (d._children?.length || 0);
        const here = deg > 1 ? 1 : 0;
        let sum = here;
        (d.children || []).forEach(c => sum += countForksAll(c));
        (d._children || []).forEach(c => sum += countForksAll(c));
        return sum;
    }

    function computeStats(root) {
        // Visible = nodes currently in the laid-out hierarchy (children only)
        const visibleNodes = root.descendants();
        const visibleLeaves = visibleNodes.filter(n => !n.children).length;
        const depthVisible = visibleNodes.length ? d3.max(visibleNodes, n => n.depth) : 0;

        // Totals include collapsed nodes (_children)
        const totalNodes = countAllNodes(root);
        const totalLeaves = countAllLeaves(root);
        const depthAll = maxDepthAll(root);
        const forks = countForksAll(root);

        return { visibleNodes: visibleNodes.length, visibleLeaves, totalNodes, totalLeaves, depthVisible, depthAll, forks };
    }

    return function updateStats(root) {
        const s = computeStats(root);
        const set = (id, val) => { const el = document.getElementById(id); if (el) el.textContent = val; };
        set('stat-nodes', `${s.visibleNodes}/${s.totalNodes}`);
        set('stat-leaves', `${s.visibleLeaves}/${s.totalLeaves}`);
        set('stat-forks', `${s.forks}`);
        set('stat-depth', `${s.depthVisible}/${s.depthAll}`);
    };
});

