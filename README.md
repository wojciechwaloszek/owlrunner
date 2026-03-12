# OWL Runner

OWL Runner is a rapid prototyping and visual scaffolding tool for creating OWL (Web Ontology Language) ontologies. 

It is designed for speed and convenience, allowing users to intuitively draft the skeleton of their ontologies and quickly document classes and attributes before exporting to a standard RDF/XML format. While it does not cover the complete OWL specification (such as complex axioms or detailed disjointness rules), it is perfectly suited for brainstorming, initial knowledge engineering, and fast architectural layout.

## Visual Notation

OWL Runner employs a unique, highly structured "compound graph" notation that keeps your diagrams tight, organized, and deeply semantic without relying on messy node-and-edge spaghetti graphs.

Elements are organized around a **core class rectangle**:
* **Classes:** The main rectangular bounded nodes. The label is positioned at the top-center.
* **Subclasses:** Nested directly within the center of their parent class rectangle, surrounded by dashed borders, visually indicating inheritance.
* **Functional Object Attributes (Single Links):** Snapped to the **Left Edge** (West) of the class node, colored blue. These represent properties that link exactly one instance to another object.
* **Datatype Attributes (Strings/Integers):** Snapped to the **Right Edge** (East) of the class node, colored green. These represent literal data values like names or ages.
* **Collective Object Attributes (Lists/Sets):** Snapped to the **Bottom Edge** (South) of the class node, colored purple. These represent properties that can link to multiple objects.

Connections between classes are made by drawing edges from an attribute node on the perimeter to a target class.

## How to Interact (The Editor)

The main Editor canvas is designed to feel fluid and stay out of your way until you need it.

* **Adding Elements:** Hover your mouse over any class node. A dynamic set of `+` buttons will smoothly appear on the boundaries:
  * Click the `+` on the left to add an Object Attribute.
  * Click the `+` on the right to add a Datatype Attribute.
  * Click the `+` on the bottom to add a Collective Attribute.
  * Click the `+` middle button floating under the label to nest a new class inside the current one.
* **Renaming:** Double-click on any node (class or attribute) to open an inline text editor. Type your new name and hit Enter or click away to save.
* **Linking:** Click the `↙` while hovering over an attribute node. Drag your mouse to a target class node to establish a property relationship (Range).
* **Moving:** Drag and drop classes to rearrange the graph. Notice how child elements move organically with their parent. Click "Apply Layout" on the sidebar at any time to instantly tidy up the nested elements.
* **Deleting:** Select any node or edge by single-clicking it, then press the `Delete` key on your keyboard.
* **Undo/Redo:** Standard `Ctrl+Z` and `Ctrl+Y` shortcuts are fully supported.

## View Modes

Use the right vertical navigation bar to quickly switch between the different utility modes in the application.

1. **Editor**
   - The primary interactive canvas where you draw and manipulate the ontology framework.
2. **Documentation**
   - A structured, auto-updating table view of every element in your graph.
   - Designed for seamlessly rapidly writing `rdfs:comment` data for your classes and attributes. This data is baked directly into the final exported OWL file.
3. **Ontology**
   - A dedicated screen for managing the root, global metadata of the entire ontology itself.
   - Configure the base Ontology URI and write the comprehensive multi-paragraph overarching description.
4. **Slot Manager**
   - A robust local save mechanism. Save your graph into 12 separate local browser memory slots to easily jump between iterations.
   - Includes functionality to Export a `.json` snapshot of a slot to your hard drive, and Import it back later to share your workspace across machines.
5. **About**
   - Application usage and open source licensing information.

## Author and License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

Created by [Wojciech Waloszek](https://github.com/wojciechwaloszek). 

Uses Electron (MIT License), Cytoscape.js (MIT License), and Web technologies.
