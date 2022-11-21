import { GraphObject } from "./graph-object"

/**
 * This class represents a node. A node maintains
 * its child graph if exists, a list of its incident 
 * edges and the information of whether it is collapsed
 * or not together with the properties that are 
 * inherited from GraphObject class.
 */
export class Node extends GraphObject {
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