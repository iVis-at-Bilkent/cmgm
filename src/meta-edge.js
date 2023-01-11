import { Auxiliary } from "./complexityManagement/auxiliary";
import { Edge } from "./edge"

/**
 * This class represents a meta edge. A meta edge maintains 
 * the original edges it represents together with the properties 
 * that are inherited from Edge class.
 */
export class MetaEdge extends Edge {
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