import { Graph } from "../graph";
import { Topology } from "./topology";

export class ExpandCollapse {
//Double Recursive Solution 
  #collapseNode(node, visibleGM, invisibleGM) {
   
    //firt process the visible graph
    let [nodeIDListForInvisible,edgeIDListForInvisible] = traverseDescendants(node,node,visibleGM)
    visibleGM.removeGraph(node.child);
    let nodeInInvisible = invisibleGM.nodesMap.get(node.ID);
    nodeInInvisible.isCollapsed = true;
    nodeIDListForInvisible.forEach(nodeIDInvisible => {
      nodeInInvisible = invisibleGM.nodesMap.get(nodeIDInvisible);
      nodeInInvisible.isVisible = false;
    });
    edgeIDListForInvisible.forEach(edgeIDInvisible => {
      let edgeInInvisible = invisibleGM.edgesMap.get(edgeIDInvisible);
      edgeInInvisible.isVisible = false;
    });
  }
  static traverseDescendants (node, nodeToBeCollapsed, visibleGM){
    let nodeIDListForInvisible = []
    let edgeIDListForInvisible = []
    if(node.child){
      childrenNodes = node.child.nodes
      childrenNodes.forEach(child => {
        nodeIDListForInvisible.push(child.ID)
        child.edges.forEach(childEdge => {
          edgeIDListForInvisible.push(childEdge.ID)
          if(childEdge.isInterGraph){
            let metaEdgeToBeCreated;
            if(childEdge.source == child){
              metaEdgeToBeCreated = incidentEdgeIsOutOfScope(childEdge.target,nodeToBeCollapsed,visibleGM)
              if(metaEdgeToBeCreated){
                Topology.addEdge(
                  childEdge.ID,
                  nodeToBeCollapsed.ID,
                  childEdge.target.ID,
                  visibleGM,
                  invisibleGM
                );
            }
            else{
              metaEdgeToBeCreated = incidentEdgeIsOutOfScope(childEdge.source,nodeToBeCollapsed,visibleGM)
              if(metaEdgeToBeCreated){
                Topology.addEdge(
                  childEdge.ID,
                  childEdge.source.ID,
                  nodeToBeCollapsed.ID,
                  visibleGM,
                  invisibleGM
                );
            }
            }
          }
        }
        });
        let [nodeIDsReturned,edgeIDsReturned] = traverseDescendants(child,nodeToBeCollapsed,visibleGM)
        nodeIDListForInvisible = [...nodeIDListForInvisible,...nodeIDsReturned]
        edgeIDListForInvisible = [...edgeIDListForInvisible,...edgeIDsReturned]
      });
    }
    return [nodeIDListForInvisible,edgeIDListForInvisible]
  }
  static incidentEdgeIsOutOfScope(interGraphEdgeTarget, nodeToBeCollapsed,visibleGM){
    if(interGraphEdgeTarget.owner == visibleGM.rootGraph){
      return true
    }
    else if(interGraphEdgeTarget.owner.parent == nodeToBeCollapsed){
      return false
    }
    else{
      incidentEdgeIsOutOfScope(interGraphEdgeTarget.owner.parent,nodeToBeCollapsed,visibleGM)
    }
  }
  //-----------------------------------------------
  //Iterative Collapse Soltion
  //-------------------------------------------------
  #collapseNode(node, visibleGM, invisibleGM) {
    let nodeIDListForInvisible = [];
    let edgeIDListForInvisible = [];
    //firt process the visible graph
    let descendantNodes = getDescendantNodes(node);
    descendantNodes.forEach(childNode => {
      nodeIDListForInvisible.push(childNode.ID);
      childNode.edges.forEach(childEdge => {
        edgeIDListForInvisible.push(childEdge.ID)
        if(childEdge.isInterGraph){
          let metaEdgeToBeCreated;
            if(childEdge.source == childNode){
              metaEdgeToBeCreated = [...descendantNodes,node].includes(childEdge.target);
              if(metaEdgeToBeCreated){
                Topology.addEdge(
                  childEdge.ID,
                  node.ID,
                  childEdge.target.ID,
                  visibleGM,
                  invisibleGM
                );
            }
            else{
              metaEdgeToBeCreated = [...descendantNodes,node].includes(childEdge.source);
              if(metaEdgeToBeCreated){
                Topology.addEdge(
                  childEdge.ID,
                  childEdge.source.ID,
                  node.ID,
                  visibleGM,
                  invisibleGM
                );
            }
            }
          }
        }
      });
    });
    visibleGM.removeGraph(node.child);
    let nodeInInvisible = invisibleGM.nodesMap.get(node.ID);
    nodeInInvisible.isCollapsed = true;
    nodeIDListForInvisible.forEach(nodeIDInvisible => {
      nodeInInvisible = invisibleGM.nodesMap.get(nodeIDInvisible);
      nodeInInvisible.isVisible = false;
    });
    edgeIDListForInvisible.forEach(edgeIDInvisible => {
      let edgeInInvisible = invisibleGM.edgesMap.get(edgeIDInvisible);
      edgeInInvisible.isVisible = false;
    });
  }
  static  getDescendantNodes(node){
    let descendantNodes = [];
    if(node.child){
      node.child.nodes.forEach(childNode => {
        descendantNodes.push(childNode);
        let nodesReturned = this.getDescendantNodes(childNode);
        descendantNodes = [...descendantNodes,...nodesReturned];
      });
    }
  return descendantNodes;
  }
  #expandNode(node, isRecursive, visibleGM, invisibleGM) {
    let nodeInInvisible = invisibleGM.nodesMap.get(node.ID)
    let newVisibleGraph = visibleGM.addGraph(new Graph(node,visibleGM),node)
    nodeInInvisible.child.siblingGraph = newVisibleGraph
    newVisibleGraph.siblingGraph = nodeInInvisible.child
    let childrenNodes = nodeInInvisible.child.nodes
    childrenNodes.forEach(child => {
      if((child.isCollapsed && isRecursive && (!child.isFiltered) && (!child.isHidden))||((!child.isCollapsed)  && (!child.isFiltered) && (!child.isHidden))){
        moveNodeToVisible(child);
        if(child.child){
          this.#expandNode(child,isRecursive,visibleGM,invisibleGM);
        }

      }
      else if(child.isCollapsed && (!isRecursive) && (!child.isFiltered) && (!child.isHidden)){
        moveNodeToVisible(child);
      }
    });
  }

  static collapseNodes(nodeIDList, isRecursive, visibleGM, invisibleGM) {
    if(isRecursive){
      nodeIDList.forEach(nodeID => {
        let nodeInVisible = visibleGM.nodesMap.get(nodeID);
        this.collapseCompoundDescendantNodes(nodeInVisible,visibleGM,invisibleGM);
      });
    }else{
      nodeIDList.forEach(nodeID => {
        let nodeInVisible = visibleGM.nodesMap.get(nodeID);
        this.#collapseNode(nodeInVisible,visibleGM,invisibleGM);
      });
    }
  }
 static  collapseCompoundDescendantNodes(node,visibleGM,invisibleGM){
    if(node.child){
      node.child.nodes.forEach(childNode => {
        if(child.child){
          descendantNodes.push(childNode);
          this.getCompoundDescendantNodes(childNode);
          this.#collapseNode(childNode,visibleGM,invisibleGM)
        }
      });
    }
  }
  static expandNodes(nodeIDList, isRecursive, visibleGM, invisibleGM) {
    nodeIDList.forEach(nodeID => {
      let nodeInVisible = visibleGM.nodesMap.get(nodeID);
      this.#expandNode(nodeInVisible,isRecursive,visibleGM,invisibleGM)
    });
  }

  static collapseAllNodes(visibleGM, invisibleGM) {
    let nodesIDList = []
    visibleGM.rootGraph.nodes.forEach(rootNode => {
      if(rootNode.child){
        nodesIDList.push(rootNode.ID)
      }
    });
    this.collapseNodes(nodeIDList,true,visibleGM,invisibleGM)
  }

  static expandAllNodes(visibleGM, invisibleGM) {
    let topCollapsedCompoundNodes = this.getTopCollapsedCompoundNodes(visibleGM.rootGraph.parent);
    this.expandNodes(topCollapsedCompoundNodes,true,visibleGM,invisibleGM);
  }
  static  getTopCollapsedCompoundNodes(node){
    let descendantNodes = [];
    if(node.child){
      node.child.nodes.forEach(childNode => {
        if(child.child && child.isCollapsed){
          descendantNodes.push(childNode);
        }
        else if(child.child && (!child.isCollapsed)){
          descendantNodes.push(childNode);
          let nodesReturned = this.getDescendantNodes(childNode);
          descendantNodes = [...descendantNodes,...nodesReturned];
        }
      });
    }
  return descendantNodes;
  }
static  getCompoundDescendantNodes(node,visibleGM,invisibleGM){
    if(node.child){
      node.child.nodes.forEach(childNode => {
        if(child.child){
          descendantNodes.push(childNode);
          this.getCompoundDescendantNodes(childNode);
          this.#collapseNode(childNode,visibleGM,invisibleGM)
        }
      });
    }
  }
  static collapseEdges(edgeIDList, visibleGM, invisibleGM) {

  }

  static expandEdges(edgeIDList, visibleGM, invisibleGM) {

  }

  static collapseEdgesBetweenNodes(nodeIDList, visibleGM, invisibleGM) {

  }

  static expandEdgesBetweenNodes(nodeIDList, isRecursive, visibleGM, invisibleGM) {

  }

  static collapseAllEdges(visibleGM, invisibleGM) {

  }
}