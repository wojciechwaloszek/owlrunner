import cytoscape from 'cytoscape';

// Helper function to get estimated label width
function getLabelWidth(node: cytoscape.NodeSingular): number {
    const label = node.data('label') || '';
    return Math.max(120, label.length * 10);
}

// Helper function to get estimated label height
function getLabelHeight(node: cytoscape.NodeSingular): number {
    return 20;
}

// Creates anchors within the node so it won't resize itself to be smaller
function anchorClass(node: cytoscape.NodeSingular) {
    const id = node.id();
    const anchorId = `anchor_${id}`;
    let anchor = node.cy().getElementById(anchorId);
    if (anchor.empty()) {
        node.cy().add({ group: 'nodes', data: { id: anchorId, parent: id }, classes: 'anchor-node' });
        anchor = node.cy().getElementById(anchorId);
    }
    const anchor2Id = `anchor_br_${node.id()}`;
    let anchor2 = node.cy().getElementById(anchor2Id);
    if (anchor2.empty()) {
        node.cy().add({ group: 'nodes', data: { id: anchor2Id, parent: node.id() }, classes: 'anchor-node' });
        anchor2 = node.cy().getElementById(anchor2Id);
    }
}

// Export function for applying OWL compound layout
export function applyOWLCompoundLayout(cy: cytoscape.Core) {
    // We need to calculate bounds explicitly

    // Get all root class nodes
    const rootClasses = cy.nodes('.class-node').orphans();

    // Settings
    const PADDING = 20;

    // Recursive function to layout a class and return its calculated dimensions {w, h, x, y}
    function layoutClass(node: cytoscape.NodeSingular, startX?: number, startY?: number): { w: number, h: number } {

        // Get the children of the class, collate them upmost to downmost
        const objectAttrs = node.children('.attr-obj').sort((a, b) => a.boundingBox().y1 - b.boundingBox().y1);
        const stringAttrs = node.children('.attr-str').sort((a, b) => a.boundingBox().y1 - b.boundingBox().y1);
        const subclasses = node.children('.class-node').sort((a, b) => a.boundingBox().y1 - b.boundingBox().y1);
        // collAttrs should be sorted by leftmost to rightmost
        const collAttrs = node.children('.attr-col').sort((a, b) => a.boundingBox().x1 - b.boundingBox().x1);

        anchorClass(node);

        const dims = { w: 0, h: 0 };

        let sx = startX !== undefined ? startX : node.boundingBox().x1;
        let sy = startY !== undefined ? startY : node.boundingBox().y1;

        sx += 8.5;
        sy += 10.5;

        // 1. First row - label only
        const currentY = sy + PADDING + getLabelHeight(node);

        // Initial widths for columns
        let leftW = 0; objectAttrs.forEach(n => { leftW = Math.max(leftW, n.outerWidth()); });
        let rightW = 0; stringAttrs.forEach(n => { rightW = Math.max(rightW, n.outerWidth()); });

        // Position Second Row
        const leftX = sx;
        const midX = sx + leftW + (leftW > 0 ? PADDING : 0);

        // Subclasses
        let midW = 0;
        let midH = 0;
        let subY = currentY;
        subclasses.forEach(sub => {
            const subDims = layoutClass(sub, midX, subY);
            midW = Math.max(midW, subDims.w);
            subY += subDims.h + 1.5 * PADDING;
            midH += subDims.h + 1.5 * PADDING;
        });
        if (subclasses.length > 0) midH -= PADDING;

        // Calculate row 3 width
        let row3W = 0;
        collAttrs.forEach(child => { row3W += child.outerWidth() + PADDING; });
        if (collAttrs.length > 0) row3W -= PADDING;

        // Calculate natural row 2 width
        const naturalRightX = midX + midW + ((midW > 0 || leftW > 0) && stringAttrs.length > 0 ? PADDING : 0);
        const naturalRow2W = (stringAttrs.length > 0) ? (naturalRightX + rightW - sx) : (naturalRightX - sx);

        // Node bounds
        dims.w = Math.max(getLabelWidth(node), row3W, naturalRow2W);
        const rightEdge = sx + dims.w;

        // Object attrs
        let leftY = currentY;
        let leftH = 0;
        objectAttrs.forEach(child => {
            // position is center
            child.position({ x: leftX + child.outerWidth() / 2, y: leftY + child.outerHeight() / 2 });
            leftY += child.outerHeight() + PADDING;
            leftH += child.outerHeight() + PADDING;
        });
        if (objectAttrs.length > 0) leftH -= PADDING;

        // String attrs (right-edge aligned)
        let rightY = currentY;
        let rightH = 0;
        stringAttrs.forEach(child => {
            child.position({ x: rightEdge - child.outerWidth() / 2, y: rightY + child.outerHeight() / 2 });
            rightY += child.outerHeight() + PADDING;
            rightH += child.outerHeight() + PADDING;
        });
        if (stringAttrs.length > 0) rightH -= PADDING;

        const row2H = Math.max(leftH, midH, rightH);

        // Collective attrs
        const row3Y = currentY + row2H + (row2H > 0 && collAttrs.length > 0 ? PADDING : 0);
        // Center the collective attributes horizontally
        const row3StartX = sx + (dims.w - row3W) / 2;
        let row3X = row3StartX;
        let row3H = 0;
        collAttrs.forEach(child => {
            child.position({ x: row3X + child.outerWidth() / 2, y: row3Y + child.outerHeight() / 2 });
            row3X += child.outerWidth() + PADDING;
            row3H = Math.max(row3H, child.outerHeight());
        });

        dims.h = (row3Y + row3H - sy);

        const id = node.id();
        const anchor1 = cy.getElementById(`anchor_${id}`);
        const anchor2 = cy.getElementById(`anchor_br_${id}`);
        if (!anchor1.empty()) anchor1.position({ x: sx, y: sy });
        if (!anchor2.empty()) anchor2.position({ x: sx + dims.w, y: sy + dims.h });

        return dims;
    }

    // Layout all root classes
    rootClasses.forEach(root => {
        //const dims = layoutClass(root, 0, currentRootY);
        const dims = layoutClass(root);
    });

}
