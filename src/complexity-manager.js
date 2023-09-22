import { Auxiliary } from "./complexityManagement/auxiliary";
import { ExpandCollapse } from "./complexityManagement/expand-collapse";
import { FilterUnfilter } from "./complexityManagement/filter-unfilter";
import { GraphManager } from "./graph-manager";
import { HideShow } from "./complexityManagement/hide-show";
import { Topology } from "./complexityManagement/topology";
import { Graph } from "./graph";
import { Node } from "./node";

/**
 * This class is responsible for the communication between CMGM core 
 * and the outside world via API functions. These API functions include
 * both the ones used to synchronize CMGM with the graph model of Rendering
 * Library (RL) when any topological changes occur on the renderer’s side
 * and the ones related to the complexity management operations.
 */
export class ComplexityManager {
  // Graph manager that is responsible from visible compound graph
  #visibleGraphManager;

  // Graph manager that is responsible from invisible compound graph
  #mainGraphManager;

  /**
   * Constructor
   */
  constructor() {
    this.#visibleGraphManager = this.#newGraphManager(true);
    this.#mainGraphManager = this.#newGraphManager(false);
    // Set sibling graph managers
    this.#visibleGraphManager.siblingGraphManager = this.#mainGraphManager;
    this.#mainGraphManager.siblingGraphManager = this.#visibleGraphManager;
  }

  // Get methods
  get visibleGraphManager() {
    return this.#visibleGraphManager;
  }

  get mainGraphManager() {
    return this.#mainGraphManager;
  }

  /*
    * This method creates a new graph manager responsible for either
    * visible or invisible graph based on the input and returns it.
    */
  #newGraphManager(isVisible) {
    let gm = new GraphManager(this, isVisible);
    return gm;
  }

  /**
   * This method creates a new graph in the graph manager associated with the input.
   */
  newGraph(graphManager) {
    return new Graph(null, graphManager);
  }

  /**
   * This method creates a new node associated with the input view node.
   */
  newNode(ID) {
    let nodeID = ID ? ID : Auxiliary.createUniqueID();
    return new Node(nodeID);
  }

  // Topology related API methods

  addNode(nodeID, parentID) {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    Topology.addNode(nodeID, parentID, visibleGM, mainGM);
  }

  addEdge(edgeID, sourceID, targetID) {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    Topology.addEdge(edgeID, sourceID, targetID, visibleGM, mainGM);
  }

  removeNode(nodeID) {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    Topology.removeNode(nodeID, visibleGM, mainGM);
  }

  removeEdge(edgeID) {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    Topology.removeEdge(edgeID, visibleGM, mainGM);
  }

  reconnect(edgeID, newSourceID, newTargetID) {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    Topology.reconnect(edgeID, newSourceID, newTargetID, visibleGM, mainGM);
  }

  changeParent(nodeID, newParentID) {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    Topology.changeParent(nodeID, newParentID, visibleGM, mainGM);
  }

  // Complexity management related API methods

  // filter/unfilter methods

  filter(nodeIDList, edgeIDList) {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    return FilterUnfilter.filter(nodeIDList, edgeIDList, visibleGM, mainGM);
  }

  unfilter(nodeIDList, edgeIDList) {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    return FilterUnfilter.unfilter(nodeIDList, edgeIDList, visibleGM, mainGM);
  }

  // hide/show methods

  hide(nodeIDList, edgeIDList) {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    return HideShow.hide(nodeIDList, edgeIDList, visibleGM, mainGM);
  }

  show(nodeIDList, edgeIDList) {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    return HideShow.show(nodeIDList, edgeIDList, visibleGM, mainGM);
  }

  showAll() {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    return HideShow.showAll(visibleGM, mainGM);
  }

  // expand/collapse methods

  collapseNodes(nodeIDList, isRecursive) {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    let reportedData =  ExpandCollapse.collapseNodes(nodeIDList, isRecursive, visibleGM, mainGM);
    
    return reportedData;
  }

  expandNodes(nodeIDList, isRecursive) {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    let reportedData =  ExpandCollapse.expandNodes(nodeIDList, isRecursive, visibleGM, mainGM);
    
    return reportedData;
  }

  collapseAllNodes() {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    let reportedData =  ExpandCollapse.collapseAllNodes(visibleGM, mainGM);
    
    
    return reportedData;

  }

  expandAllNodes() {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    let reportedData =  ExpandCollapse.expandAllNodes(visibleGM, mainGM);
    
    return reportedData;
  }

  collapseEdges(edgeIDList) {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    if(!visibleGM.edgesMap.has(edgeIDList[0])){
      edgeIDList.shift();
    }
    return ExpandCollapse.collapseEdges(edgeIDList, visibleGM, mainGM);
  }

  expandEdges(edgeIDList, isRecursive) {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    return ExpandCollapse.expandEdges(edgeIDList, isRecursive, visibleGM, mainGM);
  }

  collapseEdgesBetweenNodes(nodeIDList) {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    return ExpandCollapse.collapseEdgesBetweenNodes(nodeIDList, visibleGM, mainGM);
  }

  expandEdgesBetweenNodes(nodeIDList, isRecursive) {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    return ExpandCollapse.expandEdgesBetweenNodes(nodeIDList, isRecursive, visibleGM, mainGM);
  }

  collapseAllEdges() {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    return ExpandCollapse.collapseAllEdges(visibleGM, mainGM);
  }

  expandAllEdges() {
    let visibleGM = this.#visibleGraphManager;
    let mainGM = this.#mainGraphManager;
    return ExpandCollapse.expandAllEdges(visibleGM, mainGM);
  }

  getHiddenNeighbors(nodeID) {
    let mainGM = this.#mainGraphManager;
    return Auxiliary.getTargetNeighborhoodElements(nodeID, mainGM);
  }

  isCollapsible(nodeID){
    let mainGM = this.#mainGraphManager;
    let node = mainGM.nodesMap.get(nodeID);
    if(node.child && node.isCollapsed == false){
      return true;
    }
    else{
      return false
    }
  }

  isExpandable(nodeID){
    let mainGM = this.#mainGraphManager;
    let node = mainGM.nodesMap.get(nodeID);
    if(node.child && node.isCollapsed){
      return true;
    }
    else{
      return false
    }
  }

}