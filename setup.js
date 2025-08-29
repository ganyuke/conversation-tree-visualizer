/** CONFIG */
const NODE_W = 260;   // card width in px (keep in sync with CSS)
const NODE_H = 120;   // virtual height used for layout spacing
const NODE_H_GAP = 30; // extra space between siblings
const H_GAP = 80;    // horizontal gap between columns
const V_GAP = 36;    // vertical gap within column (link curvature)

/** SAMPLE DATA */
const data = {
    speaker: 'user',
    text: 'Plan me a weekend in Tokyo. I like food and tech.',
    timestamp: '2025-08-10 09:12',
    children: [
        {
            speaker: 'assistant',
            text: 'Great! Do you prefer street food crawls or Michelin-tier experiences? I can also weave in Akihabara and TeamLab.',
            timestamp: '2025-08-10 09:12',
            children: [
                {
                    speaker: 'user',
                    text: 'Street food, lots of walking. Keep it cheap.',
                    timestamp: '2025-08-10 09:13',
                    children: [
                        {
                            speaker: 'assistant',
                            text: 'Copy! Here are three sample routes for day 1 with yakitori alleys, ramen counters, and a retro arcade stop.',
                            timestamp: '2025-08-10 09:13'
                        },
                        {
                            speaker: 'assistant',
                            text: 'Alt plan: Tsukiji outer market early, Asakusa snack crawl, Ueno park stroll, and Akihabara retro. (Click to expand for details...)',
                            timestamp: '2025-08-10 09:14'
                        }
                    ]
                },
                {
                    speaker: 'user',
                    text: 'Michelin please — tasting menus are fine.',
                    timestamp: '2025-08-10 09:13',
                    children: [
                        {
                            speaker: 'assistant',
                            text: 'Understood. I can propose 2× tasting menus and a coffee omakase, with exhibit/bookstore stops between.',
                            timestamp: '2025-08-10 09:14'
                        }
                    ]
                }
            ]
        },
        {
            speaker: 'assistant',
            text: 'Here is a cost-sensitive itinerary with public transit optimizations and some gadget stops.',
            timestamp: '2025-08-10 09:12'
        }
    ]
};

/** UTILS */
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

// Collapse helper: collapse all children recursively
function collapse(d) {
    if (d.children) {
        d._children = d.children;
        d._children.forEach(collapse);
        d.children = null;
    }
}

/** SETUP */
const chartEl = document.getElementById('chart');
const width = chartEl.clientWidth || window.innerWidth;
const height = chartEl.clientHeight || (window.innerHeight - 64);

const svg = d3.select('#chart').append('svg')
    .attr('width', width)
    .attr('height', height)
    .attr('viewBox', [0, 0, width, height])
    .style('display', 'block');

const g = svg.append('g'); // zoom/pan container

const zoom = d3.zoom()
    .scaleExtent([0.3, 2.5])
    .on('zoom.main', (event) => {
        g.attr('transform', event.transform);
        minimap.syncViewbox(); // keep minimap viewport in sync
    });

svg.call(zoom);

let root;

function buildRoot(data) {
    const root = d3.hierarchy(data);
    // Start with first level expanded for a nice initial view
    root.x0 = height / 2;
    root.y0 = 40;
    root.each(d => { d.id = crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).slice(2) });
    root.children && root.children.forEach(c => {
        // keep first child expanded, collapse deeper levels by default
        c.children && c.children.forEach(grand => grand && collapse(grand));
    });
    return root;
}

const resizeSubscribers = [];

function subscribeToResize(func) {
    resizeSubscribers.push(func);
}

window.addEventListener('resize', () => {
    for (const func of resizeSubscribers) {
        func();
    }
});
