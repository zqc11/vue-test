
/*<JasobNoObfs> LayoutFlow for HTML5
     v1.0.0.1 - June 2014
     Copyright (c) 2012-2014 Lassalle Technologies. All rights reserved.
     http://www.lassalle.com
     Author: Patrick Lassalle mailto:plassalle@lassalle.com 
     If you do not own a commercial license, this file shall be governed by the license 
     agreement that can be found at: http://www.lassalle.com/html5/license_evaluation.pdf
     If you own a commercial license, this file shall be governed by the license 
     agreement that can be found at: http://www.lassalle.com/html5/license_commercial.pdf
     */
  
  //</JasobNoObfs>
  
  /** @author <a href='mailto:plassalle@lassalle.com'>Patrick Lassalle</a> 
      @version v1.0.0.1  
      @namespace 
      @description LayoutFlow namespace, contains methods for graph layout.
      More precisely, it provides a set of 5 graph layout algorithms:
      Hierarchic layout, Orthogonal layout, Force directed layout, Series Parallel layout,
      Tree layout
      Each of these graph layout algorithms performs a layout on a graph. Performing 
      a layout automatically positions the nodes (also called vertices) and links 
      (also called edges).
      Notice that LayoutFlow is an AddFlow extension and you cannot use it without AddFlow.
  */
  
  export var LayoutFlow = {
      //-------------------------------------------------------------------------
      // FORCE DIRECTED
      // The force directed algorithm is the Gem algorithm 
      // * The spring-embedding heuristic models vertices as repulsive charges
      // and edges as contracting springs.
      // * The step width of the vertex movement is proportional to a temperature.
      // This temperature is local: each vertex has a local temperature.
      // * Ocillations and rotations of nodes are detected and corrected.
      // * The algorithm used adds a gravitational influence which tows the 
      // vertices towards the current barycenter thus compacting the graph and
      // accelerating the convergence. Random shakes add some indeterminism 
      // to resolve instable states.
      //-------------------------------------------------------------------------
  
      /** @ForceDirected performs a symmetric layout on a graph, using a force 
      directed algorithm. 
      By default, the algorithm applies on all items (nodes and links). 
      However you may exclude an item by setting its isExcludedFromLayout property to true.
      @param flow The flow control
      @param [vertexDistance] The distance between two vertices
      @param [xmargin] The horizontal margin size
      @param [ymargin] The vertical margin size
      @param [isUnmoveableNodesAccepted] Determines whether the layout takes 
      account of the isXMoveable and isYMoveable properties of the nodes.
      If the isXMoveable property of a node is false and if isUnmoveableNodesAccepted is 
      true, then the layout will move it only vertically. If the isYMoveable 
      property of a node is false and if UnmoveableNodesAccepted is true, then the 
      layout will move it only horizontally. If both the isXMoveable and isYMoveable
      properties are false (and if isUnmoveableNodesAccepted is true), the node will 
      not move neither vertically neither horizontally.
      @param [isRandomStart] Determines whether the nodes are placed randomly 
      at the beginning of the layout. Normally, the algorithm starts by placing the  
      nodes randomly on the control, except if isRandomStart is False.  
      @param [isStepEvent] Determines whether the Step event is fired at each 
      iteration of the layout algorithm. This property could be used for instance 
      to terminate the algorithm.*/
      
      ForceDirected: function (flow, vertexDistance, xmargin, ymargin,
                               isUnmoveableNodesAccepted, isRandomStart, isStepEvent) {
          var constDefaultDistance, constDefaultMarginsize, constMaxIter, constIter,
              constMaxTemp, constStartTemp, constFinalTemp, constOscillation,
              constSkew, constRotation, constGravity, constShake, constStep,
              rcGraph, clusterManager, currentCluster, clusters, clusterIndex,
              _nodes, vertices, arrayRef, size, barycenter, xPrevPartsExtent,
              distsqr, step, oscillation, skew, rotation, gravity, shake, maxTemp,
              startTemp, stopTemp, finalTemp, temperature, iterations;
  
          constDefaultDistance = 50;
          constDefaultMarginsize = 5;
          constMaxIter = 1000;
          constIter = 3;
          constMaxTemp = 1.5;
          constStartTemp = 0.06;
          constFinalTemp = 0.055;
          constOscillation = 0.4;
          constSkew = 0.9;
          constRotation = 1.0;
          constGravity = 0.01;
          constShake = 0.005;
          constStep = 1.0;
  
          if (flow === null || flow === undefined) {
              return;
          }
          
          if (vertexDistance === undefined || vertexDistance <= 0) {
              vertexDistance = constDefaultDistance;
          } 
  
          if (xmargin === undefined || xmargin <= 0) {
              xmargin = constDefaultMarginsize;
         } 
 
         if (ymargin === undefined || ymargin <= 0) {
             ymargin = constDefaultMarginsize;
         } 
 
         if (isUnmoveableNodesAccepted === undefined || isUnmoveableNodesAccepted === null) {
             isUnmoveableNodesAccepted = false;
         } 
 
         if (isRandomStart === undefined || isRandomStart === null) {
             isRandomStart = true;
         }
 
         if (isStepEvent === undefined || isStepEvent === null) {
             isStepEvent = false;
         }
         
         distsqr = vertexDistance * vertexDistance;
         temperature = 0.0;
         barycenter = { x: 0, y: 0 };
         step = constStep;
         oscillation = constOscillation;
         skew = constSkew;
         rotation = constRotation;
         gravity = constGravity;
         shake = constShake;
         maxTemp = constMaxTemp * vertexDistance;
         startTemp = constStartTemp * vertexDistance;
         finalTemp = constFinalTemp;
         
         vertices = [];
         rcGraph = { x: 0, y: 0, w: 0, h: 0 };
 
         // Get the array of nodes involved in the layout
         getNodes();
 
         flowToGraph();
 
         // First we separate each connected part (cluster) of the graph.
         clusterManager = new ClusterManager();
 
         if (isRandomStart) {
             randomizeGraph();
         }
 
         // Then we execute the layout algorithm for each cluster 
         // (horizontally from left to right)
         xPrevPartsExtent = 0;
         for (clusterIndex = 0; clusterIndex < clusters.length; clusterIndex++) {
             currentCluster = clusters[clusterIndex];
             size = currentCluster.length;
             layoutInit();
             layoutRun();
             layoutEnd();
             xPrevPartsExtent += xmargin + rcGraph.w;
         }
 
         graphToFlow();
         
         function flowToGraph() {
             var i, j, v, u, _node, _link, _links, dual;
 
             for (i = 0; i < _nodes.length; i++) {
                 addVertex(_nodes[i]);
             }
 
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 _node = v._node;
                 _links = _node.getLinks();
                 for (j = 0; j < _links.length; j++) {
                     _link = _links[j];
                     dual = _link.org === _node ? _link.dst : _link.org;
                     if (!_link.isExcludedFromLayout && _link.org !== _link.dst && !dual.isExcludedFromLayout) {
                         u = dual.tag;
                         v.neighbours.push(u);
                     }
                 }
             }
         }
 
         function graphToFlow() {
             var i, j, k, v, _link, _links, pt, xOffset, yOffset;
 
             flow.beginUpdate();
 
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 // Store the old node position
                 v._node.oldPosition = { x: v._node.getLeft(), y: v._node.getTop() };
                 // Set the node position
                 v._node.setLeft(v.x - v.w / 2);
                 v._node.setTop(v.y - v.h / 2);
 
                 // We set a flag property to each link involved in the layout
                 _links = v._node.getLinks();
                 for (j = 0; j < _links.length; j++) {
                     _link = _links[j];
                     if (_link.isExcludedFromLayout) {
                         continue;
                     }
                     _link.flag = true;
 
                     // We set both following properties to false (side effect)
                     _link.setIsOrgPointAdjustable(false);
                     _link.setIsDstPointAdjustable(false);
                 }
             }
 
             // Adjust links taking account of the new node positions
             // Side effect: all links involved in the layout have polyline 
             // style and have only 2 points
             // Reflexive links are just translated.
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 _links = v._node.getLinks();
 
                 for (j = 0; j < _links.length; j++) {
                     _link = _links[j];
 
                     // Exclude links not involved in the layout
                     if (_link.isExcludedFromLayout) {
                         continue;
                     }
 
                     // We must avoid doing the same work 2 times as a link 
                     // part of links collection of 2 nodes
                     if (_link.flag) {
                         _link.flag = false;
                     } else {
                         continue;
                     }
 
                     if (_link.org !== _link.dst) {
                         // Normal case: the link is not reflexive
                         _link.setLineStyle('polyline');
                         if (_link.points.length > 2) {
                             _link.clearPoints();
                         }
                         if (_link.pinOrg !== undefined && _link.pinOrg !== null) {
                             xOffset = _link.org.getLeft() - _link.org.oldPosition.x;
                             yOffset = _link.org.getTop() - _link.org.oldPosition.y;
                             pt = _link.points[0];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, 0);
                         }
                         if (_link.pinDst !== undefined && _link.pinDst !== null) {
                             xOffset = _link.dst.getLeft() - _link.dst.oldPosition.x;
                             yOffset = _link.dst.getTop() - _link.dst.oldPosition.y;
                             pt = _link.points[1];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, 1);
                         }
                     } else {
                         // The link is reflexive
                         // Reflexive links are not taken into account by layout algorithms. 
                         // Reflexive links are just translated to follow their origin 
                         // (and also destination) node.
 
                         // Obtain the node horizontal and vertical offset
                         // Remember: we have stored the old node position
                         xOffset = v._node.getLeft() - v._node.oldPosition.x;
                         yOffset = v._node.getTop() - v._node.oldPosition.y;
 
                         if (_link.pinOrg !== undefined && _link.pinOrg !== null) {
                             k = 0;
                             pt = _link.points[k];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, k);
                         }
                         for (k = 1; k < _link.points.length - 1; k++) {
                             pt = _link.points[k];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, k);
                         }
                         if (_link.pinDst !== undefined && _link.pinDst !== null) {
                             k = _link.points.length - 1;
                             pt = _link.points[k];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, k);
                         }
                     }
                 }
             }
 
             flow.endUpdate();
         }
 
         function addVertex(_node) {
             var v;
 
             v = new _Vertex(_node);
             _node.tag = v;
             vertices.push(v);
         }
 
         function getNodes() {
             var i, _node, items;
 
             items = flow.getItems();
             _nodes = [];
             for (i in items) {
                 if (flow.isNode(items[i])) {
                     _node = items[i];
                     if (!_node.isExcludedFromLayout) {
                         _nodes.push(items[i]);
                     }
                 }
             }
         }
         
         function randomizeGraph() {
             var i, v, scale;
 
             scale = vertexDistance * Math.sqrt(vertices.length);
 
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 if (!isUnmoveableNodesAccepted || v._node.isXMoveable) {
                     v.x = rand() % (scale + 1) + scale / 2;
                 }
                 if (!isUnmoveableNodesAccepted || v._node.isYMoveable) {
                     v.y = rand() % (scale + 1) + scale / 2;
                 }
             }
         }
 
         function layoutInit() {
             var i, k, v;
 
             stopTemp = finalTemp * finalTemp * distsqr * size;
             iterations = Math.min(constIter * size * size, constMaxIter);
 
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 v.degree = v.neighbours.length;
                 v.mass = 1.0 + v.degree / 3.0;
                 v.heat = startTemp;
                 temperature += v.heat * v.heat;
                 barycenter.x += v.x;
                 barycenter.y += v.y;
             }
 
             arrayRef = new Array(size);
             for (k = 0; k < size; k++) {
                 arrayRef[k] = k;
             }
         }
 
         function layoutEnd() {
             getGraphRect();
             translateAllVertices();
         }
 
         function layoutRun() {
             var iteration;
 
             for (iteration = 0; iteration < iterations; iteration++) {
                 if (temperature < stopTemp) {
                     break;
                 }
 
                 round();
 
                 if (isStepEvent) {
                     // Fire the "step" event 
                     if (fireStepEvent(iteration)) {
                         break;
                     }
                 }
             }
         }
 
         function round() {
             var i, v, impulse;
 
             for (i = 0; i < size; i++) {
                 v = selectVertex(i);
                 impulse = impulseVertex(v);
                 moveVertex(v, impulse);
             }
         }
 
         // Adjust the temp according to the old temp and the old impulse.
         // Between -45 and 45 degree, there is acceleration. 
         // Between 135 and 225 degree, there is oscillation.
         // In the other ranges of the angle, there is rotation.
         function moveVertex(v, impulse) {
             var t, sinus, cosinus, d;
 
             t = v.heat;
             if (t !== 0.0) {
                 temperature -= t * t;
                 cosinus = impulse.x * v.impulse.x + impulse.y * v.impulse.y;
                 sinus = impulse.x * v.impulse.y - impulse.y * v.impulse.x;
                 if (Math.abs(cosinus) > 0.5) {
                     t += oscillation * cosinus;
                     t = Math.min(t, maxTemp);
                 } else {
                     v.dir += skew * sinus / t;
                     t -= t * rotation * Math.abs(v.dir) / size;
                     t = Math.max(t, 2);
                 }
                 v.heat = t;
                 temperature += t * t;
             }
 
             // In each step, the node moves in the direction of the impulse.
             // The step move is proportional to the local temperature.
             d = { x: impulse.x * step * t, y: impulse.y * step * t };
             if (!isUnmoveableNodesAccepted || v._node.isXMoveable) {
                 v.x += d.x;
                 barycenter.x += d.x;
             }
             if (!isUnmoveableNodesAccepted || v._node.isYMoveable) {
                 v.y += d.y;
                 barycenter.y += d.y;
             }
             v.impulse = impulse;
         }
 
         // impulse of the node by the sum of all force vectors. 
         function impulseVertex(vertex) {
             var impulse, d, e, n, i, v, norm;
 
             impulse = { x: 0, y: 0 };
             d = { x: 0, y: 0 };
 
             // Random force
             n = Math.floor(shake * vertexDistance);
             impulse.x = rand() % (2 * n + 1) - n;
             impulse.y = rand() % (2 * n + 1) - n;
 
             // Gravitational force
             impulse.x += (barycenter.x / size - vertex.x) * vertex.mass * gravity;
             impulse.y += (barycenter.y / size - vertex.y) * vertex.mass * gravity;
 
             // Repulsive forces: iterate through all other nodes
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 if (vertex !== v) {
                     d.x = vertex.x - v.x;
                     d.y = vertex.y - v.y;
                     e = d.x * d.x + d.y * d.y;
                     if (e !== 0.0) {
                         impulse.x += d.x * distsqr / e;
                         impulse.y += d.y * distsqr / e;
                     }
                 }
             }
 
             // Attractive forces: iterate through all linked nodes to calculate 
             for (i = 0; i < vertex.neighbours.length; i++) {
                 v = vertex.neighbours[i];
                 d.x = vertex.x - v.x;
                 d.y = vertex.y - v.y;
                 e = (d.x * d.x + d.y * d.y) / vertex.mass;
                 impulse.x -= d.x * e / distsqr;
                 impulse.y -= d.y * e / distsqr;
             }
 
             norm = Math.sqrt(impulse.x * impulse.x + impulse.y * impulse.y);
             if (norm !== 0) {
                 impulse.x /= norm;
                 impulse.y /= norm;
             }
             return impulse;
         }
 
         function selectVertex(iter) {
             var n, k, i;
 
             n = size - iter;
             k = rand() % n;
             i = arrayRef[k];
             arrayRef[k] = arrayRef[n - 1];
             arrayRef[n - 1] = i;
             return currentCluster[i];
         }
 
         function getGraphRect() {
             var i, v, rc;
 
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 rc = {
                     x: v.x - v.w / 2,
                     y: v.y - v.h / 2,
                     w: v.w,
                     h: v.h
                 };
                 if (i === 0) {
                     rcGraph = rc;
                 } else {
                     rcGraph = unionRect(rcGraph, rc);
                 }
             }
         }
 
         function unionRect(rect1, rect2) {
             var left, top, right, bottom;
 
             // We compute right and bottom before we change left and top below.
             right = Math.max(rect1.x + rect1.w, rect2.x + rect2.w);
             bottom = Math.max(rect1.y + rect1.h, rect2.y + rect2.h);
 
             left = Math.min(rect1.x, rect2.x);
             top = Math.min(rect1.y, rect2.y);
 
             return { x: left, y: top, w: right - left, h: bottom - top };
         }
 
         function translateAllVertices() {
             var i, v;
 
             // We make a translation so that coordinates are allways positive
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 v.x += -rcGraph.x + v.w / 2 + xmargin + xPrevPartsExtent;
                 v.y += -rcGraph.y + v.h / 2 + ymargin;
             }
         }
 
         function rand() {
             return Math.floor(Math.random() * 2147483647);
         }
 
         function ClusterManager() {
             var visitedCount, clusterCount;
 
             this.separateConnectedParts = function () {
                 var vertex, v, i;
 
                 visitedCount = 0;
                 clusterCount = 0;
                 while (visitedCount < vertices.length) {
                     // Find the first available vertex
                     vertex = null;
                     for (i = 0; i < vertices.length; i++) {
                         v = vertices[i];
                         if (v.owningClusterIndex === 0) {
                             clusterCount++;
                             vertex = v;
                             break;
                         }
                     }
 
                     // Depth first search
                     if (vertex !== null) {
                         visitVertex(vertex);
                     }
                 }
 
                 fillClusters();
             }();
 
             // We execute a "depth-first search" algorithm and we start with the vertex
             // passed in parameter.
             function visitVertex(vertex) {
                 var v, i;
 
                 vertex.owningClusterIndex = clusterCount;
                 visitedCount++;
                 for (i = 0; i < vertex.neighbours.length; i++) {
                     v = vertex.neighbours[i];
                     if (v.owningClusterIndex === 0) {
                         visitVertex(v);
                     }
                 }
             }
 
             function fillClusters() {
                 var i, k, v;
 
                 // Allocate an array of cluster, each cluster being a list of vertices
                 clusters = new Array(clusterCount);
                 for (k = 0; k < clusterCount; k++) {
                     clusters[k] = [];
                 }
 
                 // Fill clusters
                 for (i = 0; i < vertices.length; i++) {
                     v = vertices[i];
                     clusters[v.owningClusterIndex - 1].push(v);
                 }
             }
         }
 
         // Returns a Vertex object.
         function _Vertex(_node) {
             this._node = _node;              // Corresponding node
             this.x = _node.getLeft();
             this.y = _node.getTop();
             this.w = _node.getWidth();
             this.h = _node.getHeight();
             this.impulse = { x: 0, y: 0 };
             this.heat = 0;
             this.dir = 0;
             this.mass = 0;
             this.degree = 0;
             this.owningClusterIndex = 0;
             this.neighbours = [];
         }
 
         // Fire the "step" event 
         function fireStepEvent(iteration) {
             var event;
 
             event = document.createEvent("Event");
             event.initEvent("step", true, true);
             event.iteration = iteration,
             document.dispatchEvent(event);
         }
     },
 
 
     //---------------------------------------------------------------------
     // TREE
     //---------------------------------------------------------------------
     
     /** @Tree performs a tree layout on a graph. The tree drawing may be layered or 
     radial. 
     By default, the algorithm applies on all items (nodes and links). 
     However you may exclude an item by setting its isExcludedFromLayout property to true.
     @param flow The flow control
     @param [layerDistance] The distance between two adjacent layers
     @param [vertexDistance] The distance between two adjacent vertices
     @param [drawingStyle] The tree drawing style (layered or radial)
     @param [orientation] The graph layout orientation (north, east, south, west)
     @param [xmargin] The horizontal margin size
     @param [ymargin] The vertical margin size */
     Tree: function (flow, layerDistance, vertexDistance, drawingStyle, orientation,
                     xmargin, ymargin) {
         var constDefaultVertexDistance, constDefaultLayerDistance,
             constDefaultMarginsize, constDefaultDrawingStyle, constDefaultOrientation,
             _nodes, vertices, root, xDelta,
             clusterManager, currentCluster, clusters, clusterIndex, xPrevPartsExtent;
 
         constDefaultVertexDistance = 50;
         constDefaultLayerDistance = 50;
         constDefaultMarginsize = 5;
         var constDrawingStyle = 'layered';
         var constOrientation = 'north';
 
         if (flow === null || flow === undefined) {
             return;
         }
 
         if (vertexDistance === undefined || vertexDistance <= 0) {
             vertexDistance = constDefaultVertexDistance;
         } 
 
         if (layerDistance === undefined || layerDistance <= 0) {
             layerDistance = constDefaultLayerDistance;
         } 
 
         if (orientation === undefined || orientation === null) {
             orientation = constDefaultOrientation;
         }
 
         if (drawingStyle === undefined || drawingStyle === null) {
             drawingStyle = constDefaultDrawingStyle;
         }
 
         if (xmargin === undefined || xmargin <= 0) {
             xmargin = constDefaultMarginsize;
         }
 
         if (ymargin === undefined || ymargin <= 0) {
             ymargin = constDefaultMarginsize;
         }
 
         vertices = [];
         var rcGraph = { x: 0, y: 0, w: 0, h: 0 };
         xDelta = constDefaultVertexDistance / 2;
 
         // Get the array of nodes involved in the layout
         getNodes();
 
         flowToGraph();
 
         if (!isTree()) {
             alert('Each connected part of the graph must be a rooted tree!');
             return;
         }
 
         // First we separate each connected part (cluster) of the graph.
         clusterManager = new ClusterManager();
 
         // Then we execute the layout algorithm for each cluster 
         // (horizontally from left to right)
         xPrevPartsExtent = 0;
         for (clusterIndex = 0; clusterIndex < clusters.length; clusterIndex++) {
             currentCluster = clusters[clusterIndex];
             root = findRoot();
             switch (drawingStyle) {
                 case 'layered':
                     treeLayout();
                     break;
                 case 'radial':
                     radialLayout();
                     break;
             }
         }
 
         graphToFlow();
 
         function getNodes() {
             var i, _node, items;
 
             items = flow.getItems();
             _nodes = [];
             for (i in items) {
                 if (flow.isNode(items[i])) {
                     _node = items[i];
                     if (!_node.isExcludedFromLayout) {
                         _nodes.push(items[i]);
                     }
                 }
             }
         }
         
         function flowToGraph() {
             var i, j, v, u, e, _node, _link, _links, dual, rc;
 
             for (i = 0; i < _nodes.length; i++) {
                 _node = _nodes[i];
                 v = new _Vertex(_node);
 
                 // This field is used for reflexive links
                 v.ptOld = { x: _node.x, y: _node.y };
 
                 rc = {
                     x: _node.getLeft() - _node.getWidth() / 2,
                     y: _node.getTop() - _node.getHeight() / 2,
                     w: _node.getWidth(),
                     h: _node.getHeight()
                 };
 
                 v.x = rc.x + rc.w / 2;
                 v.y = rc.y + rc.h / 2;
 
                 if (orientation === 'north' || orientation === 'south') {
                     v.w = rc.w;
                     v.h = rc.h;
                 } else {
                     v.w = rc.h;
                     v.h = rc.w;
                 }
 
                 _node.tag = v;
                 vertices.push(v);
             }
             
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 _links = v._node.getLinks();
                 for (j = 0; j < _links.length; j++) {
                     _link = _links[j];
                     if (!_link.isExcludedFromLayout) {
                         if (_link.org === v._node) { // Retain only out nodes
                             if (_link.org !== _link.dst) { // Exclude reflexive links
                                 if (!_link.dst.isExcludedFromLayout) {
                                     u = _link.dst.tag;
                                     e = new _Edge(v, u, _link);
                                     v.outEdges.push(e);
                                     u.inEdges.push(e);
                                 }
                             }
                         }
                     }
                 }
             }
         }
 
         function graphToFlow() {
             var rcGraph, t, pt, i, j, k, v, _links, _link, x, y, xOffset, yOffset;
 
             flow.beginUpdate();
 
             rcGraph = getGraphRect();
 
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 x = v.x;
                 y = v.y;
 
                 // Store the old node position
                 v._node.oldPosition = { x: v._node.getLeft(), y: v._node.getTop() };
 
                 // Translation so that coordinates are allways positive
                 x -= rcGraph.x;
                 y -= rcGraph.y;
 
                 // Take account of orientation
                 if (drawingStyle === 'layered') {
                     switch (orientation) {
                         case 'north':
                             break;
                         case 'west':
                             t = x;
                             x = y;
                             y = rcGraph.w - t;
                             t = v.w;
                             v.w = v.h;
                             v.h = t;
                             break;
                         case 'south':
                             x = rcGraph.w - x;
                             y = rcGraph.h - y;
                             break;
                         case 'east':
                             t = x;
                             x = rcGraph.h - y;
                             y = t;
                             t = v.w;
                             v.w = v.h;
                             v.h = t;
                             break;
                     }
                 }
 
                 // Take account of the size of the node
                 x -= v.w / 2;
                 y -= v.h / 2;
 
                 // Add margins 
                 x += xmargin;
                 y += ymargin;
 
                 v._node.setLeft(x);
                 v._node.setTop(y);
 
                 // We set a flag property to each link involved in the layout
                 _links = v._node.getLinks();
                 for (j = 0; j < _links.length; j++) {
                     _link = _links[j];
                     if (_link.isExcludedFromLayout) {
                         continue;
                     }
                     _link.flag = true;
 
                     // We set both following properties to false (side effect)
                     _link.setIsOrgPointAdjustable(false);
                     _link.setIsDstPointAdjustable(false);
                 }
             }
 
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 _links = v._node.getLinks();
 
                 for (j = 0; j < _links.length; j++) {
                     _link = _links[j];
 
                     // Exclude links not involved in the layout
                     if (_link.isExcludedFromLayout) {
                         continue;
                     }
 
                     // We must avoid doing the same work 2 times as a link 
                     // part of links collection of 2 nodes
                     if (_link.flag) {
                         _link.flag = false;
                     } else {
                         continue;
                     }
 
                     if (_link.org !== _link.dst) {
                         // Normal case: the link is not reflexive
                         _link.setLineStyle('polyline');
                         if (_link.points.length > 2) {
                             _link.clearPoints();
                         }
                         if (_link.pinOrg !== undefined && _link.pinOrg !== null) {
                             xOffset = _link.org.getLeft() - _link.org.oldPosition.x;
                             yOffset = _link.org.getTop() - _link.org.oldPosition.y;
                             pt = _link.points[0];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, 0);
                         }
                         if (_link.pinDst !== undefined && _link.pinDst !== null) {
                             xOffset = _link.dst.getLeft() - _link.dst.oldPosition.x;
                             yOffset = _link.dst.getTop() - _link.dst.oldPosition.y;
                             pt = _link.points[1];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, 1);
                         }
                     } else {
                         // The link is reflexive
                         // Reflexive links are not taken into account by layout algorithms. 
                         // Reflexive links are just translated to follow their origin 
                         // (and also destination) node.
 
                         // Obtain the node horizontal and vertical offset
                         // Remember: we have stored the old node position
                         xOffset = v._node.getLeft() - v._node.oldPosition.x;
                         yOffset = v._node.getTop() - v._node.oldPosition.y;
 
                         if (_link.pinOrg !== undefined && _link.pinOrg !== null) {
                             k = 0;
                             pt = _link.points[k];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, k);
                         }
                         for (k = 1; k < _link.points.length - 1; k++) {
                             pt = _link.points[k];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, k);
                         }
                         if (_link.pinDst !== undefined && _link.pinDst !== null) {
                             k = _link.points.length - 1;
                             pt = _link.points[k];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, k);
                         }
                     }
                 }
             }
 
             flow.endUpdate();
         }
 
         function getGraphRect() {
             var i, v, rc, rcGraph;
 
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 rc = { x: v.x - v.w / 2, y: v.y - v.h / 2, w: v.w,  h: v.h };
                 if (i === 0) {
                     rcGraph = rc;
                 } else {
                     rcGraph = unionRect(rcGraph, rc);
                 }
             }
             return rcGraph;
         }
 
         function unionRect(rect1, rect2) {
             var left, top, right, bottom;
 
             // We compute right and bottom before we change left and top below.
             right = Math.max(rect1.x + rect1.w, rect2.x + rect2.w);
             bottom = Math.max(rect1.y + rect1.h, rect2.y + rect2.h);
 
             left = Math.min(rect1.x, rect2.x);
             top = Math.min(rect1.y, rect2.y);
 
             return { x: left, y: top, w: right - left, h: bottom - top };
         }
 
         function findRoot() { 
             var v;
             
             v = currentCluster[0];
             while (v.getParent() !== null) {
                 v = v.getParent();
             }
             return v;
         }
 
         function treeLayout() {  
             var modsum, subtreeDist, layers;
 
             if (root === null)
                 return;
 
             modsum = 0;
             subtreeDist = (5 * vertexDistance) / 4;
             layers = [];
 
             // Create the tree structure
             treeInsertVertex(root, null, null);
             treeInsertChildVertices(root);
 
             // Determine the positions of the tree vertices
             treeCalcPosition(root);
 
             // Calculate the rectangle containing all vertices
             treeGetRect(root);
 
             // Draw the tree
             treeAssignPosition();
 
 
             function treeInsertVertex(v, vParent, _left) {
                 v._left = _left;
                 if (vParent !== null && _left === null) {
                     vParent.leftmost = v;
                 }
                 if (_left !== null) {
                     _left._right = v;
                 }
             }
 
             function treeInsertChildVertices(vParent) {
                 var _left, j, e, v;
 
                 _left = null;
                 for (j = 0; j < vParent.outEdges.length; j++) {
                     e = vParent.outEdges[j];
                     v = e.dst;
                     treeInsertVertex(v, vParent, _left);
                     treeInsertChildVertices(v);
                     _left = v;
                 }
             }
 
             function treeCalcPosition(vertex) {
                 treeFirstPass(vertex, 0);
                 treeSecondPass(vertex, 0);
             }
 
             // First post-order walk
             // Each vertex is assigned a preliminary x coordinate and a x modifier
             function treeFirstPass(vertex, layer) {
                 var leftMost, rightMost, // Left and right most children of the vertex
                     xMidPoint,           // Middle between left and right most children
                     xMeanWidth;
 
                 // Get the previous vertex at this level
                 vertex.prev = treeGetPrevVertexAtLayer(layer);
 
                 // Place this vertex at this level
                 treeSetPrevVertexAtLayer(layer, vertex);
 
                 vertex.modifier = 0;
 
                 if (vertex.isLeaf()) {
                     if (vertex.hasLeft()) {
                         xMeanWidth = treeGetMeanVertexSize(vertex._left, vertex);
                         vertex.prelim = vertex._left.prelim + vertexDistance + xMeanWidth;
                     } else {
                         vertex.prelim = 0;
                     }
                 } else {
                     rightMost = vertex.getFirstChild();
                     leftMost = rightMost;
                     treeFirstPass(leftMost, layer + 1);
 
                     while (rightMost !== null && rightMost.hasRight()) {
                         rightMost = rightMost._right;
                         treeFirstPass(rightMost, layer + 1);
                     }
                     xMidPoint = (leftMost.prelim + rightMost.prelim) / 2;
                     xMeanWidth = treeGetMeanVertexSize(vertex._left, vertex);
                     if (vertex !== null && vertex.hasLeft()) {
                         vertex.prelim = vertex._left.prelim + vertexDistance + xMeanWidth;
                         vertex.modifier = vertex.prelim - xMidPoint;
                         treeCombineSubTrees(vertex);
                     } else {
                         vertex.prelim = xMidPoint;
                     }
                 }
             }
 
             // Called for each vertex during the first pass
             function treeGetPrevVertexAtLayer(layer) {
                 var k, l;
 
                 for (k = 0; k < layers.length; k++) {
                     if (k === layer) {
                         l = layers[k];
                         return l.prior;
                     }
                 }
                 return null;
             }
 
             // Called for each vertex during the first pass
             function treeSetPrevVertexAtLayer(layer, v) {
                 var cy, l, l2, k;
 
                 cy = v.h;
                 if (layers.length === 0) {
                     // Add the first element to the list of levels
                     l = new TreeLayer();
                     l.prior = v;
                     l.cyMax = cy;
                     layers.push(l);
                 } else {
                     for (k = 0; k < layers.length; k++) {
                         l = layers[k];
                         if (k === layer) {
                             // Layer found: assign the vertex
                             l.prior = v;
                             if (l.cyMax < cy) {
                                 l.cyMax = cy;
                             }
                             break;
                         } else {
                             // Not still found
                             if (k + 1 === layers.length) {
                                 // If we are at the end of the list, add a new element to it.                            
                                 l2 = new TreeLayer();
                                 l2.prior = null;
                                 l2.cyMax = cy;
                                 layers.push(l2);
                             }
                         }
                     }
                 }
             }
 
             function treeGetMeanVertexSize(_left, _right) {
                 var meanWidth = 0;
 
                 if (_left !== null) {
                     meanWidth += _left.w / 2;
                 }
                 if (_right !== null) {
                     meanWidth += _right.w / 2;
                 }
                 return meanWidth;
             }
 
             function treeCombineSubTrees(vertex) {
                 var leftMost, neighbour, compareDepth, rightModsum, distance, v, lefts,
                     leftModsum, ancestorLeftMost, ancestorNeighbor, i, xMeanWidth, portion;
 
                 leftMost = vertex.getFirstChild();
                 neighbour = leftMost.getLeftNeighbor();
                 compareDepth = 1; // Depth of comparison within this proc
 
                 while (leftMost !== null && neighbour !== null) {
                     rightModsum = 0;
                     leftModsum = 0;
                     ancestorLeftMost = leftMost; // Ancestor of leftMost
                     ancestorNeighbor = neighbour; // Ancestor of neighbour
                     for (i = 0; i < compareDepth; i++) {
                         ancestorLeftMost = ancestorLeftMost.getParent();
                         ancestorNeighbor = ancestorNeighbor.getParent();
                         rightModsum += ancestorLeftMost.modifier;
                         leftModsum += ancestorNeighbor.modifier;
                     }
                     xMeanWidth = treeGetMeanVertexSize(leftMost, neighbour);
                     distance = neighbour.prelim + leftModsum + subtreeDist +
                                      xMeanWidth - (leftMost.prelim + rightModsum);
 
                     if (distance > 0) {
                         lefts = 0;
                         for (v = vertex; v !== null && v !== ancestorNeighbor; v = v._left) {
                             lefts++;
                         }
                         if (v !== null) {
                             portion = distance / lefts;
                             for (v = vertex; v !== ancestorNeighbor; v = v._left) {
                                 v.prelim += distance;
                                 v.modifier += distance;
                                 distance -= portion;
                             }
                         } else {
                             return;
                         }
                     }
                     compareDepth++;
                     if (leftMost !== null && leftMost.isLeaf()) {
                         leftMost = treeGetLeftMost(vertex, 0, compareDepth);
                     } else {
                         leftMost = leftMost.getFirstChild();
                     }
                     neighbour = (leftMost !== null) ? leftMost.getLeftNeighbor() : null;
                 }
             }
 
             function treeGetYAtLayer(layer) {
                 var cySum, k, l;
 
                 cySum = 0;
                 for (k = 0; k < layers.length; k++) {
                     l = layers[k];
                     if (k === layer) {
                         cySum += l.cyMax / 2;
                         break;
                     } else {
                         cySum += l.cyMax;
                     }
                 }
                 return cySum;
             }
 
             // Find the leftmost descendant of a node at a given depth.
             function treeGetLeftMost(vertex, layer, depth) {
                 var leftMost, rightMost;
 
                 if (layer === depth) {
                     leftMost = vertex;
                 } else if (vertex !== null && vertex.isLeaf()) {  // No descendants
                     leftMost = null;
                 } else {
                     rightMost = vertex.getFirstChild();
                     leftMost = treeGetLeftMost(rightMost, layer + 1, depth);
                     while (leftMost === null && rightMost !== null && rightMost.hasRight()) {
                         rightMost = rightMost._right;
                         leftMost = treeGetLeftMost(rightMost, layer + 1, depth);
                     }
                 }
                 return leftMost;
             }
 
             // Determines the final x coordinate for each vertex.
             // It starts at the root of the substree.
             // It sums each node's x coordinate value with the combined sum 
             // of the modifier field of its ancestors.
             function treeSecondPass(vertex, layer) {
                 var xNewModsum;
 
                 vertex.x = vertex.prelim + modsum;
                 vertex.y = layer * layerDistance + treeGetYAtLayer(layer);
 
                 xNewModsum = modsum;
 
                 // Apply the modifier value to all its first childs.
                 if (vertex !== null && vertex.hasChild()) {
                     xNewModsum += vertex.modifier;
                     modsum = xNewModsum;
                     treeSecondPass(vertex.getFirstChild(), layer + 1);
                     xNewModsum -= vertex.modifier;
                 }
 
                 if (vertex !== null && vertex.hasRight()) {
                     modsum = xNewModsum;
                     treeSecondPass(vertex._right, layer);
                 }
             }
 
             function treeGetRect(vertex) {
                 rcGraph = {
                     x: vertex.x - vertex.w / 2, y: vertex.y - vertex.h / 2,
                     w: vertex.w, h: vertex.h
                 };
                 treeBuildRect(vertex);
             }
 
             function treeBuildRect(vertex) {
                 var v, rc;
 
                 for (v = vertex.getFirstChild() ; v !== null; v = v._right) {
                     rc = { x: v.x - v.w / 2, y: v.y - v.h / 2, w: v.w, h: v.h };
                     rcGraph = unionRect(rcGraph, rc);
                     treeBuildRect(v);
                 }
             }
 
             function treeAssignPosition() {
                 var v, i;
 
                 // Assign new position
                 for (i = 0; i < currentCluster.length; i++) {
                     v = currentCluster[i];
                     // Add cluster offsets and translate to left-top corner of the area
                     v.x += xPrevPartsExtent - rcGraph.x;
                     v.y += - rcGraph.y;
                 }
 
                 xPrevPartsExtent += xDelta + rcGraph.w;
             }
         }
 
         function radialLayout() {
             var previousParent, previousDepth, depthStartAngle;
 
             previousParent = null;
             previousDepth = 0;
             depthStartAngle = 0; 
 
             if (root === null)
                 return;
 
             // Number of leaves
             radialCalcNumberOfLeaves(root);
 
             // Determine the positions of the tree vertices			
             root.depth = 0;
             root.annulusWedge = 2 * Math.PI;
             root.angle = 0;
             root.x = 0;
             root.y = 0;
             previousParent = root;
             radialPlaceChilds(root);
 
             // Draw the tree
             radialAssignPositions();
 
             function radialCalcNumberOfLeaves(vertex) {
                 var j, e, v, leaves;
                     
                 leaves = 0;
 
                 for (j = 0; j < vertex.outEdges.length; j++) {
                     e = vertex.outEdges[j];
                     v = e.dst;
                     if (v.outEdges.length === 0) {
                         leaves++;
                         v.leaves = 1;
                     } else {
                         leaves += radialCalcNumberOfLeaves(v);
                     }
                 }
                 vertex.leaves = leaves;
                 return leaves;
             }
 
             // See the book "Graph Drawing" page 52
             function radialPlaceChilds(vParent) {
                 var j, e, v, angleW, angleF;
 
                 // We visit the tree with a "Breadth First Search"
                 for (j = 0; j < vParent.outEdges.length; j++) {
                     e = vParent.outEdges[j];
                     v = e.dst;
                     v.depth = vParent.depth + layerDistance;
                     angleW = (v.leaves / vParent.leaves) * vParent.annulusWedge;
                     angleF = (2 * Math.acos(vParent.depth / v.depth));
                     v.annulusWedge = Math.min(angleW, angleF);
                     if (previousDepth !== v.depth || previousParent !== vParent) {
                         depthStartAngle = vParent.angle - vParent.annulusWedge / 2;
                     }
                     v.angle = depthStartAngle + v.annulusWedge / 2;
                     v.x = root.x - Math.cos(v.angle) * v.depth;
                     v.y = root.y + Math.sin(v.angle) * v.depth;
                     depthStartAngle += v.annulusWedge;
                     previousDepth = v.depth;
                     previousParent = vParent;
                 }
                 for (j = 0; j < vParent.outEdges.length; j++) {
                     e = vParent.outEdges[j];
                     v = e.dst;
                     radialPlaceChilds(v);
                 }
             }
 
             function radialAssignPositions() {
                 var i, v, rc;
 
                 // Calculate the rectangle containing all vertices
                 rcGraph = { x: 0, y: 0, w: 0, h: 0 };
                 for (i = 0; i < currentCluster.length; i++) {
                     v = currentCluster[i];
                     rc = { x: v.x - v.w / 2, y: v.y - v.h / 2, w: v.w, h: v.h };
                     rcGraph = unionRect(rcGraph, rc);
                 }
 
                 for (i = 0; i < currentCluster.length; i++) {
                     v = currentCluster[i];
                     // Add cluster offsets and translate to left-top corner of the area
                     v.x += xPrevPartsExtent - rcGraph.x;
                     v.y += -rcGraph.y;
                 }
 
                 xPrevPartsExtent += xDelta + rcGraph.w;
             }
         }
         
         function isTree() {
             var postOrderNumber;
 
             function isCycleDirected() {
                 var result, i, j, v, e;
 
                 result = false;
 
                 // Assign postorder numbers
                 postOrderNumber = 0;
                 for (i = 0; i < vertices.length; i++) {
                     v = vertices[i];
                     if (!v.isVisited) {
                         DFS(v);
                     }
                 }
 
                 for (i = 0; i < vertices.length; i++) {
                     v = vertices[i];
                     for (j = 0; j < v.outEdges.length; j++) {
                         e = v.outEdges[j];
                         if (e.dst.postOrderNumber > e.org.postOrderNumber) {
                             result = true;
                             break;
                         }
                     }
                     if (result) {
                         break;
                     }
                 }
                 return result;
             }
 
             function DFS(v) {
                 var dual, j, e;
 
                 v.isVisited = true;
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     if (e.org === v && !e.isVisited) {
                         e.isVisited = true;
                         dual = e.dst;
                         if (!dual.isVisited) {
                             DFS(dual);
                         }
                     }
                 }
                 v.postOrderNumber = postOrderNumber++;
             }
 
             for (var i = 0; i < vertices.length; i++) {
                 var v = vertices[i];
                 // If a vertex has more than one parent, it is not a tree
                 if (v.inEdges.length > 1) {
                     return false;
                 }
             }
 
             return !isCycleDirected();
         }
 
         function ClusterManager() {
             var visitedCount, clusterCount;
 
             this.separateConnectedParts = function () {
                 var vertex, v, i;
 
                 visitedCount = 0;
                 clusterCount = 0;
                 while (visitedCount < vertices.length) {
                     // Find the first available vertex
                     vertex = null;
                     for (i = 0; i < vertices.length; i++) {
                         v = vertices[i];
                         if (v.owningClusterIndex === 0) {
                             clusterCount++;
                             vertex = v;
                             break;
                         }
                     }
 
                     // Depth first search
                     if (vertex !== null) {
                         visitVertex(vertex);
                     }
                 }
 
                 fillClusters();
             }();
 
             // We execute a "depth-first search" algorithm and we start with the vertex
             // passed in parameter.
             function visitVertex(vertex) {
                 var v, i, e, j, vParent;
 
                 vertex.owningClusterIndex = clusterCount;
                 visitedCount++;
                 for (j = 0; j < vertex.outEdges.length; j++) {
                     e = vertex.outEdges[j];
                     v = e.dst;
                     if (v.owningClusterIndex === 0) {
                         visitVertex(v);
                     }
                 }
                 vParent = vertex.getParent();
                 if (vParent !== null && vParent.owningClusterIndex === 0) {
                     visitVertex(vParent);
                 }
             }
 
             function fillClusters() {
                 var i, k, v;
 
                 // Allocate an array of cluster, each cluster being a list of vertices
                 clusters = new Array(clusterCount);
                 for (k = 0; k < clusterCount; k++) {
                     clusters[k] = [];
                 }
 
                 // Fill clusters
                 for (i = 0; i < vertices.length; i++) {
                     v = vertices[i];
                     clusters[v.owningClusterIndex - 1].push(v);
                 }
             }
         }
 
         // Returns a treeLayer object.
         function TreeLayer() {
             this.prior = null;
             this.cyMax = 0;
         }
 
         // Returns a vertex object.
         function _Vertex(_node) {
             var that;
 
             this._node = _node;      // Corresponding node
             this.inEdges = [];
             this.outEdges = [];
             this.isVisited = false;
             this.postOrderNumber = 0;
             this.x = 0;
             this.y = 0;
             this.w = 0;
             this.h = 0;
             this.ptOld = { x: 0, y: 0 }; // used for reflexive links
             this.owningClusterIndex = 0;
             this.prelim = 0;
             this.modifier = 0;
             this.leftmost = null;
             this._left = null;
             this._right = null;
             this.prev = null;
             this.depth = 0;        // used for radial drawing
             this.annulusWedge = 0; // used for radial drawing
             this.angle = 0;        // used for radial drawing
             this.leaves = 0;       // used for radial drawing
             that = this;
             
             this.getParent = function() {
                 var e;
 
                 if (that.inEdges.length === 0) {
                     return null;
                 } else {
                     e = that.inEdges[0];
                     return e.org;
                 }
             };
 
             this.getFirstChild = function() { 
                 return that.leftmost; 
             };
 
             this.getLeftNeighbor = function() {
                 return that.prev; 
             };
 
             this.hasChild = function () {
                 return (that.leftmost !== null);
             };
 
             this.hasLeft = function () {
                 return (that._left !== null);
             };
 
             this.hasRight = function() {
                 return (that._right !== null);
             };
 
             this.isLeaf = function() {
                 return (that.leftmost === null);
             };
         }
         
         // Returns a edge object.
         function _Edge(org, dst, _link) {
             this.org = org;
             this.dst = dst;
             this._link = _link;
             this.isVisited = false;
         }
     },
 
 
     //-------------------------------------------------------------------------
     // SERIES-PARALLEL
     // For the layout of a series-parallel digraph, we use the method described 
     // in the book "Drawing Graphs" (Michal Kaufmann-Dorothea Wagner) page 52-62.
     //-------------------------------------------------------------------------
 
     /** @SeriesParallel performs a layout on a series-parallel digraph. 
     By default, the algorithm applies on all items (nodes and links). 
     However you may exclude an item by setting its isExcludedFromLayout property to true.
     A series-parallel digraph is defined recursively as follows. 
     A digraph consisting of two vertices, a source s and a sink t 
     joined by a single edge is a series-parallel digraph. If G1 and G2 are 
     series-parallel digraphs, so are the digraphs constructed by each of the 
     following operations: 
     - The parallel composition: identify the source of G1 with the source of G2 
     and the sink of G1 with the sink of G2.
     - The series composition: identify the sink of G1 with the source of G2
     @param flow The flow control
     @param [layerDistance] The distance between two adjacent layers
     @param [vertexDistance] The distance between two adjacent vertices
     @param [drawingStyle] the Series Parallel drawing style. It may be:
     - BusOrthogonalDrawing: The source has a bus above. The sink has a bus below. 
     All other vertices have exactly one bus above and one bus below
     - StraightLine: Each edge is a straight line.
     - VisibilityDrawing: Each vertex is mapped as a horizontal lne segment and each 
     edge to a vertical line segment.
     @param [orientation] The graph layout orientation (north, east, south, west)
     @param [xvertex] the horizontal vertex size
     @param [yvertex] the vertical vertex size
     @param [xmargin] The horizontal margin size
     @param [ymargin] The vertical margin size 
     */
 
     SeriesParallel: function (flow, layerDistance, vertexDistance, drawingStyle, orientation,
         xvertex, yvertex, xmargin, ymargin) {
         var constDefaultVertexDistance, constDefaultLayerDistance, 
             constDefaultDrawingStyle, constDefaultVertexSize, 
             constDefaultOrientation, constDefaultMarginsize,
             _nodes, vertices, arrayVertices, cdTree,
             clusterManager, currentCluster, clusters, clusterIndex, xPrevPartsExtent;
 
         constDefaultVertexDistance = 80;
         constDefaultLayerDistance = 80;
         constDefaultMarginsize = 5;
         constDefaultOrientation = 'north';
         constDefaultVertexSize = 20;
         constDefaultDrawingStyle = 'busOrthogonalDrawing';
 
         if (flow === null || flow === undefined) {
             return;
         }
 
         if (vertexDistance === undefined || vertexDistance <= 0) {
             vertexDistance = constDefaultVertexDistance;
         }
 
         if (layerDistance === undefined || layerDistance <= 0) {
             layerDistance = constDefaultLayerDistance;
         }
 
         if (drawingStyle === undefined || drawingStyle === null) {
             drawingStyle = constDefaultDrawingStyle;
         }
 
         if (orientation === undefined || orientation === null) {
             orientation = constDefaultOrientation;
         }
 
         if (xvertex === undefined || xvertex <= 0) {
             xvertex = constDefaultVertexSize;
         }
 
         if (yvertex === undefined || yvertex <= 0) {
             yvertex = constDefaultVertexSize;
         }
 
         if (xmargin === undefined || xmargin <= 0) {
             xmargin = constDefaultMarginsize;
         }
 
         if (ymargin === undefined || ymargin <= 0) {
             ymargin = constDefaultMarginsize;
         }
 
         var rcGraph = { x: 0, y: 0, w: 0, h: 0 };
         vertices = [];
 
         // Get the array of nodes involved in the layout
         getNodes();
 
         flowToGraph();
 
         if (isCycleDirected()) {
             alert('The graph must be directed acyclic!');
             return;
         }
 
         // First we separate each connected part (cluster) of the graph.
         clusterManager = new ClusterManager();
 
         // Then we execute the layout algorithm for each cluster 
         // (horizontally from left to right)
         xPrevPartsExtent = 0;
         for (clusterIndex = 0; clusterIndex < clusters.length; clusterIndex++) {
             currentCluster = clusters[clusterIndex];
             if (!SPLayout()) {
                 return;
             }
         }
 
         graphToFlow();
 
         function getNodes() {
             var i, _node, items;
 
             items = flow.getItems();
             _nodes = [];
             for (i in items) {
                 if (flow.isNode(items[i])) {
                     _node = items[i];
                     if (!_node.isExcludedFromLayout) {
                         _nodes.push(items[i]);
                     }
                 }
             }
         }
 
         function flowToGraph() {
             var i, j, v, u, _link, _links, dual;
 
             for (i = 0; i < _nodes.length; i++) {
                 addVertex(_nodes[i]);
             }
 
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 _links = v._node.getLinks();
                 for (j = 0; j < _links.length; j++) {
                     _link = _links[j];
                     if (_link.org === v._node) {
                         dual = _link.dst;
                         if (!_link.isExcludedFromLayout && _link.org !== _link.dst && !dual.isExcludedFromLayout) {
                             u = dual.tag;
                             addEdge(v, u, _link);
                         }
                     }
                 }
             }
         }
 
         function graphToFlow() {
             var i, j, k, v, e, pt, t, rcGraph, x, y, xOffset, yOffset, _link, _links;
 
             flow.beginUpdate();
 
             // Size of the graph
             rcGraph = getGraphRect();
 
             // Position nodes
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 x = v.x;
                 y = v.y;
 
                 // Store the old node position
                 v._node.oldPosition = { x: v._node.getLeft(), y: v._node.getTop() };
 
                 // Translation so that coordinates are allways positive
                 x -= rcGraph.x;
                 y -= rcGraph.y;
 
                 // Take account of orientation
                 switch (orientation) {
                     case 'north':
                         break;
                     case'west':
                         t = x;
                         x = y;
                         y = rcGraph.w - t;
                         t = v.w;
                         v.w = v.h;
                         v.h = t;
                         break;
                     case 'south':
                         x = rcGraph.w - x;
                         y = rcGraph.h - y;
                         break;
                     case 'east':
                         t = x;
                         x = rcGraph.h - y;
                         y = t;
                         t = v.w;
                         v.w = v.h;
                         v.h = t;
                         break;
                 }
 
                 // Take account of the size of the node
                 x -= v.w / 2;
                 y -= v.h / 2;
 
                 // Add margins 
                 x += xmargin;
                 y += ymargin;
 
                 v._node.setLeft(x);
                 v._node.setTop(y);
                 v._node.setWidth(v.w);
                 v._node.setHeight(v.h);
 
                 // We set a flag property to each link involved in the layout
                 _links = v._node.getLinks();
                 for (j = 0; j < _links.length; j++) {
                     _link = _links[j];
                     if (_link.isExcludedFromLayout) {
                         continue;
                     }
                     _link.flag = true;
 
                     // We set both following properties to false (side effect)
                     _link.setIsOrgPointAdjustable(false);
                     _link.setIsDstPointAdjustable(false);
                 }
             }
             
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 _links = v._node.getLinks();
 
                 for (j = 0; j < _links.length; j++) {
                     _link = _links[j];
 
                     // Exclude links not involved in the layout
                     if (_link.isExcludedFromLayout) {
                         continue;
                     }
 
                     // We must avoid doing the same work 2 times as a link 
                     // part of links collection of 2 nodes
                     if (_link.flag) {
                         _link.flag = false;
                     } else {
                         continue;
                     }
 
                     if (_link.org !== _link.dst) {
                         // Normal case: the link is not reflexive
                         _link.setLineStyle('polyline');
                         if (_link.points.length > 2) {
                             _link.clearPoints();
                         }
                         if (_link.pinOrg !== undefined && _link.pinOrg !== null) {
                             xOffset = _link.org.getLeft() - _link.org.oldPosition.x;
                             yOffset = _link.org.getTop() - _link.org.oldPosition.y;
                             pt = _link.points[0];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, 0);
                         }
                         if (_link.pinDst !== undefined && _link.pinDst !== null) {
                             xOffset = _link.dst.getLeft() - _link.dst.oldPosition.x;
                             yOffset = _link.dst.getTop() - _link.dst.oldPosition.y;
                             pt = _link.points[1];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, 1);
                         }
                     } else {
                         // The link is reflexive
                         // Reflexive links are not taken into account by layout algorithms. 
                         // Reflexive links are just translated to follow their origin 
                         // (and also destination) node.
 
                         // Obtain the node horizontal and vertical offset
                         // Remember: we have stored the old node position
                         xOffset = v._node.getLeft() - v._node.oldPosition.x;
                         yOffset = v._node.getTop() - v._node.oldPosition.y;
 
                         if (_link.pinOrg !== undefined && _link.pinOrg !== null) {
                             k = 0;
                             pt = _link.points[k];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, k);
                         }
                         for (k = 1; k < _link.points.length - 1; k++) {
                             pt = _link.points[k];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, k);
                         }
                         if (_link.pinDst !== undefined && _link.pinDst !== null) {
                             k = _link.points.length - 1;
                             pt = _link.points[k];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, k);
                         }
                     }
                 }
             }
 
             if (drawingStyle !== 'straightLine') {
                 // Add the link points corresponding to the dummy nodes 
                 for (i = 0; i < vertices.length; i++) {
                     v = vertices[i];
                     
                     for (j = 0; j < v.outEdges.length; j++) {
                         e = v.outEdges[j];
                         if (e.bends.length > 0) {
                             _link = e._link;
 
                             // Dummy nodes have been added and replaced by points
                             for (k = 0; k < e.bends.length; k++) {
                                 pt = e.bends[k];
 
                                 // Translation so that coordinates are allways positive
                                 pt.x -= rcGraph.x;
                                 pt.y -= rcGraph.y;
 
                                 switch (orientation) {
                                     case 'north':
                                         break;
                                     case 'west':
                                         t = pt.x;
                                         pt.x = pt.y;
                                         pt.y = rcGraph.w - t;
                                         break;
                                     case 'south':
                                         pt.x = rcGraph.w - pt.x;
                                         pt.y = rcGraph.h - pt.y;
                                         break;
                                     case 'east':
                                         t = pt.x;
                                         pt.x = rcGraph.h - pt.y;
                                         pt.y = t;
                                         break;
                                 }
 
                                 // Add margins 
                                 pt.x += xmargin;
                                 pt.y += ymargin;
 
                                 if (k === 0) {
                                     if (drawingStyle === 'visibilityDrawing') {
                                         _link.setPoint(pt.x, pt.y, 0);
                                     }
                                 } else if (k === e.bends.length - 1) {
                                     if (drawingStyle === 'visibilityDrawing') {
                                         _link.setPoint(pt.x, pt.y, _link.points.length - 1);
                                     }
                                 } else {
                                     _link.addPoint(pt.x, pt.y);
                                 }
                             }
                         }
                     }
                 }
             }
 
             flow.endUpdate();
         }
 
         function getGraphRect() {
             var i, j, k, v, e, pt, rc, rcGraph;
             
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 rc = { x: v.x - v.w / 2,  y: v.y - v.h / 2, w: v.w, h: v.h };
                 if (i === 0) {
                     rcGraph = rc;
                 } else {
                     rcGraph = unionRect(rcGraph, rc);
                 }
             }
             
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     for (k = 0; k < e.bends.length; k++) {
                         pt = e.bends[k];
                         if (pt.x < rcGraph.x) {
                             rcGraph.w += rcGraph.x - pt.x;
                             rcGraph.x = pt.x;
                         } else if (pt.x > rcGraph.x + rcGraph.w) {
                             rcGraph.w += pt.x - (rcGraph.x + rcGraph.w);
                         }
                         if (pt.y < rcGraph.y) {
                             rcGraph.h += rcGraph.y - pt.y;
                             rcGraph.y = pt.y;
                         }
                         else if (pt.y > rcGraph.y + rcGraph.h) {
                             rcGraph.h += pt.y - (rcGraph.y + rcGraph.h);
                         }
                     }
                 }
             }
             return rcGraph;
         }
 
         function unionRect(rect1, rect2) {
             var left, top, right, bottom;
 
             // We compute right and bottom before we change left and top below.
             right = Math.max(rect1.x + rect1.w, rect2.x + rect2.w);
             bottom = Math.max(rect1.y + rect1.h, rect2.y + rect2.h);
 
             left = Math.min(rect1.x, rect2.x);
             top = Math.min(rect1.y, rect2.y);
 
             return { x: left, y: top, w: right - left, h: bottom - top };
         }
 
         function addVertex(_node) {
             var v;
 
             v = new _Vertex(_node);
             _node.tag = v;
             vertices.push(v);
         }
 
         function addEdge(org, dst, _link) {
             var e;
 
             // Note here that we do not include reflexive edges
             if (org === null || dst === null || org === dst) {
                 return null;
             }
 
             // If there is already an edge between both nodes
             if (getEdge(org, dst) !== null) {
                 return null;
             }
 
             e = new _Edge(org, dst, _link);
 
             // Add this edge to the edges collection of the origin vertex 
             // and the edges collection of the destination vertex
             org.outEdges.push(e);
             dst.inEdges.push(e);
             return e;
         }
         
         function delVertex(v) {
             var k, e, idx;
 
             for (k = v.outEdges.length - 1; k >= 0; k--) {
                 e = v.outEdges[k];
                 delEdge(e);
             }
             for (k = v.inEdges.length - 1; k >= 0; k--) {
                 e = v.inEdges[k];
                 delEdge(e);
             }
             idx = currentCluster.indexOf(v);
             currentCluster.splice(idx, 1);
         }
 
         function delEdge(e) {
             var idx;
 
             idx = e.org.outEdges.indexOf(e);
             e.org.outEdges.splice(idx, 1);
             idx = e.dst.inEdges.indexOf(e);
             e.dst.inEdges.splice(idx, 1);
         }
 
         function getEdge(org, dst) {
             var i, e;
 
             for (i = 0; i < org.outEdges.length; i++) {
                 e = org.outEdges[i];
                 if (e.dst === dst) {
                     return e;
                 }
             }
             return null;
         }
  
         function isCycleDirected() {
             var result, i, v, j, e, postOrderNumber;
                 
             result = false;
             postOrderNumber = 0;
             
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 if (!v.isVisited) {
                     DFS(v);
                 }
             }
             
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     if (e.dst.postOrderNumber > e.org.postOrderNumber) {
                         result = true;
                         break;
                     }
                 }
                 if (result) {
                     break;
                 }
             }
             return result;
 
             function DFS(v) {
                 var dual, j, e;
 
                 v.isVisited = true;
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     if (e.org === v && !e.isVisited) {
                         e.isVisited = true;
                         dual = e.dst;
                         if (!dual.isVisited) {
                             DFS(dual);
                         }
                     }
                 }
                 v.postOrderNumber = postOrderNumber++;
             }
         }
 
         // For the layout of a series-parallel digraph, we use the method described 
         // in the book "Drawing Graphs" (Michal Kaufmann-Dorothea Wagner) page 52-62.
         function SPLayout() {
             var i, j, k, v, e, rc, pt;
 
             saveGraph();
 
             cdTree = new CDTree();
 
             if (!createBinaryDecompositionTree()) {
                 alert('The graph is not a series-parallel graph!');
                 return false;
             }
 
             restoreGraph();
 
             cdTree.executeSymmetricLayout();
 
             if (drawingStyle !== 'visibilityDrawing') {
                 makeBusOrthogonalDrawing();
             }
 
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];                
                 rc = { x: v.x - v.w / 2, y: v.y - v.h / 2, w: v.w, h: v.h };
                 if (i === 0) {
                     rcGraph = rc;
                 } else {
                     rcGraph = unionRect(rcGraph, rc);
                 }
             }
 
             // Assign new position
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 // Add cluster offsets and translate to left-top corner of the area
                 v.x += xPrevPartsExtent - rcGraph.x;
                 v.y += - rcGraph.y;
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     for (k = 0; k < e.bends.length; k++) {
                         pt = e.bends[k];
                         pt.x += xPrevPartsExtent - rcGraph.x;
                         pt.y += - rcGraph.y;
                         e.bends[k] = pt;
                     }
                 }
             }
 
             xPrevPartsExtent += xmargin + rcGraph.w;
             return true;
         }
 
         // For more information, see "A New Algorithm for the recognition  
         // of Series Parallel Graphs" (Berry Schoenmakers) page 4
         // This algorithm is not linear and should be replaced by a linear one
         // in the future (for instance, the algorithm described in the previous
         // document or the one from "Valdes - Trajan - Lawler")
         // Return false if the graph is not Series Parallel.
         function createBinaryDecompositionTree() {
             var i, j, v, e, e1, e2,newRedexDetected;
             
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     cdTree.addQNode(e); // Q_Node
                 }
             }
 
             if (isBasicSPGraph()) {
                 return true;
             } else {
                 while (currentCluster.length > 2) {
                     newRedexDetected = false;
                     for (i = 0; i < currentCluster.length; i++) {
                         v = currentCluster[i];
                         if (v.isRedex()) {
                             newRedexDetected = true;
                             e1 = v.inEdges[0];
                             e2 = v.outEdges[0];
                             e = getEdge(e1.org, e2.dst);
                             if (e === null) {
                                 // Rule S1
                                 e = addEdge(e1.org, e2.dst, null);
                                 cdTree.addSNode(e1, e2, e); // S_node
                             } else {
                                 // Rule S2
                                 cdTree.addPNode(e1, e2, e); // P-node
                             }
                             // Remove item from the list
                             delVertex(v);
                         }
                     }
 
                     if (!newRedexDetected) {
                         return false;
                     }
 
                     // Case of the basic SP graph with 2 nodes and 1 link
                     if (isBasicSPGraph()) {
                         return true;
                     }
                 }
             }
             return false;
         }
 
         function makeBusOrthogonalDrawing() {
             var i, j, v, u, e, d1, d2, pt0, pt1, pt2, pt3, pt4, pt5;
 
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 v.w = xvertex;
                 v.h = yvertex;
             }
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     d1 = yvertex / 2;
                     d2 = layerDistance / 4;
                     u = e.dst;
                     pt0 = { x: v.x, y: v.y + d1 };
                     pt1 = { x: v.x, y: v.y + d1 + d2 };
                     pt2 = e.bends[0];
                     pt3 = e.bends[1];
                     pt4 = { x: u.x, y: u.y - d1 - d2 };
                     pt5 = { x: u.x, y: u.y - d1 };
                     pt2.y = pt1.y;
                     pt3.y = pt4.y;
                     e.bends = [];
                     e.bends.push(pt0);
                     if (!isAligned(pt0, pt1, pt2)) {
                         e.bends.push(pt1);
                     }
                     if (!isAligned(pt1, pt2, pt3)) {
                         e.bends.push(pt2);
                     }
                     if (!isAligned(pt2, pt3, pt4)) {
                         e.bends.push(pt3);
                     }
                     if (!isAligned(pt3, pt4, pt5)) {
                         e.bends.push(pt4);
                     }
                     e.bends.push(pt5);
                 }
             }
 
             // Here we consider only vertical and horizontal lines
             function isAligned(pt1, pt2, pt3) {
                 return ((pt1.x === pt2.x && pt2.x === pt3.x) ||
                         (pt1.y === pt2.y && pt2.y === pt3.y));
             }
         }
 
         function isBasicSPGraph() {
             var v0, v1;
 
             if (currentCluster.length === 2) {
                 v0 = currentCluster[0];
                 v1 = currentCluster[1];
                 if (v0.outEdges.length === 1 || v1.outEdges.length === 1) {
                     return true;
                 }
             }
             return false;
         }
 
         // Save the graph (the cluster to be more precise) in arrays
         function saveGraph() {
             var i, v;
 
             arrayVertices = currentCluster.slice();
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 v.arrayOutEdges = v.outEdges.slice();
                 v.arrayInEdges = v.inEdges.slice();
             }
         }
 
         function restoreGraph() {
             var i, v;
 
             currentCluster = arrayVertices.slice();
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 v.outEdges = v.arrayOutEdges.slice();
                 v.inEdges = v.arrayInEdges.slice();
             }
         }
 
         // TreeItem class
         function TreeItem(t, e) {
             var that;
 
             this.edge = e;
             this.tiParent = null;
             this.children = [];
             this.rect = { x: 0, y: 0, w: 0, h: 0 };
             this.pt1 = { x: 0, y: 0 };
             this.pt2 = { x: 0, y: 0 };
             this.org = null;
             this.dst = null;
             this.level = 0;
             this.levelIndex = 0;
             this.tuple = '';
             this.code = 0;
             this.type = t;
 
             that = this;
 
             if (e !== null) {
                 that.org = e.org;
                 that.dst = e.dst;
             } else {
                 that.org = null;
                 that.dst = null;
             }
             
             function toString() {
                 var sourcesink = "(" + that.org._node.text + "," + that.dst._node.text + ")";
                 if (that.isSNode()) {
                     return "S " + sourcesink;
                 } else if (that.isPNode()) {
                     return "P " + sourcesink;
                 } else { // Q-Node
                     return "Q " + sourcesink;
                 }
             }
 
             function getDumpOffset() {
                 var i, offset;
 
                 offset = "";
                 for (i = 0; i < that.level; i++) {
                     offset += "   ";
                 }
                 return offset;
             }
 
             this.setParent = function (newparent, left) {
                 var idx;
 
                 if (that.tiParent !== null) {
                     // Remove its current parent if any
                     idx = that.tiParent.children.indexOf(that);
                     that.tiParent.children.splice(idx, 1);
                 }
 
                 // Set the new parent
                 that.tiParent = newparent;
 
                 // Update the parent's list of children
                 if (that.tiParent !== null) {
                     var level = that.tiParent.level + 1;
                     if (left === null || left === undefined) {
                         that.tiParent.children.push(that);
                     } else {
                         idx = that.tiParent.children.indexOf(left);
                         // Insert "that" just after "left" without removing any element
                         that.tiParent.children.splice(idx + 1, 0, that);
                     }
                 }
             };
 
             this.isQNode = function () {
                 return that.type === 'QNode';
             };
 
             this.isSNode = function () {
                 return that.type === 'SNode';
             };
 
             this.isPNode = function () {
                 return that.type === 'PNode';
             };
 
             this.qNodeVisibilityDrawing = function () {
                 that.pt1 = { x: vertexDistance / 2, y: 0 };
                 that.pt2 = { x: vertexDistance / 2, y: layerDistance };
                 that.rect = { x: 0, y: 0, w: vertexDistance, h: layerDistance };
             };
 
             this.stretchWidth = function(factor) {
                 var i, ti;
 
                 that.rect.x *= factor;
                 that.rect.w *= factor;
                 if (that.isQNode()) {
                     that.pt1.x = that.pt1.x * factor;
                     that.pt2.x = that.pt2.x * factor;
                 } else {
                     for (i = 0; i < that.children.length; i++) {
                         ti = that.children[i];
                         ti.stretchWidth(factor);
                     }
                 }
             };
 
             this.stretchHeight = function (factor) {
                 var i, ti;
 
                 that.rect.y *= factor;
                 that.rect.h *= factor;
                 if (that.isQNode()) {
                     that.pt1.y = that.pt1.y * factor;
                     that.pt2.y = that.pt2.y * factor;
                 } else {
                     for (i = 0; i < that.children.length; i++) {
                         ti = that.children[i];
                         ti.stretchHeight(factor);
                     }
                 }
             };
 
             this.translateUnder = function(rc) {
                 var i, ti;
 
                 that.rect.x += rc.x;
                 that.rect.y += rc.y + rc.h;
                 if (that.isQNode()) {
                     that.pt1.x += rc.x;
                     that.pt1.y += rc.y + rc.h;
                     that.pt2.x += rc.x;
                     that.pt2.y += rc.y + rc.h;
                 } else {
                     for (i = 0; i < that.children.length; i++) {
                         ti = that.children[i];
                         ti.translateUnder(rc);
                     }
                 }
             };
 
             this.translateRight = function (rc) {
                 var i, ti;
 
                 that.rect.x += rc.x + rc.w;
                 that.rect.y += rc.y;
                 if (that.isQNode()) {
                     that.pt1.x += rc.x + rc.w;
                     that.pt1.y += rc.y;
                     that.pt2.x += rc.x + rc.w;
                     that.pt2.y += rc.y;
                 } else {
                     for (i = 0; i < that.children.length; i++) {
                         ti = that.children[i];
                         ti.translateRight(rc);
                     }
                 }
             };
         }
 
         // Canonical decomposition tree class
         function CDTree() {
             var root, that;
 
             root = null;
             that = this;
             
             this.addQNode = function (e) {
                 var treeitem;
 
                 treeitem = new TreeItem('QNode', e);
                 if (e !== null) {
                     e.ti = treeitem;
                 }
                 root = treeitem;
                 return treeitem;
             };
 
             this.addSNode = function (e1, e2, e) {
                 var treeitem;
 
                 treeitem = new TreeItem('SNode', null);
                 e1.ti.setParent(treeitem);
                 e2.ti.setParent(treeitem);
                 treeitem.org = e1.org;
                 treeitem.dst = e2.dst;
                 if (e !== null) {
                     e.ti = treeitem;
                 }
                 root = treeitem;
                 return treeitem;
             };
 
             this.addPNode = function (e1, e2, e) {
                 var ti, treeitem;
 
                 ti = that.addSNode(e1, e2, null); // S_node
                 treeitem = new TreeItem('PNode', null);
                 ti.setParent(treeitem);
                 if (e !== null) {
                     e.ti.setParent(treeitem);
                     treeitem.org = e.org;
                     treeitem.dst = e.dst;
                     e.ti = treeitem;
                 }
                 root = treeitem;
                 return treeitem;
             };
             
             // 1) we create the canonical decomposition tree, 
             // 2) we label the tree to prepare the vertical symmetry check.
             // 3) we reorder the P-nodes to establish the vertical symmetry 
             //    where it is possible
             // 4) we make a visibility drawing of the graph allowing to set the
             //    coordinates of each vertice and each bend of each edge.
             // 5) the step "bus orthogonal drawing" is made outside this class.
             this.executeSymmetricLayout = function () {
                 makeCanonical(root, 0);
                 makeVerticalLabeling(root);
                 makeVerticalSymmetry(root);
                 makeVisibilityDrawing(root);
                 makeCoordinates(root);
             };
             
             // Binary tree -> canonical tree
             // If a tree item u and its parent v have the same type, 
             // then u is a right child of v
             // This function is recursive.
             function makeCanonical(treeitem, level) {
                 var i, k, ti, ti2;
 
                 treeitem.level = level;
                 for (i = 0; i < treeitem.children.length; i++) {
                     ti = treeitem.children[i];
                     makeCanonical(ti, level + 1);
                 }
                 for (i = treeitem.children.length - 1; i >= 0; i--) {
                     ti = treeitem.children[i];
                     if (!ti.isQNode()) {
                         if (ti.type === treeitem.type) {
                             for (k = ti.children.length - 1; k >= 0; k--) {
                                 ti2 = ti.children[k];
                                 ti2.setParent(treeitem, ti);
                             }
                             ti.setParent(null);
                         }
                     }
                 }
             }
 
             function makeVerticalLabeling(root) {
                 var maxlevel, levels, levelIndex,
                     i, j, k, treeitem, ti, c, chararray, temp, s;
 
                 maxlevel = 0;
                 levels = [];
 
                 initLabeling(root, 0);
 
                 // Create and fill levels
                 levels = [];
                 for (i = 0; i < maxlevel + 1; i++) {
                     levels.push(new Level());
                 }
                 fillLevels(root);
 
                 for (levelIndex = maxlevel; levelIndex >= 0; levelIndex--) {
                     for (j = 0; j < levels[levelIndex].aTreeItems.length; j++) {
                         treeitem = levels[levelIndex].aTreeItems[j];
                         if (treeitem.children !== null && treeitem.children.length > 0) {
                             // Build the tuple of each item at this level
                             for (k = 0; k < treeitem.children.length; k++) {
                                 ti = treeitem.children[k];
                                 c = "0".charCodeAt(0) + ti.code;
                                 s = String.fromCharCode(c);
                                 treeitem.tuple = treeitem.tuple + s;
                             }
 
                             // If the item is a Pnode, sort its tuple
                             if (treeitem.type === 'PNode') {
                                 chararray = treeitem.tuple.split("");
                                 chararray.sort();
                             }
                         }
                     }
 
                     // Sort the sequence of tuples on this level lexicographically
                     temp = [];
                     for (j = 0; j < levels[levelIndex].aTreeItems.length; j++) {
                         ti = levels[levelIndex].aTreeItems[j];
                         temp.push(ti.tuple);
                     }
                     temp.sort();
 
                     // Set the code of each item at this level
                     for (j = 0; j < levels[levelIndex].aTreeItems.length; j++) {
                         ti = levels[levelIndex].aTreeItems[j];
                         k = 1;
                         for (i = 0; i < temp.length; i++) {
                             if (i > 0 && temp[i] !== temp[i - 1]) {
                                 k++;
                             }
                             if (ti.tuple === temp[i]) {
                                 ti.code = k;
                                 break;
                             }
                         }
                     }
                 }
 
                 function fillLevels(treeitem) {
                     var level, i, ti;
 
                     level = levels[treeitem.levelIndex];
                     level.aTreeItems.push(treeitem);
                     for (i = 0; i < treeitem.children.length; i++) {
                         ti = treeitem.children[i];
                         fillLevels(ti);
                     }
                 }
 
                 function initLabeling(treeitem, level) {
                     var i, ti;
 
                     treeitem.levelIndex = level;
                     maxlevel = Math.max(maxlevel, level);
                     if (treeitem.isQNode()) {
                         treeitem.tuple = "0";
                     }
                     for (i = 0; i < treeitem.children.length; i++) {
                         ti = treeitem.children[i];
                         initLabeling(ti, level + 1);
                     }
                 }
 
                 function Level() {
                     this.aTreeItems = [];
                 }
             }
 
             function makeVerticalSymmetry(treeitem) {
                 var i, j, k, ti, codes, distinctCodes, distinctCodesCount, 
                     classCounts, odds, tiArray, tiArray2, idx;
 
                 if (treeitem.isQNode()) {
                     return;
                 } else if (treeitem.isSNode()) {
                     for (i = 0; i < treeitem.children.length; i++) {
                         ti = treeitem.children[i];
                         makeVerticalSymmetry(ti);
                     }
                 } else if (treeitem.isPNode()) {
                     // (It is the order of P-Nodes that determine the topological embedding)
                     //
                     // We create and fill an array of codes, then sort it 
                     // and keep only the distinct values in another array
                     codes = [];
                     for (i = 0; i < treeitem.children.length; i++) {
                         ti = treeitem.children[i];
                         codes.push(ti.code);
                     }
                     codes.sort();
                     distinctCodes = [];
                     distinctCodes.push(codes[0]);
                     distinctCodesCount = 1;
                     for (j = 1; j < codes.length; j++) {
                         if (codes[j] !== codes[j - 1]) {
                             distinctCodes.push(codes[j]);
                             distinctCodesCount++
                         }
                     }
 
                     // Partition the children of u into classes with equal values of code.
                     // In fact we just determine the size each class.
                     classCounts = [];
                     for (j = 0; j < distinctCodesCount; j++) {
                         classCounts.push(0);
                         for (i = 0; i < treeitem.children.length; i++) {
                             ti = treeitem.children[i];
                             if (ti.code === distinctCodes[j]) {
                                 classCounts[j]++;
                             }
                         }
                     }
 
                     // Then we count the number of classes with an odd size.
                     k = 0;
                     odds = 0;
                     for (j = 0; j < classCounts.length; j++) {
                         if (classCounts[j] % 2 !== 0) {
                             k = j;
                             odds++;
                         }
                     }
 
                     // If all the sizes of the classes are even then we have a
                     // vertical automorphism. If one is odd, then we have a vertical 
                     // automorphism if the odd element has a vertical automorphism.
                     if (odds === 0 || odds === 1) {
                         // For each distinct code, we create an array containing the tree 
                         // items having this code.
                         for (j = distinctCodesCount - 1; j >= 0; j--) {
                             // Use an array to contain the tree items having a given code.
                             tiArray = [];
 
                             // Fill the array
                             for (i = 0; i < treeitem.children.length; i++) {
                                 ti = treeitem.children[i];
                                 if (ti.code === distinctCodes[j]) {
                                     tiArray.push(ti);
                                 }
                             }
 
                             for (i = 0; i < tiArray.length; i++) {
                                 ti = tiArray[i];
                                 idx = treeitem.children.indexOf(ti);
                                 treeitem.children.splice(idx, 1);
                             }
                             for (i = 0; i < Math.floor(tiArray.length / 2) ; i++) {
                                 treeitem.children.splice(0, 0, tiArray[i]);
                             }
                             for (i = Math.floor(tiArray.length / 2) ; i < tiArray.length; i++) {
                                 treeitem.children.push(tiArray[i]);
                             }
                         }
                         if (odds === 1) {
                             // Use an array to contain the tree items having a given code.
                             tiArray2 = [];
 
                             // Fill the array
                             for (i = 0; i < treeitem.children.length; i++) {
                                 ti = treeitem.children[i];
                                 if (ti.code === distinctCodes[k]) {
                                     tiArray2.push(ti);
                                 }
                             }
 
                             // Place each item of this array at the middle of the list 
                             // of children to preserve the symmetry.
                             for (i = 0; i < tiArray2.length; i++) {
                                 ti = tiArray2[i];
                                 idx = treeitem.children.indexOf(ti);
                                 treeitem.children.splice(idx, 1);
                             }
                             for (i = 0; i < tiArray2.length; i++) {
                                 ti = tiArray2[i];
                                 treeitem.children.splice(Math.floor(treeitem.children.length / 2), 0, ti);
                             }
                         }
                     }
                     else if (odds > 1) {
                         // If more than one class has odd size then we have not a 
                         // vertical automorphism. 
                     }
 
                     // In all cases we try to find vertical automorphisms in the subtrees.
                     for (i = 0; i < treeitem.children.length; i++) {
                         ti = treeitem.children[i];
                         makeVerticalSymmetry(ti);
                     }
                 }
             }
 
             // In a visibility drawing, each vertex is mapped to a horizontal and 
             // each edge is mapped to a vertical line segment.
             // We construct this drawing recursively by series parallel compositions.
             function makeVisibilityDrawing(treeitem) {
                 /*alert(treeitem.getDumpOffset() + "makeVisibilityDrawing:\r\n" +
                         treeitem.getDumpOffset() + treeitem.toString() + "rect = " + treeitem.rect + "\r\n");*/
                 var i, k, ti, ti2;
 
                 if (treeitem.isQNode()) {
                     treeitem.qNodeVisibilityDrawing();
                 } else if (treeitem.isSNode()) {
                     for (i = 0; i < treeitem.children.length; i++) {
                         ti = treeitem.children[i];
 
                         // Divide
                         makeVisibilityDrawing(ti);
 
                         // Conquer
                         if (i > 0) {
                             ti2 = treeitem.children[i - 1];
                             // Series composition: 
                             // - we stretch the narrower
                             if (ti2.rect.w < ti.rect.w) {
                                 for (k = 0; k < i; k++) {
                                     ti2 = treeitem.children[k];
                                     ti2.stretchWidth(ti.rect.w / ti2.rect.w);
                                 }
                             }
                             else if (ti2.rect.w > ti.rect.w) {
                                 ti.stretchWidth(ti2.rect.w / ti.rect.w);
                             }
                             // - we identify the sink of the first tree item 
                             //   with the source of the second tree item 
                             ti.translateUnder(ti2.rect);
                         }
                     }
                     for (i = 0; i < treeitem.children.length; i++) {
                         ti = treeitem.children[i];
                         treeitem.rect = unionRect(treeitem.rect, ti.rect);
                     }
                 } else if (treeitem.isPNode()) {
                     for (i = 0; i < treeitem.children.length; i++) {
                         ti = treeitem.children[i];
 
                         // Divide
                         makeVisibilityDrawing(ti);
 
                         // Conquer
                         if (i > 0) {
                             ti2 = treeitem.children[i - 1];
                             // Parallel composition: 
                             // - we stretch the shorter
                             if (ti2.rect.h < ti.rect.h) {
                                 for (k = 0; k < i; k++) {
                                     ti2 = treeitem.children[k];
                                     ti2.stretchHeight(ti.rect.h / ti2.rect.h);
                                 }
                             }
                             else if (ti2.rect.h > ti.rect.h) {
                                 ti.stretchHeight(ti2.rect.h / ti.rect.h);
                             }
                             // - we identify the sources and sinks
                             ti.translateRight(ti2.rect);
                         }
                     }
                     for (i = 0; i < treeitem.children.length; i++) {
                         ti = treeitem.children[i];
                         treeitem.rect = unionRect(treeitem.rect, ti.rect);
                     }
                 }
                 /*alert(treeitem.getDumpOffset() 
                          + treeitem.toString() + "rect = " + treeitem.rect + "\r\n");*/
             }
             
             function makeCoordinates(treeitem) {
                 var org, dst, i, ti;
 
                 org = treeitem.org;
                 dst = treeitem.dst;
 
                 if (!org.placed) {
                     org.x = treeitem.rect.x + treeitem.rect.w / 2;
                     org.y = treeitem.pt1.y;
                     org.w = treeitem.rect.w;
                     org.h = 3;
                     org.placed = true;
                 }
                 if (!dst.placed) {
                     dst.x = treeitem.rect.x + treeitem.rect.w / 2;
                     dst.y = treeitem.pt2.y;
                     dst.w = treeitem.rect.w;
                     dst.h = 3;
                     dst.placed = true;
                 }
                 if (treeitem.isQNode()) {
                     org.y = treeitem.pt1.y;
                     dst.y = treeitem.pt2.y;
                     treeitem.edge.bends.push(treeitem.pt1);
                     treeitem.edge.bends.push(treeitem.pt2);
                 }
                 for (i = 0; i < treeitem.children.length; i++) {
                     ti = treeitem.children[i];
                     makeCoordinates(ti);
                 }
             }
 
             function toString() {
                 var dumpTree = new DumpTree();
                 return dumpTree.getTreeDump(root);
             }
 
             function DumpTree() {
                 var dumptree = null;
 
                 function getTreeDump(root) {
                     dumptree = null;
                     DFSGetTreeDump(root);
                     return dumptree;
                 }
 
                 function DFSGetTreeDump(treeitem) {
                     var i, ti;
 
                     dumptree += treeitem.getDumpOffset() + treeitem.toString() + "\r\n";
                     for (i = 0; i < treeitem.children.length; i++) {
                         ti = treeitem.children[i];
                         DFSGetTreeDump(ti);
                     }
                 }
             }
         }
 
         function ClusterManager() {
             var visitedCount, clusterCount;
 
             this.separateConnectedParts = function () {
                 var vertex, v, i;
 
                 visitedCount = 0;
                 clusterCount = 0;
                 while (visitedCount < vertices.length) {
                     // Find the first available vertex
                     vertex = null;
                     for (i = 0; i < vertices.length; i++) {
                         v = vertices[i];
                         if (v.owningClusterIndex === 0) {
                             clusterCount++;
                             vertex = v;
                             break;
                         }
                     }
 
                     // Depth first search
                     if (vertex !== null) {
                         visitVertex(vertex);
                     }
                 }
 
                 fillClusters();
             }();
 
             // We execute a "depth-first search" algorithm and we start with the vertex
             // passed in parameter.
             function visitVertex(vertex) {
                 var v, i, e, j, tiParent;
 
                 vertex.owningClusterIndex = clusterCount;
                 visitedCount++;
                 for (j = 0; j < vertex.outEdges.length; j++) {
                     e = vertex.outEdges[j];
                     v = e.dst;
                     if (v.owningClusterIndex === 0) {
                         visitVertex(v);
                     }
                 }
                 for (j = 0; j < vertex.inEdges.length; j++) {
                     e = vertex.inEdges[j];
                     v = e.org;
                     if (v.owningClusterIndex === 0) {
                         visitVertex(v);
                     }
                 }
                 tiParent = vertex.getParent();
                 if (tiParent !== null && tiParent.owningClusterIndex === 0) {
                     visitVertex(tiParent);
                 }
             }
 
             function fillClusters() {
                 var i, k, v;
 
                 // Allocate an array of cluster, each cluster being a list of vertices
                 clusters = new Array(clusterCount);
                 for (k = 0; k < clusterCount; k++) {
                     clusters[k] = [];
                 }
 
                 // Fill clusters
                 for (i = 0; i < vertices.length; i++) {
                     v = vertices[i];
                     clusters[v.owningClusterIndex - 1].push(v);
                 }
             }
         }
 
         // Returns a vertex object.
         function _Vertex(_node) {
             var that;
 
             this._node = _node;  // Corresponding node
             this.inEdges = [];
             this.outEdges = [];
             this.arrayOutEdges = [];
             this.arrayInEdges = [];
             this.isVisited = false;
             this.owningClusterIndex = 0;
             this.postOrderNumber = 0;
             this.x = 0;
             this.y = 0;
             this.w = 0;
             this.h = 0;
             this.placed = false;
 
             that = this;
 
             this.isRedex = function () {
                 return that.outEdges.length === 1 && that.inEdges.length === 1;
             };
 
             this.getParent = function () {
                 var e;
 
                 if (that.inEdges.length === 0) {
                     return null;
                 }
                 else {
                     e = that.inEdges[0];
                     return e.org;
                 }
             };
         }
               
         // Returns a Edge object
         function _Edge(org, dst, _link) {
             this.org = org;
             this.dst = dst;
             this._link = _link;
             this.isVisited = false;
             this.ti = null;
             this.bends = [];
         }
     },
 
 
     //------------------------------------------------------------------------
     // ORTHOGONAL
     // We use the Biedl and Kant algorithm
     //------------------------------------------------------------------------
 
     /** @Orthogonal performs an orthogonal grid layout.
     By default, the algorithm applies on all items (nodes and links). 
     However you may exclude an item by setting its isExcludedFromLayout property to true.
     @param flow The flow control
     @param [orientation] The graph layout orientation (north, east, south, west)
     @param [xgridSize] The horizontal grid size
     @param [ygridSize] The vertical grid size
     @param [nodeSizeRatio] The node size expressed in percentage of the grid size
     @param [xmargin] The horizontal margin size
     @param [ymargin] The vertical margin size 
     */
 
     Orthogonal: function (flow, orientation, xgridSize, ygridSize, nodeSizeRatio, xmargin, ymargin) {
         var constDefaultVertexDistance, constDefaultLayerDistance, constDefaultGridSize,
         constDefaultOrientation, constDefaultMarginsize, constDefaultNodeSizeRatio,
         _nodes, vertices, stOrderedVertices, mincol, maxcol, nodeSize,
         clusterManager, currentCluster, clusters, clusterIndex, xPrevPartsExtent;
 
         constDefaultMarginsize = 5;
         constDefaultOrientation = 'north';
         constDefaultNodeSizeRatio = 50;
         constDefaultGridSize = 20;
 
         if (flow === null || flow === undefined) {
             return;
         }
         
         if (orientation === undefined || orientation === null) {
             orientation = constDefaultOrientation;
         }
 
         if (xgridSize === undefined || xgridSize <= 0) {
             xgridSize = constDefaultGridSize;
         }
 
         if (ygridSize === undefined || ygridSize <= 0) {
             ygridSize = constDefaultGridSize;
         }
 
         if (nodeSizeRatio === undefined || nodeSizeRatio <= 0) {
             nodeSizeRatio = constDefaultNodeSizeRatio;
         }
 
         if (xmargin === undefined || xmargin <= 0) {
             xmargin = constDefaultMarginsize;
         }
 
         if (ymargin === undefined || ymargin <= 0) {
             ymargin = constDefaultMarginsize;
         }
 
         nodeSize = { w: xgridSize * nodeSizeRatio / 100, h: ygridSize * nodeSizeRatio / 100 };
         mincol = 0;
         maxcol = 0;
         stOrderedVertices = [];
         vertices = [];
         var rcGraph = { x: 0, y: 0, w: 0, h: 0 };
 
         // Get the array of nodes involved in the layout
         getNodes();
 
         flowToGraph();
 
         // First we separate each connected part (cluster) of the graph.
         clusterManager = new ClusterManager(vertices);
 
         // Then we execute the layout algorithm for each cluster (horizontally from left to right)
         xPrevPartsExtent = 0;
         for (clusterIndex = 0; clusterIndex < clusters.length; clusterIndex++) {
             currentCluster = clusters[clusterIndex];
             stOrder();
             biedlKantGridEmbedding();
             normalizeCluster();
         }
 
         graphToFlow();
 
 
         function getNodes() {
             var i, _node, items;
 
             items = flow.getItems();
             _nodes = [];
             for (i in items) {
                 if (flow.isNode(items[i])) {
                     _node = items[i];
                     if (!_node.isExcludedFromLayout) {
                         _nodes.push(items[i]);
                     }
                 }
             }
         }
 
         function flowToGraph() {
             var i, j, v, u, _link, _links, dual;
 
             for (i = 0; i < _nodes.length; i++) {
                 addVertex(_nodes[i]);
             }
 
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 _links = v._node.getLinks();
                 for (j = 0; j < _links.length; j++) {
                     _link = _links[j];
                     if (_link.org === v._node) {
                         dual = _link.dst;
                         if (!_link.isExcludedFromLayout && _link.org !== _link.dst &&
                             !dual.isExcludedFromLayout) {
                             u = dual.tag;
                             addEdge(v, u, _link);
                         }
                     }
                 }
             }
         }
 
         function graphToFlow() {
             var rcGraph, v, i, e, j, x, y, _links, _link, k, pt, ptf, pt2, rc, w, h;
 
             flow.beginUpdate();
 
             orientGraph();
 
             // Size of the graph
             rcGraph = getGraphRect();
 
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 if (v._node === null) {
                     continue;
                 }
                 
                 x = v.x * xgridSize;
                 y = v.y * ygridSize;
 
                 // Translation so that coordinates are allways positive
                 x += -rcGraph.x - nodeSize.w / 2;
                 y += -rcGraph.y - nodeSize.h / 2;
 
                 // Add margins
                 x += xmargin;
                 y += ymargin;
 
                 // Save the old node position (will be used for reflexive link placement)
                 v._node.oldPosition = { x: v._node.getLeft(), y: v._node.getTop() };
 
                 // and set the new position and size of the node
                 v._node.setLeft(x);
                 v._node.setTop(y);
                 v._node.setWidth(nodeSize.w + (v.cols - 1) * xgridSize);
                 v._node.setHeight(nodeSize.h + (v.rows - 1) * ygridSize);
 
                 // We set a flag property to each link involved in the layout
                 _links = v._node.getLinks();
                 for (j = 0; j < _links.length; j++) {
                     _link = _links[j];
                     if (_link.isExcludedFromLayout) {
                         continue;
                     }
                     _link.flag = true;
 
                     // We set both following properties to true (side effect)
                     _link.setIsOrgPointAdjustable(true);
                     _link.setIsDstPointAdjustable(true);
                 }
 
                 for (j = 0; j < _links.length; j++) {
                     _link = _links[j];
 
                     // Exclude links not involved in the layout
                     if (_link.isExcludedFromLayout) {
                         continue;
                     }
 
                     // We must avoid doing the same work 2 times as a link 
                     // part of links collection of 2 nodes
                     if (_link.flag) {
                         _link.flag = false;
                     } else {
                         continue;
                     }
 
                     if (_link.org === _link.dst) {
                         // The link is reflexive
                         // Reflexive links are not taken into account by layout algorithms. 
                         // Reflexive links are just translated to follow their origin 
                         // (and also destination) node.
 
                         // Obtain the node horizontal and vertical offset
                         // Remember: we have stored the old node position
                         var xOffset = v._node.getLeft() - v._node.oldPosition.x;
                         var yOffset = v._node.getTop() - v._node.oldPosition.y;
 
                         if (_link.pinOrg !== undefined && _link.pinOrg !== null) {
                             k = 0;
                             pt = _link.points[k];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, k);
                         }
                         for (k = 1; k < _link.points.length - 1; k++) {
                             pt = _link.points[k];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, k);
                         }
                         if (_link.pinDst !== undefined && _link.pinDst !== null) {
                             k = _link.points.length - 1;
                             pt = _link.points[k];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, k);
                         }
                     }
                 }
             }
 
             // Add the link points corresponding to the bends
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     _link = e._link;
                     _link.setLineStyle('polyline');
                     if (_link.points.length > 2) {
                         _link.clearPoints();
                     }
                     for (k = 0; k < e.bends.length; k++) {
                         pt = e.bends[k];
                         ptf = { x: pt.x * xgridSize, y: pt.y * ygridSize };
 
                         // Translate so that coordinates are allways positive 
                         ptf.x -= rcGraph.x;
                         ptf.y -= rcGraph.y;
 
                         // Add margins
                         ptf.x += xmargin;
                         ptf.y += ymargin;
 
                         if (k === 0) {
                             pt2 = e.bends[1];
                             rc = { x: _link.org.x, y: _link.org.y, w: _link.org.w, h: _link.org.h };
                             if (pt.x === pt2.x) {
                                 if (pt2.y > pt.y) {
                                     ptf.y = rc.y + rc.h;
                                 } else {
                                     ptf.y = rc.y;
                                 }
                             }
                             if (pt.y === pt2.y) {
                                 if (pt2.x > pt.x) {
                                     ptf.x = rc.x + rc.w;
                                 } else {
                                     ptf.x = rc.x;
                                 }
                             }
                             _link.setPoint(ptf.x, ptf.y, 0);
                         }
                         else if (k === e.bends.length - 1) {
                             pt2 = e.bends[e.bends.length - 2];
                             rc = { x: _link.dst.x, y: _link.dst.y, w: _link.dst.w, h: _link.dst.h };
                             if (pt.x === pt2.x) {
                                 if (pt2.y > pt.y) {
                                     ptf.y = rc.y + rc.h;
                                 } else {
                                     ptf.y = rc.y;
                                 }
                             }
                             if (pt.y === pt2.y) {
                                 if (pt2.x > pt.x) {
                                     ptf.x = rc.x + rc.w;
                                 } else {
                                     ptf.x = rc.x;
                                 }
                             }
                             _link.setPoint(ptf.x, ptf.y, _link.points.length - 1);
                         }
                         else {
                             _link.addPoint(ptf.x, ptf.y);
                         }
                     }
                 }
             }
 
             flow.endUpdate();
         }
 
         function getGraphRect() {
             var i, j, k, v, e, pt, ptf, rc, rcGraph;
 
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 rc = {
                     x: v.x * xgridSize - nodeSize.w / 2,
                     y: v.y * ygridSize - nodeSize.h / 2,
                     w: nodeSize.w + (v.cols - 1) * xgridSize,
                     h: nodeSize.h + (v.rows - 1) * ygridSize
                 };
                 if (i === 0) {
                     rcGraph = rc;
                 } else {
                     rcGraph = unionRect(rcGraph, rc);
                 }
             }
 
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     if (e.org._node !== e._link.org) {
                         e.bends.reverse();
                     }
                     for (k = 0; k < e.bends.length; k++) {
                         pt = e.bends[k];
                         ptf = { x: pt.x * xgridSize, y: pt.y * ygridSize };
                         if (ptf.x < rcGraph.x) {
                             rcGraph.w += rcGraph.x - ptf.x;
                             rcGraph.x = ptf.x;
                         }
                         else if (ptf.x > (rcGraph.x + rcGraph.w)) {
                             rcGraph.w += ptf.x - (rcGraph.x + rcGraph.w);
                         }
                         if (ptf.y < rcGraph.y) {
                             rcGraph.h += rcGraph.y - ptf.y;
                             rcGraph.y = ptf.y;
                         }
                         else if (ptf.y > (rcGraph.y + rcGraph.h)) {
                             rcGraph.h += ptf.y - (rcGraph.y + rcGraph.h);
                         }
                     }
                 }
             }
             return rcGraph;
         }
 
         function unionRect(rect1, rect2) {
             var left, top, right, bottom;
 
             // We compute right and bottom before we change left and top below.
             right = Math.max(rect1.x + rect1.w, rect2.x + rect2.w);
             bottom = Math.max(rect1.y + rect1.h, rect2.y + rect2.h);
 
             left = Math.min(rect1.x, rect2.x);
             top = Math.min(rect1.y, rect2.y);
 
             return { x: left, y: top, w: right - left, h: bottom - top };
         }
 
         function addVertex(_node) {
             var v;
 
             v = new _Vertex(_node);
             _node.tag = v;
             vertices.push(v);
             return v;
         }
 
         function addEdge(org, dst, _link) {
             var e;
 
             // Note here that we do not include reflexive edges
             if (org === null || dst === null || org === dst) {
                 return null;
             }
 
             // If there is already an edge between both nodes
             if (getEdge(org, dst) !== null) {
                 return null;
             }
 
             e = new _Edge(org, dst, _link);
 
             // Add this edge to the edges collection of the origin vertex 
             // and the edges collection of the destination vertex
             org.edges.push(e);
             dst.edges.push(e);
             return e;
         }
         
         function addVirtualVertex() {
             var v;
 
             v = new _Vertex();
             currentCluster.push(v);
             return v;
         }
 
         function delVirtualVertex(v) {
             var j, e, idx;
 
             for (j = v.edges.length - 1; j >= 0; j--) {
                 e = v.edges[j];
                 delEdge(e);
             }
             idx = currentCluster.indexOf(v);
             currentCluster.splice(idx, 1); // Remove
         }
 
         function delEdge(e) {
             var idx;
 
             idx = e.org.edges.indexOf(e);
             e.org.edges.splice(idx, 1); // Remove
             idx = e.dst.edges.indexOf(e);
             e.dst.edges.splice(idx, 1); // Remove
         }
 
         function getEdge(w, x) {
             var j, e;
 
             for (j = 0; j < w.edges.length; j++) {
                 e = w.edges[j];
                 if ((e.org === w && e.dst === x) || (e.org === x && e.dst === w)) {
                     return e;
                 }
             }
             return null;
         }
 
         function orientGraph() {
             var xmax, ymax, i, v, j, e, k, pt, t;
 
             xmax = 0;
             ymax = 0;
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 if (v.y + v.rows - 1 > ymax) {
                     ymax = v.y + v.rows - 1;
                 }
                 if (v.x + v.cols - 1 > xmax) {
                     xmax = v.x + v.cols - 1;
                 }
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     for (k = 0; k < e.bends.length; k++) {
                         pt = e.bends[k];
                         if (pt.y > ymax) {
                             ymax = Math.floor(pt.y);
                         }
                         if (pt.x > xmax) {
                             xmax = Math.floor(pt.x);
                         }
                     }
                 }
             }
 
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 switch (orientation) {
                     case 'north':
                         break;
                     case 'west':
                         t = v.x;
                         v.x = v.y;
                         v.y = xmax - t;
                         t = v.cols;
                         v.cols = v.rows;
                         v.rows = t;
                         break;
                     case 'south':
                         v.x = xmax - v.x;
                         v.y = ymax - v.y - v.rows + 1;
                         break;
                     case 'east':
                         t = v.x;
                         v.x = ymax - v.y - v.rows + 1;
                         v.y = t;
                         t = v.cols;
                         v.cols = v.rows;
                         v.rows = t;
                         break;
                 }
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     for (k = 0; k < e.bends.length; k++) {
                         pt = e.bends[k];
                         switch (orientation) {
                             case 'north':
                                 break;
                             case 'west':
                                 t = Math.floor(pt.x);
                                 pt.x = pt.y;
                                 pt.y = xmax - t;
                                 break;
                             case 'south':
                                 pt.x = xmax - pt.x;
                                 pt.y = ymax - pt.y;
                                 break;
                             case 'east':
                                 t = Math.floor(pt.x);
                                 pt.x = ymax - pt.y;
                                 pt.y = t;
                                 break;
                         }
                         e.bends[k] = pt;
                     }
                 }
             }
         }
         
         // We compute a st-numbering of the graph (more precisely of a cluster of the 
         // graph).
         // If the number of ordered vertices is equal to the number of vertices in the 
         // cluster, then the cluster is biconnected and we can execute the Biedl and Kant 
         // algorithm. Otherwise we determine other blocks, create a fictitious vertex, 
         // connect it to each block via one of its vertex, storder the new graph, 
         // remove the fictitious vertex and execute the Biedl and Kant algorithm. 
         function stOrder() {
             var vertex, stEdge, leaf, totalVisitedCount, blockRootVertices, leaf2,
                 dummy, i, v, j, e, idx;
 
             if (currentCluster.length <= 1) {
                 return;
             }
 
             // First storder. If the graph is biconnected, then we can execute the 
             // Biedl and Kant algorithm.
             vertex = currentCluster[0];
             stEdge = vertex.edges[0];
             stOrderInt(stEdge);
 
             if (stOrderedVertices.length < currentCluster.length) {
                 // Not biconnected!
                 // We create the "block list", an array of of vertices, each one 
                 // representing a block. 
                 blockRootVertices = [];
                 // We find the vertex representing the first block determined by the 
                 // first storder above.
                 leaf = findLeaf();
                 // We add it in the "block list".
                 blockRootVertices.push(leaf !== null ? leaf : vertex);
 
                 // We create other blocks until all the nodes have been visited.
                 totalVisitedCount = stOrderedVertices.length;
                 while (totalVisitedCount < currentCluster.length) {
                     // We find a node not still affected in a block.
                     var w = null;
                     for (i = 0; i < currentCluster.length; i++) {
                         v = currentCluster[i];
                         if (!v.blocked) {
                             w = v;
                             break;
                         }
                     }
                     if (w !== null) {
                         // We find an edge of w such that its child node is not 
                         // still in a block.
                         stEdge = null;
                         for (j = 0; j < w.edges.length; j++) {
                             e = w.edges[j];
                             var u = w.getChild(e);
                             if (!u.blocked) {
                                 stEdge = e;
                                 break;
                             }
                         }
                         if (stEdge !== null) {
                             // Then we visit the new block
                             stOrderInt(stEdge);
                             totalVisitedCount = getBlockedVerticesCount();
                             leaf2 = findLeaf();
                             blockRootVertices.push(leaf2 !== null ? leaf2 : w);
                         } else {
                             // The vertex is alone
                             w.blocked = true;
                             w.storder = 1;
                             totalVisitedCount += 1;
                             blockRootVertices.push(w);
                         }
                     }
                 }
                 dummy = addVirtualVertex();
                 for (i = 0; i < blockRootVertices.length; i++) {
                     v = blockRootVertices[i];
                     addEdge(v, dummy, null);
                 }
                 stEdge = getEdge(blockRootVertices[0], dummy);
                 stOrderInt(stEdge);
                 idx = stOrderedVertices.indexOf(dummy);
                 stOrderedVertices.splice(idx, 1); // Remove
                 delVirtualVertex(dummy);
                 dummy = null;
             }
 
             for (i = 0; i < stOrderedVertices.length; i++) {
                 v = stOrderedVertices[i];
                 for (j = 0; j < v.edges.length; j++) {
                     e = v.edges[j];
                     if (e.org.storder > e.dst.storder) {
                         e.orient(e.dst, e.org);
                     }
                     if (e.org === v) {
                         v.outEdges.push(e);
                     } else {
                         v.inEdges.push(e);
                     }
                 }
                 currentCluster[i] = v;
             }
         }
         
         function getBlockedVerticesCount() {
             var count, v, i;
 
             count = 0;
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 if (v.blocked) {
                     count++;
                 }
             }
             return count;
         }
         
         // Find a vertex in a block whose children are also in the block
         function findLeaf() {
             var vertex, v, i, u, e, j, inside;
 
             vertex = null;
             for (i = 0; i < stOrderedVertices.length; i++) {
                 v = stOrderedVertices[i];
                 inside = true;
                 for (j = 0; j < v.edges.length; j++) {
                     e = v.edges[j];
                     u = v.getChild(e);
                     if (u.storder === 0) {
                         inside = false;
                         break;
                     }
                 }
                 if (inside) {
                     vertex = v;
                     break;
                 }
             }
             return vertex;
         }
         
         function normalizeCluster() {
             var v, i, e, j, pt, k, clusterGridExtent, ymax;
 
             // Offset all grid coordinates so that none is negative
             clusterGridExtent = 0;
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 v.x -= (mincol - 1);
                 clusterGridExtent = Math.max(clusterGridExtent, v.x);
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     for (k = 0; k < e.bends.length; k++) {
                         pt = e.bends[k];
                         pt.x -= (mincol - 1);
                         e.bends[k] = pt;
                         clusterGridExtent = Math.max(clusterGridExtent, Math.floor(pt.x));
                     }
                 }
             }
 
             // Offset the grid coordinates of each vertex and each bend of each edge
             // to take account of the previous clusters.
             ymax = 0;
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 if (v.y + v.rows - 1 > ymax) {
                     ymax = v.y + v.rows - 1;
                 }
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     for (k = 0; k < e.bends.length; k++) {
                         pt = e.bends[k];
                         if (pt.y > ymax) {
                             ymax = Math.floor(pt.y);
                         }
                     }
                 }
             }
 
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 v.x += xPrevPartsExtent;
                 v.y = ymax - v.y - v.rows + 1;
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     for (k = 0; k < e.bends.length; k++) {
                         pt = e.bends[k];
                         pt.x += xPrevPartsExtent;
                         pt.y = ymax - pt.y;
                         e.bends[k] = pt;
                     }
                 }
             }
 
             xPrevPartsExtent += 1 + clusterGridExtent;
         }
 
         // Biedl and Kant algorithm
         function biedlKantGridEmbedding() {
             var col, row, i, v, v1, v2, e12;
 
             mincol = 0;
             maxcol = 0;
 
             // Current row index
             row = 0;
 
             // Place first vertex
             v1 = currentCluster[0];
             placeVertex(v1, 0, row);
             row += v1.rows;
             if (currentCluster.length <= 1) {
                 return;
             }
 
             // Place second vertex
             v2 = currentCluster[1];
             col = Math.max(v1.outEdges.length + v2.outEdges.length - 2, 1);
             placeVertex(v2, col, row);
             row += v2.rows;
 
             // Create the edge between first two vertices
             e12 = getEdge(v1, v2);
             e12.allocatedColumn = 0;
             e12.bends.push({ x: v1.x, y: v1.y });
             e12.bends.push({ x: v1.x, y: -1 });
             e12.bends.push({ x: v2.x, y: -1 });
             e12.bends.push({ x: v2.x, y: v2.y });
 
             // Allocate columns for other "out" edges of v1
             // Remarks: 
             // - e12 has already been placed.
             // - v1 has not any "in" edge.
             allocateColumns1(v1, e12);
 
             // Allocate columns for "out" edges of v2
             allocateColumns(v2);
 
             for (i = 2; i < currentCluster.length; i++) {
                 v = currentCluster[i];
 
                 // Place v on a column allocated to an "in" edge.
                 // If possible, avoid the leftmost or rightmost column.
                 // Therefore we sort the "in" edges on the allocatedColumn value.
                 // and we place the vertex above the medium edge.
                 placeVertex(v, getAllocatedColumn(v), row);
 
                 // One or several rows may have been allocated for drawing this vertex.
                 // Only one row if the degree of that vertex is less than four.
                 row += v.rows;
 
                 // Draw "in" edges
                 drawInEdges(v);
 
                 // Allocate columns for out edges
                 allocateColumns(v);
             }
 
             // Return the horizontal position of the vertex to place
             function getAllocatedColumn(v) {
                 var k, columnEdge;
 
                 v.inEdges.sort(function (e1, e2) {
                     var c1, c2;
 
                     c1 = e1.allocatedColumn;
                     c2 = e2.allocatedColumn;
                     return (c1 === c2) ? 0 : (c1 < c2 ? -1 : 1);
                 });
                 k = Math.floor((v.inEdges.length + 1) / 2);
                 columnEdge = v.inEdges[k - 1];
                 return columnEdge.allocatedColumn;
             }
 
             function drawInEdges(v) {
                 var k, j, e, offset;
 
                 k = Math.floor((v.inEdges.length + 1) / 2);
                 for (j = 0; j < v.inEdges.length; j++) {
                     e = v.inEdges[j];
                     /*if (e.org._node.Text === "a" && e.dst._node.Text === "e") {
                         int l = 0;
                         l++;
                     }*/
                     offset = Math.abs(k - 1 - j);
                     if (offset === 0) {
                         e.bends.push({ x: v.x, y: v.y });
                     } else {
                         e.bends.push({ x: e.allocatedColumn, y: v.y + offset - 1 });
                         e.bends.push({ x: v.x, y: v.y + offset - 1 });
                     }
                 }
             }
 
             function allocateColumns1(v, e12) {
                 var k, j, i, offset, e;
 
                 k = Math.floor((v.outEdges.length - 1) / 2);
                 i = 0;
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     if (e === e12) {
                         continue;
                     }
                     offset = Math.abs(k - i);
                     if (offset === 0) {
                         e.bends.push({ x: v.x, y: v.y });
                         allocateColumn(e, v.x);
                     } else {
                         if (i < k) {
                             allocateColumn(e, mincol - 1);
                         } else {
                             allocateColumn(e, maxcol + 1);
                         }
                         e.bends.push({ x: v.x, y: v.y + v.rows - offset });
                         e.bends.push({ x: e.allocatedColumn, y: v.y + v.rows - offset });
                     }
                     i++;
                 }
             }
 
             function allocateColumns(v) {
                 var k, j, i, e, offset;
 
                 k = Math.floor(v.outEdges.length / 2);
                 i = 0;
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     offset = Math.abs(k - i);
                     if (offset === 0) {
                         e.bends.push({ x: v.x, y: v.y });
                         allocateColumn(e, v.x);
                     } else {
                         if (i < k) {
                             allocateColumn(e, mincol - 1);
                         } else {
                             allocateColumn(e, maxcol + 1);
                         }
                         e.bends.push({ x: v.x, y: v.y + v.rows - offset });
                         e.bends.push({ x: e.allocatedColumn, y: v.y + v.rows - offset });
                     }
                     i++;
                 }
             }
 
             function allocateColumn(e, col) {
                 e.allocatedColumn = col;
                 if (col < mincol) {
                     mincol = col;
                 }
                 if (col > maxcol) {
                     maxcol = col;
                 }
             }
 
             function placeVertex(v, x, y) {
                 var r, count;
 
                 v.x = x;
                 v.y = y;
 
                 r = 1;
                 count = v.edges.length;
                 if (count > 4) {
                     r += Math.floor((count - 2) / 2);
                 } else if (count === 4 && v === currentCluster[currentCluster.length - 1]) {
                     r += 1;
                 }
                 v.rows = r;
                 v.cols = 1;
             }
         }
 
         function stOrderInt(e) {
             var s, t, i, v;
 
             resetCluster();
             s = e.org;
             t = e.dst;
             e.isVisited = true;
             s.isVisited = true;
             s.currentChild = t;
             s.currentEdge = e;
             stOrderedVertices = [];
             stOrderedVertices.push(s);
             stOrderedVertices.push(t);
 
             DFS(t);
 
             for (i = 0; i < stOrderedVertices.length; i++) {
                 v = stOrderedVertices[i];
                 v.storder = i + 1;
                 v.blocked = true;
             }
 
             return stOrderedVertices;
 
             function DFS(v) {
                 var e, j, w, x;
 
                 v.isVisited = true;
 
                 for (j = 0; j < v.edges.length; j++) {
                     e = v.edges[j];
                     if (!e.isVisited) {
                         e.isVisited = true;
                         w = v.getChild(e);
                         e.orient(v, w);
                         v.currentEdge = e;
                         v.currentChild = w;
                         if (!w.isVisited) {
                             // Tree edge
                             DFS(w);
                         } else {
                             // Back edge
                             // Let x be the current child of w
                             x = w.currentChild;
 
                             // Make the back link v -> w depend on w -> x
                             // We add also the path x -> v
                             makeDependance(v, w, x, e);
 
                             // If x belongs to L, process ears w -> x
                             if (stOrderedVertices.indexOf(x) > -1) {
                                 processEars(w, x);
                             }
                         }
                     }
                 }
             }
 
             // If w -> x is oriented, the ear of the back edge v -> w is oriented in
             // the same direction and inserted into the ordering.
             function processEars(w, x) {
                 var edge_wx, j, e, v, edge_vw, u, P, index, i;
 
                 // For Each back link v -> w depending on w -> x
                 edge_wx = getEdge(w, x);
                 for (j = 0; j < edge_wx.dependList.length; j++) {
                     e = edge_wx.dependList[j];
                     v = e.org;
 
                     // Determine u in L and in the path x -> v and closest to v
                     edge_vw = getEdge(v, w);
                     u = getLastSTOrderedVertexInTreePath(edge_vw);
 
                     // Set P to path u -> v + back link v -> w
                     P = getEar(u, w, edge_vw);
 
                     // If w->x oriented from w to x
                     if (stOrderedVertices.indexOf(w) < stOrderedVertices.indexOf(x)) {
                         // Orient P from w to u
                         P.reverse();
                         // Insert inner vertices of P in L right before u
                         index = stOrderedVertices.indexOf(u);
                         for (i = 1; i < P.length - 1; i++) {
                             stOrderedVertices.splice(index + i - 1, 0, P[i]);
                         }
                         P.reverse();
                     } else {
                         // Inset inner vertices of P in L right after u
                         index = stOrderedVertices.indexOf(u);
                         for (i = 1; i < P.length - 1; i++) {
                             stOrderedVertices.splice(index + i, 0, P[i]);
                         }
                     }
 
                     // For each tree edge of P, "process ears"
                     for (i = 0; i < P.length - 2; i++) {
                         processEars(P[i], P[i + 1]);
                     }
                 }
                 edge_wx.dependList = [];
             }
 
             function makeDependance(v, w, x, e) {
                 var y;
 
                 e.path.push(w);
                 y = x;
                 for (; ;) {
                     e.path.push(y);
                     if (y === v) {
                         break;
                     }
                     y = y.currentChild;
                 }
                 w.currentEdge.dependList.push(e);
             }
 
             function getLastSTOrderedVertexInTreePath(edge) {
                 var u, v, i;
 
                 u = null;
                 for (i = 0; i < edge.path.length; i++) {
                     v = edge.path[i];
                     if (stOrderedVertices.indexOf(v) > -1) {
                         u = v;
                     }
                 }
                 return u;
             }
 
             function getEar(u, w, edge) {
                 var P, i, z;
 
                 P = [];
                 for (i = edge.path.indexOf(u); i < edge.path.length; i++) {
                     z = edge.path[i];
                     P.push(z);
                 }
                 P.push(w);
                 return P;
             }
 
             function resetCluster() {
                 var v, i, e, j;
 
                 for (i = 0; i < currentCluster.length; i++) {
                     v = currentCluster[i];
                     v.isVisited = false;
                     v.storder = 0;
                     v.currentChild = null;
                     v.currentEdge = null;
                     for (j = 0; j < v.edges.length; j++) {
                         e = v.edges[j];
                         e.isVisited = false;
                         e.dependList = [];
                         e.path = [];
                     }
                 }
             }
         }
 
         function ClusterManager() {
             var visitedCount, clusterCount;
 
             this.separateConnectedParts = function () {
                 var vertex, v, i;
 
                 visitedCount = 0;
                 clusterCount = 0;
                 while (visitedCount < vertices.length) {
                     // Find the first available vertex
                     vertex = null;
                     for (i = 0; i < vertices.length; i++) {
                         v = vertices[i];
                         if (v.owningClusterIndex === 0) {
                             clusterCount++;
                             vertex = v;
                             break;
                         }
                     }
 
                     // Depth first search
                     if (vertex !== null) {
                         visitVertex(vertex);
                     }
                 }
 
                 fillClusters();
             }();
 
             // We execute a "depth-first search" algorithm and we start with the vertex
             // passed in parameter.
             function visitVertex(vertex) {
                 var v, i, e, j;
 
                 vertex.owningClusterIndex = clusterCount;
                 visitedCount++;
                 for (j = 0; j < vertex.edges.length; j++) {
                     e = vertex.edges[j];
                     v = (vertex === e.org) ? e.dst : e.org;
                     if (v.owningClusterIndex === 0) {
                         visitVertex(v);
                     }
                 }
             }
 
             function fillClusters() {
                 var i, k, v;
 
                 // Allocate an array of cluster, each cluster being a list of vertices
                 clusters = new Array(clusterCount);
                 for (k = 0; k < clusterCount; k++) {
                     clusters[k] = [];
                 }
 
                 // Fill clusters
                 for (i = 0; i < vertices.length; i++) {
                     v = vertices[i];
                     clusters[v.owningClusterIndex - 1].push(v);
                 }
             }
         }
 
         // Returns a vertex object.
         function _Vertex(_node) {
             var that;
 
             this._node = _node;              // Corresponding node
             this.edges = [];
             this.inEdges = [];
             this.outEdges = [];
             this.isVisited = false;
             this.owningClusterIndex = 0;
             this.storder = 0;
             this.blocked = false;
             this.x = 0;
             this.y = 0;
             this.rows = 0;
             this.cols = 0;
             this.currentChild = null;      // used for st-ordering
             this.currentEdge = null;       // used for st-ordering
 
             that = this;
             
             this.getChild = function(e) {
                 return (that === e.org) ? e.dst : e.org;
             };
         }
 
         // Returns a Edge object
         function _Edge(org, dst, _link) {
             var that;
 
             this.org = org;
             this.dst = dst;
             this._link = _link;
             this.isVisited = false;
             this.bends = [];
             this.allocatedColumn = 0;
             this.path = []; // used for st-ordering
             this.dependList = []; // used for st-ordering
 
             that = this;
 
             this.orient = function (w, x) {
                 that.org = w;
                 that.dst = x;
             };
         }
     },
 
 
     //------------------------------------------------------------------------
     // HIERARCHIC
     // We use some algorithms described in the book "Graphs Drawing", chapter 9
     //------------------------------------------------------------------------
 
     /** @Hierarchic performs a hierarchical layout. 
     By default, the algorithm applies on all items (nodes and links). 
     However you may exclude an item by setting its isExcludedFromLayout property to true.
     @param flow The flow control
     @param [layerDistance] The distance between two adjacent layers
     @param [vertexDistance] The distance between two adjacent vertices
     @param [orientation] The graph layout orientation (north, east, south, west)
     @param [xmargin] The horizontal margin size
     @param [ymargin] The vertical margin size 
     @param [layerWidth] The maximum number of vertices in a layer. If it is 0, then 
     there is no maximum number of vertices.
     */
 
     Hierarchic: function (flow, layerDistance, vertexDistance, orientation,
         xmargin, ymargin, layerWidth) {
         var constDefaultVertexDistance, constDefaultLayerDistance,
             constDefaultOrientation, constDefaultMarginsize, constDefaultLayerWidth,
             _nodes, vertices, orderedVertices, xDelta, layerMax, layer, method, S, T,
             clusterManager, currentCluster, clusters, clusterIndex, xPrevPartsExtent,
             constCrossOutFixed, constCrossInFixed, constCrossInOutFixed,
             constCxDummy, constCyDummy, constMaxIter, constIter, constStartTemp,
             constFinalTemp, constOscillation, constSkew, constRotation, constGravity,
             constStep, distsqr, step, oscillation, skew, rotation, gravity, shake, maxTemp,
             startTemp, stopTemp, finalTemp, temperature, iterations;
         
         constCrossOutFixed = '0';
         constCrossInFixed = '1';
         constCrossInOutFixed = '2';
         constDefaultVertexDistance = 50;
         constDefaultLayerDistance = 50;
         constDefaultMarginsize = 5;
         constDefaultOrientation = 'north';
         constDefaultLayerWidth = 0;
         constCxDummy = 2;
         constCyDummy = 2;
         constMaxIter = 50;
         constIter = 3;
         var constMaxTemp = 1.5;
         constStartTemp = 0.06;
         constFinalTemp = 0.05;
         constOscillation = 0.4;
         constSkew = 0.9;
         constRotation = 1.0;
         constGravity = 0.01;
         constStep = 1.0;
 
         if (flow === null || flow === undefined) {
             return;
         }
 
         if (vertexDistance === undefined || vertexDistance <= 0) {
             vertexDistance = constDefaultVertexDistance;
         }
 
         if (layerDistance === undefined || layerDistance <= 0) {
             layerDistance = constDefaultLayerDistance;
         }
 
         if (orientation === undefined || orientation === null) {
             orientation = constDefaultOrientation;
         }
 
         if (xmargin === undefined || xmargin <= 0) {
             xmargin = constDefaultMarginsize;
         }
 
         if (ymargin === undefined || ymargin <= 0) {
             ymargin = constDefaultMarginsize;
         }
 
         if (layerWidth === undefined || layerWidth < 0) {
             layerWidth = constDefaultLayerWidth;
         }
 
         S = [];
         T = [];
         vertices = [];
         var rcGraph = { x: 0, y: 0, w: 0, h: 0 };
         var layers = [];
         method = "m0ub2db2ua1da0u"; // Default method for crossing reduction
 
         // Get the array of nodes involved in the layout
         getNodes();
 
         flowToGraph();
 
         // First we separate each connected part (cluster) of the graph.
         clusterManager = new ClusterManager(vertices);
 
         // This value is used in the Crossing Reduction step.
         xDelta = vertexDistance / 2;
 
         // Then we execute the layout algorithm for each cluster (horizontally from left to right)
         xPrevPartsExtent = 0;
         for (clusterIndex = 0; clusterIndex < clusters.length; clusterIndex++) {
             currentCluster = clusters[clusterIndex];
             hierLayout();
         }
 
         graphToFlow();
 
         function getNodes() {
             var i, _node, items;
 
             items = flow.getItems();
             _nodes = [];
             for (i in items) {
                 if (flow.isNode(items[i])) {
                     _node = items[i];
                     if (!_node.isExcludedFromLayout) {
                         _nodes.push(items[i]);
                     }
                 }
             }
         }
 
         function flowToGraph() {
             var i, j, v, u, _link, _links, dual;
 
             for (i = 0; i < _nodes.length; i++) {
                 addVertex(_nodes[i]);
             }
 
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 _links = v._node.getLinks();
                 for (j = 0; j < _links.length; j++) {
                     _link = _links[j];
                     if (_link.org === v._node) {
                         dual = _link.dst;
                         if (!_link.isExcludedFromLayout && _link.org !== _link.dst && 
                             !dual.isExcludedFromLayout) {
                             u = dual.tag;
                             addEdge(v, u, _link);
                         }
                     }
                 }
             }
         }
 
         function graphToFlow() {
             var rcGraph, t, pt, pt2, i, j, k, v, _links, _link, x, y, xOffset, yOffset;
 
             flow.beginUpdate();
 
             rcGraph = getGraphRect();
 
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 x = v.x;
                 y = v.y;
 
                 // Store the old node position
                 v._node.oldPosition = { x: v._node.getLeft(), y: v._node.getTop() };
 
                 // Translation so that coordinates are allways positive
                 x -= rcGraph.x;
                 y -= rcGraph.y;
 
                 // Take account of orientation
                 switch (orientation) {
                     case 'north':
                         break;
                     case 'west':
                         t = x;
                         x = y;
                         y = rcGraph.w - t;
                         t = v.w;
                         v.w = v.h;
                         v.h = t;
                         break;
                     case 'south':
                         x = rcGraph.w - x;
                         y = rcGraph.h - y;
                         break;
                     case 'east':
                         t = x;
                         x = rcGraph.h - y;
                         y = t;
                         t = v.w;
                         v.w = v.h;
                         v.h = t;
                         break;
                 }
 
                 // Take account of the size of the node
                 x -= v.w / 2;
                 y -= v.h / 2;
 
                 // Add margins 
                 x += xmargin;
                 y += ymargin;
 
                 v._node.setLeft(x);
                 v._node.setTop(y);
 
                 // We set a flag property to each link involved in the layout
                 _links = v._node.getLinks();
                 for (j = 0; j < _links.length; j++) {
                     _link = _links[j];
                     if (_link.isExcludedFromLayout) {
                         continue;
                     }
                     _link.flag = true;
 
                     // We set both following properties to false (side effect)
                     _link.setIsOrgPointAdjustable(false);
                     _link.setIsDstPointAdjustable(false);
                 }
             }
 
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 _links = v._node.getLinks();
 
                 for (j = 0; j < _links.length; j++) {
                     _link = _links[j];
 
                     // Exclude links not involved in the layout
                     if (_link.isExcludedFromLayout) {
                         continue;
                     }
 
                     // We must avoid doing the same work 2 times as a link 
                     // part of links collection of 2 _nodes
                     if (_link.flag) {
                         _link.flag = false;
                     } else {
                         continue;
                     }
 
                     if (_link.org !== _link.dst) {
                         // Normal case: the link is not reflexive
                         _link.setLineStyle('polyline');
                         if (_link.points.length > 2) {
                             _link.clearPoints();
                         }
                         if (_link.pinOrg !== undefined && _link.pinOrg !== null) {
                             xOffset = _link.org.getLeft() - _link.org.oldPosition.x;
                             yOffset = _link.org.getTop() - _link.org.oldPosition.y;
                             pt = _link.points[0];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, 0);
                         }
                         if (_link.pinDst !== undefined && _link.pinDst !== null) {
                             xOffset = _link.dst.getLeft() - _link.dst.oldPosition.x;
                             yOffset = _link.dst.getTop() - _link.dst.oldPosition.y;
                             pt = _link.points[1];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, 1);
                         }
                     } else {
                         // The link is reflexive
                         // Reflexive links are not taken into account by layout algorithms. 
                         // Reflexive links are just translated to follow their origin 
                         // (and also destination) node.
 
                         // Obtain the node horizontal and vertical offset
                         // Remember: we have stored the old node position
                         xOffset = v._node.getLeft() - v._node.oldPosition.x;
                         yOffset = v._node.getTop() - v._node.oldPosition.y;
 
                         if (_link.pinOrg !== undefined && _link.pinOrg !== null) {
                             k = 0;
                             pt = _link.points[k];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, k);
                         }
                         for (k = 1; k < _link.points.length - 1; k++) {
                             pt = _link.points[k];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, k);
                         }
                         if (_link.pinDst !== undefined && _link.pinDst !== null) {
                             k = _link.points.length - 1;
                             pt = _link.points[k];
                             _link.setPoint(pt.x + xOffset, pt.y + yOffset, k);
                         }
                     }
                 }
             }
             
             // Add the link points corresponding to the dummy nodes 
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 for (j = 0; j < v.outEdges.length; j++) {
                     var e = v.outEdges[j];
                     if (e.bends.length > 0) {
                         // Dummy nodes have been added and replaced by points
                         for (k = 0; k < e.bends.length; k++) {
                             pt = e.bends[k];
                             pt2 = pt;
 
                             // Translation so that coordinates are allways positive
                             pt2.x -= rcGraph.x;
                             pt2.y -= rcGraph.y;
 
                             switch (orientation) {
                                 case 'north':
                                     break;
                                 case 'west':
                                     t = pt2.x;
                                     pt2.x = pt2.y;
                                     pt2.y = rcGraph.w - t;
                                     break;
                                 case 'south':
                                     pt2.x = rcGraph.w - pt2.x;
                                     pt2.y = rcGraph.h - pt2.y;
                                     break;
                                 case 'east':
                                     t = pt2.x;
                                     pt2.x = rcGraph.h - pt2.y;
                                     pt2.y = t;
                                     break;
                             }
 
                             // Add margins 
                             pt2.x += xmargin;
                             pt2.y += ymargin;
 
                             e._link.addPoint(pt2.x, pt2.y);
                         }
                     }
                 }
             }
             flow.endUpdate();
         }
 
         function addVertex(_node) {
             var v;
 
             v = new _Vertex(_node);
             _node.tag = v;
 
             // This field is used for reflexive links
             v.ptOld = { x: _node.x, y: _node.y };
 
             var rc = {
                 x: _node.getLeft() - _node.getWidth() / 2,
                 y: _node.getTop() - _node.getHeight() / 2,
                 w: _node.getWidth(),
                 h: _node.getHeight()
             };
 
             v.x = rc.x + rc.w / 2;
             v.y = rc.y + rc.h / 2;
 
             if (orientation === 'north' || orientation === 'south') {
                 v.w = rc.w;
                 v.h = rc.h;
             } else {
                 v.w = rc.h;
                 v.h = rc.w;
             }
 
             vertices.push(v);
         }
         
         function addVirtualVertex() {
             var v;
 
             v = new _Vertex();
             currentCluster.push(v);
             return v;
         }
 
         function delVirtualVertex(v) {
             var j, e, idx;
 
             for (j = v.outEdges.length - 1; j >= 0; j--) {
                 e = v.outEdges[j];
                 delEdge(e);
             }
             for (j = v.inEdges.length - 1; j >= 0; j--) {
                 e = v.inEdges[j];
                 delEdge(e);
             }
             idx = currentCluster.indexOf(v);
             currentCluster.splice(idx, 1); // Remove
         }
         
         function addEdge(org, dst, _link) {
             var e;
 
             // Note here that we do not include reflexive edges
             if (org === null || dst === null || org === dst) {
                 return null;
             }
 
             e = new _Edge(org, dst, _link);
 
             // Add this edge to the edges collection of the origin vertex 
             // and the edges collection of the destination vertex
             org.outEdges.push(e);
             dst.inEdges.push(e);
             return e;
         }
 
         function delEdge(e) {
             var idx;
 
             idx = e.org.outEdges.indexOf(e);
             e.org.outEdges.splice(idx, 1); // Remove
             idx = e.dst.inEdges.indexOf(e);
             e.dst.inEdges.splice(idx, 1); // Remove
         }
         
         function getGraphRect() {
             var i, j, k, v, e, pt, rc, rcGraph;
             
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 rc = { x: v.x - v.w / 2,  y: v.y - v.h / 2, w: v.w, h: v.h };
                 if (i === 0) {
                     rcGraph = rc;
                 } else {
                     rcGraph = unionRect(rcGraph, rc);
                 }
             }
             
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     for (k = 0; k < e.bends.length; k++) {
                         pt = e.bends[k];
                         if (pt.x < rcGraph.x) {
                             rcGraph.w += rcGraph.x - pt.x;
                             rcGraph.x = pt.x;
                         } else if (pt.x > rcGraph.x + rcGraph.w) {
                             rcGraph.w += pt.x - (rcGraph.x + rcGraph.w);
                         }
                         if (pt.y < rcGraph.y) {
                             rcGraph.h += rcGraph.y - pt.y;
                             rcGraph.y = pt.y;
                         }
                         else if (pt.y > rcGraph.y + rcGraph.h) {
                             rcGraph.h += pt.y - (rcGraph.y + rcGraph.h);
                         }
                     }
                 }
             }
             return rcGraph;
         }
 
         function unionRect(rect1, rect2) {
             var left, top, right, bottom;
 
             // We compute right and bottom before we change left and top below.
             right = Math.max(rect1.x + rect1.w, rect2.x + rect2.w);
             bottom = Math.max(rect1.y + rect1.h, rect2.y + rect2.h);
 
             left = Math.min(rect1.x, rect2.x);
             top = Math.min(rect1.y, rect2.y);
 
             return { x: left, y: top, w: right - left, h: bottom - top };
         }
         
         function hierLayout() {
             var i, v, rc;
 
             cycleRemoval();        // STEP 0
             layerAssignment();     // STEP 1
             crossingReduction();   // STEP 2
             horzCoordAssignment(); // STEP 3
 
             // Translate coordinates so that none is negative
             rcGraph = { x: 0, y: 0, w: 0, h: 0 };
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 rc = { x: v.x - v.w / 2,  y: v.y - v.h / 2, w: v.w, h: v.h };
                 if (i === 0) {
                     rcGraph = rc;
                 } else {
                     rcGraph = unionRect(rcGraph, rc);
                 }
             }
 
             // Assign new position
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 // Add margins, cluster offsets and translate to left-top corner of the area
                 v.x += xPrevPartsExtent - rcGraph.x;
                 v.y += -rcGraph.y;
             }
 
             xPrevPartsExtent += xDelta + rcGraph.w;
 
             // Remove dummy vertices added at the end of step 1 (layer assignment)
             removeDummyVertices();
 
             // Restore cycles (that were removed during step 0)
             cycleRecreate();
         }
 
 
         // STEP 0
         // Cycle removal: temporarily reverses the direction of a subset of edges
         // to make the digraph acyclic.
         // We use the Greedy-Cycle-Removal algorithm ("Graphs Drawing", page 297).
         // Each cycle of a digraph must have at least one edge pointing "against 
         // the graph". We need to keep the number of edges appearing "against the 
         // graph" small.
 
         function cycleRemoval() {
             var i, v, j, e, u, 
                 found, inDegree, outDegree, maxOutLessIn, countSr, countSl, 
                 currentVertices, outEdges;
 
             countSr = 0;
             countSl = 0;
             currentVertices = currentCluster.length;
             orderedVertices = new Array(currentVertices);
 
             // We build the vertices sequence inducing a small set of leftward edges.  
             do {
                 // Sinks
                 do {
                     found = false;
                     for (i = 0; i < currentCluster.length; i++) {
                         v = currentCluster[i];
                         outDegree = 0;
                         for (j = 0; j < v.outEdges.length; j++) {
                             e = v.outEdges[j];
                             if (!e.dst.used) {
                                 outDegree++;
                             }
                         }
                         if (outDegree === 0 && !v.used) {
                             // Remove the sink from the graph
                             v.used = true;
                             currentVertices--;
                             found = true;
                             // Get the first sink and add it at the begin of list Sr
                             orderedVertices[currentCluster.length - countSr - 1] = v;
                             countSr++;
                             break;
                         }
                     }
                     if (!found) {
                         break;
                     }
                 }
                 while (true);
 
                 // Sources
                 do {
                     found = false;
                     for (i = 0; i < currentCluster.length; i++) {
                         v = currentCluster[i];
                         inDegree = 0;
                         for (j = 0; j < v.inEdges.length; j++) {
                             e = v.inEdges[j];
                             if (!e.org.used) {
                                 inDegree++;
                             }
                         }
                         if (inDegree === 0 && !v.used) {
                             // Remove the sink from the graph
                             v.used = true;
                             currentVertices--;
                             found = true;
                             // Get the first source and add it at the end of list Sl
                             orderedVertices[countSl] = v;
                             countSl++;
                             break;
                         }
                     }
                     if (!found) {
                         break;
                     }
                 }
                 while (true);
 
                 // Choose a vertex such that the difference "outdeg - indeg" is maximum
                 maxOutLessIn = 0;
                 found = false;
                 u = null;
                 for (i = 0; i < currentCluster.length; i++) {
                     v = currentCluster[i];
                     inDegree = 0;
                     outDegree = 0;
                     for (j = 0; j < v.outEdges.length; j++) {
                         e = v.outEdges[j];
                         if (!e.dst.used) {
                             outDegree++;
                         }
                     }
                     for (j = 0; j < v.inEdges.length; j++) {
                         e = v.inEdges[j];
                         if (!e.org.used) {
                             inDegree++;
                         }
                     }
                     if (outDegree - inDegree >= maxOutLessIn && !v.used) {
                         v.used = true;
                         currentVertices--;
                         found = true;
                         u = v;
                         maxOutLessIn = outDegree - inDegree;
                         break;
                     }
                 }
                 if (found) {
                     orderedVertices[countSl] = u;
                     countSl++;
                 }
             }
             while (currentVertices > 0);
             
             for (i = 0; i < orderedVertices.length; i++) {
                 v = orderedVertices[i];
                 v.order = i;
             }
 
             // Reverse the edges that must be reversed (isReversed = true)
             outEdges = [];
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 outEdges = v.outEdges.slice();
                 for (j = 0; j < outEdges.length; j++) {
                     e = outEdges[j];
                     if (e.dst.order < e.org.order) {
                         e.isReversed = true;
                         e.reverseDirection();
                     }
                 }
             }
         }
 
         function cycleRecreate() {
             var v, i, e, j, outEdges;
 
             outEdges = [];
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 outEdges = v.outEdges.slice();
                 for (j = 0; j < outEdges.length; j++) {
                     e = outEdges[j];
                     if (e.isReversed) {
                         e.isReversed = false;
                         e.reverseDirection();
                     }
                 }
             }
         }
 
         // Step 1: Layer Assignment
         // 2 methods are available: 
         // - the Longest Path Layering algorithm
         // - "Coffman Graham Layering" algorithm
 
         function layerAssignment() {
             layerMax = 0;
             if (layerWidth > 0) {
                 coffmanGrahamLayering(layerWidth);
             } else {
                 longestPathLayering();
             }
             addDummyVertices();
             createLayers();
         }
 
         // We use the "Coffman Graham Layering" algorithm ("Graphs Drawing", p 275)
         // Note that it works with reduced digraph.
         // This algorithm has 2 phases:
         // - the first orders vertices
         // - the second assigns vertices to layers
         function coffmanGrahamLayering(width) {
             var countU, k, L, S, T, maxInDegree, i, v;
 
             L = [];
             S = [];
             T = [];
             maxInDegree = 0;
             for (i = 0; i < vertices.length; i++) {
                 v = vertices[i];
                 if (v.inEdges.length > maxInDegree) {
                     maxInDegree = v.inEdges.length;
                 }
             }
 
             // Order vertices
             for (k = 0; k < currentCluster.length; k++) {
                 // Choose an unlabeled vertex such that the set of labels of its
                 // immediate predecessors is minimized.
                 v = findNextVerticeToLabel();
                 if (v !== null) {
                     v.label = k + 1;
                 }
             }
 
             // Assign vertices to layers
             countU = 0;
             k = 0;
             L.push(0);
 
             do {
                 // (a) Choose a vertex which has not been placed in one of the
                 // layers L1, ... Lk-1. If there is more than one such vertex,
                 // then we choose the one with the largest label.
                 v = findNextVerticeToPlace(k + 1);
 
                 // (b) If layer full or no candidate vertex, then proceed to the next layer.
                 // Otherwise, place the vertex at the layer k.
                 if (v === null || L[k] === width) {
                     k++;
                     L.push(0);
                 }
                 if (v !== null) {
                     L[k]++;
                     v.layerIndex = k + 1;
                     countU++;
                 }
             } while (countU < currentCluster.length);
 
             layerMax = k + 1;
         }
 
         
         function findNextVerticeToPlace(layerIndex) {
             var candidate, isCandidate, v, i, e, j, label, layerIndexDst;
 
             candidate = null;
             label = 0;
             
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 // If the vertex is not still placed in a layer and if its destinations
                 // are placed, then select it if it has the largest label.
                 if (v.layerIndex === 0) {
                     isCandidate = true;
                     for (j = 0; j < v.outEdges.length; j++) {
                         e = v.outEdges[j];
                         layerIndexDst = e.dst.layerIndex;
                         if (layerIndexDst === 0 || layerIndexDst === layerIndex) {
                             isCandidate = false;
                             break;
                         }
                     }     
                     if (isCandidate) {
                         if (v.label > label) {
                             label = v.label;
                             candidate = v;
                         }
                     }
                 }
             }
             return candidate;
         }
 
         function findNextVerticeToLabel() {
             var candidate, sizeS, sizeT, v, i, e, j, k, labelsAssignedToPriorVertices;
 
             candidate = null;
             sizeS = 0
             
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 // If no label has been assigned to this vertex...
                 if (v.label === 0) {
                     sizeT = v.inEdges.length;
                     if (sizeT === 0) {
                         candidate = v;
                         sizeS = sizeT;
                     } else {
                         k = 0;
                         labelsAssignedToPriorVertices = true;
                         for (j = 0; j < v.inEdges.length; j++) {
                             e = v.inEdges[j];
                             if (e.org.label === 0) {
                                 labelsAssignedToPriorVertices = false;
                                 break;
                             } else {
                                 T[k] = e.org.label;
                                 k++;
                             }
                         }
 
                         // If labels have been assigned to all immediate predecessors ...
                         if (labelsAssignedToPriorVertices) {
                             // Retain this vertex if its set of immediate predecessors
                             // is minimized
                             if (candidate === null || 
                                 compareSets(S, T, sizeS, sizeT) > 0) {
                                 candidate = v;
                                 sizeS = sizeT;
                                 if (sizeS > 0) {
                                     for (k = 0; k < sizeS; k++) {
                                         S[k] = T[k];
                                     }
                                 }
                             }
                         }
                     }
                 }
             }
             return candidate;
         }
 
         function compareSets(S, T, sizeS, sizeT) {
             var indexMaxS, indexMaxT, k;
 
             if (sizeS === 0 && sizeT === 0) {
                 return 0;
             } else if (sizeS === 0 && sizeT !== 0) {
                 return -1;
             } else if (sizeS !== 0 && sizeT === 0) {
                 return 1;
             } else {
                 indexMaxS = indexMax(S, sizeS);
                 indexMaxT = indexMax(T, sizeT);
 
                 if (S[indexMaxS] < T[indexMaxT]) {
                     return -1;
                 } else if (S[indexMaxS] > T[indexMaxT]) {
                     return 1;
                 } else {
                     for (k = indexMaxS; k < sizeS - 1; k++) {
                         S[k] = S[k + 1];
                     }
                     for (k = indexMaxT; k < sizeT - 1; k++) {
                         T[k] = T[k + 1];
                     }
                     return compareSets(S, T, sizeS - 1, sizeT - 1);
                 }
             }
         }
         
         function indexMax(S, sizeS) {
             var max, k, candidateIndex;
 
             max = 0;
             candidateIndex = 0;
             for (k = 0; k < sizeS; k++) {
                 if (S[k] > max) {
                     max = S[k];
                     candidateIndex = k;
                 }
             }
             return candidateIndex;
         }
 
         
         // Longest path layering ("Graph drawings" p 272)
         // First we place sinks at the first layer (bottom).
         function longestPathLayering() {
             var i, v, e, j, curLayer, isContinue, layerIndex;
 
             // We place sinks at the first layer
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 if (v.outEdges.length === 0) {
                     v.layerIndex = 1;
                 }
             }
 
             // Then we assign layers to other vertices.
             // Each remaining vertex v is placed in layer Lp+1 where the longest
             // path from v to a sink has length p.
             layerMax = 1;
             curLayer = 1;
 
             for (;;) {
                 isContinue = false;
                 for (i = 0; i < currentCluster.length; i++) {
                     v = currentCluster[i];
                     if (v.layerIndex === curLayer) {
                         // There is a vertex at this current level
                         isContinue = true;
                         // New layer
                         layerIndex = v.layerIndex + 1;
                         // Place each previous vertex at this layer
                         for (j = 0; j < v.inEdges.length; j++) {
                             e = v.inEdges[j];
                             if (layerIndex > e.org.layerIndex) {
                                 e.org.layerIndex = layerIndex;
                             }
                             if (layerIndex > layerMax) {
                                 layerMax = layerIndex;
                             }
                         }
                     }
                 }
                 if (!isContinue) {
                     break;
                 }
                 curLayer++;
             }
         }
         
         function createLayers() {
             var i, l, l1, l2, layer, j;
 
             // Allocate an array of layers
             layers = [];
             for (i = 0; i < layerMax; i++) {
                 layers[i] = new Layer();
             }
             
             for (i = 0; i < currentCluster.length; i++) {
                 var v = currentCluster[i];
                 // For each layer, assign a width 
                 l = layers[v.layerIndex - 1];
                 if (l.cy < v.h) {
                     l.cy = v.h;
                 }
             }
 
             // Assign a y coordinate to each layer
             layer = layers[layerMax - 1];
             layer.y = layer.cy / 2;
             for (j = layerMax - 2; j >= 0; j--) {
                 l1 = layers[j];
                 l2 = layers[j + 1];
                 l1.y = l2.y + l2.cy / 2 + l1.cy / 2 + layerDistance;
             }
 
             // Assign coordinates to vertices:
             // - the y coordinate of a vertex is the y coordinate of its layer
             // - the x coordinate will be assigned later. However, each vertex 
             // receives a preliminary x coordinate.
             prePositionVertices();
         }
 
         // We use a Depth first search to position vertices.
         // This initial ordering ensure that graphs like trees or forests are 
         // drawn with no crossing.
         function prePositionVertices() {
             var i, v;
 
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 if (v.inEdges.length === 0 && !v.isConnected) {
                     prePositionVertex(v); // Depth first search  
                 }
             }
         }
 
         function prePositionVertex(vertex) {
             var layer, e, j;
 
             vertex.isConnected = true;
 
             // We fill each array of vertices of each layer.
             layer = layers[vertex.layerIndex - 1];
             vertex.x = layer.x + layer.vertices.length * xDelta;
             vertex.y = layer.y;
             if (vertex.layerIndex === 1) {
                 layer.x += vertexDistance + vertex.w;
             }
             layer.vertices.push(vertex);
             for (j = 0; j < vertex.outEdges.length; j++) {
                 e = vertex.outEdges[j];
                 if (!e.dst.isConnected) {
                     prePositionVertex(e.dst);
                 }
             }
         }
 
         // Step 2: Crossing Reduction
 
         function crossingReduction() {
             var sweep, cHeuristic, cDirection, j;
 
             // The method indicates what type of crossing reduction algorithm we use 
             // and in what direction we operate.
             // Remark: if method.length = 0, then we do not perform any crossing reduction.
             for (sweep = 0; sweep < method.length; sweep += 3) {
                 cHeuristic = method[sweep];
                 var cCrossFix = method[sweep + 1];
                 cDirection = method[sweep + 2];
 
                 switch (cDirection) {
                     case 'u':
                         for (j = 1; j < layerMax; j++) {
                             switch (cHeuristic) {
                                 case 'b':
                                     barycenterMethod(j, cCrossFix);
                                     break;
                                 case 'm':
                                     medianMethod(j, cCrossFix);
                                     break;
                                 case 'a':
                                     adjacentExchangeMethod(j, cCrossFix);
                                     break;
                             }
                         }
                         break;
 
                     case 'd':
                         for (j = layerMax - 2; j >= 0; j--) {
                             switch (cHeuristic) {
                                 case 'b':
                                     barycenterMethod(j, cCrossFix);
                                     break;
                                 case 'm':
                                     medianMethod(j, cCrossFix);
                                     break;
                                 case 'a':
                                     adjacentExchangeMethod(j, cCrossFix);
                                     break;
                             }
                         }
                         break;
 
                     default:
                         break;
                 }
             }
             // Get the number of edge crossings
             //crossCount = TotalCrossNumber();
         }
 
         // Apply the barycenter method to all the vertices of a layer
         function barycenterMethod(layerIndex, fix) {
             var layer, i, v, u, minDist, curDist;
 
             layer = layers[layerIndex];
 
             // For each vertex of the layer, set its position as being the barycenter
             // of its neighbours placed at the next (or prior) layer.
             for (i = 0; i < layer.vertices.length; i++) {
                 v = layer.vertices[i];
                 v.x = getBarycenter(v, fix);
             }
 
             // We sort the vertices (of the layer) on their x coordinate
             layer.vertices.sort(function (v1, v2) {
                 return (v1.x === v2.x) ? 0 : (v1.x < v2.x ? -1 : 1);
             });
 
             // Adjustments: if 2 vertices have the same position or overlap, 
             // then we separate them arbitrarily by a small amount.
             for (i = 1; i < layer.vertices.length; i++) {
                 v = layer.vertices[i];
                 u = layer.vertices[i - 1];
                 // Minimal distance between the centers of each vertex so that 
                 // they don't overlap. We add also a small amount to ensure a clear 
                 // separation between the 2 vertices.
                 minDist = (v.w + u.w) / 2 + xDelta;
                 // Current distance between the centers of each vertex
                 curDist = v.x - u.x;
                 // If the current distance is less than the minimal distance, we move
                 // the right vertex so that the distance with the left vertex is 
                 // equal to the minimal distance.
                 if (curDist < minDist) {
                     v.x = u.x + minDist;
                 }
             }
         }
         
         function getBarycenter(v, fix) {
             var bar, e, j;
 
             bar = 0;
 
             switch (fix) {
                 case constCrossOutFixed:
                     if (v.outEdges.length > 0) {
                         bar = 0;
                         for (j = 0; j < v.outEdges.length; j++) {
                             e = v.outEdges[j];
                             bar += e.dst.x;
                         }
                         bar = bar / v.outEdges.length;
                     } else {
                         bar = v.x;
                     }
                     break;
 
                 case constCrossInFixed:
                     if (v.inEdges.length > 0) {
                         bar = 0;
                         for (j = 0; j < v.inEdges.length; j++) {
                             e = v.inEdges[j];
                             bar += e.org.x;
                         }
                         bar = bar / v.inEdges.length;
                     } else {
                         bar = v.x;
                     }
                     break;
 
                 case constCrossInOutFixed:
                     bar = 0;
                     for (j = 0; j < v.inEdges.length; j++) {
                         e = v.inEdges[j];
                         bar += e.org.x;
                     }
                     for (j = 0; j < v.outEdges.length; j++) {
                         e = v.outEdges[j];
                         bar += e.dst.x;
                     }
                     bar = bar / (v.inEdges.length + v.outEdges.length);
                     break;
             }
             return bar;
         }
 
         // Apply the median method to all the vertices of a layer
         function medianMethod(layerIndex, fix) {
             var layer, med, i, v, u, t, minDist, curDist;
 
             layer = layers[layerIndex];
 
             // Here we consider that the position of each vertex is the median of 
             // the x-coordinates of its neighbours.
             for (i = 0; i < layer.vertices.length; i++) {
                 v = layer.vertices[i];
                 med = getMedian(v, fix);
                 if (med > 0) {
                     v.x = med;
                 }
             }
 
             // We sort the vertices (of the layer) on their x coordinate
             layer.vertices.sort(function (v1, v2) {
                 return (v1.x === v2.x) ? 0 : (v1.x < v2.x ? -1 : 1);
             });
 
             // Adjustments: if 2 vertices have the same position or overlap, 
             // then we separate them arbitrarily by a small amount.       
             // If one vertex has odd degree and the other even, then the odd degree 
             // vertex is placed on the left of the even degree vertex. If the parity
             // is the same, then we choose their orders arbitrarily.
             for (i = 1; i < layer.vertices.length; i++) {
                 v = layer.vertices[i];
                 u = layer.vertices[i - 1];
                 // Minimal distance between the centers of each vertex so that 
                 // they don't overlap. We add also a small amount to ensure a  
                 // clear separation between the 2 vertices.
                 minDist = (v.w + u.w) / 2 + xDelta;
 
                 // Special case where v has no neighbour
                 if ((fix === constCrossOutFixed && v.outEdges.length === 0) ||
                     (fix === constCrossInFixed && v.inEdges.length === 0)) {
                     v.x = u.x + minDist; // v is placed at the right of u 
                 } else {
                     // Current distance between the centers of each vertex
                     curDist = v.x - u.x;
                     // If the current distance is less than the minimal distance...
                     if (curDist < minDist) {
                         if ((v.outEdges.length % 2) !== 0 && (u.outEdges.length % 2) === 0) {
                             v.x = u.x;
                             u.x += minDist;
                             // As v is placed before u, we swap them to keep the order.
                             t = layer.vertices[i];
                             layer.vertices[i] = layer.vertices[i - 1];
                             layer.vertices[i - 1] = t;
                         } else {
                             v.x = u.x + minDist;
                         }
                     }
                 }
             }
         }
 
         function getMedian(v, fix) {
             var e1, e2, e3, x1, x2, x3, med, vertexEdges, j, e;
 
             med = 0;
             vertexEdges = [];
 
             switch (fix) {
                 case constCrossOutFixed:
                     for (j = 0; j < v.outEdges.length; j++) {
                         e = v.outEdges[j];
                         vertexEdges.push(e);
                     }
                     switch (v.outEdges.length) {
                         case 0:
                             med = 0;
                             break;
                         case 1:
                             e1 = vertexEdges[0];
                             med = e1.dst.x;
                             break;
                         case 2:
                             e1 = vertexEdges[0];
                             e2 = vertexEdges[1];
                             med = (e1.dst.x + e2.dst.x) / 2;
                             break;
                         case 3:
                         case 4:
                             e1 = vertexEdges[v.outEdges.length === 3 ? 0 : 3];
                             e2 = vertexEdges[1];
                             e3 = vertexEdges[2];
                             x1 = e1.dst.x;
                             x2 = e2.dst.x;
                             x3 = e3.dst.x;
                             if (Math.min(x1, x3) <= x2 && x2 <= Math.max(x1, x3)) {
                                 med = x2;
                             } else if (Math.min(x1, x2) <= x3 && x3 <= Math.max(x1, x2)) {
                                 med = x3;
                             } else {
                                 med = x1;
                             }
                             break;
                         default:
                             vertexEdges.sort(function(e1, e2) {
                                 return (e1.dst.x === e2.dst.x) ? 0 : (e1.dst.x  < e2.dst.x  ? -1 : 1);
                             });
                             e1 = vertexEdges[Math.floor(vertexEdges.length / 2)];
                             med = e1.dst.x;
                             break;
                     }
                     break;
 
                 case constCrossInFixed:
                     for (j = 0; j < v.inEdges.length; j++) {
                         e = v.inEdges[j];
                         vertexEdges.push(e);
                     }
                     switch (v.inEdges.length) {
                         case 0:
                             med = 0;
                             break;
                         case 1:
                             e1 = vertexEdges[0];
                             med = e1.org.x;
                             break;
                         case 2:
                             e1 = vertexEdges[0];
                             e2 = vertexEdges[1];
                             med = (e1.org.x + e2.org.x) / 2;
                             break;
                         case 3:
                         case 4:
                             e1 = vertexEdges[v.inEdges.length === 3 ? 0 : 3];
                             e2 = vertexEdges[1];
                             e3 = vertexEdges[2];
                             x1 = e1.org.x;
                             x2 = e2.org.x;
                             x3 = e3.org.x;
                             if (Math.min(x1, x3) <= x2 && x2 <= Math.max(x1, x3)) {
                                 med = x2;
                             } else if (Math.min(x1, x2) <= x3 && x3 <= Math.max(x1, x2)) {
                                 med = x3;
                             } else {
                                 med = x1;
                             }
                             break;
                         default:
                             vertexEdges.sort(function(e1, e2) {
                                 return (e1.org.x === e2.org.x) ? 0 : (e1.org.x  < e2.org.x  ? -1 : 1);
                             });
                             e1 = vertexEdges[Math.floor(vertexEdges.length / 2)];
                             med = e1.org.x;
                             break;
                     }
                     break;
             }
             return med;
         }
 
         // Apply the adjacant method to all the vertices of a layer
         function adjacentExchangeMethod(layerIndex, fix) {
             var layer, decrease, k, u, v, t, Cuv, Cvu;
 
             layer = layers[layerIndex];
 
             // Scan vertices of current layer i from Left to right, exchanging an
             // adjacent pair u, v of vertices, whenever Cuv > Cvu
             decrease = true;
             do {
                 decrease = false;
                 for (k = 0; k < layer.vertices.length - 1; k++) {
                     u = layer.vertices[k];
                     v = layer.vertices[k + 1];
 
                     Cuv = 0;
                     Cvu = 0;
                     calcCrosses(u, v, Cuv, Cvu, fix);
 
                     if (Cuv > Cvu) {
                         layer.vertices[k] = v;
                         layer.vertices[k + 1] = u;
                         t = u.x;
                         u.x = v.x;
                         v.x = t;
                         decrease = true;
                     }
                 }
             } while (decrease);
 
             // We sort the vertices (of the layer) on their x coordinate            
             layer.vertices.sort(function (v1, v2) {
                 return (v1.x === v2.x) ? 0 : (v1.x < v2.x ? -1 : 1);
             });
         }
 
         function calcCrosses(u, v, pCuv, pCvu, fix) {
             var Cuv, Cvu, j, k, e1, e2, x1w, x1z;
 
             Cuv = 0;
             Cvu = 0;
 
             // Count Cuv and Cvu.
             // Cuv is the number of crossings that edges incident with u
             // make with edges incident with v
 
             switch (fix) {
                 case constCrossOutFixed:
                     for (j = 0; j < u.outEdges.length; j++) {
                         e1 = u.outEdges[j];
                         x1w = e1.dst.x;
                         for (k = 0; k < v.outEdges.length; k++) {
                             e2 = v.outEdges[k];
                             x1z = e2.dst.x;
                             if (x1z < x1w) {
                                 Cuv++;
                             }
                             if (x1z > x1w) {
                                 Cvu++;
                             }
                         }
                     }
                     break;
 
                 case constCrossInFixed:
                     for (j = 0; j < u.inEdges.length; j++) {
                         e1 = u.inEdges[j];
                         x1w = e1.org.x;
                         for (k = 0; k < v.inEdges.length; k++) {
                             e2 = v.inEdges[k];
                             x1z = e2.org.x;
                             if (x1z < x1w) {
                                 Cuv++;
                             }
                             if (x1z > x1w) {
                                 Cvu++;
                             }
                         }
                     }
                     break;
             }
 
             pCuv = Cuv;
             pCvu = Cvu;
         }
 
         // Number of crosses
 
         function totalCrossNumber() {
             var C, layerIndex;
 
             C = 0;
             for (layerIndex = 1; layerIndex < layerMax; layerIndex++) {
                 C += layerCrossNumber(layerIndex);
             }
             return C;
         }
 
         function layerCrossNumber(layerIndex) {
             var layer, Cl, v1, v2, i, k;
 
             layer = layers[layerIndex];
             Cl = 0;
             for (i = 0; i < layer.vertices.length; i++) {
                 v1 = layer.vertices[i];
                 for (k = 0; k < layer.vertices.length; k++) {
                     v2 = layer.vertices[k];
                     if (v2 !== v1) {
                         if (v1.pt.x < v2.pt.x) {
                             Cl += crossNumber(v1, v2);
                         }
                     }
                 }
             }
             return Cl;
         }
 
         function crossNumber(v1, v2) {
             var Cuv, j, x1w, x1z;
 
             Cuv = 0;
             // Cuv is the number of crossings that edges incident 
             // with v1 make with edges incident with v2.
             for (j = 0; j < v1.outEdges.length; j++) {
                 var e1 = v1.outEdges[j];
                 x1w = e1.dst.x;
                 for (var k = 0; k < v2.outEdges.length; k++) {
                     var e2 = v2.outEdges[k];
                     x1z = e2.dst.x;
                     if (x1z < x1w) {
                         Cuv++;
                     }
                 }
             }
             return Cuv;
         }
 
         // Dummy vertices
 
         // We place the destination vertices nearer their origin vertices if possible
         function minimizeDummyVertices() {
             var v, v2, i, e, j, k, span, span2, minSpan;
             
             for (i = 0; i < orderedVertices.length; i++) {
                 v = orderedVertices[i];
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     span = e.org.layerIndex - e.dst.layerIndex;
                     if (span > 1) {
                         minSpan = span; 
                         v2 = e.dst;
                         for (k = 0; k < v2.inEdges.length; k++) {
                             var e2 = v2.inEdges[k];
                             span2 = e2.org.layerIndex - e2.dst.layerIndex;
                             if (span2 < minSpan) {
                                 minSpan = span2;
                             }
                         }
                         if (minSpan > 1) {
                             e.dst.layerIndex += minSpan - 1;
                         }
                     }
                 }
             }
         }
 
         // Transform the layered digraph into a proper layed digraph
         // (see "Graph Drawing" page 22) by adding dummy vertices.
         function addDummyVertices() {
             var realVertices, i, j, k, org, dst, span, e, v1, v2;
 
             // First we minimize the number of the dummy vertices to add.
             if (layerWidth === 0) {
                 minimizeDummyVertices();
             }
 
             realVertices = currentCluster.length;
             for (i = 0; i < realVertices; i++) {
                 org = currentCluster[i];
                 for (j = 0; j < org.outEdges.length; j++) {
                     e = org.outEdges[j];
                     dst = e.dst;
                     span = org.layerIndex - dst.layerIndex;
                     if (span > 1) {
                         e.isSpanned = true;
                         e.realdst = dst;
                         v1 = org;
                         for (k = 1; k < span; k++) {
                             // Create a small dummy vertex
                             v2 = addVirtualVertex();
                             if (v2 !== null) {
                                 v2.w = constCxDummy;
                                 v2.h = constCyDummy;
                                 v2.layerIndex = org.layerIndex - k;
                                 v2.dummy = true;
                                 if (k === 1) {
                                     e.setDstVertex(v2);
                                 } else {
                                     addEdge(v1, v2, null);
                                 }
                                 v1 = v2;
                             }
                         }
 
                         // Last edge of that branch
                         addEdge(v1, dst, null);
                     }
                 }
             }
         }
    
         function removeDummyVertices() {
             var v, e, i, j, dummyVertice, dummyEdge, pt, pt1, pt2, dummyVertices;
 
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 for (j = 0; j < v.outEdges.length; j++) {
                     e = v.outEdges[j];
                     if (e.isSpanned) {
                         dummyVertice = e.dst;
                         pt = { x: dummyVertice.x, y: dummyVertice.y };
                         e.setDstVertex(e.realdst);
                         e.bends.push(pt);  // First dummy vertex
 
                         dummyEdge = dummyVertice.outEdges[0];
                         dummyVertice = dummyEdge.dst;
                         if (dummyVertice.dummy) {
                             do {
                                 pt1 = pt;
                                 pt = { x: dummyVertice.x, y: dummyVertice.y };
                                 dummyEdge = dummyVertice.outEdges[0];
                                 dummyVertice = dummyEdge.dst;
                                 pt2 = { x: dummyVertice.x, y: dummyVertice.y };
                                 if (Math.abs(pt.x - pt1.x) > xDelta ||
                                     Math.abs(pt.x - pt2.x) > xDelta) {
                                     e.bends.push(pt);
                                 }
                             } while (dummyVertice.dummy);
                         }
                         e.isSpanned = false;
                     }
                 }
             }
 
             // Delete dummy vertices            
             dummyVertices = [];
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 if (v.dummy) {
                     dummyVertices.push(v);
                 }
             }
             for (i = 0; i < dummyVertices.length; i++) {
                 v = dummyVertices[i];
                 delVirtualVertex(v);
             }
         }
 
         // Horizontal coordinates
 
         // Step 3: Optimize the horizontal position of vertices.
         // We could use a simplex method! However we prefer to use a method 
         // reminiscent of the GEM method (a force directed method) with the 
         // following differences:
         // * we add 2 constraints for vertices: 
         // - their y position cannot change
         // - the order of vertices on an horizontal layer (established during the 
         //   crossing reduction step) cannot change.
         // * we remove the random force and we do not select vertices randomly
         // so that the resulting graph is allways the same.
         // * Repulsive forces: instead of iterating through all vertices, we iterate 
         // just through the vertices of the layer.
         // * we adopt a small number of iterations to accelerate the algorithm.
         // (50 instead of 1000)
 
         function horzCoordAssignment() {
             if (currentCluster.length <= 1) {
                 return;
             }
             optInit();
             optRun();
             optEnd();
         }
 
         function optInit() {
             var layerIndex, layer, i, j, v, e, degree;
 
             var distance = vertexDistance;
             distsqr = distance * distance;
             var barycenter = { x: 0, y: 0 };
             temperature = 0;
             step = constStep;
             skew = constSkew;
             oscillation = constOscillation;
             rotation = constRotation;
             gravity = constGravity;
             maxTemp = constMaxTemp * distance;
             startTemp = constStartTemp * distance;
             finalTemp = constFinalTemp;
             var size = currentCluster.length;
             stopTemp = finalTemp * finalTemp * distsqr * size;
             iterations = Math.min(constIter * size * size, constMaxIter);
 
             for (layerIndex = 0; layerIndex < layerMax; layerIndex++) {
                 layer = layers[layerIndex];
                 for (i = 0; i < layer.vertices.length; i++) {
                     v = layer.vertices[i];
                     v.y2 = v.y;
                     degree = v.inEdges.length + v.outEdges.length;
                     v.mass = 1.0 + degree / 3.0;
                     v.heat = startTemp;
                     temperature += v.heat * v.heat;
                     barycenter.x += v.x;
                     barycenter.y += v.y;
 
                     v.neighbours = [];
                     for (j = 0; j < v.inEdges.length; j++) {
                         e = v.inEdges[j];
                         v.neighbours.push(e.org);
                     }
                     for (j = 0; j < v.outEdges.length; j++) {
                         e = v.outEdges[j];
                         v.neighbours.push(e.dst);
                     }
                     v.prior = i > 0 ? layer.vertices[i - 1] : null;
                     v.next = i < layer.vertices.length - 1 ? layer.vertices[i + 1] : null;
                 }
             }
         }
 
         function optRun() {
             var iteration;
 
             for (iteration = 0; iteration < iterations; iteration++) {
                 if (temperature < stopTemp) {
                     break;
                 }
                 round();
             }
         }
         
         function optEnd() {
             var v, i;
             
             // Only the x coordinate is taken into account
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 v.y = v.y2;
             }
         }
         
         function round() {
             var i, v, impulse;
 
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 impulse = impulseVertex(v);
                 moveVertex(v, impulse);
             }
         }
 
         // Adjust the temp according to the old temp and the old impulse.
         // Between -45 and 45 degree, there is acceleration. 
         // Between 135 and 225 degree, there is oscillation.
         // In the other ranges of the angle, there is rotation.
         function moveVertex(vertex, impulse) {
             var t, sinus, cosinus, d, inc, minDist;
 
             t = vertex.heat;
             if (t !== 0.0) {
                 temperature -= t * t;
                 cosinus = impulse.x * vertex.impulse.x + impulse.y * vertex.impulse.y;
                 sinus = impulse.x * vertex.impulse.y - impulse.y * vertex.impulse.x;
                 if (Math.abs(cosinus) > 0.5) {
                     t += oscillation * cosinus;
                     t = Math.min(t, maxTemp);
                 } else {
                     vertex.dir += skew * sinus / t;
                     t -= t * rotation * Math.abs(vertex.dir) / size;
                     t = Math.max(t, 2);
                 }
                 vertex.heat = t;
                 temperature += t * t;
             }
 
             // In each step, the node moves in the direction of the impulse.
             // The step move is proportional to the local temperature.
             d = { x: impulse.x * step * t, y: impulse.y * step * t };
              
             // Maintain the order of vertices on an horizontal layer.
             inc = true;
             if (vertex.next !== null) {
                 minDist = (vertex.w + vertex.next.w) / 2 + xDelta;
                 if (vertex.next.x - (vertex.x + d.x) < minDist) {
                     inc = false;
                 }
             }
             if (vertex.prior !== null) {
                 minDist = (vertex.w + vertex.prior.w) / 2 + xDelta;
                 if (vertex.x + d.x - vertex.prior.x < minDist) {
                     inc = false;
                 }
             }
             if (inc) {
                 vertex.x += d.x;
                 vertex.y += d.y;
                 vertex.impulse = impulse;
                 barycenter.x += d.x;
                 barycenter.y += d.y;
             }
         }
 
         // Impulse of the vertex by the sum of all force vectors. 
         function impulseVertex(vertex) {
             var impulse, d, e, i, v, norm;
 
             impulse = { x: 0, y: 0 };
             d = { x: 0, y: 0 };
 
             // Gravitational force
             impulse.x += (barycenter.x / size - vertex.x) * vertex.mass * gravity;
             impulse.y += (barycenter.y / size - vertex.y) * vertex.mass * gravity;
 
             // Repulsive forces: instead of iterating through all vertices, we iterate 
             // just through the vertices of the layer.
             for (i = 0; i < currentCluster.length; i++) {
                 v = currentCluster[i];
                 if (vertex !== v && v.layerIndex === vertex.layerIndex) {
                     d.x = vertex.x - v.x;
                     d.y = vertex.y - v.y;
                     e = d.x * d.x + d.y * d.y;
                     if (e !== 0.0) {
                         impulse.x += d.x * distsqr / e;
                         impulse.y += d.y * distsqr / e;
                     }
                 }
             }
 
             // Attractive forces: iterate through all linked vertices to calculate 
             for (i = 0; i < vertex.neighbours.length; i++) {
                 v = vertex.neighbours[i];
                 d.x = vertex.x - v.x;
                 d.y = vertex.y - v.y;
                 e = (d.x * d.x + d.y * d.y) / vertex.mass;
                 impulse.x -= d.x * e / distsqr;
                 impulse.y -= d.y * e / distsqr;
             }
 
             norm = Math.sqrt(impulse.x * impulse.x + impulse.y * impulse.y);
             if (norm !== 0.0) {
                 impulse.x /= norm;
                 impulse.y /= norm;
             }
             return impulse;
         }
 
 
         function ClusterManager() {
             var visitedCount, clusterCount;
 
             this.separateConnectedParts = function () {
                 var vertex, v, i;
 
                 visitedCount = 0;
                 clusterCount = 0;
                 while (visitedCount < vertices.length) {
                     // Find the first available vertex
                     vertex = null;
                     for (i = 0; i < vertices.length; i++) {
                         v = vertices[i];
                         if (v.owningClusterIndex === 0) {
                             clusterCount++;
                             vertex = v;
                             break;
                         }
                     }
 
                     // Depth first search
                     if (vertex !== null) {
                         visitVertex(vertex);
                     }
                 }
 
                 fillClusters();
             }();
 
             // We execute a "depth-first search" algorithm and we start with the vertex
             // passed in parameter.
             function visitVertex(vertex) {
                 var v, e, j;
 
                 vertex.owningClusterIndex = clusterCount;
                 visitedCount++;
                 for (j = 0; j < vertex.outEdges.length; j++) {
                     e = vertex.outEdges[j];
                     v = e.dst;
                     if (v.owningClusterIndex === 0) {
                         visitVertex(v);
                     }
                 }
                 for (j = 0; j < vertex.inEdges.length; j++) {
                     e = vertex.inEdges[j];
                     v = e.org;
                     if (v.owningClusterIndex === 0) {
                         visitVertex(v);
                     }
                 }
             }
 
             function fillClusters() {
                 var i, k, v;
 
                 // Allocate an array of cluster, each cluster being a list of vertices
                 clusters = new Array(clusterCount);
                 for (k = 0; k < clusterCount; k++) {
                     clusters[k] = [];
                 }
 
                 // Fill clusters
                 for (i = 0; i < vertices.length; i++) {
                     v = vertices[i];
                     clusters[v.owningClusterIndex - 1].push(v);
                 }
             }
         }
 
         function Layer() {
             this.x = 0;
             this.y = 0;
             this.cy = 0;
             this.vertices = [];
         }
 
         // Returns a vertex object.
         function _Vertex(_node) {
             var that;
 
             this._node = _node; // Corresponding node
             this.inEdges = [];
             this.outEdges = [];
             this.x = 0;
             this.y = 0;
             this.w = 0;
             this.h = 0;
             this.owningClusterIndex = 0;
             this.layerIndex = 0;   // Index of the vertex layer 
             this.order = 0;        // Used in the Cycle Removal step
             this.label = 0;        // Used in the Coffman Graham algorithm
             this.isVisited = false;
             this.dummy = false;       // Used when creating dummy nodes in layers
             this.used = false;        // Used in the Cycle Removal step
             this.isConnected = false;
             this.next = null;
             this.prior = null;
             this.impulse = { x: 0, y: 0 };
             this.heat = 0;
             this.dir = 0;
             this.mass = 0;
             this.neighbours = [];
             this.y2 = 0;
         };
 
         // Returns a Edge object
         function _Edge(org, dst, _link) {
             var that;
 
             this.org = org;
             this.dst = dst;
             this._link = _link;
             this.realdst = null;
             this.bends = [];
             this.isVisited = false;
             this.isReversed = false; // Indicates that the edge is temporarily reversed   
             this.isSpanned = false;  // Indicates that the origin and the destination 
                                      // vertices are not placed on adjacant layers
 
             that = this;
             
             this.reverseDirection = function() {
                 var t, idx;
                 
                 idx = that.org.outEdges.indexOf(that);
                 that.org.outEdges.splice(idx, 1); // Remove
                 idx = that.dst.inEdges.indexOf(that);
                 that.dst.inEdges.splice(idx, 1); // Remove
                 t = that.org;
                 that.org = that.dst;
                 that.dst = t;
                 that.org.outEdges.push(that);
                 that.dst.inEdges.push(that);
                 that.bends.reverse();
             };
 
             this.setDstVertex = function (newDst) {
                 var idx;
 
                 idx = that.dst.inEdges.indexOf(that);
                 that.dst.inEdges.splice(idx, 1); // Remove
                 that.dst = newDst;
                 that.dst.inEdges.push(that);
             };
         }
     }
 };