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

  static moveNodeToVisible(node, visibleGM, invisibleGM) {
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
      visibleGM.edgesMap.forEach((visibleEdge) => {
        if (visibleEdge instanceof MetaEdge) {
          // this.updateMetaEdge function returns updated version of originalEdges without key of edgeTo Remove
          let updatedOrignalEdges = FilterUnfilter.updateMetaEdge(visibleEdge.originalEdges, incidentEdge.ID);
          // updatedOrignalEdges will be same as originalEdges if edge to remove is not part of the meta edge
          if (updatedOrignalEdges != visibleEdge.originalEdges) {
            visibleEdge.originalEdges = updatedOrignalEdges;
            found = true;
          }
          //update handled but incident edge should be created in the visible graph.
          //..........THINK........
        }
      });
      if (incidentEdge.isFiltered == false && incidentEdge.isHidden == false && incidentEdge.source.isVisible && incidentEdge.target.isVisible) {
        Auxiliary.moveEdgeToVisible(incidentEdge, visibleGM, invisibleGM);
      }
    });
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

  static getTargetNeighbourhoodElements(nodeID, invisibleGM) {
    let node = invisibleGM.nodesMap.get(nodeID);
    //get zero distance Neighbourhood
    let neighbourHood = this.getZeroDistanceNeighbours(node,invisibleGM)
    let neighborElements = {
      nodes: [],
      edges: []
    }
    //for each 0 distance neighbourhood node get 1 distance nodes and edges
    neighbourHood['nodes'].forEach((neighborNodeID) => {
      neighborNode = invisibleGM.nodesMap.get(neighborNodeID);
      neighborNode.edges.forEach((edge) => {
      if (edge.source.ID == neighborNode.ID) {
        neighborElements['nodes'].push(edge.target.ID)
      } else {
        neighborElements['nodes'].push(edge.source.ID)
      }
      neighborElements['edges'].push(edge.ID)
      })
    })
    // append elements from 1 distance to orignal dictionary
    neighborElements['nodes'] = [...new Set([...neighborElements['nodes']])]
    neighborElements['edges'] = [...new Set([...neighborElements['edges']])]
    
    //for each 1 distance node, calculate individual zero distance neighbourhood and append it to the orignal dictionary
    neighborElements['nodes'].forEach((neighborElementID) => {
      let targetNeighborNode = invisibleGM.nodesMap.get(neighborElementID);
      let targetNeighbourHood = this.getZeroDistanceNeighbours(targetNeighborNode,invisibleGM)
      neighbourHood['nodes'] = [...new Set([...neighbourHood['nodes'],...targetNeighbourHood['nodes']])]
      neighbourHood['edges'] = [...new Set([...neighbourHood['edges'],...targetNeighbourHood['edges']])]
    })
    
    //remove duplications
    neighbourHood['nodes'] = [...new Set([...neighbourHood['nodes'],...neighborElements['nodes']])]
    neighbourHood['edges'] = [...new Set([...neighbourHood['edges'],...neighborElements['edges']])]

    //remove all visible nodes
    neighbourHood['nodes'] = neighbourHood['nodes'].filter((itemID)=>{
      let itemNode = invisibleGM.nodesMap.get(itemID);
      return !(itemNode.isVisible)
    })

    //remove all visible nodes
    neighbourHood['edges'] = neighbourHood['edges'].filter((itemID)=>{
      let itemEdge = invisibleGM.nodesMap.get(itemID);
      return !(itemEdge.isVisible)
    })

    return neighbourHood;
  }

  static getZeroDistanceNeighbours(node,invisibleGM){
    let neighbours = {
      nodes:[],
      edges:[]
    }
    let descendantNeighbourHood = getDescendantNeighbours(node)
    let predecessorsNeighbourHood = getPredecessorNeighbours(node,invisibleGM);
    neighbours['nodes'] = [...new Set([...descendantNeighbourHood['nodes'],...predecessorsNeighbourHood['nodes']])]
    neighbours['edges'] = [...new Set([...descendantNeighbourHood['edges'],...predecessorsNeighbourHood['edges']])]
    return neighbours;
  }
  static getDescendantNeighbours(node){
    let neighbours = {
      nodes:[],
      edges:[]
    }
    if(node.child){
      let children = node.child.nodes
      children.forEach(childNode => {
        neighbours.nodes.push(childNode.ID)
        childNode.edges.forEach(element => {
          neighbours.edges.push(element.ID)          
        });
        let nodesReturned = this.getDescendantNeighbours(childNode);
        neighbours['nodes'] = [...neighbours['nodes'],...nodesReturned['nodes']]
        neighbours['edges'] = [...neighbours['edges'],...nodesReturned['edges']]
      });
    }
    return neighbours
  }
  static getPredecessorNeighbours(node,invisibleGM){
    let neighbours = {
      nodes:[],
      edges:[]
    }
    if(node.owner != invisibleGM.rootGraph){
      let predecessors = node.owner.nodes
      predecessors.forEach(pNode => {
        neighbours['nodes'].push(pNode.ID);
        pNode.edges.forEach(element => {
          neighbours.edges.push(element.ID)          
        });
      });
      let nodesReturned = this.getPredecessorNeighbours(node.owner.parent);
      neighbours['nodes'] = [...neighbours['nodes'],...nodesReturned['nodes']]
      neighbours['edges'] = [...neighbours['edges'],...nodesReturned['edges']]
    }
    return neighbours
  }
}