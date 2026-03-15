
// --------------------------------------------------------------------------------------------------
// --- DOCUMENTATION TABLE ---
// --------------------------------------------------------------------------------------------------

// Export class for documentation table
export class DocumentationTable {
    private cy: cytoscape.Core;
    private documentationUpdateCallback: () => void;

    // Constructor for documentation table
    constructor(cy: cytoscape.Core, documentationUpdateCallback: () => void) {
        this.cy = cy;
        this.documentationUpdateCallback = documentationUpdateCallback;
    }

    // Render documentation table
    public renderDocumentationTable() {
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
            const children = this.cy.nodes().filter(n => n.data('parent') === classId);

            // Sort order: string attr -> object attr -> collective attr -> subclasses
            children.filter('.attr-str').forEach(child => renderRow(child, depth + 1));
            children.filter('.attr-obj').forEach(child => renderRow(child, depth + 1));
            children.filter('.attr-col').forEach(child => renderRow(child, depth + 1));
            children.filter('.class-node').forEach(child => renderClassHierarchy(child, depth + 1));
        };

        // Find root classes (no parent) and render them recursively
        const rootClasses = this.cy.nodes('.class-node').filter(n => !n.data('parent'));

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
                    const node = this.cy.getElementById(nodeId);
                    if (node.nonempty()) {
                        node.data('comment', newComment);
                        this.documentationUpdateCallback();
                    }
                }
            });
        });
    }

    // Refresh documentation table
    public refresh() {
        this.renderDocumentationTable();
    }

    // Initialize documentation table
    public init() {
        //this.renderDocumentationTable();
    }
}
