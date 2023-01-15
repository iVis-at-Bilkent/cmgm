import { MetaEdge } from "../meta-edge";
import { Auxiliary } from "./auxiliary";

export class FilterUnfilter {

  static filter(nodeIDList, edgeIDList, visibleGM, invisibleGM) {
    let nodeIDListPostProcess = [];
    let edgeIDListPostProcess = [];
    edgeIDList.forEach(edgeID => {
      let edgeToFilter = visibleGM.edgesMap.get(edgeID)
      if (edgeToFilter) {
          visibleGM.edgesMap.delete(edgeToFilter.ID);
          Auxiliary.removeEdgeFromGraph(edgeToFilter);
          edgeIDListPostProcess.push(edgeID)
      }else{
          if (visibleGM.edgeToMetaEdgeMap.has(edgeID)) {
            let visibleMetaEdge = visibleGM.edgeToMetaEdgeMap.get(edgeID)
            let status = this.updateMetaEdge(visibleMetaEdge.originalEdges, edgeID,visibleGM,invisibleGM);
            if (status) {
              visibleGM.edgesMap.delete(visibleMetaEdge.ID);
              Auxiliary.removeEdgeFromGraph(visibleMetaEdge);
              edgeIDListPostProcess.push(visibleMetaEdge.ID)
            }
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
          if (!(nodeToFilterEdge instanceof MetaEdge)) {
            let nodeToFilterEdgeInvisible = invisibleGM.edgesMap.get(nodeToFilterEdge.ID);
            nodeToFilterEdgeInvisible.isVisible = false;
          }
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
            visibleGM.removeGraph(nodeToFilterCompoundNode.child);
            nodeToFilterCompoundNode.owner.removeNode(nodeToFilterCompoundNode);
            visibleGM.nodesMap.delete(nodeToFilterCompoundNode.ID);
          }
        );
        if (nodeToFilter.child && nodeToFilter.child.nodes.length == 0) {
          nodeToFilter.child.siblingGraph.siblingGraph = null;
        }
        if(nodeToFilter.child){
        visibleGM.removeGraph(nodeToFilter.child);
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
        let tempList = Auxiliary.moveNodeToVisible(nodeToUnfilter, visibleGM, invisibleGM);
        let descendants = FilterUnfilter.makeDescendantNodesVisible(nodeToUnfilter, visibleGM, invisibleGM);
        nodeIDListPostProcess = [...nodeIDListPostProcess, ...descendants.simpleNodes, ...descendants.compoundNodes];
        edgeIDListPostProcess = [...edgeIDListPostProcess, ...descendants.edges];
        nodeIDListPostProcess.push(nodeToUnfilter.ID);
      }
    })
    edgeIDList.forEach((edgeID) => {
      let edgeToUnfilter = invisibleGM.edgesMap.get(edgeID);
      edgeToUnfilter.isFiltered = false;
      // check edge is part of a meta edge in visible graph
      if (visibleGM.edgeToMetaEdgeMap.has(edgeID)) {
        let visibleMetaEdge = visibleGM.edgeToMetaEdgeMap.get(edgeID)
        if(visibleGM.edgesMap.has(visibleMetaEdge.ID)){
          //do nothing
        }else{
          
          let sourceInVisible = visibleGM.nodesMap.get(visibleMetaEdge.source.ID);
          let targetInVisible = visibleGM.nodesMap.get(visibleMetaEdge.target.ID);
          if(sourceInVisible!=undefined && targetInVisible!=undefined){

            let invisibleEdge = invisibleGM.edgesMap.get(edgeID);
            if (invisibleEdge.source.owner == invisibleEdge.target.owner) {
              let newEdge = invisibleEdge.source.owner.siblingGraph.addEdge(visibleMetaEdge, sourceInVisible, targetInVisible);
            }
            else {
              let newEdge = visibleGM.addInterGraphEdge(visibleMetaEdge, sourceInVisible, targetInVisible);
            }
            visibleGM.edgesMap.set(visibleMetaEdge.ID, visibleMetaEdge);
            edgeIDListPostProcess.push(visibleMetaEdge.ID);
          
          }
        }
        }else{
          if (edgeToUnfilter.isHidden == false && edgeToUnfilter.source.isVisible && edgeToUnfilter.target.isVisible) {
            Auxiliary.moveEdgeToVisible(edgeToUnfilter, visibleGM, invisibleGM);
            edgeIDListPostProcess.push(edgeToUnfilter.ID);
          }          
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
          let tempList = Auxiliary.moveNodeToVisible(descendantNode, visibleGM, invisibleGM);
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
            nodeEdges.forEach((item) => {
              if (item.isFiltered == false && item.isHidden == false && item.source.isVisible && item.target.isVisible) {
                descendants['edges'].add(item.ID);
              }
            });
          }
        }
      })
    }
    nodeToUnfilter.edges.forEach((edge) => {
      if (edge.isFiltered == false && edge.isHidden == false && edge.source.isVisible && edge.target.isVisible) {
        descendants.edges.add(edge.ID);
      }
    });
    return descendants;
  }
//check if any orignal edge is not filtered and not hidden other than target itself if yes keep meta edge else remove meta edge
  static updateMetaEdge(nestedEdges, targetEdgeID,visibleGM,invisibleGM) {
    let status = true;
    nestedEdges.forEach((nestedEdgeID, index) => {
      if (visibleGM.metaEdgesMap.has(nestedEdgeID)) {
        let nestedEdge = visibleGM.metaEdgesMap.get(nestedEdgeID);
        let update = this.updateMetaEdge(nestedEdge.originalEdges, targetEdgeID,visibleGM,invisibleGM);
        status = (update==status)

      } else {
        let nestedEdge = invisibleGM.edgesMap.get(nestedEdgeID);
        if (nestedEdge.isFiltered == false && nestedEdge.isHidden == false && nestedEdgeID!=targetEdgeID) {
          status = false;
        }
      }
    });
    return status;
  }
}
