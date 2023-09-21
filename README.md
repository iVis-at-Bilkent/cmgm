# cmgm
CMGM is a unified complexity management model for compound graphs.

## Description

Visualizing data as graphs facilitates the analysis of valuable information and the extraction of important patterns that are useful for the user. As the amount of the data increases, however, it becomes harder to manage corresponding graphs and focus on the desired parts. Several methods developed so far to manage the complexity of the large graphs work independently and hence may cause inconsistencies and falsy behaviors when they are applied in a certain order. In addition, applying these methods may cause drastic changes on the layout of the graph that will confuse the user breaking their mental map.

CMGM aims to provide a complexity management model for effective analysis of big relational data represented as graphs by unifying various complexity management techniques to work seamlessly. The supported techniques include filter/unfilter, hide/show and collapse/expand nodes/edges.

CMGM is designed to be rendering layer independent to allow use with varying graph rendering libraries. A graph on the renderer’s side is represented with two compound graphs in CMGM. One of these graphs called the *visible graph* is for the currently visible graph elements and the other one called the *main graph* is for all, including the invisible elements that are removed temporarily due to complexity management operations. CMGM can be used with a rendering library via an extension:

Rendering Library <--> Rendering Library Extension <--> CMGM

Please see the [cytoscape.js-complexity-management](https://github.com/iVis-at-Bilkent/cytoscape.js-complexity-management) extension for a sample use of CMGM with graph rendering library [Cytoscape.js](https://js.cytoscape.org/).

## API

`let compMngr = new ComplexityManager();`
Create a ComplexityManager object.

`compMngr.addNode(nodeID, parentID)`
 Add a node with nodeID to both visible and main graph. If parentID is given, the node is added as a child node of the corresponding parent node.

`compMngr.addEdge(edgeID, sourceID, targetID)`
Add an edge with edgeID between corresponding source and target nodes given with sourceID and targetID in both visible and main graphs.

`compMngr.removeNode(nodeID)`
Remove node with the given nodeID from both visible and main graphs.

`compMngr.removeEdge(edgeID)`
Remove edge with the given edgeID from both visible and main graphs.

`compMngr.reconnect(edgeID, newSourceID, newTargetID)`
Reconnect edge with the given edgeID to its new source and/or target node in both visible and main graphs.

`compMngr.changeParent(nodeID, newParentID)`
Change parent of a node with the given nodeID to its new parent with newParentID.

`compMngr.filter(nodeIDList, edgeIDList)`
Filter given nodes and edges with the IDs in the nodeIDList and edgeIDList arrays.

`compMngr.unfilter(nodeIDList, edgeIDList)`
Unfilter given nodes and edges with the IDs in the nodeIDList and edgeIDList arrays.

`compMngr.hide(nodeIDList, edgeIDList)`
Hide given nodes and edges with the IDs in the nodeIDList and edgeIDList arrays

`compMngr.show(nodeIDList, edgeIDList)`
Show given nodes and edges with the IDs in the nodeIDList and edgeIDList arrays.

`compMngr.showAll()`
Show all hidden elements if they are not filtered and their ancestors are not collapsed.

`compMngr.collapseNodes(nodeIDList, isRecursive)`
Collapse given nodes in the visible graph with the IDs in the nodeIDList array. If the isRecursive option is true, it collapses all collapsable child nodes as well in a bottom-up manner.

`compMngr.expandNodes(nodeIDList, isRecursive)`
Expand given nodes in the visible graph with the IDs in the nodeIDList array. If the isRecursive option is true, it expands all expandable child nodes as well in a top-down manner.

`compMngr.collapseAllNodes()`
Collapse all nodes in the visible graph recursively.

`compMngr.expandAllNodes()`
Expand all nodes in the visible graph recursively.

`compMngr.collapseEdges(edgeIDList)`
Collapse given edges in the visible graph with the IDs in the edgeIDList array if all the given edges are between the same two nodes and the number of edges passed is at least 2.

`compMngr.expandEdges(edgeIDList, isRecursive)`
Expand given edges in the visible graph with the IDs in the edgeIDList array. If the isRecursive option is true, it expands all expandable edges in a top-down manner.

`compMngr.collapseEdgesBetweenNodes(nodeIDList)`
Collapse all edges between the given nodes in the visible graph with the IDs in the nodeIDList array.

`compMngr.expandEdgesBetweenNodes(nodeIDList, isRecursive)`
Expand all edges between the given nodes in the visible graph with the IDs in the nodeIDList array. If the isRecursive option is true, it expands all expandable edges in a top-down manner.

`compMngr.collapseAllEdges()`
Collapse all possible edges in the graph.

`compMngr.expandAllEdges()`
Expand all possible edges in the graph.

`compMngr.getHiddenNeighbors(nodeID)`
Get hidden neighbor elements of the node with the given nodeID.

`compMngr.isCollapsible(nodeID)`
Get whether the node with nodeID is collapsible.

`compMngr.isExpandable(nodeID)`
Get whether the node with nodeID is expandable.

## Usage instructions
Download the library:
 * via npm: `npm install cmgm`,
 * via bower: `bower install cmgm`, or
 * via direct download in the repository (probably from a tag).

Import the library as appropriate for your project:

ES import:

```js
import { ComplexityManager } from "cmgm";
let compMngr = new ComplexityManager();
```

CommonJS:
```js
let ComplexityManager = require('cmgm');
let compMngr = new ComplexityManager();
```

AMD:
```js
require(['cmgm'], function( ComplexityManager ){
let compMngr = new ComplexityManager();
});
```

Plain HTML/JS has the extension registered for you automatically, because no `require()` is needed.
## Team

  * [Osama Zafar](https://github.com/osamazafar980), [Hasan Balcı](https://github.com/hasanbalci) and [Ugur Dogrusoz](https://github.com/ugurdogrusoz) of [i-Vis at Bilkent University](http://www.cs.bilkent.edu.tr/~ivis)
