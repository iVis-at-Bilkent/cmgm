import { MetaEdge } from "../meta-edge";
import { Auxiliary } from "./auxiliary";

export class FilterUnfilter {

  static filter(nodeIDList, edgeIDList, visibleGM, invisibleGM) {
    let nodeIDsListPostProcess = []
    let edgeIDsListPostProcess = [...edgeIDList]
    edgeIDList.forEach(edgeID => {
      let edgeToFilter = visibleGM.edgesMap.get(edgeID)
      if(edgeToFilter) {
        let found = false;
        visibleGM.edgesMap.forEach((visibleEdge) => {
          if (visibleEdge instanceof MetaEdge) {
            // updateMetaEdge function returns updated version of originalEdges without key of edgeTo Remove
            updatedOrignalEdges = this.updateMetaEdge(
              visibleEdge.originalEdges(),
              edgeToFilter.ID
            );
            // updatedOrignalEdges will be same as originalEdges if edge to remove is not part of the meta edge
            if (updatedOrignalEdges != visibleEdge.originalEdges()) {
              visibleEdge.originalEdges(updatedOrignalEdges);
              found = true;
            }
          }
        });
        if (!found) {
          visibleGM.edgesMap.delete(edgeToFilter.ID);
          Auxiliary.removeEdgeFromGraph(edgeToFilter);
        }
      }
      let edgeToFilterInvisible = invisibleGM.edgesMap.get(edgeID);
      edgeToFilterInvisible.isFiltered = true;
      edgeToFilterInvisible.isVisible = false;
    });
    nodeIDList.forEach((nodeID) => {
      let nodeToFilter = visibleGM.nodesMap.get(nodeID);
      if (nodeToFilter) {
        let nodeToFilterDescendants =
          visibleGM.getDescendantsInorder(nodeToFilter);
        nodeToFilterDescendants.edges.forEach((nodeToFilterEdge) => {
          edgeIDsListPostProcess.push(nodeToFilterEdge.ID);
          let nodeToFilterEdgeInvisible = invisibleGM.edgesMap.get(nodeToFilterEdge.ID);
          nodeToFilterEdgeInvisible.isVisible = false;
          visibleGM.edgesMap.delete(nodeToFilterEdge.ID);
          Auxiliary.removeEdgeFromGraph(nodeToFilterEdge);
        });
        nodeToFilterDescendants.simpleNodes.forEach((nodeToFilterSimpleNode) => {
          let nodeToFilterSimpleNodeInvisible = invisibleGM.nodesMap.get(nodeToFilterSimpleNode.ID);
          nodeToFilterSimpleNodeInvisible.isVisible = false;
          nodeIDsListPostProcess.push(nodeToFilterSimpleNode.ID);
          nodeToFilterSimpleNode.owner.removeNode(nodeToFilterSimpleNode);
          visibleGM.nodesMap.delete(nodeToFilterSimpleNode.ID);
        });
        nodeToFilterDescendants.compoundNodes.forEach(
          (nodeToFilterCompoundNode) => {
            let nodeToFilterCompoundNodeInvisible = invisibleGM.nodesMap.get(nodeToFilterCompoundNode.ID);
            nodeToFilterCompoundNodeInvisible.isVisible = false;
            nodeIDsListPostProcess.push(nodeToFilterCompoundNode.ID);
            if(nodeToFilterCompoundNode.child.nodes.length == 0){
              nodeToFilterCompoundNode.child.siblingGraph.siblingGraph = null;
            }        
            nodeToFilterCompoundNode.owner.removeNode(nodeToFilterCompoundNode);
            visibleGM.nodesMap.delete(nodeToFilterCompoundNode.ID);
          }
        );
        nodeToFilter.owner.removeNode(nodeToFilter);
        visibleGM.nodesMap.delete(nodeID);
        let nodeToFilterInvisible = invisibleGM.nodesMap.get(nodeID);
        nodeToFilterInvisible.isFiltered = true;
        nodeToFilterInvisible.isVisible = false;

      } else {
        let nodeToFilterInvisible = invisibleGM.nodesMap.get(nodeID);
        nodeToFilterInvisible.isFiltered = true;
        nodeToFilterInvisible.isVisible = false;
      }
    })
  }

  static unfilter(nodeIDList, edgeIDList, visibleGM, invisibleGM) {
    nodeIDList.forEach((nodeID) => {
      let nodeToUnfilter = invisibleGM.nodesMap.get(nodeID);
      nodeToUnfilter.isFiltered = false;
      let canNodeToUnfilterBeVisible = true;
      if (nodeToUnfilter.isHidden == false) {
        let tempNode = nodeToUnfilter;
        while (true) {
          if (tempNode.owner == invisibleGM.rootGraph) {
            break;
          } else {
            if (tempNode.owner.parent.isHidden || tempNode.owner.parent.isFiltered || tempNode.owner.parent.isCollapsed) {
              canNodeToUnfilterBeVisible = false;
              break;
            } else {
              tempNode = tempNode.owner.parent;
            }
          }
        }
      } else {
        canNodeToUnfilterBeVisible = false;
      }
      if (canNodeToUnfilterBeVisible) {
        Auxiliary.moveNodeToVisible(nodeToUnfilter, visibleGM, invisibleGM);
        FilterUnfilter.makeDescendantNodesVisible(nodeToUnfilter, visibleGM, invisibleGM)

      }
    })
    edgeIDList.forEach((edgeID) => {
      let edgeToUnfilter = invisibleGM.edgesMap.get(edgeID);
      edgeToUnfilter.isFiltered = false;
      // check edge is part of a meta edge in visible graph
      let found = false;
      visibleGM.edgesMap.forEach((visibleEdge) => {
        if (visibleEdge instanceof MetaEdge) {
          // this.updateMetaEdge function returns updated version of originalEdges without key of edgeTo Remove
          updatedOrignalEdges = this.updateMetaEdge(
            visibleEdge.originalEdges(),
            edgeToUnfilter.ID
          );
          // updatedOrignalEdges will be same as originalEdges if edge to remove is not part of the meta edge
          if (updatedOrignalEdges != visibleEdge.originalEdges()) {
            found = true;
          }
        }
      });
      if (!found && edgeToUnfilter.isHidden == false && edgeToUnfilter.source.isVisible && edgeToUnfilter.target.isVisible) {
        Auxiliary.moveEdgeToVisible(edgeToUnfilter, visibleGM, invisibleGM);
      }
    })
  }

  static makeDescendantNodesVisible(nodeToUnFilter, visibleGM, invisibleGM) {
    if (nodeToUnFilter.child) {
      let nodeToUnFilterDescendants = nodeToUnFilter.child.nodes;
      nodeToUnFilterDescendants.forEach((descendantNode) => {
        if (descendantNode.isFiltered == false && descendantNode.isHidden == false) {
          Auxiliary.moveNodeToVisible(descendantNode, visibleGM, invisibleGM);
          if (descendantNode.isCollapsed == false) {
            this.makeDescendantNodesVisible(descendantNode, visibleGM, invisibleGM);
          }
        }
      })
    }

  }

  static updateMetaEdge(nestedEdges, targetEdgeID) {
    let updatedMegaEdges = [];
    nestedEdges.forEach((nestedEdge, index) => {
      if (typeof nestedEdge === "string") {
        if (nestedEdge != targetEdgeID) {
          updatedMegaEdges.push(nestedEdge);
        }
      } else {
        update = this.updateMetaEdge(nestedEdge, targetEdge);
        updatedMegaEdges.push(update);
      }
    });
    return updatedMegaEdges.length == 1
      ? updatedMegaEdges[0]
      : updatedMegaEdges;
  }
}
