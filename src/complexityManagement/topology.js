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
      // we add new node as a child node
      let parentNode = visibleGM.nodesMap.get(parentID); // we can keep an id -> node map to get the node in constant time
      if (parentNode.child) {
        graphToAdd = parentNode.child;
      } else {
        graphToAdd = visibleGM.addGraph(new Graph(null, visibleGM), parentNode);
      }
    } else {
      // new node is a top-level node
      graphToAdd = visibleGM.rootGraph;
    }
    let node = new Node(nodeID);
    graphToAdd.addNode(node);
    visibleGM.nodesMap.set(nodeID, node);
    // add new node to the invisible graph as well
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
    //get nodes from visible and invisible Graph Managers
    let sourceNode = visibleGM.nodesMap.get(sourceID);
    let targetNode = visibleGM.nodesMap.get(targetID);
    let sourceNodeInvisible = invisibleGM.nodesMap.get(sourceID);
    let targetNodeInvisible = invisibleGM.nodesMap.get(targetID);
    let edge;
    //create edge for visible and invisible Graph Managers
    if (sourceNode != undefined && targetNode != undefined) {
      edge = new Edge(edgeID, sourceNode, targetNode);
    }
    let edgeInvisible = new Edge(
      edgeID,
      sourceNodeInvisible,
      targetNodeInvisible
    );
    //if source and target owner graph is same (its an intra graph edge), then add the viible and invisible edges to the source owner
    if (sourceNodeInvisible.owner === targetNodeInvisible.owner) {
      if (sourceNode != undefined && targetNode != undefined) {
        sourceNode.owner.addEdge(edge, sourceNode, targetNode);
      }
      sourceNodeInvisible.owner.addEdge(
        edgeInvisible,
        sourceNodeInvisible,
        targetNodeInvisible
      );
    } else {
      //add inter graph edges
      if (sourceNode != undefined && targetNode != undefined) {
        visibleGM.addInterGraphEdge(edge, sourceNode, targetNode);
      }
      invisibleGM.addInterGraphEdge(
        edgeInvisible,
        sourceNodeInvisible,
        targetNodeInvisible
      );
    }
    //add edge id to edgesMap of visible and invisible Graph Managers
    if (sourceNode != undefined && targetNode != undefined) {
      visibleGM.edgesMap.set(edgeID, edge);
    }
    invisibleGM.edgesMap.set(edgeID, edgeInvisible);
  }
  
  static addMetaEdge(sourceID, targetID, orignalEnds, visibleGM, invisibleGM) {
    //get nodes from visible graph manager
    let sourceNode = visibleGM.nodesMap.get(sourceID);
    let targetNode = visibleGM.nodesMap.get(targetID);
    let metaEdge;
    //create edge for visible and invisible Graph Managers
    if (sourceNode != undefined && targetNode != undefined) {
      metaEdge = new MetaEdge(sourceNode, targetNode, orignalEnds);
      visibleGM.metaEdgesMap.set(metaEdge.ID, metaEdge);
    }
    //if source and target owner graph is same (its an intra graph edge), then add the viible and invisible edges to the source owner
    if (sourceNode.owner === targetNode.owner) {
      if (sourceNode != undefined && targetNode != undefined) {
        sourceNode.owner.addEdge(metaEdge, sourceNode, targetNode);
      }
    } else {
      //add inter graph edges
      if (sourceNode != undefined && targetNode != undefined) {
        visibleGM.addInterGraphEdge(metaEdge, sourceNode, targetNode);
      }
    }
    //add edge id to edgesMap of visible graph manager
    if (sourceNode != undefined && targetNode != undefined) {
      visibleGM.edgesMap.set(metaEdge.ID, metaEdge);
    }

    return metaEdge;
  }

  removeNestedEdges(nestedEdges, invisibleGM) {
    //loop through the list of nested edges
    nestedEdges.forEach((edgeInInvisibleItem) => {
      // nested edge is an id and not a another meta edge
      if (typeof edgeInInvisibleItem === "string") {
        let edgeInInvisible = invisibleGM.edgesMap.get(edgeInInvisibleItem);
        invisibleGM.edgesMap.delete(edgeInInvisible);
        Auxiliary.removeEdgeFromGraph(edgeInInvisible);
      } else {
        //recursively passing the nested edge
        removeNestedEdges(edgeInInvisibleItem, invisibleGM);
      }
    });
  }
  static updateMetaEdge(nestedEdges, targetEdge) {
    //list to store updated list of edges
    let updatedMegaEdges = [];
    //looping thorugh the nested edges array
    nestedEdges.forEach((nestedEdge, index) => {
      if (typeof nestedEdge === "string") {
        //edge is an id
        if (nestedEdge != targetEdge.ID) {
          //if id == target skip it
          updatedMegaEdges.push(nestedEdge);
        }
      } else {
        //edge is an array i.e its enclosed meta edge
        update = this.updateMetaEdge(nestedEdge, targetEdge);
        updatedMegaEdges.push(update);
      }
    });
    //return the updateMetaEdges if length is more than 1 else return the actual ID inside the array
    return updatedMegaEdges.length == 1
      ? updatedMegaEdges[0]
      : updatedMegaEdges;
  }
  static removeEdge(edgeID, visibleGM, invisibleGM) {
    //get edges
    let edgeToRemove = visibleGM.edgesMap.get(edgeID);
    let edgeToRemoveInvisible = invisibleGM.edgesMap.get(edgeID);
    if (edgeToRemove) {
      //if edge exisit in the visible graph
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
            updatedOrignalEdges = this.updateMetaEdge(
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
        //if edge is not part of any meta edge
        if (!found) {
          //remove edge from the visible graph
          visibleGM.edgesMap.delete(edgeToRemove.ID);
          Auxiliary.removeEdgeFromGraph(edgeToRemove);
        }
        //remove edge from the invisible graph
        invisibleGM.edgesMap.delete(edgeToRemoveInvisible.ID);
        Auxiliary.removeEdgeFromGraph(edgeToRemoveInvisible);
      }
    } else {
      //remove edge from the invisible graph
      invisibleGM.edgesMap.delete(edgeToRemoveInvisible.ID);
      Auxiliary.removeEdgeFromGraph(edgeToRemoveInvisible);
    }
  }

  static removeNode(nodeID, visibleGM, invisibleGM) {
    //get node objects from nodesMap from visible and invisible graph managers
    let nodeToRemove = visibleGM.nodesMap.get(nodeID);
    let nodeToRemoveInvisible = invisibleGM.nodesMap.get(nodeID);
    if (nodeToRemove) {
      //node might not be in the visible graph
      // Removing nodes from Visible Graph Manager
      let nodeToRemoveDescendants =
        visibleGM.getDescendantsInorder(nodeToRemove); //get list of descendants
      //looping through descendant edges
      nodeToRemoveDescendants.edges.forEach((nodeToRemoveEdge) => {
        //removing edge
        Topology.removeEdge(nodeToRemoveEdge.ID, visibleGM, invisibleGM);
      });
      //looping through descendant simpleNodes
      nodeToRemoveDescendants.simpleNodes.forEach((nodeToRemoveSimpleNode) => {
        nodeToRemoveSimpleNode.owner.removeNode(nodeToRemoveSimpleNode);
        visibleGM.nodesMap.delete(nodeToRemoveSimpleNode.ID);
      });
      //looping through descendant compoundNodes
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
      //removing nodes from visible and invisible graph managers and nodes maps
      nodeToRemove.owner.removeNode(nodeToRemove);
      visibleGM.nodesMap.delete(nodeID);
      nodeToRemoveInvisible.owner.removeNode(nodeToRemoveInvisible);
      invisibleGM.nodesMap.delete(nodeID);
    } else {
      //remove node from invisible graph manager
      if (nodeToRemoveInvisible) {
        nodeToRemoveInvisible.owner.removeNode(nodeToRemoveInvisible);
        invisibleGM.nodesMap.delete(nodeID);
      }
    }
    //reemoving graphs from visible and invisible graph managers if they have no nodes
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
    //get edge from visible graph
    let edgeToRemove = visibleGM.edgesMap.get(edgeID);
    //check if source is given
    if (newSourceID == undefined) {
      newSourceID = edgeToRemove.source.ID;
    }
    //check if target is given
    else if (newTargetID == undefined) {
      newTargetID = edgeToRemove.target.ID;
    }
    //remove existing edge from visible graph
    if (edgeToRemove) {
      visibleGM.edgesMap.delete(edgeToRemove.ID);
      Auxiliary.removeEdgeFromGraph(edgeToRemove);
    }
    //get edge from invisible graph
    let edgeToRemoveInvisible = invisibleGM.edgesMap.get(edgeID);
    //create a new edge to add between new source and target and copy values of inVisible and isHidden
    let edgeToAddForInvisible = new Edge(edgeID, newSourceID, newTargetID);
    edgeToAddForInvisible.isVisible = edgeToRemoveInvisible.isVisible;
    edgeToAddForInvisible.isHidden = edgeToRemoveInvisible.isHidden;
    Auxiliary.removeEdgeFromGraph(edgeToRemoveInvisible);
    //checking if new edge is to be visible or not
    if (
      edgeToAddForInvisible.isFiltered == false &&
      edgeToAddForInvisible.isHidden == false &&
      visibleGM.nodesMap.get(newSourceID).isVisible &&
      visibleGM.nodesMap.get(newTargetID).isVisible
    ) {
      edgeToAddForInvisible.isVisible = true;
    } else {
      edgeToAddForInvisible.isVisible = false;
    }
    //if new edge is visible , add the edge to visible graph
    if (edgeToAddForInvisible.isVisible == true) {
      Topology.addEdge(
        edgeID,
        newSourceID,
        newTargetID,
        visibleGM,
        invisibleGM
      );
    } else {
      //add edge to invisble graph
      if (
        edgeToAddForInvisible.source.owner == edgeToAddForInvisible.target.owner
      ) {
        edgeToAddForInvisible.source.owner.addEdge(
          edgeToAddForInvisible,
          edgeToAddForInvisible.source,
          edgeToAddForInvisible.target
        );
      }
      //add inter graph edge invisible graph
      else {
        invisibleGM.addInterGraphEdge(
          edgeToAddForInvisible,
          edgeToAddForInvisible.source,
          edgeToAddForInvisible.target
        );
      }
    }
  }

  static changeParent(nodeID, newParentID, visibleGM, invisibleGM) {
    //get node from visible graph
    let nodeToRemove = visibleGM.nodesMap.get(nodeID);
    let edgesOfNodeToRemove = [...nodeToRemove.edges];
    if (nodeToRemove) {
      //node might not be in visible graph
      //get new parent node from visible graph
      let newParent = visibleGM.nodesMap.get(newParentID);
      if (newParent == undefined) {
        //if parent is not defined, parent is the root
        newParent = visibleGM.rootGraph.parent;
      }
      let removedNode = nodeToRemove.owner.removeNode(nodeToRemove); //remove the node
      if (newParent.child == undefined) {
        //if new parent doesnot has the child graph add the graph
        visibleGM.addGraph(new Graph(null, visibleGM), newParent);
      }
      //add the node to new parent node's child graph
      newParent.child.addNode(removedNode);
    }
    //same things for invisible graph
    let nodeToRemoveInvisible = invisibleGM.nodesMap.get(nodeID);
    let newParentInInvisible = invisibleGM.nodesMap.get(newParentID);
    if (newParentInInvisible == undefined) {
      newParentInInvisible = invisibleGM.rootGraph.parent;
    }
    let removedNodeInvisible = nodeToRemoveInvisible.owner.removeNode(
      nodeToRemoveInvisible
    );
    if (newParentInInvisible.child == undefined) {
      invisibleGM.addGraph(new Graph(null, invisibleGM), newParentInInvisible);
    }
    newParentInInvisible.child.addNode(removedNodeInvisible);
    edgesOfNodeToRemove.forEach((edge) => {
      Topology.addEdge(
        edge.ID,
        edge.source.ID,
        edge.target.ID,
        visibleGM,
        invisibleGM
      );
      if (edge.source.isVisible && edge.target.isVisible ) {
        let newEdge = invisibleGM.edgesMap.get(edge.ID);
        newEdge.isVisible = false;
      }
    });
  }
}
