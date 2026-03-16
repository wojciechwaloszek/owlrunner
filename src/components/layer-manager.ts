import cytoscape from 'cytoscape';

// Layer interface
export interface Layer {
  id: string;
  name: string;
  color: string;
}

// Layer manager class
export class LayerManager {
  private cy: cytoscape.Core;
  private stateUpdateCallback: () => void;
  // Track which layers are currently active in the view
  private activeFilters: Set<string> = new Set();
  
  // Track context menu element
  private contextMenuEl: HTMLElement | null = null;

  // Constructor
  constructor(cy: cytoscape.Core, stateUpdateCallback: () => void) {
    this.cy = cy;
    this.stateUpdateCallback = stateUpdateCallback;
  }

  // --- Core Layer Data Management ---

  public getLayers(): Layer[] {
    const layers = this.cy.data('layers');
    return Array.isArray(layers) ? layers : [];
  }

  private setLayers(layers: Layer[]) {
    this.cy.data('layers', layers);

    // Ensure active filters exist for all layers by default
    layers.forEach(l => {
      if (!this.activeFilters.has(l.id) && !this.wasFilterManuallyDisabled(l.id)) {
        this.activeFilters.add(l.id);
      }
    });

    // remove filters for deleted layers
    const layerIds = new Set(layers.map(l => l.id));
    for (const filter of Array.from(this.activeFilters)) {
      if (!layerIds.has(filter)) {
        this.activeFilters.delete(filter);
      }
    }

    this.stateUpdateCallback();
    this.refreshUI();
  }

  // Track this locally so that reloading state doesn't wipe active filter states if possible
  private disabledFilters: Set<string> = new Set();
  private wasFilterManuallyDisabled(id: string) {
    return this.disabledFilters.has(id);
  }

  // Add layer
  public addLayer() {
    const layers = this.getLayers();
    const newId = `layer_${Date.now()}`;
    // Simple hex color generator for random pleasant colors
    const r = Math.floor(Math.random() * 156) + 100;
    const g = Math.floor(Math.random() * 156) + 100;
    const b = Math.floor(Math.random() * 156) + 100;
    const color = `#${r.toString(16)}${g.toString(16)}${b.toString(16)}`;

    layers.push({
      id: newId,
      name: `New Layer ${layers.length + 1}`,
      color: color
    });

    this.activeFilters.add(newId);
    this.setLayers(layers);
  }

  // Remove layer
  public removeLayer(id: string) {
    const layers = this.getLayers().filter(l => l.id !== id);
    this.setLayers(layers);
  }

  // Update layer name
  public updateLayerName(id: string, name: string) {
    const layers = this.getLayers();
    const layer = layers.find(l => l.id === id);
    if (layer && layer.name !== name) {
      layer.name = name;
      this.setLayers(layers);
    }
  }

  // --- Filtering Logic ---

  public toggleFilter(layerId: string) {
    if (this.activeFilters.has(layerId)) {
      this.activeFilters.delete(layerId);
      this.disabledFilters.add(layerId);
    } else {
      this.activeFilters.add(layerId);
      this.disabledFilters.delete(layerId);
    }
    this.applyFilters();
    this.refreshFilterUI();
  }

  public applyFilters() {
    this.cy.batch(() => {
      // Iterate through all class nodes first
      this.cy.nodes('.class-node').forEach(node => {
        const nodeLayers = node.data('layers') as string[];
        let visible = true;

        // If the node belongs to ANY layers, check if AT LEAST ONE of its layers is active
        if (nodeLayers && nodeLayers.length > 0) {
          visible = nodeLayers.some(layerId => this.activeFilters.has(layerId));
        }

        if (visible) {
          node.removeClass('hidden-layer');
        } else {
          node.addClass('hidden-layer');
        }
      });

      // Ensure attributes are hidden if their parent is hidden
      this.cy.nodes('.attr-obj, .attr-str, .attr-col').forEach(attr => {
        const parentId = attr.data('parent');
        if (parentId) {
          const parent = this.cy.getElementById(parentId);
          if (parent.nonempty()) {
            if (parent.hasClass('hidden-layer')) {
              attr.addClass('hidden-layer');
            } else {
              attr.removeClass('hidden-layer');
            }
          }
        }
      });
    });
  }

  // --- UI Rendering ---

  public init() {
    // Add Layer Button
    document.getElementById('add-layer-btn')?.addEventListener('click', () => {
      this.addLayer();
    });

    // Toggle Filter Bar Button
    const toggleBtn = document.getElementById('toggle-layer-filter-btn');
    const filterContent = document.getElementById('layer-filter-content');
    if (toggleBtn && filterContent) {
      toggleBtn.addEventListener('click', () => {
        const isActive = filterContent.classList.toggle('active');
        if (isActive) {
          toggleBtn.classList.remove('collapsed');
        } else {
          toggleBtn.classList.add('collapsed');
        }
      });
    }

    // Context menu on right-click / hold
    this.cy.on('cxttap', '.class-node', (e) => {
      e.stopPropagation();
      this.showContextMenu(e.target, e.renderedPosition);
    });

    // Close context menu on outside click or pan/zoom
    this.cy.on('tap pan zoom', () => {
      this.hideContextMenu();
    });
    
    document.addEventListener('click', (e) => {
      if (this.contextMenuEl && !this.contextMenuEl.contains(e.target as Node)) {
          this.hideContextMenu();
      }
    });
  }

  // --- Context Menu ---
  private showContextMenu(node: cytoscape.NodeSingular, renderedPosition: { x: number, y: number }) {
    this.hideContextMenu();

    const overlay = document.getElementById('node-buttons-overlay');
    if (!overlay) return;

    this.contextMenuEl = document.createElement('div');
    this.contextMenuEl.className = 'layer-context-menu';
    this.contextMenuEl.style.left = `${renderedPosition.x}px`;
    this.contextMenuEl.style.top = `${renderedPosition.y}px`;
    
    // Stop propagation so clicking inside doesn't close the menu
    this.contextMenuEl.addEventListener('click', (e) => {
      e.stopPropagation();
    });

    let targetNodes = this.cy.collection().merge(node);
    if (node.selected()) {
      const selectedClasses = this.cy.$(':selected').filter('.class-node');
      if (selectedClasses.length > 0) {
        targetNodes = selectedClasses;
      }
    }

    const title = document.createElement('h4');
    if (targetNodes.length > 1) {
      title.textContent = `Layers: ${targetNodes.length} classes`;
    } else {
      title.textContent = `Layers: ${node.data('label') || node.id()}`;
    }
    this.contextMenuEl.appendChild(title);

    const layers = this.getLayers();
    if (layers.length === 0) {
      const empty = document.createElement('div');
      empty.style.fontSize = '0.75rem';
      empty.style.color = 'var(--text-muted)';
      empty.textContent = 'No layers defined.';
      this.contextMenuEl.appendChild(empty);
    } else {
      const nodeLayers = (node.data('layers') as string[]) || [];
      
      layers.forEach(l => {
        const label = document.createElement('label');
        label.className = 'layer-checkbox-label';
        
        const isChecked = nodeLayers.includes(l.id) ? 'checked' : '';
        label.innerHTML = `
          <input type="checkbox" value="${l.id}" ${isChecked}>
          <span class="layer-color-badge" style="background-color: ${l.color}; width: 10px; height: 10px;"></span>
          ${l.name}
        `;
        
        label.querySelector('input')?.addEventListener('change', (e) => {
          const target = e.target as HTMLInputElement;
          const layerId = target.value;
          
          this.cy.batch(() => {
            targetNodes.forEach(n => {
              let currentLayers = (n.data('layers') as string[]) || [];
              
              if (target.checked && !currentLayers.includes(layerId)) {
                currentLayers.push(layerId);
              } else if (!target.checked && currentLayers.includes(layerId)) {
                currentLayers = currentLayers.filter(id => id !== layerId);
              }
              
              n.data('layers', currentLayers);
            });
          });

          this.stateUpdateCallback();
        });
        
        this.contextMenuEl.appendChild(label);
      });
    }

    overlay.appendChild(this.contextMenuEl);
  }

  private hideContextMenu() {
    if (this.contextMenuEl) {
      this.contextMenuEl.remove();
      this.contextMenuEl = null;
    }
  }

  // Refresh
  public refresh() {
    // Re-sync active filters
    const layers = this.getLayers();
    layers.forEach(l => {
      if (!this.activeFilters.has(l.id) && !this.wasFilterManuallyDisabled(l.id)) {
        this.activeFilters.add(l.id);
      }
    });

    this.refreshUI();
    this.applyFilters();
  }

  private refreshUI() {
    this.refreshDefsUI();
    this.refreshFilterUI();
  }

  private refreshDefsUI() {
    const container = document.getElementById('layer-defs-container');
    if (!container) return;

    container.innerHTML = '';
    const layers = this.getLayers();

    if (layers.length === 0) {
      container.innerHTML = '<p class="section-description" style="font-style: italic;">No layers defined.</p>';
      return;
    }

    layers.forEach(layer => {
      const row = document.createElement('div');
      row.className = 'layer-def-row';

      row.innerHTML = `
        <span class="layer-color-badge" style="background-color: ${layer.color}; width: 16px; height: 16px;"></span>
        <input type="text" class="doc-input layer-name-input" value="${layer.name}" data-id="${layer.id}">
        <button class="danger-btn delete-layer-btn" data-id="${layer.id}">Delete</button>
      `;
      container.appendChild(row);
    });

    // Event listeners for inputs and deletes
    container.querySelectorAll('.layer-name-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        const id = target.getAttribute('data-id');
        if (id) {
          this.updateLayerName(id, target.value);
        }
      });
    });

    container.querySelectorAll('.delete-layer-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const target = e.target as HTMLButtonElement;
        const id = target.getAttribute('data-id');
        if (id) {
          this.removeLayer(id);
        }
      });
    });
  }

  private refreshFilterUI() {
    const container = document.getElementById('layer-filter-content');
    if (!container) return;

    container.innerHTML = '';
    const layers = this.getLayers();

    if (layers.length === 0) {
      container.innerHTML = '<span style="color: var(--text-muted); font-size: 0.875rem;">No layers defined yet.</span>';
      return;
    }

    layers.forEach(layer => {
      const label = document.createElement('label');
      label.className = 'layer-toggle-label';
      label.innerHTML = `
        <input type="checkbox" class="layer-filter-checkbox" value="${layer.id}" ${this.activeFilters.has(layer.id) ? 'checked' : ''}>
        <span class="layer-color-badge" style="background-color: ${layer.color};"></span>
        ${layer.name}
      `;
      container.appendChild(label);
    });

    container.querySelectorAll('.layer-filter-checkbox').forEach(cb => {
      cb.addEventListener('change', (e) => {
        const target = e.target as HTMLInputElement;
        this.toggleFilter(target.value);
      });
    });
  }
}
