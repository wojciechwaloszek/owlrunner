import { SaveLoad } from "src/basic-logic/save-load";

// --------------------------------------------------------------------------------------------------
// --- SLOT MANAGER ---
// --------------------------------------------------------------------------------------------------

// Export class for slot manager
export class SlotManager {
    private undoRedo: SaveLoad;
    private slotsChangedCallback: () => void;

    // Constructor for slot manager
    constructor(undoRedo: SaveLoad, slotsChangedCallback: () => void) {
        this.undoRedo = undoRedo;
        this.slotsChangedCallback = slotsChangedCallback;
    }

    // Helper function to get slot size in human readable format
    private getSlotSize(slotIndex: number): string {
        const byteSize = this.undoRedo.getSlotSize(slotIndex);
        if (byteSize === 0) return 'Empty';
        if (byteSize < 1024) return byteSize + ' Bytes';
        return (byteSize / 1024).toFixed(2) + ' KB';
    }

    // Helper function to format date
    private formatDate(timestamp?: string): string {
        if (!timestamp) return 'Unknown Date';
        const date = new Date(timestamp);
        return date.toLocaleString();
    }

    // Helper function to get slot node count
    private getSlotNodeCount(slotIndex: number) {
        let metadata = { nodeCount: 0 };
        this.undoRedo.getSlotMetadata(slotIndex, metadata);
        return metadata.nodeCount;
    }

    // Slot manager render function
    private renderSlotManager() {
        const grid = document.getElementById('slot-grid');
        if (!grid) return;

        grid.innerHTML = ''; // Clear existing

        for (let i = 1; i <= this.undoRedo.getSlotCount(); i++) {
            const isSaved = this.undoRedo.isSlotOccupied(i);

            let infoHtml = '';
            let actionsHtml = '';

            if (isSaved) {
                try {
                    const nodeCount = this.getSlotNodeCount(i);
                    const sizeStr = this.getSlotSize(i);
                    infoHtml = `<p>Nodes: ${nodeCount}</p><p>Size: ${sizeStr}</p>`;

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

    // Initialize slot manager
    public init() {
        // Global functions attached to window so the inline onclick handlers work

        // Slot delete function
        (window as any).deleteSlot = (slotIndex: number) => {
            if (confirm(`Are you sure you want to delete Slot ${slotIndex}?`)) {
                this.undoRedo.clearSlot(slotIndex);
                this.renderSlotManager();
                this.slotsChangedCallback(); // Keep editor dropdown in sync
            }
        };

        // Slot export function
        (window as any).exportSlot = (slotIndex: number) => {
            const blob = this.undoRedo.exportSlotToBlob(slotIndex);
            if (blob) {
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `owlrunner_slot_${slotIndex}_save.json`;
                a.click();
                URL.revokeObjectURL(url);
            }
        };

        let activeImportSlot = -1;
        const importInput = document.getElementById('import-json-input') as HTMLInputElement;

        // trigger hidden input box for files
        (window as any).triggerImport = (slotIndex: number) => {
            activeImportSlot = slotIndex;
            importInput.click();
        };

        // hidden input box for files
        importInput.addEventListener('change', (e) => {
            const target = e.target as HTMLInputElement;
            if (!target.files || target.files.length === 0) return;

            const file = target.files[0];
            const reader = new FileReader();

            reader.onload = (event) => {
                try {
                    const content = event.target?.result as string;

                    this.undoRedo.importSlotFromString(activeImportSlot, content);

                    alert(`Successfully imported into Slot ${activeImportSlot}`);
                    this.renderSlotManager();
                    this.slotsChangedCallback();

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

    // Refresh slot manager
    public refresh() {
        this.renderSlotManager();
    }
}

