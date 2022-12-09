import { FilterUnfilter } from "./filter-unfilter";

export class HideShow {

  static hide(nodeIDList, edgeIDList, visibleGM, invisibleGM) {
    //// first hide edges
    let nodeIDsListPostProcess = []
    let edgeIDsListPostProcess = [...edgeIDList]
    edgeIDList.forEach(edgeID => {
      let edgeToHide = visibleGM.edgesMap.get(edgeID)
      //// edgeToHide can be a part of a meta edge, a simple (non-meta edge) or may not exist (may be removed inside a collapsed node or may be filtered)
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
        if (!found) {
          visibleGM.edgesMap.delete(edgeToHide.ID);
          Auxiliary.removeEdgeFromGraph(edgeToHide);
        }
        let edgeToHideInvisible = invisibleGM.edgesMap.get(edgeID);
        edgeToHideInvisible.isHidden = true;
        edgeToHideInvisible.isVisible = false;
    });
    nodeIDList.forEach((nodeID)=>{
        let nodeToHide = visibleGM.nodesMap.get(nodeID);
        if (nodeToHide){
            //// nodeToHide can be a simple node, a compound node or may not exist (may be removed inside a collapsed node or may be a filtered simple or compound node)
          // nodeToHide is either simple or a compound node in visible graph, so we first store the IDs of nodeToHide, its descendant nodes and their incident edges in elementIDsForInvisible, then remove those nodes and edges from the graph 
          //All done by getDescendantsInorder
        let nodeToHideDescendants =
          visibleGM.getDescendantsInorder(nodeToHide);
          nodeToHideDescendants.edges.forEach((nodeToHideEdge) => {
            edgeIDsListPostProcess.push(nodeToHideEdge.ID);
            let nodeToHideEdgeInvisible = invisibleGM.edgesMap.get(nodeToHideEdge.ID);
            nodeToHideEdgeInvisible.isVisible = false;
            visibleGM.edgesMap.delete(nodeToHideEdge.ID);
            Auxiliary.removeEdgeFromGraph(nodeToHideEdge);
          });
          nodeToHideDescendants.simpleNodes.forEach((nodeToHideSimpleNode) => {
            let nodeToHideSimpleNodeInvisible = invisibleGM.nodesMap.get(nodeToHideSimpleNode.ID);
            nodeToHideSimpleNodeInvisible.isVisible = false;
            nodeIDsListPostProcess.push(nodeToHideSimpleNode.ID);
            nodeToHideSimpleNode.owner.removeNode(nodeToHideSimpleNode);
            visibleGM.nodesMap.delete(nodeToHideSimpleNode.ID);
          });
          nodeToHideDescendants.compoundNodes.forEach(
            (nodeToHideCompoundNode) => {
              let nodeToHideCompoundNodeInvisible = invisibleGM.nodesMap.get(nodeToHideCompoundNode.ID);
              nodeToHideCompoundNodeInvisible.isVisible = false;
              nodeIDsListPostProcess.push(nodeToHideCompoundNode.ID);
              nodeToHideCompoundNode.owner.removeNode(nodeToHideCompoundNode);
              visibleGM.nodesMap.delete(nodeToHideCompoundNode.ID);
            }
          );
          nodeToHide.owner.removeNode(nodeToHide);
          visibleGM.nodesMap.delete(nodeID);
          let nodeToHideInvisible = invisibleGM.nodesMap.get(nodeID);
          nodeToHideInvisible.isHidden = true;
          nodeToHideInvisible.isVisible = false;

      }else{
        // nodeToHide does not exist in visible graph
          let nodeToHideInvisible = invisibleGM.nodesMap.get(nodeID);
          nodeToHideInvisible.isHidden = true;
          nodeToHideInvisible.isVisible = false;
      }
    })
  }

  static show(nodeIDList, edgeIDList, visibleGM, invisibleGM) {
    nodeIDList.forEach((nodeID)=>{
      let nodeToShow = invisibleGM.nodesMap.get(nodeID);
      nodeToShow.isHidden = false;
      let canNodeToShowBeVisible = true;
      if( nodeToShow.isFiltered==false){
        let tempNode = nodeToShow;
        while(true){
          if(tempNode.owner == invisibleGM.rootGraph){
            break;
          }else{
            if( tempNode.owner.parent.isFiltered || tempNode.owner.parent.isHidden || tempNode.owner.parent.isCollapsed){
              canNodeToShowBeVisible = false;
              break;
            }else{
              tempNode = tempNode.owner.parent;
            }
          }
        }
      }else{
        canNodeToShowBeVisible = false;
      }
      if(canNodeToShowBeVisible){
        FilterUnfilter.makeDescendantNodesVisible(nodeToShow)
        Auxiliary.moveNodeToVisible(nodeToShow,visibleGM,invisibleGM);
        
      }
    })
    edgeIDList.forEach((edgeID)=>{
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
        Auxiliary.moveEdgeToVisible(edgeToShow,visibleGM,invisibleGM);
      }
    })
  }

  static showAll(visibleGM, invisibleGM) {
    let hiddenNodeIDList = []
    let hiddenEdgeIDList = []
    invisibleGM.nodesMap.forEach((node,NodeID)=>{
      if(node.isHidden){
        hiddenNodeIDList.push(node.ID);
      }
    })
    invisibleGM.edgesMap.forEach((edge,EdgeID)=>{
      if(edge.isHidden){
        hiddenEdgeIDList.push(edge.ID);
      }
    })
    this.show(hiddenNodeIDList,hiddenEdgeIDList,visibleGM,invisibleGM)
  }
}