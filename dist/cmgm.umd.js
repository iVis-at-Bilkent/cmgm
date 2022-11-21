(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? factory(exports) :
  typeof define === 'function' && define.amd ? define(['exports'], factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, factory(global.cmgm = {}));
})(this, (function (exports) { 'use strict';

  function _classCallCheck(instance, Constructor) {
    if (!(instance instanceof Constructor)) {
      throw new TypeError("Cannot call a class as a function");
    }
  }
  function _defineProperties(target, props) {
    for (var i = 0; i < props.length; i++) {
      var descriptor = props[i];
      descriptor.enumerable = descriptor.enumerable || false;
      descriptor.configurable = true;
      if ("value" in descriptor) descriptor.writable = true;
      Object.defineProperty(target, descriptor.key, descriptor);
    }
  }
  function _createClass(Constructor, protoProps, staticProps) {
    if (protoProps) _defineProperties(Constructor.prototype, protoProps);
    if (staticProps) _defineProperties(Constructor, staticProps);
    Object.defineProperty(Constructor, "prototype", {
      writable: false
    });
    return Constructor;
  }
  function _defineProperty(obj, key, value) {
    if (key in obj) {
      Object.defineProperty(obj, key, {
        value: value,
        enumerable: true,
        configurable: true,
        writable: true
      });
    } else {
      obj[key] = value;
    }
    return obj;
  }
  function _classPrivateFieldGet(receiver, privateMap) {
    var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "get");
    return _classApplyDescriptorGet(receiver, descriptor);
  }
  function _classPrivateFieldSet(receiver, privateMap, value) {
    var descriptor = _classExtractFieldDescriptor(receiver, privateMap, "set");
    _classApplyDescriptorSet(receiver, descriptor, value);
    return value;
  }
  function _classExtractFieldDescriptor(receiver, privateMap, action) {
    if (!privateMap.has(receiver)) {
      throw new TypeError("attempted to " + action + " private field on non-instance");
    }
    return privateMap.get(receiver);
  }
  function _classApplyDescriptorGet(receiver, descriptor) {
    if (descriptor.get) {
      return descriptor.get.call(receiver);
    }
    return descriptor.value;
  }
  function _classApplyDescriptorSet(receiver, descriptor, value) {
    if (descriptor.set) {
      descriptor.set.call(receiver, value);
    } else {
      if (!descriptor.writable) {
        throw new TypeError("attempted to set read only private field");
      }
      descriptor.value = value;
    }
  }
  function _classPrivateMethodGet(receiver, privateSet, fn) {
    if (!privateSet.has(receiver)) {
      throw new TypeError("attempted to get private field on non-instance");
    }
    return fn;
  }
  function _checkPrivateRedeclaration(obj, privateCollection) {
    if (privateCollection.has(obj)) {
      throw new TypeError("Cannot initialize the same private elements twice on an object");
    }
  }
  function _classPrivateFieldInitSpec(obj, privateMap, value) {
    _checkPrivateRedeclaration(obj, privateMap);
    privateMap.set(obj, value);
  }
  function _classPrivateMethodInitSpec(obj, privateSet) {
    _checkPrivateRedeclaration(obj, privateSet);
    privateSet.add(obj);
  }

  var Auxiliary = /*#__PURE__*/function () {
    function Auxiliary() {
      _classCallCheck(this, Auxiliary);
    }
    _createClass(Auxiliary, null, [{
      key: "removeEdgeFromGraph",
      value: function removeEdgeFromGraph(edgeToRemove, visibleGM, invisibleGM) {}
    }, {
      key: "moveNodeToVisible",
      value: function moveNodeToVisible(node, visibleGM, invisibleGM) {}
    }, {
      key: "moveEdgeToVisible",
      value: function moveEdgeToVisible(node, visibleGM, invisibleGM) {}
    }, {
      key: "createUniqueID",
      value: function createUniqueID() {
        var newID = "Object#" + this.lastID + "";
        this.lastID++;
        return newID;
      }
    }]);
    return Auxiliary;
  }();
  _defineProperty(Auxiliary, "lastID", 0);

  var _collapseNode = /*#__PURE__*/new WeakSet();
  var _expandNode = /*#__PURE__*/new WeakSet();
  var ExpandCollapse = /*#__PURE__*/function () {
    function ExpandCollapse() {
      _classCallCheck(this, ExpandCollapse);
      _classPrivateMethodInitSpec(this, _expandNode);
      _classPrivateMethodInitSpec(this, _collapseNode);
    }
    _createClass(ExpandCollapse, null, [{
      key: "collpaseNodes",
      value: function collpaseNodes(nodeIDList, isRecursive, visibleGM, invisibleGM) {}
    }, {
      key: "expandNodes",
      value: function expandNodes(nodeIDList, isRecursive, visibleGM, invisibleGM) {}
    }, {
      key: "collapseAllNodes",
      value: function collapseAllNodes(visibleGM, invisibleGM) {}
    }, {
      key: "expandAllNodes",
      value: function expandAllNodes(visibleGM, invisibleGM) {}
    }, {
      key: "collapseEdges",
      value: function collapseEdges(edgeIDList, visibleGM, invisibleGM) {}
    }, {
      key: "expandEdges",
      value: function expandEdges(edgeIDList, visibleGM, invisibleGM) {}
    }, {
      key: "collapseEdgesBetweenNodes",
      value: function collapseEdgesBetweenNodes(nodeIDList, visibleGM, invisibleGM) {}
    }, {
      key: "expandEdgesBetweenNodes",
      value: function expandEdgesBetweenNodes(nodeIDList, isRecursive, visibleGM, invisibleGM) {}
    }, {
      key: "collapseAllEdges",
      value: function collapseAllEdges(visibleGM, invisibleGM) {}
    }]);
    return ExpandCollapse;
  }();

  var FilterUnfilter = /*#__PURE__*/function () {
    function FilterUnfilter() {
      _classCallCheck(this, FilterUnfilter);
    }
    _createClass(FilterUnfilter, null, [{
      key: "filter",
      value: function filter(nodeIDList, edgeIDList, visibleGM, invisibleGM) {}
    }, {
      key: "unfilter",
      value: function unfilter(nodeIDList, edgeIDList, visibleGM, invisibleGM) {}
    }]);
    return FilterUnfilter;
  }();

  var _owner = /*#__PURE__*/new WeakMap();
  var _graphs = /*#__PURE__*/new WeakMap();
  var _edges = /*#__PURE__*/new WeakMap();
  var _rootGraph = /*#__PURE__*/new WeakMap();
  var _siblingGraphManager = /*#__PURE__*/new WeakMap();
  var _isVisible = /*#__PURE__*/new WeakMap();
  /**
   * This class represents a graph manager for complexity management purposes. A graph
   * manager maintains a collection of graphs, forming a compound graph structure
   * through inclusion, and maintains its owner complexity manager, its root graph, 
   * its inter-graph edges, its sibling graph manager and the information of whether 
   * it is visible or not.
   */
  var GraphManager = /*#__PURE__*/function () {
    // Complexity manager that owns this graph manager

    // Graphs maintained by this graph manager, including the root of the nesting hierarchy

    /*
    * Inter-graph edges in this graph manager. Notice that all inter-graph
    * edges go here, not in any of the edge lists of individual graphs (either
    * source or target node's owner graph).
    */

    // The root of the inclusion/nesting hierarchy of this compound structure

    /**
     * Sibling graph manager of this graph manager. If this graph manager is managing the visible 
     * graph, then siblingGraphManager manages the invisible graph or vice versa.
     */

    // Whether this graph manager manages the visible graph or not

    /**
     * Constructor
     * @param {ComplexityManager} owner - owner complexity manager 
     * @param {bool} isVisible - whether the graph manager manages visible graph or not
     */
    function GraphManager(owner, isVisible) {
      _classCallCheck(this, GraphManager);
      _classPrivateFieldInitSpec(this, _owner, {
        writable: true,
        value: void 0
      });
      _classPrivateFieldInitSpec(this, _graphs, {
        writable: true,
        value: void 0
      });
      _classPrivateFieldInitSpec(this, _edges, {
        writable: true,
        value: void 0
      });
      _classPrivateFieldInitSpec(this, _rootGraph, {
        writable: true,
        value: void 0
      });
      _classPrivateFieldInitSpec(this, _siblingGraphManager, {
        writable: true,
        value: void 0
      });
      _classPrivateFieldInitSpec(this, _isVisible, {
        writable: true,
        value: void 0
      });
      _classPrivateFieldSet(this, _owner, owner);
      _classPrivateFieldSet(this, _graphs, []);
      _classPrivateFieldSet(this, _edges, []);
      _classPrivateFieldSet(this, _rootGraph, null);
      _classPrivateFieldSet(this, _siblingGraphManager, null);
      _classPrivateFieldSet(this, _isVisible, isVisible);
    }

    // get methods
    _createClass(GraphManager, [{
      key: "owner",
      get: function get() {
        return _classPrivateFieldGet(this, _owner);
      },
      set:
      // set methods
      function set(owner) {
        _classPrivateFieldSet(this, _owner, owner);
      }
    }, {
      key: "graphs",
      get: function get() {
        return _classPrivateFieldGet(this, _graphs);
      },
      set: function set(graphs) {
        _classPrivateFieldSet(this, _graphs, graphs);
      }
    }, {
      key: "edges",
      get: function get() {
        return _classPrivateFieldGet(this, _edges);
      },
      set: function set(edges) {
        _classPrivateFieldSet(this, _edges, edges);
      }
    }, {
      key: "rootGraph",
      get: function get() {
        return _classPrivateFieldGet(this, _rootGraph);
      },
      set: function set(rootGraph) {
        if (rootGraph.owner != this) {
          throw "Root not in this graph mgr!";
        }
        _classPrivateFieldSet(this, _rootGraph, rootGraph);

        // root graph must have a root node associated with it for convenience
        if (rootGraph.parent == null) {
          rootGraph.parent = this.owner.newNode("Root node");
        }
      }
    }, {
      key: "siblingGraphManager",
      get: function get() {
        return _classPrivateFieldGet(this, _siblingGraphManager);
      },
      set: function set(siblingGraphManager) {
        _classPrivateFieldSet(this, _siblingGraphManager, siblingGraphManager);
      }
    }, {
      key: "isVisible",
      get: function get() {
        return _classPrivateFieldGet(this, _isVisible);
      },
      set: function set(isVisible) {
        _classPrivateFieldSet(this, _isVisible, isVisible);
      }

      /**
       * This method adds a new graph to this graph manager and sets as the root.
       * It also creates the root node as the parent of the root graph.
       */
    }, {
      key: "addRoot",
      value: function addRoot() {
        var newGraph = _classPrivateFieldGet(this, _owner).newGraph();
        var newNode = _classPrivateFieldGet(this, _owner).newNode(null);
        var root = this.addGraph(newGraph, newNode);
        this.rootGraph = root;
        return _classPrivateFieldGet(this, _rootGraph);
      }

      /**
       * This method adds the input graph into this graph manager. The new graph
       * is associated as the child graph of the input parent node. If the parent
       * node is null, then the graph is set to be the root.
       */
    }, {
      key: "addGraph",
      value: function addGraph(newGraph, parentNode) {
        if (newGraph == null) {
          throw "Graph is null!";
        }
        if (parentNode == null) {
          throw "Parent node is null!";
        }
        if (_classPrivateFieldGet(this, _graphs).indexOf(newGraph) > -1) {
          throw "Graph already in this graph mgr!";
        }
        _classPrivateFieldGet(this, _graphs).push(newGraph);
        if (newGraph.parent != null) {
          throw "Already has a parent!";
        }
        if (parentNode.child != null) {
          throw "Already has a child!";
        }
        newGraph.parent = parentNode;
        parentNode.child = newGraph;
        return newGraph;
      }

      /**
       * This method adds the input edge between specified nodes into this graph
       * manager. We assume both source and target nodes to be already in this
       * graph manager.
       */
    }, {
      key: "addInterGraphEdge",
      value: function addInterGraphEdge(newEdge, sourceNode, targetNode) {
        var sourceGraph = sourceNode.owner;
        var targetGraph = targetNode.owner;
        if (!(sourceGraph != null && sourceGraph.getGraphManager() == this)) {
          throw "Source not in this graph mgr!";
        }
        if (!(targetGraph != null && targetGraph.getGraphManager() == this)) {
          throw "Target not in this graph mgr!";
        }
        if (sourceGraph == targetGraph) {
          newEdge.isInterGraph = false;
          return sourceGraph.add(newEdge, sourceNode, targetNode);
        } else {
          newEdge.isInterGraph = true;

          // set source and target
          newEdge.source = sourceNode;
          newEdge.target = targetNode;

          // add edge to inter-graph edge list
          if (_classPrivateFieldGet(this, _edges).indexOf(newEdge) > -1) {
            throw "Edge already in inter-graph edge list!";
          }
          _classPrivateFieldGet(this, _edges).push(newEdge);

          // add edge to source and target incidency lists
          if (!(newEdge.source != null && newEdge.target != null)) {
            throw "Edge source and/or target is null!";
          }
          if (!(newEdge.source.edges.indexOf(newEdge) == -1 && newEdge.target.edges.indexOf(newEdge) == -1)) {
            throw "Edge already in source and/or target incidency list!";
          }
          newEdge.source.edges.push(newEdge);
          newEdge.target.edges.push(newEdge);
          return newEdge;
        }
      }

      /**
       * This method removes the input graph from this graph manager. 
       */
    }, {
      key: "removeGraph",
      value: function removeGraph(graph) {
        if (graph.getGraphManager() != this) {
          throw "Graph not in this graph mgr";
        }
        if (!(graph == this.rootGraph || graph.parent != null && graph.parent.graphManager == this)) {
          throw "Invalid parent node!";
        }

        // first the edges (make a copy to do it safely)
        var edgesToBeRemoved = [];
        edgesToBeRemoved = edgesToBeRemoved.concat(graph.edges);
        edgesToBeRemoved.forEach(function (edge) {
          graph.remove(edge);
        });

        // then the nodes (make a copy to do it safely)
        var nodesToBeRemoved = [];
        nodesToBeRemoved = nodesToBeRemoved.concat(graph.nodes);
        nodesToBeRemoved.forEach(function (node) {
          graph.remove(mode);
        });

        // check if graph is the root
        if (graph == _classPrivateFieldGet(this, _rootGraph)) {
          _classPrivateFieldSet(this, _rootGraph, null);
        }

        // now remove the graph itself
        this.graphs.remove(graph);

        // also reset the parent of the graph
        graph.parent = null;
      }

      /**
       * This method removes the input inter-graph edge from this graph manager.
       */
    }, {
      key: "removeInterGraphEdge",
      value: function removeInterGraphEdge(edge) {
        if (edge == null) {
          throw "Edge is null!";
        }
        if (!edge.isInterGraph) {
          throw "Not an inter-graph edge!";
        }
        if (!(edge.source != null && edge.target != null)) {
          throw "Source and/or target is null!";
        }

        // remove edge from source and target nodes' incidency lists      

        if (!(edge.source.edges.indexOf(edge) != -1 && edge.target.edges.indexOf(edge) != -1)) {
          throw "Source and/or target doesn't know this edge!";
        }
        var index = edge.source.edges.indexOf(edge);
        edge.source.edges.splice(index, 1);
        index = edge.target.edges.indexOf(edge);
        edge.target.edges.splice(index, 1);

        // remove edge from owner graph manager's inter-graph edge list

        if (!(edge.source.owner != null && edge.source.owner.getGraphManager() != null)) {
          throw "Edge owner graph or owner graph manager is null!";
        }
        if (edge.source.owner.getGraphManager().edges.indexOf(edge) == -1) {
          throw "Not in owner graph manager's edge list!";
        }
        index = edge.source.owner.getGraphManager().edges.indexOf(edge);
        edge.source.owner.getGraphManager().edges.splice(index, 1);
      }
    }]);
    return GraphManager;
  }();

  var HideShow = /*#__PURE__*/function () {
    function HideShow() {
      _classCallCheck(this, HideShow);
    }
    _createClass(HideShow, null, [{
      key: "hide",
      value: function hide(nodeIDList, edgeIDList, visibleGM, invisibleGM) {}
    }, {
      key: "show",
      value: function show(nodeIDList, edgeIDList, visibleGM, invisibleGM) {}
    }, {
      key: "showAll",
      value: function showAll(visibleGM, invisibleGM) {}
    }]);
    return HideShow;
  }();

  var Topology = /*#__PURE__*/function () {
    function Topology() {
      _classCallCheck(this, Topology);
    }
    _createClass(Topology, null, [{
      key: "addNode",
      value: function addNode(nodeID, parentID, visibleGM, invisibleGM) {}
    }, {
      key: "addEdge",
      value: function addEdge(edgeID, sourceID, targetID, visibleGM, invisibleGM) {}
    }, {
      key: "removeNode",
      value: function removeNode(nodeID, visibleGM, invisibleGM) {}
    }, {
      key: "removeEdge",
      value: function removeEdge(edgeID, visibleGM, invisibleGM) {}
    }, {
      key: "reconnect",
      value: function reconnect(edgeID, newSourceID, newTargetID, visibleGM, invisibleGM) {}
    }, {
      key: "changeParent",
      value: function changeParent(nodeID, newParentID, visibleGM, invisibleGM) {}
    }]);
    return Topology;
  }();

  /**
   * This class is responsible for the communication between CMGM core 
   * and the outside world via API functions. These API functions include
   * both the ones used to synchronize CMGM with the graph model of Rendering
   * Library (RL) when any topological changes occur on the renderer’s side
   * and the ones related to the complexity management operations.
   */
  var _visibleGraphManager = /*#__PURE__*/new WeakMap();
  var _invisibleGraphManager = /*#__PURE__*/new WeakMap();
  var _newGraphManager = /*#__PURE__*/new WeakSet();
  var ComplexityManager = /*#__PURE__*/function () {
    // Graph manager that is responsible from visible compound graph

    // Graph manager that is responsible from invisible compound graph

    /**
     * Constructor
     */
    function ComplexityManager() {
      _classCallCheck(this, ComplexityManager);
      _classPrivateMethodInitSpec(this, _newGraphManager);
      _classPrivateFieldInitSpec(this, _visibleGraphManager, {
        writable: true,
        value: void 0
      });
      _classPrivateFieldInitSpec(this, _invisibleGraphManager, {
        writable: true,
        value: void 0
      });
      _classPrivateFieldSet(this, _visibleGraphManager, _classPrivateMethodGet(this, _newGraphManager, _newGraphManager2).call(this, true));
      _classPrivateFieldSet(this, _invisibleGraphManager, _classPrivateMethodGet(this, _newGraphManager, _newGraphManager2).call(this, false));
    }

    // Get methods
    _createClass(ComplexityManager, [{
      key: "visibleGraphManager",
      get: function get() {
        _classPrivateFieldGet(this, _visibleGraphManager);
      }
    }, {
      key: "invisibleGraphManager",
      get: function get() {
        _classPrivateFieldGet(this, _invisibleGraphManager);
      }

      /*
        * This method creates a new graph manager responsible for either
        * visible or invisible graph based on the input and returns it.
        */
    }, {
      key: "addNode",
      value:
      // Topology related API methods

      function addNode(nodeID, parentID) {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        Topology.addNode(nodeID, parentID, visibleGM, invisibleGM);
      }
    }, {
      key: "addEdge",
      value: function addEdge(edgeID, sourceID, targetID) {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        Topology.addEdge(edgeID, sourceID, targetID, visibleGM, invisibleGM);
      }
    }, {
      key: "removeNode",
      value: function removeNode(nodeID) {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        Topology.removeNode(nodeID, visibleGM, invisibleGM);
      }
    }, {
      key: "removeEdge",
      value: function removeEdge(edgeID) {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        Topology.removeEdge(edgeID, visibleGM, invisibleGM);
      }
    }, {
      key: "reconnect",
      value: function reconnect(edgeID, newSourceID, newTargetID) {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        Topology.reconnect(edgeID, newSourceID, newTargetID, visibleGM, invisibleGM);
      }
    }, {
      key: "changeParent",
      value: function changeParent(nodeID, newParentID) {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        Topology.changeParent(nodeID, newParentID, visibleGM, invisibleGM);
      }

      // Complexity management related API methods

      // filter/unfilter methods
    }, {
      key: "filter",
      value: function filter(nodeIDList, edgeIDList) {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        FilterUnfilter.filter(nodeIDList, edgeIDList, visibleGM, invisibleGM);
      }
    }, {
      key: "unfilter",
      value: function unfilter(nodeIDList, edgeIDList) {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        FilterUnfilter.unfilter(nodeIDList, edgeIDList, visibleGM, invisibleGM);
      }

      // hide/show methods
    }, {
      key: "hide",
      value: function hide(nodeIDList, edgeIDList) {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        HideShow.hide(nodeIDList, edgeIDList, visibleGM, invisibleGM);
      }
    }, {
      key: "show",
      value: function show(nodeIDList, edgeIDList) {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        HideShow.show(nodeIDList, edgeIDList, visibleGM, invisibleGM);
      }
    }, {
      key: "showAll",
      value: function showAll() {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        HideShow.showAll(visibleGM, invisibleGM);
      }

      // expand/collapse methods
    }, {
      key: "collapseNodes",
      value: function collapseNodes(nodeIDList, isRecursive) {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        ExpandCollapse.collpaseNodes(nodeIDList, isRecursive, visibleGM, invisibleGM);
      }
    }, {
      key: "expandNodes",
      value: function expandNodes(nodeIDList, isRecursive) {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        ExpandCollapse.expandNodes(nodeIDList, isRecursive, visibleGM, invisibleGM);
      }
    }, {
      key: "collapseAllNodes",
      value: function collapseAllNodes() {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        ExpandCollapse.collapseAllNodes(visibleGM, invisibleGM);
      }
    }, {
      key: "expandAllNodes",
      value: function expandAllNodes() {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        ExpandCollapse.expandAllNodes(visibleGM, invisibleGM);
      }
    }, {
      key: "collapseEdges",
      value: function collapseEdges(edgeIDList) {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        ExpandCollapse.collapseEdges(edgeIDList, visibleGM, invisibleGM);
      }
    }, {
      key: "expandEdges",
      value: function expandEdges(edgeIDList, isRecursive) {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        ExpandCollapse.expandEdges(edgeIDList, isRecursive, visibleGM, invisibleGM);
      }
    }, {
      key: "collapseEdgesBetweenNodes",
      value: function collapseEdgesBetweenNodes(nodeIDList) {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        ExpandCollapse.collapseEdgesBetweenNodes(nodeIDList, visibleGM, invisibleGM);
      }
    }, {
      key: "expandEdgesBetweenNodes",
      value: function expandEdgesBetweenNodes(nodeIDList, isRecursive) {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        ExpandCollapse.expandEdgesBetweenNodes(nodeIDList, isRecursive, visibleGM, invisibleGM);
      }
    }, {
      key: "collapseAllEdges",
      value: function collapseAllEdges() {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        ExpandCollapse.collapseAllEdges(visibleGM, invisibleGM);
      }
    }, {
      key: "expandAllEdges",
      value: function expandAllEdges() {
        var visibleGM = _classPrivateFieldGet(this, _visibleGraphManager);
        var invisibleGM = _classPrivateFieldGet(this, _invisibleGraphManager);
        ExpandCollapse.expandAllEdges(visibleGM, invisibleGM);
      }
    }]);
    return ComplexityManager;
  }();
  function _newGraphManager2(isVisible) {
    var gm = new GraphManager(this, isVisible);
    return gm;
  }

  exports.ComplexityManager = ComplexityManager;

  Object.defineProperty(exports, '__esModule', { value: true });

}));
