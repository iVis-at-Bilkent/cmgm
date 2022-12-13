import { MetaEdge } from "../meta-edge";
import { Auxiliary } from "./auxiliary";

export class FilterUnfilter {

  static filter(nodeIDList, edgeIDList, visibleGM, invisibleGM) {
    let nodeIDListPostProcess = [];
    let edgeIDListPostProcess = [...edgeIDList];
    edgeIDList.forEach(edgeID => {
      let edgeToFilter = visibleGM.edgesMap.get(edgeID)
      if (edgeToFilter) {
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
          edgeIDListPostProcess.push(nodeToFilterEdge.ID);
          let nodeToFilterEdgeInvisible = invisibleGM.edgesMap.get(nodeToFilterEdge.ID);
          nodeToFilterEdgeInvisible.isVisible = false;
          visibleGM.edgesMap.delete(nodeToFilterEdge.ID);
          Auxiliary.removeEdgeFromGraph(nodeToFilterEdge);
        });
        nodeToFilterDescendants.simpleNodes.forEach((nodeToFilterSimpleNode) => {
          let nodeToFilterSimpleNodeInvisible = invisibleGM.nodesMap.get(nodeToFilterSimpleNode.ID);
          nodeToFilterSimpleNodeInvisible.isVisible = false;
          nodeIDListPostProcess.push(nodeToFilterSimpleNode.ID);
          nodeToFilterSimpleNode.owner.removeNode(nodeToFilterSimpleNode);
          visibleGM.nodesMap.delete(nodeToFilterSimpleNode.ID);
        });
        nodeToFilterDescendants.compoundNodes.forEach(
          (nodeToFilterCompoundNode) => {
            let nodeToFilterCompoundNodeInvisible = invisibleGM.nodesMap.get(nodeToFilterCompoundNode.ID);
            nodeToFilterCompoundNodeInvisible.isVisible = false;
            nodeIDListPostProcess.push(nodeToFilterCompoundNode.ID);
            if (nodeToFilterCompoundNode.child.nodes.length == 0) {
              nodeToFilterCompoundNode.child.siblingGraph.siblingGraph = null;
            }
            nodeToFilterCompoundNode.owner.removeNode(nodeToFilterCompoundNode);
            visibleGM.nodesMap.delete(nodeToFilterCompoundNode.ID);
          }
        );
        if (nodeToFilter.child && nodeToFilter.child.nodes.length == 0) {
          nodeToFilter.child.siblingGraph.siblingGraph = null;
        }
        nodeToFilter.owner.removeNode(nodeToFilter);
        visibleGM.nodesMap.delete(nodeID);
        nodeIDListPostProcess.push(nodeID);
        let nodeToFilterInvisible = invisibleGM.nodesMap.get(nodeID);
        nodeToFilterInvisible.isFiltered = true;
        nodeToFilterInvisible.isVisible = false;
      }
      else {
        let nodeToFilterInvisible = invisibleGM.nodesMap.get(nodeID);
        nodeToFilterInvisible.isFiltered = true;
        nodeToFilterInvisible.isVisible = false;
      }
    })
    
    edgeIDListPostProcess = new Set(edgeIDListPostProcess)
    edgeIDListPostProcess = [...edgeIDListPostProcess]
    return edgeIDListPostProcess.concat(nodeIDListPostProcess);
  }

  static unfilter(nodeIDList, edgeIDList, visibleGM, invisibleGM) {
    let nodeIDListPostProcess = [];
    let edgeIDListPostProcess = [];
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
        let descendants = FilterUnfilter.makeDescendantNodesVisible(nodeToUnfilter, visibleGM, invisibleGM);
        nodeIDListPostProcess = [...nodeIDListPostProcess,...descendants.simpleNodes,...descendants.compoundNodes];
        edgeIDListPostProcess = [...edgeIDListPostProcess,...descendants.edges];
        nodeIDListPostProcess.push(nodeToUnfilter.ID);
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
        edgeIDListPostProcess.push(edgeToUnfilter.ID);
      }
    })
    edgeIDListPostProcess = new Set(edgeIDListPostProcess)
    edgeIDListPostProcess = [...edgeIDListPostProcess]

    return nodeIDListPostProcess.concat(edgeIDListPostProcess);
  }

  static makeDescendantNodesVisible(nodeToUnfilter, visibleGM, invisibleGM) {
    let descendants = {
      edges: new Set(),
      simpleNodes: [],
      compoundNodes: []
    };
    if (nodeToUnfilter.child) {
      let nodeToUnfilterDescendants = nodeToUnfilter.child.nodes;
      nodeToUnfilterDescendants.forEach((descendantNode) => {
        if (descendantNode.isFiltered == false && descendantNode.isHidden == false) {
          Auxiliary.moveNodeToVisible(descendantNode, visibleGM, invisibleGM);
          if (descendantNode.isCollapsed == false) {
            let childDescendents = this.makeDescendantNodesVisible(descendantNode, visibleGM, invisibleGM);
            for (var id in childDescendents) {
              descendants[id] = [...descendants[id] || [], ...childDescendents[id]];
            }
            descendants['edges'] = new Set(descendants['edges']);
            if (descendantNode.child) {
              descendants.compoundNodes.push(descendantNode.ID);
            } else {
              descendants.simpleNodes.push(descendantNode.ID);
            }
            let nodeEdges = descendantNode.edges;
            nodeEdges.forEach(item => descendants['edges'].add(item.ID));
          }
        }
      })
    }
    nodeToUnfilter.edges.forEach((edge) => {
      descendants.edges.add(edge.ID);
    });
    return descendants;
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
