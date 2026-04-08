// --------------------------------------------------------------------------------------------------
// --- ONTOLOGY METADATA MODE ---
// --------------------------------------------------------------------------------------------------

import { getOwlRunnerStyle } from '../graph-styles/owl-runner-style';

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
        const styleSelect = document.getElementById('graph-style-select') as HTMLSelectElement;
        
        if (uriInput && docInput) {
            uriInput.value = (this.cy.data('ontologyURI') as string) || 'http://example.org/ontology#';
            docInput.value = (this.cy.data('ontologyDoc') as string) || '';
        }
        
        if (styleSelect) {
            const currentStyle = (this.cy.data('graphStyle') as 'modern' | 'classic') || 'modern';
            styleSelect.value = currentStyle;
            this.cy.style(getOwlRunnerStyle(currentStyle));
        }
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

        document.getElementById('graph-style-select')?.addEventListener('change', (e) => {
            const styleType = (e.target as HTMLSelectElement).value as 'modern' | 'classic';
            this.cy.data('graphStyle', styleType);
            this.cy.style(getOwlRunnerStyle(styleType));
            this.metadataUpdateCallback();
        });
    }

    // Refresh ontology metadata tab
    public refresh() {
        this.renderOntologyMetadata();
    }
}