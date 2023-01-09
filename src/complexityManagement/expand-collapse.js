import { Edge } from "../edge";
import { Graph } from "../graph";
import { MetaEdge } from "../meta-edge";
import { Auxiliary } from "./auxiliary";
import { Topology } from "./topology";

export class ExpandCollapse {

  static removedElements = {
    nodeIDListForInvisible: new Set(),
    edgeIDListForInvisible: new Set(),
    metaEdgeIDListForVisible: new Set()
  };

  //Double Recursive Solution 
  static #collapseNode(node, visibleGM, invisibleGM) {
    //first process the visible graph
    let [nodeIDListForInvisible, edgeIDListForInvisible, metaEdgeIDListForVisible] = this.traverseDescendants(node, node, visibleGM, invisibleGM);
    visibleGM.removeGraph(node.child);
    nodeIDListForInvisible.forEach(nodeID => {
      visibleGM.nodesMap.delete(nodeID);
    });
    edgeIDListForInvisible.forEach(edgeID => {
      visibleGM.edgesMap.delete(edgeID);
    });
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

    nodeIDListForInvisible.forEach(item => this.removedElements.nodeIDListForInvisible.add(item));
    edgeIDListForInvisible.forEach(item => this.removedElements.edgeIDListForInvisible.add(item));
    this.removedElements.metaEdgeIDListForVisible.add(metaEdgeIDListForVisible);
  }

  static traverseDescendants(node, nodeToBeCollapsed, visibleGM, invisibleGM) {
    let nodeIDListForInvisible = [];
    let edgeIDListForInvisible = [];
    let metaEdgeIDListForVisible = [];
    if (node.child) {
      let childrenNodes = node.child.nodes;
      childrenNodes.forEach(child => {
        nodeIDListForInvisible.push(child.ID)
        child.edges.forEach(childEdge => {
          if (!(childEdge instanceof MetaEdge)) {
            edgeIDListForInvisible.push(childEdge.ID);
          }
          if (childEdge.isInterGraph) {
            let metaEdgeToBeCreated;
            if (childEdge.source == child) {
              metaEdgeToBeCreated = this.incidentEdgeIsOutOfScope(childEdge.target, nodeToBeCollapsed, visibleGM)
              if (metaEdgeToBeCreated) {
                let newMetaEdge = Topology.addMetaEdge(nodeToBeCollapsed.ID, childEdge.target.ID, [childEdge.ID],visibleGM, invisibleGM);
                metaEdgeIDListForVisible.push(newMetaEdge.ID);
              }
            }
            else {
              metaEdgeToBeCreated = this.incidentEdgeIsOutOfScope(childEdge.source, nodeToBeCollapsed, visibleGM)
              if (metaEdgeToBeCreated) {
                let newMetaEdge = Topology.addMetaEdge(nodeToBeCollapsed.ID, childEdge.target.ID, [childEdge.ID], visibleGM, invisibleGM);
                metaEdgeIDListForVisible.push(newMetaEdge.ID);
              }
            }
          }
        });
        let [nodeIDsReturned, edgeIDsReturned, metaEdgeIDsReturned] = this.traverseDescendants(child, nodeToBeCollapsed, visibleGM, invisibleGM);
        nodeIDListForInvisible = [...nodeIDListForInvisible, ...nodeIDsReturned];
        edgeIDListForInvisible = [...edgeIDListForInvisible, ...edgeIDsReturned];
        metaEdgeIDListForVisible = [...metaEdgeIDListForVisible, ...metaEdgeIDsReturned];
      });
    }
    return [nodeIDListForInvisible, edgeIDListForInvisible, metaEdgeIDListForVisible];
  }

  static incidentEdgeIsOutOfScope(interGraphEdgeTarget, nodeToBeCollapsed, visibleGM) {
    if (interGraphEdgeTarget.owner == visibleGM.rootGraph) {
      return true;
    }
    else if (interGraphEdgeTarget.owner.parent == nodeToBeCollapsed) {
      return false;
    }
    else {
      return this.incidentEdgeIsOutOfScope(interGraphEdgeTarget.owner.parent, nodeToBeCollapsed, visibleGM);
    }
  }

  /*
 //-----------------------------------------------
 //Iterative Collapse Soltion
 //-------------------------------------------------
 static #collapseNode(node, visibleGM, invisibleGM) {
   let nodeIDListForInvisible = [];
   let edgeIDListForInvisible = [];
   //first process the visible graph
   let descendantNodes = this.getDescendantNodes(node);
   descendantNodes.forEach(childNode => {
     nodeIDListForInvisible.push(childNode.ID);
     childNode.edges.forEach(childEdge => {
       edgeIDListForInvisible.push(childEdge.ID);
       if (childEdge.isInterGraph) {
         let metaEdgeToBeCreated;
         if (childEdge.source == childNode) {
           metaEdgeToBeCreated = [...descendantNodes, node].includes(childEdge.target);
           if (metaEdgeToBeCreated) {
             Topology.addEdge(childEdge.ID, node.ID, childEdge.target.ID, visibleGM, invisibleGM);
           }
          }
          else {
            metaEdgeToBeCreated = [...descendantNodes, node].includes(childEdge.source);
            if (metaEdgeToBeCreated) {
              Topology.addEdge(childEdge.ID, childEdge.source.ID, node.ID, visibleGM, invisibleGM);
            }
          }
       }
       visibleGM.edgesMap.delete(childEdge.ID);
     });
   });

   visibleGM.removeGraph(node.child);
   descendantNodes.forEach(node => {
     visibleGM.nodesMap.delete(node.ID)
   });
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
 */
  static #expandNode(node, isRecursive, visibleGM, invisibleGM) {
    let nodeInInvisible = invisibleGM.nodesMap.get(node.ID);
    let newVisibleGraph = visibleGM.addGraph(new Graph(null, visibleGM), node);
    nodeInInvisible.child.siblingGraph = newVisibleGraph;
    newVisibleGraph.siblingGraph = nodeInInvisible.child;
    nodeInInvisible.isCollapsed = false;
    let childrenNodes = nodeInInvisible.child.nodes;
    childrenNodes.forEach(child => {
      if ((child.isCollapsed && isRecursive && (!child.isFiltered) && (!child.isHidden)) || ((!child.isCollapsed) && (!child.isFiltered) && (!child.isHidden))) {
        Auxiliary.moveNodeToVisible(child, visibleGM, invisibleGM);
        if (child.child) {
          let newNode = visibleGM.nodesMap.get(child.ID);
          this.#expandNode(newNode, isRecursive, visibleGM, invisibleGM);
        }
      }
      else if (child.isCollapsed && (!isRecursive) && (!child.isFiltered) && (!child.isHidden)) {
        Auxiliary.moveNodeToVisible(child, visibleGM, invisibleGM);
      }
    });
  }

  static getDescendantNodes(node) {
    let descendantNodes = [];
    if (node.child) {
      node.child.nodes.forEach(childNode => {
        descendantNodes.push(childNode);
        let nodesReturned = this.getDescendantNodes(childNode);
        descendantNodes = [...descendantNodes, ...nodesReturned];
      });
    }
    return descendantNodes;
  }

  static collapseNodes(nodeIDList, isRecursive, visibleGM, invisibleGM) {
    this.removedElements = {
      nodeIDListForInvisible: new Set(),
      edgeIDListForInvisible: new Set(),
      metaEdgeIDListForVisible: new Set()
    };
    if (isRecursive) {
      nodeIDList.forEach(nodeID => {
        let nodeInVisible = visibleGM.nodesMap.get(nodeID);
        if (nodeInVisible.child) {
          this.collapseCompoundDescendantNodes(nodeInVisible, visibleGM, invisibleGM);
          this.#collapseNode(nodeInVisible, visibleGM, invisibleGM);
          
          this.removedElements.metaEdgeIDListForVisible.forEach((edgeIDList,index) => {
            if(index!=this.removedElements.metaEdgeIDListForVisible.length-1){
              edgeIDList.forEach(element => {
                visibleGM.edgesMap.delete(edgeID);
              });
            }
          });
          let temp = [...this.removedElements.metaEdgeIDListForVisible[this.removedElements.metaEdgeIDListForVisible.length - 1]]
          this.removedElements.metaEdgeIDListForVisible = new Set()
          temp.forEach(item => this.removedElements.edgeIDListForInvisible.add(item));

        }
      });
    } else {
      nodeIDList.forEach(nodeID => {
        let nodeInVisible = visibleGM.nodesMap.get(nodeID);
        if (nodeInVisible.child) {
          this.#collapseNode(nodeInVisible, visibleGM, invisibleGM);
          
          this.removedElements.metaEdgeIDListForVisible.forEach((edgeIDList,index) => {
            if(index!=this.removedElements.metaEdgeIDListForVisible.length-1){
              edgeIDList.forEach(element => {
                visibleGM.edgesMap.delete(edgeID);
              });
            }
          });
          let temp = [...this.removedElements.metaEdgeIDListForVisible[this.removedElements.metaEdgeIDListForVisible.length - 1]]
          this.removedElements.metaEdgeIDListForVisible = new Set()
          temp.forEach(item => this.removedElements.edgeIDListForInvisible.add(item));

        }
      });
    }

    return this.removedElements;
  }

  static collapseCompoundDescendantNodes(node, visibleGM, invisibleGM) {
    if (node.child) {
      node.child.nodes.forEach(childNode => {
        if (childNode.child) {
          this.collapseCompoundDescendantNodes(childNode);
          this.#collapseNode(childNode, visibleGM, invisibleGM);
          
          this.removedElements.metaEdgeIDListForVisible.forEach((edgeIDList,index) => {
            if(index!=this.removedElements.metaEdgeIDListForVisible.length-1){
              edgeIDList.forEach(element => {
                visibleGM.edgesMap.delete(edgeID);
              });
            }
          });
          let temp = [...this.removedElements.metaEdgeIDListForVisible[this.removedElements.metaEdgeIDListForVisible.length - 1]]
          this.removedElements.metaEdgeIDListForVisible = new Set()
          temp.forEach(item => this.removedElements.edgeIDListForInvisible.add(item));

        }
      });
    }
  }

  static expandNodes(nodeIDList, isRecursive, visibleGM, invisibleGM) {
    nodeIDList.forEach(nodeID => {
      let nodeInVisible = visibleGM.nodesMap.get(nodeID);
      let nodeInInvisible = invisibleGM.nodesMap.get(nodeID);
      if (nodeInInvisible.child && nodeInInvisible.isCollapsed && !nodeInInvisible.isFiltered && !nodeInInvisible.isHidden) {
        this.#expandNode(nodeInVisible, isRecursive, visibleGM, invisibleGM);
      }
    });
  }

  static collapseAllNodes(visibleGM, invisibleGM) {
    let nodeIDList = [];
    visibleGM.rootGraph.nodes.forEach(rootNode => {
      if (rootNode.child) {
        nodeIDList.push(rootNode.ID)
      }
    });
    return this.collapseNodes(nodeIDList, true, visibleGM, invisibleGM)
  }

  static expandAllNodes(visibleGM, invisibleGM) {
    let topCollapsedCompoundNodes = this.getTopCollapsedCompoundNodes(invisibleGM.rootGraph.parent);
    this.expandNodes(topCollapsedCompoundNodes, true, visibleGM, invisibleGM);
  }

  static getTopCollapsedCompoundNodes(node) {
    let descendantNodes = [];
    if (node.child) {
      node.child.nodes.forEach(childNode => {
        if (childNode.child && childNode.isCollapsed) {
          descendantNodes.push(childNode.ID);
        }
        else if (childNode.child && (!childNode.isCollapsed)) {
          descendantNodes.push(childNode.ID);
          let nodesReturned = this.getDescendantNodes(childNode);
          descendantNodes = [...descendantNodes, ...nodesReturned];
        }
      });
    }
    return descendantNodes;
  }

  static getCompoundDescendantNodes(node, visibleGM, invisibleGM) {
    if (node.child) {
      node.child.nodes.forEach(childNode => {
        if (childNode.child) {
          this.getCompoundDescendantNodes(childNode);
          this.#collapseNode(childNode, visibleGM, invisibleGM)
        }
      });
    }
  }

  static collapseEdges(edgeIDList, visibleGM, invisibleGM) {
    let firstEdge = visibleGM.edgesMap.get(edgeIDList[0]);
    let sourceNode = firstEdge.source;
    let targetNode = firstEdge.target;
    let newMetaEdge = Topology.addMetaEdge(sourceNode.ID, targetNode.ID, edgeIDList,visibleGM, invisibleGM);
    let edgeIDListForInvisible = []
    edgeIDList.forEach(edgeID => {
      let edge = visibleGM.edgesMap.get(edgeID);
      if( edge instanceof MetaEdge ){
        edgeIDListForInvisible.push(edgeID);
      }
      Auxiliary.removeEdgeFromGraph(edge);
    });
    edgeIDListForInvisible.forEach(edgeForInvisibleID => {
      let edgeInInvisible = invisibleGM.edgesMap(edgeForInvisibleID);
      edgeIDListForInvisible.isVisible(false);
    });
    // may be return the new meta edge.
    // require consultation

  }

  static expandEdges(edgeIDList, isRecursive, visibleGM, invisibleGM) {
    edgeIDList.forEach(edgeID => {
      let metaEdge = visibleGM.metaEdgeMap.get(edgeID);
      let sourceNode = metaEdge.source;
      let targetNode = metaEdge.target;
      metaEdge.originalEdges.forEach(originalEdgeID => {
        if(visibleGM.metaEdgesMap.has(originalEdgeID)){
          let originalEdge = visibleGM.metaEdgesMap.get(originalEdgeID);
          if(originalEdge.source.owner == originalEdge.target.owner){
            originalEdge.source.addEdge(originalEdge,originalEdge.source,originalEdge.target);
          }else{
            visibleGM.addInterGraphEdge(originalEdge,)
          }
          visibleGM.edgesMap.set(originalEdge.ID,originalEdge);
        }else{
          let edgeInInvisible = invisibleGM.edgesMap.get(originalEdgeID);
          if (edgeInInvisible.isFiltered == false && edgeInInvisible.isHidden == false){
            edgeInInvisible.isVisible = true;
            let newEdge = new Edge(edgeInInvisible.ID,sourceNode,targetNode)
            if (sourceNode.owner = targetNode.owner ){
              sourceNode.owner.addEdge(newEdge,sourceNode,targetNode);
            }else{
              visibleGM.addInterGraphEdge(newEdge,sourceNode,targetNode);
            }
            visibleGM.edgesMap.set(newEdge.ID,newEdge);
            // creating recursion to expand recursively
            if(isRecursive){
              this.expandEdges(originalEdgeID, isRecursive, visibleGM, invisibleGM);
            }
          }

        }
      });
      visibleGM.metaEdgesMap.delete(edgeID);
    });
    // something to return.
  }

  static collapseEdgesBetweenNodes(nodeIDList, visibleGM, invisibleGM) {
    // node pairs?

  }

  static expandEdgesBetweenNodes(nodeIDList, isRecursive, visibleGM, invisibleGM) {

  }

  static collapseAllEdges(visibleGM, invisibleGM) {

  }
}