(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.cmgm = {}));
})(this, (function (exports) { 'use strict';

  /**
   * This class represents a graph manager for complexity management purposes. A graph
   * manager maintains a collection of graphs, forming a compound graph structure
   * through inclusion, and maintains its owner complexity manager, its root graph, 
   * its inter-graph edges, its sibling graph manager and the information of whether 
   * it is visible or not.
   */
  class GraphManager {
    // Complexity manager that owns this graph manager
    #owner;

    // Graphs maintained by this graph manager, including the root of the nesting hierarchy
    #graphs;

    /*
    * Inter-graph edges in this graph manager. Notice that all inter-graph
    * edges go here, not in any of the edge lists of individual graphs (either
    * source or target node's owner graph).
    */
    #edges;

    // The root of the inclusion/nesting hierarchy of this compound structure
    #rootGraph;

    /**
     * Sibling graph manager of this graph manager. If this graph manager is managing the visible 
     * graph, then siblingGraphManager manages the invisible graph or vice versa.
     */
    #siblingGraphManager;

    // Whether this graph manager manages the visible graph or not
    #isVisible;

    // NodeId to NodeObject map.
    nodesMap;
    edgesMap;
    metaEdgesMap;
    edgeToMetaEdgeMap;
    /**
     * Constructor
     * @param {ComplexityManager} owner - owner complexity manager 
     * @param {bool} isVisible - whether the graph manager manages visible graph or not
     */
    constructor(owner, isVisible) {
      this.#owner = owner;
      this.#graphs = [];
      this.#edges = [];
      this.#rootGraph = null;
      this.#siblingGraphManager = null;
      this.#isVisible = isVisible;
      this.nodesMap = new Map();
      this.edgesMap = new Map();
      this.metaEdgesMap = new Map();
      this.edgeToMetaEdgeMap = new Map();
      this.addRoot(); // Add root graph
    }

    // get methods
    get owner() {
      return this.#owner;
    }

    get graphs() {
      return this.#graphs;
    }

    get edges() {
      return this.#edges
    }

    get rootGraph() {
      return this.#rootGraph;
    }

    get siblingGraphManager() {
      return this.#siblingGraphManager;
    }

    get isVisible() {
      return this.#isVisible;
    }

    // set methods
    set owner(owner) {
      this.#owner = owner;
    }

    set graphs(graphs) {
      this.#graphs = graphs;
    }

    set edges(edges) {
      this.#edges = edges;
    }

    set rootGraph(rootGraph) {
      if (rootGraph.owner != this) {
        throw "Root not in this graph mgr!";
      }

      this.#rootGraph = rootGraph;

      // root graph must have a root node associated with it for convenience
      if (rootGraph.parent == null) {
        rootGraph.parent = this.owner.newNode("Root node");
      }
    }

    set siblingGraphManager(siblingGraphManager) {
      this.#siblingGraphManager = siblingGraphManager;
    }

    set isVisible(isVisible) {
      this.#isVisible = isVisible;
    }

    /**
     * This method adds a new graph to this graph manager and sets as the root.
     * It also creates the root node as the parent of the root graph.
     */
    addRoot() {
      let newGraph = this.#owner.newGraph(this);
      let newNode = this.#owner.newNode();
      let root = this.addGraph(newGraph, newNode);
      this.#rootGraph = root;
      return this.#rootGraph;
    }

    /**
     * This method adds the input graph into this graph manager. The new graph
     * is associated as the child graph of the input parent node. If the parent
     * node is null, then the graph is set to be the root.
     */
    addGraph(newGraph, parentNode) {
      if (newGraph == null) {
        throw "Graph is null!";
      }
      if (parentNode == null) {
        throw "Parent node is null!";
      }
      if (this.#graphs.indexOf(newGraph) > -1) {
        throw "Graph already in this graph mgr!";
      }

      this.#graphs.push(newGraph);

      if (newGraph.parent != null) {
        throw "Already has a parent!";
      }
      if (parentNode.child != null) {
        throw "Already has a child!";
      }

      newGraph.parent = parentNode;
      parentNode.child = newGraph;

      return newGraph;
    }

    /**
     * This method adds the input edge between specified nodes into this graph
     * manager. We assume both source and target nodes to be already in this
     * graph manager.
     */
    addInterGraphEdge(newEdge, sourceNode, targetNode) {
      const sourceGraph = sourceNode.owner;
      const targetGraph = targetNode.owner;

      if (!(sourceGraph != null && sourceGraph.owner == this)) {
        throw "Source not in this graph mgr!";
      }
      if (!(targetGraph != null && targetGraph.owner == this)) {
        throw "Target not in this graph mgr!";
      }

      if (sourceGraph == targetGraph) {
        newEdge.isInterGraph = false;
        return sourceGraph.addEdge(newEdge, sourceNode, targetNode);
      }
      else {
        newEdge.isInterGraph = true;

        // set source and target
        newEdge.source = sourceNode;
        newEdge.target = targetNode;

        // add edge to inter-graph edge list
        if (this.#edges.indexOf(newEdge) > -1) {
          throw "Edge already in inter-graph edge list!";
        }

        // Set owner of the edge
        newEdge.owner = this;

        this.#edges.push(newEdge);

        // add edge to source and target incidency lists
        if (!(newEdge.source != null && newEdge.target != null)) {
          throw "Edge source and/or target is null!";
        }

        if (!(newEdge.source.edges.indexOf(newEdge) == -1 && newEdge.target.edges.indexOf(newEdge) == -1)) {
          throw "Edge already in source and/or target incidency list!";
        }

        newEdge.source.edges.push(newEdge);
        newEdge.target.edges.push(newEdge);

        return newEdge;
      }
    }

    /**
     * This method removes the input graph from this graph manager. 
     */
    removeGraph(graph) {
      if (graph.owner != this) {
        throw "Graph not in this graph mgr";
      }
      if (!(graph == this.rootGraph || (graph.parent != null && graph.parent.owner.owner == this))) {
        throw "Invalid parent node!";
      }

      // first the edges (make a copy to do it safely)
      let edgesToBeRemoved = [];

      edgesToBeRemoved = edgesToBeRemoved.concat(graph.edges);

      edgesToBeRemoved.forEach(edge => {
        graph.removeEdge(edge);
      });

      // then the nodes (make a copy to do it safely)
      let nodesToBeRemoved = [];

      nodesToBeRemoved = nodesToBeRemoved.concat(graph.nodes);

      nodesToBeRemoved.forEach(node => {
        graph.removeNode(node);
      });

      // check if graph is the root
      if (graph == this.#rootGraph) {
        this.#rootGraph = null;
      }

      // now remove the graph itself
      let index = this.#graphs.indexOf(graph);
      this.#graphs.splice(index, 1);

      // also reset the parent of the graph
      graph.parent.child = null;
      graph.parent = null;
    }

    /**
     * This method removes the input inter-graph edge from this graph manager.
     */
    removeInterGraphEdge(edge) {
      if (edge == null) {
        throw "Edge is null!";
      }
      if (!edge.isInterGraph) {
        throw "Not an inter-graph edge!";
      }
      if (!(edge.source != null && edge.target != null)) {
        throw "Source and/or target is null!";
      }

      // remove edge from source and target nodes' incidency lists      

      if (!(edge.source.edges.indexOf(edge) != -1 && edge.target.edges.indexOf(edge) != -1)) {
        throw "Source and/or target doesn't know this edge!";
      }

      let index = edge.source.edges.indexOf(edge);
      edge.source.edges.splice(index, 1);
      index = edge.target.edges.indexOf(edge);
      edge.target.edges.splice(index, 1);

      // remove edge from owner graph manager's inter-graph edge list

      if (!(edge.source.owner != null && edge.source.owner.owner != null)) {
        throw "Edge owner graph or owner graph manager is null!";
      }
      if (edge.source.owner.owner.edges.indexOf(edge) == -1) {
        throw "Not in owner graph manager's edge list!";
      }

      index = edge.source.owner.owner.edges.indexOf(edge);
      edge.source.owner.owner.edges.splice(index, 1);
    }

    /**
     * This method returns all descendants of the input node together with their incident edges.
     * The output does not include the input node, but includes its incident edges
     */
    getDescendantsInorder(node) {
      let descendants = {
        edges: new Set(),
        simpleNodes: [],
        compoundNodes: []
      };
      let childGraph = node.child;
      if (childGraph) {
        let childGraphNodes = childGraph.nodes;
        childGraphNodes.forEach((childNode) => {
          let childDescendents = this.getDescendantsInorder(childNode);
          for (var id in childDescendents) {
            descendants[id] = [...descendants[id] || [], ...childDescendents[id]];
          }
          descendants['edges'] = new Set(descendants['edges']);
          if (childNode.child) {
            descendants.compoundNodes.push(childNode);
          } else {
            descendants.simpleNodes.push(childNode);
          }
          let nodeEdges = childNode.edges;
          nodeEdges.forEach(item => descendants['edges'].add(item));
        });
      }
      node.edges.forEach((edge) => {
        descendants.edges.add(edge);
      });

      return descendants;
    }
  }

  /**
   * This class represents a graph. A graph maintains
   * its owner graph manager, its nodes, its intra-graph edges,
   * its parent node and its sibling graph. A graph is always
   * a child of a compound node. The root of the compound graph
   * structure is a child of the root node, which is the only node
   * in compound structure without an owner graph.
   */
  class Graph {
    /** 
     * Parent node of the graph. This should never be null (the parent of the
     * root graph is the root node) when this graph is part of a compound
     * structure (i.e. a graph manager).
     */ 
    #parent;

    // Graph manager that owns this graph
    #owner;

    // Nodes maintained by the graph
    #nodes;

    // Edges whose source and target nodes are in this graph (intra-graph edge)
    #edges;

    /**
     * Sibling graph of this graph. If this graph is owned by the visible 
     * graph manager, then siblingGraph must be owned by the invisible
     * graph manager or vice versa.
     */
    #siblingGraph;

    /**
     * Constructor
     * @param {Node} parent - parent node of the graph
     * @param {GraphManager} owner - owner graph manager of the graph
     */
    constructor(parent, owner) {
      this.#parent = parent;
      this.#owner = owner;
      this.#nodes = [];
      this.#edges = [];
      this.#siblingGraph = null;
    }

    // get methods
    get parent() {
      return this.#parent;
    }

    get owner() {
      return this.#owner;
    }

    get nodes() {
      return this.#nodes;
    }

    get edges() {
      return this.#edges
    }

    get siblingGraph() {
      return this.#siblingGraph;
    }

    // set methods
    set parent(parent) {
      this.#parent = parent;
    }

    set owner(owner) {
      this.#owner = owner;
    }

    set nodes(nodes) {
      this.#nodes = nodes;
    }

    set edges(edges) {
      this.#edges = edges;
    }

    set siblingGraph(siblingGraph) {
      this.#siblingGraph = siblingGraph;
    }

    /**
     * This methods adds the given node to this graph. We assume 
     * this graph has a proper graph manager.
     */
    addNode(newNode) {
      if (this.#owner == null) {
        throw "Graph has no graph manager!"
      }

      if (this.#nodes.indexOf(newNode) > -1) {
        throw "Node already in graph!"
      }

      newNode.owner = this;
      this.#nodes.push(newNode);

      return newNode;
    }

    /**
     * This methods adds the given edge to this graph with 
     * specified nodes as source and target.
     */
    addEdge(newEdge, sourceNode, targetNode) {
      if (!(this.#nodes.indexOf(sourceNode) > -1 && (this.#nodes.indexOf(targetNode)) > -1)) {
        throw "Source or target not in graph!";
      }

      if (!(sourceNode.owner == targetNode.owner && sourceNode.owner == this)) {
        throw "Both owners must be this graph!";
      }

      this.#edges.forEach(e => {
        if(e.ID == newEdge.ID){
          throw "Edge Already Exist"
        }
      });

      if (sourceNode.owner != targetNode.owner)
      {
        return null;
      }

      // set source and target
      newEdge.source = sourceNode;
      newEdge.target = targetNode;

      // set as intra-graph edge
      newEdge.isInterGraph = false;

      // set the owner 
      newEdge.owner = this;

      // add to graph edge list
      this.#edges.push(newEdge);

      // add to incidency lists
      sourceNode.edges.push(newEdge);

      if (targetNode != sourceNode)
      {
        targetNode.edges.push(newEdge);
      }

      return newEdge;
    }

    /**
     * This method removes the input node from this graph. If the node has any
     * incident edges, they are removed from the graph (the graph manager for
     * inter-graph edges) as well.
     */
    removeNode(node) {
      if (node == null) {
        throw "Node is null!";
      }
      if (!(node.owner != null && node.owner == this)) {
        throw "Owner graph is invalid!";
      }
      if (this.owner == null) {
        throw "Owner graph manager is invalid!";
      }

      // remove incident edges first (make a copy to do it safely)
      // Requires further invesitgations.
      const edgesToBeRemoved = node.edges.slice();
      edgesToBeRemoved.forEach(edge => {
        if (edge.isInterGraph)
        {
          this.owner.removeInterGraphEdge(edge);
        }
        else
        {
          edge.source.owner.removeEdge(edge);
        }
      });

      // now the node itself
      const index = this.#nodes.indexOf(node);
      if (index == -1) {
        throw "Node not in owner node list!";
      }
      this.nodes.splice(index, 1);    
      return node;
    }

    /**
     * This method removes the input edge from this graph. 
     * Should not be used for inter-graph edges.
     */
    removeEdge(edge) {
      if (edge == null) {
        throw "Edge is null!";
      }
      if (!(edge.source != null && edge.target != null)) {
        throw "Source and/or target is null!";
      }
      if (!(edge.source.owner != null && edge.target.owner != null &&
              edge.source.owner == this && edge.target.owner == this)) {
        throw "Source and/or target owner is invalid!";
      }

      // remove edge from source and target nodes' incidency lists

      const sourceIndex = edge.source.edges.indexOf(edge);
      const targetIndex = edge.target.edges.indexOf(edge);

      if (!(sourceIndex > -1 && targetIndex > -1)) {
        throw "Source and/or target doesn't know this edge!";
      }

      edge.source.edges.splice(sourceIndex, 1);

      if (edge.target != edge.source)
      {
        edge.target.edges.splice(targetIndex, 1);
      }

      // remove edge from owner graph's edge list

      const index = edge.source.owner.edges.indexOf(edge);
      if (index == -1) {
        throw "Not in owner's edge list!";
      }

      edge.source.owner.edges.splice(index, 1);
      return edge;
    }
  }

  /**
   * This class represents a graph object which 
   * can be either a  node or an edge.
   */
  class GraphObject {

    // ID of the graph object; must be unique
    #ID;

    // Owner graph or graph manager of the graph object
    #owner;

    // Whether the graph object is visible or not
    #isVisible;

    // Whether the graph object is filtered or not
    #isFiltered;

    // Whether the graph object is hidden or not
    #isHidden;

    /**
     * Constuctor
     * @param {String} ID - ID of the graph object
     */
    constructor(ID) {
      this.#ID = ID;
      this.#owner = null;
      this.#isVisible = true;
      this.#isFiltered = false;
      this.#isHidden = false;
    }

    // get methods
    get ID() {
      return this.#ID;
    }

    get owner() {
      if (this.#owner == null) {
        throw "Owner graph of a node cannot be null"
      }
      return this.#owner;
    }

    get isVisible() {
      return this.#isVisible;
    }

    get isFiltered() {
      return this.#isFiltered;
    }

    get isHidden() {
      return this.#isHidden;
    }

    // set methods
    set ID(newID) {
      this.#ID = newID;
    }

    set owner(newOwner) {
      this.#owner = newOwner;
    }

    set isVisible(isVisible) {
      this.#isVisible = isVisible;
    }

    set isFiltered(isFiltered) {
      this.#isFiltered = isFiltered;
    }

    set isHidden(isHidden) {
      this.#isHidden = isHidden;
    }
  }

  /* This class defines properties specific to an edge. */

  /**
   * This class represents an edge. An edge maintains
   * its source, its target and the information of whether 
   * it is inter-graph or not together with the properties 
   * that are inherited from GraphObject class.
   */
  class Edge extends GraphObject {
    // Source node of the edge
    #source;

    // Target node of the edge
    #target;

    // Whether the edge is inter-graph
    #isInterGraph;

    /**
     * Constructor
     * @param {String} ID - ID of the edge 
     * @param {Node} source - source node of the edge 
     * @param {Node} target - target node of the edge 
     */
    constructor(ID, source, target) {
      super(ID);
      this.#source = source;
      this.#target = target;
      this.#isInterGraph = false;
    }

    // get methods
    get source() {
      return this.#source;
    }

    get target() {
      return this.#target;
    }

    get isInterGraph() {
      return this.#isInterGraph;
    }

    // set methods
    set source(source) {
      this.#source = source;
    }

    set target(target) {
      this.#target = target;
    }

    set isInterGraph(isInterGraph) {
      this.#isInterGraph = isInterGraph;
    }  
  }

  /**
   * This class represents a node. A node maintains
   * its child graph if exists, a list of its incident 
   * edges and the information of whether it is collapsed
   * or not together with the properties that are 
   * inherited from GraphObject class.
   */
  class Node extends GraphObject {
    // Child graph of the node
    #child;

    // List of edges incident with the node 
    #edges;

    // Whether the node is collapsed or not
    #isCollapsed;

    /**
     * Constuctor
     * @param {String} ID - ID of the node
     */
    constructor(ID) {
      super(ID);
      this.#child = null;
      this.#edges = [];
      this.#isCollapsed = false;
    }

    // get methods
    get child() {
      return this.#child;
    }

    get edges() {
      return this.#edges;
    }

    get isCollapsed() {
      return this.#isCollapsed;
    }

    // set methods
    set child(child) {
      this.#child = child;
    }

    set edges(edges) {
      this.#edges = edges;
    }

    set isCollapsed(isCollapsed) {
      this.#isCollapsed = isCollapsed;
    }
  }

  /**
   * This class represents a meta edge. A meta edge maintains 
   * the original edges it represents together with the properties 
   * that are inherited from Edge class.
   */
  class MetaEdge extends Edge {
    // The original edges this meta edge represents
    #originalEdges;

    /**
     * Constructor
     * @param {Stirng} ID - ID of the meta edge 
     * @param {Node} source - source node of the meta edge 
     * @param {Node} target - target node of the meta edge
     */
    constructor(source, target, originalEdges) {
      let ID = Auxiliary.createUniqueID();
      super(ID, source, target);
      this.#originalEdges = originalEdges;
    }

    // get methods
    get originalEdges() {
      return this.#originalEdges;
    }

    // set methods
    set originalEdges(originalEdges) {
      this.#originalEdges = originalEdges;
    }
  }

  class ExpandCollapse {
    // create static objects to report elements to be removed
    static removedElements = {
      nodeIDListForInvisible: new Set(),
      edgeIDListForInvisible: new Set(),
      metaEdgeIDListForVisible: new Set(),
    };
    // create static objects to report elements to be added
    static addedElements = {
      nodeIDListForVisible: new Set(),
      edgeIDListForVisible: new Set(),
      metaEdgeIDListForVisible: new Set(),
      edgeIDListToRemove: new Set(),
    };
    //Double Recursive Solution
    // collpase node function
    static #collapseNode(node, visibleGM, mainGM) {
      //first process the visible graph
      // traverse descdents and get list of nodes, edges and meta edges
      let [
        nodeIDListForInvisible,
        edgeIDListForInvisible,
        metaEdgeIDListForVisible,
      ] = this.traverseDescendants(node, node, visibleGM, mainGM);
      //  remove child graph of given node
      visibleGM.removeGraph(node.child);
      // loop through descendant nodes
      nodeIDListForInvisible.forEach((nodeID) => {
        // delete each descendant node from nodes map of visible graph.
        visibleGM.nodesMap.delete(nodeID);
      });
      // loop through descendant edges
      edgeIDListForInvisible.forEach((edgeID) => {
        // delete each descendant edge from edges map of visible graph.
        let tempEdge = visibleGM.edgesMap.get(edgeID);
        visibleGM.edgesMap.delete(edgeID);
        try {
          Auxiliary.removeEdgeFromGraph(tempEdge);
        } catch (e) {
          //console.log(e);
        }
      });
      // get corresponding node from invisible graph and set is collapsed flag true
      let nodeInInvisible = mainGM.nodesMap.get(node.ID);
      nodeInInvisible.isCollapsed = true;
      // loop through descendant nodes
      nodeIDListForInvisible.forEach((nodeIDInvisible) => {
        // get corresponding node from invisible graph and set is visible flag false
        nodeInInvisible = mainGM.nodesMap.get(nodeIDInvisible);
        nodeInInvisible.isVisible = false;
      });
      // loop through descendant edges
      edgeIDListForInvisible.forEach((edgeIDInvisible) => {
        // get corresponding edge from invisible graph and set is visible flag false
        let edgeInInvisible = mainGM.edgesMap.get(edgeIDInvisible);
        if (edgeInInvisible) {
          edgeInInvisible.isVisible = false;
        }
      });
      // loop through descendant nodes and report node to be removed
      nodeIDListForInvisible.forEach((item) =>
        this.removedElements.nodeIDListForInvisible.add(item)
      );
      // loop through descendant edges and report edge to be removed
      edgeIDListForInvisible.forEach((item) =>
        this.removedElements.edgeIDListForInvisible.add(item)
      );
      // loop through descendant meta edge and report meta edge to be added (brought back to visible)
      this.removedElements.metaEdgeIDListForVisible.add(metaEdgeIDListForVisible);
    }

    // traverse function for compound node and report all descendant nodes, edges and meta edges.
    static traverseDescendants(node, nodeToBeCollapsed, visibleGM, mainGM) {
      // iniailize arrays to report descendant nodes (to be removed), edges (to be removed) and meta edges (to be added) as processed
      let nodeIDListForInvisible = [];
      let edgeIDListForInvisible = [];
      let metaEdgeIDListForVisible = [];
      // if node has a child graph (node is a compound node)
      if (node.child) {
        // get nodes from child graph, call them childrenNodes
        let childrenNodes = node.child.nodes;
        // loop through childrenNodes
        childrenNodes.forEach((child) => {
          // report child node as processed
          nodeIDListForInvisible.push(child.ID);
          // loop thorugh incident edges of child Nodes
          let edgesToBeProcessed = [...child.edges];
          edgesToBeProcessed.forEach((childEdge) => {
            //  check if child edge is not a meta edge
            if (!(childEdge instanceof MetaEdge)) {
              // report child edge as edge (to be removed) as processed
              edgeIDListForInvisible.push(childEdge.ID);
            } else {
              // report child edge as meta edge (to be added) as processed
              visibleGM.edgesMap.delete(childEdge.ID);
            }
            // if child Edge is an inter graph edge
            if (childEdge.isInterGraph) {
              //initalize flag for meta edge to be created
              let metaEdgeToBeCreated;
              // if child  is the source of child edge.
              if (childEdge.source == child) {
                // check if meta edge needs to be created or not
                metaEdgeToBeCreated = this.incidentEdgeIsOutOfScope(
                  mainGM.nodesMap.get(childEdge.target.ID),
                  mainGM.nodesMap.get(nodeToBeCollapsed.ID),
                  mainGM
                );

                if (
                  metaEdgeToBeCreated &&
                  visibleGM.metaEdgesMap.has(childEdge.ID)
                ) {
                  if (childEdge.originalEdges.length == 1) {
                    metaEdgeToBeCreated = false;
                    let originalEnds = [...childEdge.originalEdges];
                    let target = childEdge.target;
                    // report child edge (to be removed) as processed
                    edgeIDListForInvisible.push(childEdge.ID);
                    if (visibleGM.edgesMap.has(childEdge.ID)) {
                      visibleGM.edgesMap.delete(childEdge.ID);
                      // remove edge from visible graph and visible edges map
                      Auxiliary.removeEdgeFromGraph(childEdge);
                    }
                    visibleGM.metaEdgesMap.delete(childEdge.ID);
                    originalEnds.forEach((end) => {
                      visibleGM.edgeToMetaEdgeMap.delete(end);
                    });
                    let newMetaEdge = Topology.addMetaEdge(
                      nodeToBeCollapsed.ID,
                      target.ID,
                      originalEnds,
                      visibleGM,
                      mainGM
                    );
                    // report meta edge as processed in the form of object with ID, sourceID, targetID
                    metaEdgeIDListForVisible.push({
                      ID: newMetaEdge.ID,
                      sourceID: newMetaEdge.source.ID,
                      targetID: newMetaEdge.target.ID,
                      size: newMetaEdge.originalEdges.length,
                      compound: "T",
                    });
                  }
                }
                // if meta edge is to be created
                if (metaEdgeToBeCreated) {
                  if (visibleGM.metaEdgesMap.get(childEdge.ID)) {
                    Auxiliary.removeEdgeFromGraph(childEdge);
                  }
                  // create new meta edge between node to collapse and the other target of child edge (because child is the source so we replce it with node to be collapsed)
                  let newMetaEdge = Topology.addMetaEdge(
                    nodeToBeCollapsed.ID,
                    childEdge.target.ID,
                    [childEdge.ID],
                    visibleGM,
                    mainGM
                  );
                  // report meta edge as processed in the form of object with ID, sourceID, targetID
                  metaEdgeIDListForVisible.push({
                    ID: newMetaEdge.ID,
                    sourceID: newMetaEdge.source.ID,
                    targetID: newMetaEdge.target.ID,
                    size: newMetaEdge.originalEdges.length,
                    compound: "T",
                  });
                }
              } else {
                // if child  is the target of child edge.
                // check if meta edge needs to be created or not
                metaEdgeToBeCreated = this.incidentEdgeIsOutOfScope(
                  mainGM.nodesMap.get(childEdge.source.ID),
                  mainGM.nodesMap.get(nodeToBeCollapsed.ID),
                  mainGM
                );
                if (
                  metaEdgeToBeCreated &&
                  visibleGM.metaEdgesMap.has(childEdge.ID)
                ) {
                  if (childEdge.originalEdges.length == 1) {
                    metaEdgeToBeCreated = false;
                    let originalEnds = [...childEdge.originalEdges];
                    let source = childEdge.source;
                    // report child edge (to be removed) as processed
                    edgeIDListForInvisible.push(childEdge.ID);
                    if (visibleGM.edgesMap.has(childEdge.ID)) {
                      visibleGM.edgesMap.delete(childEdge.ID);
                      // remove edge from visible graph and visible edges map
                      Auxiliary.removeEdgeFromGraph(childEdge);
                    }
                    visibleGM.metaEdgesMap.delete(childEdge.ID);
                    originalEnds.forEach((end) => {
                      visibleGM.edgeToMetaEdgeMap.delete(end);
                    });
                    let newMetaEdge = Topology.addMetaEdge(
                      source.ID,
                      nodeToBeCollapsed.ID,
                      originalEnds,
                      visibleGM,
                      mainGM
                    );
                    // report meta edge as processed in the form of object with ID, sourceID, targetID
                    metaEdgeIDListForVisible.push({
                      ID: newMetaEdge.ID,
                      sourceID: newMetaEdge.source.ID,
                      targetID: newMetaEdge.target.ID,
                      size: newMetaEdge.originalEdges.length,
                      compound: "T",
                    });
                  }
                }
                // if meta edge is to be created
                if (metaEdgeToBeCreated) {
                  if (visibleGM.metaEdgesMap.get(childEdge.ID)) {
                    Auxiliary.removeEdgeFromGraph(childEdge);
                  }
                  // create new meta edge between node to collapse and the other source of child edge (because child is the target so we replce it with node to be collapsed)
                  let newMetaEdge = Topology.addMetaEdge(
                    childEdge.source.ID,
                    nodeToBeCollapsed.ID,
                    [childEdge.ID],
                    visibleGM,
                    mainGM
                  );
                  // report meta edge as processed in the form of object with ID, sourceID, targetID
                  metaEdgeIDListForVisible.push({
                    ID: newMetaEdge.ID,
                    sourceID: newMetaEdge.source.ID,
                    targetID: newMetaEdge.target.ID,
                    size: newMetaEdge.originalEdges.length,
                    compound: "T",
                  });
                }
              }
            }
          });
          // pass child back to the function to go through its descendants and report all the elements
          let [nodeIDsReturned, edgeIDsReturned, metaEdgeIDsReturned] =
            this.traverseDescendants(
              child,
              nodeToBeCollapsed,
              visibleGM,
              mainGM
            );
          // combine reproted nodes , edges and meta edges with the orignal ones.
          nodeIDListForInvisible = [
            ...nodeIDListForInvisible,
            ...nodeIDsReturned,
          ];
          edgeIDListForInvisible = [
            ...edgeIDListForInvisible,
            ...edgeIDsReturned,
          ];
          metaEdgeIDListForVisible = [
            ...metaEdgeIDListForVisible,
            ...metaEdgeIDsReturned,
          ];
        });
      }
      // return arrays of nodes, edges and meta edges processed.
      return [
        nodeIDListForInvisible,
        edgeIDListForInvisible,
        metaEdgeIDListForVisible,
      ];
    }

    //function to check of two given nodes are part of the different graph structure or not.
    // if yes return true else false
    static incidentEdgeIsOutOfScope(
      interGraphEdgeTarget,
      nodeToBeCollapsed,
      mainGM
    ) {
      // check if given target node is in root graph then return true.
      if (interGraphEdgeTarget.owner == mainGM.rootGraph) {
        return true;
      } //if parent of given node is node to be collapsed then false
      else if (interGraphEdgeTarget.owner.parent == nodeToBeCollapsed) {
        return false;
      } // last check parent and node to be collapsed are not in same structure, can be sibling or not
      else {
        // recall the fuction and pass parent of target and node to be collapsed.
        return this.incidentEdgeIsOutOfScope(
          interGraphEdgeTarget.owner.parent,
          nodeToBeCollapsed,
          mainGM
        );
      }
    }

    /*
    (Does not work and not data being returned.)
   //-----------------------------------------------
   //Iterative Collapse Soltion 
   //-------------------------------------------------
   static #collapseNode(node, visibleGM, mainGM) {
     let nodeIDListForInvisible = [];
     let edgeIDListForInvisible = [];
     //first process the visible graph
     let descendantNodes = this.getDescendantNodes(node);
     descendantNodes.forEach(childNode => {
       nodeIDListForInvisible.push(childNode.ID);
       childNode.edges.forEach(childEdge => {
         edgeIDListForInvisible.push(childEdge.ID);
         if (childEdge.isInterGraph) {
           let metaEdgeToBeCreated;
           if (childEdge.source == childNode) {
             metaEdgeToBeCreated = [...descendantNodes, node].includes(childEdge.target);
             if (metaEdgeToBeCreated) {
               Topology.addEdge(childEdge.ID, node.ID, childEdge.target.ID, visibleGM, mainGM);
             }
            }
            else {
              metaEdgeToBeCreated = [...descendantNodes, node].includes(childEdge.source);
              if (metaEdgeToBeCreated) {
                Topology.addEdge(childEdge.ID, childEdge.source.ID, node.ID, visibleGM, mainGM);
              }
            }
         }
         visibleGM.edgesMap.delete(childEdge.ID);
       });
     });

     visibleGM.removeGraph(node.child);
     descendantNodes.forEach(node => {
       visibleGM.nodesMap.delete(node.ID)
     });
     let nodeInInvisible = mainGM.nodesMap.get(node.ID);
     nodeInInvisible.isCollapsed = true;

     nodeIDListForInvisible.forEach(nodeIDInvisible => {
       nodeInInvisible = mainGM.nodesMap.get(nodeIDInvisible);
       nodeInInvisible.isVisible = false;
     });

     edgeIDListForInvisible.forEach(edgeIDInvisible => {
       let edgeInInvisible = mainGM.edgesMap.get(edgeIDInvisible);
       edgeInInvisible.isVisible = false;
     });
   }
   */

    //  expand node function to expand a given node

    static #expandNode(
      node,
      isRecursive,
      visibleGM,
      mainGM,
      nodeToBeExpanded = undefined
    ) {
      // get node from invisible graph
      let nodeInInvisible = mainGM.nodesMap.get(node.ID);

      if (nodeInInvisible.isCollapsed) {
        // create new grah in visible  graph as child of given node
        let newVisibleGraph = visibleGM.addGraph(
          new Graph(null, visibleGM),
          node
        );
        // set sibling graph pointers, pointing each other
        nodeInInvisible.child.siblingGraph = newVisibleGraph;
        newVisibleGraph.siblingGraph = nodeInInvisible.child;
        // set is collapsed flag fro invisible node false
        nodeInInvisible.isCollapsed = false;
      }

      // get childre from invisible node's child graph.
      let childrenNodesTemp = nodeInInvisible.child.nodes;
      let childrenNodesCompound = childrenNodesTemp.filter((child) =>
        child.child ? true : false
      );
      let childrenNodesSimple = childrenNodesTemp.filter((child) =>
        child.child ? false : true
      );
      let childrenNodes = [...childrenNodesCompound, ...childrenNodesSimple];
      let markCollapsedCompoundChildren = [];
      // loop through children
      childrenNodes.forEach((child) => {
        // if child is collapsed and not filtered and not hidden and recussion is true (meaning collapsed child with recusion)
        // or if child is not collapsed and not filtered and not hidden (meaning no recurrion and child not collapsed)
        if (
          (child.isCollapsed &&
            isRecursive &&
            !child.isFiltered &&
            !child.isHidden) ||
          (!child.isCollapsed && !child.isFiltered && !child.isHidden)
        ) {
          // bring child back to visible and all its incident edges and meta ednges
          //returns list of edges and meta edges brought back to visible graph( structure : [[edges],[meta-edges]])
          let tempList = Auxiliary.moveNodeToVisible(
            child,
            visibleGM,
            mainGM,
            nodeToBeExpanded == undefined ? node : nodeToBeExpanded
          );
          //loop though edges returned
          tempList[0].forEach((item) => {
            // report edge as processed (to be added)
            try {
              this.addedElements.edgeIDListForVisible.add(item);
            } catch (e) {
              //console.log(e);
            }
          });
          let tempArr = [...this.addedElements.edgeIDListForVisible].filter(
            (edgeID) => visibleGM.edgesMap.has(edgeID)
          );
          this.addedElements.edgeIDListForVisible = new Set(tempArr);
          // loop through meta edges to be removed
          tempList[1].forEach((item) => {
            // report meta edge as parocessed (to be removed)
            try {
              this.addedElements.edgeIDListToRemove.add(item.ID);
            } catch (e) {
              //console.log(e);
            }

            let tempArr = [...this.addedElements.metaEdgeIDListForVisible].filter(
              (mEdge) => {
                if (mEdge.ID == item.ID) {
                  return false;
                } else {
                  return true;
                }
              }
            );
            this.addedElements.metaEdgeIDListForVisible = new Set(tempArr);
          });
          // loop through meta edges to be added
          tempList[2].forEach((item) => {
            // report meta edge as parocessed (to be removed)
            this.addedElements.metaEdgeIDListForVisible.add(item);
          });
          //  report child node as processed (to be added)
          this.addedElements.nodeIDListForVisible.add(child.ID);
          // if child node has a child graph (meaning it is compound node)
          if (child.child) {
            // add child node to the visible graph's nodes map
            let newNode = visibleGM.nodesMap.get(child.ID);
            //  recursively call the expansion of this child node (as it is compound node and recurssion is true)
            this.#expandNode(newNode, isRecursive, visibleGM, mainGM, node);
          }
        } else if (
          child.isCollapsed &&
          !isRecursive &&
          !child.isFiltered &&
          !child.isHidden
        ) {
          // child node is collapsed and there is no recussion (not filtered and not hidden)
          // report child node as processed (to be added)
          this.addedElements.nodeIDListForVisible.add(child.ID);
          // bring child back to visible and all its incident edges and meta ednges
          //returns list of edges and meta edges brought back to visible graph( structure : [[edges],[meta-edges]])
          let tempList = Auxiliary.moveNodeToVisible(
            child,
            visibleGM,
            mainGM,
            nodeToBeExpanded == undefined ? node : nodeToBeExpanded
          );
          //loop though edges returned
          tempList[0].forEach((item) => {
            // report edge as processed (to be added)
            this.addedElements.edgeIDListForVisible.add(item);
          });
          let tempArr = [...this.addedElements.edgeIDListForVisible].filter(
            (edgeID) => visibleGM.edgesMap.has(edgeID)
          );
          this.addedElements.edgeIDListForVisible = new Set(tempArr);
          // loop through meta edges
          tempList[1].forEach((item) => {
            // report meta edge as parocessed (to be removed)
            this.addedElements.edgeIDListToRemove.add(item.ID);
            let tempArr = [...this.addedElements.metaEdgeIDListForVisible].filter(
              (mEdge) => {
                if (mEdge.ID == item.ID) {
                  return false;
                } else {
                  return true;
                }
              }
            );
            this.addedElements.metaEdgeIDListForVisible = new Set(tempArr);
          });
          // loop through meta edges to be added
          tempList[2].forEach((item) => {
            // report meta edge as parocessed (to be removed)
            this.addedElements.metaEdgeIDListForVisible.add(item);
          });

          markCollapsedCompoundChildren.push(child);
        }
      });

      markCollapsedCompoundChildren.forEach((makredChild) => {
        let nodeDescendants = visibleGM.getDescendantsInorder(makredChild);
        // loop through descendant edges
        nodeDescendants.edges.forEach((nodeDescendantEdge) => {
          if (visibleGM.edgeToMetaEdgeMap.has(nodeDescendantEdge.ID)) {
            let topMetaEdge = Auxiliary.getTopMetaEdge(
              visibleGM.edgeToMetaEdgeMap.get(nodeDescendantEdge.ID),
              visibleGM
            );
            let sourceNode = visibleGM.nodesMap.get(topMetaEdge.source.ID);
            let targetNode = visibleGM.nodesMap.get(topMetaEdge.target.ID);
            if (
              !ExpandCollapse.incidentEdgeIsOutOfScope(
                mainGM.nodesMap.get(topMetaEdge.source.ID),
                mainGM.nodesMap.get(node.ID),
                mainGM
              ) &&
              !ExpandCollapse.incidentEdgeIsOutOfScope(
                mainGM.nodesMap.get(topMetaEdge.target.ID),
                mainGM.nodesMap.get(node.ID),
                mainGM
              )
            ) {
              if (
                topMetaEdge.source.ID == makredChild.ID ||
                topMetaEdge.target.ID == makredChild.ID
              ) {
                visibleGM.edgesMap.set(topMetaEdge.ID, topMetaEdge);
                //if source and target owner graph is same (its an intra graph edge), then add the viible and invisible edges to the source owner
                if (sourceNode.owner === targetNode.owner) {
                  if (sourceNode != undefined && targetNode != undefined) {
                    try {
                      sourceNode.owner.addEdge(
                        topMetaEdge,
                        sourceNode,
                        targetNode
                      );
                    } catch (e) {
                      //console.log(e);
                    }
                  }
                } else {
                  //add inter graph edges
                  if (sourceNode != undefined && targetNode != undefined) {
                    try {
                      visibleGM.addInterGraphEdge(
                        topMetaEdge,
                        sourceNode,
                        targetNode
                      );
                    } catch (e) {
                      //console.log(e);
                    }
                  }
                }
                this.addedElements.metaEdgeIDListForVisible.add({
                  ID: topMetaEdge.ID,
                  sourceID: topMetaEdge.source.ID,
                  targetID: topMetaEdge.target.ID,
                  size: topMetaEdge.originalEdges.length,
                  compound: "T",
                });
              }
            }
          }
        });
      });
    }

    // function to get lis of all the nodes and their descendants  and their descendants
    static getDescendantNodes(node) {
      // initalize the list
      let descendantNodes = [];
      // if node is a compound node
      if (node.child) {
        // loop through nodes of a child graph
        node.child.nodes.forEach((childNode) => {
          // report the child node
          descendantNodes.push(childNode);
          // call the function again on child node
          let nodesReturned = this.getDescendantNodes(childNode);
          // append returned nodes with current list.
          descendantNodes = [...descendantNodes, ...nodesReturned];
        });
      }
      // return the list
      return descendantNodes;
    }

    // function to collapse nodes in the given list
    static collapseNodes(nodeIDList, isRecursive, visibleGM, mainGM) {
      // clear all elements from the object of the removed elements
      this.removedElements = {
        nodeIDListForInvisible: new Set(),
        edgeIDListForInvisible: new Set(),
        metaEdgeIDListForVisible: new Set(),
      };
      // set of meta edges to keep
      let metaEdgeIDListToKeep = new Set();
      // if recussion is true.
      if (isRecursive) {
        // loop through the given list of the nodes
        nodeIDList.forEach((nodeID) => {
          // clear the  meta edges set from removed Elements objects
          this.removedElements.metaEdgeIDListForVisible = new Set();
          // get node from visible graph
          let nodeInVisible = visibleGM.nodesMap.get(nodeID);
          // if node in visible graph is a compound node
          if (nodeInVisible.child) {
            // pass node to the collapseCompoundDescendantNodes function to collapse all the descendant compound nodes
            this.collapseCompoundDescendantNodes(
              nodeInVisible,
              visibleGM,
              mainGM
            );
            // collpase the node by passing it to collapseNode function
            this.#collapseNode(nodeInVisible, visibleGM, mainGM);
            // initialize index counter to 0
            let index = 0;
            // loop through list of meta edge ids list
            // struture list of list of objects
            // strucute [[{meta edge object},{meta edge object}],[{meta edge object},{meta edge object}]]
            this.removedElements.metaEdgeIDListForVisible.forEach(
              (edgeIDList) => {
                // check if current meta edge list is not the last one
                if (
                  index !=
                  this.removedElements.metaEdgeIDListForVisible.size - 1
                ) {
                  // loop through current meta edge list
                  edgeIDList?.forEach((edgeID) => {
                    // delete each id from visible graph's edges map
                    visibleGM.edgesMap.delete(edgeID.ID);
                  });
                }
                // increase index by one when one list is processed
                index = index + 1;
              }
            );
            // get metaEdgeIDListForVisible (struture list of list of objects) as temp 1
            let temp1 = [...this.removedElements.metaEdgeIDListForVisible];
            // get the last list of objects as temp
            let temp = [...temp1[temp1.length - 1]];
            // loop through the temp list
            temp.forEach((item) => {
              //  get meta edge from visible graph's meta edge map
              let metaEdge = visibleGM.metaEdgesMap.get(item.ID);
              // add meta edge to  set of meta edges to keep
              metaEdgeIDListToKeep.add({
                ID: metaEdge.ID,
                sourceID: metaEdge.source.ID,
                targetID: metaEdge.target.ID,
                size: metaEdge.originalEdges.length,
                compound: "T",
              });
            });
          }
        });
        //creating a temporary set
        let tempSet = new Set();
        //looping throught set of meta edges to keep and filter out the ones that are no longer visible. (in visibleGM.edgesMap)
        metaEdgeIDListToKeep.forEach((item) => {
          // if meta edge is visible
          if (visibleGM.edgesMap.has(item.ID)) {
            // add it to tempSet
            tempSet.add(item);
          }
        });
        //set filtered tempSet as the new value of metaEdgeIDListForVisible.
        this.removedElements.metaEdgeIDListForVisible = tempSet;
      } else {
        // if recusion is not true
        // loop through node id list
        nodeIDList.forEach((nodeID) => {
          // get node from visible graph
          let nodeInVisible = visibleGM.nodesMap.get(nodeID);
          // if node is compound node
          if (nodeInVisible.child) {
            // pass node to collpaseNode function
            this.#collapseNode(nodeInVisible, visibleGM, mainGM);
            // initialize index to 0
            let index = 0;
            // loop through list of meta edge ids list
            // struture list of list of objects
            // strucute [[{meta edge object},{meta edge object}],[{meta edge object},{meta edge object}]]
            let multipleSelectedMetaEdges = [];
            this.removedElements.metaEdgeIDListForVisible.forEach(
              (edgeID) => {
                // check if current meta edge list is not the last one
                if (
                  index !=
                  this.removedElements.metaEdgeIDListForVisible.size - 1
                ) {
                  // loop through current meta edge if list
                  multipleSelectedMetaEdges.push(edgeID);
                }
                // increase index by one when one list is processed
                index = index + 1;
              }
            );
            // get metaEdgeIDListForVisible (struture list of list of objects) as temp 1
            let temp1 = [...this.removedElements.metaEdgeIDListForVisible];
            // get the last list of objects as temp
            let temp = [...temp1[temp1.length - 1],...multipleSelectedMetaEdges];
            multipleSelectedMetaEdges=[];
            //  set metaEdgeIDListForVisible as a new set
            this.removedElements.metaEdgeIDListForVisible = new Set();
            // loop through the temp list
            temp.forEach((item) => {
              //  get meta edge from visible graph's meta edge map
              let metaEdge = visibleGM.metaEdgesMap.get(item.ID);

              // add meta edge to  set of meta edges to keep
              this.removedElements.metaEdgeIDListForVisible.add({
                ID: metaEdge.ID,
                sourceID: metaEdge.source.ID,
                targetID: metaEdge.target.ID,
                size: metaEdge.originalEdges.length,
                compound: "T",
              });
            });
          }
        });
      }
      // report  removed emelents object with keys for nodes (to be removed), edges (to be removed) and meta edges (to be added)
      return this.removedElements;
    }

    // function to collapse all the descendants of given compound node
    static collapseCompoundDescendantNodes(node, visibleGM, mainGM) {
      // if given node is compound node
      if (node.child) {
        // loop though children nodes of child graph
        node.child.nodes.forEach((childNode) => {
          // if child node is a compound node
          if (childNode.child) {
            // pass the child node to the function again to collapse all its descendants
            this.collapseCompoundDescendantNodes(
              childNode,
              visibleGM,
              mainGM
            );
            // pass the child node to collapse node function to collapse child node.
            this.#collapseNode(childNode, visibleGM, mainGM);
            // initilaize the index to 0
            let index = 0;
            // loop through list of meta edge ids list
            // struture list of list of objects
            // strucute [[{meta edge object},{meta edge object}],[{meta edge object},{meta edge object}]]
            this.removedElements.metaEdgeIDListForVisible.forEach(
              (edgeIDList) => {
                // check if current meta edge list is not the last one
                if (
                  index !=
                  this.removedElements.metaEdgeIDListForVisible.size - 1
                ) {
                  // loop through current meta edge if list
                  edgeIDList.forEach((edgeID) => {
                    // delete meta edge from the visible graph
                    visibleGM.edgesMap.delete(edgeID.ID);
                  });
                }
                // increase index by one when one list is processed
                index = index + 1;
              }
            );
            // get metaEdgeIDListForVisible (struture list of list of objects) as temp 1
            let temp1 = [...this.removedElements.metaEdgeIDListForVisible];
            // get the last list of objects as temp
            let temp = [...temp1[temp1.length - 1]];
            //  set metaEdgeIDListForVisible as a new set
            this.removedElements.metaEdgeIDListForVisible = new Set();
            // create temp array
            let tempArr = [];
            // loop through the temp list
            temp.forEach((item) => {
              //  get meta edge from visible graph's meta edge map
              let metaEdge = visibleGM.metaEdgesMap.get(item.ID);
              // psuh meta edge to  tempArr
              tempArr.push({
                ID: metaEdge.ID,
                sourceID: metaEdge.source.ID,
                targetID: metaEdge.target.ID,
                size: metaEdge.originalEdges.length,
                compound: "T",
              });
            });
            // add tempArr to the metaEdgeIDListForVisible
            this.removedElements.metaEdgeIDListForVisible.add(tempArr);
          }
        });
      }
    }

    // expand nodes function takes list of nodes to expand
    static expandNodes(nodeIDList, isRecursive, visibleGM, mainGM) {
      // clear addedElements object with empty sets
      this.addedElements = {
        nodeIDListForVisible: new Set(),
        edgeIDListForVisible: new Set(),
        metaEdgeIDListForVisible: new Set(),
        edgeIDListToRemove: new Set(),
      };
      // loop through nodes list
      nodeIDList.forEach((nodeID) => {
        // get node from visible graph (visibleNode)
        let nodeInVisible = visibleGM.nodesMap.get(nodeID);
        // get node from invisible grap (invisibleNode)
        let nodeInInvisible = mainGM.nodesMap.get(nodeID);
        // check if invisibleNode is compound node and is collapsed and not filtered and not hidded
        if (
          nodeInInvisible.child &&
          nodeInInvisible.isCollapsed &&
          !nodeInInvisible.isFiltered &&
          !nodeInInvisible.isHidden
        ) {
          // pass invisibleNode to expand node function and recursive status
          this.#expandNode(nodeInVisible, isRecursive, visibleGM, mainGM);
        }
      });
      // return addedElements
      return this.addedElements;
    }

    //  collapse All Nodes function
    static collapseAllNodes(visibleGM, mainGM) {
      // create list for nodes to collapse
      let nodeIDList = [];
      // loop through nodes of root graph (rootNodes)
      visibleGM.rootGraph.nodes.forEach((rootNode) => {
        // if rootNode is a compound node
        if (rootNode.child) {
          // report it as node to be collapsed
          nodeIDList.push(rootNode.ID);
        }
      });
      // call the collapsedNodes function and pass list of nodes to be collapsed
      return {
        collapsedNodes: nodeIDList,
        ...this.collapseNodes(nodeIDList, true, visibleGM, mainGM),
      };
    }

    //expand all nodes function
    static expandAllNodes(visibleGM, mainGM) {
      //  get list of all the top level collapsed compound nodes  (takes invisible root node root node)
      let topCollapsedCompoundNodes = this.getTopCollapsedCompoundNodes(
        mainGM.rootGraph.parent
      );
      // all the expandNodes function will the list of all top level collapsed compound nodes
      return {
        expandedNodes: topCollapsedCompoundNodes,
        ...this.expandNodes(
          topCollapsedCompoundNodes,
          true,
          visibleGM,
          mainGM
        ),
      };
    }

    // function to get thae list of all the top level collapsed compound nodes, (takes invisible root node root node)
    static getTopCollapsedCompoundNodes(node) {
      // initialize list of descendantNodes
      let descendantNodes = [];
      // check if node is a compound node
      if (node.child) {
        // loop through nodes of child graph of top level collapsed node (as childNode)
        node.child.nodes.forEach((childNode) => {
          // if child node is a compound node and is collapsed
          if (childNode.child && childNode.isCollapsed) {
            // report child node as descendant node (because its collapsed)
            descendantNodes.push(childNode.ID);
          } else if (childNode.child && !childNode.isCollapsed) {
            // if childNode is compound node and is not collapsed
            // call the function again and pass childNode
            let nodesReturned = this.getTopCollapsedCompoundNodes(childNode);
            // combine the reported nodes with current descendant nodes.
            descendantNodes = [...descendantNodes, ...nodesReturned];
          }
        });
      }
      // reprot list of descendant nodes
      return descendantNodes;
    }

    // function to collapse edges between 2 nodes (takes lis of edges)
    static collapseEdges(edgeIDList, visibleGM, mainGM) {
      // get first edge from the list of edges
      let firstEdge = visibleGM.edgesMap.get(edgeIDList[0]);
      // get source of the first edge (sourceNode)
      let sourceNode = firstEdge.source;
      // get target of the first node (targetNode)
      let targetNode = firstEdge.target;
      // all add meta edge function to create meta edge between source and target
      let newMetaEdge = Topology.addMetaEdge(
        sourceNode.ID,
        targetNode.ID,
        edgeIDList,
        visibleGM,
        mainGM
      );
      // initailize list of edge ids list
      let edgeIDListForInvisible = [];
      // loop throug the given edge id list
      edgeIDList.forEach((edgeID) => {
        // get edge from visible graph
        let edge = visibleGM.edgesMap.get(edgeID);
        //  check if visibleEge is not a meta edge
        if (!(edge instanceof MetaEdge)) {
          // report edge as processed (to be removed)
          edgeIDListForInvisible.push(edgeID);
        }
        // check if edge is visible
        if (visibleGM.edgesMap.has(edgeID)) {
          // remove edge from  visible graph
          Auxiliary.removeEdgeFromGraph(edge);
          // remove edge from visible edges map
          visibleGM.edgesMap.delete(edge.ID);
        }
      });
      // loop through removted edges
      edgeIDListForInvisible.forEach((edgeForInvisibleID) => {
        // get corresponding edge from invisible graph and set visible flag false.
        let edgeInInvisible = mainGM.edgesMap.get(edgeForInvisibleID);
        edgeInInvisible.isVisible = false;
      });
      // return list of object with new meta edge infromation
      // Structure = [{ID,sourceID,targetID}]
      return [
        {
          ID: newMetaEdge.ID,
          sourceID: newMetaEdge.source.ID,
          targetID: newMetaEdge.target.ID,
          size: newMetaEdge.originalEdges.length,
          compound: "T",
        },
      ];
    }

    // function to expand edges (takes list of edges to expand)
    static expandEdges(edgeIDList, isRecursive, visibleGM, mainGM) {
      // intialize list of 2d array with orignal edges list to report
      // Structure = [ [edges to be added] , [meta edges to be removed] , [edges to be removed]]
      let originalEdgeIDList = [[], [], []];

      edgeIDList = edgeIDList.filter((edgeID) => {
        let metaEdge = visibleGM.metaEdgesMap.get(edgeID);
        if (metaEdge) {
          return metaEdge.originalEdges.length == 1 ? false : true;
        }
        return false;
      });

      originalEdgeIDList[2] = [...edgeIDList];

      // loop through given list of edges
      edgeIDList.forEach((edgeID) => {
        // get meta edge  from visibleGm
        let metaEdge = visibleGM.metaEdgesMap.get(edgeID);
        // get source of meta edge
        let sourceNode = metaEdge.source;
        // get target of meta edge
        let targetNode = metaEdge.target;
        // loop through orignal Edges of meta edge
        metaEdge.originalEdges.forEach((originalEdgeID) => {
          // check if orignal edge is a meta edge
          if (visibleGM.metaEdgesMap.has(originalEdgeID)) {
            //  get meta edge of the orignal edge
            let originalEdge = visibleGM.metaEdgesMap.get(originalEdgeID);
            let sourceNode = visibleGM.nodesMap.get(originalEdge.source.ID);
            let targetNode = visibleGM.nodesMap.get(originalEdge.target.ID);
            //  check if recursive and orignal meta edge is not created by node collapse
            if (isRecursive && originalEdge.originalEdges.length != 1) {
              // expand the orignal meta edge (returns edges brought back to visible graph  and meta edges to be removed)
              let returnedList = this.expandEdges(
                [originalEdge.ID],
                isRecursive,
                visibleGM,
                mainGM
              );
              // remove this meta edge from meta edge map
              visibleGM.metaEdgesMap.delete(originalEdge.ID);
              // combine returned list to the cureent edge list
              originalEdgeIDList[0] = [
                ...originalEdgeIDList[0],
                ...returnedList[0],
              ];
              originalEdgeIDList[1] = [
                ...originalEdgeIDList[1],
                ...returnedList[1],
              ];
              originalEdgeIDList[2] = [
                ...originalEdgeIDList[2],
                ...returnedList[2],
              ];
            } else {
              //  check if its not recursive or orignal meta edge is created by node collapse
              // if orignalEdge source and target have same owner (not inter graph edge)
              if (sourceNode.owner == targetNode.owner) {
                // add orignal edge to the graph
                sourceNode.owner.addEdge(originalEdge, sourceNode, targetNode);
              } else {
                // if orignalEdge source and target does not have same owner (is inter graph edge)
                // add orignal edge as inter graph edge
                visibleGM.addInterGraphEdge(originalEdge, sourceNode, targetNode);
              }
              // add orignal edge to visible edges map
              visibleGM.edgesMap.set(originalEdge.ID, originalEdge);
              // report orignal edge as meta edge (to be removed)
              originalEdgeIDList[1].push({
                ID: originalEdge.ID,
                sourceID: sourceNode.ID,
                targetID: targetNode.ID,
                size: originalEdge.originalEdges.length,
                compound: "T",
              });
            }
          } else if(mainGM.edgesMap.has(originalEdgeID)) {
            // if orignal edge is not a meta edge
            // get edge from invisible side
            let edgeInInvisible = mainGM.edgesMap.get(originalEdgeID);
            //  check if edge is not filtered and not hiddedn
            if (
              edgeInInvisible.isFiltered == false &&
              edgeInInvisible.isHidden == false
            ) {
              // set orignal edge visible flag true
              edgeInInvisible.isVisible = true;
              //  get source of invisible edge from visible graph
              sourceNode = visibleGM.nodesMap.get(edgeInInvisible.source.ID);
              //  get target of invisible edge from visible graph
              targetNode = visibleGM.nodesMap.get(edgeInInvisible.target.ID);
              // create new edge with same ID of invisible edge and source and target from visible graph
              let newEdge = new Edge(edgeInInvisible.ID, sourceNode, targetNode);
              // check if source and target have same owner graph (not inter graph edge)
              if (sourceNode.owner == targetNode.owner) {
                // add new edge to the owner graph of source node
                sourceNode.owner.addEdge(newEdge, sourceNode, targetNode);
              } else {
                // check if source and target does not have same owner graph (is inter graph edge)
                visibleGM.addInterGraphEdge(newEdge, sourceNode, targetNode);
              }
              // add orignal edge to visible edges map
              visibleGM.edgesMap.set(newEdge.ID, newEdge);
              // report orignal edge as  edge (to be added)
              originalEdgeIDList[0].push(originalEdgeID);
            }
          }
          // remove orignal edgeID from edges to meta edge map (it is no longer part of any meta edge)
          visibleGM.edgeToMetaEdgeMap.delete(originalEdgeID);
        });
        // remove edge from meta edge map ( this meta edge is expanded and does not exist anymore)
        visibleGM.metaEdgesMap.delete(edgeID);
        // if edge is visible
        if (visibleGM.edgesMap.has(edgeID)) {
          // remove edge from visible graph and visible edges map
          Auxiliary.removeEdgeFromGraph(metaEdge);
          visibleGM.edgesMap.delete(edgeID);
        }
      });
      // report orignal edges id list
      // Structure = [ [edges to be added] , [meta edges to be removed], [edges to be removed]]
      return originalEdgeIDList;
    }
    // function to collapse edge between selected nodes
    static collapseEdgesBetweenNodes(nodeIDList, visibleGM, mainGM) {
      // initalize list to report meta edge
      let EdgeIDList = [[], []];
      // loop through all the nodes in the list
      for (let i = 0; i < nodeIDList.length; i++) {
        // loop through each pair onece (a-b and b-a are same so ignore one)
        for (let j = i + 1; j < nodeIDList.length; j++) {
          // get nodes
          let nodeA = visibleGM.nodesMap.get(nodeIDList[i]);
          let nodeB = visibleGM.nodesMap.get(nodeIDList[j]);
          let edgeIDList = [];
          // loop throught edges of first Node A and check if source or target of that edge is Node B and is not already in the edge list , add it.
          nodeA.edges.forEach((edge) => {
            if (edge.source.ID == nodeB.ID || edge.target.ID == nodeB.ID) {
              if (!edgeIDList.includes(edge.ID)) {
                edgeIDList.push(edge.ID);
              }
            }
          });
          // call collapse edges function and pass edge list if edge list is not empty
          // function returns array containing one object
          // Structure = [{ID,sourceID,targetID}]
          if (edgeIDList.length > 1) {
            let newMetaEge = this.collapseEdges(
              edgeIDList,
              visibleGM,
              mainGM
            );
            // append it to the edge list to report.
            EdgeIDList[0] = [...EdgeIDList[0], ...edgeIDList];
            // append it to the meta edge list to report.
            EdgeIDList[1] = [...EdgeIDList[1], ...newMetaEge];
          }
        }
      }
      return EdgeIDList;
    }

    static expandEdgesBetweenNodes(
      nodeIDList,
      isRecursive,
      visibleGM,
      mainGM
    ) {
      // initalize list to report meta edge
      let EdgeIDList = [[], [], []];
      // loop through all the nodes in the list
      for (let i = 0; i < nodeIDList.length; i++) {
        // loop through each pair onece (a-b and b-a are same so ignore one)
        for (let j = i + 1; j < nodeIDList.length; j++) {
          // get nodes
          let nodeA = visibleGM.nodesMap.get(nodeIDList[i]);
          let nodeB = visibleGM.nodesMap.get(nodeIDList[j]);
          let edgeIDs = [];
          // loop throught edges of first Node A and check if source or target of that edge is Node B and is not already in the edge list , add it.
          nodeA.edges.forEach((edge) => {
            if (edge.source.ID == nodeB.ID || edge.target.ID == nodeB.ID) {
              if (visibleGM.metaEdgesMap.has(edge.ID)) {
                if (
                  !edgeIDs.includes(edge.ID) &&
                  edge.originalEdges.length != 1
                ) {
                  edgeIDs.push(edge.ID);
                }
              }
            }
          });
          // call collapse edges function and pass edge list if edge list is not empty
          // function returns array containing one object
          // Structure = [{ID,sourceID,targetID}]
          if (edgeIDs.length != 0) {
            let returnedEdgeList = this.expandEdges(
              edgeIDs,
              isRecursive,
              visibleGM,
              mainGM
            );
            // append it to the edge list to report.
            EdgeIDList[0] = [...EdgeIDList[0], ...returnedEdgeList[0]];
            // append it to the meta edge list to report.
            EdgeIDList[1] = [...EdgeIDList[1], ...returnedEdgeList[1]];
            // append it to the meta edge list to remove.
            EdgeIDList[2] = [...EdgeIDList[2], ...edgeIDs];
          }
        }
      }
      return EdgeIDList;
    }

    static collapseAllEdges(visibleGM, mainGM) {
      // create list for nodes to collapse
      let nodeIDList = [];
      // loop through nodes of root graph (rootNodes)
      visibleGM.nodesMap.forEach((node, ID) => {
        nodeIDList.push(ID);
      });
      // call the collapsedNodes function and pass list of nodes to be collapsed
      return this.collapseEdgesBetweenNodes(nodeIDList, visibleGM, mainGM);
    }

    static expandAllEdges(visibleGM, mainGM) {
      // create list for nodes to collapse
      let nodeIDList = [];
      // loop through nodes of root graph (rootNodes)
      visibleGM.nodesMap.forEach((node, ID) => {
        nodeIDList.push(ID);
      });
      // call the collapsedNodes function and pass list of nodes to be collapsed
      return this.expandEdgesBetweenNodes(
        nodeIDList,
        true,
        visibleGM,
        mainGM
      );
    }
  }

  // Filter function
  class FilterUnfilter {
    static filter(nodeIDList, edgeIDList, visibleGM, mainGM) {
      // Lists to return back to api to indicate modified elements
      let nodeIDListPostProcess = [];
      let edgeIDListPostProcess = [];
      // looping through given list of edges to filter
      edgeIDList.forEach(edgeID => {
        // get edge from visible GM
        let edgeToFilter = visibleGM.edgesMap.get(edgeID);
        // if visible
        if (edgeToFilter) {
            if(visibleGM.edgesMap.has(edgeID)){
              // delete from visible map
              visibleGM.edgesMap.delete(edgeToFilter.ID);
              // remove edge from graph of visibleGM
              Auxiliary.removeEdgeFromGraph(edgeToFilter);
            }
            //report edge as processed
            edgeIDListPostProcess.push(edgeID);
        }else {
          // edge is not visible
          // if edge is part of a meta edge
            if (visibleGM.edgeToMetaEdgeMap.has(edgeID)) {
              // get that meta edge
              let visibleMetaEdge = visibleGM.edgeToMetaEdgeMap.get(edgeID);
              // call updateMetaEdge function to check if all edges who are part of meta edge are filtered or hidden
              // if yes remove said meta edge
              let status = this.updateMetaEdge(visibleMetaEdge.originalEdges, edgeID,visibleGM,mainGM);
              // if yes remove said meta edge from visible graph
              if (status) {
                if(visibleGM.edgesMap.has(visibleMetaEdge.ID)){
                  // delete meta edge from visibleGM's map
                  visibleGM.edgesMap.delete(visibleMetaEdge.ID);
                  // Remove meta edge from graph
                  Auxiliary.removeEdgeFromGraph(visibleMetaEdge);
                }
                // Report meta edge as processed
                edgeIDListPostProcess.push(visibleMetaEdge.ID);
              }
            }
          
        }
        // get corresponding edge in invisible side
        let edgeToFilterInvisible = mainGM.edgesMap.get(edgeID);
        // set filtered status to tru and visible status to false.
        if(edgeToFilterInvisible){
          edgeToFilterInvisible.isFiltered = true;
          edgeToFilterInvisible.isVisible = false;
        }
      });
      // loop through list of nodes to filter
      nodeIDList.forEach((nodeID) => {
        // get node from visible graph
        let nodeToFilter = visibleGM.nodesMap.get(nodeID);
        // if node is visible
        if (nodeToFilter) {
          // get all descendants of node to to filter, this will not include given node.
          // return object with 
          // descenedant edges as edges
          // descendant simple nodes and compound nodes as simpleNodes and compoundNodes respectively.
          let nodeToFilterDescendants =
            visibleGM.getDescendantsInorder(nodeToFilter);
            // loop through descendant edges
          nodeToFilterDescendants.edges.forEach((nodeToFilterEdge) => {
            // report edge as processed
            edgeIDListPostProcess.push(nodeToFilterEdge.ID);
            // if edge is not a meta edge
            if (!(nodeToFilterEdge instanceof MetaEdge)) {
              // get corresponding edge on invisible side and set visible status false
              let nodeToFilterEdgeInvisible = mainGM.edgesMap.get(nodeToFilterEdge.ID);
              nodeToFilterEdgeInvisible.isVisible = false;
            }
            if(visibleGM.edgesMap.has(nodeToFilterEdge.ID)){
              // delete edge from visible side
              visibleGM.edgesMap.delete(nodeToFilterEdge.ID);
              // delete edge from grpah
              Auxiliary.removeEdgeFromGraph(nodeToFilterEdge);
            }
          });
          // loop through descendant simple nodes
          nodeToFilterDescendants.simpleNodes.forEach((nodeToFilterSimpleNode) => {
            // get corresponding node in invisible graph and set visible status to false
            let nodeToFilterSimpleNodeInvisible = mainGM.nodesMap.get(nodeToFilterSimpleNode.ID);
            nodeToFilterSimpleNodeInvisible.isVisible = false;
            // report node as processed
            nodeIDListPostProcess.push(nodeToFilterSimpleNode.ID);
            // remove node from visible graph and viisble nodes map
            nodeToFilterSimpleNode.owner.removeNode(nodeToFilterSimpleNode);
            visibleGM.nodesMap.delete(nodeToFilterSimpleNode.ID);
          });
          // loop through descendant compound nodes
          nodeToFilterDescendants.compoundNodes.forEach(
            (nodeToFilterCompoundNode) => {
              // get corresponding compound node in invisible graph and set visible status as false
              let nodeToFilterCompoundNodeInvisible = mainGM.nodesMap.get(nodeToFilterCompoundNode.ID);
              nodeToFilterCompoundNodeInvisible.isVisible = false;
              // report compoound node as processed
              nodeIDListPostProcess.push(nodeToFilterCompoundNode.ID);
              // if compound nodes has not child left set corresponding sibling grpah on invisible side as null.
              if (nodeToFilterCompoundNode.child.nodes.length == 0) {
                nodeToFilterCompoundNode.child.siblingGraph.siblingGraph = null;
              }
              //  remove child graph of the compound node
              visibleGM.removeGraph(nodeToFilterCompoundNode.child);
              // remove compound node from visible graph and nodes map
              nodeToFilterCompoundNode.owner.removeNode(nodeToFilterCompoundNode);
              visibleGM.nodesMap.delete(nodeToFilterCompoundNode.ID);
            }
          );
          // if node has a child graph (meaning its a compound node) and there are not child nodes
          if (nodeToFilter.child && nodeToFilter.child.nodes.length == 0) {
            // set corresponding sibling graph on invisible side as null
            nodeToFilter.child.siblingGraph.siblingGraph = null;
          }
          // if node has a child graph (meaning its a compound node) 
          if(nodeToFilter.child){
            // remove child graph from visible graph
          visibleGM.removeGraph(nodeToFilter.child);
          }
          // remove said node from visible graph and delete it from nodes map
          nodeToFilter.owner.removeNode(nodeToFilter);
          visibleGM.nodesMap.delete(nodeID);
          // report node as processed
          nodeIDListPostProcess.push(nodeID);
          // get corresponding node in invisible graph and set filtered status true and visible status false.
          let nodeToFilterInvisible = mainGM.nodesMap.get(nodeID);
          nodeToFilterInvisible.isFiltered = true;
          nodeToFilterInvisible.isVisible = false;
        }
        else {
          //  if node is not visible
          // get corresponding node from invisible graph and set filtered status true and visible status false



          let nodeToFilterInvisible = mainGM.nodesMap.get(nodeID);

          let nodeToFilterDescendants =
            mainGM.getDescendantsInorder(nodeToFilterInvisible);

            nodeToFilterDescendants.edges.forEach((nodeToFilterEdge) => {
              let edgeID = nodeToFilterEdge.ID;
              if (visibleGM.edgeToMetaEdgeMap.has(edgeID)) {
                // get that meta edge
                let visibleMetaEdge = visibleGM.edgeToMetaEdgeMap.get(edgeID);
                // call updateMetaEdge function to check if all edges who are part of meta edge are filtered or hidden
                // if yes remove said meta edge
                let status = this.updateMetaEdge(visibleMetaEdge.originalEdges, edgeID,visibleGM,mainGM);
                // if yes remove said meta edge from visible graph
                if (status) {
                  if(visibleGM.edgesMap.has(visibleMetaEdge.ID)){
                    // delete meta edge from visibleGM's map
                    visibleGM.edgesMap.delete(visibleMetaEdge.ID);
                    // Remove meta edge from graph
                    Auxiliary.removeEdgeFromGraph(visibleMetaEdge);
                  }
                  // Report meta edge as processed
                  edgeIDListPostProcess.push(visibleMetaEdge.ID);
                }
              }
            });

          nodeToFilterInvisible.isFiltered = true;
          nodeToFilterInvisible.isVisible = false;
        }
      });
      // turn reported edge list to a set (to remove potential duplicates)
      edgeIDListPostProcess = new Set(edgeIDListPostProcess);
      edgeIDListPostProcess = [...edgeIDListPostProcess];
      // combine edgelist and nodelist and to return. (edge first and nodes latter)
      // if nodes are removed first it cause problem, so report all edges first.
      return edgeIDListPostProcess.concat(nodeIDListPostProcess);
    }


    // unfilter function
    static unfilter(nodeIDList, edgeIDList, visibleGM, mainGM) {
      // lists to report processed nodes and edges.
      let nodeIDListPostProcess = [];
      let edgeIDListPostProcess = [];
      let metaEdgeIDListPostProcess = [];
      // loop through nodes to unfilter
      nodeIDList.forEach((nodeID) => {
        // get node from invisible graph and set filter status to false
        let nodeToUnfilter = mainGM.nodesMap.get(nodeID);
        nodeToUnfilter.isFiltered = false;
        // set status flag,  that node is allowed to be filtered, initalized as true
        let canNodeToUnfilterBeVisible = true;
        // if node is not hidden
        if (nodeToUnfilter.isHidden == false) {
          // create temporary copy for node to unfilter
          let tempNode = nodeToUnfilter;
          // following loop check node's parent and their parent and their parent to make sure that at all levels
          // there is nothing hiden, collapse or filtered.
          // infinite loop until we find that node can not be unfiltered or we reach root graph.
          while (true) {
            //if next owner graph is root gaph (meaning no more parents)
            if (tempNode.owner == mainGM.rootGraph) {
              break;
            } else {
              // there is another parent of current node 
              // check parent of current node is not hiden, collapse or filtered.
              // if no
              if (tempNode.owner.parent.isHidden || tempNode.owner.parent.isFiltered || tempNode.owner.parent.isCollapsed) {
                // if yes then node ot unfilter is not allowed to be unfiltered. and we break loop
                canNodeToUnfilterBeVisible = false;
                break;
              } else {
                // if yes then set current node to its parent to move up the ancestral line
                tempNode = tempNode.owner.parent;
              }
            }
          }
        } else {
          // if node is hidden then it can not be unfiltered
          canNodeToUnfilterBeVisible = false;
        }
        // if node is allowed to be unfiltered
        if (canNodeToUnfilterBeVisible) {
          // move node to visible along with all the associated edges that can be brought to visible side
          let tempList = Auxiliary.moveNodeToVisible(nodeToUnfilter, visibleGM, mainGM);
          // make all the descendants of the node to unfilter,visible. 
          //loop though edges returned
          tempList[0].forEach(item => {
            // report edge as processed (to be added)
            if(visibleGM.edgeToMetaEdgeMap.has(item)){
              let topMetaEdge = Auxiliary.getTopMetaEdge(visibleGM.edgeToMetaEdgeMap.get(item),visibleGM);
              edgeIDListPostProcess.push(topMetaEdge.ID);
            }else {
              edgeIDListPostProcess.push(item);
            }
          });
          // loop through meta edges to be added
          tempList[2].forEach((item) => {
            metaEdgeIDListPostProcess.push(item);
          });
          let descendants = [];
          if(!nodeToUnfilter.isCollapsed){
            descendants = FilterUnfilter.makeDescendantNodesVisible(nodeToUnfilter, visibleGM, mainGM);
          // report all descendant edges, simple nodes and compound nodes as processed
          nodeIDListPostProcess = [...nodeIDListPostProcess, ...descendants.simpleNodes, ...descendants.compoundNodes];
          edgeIDListPostProcess = [...edgeIDListPostProcess, ...descendants.edges];
          }

          let nodeToFilterDescendants =
            visibleGM.getDescendantsInorder(nodeToUnfilter);
            // loop through descendant edges
          nodeToFilterDescendants.edges.forEach((nodeTounFilterEdge) => {
            if (visibleGM.edgeToMetaEdgeMap.has(nodeTounFilterEdge.ID)) {
              let topMetaEdge = Auxiliary.getTopMetaEdge(visibleGM.edgeToMetaEdgeMap.get(nodeTounFilterEdge.ID),visibleGM);
              if(topMetaEdge.source.ID == nodeToUnfilter.ID || topMetaEdge.target.ID == nodeToUnfilter.ID){
                edgeIDList.push(nodeTounFilterEdge.ID);
              }
              
            }
          });

          // report node its self as processed.
          nodeIDListPostProcess.push(nodeToUnfilter.ID);
        }else {

          let canNodeEdgesBeProcessed = true;
          // if node is not hidden
          if (nodeToUnfilter.isHidden == false) {
            // create temporary copy for node to unfilter
            let tempNode = nodeToUnfilter;
            // following loop check node's parent and their parent and their parent to make sure that at all levels
            // there is nothing hiden, collapse or filtered.
            // infinite loop until we find that node can not be unfiltered or we reach root graph.
            while (true) {
              //if next owner graph is root gaph (meaning no more parents)
              if (tempNode.owner == mainGM.rootGraph) {
                break;
              } else {
                // there is another parent of current node 
                // check parent of current node is not hiden, collapse or filtered.
                // if no
                if (tempNode.owner.parent.isHidden || tempNode.owner.parent.isFiltered) {
                  // if yes then node ot unfilter is not allowed to be unfiltered. and we break loop
                  canNodeEdgesBeProcessed = false;
                  break;
                } else {
                  // if yes then set current node to its parent to move up the ancestral line
                  tempNode = tempNode.owner.parent;
                }
              }
            }
          } else {
            // if node is hidden then it can not be unfiltered
            canNodeEdgesBeProcessed = false;
          }

          if(canNodeEdgesBeProcessed){
            let edgeIDList = [[],[],[]];
            nodeToUnfilter.edges.forEach(incidentEdge => {
              // check if incident edge is not filtere and not hidde and source and target are visible
              if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false) {
                
                  if (incidentEdge.source.isVisible) {
                    let targetID = Auxiliary.getVisibleParent(incidentEdge.target.ID, mainGM);
                    if(targetID){
                      if (ExpandCollapse.incidentEdgeIsOutOfScope(incidentEdge.source, mainGM.nodesMap.get(targetID), mainGM)) {
                        // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth
                        let deleteMetaEdgeList = Auxiliary.recursiveMetaEdgeUpdate(incidentEdge, visibleGM, mainGM);
                        // report meta edges deleted by recursiveMetaEdgeUpdate function as processed and add them to the list of reported meta edges (to be removed)
                        edgeIDList[1] = [...edgeIDList[1], ...deleteMetaEdgeList[0]];
                        edgeIDList[0] = [...edgeIDList[0], ...deleteMetaEdgeList[1]];
                        let target = visibleGM.nodesMap.get(targetID);
                        let newMetaEdge = Topology.addMetaEdge(incidentEdge.source.ID, target.ID, [incidentEdge.ID], visibleGM, mainGM);
                        // report incident edge as processed (to be added)
                        edgeIDList[2].push({
                          ID: newMetaEdge.ID,
                          sourceID: newMetaEdge.source.ID,
                          targetID: newMetaEdge.target.ID,
                          size: newMetaEdge.originalEdges.length,
                          compound: "T"
                        });
                      }
                    }
                  } else if (incidentEdge.target.isVisible) {
                    let sourceID = Auxiliary.getVisibleParent(incidentEdge.source.ID, mainGM);
                    if(sourceID){
                      if (ExpandCollapse.incidentEdgeIsOutOfScope(incidentEdge.target, mainGM.nodesMap.get(sourceID), mainGM)) {
                        // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth
                        let deleteMetaEdgeList = Auxiliary.recursiveMetaEdgeUpdate(incidentEdge, visibleGM, mainGM);
                        // report meta edges deleted by recursiveMetaEdgeUpdate function as processed and add them to the list of reported meta edges (to be removed)
                        edgeIDList[1] = [...edgeIDList[1], ...deleteMetaEdgeList[0]];
                        edgeIDList[0] = [...edgeIDList[0], ...deleteMetaEdgeList[1]];
                        let source = visibleGM.nodesMap.get(sourceID);
                        let newMetaEdge = Topology.addMetaEdge(source.ID, incidentEdge.target.ID, [incidentEdge.ID], visibleGM, mainGM);
                        // report incident edge as processed (to be added)
                        edgeIDList[2].push({
                          ID: newMetaEdge.ID,
                          sourceID: newMetaEdge.source.ID,
                          targetID: newMetaEdge.target.ID,
                          size: newMetaEdge.originalEdges.length,
                          compound: "T"
                        });
                      }
                    }
                  } else {
                    let sourceID = Auxiliary.getVisibleParent(incidentEdge.source.ID, mainGM);
                    let targetID = Auxiliary.getVisibleParent(incidentEdge.target.ID, mainGM);
                    if(sourceID && targetID && sourceID != targetID){
                      if (ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(targetID), mainGM.nodesMap.get(sourceID), mainGM) && ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(sourceID), mainGM.nodesMap.get(targetID), mainGM)) {
                        // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth
                        let deleteMetaEdgeList = Auxiliary.recursiveMetaEdgeUpdate(incidentEdge, visibleGM, mainGM);
                        // report meta edges deleted by recursiveMetaEdgeUpdate function as processed and add them to the list of reported meta edges (to be removed)
                        edgeIDList[1] = [...edgeIDList[1], ...deleteMetaEdgeList[0]];
                        edgeIDList[0] = [...edgeIDList[0], ...deleteMetaEdgeList[1]];
                        let source = visibleGM.nodesMap.get(sourceID);
                        let target = visibleGM.nodesMap.get(targetID);
                        let newMetaEdge = Topology.addMetaEdge(source.ID, target.ID, [incidentEdge.ID], visibleGM, mainGM);
                        // report incident edge as processed (to be added)
                        edgeIDList[2].push({
                          ID: newMetaEdge.ID,
                          sourceID: newMetaEdge.source.ID,
                          targetID: newMetaEdge.target.ID,
                          size: newMetaEdge.originalEdges.length,
                          compound: "T"
                        });
                      }
                    }
                  }
              }
            });

            edgeIDList[0].forEach(item => {
              // report edge as processed (to be added)
              if(visibleGM.edgeToMetaEdgeMap.has(item)){
                let topMetaEdge = Auxiliary.getTopMetaEdge(visibleGM.edgeToMetaEdgeMap.get(item),visibleGM);
                edgeIDListPostProcess.push(topMetaEdge.ID);
              }else {
                edgeIDListPostProcess.push(item);
              }
            });
            // loop through meta edges to be added
            edgeIDList[2].forEach((item) => {
              metaEdgeIDListPostProcess.push(item);
            });

          }

        }
      });
      // loop through all the edges to unfilter
      edgeIDList.forEach((edgeID) => {
        // get edge from invisible graph and set filtered status to false
        let edgeToUnfilter = mainGM.edgesMap.get(edgeID);
        edgeToUnfilter.isFiltered = false;
        // check if edge is part of a meta edge in visible graph
        if (visibleGM.edgeToMetaEdgeMap.has(edgeID)) {
          // get meta edge
          let visibleMetaEdge = visibleGM.edgeToMetaEdgeMap.get(edgeID);
          // if meta edge is visible
          if(visibleGM.edgesMap.has(visibleMetaEdge.ID));else {
            // if meta edge is not visible get source and target of meta edge from visible graph
            let sourceInVisible = visibleGM.nodesMap.get(visibleMetaEdge.source.ID);
            let targetInVisible = visibleGM.nodesMap.get(visibleMetaEdge.target.ID);
            // if source and target are visible
            if(sourceInVisible!=undefined && targetInVisible!=undefined){
              // get corresponding invisible edge for the orignal edge to unfilter
              let invisibleEdge = mainGM.edgesMap.get(edgeID);
              // if source and target of invisible side edge has same owner graph (meaning they belong in same graph and edge is not inter graph edge)
              if (invisibleEdge.source.owner == invisibleEdge.target.owner) {
                // add meta edge to the sibling side of the invisible edge's owner graph. (doing it from invisible side because there is no way to access visible graph directly)
                // (the meta edge we have is not part of any graph.)
                invisibleEdge.source.owner.siblingGraph.addEdge(visibleMetaEdge, sourceInVisible, targetInVisible);
              }
              else {
                // if source and target of invisible side edge does not has same owner graph (meaning it will be inter graph edge)
                // add meta edge as inter graph edge
                visibleGM.addInterGraphEdge(visibleMetaEdge, sourceInVisible, targetInVisible);
              }
              //  add meta edge to visible graphs edge map (to bring it to visible side)
              visibleGM.edgesMap.set(visibleMetaEdge.ID, visibleMetaEdge);
              // report meta edge as processed.
              edgeIDListPostProcess.push(visibleMetaEdge.ID);
            
            }
          }
          }else {
            // if edge is not part of any meta edge
            // check if edge is not hidden and source and target of edge are visible
            // if yes
            if (edgeToUnfilter.isHidden == false && edgeToUnfilter.source.isVisible && edgeToUnfilter.target.isVisible) {
              // bring edge to visible side
              Auxiliary.moveEdgeToVisible(edgeToUnfilter, visibleGM, mainGM);
              // report edge as processed.
              edgeIDListPostProcess.push(edgeToUnfilter.ID);
            }          
          }
      });
      // create set of the prcessed edge (to remove duplications)
      edgeIDListPostProcess = new Set(edgeIDListPostProcess);
      // turn set back to array
      edgeIDListPostProcess = [...edgeIDListPostProcess];
      // combine node and edge list.
      // report nodes first then edges
      // (if edges are reported first they will be added first and without source and target nodes present cytoscpae will give error) 
      return [nodeIDListPostProcess.concat(edgeIDListPostProcess),metaEdgeIDListPostProcess];
    }

    // function to make all descendants of a compound node visible and report all the procesed descendants.
    static makeDescendantNodesVisible(nodeToUnfilter, visibleGM, mainGM) {
      // reproting object for descendants
      let descendants = {
        edges: new Set(),
        simpleNodes: [],
        compoundNodes: []
      };
      // chec if given node has child graph (meaning it is a compound node)
      if (nodeToUnfilter.child) {
        // get descendant nodes for the child graph
        let nodeToUnfilterDescendants = nodeToUnfilter.child.nodes;
        // loop through descendant nodes
        nodeToUnfilterDescendants.forEach((descendantNode) => {
          // check if decendant node is not filterted and not hidden 
          if (descendantNode.isFiltered == false && descendantNode.isHidden == false) {
            // move descendant node to visible and all its incident edges
            let tempList = Auxiliary.moveNodeToVisible(descendantNode, visibleGM, mainGM);
            tempList[0].forEach(item => {
              // report edge as processed (to be added)
              descendants.edges.add(item);
            });
            // check if desndant node is not collapsed
            if (descendantNode.isCollapsed == false) {
              // recall this function for decendant node to get all its descendants (recursion goes until there are not more descendants) 
              let childDescendents = this.makeDescendantNodesVisible(descendantNode, visibleGM, mainGM);
              // loop through keys of reported child descendant object and combine values for each keys
              for (var id in childDescendents) {
                descendants[id] = [...descendants[id] || [], ...childDescendents[id]];
              }
              // above combination convered set of the edges key to an array, so convert it back to set (removed possible duplications)
              descendants['edges'] = new Set(descendants['edges']);
              // if descendant node has child graph (meaning it is a compound node)
              if (descendantNode.child) {
                // report it as compound node
                descendants.compoundNodes.push(descendantNode.ID);
              } else {
                // report it as simple node
                descendants.simpleNodes.push(descendantNode.ID);
              }
              // get incident endge of descendant node
              let nodeEdges = descendantNode.edges;
              // loop through edges
              nodeEdges.forEach((item) => {
                // if edge is not filtered or hidded and source and target both are visible report it
                if (item.isFiltered == false && item.isHidden == false && item.source.isVisible && item.target.isVisible) {
                  // report edge
                  if(visibleGM.edgeToMetaEdgeMap.has(item.ID)){
                    let topMetaEdge = Auxiliary.getTopMetaEdge(item, visibleGM);
                    descendants['edges'].add(topMetaEdge.ID);
                  }else {
                    descendants['edges'].add(item.ID);
                  }
                  
                }
              });
            }
          }
        });
      }
      // loop thorugh incident endge of node to unfilter
      nodeToUnfilter.edges.forEach((edge) => {
        // if edge is not filtered or hidded and source and target both are visible report it
        if (edge.isFiltered == false && edge.isHidden == false && edge.source.isVisible && edge.target.isVisible) {
          // report edge
          if(visibleGM.edgeToMetaEdgeMap.has(edge.ID)){
            let topMetaEdge = Auxiliary.getTopMetaEdge(edge, visibleGM);
            descendants.edges.add(topMetaEdge.ID);
          }else {
            descendants.edges.add(edge.ID);
          }
        }
      });
      // report decendant object
      return descendants;
    }
    // Function to check how to update the meta edge (wether to keep it or not)
  //check if orignal edges, has an egde who is is not filtered and not hidden other than target itself 
  // if yes keep meta edge else remove meta edge
  // Return False to report meta edge to be kept,
  // Returns True to  report meta edge to be removed,
    static updateMetaEdge(nestedEdges, targetEdgeID,visibleGM,mainGM) {
      // initally assuming all orignal edges are either filtered or hidden and meta edge needs to be deleted
      let status = true;
      // loop through given edge IDs
      nestedEdges.forEach((nestedEdgeID, index) => {
        // if edge ID is a meta edge ID
        if (visibleGM.metaEdgesMap.has(nestedEdgeID)) {
          // get that meta edge object
          let nestedEdge = visibleGM.metaEdgesMap.get(nestedEdgeID);
          // recall the function for this meta edge's orignal ends
          let update = this.updateMetaEdge(nestedEdge.originalEdges, targetEdgeID,visibleGM,mainGM);
          // combine the result from above with current one.
          // if one of them is false at any point it will become false
          status = (update==false?update:status);

        } else {
          // if edge ID is not a meta edge
          // get the simple edge from invisible graph (as this edge is part of a meta edge it will not be on visible graph)
          let nestedEdge = mainGM.edgesMap.get(nestedEdgeID);
          //  check if invisible edge is not filtered and not hidded and is not the given target.
          if (nestedEdge?.isFiltered == false && nestedEdge?.isHidden == false && nestedEdgeID!=targetEdgeID) {
            // report meta edge to be kept. (there is an edge which fulfil requirement so we keep initial meta edge)
            status = false;
          }
        }
      });
      // return status
      return status;
    }
  }

  class Topology {
    static addNode(nodeID, parentID, visibleGM, mainGM) {
      let graphToAdd;
      let graphToAddInvisible;
      if (parentID) {
        // we add new node as a child node
        let parentNode = visibleGM.nodesMap.get(parentID); // we can keep an id -> node map to get the node in constant time
        if (parentNode.child) {
          graphToAdd = parentNode.child;
        } else {
          graphToAdd = visibleGM.addGraph(new Graph(null, visibleGM), parentNode);
        }
      } else {
        // new node is a top-level node
        graphToAdd = visibleGM.rootGraph;
      }
      let node = new Node(nodeID);
      graphToAdd.addNode(node);
      visibleGM.nodesMap.set(nodeID, node);
      // add new node to the invisible graph as well
      let nodeForInvisible = new Node(nodeID);
      if (graphToAdd.siblingGraph) {
        graphToAdd.siblingGraph.addNode(nodeForInvisible);
      } else {
        if (parentID) {
          let parentNodeInvisible = mainGM.nodesMap.get(parentID);
          if (parentNodeInvisible.child) {
            graphToAddInvisible = parentNodeInvisible.child;
          } else {
            graphToAddInvisible = mainGM.addGraph(
              new Graph(null, mainGM),
              parentNodeInvisible
            );
          }
        } else {
          graphToAddInvisible = mainGM.rootGraph;
        }
        graphToAddInvisible.addNode(nodeForInvisible);
        graphToAdd.siblingGraph = graphToAddInvisible;
        graphToAddInvisible.siblingGraph = graphToAdd;
      }
      mainGM.nodesMap.set(nodeID, nodeForInvisible);
    }

    static addEdge(edgeID, sourceID, targetID, visibleGM, mainGM) {
      //get nodes from visible and invisible Graph Managers
      let sourceNode = visibleGM.nodesMap.get(sourceID);
      let targetNode = visibleGM.nodesMap.get(targetID);
      let sourceNodeInvisible = mainGM.nodesMap.get(sourceID);
      let targetNodeInvisible = mainGM.nodesMap.get(targetID);
      let edge;
      //create edge for visible and invisible Graph Managers
      if (sourceNode != undefined && targetNode != undefined) {
        edge = new Edge(edgeID, sourceNode, targetNode);
      }
      let edgeInvisible = new Edge(
        edgeID,
        sourceNodeInvisible,
        targetNodeInvisible
      );
      //if source and target owner graph is same (its an intra graph edge), then add the viible and invisible edges to the source owner
      if (sourceNodeInvisible.owner === targetNodeInvisible.owner) {
        if (sourceNode != undefined && targetNode != undefined) {
          sourceNode.owner.addEdge(edge, sourceNode, targetNode);
        }
        sourceNodeInvisible.owner.addEdge(
          edgeInvisible,
          sourceNodeInvisible,
          targetNodeInvisible
        );
      } else {
        //add inter graph edges
        if (sourceNode != undefined && targetNode != undefined) {
          visibleGM.addInterGraphEdge(edge, sourceNode, targetNode);
        }
        mainGM.addInterGraphEdge(
          edgeInvisible,
          sourceNodeInvisible,
          targetNodeInvisible
        );
      }
      //add edge id to edgesMap of visible and invisible Graph Managers
      if (sourceNode != undefined && targetNode != undefined) {
        visibleGM.edgesMap.set(edgeID, edge);
      }
      mainGM.edgesMap.set(edgeID, edgeInvisible);
    }

    static addMetaEdge(sourceID, targetID, orignalEnds, visibleGM, mainGM) {
      //get nodes from visible graph manager
      let sourceNode = visibleGM.nodesMap.get(sourceID);
      let targetNode = visibleGM.nodesMap.get(targetID);
      let metaEdge;
      //create edge for visible and invisible Graph Managers
      if (sourceNode != undefined && targetNode != undefined) {
        metaEdge = new MetaEdge(sourceNode, targetNode, orignalEnds);
        visibleGM.metaEdgesMap.set(metaEdge.ID, metaEdge);
        orignalEnds.forEach((edgeID) => {
          visibleGM.edgeToMetaEdgeMap.set(edgeID, metaEdge);
        });
      }
      //if source and target owner graph is same (its an intra graph edge), then add the viible and invisible edges to the source owner
      if (sourceNode.owner === targetNode.owner) {
        if (sourceNode != undefined && targetNode != undefined) {
          sourceNode.owner.addEdge(metaEdge, sourceNode, targetNode);
        }
      } else {
        //add inter graph edges
        if (sourceNode != undefined && targetNode != undefined) {
          visibleGM.addInterGraphEdge(metaEdge, sourceNode, targetNode);
        }
      }
      //add edge id to edgesMap of visible graph manager
      if (sourceNode != undefined && targetNode != undefined) {
        visibleGM.edgesMap.set(metaEdge.ID, metaEdge);
      }

      return metaEdge;
    }

    static removeNestedEdges(nestedEdges, visibleGM, mainGM) {
      //loop through the list of nested edges
      nestedEdges.forEach((edgeInInvisibleItem) => {
        // nested edge is an id and not a another meta edge
        if (visibleGM.metaEdgesMap.has(edgeInInvisibleItem)) {
          //recursively passing the nested edge
          let metaEdge = visibleGM.metaEdgesMap.get(edgeInInvisibleItem);
          Topology.removeNestedEdges(
            metaEdge.originalEdges,
            visibleGM,
            mainGM
          );
          visibleGM.metaEdgesMap.delete(edgeInInvisibleItem);
        } else {
          let edgeInInvisible = mainGM.edgesMap.get(edgeInInvisibleItem);
          mainGM.edgesMap.delete(edgeInInvisible.ID);
          Auxiliary.removeEdgeFromGraph(edgeInInvisible);
        }
      });
    }

    static recursivelyRemoveDescendantEdges(
      originalEdges,
      visibleGM,
      mainGM
    ) {
      originalEdges.forEach((edgeID) => {
        let edgeToRemove = visibleGM.edgesMap.get(edgeID);
        let edgeToRemoveInvisible = mainGM.edgesMap.get(edgeID);
        if (visibleGM.metaEdgesMap.has(edgeID)) {
          edgeToRemove = visibleGM.metaEdgesMap.get(edgeID);
          // delete from visible map
          visibleGM.edgesMap.delete(edgeToRemove.ID);
          visibleGM.metaEdgesMap.delete(edgeToRemove.ID);
          // remove edge from graph of visibleGM
          try {
            Auxiliary.removeEdgeFromGraph(edgeToRemove);
          } catch (e) {
            //console.log(e);
          }
          if (visibleGM.edgeToMetaEdgeMap.has(edgeToRemove.ID)) {
            visibleGM.edgeToMetaEdgeMap.delete(edgeToRemove.ID);
          }
          this.recursivelyRemoveDescendantEdges(
            edgeToRemove.originalEdges,
            visibleGM,
            mainGM
          );
        } else if (visibleGM.edgesMap.has(edgeID)) {
          // delete from visible map
          visibleGM.edgesMap.delete(edgeToRemove.ID);
          // remove edge from graph of visibleGM
          try {
            Auxiliary.removeEdgeFromGraph(edgeToRemove);
          } catch (e) {
            //console.log(e);
          }
          //remove edge from the invisible graph
          mainGM.edgesMap.delete(edgeToRemoveInvisible.ID);
          try {
            Auxiliary.removeEdgeFromGraph(edgeToRemoveInvisible);
          } catch (e) {
            //console.log(e);
          }
        } else {
          if (visibleGM.edgeToMetaEdgeMap.has(edgeID)) {
            visibleGM.edgeToMetaEdgeMap.delete(edgeID);
          }
          //remove edge from the invisible graph
          mainGM.edgesMap.delete(edgeToRemoveInvisible.ID);
          try {
            Auxiliary.removeEdgeFromGraph(edgeToRemoveInvisible);
          } catch (e) {
            //console.log(e);
          }
        }
      });
    }

    static removeEdge(edgeID, visibleGM, mainGM) {
      //get edges
      let edgeToRemove = visibleGM.edgesMap.get(edgeID);
      let edgeToRemoveInvisible = mainGM.edgesMap.get(edgeID);
      if (edgeToRemove) {
        //if edge exisit in the visible graph
        if (visibleGM.metaEdgesMap.has(edgeID)) {
          edgeToRemove = Auxiliary.getTopMetaEdge(edgeToRemove, visibleGM);
          // delete from visible map
          visibleGM.edgesMap.delete(edgeToRemove.ID);
          visibleGM.metaEdgesMap.delete(edgeToRemove.ID);
          // remove edge from graph of visibleGM
          Auxiliary.removeEdgeFromGraph(edgeToRemove);
          if (visibleGM.edgeToMetaEdgeMap.has(edgeToRemove.ID)) {
            visibleGM.edgeToMetaEdgeMap.delete(edgeToRemove.ID);
          }
          this.recursivelyRemoveDescendantEdges(
            edgeToRemove.originalEdges,
            visibleGM,
            mainGM
          );
        } else if (visibleGM.edgesMap.has(edgeID)) {
          // delete from visible map
          visibleGM.edgesMap.delete(edgeToRemove.ID);
          // remove edge from graph of visibleGM
          Auxiliary.removeEdgeFromGraph(edgeToRemove);

          //remove edge from the invisible graph
          mainGM.edgesMap.delete(edgeToRemoveInvisible.ID);
          Auxiliary.removeEdgeFromGraph(edgeToRemoveInvisible);
        }
      } else {
        if (visibleGM.edgeToMetaEdgeMap.has(edgeID)) {
          Auxiliary.recursiveMetaEdgeUpdate(
            edgeToRemoveInvisible,
            visibleGM
          );
        }
        //remove edge from the invisible graph
        mainGM.edgesMap.delete(edgeToRemoveInvisible.ID);
        Auxiliary.removeEdgeFromGraph(edgeToRemoveInvisible);
      }
    }

    static removeNode(nodeID, visibleGM, mainGM) {
      //get node objects from nodesMap from visible and invisible graph managers
      let nodeToRemove = visibleGM.nodesMap.get(nodeID);
      let nodeToRemoveInvisible = mainGM.nodesMap.get(nodeID);
      if (nodeToRemove) {
        //node might not be in the visible graph
        // Removing nodes from Visible Graph Manager
        let nodeToRemoveDescendants =
          visibleGM.getDescendantsInorder(nodeToRemove); //get list of descendants
        //looping through descendant edges
        nodeToRemoveDescendants.edges.forEach((nodeToRemoveEdge) => {
          //removing edge
          Topology.removeEdge(nodeToRemoveEdge.ID, visibleGM, mainGM);
        });
        //looping through descendant simpleNodes
        nodeToRemoveDescendants.simpleNodes.forEach((nodeToRemoveSimpleNode) => {
          nodeToRemoveSimpleNode.owner.removeNode(nodeToRemoveSimpleNode);
          visibleGM.nodesMap.delete(nodeToRemoveSimpleNode.ID);
        });
        //looping through descendant compoundNodes
        nodeToRemoveDescendants.compoundNodes.forEach(
          (nodeToRemoveCompoundNode) => {
            nodeToRemoveCompoundNode.owner.removeNode(nodeToRemoveCompoundNode);
            visibleGM.nodesMap.delete(nodeToRemoveCompoundNode.ID);
          }
        );
        // Removing nodes from Invisible Graph Manager
        let nodeToRemoveDescendantsInvisible = mainGM.getDescendantsInorder(
          nodeToRemoveInvisible
        );
        nodeToRemoveDescendantsInvisible.edges.forEach(
          (nodeToRemoveEdgeInvisible) => {
            Topology.removeEdge(
              nodeToRemoveEdgeInvisible.ID,
              visibleGM,
              mainGM
            );
          }
        );
        nodeToRemoveDescendantsInvisible.simpleNodes.forEach(
          (nodeToRemoveSimpleNodeInvisible) => {
            nodeToRemoveSimpleNodeInvisible.owner.removeNode(
              nodeToRemoveSimpleNodeInvisible
            );
            mainGM.nodesMap.delete(nodeToRemoveSimpleNodeInvisible.ID);
          }
        );
        nodeToRemoveDescendantsInvisible.compoundNodes.forEach(
          (nodeToRemoveCompoundNodeInvisible) => {
            nodeToRemoveCompoundNodeInvisible.owner.removeNode(
              nodeToRemoveCompoundNodeInvisible
            );
            mainGM.nodesMap.delete(nodeToRemoveCompoundNodeInvisible.ID);
          }
        );
        //removing nodes from visible and invisible graph managers and nodes maps
        nodeToRemove.owner.removeNode(nodeToRemove);
        visibleGM.nodesMap.delete(nodeID);
        nodeToRemoveInvisible.owner.removeNode(nodeToRemoveInvisible);
        mainGM.nodesMap.delete(nodeID);
      } else {
        //remove node from invisible graph manager
        if (nodeToRemoveInvisible) {
          nodeToRemoveInvisible.owner.removeNode(nodeToRemoveInvisible);
          mainGM.nodesMap.delete(nodeID);
        }
      }
      //reemoving graphs from visible and invisible graph managers if they have no nodes
      visibleGM.graphs.forEach((graph, index) => {
        if (graph.nodes.length == 0 && graph != visibleGM.rootGraph) {
          visibleGM.graphs.splice(index, 1);
        }
      });
      mainGM.graphs.forEach((graph, index) => {
        if (graph.nodes.length == 0 && graph != mainGM.rootGraph) {
          mainGM.graphs.splice(index, 1);
        }
      });
    }

    static reconnect(edgeID, newSourceID, newTargetID, visibleGM, mainGM) {
      //get edge from visible graph
      let edgeToRemove = visibleGM.edgesMap.get(edgeID);
      //check if source is given
      if (newSourceID == undefined) {
        newSourceID = edgeToRemove.source.ID;
      }
      //check if target is given
      else if (newTargetID == undefined) {
        newTargetID = edgeToRemove.target.ID;
      }
      //remove existing edge from visible graph
      if (edgeToRemove) {
        visibleGM.edgesMap.delete(edgeToRemove.ID);
        Auxiliary.removeEdgeFromGraph(edgeToRemove);
      }
      //get edge from invisible graph
      let edgeToRemoveInvisible = mainGM.edgesMap.get(edgeID);
      //create a new edge to add between new source and target and copy values of inVisible and isHidden
      let edgeToAddForInvisible = new Edge(edgeID, newSourceID, newTargetID);
      edgeToAddForInvisible.isVisible = edgeToRemoveInvisible.isVisible;
      edgeToAddForInvisible.isHidden = edgeToRemoveInvisible.isHidden;
      Auxiliary.removeEdgeFromGraph(edgeToRemoveInvisible);
      //checking if new edge is to be visible or not
      if (
        edgeToAddForInvisible.isFiltered == false &&
        edgeToAddForInvisible.isHidden == false &&
        visibleGM.nodesMap.get(newSourceID).isVisible &&
        visibleGM.nodesMap.get(newTargetID).isVisible
      ) {
        edgeToAddForInvisible.isVisible = true;
      } else {
        edgeToAddForInvisible.isVisible = false;
      }
      //if new edge is visible , add the edge to visible graph
      if (edgeToAddForInvisible.isVisible == true) {
        Topology.addEdge(
          edgeID,
          newSourceID,
          newTargetID,
          visibleGM,
          mainGM
        );
      } else {
        //add edge to invisble graph
        if (
          edgeToAddForInvisible.source.owner == edgeToAddForInvisible.target.owner
        ) {
          edgeToAddForInvisible.source.owner.addEdge(
            edgeToAddForInvisible,
            edgeToAddForInvisible.source,
            edgeToAddForInvisible.target
          );
        }
        //add inter graph edge invisible graph
        else {
          mainGM.addInterGraphEdge(
            edgeToAddForInvisible,
            edgeToAddForInvisible.source,
            edgeToAddForInvisible.target
          );
        }
      }
    }

    static changeParent(nodeID, newParentID, visibleGM, mainGM) {
      //get node from visible graph
      let nodeToRemove = visibleGM.nodesMap.get(nodeID);
      let edgesOfNodeToRemove = [...nodeToRemove.edges];
      if (nodeToRemove) {
        //node might not be in visible graph
        //get new parent node from visible graph
        let newParent = visibleGM.nodesMap.get(newParentID);
        if (newParent == undefined) {
          //if parent is not defined, parent is the root
          newParent = visibleGM.rootGraph.parent;
        }
        let removedNode = nodeToRemove.owner.removeNode(nodeToRemove); //remove the node
        if (newParent.child == undefined) {
          //if new parent doesnot has the child graph add the graph
          visibleGM.addGraph(new Graph(null, visibleGM), newParent);
        }
        //add the node to new parent node's child graph
        newParent.child.addNode(removedNode);
      }
      //same things for invisible graph
      let nodeToRemoveInvisible = mainGM.nodesMap.get(nodeID);
      let newParentInInvisible = mainGM.nodesMap.get(newParentID);
      if (newParentInInvisible == undefined) {
        newParentInInvisible = mainGM.rootGraph.parent;
      }
      let removedNodeInvisible = nodeToRemoveInvisible.owner.removeNode(
        nodeToRemoveInvisible
      );
      if (newParentInInvisible.child == undefined) {
        mainGM.addGraph(new Graph(null, mainGM), newParentInInvisible);
      }
      newParentInInvisible.child.addNode(removedNodeInvisible);
      edgesOfNodeToRemove.forEach((edge) => {
        Topology.addEdge(
          edge.ID,
          edge.source.ID,
          edge.target.ID,
          visibleGM,
          mainGM
        );
        if (edge.source.isVisible && edge.target.isVisible) {
          let newEdge = mainGM.edgesMap.get(edge.ID);
          newEdge.isVisible = false;
        }
      });
    }
  }

  class Auxiliary {
    static lastID = 0;
    // Function to create unique id for new elements
    static createUniqueID() {
      let newID = "Object#" + this.lastID + "";
      this.lastID++;
      return newID;
    }

    // function to remove edge from the graph
    static removeEdgeFromGraph(edgeToRemove) {
      // check if owner of edge is a graph mananger, (meaning it is inter graph edge)
      if (edgeToRemove.owner instanceof GraphManager) {
        // remove the inter graph edge
        edgeToRemove.owner.removeInterGraphEdge(edgeToRemove);
      } else {
        // edge is not an inter graph edge
        // remove the edge from the owner graph
        edgeToRemove.owner.removeEdge(edgeToRemove);
      }
    }

    // function to remove a given edge from the meta edge and that meta edge from its parent and so on and so forth
    static recursiveMetaEdgeUpdate(edge, visibleGM, mainGM) {
      // initalize list to report all deleted meta edges
      let deletedMetaEdges = [[], []];
      // edge is part of a meta edge, get that meta edge using edge ID (as newMetaEdge)
      let metaEdge = visibleGM.edgeToMetaEdgeMap.get(edge.ID);

      if(metaEdge == undefined){
        return deletedMetaEdges;
      }

      // remove meta edge from the edge to meta edge map.
      visibleGM.edgeToMetaEdgeMap.delete(edge.ID);
      // check if newMetaEdge is part of any meta edge
      if (
        visibleGM.edgeToMetaEdgeMap.has(metaEdge.ID) &&
        metaEdge.originalEdges.length == 1
      ) {
        // call the function again and pass newMetaEdge
        let returnedList = this.recursiveMetaEdgeUpdate(
          metaEdge,
          visibleGM,
          mainGM
        );
        // combine the reproted list and the current list of meta edges to be deleted
        deletedMetaEdges[0] = [...deletedMetaEdges[0], ...returnedList[0]];
        deletedMetaEdges[1] = [...deletedMetaEdges[1], ...returnedList[1]];
      }
      if (visibleGM.metaEdgesMap.has(metaEdge.ID)) {
        // get the orignal edges of our newMetaEdge as new list ( orignalEnds)
        let orignalEnds = [
          ...visibleGM.metaEdgesMap.get(metaEdge.ID)?.originalEdges,
        ];
        // remove given edgeID from the orignalEnds list (filter out EdgeID)
        orignalEnds = orignalEnds.filter((i) => (i == edge.ID ? false : true));
        // if filtered list is not empty
        if (orignalEnds.length == 0) {
          // delete meta edge from the metaEdgeMap
          visibleGM.metaEdgesMap.delete(metaEdge.ID);
          // if meta edge is visible
          if (visibleGM.edgesMap.has(metaEdge.ID)) {
            // delete meta edge from visible edge map
            Auxiliary.removeEdgeFromGraph(metaEdge);
            visibleGM.edgesMap.delete(metaEdge.ID);
            // report meta edge as processed (to be removed)
            // structure {ID,sourceID,TargetID}
            deletedMetaEdges[0].push({
              ID: metaEdge.ID,
              sourceID: metaEdge.source.ID,
              targetID: metaEdge.target.ID,
            });
          }
        } else if (orignalEnds.length == 1) {
          visibleGM.edgeToMetaEdgeMap.delete(orignalEnds[0]);
          if (visibleGM.edgeToMetaEdgeMap.has(metaEdge.ID)) {
            let pMetaEdge = visibleGM.edgeToMetaEdgeMap.get(metaEdge.ID);
            pMetaEdge.originalEdges.push(orignalEnds[0]);
            visibleGM.edgeToMetaEdgeMap.set(orignalEnds[0], pMetaEdge);
            let updatedPOrignalEnds = pMetaEdge.originalEdges.filter((i) =>
              i == metaEdge.ID ? false : true
            );
            pMetaEdge.originalEdges = updatedPOrignalEnds;
          } 
          // delete meta edge from the metaEdgeMap
          visibleGM.metaEdgesMap.delete(metaEdge.ID);
          // if meta edge is visible
          if (visibleGM.edgesMap.has(metaEdge.ID)) {
            // delete meta edge from visible edge map
            try {
              Auxiliary.removeEdgeFromGraph(metaEdge);
            } catch (e) {
            }
            visibleGM.edgesMap.delete(metaEdge.ID);
            // report meta edge as processed (to be removed)
            // structure {ID,sourceID,TargetID}
            deletedMetaEdges[0].push({
              ID: metaEdge.ID,
              sourceID: metaEdge.source.ID,
              targetID: metaEdge.target.ID,
            });
          }
        } else {
          // if filtered list is not empty (there are other edges present in orignal edges list of meta edge)
          // set orignal edges list of meta edge to the filtered version (so edgeID gets removed from the orignal ends)
          visibleGM.metaEdgesMap.get(metaEdge.ID).originalEdges = orignalEnds;
        }
      }
      // reprot the list of meta edges to be deleted
      return deletedMetaEdges;
    }
    //recursivly tracks if meta edge is part of another meta edge if yes returns top one
    static getTopMetaEdge(metaEdge, visibleGM) {
      //check if meta edge is part of another meta edge
      let topMetaEdge = visibleGM.edgeToMetaEdgeMap.get(metaEdge.ID);
      //if not then topMetaEdge will be undefined so return meta edge
      if (topMetaEdge) {
        // if yes,
        // check that top meta edge is part of another meta edge
        if (visibleGM.edgeToMetaEdgeMap.has(topMetaEdge.ID)) {
          // if yes call the function again and pass top meta edge
          topMetaEdge = this.getTopMetaEdge(topMetaEdge, visibleGM);
        }
        // return top meta edge
        return topMetaEdge;
      }
      // return meta edge (since top meta edge is undfined, meaning given meta edge is not part of any other meta edge)
      return metaEdge;
    }
    static recursiveExpand(edgeID, visibleGM, bringBack = true) {
      let metaEdge = visibleGM.edgeToMetaEdgeMap.get(edgeID);
      let parentMetaEdge = visibleGM.edgeToMetaEdgeMap.get(metaEdge.ID);
      if (parentMetaEdge != undefined) {
        if (parentMetaEdge.originalEdges.length == 1) {
          if (!visibleGM.edgesMap.has(metaEdge.ID) && bringBack) {
            let sourceInVisible = visibleGM.nodesMap.get(metaEdge.source.ID);
            let targetInVisible = visibleGM.nodesMap.get(metaEdge.target.ID);
            // if source and target are visible
            if (sourceInVisible && targetInVisible) {
              // check if source and target of incident edge have same owner graph (not an intergraph edge)
              if (sourceInVisible.owner == targetInVisible.owner) {
                // add the meta edge to sibling graph of owner of incident edge (incident edge is from invisible graph)
                sourceInVisible.owner.addEdge(
                  metaEdge,
                  sourceInVisible,
                  targetInVisible
                );
              } else {
                // source and target have different owner graphs (is an inter graph edge)
                // add meta edge as inter graph edge between visible source and target nodes
                visibleGM.addInterGraphEdge(
                  metaEdge,
                  sourceInVisible,
                  targetInVisible
                );
              }
              //  add meta edge to visible edges map
              visibleGM.edgesMap.set(metaEdge.ID, metaEdge);
              return metaEdge;
            }
          } else {
            return metaEdge;
          }
        } else {
          return this.recursiveExpand(metaEdge.ID, visibleGM);
        }
      }
      return ["None", metaEdge];
    }

    static getVisibleParent(nodeID, mainGM) {
      let node = mainGM.nodesMap.get(nodeID);
      if(node){
        if (node.isVisible) {
          return node.ID;
        } else {
          return this.getVisibleParent(node.owner.parent.ID, mainGM);
        }
      }else {
        return undefined;
      }
    }

      // function to bring node back to visible and all its incident edges
      static moveNodeToVisible(node, visibleGM, mainGM, nodeToBeExpanded = {
        ID: undefined
      }) {
        // initlaize the list of lists to report edges (to be added) and meta edges (to be removed)
        // Structure = [ [edges] , [meta edges( to be removed)],[meta edges (to be added)]]
        var edgeIDList = [[], [], []];
        let edgesToBeProcessed = [];
        // set visbile flag of given node to true (marking it as processed)
        node.isVisible = true;
        // create new node with same nodeID as given node
        let nodeForVisible = new Node(node.ID);
        // add new node to the sibling graph of owner of the given node (given node is node form invisible GM)
        let newNode = node.owner.siblingGraph.addNode(nodeForVisible);
        // add new node to the nodes map of visible GM
        visibleGM.nodesMap.set(newNode.ID, newNode);
        // if given node has child graph ( meaning it is a compound node)
        if (node.child) {
          // chekc if given node is not collapsed
          if (node.isCollapsed == false) {
            // add an empty graph as child graph to new visible node
            let newGraph = visibleGM.addGraph(new Graph(null, visibleGM), nodeForVisible);
            // set siblingGraph pointer for visible and invisible child graph (so they point to each other)
            newGraph.siblingGraph = node.child;
            node.child.siblingGraph = newGraph;
          } else {
            let nodeDescendants = visibleGM.getDescendantsInorder(node);
            // loop through descendant edges
            nodeDescendants.edges.forEach(nodeDescendantEdge => {
              if (ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(nodeDescendantEdge.source.ID), mainGM.nodesMap.get(nodeToBeExpanded.ID), mainGM) || ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(nodeDescendantEdge.target.ID), mainGM.nodesMap.get(nodeToBeExpanded.ID), mainGM)) {
                edgesToBeProcessed.push(nodeDescendantEdge);
              }
            });
          }
        }
        // Structure [[edges],[metaedges (to be deleted)],[meta edges to be added]]
        let markedMetaEdges = [[], [], []];
        let addedMetaEdges = [];
        node.edges.forEach(nodeDescendantEdge => {
          if (mainGM.nodesMap.get(nodeDescendantEdge.source.ID).isVisible && mainGM.nodesMap.get(nodeDescendantEdge.target.ID).isVisible) {
            edgesToBeProcessed.push(nodeDescendantEdge);
          }
          if (ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(nodeDescendantEdge.source.ID), mainGM.nodesMap.get(nodeToBeExpanded.ID), mainGM) || ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(nodeDescendantEdge.target.ID), mainGM.nodesMap.get(nodeToBeExpanded.ID), mainGM)) {
            edgesToBeProcessed.push(nodeDescendantEdge);
          }
        });
        let tempSet = new Set(edgesToBeProcessed);
        edgesToBeProcessed = [...tempSet];
        // looping through incident edges of given node
        edgesToBeProcessed.forEach(incidentEdge => {
          //check if edge is part of a meta edge
          if (visibleGM.edgeToMetaEdgeMap.has(incidentEdge.ID)) {
            // get meta edge corresponding to edgeID from edgeToMetaEdgeMap
            let visibleMetaEdge = visibleGM.edgeToMetaEdgeMap.get(incidentEdge.ID);
            // Case (C)
            // check if meta edge is visible and meta edge's orignal edges length is 1 (meaning meta edge is created by node collapse and is visible)
            if (visibleGM.edgesMap.has(visibleMetaEdge.ID) && visibleMetaEdge.originalEdges.length == 1) {
              // delete meta edge from edges map and meta edge map
              visibleGM.edgesMap.delete(visibleMetaEdge.ID);
              visibleGM.metaEdgesMap.delete(visibleMetaEdge.ID);
              // dlete incident edge from edgeToMetaEdgemap
              visibleGM.edgeToMetaEdgeMap.delete(incidentEdge.ID);
              // report meta edge as processed (to be removed)
              // Structure  = {ID,sourceID,targetID}
              edgeIDList[1].push({
                ID: visibleMetaEdge.ID,
                sourceID: visibleMetaEdge.source.ID,
                targetID: visibleMetaEdge.target.ID
              });
              // remove meta edge from graph
              try {
                Auxiliary.removeEdgeFromGraph(visibleMetaEdge);
              } catch (ex) {}
              // check if incident edge is not filtered and not hidden and souce and target both are visible
              if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false) {
                if (incidentEdge.source.isVisible && incidentEdge.target.isVisible) {
                  // move edge to visible graph
                  Auxiliary.moveEdgeToVisible(incidentEdge, visibleGM, mainGM);
                  // report edge as processed (to be added)
                  edgeIDList[0].push(incidentEdge.ID);
                } else {
                  if (incidentEdge.source.isVisible) {
                    let targetID = this.getVisibleParent(incidentEdge.target.ID, mainGM);
                    if(targetID){
                      let target = visibleGM.nodesMap.get(targetID);
                      let newMetaEdge = Topology.addMetaEdge(incidentEdge.source.ID, target.ID, [incidentEdge.ID], visibleGM, mainGM);
                      // report incident edge as processed (to be added)
                      edgeIDList[2].push({
                        ID: newMetaEdge.ID,
                        sourceID: newMetaEdge.source.ID,
                        targetID: newMetaEdge.target.ID,
                        size: newMetaEdge.originalEdges.length,
                        compound: "T"
                      });
                    }
                  } else if (incidentEdge.target.isVisible) {
                    let sourceID = this.getVisibleParent(incidentEdge.source.ID, mainGM);
                    if(sourceID){
                      let source = visibleGM.nodesMap.get(sourceID);
                      let newMetaEdge = Topology.addMetaEdge(source.ID, incidentEdge.target.ID, [incidentEdge.ID], visibleGM, mainGM);
                      // report incident edge as processed (to be added)
                      edgeIDList[2].push({
                        ID: newMetaEdge.ID,
                        sourceID: newMetaEdge.source.ID,
                        targetID: newMetaEdge.target.ID,
                        size: newMetaEdge.originalEdges.length,
                        compound: "T"
                      });
                    }
                  } else {
                    let sourceID = this.getVisibleParent(incidentEdge.source.ID, mainGM);
                    let targetID = this.getVisibleParent(incidentEdge.target.ID, mainGM);
                    if(sourceID && targetID){
                      let source = visibleGM.nodesMap.get(sourceID);
                      let target = visibleGM.nodesMap.get(targetID);
                      let newMetaEdge = Topology.addMetaEdge(source.ID, target.ID, [incidentEdge.ID], visibleGM, mainGM);
                      // report incident edge as processed (to be added)
                      edgeIDList[2].push({
                        ID: newMetaEdge.ID,
                        sourceID: newMetaEdge.source.ID,
                        targetID: newMetaEdge.target.ID,
                        size: newMetaEdge.originalEdges.length,
                        compound: "T"
                      });
                    }
                  }
                }
              }
            } else if (visibleGM.edgesMap.has(visibleMetaEdge.ID) && visibleMetaEdge.originalEdges.length != 1) ;else {
              // Case: meta edge is not visible (CEE....)
              // check if orignal edges of meta edge have length 1 (meta edge is created by node collapse)
              if (visibleMetaEdge.originalEdges.length == 1) {
                // check if incident edge is not filtere and not hidde and source and target are visible
                if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false) {
                  if (incidentEdge.source.isVisible && incidentEdge.target.isVisible) {
                    // move incident edge to visible graph
                    Auxiliary.moveEdgeToVisible(incidentEdge, visibleGM, mainGM);
                    // report incident edge as processed (to be added)
                    edgeIDList[0].push(incidentEdge.ID);
                    // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth
                    let deleteMetaEdgeList = this.recursiveMetaEdgeUpdate(incidentEdge, visibleGM, mainGM);
                    // report meta edges deleted by recursiveMetaEdgeUpdate function as processed and add them to the list of reported meta edges (to be removed)
                    edgeIDList[1] = [...edgeIDList[1], ...deleteMetaEdgeList[0]];
                    edgeIDList[0] = [...edgeIDList[0], ...deleteMetaEdgeList[1]];
                  } else {
                    if (incidentEdge.source.isVisible) {
                      let targetID = this.getVisibleParent(incidentEdge.target.ID, mainGM);
                      if(targetID){
                        if (ExpandCollapse.incidentEdgeIsOutOfScope(incidentEdge.source, mainGM.nodesMap.get(targetID), mainGM)) {
                          // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth
                          let deleteMetaEdgeList = this.recursiveMetaEdgeUpdate(incidentEdge, visibleGM, mainGM);
                          // report meta edges deleted by recursiveMetaEdgeUpdate function as processed and add them to the list of reported meta edges (to be removed)
                          edgeIDList[1] = [...edgeIDList[1], ...deleteMetaEdgeList[0]];
                          edgeIDList[0] = [...edgeIDList[0], ...deleteMetaEdgeList[1]];
                          let target = visibleGM.nodesMap.get(targetID);
                          let newMetaEdge = Topology.addMetaEdge(incidentEdge.source.ID, target.ID, [incidentEdge.ID], visibleGM, mainGM);
                          // report incident edge as processed (to be added)
                          edgeIDList[2].push({
                            ID: newMetaEdge.ID,
                            sourceID: newMetaEdge.source.ID,
                            targetID: newMetaEdge.target.ID,
                            size: newMetaEdge.originalEdges.length,
                            compound: "T"
                          });
                        }
                      }
                    } else if (incidentEdge.target.isVisible) {
                      let sourceID = this.getVisibleParent(incidentEdge.source.ID, mainGM);
                      if(sourceID){
                        if (ExpandCollapse.incidentEdgeIsOutOfScope(incidentEdge.target, mainGM.nodesMap.get(sourceID), mainGM)) {
                          // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth
                          let deleteMetaEdgeList = this.recursiveMetaEdgeUpdate(incidentEdge, visibleGM, mainGM);
                          // report meta edges deleted by recursiveMetaEdgeUpdate function as processed and add them to the list of reported meta edges (to be removed)
                          edgeIDList[1] = [...edgeIDList[1], ...deleteMetaEdgeList[0]];
                          edgeIDList[0] = [...edgeIDList[0], ...deleteMetaEdgeList[1]];
                          let source = visibleGM.nodesMap.get(sourceID);
                          let newMetaEdge = Topology.addMetaEdge(source.ID, incidentEdge.target.ID, [incidentEdge.ID], visibleGM, mainGM);
                          // report incident edge as processed (to be added)
                          edgeIDList[2].push({
                            ID: newMetaEdge.ID,
                            sourceID: newMetaEdge.source.ID,
                            targetID: newMetaEdge.target.ID,
                            size: newMetaEdge.originalEdges.length,
                            compound: "T"
                          });
                        }
                      }
                    } else {
                      let sourceID = this.getVisibleParent(incidentEdge.source.ID, mainGM);
                      let targetID = this.getVisibleParent(incidentEdge.target.ID, mainGM);
                      if(sourceID && targetID && sourceID != targetID){
                        if (ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(targetID), mainGM.nodesMap.get(sourceID), mainGM) && ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(sourceID), mainGM.nodesMap.get(targetID), mainGM)) {
                          // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth
                          let deleteMetaEdgeList = this.recursiveMetaEdgeUpdate(incidentEdge, visibleGM, mainGM);
                          // report meta edges deleted by recursiveMetaEdgeUpdate function as processed and add them to the list of reported meta edges (to be removed)
                          edgeIDList[1] = [...edgeIDList[1], ...deleteMetaEdgeList[0]];
                          edgeIDList[0] = [...edgeIDList[0], ...deleteMetaEdgeList[1]];
                          let source = visibleGM.nodesMap.get(sourceID);
                          let target = visibleGM.nodesMap.get(targetID);
                          let newMetaEdge = Topology.addMetaEdge(source.ID, target.ID, [incidentEdge.ID], visibleGM, mainGM);
                          // report incident edge as processed (to be added)
                          edgeIDList[2].push({
                            ID: newMetaEdge.ID,
                            sourceID: newMetaEdge.source.ID,
                            targetID: newMetaEdge.target.ID,
                            size: newMetaEdge.originalEdges.length,
                            compound: "T"
                          });
                        }
                      }
                    }
                  }
                }
              } else {
                // Case (...EEC)
                // Case meta edge is not visible and length of its orignal ends is greater than 1 ( meta edge is not created by node collapse)
                //checks if given meta edge is part of any other meta edge, if yes returns the top one (only for cases where given meta edge is not created by node collapse.)
                visibleMetaEdge = this.getTopMetaEdge(visibleMetaEdge, visibleGM);
                // check if the returned top meta edge was created  by collapse or not
                if (visibleMetaEdge.originalEdges.length == 1) {
                  let res = this.recursiveExpand(incidentEdge.ID, visibleGM);
                  if (!Array.isArray(res)) {
                    if (!markedMetaEdges[1].includes(visibleMetaEdge)) {
                      markedMetaEdges[1].push(visibleMetaEdge);
                    }
                    // report incident edge as processed (to be added)
                    edgeIDList[0].push(res.ID);
                  } else {
                    if (!markedMetaEdges[1].includes(visibleMetaEdge)) {
                      markedMetaEdges[1].push(visibleMetaEdge);
                    }
                    if (!markedMetaEdges[2].includes(res[1])) {
                      markedMetaEdges[2].push(res[1]);
                    }
                  }
                } else {
                  // Case (...ECE...)
                  // Case: top meta edge is not created by node collapse

                  let res = this.recursiveExpand(incidentEdge.ID, visibleGM, false);
                  if (!Array.isArray(res)) {
                    // report incident edge as processed (to be added)
                    edgeIDList[0].push(visibleMetaEdge.ID);
                    // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth
                    let deleteMetaEdgeList = this.recursiveMetaEdgeUpdate(res, visibleGM, mainGM);
                    // report meta edges deleted by recursiveMetaEdgeUpdate function as processed and add them to the list of reported meta edges (to be removed)
                    edgeIDList[1] = [...edgeIDList[1], ...deleteMetaEdgeList[0]];
                    edgeIDList[0] = [...edgeIDList[0], ...deleteMetaEdgeList[1]];
                    visibleMetaEdge = res;
                  }

                  // get soruce and target of top meta edge
                  let sourceInVisible = visibleGM.nodesMap.get(visibleMetaEdge.source.ID);
                  let targetInVisible = visibleGM.nodesMap.get(visibleMetaEdge.target.ID);
                  // if source and target are visible
                  if (sourceInVisible && targetInVisible) {
                    // check if source and target of incident edge have same owner graph (not an intergraph edge)
                    if (incidentEdge.source.owner == incidentEdge.target.owner) {
                      // add the meta edge to sibling graph of owner of incident edge (incident edge is from invisible graph)
                      if (!FilterUnfilter.updateMetaEdge(visibleMetaEdge.originalEdges, null, visibleGM, mainGM)) {
                        try {
                          let newEdge = incidentEdge.source.owner.siblingGraph.addEdge(visibleMetaEdge, sourceInVisible, targetInVisible);
                          addedMetaEdges.push(visibleMetaEdge);
                        } catch (e) {}
                      }
                    } else {
                      // source and target have different owner graphs (is an inter graph edge)
                      // add meta edge as inter graph edge between visible source and target nodes

                      if (!FilterUnfilter.updateMetaEdge(visibleMetaEdge.originalEdges, null, visibleGM, mainGM)) {
                        try {
                          let newEdge = visibleGM.addInterGraphEdge(visibleMetaEdge, sourceInVisible, targetInVisible);
                          addedMetaEdges.push(visibleMetaEdge);
                        } catch (e) {}
                      }
                    }
                    if (!FilterUnfilter.updateMetaEdge(visibleMetaEdge.originalEdges, null, visibleGM, mainGM)) {
                      //  add meta edge to visible edges map
                      visibleGM.edgesMap.set(visibleMetaEdge.ID, visibleMetaEdge);
                      // report meta edge as processed (to be added)
                      edgeIDList[0].push(visibleMetaEdge.ID);
                    }
                  } else if (ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(visibleMetaEdge.source.ID).isVisible ? mainGM.nodesMap.get(visibleMetaEdge.target.ID) : mainGM.nodesMap.get(visibleMetaEdge.source.ID), mainGM.nodesMap.get(nodeToBeExpanded.ID), mainGM)) {
                    if (sourceInVisible) {
                      let targetID = this.getVisibleParent(visibleMetaEdge.target.ID, mainGM);
                      if(targetID){
                        if (ExpandCollapse.incidentEdgeIsOutOfScope(incidentEdge.source.isVisible ? incidentEdge.target : incidentEdge.source, mainGM.nodesMap.get(targetID), mainGM)) {
                          let target = visibleGM.nodesMap.get(targetID);
                          let newMetaEdge = Topology.addMetaEdge(visibleMetaEdge.source.ID, target.ID, [visibleMetaEdge.ID], visibleGM, mainGM);
                          // report incident edge as processed (to be added)
                          edgeIDList[2].push({
                            ID: newMetaEdge.ID,
                            sourceID: newMetaEdge.source.ID,
                            targetID: newMetaEdge.target.ID,
                            size: newMetaEdge.originalEdges.length,
                            compound: "T"
                          });
                        }
                      }
                    } else {
                      let sourceID = this.getVisibleParent(visibleMetaEdge.source.ID, mainGM);
                      if(sourceID){
                        if (ExpandCollapse.incidentEdgeIsOutOfScope(incidentEdge.source.isVisible ? incidentEdge.target : incidentEdge.source, mainGM.nodesMap.get(sourceID), mainGM)) {
                          let source = visibleGM.nodesMap.get(sourceID);
                          let newMetaEdge = Topology.addMetaEdge(source.ID, visibleMetaEdge.target.ID, [visibleMetaEdge.ID], visibleGM, mainGM);
                          // report incident edge as processed (to be added)
                          edgeIDList[2].push({
                            ID: newMetaEdge.ID,
                            sourceID: newMetaEdge.source.ID,
                            targetID: newMetaEdge.target.ID,
                            size: newMetaEdge.originalEdges.length,
                            compound: "T"
                          });
                        }
                      }
                    }
                  }
                }
              }
            }
          } else {
            // incident edge is a normal edge
            // check if incident edge is not filtered not hidded and soruce and target are visible
            if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false && incidentEdge.source.isVisible && incidentEdge.target.isVisible) {
              // move incident edge to visible graph
              Auxiliary.moveEdgeToVisible(incidentEdge, visibleGM, mainGM);
              // report incident edge as processed (to be added)
              edgeIDList[0].push(incidentEdge.ID);
            }
          }
        });
        if (markedMetaEdges[0].length != 0 || markedMetaEdges[1].length != 0) {
          markedMetaEdges[1].forEach(metaEdge => {
            // if yes deleted top meta edge
            visibleGM.edgesMap.delete(metaEdge.ID);
            visibleGM.metaEdgesMap.delete(metaEdge.ID);
            // report top meta edge as processed (to be removed)
            // Structure = {ID,sourceID,targetID}
            edgeIDList[1].push({
              ID: metaEdge.ID,
              sourceID: metaEdge.source.ID,
              targetID: metaEdge.target.ID
            });
            // remvoe meta edge from graph
            try {
              Auxiliary.removeEdgeFromGraph(metaEdge);
            } catch (ex) {}
          });
          markedMetaEdges[2].forEach(edge => {
            if (visibleGM.nodesMap.has(edge.source.ID)) {
              let targetID = this.getVisibleParent(edge.target.ID, mainGM);
              if(targetID){
                let target = visibleGM.nodesMap.get(targetID);
                if (ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(edge.source.ID), mainGM.nodesMap.get(targetID), mainGM)) {
                  let newMetaEdge = Topology.addMetaEdge(edge.source.ID, target.ID, [edge.ID], visibleGM, mainGM);
                  // report incident edge as processed (to be added)
                  edgeIDList[2].push({
                    ID: newMetaEdge.ID,
                    sourceID: newMetaEdge.source.ID,
                    targetID: newMetaEdge.target.ID,
                    size: newMetaEdge.originalEdges.length,
                    compound: "T"
                  });
                }
              }
            } else if (edge.target.isVisible) {
              let sourceID = this.getVisibleParent(edge.source.ID, mainGM);
              if(sourceID){
                let source = visibleGM.nodesMap.get(sourceID);
                if (ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(edge.target.ID), mainGM.nodesMap.get(sourceID), mainGM)) {
                  let newMetaEdge = Topology.addMetaEdge(source.ID, edge.target.ID, [edge.ID], visibleGM, mainGM);
                  // report incident edge as processed (to be added)
                  edgeIDList[2].push({
                    ID: newMetaEdge.ID,
                    sourceID: newMetaEdge.source.ID,
                    targetID: newMetaEdge.target.ID,
                    size: newMetaEdge.originalEdges.length,
                    compound: "T"
                  });
                }
              }
            } else {
              let sourceID = this.getVisibleParent(edge.source.ID, mainGM);
              let targetID = this.getVisibleParent(edge.target.ID, mainGM);
              if(sourceID && targetID && sourceID != targetID){
                let source = visibleGM.nodesMap.get(sourceID);
                let target = visibleGM.nodesMap.get(targetID);
                if (ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(sourceID), mainGM.nodesMap.get(targetID), mainGM) && ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(targetID), mainGM.nodesMap.get(sourceID), mainGM)) {
                  let newMetaEdge = Topology.addMetaEdge(source.ID, target.ID, [edge.ID], visibleGM, mainGM);
                  // report incident edge as processed (to be added)
                  edgeIDList[2].push({
                    ID: newMetaEdge.ID,
                    sourceID: newMetaEdge.source.ID,
                    targetID: newMetaEdge.target.ID,
                    size: newMetaEdge.originalEdges.length,
                    compound: "T"
                  });
                }
              }
            }
          });
        }

        // return the list of list to be reported
        // Structure = [ [edges] , [meta edges( to be removed)],[meta edges (to be added)]]
        return edgeIDList;
      }

    // fuunction to move edge to visible graph
    static moveEdgeToVisible(edge, visibleGM, mainGM) {
      // set visible flag of edge to true
      edge.isVisible = true;
      // create new edge fro the visible side
      let edgeForVisible = new Edge(edge.ID, null, null);
      // get source and target from visible graph
      let sourceInVisible = visibleGM.nodesMap.get(edge.source.ID);
      let targetInVisible = visibleGM.nodesMap.get(edge.target.ID);
      // initialize new edge
      let newEdge;
      // check if owner graph of soruce and target are same (not an inter graph edge)
      if (edge.source.owner == edge.target.owner) {
        try{
          // add new edge to sibling graph of owner of given edge (given edge is from invisible graph)
          newEdge = edge.source.owner.siblingGraph.addEdge(
            edgeForVisible,
            sourceInVisible,
            targetInVisible
          );
          visibleGM.edgesMap.set(newEdge.ID, newEdge);
        }catch(e){

        }    //  add new edge to visible edges map
      } else {
        // owner graph of soruce and target are different (is an inter graph edge)
        newEdge = visibleGM.addInterGraphEdge(
          edgeForVisible,
          sourceInVisible,
          targetInVisible
        );
          //  add new edge to visible edges map
          visibleGM.edgesMap.set(newEdge.ID, newEdge);
      }

    }

    // fucntion to get elements from neighbourhood of a given node
    static getTargetNeighborhoodElements(nodeID, mainGM) {
      // get node from invisible graph
      let node = mainGM.nodesMap.get(nodeID);
      //get zero distance Neighborhood
      // list of node that can be reached from given node with zero distance, all parents, all children and sibilings at all levels
      // Structure = { nodes: [nodes], edges: [edges]}
      let neighborhood = this.getZeroDistanceNeighbors(node, mainGM);
      // check if zero neighbourhood list includes the given node or not (if given node is the top level node in its tree structure it will not be included int he zero neighbourhood list)
      // if not add it to the list
      if (!neighborhood.nodes.includes(nodeID)) {
        neighborhood.nodes.push(nodeID);
      }
      // initalize object to report all nodes and edges in neighbourhood of given node
      // Structure = { nodes: [nodes], edges: [edges]}
      let neighborElements = {
        nodes: [],
        edges: [],
      };
      //for each 0 distance neighborhood node get 1 distance nodes and edges
      neighborhood["nodes"].forEach((neighborNodeID) => {
        let neighborNode = mainGM.nodesMap.get(neighborNodeID);
        neighborNode.edges.forEach((edge) => {
          if (edge.source.ID == neighborNode.ID) {
            neighborElements["nodes"].push(edge.target.ID);
          } else {
            neighborElements["nodes"].push(edge.source.ID);
          }
          neighborElements["edges"].push(edge.ID);
        });
      });
      // remove all duplicates from 1 distance neighbourhood
      neighborElements["nodes"] = [...new Set([...neighborElements["nodes"]])];
      neighborElements["edges"] = [...new Set([...neighborElements["edges"]])];

      //for each 1 distance node, calculate individual zero distance neighborhood and append it to the orignal dictionary
      neighborElements["nodes"].forEach((neighborElementID) => {
        let targetNeighborNode = mainGM.nodesMap.get(neighborElementID);
        let targetNeighborhood = this.getZeroDistanceNeighbors(
          targetNeighborNode,
          mainGM
        );
        neighborhood["nodes"] = [
          ...new Set([...neighborhood["nodes"], ...targetNeighborhood["nodes"]]),
        ];
        neighborhood["edges"] = [
          ...new Set([...neighborhood["edges"], ...targetNeighborhood["edges"]]),
        ];
      });

      //remove duplications
      neighborhood["nodes"] = [
        ...new Set([...neighborhood["nodes"], ...neighborElements["nodes"]]),
      ];
      neighborhood["edges"] = [
        ...new Set([...neighborhood["edges"], ...neighborElements["edges"]]),
      ];

      //filter out all visible nodes
      neighborhood["nodes"] = neighborhood["nodes"].filter((itemID) => {
        let itemNode = mainGM.nodesMap.get(itemID);
        return !itemNode.isVisible;
      });

      //filter out all visible edges
      neighborhood["edges"] = neighborhood["edges"].filter((itemID) => {
        let itemEdge = mainGM.edgesMap.get(itemID);
        return !itemEdge.isVisible;
      });

      return neighborhood;
    }

    // function to get zero neighbourhood element of given node
    static getZeroDistanceNeighbors(node, mainGM) {
      // initialize neighbourhood object
      // Structure = {[nodes],[edges]}
      let neighbors = {
        nodes: [],
        edges: [],
      };
      // function to get the descendant of given node
      // Structure = {[nodes],[edges]}
      let descendantNeighborhood = this.getDescendantNeighbors(node);
      // function to get the parents of the given ndoe
      // Structure = {[nodes],[edges]}
      let predecessorsNeighborhood = this.getPredecessorNeighbors(
        node,
        mainGM
      );
      // append decendant neighbourhood elements and parent neighbourhood elements to neighbourhood object
      neighbors["nodes"] = [
        ...new Set([
          ...descendantNeighborhood["nodes"],
          ...predecessorsNeighborhood["nodes"],
        ]),
      ];
      neighbors["edges"] = [
        ...new Set([
          ...descendantNeighborhood["edges"],
          ...predecessorsNeighborhood["edges"],
        ]),
      ];

      // return neighbourhood object
      // Structure = {[nodes],[edges]}
      return neighbors;
    }

    // function to get descendants of a given node
    static getDescendantNeighbors(node) {
      // initialize neighbourhood object
      // Structure = {[nodes],[edges]}
      let neighbors = {
        nodes: [],
        edges: [],
      };
      // if given node is compound node
      if (node.child) {
        // get nodes of children graph
        let children = node.child.nodes;
        // loop through children nodes
        children.forEach((childNode) => {
          // report child node as processed
          neighbors.nodes.push(childNode.ID);
          // loop through incident edges of child node
          childNode.edges.forEach((element) => {
            // report incident edge as processed
            neighbors.edges.push(element.ID);
          });
          // function to get the descendant of given node
          // Structure = {[nodes],[edges]}
          let nodesReturned = this.getDescendantNeighbors(childNode);
          // append decendant neighbourhood elements and parent neighbourhood elements to neighbourhood object
          neighbors["nodes"] = [...neighbors["nodes"], ...nodesReturned["nodes"]];
          neighbors["edges"] = [...neighbors["edges"], ...nodesReturned["edges"]];
        });
      }
      // return neighbourhood object
      // Structure = {[nodes],[edges]}
      return neighbors;
    }

    // function to get predecessors of a given node
    static getPredecessorNeighbors(node, mainGM) {
      // initialize neighbourhood object
      // Structure = {[nodes],[edges]}
      let neighbors = {
        nodes: [],
        edges: [],
      };
      // check if owner graph of given node is not root graph
      if (node.owner != mainGM.rootGraph) {
        // get nodes of the owner graph
        let predecessors = node.owner.nodes;
        // loop through predecessor nodes
        predecessors.forEach((pNode) => {
          // report predecessor node as processed
          neighbors["nodes"].push(pNode.ID);
          // loop through edges of the predecessor node
          pNode.edges.forEach((element) => {
            // report edge as processed
            neighbors.edges.push(element.ID);
          });
        });
        // function to get the parents of the given ndoe
        // Structure = {[nodes],[edges]}
        let nodesReturned = this.getPredecessorNeighbors(
          node.owner.parent,
          mainGM
        );
        // append decendant neighbourhood elements and parent neighbourhood elements to neighbourhood object
        neighbors["nodes"] = [...neighbors["nodes"], ...nodesReturned["nodes"]];
        neighbors["edges"] = [...neighbors["edges"], ...nodesReturned["edges"]];
      } else {
        // if owner graph of given node is the root graph
        // report the given node as processed
        neighbors["nodes"].push(node.ID);
      }
      // return neighbourhood object
      // Structure = {[nodes],[edges]}
      return neighbors;
    }
  }

  class HideShow {

    static hide(nodeIDList, edgeIDList, visibleGM, mainGM) {

      // Lists to return back to api to indicate modified elements
      let nodeIDListPostProcess = [];
      let edgeIDListPostProcess = [];
      // looping through given list of edges to hide
      edgeIDList.forEach(edgeID => {
        // get edge from visible GM
        let edgeToHide = visibleGM.edgesMap.get(edgeID);
        // if visible
        if (edgeToHide) {
            if(visibleGM.edgesMap.has(edgeID)){
              // delete from visible map
              visibleGM.edgesMap.delete(edgeToHide.ID);
              // remove edge from graph of visibleGM
              Auxiliary.removeEdgeFromGraph(edgeToHide);
            }
            //report edge as processed
            edgeIDListPostProcess.push(edgeID);
        }else {
          // edge is not visible
          // if edge is part of a meta edge
            if (visibleGM.edgeToMetaEdgeMap.has(edgeID)) {
              // get that meta edge
              let visibleMetaEdge = visibleGM.edgeToMetaEdgeMap.get(edgeID);
              // call updateMetaEdge function to check if all edges who are part of meta edge are filtered or hidden
              // if yes remove said meta edge
              let status = this.updateMetaEdge(visibleMetaEdge.originalEdges, edgeID,visibleGM,mainGM);
              // if yes remove said meta edge from visible graph
              if (status) {
                if(visibleGM.edgesMap.has(visibleMetaEdge.ID)){
                  // delete meta edge from visibleGM's map
                  visibleGM.edgesMap.delete(visibleMetaEdge.ID);
                  // Remove meta edge from graph
                  Auxiliary.removeEdgeFromGraph(visibleMetaEdge);
                }
                // Report meta edge as processed
                edgeIDListPostProcess.push(visibleMetaEdge.ID);
              }
            }
          
        }
        // get corresponding edge in invisible side
        let edgeToHideInvisible = mainGM.edgesMap.get(edgeID);
        // set hidden status to tru and visible status to false.
        if(edgeToHideInvisible){
          edgeToHideInvisible.isHidden = true;
          edgeToHideInvisible.isVisible = false;
        }
      });
      // loop through list of nodes to hide
      nodeIDList.forEach((nodeID) => {
        // get node from visible graph
        let nodeToHide = visibleGM.nodesMap.get(nodeID);
        // if node is visible
        if (nodeToHide) {
          // get all descendants of node to to hide, this will not include given node.
          // return object with 
          // descenedant edges as edges
          // descendant simple nodes and compound nodes as simpleNodes and compoundNodes respectively.
          let nodeToHideDescendants =
            visibleGM.getDescendantsInorder(nodeToHide);
            // loop through descendant edges
          nodeToHideDescendants.edges.forEach((nodeToHideEdge) => {
            // report edge as processed
            edgeIDListPostProcess.push(nodeToHideEdge.ID);
            // if edge is not a meta edge
            if (!(nodeToHideEdge instanceof MetaEdge)) {
              // get corresponding edge on invisible side and set visible status false
              let nodeToHideEdgeInvisible = mainGM.edgesMap.get(nodeToHideEdge.ID);
              nodeToHideEdgeInvisible.isVisible = false;
            }
            if(visibleGM.edgesMap.has(nodeToHideEdge.ID)){
              // delete edge from visible side
              visibleGM.edgesMap.delete(nodeToHideEdge.ID);
              // delete edge from grpah
              Auxiliary.removeEdgeFromGraph(nodeToHideEdge);
            }
          });
          // loop through descendant simple nodes
          nodeToHideDescendants.simpleNodes.forEach((nodeToHideSimpleNode) => {
            // get corresponding node in invisible graph and set visible status to false
            let nodeToHideSimpleNodeInvisible = mainGM.nodesMap.get(nodeToHideSimpleNode.ID);
            nodeToHideSimpleNodeInvisible.isVisible = false;
            // report node as processed
            nodeIDListPostProcess.push(nodeToHideSimpleNode.ID);
            // remove node from visible graph and viisble nodes map
            nodeToHideSimpleNode.owner.removeNode(nodeToHideSimpleNode);
            visibleGM.nodesMap.delete(nodeToHideSimpleNode.ID);
          });
          // loop through descendant compound nodes
          nodeToHideDescendants.compoundNodes.forEach(
            (nodeToHideCompoundNode) => {
              // get corresponding compound node in invisible graph and set visible status as false
              let nodeToHideCompoundNodeInvisible = mainGM.nodesMap.get(nodeToHideCompoundNode.ID);
              nodeToHideCompoundNodeInvisible.isVisible = false;
              // report compoound node as processed
              nodeIDListPostProcess.push(nodeToHideCompoundNode.ID);
              // if compound nodes has not child left set corresponding sibling grpah on invisible side as null.
              if (nodeToHideCompoundNode.child.nodes.length == 0) {
                nodeToHideCompoundNode.child.siblingGraph.siblingGraph = null;
              }
              //  remove child graph of the compound node
              visibleGM.removeGraph(nodeToHideCompoundNode.child);
              // remove compound node from visible graph and nodes map
              nodeToHideCompoundNode.owner.removeNode(nodeToHideCompoundNode);
              visibleGM.nodesMap.delete(nodeToHideCompoundNode.ID);
            }
          );
          // if node has a child graph (meaning its a compound node) and there are not child nodes
          if (nodeToHide.child && nodeToHide.child.nodes.length == 0) {
            // set corresponding sibling graph on invisible side as null
            nodeToHide.child.siblingGraph.siblingGraph = null;
          }
          // if node has a child graph (meaning its a compound node) 
          if(nodeToHide.child){
            // remove child graph from visible graph
          visibleGM.removeGraph(nodeToHide.child);
          }
          // remove said node from visible graph and delete it from nodes map
          nodeToHide.owner.removeNode(nodeToHide);
          visibleGM.nodesMap.delete(nodeID);
          // report node as processed
          nodeIDListPostProcess.push(nodeID);
          // get corresponding node in invisible graph and set hidden status true and visible status false.
          let nodeToHideInvisible = mainGM.nodesMap.get(nodeID);
          nodeToHideInvisible.isHidden = true;
          nodeToHideInvisible.isVisible = false;
        }
        else {
          //  if node is not visible
          // get corresponding node from invisible graph and set hidden status true and visible status false
          let nodeToHideInvisible = mainGM.nodesMap.get(nodeID);
          nodeToHideInvisible.isHidden = true;
          nodeToHideInvisible.isVisible = false;
        }
      });
      // turn reported edge list to a set (to remove potential duplicates)
      edgeIDListPostProcess = new Set(edgeIDListPostProcess);
      edgeIDListPostProcess = [...edgeIDListPostProcess];
      // combine edgelist and nodelist and to return. (edge first and nodes latter)
      // if nodes are removed first it cause problem, so report all edges first.
      return edgeIDListPostProcess.concat(nodeIDListPostProcess);
    }

    static show(nodeIDList, edgeIDList, visibleGM, mainGM) {
      // lists to report processed nodes and edges.
      let nodeIDListPostProcess = [];
      let edgeIDListPostProcess = [];
      let metaEdgeIDListPostProcess = [];
      // loop through nodes to show
      nodeIDList.forEach((nodeID) => {
        // get node from invisible graph and set hidden status to false
        let nodeToShow = mainGM.nodesMap.get(nodeID);
        nodeToShow.isHidden = false;
        // set status flag,  that node is allowed to be shown, initalized as true
        let canNodeToShowBeVisible = true;
        // if node is not filtered 
        if (nodeToShow.isFiltered == false) {
          // create temporary copy for node to Show
          let tempNode = nodeToShow;
          // following loop check node's parent and their parent and their parent to make sure that at all levels
          // there is nothing hiden, collapse or filtered.
          // infinite loop until we find that node can not be Showed or we reach root graph.
          while (true) {
            //if next owner graph is root gaph (meaning no more parents)
            if (tempNode.owner == mainGM.rootGraph) {
              break;
            } else {
              // there is another parent of current node 
              // check parent of current node is not hiden, collapse or filtered.
              // if no
              if (tempNode.owner.parent.isHidden || tempNode.owner.parent.isFiltered || tempNode.owner.parent.isCollapsed) {
                // if yes then node ot Show is not allowed to be Showed. and we break loop
                canNodeToShowBeVisible = false;
                break;
              } else {
                // if yes then set current node to its parent to move up the ancestral line
                tempNode = tempNode.owner.parent;
              }
            }
          }
        } else {
          // if node is hidden then it can not be Showed
          canNodeToShowBeVisible = false;
        }
        // if node is allowed to be Showed
        if (canNodeToShowBeVisible) {
          // move node to visible along with all the associated edges that can be brought to visible side
          let tempList = Auxiliary.moveNodeToVisible(nodeToShow, visibleGM, mainGM);
          // make all the descendants of the node to Show,visible. 
          //loop though edges returned
          tempList[0].forEach(item => {
            // report edge as processed (to be added)
            if(visibleGM.edgeToMetaEdgeMap.has(item)){
              let topMetaEdge = Auxiliary.getTopMetaEdge(visibleGM.edgeToMetaEdgeMap.get(item),visibleGM);
              edgeIDListPostProcess.push(topMetaEdge.ID);
            }else {
              edgeIDListPostProcess.push(item);
            }
          });
          // loop through meta edges to be added
          tempList[2].forEach((item) => {
            metaEdgeIDListPostProcess.push(item);
          });
          let descendants = [];
          if(!nodeToShow.isCollapsed){
            descendants = FilterUnfilter.makeDescendantNodesVisible(nodeToShow, visibleGM, mainGM);
          // report all descendant edges, simple nodes and compound nodes as processed
          nodeIDListPostProcess = [...nodeIDListPostProcess, ...descendants.simpleNodes, ...descendants.compoundNodes];
          edgeIDListPostProcess = [...edgeIDListPostProcess, ...descendants.edges];
          }

          let nodeToFilterDescendants =
            visibleGM.getDescendantsInorder(nodeToShow);
            // loop through descendant edges
          nodeToFilterDescendants.edges.forEach((nodeToShowEdge) => {
            if (visibleGM.edgeToMetaEdgeMap.has(nodeToShowEdge.ID)) {
              let topMetaEdge = Auxiliary.getTopMetaEdge(visibleGM.edgeToMetaEdgeMap.get(nodeToShowEdge.ID),visibleGM);
              if(topMetaEdge.source.ID == nodeToShow.ID || topMetaEdge.target.ID == nodeToShow.ID){
                edgeIDList.push(nodeToShowEdge.ID);
              }
              
            }
          });

          // report node its self as processed.
          nodeIDListPostProcess.push(nodeToShow.ID);
        }
      });
      // loop through all the edges to Show
      edgeIDList.forEach((edgeID) => {
        // get edge from invisible graph and set hidden status to false
        let edgeToShow = mainGM.edgesMap.get(edgeID);
        edgeToShow.isHidden = false;
        // check if edge is part of a meta edge in visible graph
        if (visibleGM.edgeToMetaEdgeMap.has(edgeID)) {
          // get meta edge
          let visibleMetaEdge = visibleGM.edgeToMetaEdgeMap.get(edgeID);
          // if meta edge is visible
          if(visibleGM.edgesMap.has(visibleMetaEdge.ID));else {
            // if meta edge is not visible get source and target of meta edge from visible graph
            let sourceInVisible = visibleGM.nodesMap.get(visibleMetaEdge.source.ID);
            let targetInVisible = visibleGM.nodesMap.get(visibleMetaEdge.target.ID);
            // if source and target are visible
            if(sourceInVisible!=undefined && targetInVisible!=undefined){
              // get corresponding invisible edge for the orignal edge to Show
              let invisibleEdge = mainGM.edgesMap.get(edgeID);
              // if source and target of invisible side edge has same owner graph (meaning they belong in same graph and edge is not inter graph edge)
              if (invisibleEdge.source.owner == invisibleEdge.target.owner) {
                // add meta edge to the sibling side of the invisible edge's owner graph. (doing it from invisible side because there is no way to access visible graph directly)
                // (the meta edge we have is not part of any graph.)
                invisibleEdge.source.owner.siblingGraph.addEdge(visibleMetaEdge, sourceInVisible, targetInVisible);
              }
              else {
                // if source and target of invisible side edge does not has same owner graph (meaning it will be inter graph edge)
                // add meta edge as inter graph edge
                visibleGM.addInterGraphEdge(visibleMetaEdge, sourceInVisible, targetInVisible);
              }
              //  add meta edge to visible graphs edge map (to bring it to visible side)
              visibleGM.edgesMap.set(visibleMetaEdge.ID, visibleMetaEdge);
              // report meta edge as processed.
              edgeIDListPostProcess.push(visibleMetaEdge.ID);
            
            }
          }
          }else {
            // if edge is not part of any meta edge
            // check if edge is not hidden and source and target of edge are visible
            // if yes
            if (edgeToShow.isHidden == false && edgeToShow.source.isVisible && edgeToShow.target.isVisible) {
              // bring edge to visible side
              Auxiliary.moveEdgeToVisible(edgeToShow, visibleGM, mainGM);
              // report edge as processed.
              edgeIDListPostProcess.push(edgeToShow.ID);
            }          
          }
      });
      // create set of the prcessed edge (to remove duplications)
      edgeIDListPostProcess = new Set(edgeIDListPostProcess);
      // turn set back to array
      edgeIDListPostProcess = [...edgeIDListPostProcess];
      // combine node and edge list.
      // report nodes first then edges
      // (if edges are reported first they will be added first and without source and target nodes present cytoscpae will give error) 
      return [nodeIDListPostProcess.concat(edgeIDListPostProcess),metaEdgeIDListPostProcess];

    }

    static showAll(visibleGM, mainGM) {
      let hiddenNodeIDList = [];
      let hiddenEdgeIDList = [];
      mainGM.nodesMap.forEach((node, NodeID) => {
        if (node.isHidden) {
          hiddenNodeIDList.push(node.ID);
        }
      });
      mainGM.edgesMap.forEach((edge, EdgeID) => {
        if (edge.isHidden) {
          hiddenEdgeIDList.push(edge.ID);
        }
      });
      return this.show(hiddenNodeIDList, hiddenEdgeIDList, visibleGM, mainGM);
    }
  }

  /**
   * This class is responsible for the communication between CMGM core 
   * and the outside world via API functions. These API functions include
   * both the ones used to synchronize CMGM with the graph model of Rendering
   * Library (RL) when any topological changes occur on the renderer’s side
   * and the ones related to the complexity management operations.
   */
  class ComplexityManager {
    // Graph manager that is responsible from visible compound graph
    #visibleGraphManager;

    // Graph manager that is responsible from invisible compound graph
    #mainGraphManager;

    /**
     * Constructor
     */
    constructor() {
      this.#visibleGraphManager = this.#newGraphManager(true);
      this.#mainGraphManager = this.#newGraphManager(false);
      // Set sibling graph managers
      this.#visibleGraphManager.siblingGraphManager = this.#mainGraphManager;
      this.#mainGraphManager.siblingGraphManager = this.#visibleGraphManager;
    }

    // Get methods
    get visibleGraphManager() {
      return this.#visibleGraphManager;
    }

    get mainGraphManager() {
      return this.#mainGraphManager;
    }

    /*
      * This method creates a new graph manager responsible for either
      * visible or invisible graph based on the input and returns it.
      */
    #newGraphManager(isVisible) {
      let gm = new GraphManager(this, isVisible);
      return gm;
    }

    /**
     * This method creates a new graph in the graph manager associated with the input.
     */
    newGraph(graphManager) {
      return new Graph(null, graphManager);
    }

    /**
     * This method creates a new node associated with the input view node.
     */
    newNode(ID) {
      let nodeID = ID ? ID : Auxiliary.createUniqueID();
      return new Node(nodeID);
    }

    // Topology related API methods

    addNode(nodeID, parentID) {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      Topology.addNode(nodeID, parentID, visibleGM, mainGM);
    }

    addEdge(edgeID, sourceID, targetID) {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      Topology.addEdge(edgeID, sourceID, targetID, visibleGM, mainGM);
    }

    removeNode(nodeID) {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      Topology.removeNode(nodeID, visibleGM, mainGM);
    }

    removeEdge(edgeID) {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      Topology.removeEdge(edgeID, visibleGM, mainGM);
    }

    reconnect(edgeID, newSourceID, newTargetID) {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      Topology.reconnect(edgeID, newSourceID, newTargetID, visibleGM, mainGM);
    }

    changeParent(nodeID, newParentID) {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      Topology.changeParent(nodeID, newParentID, visibleGM, mainGM);
    }

    // Complexity management related API methods

    // filter/unfilter methods

    filter(nodeIDList, edgeIDList) {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      return FilterUnfilter.filter(nodeIDList, edgeIDList, visibleGM, mainGM);
    }

    unfilter(nodeIDList, edgeIDList) {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      return FilterUnfilter.unfilter(nodeIDList, edgeIDList, visibleGM, mainGM);
    }

    // hide/show methods

    hide(nodeIDList, edgeIDList) {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      return HideShow.hide(nodeIDList, edgeIDList, visibleGM, mainGM);
    }

    show(nodeIDList, edgeIDList) {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      return HideShow.show(nodeIDList, edgeIDList, visibleGM, mainGM);
    }

    showAll() {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      return HideShow.showAll(visibleGM, mainGM);
    }

    // expand/collapse methods

    collapseNodes(nodeIDList, isRecursive) {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      let reportedData =  ExpandCollapse.collapseNodes(nodeIDList, isRecursive, visibleGM, mainGM);
      
      return reportedData;
    }

    expandNodes(nodeIDList, isRecursive) {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      let reportedData =  ExpandCollapse.expandNodes(nodeIDList, isRecursive, visibleGM, mainGM);
      
      return reportedData;
    }

    collapseAllNodes() {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      let reportedData =  ExpandCollapse.collapseAllNodes(visibleGM, mainGM);
      
      
      return reportedData;

    }

    expandAllNodes() {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      let reportedData =  ExpandCollapse.expandAllNodes(visibleGM, mainGM);
      
      return reportedData;
    }

    collapseEdges(edgeIDList) {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      if(!visibleGM.edgesMap.has(edgeIDList[0])){
        edgeIDList.shift();
      }
      return ExpandCollapse.collapseEdges(edgeIDList, visibleGM, mainGM);
    }

    expandEdges(edgeIDList, isRecursive) {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      return ExpandCollapse.expandEdges(edgeIDList, isRecursive, visibleGM, mainGM);
    }

    collapseEdgesBetweenNodes(nodeIDList) {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      return ExpandCollapse.collapseEdgesBetweenNodes(nodeIDList, visibleGM, mainGM);
    }

    expandEdgesBetweenNodes(nodeIDList, isRecursive) {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      return ExpandCollapse.expandEdgesBetweenNodes(nodeIDList, isRecursive, visibleGM, mainGM);
    }

    collapseAllEdges() {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      return ExpandCollapse.collapseAllEdges(visibleGM, mainGM);
    }

    expandAllEdges() {
      let visibleGM = this.#visibleGraphManager;
      let mainGM = this.#mainGraphManager;
      return ExpandCollapse.expandAllEdges(visibleGM, mainGM);
    }

    getHiddenNeighbors(nodeID) {
      let mainGM = this.#mainGraphManager;
      return Auxiliary.getTargetNeighborhoodElements(nodeID, mainGM);
    }

    isCollapsible(nodeID){
      let mainGM = this.#mainGraphManager;
      let node = mainGM.nodesMap.get(nodeID);
      if(node.child && node.isCollapsed == false){
        return true;
      }
      else {
        return false
      }
    }

    isExpandable(nodeID){
      let mainGM = this.#mainGraphManager;
      let node = mainGM.nodesMap.get(nodeID);
      if(node.child && node.isCollapsed){
        return true;
      }
      else {
        return false
      }
    }

  }

  exports.ComplexityManager = ComplexityManager;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
