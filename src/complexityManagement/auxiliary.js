import { GraphManager } from "../graph-manager";

export class Auxiliary {

  static lastID = 0;

  static createUniqueID() {
    let newID = "Object#" + this.lastID + "";
    this.lastID++;
    return newID;
  }

  static removeEdgeFromGraph(edgeToRemove) {
    if(edgeToRemove.owner instanceof GraphManager){
      edgeToRemove.owner.removeInterGraphEdge(edgeToRemove);
    }
    else{
      edgeToRemove.owner.removeEdge(edgeToRemove);
    }
  }

  static moveNodeToVisible(node, visibleGM, invisibleGM) {

  }

  static moveEdgeToVisible(node, visibleGM, invisibleGM) {
    
  }
}