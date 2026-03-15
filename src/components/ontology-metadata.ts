// --------------------------------------------------------------------------------------------------
// --- ONTOLOGY METADATA MODE ---
// --------------------------------------------------------------------------------------------------

// Export class for ontology metadata
export class OntologyMetadata {
    private cy: cytoscape.Core;
    private metadataUpdateCallback: () => void;

    // Constructor for ontology metadata tab
    constructor(cy: cytoscape.Core, metadataUpdateCallback: () => void) {
        this.cy = cy;
        this.metadataUpdateCallback = metadataUpdateCallback;
    }

    // Render ontology metadata tab
    private renderOntologyMetadata() {
        const uriInput = document.getElementById('ontology-uri-input') as HTMLInputElement;
        const docInput = document.getElementById('ontology-doc-input') as HTMLTextAreaElement;
        if (!uriInput || !docInput) return;

        uriInput.value = (this.cy.data('ontologyURI') as string) || 'http://example.org/ontology#';
        docInput.value = (this.cy.data('ontologyDoc') as string) || '';
    }

    // Initialize event listeners for ontology metadata inputs
    public init() {
        document.getElementById('ontology-uri-input')?.addEventListener('change', (e) => {
            this.cy.data('ontologyURI', (e.target as HTMLInputElement).value);
            this.metadataUpdateCallback();
        });

        document.getElementById('ontology-doc-input')?.addEventListener('change', (e) => {
            this.cy.data('ontologyDoc', (e.target as HTMLTextAreaElement).value);
            this.metadataUpdateCallback();
        });
    }

    // Refresh ontology metadata tab
    public refresh() {
        this.renderOntologyMetadata();
    }
}