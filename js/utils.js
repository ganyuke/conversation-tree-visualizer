import { NODE_H, NODE_W } from './config.js'

/** UTILS */
/** Compute layout extents from node positions (x = vertical, y = horizontal) */
export function layoutExtents(nodes) {
    const minX = d3.min(nodes, d => d.x - NODE_H / 2);
    const maxX = d3.max(nodes, d => d.x + NODE_H / 2);
    const minY = d3.min(nodes, d => d.y - NODE_W / 2);
    const maxY = d3.max(nodes, d => d.y + NODE_W / 2);
    let w = (maxY - minY) || NODE_W;
    let h = (maxX - minX) || NODE_H;
    return { minX, maxX, minY, maxY, w, h };
}

export function collapse(root) {
    // Collapse ALL nodes under the root, including the first visible level
    const kids = root.children;
    if (kids && kids.length) {
        // 1) Recursively move all descendants from `children` -> `_children`
        kids.forEach(function reCollapse(d) {
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
}

// Use a dedicated EventTarget (don’t spam window/document).
export const bus = new EventTarget();

// Helpers for ergonomics
export function on(type, handler, opts) {
    bus.addEventListener(type, handler, opts);
    // Return an off() convenience
    return () => bus.removeEventListener(type, handler, opts);
}
export function emit(type, detail) {
    return bus.dispatchEvent(new CustomEvent(type, { detail }));
}
