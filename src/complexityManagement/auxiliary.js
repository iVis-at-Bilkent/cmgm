import { GraphManager } from "../graph-manager";
import { Graph } from "../graph";
import { Edge } from "../edge";
import { Node } from "../node";
import { MetaEdge } from "../meta-edge";
import { Topology } from "./topology";
import { FilterUnfilter } from "./filter-unfilter";
import { ExpandCollapse } from "./expand-collapse";

export class Auxiliary {
  static lastID = 0;
  // Function to create unique id for new elements
  static createUniqueID() {
    let newID = "Object#" + this.lastID + "";
    this.lastID++;
    return newID;
  }

  // function to remove edge from the graph
  static removeEdgeFromGraph(edgeToRemove) {
    // check if owner of edge is a graph mananger, (meaning it is inter graph edge)
    if (edgeToRemove.owner instanceof GraphManager) {
      // remove the inter graph edge
      edgeToRemove.owner.removeInterGraphEdge(edgeToRemove);
    } else {
      // edge is not an inter graph edge
      // remove the edge from the owner graph
      edgeToRemove.owner.removeEdge(edgeToRemove);
    }
  }

  // function to remove a given edge from the meta edge and that meta edge from its parent and so on and so forth
  static recursiveMetaEdgeUpdate(edge, visibleGM, mainGM) {
    // initalize list to report all deleted meta edges
    let deletedMetaEdges = [[], []];
    // edge is part of a meta edge, get that meta edge using edge ID (as newMetaEdge)
    let metaEdge = visibleGM.edgeToMetaEdgeMap.get(edge.ID);

    if(metaEdge == undefined){
      return deletedMetaEdges;
    }

    // remove meta edge from the edge to meta edge map.
    visibleGM.edgeToMetaEdgeMap.delete(edge.ID);
    // check if newMetaEdge is part of any meta edge
    if (
      visibleGM.edgeToMetaEdgeMap.has(metaEdge.ID) &&
      metaEdge.originalEdges.length == 1
    ) {
      // call the function again and pass newMetaEdge
      let returnedList = this.recursiveMetaEdgeUpdate(
        metaEdge,
        visibleGM,
        mainGM
      );
      // combine the reproted list and the current list of meta edges to be deleted
      deletedMetaEdges[0] = [...deletedMetaEdges[0], ...returnedList[0]];
      deletedMetaEdges[1] = [...deletedMetaEdges[1], ...returnedList[1]];
    }
    if (visibleGM.metaEdgesMap.has(metaEdge.ID)) {
      // get the orignal edges of our newMetaEdge as new list ( orignalEnds)
      let orignalEnds = [
        ...visibleGM.metaEdgesMap.get(metaEdge.ID)?.originalEdges,
      ];
      // remove given edgeID from the orignalEnds list (filter out EdgeID)
      orignalEnds = orignalEnds.filter((i) => (i == edge.ID ? false : true));
      // if filtered list is not empty
      if (orignalEnds.length == 0) {
        // delete meta edge from the metaEdgeMap
        visibleGM.metaEdgesMap.delete(metaEdge.ID);
        // if meta edge is visible
        if (visibleGM.edgesMap.has(metaEdge.ID)) {
          // delete meta edge from visible edge map
          Auxiliary.removeEdgeFromGraph(metaEdge);
          visibleGM.edgesMap.delete(metaEdge.ID);
          // report meta edge as processed (to be removed)
          // structure {ID,sourceID,TargetID}
          deletedMetaEdges[0].push({
            ID: metaEdge.ID,
            sourceID: metaEdge.source.ID,
            targetID: metaEdge.target.ID,
          });
        }
      } else if (orignalEnds.length == 1) {
        visibleGM.edgeToMetaEdgeMap.delete(orignalEnds[0]);
        if (visibleGM.edgeToMetaEdgeMap.has(metaEdge.ID)) {
          let pMetaEdge = visibleGM.edgeToMetaEdgeMap.get(metaEdge.ID);
          pMetaEdge.originalEdges.push(orignalEnds[0]);
          visibleGM.edgeToMetaEdgeMap.set(orignalEnds[0], pMetaEdge);
          let updatedPOrignalEnds = pMetaEdge.originalEdges.filter((i) =>
            i == metaEdge.ID ? false : true
          );
          pMetaEdge.originalEdges = updatedPOrignalEnds;
        } else {
          deletedMetaEdges[1].push(orignalEnds[0]);
          if (visibleGM.metaEdgesMap.has(orignalEnds[0])) {
            let outerMetaEdge = visibleGM.metaEdgesMap.get(orignalEnds[0]);
            if (outerMetaEdge.originalEdges.length != 1) {
              visibleGM.edgesMap.set(orignalEnds[0], outerMetaEdge);
              let sourceNode = visibleGM.nodesMap.get(outerMetaEdge.source.ID);
              let targetNode = visibleGM.nodesMap.get(outerMetaEdge.target.ID);
              if (sourceNode != undefined && targetNode != undefined) {
                if (sourceNode.owner === targetNode.owner) {
                  sourceNode.owner.addEdge(
                    outerMetaEdge,
                    sourceNode,
                    targetNode
                  );
                } else {
                  //add inter graph edges
                  visibleGM.addInterGraphEdge(
                    outerMetaEdge,
                    sourceNode,
                    targetNode
                  );
                }
              }
            }
          } else {
            let edgeInInvisible = mainGM.edgesMap.get(orignalEnds[0]);
            let sourceNode = visibleGM.nodesMap.get(edgeInInvisible.source.ID);
            let targetNode = visibleGM.nodesMap.get(edgeInInvisible.target.ID);
            let newEdge = new Edge(edgeInInvisible.ID, sourceNode, targetNode);
            visibleGM.edgesMap.set(orignalEnds[0], newEdge);

            if (sourceNode != undefined && targetNode != undefined) {
              if (sourceNode.owner === targetNode.owner) {
                sourceNode.owner.addEdge(newEdge, sourceNode, targetNode);
              } else {
                //add inter graph edges
                visibleGM.addInterGraphEdge(newEdge, sourceNode, targetNode);
              }
            }
          }
        }
        // delete meta edge from the metaEdgeMap
        visibleGM.metaEdgesMap.delete(metaEdge.ID);
        // if meta edge is visible
        if (visibleGM.edgesMap.has(metaEdge.ID)) {
          // delete meta edge from visible edge map
          try {
            Auxiliary.removeEdgeFromGraph(metaEdge);
          } catch (e) {
          }
          visibleGM.edgesMap.delete(metaEdge.ID);
          // report meta edge as processed (to be removed)
          // structure {ID,sourceID,TargetID}
          deletedMetaEdges[0].push({
            ID: metaEdge.ID,
            sourceID: metaEdge.source.ID,
            targetID: metaEdge.target.ID,
          });
        }
      } else {
        // if filtered list is not empty (there are other edges present in orignal edges list of meta edge)
        // set orignal edges list of meta edge to the filtered version (so edgeID gets removed from the orignal ends)
        visibleGM.metaEdgesMap.get(metaEdge.ID).originalEdges = orignalEnds;
      }
    }
    // reprot the list of meta edges to be deleted
    return deletedMetaEdges;
  }
  //recursivly tracks if meta edge is part of another meta edge if yes returns top one
  static getTopMetaEdge(metaEdge, visibleGM) {
    //check if meta edge is part of another meta edge
    let topMetaEdge = visibleGM.edgeToMetaEdgeMap.get(metaEdge.ID);
    //if not then topMetaEdge will be undefined so return meta edge
    if (topMetaEdge) {
      // if yes,
      // check that top meta edge is part of another meta edge
      if (visibleGM.edgeToMetaEdgeMap.has(topMetaEdge.ID)) {
        // if yes call the function again and pass top meta edge
        topMetaEdge = this.getTopMetaEdge(topMetaEdge, visibleGM);
      }
      // return top meta edge
      return topMetaEdge;
    }
    // return meta edge (since top meta edge is undfined, meaning given meta edge is not part of any other meta edge)
    return metaEdge;
  }
  static recursiveExpand(edgeID, visibleGM, bringBack = true) {
    let metaEdge = visibleGM.edgeToMetaEdgeMap.get(edgeID);
    let parentMetaEdge = visibleGM.edgeToMetaEdgeMap.get(metaEdge.ID);
    if (parentMetaEdge != undefined) {
      if (parentMetaEdge.originalEdges.length == 1) {
        if (!visibleGM.edgesMap.has(metaEdge.ID) && bringBack) {
          let sourceInVisible = visibleGM.nodesMap.get(metaEdge.source.ID);
          let targetInVisible = visibleGM.nodesMap.get(metaEdge.target.ID);
          // if source and target are visible
          if (sourceInVisible && targetInVisible) {
            // check if source and target of incident edge have same owner graph (not an intergraph edge)
            if (sourceInVisible.owner == targetInVisible.owner) {
              // add the meta edge to sibling graph of owner of incident edge (incident edge is from invisible graph)
              let newEdge = sourceInVisible.owner.addEdge(
                metaEdge,
                sourceInVisible,
                targetInVisible
              );
            } else {
              // source and target have different owner graphs (is an inter graph edge)
              // add meta edge as inter graph edge between visible source and target nodes
              let newEdge = visibleGM.addInterGraphEdge(
                metaEdge,
                sourceInVisible,
                targetInVisible
              );
            }
            //  add meta edge to visible edges map
            visibleGM.edgesMap.set(metaEdge.ID, metaEdge);
            return metaEdge;
          }
        } else {
          return metaEdge;
        }
      } else {
        return this.recursiveExpand(metaEdge.ID, visibleGM);
      }
    }
    return ["None", metaEdge];
  }

  static getVisibleParent(nodeID, mainGM) {
    let node = mainGM.nodesMap.get(nodeID);
    if(node){
      if (node.isVisible) {
        return node.ID;
      } else {
        return this.getVisibleParent(node.owner.parent.ID, mainGM);
      }
    }else{
      return undefined;
    }
  }

    // function to bring node back to visible and all its incident edges
    static moveNodeToVisible(node, visibleGM, mainGM, nodeToBeExpanded = {
      ID: undefined
    }) {
      // initlaize the list of lists to report edges (to be added) and meta edges (to be removed)
      // Structure = [ [edges] , [meta edges( to be removed)],[meta edges (to be added)]]
      var edgeIDList = [[], [], []];
      let edgesToBeProcessed = [];
      // set visbile flag of given node to true (marking it as processed)
      node.isVisible = true;
      // create new node with same nodeID as given node
      let nodeForVisible = new Node(node.ID);
      // add new node to the sibling graph of owner of the given node (given node is node form invisible GM)
      let newNode = node.owner.siblingGraph.addNode(nodeForVisible);
      // add new node to the nodes map of visible GM
      visibleGM.nodesMap.set(newNode.ID, newNode);
      // if given node has child graph ( meaning it is a compound node)
      if (node.child) {
        // chekc if given node is not collapsed
        if (node.isCollapsed == false) {
          // add an empty graph as child graph to new visible node
          let newGraph = visibleGM.addGraph(new Graph(null, visibleGM), nodeForVisible);
          // set siblingGraph pointer for visible and invisible child graph (so they point to each other)
          newGraph.siblingGraph = node.child;
          node.child.siblingGraph = newGraph;
        } else {
          let nodeDescendants = visibleGM.getDescendantsInorder(node);
          // loop through descendant edges
          nodeDescendants.edges.forEach(nodeDescendantEdge => {
            if (ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(nodeDescendantEdge.source.ID), mainGM.nodesMap.get(nodeToBeExpanded.ID), mainGM) || ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(nodeDescendantEdge.target.ID), mainGM.nodesMap.get(nodeToBeExpanded.ID), mainGM)) {
              edgesToBeProcessed.push(nodeDescendantEdge);
            }
          });
        }
      }
      // Structure [[edges],[metaedges (to be deleted)],[meta edges to be added]]
      let markedMetaEdges = [[], [], []];
      let addedMetaEdges = [];
      node.edges.forEach(nodeDescendantEdge => {
        if (mainGM.nodesMap.get(nodeDescendantEdge.source.ID).isVisible && mainGM.nodesMap.get(nodeDescendantEdge.target.ID).isVisible) {
          edgesToBeProcessed.push(nodeDescendantEdge);
        }
        if (ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(nodeDescendantEdge.source.ID), mainGM.nodesMap.get(nodeToBeExpanded.ID), mainGM) || ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(nodeDescendantEdge.target.ID), mainGM.nodesMap.get(nodeToBeExpanded.ID), mainGM)) {
          edgesToBeProcessed.push(nodeDescendantEdge);
        }
      });
      let tempSet = new Set(edgesToBeProcessed);
      edgesToBeProcessed = [...tempSet];
      // looping through incident edges of given node
      edgesToBeProcessed.forEach(incidentEdge => {
        //check if edge is part of a meta edge
        if (visibleGM.edgeToMetaEdgeMap.has(incidentEdge.ID)) {
          // get meta edge corresponding to edgeID from edgeToMetaEdgeMap
          let visibleMetaEdge = visibleGM.edgeToMetaEdgeMap.get(incidentEdge.ID);
          // Case (C)
          // check if meta edge is visible and meta edge's orignal edges length is 1 (meaning meta edge is created by node collapse and is visible)
          if (visibleGM.edgesMap.has(visibleMetaEdge.ID) && visibleMetaEdge.originalEdges.length == 1) {
            // delete meta edge from edges map and meta edge map
            visibleGM.edgesMap.delete(visibleMetaEdge.ID);
            visibleGM.metaEdgesMap.delete(visibleMetaEdge.ID);
            // dlete incident edge from edgeToMetaEdgemap
            visibleGM.edgeToMetaEdgeMap.delete(incidentEdge.ID);
            // report meta edge as processed (to be removed)
            // Structure  = {ID,sourceID,targetID}
            edgeIDList[1].push({
              ID: visibleMetaEdge.ID,
              sourceID: visibleMetaEdge.source.ID,
              targetID: visibleMetaEdge.target.ID
            });
            // remove meta edge from graph
            try {
              Auxiliary.removeEdgeFromGraph(visibleMetaEdge);
            } catch (ex) {}
            // check if incident edge is not filtered and not hidden and souce and target both are visible
            if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false) {
              if (incidentEdge.source.isVisible && incidentEdge.target.isVisible) {
                // move edge to visible graph
                Auxiliary.moveEdgeToVisible(incidentEdge, visibleGM, mainGM);
                // report edge as processed (to be added)
                edgeIDList[0].push(incidentEdge.ID);
              } else {
                if (incidentEdge.source.isVisible) {
                  let targetID = this.getVisibleParent(incidentEdge.target.ID, mainGM);
                  if(targetID){
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
                } else if (incidentEdge.target.isVisible) {
                  let sourceID = this.getVisibleParent(incidentEdge.source.ID, mainGM);
                  if(sourceID){
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
                } else {
                  let sourceID = this.getVisibleParent(incidentEdge.source.ID, mainGM);
                  let targetID = this.getVisibleParent(incidentEdge.target.ID, mainGM);
                  if(sourceID && targetID){
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
          } else if (visibleGM.edgesMap.has(visibleMetaEdge.ID) && visibleMetaEdge.originalEdges.length != 1) ;else {
            // Case: meta edge is not visible (CEE....)
            // check if orignal edges of meta edge have length 1 (meta edge is created by node collapse)
            if (visibleMetaEdge.originalEdges.length == 1) {
              // check if incident edge is not filtere and not hidde and source and target are visible
              if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false) {
                if (incidentEdge.source.isVisible && incidentEdge.target.isVisible) {
                  // move incident edge to visible graph
                  Auxiliary.moveEdgeToVisible(incidentEdge, visibleGM, mainGM);
                  // report incident edge as processed (to be added)
                  edgeIDList[0].push(incidentEdge.ID);
                  // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth
                  let deleteMetaEdgeList = this.recursiveMetaEdgeUpdate(incidentEdge, visibleGM, mainGM);
                  // report meta edges deleted by recursiveMetaEdgeUpdate function as processed and add them to the list of reported meta edges (to be removed)
                  edgeIDList[1] = [...edgeIDList[1], ...deleteMetaEdgeList[0]];
                  edgeIDList[0] = [...edgeIDList[0], ...deleteMetaEdgeList[1]];
                } else {
                  if (incidentEdge.source.isVisible) {
                    let targetID = this.getVisibleParent(incidentEdge.target.ID, mainGM);
                    if(targetID){
                      if (ExpandCollapse.incidentEdgeIsOutOfScope(incidentEdge.source, mainGM.nodesMap.get(targetID), mainGM)) {
                        // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth
                        let deleteMetaEdgeList = this.recursiveMetaEdgeUpdate(incidentEdge, visibleGM, mainGM);
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
                    let sourceID = this.getVisibleParent(incidentEdge.source.ID, mainGM);
                    if(sourceID){
                      if (ExpandCollapse.incidentEdgeIsOutOfScope(incidentEdge.target, mainGM.nodesMap.get(sourceID), mainGM)) {
                        // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth
                        let deleteMetaEdgeList = this.recursiveMetaEdgeUpdate(incidentEdge, visibleGM, mainGM);
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
                    let sourceID = this.getVisibleParent(incidentEdge.source.ID, mainGM);
                    let targetID = this.getVisibleParent(incidentEdge.target.ID, mainGM);
                    if(sourceID && targetID && sourceID != targetID){
                      if (ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(targetID), mainGM.nodesMap.get(sourceID), mainGM) && ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(sourceID), mainGM.nodesMap.get(targetID), mainGM)) {
                        // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth
                        let deleteMetaEdgeList = this.recursiveMetaEdgeUpdate(incidentEdge, visibleGM, mainGM);
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
              }
            } else {
              // Case (...EEC)
              // Case meta edge is not visible and length of its orignal ends is greater than 1 ( meta edge is not created by node collapse)
              //checks if given meta edge is part of any other meta edge, if yes returns the top one (only for cases where given meta edge is not created by node collapse.)
              visibleMetaEdge = this.getTopMetaEdge(visibleMetaEdge, visibleGM);
              // check if the returned top meta edge was created  by collapse or not
              if (visibleMetaEdge.originalEdges.length == 1) {
                let res = this.recursiveExpand(incidentEdge.ID, visibleGM);
                if (!Array.isArray(res)) {
                  if (!markedMetaEdges[1].includes(visibleMetaEdge)) {
                    markedMetaEdges[1].push(visibleMetaEdge);
                  }
                  // report incident edge as processed (to be added)
                  edgeIDList[0].push(res.ID);
                } else {
                  if (!markedMetaEdges[1].includes(visibleMetaEdge)) {
                    markedMetaEdges[1].push(visibleMetaEdge);
                  }
                  if (!markedMetaEdges[2].includes(res[1])) {
                    markedMetaEdges[2].push(res[1]);
                  }
                }
              } else {
                // Case (...ECE...)
                // Case: top meta edge is not created by node collapse

                let res = this.recursiveExpand(incidentEdge.ID, visibleGM, false);
                if (!Array.isArray(res)) {
                  // report incident edge as processed (to be added)
                  edgeIDList[0].push(visibleMetaEdge.ID);
                  // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth
                  let deleteMetaEdgeList = this.recursiveMetaEdgeUpdate(res, visibleGM, mainGM);
                  // report meta edges deleted by recursiveMetaEdgeUpdate function as processed and add them to the list of reported meta edges (to be removed)
                  edgeIDList[1] = [...edgeIDList[1], ...deleteMetaEdgeList[0]];
                  edgeIDList[0] = [...edgeIDList[0], ...deleteMetaEdgeList[1]];
                  visibleMetaEdge = res;
                }

                // get soruce and target of top meta edge
                let sourceInVisible = visibleGM.nodesMap.get(visibleMetaEdge.source.ID);
                let targetInVisible = visibleGM.nodesMap.get(visibleMetaEdge.target.ID);
                // if source and target are visible
                if (sourceInVisible && targetInVisible) {
                  // check if source and target of incident edge have same owner graph (not an intergraph edge)
                  if (incidentEdge.source.owner == incidentEdge.target.owner) {
                    // add the meta edge to sibling graph of owner of incident edge (incident edge is from invisible graph)
                    if (!FilterUnfilter.updateMetaEdge(visibleMetaEdge.originalEdges, null, visibleGM, mainGM)) {
                      try {
                        let newEdge = incidentEdge.source.owner.siblingGraph.addEdge(visibleMetaEdge, sourceInVisible, targetInVisible);
                        addedMetaEdges.push(visibleMetaEdge);
                      } catch (e) {}
                    }
                  } else {
                    // source and target have different owner graphs (is an inter graph edge)
                    // add meta edge as inter graph edge between visible source and target nodes

                    if (!FilterUnfilter.updateMetaEdge(visibleMetaEdge.originalEdges, null, visibleGM, mainGM)) {
                      try {
                        let newEdge = visibleGM.addInterGraphEdge(visibleMetaEdge, sourceInVisible, targetInVisible);
                        addedMetaEdges.push(visibleMetaEdge);
                      } catch (e) {}
                    }
                  }
                  if (!FilterUnfilter.updateMetaEdge(visibleMetaEdge.originalEdges, null, visibleGM, mainGM)) {
                    //  add meta edge to visible edges map
                    visibleGM.edgesMap.set(visibleMetaEdge.ID, visibleMetaEdge);
                    // report meta edge as processed (to be added)
                    edgeIDList[0].push(visibleMetaEdge.ID);
                  }
                } else if (ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(visibleMetaEdge.source.ID).isVisible ? mainGM.nodesMap.get(visibleMetaEdge.target.ID) : mainGM.nodesMap.get(visibleMetaEdge.source.ID), mainGM.nodesMap.get(nodeToBeExpanded.ID), mainGM)) {
                  if (sourceInVisible) {
                    let targetID = this.getVisibleParent(visibleMetaEdge.target.ID, mainGM);
                    if(targetID){
                      if (ExpandCollapse.incidentEdgeIsOutOfScope(incidentEdge.source.isVisible ? incidentEdge.target : incidentEdge.source, mainGM.nodesMap.get(targetID), mainGM)) {
                        let target = visibleGM.nodesMap.get(targetID);
                        let newMetaEdge = Topology.addMetaEdge(visibleMetaEdge.source.ID, target.ID, [visibleMetaEdge.ID], visibleGM, mainGM);
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
                    let sourceID = this.getVisibleParent(visibleMetaEdge.source.ID, mainGM);
                    if(sourceID){
                      if (ExpandCollapse.incidentEdgeIsOutOfScope(incidentEdge.source.isVisible ? incidentEdge.target : incidentEdge.source, mainGM.nodesMap.get(sourceID), mainGM)) {
                        let source = visibleGM.nodesMap.get(sourceID);
                        let newMetaEdge = Topology.addMetaEdge(source.ID, visibleMetaEdge.target.ID, [visibleMetaEdge.ID], visibleGM, mainGM);
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
              }
            }
          }
        } else {
          // incident edge is a normal edge
          // check if incident edge is not filtered not hidded and soruce and target are visible
          if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false && incidentEdge.source.isVisible && incidentEdge.target.isVisible) {
            // move incident edge to visible graph
            Auxiliary.moveEdgeToVisible(incidentEdge, visibleGM, mainGM);
            // report incident edge as processed (to be added)
            edgeIDList[0].push(incidentEdge.ID);
          }
        }
      });
      if (markedMetaEdges[0].length != 0 || markedMetaEdges[1].length != 0) {
        markedMetaEdges[1].forEach(metaEdge => {
          // if yes deleted top meta edge
          visibleGM.edgesMap.delete(metaEdge.ID);
          visibleGM.metaEdgesMap.delete(metaEdge.ID);
          // report top meta edge as processed (to be removed)
          // Structure = {ID,sourceID,targetID}
          edgeIDList[1].push({
            ID: metaEdge.ID,
            sourceID: metaEdge.source.ID,
            targetID: metaEdge.target.ID
          });
          // remvoe meta edge from graph
          try {
            Auxiliary.removeEdgeFromGraph(metaEdge);
          } catch (ex) {}
        });
        markedMetaEdges[2].forEach(edge => {
          if (visibleGM.nodesMap.has(edge.source.ID)) {
            let targetID = this.getVisibleParent(edge.target.ID, mainGM);
            if(targetID){
              let target = visibleGM.nodesMap.get(targetID);
              if (ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(edge.source.ID), mainGM.nodesMap.get(targetID), mainGM)) {
                let newMetaEdge = Topology.addMetaEdge(edge.source.ID, target.ID, [edge.ID], visibleGM, mainGM);
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
          } else if (edge.target.isVisible) {
            let sourceID = this.getVisibleParent(edge.source.ID, mainGM);
            if(sourceID){
              let source = visibleGM.nodesMap.get(sourceID);
              if (ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(edge.target.ID), mainGM.nodesMap.get(sourceID), mainGM)) {
                let newMetaEdge = Topology.addMetaEdge(source.ID, edge.target.ID, [edge.ID], visibleGM, mainGM);
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
            let sourceID = this.getVisibleParent(edge.source.ID, mainGM);
            let targetID = this.getVisibleParent(edge.target.ID, mainGM);
            if(sourceID && targetID && sourceID != targetID){
              let source = visibleGM.nodesMap.get(sourceID);
              let target = visibleGM.nodesMap.get(targetID);
              if (ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(sourceID), mainGM.nodesMap.get(targetID), mainGM) && ExpandCollapse.incidentEdgeIsOutOfScope(mainGM.nodesMap.get(targetID), mainGM.nodesMap.get(sourceID), mainGM)) {
                let newMetaEdge = Topology.addMetaEdge(source.ID, target.ID, [edge.ID], visibleGM, mainGM);
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
        });
      }

      // return the list of list to be reported
      // Structure = [ [edges] , [meta edges( to be removed)],[meta edges (to be added)]]
      return edgeIDList;
    }

  // fuunction to move edge to visible graph
  static moveEdgeToVisible(edge, visibleGM, mainGM) {
    // set visible flag of edge to true
    edge.isVisible = true;
    // create new edge fro the visible side
    let edgeForVisible = new Edge(edge.ID, null, null);
    // get source and target from visible graph
    let sourceInVisible = visibleGM.nodesMap.get(edge.source.ID);
    let targetInVisible = visibleGM.nodesMap.get(edge.target.ID);
    // initialize new edge
    let newEdge;
    // check if owner graph of soruce and target are same (not an inter graph edge)
    if (edge.source.owner == edge.target.owner) {
      try{
        // add new edge to sibling graph of owner of given edge (given edge is from invisible graph)
        newEdge = edge.source.owner.siblingGraph.addEdge(
          edgeForVisible,
          sourceInVisible,
          targetInVisible
        );
        visibleGM.edgesMap.set(newEdge.ID, newEdge);
      }catch(e){

      }    //  add new edge to visible edges map
    } else {
      // owner graph of soruce and target are different (is an inter graph edge)
      newEdge = visibleGM.addInterGraphEdge(
        edgeForVisible,
        sourceInVisible,
        targetInVisible
      );
        //  add new edge to visible edges map
        visibleGM.edgesMap.set(newEdge.ID, newEdge);
    }

  }

  // fucntion to get elements from neighbourhood of a given node
  static getTargetNeighborhoodElements(nodeID, mainGM) {
    // get node from invisible graph
    let node = mainGM.nodesMap.get(nodeID);
    //get zero distance Neighborhood
    // list of node that can be reached from given node with zero distance, all parents, all children and sibilings at all levels
    // Structure = { nodes: [nodes], edges: [edges]}
    let neighborhood = this.getZeroDistanceNeighbors(node, mainGM);
    // check if zero neighbourhood list includes the given node or not (if given node is the top level node in its tree structure it will not be included int he zero neighbourhood list)
    // if not add it to the list
    if (!neighborhood.nodes.includes(nodeID)) {
      neighborhood.nodes.push(nodeID);
    }
    // initalize object to report all nodes and edges in neighbourhood of given node
    // Structure = { nodes: [nodes], edges: [edges]}
    let neighborElements = {
      nodes: [],
      edges: [],
    };
    //for each 0 distance neighborhood node get 1 distance nodes and edges
    neighborhood["nodes"].forEach((neighborNodeID) => {
      let neighborNode = mainGM.nodesMap.get(neighborNodeID);
      neighborNode.edges.forEach((edge) => {
        if (edge.source.ID == neighborNode.ID) {
          neighborElements["nodes"].push(edge.target.ID);
        } else {
          neighborElements["nodes"].push(edge.source.ID);
        }
        neighborElements["edges"].push(edge.ID);
      });
    });
    // remove all duplicates from 1 distance neighbourhood
    neighborElements["nodes"] = [...new Set([...neighborElements["nodes"]])];
    neighborElements["edges"] = [...new Set([...neighborElements["edges"]])];

    //for each 1 distance node, calculate individual zero distance neighborhood and append it to the orignal dictionary
    neighborElements["nodes"].forEach((neighborElementID) => {
      let targetNeighborNode = mainGM.nodesMap.get(neighborElementID);
      let targetNeighborhood = this.getZeroDistanceNeighbors(
        targetNeighborNode,
        mainGM
      );
      neighborhood["nodes"] = [
        ...new Set([...neighborhood["nodes"], ...targetNeighborhood["nodes"]]),
      ];
      neighborhood["edges"] = [
        ...new Set([...neighborhood["edges"], ...targetNeighborhood["edges"]]),
      ];
    });

    //remove duplications
    neighborhood["nodes"] = [
      ...new Set([...neighborhood["nodes"], ...neighborElements["nodes"]]),
    ];
    neighborhood["edges"] = [
      ...new Set([...neighborhood["edges"], ...neighborElements["edges"]]),
    ];

    //filter out all visible nodes
    neighborhood["nodes"] = neighborhood["nodes"].filter((itemID) => {
      let itemNode = mainGM.nodesMap.get(itemID);
      return !itemNode.isVisible;
    });

    //filter out all visible edges
    neighborhood["edges"] = neighborhood["edges"].filter((itemID) => {
      let itemEdge = mainGM.edgesMap.get(itemID);
      return !itemEdge.isVisible;
    });

    return neighborhood;
  }

  // function to get zero neighbourhood element of given node
  static getZeroDistanceNeighbors(node, mainGM) {
    // initialize neighbourhood object
    // Structure = {[nodes],[edges]}
    let neighbors = {
      nodes: [],
      edges: [],
    };
    // function to get the descendant of given node
    // Structure = {[nodes],[edges]}
    let descendantNeighborhood = this.getDescendantNeighbors(node);
    // function to get the parents of the given ndoe
    // Structure = {[nodes],[edges]}
    let predecessorsNeighborhood = this.getPredecessorNeighbors(
      node,
      mainGM
    );
    // append decendant neighbourhood elements and parent neighbourhood elements to neighbourhood object
    neighbors["nodes"] = [
      ...new Set([
        ...descendantNeighborhood["nodes"],
        ...predecessorsNeighborhood["nodes"],
      ]),
    ];
    neighbors["edges"] = [
      ...new Set([
        ...descendantNeighborhood["edges"],
        ...predecessorsNeighborhood["edges"],
      ]),
    ];

    // return neighbourhood object
    // Structure = {[nodes],[edges]}
    return neighbors;
  }

  // function to get descendants of a given node
  static getDescendantNeighbors(node) {
    // initialize neighbourhood object
    // Structure = {[nodes],[edges]}
    let neighbors = {
      nodes: [],
      edges: [],
    };
    // if given node is compound node
    if (node.child) {
      // get nodes of children graph
      let children = node.child.nodes;
      // loop through children nodes
      children.forEach((childNode) => {
        // report child node as processed
        neighbors.nodes.push(childNode.ID);
        // loop through incident edges of child node
        childNode.edges.forEach((element) => {
          // report incident edge as processed
          neighbors.edges.push(element.ID);
        });
        // function to get the descendant of given node
        // Structure = {[nodes],[edges]}
        let nodesReturned = this.getDescendantNeighbors(childNode);
        // append decendant neighbourhood elements and parent neighbourhood elements to neighbourhood object
        neighbors["nodes"] = [...neighbors["nodes"], ...nodesReturned["nodes"]];
        neighbors["edges"] = [...neighbors["edges"], ...nodesReturned["edges"]];
      });
    }
    // return neighbourhood object
    // Structure = {[nodes],[edges]}
    return neighbors;
  }

  // function to get predecessors of a given node
  static getPredecessorNeighbors(node, mainGM) {
    // initialize neighbourhood object
    // Structure = {[nodes],[edges]}
    let neighbors = {
      nodes: [],
      edges: [],
    };
    // check if owner graph of given node is not root graph
    if (node.owner != mainGM.rootGraph) {
      // get nodes of the owner graph
      let predecessors = node.owner.nodes;
      // loop through predecessor nodes
      predecessors.forEach((pNode) => {
        // report predecessor node as processed
        neighbors["nodes"].push(pNode.ID);
        // loop through edges of the predecessor node
        pNode.edges.forEach((element) => {
          // report edge as processed
          neighbors.edges.push(element.ID);
        });
      });
      // function to get the parents of the given ndoe
      // Structure = {[nodes],[edges]}
      let nodesReturned = this.getPredecessorNeighbors(
        node.owner.parent,
        mainGM
      );
      // append decendant neighbourhood elements and parent neighbourhood elements to neighbourhood object
      neighbors["nodes"] = [...neighbors["nodes"], ...nodesReturned["nodes"]];
      neighbors["edges"] = [...neighbors["edges"], ...nodesReturned["edges"]];
    } else {
      // if owner graph of given node is the root graph
      // report the given node as processed
      neighbors["nodes"].push(node.ID);
    }
    // return neighbourhood object
    // Structure = {[nodes],[edges]}
    return neighbors;
  }
}
