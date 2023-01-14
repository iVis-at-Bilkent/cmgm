/**
 * This class represents a graph manager for complexity management purposes. A graph
 * manager maintains a collection of graphs, forming a compound graph structure
 * through inclusion, and maintains its owner complexity manager, its root graph, 
 * its inter-graph edges, its sibling graph manager and the information of whether 
 * it is visible or not.
 */
export class GraphManager {
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
    this.#rootGraph = null
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
      })
    }
    node.edges.forEach((edge) => {
      descendants.edges.add(edge);
    });

    return descendants;
  }
}