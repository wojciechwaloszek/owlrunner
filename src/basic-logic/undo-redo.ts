// --------------------------------------------------------------------------------------------------
// --- UNDO / REDO SYSTEM ---
// --------------------------------------------------------------------------------------------------

export const MAX_HISTORY = 20;

export class UndoRedo {
    // maximum number of states to store
    protected maxHistory: number;
    // stack of states to undo
    protected undoStack: string[] = [];
    // stack of states to redo
    protected redoStack: string[] = [];

    // constructor
    constructor(maxHistory: number = MAX_HISTORY) {
        this.maxHistory = maxHistory;
    }

    // saves the state at the top of the undo stack
    public captureState(state: string) {
        this.undoStack.push(state);
        if (this.undoStack.length > this.maxHistory) {
            this.undoStack.shift();
        }
        this.redoStack = [];
    }

    // moves the state from the top of the undo stack to the top of the redo stack
    public undo(): string | undefined {
        if (this.undoStack.length > 0) {
            this.redoStack.push(this.undoStack.pop()!);
            return this.undoStack.at(-1);
        }
    }

    // moves the state from the top of the redo stack to the top of the undo stack
    public redo(): string | undefined {
        if (this.redoStack.length > 0) {
            this.undoStack.push(this.redoStack.pop()!);
            return this.undoStack.at(-1);
        }
    }

    // returns the state at the top of the undo stack
    public getState(): string | undefined {
        return this.undoStack.at(-1);
    }

    // returns true if there are states in the undo stack
    public hasUndos() {
        return this.undoStack.length > 0;
    }

    // returns true if there are states in the redo stack
    public hasRedos() {
        return this.redoStack.length > 0;
    }
}
