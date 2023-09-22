import { MetaEdge } from "../meta-edge";
import { Auxiliary } from "./auxiliary";
import { ExpandCollapse } from "./expand-collapse";
import { Topology } from "./topology";
// Filter function
export class FilterUnfilter {
  static filter(nodeIDList, edgeIDList, visibleGM, mainGM) {
    // Lists to return back to api to indicate modified elements
    let nodeIDListPostProcess = [];
    let edgeIDListPostProcess = [];
    // looping through given list of edges to filter
    edgeIDList.forEach(edgeID => {
      // get edge from visible GM
      let edgeToFilter = visibleGM.edgesMap.get(edgeID)
      // if visible
      if (edgeToFilter) {
          if(visibleGM.edgesMap.has(edgeID)){
            // delete from visible map
            visibleGM.edgesMap.delete(edgeToFilter.ID);
            // remove edge from graph of visibleGM
            Auxiliary.removeEdgeFromGraph(edgeToFilter);
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
      let edgeToFilterInvisible = mainGM.edgesMap.get(edgeID);
      // set filtered status to tru and visible status to false.
      if(edgeToFilterInvisible){
        edgeToFilterInvisible.isFiltered = true;
        edgeToFilterInvisible.isVisible = false;
      }
    });
    // loop through list of nodes to filter
    nodeIDList.forEach((nodeID) => {
      // get node from visible graph
      let nodeToFilter = visibleGM.nodesMap.get(nodeID);
      // if node is visible
      if (nodeToFilter) {
        // get all descendants of node to to filter, this will not include given node.
        // return object with 
        // descenedant edges as edges
        // descendant simple nodes and compound nodes as simpleNodes and compoundNodes respectively.
        let nodeToFilterDescendants =
          visibleGM.getDescendantsInorder(nodeToFilter);
          // loop through descendant edges
        nodeToFilterDescendants.edges.forEach((nodeToFilterEdge) => {
          // report edge as processed
          edgeIDListPostProcess.push(nodeToFilterEdge.ID);
          // if edge is not a meta edge
          if (!(nodeToFilterEdge instanceof MetaEdge)) {
            // get corresponding edge on invisible side and set visible status false
            let nodeToFilterEdgeInvisible = mainGM.edgesMap.get(nodeToFilterEdge.ID);
            nodeToFilterEdgeInvisible.isVisible = false;
          }
          if(visibleGM.edgesMap.has(nodeToFilterEdge.ID)){
            // delete edge from visible side
            visibleGM.edgesMap.delete(nodeToFilterEdge.ID);
            // delete edge from grpah
            Auxiliary.removeEdgeFromGraph(nodeToFilterEdge);
          }
        });
        // loop through descendant simple nodes
        nodeToFilterDescendants.simpleNodes.forEach((nodeToFilterSimpleNode) => {
          // get corresponding node in invisible graph and set visible status to false
          let nodeToFilterSimpleNodeInvisible = mainGM.nodesMap.get(nodeToFilterSimpleNode.ID);
          nodeToFilterSimpleNodeInvisible.isVisible = false;
          // report node as processed
          nodeIDListPostProcess.push(nodeToFilterSimpleNode.ID);
          // remove node from visible graph and viisble nodes map
          nodeToFilterSimpleNode.owner.removeNode(nodeToFilterSimpleNode);
          visibleGM.nodesMap.delete(nodeToFilterSimpleNode.ID);
        });
        // loop through descendant compound nodes
        nodeToFilterDescendants.compoundNodes.forEach(
          (nodeToFilterCompoundNode) => {
            // get corresponding compound node in invisible graph and set visible status as false
            let nodeToFilterCompoundNodeInvisible = mainGM.nodesMap.get(nodeToFilterCompoundNode.ID);
            nodeToFilterCompoundNodeInvisible.isVisible = false;
            // report compoound node as processed
            nodeIDListPostProcess.push(nodeToFilterCompoundNode.ID);
            // if compound nodes has not child left set corresponding sibling grpah on invisible side as null.
            if (nodeToFilterCompoundNode.child.nodes.length == 0) {
              nodeToFilterCompoundNode.child.siblingGraph.siblingGraph = null;
            }
            //  remove child graph of the compound node
            visibleGM.removeGraph(nodeToFilterCompoundNode.child);
            // remove compound node from visible graph and nodes map
            nodeToFilterCompoundNode.owner.removeNode(nodeToFilterCompoundNode);
            visibleGM.nodesMap.delete(nodeToFilterCompoundNode.ID);
          }
        );
        // if node has a child graph (meaning its a compound node) and there are not child nodes
        if (nodeToFilter.child && nodeToFilter.child.nodes.length == 0) {
          // set corresponding sibling graph on invisible side as null
          nodeToFilter.child.siblingGraph.siblingGraph = null;
        }
        // if node has a child graph (meaning its a compound node) 
        if(nodeToFilter.child){
          // remove child graph from visible graph
        visibleGM.removeGraph(nodeToFilter.child);
        }
        // remove said node from visible graph and delete it from nodes map
        nodeToFilter.owner.removeNode(nodeToFilter);
        visibleGM.nodesMap.delete(nodeID);
        // report node as processed
        nodeIDListPostProcess.push(nodeID);
        // get corresponding node in invisible graph and set filtered status true and visible status false.
        let nodeToFilterInvisible = mainGM.nodesMap.get(nodeID);
        nodeToFilterInvisible.isFiltered = true;
        nodeToFilterInvisible.isVisible = false;
      }
      else {
        //  if node is not visible
        // get corresponding node from invisible graph and set filtered status true and visible status false



        let nodeToFilterInvisible = mainGM.nodesMap.get(nodeID);

        let nodeToFilterDescendants =
          mainGM.getDescendantsInorder(nodeToFilterInvisible);

          nodeToFilterDescendants.edges.forEach((nodeToFilterEdge) => {
            let edgeID = nodeToFilterEdge.ID;
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
          });

        nodeToFilterInvisible.isFiltered = true;
        nodeToFilterInvisible.isVisible = false;
      }
    })
    // turn reported edge list to a set (to remove potential duplicates)
    edgeIDListPostProcess = new Set(edgeIDListPostProcess)
    edgeIDListPostProcess = [...edgeIDListPostProcess]
    // combine edgelist and nodelist and to return. (edge first and nodes latter)
    // if nodes are removed first it cause problem, so report all edges first.
    return edgeIDListPostProcess.concat(nodeIDListPostProcess);
  }


  // unfilter function
  static unfilter(nodeIDList, edgeIDList, visibleGM, mainGM) {
    // lists to report processed nodes and edges.
    let nodeIDListPostProcess = [];
    let edgeIDListPostProcess = [];
    let metaEdgeIDListPostProcess = [];
    // loop through nodes to unfilter
    nodeIDList.forEach((nodeID) => {
      // get node from invisible graph and set filter status to false
      let nodeToUnfilter = mainGM.nodesMap.get(nodeID);
      nodeToUnfilter.isFiltered = false;
      // set status flag,  that node is allowed to be filtered, initalized as true
      let canNodeToUnfilterBeVisible = true;
      // if node is not hidden
      if (nodeToUnfilter.isHidden == false) {
        // create temporary copy for node to unfilter
        let tempNode = nodeToUnfilter;
        // following loop check node's parent and their parent and their parent to make sure that at all levels
        // there is nothing hiden, collapse or filtered.
        // infinite loop until we find that node can not be unfiltered or we reach root graph.
        while (true) {
          //if next owner graph is root gaph (meaning no more parents)
          if (tempNode.owner == mainGM.rootGraph) {
            break;
          } else {
            // there is another parent of current node 
            // check parent of current node is not hiden, collapse or filtered.
            // if no
            if (tempNode.owner.parent.isHidden || tempNode.owner.parent.isFiltered || tempNode.owner.parent.isCollapsed) {
              // if yes then node ot unfilter is not allowed to be unfiltered. and we break loop
              canNodeToUnfilterBeVisible = false;
              break;
            } else {
              // if yes then set current node to its parent to move up the ancestral line
              tempNode = tempNode.owner.parent;
            }
          }
        }
      } else {
        // if node is hidden then it can not be unfiltered
        canNodeToUnfilterBeVisible = false;
      }
      // if node is allowed to be unfiltered
      if (canNodeToUnfilterBeVisible) {
        // move node to visible along with all the associated edges that can be brought to visible side
        let tempList = Auxiliary.moveNodeToVisible(nodeToUnfilter, visibleGM, mainGM);
        // make all the descendants of the node to unfilter,visible. 
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
        if(!nodeToUnfilter.isCollapsed){
          descendants = FilterUnfilter.makeDescendantNodesVisible(nodeToUnfilter, visibleGM, mainGM);
        // report all descendant edges, simple nodes and compound nodes as processed
        nodeIDListPostProcess = [...nodeIDListPostProcess, ...descendants.simpleNodes, ...descendants.compoundNodes];
        edgeIDListPostProcess = [...edgeIDListPostProcess, ...descendants.edges];
        }

        let nodeToFilterDescendants =
          visibleGM.getDescendantsInorder(nodeToUnfilter);
          // loop through descendant edges
        nodeToFilterDescendants.edges.forEach((nodeTounFilterEdge) => {
          if (visibleGM.edgeToMetaEdgeMap.has(nodeTounFilterEdge.ID)) {
            let topMetaEdge = Auxiliary.getTopMetaEdge(visibleGM.edgeToMetaEdgeMap.get(nodeTounFilterEdge.ID),visibleGM);
            if(topMetaEdge.source.ID == nodeToUnfilter.ID || topMetaEdge.target.ID == nodeToUnfilter.ID){
              edgeIDList.push(nodeTounFilterEdge.ID)
            }
            
          }
        });

        // report node its self as processed.
        nodeIDListPostProcess.push(nodeToUnfilter.ID);
      }else{

        let canNodeEdgesBeProcessed = true;
        // if node is not hidden
        if (nodeToUnfilter.isHidden == false) {
          // create temporary copy for node to unfilter
          let tempNode = nodeToUnfilter;
          // following loop check node's parent and their parent and their parent to make sure that at all levels
          // there is nothing hiden, collapse or filtered.
          // infinite loop until we find that node can not be unfiltered or we reach root graph.
          while (true) {
            //if next owner graph is root gaph (meaning no more parents)
            if (tempNode.owner == mainGM.rootGraph) {
              break;
            } else {
              // there is another parent of current node 
              // check parent of current node is not hiden, collapse or filtered.
              // if no
              if (tempNode.owner.parent.isHidden || tempNode.owner.parent.isFiltered) {
                // if yes then node ot unfilter is not allowed to be unfiltered. and we break loop
                canNodeEdgesBeProcessed = false;
                break;
              } else {
                // if yes then set current node to its parent to move up the ancestral line
                tempNode = tempNode.owner.parent;
              }
            }
          }
        } else {
          // if node is hidden then it can not be unfiltered
          canNodeEdgesBeProcessed = false;
        }

        if(canNodeEdgesBeProcessed){
          let edgeIDList = [[],[],[]]
          nodeToUnfilter.edges.forEach(incidentEdge => {
            // check if incident edge is not filtere and not hidde and source and target are visible
            if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false) {
              
                if (incidentEdge.source.isVisible) {
                  let targetID = Auxiliary.getVisibleParent(incidentEdge.target.ID, mainGM);
                  if(targetID){
                    if (ExpandCollapse.incidentEdgeIsOutOfScope(incidentEdge.source, mainGM.nodesMap.get(targetID), mainGM)) {
                      // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth
                      let deleteMetaEdgeList = Auxiliary.recursiveMetaEdgeUpdate(incidentEdge, visibleGM, mainGM);
                      // report meta edges deleted by recursiveMetaEdgeUpdate function as processed and add them to the list of reported meta edges (to be removed)
                      edgeIDList[1] = [...edgeIDList[1], ...deleteMetaEdgeList[0]];
                      edgeIDList[0] = [...edgeIDList[0], ...deleteMetaEdgeList[1]];
                      let target = visibleGM.nodesMap.get(targetID);
                      let newMetaEdge = Topology.addMetaEdge(incidentEdge.source.ID, target.ID, [incidentEdge.ID], visibleGM, mainGM);
                      // report incident edge as processed (to be added)
                      edgeIDList[2].push({
                        ID: newMetaEdge.ID,
                        sourceID: newMetaEdge.source.ID,
                        targetID: newMetaEdge.target.ID,
                        size: newMetaEdge.originalEdges.length,
                        compound: "T"
                      });
                    }
                  }
                } else if (incidentEdge.target.isVisible) {
                  let sourceID = Auxiliary.getVisibleParent(incidentEdge.source.ID, mainGM);
                  if(sourceID){
                    if (ExpandCollapse.incidentEdgeIsOutOfScope(incidentEdge.target, mainGM.nodesMap.get(sourceID), mainGM)) {
                      // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth
                      let deleteMetaEdgeList = Auxiliary.recursiveMetaEdgeUpdate(incidentEdge, visibleGM, mainGM);
                      // report meta edges deleted by recursiveMetaEdgeUpdate function as processed and add them to the list of reported meta edges (to be removed)
                      edgeIDList[1] = [...edgeIDList[1], ...deleteMetaEdgeList[0]];
                      edgeIDList[0] = [...edgeIDList[0], ...deleteMetaEdgeList[1]];
                      let source = visibleGM.nodesMap.get(sourceID);
                      let newMetaEdge = Topology.addMetaEdge(source.ID, incidentEdge.target.ID, [incidentEdge.ID], visibleGM, mainGM);
                      // report incident edge as processed (to be added)
                      edgeIDList[2].push({
                        ID: newMetaEdge.ID,
                        sourceID: newMetaEdge.source.ID,
                        targetID: newMetaEdge.target.ID,
                        size: newMetaEdge.originalEdges.length,
                        compound: "T"
                      });
                    }
                  }
                } else {
                  let sourceID = Auxiliary.getVisibleParent(incidentEdge.source.ID, mainGM);
                  let targetID = Auxiliary.getVisibleParent(incidentEdge.target.ID, mainGM);
                  if(sourceID && targetID && sourceID != targetID){
                    if (ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(targetID), mainGM.nodesMap.get(sourceID), mainGM) && ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(sourceID), mainGM.nodesMap.get(targetID), mainGM)) {
                      // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth
                      let deleteMetaEdgeList = Auxiliary.recursiveMetaEdgeUpdate(incidentEdge, visibleGM, mainGM);
                      // report meta edges deleted by recursiveMetaEdgeUpdate function as processed and add them to the list of reported meta edges (to be removed)
                      edgeIDList[1] = [...edgeIDList[1], ...deleteMetaEdgeList[0]];
                      edgeIDList[0] = [...edgeIDList[0], ...deleteMetaEdgeList[1]];
                      let source = visibleGM.nodesMap.get(sourceID);
                      let target = visibleGM.nodesMap.get(targetID);
                      let newMetaEdge = Topology.addMetaEdge(source.ID, target.ID, [incidentEdge.ID], visibleGM, mainGM);
                      // report incident edge as processed (to be added)
                      edgeIDList[2].push({
                        ID: newMetaEdge.ID,
                        sourceID: newMetaEdge.source.ID,
                        targetID: newMetaEdge.target.ID,
                        size: newMetaEdge.originalEdges.length,
                        compound: "T"
                      });
                    }
                  }
                }
            }
          })

          edgeIDList[0].forEach(item => {
            // report edge as processed (to be added)
            if(visibleGM.edgeToMetaEdgeMap.has(item)){
              let topMetaEdge = Auxiliary.getTopMetaEdge(visibleGM.edgeToMetaEdgeMap.get(item),visibleGM);
              edgeIDListPostProcess.push(topMetaEdge.ID)
            }else{
              edgeIDListPostProcess.push(item)
            }
          })
          // loop through meta edges to be added
          edgeIDList[2].forEach((item) => {
            metaEdgeIDListPostProcess.push(item)
          });

        }

      }
    })
    // loop through all the edges to unfilter
    edgeIDList.forEach((edgeID) => {
      // get edge from invisible graph and set filtered status to false
      let edgeToUnfilter = mainGM.edgesMap.get(edgeID);
      edgeToUnfilter.isFiltered = false;
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
            // get corresponding invisible edge for the orignal edge to unfilter
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
          if (edgeToUnfilter.isHidden == false && edgeToUnfilter.source.isVisible && edgeToUnfilter.target.isVisible) {
            // bring edge to visible side
            Auxiliary.moveEdgeToVisible(edgeToUnfilter, visibleGM, mainGM);
            // report edge as processed.
            edgeIDListPostProcess.push(edgeToUnfilter.ID);
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

  // function to make all descendants of a compound node visible and report all the procesed descendants.
  static makeDescendantNodesVisible(nodeToUnfilter, visibleGM, mainGM) {
    // reproting object for descendants
    let descendants = {
      edges: new Set(),
      simpleNodes: [],
      compoundNodes: []
    };
    // chec if given node has child graph (meaning it is a compound node)
    if (nodeToUnfilter.child) {
      // get descendant nodes for the child graph
      let nodeToUnfilterDescendants = nodeToUnfilter.child.nodes;
      // loop through descendant nodes
      nodeToUnfilterDescendants.forEach((descendantNode) => {
        // check if decendant node is not filterted and not hidden 
        if (descendantNode.isFiltered == false && descendantNode.isHidden == false) {
          // move descendant node to visible and all its incident edges
          let tempList = Auxiliary.moveNodeToVisible(descendantNode, visibleGM, mainGM);
          tempList[0].forEach(item => {
            // report edge as processed (to be added)
            descendants.edges.add(item)
          })
          // check if desndant node is not collapsed
          if (descendantNode.isCollapsed == false) {
            // recall this function for decendant node to get all its descendants (recursion goes until there are not more descendants) 
            let childDescendents = this.makeDescendantNodesVisible(descendantNode, visibleGM, mainGM);
            // loop through keys of reported child descendant object and combine values for each keys
            for (var id in childDescendents) {
              descendants[id] = [...descendants[id] || [], ...childDescendents[id]];
            }
            // above combination convered set of the edges key to an array, so convert it back to set (removed possible duplications)
            descendants['edges'] = new Set(descendants['edges']);
            // if descendant node has child graph (meaning it is a compound node)
            if (descendantNode.child) {
              // report it as compound node
              descendants.compoundNodes.push(descendantNode.ID);
            } else {
              // report it as simple node
              descendants.simpleNodes.push(descendantNode.ID);
            }
            // get incident endge of descendant node
            let nodeEdges = descendantNode.edges;
            // loop through edges
            nodeEdges.forEach((item) => {
              // if edge is not filtered or hidded and source and target both are visible report it
              if (item.isFiltered == false && item.isHidden == false && item.source.isVisible && item.target.isVisible) {
                // report edge
                if(visibleGM.edgeToMetaEdgeMap.has(item.ID)){
                  let topMetaEdge = Auxiliary.getTopMetaEdge(item, visibleGM)
                  descendants['edges'].add(topMetaEdge.ID);
                }else{
                  descendants['edges'].add(item.ID);
                }
                
              }
            });
          }
        }
      })
    }
    // loop thorugh incident endge of node to unfilter
    nodeToUnfilter.edges.forEach((edge) => {
      // if edge is not filtered or hidded and source and target both are visible report it
      if (edge.isFiltered == false && edge.isHidden == false && edge.source.isVisible && edge.target.isVisible) {
        // report edge
        if(visibleGM.edgeToMetaEdgeMap.has(edge.ID)){
          let topMetaEdge = Auxiliary.getTopMetaEdge(edge, visibleGM)
          descendants.edges.add(topMetaEdge.ID);
        }else{
          descendants.edges.add(edge.ID);
        }
      }
    });
    // report decendant object
    return descendants;
  }
  // Function to check how to update the meta edge (wether to keep it or not)
//check if orignal edges, has an egde who is is not filtered and not hidden other than target itself 
// if yes keep meta edge else remove meta edge
// Return False to report meta edge to be kept,
// Returns True to  report meta edge to be removed,
  static updateMetaEdge(nestedEdges, targetEdgeID,visibleGM,mainGM) {
    // initally assuming all orignal edges are either filtered or hidden and meta edge needs to be deleted
    let status = true;
    // loop through given edge IDs
    nestedEdges.forEach((nestedEdgeID, index) => {
      // if edge ID is a meta edge ID
      if (visibleGM.metaEdgesMap.has(nestedEdgeID)) {
        // get that meta edge object
        let nestedEdge = visibleGM.metaEdgesMap.get(nestedEdgeID);
        // recall the function for this meta edge's orignal ends
        let update = this.updateMetaEdge(nestedEdge.originalEdges, targetEdgeID,visibleGM,mainGM);
        // combine the result from above with current one.
        // if one of them is false at any point it will become false
        status = (update==false?update:status)

      } else {
        // if edge ID is not a meta edge
        // get the simple edge from invisible graph (as this edge is part of a meta edge it will not be on visible graph)
        let nestedEdge = mainGM.edgesMap.get(nestedEdgeID);
        //  check if invisible edge is not filtered and not hidded and is not the given target.
        if (nestedEdge?.isFiltered == false && nestedEdge?.isHidden == false && nestedEdgeID!=targetEdgeID) {
          // report meta edge to be kept. (there is an edge which fulfil requirement so we keep initial meta edge)
          status = false;
        }
      }
    });
    // return status
    return status;
  }
}
