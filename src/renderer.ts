import cytoscape, { NodeCollection, NodeSingular } from 'cytoscape';

// Initial setup for Cytoscape instance
const cy = cytoscape({
  container: document.getElementById('cy'), // container to render in

  // --------------------------------------------------------------------------------------------------
  // --- INITIAL ELEMENTS ---
  // --------------------------------------------------------------------------------------------------

  // Initial elements with compound structure
  /* data to test something
  elements: [
    { data: { id: 'Person', label: 'Person' }, classes: 'class-node' },
    { data: { id: 'hasFriend', label: 'hasFriend', parent: 'Person' }, classes: 'attr-obj' },
    { data: { id: 'hasName', label: 'hasName', parent: 'Person' }, classes: 'attr-str' },
    { data: { id: 'age', label: 'age', parent: 'Person' }, classes: 'attr-str' },
    { data: { id: 'nicknames', label: 'nicknames', parent: 'Person' }, classes: 'attr-col' },

    // Subclass within Person
    { data: { id: 'Employee', label: 'Employee', parent: 'Person' }, classes: 'class-node' },
    { data: { id: 'worksFor', label: 'worksFor', parent: 'Employee' }, classes: 'attr-obj' },
    { data: { id: 'employeeId', label: 'employeeId', parent: 'Employee' }, classes: 'attr-str' }
  ],*/
  elements: [
    { data: { id: 'class_1', label: 'Class 1' }, classes: 'class-node' },
  ],

  // --------------------------------------------------------------------------------------------------
  // --- STYLES ---
  // --------------------------------------------------------------------------------------------------

  style: [
    // Base style for Class concepts
    {
      selector: '.class-node',
      style: {
        'shape': 'round-rectangle',
        'background-color': '#ffffff', // pure white for root classes
        'border-width': '2px',
        'border-color': '#475569',
        'label': 'data(label)',
        'text-valign': 'top',
        'text-halign': 'center',
        'text-margin-y': 15,
        'font-family': 'Inter, sans-serif',
        'font-weight': 'bold',
        'font-size': '16px',
        'color': '#0f172a',
        'padding': '5px'
      }
    },
    // Dummy anchors to force bounding box expansions
    {
      selector: '.anchor-node',
      style: {
        'width': '1px',
        'height': '1px',
        'background-opacity': 0,
        'border-width': 0,
        'events': 'no' // make unclickable
      }
    },
    // Subclasses look different (transparent and dashed)
    {
      selector: '.class-node[^parent]',
      style: {
        'background-color': 'rgba(241, 245, 249, 0.6)', // transparent slate
        'border-style': 'dashed',
        'border-color': '#64748b',
        'border-width': '2px',
      }
    },
    // General attribute port styles
    {
      selector: '.attr-obj, .attr-str, .attr-col',
      style: {
        'shape': 'round-rectangle',
        'width': 'label',
        'height': 'label',
        'padding': '10px',
        'label': 'data(label)',
        'font-size': '12px',
        'font-family': 'Inter, sans-serif',
        'font-weight': 'bold',
        'color': '#ffffff', // White text on colored pills
        'text-valign': 'center',
        'text-halign': 'center',
        'text-margin-x': 0,
        'text-margin-y': 0
      }
    },
    // Object attributes (Left edge / WEST)
    {
      selector: '.attr-obj',
      style: {
        'background-color': '#3b82f6', // blue
      }
    },
    // String/Integer attributes (Right edge / EAST)
    {
      selector: '.attr-str',
      style: {
        'background-color': '#10b981', // green
      }
    },
    // Collective attributes (Bottom edge / SOUTH)
    {
      selector: '.attr-col',
      style: {
        'background-color': '#8b5cf6', // purple
      }
    },
    {
      selector: 'edge',
      style: {
        'width': 3,
        'line-color': '#64748b', // Slate 500
        'target-arrow-color': '#64748b',
        'target-arrow-shape': 'triangle', //triangle',
        'curve-style': 'bezier',
        'opacity': 0.8
      }
    },
    {
      selector: ':selected',
      style: {
        'background-color': '#f59e0b', // Amber for selection
        'border-color': '#d97706',
        'line-color': '#f59e0b',
        'target-arrow-color': '#f59e0b',
        'border-width': '4px'
      }
    }
  ],

  layout: {
    name: 'preset'
  }
});

// --------------------------------------------------------------------------------------------------
// --- DRAG&DROP LOGIC ---
// --------------------------------------------------------------------------------------------------

const DROP_SNAP_THRESHOLD = 20;

// Listen to the 'grab' event on any child node
cy.on('grabon', 'node:child', function (event) {
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
  const node = event.target;
  const oldParentId = node.scratch('oldParent');
  const oldPositionX = node.scratch('oldPositionX');
  const oldPositionY = node.scratch('oldPositionY');

  // Check if the node is close to any potential parent
  const potentialParents = cy.nodes('.class-node');
  let bestParent: NodeSingular | null = null;

  potentialParents.forEach(parent => {
    // Skip self
    if (parent.id() === node.id()) return;

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
      if (bestParent && !bestParent.ancestors().contains(parent)) {
        return;
      }
      bestParent = parent;
    }
  });

  if (bestParent) {
    // Snap the child into the new parent
    node.move({ parent: bestParent.id() });
    applyOWLCompoundLayout();
    captureGraphState();
  } else {
    // If node is not a class and not close enough to any parent, snap back to original position and parent
    if (!node.is('.class-node')) {
      node.position({ x: oldPositionX, y: oldPositionY });
      setTimeout(() => node.move({ parent: oldParentId }), 20);
    } else {
      // else just snap out (apply layout)
      applyOWLCompoundLayout();
      captureGraphState();
    }
  }
  // Optional: Reset the scratch data
  node.removeScratch('oldParent');
  node.removeScratch('oldPosition');
});


// --------------------------------------------------------------------------------------------------
// --- INITIALIZATION ---
// --------------------------------------------------------------------------------------------------

// State Management
let edgeModeActive = false;
let sourceNodeForEdge: string | null = null;
let nodeCount = 3;

// UI Elements
const addNodeBtn = document.getElementById('add-node-btn') as HTMLButtonElement;
const clearBtn = document.getElementById('clear-btn') as HTMLButtonElement;
const undoBtn = document.getElementById('undo-btn') as HTMLButtonElement;
const redoBtn = document.getElementById('redo-btn') as HTMLButtonElement;
const selectionInfo = document.getElementById('selection-info') as HTMLParagraphElement;
const slotSelect = document.getElementById('slot-select') as HTMLSelectElement;
const saveBtn = document.getElementById('save-btn') as HTMLButtonElement;
const loadBtn = document.getElementById('load-btn') as HTMLButtonElement;

// Nav Tab switching
const navBtns = document.querySelectorAll('.nav-btn');
const viewContainers = document.querySelectorAll('.view-container');

navBtns.forEach(btn => {
  btn.addEventListener('click', (e) => {
    const targetId = (e.currentTarget as HTMLButtonElement).dataset.target;

    // Update active class on buttons
    navBtns.forEach(b => b.classList.remove('active'));
    (e.currentTarget as HTMLButtonElement).classList.add('active');

    // Update active class on views
    viewContainers.forEach(container => {
      if (container.id === targetId) {
        container.classList.add('active');
        // Render slots when switching to slot manager
        if (targetId === 'view-slots') {
          renderSlotManager();
        } else if (targetId === 'view-documentation') {
          renderDocumentationTable();
        } else if (targetId === 'view-ontology') {
          renderOntologyMetadata();
        }
      } else {
        container.classList.remove('active');
      }
    });
  });
});

// --------------------------------------------------------------------------------------------------
// --- BASIC BUTTONS ---
// --------------------------------------------------------------------------------------------------

// Layout Buttons
document.getElementById('layout-btn')?.addEventListener('click', () => {
  applyOWLCompoundLayout();
  updateHoverButtons();
  captureGraphState();
});

document.getElementById('fit-btn')?.addEventListener('click', () => {
  cy.fit(cy.elements(), 50); // fit all elements, 50px padding
  updateHoverButtons();
});

// Add Node handler
addNodeBtn.addEventListener('click', () => {
  nodeCount++;
  const newClassId = `class_${nodeCount}`;

  cy.add({
    group: 'nodes',
    data: { id: newClassId, label: `New Class ${nodeCount}` },
    classes: 'class-node'
  });

  applyOWLCompoundLayout();
  captureGraphState();
});

// Clear Graph
clearBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear the graph?')) {
    cy.elements().remove();
    nodeCount = 0;
    cancelEdgeMode();
    updateSelectionInfo();
    applyOWLCompoundLayout();
    updateHoverButtons();
    captureGraphState();
  }
});

// Delete selected elements via keyboard
document.addEventListener('keydown', (e) => {
  // Ignored if typing in an input field (like the inline rename box)
  if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
    return;
  }

  // Ctrl+Z for Undo
  if (e.key === 'z' && (e.ctrlKey || e.metaKey) && !e.shiftKey) {
    e.preventDefault();
    undoBtn.click();
    return;
  }

  // Ctrl+Y or Ctrl+Shift+Z for Redo
  if ((e.key === 'y' && (e.ctrlKey || e.metaKey)) ||
    (e.key === 'Z' && (e.ctrlKey || e.metaKey) && e.shiftKey) ||
    (e.key === 'z' && (e.ctrlKey || e.metaKey) && e.shiftKey)) {
    e.preventDefault();
    redoBtn.click();
    return;
  }

  if (e.key === 'Delete' || e.key === 'Backspace') {
    const selected = cy.$(':selected');
    if (selected.length > 0) {
      selected.remove();
      updateSelectionInfo();
      applyOWLCompoundLayout();
      updateHoverButtons();
      captureGraphState();
    }
  }
});

// --------------------------------------------------------------------------------------------------
// --- OVERLAY BUTTONS LOGIC ---
// --------------------------------------------------------------------------------------------------

const overlayContainer = document.getElementById('node-buttons-overlay') as HTMLDivElement;

function createOrUpdateOverlayButton(id: string, typeClass: string, icon: string, x: number, y: number, onClick: () => void) {
  let btn = document.getElementById(id) as HTMLButtonElement | null;
  if (!btn) {
    btn = document.createElement('button');
    btn.id = id;
    btn.className = `add-btn-overlay ${typeClass}`;
    btn.textContent = icon;
    btn.addEventListener('click', (e) => {
      e.stopPropagation(); // Prevent cytoscape from receiving the click
      onClick();
    });
    overlayContainer.appendChild(btn);
  }
  // Convert Cytoscape graph coordinates to screen pixels
  const pan = cy.pan();
  const zoom = cy.zoom();
  const screenX = x * zoom + pan.x;
  const screenY = y * zoom + pan.y;
  btn.style.left = `${screenX}px`;
  btn.style.top = `${screenY}px`;
}

function handleAddElement(parentId: string, type: string) {
  nodeCount++;
  let newClass = '';
  let idPrefix = '';
  if (type === 'obj') { newClass = 'attr-obj'; idPrefix = 'obj_'; }
  else if (type === 'str') { newClass = 'attr-str'; idPrefix = 'str_'; }
  else if (type === 'col') { newClass = 'attr-col'; idPrefix = 'col_'; }
  else if (type === 'sub') { newClass = 'class-node'; idPrefix = 'sub_'; }

  let spawnPos: { x: number, y: number } | undefined = undefined;
  const parentNode = cy.getElementById(parentId);
  if (parentNode && !parentNode.empty()) {
    const bb = parentNode.boundingBox();
    // Spawn near the bottom-right corner of the parent node
    spawnPos = { x: bb.x2, y: bb.y2 };
  }

  const newId = `${idPrefix}${nodeCount}`;
  cy.add({
    group: 'nodes',
    data: { id: newId, label: `New ${type}`, parent: parentId },
    position: spawnPos,
    classes: newClass
  });

  applyOWLCompoundLayout();
  captureGraphState();

  if (activeHoverNodeId === parentId) {
    updateHoverButtons();
  }
}

// Hover State Tracking
let activeHoverNodeId: string | null = null;
let hoverTimeout: number | undefined = undefined;

function updateHoverButtons() {
  const validIds = new Set<string>();

  // Only proceed if we have a valid active node and the zoom is high enough to comfortably interact
  if (activeHoverNodeId && cy.zoom() >= 0.57) {
    const node = cy.getElementById(activeHoverNodeId);

    if (!node.empty() && !node.removed()) {
      const id = node.id();
      const bb = node.boundingBox(); // Get explicit bounds of this node

      if (node.hasClass('class-node')) {
        // Buttons for Class Nodes
        // Object Attribute (+) on LEFT Edge (Middle)
        const objId = `btn_obj_${id}`;
        validIds.add(objId);
        createOrUpdateOverlayButton(objId, 'obj-btn', '+', bb.x1, (bb.y1 + bb.y2) / 2, () => handleAddElement(id, 'obj'));

        // String Attribute (+) on RIGHT Edge (Middle)
        const strId = `btn_str_${id}`;
        validIds.add(strId);
        createOrUpdateOverlayButton(strId, 'str-btn', '+', bb.x2, (bb.y1 + bb.y2) / 2, () => handleAddElement(id, 'str'));

        // Collective Attribute (+) on BOTTOM Edge (Center)
        const colId = `btn_col_${id}`;
        validIds.add(colId);
        createOrUpdateOverlayButton(colId, 'col-btn', '+', (bb.x1 + bb.x2) / 2, bb.y2, () => handleAddElement(id, 'col'));

        // Subclass (+) in CENTER (Bottom of the header, essentially inside the boundaries)
        const subId = `btn_sub_${id}`;
        validIds.add(subId);
        createOrUpdateOverlayButton(subId, 'sub-btn', '+', (bb.x1 + bb.x2) / 2, bb.y1 + 40, () => handleAddElement(id, 'sub'));
      } else if (node.hasClass('attr-obj') || node.hasClass('attr-col')) {
        // Buttons for Attribute Nodes to create edges
        const linkId = `btn_link_${id}`;
        validIds.add(linkId);

        // Position the link button slightly offset from the top right corner of the attribute
        createOrUpdateOverlayButton(linkId, 'link-btn', '↙', (bb.x1 + bb.x2) / 2, bb.y2, () => activateEdgeMode(id));
      }
    }
  }

  // Cleanup stale buttons (for deleted nodes, switching active nodes, or zoomed out)
  Array.from(overlayContainer.children).forEach(child => {
    // Don't remove the floating input if it's currently active!
    if (child.tagName === 'DIV' && (child as HTMLElement).style.zIndex === '1000') return;

    if (!validIds.has(child.id)) {
      child.remove();
    }
  });
}

// Initial cleanup
updateHoverButtons();

// Dynamic Hover & Movement Synchronization Hooks
cy.on('mouseover', '.class-node, .attr-obj, .attr-col', (e) => {
  if (hoverTimeout) clearTimeout(hoverTimeout);
  activeHoverNodeId = e.target.id();
  updateHoverButtons();
});

cy.on('mouseout', '.class-node, .attr-obj, .attr-col', () => {
  hoverTimeout = window.setTimeout(() => {
    activeHoverNodeId = null;
    updateHoverButtons();
  }, 150);
});

// VERY IMPORTANT: Keep buttons tracking the exact node while dragging!
cy.on('position', '.class-node, .attr-obj, .attr-col', (e) => {
  if (activeHoverNodeId === e.target.id()) {
    updateHoverButtons();
  }
});

// Re-render buttons dynamically when viewport pans or zooms
cy.on('pan zoom resize align', () => {
  if (activeHoverNodeId) {
    updateHoverButtons();
  }
});

// To keep buttons alive when the user's mouse moves OUT of the canvas node and INTO our HTML overlay buttons:
overlayContainer.addEventListener('mouseover', () => {
  if (hoverTimeout) clearTimeout(hoverTimeout);
});
overlayContainer.addEventListener('mouseleave', () => {
  hoverTimeout = window.setTimeout(() => {
    activeHoverNodeId = null;
    updateHoverButtons();
  }, 150);
});

// --------------------------------------------------------------------------------------------------
// --- EDGE MODE ---
// --------------------------------------------------------------------------------------------------

// Edge Mode functionality
function activateEdgeMode(sourceNodeId: string) {
  edgeModeActive = true;
  sourceNodeForEdge = sourceNodeId;
  document.getElementById('cy')!.style.cursor = 'crosshair';

  // Highlight source node temporarily
  cy.getElementById(sourceNodeId).style('border-color', '#ef4444');
  cy.getElementById(sourceNodeId).style('border-width', '4px');
}

function cancelEdgeMode() {
  edgeModeActive = false;
  if (sourceNodeForEdge) {
    const srcNode = cy.getElementById(sourceNodeForEdge);
    srcNode.removeStyle('border-color');
    srcNode.removeStyle('border-width');
  }
  sourceNodeForEdge = null;
  document.getElementById('cy')!.style.cursor = 'default';
}

// Graph Interaction Handlers
cy.on('tap', 'node', function (evt) {
  const node = evt.target;

  if (edgeModeActive && sourceNodeForEdge) {
    const targetNodeId = node.id();

    if (sourceNodeForEdge !== targetNodeId) {
      // Ensure edge doesn't already exist
      const existingEdge = cy.edges(`[source = "${sourceNodeForEdge}"][target = "${targetNodeId}"]`);

      // Basic validation: Only allow edges if source is an attribute and target is a class
      const srcNode = cy.getElementById(sourceNodeForEdge);
      const tgtNode = cy.getElementById(targetNodeId);

      // Allow linking Object attributes or Collective attributes to Class nodes
      const isValidSource = srcNode.hasClass('attr-obj') || srcNode.hasClass('attr-col');
      const isValidTarget = tgtNode.hasClass('class-node');

      if (existingEdge.length === 0 && isValidSource && isValidTarget) {
        cy.add({
          group: 'edges',
          data: {
            id: `e_${sourceNodeForEdge}_${targetNodeId}_${Date.now()}`, // Unique ID
            source: sourceNodeForEdge,
            target: targetNodeId
          }
        });
        captureGraphState();
      }
    }

    cancelEdgeMode();
  }
});

// Clear edge source if clicked on background while in edge mode
cy.on('tap', function (evt) {
  if (evt.target === cy && edgeModeActive && sourceNodeForEdge) {
    cancelEdgeMode();
  }
});

// Update selection info
function updateSelectionInfo() {
  const selectedNodes = cy.$('node:selected');
  const selectedEdges = cy.$('edge:selected');

  if (selectedNodes.length === 0 && selectedEdges.length === 0) {
    selectionInfo.textContent = 'No elements selected';
  } else {
    let text = '';
    if (selectedNodes.length > 0) {
      text += `${selectedNodes.length} node(s) selected.\n`;
      if (selectedNodes.length === 1) {
        text += `ID: ${selectedNodes[0].id()}, Label: ${selectedNodes[0].data('label')}\n`;
      }
    }
    if (selectedEdges.length > 0) {
      text += `${selectedEdges.length} edge(s) selected.`;
    }
    selectionInfo.textContent = text;
  }
}

cy.on('select unselect', 'node, edge', updateSelectionInfo);

// Initialize info
updateSelectionInfo();

// --- INLINE RENAMING ---
// Double click to rename nodes inline
cy.on('dblclick', 'node', (evt) => {
  const node = evt.target;
  const currentLabel = node.data('label') || '';

  // Create an absolute-positioned wrapper div to prevent erratic input positioning
  const wrapper = document.createElement('div');
  wrapper.style.position = 'absolute';
  wrapper.style.transform = 'translate(-50%, -50%)'; // Center at the exact coordinate
  wrapper.style.zIndex = '1000';

  // Create native HTML input
  const input = document.createElement('input');
  input.type = 'text';
  input.className = 'floating-input';
  input.value = currentLabel;
  input.style.position = 'relative';

  wrapper.appendChild(input);

  // Position it exactly over the canvas text using strictly bounding box math (known to be safe!)
  const bb = node.boundingBox();
  const pan = cy.pan();
  const zoom = cy.zoom();

  const centerX = (bb.x1 + bb.x2) / 2;
  const centerY = (bb.y1 + bb.y2) / 2;

  let screenX, screenY;

  if (node.hasClass('class-node')) {
    // Classes have text bound to top-center (y1 + top margin)
    screenX = centerX * zoom + pan.x;
    screenY = (bb.y1 + 15) * zoom + pan.y;
  } else {
    // Attribute pills have their text perfectly centered
    screenX = centerX * zoom + pan.x;
    screenY = centerY * zoom + pan.y;
  }

  wrapper.style.left = `${screenX}px`;
  wrapper.style.top = `${screenY}px`;

  overlayContainer.appendChild(wrapper);
  input.focus();
  input.select();

  let isSaved = false;
  const saveLabel = () => {
    if (isSaved) return;
    isSaved = true;
    const newLabel = input.value.trim();
    if (newLabel && newLabel !== currentLabel) {
      node.data('label', newLabel);
      // Recompute exact geometric bounds because label size affects spacing
      applyOWLCompoundLayout();
      if (activeHoverNodeId === node.id()) updateHoverButtons();
      captureGraphState();
    }
    wrapper.remove();
  };

  input.addEventListener('blur', saveLabel);
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveLabel();
    else if (e.key === 'Escape') {
      isSaved = true;
      wrapper.remove();
    }
  });

  // (Removed pan zoom close hook because Cytoscape inherently zooms on double-click!)
});

// --------------------------------------------------------------------------------------------------
// --- CUSTOM RECURSIVE COMPOUND LAYOUT ---
// --------------------------------------------------------------------------------------------------

function getLabelWidth(node: cytoscape.NodeSingular): number {
  const label = node.data('label') || '';
  return Math.max(120, label.length * 10);
}

function getLabelHeight(node: cytoscape.NodeSingular): number {
  return 20;
}

// places anchors around the estimated label-box so the node won't resize itself to be smaller
function anchorClass(node: cytoscape.NodeSingular) {
  const id = node.id();
  const anchorId = `anchor_${id}`;
  let anchor = cy.getElementById(anchorId);
  if (anchor.empty()) {
    cy.add({ group: 'nodes', data: { id: anchorId, parent: id }, classes: 'anchor-node' });
    anchor = cy.getElementById(anchorId);
  }
  const anchor2Id = `anchor_br_${node.id()}`;
  let anchor2 = cy.getElementById(anchor2Id);
  if (anchor2.empty()) {
    cy.add({ group: 'nodes', data: { id: anchor2Id, parent: node.id() }, classes: 'anchor-node' });
    anchor2 = cy.getElementById(anchor2Id);
  }
  /*const labelWidthEstimate = getLabelWidth(node);
  const labelHeightEstimate = getLabelHeight(node);
  anchor.relativePosition({ x: 0, y: 0 });
  anchor2.relativePosition({ x: labelWidthEstimate, y: labelHeightEstimate });*/
}

function applyOWLCompoundLayout() {
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

// Initial layout execution
applyOWLCompoundLayout();

// --------------------------------------------------------------------------------------------------
// --- UNDO / REDO SYSTEM ---
// --------------------------------------------------------------------------------------------------

const MAX_HISTORY = 20;
let undoStack: string[] = [];
let redoStack: string[] = [];
let isRestoring = false;

function updateUndoRedoButtons() {
  undoBtn.disabled = undoStack.length === 0;
  redoBtn.disabled = redoStack.length === 0;
}

function captureGraphState() {
  if (isRestoring) return;
  // Save the full cytoscape JSON state as a string (includes positions, data, classes)
  const stateStr = JSON.stringify(cy.json());
  undoStack.push(stateStr);
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }
  // Any new action clears the redo stack
  redoStack = [];
  updateUndoRedoButtons();
}

function restoreState(stateStr: string) {
  isRestoring = true;
  cy.elements().remove();

  const parsedState = JSON.parse(stateStr);
  // Re-add the elements (Cytoscape JSON payload puts them in the 'elements' key)
  if (parsedState.elements) {
    cy.startBatch();
    cy.add(parsedState.elements);
    cy.endBatch();
  }

  // Restore global Ontology Metadata
  if (parsedState.data) {
    cy.data('ontologyURI', parsedState.data.ontologyURI || '');
    cy.data('ontologyDoc', parsedState.data.ontologyDoc || '');
  } else {
    cy.data('ontologyURI', '');
    cy.data('ontologyDoc', '');
  }

  renderOntologyMetadata();

  updateSelectionInfo();
  updateHoverButtons();
  isRestoring = false;
  updateUndoRedoButtons();
}

// Initial state capture
captureGraphState();

undoBtn.addEventListener('click', () => {
  if (undoStack.length > 0) {
    // Current state needs to be saved to redo stack before we load the previous state
    //redoStack.push(JSON.stringify(cy.json()));
    redoStack.push(undoStack.pop()!);
    const prevState = undoStack.at(-1)!;
    restoreState(prevState);
  }
});

redoBtn.addEventListener('click', () => {
  if (redoStack.length > 0) {
    // Before we redo, we save the current state to the undo stack
    undoStack.push(redoStack.pop()!);
    const nextState = undoStack.at(-1)!;
    restoreState(nextState);
  }
});


// --------------------------------------------------------------------------------------------------
// --- SAVE / LOAD SYSTEM ---
// --------------------------------------------------------------------------------------------------

const SLOT_KEY_PREFIX = 'owlRunner_slot_';

function updateSlotSelectUI() {
  for (let i = 1; i <= 12; i++) {
    const key = `${SLOT_KEY_PREFIX}${i}`;
    const option = slotSelect.querySelector(`option[value="${i}"]`) as HTMLOptionElement;
    if (option) {
      if (localStorage.getItem(key)) {
        option.textContent = `Slot ${i} (Saved)`;
      } else {
        option.textContent = `Slot ${i} (Empty)`;
      }
    }
  }
  updateLoadButtonState();
}

function updateLoadButtonState() {
  const selectedSlot = slotSelect.value;
  const key = `${SLOT_KEY_PREFIX}${selectedSlot}`;
  loadBtn.disabled = !localStorage.getItem(key);
}

slotSelect.addEventListener('change', updateLoadButtonState);

saveBtn.addEventListener('click', () => {
  // Prepare the state to save
  const selectedSlot = slotSelect.value;
  const key = `${SLOT_KEY_PREFIX}${selectedSlot}`;

  const stateToSave = {
    undoStack,
    redoStack,
    nodeCount
  };

  // Check if our undo stack contains the same state as the last saved state (small change?)
  const savedDataStr = localStorage.getItem(key);
  if (savedDataStr) {
    const savedData = JSON.parse(savedDataStr);
    let savedUndoStack = savedData.undoStack || [];
    if (!undoStack.includes(savedUndoStack.at(-1))) {
      // Not a small change - display a confirm dialog to overwrite the slot
      if (!confirm("This slot contains a different graph. Do you want to overwrite it?")) {
        return
      }
    }
  }

  // Save the state to the slot
  localStorage.setItem(key, JSON.stringify(stateToSave));
  updateSlotSelectUI();
});

loadBtn.addEventListener('click', () => {
  const selectedSlot = slotSelect.value;
  const key = `${SLOT_KEY_PREFIX}${selectedSlot}`;
  const savedDataStr = localStorage.getItem(key);

  if (savedDataStr) {
    try {
      const savedData = JSON.parse(savedDataStr);
      undoStack = savedData.undoStack || [];
      redoStack = savedData.redoStack || [];
      nodeCount = typeof savedData.nodeCount === 'number' ? savedData.nodeCount : 0;

      if (undoStack.length > 0) {
        restoreState(undoStack.at(-1)!);
        applyOWLCompoundLayout();
      } else {
        cy.elements().remove();
        nodeCount = 0;
        updateSelectionInfo();
        updateHoverButtons();
      }
      updateUndoRedoButtons();
    } catch (e) {
      console.error("Failed to load graph state", e);
      alert("Failed to load saved graph from this slot.");
    }
  }
});

var isClosing = false;

// On app exit (window close) check if graph saved
window.addEventListener('beforeunload', (event) => {
  if (undoStack.length > 0 && !isClosing) {
    const selectedSlot = slotSelect.value;
    const key = `${SLOT_KEY_PREFIX}${selectedSlot}`;

    const savedDataStr = localStorage.getItem(key);
    if (savedDataStr) {
      const savedData = JSON.parse(savedDataStr);
      let savedUndoStack = savedData.undoStack || [];
      if (undoStack.at(-1) !== savedUndoStack.at(-1)) {
        event.preventDefault();
        window.setTimeout(() => {
          if (confirm("The graph contains unsaved changes. Do you want to continue?")) {
            isClosing = true;
            window.close();
          }
        }, 50);
      }
    }
  }
});

// Initialize the dropdown labels based on existing local storage data
updateSlotSelectUI();

// --------------------------------------------------------------------------------------------------
// --- SLOT MANAGER ---
// --------------------------------------------------------------------------------------------------

function getSlotSize(key: string): string {
  const item = localStorage.getItem(key);
  if (!item) return '0 KB';
  const bytes = new Blob([item]).size;
  if (bytes < 1024) return bytes + ' Bytes';
  return (bytes / 1024).toFixed(2) + ' KB';
}

function formatDate(timestamp?: string): string {
  if (!timestamp) return 'Unknown Date';
  const date = new Date(timestamp);
  return date.toLocaleString();
}

function renderSlotManager() {
  const grid = document.getElementById('slot-grid');
  if (!grid) return;

  grid.innerHTML = ''; // Clear existing

  for (let i = 1; i <= 12; i++) {
    const key = `${SLOT_KEY_PREFIX}${i}`;
    const dataStr = localStorage.getItem(key);
    const isSaved = !!dataStr;

    let infoHtml = '';
    let actionsHtml = '';

    if (isSaved) {
      try {
        const parsed = JSON.parse(dataStr);
        // Optional timestamp: We didn't save timestamp initially, but we can display a generic message or file size
        const sizeStr = getSlotSize(key);
        infoHtml = `<p>Nodes: ${parsed.nodeCount || 0}</p><p>Size: ${sizeStr}</p>`;

        actionsHtml = `
          <button class="danger-btn" onclick="deleteSlot(${i})">Delete</button>
          <button class="primary-btn" onclick="exportSlot(${i})">Export JSON</button>
        `;
      } catch (e) {
        infoHtml = `<p>Error reading slot data</p>`;
        actionsHtml = `<button class="danger-btn" onclick="deleteSlot(${i})">Delete</button>`;
      }
    } else {
      infoHtml = `<p>No data saved</p>`;
      actionsHtml = `
        <button class="secondary-btn" style="grid-column: 1 / -1;" onclick="triggerImport(${i})">Import from JSON</button>
      `;
    }

    const cardHtml = `
      <div class="slot-card">
        <div class="slot-header">
          <span class="slot-title">Slot ${i}</span>
          <span class="slot-status ${isSaved ? 'saved' : 'empty'}">${isSaved ? 'Saved' : 'Empty'}</span>
        </div>
        <div class="slot-info">
          ${infoHtml}
        </div>
        <div class="slot-actions ${isSaved ? '' : 'empty-slot'}">
          ${actionsHtml}
        </div>
      </div>
    `;

    grid.insertAdjacentHTML('beforeend', cardHtml);
  }
}

// Global functions attached to window so the inline onclick handlers work
(window as any).deleteSlot = (slotIndex: number) => {
  if (confirm(`Are you sure you want to delete Slot ${slotIndex}?`)) {
    const key = `${SLOT_KEY_PREFIX}${slotIndex}`;
    localStorage.removeItem(key);
    renderSlotManager();
    updateSlotSelectUI(); // Keep editor dropdown in sync
  }
};

(window as any).exportSlot = (slotIndex: number) => {
  const key = `${SLOT_KEY_PREFIX}${slotIndex}`;
  const dataStr = localStorage.getItem(key);
  if (!dataStr) return;

  const blob = new Blob([dataStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `owlrunner_slot_${slotIndex}_save.json`;
  a.click();
  URL.revokeObjectURL(url);
};

let activeImportSlot = -1;
const importInput = document.getElementById('import-json-input') as HTMLInputElement;

(window as any).triggerImport = (slotIndex: number) => {
  activeImportSlot = slotIndex;
  importInput.click();
};

if (importInput) {
  importInput.addEventListener('change', (e) => {
    const target = e.target as HTMLInputElement;
    if (!target.files || target.files.length === 0) return;

    const file = target.files[0];
    const reader = new FileReader();

    reader.onload = (event) => {
      try {
        const jsonContent = event.target?.result as string;
        // Basic validation that it represents a valid graph layout
        const parsed = JSON.parse(jsonContent);
        if (!parsed.undoStack) throw new Error("Missing undo stack");

        const key = `${SLOT_KEY_PREFIX}${activeImportSlot}`;
        localStorage.setItem(key, jsonContent);

        alert(`Successfully imported into Slot ${activeImportSlot}`);
        renderSlotManager();
        updateSlotSelectUI();

      } catch (err) {
        console.error("Import failed format validation", err);
        alert("Invalid file format. Please choose a valid OWLRunner JSON export.");
      }

      // Clear input so same file can be selected again later if needed
      target.value = '';
    };

    reader.readAsText(file);
  });
}

// --------------------------------------------------------------------------------------------------
// --- ONTOLOGY METADATA MODE ---
// --------------------------------------------------------------------------------------------------

function renderOntologyMetadata() {
  const uriInput = document.getElementById('ontology-uri-input') as HTMLInputElement;
  const docInput = document.getElementById('ontology-doc-input') as HTMLTextAreaElement;
  if (!uriInput || !docInput) return;

  uriInput.value = (cy.data('ontologyURI') as string) || 'http://example.org/ontology#';
  docInput.value = (cy.data('ontologyDoc') as string) || '';
}

document.getElementById('ontology-uri-input')?.addEventListener('change', (e) => {
  cy.data('ontologyURI', (e.target as HTMLInputElement).value);
  captureGraphState();
});

document.getElementById('ontology-doc-input')?.addEventListener('change', (e) => {
  cy.data('ontologyDoc', (e.target as HTMLTextAreaElement).value);
  captureGraphState();
});

// --------------------------------------------------------------------------------------------------
// --- DOCUMENTATION MODE ---
// --------------------------------------------------------------------------------------------------

function renderDocumentationTable() {
  const tbody = document.getElementById('doc-table-body');
  if (!tbody) return;

  tbody.innerHTML = '';

  const renderRow = (node: cytoscape.NodeSingular, depth: number) => {
    if (node.hasClass('anchor-node')) return;

    const id = node.id();
    const label = node.data('label') || id;
    const comment = node.data('comment') || '';

    let typeLabel = 'Unknown';
    let typeClass = '';
    if (node.hasClass('class-node')) { typeLabel = 'Class'; typeClass = 'doc-type-class'; }
    else if (node.hasClass('attr-obj')) { typeLabel = 'Object Attr'; typeClass = 'doc-type-obj'; }
    else if (node.hasClass('attr-str')) { typeLabel = 'String Attr'; typeClass = 'doc-type-str'; }
    else if (node.hasClass('attr-col')) { typeLabel = 'Collective Attr'; typeClass = 'doc-type-col'; }

    const indent = '&nbsp;&nbsp;&nbsp;&nbsp;'.repeat(depth);
    const prefix = depth > 0 ? '↳ ' : '';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="doc-col-type"><span class="doc-type-badge ${typeClass}">${typeLabel}</span></td>
      <td class="doc-col-label"><span class="doc-indent-prefix">${indent}${prefix}</span><strong>${label}</strong></td>
      <td class="doc-col-input">
        <textarea class="doc-input" data-node-id="${id}" placeholder="Add documentation...">${comment}</textarea>
      </td>
    `;
    tbody.appendChild(tr);
  };

  const renderClassHierarchy = (classNode: cytoscape.NodeSingular, depth: number) => {
    renderRow(classNode, depth);

    const classId = classNode.id();
    // Find all nodes that are children of this class
    const children = cy.nodes().filter(n => n.data('parent') === classId);

    // Sort order: string attr -> object attr -> collective attr -> subclasses
    children.filter('.attr-str').forEach(child => renderRow(child, depth + 1));
    children.filter('.attr-obj').forEach(child => renderRow(child, depth + 1));
    children.filter('.attr-col').forEach(child => renderRow(child, depth + 1));
    children.filter('.class-node').forEach(child => renderClassHierarchy(child, depth + 1));
  };

  // Find root classes (no parent) and render them recursively
  const rootClasses = cy.nodes('.class-node').filter(n => !n.data('parent'));

  rootClasses.forEach(rootClass => {
    renderClassHierarchy(rootClass, 0);
  });

  const inputs = tbody.querySelectorAll('.doc-input');
  inputs.forEach(input => {
    input.addEventListener('change', (e) => {
      const target = e.target as HTMLTextAreaElement;
      const nodeId = target.getAttribute('data-node-id');
      const newComment = target.value;

      if (nodeId) {
        const node = cy.getElementById(nodeId);
        if (node.nonempty()) {
          node.data('comment', newComment);
          captureGraphState();
        }
      }
    });
  });
}

// --------------------------------------------------------------------------------------------------
// --- OWL EXPORT SYSTEM ---
// --------------------------------------------------------------------------------------------------

function sanitizeURI(name: string): string {
  // Basic sanitization for valid OWL fragments
  return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

function escapeXML(unsafe: string): string {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case "'": return '&apos;';
      case '"': return '&quot;';
      default: return c;
    }
  });
}

function exportToOWL() {
  const baseURI = (cy.data('ontologyURI') as string) || "http://example.org/ontology#";
  const ontologyDoc = (cy.data('ontologyDoc') as string) || "";

  // Extract base URL without the hash/slash for xml:base and ontology rdf:about
  let strippedURI = baseURI;
  if (strippedURI.endsWith('#') || strippedURI.endsWith('/')) {
    strippedURI = strippedURI.slice(0, -1);
  }

  let xml = `<?xml version="1.0"?>\n`;
  xml += `<rdf:RDF xmlns="${baseURI}"\n`;
  xml += `     xml:base="${strippedURI}"\n`;
  xml += `     xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"\n`;
  xml += `     xmlns:owl="http://www.w3.org/2002/07/owl#"\n`;
  xml += `     xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"\n`;
  xml += `     xmlns:xsd="http://www.w3.org/2001/XMLSchema#">\n`;

  if (ontologyDoc) {
    xml += `    <owl:Ontology rdf:about="${strippedURI}">\n`;
    xml += `        <rdfs:comment>${escapeXML(ontologyDoc)}</rdfs:comment>\n`;
    xml += `    </owl:Ontology>\n\n`;
  } else {
    xml += `    <owl:Ontology rdf:about="${strippedURI}"/>\n\n`;
  }

  // 1. Export Classes
  cy.nodes('.class-node').forEach(node => {
    const className = sanitizeURI(node.data('label') || node.id());
    xml += `    <owl:Class rdf:about="${baseURI}${className}">\n`;

    const comment = node.data('comment');
    if (comment) {
      xml += `        <rdfs:comment>${escapeXML(comment)}</rdfs:comment>\n`;
    }

    // Check for parent (subclass)
    const parentId = node.data('parent');
    if (parentId) {
      const parentNode = cy.getElementById(parentId);
      if (parentNode.nonempty() && parentNode.hasClass('class-node')) {
        const parentName = sanitizeURI(parentNode.data('label') || parentNode.id());
        xml += `        <rdfs:subClassOf rdf:resource="${baseURI}${parentName}"/>\n`;
      }
    }
    xml += `    </owl:Class>\n\n`;
  });

  // 2. Export Properties (Attributes)
  cy.nodes('.attr-obj, .attr-str, .attr-col').forEach(node => {
    const propName = sanitizeURI(node.data('label') || node.id());
    const isObj = node.hasClass('attr-obj');
    const isCol = node.hasClass('attr-col');
    const isStr = node.hasClass('attr-str');

    const propType = (isObj || isCol) ? 'owl:ObjectProperty' : 'owl:DatatypeProperty';
    xml += `    <${propType} rdf:about="${baseURI}${propName}">\n`;

    const comment = node.data('comment');
    if (comment) {
      xml += `        <rdfs:comment>${escapeXML(comment)}</rdfs:comment>\n`;
    }

    if (isObj || isStr) {
      xml += `        <rdf:type rdf:resource="http://www.w3.org/2002/07/owl#FunctionalProperty"/>\n`;
    }

    // Domain is the parent class
    const parentId = node.data('parent');
    if (parentId) {
      const parentNode = cy.getElementById(parentId);
      if (parentNode.nonempty()) {
        const parentName = sanitizeURI(parentNode.data('label') || parentNode.id());
        xml += `        <rdfs:domain rdf:resource="${baseURI}${parentName}"/>\n`;
      }
    }

    // Range
    if (isStr) {
      xml += `        <rdfs:range rdf:resource="http://www.w3.org/2001/XMLSchema#string"/>\n`;
    } else {
      // Object properties range based on outgoing edges
      const edges = node.outgoers('edge');
      edges.forEach(edge => {
        const targetNode = edge.target();
        if (targetNode.hasClass('class-node')) {
          const targetName = sanitizeURI(targetNode.data('label') || targetNode.id());
          xml += `        <rdfs:range rdf:resource="${baseURI}${targetName}"/>\n`;
        }
      });
    }

    xml += `    </${propType}>\n\n`;
  });

  xml += `</rdf:RDF>\n`;

  // Provide to user as a download
  downloadFile('ontology.owl', xml);
}

function downloadFile(filename: string, text: string) {
  const blob = new Blob([text], { type: 'application/rdf+xml' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

document.getElementById('export-owl-btn')?.addEventListener('click', exportToOWL);
// --------------------------------------------------------------------------------------------------
