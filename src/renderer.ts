import cytoscape, { NodeCollection, NodeSingular } from 'cytoscape';

import { exportToOWL } from './owl-graph-logic/export-owl';
import { applyOWLCompoundLayout } from './owl-graph-logic/graph-layout';
import { applyDragDropLogic } from './graph-logic/drag-drop';
import { SaveLoad } from './basic-logic/save-load';
import { SlotManager } from './components/slot-manager';
import { OntologyMetadata } from './components/ontology-metadata';
import { DocumentationTable } from './components/documentation-table';
import { getOwlRunnerStyle } from './graph-styles/owl-runner-style';

// Initial setup for Cytoscape instance
const cy = cytoscape({
  container: document.getElementById('cy'), // container to render in

  // --------------------------------------------------------------------------------------------------
  // --- INITIAL ELEMENTS ---
  // --------------------------------------------------------------------------------------------------

  // Initial elements with compound structure
  elements: [
    { data: { id: 'class_1', label: 'Class 1' }, classes: 'class-node' },
  ],
  style: getOwlRunnerStyle(),
  layout: {
    name: 'preset'
  }
});

// --------------------------------------------------------------------------------------------------
// --- INITIALIZATION ---
// --------------------------------------------------------------------------------------------------

// Apply drag and drop logic to the graph
applyDragDropLogic(cy, {
  eligibleParentSelector: '.class-node',
  eligibleChildSelector: 'node:child'
}, () => {
  applyOWLCompoundLayout(cy); captureGraphState();
}, (node) => {
  applyOWLCompoundLayout(cy); captureGraphState();
});

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
const exportBtn = document.getElementById('export-owl-btn') as HTMLButtonElement;

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
          slotManager.refresh();
        } else if (targetId === 'view-documentation') {
          documentationTable.refresh();
        } else if (targetId === 'view-ontology') {
          ontologyMetadata.refresh();
        }
      } else {
        container.classList.remove('active');
      }
    });
  });
});

// Initial layout execution
applyOWLCompoundLayout(cy);

// --------------------------------------------------------------------------------------------------
// --- BASIC BUTTONS ---
// --------------------------------------------------------------------------------------------------

// Layout Buttons
document.getElementById('layout-btn')?.addEventListener('click', () => {
  applyOWLCompoundLayout(cy);
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

  applyOWLCompoundLayout(cy);
  captureGraphState();
});

// Clear Graph
clearBtn.addEventListener('click', () => {
  if (confirm('Are you sure you want to clear the graph?')) {
    cy.elements().remove();
    nodeCount = 0;
    cancelEdgeMode();
    updateSelectionInfo();
    applyOWLCompoundLayout(cy);
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
      applyOWLCompoundLayout(cy);
      updateHoverButtons();
      captureGraphState();
    }
  }
});

exportBtn.addEventListener('click', () => exportToOWL(cy));

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

  applyOWLCompoundLayout(cy);
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
  } else if (evt.target === cy && !edgeModeActive) {
    cy.elements().removeClass('selected');
    updateSelectionInfo();
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

// --------------------------------------------------------------------------------------------------
// --- INLINE RENAMING ---
// --------------------------------------------------------------------------------------------------

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
      applyOWLCompoundLayout(cy);
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
// --- UNDO / REDO SYSTEM ---
// --------------------------------------------------------------------------------------------------

const MAX_HISTORY = 20;
const SLOT_KEY_PREFIX = 'owlRunner_slot_';
const MAX_SLOTS = 12;

let isRestoring = false;
let undoRedo = new SaveLoad(MAX_HISTORY, JSON.stringify(cy.json()), SLOT_KEY_PREFIX, MAX_SLOTS);

function updateUndoRedoButtons() {
  undoBtn.disabled = !undoRedo.hasUndos();
  redoBtn.disabled = !undoRedo.hasRedos();
}

function captureGraphState() {
  if (isRestoring) return;
  // Save the full cytoscape JSON state as a string (includes positions, data, classes)
  const stateStr = JSON.stringify(cy.json());
  undoRedo.captureState(stateStr);
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
    cy.data('graphStyle', parsedState.data.graphStyle || 'modern');
  } else {
    cy.data('ontologyURI', '');
    cy.data('ontologyDoc', '');
    cy.data('graphStyle', 'modern');
  }

  ontologyMetadata.refresh();

  updateSelectionInfo();
  updateHoverButtons();
  isRestoring = false;
  updateUndoRedoButtons();
}

// Initial state capture
captureGraphState();

undoBtn.addEventListener('click', () => {
  const prevState = undoRedo.undo();
  if (prevState) {
    restoreState(prevState);
  }
});

redoBtn.addEventListener('click', () => {
  const nextState = undoRedo.redo();
  if (nextState) {
    restoreState(nextState);
  }
});


// --------------------------------------------------------------------------------------------------
// --- SAVE / LOAD SYSTEM ---
// --------------------------------------------------------------------------------------------------

// Update slot select UI combo box
function updateSlotSelectUI() {
  for (let i = 1; i <= MAX_SLOTS; i++) {
    const option = slotSelect.querySelector(`option[value="${i}"]`) as HTMLOptionElement;
    if (option) {
      if (undoRedo.isSlotOccupied(i)) {
        option.textContent = `Slot ${i} (Saved)`;
      } else {
        option.textContent = `Slot ${i} (Empty)`;
      }
    }
  }
  updateLoadButtonState();
}

// Update load button state
function updateLoadButtonState() {
  const selectedSlot = parseInt(slotSelect.value);
  loadBtn.disabled = !undoRedo.isSlotOccupied(selectedSlot);
}

// Slot select change event handler
slotSelect.addEventListener('change', updateLoadButtonState);

// Save button event handler
saveBtn.addEventListener('click', () => {
  // Prepare the state to save
  const selectedSlot = parseInt(slotSelect.value);

  // Check if our undo stack contains the same state as the last saved state (small change?)
  if (!undoRedo.isSmallChange(selectedSlot)) {
    // Not a small change - display a confirm dialog to overwrite the slot
    if (!confirm("This slot contains a different graph. Do you want to overwrite it?")) {
      return
    }
  }

  // Save the state to the slot
  undoRedo.saveState(selectedSlot, { nodeCount });
  updateSlotSelectUI();
});

// Load button event handler
loadBtn.addEventListener('click', () => {
  // Check if the current state is saved in any slot
  if (!undoRedo.isCurrentStateSaved()) {
    if (!confirm("The graph contains unsaved changes. Do you want to continue?")) {
      return;
    }
  }

  try {
    let metadata = { nodeCount: 0 };
    if (undoRedo.loadState(parseInt(slotSelect.value), metadata)) {
      nodeCount = typeof metadata.nodeCount === 'number' ? metadata.nodeCount : 0;
      restoreState(undoRedo.getState()!);
      applyOWLCompoundLayout(cy);
    }
  } catch (e) {
    console.error("Failed to load graph state", e);
    alert("Failed to load saved graph from this slot.");
  }
});

var isClosing = false;

// On app exit (window close) check if graph saved
window.addEventListener('beforeunload', (event) => {
  if (undoRedo.hasUndos() && !isClosing) {
    if (!undoRedo.isCurrentStateSaved()) {
      event.preventDefault();
      window.setTimeout(() => {
        if (confirm("The graph contains unsaved changes. Do you want to continue?")) {
          isClosing = true;
          window.close();
        }
      }, 50);
    }
  }
});

// Initialize the dropdown labels based on existing local storage data
updateSlotSelectUI();

// --------------------------------------------------------------------------------------------------
// --- COMPONENTS: SLOT MANAGER ---
// --------------------------------------------------------------------------------------------------

// Slot manager
const slotManager = new SlotManager(undoRedo, updateSlotSelectUI);
slotManager.init();

// Ontology metadata
const ontologyMetadata = new OntologyMetadata(cy, captureGraphState);
ontologyMetadata.init();

// Documentation table
const documentationTable = new DocumentationTable(cy, captureGraphState);
documentationTable.init();

// --------------------------------------------------------------------------------------------------

// --------------------------------------------------------------------------------------------------
// --- MCP API INTEGRATION ---
// --------------------------------------------------------------------------------------------------

declare global {
  interface Window {
    mcpAPI?: {
      onCommand: (callback: (data: any) => void) => void;
      sendResponse: (data: any) => void;
    };
  }
}

if (window.mcpAPI) {
  window.mcpAPI.onCommand(async (message: any) => {
    const { commandId, command, args } = message;
    try {
      let result: any = null;
      switch (command) {
        case 'get_state':
          const cleanJSON: any = { classes: [] };
          const classNodes = cy.nodes('.class-node');
          classNodes.forEach(cls => {
            // Only process root classes (avoid duplicating subclasses at the root level)
            if (cls.isChild()) return;
            
            const classObj: any = {
              id: cls.id(),
              label: cls.data('label') || '',
              subclasses: [],
              objectAttributes: [],
              datatypeAttributes: [],
              collectiveAttributes: []
            };

            // Map all nested properties and subclasses
            cls.children().forEach(child => {
              if (child.hasClass('class-node')) {
                classObj.subclasses.push({ id: child.id(), label: child.data('label') || '' });
              } else if (child.hasClass('attr-obj')) {
                const targetEdges = cy.edges(`[source = "${child.id()}"]`);
                const targetIds = targetEdges.map(e => e.target().id());
                classObj.objectAttributes.push({ 
                  id: child.id(), 
                  label: child.data('label') || '', 
                  targetClassIds: targetIds 
                });
              } else if (child.hasClass('attr-col')) {
                const targetEdges = cy.edges(`[source = "${child.id()}"]`);
                const targetIds = targetEdges.map(e => e.target().id());
                classObj.collectiveAttributes.push({ 
                  id: child.id(), 
                  label: child.data('label') || '', 
                  targetClassIds: targetIds 
                });
              } else if (child.hasClass('attr-str')) {
                classObj.datatypeAttributes.push({ 
                  id: child.id(), 
                  label: child.data('label') || '' 
                });
              }
            });
            cleanJSON.classes.push(classObj);
          });
          result = cleanJSON;
          break;
        case 'add_class':
          nodeCount++;
          const newClassId = `class_${nodeCount}`;
          cy.add({
            group: 'nodes',
            data: { id: newClassId, label: args.label || `New Class ${nodeCount}` },
            classes: 'class-node'
          });
          applyOWLCompoundLayout(cy);
          captureGraphState();
          result = { id: newClassId };
          break;
        case 'add_subclass':
          nodeCount++;
          const newSubId = `sub_${nodeCount}`;
          cy.add({
            group: 'nodes',
            data: { id: newSubId, label: args.label || `New Subclass`, parent: args.parentId },
            classes: 'class-node'
          });
          applyOWLCompoundLayout(cy);
          captureGraphState();
          if (activeHoverNodeId === args.parentId) updateHoverButtons();
          result = { id: newSubId };
          break;
        case 'add_object_attribute':
        case 'add_datatype_attribute':
        case 'add_collective_attribute':
          const typeMap = {
            'add_object_attribute': { prefix: 'obj_', cls: 'attr-obj' },
            'add_datatype_attribute': { prefix: 'str_', cls: 'attr-str' },
            'add_collective_attribute': { prefix: 'col_', cls: 'attr-col' },
          };
          const t = typeMap[command as keyof typeof typeMap];
          nodeCount++;
          const newAttrId = `${t.prefix}${nodeCount}`;
          cy.add({
            group: 'nodes',
            data: { id: newAttrId, label: args.label || 'Attribute', parent: args.parentId },
            classes: t.cls
          });
          applyOWLCompoundLayout(cy);
          captureGraphState();
          if (activeHoverNodeId === args.parentId) updateHoverButtons();
          result = { id: newAttrId };
          break;
        case 'set_attribute_type':
          const edgeId = `e_${args.attributeId}_${args.classId}_${Date.now()}`;
          cy.add({
            group: 'edges',
            data: {
              id: edgeId,
              source: args.attributeId,
              target: args.classId
            }
          });
          applyOWLCompoundLayout(cy);
          captureGraphState();
          result = { id: edgeId };
          break;
        case 'delete_element':
          const elToDel = cy.getElementById(args.elementId);
          if (elToDel && !elToDel.empty()) {
            elToDel.remove();
            applyOWLCompoundLayout(cy);
            captureGraphState();
            result = { success: true };
          } else {
            throw new Error(`Element ${args.elementId} not found`);
          }
          break;
        case 'undo':
          if (undoBtn.disabled) throw new Error("Nothing to undo");
          undoBtn.click();
          result = { success: true };
          break;
        case 'redo':
          if (redoBtn.disabled) throw new Error("Nothing to redo");
          redoBtn.click();
          result = { success: true };
          break;
        default:
          throw new Error('Unknown command: ' + command);
      }
      
      window.mcpAPI.sendResponse({ commandId, success: true, result });
    } catch (e: any) {
      window.mcpAPI.sendResponse({ commandId, success: false, error: e.message });
    }
  });
}
