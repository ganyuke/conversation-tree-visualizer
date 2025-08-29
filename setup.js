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

let selected = null;           // currently opened node
let navOrder = [];             // linear order for prev/next
const sideboxEl = document.getElementById('sidebox');

function snippet(s, n=140) {
  return (s || '').replace(/\s+/g,' ').slice(0, n).trim() + ((s||'').length>n ? '…' : '');
}

function ensureVisible(d) {   // expand ancestors if needed
  let a = d.parent;
  let changed = false;
  while (a) {
    if (a._children) { a.children = a._children; a._children = null; changed = true; }
    a = a.parent;
  }
  if (changed) update(d);
}

function centerOnNode(d, dur=250) {
  const t = d3.zoomTransform(svg.node());
  const k = t.k; const svgW = +svg.attr('width'); const svgH = +svg.attr('height');
  const tx = (svgW/2) - k * d.y; const ty = (svgH/2) - k * d.x;
  svg.transition().duration(dur).call(zoom.transform, d3.zoomIdentity.translate(tx,ty).scale(k));
}

// Build linear order left→right, then top→bottom for tie-breaks
function rebuildNavOrder() {
  const nodes = root.descendants().slice();
  nodes.sort((a,b) => (a.y - b.y) || (a.x - b.x));
  navOrder = nodes;
}
function nextNode(d) { const i = navOrder.indexOf(d); return i>=0 ? navOrder[i+1] : null; }
function prevNode(d) { const i = navOrder.indexOf(d); return i>=0 ? navOrder[i-1] : null; }

function openSidebox(d) {
  selected = d;
  ensureVisible(d);
  rebuildNavOrder();
  centerOnNode(d, 180);

  const parent = d.parent;
  const kids = d.children || [];
  const sibs = parent ? (parent.children || []) : [];

  sideboxEl.innerHTML = `
    <header>
      <div class="title">${(d.data.speaker || 'node').toUpperCase()}</div>
      <div class="time">${d.data.timestamp || ''}</div>
    </header>
    <div class="body">${(d.data.text || '').replace(/</g,'&lt;')}</div>

    <div class="nav">
      <button id="nav-prev">◀ Prev</button>
      <button id="nav-next">Next ▶</button>
      <button id="nav-up">↑ Parent</button>
      <button id="nav-down">↓ First child</button>
    </div>

    ${kids.length ? `<div class="list" id="forks">
      <div class="meta" style="padding:0 12px 0;">Forks (${kids.length})</div>
      ${kids.map((c,i)=>`
        <div class="item" data-id="${c.id}">
          <div class="meta"><span>${(c.data.speaker||'').toUpperCase()}</span><span>${c.data.timestamp||''}</span></div>
          <div class="preview">${snippet(c.data.text, 180)}</div>
        </div>`).join('')}
    </div>` : ''}

    ${sibs.length>1 ? `<div class="list" id="siblings">
      <div class="meta" style="padding:0 12px 0;">Siblings (${sibs.length-1} others)</div>
      ${sibs.filter(s=>s!==d).map(s=>`
        <div class="item" data-id="${s.id}">
          <div class="meta"><span>${(s.data.speaker||'').toUpperCase()}</span><span>${s.data.timestamp||''}</span></div>
          <div class="preview">${snippet(s.data.text)}</div>
        </div>`).join('')}
    </div>` : ''}
  `;
  sideboxEl.classList.add('open');

  // wire nav
  sideboxEl.querySelector('#nav-prev')?.addEventListener('click', () => { const n = prevNode(d); if(n){ openSidebox(n);} });
  sideboxEl.querySelector('#nav-next')?.addEventListener('click', () => { const n = nextNode(d); if(n){ openSidebox(n);} });
  sideboxEl.querySelector('#nav-up')?.addEventListener('click',   () => { if(parent){ openSidebox(parent);} });
  sideboxEl.querySelector('#nav-down')?.addEventListener('click', () => { if(kids[0]){ openSidebox(kids[0]); } });

  sideboxEl.querySelectorAll('#forks .item, #siblings .item').forEach(el => {
    el.addEventListener('click', () => {
      const id = el.getAttribute('data-id');
      const target = root.descendants().find(n => n.id === id);
      if (target) openSidebox(target);
    });
  });
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