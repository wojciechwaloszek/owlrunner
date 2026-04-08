// --------------------------------------------------------------------------------------------------
// --- OWL RUNNER STYLE ---
// --------------------------------------------------------------------------------------------------

const owlRunnerStyle: cytoscape.StylesheetJson = [
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
        selector: '.class-node[parent]',
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
    // Edge style
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
    // Selected style
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
];

// --------------------------------------------------------------------------------------------------
// --- OWL RUNNER MODERN STYLE (ALTERNATIVE) ---
// --------------------------------------------------------------------------------------------------
const owlRunnerStyleModern: any[] = [
    // Base style for Class concepts - Modern Dark Metallic
    {
        selector: '.class-node',
        style: {
            'shape': 'round-rectangle',
            'background-fill': 'linear-gradient',
            'background-gradient-stop-colors': '#374151 #1e293b #0f172a',
            'background-gradient-stop-positions': '0 20 100',
            'background-gradient-direction': 'to-bottom-right',
            'border-width': '1.5px',
            'border-color': '#94a3b8', // metallic edge light reflection
            'label': 'data(label)',
            'text-valign': 'top',
            'text-halign': 'center',
            'text-margin-y': 15,
            'font-family': 'Inter, sans-serif',
            'font-weight': '600',
            'font-size': '16px',
            'color': '#f8fafc',
            'shadow-blur': 10,
            'shadow-color': '#000000',
            'shadow-opacity': 0.6,
            'shadow-offset-y': 5,
            'padding': '5px'
        }
    },
    // Dummy anchors
    {
        selector: '.anchor-node',
        style: {
            'width': '1px',
            'height': '1px',
            'background-opacity': 0,
            'border-width': 0,
            'events': 'no'
        }
    },
    // Subclasses
    {
        selector: '.class-node[parent]',
        style: {
            'background-fill': 'linear-gradient',
            'background-gradient-stop-colors': '#2a3544 #0f172a #020617',
            'background-gradient-stop-positions': '0 30 100',
            'border-style': 'solid',
            'border-color': '#475569',
            'border-width': '1px',
            'shadow-opacity': 0.3,
            'shadow-offset-y': 3,
        }
    },
    // General attribute port styles -- dark metallic pill with color hint reflection
    {
        selector: '.attr-obj, .attr-str, .attr-col',
        style: {
            'shape': 'round-rectangle',
            'width': 'label',
            'height': 'label',
            'padding': '8px',
            'label': 'data(label)',
            'font-size': '13px',
            'font-family': 'Inter, sans-serif',
            'font-weight': '500',
            'color': '#f1f5f9',
            'text-valign': 'center',
            'text-halign': 'center',
            'border-width': '1px',
            'background-fill': 'linear-gradient',
            'background-gradient-direction': 'to-bottom',
            'shadow-blur': 4,
            'shadow-color': '#000000',
            'shadow-opacity': 0.5,
            'shadow-offset-y': 2,
        }
    },
    // Object attributes (Left edge / WEST) -> Blue reflection
    {
        selector: '.attr-obj',
        style: {
            // Blue highlight on top, dark metallic below
            'background-gradient-stop-colors': '#3b82f6 #1e293b #0f172a',
            'background-gradient-stop-positions': '0 25 100',
            'border-color': '#60a5fa', // Bright blue border acting like reflection
        }
    },
    // String/Integer attributes (Right edge / EAST) -> Green reflection
    {
        selector: '.attr-str',
        style: {
            // Green highlight on top, dark metallic below
            'background-gradient-stop-colors': '#10b981 #1e293b #0f172a',
            'background-gradient-stop-positions': '0 25 100',
            'border-color': '#34d399',
        }
    },
    // Collective attributes (Bottom edge / SOUTH) -> Purple reflection
    {
        selector: '.attr-col',
        style: {
            // Purple highlight on top, dark metallic below
            'background-gradient-stop-colors': '#8b5cf6 #1e293b #0f172a',
            'background-gradient-stop-positions': '0 25 100',
            'border-color': '#a78bfa',
        }
    },
    // Edge style - sleek
    {
        selector: 'edge',
        style: {
            'width': 2,
            'line-color': '#5f82b2',
            'target-arrow-color': '#5f82b2',
            'target-arrow-shape': 'chevron', // Modern arrow
            'curve-style': 'bezier',
            'opacity': 0.9
        }
    },
    // Selected style - glowing
    {
        selector: ':selected',
        style: {
            'border-color': '#38bdf8', // Neon blue glow
            'border-width': '2px',
            'shadow-blur': 12,
            'shadow-color': '#38bdf8',
            'shadow-opacity': 0.8,
            'background-gradient-stop-colors': '#0284c7 #1e293b #0f172a', // Subtly bluish dark background
        }
    }
];

// gets the style for the graph
export function getOwlRunnerStyle(type: 'modern' | 'classic' = 'modern'): any {
    return type === 'modern' ? owlRunnerStyleModern : owlRunnerStyle;
}


// Example graph for testing
export const owlRunnerGraph: cytoscape.ElementDefinition[] = [
    { data: { id: 'Person', label: 'Person' }, classes: 'class-node' },
    { data: { id: 'hasFriend', label: 'hasFriend', parent: 'Person' }, classes: 'attr-obj' },
    { data: { id: 'hasName', label: 'hasName', parent: 'Person' }, classes: 'attr-str' },
    { data: { id: 'age', label: 'age', parent: 'Person' }, classes: 'attr-str' },
    { data: { id: 'nicknames', label: 'nicknames', parent: 'Person' }, classes: 'attr-col' },

    // Subclass within Person
    { data: { id: 'Employee', label: 'Employee', parent: 'Person' }, classes: 'class-node' },
    { data: { id: 'worksFor', label: 'worksFor', parent: 'Employee' }, classes: 'attr-obj' },
    { data: { id: 'employeeId', label: 'employeeId', parent: 'Employee' }, classes: 'attr-str' }
];

// gets the example graph for testing
export function getOwlRunnerGraph(): cytoscape.ElementDefinition[] {
    return owlRunnerGraph;
}



