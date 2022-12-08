import { GraphManager } from "../graph-manager";
import { Edge } from "../edge";
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
    node.isVisible = true;
    let nodeForVisible = new Node(node.ID);
    node.owner.siblingGraph.addNode(nodeForVisible);
    if(node.child){
      if(node.isCollpased==false){
        let newGraph = visibleGM.addGraph(new Graph(null, visibleGM), nodeForVisible);
        newGraph.siblingGraph = node.child;
      }
    }
    node.edges.forEach(incidentEdge => {
     //edge is part of a meta edge in visible graph
     let found = false;
     visibleGM.edgesMap.forEach((visibleEdge) => {
       if (visibleEdge instanceof MetaEdge) {
         // this.updateMetaEdge function returns updated version of originalEdges without key of edgeTo Remove
         updatedOrignalEdges = this.updateMetaEdge(
           visibleEdge.originalEdges(),
           incidentEdge.ID
         );
         // updatedOrignalEdges will be same as originalEdges if edge to remove is not part of the meta edge
         if (updatedOrignalEdges != visibleEdge.originalEdges()) {
          visibleEdge.originalEdges(updatedOrignalEdges);
          found = true;
        }
        //update handled but incident edge should be created in the visible graph.
        //..........THINK........
       }
     });
     if (edgeToUnfilter.isFiltered == false &&edgeToUnfilter.isHidden == false && edgeToUnfilter.source.isVisible && edgeToUnfilter.target.isVisible) {
      Auxiliary.moveEdgeToVisible(edgeToUnfilter,visibleGM,invisibleGM);
      }
    });
  }

  static moveEdgeToVisible(edge, visibleGM, invisibleGM) {
    edge.isVisible = true;
    let edgeForVisible = new Edge(edge.ID,null,null);
    let sourceInVisible = invisibleGM.nodesMap.get(edge.source.ID);
    let targetInVisible = invisibleGM.nodesMap.get(edge.target.ID);
    if(edge.source.owner == edge.target.owner){
      edge.source.owner.siblingGraph.addEdge(edgeForVisible,sourceInVisible,targetInVisible);
    }
    else{
      visibleGM.addInterGraphEdge(edgeForVisible,sourceInVisible,targetInVisible);
    }
    
  }
}