import { GraphManager } from "../graph-manager";
import { Graph } from "../graph";
import { Edge } from "../edge";
import { Node } from "../node";
import { MetaEdge } from "../meta-edge";
export class Auxiliary {

  static lastID = 0;

  static createUniqueID() {
    let newID = "Object#" + this.lastID + "";
    this.lastID++;
    return newID;
  }

  static removeEdgeFromGraph(edgeToRemove) {
    if (edgeToRemove.owner instanceof GraphManager) {
      edgeToRemove.owner.removeInterGraphEdge(edgeToRemove);
    }
    else {
      edgeToRemove.owner.removeEdge(edgeToRemove);
    }
  }

  static moveNodeToVisible(node, visibleGM, invisibleGM) {
    node.isVisible = true;
    let nodeForVisible = new Node(node.ID);
    let newNode = node.owner.siblingGraph.addNode(nodeForVisible);
    visibleGM.nodesMap.set(newNode.ID, newNode);
    if (node.child) {
      if (node.isCollapsed == false) {
        let newGraph = visibleGM.addGraph(new Graph(null, visibleGM), nodeForVisible);
        newGraph.siblingGraph = node.child;
        node.child.siblingGraph = newGraph;
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
      if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false && incidentEdge.source.isVisible && incidentEdge.target.isVisible) {
        Auxiliary.moveEdgeToVisible(incidentEdge, visibleGM, invisibleGM);
      }
    });
  }

  static moveEdgeToVisible(edge, visibleGM, invisibleGM) {
    edge.isVisible = true;
    let edgeForVisible = new Edge(edge.ID, null, null);
    let sourceInVisible = visibleGM.nodesMap.get(edge.source.ID);
    let targetInVisible = visibleGM.nodesMap.get(edge.target.ID);
    let newEdge;
    if (edge.source.owner == edge.target.owner) {
      newEdge = edge.source.owner.siblingGraph.addEdge(edgeForVisible, sourceInVisible, targetInVisible);
    }
    else {
      newEdge = visibleGM.addInterGraphEdge(edgeForVisible, sourceInVisible, targetInVisible);
    }
    visibleGM.edgesMap.set(newEdge.ID, newEdge);
  }
}