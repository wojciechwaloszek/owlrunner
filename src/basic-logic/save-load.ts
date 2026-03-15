

// --------------------------------------------------------------------------------------------------
// --- SAVE / LOAD SYSTEM ---
// --------------------------------------------------------------------------------------------------

import { UndoRedo, MAX_HISTORY } from "./undo-redo";

// TODO: create SaveLoad class inheriting from UndoRedo class
// TODO: implement save and load logic for undo/redo stacks

export class SaveLoad extends UndoRedo {
    private slotPrefix: string;
    private maxSlots: number;
    private initialState: string;

    // constructor
    constructor(maxHistory: number = MAX_HISTORY, initialState: string, slotPrefix: string, maxSlots: number = 12) {
        super(maxHistory);
        this.initialState = initialState;
        this.slotPrefix = slotPrefix;
        this.maxSlots = maxSlots;
    }

    // returns the key for a given slot
    private getKeyForSlot(slotIndex: number) {
        return `${this.slotPrefix}${slotIndex}`;
    }

    // returns true if the slot is occupied
    public isSlotOccupied(slotIndex: number) {
        const key = this.getKeyForSlot(slotIndex);
        return localStorage.getItem(key) !== null;
    }

    // saves the state in the slot (whole undo and redo stacks + metadata)
    public saveState(slotIndex: number, metadata?: any) {
        const key = this.getKeyForSlot(slotIndex);
        let data = metadata || {};
        data.undoStack = this.undoStack;
        data.redoStack = this.redoStack;
        localStorage.setItem(key, JSON.stringify(data));
    }

    // loads the state from the slot (whole undo and redo stacks + metadata)
    public loadState(slotIndex: number, metadata: any): boolean {
        const key = this.getKeyForSlot(slotIndex);
        const state = JSON.parse(localStorage.getItem(key) || '{}', (key, value) => {
            if (key === 'undoStack' || key === 'redoStack') {
                return value;
            }
            metadata[key] = value;
            return value;
        });
        if (state) {
            this.undoStack = state.undoStack;
            this.redoStack = state.redoStack;
            return true;
        }
        return false;
    }

    // checks if the current state (undo stack) contains the top undo state in the slot
    public isSmallChange(slotIndex: number) {
        const key = this.getKeyForSlot(slotIndex);
        const savedDataStr = localStorage.getItem(key);
        if (savedDataStr) {
            const savedData = JSON.parse(savedDataStr);
            let savedUndoStack = savedData.undoStack || [];
            if (!this.undoStack.includes(savedUndoStack.at(-1))) {
                return false;
            }
        }
        return true;
    }

    // This function checks if the currents state is saved in ANY slot
    public isCurrentStateSaved(): boolean {
        const currentState = this.undoStack.at(-1);
        // check if current state is the initial state
        if (!currentState || currentState === this.initialState) {
            return true;
        }
        // check if current state is saved in any slot
        for (let i = 1; i <= this.maxSlots; i++) {
            const key = this.getKeyForSlot(i);
            const savedDataStr = localStorage.getItem(key);
            if (savedDataStr) {
                const savedData = JSON.parse(savedDataStr);
                let savedUndoStack = savedData.undoStack || [];
                if (currentState === savedUndoStack.at(-1)) {
                    return true;
                }
            }
        }
        return false;
    }

    // returns the number of slots
    public getSlotCount() {
        return this.maxSlots;
    }

    // get the size of data in the slot in bytes
    public getSlotSize(slotIndex: number) {
        const key = this.getKeyForSlot(slotIndex);
        const savedDataStr = localStorage.getItem(key);
        if (savedDataStr) {
            return savedDataStr.length;
        }
        return 0;
    }

    // returns the number of nodes in the slot
    public getSlotMetadata(slotIndex: number, metadata: any) {
        const key = this.getKeyForSlot(slotIndex);
        const savedDataStr = localStorage.getItem(key);
        if (savedDataStr) {
            JSON.parse(savedDataStr, (key, value) => {
                if (key === 'undoStack' || key === 'redoStack') {
                    return value;
                }
                metadata[key] = value;
                return value;
            });
            return true;
        }
        return false;
    }

    // clears the slot
    public clearSlot(slotIndex: number) {
        const key = this.getKeyForSlot(slotIndex);
        localStorage.removeItem(key);
    }

    // export slot to blob
    public exportSlotToBlob(slotIndex: number) {
        const key = this.getKeyForSlot(slotIndex);
        const savedDataStr = localStorage.getItem(key);
        if (savedDataStr) {
            return new Blob([savedDataStr], { type: 'application/json' });
        }
        return null;
    }

    // validate string: (1) if JSON.parse works, (2) if it contains undoStack and redoStack
    private validateString(dataStr: string) {
        if (typeof dataStr !== 'string') {
            throw new Error('Data must be a string');
        }
        try {
            const data = JSON.parse(dataStr);
            if (!data.undoStack || !data.redoStack) {
                throw new Error('Data must contain undoStack and redoStack');
            }
        } catch (error) {
            throw new Error('Data must be a valid JSON');
        }
    }

    // import slot from string
    public importSlotFromString(slotIndex: number, dataStr: string) {
        this.validateString(dataStr);
        const key = this.getKeyForSlot(slotIndex);
        localStorage.setItem(key, dataStr);
        return true;
    }
}


