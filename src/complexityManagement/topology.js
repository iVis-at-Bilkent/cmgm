import { Edge } from "../edge";
import { Graph } from "../graph"
import { MetaEdge } from "../meta-edge";
import { Node } from "../node"
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
          graphToAddInvisible = invisibleGM.addGraph(new Graph(null, invisibleGM), parentNodeInvisible);
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
    let edgeInvisible = new Edge(edgeID, sourceNodeInvisible, targetNodeInvisible);
    if (sourceNode.owner === targetNode.owner) {
      sourceNode.owner.addEdge(edge, sourceNode, targetNode);
      sourceNodeInvisible.owner.addEdge(edgeInvisible, sourceNodeInvisible, targetNodeInvisible);
    } else {
      visibleGM.addInterGraphEdge(edge, sourceNode, targetNode);
      invisibleGM.addInterGraphEdge(edgeInvisible, sourceNodeInvisible, targetNodeInvisible);
    }
    visibleGM.edgesMap.set(edgeID, edge);
    invisibleGM.edgesMap.set(edgeID, edgeInvisible);
  }

  static removeNode(nodeID, visibleGM, invisibleGM) {
    let nodeToRemove = visibleGM.nodesMap.get(nodeID);
    let nodeToRemoveInvisible = invisibleGM.nodesMap.get(nodeID);
    if (nodeToRemove) {
      //Removing nodes from Visible Graph Manager
      let nodeToRemoveDescendants = visibleGM.getDecendantsInorder(nodeToRemove);
      nodeToRemoveDescendants.edges.forEach((nodeToRemoveEdge) => {
        //call removeEdge here
        removeEdge(nodeToRemoveEdge, visibleGM, invisibleGM);
      })
      nodeToRemoveDescendants.simpleNodes.forEach((nodeToRemoveSimpleNode) => {
        nodeToRemoveSimpleNode.owner.removeNode(nodeToRemoveSimpleNode);
        visibleGM.nodesMap.delete(nodeToRemoveSimpleNode.ID());

      })
      nodeToRemoveDescendants.compoundNodes.forEach(nodeToRemoveCompoundNode => {
        nodeToRemoveCompoundNode.owner.removeNode(nodeToRemoveCompoundNode);
        visibleGM.nodesMap.delete(nodeToRemoveCompoundNode);

      })
      //Removing nodes from Invisible Graph Manager
      let nodeToRemoveDescendantsInvisible = invisibleGM.getDecendantsInorder(nodeToRemoveInvisible);
      nodeToRemoveDescendantsInvisible.edges.forEach((nodeToRemoveEdgeInvisible) => {
        //call removeEdge here
        removeEdge(nodeToRemoveEdgeInvisible, visibleGM, invisibleGM);
      })
      nodeToRemoveDescendantsInvisible.simpleNodes.forEach((nodeToRemoveSimpleNodeInvisible) => {
        nodeToRemoveSimpleNodeInvisible.owner.removeNode(nodeToRemoveSimpleNodeInvisible);
        invisibleGM.nodesMap.delete(nodeToRemoveSimpleNodeInvisible.ID());

      })
      nodeToRemoveDescendantsInvisible.compoundNodes.forEach(nodeToRemoveCompoundNodeInvisible => {
        nodeToRemoveCompoundNodeInvisible.owner.removeNode(nodeToRemoveCompoundNodeInvisible);
        invisibleGM.nodesMap.delete(nodeToRemoveCompoundNodeInvisible.ID());
      })
    }
    nodeToRemove.owner.removeNode(nodeToRemove);
    visibleGM.nodesMap.delete(nodeID);
    nodeToRemoveInvisible.owner.removeNode(nodeToRemoveInvisible);
    invisibleGM.nodesMap.delete(nodeID);
  }

  static removeEdge(edgeID, visibleGM, invisibleGM) {
    let edgeToRemove = visibleGM.edgesMap.get(edgeID);
    let edgeToRemoveInvisible = invisibleGM.edgesMap.get(edgeID);
    if (edgeToRemove) {
      //meta edges
      if (edgeToRemove instanceof MetaEdge) {
        //Returns the array of edge IDs. Needs more investigation on structure.
        actualEdgesInInvisble = edgeToRemove.originalEdges();
        visibleGM.edgesMap.delete(edgeToRemove);
        Auxiliary.removeEdgeFromGraph(edgeToRemove);
        removeNestedEdges(actualEdgesInInvisble, invisibleGM);
      } else {
        //update meta edge or dete a simple edge
      }
    } else {
      invisibleGM.edgesMap.delete(edgeToRemoveInvisible);
      Auxiliary.removeEdgeFromGraph(edgeToRemoveInvisible);
    }
  }

  removeNestedEdges(nestedEdges, invisibleGM) {
    nestedEdges.forEach(edgeInInvisibleItem => {
      if (typeof edgeInInvisibleItem === 'string') {
        let edgeInInvisible = invisibleGM.edgesMap.get(edgeInInvisibleItem);
        invisibleGM.edgesMap.delete(edgeInInvisible);
        Auxiliary.removeEdgeFromGraph(edgeInInvisible);
      } else {
        removeNestedEdges(edgeInInvisibleItem, invisibleGM);
      }
    });
  }

  static reconnect(edgeID, newSourceID, newTargetID, visibleGM, invisibleGM) {

  }

  static changeParent(nodeID, newParentID, visibleGM, invisibleGM) {

  }
}