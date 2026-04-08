import cytoscape from 'cytoscape';
import { b } from 'vite/dist/node/types.d-aGj9QkWt';

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
        const STRING_ATTR_PADDING = 4;
        let rightY = currentY;
        let rightH = 0;
        stringAttrs.forEach(child => {
            child.position({ x: rightEdge - child.outerWidth() / 2, y: rightY + child.outerHeight() / 2 });
            rightY += child.outerHeight() + STRING_ATTR_PADDING;
            rightH += child.outerHeight() + STRING_ATTR_PADDING;
        });
        if (stringAttrs.length > 0) rightH -= STRING_ATTR_PADDING;

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

    bendOverlappingEdges(cy);

}

// the function to bend edges that are overlapping
function bendOverlappingEdges(cy: cytoscape.Core) {
    // get all edges (not self-loops, so target is not in source ancestors)
    const edges = cy.edges().filter(edge => !edge.source().ancestors().contains(edge.target()));
    // for each edge - unbend it
    edges.forEach(edge => {
        edge.style({
            'curve-style': 'bezier',
            'control-point-distance': [],
            'control-point-weight': []
        });
    });
    // for each edge - find overlapping edges
    edges.forEach(edge => {
        // get bounding box of edge
        const bbox = edge.boundingBox();
        // if edge is overlapping with another edge
        const overlappingEdges = edges.filter(otherEdge =>
            edge.id() !== otherEdge.id() &&
            bbox.x1 < otherEdge.boundingBox().x2 &&
            bbox.x2 > otherEdge.boundingBox().x1 &&
            bbox.y1 < otherEdge.boundingBox().y2 &&
            bbox.y2 > otherEdge.boundingBox().y1
        );
        // for each overlapping edge
        overlappingEdges.forEach(overlappingEdge => {
            // check the "severity" of the overlap
            // imagine that the edge is 30px wide, so it's a rotated rectangle with width of 30px
            // and check how much it overlaps with the other edge, so what is the length
            // of the part of the edge that is overlapping within the rectangle
            // 1. Get the rotated rectangle (edge "fattened" by 15px on each side)
            // calculate the angle of the edge
            let edgeAngle = Math.atan2(edge.sourceEndpoint().y - edge.targetEndpoint().y, edge.targetEndpoint().x - edge.sourceEndpoint().x);
            let rotatedAngle = edgeAngle + Math.PI / 2;
            // calculate the four corners of the rotated rectangle
            const OVERLAP_DISTANCE = 15;
            let x11 = edge.sourceEndpoint().x + OVERLAP_DISTANCE * Math.cos(rotatedAngle);
            let y11 = edge.sourceEndpoint().y - OVERLAP_DISTANCE * Math.sin(rotatedAngle);
            let x12 = edge.sourceEndpoint().x - OVERLAP_DISTANCE * Math.cos(rotatedAngle);
            let y12 = edge.sourceEndpoint().y + OVERLAP_DISTANCE * Math.sin(rotatedAngle);
            let x21 = edge.targetEndpoint().x + OVERLAP_DISTANCE * Math.cos(rotatedAngle);
            let y21 = edge.targetEndpoint().y - OVERLAP_DISTANCE * Math.sin(rotatedAngle);
            let x22 = edge.targetEndpoint().x - OVERLAP_DISTANCE * Math.cos(rotatedAngle);
            let y22 = edge.targetEndpoint().y + OVERLAP_DISTANCE * Math.sin(rotatedAngle);

            // 2. Find the points where the other edge "enters" and "exits" the rectangle
            // check if the line segment (overlappingEdge.sourceEndpoint(), overlappingEdge.targetEndpoint())
            // intersects with the rectangle (x11, y11, x12, y12, x21, y21, x22, y22)
            // check the 4 sides of the rectangle

            // side 1: (x11, y11) to (x21, y21)
            // if the line segment (overlappingEdge.sourceEndpoint(), overlappingEdge.targetEndpoint())
            // intersects with the line segment (x11, y11, x21, y21)
            // calculate the intersection point
            let intersectionPoints: { x: number, y: number }[] = [];
            let intersectionPoint = getIntersectionPoint(
                overlappingEdge.sourceEndpoint().x, overlappingEdge.sourceEndpoint().y,
                overlappingEdge.targetEndpoint().x, overlappingEdge.targetEndpoint().y,
                x11, y11, x21, y21);
            // if the intersection point is on the line segment
            if (intersectionPoint) {
                // add the intersection point to the list of intersection points
                intersectionPoints.push(intersectionPoint);
            }

            // side 2: (x12, y12) to (x22, y22)
            intersectionPoint = getIntersectionPoint(
                overlappingEdge.sourceEndpoint().x, overlappingEdge.sourceEndpoint().y,
                overlappingEdge.targetEndpoint().x, overlappingEdge.targetEndpoint().y,
                x12, y12, x22, y22);
            if (intersectionPoint) {
                intersectionPoints.push(intersectionPoint);
            }

            // side 3: (x11, y11) to (x12, y12)
            intersectionPoint = getIntersectionPoint(
                overlappingEdge.sourceEndpoint().x, overlappingEdge.sourceEndpoint().y,
                overlappingEdge.targetEndpoint().x, overlappingEdge.targetEndpoint().y,
                x11, y11, x12, y12);
            if (intersectionPoint) {
                intersectionPoints.push(intersectionPoint);
            }

            // side 4: (x21, y21) to (x22, y22)
            intersectionPoint = getIntersectionPoint(
                overlappingEdge.sourceEndpoint().x, overlappingEdge.sourceEndpoint().y,
                overlappingEdge.targetEndpoint().x, overlappingEdge.targetEndpoint().y,
                x21, y21, x22, y22);
            if (intersectionPoint) {
                intersectionPoints.push(intersectionPoint);
            }

            // 3. Calculate the overlapping length
            // Check if there are at least 2 intersection points
            if (intersectionPoints.length < 2) {
                // if not do one more thing
                // check if the overlapping edge's starting point is inside the rectangle
                if (isPointInPolygon(overlappingEdge.sourceEndpoint().x, overlappingEdge.sourceEndpoint().y,
                    x11, y11, x21, y21, x22, y22, x12, y12)) {
                    intersectionPoints.push(overlappingEdge.sourceEndpoint());
                }
                // check if the overlapping edge's ending point is inside the rectangle
                if (isPointInPolygon(overlappingEdge.targetEndpoint().x, overlappingEdge.targetEndpoint().y,
                    x11, y11, x21, y21, x22, y22, x12, y12)) {
                    intersectionPoints.push(overlappingEdge.targetEndpoint());
                }
            }

            if (intersectionPoints.length >= 2) {
                // calculate the overlapping length
                let overlappingLength = Math.sqrt(
                    Math.pow(intersectionPoints[0].x - intersectionPoints[1].x, 2) +
                    Math.pow(intersectionPoints[0].y - intersectionPoints[1].y, 2)
                );
                // compare with edge length
                const edgeLength = Math.sqrt(
                    Math.pow(edge.targetEndpoint().x - edge.sourceEndpoint().x, 2) +
                    Math.pow(edge.targetEndpoint().y - edge.sourceEndpoint().y, 2)
                );
                // if the overlapping length is greater than 0.5 of edge length, bend both edges
                if (overlappingLength > edgeLength * 0.5) {
                    // log
                    /*console.log('Overlapping edges found');
                    console.log('Edge: ' + edge.source().style('label') + ' -> ' + edge.target().style('label') +
                        ' and overlapping edge: ' +
                        overlappingEdge.source().style('label') + ' -> ' + overlappingEdge.target().style('label'));
                    console.log('Edge endpoints: ' +
                        edge.sourceEndpoint().x + ',' + edge.sourceEndpoint().y + ' -> ' +
                        edge.targetEndpoint().x + ',' + edge.targetEndpoint().y);
                    console.log('Overlapping edge endpoints: ' +
                        overlappingEdge.sourceEndpoint().x + ',' + overlappingEdge.sourceEndpoint().y + ' -> ' +
                        overlappingEdge.targetEndpoint().x + ',' + overlappingEdge.targetEndpoint().y);
                    console.log('Intersection points: ' +
                        intersectionPoints[0].x + ',' + intersectionPoints[0].y + ' -> ' +
                        intersectionPoints[1].x + ',' + intersectionPoints[1].y);
                    console.log('Overlapping length: ' + overlappingLength);
                    console.log('Edge length: ' + edgeLength);
                    console.log('Overlapping percentage: ' + (overlappingLength / edgeLength) * 100 + '%');*/

                    // calculate the overlapping edge angle
                    let overlappingEdgeAngle = Math.atan2(
                        overlappingEdge.sourceEndpoint().y - overlappingEdge.targetEndpoint().y,
                        overlappingEdge.targetEndpoint().x - overlappingEdge.sourceEndpoint().x
                    );
                    // if the angle difference is less than 45 degrees, 
                    // bend the edges opposite ways
                    if (Math.abs(edgeAngle - overlappingEdgeAngle) < Math.PI / 4) {
                        edge.style({
                            'curve-style': 'unbundled-bezier',
                            'control-point-distance': 50,
                            'control-point-weight': 0.5
                        });
                        overlappingEdge.style({
                            'curve-style': 'unbundled-bezier',
                            'control-point-distance': -50,
                            'control-point-weight': 0.5
                        });
                        //edge.addClass('bentLeft');
                        //overlappingEdge.addClass('bentLeft');
                    } else {
                        // bend the edges the same way
                        edge.style({
                            'curve-style': 'unbundled-bezier',
                            'control-point-distance': 50,
                            'control-point-weight': 0.5
                        });
                        overlappingEdge.style({
                            'curve-style': 'unbundled-bezier',
                            'control-point-distance': 50,
                            'control-point-weight': 0.5
                        });
                        //edge.addClass('bentRight');
                        //overlappingEdge.addClass('bentLeft');
                    }
                }
            }
        });
    })
}

function getIntersectionPoint(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number, x4: number, y4: number): { x: number, y: number } | null {
    // calculate the intersection point of the line segment (x1, y1, x2, y2) and the line segment (x3, y3, x4, y4)
    // https://en.wikipedia.org/wiki/Line%E2%80%93line_intersection#Given_two_points_on_each_line
    const denominator = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (denominator === 0) {
        return null;
    }
    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4));
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3));
    if (denominator > 0) {
        if (t >= 0 && t <= denominator && u >= 0 && u <= denominator) {
            return {
                x: x1 + t * (x2 - x1) / denominator,
                y: y1 + t * (y2 - y1) / denominator
            };
        }
    } else {
        if (t <= 0 && t >= denominator && u <= 0 && u >= denominator) {
            return {
                x: x1 + t * (x2 - x1) / denominator,
                y: y1 + t * (y2 - y1) / denominator
            };
        }
    }
    return null;
}

function isPointInPolygon(x: number, y: number, x11: number, y11: number, x21: number, y21: number, x22: number, y22: number, x12: number, y12: number): boolean {
    // check if the point (x, y) is inside the polygon (x11, y11, x21, y21, x22, y22, x12, y12)
    // https://en.wikipedia.org/wiki/Point_in_polygon
    const vertices = [
        { x: x11, y: y11 },
        { x: x21, y: y21 },
        { x: x22, y: y22 },
        { x: x12, y: y12 }
    ];
    let inside = false;
    for (let i = 0, j = vertices.length - 1; i < vertices.length; j = i++) {
        const xi = vertices[i].x, yi = vertices[i].y;
        const xj = vertices[j].x, yj = vertices[j].y;

        const intersect = ((yi > y) != (yj > y)) &&
            (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
        if (intersect) inside = !inside;
    }
    return inside;
}
