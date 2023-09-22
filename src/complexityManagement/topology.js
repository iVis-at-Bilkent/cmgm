import { Edge } from "../edge";
import { Graph } from "../graph";
import { MetaEdge } from "../meta-edge";
import { Node } from "../node";
import { Auxiliary } from "./auxiliary";
import { FilterUnfilter } from "./filter-unfilter";
export class Topology {
  static addNode(nodeID, parentID, visibleGM, mainGM) {
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
        let parentNodeInvisible = mainGM.nodesMap.get(parentID);
        if (parentNodeInvisible.child) {
          graphToAddInvisible = parentNodeInvisible.child;
        } else {
          graphToAddInvisible = mainGM.addGraph(
            new Graph(null, mainGM),
            parentNodeInvisible
          );
        }
      } else {
        graphToAddInvisible = mainGM.rootGraph;
      }
      graphToAddInvisible.addNode(nodeForInvisible);
      graphToAdd.siblingGraph = graphToAddInvisible;
      graphToAddInvisible.siblingGraph = graphToAdd;
    }
    mainGM.nodesMap.set(nodeID, nodeForInvisible);
  }

  static addEdge(edgeID, sourceID, targetID, visibleGM, mainGM) {
    //get nodes from visible and invisible Graph Managers
    let sourceNode = visibleGM.nodesMap.get(sourceID);
    let targetNode = visibleGM.nodesMap.get(targetID);
    let sourceNodeInvisible = mainGM.nodesMap.get(sourceID);
    let targetNodeInvisible = mainGM.nodesMap.get(targetID);
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
      mainGM.addInterGraphEdge(
        edgeInvisible,
        sourceNodeInvisible,
        targetNodeInvisible
      );
    }
    //add edge id to edgesMap of visible and invisible Graph Managers
    if (sourceNode != undefined && targetNode != undefined) {
      visibleGM.edgesMap.set(edgeID, edge);
    }
    mainGM.edgesMap.set(edgeID, edgeInvisible);
  }

  static addMetaEdge(sourceID, targetID, orignalEnds, visibleGM, mainGM) {
    //get nodes from visible graph manager
    let sourceNode = visibleGM.nodesMap.get(sourceID);
    let targetNode = visibleGM.nodesMap.get(targetID);
    let metaEdge;
    //create edge for visible and invisible Graph Managers
    if (sourceNode != undefined && targetNode != undefined) {
      metaEdge = new MetaEdge(sourceNode, targetNode, orignalEnds);
      visibleGM.metaEdgesMap.set(metaEdge.ID, metaEdge);
      orignalEnds.forEach((edgeID) => {
        visibleGM.edgeToMetaEdgeMap.set(edgeID, metaEdge);
      });
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

  static removeNestedEdges(nestedEdges, visibleGM, mainGM) {
    //loop through the list of nested edges
    nestedEdges.forEach((edgeInInvisibleItem) => {
      // nested edge is an id and not a another meta edge
      if (visibleGM.metaEdgesMap.has(edgeInInvisibleItem)) {
        //recursively passing the nested edge
        let metaEdge = visibleGM.metaEdgesMap.get(edgeInInvisibleItem);
        Topology.removeNestedEdges(
          metaEdge.originalEdges,
          visibleGM,
          mainGM
        );
        visibleGM.metaEdgesMap.delete(edgeInInvisibleItem);
      } else {
        let edgeInInvisible = mainGM.edgesMap.get(edgeInInvisibleItem);
        mainGM.edgesMap.delete(edgeInInvisible.ID);
        Auxiliary.removeEdgeFromGraph(edgeInInvisible);
      }
    });
  }

  static recursivelyRemoveDescendantEdges(
    originalEdges,
    visibleGM,
    mainGM
  ) {
    originalEdges.forEach((edgeID) => {
      let edgeToRemove = visibleGM.edgesMap.get(edgeID);
      let edgeToRemoveInvisible = mainGM.edgesMap.get(edgeID);
      if (visibleGM.metaEdgesMap.has(edgeID)) {
        edgeToRemove = visibleGM.metaEdgesMap.get(edgeID);
        // delete from visible map
        visibleGM.edgesMap.delete(edgeToRemove.ID);
        visibleGM.metaEdgesMap.delete(edgeToRemove.ID);
        // remove edge from graph of visibleGM
        try {
          Auxiliary.removeEdgeFromGraph(edgeToRemove);
        } catch (e) {
          //console.log(e);
        }
        if (visibleGM.edgeToMetaEdgeMap.has(edgeToRemove.ID)) {
          visibleGM.edgeToMetaEdgeMap.delete(edgeToRemove.ID);
        }
        this.recursivelyRemoveDescendantEdges(
          edgeToRemove.originalEdges,
          visibleGM,
          mainGM
        );
      } else if (visibleGM.edgesMap.has(edgeID)) {
        // delete from visible map
        visibleGM.edgesMap.delete(edgeToRemove.ID);
        // remove edge from graph of visibleGM
        try {
          Auxiliary.removeEdgeFromGraph(edgeToRemove);
        } catch (e) {
          //console.log(e);
        }
        //remove edge from the invisible graph
        mainGM.edgesMap.delete(edgeToRemoveInvisible.ID);
        try {
          Auxiliary.removeEdgeFromGraph(edgeToRemoveInvisible);
        } catch (e) {
          //console.log(e);
        }
      } else {
        if (visibleGM.edgeToMetaEdgeMap.has(edgeID)) {
          visibleGM.edgeToMetaEdgeMap.delete(edgeID);
        }
        //remove edge from the invisible graph
        mainGM.edgesMap.delete(edgeToRemoveInvisible.ID);
        try {
          Auxiliary.removeEdgeFromGraph(edgeToRemoveInvisible);
        } catch (e) {
          //console.log(e);
        }
      }
    });
  }

  static removeEdge(edgeID, visibleGM, mainGM) {
    //get edges
    let edgeToRemove = visibleGM.edgesMap.get(edgeID);
    let edgeToRemoveInvisible = mainGM.edgesMap.get(edgeID);
    if (edgeToRemove) {
      //if edge exisit in the visible graph
      if (visibleGM.metaEdgesMap.has(edgeID)) {
        edgeToRemove = Auxiliary.getTopMetaEdge(edgeToRemove, visibleGM);
        // delete from visible map
        visibleGM.edgesMap.delete(edgeToRemove.ID);
        visibleGM.metaEdgesMap.delete(edgeToRemove.ID);
        // remove edge from graph of visibleGM
        Auxiliary.removeEdgeFromGraph(edgeToRemove);
        if (visibleGM.edgeToMetaEdgeMap.has(edgeToRemove.ID)) {
          visibleGM.edgeToMetaEdgeMap.delete(edgeToRemove.ID);
        }
        this.recursivelyRemoveDescendantEdges(
          edgeToRemove.originalEdges,
          visibleGM,
          mainGM
        );
      } else if (visibleGM.edgesMap.has(edgeID)) {
        // delete from visible map
        visibleGM.edgesMap.delete(edgeToRemove.ID);
        // remove edge from graph of visibleGM
        Auxiliary.removeEdgeFromGraph(edgeToRemove);

        //remove edge from the invisible graph
        mainGM.edgesMap.delete(edgeToRemoveInvisible.ID);
        Auxiliary.removeEdgeFromGraph(edgeToRemoveInvisible);
      }
    } else {
      if (visibleGM.edgeToMetaEdgeMap.has(edgeID)) {
        let deleteMetaEdgeList = Auxiliary.recursiveMetaEdgeUpdate(
          edgeToRemoveInvisible,
          visibleGM
        );
      }
      //remove edge from the invisible graph
      mainGM.edgesMap.delete(edgeToRemoveInvisible.ID);
      Auxiliary.removeEdgeFromGraph(edgeToRemoveInvisible);
    }
  }

  static removeNode(nodeID, visibleGM, mainGM) {
    //get node objects from nodesMap from visible and invisible graph managers
    let nodeToRemove = visibleGM.nodesMap.get(nodeID);
    let nodeToRemoveInvisible = mainGM.nodesMap.get(nodeID);
    if (nodeToRemove) {
      //node might not be in the visible graph
      // Removing nodes from Visible Graph Manager
      let nodeToRemoveDescendants =
        visibleGM.getDescendantsInorder(nodeToRemove); //get list of descendants
      //looping through descendant edges
      nodeToRemoveDescendants.edges.forEach((nodeToRemoveEdge) => {
        //removing edge
        Topology.removeEdge(nodeToRemoveEdge.ID, visibleGM, mainGM);
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
      let nodeToRemoveDescendantsInvisible = mainGM.getDescendantsInorder(
        nodeToRemoveInvisible
      );
      nodeToRemoveDescendantsInvisible.edges.forEach(
        (nodeToRemoveEdgeInvisible) => {
          Topology.removeEdge(
            nodeToRemoveEdgeInvisible.ID,
            visibleGM,
            mainGM
          );
        }
      );
      nodeToRemoveDescendantsInvisible.simpleNodes.forEach(
        (nodeToRemoveSimpleNodeInvisible) => {
          nodeToRemoveSimpleNodeInvisible.owner.removeNode(
            nodeToRemoveSimpleNodeInvisible
          );
          mainGM.nodesMap.delete(nodeToRemoveSimpleNodeInvisible.ID);
        }
      );
      nodeToRemoveDescendantsInvisible.compoundNodes.forEach(
        (nodeToRemoveCompoundNodeInvisible) => {
          nodeToRemoveCompoundNodeInvisible.owner.removeNode(
            nodeToRemoveCompoundNodeInvisible
          );
          mainGM.nodesMap.delete(nodeToRemoveCompoundNodeInvisible.ID);
        }
      );
      //removing nodes from visible and invisible graph managers and nodes maps
      nodeToRemove.owner.removeNode(nodeToRemove);
      visibleGM.nodesMap.delete(nodeID);
      nodeToRemoveInvisible.owner.removeNode(nodeToRemoveInvisible);
      mainGM.nodesMap.delete(nodeID);
    } else {
      //remove node from invisible graph manager
      if (nodeToRemoveInvisible) {
        nodeToRemoveInvisible.owner.removeNode(nodeToRemoveInvisible);
        mainGM.nodesMap.delete(nodeID);
      }
    }
    //reemoving graphs from visible and invisible graph managers if they have no nodes
    visibleGM.graphs.forEach((graph, index) => {
      if (graph.nodes.length == 0 && graph != visibleGM.rootGraph) {
        visibleGM.graphs.splice(index, 1);
      }
    });
    mainGM.graphs.forEach((graph, index) => {
      if (graph.nodes.length == 0 && graph != mainGM.rootGraph) {
        mainGM.graphs.splice(index, 1);
      }
    });
  }

  static reconnect(edgeID, newSourceID, newTargetID, visibleGM, mainGM) {
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
    let edgeToRemoveInvisible = mainGM.edgesMap.get(edgeID);
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
        mainGM
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
        mainGM.addInterGraphEdge(
          edgeToAddForInvisible,
          edgeToAddForInvisible.source,
          edgeToAddForInvisible.target
        );
      }
    }
  }

  static changeParent(nodeID, newParentID, visibleGM, mainGM) {
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
    let nodeToRemoveInvisible = mainGM.nodesMap.get(nodeID);
    let newParentInInvisible = mainGM.nodesMap.get(newParentID);
    if (newParentInInvisible == undefined) {
      newParentInInvisible = mainGM.rootGraph.parent;
    }
    let removedNodeInvisible = nodeToRemoveInvisible.owner.removeNode(
      nodeToRemoveInvisible
    );
    if (newParentInInvisible.child == undefined) {
      mainGM.addGraph(new Graph(null, mainGM), newParentInInvisible);
    }
    newParentInInvisible.child.addNode(removedNodeInvisible);
    edgesOfNodeToRemove.forEach((edge) => {
      Topology.addEdge(
        edge.ID,
        edge.source.ID,
        edge.target.ID,
        visibleGM,
        mainGM
      );
      if (edge.source.isVisible && edge.target.isVisible) {
        let newEdge = mainGM.edgesMap.get(edge.ID);
        newEdge.isVisible = false;
      }
    });
  }
}
