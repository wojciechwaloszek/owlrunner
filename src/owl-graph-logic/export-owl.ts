import cytoscape from 'cytoscape';

// --------------------------------------------------------------------------------------------------
// --- OWL EXPORT SYSTEM ---
// --------------------------------------------------------------------------------------------------

// Helper function to sanitize names for OWL
function sanitizeURI(name: string): string {
    // Basic sanitization for valid OWL fragments
    return name.replace(/[^a-zA-Z0-9_-]/g, '_');
}

// Helper function to escape XML special characters
function escapeXML(unsafe: string): string {
    return unsafe.replace(/[<>&'"]/g, (c) => {
        switch (c) {
            case '<': return '&lt;';
            case '>': return '&gt;';
            case '&': return '&amp;';
            case "'": return '&apos;';
            case '"': return '&quot;';
            default: return c;
        }
    });
}

// Export function for exporting graph to OWL format
export function exportToOWL(cy: cytoscape.Core) {
    const baseURI = (cy.data('ontologyURI') as string) || "http://example.org/ontology#";
    const ontologyDoc = (cy.data('ontologyDoc') as string) || "";

    // Extract base URL without the hash/slash for xml:base and ontology rdf:about
    let strippedURI = baseURI;
    if (strippedURI.endsWith('#') || strippedURI.endsWith('/')) {
        strippedURI = strippedURI.slice(0, -1);
    }

    let xml = `<?xml version="1.0"?>\n`;
    xml += `<rdf:RDF xmlns="${baseURI}"\n`;
    xml += `     xml:base="${strippedURI}"\n`;
    xml += `     xmlns:rdf="http://www.w3.org/1999/02/22-rdf-syntax-ns#"\n`;
    xml += `     xmlns:owl="http://www.w3.org/2002/07/owl#"\n`;
    xml += `     xmlns:rdfs="http://www.w3.org/2000/01/rdf-schema#"\n`;
    xml += `     xmlns:xsd="http://www.w3.org/2001/XMLSchema#">\n`;

    if (ontologyDoc) {
        xml += `    <owl:Ontology rdf:about="${strippedURI}">\n`;
        xml += `        <rdfs:comment>${escapeXML(ontologyDoc)}</rdfs:comment>\n`;
        xml += `    </owl:Ontology>\n\n`;
    } else {
        xml += `    <owl:Ontology rdf:about="${strippedURI}"/>\n\n`;
    }

    // 1. Export Classes
    cy.nodes('.class-node').forEach(node => {
        const className = sanitizeURI(node.data('label') || node.id());
        xml += `    <owl:Class rdf:about="${baseURI}${className}">\n`;

        const comment = node.data('comment');
        if (comment) {
            xml += `        <rdfs:comment>${escapeXML(comment)}</rdfs:comment>\n`;
        }

        // Check for parent (subclass)
        const parentId = node.data('parent');
        if (parentId) {
            const parentNode = cy.getElementById(parentId);
            if (parentNode.nonempty() && parentNode.hasClass('class-node')) {
                const parentName = sanitizeURI(parentNode.data('label') || parentNode.id());
                xml += `        <rdfs:subClassOf rdf:resource="${baseURI}${parentName}"/>\n`;
            }
        }
        xml += `    </owl:Class>\n\n`;
    });

    // 2. Export Properties (Attributes)
    cy.nodes('.attr-obj, .attr-str, .attr-col').forEach(node => {
        const propName = sanitizeURI(node.data('label') || node.id());
        const isObj = node.hasClass('attr-obj');
        const isCol = node.hasClass('attr-col');
        const isStr = node.hasClass('attr-str');

        const propType = (isObj || isCol) ? 'owl:ObjectProperty' : 'owl:DatatypeProperty';
        xml += `    <${propType} rdf:about="${baseURI}${propName}">\n`;

        const comment = node.data('comment');
        if (comment) {
            xml += `        <rdfs:comment>${escapeXML(comment)}</rdfs:comment>\n`;
        }

        if (isObj || isStr) {
            xml += `        <rdf:type rdf:resource="http://www.w3.org/2002/07/owl#FunctionalProperty"/>\n`;
        }

        // Domain is the parent class
        const parentId = node.data('parent');
        if (parentId) {
            const parentNode = cy.getElementById(parentId);
            if (parentNode.nonempty()) {
                const parentName = sanitizeURI(parentNode.data('label') || parentNode.id());
                xml += `        <rdfs:domain rdf:resource="${baseURI}${parentName}"/>\n`;
            }
        }

        // Range
        if (isStr) {
            xml += `        <rdfs:range rdf:resource="http://www.w3.org/2001/XMLSchema#string"/>\n`;
        } else {
            // Object properties range based on outgoing edges
            const edges = node.outgoers('edge');
            edges.forEach(edge => {
                const targetNode = edge.target();
                if (targetNode.hasClass('class-node')) {
                    const targetName = sanitizeURI(targetNode.data('label') || targetNode.id());
                    xml += `        <rdfs:range rdf:resource="${baseURI}${targetName}"/>\n`;
                }
            });
        }

        xml += `    </${propType}>\n\n`;
    });

    xml += `</rdf:RDF>\n`;

    // Provide to user as a download
    downloadFile('ontology.owl', xml);
}

function downloadFile(filename: string, text: string) {
    const blob = new Blob([text], { type: 'application/rdf+xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}