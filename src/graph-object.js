/**
 * This class represents a graph object which 
 * can be either a  node or an edge.
 */
export class GraphObject {

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