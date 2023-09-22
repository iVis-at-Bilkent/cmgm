import { MetaEdge } from "../meta-edge";
import { Auxiliary } from "./auxiliary";
import { FilterUnfilter } from "./filter-unfilter";

export class HideShow {

  static hide(nodeIDList, edgeIDList, visibleGM, mainGM) {

    // Lists to return back to api to indicate modified elements
    let nodeIDListPostProcess = [];
    let edgeIDListPostProcess = [];
    // looping through given list of edges to hide
    edgeIDList.forEach(edgeID => {
      // get edge from visible GM
      let edgeToHide = visibleGM.edgesMap.get(edgeID)
      // if visible
      if (edgeToHide) {
          if(visibleGM.edgesMap.has(edgeID)){
            // delete from visible map
            visibleGM.edgesMap.delete(edgeToHide.ID);
            // remove edge from graph of visibleGM
            Auxiliary.removeEdgeFromGraph(edgeToHide);
          }
          //report edge as processed
          edgeIDListPostProcess.push(edgeID)
      }else{
        // edge is not visible
        // if edge is part of a meta edge
          if (visibleGM.edgeToMetaEdgeMap.has(edgeID)) {
            // get that meta edge
            let visibleMetaEdge = visibleGM.edgeToMetaEdgeMap.get(edgeID)
            // call updateMetaEdge function to check if all edges who are part of meta edge are filtered or hidden
            // if yes remove said meta edge
            let status = this.updateMetaEdge(visibleMetaEdge.originalEdges, edgeID,visibleGM,mainGM);
            // if yes remove said meta edge from visible graph
            if (status) {
              if(visibleGM.edgesMap.has(visibleMetaEdge.ID)){
                // delete meta edge from visibleGM's map
                visibleGM.edgesMap.delete(visibleMetaEdge.ID);
                // Remove meta edge from graph
                Auxiliary.removeEdgeFromGraph(visibleMetaEdge);
              }
              // Report meta edge as processed
              edgeIDListPostProcess.push(visibleMetaEdge.ID)
            }
          }
        
      }
      // get corresponding edge in invisible side
      let edgeToHideInvisible = mainGM.edgesMap.get(edgeID);
      // set hidden status to tru and visible status to false.
      if(edgeToHideInvisible){
        edgeToHideInvisible.isHidden = true;
        edgeToHideInvisible.isVisible = false;
      }
    });
    // loop through list of nodes to hide
    nodeIDList.forEach((nodeID) => {
      // get node from visible graph
      let nodeToHide = visibleGM.nodesMap.get(nodeID);
      // if node is visible
      if (nodeToHide) {
        // get all descendants of node to to hide, this will not include given node.
        // return object with 
        // descenedant edges as edges
        // descendant simple nodes and compound nodes as simpleNodes and compoundNodes respectively.
        let nodeToHideDescendants =
          visibleGM.getDescendantsInorder(nodeToHide);
          // loop through descendant edges
        nodeToHideDescendants.edges.forEach((nodeToHideEdge) => {
          // report edge as processed
          edgeIDListPostProcess.push(nodeToHideEdge.ID);
          // if edge is not a meta edge
          if (!(nodeToHideEdge instanceof MetaEdge)) {
            // get corresponding edge on invisible side and set visible status false
            let nodeToHideEdgeInvisible = mainGM.edgesMap.get(nodeToHideEdge.ID);
            nodeToHideEdgeInvisible.isVisible = false;
          }
          if(visibleGM.edgesMap.has(nodeToHideEdge.ID)){
            // delete edge from visible side
            visibleGM.edgesMap.delete(nodeToHideEdge.ID);
            // delete edge from grpah
            Auxiliary.removeEdgeFromGraph(nodeToHideEdge);
          }
        });
        // loop through descendant simple nodes
        nodeToHideDescendants.simpleNodes.forEach((nodeToHideSimpleNode) => {
          // get corresponding node in invisible graph and set visible status to false
          let nodeToHideSimpleNodeInvisible = mainGM.nodesMap.get(nodeToHideSimpleNode.ID);
          nodeToHideSimpleNodeInvisible.isVisible = false;
          // report node as processed
          nodeIDListPostProcess.push(nodeToHideSimpleNode.ID);
          // remove node from visible graph and viisble nodes map
          nodeToHideSimpleNode.owner.removeNode(nodeToHideSimpleNode);
          visibleGM.nodesMap.delete(nodeToHideSimpleNode.ID);
        });
        // loop through descendant compound nodes
        nodeToHideDescendants.compoundNodes.forEach(
          (nodeToHideCompoundNode) => {
            // get corresponding compound node in invisible graph and set visible status as false
            let nodeToHideCompoundNodeInvisible = mainGM.nodesMap.get(nodeToHideCompoundNode.ID);
            nodeToHideCompoundNodeInvisible.isVisible = false;
            // report compoound node as processed
            nodeIDListPostProcess.push(nodeToHideCompoundNode.ID);
            // if compound nodes has not child left set corresponding sibling grpah on invisible side as null.
            if (nodeToHideCompoundNode.child.nodes.length == 0) {
              nodeToHideCompoundNode.child.siblingGraph.siblingGraph = null;
            }
            //  remove child graph of the compound node
            visibleGM.removeGraph(nodeToHideCompoundNode.child);
            // remove compound node from visible graph and nodes map
            nodeToHideCompoundNode.owner.removeNode(nodeToHideCompoundNode);
            visibleGM.nodesMap.delete(nodeToHideCompoundNode.ID);
          }
        );
        // if node has a child graph (meaning its a compound node) and there are not child nodes
        if (nodeToHide.child && nodeToHide.child.nodes.length == 0) {
          // set corresponding sibling graph on invisible side as null
          nodeToHide.child.siblingGraph.siblingGraph = null;
        }
        // if node has a child graph (meaning its a compound node) 
        if(nodeToHide.child){
          // remove child graph from visible graph
        visibleGM.removeGraph(nodeToHide.child);
        }
        // remove said node from visible graph and delete it from nodes map
        nodeToHide.owner.removeNode(nodeToHide);
        visibleGM.nodesMap.delete(nodeID);
        // report node as processed
        nodeIDListPostProcess.push(nodeID);
        // get corresponding node in invisible graph and set hidden status true and visible status false.
        let nodeToHideInvisible = mainGM.nodesMap.get(nodeID);
        nodeToHideInvisible.isHidden = true;
        nodeToHideInvisible.isVisible = false;
      }
      else {
        //  if node is not visible
        // get corresponding node from invisible graph and set hidden status true and visible status false
        let nodeToHideInvisible = mainGM.nodesMap.get(nodeID);
        nodeToHideInvisible.isHidden = true;
        nodeToHideInvisible.isVisible = false;
      }
    })
    // turn reported edge list to a set (to remove potential duplicates)
    edgeIDListPostProcess = new Set(edgeIDListPostProcess)
    edgeIDListPostProcess = [...edgeIDListPostProcess]
    // combine edgelist and nodelist and to return. (edge first and nodes latter)
    // if nodes are removed first it cause problem, so report all edges first.
    return edgeIDListPostProcess.concat(nodeIDListPostProcess);
  }

  static show(nodeIDList, edgeIDList, visibleGM, mainGM) {
    // lists to report processed nodes and edges.
    let nodeIDListPostProcess = [];
    let edgeIDListPostProcess = [];
    let metaEdgeIDListPostProcess = [];
    // loop through nodes to show
    nodeIDList.forEach((nodeID) => {
      // get node from invisible graph and set hidden status to false
      let nodeToShow = mainGM.nodesMap.get(nodeID);
      nodeToShow.isHidden = false;
      // set status flag,  that node is allowed to be shown, initalized as true
      let canNodeToShowBeVisible = true;
      // if node is not filtered 
      if (nodeToShow.isFiltered == false) {
        // create temporary copy for node to Show
        let tempNode = nodeToShow;
        // following loop check node's parent and their parent and their parent to make sure that at all levels
        // there is nothing hiden, collapse or filtered.
        // infinite loop until we find that node can not be Showed or we reach root graph.
        while (true) {
          //if next owner graph is root gaph (meaning no more parents)
          if (tempNode.owner == mainGM.rootGraph) {
            break;
          } else {
            // there is another parent of current node 
            // check parent of current node is not hiden, collapse or filtered.
            // if no
            if (tempNode.owner.parent.isHidden || tempNode.owner.parent.isFiltered || tempNode.owner.parent.isCollapsed) {
              // if yes then node ot Show is not allowed to be Showed. and we break loop
              canNodeToShowBeVisible = false;
              break;
            } else {
              // if yes then set current node to its parent to move up the ancestral line
              tempNode = tempNode.owner.parent;
            }
          }
        }
      } else {
        // if node is hidden then it can not be Showed
        canNodeToShowBeVisible = false;
      }
      // if node is allowed to be Showed
      if (canNodeToShowBeVisible) {
        // move node to visible along with all the associated edges that can be brought to visible side
        let tempList = Auxiliary.moveNodeToVisible(nodeToShow, visibleGM, mainGM);
        // make all the descendants of the node to Show,visible. 
        //loop though edges returned
        tempList[0].forEach(item => {
          // report edge as processed (to be added)
          if(visibleGM.edgeToMetaEdgeMap.has(item)){
            let topMetaEdge = Auxiliary.getTopMetaEdge(visibleGM.edgeToMetaEdgeMap.get(item),visibleGM);
            edgeIDListPostProcess.push(topMetaEdge.ID)
          }else{
            edgeIDListPostProcess.push(item)
          }
        })
        // loop through meta edges to be added
        tempList[2].forEach((item) => {
          metaEdgeIDListPostProcess.push(item)
        });
        let descendants = []
        if(!nodeToShow.isCollapsed){
          descendants = FilterUnfilter.makeDescendantNodesVisible(nodeToShow, visibleGM, mainGM);
        // report all descendant edges, simple nodes and compound nodes as processed
        nodeIDListPostProcess = [...nodeIDListPostProcess, ...descendants.simpleNodes, ...descendants.compoundNodes];
        edgeIDListPostProcess = [...edgeIDListPostProcess, ...descendants.edges];
        }

        let nodeToFilterDescendants =
          visibleGM.getDescendantsInorder(nodeToShow);
          // loop through descendant edges
        nodeToFilterDescendants.edges.forEach((nodeToShowEdge) => {
          if (visibleGM.edgeToMetaEdgeMap.has(nodeToShowEdge.ID)) {
            let topMetaEdge = Auxiliary.getTopMetaEdge(visibleGM.edgeToMetaEdgeMap.get(nodeToShowEdge.ID),visibleGM);
            if(topMetaEdge.source.ID == nodeToShow.ID || topMetaEdge.target.ID == nodeToShow.ID){
              edgeIDList.push(nodeToShowEdge.ID)
            }
            
          }
        });

        // report node its self as processed.
        nodeIDListPostProcess.push(nodeToShow.ID);
      }
    })
    // loop through all the edges to Show
    edgeIDList.forEach((edgeID) => {
      // get edge from invisible graph and set hidden status to false
      let edgeToShow = mainGM.edgesMap.get(edgeID);
      edgeToShow.isHidden = false;
      // check if edge is part of a meta edge in visible graph
      if (visibleGM.edgeToMetaEdgeMap.has(edgeID)) {
        // get meta edge
        let visibleMetaEdge = visibleGM.edgeToMetaEdgeMap.get(edgeID)
        // if meta edge is visible
        if(visibleGM.edgesMap.has(visibleMetaEdge.ID)){
          //do nothing
        }else{
          // if meta edge is not visible get source and target of meta edge from visible graph
          let sourceInVisible = visibleGM.nodesMap.get(visibleMetaEdge.source.ID);
          let targetInVisible = visibleGM.nodesMap.get(visibleMetaEdge.target.ID);
          // if source and target are visible
          if(sourceInVisible!=undefined && targetInVisible!=undefined){
            // get corresponding invisible edge for the orignal edge to Show
            let invisibleEdge = mainGM.edgesMap.get(edgeID);
            // if source and target of invisible side edge has same owner graph (meaning they belong in same graph and edge is not inter graph edge)
            if (invisibleEdge.source.owner == invisibleEdge.target.owner) {
              // add meta edge to the sibling side of the invisible edge's owner graph. (doing it from invisible side because there is no way to access visible graph directly)
              // (the meta edge we have is not part of any graph.)
              let newEdge = invisibleEdge.source.owner.siblingGraph.addEdge(visibleMetaEdge, sourceInVisible, targetInVisible);
            }
            else {
              // if source and target of invisible side edge does not has same owner graph (meaning it will be inter graph edge)
              // add meta edge as inter graph edge
              let newEdge = visibleGM.addInterGraphEdge(visibleMetaEdge, sourceInVisible, targetInVisible);
            }
            //  add meta edge to visible graphs edge map (to bring it to visible side)
            visibleGM.edgesMap.set(visibleMetaEdge.ID, visibleMetaEdge);
            // report meta edge as processed.
            edgeIDListPostProcess.push(visibleMetaEdge.ID);
          
          }
        }
        }else{
          // if edge is not part of any meta edge
          // check if edge is not hidden and source and target of edge are visible
          // if yes
          if (edgeToShow.isHidden == false && edgeToShow.source.isVisible && edgeToShow.target.isVisible) {
            // bring edge to visible side
            Auxiliary.moveEdgeToVisible(edgeToShow, visibleGM, mainGM);
            // report edge as processed.
            edgeIDListPostProcess.push(edgeToShow.ID);
          }          
        }
    })
    // create set of the prcessed edge (to remove duplications)
    edgeIDListPostProcess = new Set(edgeIDListPostProcess)
    // turn set back to array
    edgeIDListPostProcess = [...edgeIDListPostProcess]
    // combine node and edge list.
    // report nodes first then edges
    // (if edges are reported first they will be added first and without source and target nodes present cytoscpae will give error) 
    return [nodeIDListPostProcess.concat(edgeIDListPostProcess),metaEdgeIDListPostProcess];

  }

  static showAll(visibleGM, mainGM) {
    let hiddenNodeIDList = [];
    let hiddenEdgeIDList = [];
    mainGM.nodesMap.forEach((node, NodeID) => {
      if (node.isHidden) {
        hiddenNodeIDList.push(node.ID);
      }
    });
    mainGM.edgesMap.forEach((edge, EdgeID) => {
      if (edge.isHidden) {
        hiddenEdgeIDList.push(edge.ID);
      }
    });
    return this.show(hiddenNodeIDList, hiddenEdgeIDList, visibleGM, mainGM);
  }
}