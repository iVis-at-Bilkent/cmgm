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
  #invisibleGraphManager;

  /**
   * Constructor
   */
  constructor() {
    this.#visibleGraphManager = this.#newGraphManager(true);
    this.#invisibleGraphManager = this.#newGraphManager(false);
    // Set sibling graph managers
    this.#visibleGraphManager.siblingGraphManager = this.#invisibleGraphManager;
    this.#invisibleGraphManager.siblingGraphManager = this.#visibleGraphManager;
  }

  // Get methods
  get visibleGraphManager() {
    return this.#visibleGraphManager;
  }

  get invisibleGraphManager() {
    return this.#invisibleGraphManager;
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
    let invisibleGM = this.#invisibleGraphManager;
    Topology.addNode(nodeID, parentID, visibleGM, invisibleGM);
  }

  addEdge(edgeID, sourceID, targetID) {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    Topology.addEdge(edgeID, sourceID, targetID, visibleGM, invisibleGM);
  }

  removeNode(nodeID) {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    Topology.removeNode(nodeID, visibleGM, invisibleGM);
  }

  removeEdge(edgeID) {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    Topology.removeEdge(edgeID, visibleGM, invisibleGM);
  }

  reconnect(edgeID, newSourceID, newTargetID) {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    Topology.reconnect(edgeID, newSourceID, newTargetID, visibleGM, invisibleGM);
  }

  changeParent(nodeID, newParentID) {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    Topology.changeParent(nodeID, newParentID, visibleGM, invisibleGM);
  }

  // Complexity management related API methods

  // filter/unfilter methods

  filter(nodeIDList, edgeIDList) {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    return FilterUnfilter.filter(nodeIDList, edgeIDList, visibleGM, invisibleGM);
  }

  unfilter(nodeIDList, edgeIDList) {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    return FilterUnfilter.unfilter(nodeIDList, edgeIDList, visibleGM, invisibleGM);
  }

  // hide/show methods

  hide(nodeIDList, edgeIDList) {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    return HideShow.hide(nodeIDList, edgeIDList, visibleGM, invisibleGM);
  }

  show(nodeIDList, edgeIDList) {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    HideShow.show(nodeIDList, edgeIDList, visibleGM, invisibleGM);
  }

  showAll() {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    HideShow.showAll(visibleGM, invisibleGM);
  }

  // expand/collapse methods

  collapseNodes(nodeIDList, isRecursive) {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    ExpandCollapse.collapseNodes(nodeIDList, isRecursive, visibleGM, invisibleGM);
  }

  expandNodes(nodeIDList, isRecursive) {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    ExpandCollapse.expandNodes(nodeIDList, isRecursive, visibleGM, invisibleGM);
  }

  collapseAllNodes() {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    ExpandCollapse.collapseAllNodes(visibleGM, invisibleGM);
  }

  expandAllNodes() {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    ExpandCollapse.expandAllNodes(visibleGM, invisibleGM);
  }

  collapseEdges(edgeIDList) {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    ExpandCollapse.collapseEdges(edgeIDList, visibleGM, invisibleGM);
  }

  expandEdges(edgeIDList, isRecursive) {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    ExpandCollapse.expandEdges(edgeIDList, isRecursive, visibleGM, invisibleGM);
  }

  collapseEdgesBetweenNodes(nodeIDList) {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    ExpandCollapse.collapseEdgesBetweenNodes(nodeIDList, visibleGM, invisibleGM);
  }

  expandEdgesBetweenNodes(nodeIDList, isRecursive) {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    ExpandCollapse.expandEdgesBetweenNodes(nodeIDList, isRecursive, visibleGM, invisibleGM);
  }

  collapseAllEdges() {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    ExpandCollapse.collapseAllEdges(visibleGM, invisibleGM);
  }

  expandAllEdges() {
    let visibleGM = this.#visibleGraphManager;
    let invisibleGM = this.#invisibleGraphManager;
    ExpandCollapse.expandAllEdges(visibleGM, invisibleGM);
  }
}