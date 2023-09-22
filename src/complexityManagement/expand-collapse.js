import { Edge } from "../edge";
import { Graph } from "../graph";
import { MetaEdge } from "../meta-edge";
import { Auxiliary } from "./auxiliary";
import { Topology } from "./topology";

export class ExpandCollapse {
  // create static objects to report elements to be removed
  static removedElements = {
    nodeIDListForInvisible: new Set(),
    edgeIDListForInvisible: new Set(),
    metaEdgeIDListForVisible: new Set(),
  };
  // create static objects to report elements to be added
  static addedElements = {
    nodeIDListForVisible: new Set(),
    edgeIDListForVisible: new Set(),
    metaEdgeIDListForVisible: new Set(),
    edgeIDListToRemove: new Set(),
  };
  //Double Recursive Solution
  // collpase node function
  static #collapseNode(node, visibleGM, mainGM) {
    //first process the visible graph
    // traverse descdents and get list of nodes, edges and meta edges
    let [
      nodeIDListForInvisible,
      edgeIDListForInvisible,
      metaEdgeIDListForVisible,
    ] = this.traverseDescendants(node, node, visibleGM, mainGM);
    //  remove child graph of given node
    visibleGM.removeGraph(node.child);
    // loop through descendant nodes
    nodeIDListForInvisible.forEach((nodeID) => {
      // delete each descendant node from nodes map of visible graph.
      visibleGM.nodesMap.delete(nodeID);
    });
    // loop through descendant edges
    edgeIDListForInvisible.forEach((edgeID) => {
      // delete each descendant edge from edges map of visible graph.
      let tempEdge = visibleGM.edgesMap.get(edgeID);
      visibleGM.edgesMap.delete(edgeID);
      try {
        Auxiliary.removeEdgeFromGraph(tempEdge);
      } catch (e) {
        //console.log(e);
      }
    });
    // get corresponding node from invisible graph and set is collapsed flag true
    let nodeInInvisible = mainGM.nodesMap.get(node.ID);
    nodeInInvisible.isCollapsed = true;
    // loop through descendant nodes
    nodeIDListForInvisible.forEach((nodeIDInvisible) => {
      // get corresponding node from invisible graph and set is visible flag false
      nodeInInvisible = mainGM.nodesMap.get(nodeIDInvisible);
      nodeInInvisible.isVisible = false;
    });
    // loop through descendant edges
    edgeIDListForInvisible.forEach((edgeIDInvisible) => {
      // get corresponding edge from invisible graph and set is visible flag false
      let edgeInInvisible = mainGM.edgesMap.get(edgeIDInvisible);
      if (edgeInInvisible) {
        edgeInInvisible.isVisible = false;
      }
    });
    // loop through descendant nodes and report node to be removed
    nodeIDListForInvisible.forEach((item) =>
      this.removedElements.nodeIDListForInvisible.add(item)
    );
    // loop through descendant edges and report edge to be removed
    edgeIDListForInvisible.forEach((item) =>
      this.removedElements.edgeIDListForInvisible.add(item)
    );
    // loop through descendant meta edge and report meta edge to be added (brought back to visible)
    this.removedElements.metaEdgeIDListForVisible.add(metaEdgeIDListForVisible);
  }

  // traverse function for compound node and report all descendant nodes, edges and meta edges.
  static traverseDescendants(node, nodeToBeCollapsed, visibleGM, mainGM) {
    // iniailize arrays to report descendant nodes (to be removed), edges (to be removed) and meta edges (to be added) as processed
    let nodeIDListForInvisible = [];
    let edgeIDListForInvisible = [];
    let metaEdgeIDListForVisible = [];
    // if node has a child graph (node is a compound node)
    if (node.child) {
      // get nodes from child graph, call them childrenNodes
      let childrenNodes = node.child.nodes;
      // loop through childrenNodes
      childrenNodes.forEach((child) => {
        // report child node as processed
        nodeIDListForInvisible.push(child.ID);
        // loop thorugh incident edges of child Nodes
        let edgesToBeProcessed = [...child.edges];
        edgesToBeProcessed.forEach((childEdge) => {
          //  check if child edge is not a meta edge
          if (!(childEdge instanceof MetaEdge)) {
            // report child edge as edge (to be removed) as processed
            edgeIDListForInvisible.push(childEdge.ID);
          } else {
            // report child edge as meta edge (to be added) as processed
            visibleGM.edgesMap.delete(childEdge.ID);
          }
          // if child Edge is an inter graph edge
          if (childEdge.isInterGraph) {
            //initalize flag for meta edge to be created
            let metaEdgeToBeCreated;
            // if child  is the source of child edge.
            if (childEdge.source == child) {
              // check if meta edge needs to be created or not
              metaEdgeToBeCreated = this.incidentEdgeIsOutOfScope(
                mainGM.nodesMap.get(childEdge.target.ID),
                mainGM.nodesMap.get(nodeToBeCollapsed.ID),
                mainGM
              );

              if (
                metaEdgeToBeCreated &&
                visibleGM.metaEdgesMap.has(childEdge.ID)
              ) {
                if (childEdge.originalEdges.length == 1) {
                  metaEdgeToBeCreated = false;
                  let originalEnds = [...childEdge.originalEdges];
                  let target = childEdge.target;
                  // report child edge (to be removed) as processed
                  edgeIDListForInvisible.push(childEdge.ID);
                  if (visibleGM.edgesMap.has(childEdge.ID)) {
                    visibleGM.edgesMap.delete(childEdge.ID);
                    // remove edge from visible graph and visible edges map
                    Auxiliary.removeEdgeFromGraph(childEdge);
                  }
                  visibleGM.metaEdgesMap.delete(childEdge.ID);
                  originalEnds.forEach((end) => {
                    visibleGM.edgeToMetaEdgeMap.delete(end);
                  });
                  let newMetaEdge = Topology.addMetaEdge(
                    nodeToBeCollapsed.ID,
                    target.ID,
                    originalEnds,
                    visibleGM,
                    mainGM
                  );
                  // report meta edge as processed in the form of object with ID, sourceID, targetID
                  metaEdgeIDListForVisible.push({
                    ID: newMetaEdge.ID,
                    sourceID: newMetaEdge.source.ID,
                    targetID: newMetaEdge.target.ID,
                    size: newMetaEdge.originalEdges.length,
                    compound: "T",
                  });
                }
              }
              // if meta edge is to be created
              if (metaEdgeToBeCreated) {
                if (visibleGM.metaEdgesMap.get(childEdge.ID)) {
                  Auxiliary.removeEdgeFromGraph(childEdge);
                }
                // create new meta edge between node to collapse and the other target of child edge (because child is the source so we replce it with node to be collapsed)
                let newMetaEdge = Topology.addMetaEdge(
                  nodeToBeCollapsed.ID,
                  childEdge.target.ID,
                  [childEdge.ID],
                  visibleGM,
                  mainGM
                );
                // report meta edge as processed in the form of object with ID, sourceID, targetID
                metaEdgeIDListForVisible.push({
                  ID: newMetaEdge.ID,
                  sourceID: newMetaEdge.source.ID,
                  targetID: newMetaEdge.target.ID,
                  size: newMetaEdge.originalEdges.length,
                  compound: "T",
                });
              }
            } else {
              // if child  is the target of child edge.
              // check if meta edge needs to be created or not
              metaEdgeToBeCreated = this.incidentEdgeIsOutOfScope(
                mainGM.nodesMap.get(childEdge.source.ID),
                mainGM.nodesMap.get(nodeToBeCollapsed.ID),
                mainGM
              );
              if (
                metaEdgeToBeCreated &&
                visibleGM.metaEdgesMap.has(childEdge.ID)
              ) {
                if (childEdge.originalEdges.length == 1) {
                  metaEdgeToBeCreated = false;
                  let originalEnds = [...childEdge.originalEdges];
                  let source = childEdge.source;
                  // report child edge (to be removed) as processed
                  edgeIDListForInvisible.push(childEdge.ID);
                  if (visibleGM.edgesMap.has(childEdge.ID)) {
                    visibleGM.edgesMap.delete(childEdge.ID);
                    // remove edge from visible graph and visible edges map
                    Auxiliary.removeEdgeFromGraph(childEdge);
                  }
                  visibleGM.metaEdgesMap.delete(childEdge.ID);
                  originalEnds.forEach((end) => {
                    visibleGM.edgeToMetaEdgeMap.delete(end);
                  });
                  let newMetaEdge = Topology.addMetaEdge(
                    source.ID,
                    nodeToBeCollapsed.ID,
                    originalEnds,
                    visibleGM,
                    mainGM
                  );
                  // report meta edge as processed in the form of object with ID, sourceID, targetID
                  metaEdgeIDListForVisible.push({
                    ID: newMetaEdge.ID,
                    sourceID: newMetaEdge.source.ID,
                    targetID: newMetaEdge.target.ID,
                    size: newMetaEdge.originalEdges.length,
                    compound: "T",
                  });
                }
              }
              // if meta edge is to be created
              if (metaEdgeToBeCreated) {
                if (visibleGM.metaEdgesMap.get(childEdge.ID)) {
                  Auxiliary.removeEdgeFromGraph(childEdge);
                }
                // create new meta edge between node to collapse and the other source of child edge (because child is the target so we replce it with node to be collapsed)
                let newMetaEdge = Topology.addMetaEdge(
                  childEdge.source.ID,
                  nodeToBeCollapsed.ID,
                  [childEdge.ID],
                  visibleGM,
                  mainGM
                );
                // report meta edge as processed in the form of object with ID, sourceID, targetID
                metaEdgeIDListForVisible.push({
                  ID: newMetaEdge.ID,
                  sourceID: newMetaEdge.source.ID,
                  targetID: newMetaEdge.target.ID,
                  size: newMetaEdge.originalEdges.length,
                  compound: "T",
                });
              }
            }
          }
        });
        // pass child back to the function to go through its descendants and report all the elements
        let [nodeIDsReturned, edgeIDsReturned, metaEdgeIDsReturned] =
          this.traverseDescendants(
            child,
            nodeToBeCollapsed,
            visibleGM,
            mainGM
          );
        // combine reproted nodes , edges and meta edges with the orignal ones.
        nodeIDListForInvisible = [
          ...nodeIDListForInvisible,
          ...nodeIDsReturned,
        ];
        edgeIDListForInvisible = [
          ...edgeIDListForInvisible,
          ...edgeIDsReturned,
        ];
        metaEdgeIDListForVisible = [
          ...metaEdgeIDListForVisible,
          ...metaEdgeIDsReturned,
        ];
      });
    }
    // return arrays of nodes, edges and meta edges processed.
    return [
      nodeIDListForInvisible,
      edgeIDListForInvisible,
      metaEdgeIDListForVisible,
    ];
  }

  //function to check of two given nodes are part of the different graph structure or not.
  // if yes return true else false
  static incidentEdgeIsOutOfScope(
    interGraphEdgeTarget,
    nodeToBeCollapsed,
    mainGM
  ) {
    // check if given target node is in root graph then return true.
    if (interGraphEdgeTarget.owner == mainGM.rootGraph) {
      return true;
    } //if parent of given node is node to be collapsed then false
    else if (interGraphEdgeTarget.owner.parent == nodeToBeCollapsed) {
      return false;
    } // last check parent and node to be collapsed are not in same structure, can be sibling or not
    else {
      // recall the fuction and pass parent of target and node to be collapsed.
      return this.incidentEdgeIsOutOfScope(
        interGraphEdgeTarget.owner.parent,
        nodeToBeCollapsed,
        mainGM
      );
    }
  }

  /*
  (Does not work and not data being returned.)
 //-----------------------------------------------
 //Iterative Collapse Soltion 
 //-------------------------------------------------
 static #collapseNode(node, visibleGM, mainGM) {
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
             Topology.addEdge(childEdge.ID, node.ID, childEdge.target.ID, visibleGM, mainGM);
           }
          }
          else {
            metaEdgeToBeCreated = [...descendantNodes, node].includes(childEdge.source);
            if (metaEdgeToBeCreated) {
              Topology.addEdge(childEdge.ID, childEdge.source.ID, node.ID, visibleGM, mainGM);
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
   let nodeInInvisible = mainGM.nodesMap.get(node.ID);
   nodeInInvisible.isCollapsed = true;

   nodeIDListForInvisible.forEach(nodeIDInvisible => {
     nodeInInvisible = mainGM.nodesMap.get(nodeIDInvisible);
     nodeInInvisible.isVisible = false;
   });

   edgeIDListForInvisible.forEach(edgeIDInvisible => {
     let edgeInInvisible = mainGM.edgesMap.get(edgeIDInvisible);
     edgeInInvisible.isVisible = false;
   });
 }
 */

  //  expand node function to expand a given node

  static #expandNode(
    node,
    isRecursive,
    visibleGM,
    mainGM,
    nodeToBeExpanded = undefined
  ) {
    // get node from invisible graph
    let nodeInInvisible = mainGM.nodesMap.get(node.ID);

    if (nodeInInvisible.isCollapsed) {
      // create new grah in visible  graph as child of given node
      let newVisibleGraph = visibleGM.addGraph(
        new Graph(null, visibleGM),
        node
      );
      // set sibling graph pointers, pointing each other
      nodeInInvisible.child.siblingGraph = newVisibleGraph;
      newVisibleGraph.siblingGraph = nodeInInvisible.child;
      // set is collapsed flag fro invisible node false
      nodeInInvisible.isCollapsed = false;
    }

    // get childre from invisible node's child graph.
    let childrenNodesTemp = nodeInInvisible.child.nodes;
    let childrenNodesCompound = childrenNodesTemp.filter((child) =>
      child.child ? true : false
    );
    let childrenNodesSimple = childrenNodesTemp.filter((child) =>
      child.child ? false : true
    );
    let childrenNodes = [...childrenNodesCompound, ...childrenNodesSimple];
    let markCollapsedCompoundChildren = [];
    // loop through children
    childrenNodes.forEach((child) => {
      // if child is collapsed and not filtered and not hidden and recussion is true (meaning collapsed child with recusion)
      // or if child is not collapsed and not filtered and not hidden (meaning no recurrion and child not collapsed)
      if (
        (child.isCollapsed &&
          isRecursive &&
          !child.isFiltered &&
          !child.isHidden) ||
        (!child.isCollapsed && !child.isFiltered && !child.isHidden)
      ) {
        // bring child back to visible and all its incident edges and meta ednges
        //returns list of edges and meta edges brought back to visible graph( structure : [[edges],[meta-edges]])
        let tempList = Auxiliary.moveNodeToVisible(
          child,
          visibleGM,
          mainGM,
          nodeToBeExpanded == undefined ? node : nodeToBeExpanded
        );
        //loop though edges returned
        tempList[0].forEach((item) => {
          // report edge as processed (to be added)
          try {
            this.addedElements.edgeIDListForVisible.add(item);
          } catch (e) {
            //console.log(e);
          }
        });
        let tempArr = [...this.addedElements.edgeIDListForVisible].filter(
          (edgeID) => visibleGM.edgesMap.has(edgeID)
        );
        this.addedElements.edgeIDListForVisible = new Set(tempArr);
        // loop through meta edges to be removed
        tempList[1].forEach((item) => {
          // report meta edge as parocessed (to be removed)
          try {
            this.addedElements.edgeIDListToRemove.add(item.ID);
          } catch (e) {
            //console.log(e);
          }

          let tempArr = [...this.addedElements.metaEdgeIDListForVisible].filter(
            (mEdge) => {
              if (mEdge.ID == item.ID) {
                return false;
              } else {
                return true;
              }
            }
          );
          this.addedElements.metaEdgeIDListForVisible = new Set(tempArr);
        });
        // loop through meta edges to be added
        tempList[2].forEach((item) => {
          // report meta edge as parocessed (to be removed)
          this.addedElements.metaEdgeIDListForVisible.add(item);
        });
        //  report child node as processed (to be added)
        this.addedElements.nodeIDListForVisible.add(child.ID);
        // if child node has a child graph (meaning it is compound node)
        if (child.child) {
          // add child node to the visible graph's nodes map
          let newNode = visibleGM.nodesMap.get(child.ID);
          //  recursively call the expansion of this child node (as it is compound node and recurssion is true)
          this.#expandNode(newNode, isRecursive, visibleGM, mainGM, node);
        }
      } else if (
        child.isCollapsed &&
        !isRecursive &&
        !child.isFiltered &&
        !child.isHidden
      ) {
        // child node is collapsed and there is no recussion (not filtered and not hidden)
        // report child node as processed (to be added)
        this.addedElements.nodeIDListForVisible.add(child.ID);
        // bring child back to visible and all its incident edges and meta ednges
        //returns list of edges and meta edges brought back to visible graph( structure : [[edges],[meta-edges]])
        let tempList = Auxiliary.moveNodeToVisible(
          child,
          visibleGM,
          mainGM,
          nodeToBeExpanded == undefined ? node : nodeToBeExpanded
        );
        //loop though edges returned
        tempList[0].forEach((item) => {
          // report edge as processed (to be added)
          this.addedElements.edgeIDListForVisible.add(item);
        });
        let tempArr = [...this.addedElements.edgeIDListForVisible].filter(
          (edgeID) => visibleGM.edgesMap.has(edgeID)
        );
        this.addedElements.edgeIDListForVisible = new Set(tempArr);
        // loop through meta edges
        tempList[1].forEach((item) => {
          // report meta edge as parocessed (to be removed)
          this.addedElements.edgeIDListToRemove.add(item.ID);
          let tempArr = [...this.addedElements.metaEdgeIDListForVisible].filter(
            (mEdge) => {
              if (mEdge.ID == item.ID) {
                return false;
              } else {
                return true;
              }
            }
          );
          this.addedElements.metaEdgeIDListForVisible = new Set(tempArr);
        });
        // loop through meta edges to be added
        tempList[2].forEach((item) => {
          // report meta edge as parocessed (to be removed)
          this.addedElements.metaEdgeIDListForVisible.add(item);
        });

        markCollapsedCompoundChildren.push(child);
      }
    });

    markCollapsedCompoundChildren.forEach((makredChild) => {
      let nodeDescendants = visibleGM.getDescendantsInorder(makredChild);
      // loop through descendant edges
      nodeDescendants.edges.forEach((nodeDescendantEdge) => {
        if (visibleGM.edgeToMetaEdgeMap.has(nodeDescendantEdge.ID)) {
          let topMetaEdge = Auxiliary.getTopMetaEdge(
            visibleGM.edgeToMetaEdgeMap.get(nodeDescendantEdge.ID),
            visibleGM
          );
          let sourceNode = visibleGM.nodesMap.get(topMetaEdge.source.ID);
          let targetNode = visibleGM.nodesMap.get(topMetaEdge.target.ID);
          if (
            !ExpandCollapse.incidentEdgeIsOutOfScope(
              mainGM.nodesMap.get(topMetaEdge.source.ID),
              mainGM.nodesMap.get(node.ID),
              mainGM
            ) &&
            !ExpandCollapse.incidentEdgeIsOutOfScope(
              mainGM.nodesMap.get(topMetaEdge.target.ID),
              mainGM.nodesMap.get(node.ID),
              mainGM
            )
          ) {
            if (
              topMetaEdge.source.ID == makredChild.ID ||
              topMetaEdge.target.ID == makredChild.ID
            ) {
              visibleGM.edgesMap.set(topMetaEdge.ID, topMetaEdge);
              //if source and target owner graph is same (its an intra graph edge), then add the viible and invisible edges to the source owner
              if (sourceNode.owner === targetNode.owner) {
                if (sourceNode != undefined && targetNode != undefined) {
                  try {
                    sourceNode.owner.addEdge(
                      topMetaEdge,
                      sourceNode,
                      targetNode
                    );
                  } catch (e) {
                    //console.log(e);
                  }
                }
              } else {
                //add inter graph edges
                if (sourceNode != undefined && targetNode != undefined) {
                  try {
                    visibleGM.addInterGraphEdge(
                      topMetaEdge,
                      sourceNode,
                      targetNode
                    );
                  } catch (e) {
                    //console.log(e);
                  }
                }
              }
              this.addedElements.metaEdgeIDListForVisible.add({
                ID: topMetaEdge.ID,
                sourceID: topMetaEdge.source.ID,
                targetID: topMetaEdge.target.ID,
                size: topMetaEdge.originalEdges.length,
                compound: "T",
              });
            }
          }
        }
      });
    });
  }

  // function to get lis of all the nodes and their descendants  and their descendants
  static getDescendantNodes(node) {
    // initalize the list
    let descendantNodes = [];
    // if node is a compound node
    if (node.child) {
      // loop through nodes of a child graph
      node.child.nodes.forEach((childNode) => {
        // report the child node
        descendantNodes.push(childNode);
        // call the function again on child node
        let nodesReturned = this.getDescendantNodes(childNode);
        // append returned nodes with current list.
        descendantNodes = [...descendantNodes, ...nodesReturned];
      });
    }
    // return the list
    return descendantNodes;
  }

  // function to collapse nodes in the given list
  static collapseNodes(nodeIDList, isRecursive, visibleGM, mainGM) {
    // clear all elements from the object of the removed elements
    this.removedElements = {
      nodeIDListForInvisible: new Set(),
      edgeIDListForInvisible: new Set(),
      metaEdgeIDListForVisible: new Set(),
    };
    // set of meta edges to keep
    let metaEdgeIDListToKeep = new Set();
    // if recussion is true.
    if (isRecursive) {
      // loop through the given list of the nodes
      nodeIDList.forEach((nodeID) => {
        // clear the  meta edges set from removed Elements objects
        this.removedElements.metaEdgeIDListForVisible = new Set();
        // get node from visible graph
        let nodeInVisible = visibleGM.nodesMap.get(nodeID);
        // if node in visible graph is a compound node
        if (nodeInVisible.child) {
          // pass node to the collapseCompoundDescendantNodes function to collapse all the descendant compound nodes
          this.collapseCompoundDescendantNodes(
            nodeInVisible,
            visibleGM,
            mainGM
          );
          // collpase the node by passing it to collapseNode function
          this.#collapseNode(nodeInVisible, visibleGM, mainGM);
          // initialize index counter to 0
          let index = 0;
          // loop through list of meta edge ids list
          // struture list of list of objects
          // strucute [[{meta edge object},{meta edge object}],[{meta edge object},{meta edge object}]]
          this.removedElements.metaEdgeIDListForVisible.forEach(
            (edgeIDList) => {
              // check if current meta edge list is not the last one
              if (
                index !=
                this.removedElements.metaEdgeIDListForVisible.size - 1
              ) {
                // loop through current meta edge list
                edgeIDList?.forEach((edgeID) => {
                  // delete each id from visible graph's edges map
                  visibleGM.edgesMap.delete(edgeID.ID);
                });
              }
              // increase index by one when one list is processed
              index = index + 1;
            }
          );
          // get metaEdgeIDListForVisible (struture list of list of objects) as temp 1
          let temp1 = [...this.removedElements.metaEdgeIDListForVisible];
          // get the last list of objects as temp
          let temp = [...temp1[temp1.length - 1]];
          // loop through the temp list
          temp.forEach((item) => {
            //  get meta edge from visible graph's meta edge map
            let metaEdge = visibleGM.metaEdgesMap.get(item.ID);
            // add meta edge to  set of meta edges to keep
            metaEdgeIDListToKeep.add({
              ID: metaEdge.ID,
              sourceID: metaEdge.source.ID,
              targetID: metaEdge.target.ID,
              size: metaEdge.originalEdges.length,
              compound: "T",
            });
          });
        }
      });
      //creating a temporary set
      let tempSet = new Set();
      //looping throught set of meta edges to keep and filter out the ones that are no longer visible. (in visibleGM.edgesMap)
      metaEdgeIDListToKeep.forEach((item) => {
        // if meta edge is visible
        if (visibleGM.edgesMap.has(item.ID)) {
          // add it to tempSet
          tempSet.add(item);
        }
      });
      //set filtered tempSet as the new value of metaEdgeIDListForVisible.
      this.removedElements.metaEdgeIDListForVisible = tempSet;
    } else {
      // if recusion is not true
      // loop through node id list
      nodeIDList.forEach((nodeID) => {
        // get node from visible graph
        let nodeInVisible = visibleGM.nodesMap.get(nodeID);
        // if node is compound node
        if (nodeInVisible.child) {
          // pass node to collpaseNode function
          this.#collapseNode(nodeInVisible, visibleGM, mainGM);
          // initialize index to 0
          let index = 0;
          // loop through list of meta edge ids list
          // struture list of list of objects
          // strucute [[{meta edge object},{meta edge object}],[{meta edge object},{meta edge object}]]
          let multipleSelectedMetaEdges = []
          this.removedElements.metaEdgeIDListForVisible.forEach(
            (edgeID) => {
              // check if current meta edge list is not the last one
              if (
                index !=
                this.removedElements.metaEdgeIDListForVisible.size - 1
              ) {
                // loop through current meta edge if list
                multipleSelectedMetaEdges.push(edgeID)
              }
              // increase index by one when one list is processed
              index = index + 1;
            }
          );
          // get metaEdgeIDListForVisible (struture list of list of objects) as temp 1
          let temp1 = [...this.removedElements.metaEdgeIDListForVisible];
          // get the last list of objects as temp
          let temp = [...temp1[temp1.length - 1],...multipleSelectedMetaEdges];
          multipleSelectedMetaEdges=[]
          //  set metaEdgeIDListForVisible as a new set
          this.removedElements.metaEdgeIDListForVisible = new Set();
          // loop through the temp list
          temp.forEach((item) => {
            //  get meta edge from visible graph's meta edge map
            let metaEdge = visibleGM.metaEdgesMap.get(item.ID);

            // add meta edge to  set of meta edges to keep
            this.removedElements.metaEdgeIDListForVisible.add({
              ID: metaEdge.ID,
              sourceID: metaEdge.source.ID,
              targetID: metaEdge.target.ID,
              size: metaEdge.originalEdges.length,
              compound: "T",
            });
          });
        }
      });
    }
    // report  removed emelents object with keys for nodes (to be removed), edges (to be removed) and meta edges (to be added)
    return this.removedElements;
  }

  // function to collapse all the descendants of given compound node
  static collapseCompoundDescendantNodes(node, visibleGM, mainGM) {
    // if given node is compound node
    if (node.child) {
      // loop though children nodes of child graph
      node.child.nodes.forEach((childNode) => {
        // if child node is a compound node
        if (childNode.child) {
          // pass the child node to the function again to collapse all its descendants
          this.collapseCompoundDescendantNodes(
            childNode,
            visibleGM,
            mainGM
          );
          // pass the child node to collapse node function to collapse child node.
          this.#collapseNode(childNode, visibleGM, mainGM);
          // initilaize the index to 0
          let index = 0;
          // loop through list of meta edge ids list
          // struture list of list of objects
          // strucute [[{meta edge object},{meta edge object}],[{meta edge object},{meta edge object}]]
          this.removedElements.metaEdgeIDListForVisible.forEach(
            (edgeIDList) => {
              // check if current meta edge list is not the last one
              if (
                index !=
                this.removedElements.metaEdgeIDListForVisible.size - 1
              ) {
                // loop through current meta edge if list
                edgeIDList.forEach((edgeID) => {
                  // delete meta edge from the visible graph
                  visibleGM.edgesMap.delete(edgeID.ID);
                });
              }
              // increase index by one when one list is processed
              index = index + 1;
            }
          );
          // get metaEdgeIDListForVisible (struture list of list of objects) as temp 1
          let temp1 = [...this.removedElements.metaEdgeIDListForVisible];
          // get the last list of objects as temp
          let temp = [...temp1[temp1.length - 1]];
          //  set metaEdgeIDListForVisible as a new set
          this.removedElements.metaEdgeIDListForVisible = new Set();
          // create temp array
          let tempArr = [];
          // loop through the temp list
          temp.forEach((item) => {
            //  get meta edge from visible graph's meta edge map
            let metaEdge = visibleGM.metaEdgesMap.get(item.ID);
            // psuh meta edge to  tempArr
            tempArr.push({
              ID: metaEdge.ID,
              sourceID: metaEdge.source.ID,
              targetID: metaEdge.target.ID,
              size: metaEdge.originalEdges.length,
              compound: "T",
            });
          });
          // add tempArr to the metaEdgeIDListForVisible
          this.removedElements.metaEdgeIDListForVisible.add(tempArr);
        }
      });
    }
  }

  // expand nodes function takes list of nodes to expand
  static expandNodes(nodeIDList, isRecursive, visibleGM, mainGM) {
    // clear addedElements object with empty sets
    this.addedElements = {
      nodeIDListForVisible: new Set(),
      edgeIDListForVisible: new Set(),
      metaEdgeIDListForVisible: new Set(),
      edgeIDListToRemove: new Set(),
    };
    // loop through nodes list
    nodeIDList.forEach((nodeID) => {
      // get node from visible graph (visibleNode)
      let nodeInVisible = visibleGM.nodesMap.get(nodeID);
      // get node from invisible grap (invisibleNode)
      let nodeInInvisible = mainGM.nodesMap.get(nodeID);
      // check if invisibleNode is compound node and is collapsed and not filtered and not hidded
      if (
        nodeInInvisible.child &&
        nodeInInvisible.isCollapsed &&
        !nodeInInvisible.isFiltered &&
        !nodeInInvisible.isHidden
      ) {
        // pass invisibleNode to expand node function and recursive status
        this.#expandNode(nodeInVisible, isRecursive, visibleGM, mainGM);
      }
    });
    // return addedElements
    return this.addedElements;
  }

  //  collapse All Nodes function
  static collapseAllNodes(visibleGM, mainGM) {
    // create list for nodes to collapse
    let nodeIDList = [];
    // loop through nodes of root graph (rootNodes)
    visibleGM.rootGraph.nodes.forEach((rootNode) => {
      // if rootNode is a compound node
      if (rootNode.child) {
        // report it as node to be collapsed
        nodeIDList.push(rootNode.ID);
      }
    });
    // call the collapsedNodes function and pass list of nodes to be collapsed
    return {
      collapsedNodes: nodeIDList,
      ...this.collapseNodes(nodeIDList, true, visibleGM, mainGM),
    };
  }

  //expand all nodes function
  static expandAllNodes(visibleGM, mainGM) {
    //  get list of all the top level collapsed compound nodes  (takes invisible root node root node)
    let topCollapsedCompoundNodes = this.getTopCollapsedCompoundNodes(
      mainGM.rootGraph.parent
    );
    // all the expandNodes function will the list of all top level collapsed compound nodes
    return {
      expandedNodes: topCollapsedCompoundNodes,
      ...this.expandNodes(
        topCollapsedCompoundNodes,
        true,
        visibleGM,
        mainGM
      ),
    };
  }

  // function to get thae list of all the top level collapsed compound nodes, (takes invisible root node root node)
  static getTopCollapsedCompoundNodes(node) {
    // initialize list of descendantNodes
    let descendantNodes = [];
    // check if node is a compound node
    if (node.child) {
      // loop through nodes of child graph of top level collapsed node (as childNode)
      node.child.nodes.forEach((childNode) => {
        // if child node is a compound node and is collapsed
        if (childNode.child && childNode.isCollapsed) {
          // report child node as descendant node (because its collapsed)
          descendantNodes.push(childNode.ID);
        } else if (childNode.child && !childNode.isCollapsed) {
          // if childNode is compound node and is not collapsed
          // call the function again and pass childNode
          let nodesReturned = this.getTopCollapsedCompoundNodes(childNode);
          // combine the reported nodes with current descendant nodes.
          descendantNodes = [...descendantNodes, ...nodesReturned];
        }
      });
    }
    // reprot list of descendant nodes
    return descendantNodes;
  }

  // function to collapse edges between 2 nodes (takes lis of edges)
  static collapseEdges(edgeIDList, visibleGM, mainGM) {
    // get first edge from the list of edges
    let firstEdge = visibleGM.edgesMap.get(edgeIDList[0]);
    // get source of the first edge (sourceNode)
    let sourceNode = firstEdge.source;
    // get target of the first node (targetNode)
    let targetNode = firstEdge.target;
    // all add meta edge function to create meta edge between source and target
    let newMetaEdge = Topology.addMetaEdge(
      sourceNode.ID,
      targetNode.ID,
      edgeIDList,
      visibleGM,
      mainGM
    );
    // initailize list of edge ids list
    let edgeIDListForInvisible = [];
    // loop throug the given edge id list
    edgeIDList.forEach((edgeID) => {
      // get edge from visible graph
      let edge = visibleGM.edgesMap.get(edgeID);
      //  check if visibleEge is not a meta edge
      if (!(edge instanceof MetaEdge)) {
        // report edge as processed (to be removed)
        edgeIDListForInvisible.push(edgeID);
      }
      // check if edge is visible
      if (visibleGM.edgesMap.has(edgeID)) {
        // remove edge from  visible graph
        Auxiliary.removeEdgeFromGraph(edge);
        // remove edge from visible edges map
        visibleGM.edgesMap.delete(edge.ID);
      }
    });
    // loop through removted edges
    edgeIDListForInvisible.forEach((edgeForInvisibleID) => {
      // get corresponding edge from invisible graph and set visible flag false.
      let edgeInInvisible = mainGM.edgesMap.get(edgeForInvisibleID);
      edgeInInvisible.isVisible = false;
    });
    // return list of object with new meta edge infromation
    // Structure = [{ID,sourceID,targetID}]
    return [
      {
        ID: newMetaEdge.ID,
        sourceID: newMetaEdge.source.ID,
        targetID: newMetaEdge.target.ID,
        size: newMetaEdge.originalEdges.length,
        compound: "T",
      },
    ];
  }

  // function to expand edges (takes list of edges to expand)
  static expandEdges(edgeIDList, isRecursive, visibleGM, mainGM) {
    // intialize list of 2d array with orignal edges list to report
    // Structure = [ [edges to be added] , [meta edges to be removed] , [edges to be removed]]
    let originalEdgeIDList = [[], [], []];

    edgeIDList = edgeIDList.filter((edgeID) => {
      let metaEdge = visibleGM.metaEdgesMap.get(edgeID);
      if (metaEdge) {
        return metaEdge.originalEdges.length == 1 ? false : true;
      }
      return false;
    });

    originalEdgeIDList[2] = [...edgeIDList];

    // loop through given list of edges
    edgeIDList.forEach((edgeID) => {
      // get meta edge  from visibleGm
      let metaEdge = visibleGM.metaEdgesMap.get(edgeID);
      // get source of meta edge
      let sourceNode = metaEdge.source;
      // get target of meta edge
      let targetNode = metaEdge.target;
      // loop through orignal Edges of meta edge
      metaEdge.originalEdges.forEach((originalEdgeID) => {
        // check if orignal edge is a meta edge
        if (visibleGM.metaEdgesMap.has(originalEdgeID)) {
          //  get meta edge of the orignal edge
          let originalEdge = visibleGM.metaEdgesMap.get(originalEdgeID);
          let sourceNode = visibleGM.nodesMap.get(originalEdge.source.ID);
          let targetNode = visibleGM.nodesMap.get(originalEdge.target.ID);
          //  check if recursive and orignal meta edge is not created by node collapse
          if (isRecursive && originalEdge.originalEdges.length != 1) {
            // expand the orignal meta edge (returns edges brought back to visible graph  and meta edges to be removed)
            let returnedList = this.expandEdges(
              [originalEdge.ID],
              isRecursive,
              visibleGM,
              mainGM
            );
            // remove this meta edge from meta edge map
            visibleGM.metaEdgesMap.delete(originalEdge.ID);
            // combine returned list to the cureent edge list
            originalEdgeIDList[0] = [
              ...originalEdgeIDList[0],
              ...returnedList[0],
            ];
            originalEdgeIDList[1] = [
              ...originalEdgeIDList[1],
              ...returnedList[1],
            ];
            originalEdgeIDList[2] = [
              ...originalEdgeIDList[2],
              ...returnedList[2],
            ];
          } else {
            //  check if its not recursive or orignal meta edge is created by node collapse
            // if orignalEdge source and target have same owner (not inter graph edge)
            if (sourceNode.owner == targetNode.owner) {
              // add orignal edge to the graph
              sourceNode.owner.addEdge(originalEdge, sourceNode, targetNode);
            } else {
              // if orignalEdge source and target does not have same owner (is inter graph edge)
              // add orignal edge as inter graph edge
              visibleGM.addInterGraphEdge(originalEdge, sourceNode, targetNode);
            }
            // add orignal edge to visible edges map
            visibleGM.edgesMap.set(originalEdge.ID, originalEdge);
            // report orignal edge as meta edge (to be removed)
            originalEdgeIDList[1].push({
              ID: originalEdge.ID,
              sourceID: sourceNode.ID,
              targetID: targetNode.ID,
              size: originalEdge.originalEdges.length,
              compound: "T",
            });
          }
        } else if(mainGM.edgesMap.has(originalEdgeID)) {
          // if orignal edge is not a meta edge
          // get edge from invisible side
          let edgeInInvisible = mainGM.edgesMap.get(originalEdgeID);
          //  check if edge is not filtered and not hiddedn
          if (
            edgeInInvisible.isFiltered == false &&
            edgeInInvisible.isHidden == false
          ) {
            // set orignal edge visible flag true
            edgeInInvisible.isVisible = true;
            //  get source of invisible edge from visible graph
            sourceNode = visibleGM.nodesMap.get(edgeInInvisible.source.ID);
            //  get target of invisible edge from visible graph
            targetNode = visibleGM.nodesMap.get(edgeInInvisible.target.ID);
            // create new edge with same ID of invisible edge and source and target from visible graph
            let newEdge = new Edge(edgeInInvisible.ID, sourceNode, targetNode);
            // check if source and target have same owner graph (not inter graph edge)
            if (sourceNode.owner == targetNode.owner) {
              // add new edge to the owner graph of source node
              sourceNode.owner.addEdge(newEdge, sourceNode, targetNode);
            } else {
              // check if source and target does not have same owner graph (is inter graph edge)
              visibleGM.addInterGraphEdge(newEdge, sourceNode, targetNode);
            }
            // add orignal edge to visible edges map
            visibleGM.edgesMap.set(newEdge.ID, newEdge);
            // report orignal edge as  edge (to be added)
            originalEdgeIDList[0].push(originalEdgeID);
          }
        }
        // remove orignal edgeID from edges to meta edge map (it is no longer part of any meta edge)
        visibleGM.edgeToMetaEdgeMap.delete(originalEdgeID);
      });
      // remove edge from meta edge map ( this meta edge is expanded and does not exist anymore)
      visibleGM.metaEdgesMap.delete(edgeID);
      // if edge is visible
      if (visibleGM.edgesMap.has(edgeID)) {
        // remove edge from visible graph and visible edges map
        Auxiliary.removeEdgeFromGraph(metaEdge);
        visibleGM.edgesMap.delete(edgeID);
      }
    });
    // report orignal edges id list
    // Structure = [ [edges to be added] , [meta edges to be removed], [edges to be removed]]
    return originalEdgeIDList;
  }
  // function to collapse edge between selected nodes
  static collapseEdgesBetweenNodes(nodeIDList, visibleGM, mainGM) {
    // initalize list to report meta edge
    let EdgeIDList = [[], []];
    // loop through all the nodes in the list
    for (let i = 0; i < nodeIDList.length; i++) {
      // loop through each pair onece (a-b and b-a are same so ignore one)
      for (let j = i + 1; j < nodeIDList.length; j++) {
        // get nodes
        let nodeA = visibleGM.nodesMap.get(nodeIDList[i]);
        let nodeB = visibleGM.nodesMap.get(nodeIDList[j]);
        let edgeIDList = [];
        // loop throught edges of first Node A and check if source or target of that edge is Node B and is not already in the edge list , add it.
        nodeA.edges.forEach((edge) => {
          if (edge.source.ID == nodeB.ID || edge.target.ID == nodeB.ID) {
            if (!edgeIDList.includes(edge.ID)) {
              edgeIDList.push(edge.ID);
            }
          }
        });
        // call collapse edges function and pass edge list if edge list is not empty
        // function returns array containing one object
        // Structure = [{ID,sourceID,targetID}]
        if (edgeIDList.length > 1) {
          let newMetaEge = this.collapseEdges(
            edgeIDList,
            visibleGM,
            mainGM
          );
          // append it to the edge list to report.
          EdgeIDList[0] = [...EdgeIDList[0], ...edgeIDList];
          // append it to the meta edge list to report.
          EdgeIDList[1] = [...EdgeIDList[1], ...newMetaEge];
        }
      }
    }
    return EdgeIDList;
  }

  static expandEdgesBetweenNodes(
    nodeIDList,
    isRecursive,
    visibleGM,
    mainGM
  ) {
    // initalize list to report meta edge
    let EdgeIDList = [[], [], []];
    // loop through all the nodes in the list
    for (let i = 0; i < nodeIDList.length; i++) {
      // loop through each pair onece (a-b and b-a are same so ignore one)
      for (let j = i + 1; j < nodeIDList.length; j++) {
        // get nodes
        let nodeA = visibleGM.nodesMap.get(nodeIDList[i]);
        let nodeB = visibleGM.nodesMap.get(nodeIDList[j]);
        let edgeIDs = [];
        // loop throught edges of first Node A and check if source or target of that edge is Node B and is not already in the edge list , add it.
        nodeA.edges.forEach((edge) => {
          if (edge.source.ID == nodeB.ID || edge.target.ID == nodeB.ID) {
            if (visibleGM.metaEdgesMap.has(edge.ID)) {
              if (
                !edgeIDs.includes(edge.ID) &&
                edge.originalEdges.length != 1
              ) {
                edgeIDs.push(edge.ID);
              }
            }
          }
        });
        // call collapse edges function and pass edge list if edge list is not empty
        // function returns array containing one object
        // Structure = [{ID,sourceID,targetID}]
        if (edgeIDs.length != 0) {
          let returnedEdgeList = this.expandEdges(
            edgeIDs,
            isRecursive,
            visibleGM,
            mainGM
          );
          // append it to the edge list to report.
          EdgeIDList[0] = [...EdgeIDList[0], ...returnedEdgeList[0]];
          // append it to the meta edge list to report.
          EdgeIDList[1] = [...EdgeIDList[1], ...returnedEdgeList[1]];
          // append it to the meta edge list to remove.
          EdgeIDList[2] = [...EdgeIDList[2], ...edgeIDs];
        }
      }
    }
    return EdgeIDList;
  }

  static collapseAllEdges(visibleGM, mainGM) {
    // create list for nodes to collapse
    let nodeIDList = [];
    // loop through nodes of root graph (rootNodes)
    visibleGM.nodesMap.forEach((node, ID) => {
      nodeIDList.push(ID);
    });
    // call the collapsedNodes function and pass list of nodes to be collapsed
    return this.collapseEdgesBetweenNodes(nodeIDList, visibleGM, mainGM);
  }

  static expandAllEdges(visibleGM, mainGM) {
    // create list for nodes to collapse
    let nodeIDList = [];
    // loop through nodes of root graph (rootNodes)
    visibleGM.nodesMap.forEach((node, ID) => {
      nodeIDList.push(ID);
    });
    // call the collapsedNodes function and pass list of nodes to be collapsed
    return this.expandEdgesBetweenNodes(
      nodeIDList,
      true,
      visibleGM,
      mainGM
    );
  }
}
