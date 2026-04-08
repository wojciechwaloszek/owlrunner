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

// gets the style for the graph
export function getOwlRunnerStyle(): cytoscape.StylesheetJson {
    return owlRunnerStyle;
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



