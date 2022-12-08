import { MetaEdge } from "../meta-edge";
import { Auxiliary } from "./auxiliary";

export class FilterUnfilter {

  static filter(nodeIDList, edgeIDList, visibleGM, invisibleGM) {
    let nodeIDsListPostProcess = []
    let edgeIDsListPostProcess = [...edgeIDList]
    edgeIDList.forEach(edgeID => {
      let edgeToFilter = visibleGM.edgesMap.get(edgeID)
      let found = false;
        visibleGM.edgesMap.forEach((visibleEdge) => {
          if (visibleEdge instanceof MetaEdge) {
            // updateMetaEdge function returns updated version of originalEdges without key of edgeTo Remove
            updatedOrignalEdges = updateMetaEdge(
              visibleEdge.originalEdges(),
              edgeToFilter
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
        let edgeToFilterInvisible = invisibleGM.edgesMap.get(edgeID);
        edgeToFilterInvisible.isFiltered = true;
        edgeToFilterInvisible.isVisible = false;
    });
    nodeIDList.forEach((nodeID)=>{
        let nodeToFilter = visibleGM.nodesMap.get(nodeID);
        if (nodeToFilter){
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
              nodeToFilterCompoundNode.owner.removeNode(nodeToFilterCompoundNode);
              visibleGM.nodesMap.delete(nodeToFilterCompoundNode.ID);
            }
          );
          nodeToFilter.owner.removeNode(nodeToFilter);
          visibleGM.nodesMap.delete(nodeID);
          let nodeToFilterInvisible = invisibleGM.nodesMap.get(nodeID);
          nodeToFilterInvisible.isFiltered = true;
          nodeToFilterInvisible.isVisible = false;

      }else{
          let nodeToFilterInvisible = invisibleGM.nodesMap.get(nodeID);
          nodeToFilterInvisible.isFiltered = true;
          nodeToFilterInvisible.isVisible = false;
      }
    })
  }

  static unfilter(nodeIDList, edgeIDList, visibleGM, invisibleGM) {
    
  }
}