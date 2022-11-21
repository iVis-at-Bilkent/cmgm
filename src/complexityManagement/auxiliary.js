export class Auxiliary {

  static lastID = 0;

  static createUniqueID() {
    let newID = "Object#" + this.lastID + "";
    this.lastID++;
    return newID;
  }

  static removeEdgeFromGraph(edgeToRemove, visibleGM, invisibleGM) {

  }

  static moveNodeToVisible(node, visibleGM, invisibleGM) {

  }

  static moveEdgeToVisible(node, visibleGM, invisibleGM) {
    
  }
}