/**
 * This class represents a graph. A graph maintains
 * its owner graph manager, its nodes, its intra-graph edges,
 * its parent node and its sibling graph. A graph is always
 * a child of a compound node. The root of the compound graph
 * structure is a child of the root node, which is the only node
 * in compound structure without an owner graph.
 */
export class Graph {
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
    })

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
    let edge;
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