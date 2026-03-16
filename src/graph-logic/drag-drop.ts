import cytoscape, { NodeSingular } from "cytoscape";

// --------------------------------------------------------------------------------------------------
// --- DRAG&DROP LOGIC ---
// --------------------------------------------------------------------------------------------------

export function applyDragDropLogic(cy: cytoscape.Core,
    options?: {
        dropSnapThreshold?: number;
        eligibleParentSelector?: string;
        eligibleChildSelector?: string;
    },
    notifyNodeMoved?: (node: NodeSingular, parent: NodeSingular) => void,
    notifyNodeSnapOut?: (node: NodeSingular) => void) {

    const DROP_SNAP_THRESHOLD = options?.dropSnapThreshold ?? 20;

    cy.on('grabon', options?.eligibleChildSelector || 'node:child', function (event) {
        if (cy.$('node:selected').length > 1) return;

        const node = event.target;
        const oldParentId = node.parent().id();

        // Optional: Save the old parent ID and position in case you want to snap it back later
        node.scratch('oldParent', oldParentId);
        node.scratch('oldPositionX', node.position().x);
        node.scratch('oldPositionY', node.position().y);

        // Pop the child out by setting its parent to null
        node.move({ parent: null });
    });

    cy.on('freeon', function (event) {
        if (cy.$('node:selected').length > 1) return;

        const node = event.target;
        const oldParentId = node.scratch('oldParent');
        const oldPositionX = node.scratch('oldPositionX');
        const oldPositionY = node.scratch('oldPositionY');

        // Check if the node is close to any potential parent
        const potentialParents = cy.nodes(options?.eligibleParentSelector || 'node');
        let bestParent: NodeSingular | null = null;

        potentialParents.forEach(parent => {
            // Skip self
            if (parent.id() === node.id()) return;
            // Skip if parent is a descendant of the node
            if (node.descendants().contains(parent)) return;

            // Read parent bounding box
            const parentBoundingBox = parent.boundingBox();

            // Define a threshold distance for snapping (you can tune this value)
            const snapThreshold = DROP_SNAP_THRESHOLD;

            // Check if our node's position is within the bounding box extended by snap threshold
            const insideBySnap = node.position().x >= parentBoundingBox.x1 - snapThreshold &&
                node.position().x <= parentBoundingBox.x2 + snapThreshold &&
                node.position().y >= parentBoundingBox.y1 - snapThreshold &&
                node.position().y <= parentBoundingBox.y2 + snapThreshold;

            if (insideBySnap) {
                // make it the best parent unless it's an ancestor of the current best parent
                if (bestParent && !bestParent.descendants().contains(parent)) {
                    return;
                }
                bestParent = parent;
            }
        });

        if (bestParent) {
            // Snap the child into the new parent
            node.move({ parent: bestParent.id() });
            notifyNodeMoved(node, bestParent);
        } else {
            // If node is not a class and not close enough to any parent, snap back to original position and parent
            if (!node.is(options?.eligibleParentSelector || 'node')) {
                node.position({ x: oldPositionX, y: oldPositionY });
                setTimeout(() => node.move({ parent: oldParentId }), 20);
            } else {
                // else just notify about snap out
                notifyNodeSnapOut(node);
            }
        }
        // Optional: Reset the scratch data
        node.removeScratch('oldParent');
        node.removeScratch('oldPosition');
    });

}