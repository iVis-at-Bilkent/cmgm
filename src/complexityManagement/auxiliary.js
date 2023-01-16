import { GraphManager } from "../graph-manager";
import { Graph } from "../graph";
import { Edge } from "../edge";
import { Node } from "../node";
import { MetaEdge } from "../meta-edge";
import { FilterUnfilter } from "./filter-unfilter";
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
    }
    else {
      // edge is not an inter graph edge
      // remove the edge from the owner graph
      edgeToRemove.owner.removeEdge(edgeToRemove);
    }
  }

  // function to remove a given edge from the meta edge and that meta edge from its parent and so on and so forth 
  static recursiveMetaEdgeUpdate(edge,visibleGM){
    // initalize list to report all deleted meta edges
    let deletedMetaEdges = []
    // edge is part of a meta edge, get that meta edge using edge ID (as newMetaEdge)
    let metaEdge = visibleGM.edgeToMetaEdgeMap.get(edge.ID);
    // remove meta edge from the edge to meta edge map.
    visibleGM.edgeToMetaEdgeMap.delete(edge.ID);
    // check if newMetaEdge is part of any meta edge
    if(visibleGM.edgeToMetaEdgeMap.has(metaEdge.ID)){
      // call the function again and pass newMetaEdge
      let returnedList = this.recursiveMetaEdgeUpdate(metaEdge,visibleGM);
      // combine the reproted list and the current list of meta edges to be deleted
      deletedMetaEdges = [...deletedMetaEdges,...returnedList]
    }
    // get the orignal edges of our newMetaEdge as new list ( orignalEnds)
    let orignalEnds = [...visibleGM.metaEdgesMap.get(metaEdge.ID).originalEdges];
    // remove given edgeID from the orignalEnds list (filter out EdgeID)
    orignalEnds = orignalEnds.filter((i)=>i==edge.ID?false:true);
    // if filtered list is not empty
    if(orignalEnds.length==0){
      // delete meta edge from the metaEdgeMap
      visibleGM.metaEdgesMap.delete(metaEdge.ID)
      // if meta edge is visible
      if(visibleGM.edgesMap.has(metaEdge.ID)){
        // delete meta edge from visible edge map
        visibleGM.edgesMap.delete(metaEdge.ID);
        // report meta edge as processed (to be removed)
        // structure {ID,sourceID,TargetID}
        deletedMetaEdges.push({ID:metaEdge.ID,sourceID:metaEdge.source.ID,targetID:metaEdge.target.ID});
      }
    }else{
      // if filtered list is not empty (there are other edges present in orignal edges list of meta edge)
      // set orignal edges list of meta edge to the filtered version (so edgeID gets removed from the orignal ends)
      visibleGM.metaEdgesMap.get(metaEdge.ID).originalEdges = orignalEnds
    }
    // reprot the list of meta edges to be deleted
    return deletedMetaEdges
  }
  //recursivly tracks if meta edge is part of another meta edge if yes returns top one
  static getTopMetaEdge(metaEdge,visibleGM){
    //check if meta edge is part of another meta edge
    let topMetaEdge = visibleGM.edgeToMetaEdgeMap.get(metaEdge.ID)
    //if not then topMetaEdge will be undefined so return meta edge
    if(topMetaEdge){
      // if yes,
      // check that top meta edge is part of another meta edge
      if(visibleGM.edgeToMetaEdgeMap.has(topMetaEdge.ID)){
        // if yes call the function again and pass top meta edge
        topMetaEdge = this.getTopMetaEdge(topMetaEdge,visibleGM)
      }
      // return top meta edge
      return topMetaEdge
    }
    // return meta edge (since top meta edge is undfined, meaning given meta edge is not part of any other meta edge)
    return metaEdge
  }
  
  // function to bring node back to visible and all its incident edges
  static moveNodeToVisible(node, visibleGM, invisibleGM) {
    // initlaize the list of lists to report edges (to be added) and meta edges (to be removed) 
    // Structure = [ [edges] , [meta edges]]
    var edgeIDList = [[],[]]
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
      }
    }
    // looping through incident edges of given node
    node.edges.forEach(incidentEdge => {
      //check if edge is part of a meta edge 
      if (visibleGM.edgeToMetaEdgeMap.has(incidentEdge.ID)) {
        // get meta edge corresponding to edgeID from edgeToMetaEdgeMap
        let visibleMetaEdge = visibleGM.edgeToMetaEdgeMap.get(incidentEdge.ID)
        // check if meta edge is visible and meta edge's orignal edges length is 1 (meaning meta edge is created by node collapse and is visible) 
        if(visibleGM.edgesMap.has(visibleMetaEdge.ID) && visibleMetaEdge.originalEdges.length == 1){
          // delete meta edge from edges map
          visibleGM.edgesMap.delete(visibleMetaEdge.ID);
          // report meta edge as processed (to be removed)
          // Structure  = {ID,sourceID,targetID}
          edgeIDList[1].push({ID:visibleMetaEdge.ID,sourceID:visibleMetaEdge.source.ID,targetID:visibleMetaEdge.target.ID});
          // remove meta edge from graph
          try{
            Auxiliary.removeEdgeFromGraph(visibleMetaEdge);
            }catch(ex){
              
            }
            // check if incident edge is not filtered and not hidden and souce and target both are visible 
          if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false && incidentEdge.source.isVisible && incidentEdge.target.isVisible) {
            // move edge to visible graph
            Auxiliary.moveEdgeToVisible(incidentEdge, visibleGM, invisibleGM);
            // report edge as processed (to be added)
            edgeIDList[0].push(incidentEdge.ID)
          }
        }else if(visibleGM.edgesMap.has(visibleMetaEdge.ID) && visibleMetaEdge.originalEdges.length != 1){
          // Case: meta edge is visible and the lenth of its orignal edges is more than 1 (meta edge is not created by node collapse)
          //do nothing
        }
        else{
          // Case: meta edge is not visible
          // check if orignal edges of meta edge have length 1 (meta edge is created by node collapse)
          if(visibleMetaEdge.originalEdges.length == 1){
            // check if incident edge is not filtere and not hidde and source and target are visible
            if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false && incidentEdge.source.isVisible && incidentEdge.target.isVisible) {
              // move incident edge to visible graph
              Auxiliary.moveEdgeToVisible(incidentEdge, visibleGM, invisibleGM);
              // report incident edge as processed (to be added)
              edgeIDList[0].push(incidentEdge.ID)
              // call recursiveMetaEdgeUpdate function on incident edge to remove meta edge with incident edge as oringal edge and the meta edge that contains this meta edge and so on and so forth 
              let deleteMetaEdgeList = this.recursiveMetaEdgeUpdate(incidentEdge,visibleGM)
              // report meta edges deleted by recursiveMetaEdgeUpdate function as processed and add them to the list of reported meta edges (to be removed) 
              edgeIDList[1] = [...edgeIDList[1],...deleteMetaEdgeList];
            }
          }else{
            // Case meta edge is not visible and length of its orignal ends is greater than 1 ( meta edge is not created by node collapse)
            //checks if given meta edge is part of any other meta edge, if yes returns the top one (only for cases where given meta edge is not created by node collapse.)
              visibleMetaEdge = this.getTopMetaEdge(visibleMetaEdge,visibleGM);
              // check if the returned top meta edge was created  by collapse or not
              if(visibleMetaEdge.originalEdges.length == 1){
                // if yes deleted top meta edge
                visibleGM.edgesMap.delete(visibleMetaEdge.ID);
                // report top meta edge as processed (to be removed)
                // Structure = {ID,sourceID,targetID}
                edgeIDList[1].push({ID:visibleMetaEdge.ID,sourceID:visibleMetaEdge.source.ID,targetID:visibleMetaEdge.target.ID});
                // remvoe meta edge from graph
                try{
                Auxiliary.removeEdgeFromGraph(visibleMetaEdge);
                }catch(ex){

                }
                // check if incident edge is not filtered and not hidden and source and target both are visible
                if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false && incidentEdge.source.isVisible && incidentEdge.target.isVisible) {
                  // move incident edge to visible graph
                  Auxiliary.moveEdgeToVisible(incidentEdge, visibleGM, invisibleGM);
                  // report incident edge as processed (to be added)
                  edgeIDList[0].push(incidentEdge.ID)
                }
              }else{
                // Case: top meta edge is not created by node collapse
                // get soruce and target of top meta edge
                let sourceInVisible = visibleGM.nodesMap.get(visibleMetaEdge.source.ID);
                let targetInVisible = visibleGM.nodesMap.get(visibleMetaEdge.target.ID);
                // if source and target are visible
                if (sourceInVisible && targetInVisible) {
                  // check if source and target of incident edge have same owner graph (not an intergraph edge)
                  if (incidentEdge.source.owner == incidentEdge.target.owner) {
                    // add the meta edge to sibling graph of owner of incident edge (incident edge is from invisible graph)
                  let newEdge = incidentEdge.source.owner.siblingGraph.addEdge(visibleMetaEdge, sourceInVisible, targetInVisible);
                  }
                  else {
                    // source and target have different owner graphs (is an inter graph edge)
                    // add meta edge as inter graph edge between visible source and target nodes
                  let newEdge = visibleGM.addInterGraphEdge(visibleMetaEdge, sourceInVisible, targetInVisible);
                  }
                  //  add meta edge to visible edges map
                  visibleGM.edgesMap.set(visibleMetaEdge.ID, visibleMetaEdge);
                  // report meta edge as processed (to be added)
                  edgeIDList[0].push(visibleMetaEdge.ID);
                }
              }

        }}
      }else{
        // incident edge is a normal edge 
        // check if incident edge is not filtered not hidded and soruce and target are visible
        if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false && incidentEdge.source.isVisible && incidentEdge.target.isVisible) {
          // move incident edge to visible graph
          Auxiliary.moveEdgeToVisible(incidentEdge, visibleGM, invisibleGM);
          // report incident edge as processed (to be added)
          edgeIDList[0].push(incidentEdge.ID)
        }
      }
    });
    // return the list of list to be reported
    // Structure = [[edges],[meta edges]]
    return edgeIDList
  }

  // fuunction to move edge to visible graph
  static moveEdgeToVisible(edge, visibleGM, invisibleGM) {
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
      // add new edge to sibling graph of owner of given edge (given edge is from invisible graph)
      newEdge = edge.source.owner.siblingGraph.addEdge(edgeForVisible, sourceInVisible, targetInVisible);
    }
    else {
      // owner graph of soruce and target are different (is an inter graph edge)
      newEdge = visibleGM.addInterGraphEdge(edgeForVisible, sourceInVisible, targetInVisible);
    }
    //  add new edge to visible edges map
    visibleGM.edgesMap.set(newEdge.ID, newEdge);
  }

  // fucntion to get elements from neighbourhood of a given node
  static getTargetNeighborhoodElements(nodeID, invisibleGM) {
    // get node from invisible graph
    let node = invisibleGM.nodesMap.get(nodeID);
    //get zero distance Neighborhood
    // list of node that can be reached from given node with zero distance, all parents, all children and sibilings at all levels
    // Structure = { nodes: [nodes], edges: [edges]}
    let neighborhood = this.getZeroDistanceNeighbors(node, invisibleGM);
    // check if zero neighbourhood list includes the given node or not (if given node is the top level node in its tree structure it will not be included int he zero neighbourhood list)
    // if not add it to the list 
    if (!neighborhood.nodes.includes(nodeID)) {
      neighborhood.nodes.push(nodeID);
    }
    // initalize object to report all nodes and edges in neighbourhood of given node
    // Structure = { nodes: [nodes], edges: [edges]}
    let neighborElements = {
      nodes: [],
      edges: []
    };
    //for each 0 distance neighborhood node get 1 distance nodes and edges
    neighborhood['nodes'].forEach((neighborNodeID) => {
      let neighborNode = invisibleGM.nodesMap.get(neighborNodeID);
      neighborNode.edges.forEach((edge) => {
        if (edge.source.ID == neighborNode.ID) {
          neighborElements['nodes'].push(edge.target.ID);
        } else {
          neighborElements['nodes'].push(edge.source.ID);
        }
        neighborElements['edges'].push(edge.ID);
      })
    })
    // remove all duplicates from 1 distance neighbourhood
    neighborElements['nodes'] = [...new Set([...neighborElements['nodes']])];
    neighborElements['edges'] = [...new Set([...neighborElements['edges']])];

    //for each 1 distance node, calculate individual zero distance neighborhood and append it to the orignal dictionary
    neighborElements['nodes'].forEach((neighborElementID) => {
      let targetNeighborNode = invisibleGM.nodesMap.get(neighborElementID);
      let targetNeighborhood = this.getZeroDistanceNeighbors(targetNeighborNode, invisibleGM);
      neighborhood['nodes'] = [...new Set([...neighborhood['nodes'], ...targetNeighborhood['nodes']])];
      neighborhood['edges'] = [...new Set([...neighborhood['edges'], ...targetNeighborhood['edges']])];
    })

    //remove duplications
    neighborhood['nodes'] = [...new Set([...neighborhood['nodes'], ...neighborElements['nodes']])];
    neighborhood['edges'] = [...new Set([...neighborhood['edges'], ...neighborElements['edges']])];

    //filter out all visible nodes
    neighborhood['nodes'] = neighborhood['nodes'].filter((itemID) => {
      let itemNode = invisibleGM.nodesMap.get(itemID);
      return !(itemNode.isVisible);
    })

    //filter out all visible edges
    neighborhood['edges'] = neighborhood['edges'].filter((itemID) => {
      let itemEdge = invisibleGM.edgesMap.get(itemID);
      return !(itemEdge.isVisible);
    })

    return neighborhood;
  }

  static getZeroDistanceNeighbors(node, invisibleGM) {
    let neighbors = {
      nodes: [],
      edges: []
    };
    let descendantNeighborhood = this.getDescendantNeighbors(node);
    let predecessorsNeighborhood = this.getPredecessorNeighbors(node, invisibleGM);
    neighbors['nodes'] = [...new Set([...descendantNeighborhood['nodes'], ...predecessorsNeighborhood['nodes']])];
    neighbors['edges'] = [...new Set([...descendantNeighborhood['edges'], ...predecessorsNeighborhood['edges']])];

    return neighbors;
  }

  static getDescendantNeighbors(node) {
    let neighbors = {
      nodes: [],
      edges: []
    };
    if (node.child) {
      let children = node.child.nodes;
      children.forEach(childNode => {
        neighbors.nodes.push(childNode.ID);
        childNode.edges.forEach(element => {
          neighbors.edges.push(element.ID);
        });
        let nodesReturned = this.getDescendantNeighbors(childNode);
        neighbors['nodes'] = [...neighbors['nodes'], ...nodesReturned['nodes']];
        neighbors['edges'] = [...neighbors['edges'], ...nodesReturned['edges']];
      });
    }

    return neighbors;
  }

  static getPredecessorNeighbors(node, invisibleGM) {
    let neighbors = {
      nodes: [],
      edges: []
    };
    if (node.owner != invisibleGM.rootGraph) {
      let predecessors = node.owner.nodes;
      predecessors.forEach(pNode => {
        neighbors['nodes'].push(pNode.ID);
        pNode.edges.forEach(element => {
          neighbors.edges.push(element.ID);
        });
      });
      let nodesReturned = this.getPredecessorNeighbors(node.owner.parent, invisibleGM);
      neighbors['nodes'] = [...neighbors['nodes'], ...nodesReturned['nodes']];
      neighbors['edges'] = [...neighbors['edges'], ...nodesReturned['edges']];
    }
    else {
      neighbors['nodes'].push(node.ID);
    }

    return neighbors;
  }
}