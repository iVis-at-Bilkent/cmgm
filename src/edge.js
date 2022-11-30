/* This class defines properties specific to an edge. */
import { GraphObject } from "./graph-object"

/**
 * This class represents an edge. An edge maintains
 * its source, its target and the information of whether 
 * it is inter-graph or not together with the properties 
 * that are inherited from GraphObject class.
 */
export class Edge extends GraphObject {
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