import { Edge } from "../edge";
import { Graph } from "../graph";
import { MetaEdge } from "../meta-edge";
import { Node } from "../node";
import { Auxiliary } from "./auxiliary";
export class Topology {
  static addNode(nodeID, parentID, visibleGM, invisibleGM) {
    let graphToAdd;
    let graphToAddInvisible;
    if (parentID) {
      let parentNode = visibleGM.nodesMap.get(parentID);
      if (parentNode.child) {
        graphToAdd = parentNode.child;
      } else {
        graphToAdd = visibleGM.addGraph(new Graph(null, visibleGM), parentNode);
      }
    } else {
      graphToAdd = visibleGM.rootGraph;
    }
    let node = new Node(nodeID);
    graphToAdd.addNode(node);
    visibleGM.nodesMap.set(nodeID, node);
    let nodeForInvisible = new Node(nodeID);
    if (graphToAdd.siblingGraph) {
      graphToAdd.siblingGraph.addNode(nodeForInvisible);
    } else {
      if (parentID) {
        let parentNodeInvisible = invisibleGM.nodesMap.get(parentID);
        if (parentNodeInvisible.child) {
          graphToAddInvisible = parentNodeInvisible.child;
        } else {
          graphToAddInvisible = invisibleGM.addGraph(
            new Graph(null, invisibleGM),
            parentNodeInvisible
          );
        }
      } else {
        graphToAddInvisible = invisibleGM.rootGraph;
      }
      graphToAddInvisible.addNode(nodeForInvisible);
      graphToAdd.siblingGraph = graphToAddInvisible;
      graphToAddInvisible.siblingGraph = graphToAdd;
    }
    invisibleGM.nodesMap.set(nodeID, nodeForInvisible);
  }

  static addEdge(edgeID, sourceID, targetID, visibleGM, invisibleGM) {
    let sourceNode = visibleGM.nodesMap.get(sourceID);
    let targetNode = visibleGM.nodesMap.get(targetID);
    let edge = new Edge(edgeID, sourceNode, targetNode);
    let sourceNodeInvisible = invisibleGM.nodesMap.get(sourceID);
    let targetNodeInvisible = invisibleGM.nodesMap.get(targetID);
    let edgeInvisible = new Edge(
      edgeID,
      sourceNodeInvisible,
      targetNodeInvisible
    );
    if (sourceNode.owner === targetNode.owner) {
      sourceNode.owner.addEdge(edge, sourceNode, targetNode);
      sourceNodeInvisible.owner.addEdge(
        edgeInvisible,
        sourceNodeInvisible,
        targetNodeInvisible
      );
    } else {
      visibleGM.addInterGraphEdge(edge, sourceNode, targetNode);
      invisibleGM.addInterGraphEdge(
        edgeInvisible,
        sourceNodeInvisible,
        targetNodeInvisible
      );
    }
    visibleGM.edgesMap.set(edgeID, edge);
    invisibleGM.edgesMap.set(edgeID, edgeInvisible);
  }

  removeNestedEdges(nestedEdges, invisibleGM) {
    nestedEdges.forEach((edgeInInvisibleItem) => {
      if (typeof edgeInInvisibleItem === "string") {
        let edgeInInvisible = invisibleGM.edgesMap.get(edgeInInvisibleItem);
        invisibleGM.edgesMap.delete(edgeInInvisible);
        Auxiliary.removeEdgeFromGraph(edgeInInvisible);
      } else {
        removeNestedEdges(edgeInInvisibleItem, invisibleGM);
      }
    });
  }
  static updateMetaEdge(nestedEdges, targetEdge) {
    let updatedMegaEdges = [];
    nestedEdges.forEach((nestedEdge, index) => {
      if (typeof nestedEdge === "string") {
        if (nestedEdge != targetEdge.ID) {
          updatedMegaEdges.push(nestedEdge);
        }
      } else {
        update, (newStatus = updateMetaEdge(nestedEdge, targetEdge));
        updatedMegaEdges.push(update);
      }
    });
    return updatedMegaEdges.length == 1
      ? updatedMegaEdges[0]
      : updatedMegaEdges;
  }
  static removeEdge(edgeID, visibleGM, invisibleGM) {
    let edgeToRemove = visibleGM.edgesMap.get(edgeID);
    let edgeToRemoveInvisible = invisibleGM.edgesMap.get(edgeID);
    if (edgeToRemove) {
      // meta edges
      if (edgeToRemove instanceof MetaEdge) {
        // Returns the array of edge IDs. Needs more investigation on structure.
        actualEdgesInInvisble = edgeToRemove.originalEdges();
        visibleGM.edgesMap.delete(edgeToRemove.ID);
        Auxiliary.removeEdgeFromGraph(edgeToRemove);
        removeNestedEdges(actualEdgesInInvisble, invisibleGM);
      } else {
        // Go through each meta edge and update the orignal ends if updatedoriginalEdges does not match.
        let found = false;
        visibleGM.edgesMap.forEach((visibleEdge) => {
          if (visibleEdge instanceof MetaEdge) {
            // updateMetaEdge function returns updated version of originalEdges without key of edgeTo Remove
            updatedOrignalEdges = updateMetaEdge(
              visibleEdge.originalEdges(),
              edgeToRemove
            );
            // updatedOrignalEdges will be same as originalEdges if edge to remove is not part of the meta edge
            if (updatedOrignalEdges != visibleEdge.originalEdges()) {
              visibleEdge.originalEdges(updatedOrignalEdges);
              found = true;
            }
          }
        });
        if (!found) {
          visibleGM.edgesMap.delete(edgeToRemove.ID);
          Auxiliary.removeEdgeFromGraph(edgeToRemove);
        }
        invisibleGM.edgesMap.delete(edgeToRemoveInvisible.ID);
        Auxiliary.removeEdgeFromGraph(edgeToRemoveInvisible);
      }
    } else {
      invisibleGM.edgesMap.delete(edgeToRemoveInvisible.ID);
      Auxiliary.removeEdgeFromGraph(edgeToRemoveInvisible);
    }
  }

  static removeNode(nodeID, visibleGM, invisibleGM) {
    let nodeToRemove = visibleGM.nodesMap.get(nodeID);
    let nodeToRemoveInvisible = invisibleGM.nodesMap.get(nodeID);
    if (nodeToRemove) {
      // Removing nodes from Visible Graph Manager
      let nodeToRemoveDescendants =
        visibleGM.getDescendantsInorder(nodeToRemove);
      nodeToRemoveDescendants.edges.forEach((nodeToRemoveEdge) => {
        Topology.removeEdge(nodeToRemoveEdge.ID, visibleGM, invisibleGM);
      });
      nodeToRemoveDescendants.simpleNodes.forEach((nodeToRemoveSimpleNode) => {
        nodeToRemoveSimpleNode.owner.removeNode(nodeToRemoveSimpleNode);
        visibleGM.nodesMap.delete(nodeToRemoveSimpleNode.ID);
      });
      nodeToRemoveDescendants.compoundNodes.forEach(
        (nodeToRemoveCompoundNode) => {
          nodeToRemoveCompoundNode.owner.removeNode(nodeToRemoveCompoundNode);
          visibleGM.nodesMap.delete(nodeToRemoveCompoundNode.ID);
        }
      );
      // Removing nodes from Invisible Graph Manager
      let nodeToRemoveDescendantsInvisible = invisibleGM.getDescendantsInorder(
        nodeToRemoveInvisible
      );
      nodeToRemoveDescendantsInvisible.edges.forEach(
        (nodeToRemoveEdgeInvisible) => {
          Topology.removeEdge(
            nodeToRemoveEdgeInvisible.ID,
            visibleGM,
            invisibleGM
          );
        }
      );
      nodeToRemoveDescendantsInvisible.simpleNodes.forEach(
        (nodeToRemoveSimpleNodeInvisible) => {
          nodeToRemoveSimpleNodeInvisible.owner.removeNode(
            nodeToRemoveSimpleNodeInvisible
          );
          invisibleGM.nodesMap.delete(nodeToRemoveSimpleNodeInvisible.ID);
        }
      );
      nodeToRemoveDescendantsInvisible.compoundNodes.forEach(
        (nodeToRemoveCompoundNodeInvisible) => {
          nodeToRemoveCompoundNodeInvisible.owner.removeNode(
            nodeToRemoveCompoundNodeInvisible
          );
          invisibleGM.nodesMap.delete(nodeToRemoveCompoundNodeInvisible.ID);
        }
      );
      nodeToRemove.owner.removeNode(nodeToRemove);
      visibleGM.nodesMap.delete(nodeID);
      nodeToRemoveInvisible.owner.removeNode(nodeToRemoveInvisible);
      invisibleGM.nodesMap.delete(nodeID);
    } else {
      if (nodeToRemoveInvisible) {
        nodeToRemoveInvisible.owner.removeNode(nodeToRemoveInvisible);
        invisibleGM.nodesMap.delete(nodeID);
      }
    }
    visibleGM.graphs.forEach((graph, index) => {
      if (graph.nodes.length == 0 && graph != visibleGM.rootGraph) {
        visibleGM.graphs.splice(index, 1);
      }
    });
    invisibleGM.graphs.forEach((graph, index) => {
      if (graph.nodes.length == 0 && graph != invisibleGM.rootGraph) {
        invisibleGM.graphs.splice(index, 1);
      }
    });
  }

  static reconnect(edgeID, newSourceID, newTargetID, visibleGM, invisibleGM) {
    let edgeToRemove = visibleGM.edgesMap.get(edgeID);
    if (newSourceID == undefined){
      newSourceID = edgeToRemove.source().ID;
    }
    else if(newTargetID == undefined){
      newTargetID = edgeToRemove.taget().ID;
    }
    if(edgeToRemove){
      this.removeEdge(edgeID,visibleGM,invisibleGM);
    }
    let edgeToRemoveInvisible = invisibleGM.edgesMap.get(edgeID);
    edgeToAddForInvisible = new Edge(edgeID,newSourceID,newTargetID);
    edgeToAddForInvisible.isVisible(edgeToRemoveInvisible.isVisible());
    edgeToAddForInvisible.isHidden(edgeToRemoveInvisible.isHidden());
    if (edgeToAddForInvisible.isFiltered() == false && edgeToAddForInvisible.isHidden() == false && visibleGM.nodesMap.get(newSourceID).isVisible() && visibleGM.nodesMap.get(newTargetID).isVisible()){
      edgeToAddForInvisible.isVisible(true);
    }
    else{
      edgeToAddForInvisible.isVisible(false);
    }
    if (edgeToAddForInvisible.isVisible() == true){
      addEdge(edgeID,newSourceID,newSourceID,visibleGM,invisibleGM);
    }else{
      if (edgeToAddForInvisible.source().owner == edgeToAddForInvisible.target().owner){
        edgeToAddForInvisible.source().owner.addEdge(edgeToAddForInvisible,edgeToAddForInvisible.source(),edgeToAddForInvisible.target())
      }
      else{
        invisibleGM.addInterGraphEdge(edgeToAddForInvisible,edgeToAddForInvisible.source(),edgeToAddForInvisible.target())
      }
    }
  }

  static changeParent(nodeID, newParentID, visibleGM, invisibleGM) {
    let nodeToRemove = visibleGM.nodesMap.get(nodeID);
    if (nodeToRemove){
      let newParent = visibleGM.nodesMap.get(newParentID);
      let removedNode = nodeToRemove.owner.removeNode(nodeToRemove);
      newParent.child().addNode(removedNode);
    }
    let nodeToRemoveInvisible = invisibleGM.nodesMap.get(nodeID);
    let newParentInInvisible = invisibleGM.nodesMap.get(newParentID);
    let removedNodeInvisible = nodeToRemoveInvisible.owner.removeNode(nodeToRemoveInvisible);
    newParentInInvisible.child().addNode(removedNodeInvisible);
  }
}
