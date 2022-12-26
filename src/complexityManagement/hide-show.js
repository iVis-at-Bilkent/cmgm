import { MetaEdge } from "../meta-edge";
import { Auxiliary } from "./auxiliary";
import { FilterUnfilter } from "./filter-unfilter";

export class HideShow {

  static hide(nodeIDList, edgeIDList, visibleGM, invisibleGM) {
    let nodeIDListPostProcess = [];
    let edgeIDListPostProcess = [...edgeIDList];
    // first hide edges
    edgeIDList.forEach(edgeID => {
      let edgeToHide = visibleGM.edgesMap.get(edgeID); 
      // edgeToHide can be a part of a meta edge, a simple (non-meta edge) or may not exist (may be removed inside a collapsed node or may be filtered)
      if (edgeToHide) {
        let found = false;
        visibleGM.edgesMap.forEach((visibleEdge) => {
          if (visibleEdge instanceof MetaEdge) {
            // updateMetaEdge function returns updated version of originalEdges without key of edgeTo Remove
            updatedOrignalEdges = this.updateMetaEdge(
              visibleEdge.originalEdges(),
              edgeToHide.ID
            );
            // updatedOrignalEdges will be same as originalEdges if edge to remove is not part of the meta edge
            if (updatedOrignalEdges != visibleEdge.originalEdges()) {
              visibleEdge.originalEdges(updatedOrignalEdges);
              found = true;
            }
          }
        });
        // if edge is not part of any meta edge
        if (!found) {
          visibleGM.edgesMap.delete(edgeToHide.ID);
          Auxiliary.removeEdgeFromGraph(edgeToHide);
        }
      }
      //get ege from the invisible graph
      let edgeToHideInvisible = invisibleGM.edgesMap.get(edgeID);
      //change hidden and visibleity flag
      edgeToHideInvisible.isHidden = true;
      edgeToHideInvisible.isVisible = false;
    });
    //looping through list of nodes to hide
    nodeIDList.forEach((nodeID) => {
      let nodeToHide = visibleGM.nodesMap.get(nodeID); 
      // nodeToHide can be a simple node, a compound node or may not exist (may be removed inside a collapsed node or may be a filtered simple or compound node)
      if (nodeToHide) {
        // nodeToHide is either simple or a compound node in visible graph, so we first store the IDs of nodeToHide, its descendant nodes and their incident edges in elementIDsForInvisible, then remove those nodes and edges from the graph 
        //All done by getDescendantsInorder
        let nodeToHideDescendants =
          visibleGM.getDescendantsInorder(nodeToHide);
        //looping thorugh descendant edeges
        //get edge from invisible graph chnage visibility flag
        //remove edge from the visible graph
        nodeToHideDescendants.edges.forEach((nodeToHideEdge) => {
          edgeIDListPostProcess.push(nodeToHideEdge.ID);
          if(!(nodeToHideEdge instanceof MetaEdge)) {
            let nodeToHideEdgeInvisible = invisibleGM.edgesMap.get(nodeToHideEdge.ID);
            nodeToHideEdgeInvisible.isVisible = false;
          }
          visibleGM.edgesMap.delete(nodeToHideEdge.ID);
          Auxiliary.removeEdgeFromGraph(nodeToHideEdge);
        });
        //looping thorugh descendant simple nodes
        //get node from invisible graph chnage visibility flag
        //remove node from the visible graph and nodes map
        nodeToHideDescendants.simpleNodes.forEach((nodeToHideSimpleNode) => {
          let nodeToHideSimpleNodeInvisible = invisibleGM.nodesMap.get(nodeToHideSimpleNode.ID);
          nodeToHideSimpleNodeInvisible.isVisible = false;
          nodeIDListPostProcess.push(nodeToHideSimpleNode.ID);
          nodeToHideSimpleNode.owner.removeNode(nodeToHideSimpleNode);
          visibleGM.nodesMap.delete(nodeToHideSimpleNode.ID);
        });
        //looping thorugh descendant compound nodes
        //get node from invisible graph chnage visibility flag
        //remove node from the visible graph and nodes map
        nodeToHideDescendants.compoundNodes.forEach(
          (nodeToHideCompoundNode) => {
            let nodeToHideCompoundNodeInvisible = invisibleGM.nodesMap.get(nodeToHideCompoundNode.ID);
            nodeToHideCompoundNodeInvisible.isVisible = false;
            nodeIDListPostProcess.push(nodeToHideCompoundNode.ID);
            if (nodeToHideCompoundNode.child.nodes.length == 0) {
              nodeToHideCompoundNode.child.siblingGraph.siblingGraph = null;
            }
            nodeToHideCompoundNode.owner.removeNode(nodeToHideCompoundNode);
            visibleGM.nodesMap.delete(nodeToHideCompoundNode.ID);
          }
        );
        //not to remove the child graph can be empty, if yes set sibling graph status of sibling invisible graph to null
        if (nodeToHide.child && nodeToHide.child.nodes.length == 0) {
          nodeToHide.child.siblingGraph.siblingGraph = null;
        }
        //remove node owner graph, delete it from visible graph and change hidden and visbile flags in invisible graph
        nodeToHide.owner.removeNode(nodeToHide);
        visibleGM.nodesMap.delete(nodeID);
        nodeIDListPostProcess.push(nodeID);
        let nodeToHideInvisible = invisibleGM.nodesMap.get(nodeID);
        nodeToHideInvisible.isHidden = true;
        nodeToHideInvisible.isVisible = false;
      }
      else {
        // nodeToHide does not exist in visible graph
        let nodeToHideInvisible = invisibleGM.nodesMap.get(nodeID);
        nodeToHideInvisible.isHidden = true;
        nodeToHideInvisible.isVisible = false;
      }
    })
    //remove duplication from edge list and retrun the combined list of edges and nodes in that order
    edgeIDListPostProcess = new Set(edgeIDListPostProcess)
    edgeIDListPostProcess = [...edgeIDListPostProcess]
    return edgeIDListPostProcess.concat(nodeIDListPostProcess);
  }

  static show(nodeIDList, edgeIDList, visibleGM, invisibleGM) {
    let nodeIDListPostProcess = [];
    let edgeIDListPostProcess = [];
    nodeIDList.forEach((nodeID) => {
      if (!visibleGM.nodesMap.get(nodeID)) {
        let nodeToShow = invisibleGM.nodesMap.get(nodeID);
        nodeToShow.isHidden = false;
        let canNodeToShowBeVisible = true;
        if (nodeToShow.isFiltered == false) {
          let tempNode = nodeToShow;
          while (true) {
            if (tempNode.owner == invisibleGM.rootGraph) {
              break;
            } else {
              if (tempNode.owner.parent.isFiltered || tempNode.owner.parent.isHidden || tempNode.owner.parent.isCollapsed) {
                canNodeToShowBeVisible = false;
                break;
              } else {
                tempNode = tempNode.owner.parent;
              }
            }
          }
        } else {
          canNodeToShowBeVisible = false;
        }
        if (canNodeToShowBeVisible) {
          Auxiliary.moveNodeToVisible(nodeToShow, visibleGM, invisibleGM);
          let descendants = FilterUnfilter.makeDescendantNodesVisible(nodeToShow, visibleGM, invisibleGM);
          nodeIDListPostProcess = [...nodeIDListPostProcess, ...descendants.simpleNodes, ...descendants.compoundNodes];
          edgeIDListPostProcess = [...edgeIDListPostProcess, ...descendants.edges];
          nodeIDListPostProcess.push(nodeToShow.ID);
        }
      }
    });
    edgeIDList.forEach((edgeID) => {
      if (!visibleGM.edgesMap.get(edgeID)) {
        let edgeToShow = invisibleGM.edgesMap.get(edgeID);
        edgeToShow.isHidden = false;
        // check edge is part of a meta edge in visible graph
        let found = false;
        visibleGM.edgesMap.forEach((visibleEdge) => {
          if (visibleEdge instanceof MetaEdge) {
            // this.updateMetaEdge function returns updated version of originalEdges without key of edgeTo Remove
            updatedOrignalEdges = FilterUnfilter.updateMetaEdge(
              visibleEdge.originalEdges(),
              edgeToShow.ID
            );
            // updatedOrignalEdges will be same as originalEdges if edge to remove is not part of the meta edge
            if (updatedOrignalEdges != visibleEdge.originalEdges()) {
              found = true;
            }
          }
        });
        if (!found && edgeToShow.isFiltered == false && edgeToShow.source.isVisible && edgeToShow.target.isVisible) {
          Auxiliary.moveEdgeToVisible(edgeToShow, visibleGM, invisibleGM);
          edgeIDListPostProcess.push(edgeToShow.ID);

        }
      }
    })

    edgeIDListPostProcess = new Set(edgeIDListPostProcess);
    edgeIDListPostProcess = [...edgeIDListPostProcess];
    return nodeIDListPostProcess.concat(edgeIDListPostProcess);

  }

  static showAll(visibleGM, invisibleGM) {
    let hiddenNodeIDList = [];
    let hiddenEdgeIDList = [];
    invisibleGM.nodesMap.forEach((node, NodeID) => {
      if (node.isHidden) {
        hiddenNodeIDList.push(node.ID);
      }
    });
    invisibleGM.edgesMap.forEach((edge, EdgeID) => {
      if (edge.isHidden) {
        hiddenEdgeIDList.push(edge.ID);
      }
    });
    return this.show(hiddenNodeIDList, hiddenEdgeIDList, visibleGM, invisibleGM);
  }
}