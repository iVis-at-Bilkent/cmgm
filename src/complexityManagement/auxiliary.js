import { GraphManager } from "../graph-manager";
import { Graph } from "../graph";
import { Edge } from "../edge";
import { Node } from "../node";
import { MetaEdge } from "../meta-edge";
import { FilterUnfilter } from "./filter-unfilter";
export class Auxiliary {

  static lastID = 0;

  static createUniqueID() {
    let newID = "Object#" + this.lastID + "";
    this.lastID++;
    return newID;
  }

  static removeEdgeFromGraph(edgeToRemove) {
    if (edgeToRemove.owner instanceof GraphManager) {
      edgeToRemove.owner.removeInterGraphEdge(edgeToRemove);
    }
    else {
      edgeToRemove.owner.removeEdge(edgeToRemove);
    }
  }
  static recursiveMetaEdgeUpdate(edge,visibleGM){
    let deletedMetaEdges = []
    let metaEdge = visibleGM.edgeToMetaEdgeMap.get(edge.ID);
    visibleGM.edgeToMetaEdgeMap.delete(edge.ID);
    if(visibleGM.edgeToMetaEdgeMap.has(metaEdge.ID)){
      let returnedList = this.recursiveMetaEdgeUpdate(metaEdge,visibleGM);
      deletedMetaEdges = [...deletedMetaEdges,...returnedList]
    }
    let orignalEnds = [...visibleGM.metaEdgesMap.get(metaEdge.ID).originalEdges];
    orignalEnds = orignalEnds.filter((i)=>i==edge.ID?false:true);
    if(orignalEnds.length==0){
      visibleGM.metaEdgesMap.delete(metaEdge.ID)
      if(visibleGM.edgesMap.has(metaEdge.ID)){
        visibleGM.edgesMap.delete(metaEdge.ID);
        deletedMetaEdges.push({ID:metaEdge.ID,sourceID:metaEdge.source.ID,targetID:metaEdge.target.ID});
      }
    }else{
      visibleGM.metaEdgesMap.get(metaEdge.ID).originalEdges = orignalEnds
    }
    return deletedMetaEdges
  }
  //recursivly tracks if meta edge is part of another meta edge if yes returns top one
  static getTopMetaEdge(metaEdge,visibleGM){
    //check if meta edge is part of another meta edge
    let topMetaEdge = visibleGM.edgeToMetaEdgeMap.get(metaEdge.ID)
    //if not then topMetaEdge will be undefined so return meta edge
    if(topMetaEdge){
      if(visibleGM.edgeToMetaEdgeMap.has(topMetaEdge.ID)){
        topMetaEdge = this.getTopMetaEdge(topMetaEdge,visibleGM)
      }
      return topMetaEdge
    }

    return metaEdge
  }
  static moveNodeToVisible(node, visibleGM, invisibleGM) {

    var edgeIDList = [[],[]]

    node.isVisible = true;
    let nodeForVisible = new Node(node.ID);
    let newNode = node.owner.siblingGraph.addNode(nodeForVisible);
    visibleGM.nodesMap.set(newNode.ID, newNode);
    if (node.child) {
      if (node.isCollapsed == false) {
        let newGraph = visibleGM.addGraph(new Graph(null, visibleGM), nodeForVisible);
        newGraph.siblingGraph = node.child;
        node.child.siblingGraph = newGraph;
      }
    }
    node.edges.forEach(incidentEdge => {
      //edge is part of a meta edge in visible graph
      let found = false;
      if (visibleGM.edgeToMetaEdgeMap.has(incidentEdge.ID)) {
        let visibleMetaEdge = visibleGM.edgeToMetaEdgeMap.get(incidentEdge.ID)
        if(visibleGM.edgesMap.has(visibleMetaEdge.ID) && visibleMetaEdge.originalEdges.length == 1){
          visibleGM.edgesMap.delete(visibleMetaEdge.ID);
          edgeIDList[1].push({ID:visibleMetaEdge.ID,sourceID:visibleMetaEdge.source.ID,targetID:visibleMetaEdge.target.ID});
          try{
            Auxiliary.removeEdgeFromGraph(visibleMetaEdge);
            }catch(ex){
              
            }
          if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false && incidentEdge.source.isVisible && incidentEdge.target.isVisible) {
            Auxiliary.moveEdgeToVisible(incidentEdge, visibleGM, invisibleGM);
            edgeIDList[0].push(incidentEdge.ID)
          }
        }else if(visibleGM.edgesMap.has(visibleMetaEdge.ID) && visibleMetaEdge.originalEdges.length != 1){
          //do nothing
        }
        else{
          if(visibleMetaEdge.originalEdges.length == 1){
            if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false && incidentEdge.source.isVisible && incidentEdge.target.isVisible) {
              Auxiliary.moveEdgeToVisible(incidentEdge, visibleGM, invisibleGM);
              edgeIDList[0].push(incidentEdge.ID)
              let deleteMetaEdgeList = this.recursiveMetaEdgeUpdate(incidentEdge,visibleGM)
              edgeIDList[1] = [...edgeIDList[1],...deleteMetaEdgeList];
            }
          }else{
            //checks if given meta edge is part of any other meta edge, if yes returns the top one (only for cases where given meta edge)
            // is not created by collapse.
              visibleMetaEdge = this.getTopMetaEdge(visibleMetaEdge,visibleGM);
              if(visibleMetaEdge.originalEdges.length == 1){
                visibleGM.edgesMap.delete(visibleMetaEdge.ID);
                edgeIDList[1].push({ID:visibleMetaEdge.ID,sourceID:visibleMetaEdge.source.ID,targetID:visibleMetaEdge.target.ID});
                try{
                Auxiliary.removeEdgeFromGraph(visibleMetaEdge);
                }catch(ex){

                }
                if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false && incidentEdge.source.isVisible && incidentEdge.target.isVisible) {
                  Auxiliary.moveEdgeToVisible(incidentEdge, visibleGM, invisibleGM);
                  edgeIDList[0].push(incidentEdge.ID)
                }
              }else{
                let sourceInVisible = visibleGM.nodesMap.get(visibleMetaEdge.source.ID);
                let targetInVisible = visibleGM.nodesMap.get(visibleMetaEdge.target.ID);
                if (sourceInVisible && targetInVisible) {
                  if (incidentEdge.source.owner == incidentEdge.target.owner) {
                  let newEdge = incidentEdge.source.owner.siblingGraph.addEdge(visibleMetaEdge, sourceInVisible, targetInVisible);
                  }
                  else {
                  let newEdge = visibleGM.addInterGraphEdge(visibleMetaEdge, sourceInVisible, targetInVisible);
                  }
                  visibleGM.edgesMap.set(visibleMetaEdge.ID, visibleMetaEdge);
                  edgeIDList[0].push(visibleMetaEdge.ID);
                }
              }

        }}
      }else{
        if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false && incidentEdge.source.isVisible && incidentEdge.target.isVisible) {
          Auxiliary.moveEdgeToVisible(incidentEdge, visibleGM, invisibleGM);
          edgeIDList[0].push(incidentEdge.ID)
        }
      }
    });
    return edgeIDList
  }

  static moveEdgeToVisible(edge, visibleGM, invisibleGM) {
    edge.isVisible = true;
    let edgeForVisible = new Edge(edge.ID, null, null);
    let sourceInVisible = visibleGM.nodesMap.get(edge.source.ID);
    let targetInVisible = visibleGM.nodesMap.get(edge.target.ID);
    let newEdge;
    if (edge.source.owner == edge.target.owner) {
      newEdge = edge.source.owner.siblingGraph.addEdge(edgeForVisible, sourceInVisible, targetInVisible);
    }
    else {
      newEdge = visibleGM.addInterGraphEdge(edgeForVisible, sourceInVisible, targetInVisible);
    }
    visibleGM.edgesMap.set(newEdge.ID, newEdge);
  }

  static getTargetNeighborhoodElements(nodeID, invisibleGM) {
    let node = invisibleGM.nodesMap.get(nodeID);
    //get zero distance Neighborhood
    let neighborhood = this.getZeroDistanceNeighbors(node, invisibleGM);

    if (!neighborhood.nodes.includes(nodeID)) {
      neighborhood.nodes.push(nodeID);
    }

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
    // append elements from 1 distance to orignal dictionary
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

    //remove all visible nodes
    neighborhood['nodes'] = neighborhood['nodes'].filter((itemID) => {
      let itemNode = invisibleGM.nodesMap.get(itemID);
      return !(itemNode.isVisible);
    })

    //remove all visible nodes
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