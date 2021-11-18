 /*<JasobNoObfs> AddFlow for HTML5
    v1.2.1.0 - September 3, 2015
    Copyright (c) 2012-2015 Lassalle Technologies. All rights reserved.
    http://www.lassalle.com
    Author: Patrick Lassalle mailto:plassalle@lassalle.com 
    If you do not own a commercial license, this file shall be governed by the license 
    agreement that can be found at: http://www.lassalle.com/html5/license_evaluation.pdf
    If you own a commercial license, this file shall be governed by the license 
     agreement that can be found at: http://www.lassalle.com/html5/license_commercial.pdf
     */

 //</JasobNoObfs>

 /** @author <a href='mailto:plassalle@lassalle.com'>Patrick Lassalle</a> 
     @version v1.2.1.0 
     @namespace 
     @description Lassalle namespace, contains all classes and methods. 
 */
 export var Lassalle = {
     /** @description Creates a new Flow component.
     @class Represents a Flow component. 
     @param canvas The canvas where this diagram will paint to. 
     */
     Flow: function (canvas) {
         // We will define successively:
         // - the internal variables used in this class
         // - MyRect class: a rectangle class
         // - Helpers class: a namespace containing helper functions
         // - OrthoRouter class: class for creating orthogonal links
         // - PolylineHelper class: a class for finding a point on a polyline
         // - Quadtree class: a class improving speed performance
         // - Node class
         // - Link class
         // - Task class and all class deriving from the Task class
         // - TaskManager class: the object managing the list of tasks and undo/redo.
         // - AddFlow properties
         // - AddFlow methods
         // - AddFlow helpers (including event handlers)

         var that, _taskManager, _items, _quadtree, _selectedItems, hittedItem, _arrow,
             StretchTypeEnum, ResizeHandleEnum, itemsetEnum, moveStartDist,
             minNodeSize, millisec, xScrollUnit, yScrollUnit, ptStart,
             ptPrior, ptOrg, ptPinOrigin, ptPinDestination, invRect, selRect,
             tmpRect, graphRect, _isMouseDown, startMove, _handle, linkDistance,
             outOrg, pinAreas, pinAreaCentral, pinnedItem, origin, pinOrigin,
             pinDestination, sizedir, stretchType, stretchedLink, _resizeHandle,
             initialWidth, initialHeight, _cursor, offsetDatabase, selectAllFlag,
             xoffset, yoffset, _isSelChanged, okToStartMove, okToStartNode, okToStartLink,
             okToStartResize, okToStartStretch, okToStartSelect, okToStartZoom,
             okToStartPan, _repaint, _isCreatingNode, _isCreatingLink, _isStretchingLink,
             _isResizingNode, _isMovingNode, _isSelecting, _isZooming, _isPanning,
             xScrollDir, yScrollDir, ptScroll, timerStarted, timer, scrollStartPoint,
             orthoRouter, MyRect, Helpers, Node, Link, Task, NodeLayoutTask,
             AddNodeTask, RemoveNodeTask, AddLinkTask, RemoveLinkTask,
             StretchLinkTask, SetLinkOrgTask, SetLinkDstTask, SetLinkPinOrgTask, SetLinkPinDstTask, ZOrderTask, LineStyleTask, _isQuadtree;

         //----------------------------------------------------------------
         // MyRect class (used internally)
         //----------------------------------------------------------------

         MyRect = function (x, y, w, h) {
             this.left = x;
             this.top = y;
             this.width = w;
             this.height = h;
         };

         MyRect.prototype.doclone = function () {
             return new MyRect(this.left, this.top, this.width, this.height);
         };

         MyRect.prototype.equals = function (rect) {
             return this.left === rect.left &&
                 this.top === rect.top &&
                 this.width === rect.width &&
                 this.height === rect.height;
         };

         MyRect.prototype.intersectsWith = function (rect) {
             return (this.left < rect.left + rect.width &&
                 this.left + this.width > rect.left &&
                 this.top < rect.top + rect.height &&
                 this.top + this.height > rect.top);
         };

         MyRect.prototype.inflate = function (dx, dy) {
             return new MyRect(this.left - dx,
                 this.top - dy,
                 this.width + 2 * dx,
                 this.height + 2 * dy);
         };

         MyRect.prototype.offset = function (dx, dy) {
             return new MyRect(this.left + dx, this.top + dy, this.width, this.height);
         };

         MyRect.prototype.unionRect = function (rect) {
             var rc = this.doclone();
             rc.boundingRect(rect);
             return rc;
         };

         MyRect.prototype.boundingRect = function (rect) {
             var right, bottom;

             // We compute right and bottom before we change left and top below.
             right = Math.max(this.left + this.width, rect.left + rect.width);
             bottom = Math.max(this.top + this.height, rect.top + rect.height);

             this.left = Math.min(this.left, rect.left);
             this.top = Math.min(this.top, rect.top);

             this.width = right - this.left;
             this.height = bottom - this.top;
         };

         MyRect.prototype.centerPoint = function () {
             return {
                 x: this.left + this.width / 2,
                 y: this.top + this.height / 2
             };
         };

         MyRect.prototype.containsPoint = function (pt) {
             return pt.x >= this.left &&
                 pt.x <= this.left + this.width &&
                 pt.y >= this.top &&
                 pt.y <= this.top + this.height;
         };

         MyRect.prototype.containsRect = function (rc) {
             return rc.left >= this.left &&
                 rc.left + rc.width <= this.left + this.width &&
                 rc.top >= this.top &&
                 rc.top + rc.height <= this.top + this.height;
         };

         //---------------------------------------------------------------
         // Helpers namespace. 
         //---------------------------------------------------------------

         Helpers = {
             // Draw a beziezr curve defined by 4 points 
             drawBezier: function (ctx, pt0, pt1, pt2, pt3) {
                 ctx.beginPath();
                 ctx.moveTo(pt0.x, pt0.y);
                 ctx.bezierCurveTo(pt1.x, pt1.y, pt2.x, pt2.y, pt3.x, pt3.y);
             },

             // Draw a polyline path. The polyline is defined by a set of points 
             drawPolyline: function (ctx, _points) {
                 var i;

                 ctx.beginPath();
                 ctx.moveTo(_points[0].x, _points[0].y);
                 for (i = 1; i < _points.length; i++) {
                     ctx.lineTo(_points[i].x, _points[i].y);
                 }
             },

             // Draw a polyline path with roudned corners.
             // The polyline is defined by a set of points 
             drawPolylineRounded: function (ctx, _points, r) {
                 var k, A, B, n;

                 n = _points.length;
                 ctx.beginPath();
                 ctx.moveTo(_points[0].x, _points[0].y);
                 for (k = 0; k < n - 2; k++) {
                     A = Helpers.getStartingPointOfRoundedCorner(_points, k, r);
                     B = Helpers.getEndingPointOfRoundedCorner(_points, k, r);
                     if ((A.x === 0 && A.y === 0) || (B.x === 0 && B.y === 0)) {
                         ctx.lineTo(_points[k + 1].x, _points[k + 1].y);
                     } else {
                         // Normal case
                         ctx.lineTo(A.x, A.y);
                         ctx.bezierCurveTo(_points[k + 1].x, _points[k + 1].y,
                             _points[k + 1].x, _points[k + 1].y,
                             B.x, B.y);
                     }
                 }

                 // Terminate the last segment
                 ctx.lineTo(_points[n - 1].x, _points[n - 1].y);
             },

             // Draw an ellipse path. See 
             // http://stackoverflow.com/questions/2172798/how-to-draw-an-oval-in-html5-canvas
             drawEllipse: function (ctx, x, y, w, h) {
                 var kappa, ox, oy, xe, ye, xm, ym;

                 kappa = 0.5522848;
                 ox = (w / 2) * kappa; // control point offset horizontal
                 oy = (h / 2) * kappa; // control point offset vertical
                 xe = x + w; // x-end
                 ye = y + h; // y-end
                 xm = x + w / 2; // x-middle
                 ym = y + h / 2; // y-middle

                 ctx.beginPath();
                 ctx.moveTo(x, ym);
                 ctx.bezierCurveTo(x, ym - oy, xm - ox, y, xm, y);
                 ctx.bezierCurveTo(xm + ox, y, xe, ym - oy, xe, ym);
                 ctx.bezierCurveTo(xe, ym + oy, xm + ox, ye, xm, ye);
                 ctx.bezierCurveTo(xm - ox, ye, x, ym + oy, x, ym);
                 ctx.closePath();
             },

             // Draw a rectangular path 
             drawRectangle: function (ctx, x, y, w, h) {
                 ctx.beginPath();
                 ctx.moveTo(x, y);
                 ctx.lineTo(x + w, y);
                 ctx.lineTo(x + w, y + h);
                 ctx.lineTo(x, y + h);
                 ctx.closePath();
             },

             // Draw a polygon path 
             drawPolygon: function (ctx, points) {
                 var i;

                 ctx.beginPath();
                 ctx.moveTo(points[0].x, points[0].y);
                 for (i = 1; i < points.length; i++) {
                     ctx.lineTo(points[i].x, points[i].y);
                 }
                 ctx.closePath();
             },

             // Draw a multi-line text 
             multiFillText: function (ctx, _text, x, y, _lineHeight, fitWidth, draw) {
                 var sections, i, str, wordWidth, words, printNextLine, lineSpacing,
                     index, currentLine, maxHeight, maxWidth;

                 currentLine = 0;
                 maxHeight = 0;
                 maxWidth = 0;
                 _text = _text.replace(/(\r\n|\n\r|\r|\n)/g, '\n');
                 sections = _text.split('\n');

                 printNextLine = function (str) {
                     if (draw) {
                         ctx.fillText(str, x, y + (_lineHeight * currentLine));
                     }
                     currentLine++;
                     wordWidth = ctx.measureText(str).width;
                     if (wordWidth > maxWidth) {
                         maxWidth = wordWidth;
                     }
                 };

                 for (i = 0; i < sections.length; i++) {
                     words = sections[i].split(' ');
                     index = 1;

                     while (words.length > 0 && index <= words.length) {
                         str = words.slice(0, index).join(' ');
                         wordWidth = ctx.measureText(str).width;
                         if (wordWidth > fitWidth) {
                             if (index === 1) {
                                 // Falls to this case if the first word in words[] is bigger than fitWidth
                                 // so we print this word on its own line; index = 2 because slice is
                                 str = words.slice(0, 1).join(' ');
                                 words = words.splice(1);
                             } else {
                                 str = words.slice(0, index - 1).join(' ');
                                 words = words.splice(index - 1);
                             }

                             printNextLine(str);

                             index = 1;
                         } else {
                             index++;
                         }
                     }

                     // The left over words on the last line
                     if (index > 0) {
                         printNextLine(words.join(' '));
                     }
                 }

                 lineSpacing = 1 / 4 * _lineHeight;
                 maxHeight = _lineHeight * currentLine + (currentLine - 1) * lineSpacing;
                 if (!draw) {
                     return {
                         height: maxHeight,
                         width: maxWidth
                     };
                 }
             },

             getFirstPointOfLastSegmentOfBezier: function (pt0, pt1, pt2, pt3) {
                 var t, x, y;

                 t = 18 / (20 - 1);
                 x = (1 - t) * (1 - t) * (1 - t) * pt0.x +
                     3 * t * (1 - t) * (1 - t) * pt1.x +
                     3 * t * t * (1 - t) * pt2.x +
                     t * t * t * pt3.x;
                 y = (1 - t) * (1 - t) * (1 - t) * pt0.y +
                     3 * t * (1 - t) * (1 - t) * pt1.y +
                     3 * t * t * (1 - t) * pt2.y +
                     t * t * t * pt3.y;
                 return {
                     x: x,
                     y: y
                 };
             },

             // Draw an arrow path 
             drawArrow: function (ctx, _shape) {
                 var p;

                 ctx.beginPath();
                 ctx.moveTo(_shape[0][0], _shape[0][1]);

                 for (p in _shape) {
                     if (p > 0) {
                         ctx.lineTo(_shape[p][0], _shape[p][1]);
                     }
                 }

                 ctx.lineTo(_shape[0][0], _shape[0][1]);
                 ctx.fill();
                 ctx.stroke();
             },

             // Translate the points of a polygon shape 
             translateShape: function (_shape, xdelta, ydelta) {
                 var p, rv;

                 rv = [];
                 for (p in _shape) {
                     rv.push([_shape[p][0] + xdelta, _shape[p][1] + ydelta]);
                 }
                 return rv;
             },

             // Rotate the points of a polygon shape 
             rotateShape: function (_shape, ang) {
                 var p, rv;

                 rv = [];
                 for (p in _shape) {
                     rv.push(Helpers.rotatePoint(ang, _shape[p][0], _shape[p][1]));
                 }
                 return rv;
             },

             // Rotate a point 
             rotatePoint: function (ang, x, y) {
                 return [(x * Math.cos(ang)) - (y * Math.sin(ang)),
                     (x * Math.sin(ang)) + (y * Math.cos(ang))
                 ];
             },

             // Gets the array of points needed to draw a spline curve. 
             getSplinePoints: function (points, curvePoints) {
                 var i, l;

                 l = points.length;
                 if (l === 2) {
                     curvePoints.push(points[0]);
                     curvePoints.push(points[1]);
                 } else if (l === 3) {
                     Helpers.splineSegment(curvePoints, points[0], points[0], points[1], points[2]);
                     Helpers.splineSegment(curvePoints, points[0], points[1], points[2], points[2]);
                 } else {
                     Helpers.splineSegment(curvePoints, points[0], points[0], points[1], points[2]);
                     for (i = 0; i < l - 3; i++) {
                         Helpers.splineSegment(curvePoints,
                             points[i], points[i + 1], points[i + 2], points[i + 3]);
                     }
                     Helpers.splineSegment(curvePoints,
                         points[l - 3], points[l - 2], points[l - 1], points[l - 1]);
                 }
             },

             // It uses an array of 10 points for each segment. 
             splineSegment: function (curvePoints, pt0, pt1, pt2, pt3) {
                 var i, t, pt,
                     T = 0.5,
                     N = 10,
                     SX1 = T * (pt2.x - pt0.x),
                     SY1 = T * (pt2.y - pt0.y),
                     SX2 = T * (pt3.x - pt1.x),
                     SY2 = T * (pt3.y - pt1.y),
                     AX = SX1 + SX2 + 2 * pt1.x - 2 * pt2.x,
                     AY = SY1 + SY2 + 2 * pt1.y - 2 * pt2.y,
                     BX = -2 * SX1 - SX2 - 3 * pt1.x + 3 * pt2.x,
                     BY = -2 * SY1 - SY2 - 3 * pt1.y + 3 * pt2.y,
                     CX = SX1,
                     CY = SY1,
                     DX = pt1.x,
                     DY = pt1.y;

                 for (i = 0; i < N; i++) {
                     t = i / (N - 1);
                     pt = {
                         x: AX * t * t * t + BX * t * t + CX * t + DX,
                         y: AY * t * t * t + BY * t * t + CY * t + DY
                     };
                     curvePoints.push(pt);
                 }
             },

             // Adjust the coordinates of a point so that it fits to a grid 
             adjustGrid: function (pt, xgrid, ygrid) {
                 var x, y, iX, iY;

                 iX = Math.round(pt.x);
                 iY = Math.round(pt.y);
                 xgrid = Math.round(xgrid);
                 ygrid = Math.round(ygrid);

                 if (xgrid > 0) {
                     x = iX % xgrid;
                     if (x < xgrid / 2) {
                         iX -= x;
                     } else {
                         iX += xgrid - x;
                     }
                 }
                 if (ygrid > 0) {
                     y = iY % ygrid;
                     if (y < ygrid / 2) {
                         iY -= y;
                     } else {
                         iY += ygrid - y;
                     }
                 }
                 return {
                     x: iX,
                     y: iY
                 };
             },

             // Returns the middle of two points 
             middlePoint: function (pt1, pt2) {
                 return {
                     x: (pt1.x + pt2.x) / 2,
                     y: (pt1.y + pt2.y) / 2
                 };
             },

             // Returns the rectangle defined by two points 
             getRectByTwoPoints: function (pt1, pt2) {
                 return new MyRect(Math.min(pt1.x, pt2.x), Math.min(pt1.y, pt2.y),
                     Math.abs(pt2.x - pt1.x), Math.abs(pt2.y - pt1.y));
             },

             // Get the intersection between a segment and an ellipse,
             // the segment being directed to the centre of the ellipse 
             getEllipseNearestPt: function (rc, pt, center, angle) {
                 var x, y, theta, alpha, dx, dy, a, b, r, ptInter;

                 a = rc.width / 2;
                 b = rc.height / 2;
                 if (a === 0 || b === 0) {
                     return center;
                 }

                 // The cos and sin functions work with angles defined in radians.
                 theta = angle * (Math.PI / 180);

                 // Translation
                 // We defined the coordinates origin as the center of the ellipse
                 pt.x -= center.x;
                 pt.y -= center.y;

                 // Rotation
                 // To take account of ellipse rotation if any, we transform the 
                 // coordinates to keep on working as if the ellipse was not 
                 // rotated
                 if (theta !== 0) {
                     x = pt.x;
                     y = pt.y;
                     pt.x = x * Math.cos(theta) + y * Math.sin(theta);
                     pt.y = x * Math.sin(theta) - y * Math.cos(theta);
                 }

                 // Angle with our horizontal ellipse
                 alpha = Math.atan2(pt.y, -pt.x);

                 // Get the intersection point
                 dx = a * Math.sin(alpha);
                 dy = b * Math.cos(alpha);
                 r = (a * b) / Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
                 ptInter = {
                     x: -r * Math.cos(alpha),
                     y: r * Math.sin(alpha)
                 };

                 // Return to normal coordinates
                 if (theta !== 0) {
                     x = ptInter.x;
                     y = ptInter.y;
                     ptInter.x = x * Math.cos(theta) + y * Math.sin(theta);
                     ptInter.y = x * Math.sin(theta) - y * Math.cos(theta);
                 }

                 // Needed in js
                 pt.x += center.x;
                 pt.y += center.y;

                 ptInter.x += center.x;
                 ptInter.y += center.y;
                 return ptInter;
             },

             // Get the intersection between a segment and a polygon, the segment 
             // being directed to the centre of the bounding rectangle of the polygon 
             getPolyNearestPt: function (_points, pt, ctr) {
                 var i, a1, a2, ptI, pt1, pt2, rc, dx, dy, dist, ptNear, maxdist, nbPt;

                 ptNear = {
                     x: 0,
                     y: 0
                 };
                 maxdist = 0;
                 nbPt = _points.length;

                 for (i = 0; i < nbPt; i++) {
                     ptI = {
                         x: 0,
                         y: 0
                     };
                     pt1 = _points[i];
                     pt2 = (i < nbPt - 1) ? _points[i + 1] : _points[0];

                     //if (pt1.x == pt2.x)
                     if (Math.abs(pt1.x - pt2.x) < 0.0001) {
                         //if (ctr.x == pt.x)
                         if (Math.abs(ctr.x - pt.x) < 0.0001) {
                             continue;
                         } else {
                             a1 = (pt.y - ctr.y) / (pt.x - ctr.x);
                             ptI.x = pt1.x;
                             ptI.y = a1 * (pt1.x - ctr.x) + ctr.y;
                         }
                     } else {
                         a2 = (pt2.y - pt1.y) / (pt2.x - pt1.x);
                         //if (ctr.x == pt.x)
                         if (Math.abs(ctr.x - pt.x) < 0.0001) {
                             ptI.x = pt.x;
                             ptI.y = a2 * (pt.x - pt2.x) + pt2.y;
                         } else {
                             a1 = (pt.y - ctr.y) / (pt.x - ctr.x);
                             //if (a1 == a2)
                             if (Math.abs(a1 - a2) < 0.0001) {
                                 continue;
                             } else {
                                 ptI.x = -(pt2.y - a2 * pt2.x - ctr.y + a1 * ctr.x) / (a2 - a1);
                                 ptI.y = a1 * (ptI.x - ctr.x) + ctr.y;
                             }
                         }
                     }

                     rc = Helpers.getRectByTwoPoints(pt1, pt2);
                     rc.left -= 1;
                     rc.top -= 1;
                     rc.width += 2;
                     rc.height += 2;
                     if (rc.containsPoint(ptI)) {
                         dx = ptI.x - pt.x;
                         dy = ptI.y - pt.y;
                         dist = Math.pow(dx, 2) + Math.pow(dy, 2);
                         if (maxdist === 0 || dist < maxdist) {
                             maxdist = dist;
                             ptNear = ptI;
                         }
                     }
                 }
                 return ptNear;
             },

             getRectanglePoints: function (rc, _points) {
                 _points.push({
                     x: rc.left,
                     y: rc.top
                 });
                 _points.push({
                     x: rc.left + rc.width,
                     y: rc.top
                 });
                 _points.push({
                     x: rc.left + rc.width,
                     y: rc.top + rc.height
                 });
                 _points.push({
                     x: rc.left,
                     y: rc.top + rc.height
                 });
                 return 4;
             },

             // Calculate distance between a point and a link (which has several segments) 
             getDistanceBetweenPointAndPolyline: function (_points, nbPt, pt, linkWidth) {
                 var rc, distance, inc, i;

                 distance = 100000000;
                 inc = linkWidth / 2;
                 for (i = 0; i < nbPt - 1; i++) {
                     if (i === 0 || i === nbPt - 2) {
                         if (_points[i].x === _points[i + 1].x) {
                             if (pt.y < Math.min(_points[i].y, _points[i + 1].y) ||
                                 pt.y > Math.max(_points[i].y, _points[i + 1].y)) {
                                 continue;
                             }
                         } else if (_points[i].y === _points[i + 1].y) {
                             if (pt.x < Math.min(_points[i].x, _points[i + 1].x) ||
                                 pt.x > Math.max(_points[i].x, _points[i + 1].x)) {
                                 continue;
                             }
                         } else {
                             rc = Helpers.getRectByTwoPoints(_points[i], _points[i + 1]);
                             rc = rc.inflate(inc, inc);
                             if (!rc.containsPoint(pt)) {
                                 continue;
                             }
                         }
                     }
                     distance = Math.min(distance,
                         Helpers.getSegDist(_points[i], _points[i + 1], pt));
                 }
                 return distance;
             },

             // Calculate distance between a point and a segment. 
             getSegDist: function (A, B, M) {
                 var dist, dx1, dy1, dx2, dy2, a, b,
                     dBAsqr, dMAsqr, dMBsqr, dBA, P, C, dPCsqr;

                 dx1 = A.x - M.x;
                 dy1 = A.y - M.y;
                 dx2 = B.x - M.x;
                 dy2 = B.y - M.y;
                 a = B.x - A.x;
                 b = B.y - A.y;
                 dBAsqr = Math.pow(a, 2) + Math.pow(b, 2);
                 dMAsqr = Math.pow(dx1, 2) + Math.pow(dy1, 2);
                 dMBsqr = Math.pow(dx2, 2) + Math.pow(dy2, 2);

                 // Distance between M and line AB
                 dBA = Math.sqrt(dBAsqr);
                 if (dBA < 1) {
                     dist = Math.sqrt(dMAsqr);
                     return dist;
                 }

                 dist = Math.abs(b * dx1 - a * dy1) / dBA;

                 // In fact we want the distance between M and segment AB (not line AB)
                 // Get the projection point of M on AB line
                 P = {
                     x: M.x - (dist * b / dBA),
                     y: M.y + (dist * a / dBA)
                 };

                 // Get middle point of AB segment
                 C = {
                     x: (B.x + A.x) / 2,
                     y: (B.y + A.y) / 2
                 };

                 // Verify if position of P is outside the segment AB.
                 // If yes then the distance between M and the segment is the
                 // distance between M and the extremity point (A or B) of the segment.
                 dPCsqr = (P.x - C.x) * (P.x - C.x) + (P.y - C.y) * (P.y - C.y);
                 if (dPCsqr > dBAsqr / 4) {
                     dist = Math.sqrt(Math.min(dMAsqr, dMBsqr));
                 }
                 return dist;
             },

             // Gets the first point of a polyline corner 
             getStartingPointOfRoundedCorner: function (_points, k, sizeRound) {
                 var dx, dy, dist, cos, sin, pt;

                 pt = {
                     x: 0,
                     y: 0
                 };
                 dx = _points[k + 1].x - _points[k].x;
                 dy = _points[k].y - _points[k + 1].y;
                 dist = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
                 if (dist > 0) {
                     cos = dx / dist;
                     sin = dy / dist;
                     pt = {
                         x: _points[k + 1].x - sizeRound * cos,
                         y: _points[k + 1].y + sizeRound * sin
                     };
                 }
                 return pt;
             },

             //  Gets the last point of a polyline corner 
             getEndingPointOfRoundedCorner: function (_points, k, sizeRound) {
                 var dx, dy, dist, cos, sin, pt;

                 pt = {
                     x: 0,
                     y: 0
                 };
                 dx = _points[k + 2].x - _points[k + 1].x;
                 dy = _points[k + 1].y - _points[k + 2].y;
                 dist = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
                 if (dist > 0) {
                     cos = dx / dist;
                     sin = dy / dist;
                     return {
                         x: _points[k + 1].x + sizeRound * cos,
                         y: _points[k + 1].y - sizeRound * sin
                     };
                 }
                 return pt;
             },

             // Determines an array of points that approximate a bezier curve 
             flattenBezier: function (pt0, pt1, pt2, pt3, apt) {
                 var t, x, y;

                 for (t = 0.0; t < 1.0; t = t + 0.1) {
                     x = ((1 - t) * (1 - t) * (1 - t) * pt0.x +
                         3 * t * (1 - t) * (1 - t) * pt1.x +
                         3 * t * t * (1 - t) * pt2.x +
                         t * t * t * pt3.x);
                     y = ((1 - t) * (1 - t) * (1 - t) * pt0.y +
                         3 * t * (1 - t) * (1 - t) * pt1.y +
                         3 * t * t * (1 - t) * pt2.y +
                         t * t * t * pt3.y);
                     apt.push({
                         x: x,
                         y: y
                     });
                 }
                 apt.push(pt3);
             },

             // Returns the distance between 2 points
             getPointsDistance: function (p1, p2) {
                 return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
             },

             // Return the bound rectangle for a given set of points
             getBoundingRect: function (_polygon) {
                 var minX, maxX, minY, maxY, i;

                 if (_polygon.length === 0) {
                     return null;
                 }
                 minX = _polygon[0][0];
                 maxX = minX;
                 minY = _polygon[0][1];
                 maxY = minY;
                 for (i = 0; i < _polygon.length; i++) {
                     minX = Math.min(minX, _polygon[i][0]);
                     minY = Math.min(minY, _polygon[i][1]);
                     maxX = Math.max(maxX, _polygon[i][0]);
                     maxY = Math.max(maxY, _polygon[i][1]);
                 }
                 return new MyRect(minX, minY, maxX - minX, maxY - minY);
             }
         };

         //----------------------------------------------------------------
         // OrthoRouter class. A class for creating orthogonal links
         //----------------------------------------------------------------

         function OrthoRouter() {
             var orgOrientation, dstOrientation, n1, n2, s1, s2, or;

             or = this;

             function isAligned(pt1, pt2, pt3) {
                 return ((pt1.x === pt2.x && pt2.x === pt3.x) ||
                     (pt1.y === pt2.y && pt2.y === pt3.y));
             }

             function normalizePoints(apt, _points) {
                 var isChanged, A, B, C, pt1, pt2, pt3, pt4, i;

                 if (_points.length <= 2) {
                     return;
                 }

                 isChanged = true;

                 while (isChanged) {
                     isChanged = false;
                     for (i = 1; i < _points.length - 1; i++) {
                         A = _points[i - 1];
                         B = _points[i];
                         C = _points[i + 1];

                         if ((A.y === B.y && B.y === C.y) || (A.x === B.x && B.x === C.x)) {
                             _points.splice(i, 1); // Remove point
                             isChanged = true;
                             break;
                         }
                     }
                 }

                 for (i = 0; i < _points.length; i++) {
                     apt.push(_points[i]);
                 }

                 // If only 2 points, we add 2 points to obtain 3 orthogonal segments
                 if (_points.length === 2) {
                     pt1 = apt[0];
                     pt4 = apt[1];
                     if (pt1.y === pt4.y) {
                         pt2 = {
                             x: pt1.x + (pt4.x - pt1.x) / 2,
                             y: pt1.y
                         };
                         pt3 = {
                             x: pt4.x - (pt4.x - pt1.x) / 2,
                             y: pt4.y
                         };
                     } else {
                         pt2 = {
                             x: pt1.x,
                             y: pt1.y + (pt4.y - pt1.y) / 2
                         };
                         pt3 = {
                             x: pt4.x,
                             y: pt4.y - (pt4.y - pt1.y) / 2
                         };
                     }
                     apt.splice(1, 0, pt2);
                     apt.splice(2, 0, pt3);
                 }
             }

             function rectIntersectsLine(rc, startPoint, endPoint) {
                 rc = rc.inflate(-1, -1);
                 return rc.intersectsWith(
                     Helpers.getRectByTwoPoints(startPoint, endPoint));
             }

             function isPtVisible(fromPoint, targetPoint, rects) {
                 var i, result;

                 result = true;
                 for (i = 0; i < rects.length; i++) {
                     if (rectIntersectsLine(rects[i], fromPoint, targetPoint)) {
                         result = false;
                         break;
                     }
                 }
                 return result;
             }

             function getOffsetPoint(pt, rect, orientation) {
                 var offsetPoint;

                 switch (orientation) {
                     case 'left':
                         offsetPoint = {
                             x: rect.left,
                             y: pt.y
                         };
                         break;
                     case 'top':
                         offsetPoint = {
                             x: pt.x,
                             y: rect.top
                         };
                         break;
                     case 'right':
                         offsetPoint = {
                             x: rect.left + rect.width,
                             y: pt.y
                         };
                         break;
                     case 'bottom':
                         offsetPoint = {
                             x: pt.x,
                             y: rect.top + rect.height
                         };
                         break;
                     default:
                         break;
                 }
                 return offsetPoint;
             }

             function getOrientation2(p1, p2) {
                 var result = 'none';

                 if (p1.x === p2.x) {
                     if (p1.y >= p2.y) {
                         result = 'bottom';
                     } else {
                         result = 'top';
                     }
                 } else if (p1.y === p2.y) {
                     if (p1.x >= p2.x) {
                         result = 'right';
                     } else {
                         result = 'left';
                     }
                 }
                 return result;
             }

             function getOrientation(itm, pt) {
                 var result, rc, d1, d2, d3, d4, min;

                 rc = getNodeRect(itm);
                 d1 = Math.abs(pt.x - rc.left);
                 d2 = Math.abs(pt.x - (rc.left + rc.width));
                 d3 = Math.abs(pt.y - rc.top);
                 d4 = Math.abs(pt.y - (rc.top + rc.height));
                 min = Math.min(Math.min(Math.min(d1, d2), d3), d4);

                 if (min === d1) {
                     result = 'left';
                 } else if (min === d2) {
                     result = 'right';
                 } else if (min === d3) {
                     result = 'top';
                 } else {
                     result = 'bottom';
                 }
                 return result;
             }

             function getOppositeCorners(orientation, rc) {
                 switch (orientation) {
                     case 'left':
                         n1 = {
                             x: rc.left + rc.width,
                             y: rc.top
                         };
                         n2 = {
                             x: rc.left + rc.width,
                             y: rc.top + rc.height
                         };
                         break;
                     case 'top':
                         n1 = {
                             x: rc.left,
                             y: rc.top + rc.height
                         };
                         n2 = {
                             x: rc.left + rc.width,
                             y: rc.top + rc.height
                         };
                         break;
                     case 'right':
                         n1 = {
                             x: rc.left,
                             y: rc.top
                         };
                         n2 = {
                             x: rc.left,
                             y: rc.top + rc.height
                         };
                         break;
                     case 'bottom':
                         n1 = {
                             x: rc.left,
                             y: rc.top
                         };
                         n2 = {
                             x: rc.left + rc.width,
                             y: rc.top
                         };
                         break;
                     default:
                         // No opposite corners found!
                         break;
                 }
             }

             function getNeighborCorners(orientation, rc) {
                 switch (orientation) {
                     case 'left':
                         n1 = {
                             x: rc.left,
                             y: rc.top
                         };
                         n2 = {
                             x: rc.left,
                             y: rc.top + rc.height
                         };
                         break;
                     case 'top':
                         n1 = {
                             x: rc.left,
                             y: rc.top
                         };
                         n2 = {
                             x: rc.left + rc.width,
                             y: rc.top
                         };
                         break;
                     case 'right':
                         n1 = {
                             x: rc.left + rc.width,
                             y: rc.top
                         };
                         n2 = {
                             x: rc.left + rc.width,
                             y: rc.top + rc.height
                         };
                         break;
                     case 'bottom':
                         n1 = {
                             x: rc.left,
                             y: rc.top + rc.height
                         };
                         n2 = {
                             x: rc.left + rc.width,
                             y: rc.top + rc.height
                         };
                         break;
                     default:
                         // No neighbour corners found
                         break;
                 }
             }

             function getNearestNeighborOrg(endPoint, rcOrg, rcDst, flag) {
                 getNeighborCorners(orgOrientation, rcOrg);
                 if (rcDst.containsPoint(n1)) {
                     flag = false;
                     return n2;
                 }
                 if (rcDst.containsPoint(n2)) {
                     flag = true;
                     return n1;
                 }
                 if ((Helpers.getPointsDistance(n1, endPoint) <=
                         Helpers.getPointsDistance(n2, endPoint))) {
                     flag = true;
                     return n1;
                 } else {
                     flag = false;
                     return n2;
                 }
             }

             function getNearestVisibleNeighborDst(pt, endPoint, rcOrg, rcDst) {
                 var flag1, flag2;

                 getNeighborCorners(dstOrientation, rcDst);
                 s1 = n1;
                 s2 = n2;

                 flag1 = isPtVisible(pt, s1, [rcOrg, rcDst]);
                 flag2 = isPtVisible(pt, s2, [rcOrg, rcDst]);

                 if (flag1) // s1 visible
                 {
                     if (flag2) // s1 and s2 visible
                     {
                         if (rcDst.containsPoint(s1)) {
                             return s2;
                         }
                         if (rcDst.containsPoint(s2)) {
                             return s1;
                         }
                         if ((Helpers.getPointsDistance(s1, endPoint) <=
                                 Helpers.getPointsDistance(s2, endPoint))) {
                             return s1;
                         } else {
                             return s2;
                         }
                     } else {
                         return s1;
                     }
                 } else { // s1 not visible
                     if (flag2) {
                         // only s2 visible
                         return s2;
                     } else {
                         // s1 and s2 not visible
                         return {
                             x: undefined,
                             y: undefined
                         };
                     }
                 }
             }

             function isRectVisible(pt, rc, rects) {
                 if (isPtVisible(pt, {
                         x: rc.left,
                         y: rc.top
                     }, rects)) {
                     return true;
                 }
                 if (isPtVisible(pt, {
                         x: rc.left + rc.width,
                         y: rc.top
                     }, rects)) {
                     return true;
                 }
                 if (isPtVisible(pt, {
                         x: rc.left,
                         y: rc.top + rc.height
                     }, rects)) {
                     return true;
                 }
                 if (isPtVisible(pt, {
                         x: rc.left + rc.width,
                         y: rc.top + rc.height
                     }, rects)) {
                     return true;
                 }
                 return false;
             }

             function getRectWithMargin(itm, margin) {
                 var rc = getNodeRect(itm);
                 rc = rc.inflate(margin, margin);
                 return rc;
             }

             function checkPathEnd(startPoint, endPoint, _points, marginPath) {
                 var pt1 = {
                         x: 0,
                         y: 0
                     },
                     pt2 = {
                         x: 0,
                         y: 0
                     };

                 switch (orgOrientation) {
                     case 'left':
                         pt1 = {
                             x: startPoint.x + marginPath,
                             y: startPoint.y
                         };
                         break;
                     case 'top':
                         pt1 = {
                             x: startPoint.x,
                             y: startPoint.y + marginPath
                         };
                         break;
                     case 'right':
                         pt1 = {
                             x: startPoint.x - marginPath,
                             y: startPoint.y
                         };
                         break;
                     case 'bottom':
                         pt1 = {
                             x: startPoint.x,
                             y: startPoint.y - marginPath
                         };
                         break;
                     default:
                         break;
                 }

                 switch (dstOrientation) {
                     case 'left':
                         pt2 = {
                             x: endPoint.x + marginPath,
                             y: endPoint.y
                         };
                         break;
                     case 'top':
                         pt2 = {
                             x: endPoint.x,
                             y: endPoint.y + marginPath
                         };
                         break;
                     case 'right':
                         pt2 = {
                             x: endPoint.x - marginPath,
                             y: endPoint.y
                         };
                         break;
                     case 'bottom':
                         pt2 = {
                             x: endPoint.x,
                             y: endPoint.y - marginPath
                         };
                         break;
                     default:
                         break;
                 }

                 _points.splice(0, 0, pt1);
                 _points.push(pt2);
             }

             function optimizeLinePoints(apt, rects) {
                 var i, j, k, orientFrom, orientTo, centerX, centerY, apt2, cut;

                 apt2 = [];
                 cut = 0;
                 for (i = 0; i < apt.length; i++) {
                     if (i >= cut) {
                         for (k = apt.length - 1; k > i; k--) {
                             if (isPtVisible(apt[i], apt[k], rects)) {
                                 cut = k;
                                 break;
                             }
                         }
                         apt2.push(apt[i]);
                     }
                 }

                 for (j = 0; j < apt2.length - 1; j++) {
                     if (apt2[j].x !== apt2[j + 1].x &&
                         apt2[j].y !== apt2[j + 1].y) {
                         // orientation from point
                         if (j === 0) {
                             orientFrom = orgOrientation;
                         } else {
                             orientFrom = getOrientation2(apt2[j], apt2[j - 1]);
                         }

                         // orientation to point
                         if (j === apt2.length - 2) {
                             orientTo = dstOrientation;
                         } else {
                             orientTo = getOrientation2(apt2[j + 1], apt2[j + 2]);
                         }

                         if ((orientFrom === 'left' || orientFrom === 'right') &&
                             (orientTo === 'left' || orientTo === 'right')) {
                             centerX = Math.min(apt2[j].x,
                                 apt2[j + 1].x) + Math.abs(apt2[j].x - apt2[j + 1].x) / 2;
                             apt2.splice(j + 1, 0, {
                                 x: centerX,
                                 y: apt2[j].y
                             });
                             apt2.splice(j + 2, 0, {
                                 x: centerX,
                                 y: apt2[j + 2].y
                             });
                             if (apt2.length - 1 > j + 3) {
                                 apt2.splice(j + 3, 1);
                             }
                             return apt2;
                         }

                         if ((orientFrom === 'top' || orientFrom === 'bottom') &&
                             (orientTo === 'top' || orientTo === 'bottom')) {
                             centerY = Math.min(apt2[j].y,
                                 apt2[j + 1].y) + Math.abs(apt2[j].y - apt2[j + 1].y) / 2;
                             apt2.splice(j + 1, 0, {
                                 x: apt2[j].x,
                                 y: centerY
                             });
                             apt2.splice(j + 2, 0, {
                                 x: apt2[j + 2].x,
                                 y: centerY
                             });
                             if (apt2.length - 1 > j + 3) {
                                 apt2.splice(j + 3, 1);
                             }
                             return apt2;
                         }

                         if ((orientFrom === 'left' || orientFrom === 'right') &&
                             (orientTo === 'top' || orientTo === 'bottom')) {
                             apt2.splice(j + 1, 0, {
                                 x: apt2[j + 1].x,
                                 y: apt2[j].y
                             });
                             return apt2;
                         }

                         if ((orientFrom === 'top' || orientFrom === 'bottom') &&
                             (orientTo === 'left' || orientTo === 'right')) {
                             apt2.splice(j + 1, 0, {
                                 x: apt2[j].x,
                                 y: apt2[j + 1].y
                             });
                             return apt2;
                         }
                     }
                 }
                 return apt2;
             }

             or.getConnectionLine = function (org, dst, pinOrg, pinDst, orthoMargin) {
                 var startPoint, endPoint, currentPoint, flag, n, neighbour, apt,
                     n1Visible, n2Visible,
                     _points = [],
                     virtualPinsOrg = false,
                     virtualPinsDst = false,
                     orgPins = null,
                     dstPins = null,
                     rcOrg = getRectWithMargin(org, orthoMargin),
                     rcDst = getRectWithMargin(dst, orthoMargin),
                     ptOrg = rcOrg.centerPoint(),
                     ptDst = rcDst.centerPoint();

                 // If the origin node has no pin, we do as if it has 4 pins
                 // (left, top, right, bottom) and we select the best one
                 if (pinOrg === undefined || pinOrg === null || org.pins === null) {
                     // Those 4 pins will be removed at the end
                     virtualPinsOrg = true; // flag for deleting pins
                     orgPins = org.pins;
                     org.pins = [
                         [0, 50],
                         [50, 0],
                         [100, 50],
                         [50, 100]
                     ];

                     // Select the best pin for our link
                     if (Math.abs(ptOrg.x - ptDst.x) < Math.abs(ptOrg.y - ptDst.y)) {
                         if (ptDst.y > ptOrg.y) {
                             pinOrg = 3;
                         } else {
                             pinOrg = 1;
                         }
                     } else {
                         if (ptDst.x > ptOrg.x) {
                             pinOrg = 2;
                         } else {
                             pinOrg = 0;
                         }
                     }
                 }

                 // If the destination node has no pin, we do as if it has 4 pins 
                 // (left, top, right, bottom) and we select the best one
                 if (pinDst === undefined || pinDst === null || dst.pins === null) {
                     // Those 4 pins will be removed at the end
                     virtualPinsDst = true; // flag for deleting pins
                     dstPins = dst.pins;
                     dst.pins = [
                         [0, 50],
                         [50, 0],
                         [100, 50],
                         [50, 100]
                     ];

                     // Select the best pin for our link
                     if (Math.abs(ptOrg.x - ptDst.x) < Math.abs(ptOrg.y - ptDst.y)) {
                         if (ptOrg.y < ptDst.y) {
                             pinDst = 1;
                         } else {
                             pinDst = 3;
                         }
                     } else {
                         if (ptOrg.x < ptDst.x) {
                             pinDst = 0;
                         } else {
                             pinDst = 2;
                         }
                     }
                 }

                 startPoint = getPinPosition(org, pinOrg);
                 orgOrientation = getOrientation(org, startPoint);
                 startPoint = getOffsetPoint(startPoint, rcOrg, orgOrientation);

                 endPoint = getPinPosition(dst, pinDst);
                 dstOrientation = getOrientation(dst, endPoint);
                 endPoint = getOffsetPoint(endPoint, rcDst, dstOrientation);

                 _points.push(startPoint);
                 currentPoint = startPoint;

                 if (!rcDst.containsPoint(currentPoint) &&
                     !rcOrg.containsPoint(endPoint)) {
                     while (true) {
                         if (isPtVisible(currentPoint, endPoint, [rcOrg, rcDst])) {
                             _points.push(endPoint);
                             currentPoint = endPoint;
                             break;
                         }

                         neighbour = getNearestVisibleNeighborDst(
                             currentPoint, endPoint, rcOrg, rcDst);
                         if (neighbour.x !== undefined) {
                             _points.push(neighbour);
                             _points.push(endPoint);
                             currentPoint = endPoint;
                             break;
                         }

                         if (currentPoint === startPoint) {
                             n = getNearestNeighborOrg(endPoint, rcOrg, rcDst, flag);
                             _points.push(n);
                             currentPoint = n;

                             if (!isRectVisible(currentPoint, rcDst, [rcOrg])) {
                                 getOppositeCorners(orgOrientation, rcOrg);
                                 if (flag) {
                                     _points.push(n1);
                                     currentPoint = n1;
                                 } else {
                                     _points.push(n2);
                                     currentPoint = n2;
                                 }
                                 if (!isRectVisible(currentPoint, rcDst, [rcOrg])) {
                                     if (flag) {
                                         _points.push(n2);
                                         currentPoint = n2;
                                     } else {
                                         _points.push(n1);
                                         currentPoint = n1;
                                     }
                                 }
                             }
                         } else // from here on we jump to the dst node
                         {
                             getNeighborCorners(dstOrientation, rcDst);
                             s1 = n1;
                             s2 = n2;
                             getOppositeCorners(dstOrientation, rcDst);

                             n1Visible = isPtVisible(currentPoint, n1, [rcOrg, rcDst]);
                             n2Visible = isPtVisible(currentPoint, n2, [rcOrg, rcDst]);

                             if (n1Visible && n2Visible) {
                                 if (rcOrg.containsPoint(n1)) {
                                     _points.push(n2);
                                     if (rcOrg.containsPoint(s2)) {
                                         _points.push(n1);
                                         _points.push(s1);
                                     } else {
                                         _points.push(s2);
                                     }

                                     _points.push(endPoint);
                                     currentPoint = endPoint;
                                     break;
                                 }

                                 if (rcOrg.containsPoint(n2)) {
                                     _points.push(n1);
                                     if (rcOrg.containsPoint(s1)) {
                                         _points.push(n2);
                                         _points.push(s2);
                                     } else {
                                         _points.push(s1);
                                     }

                                     _points.push(endPoint);
                                     currentPoint = endPoint;
                                     break;
                                 }

                                 if (Helpers.getPointsDistance(n1, endPoint) <=
                                     Helpers.getPointsDistance(n2, endPoint)) {
                                     _points.push(n1);
                                     if (rcOrg.containsPoint(s1)) {
                                         _points.push(n2);
                                         _points.push(s2);
                                     } else {
                                         _points.push(s1);
                                     }
                                     _points.push(endPoint);
                                     currentPoint = endPoint;
                                     break;
                                 } else {
                                     _points.push(n2);
                                     if (rcOrg.containsPoint(s2)) {
                                         _points.push(n1);
                                         _points.push(s1);
                                     } else {
                                         _points.push(s2);
                                     }
                                     _points.push(endPoint);
                                     currentPoint = endPoint;
                                     break;
                                 }
                             } else if (n1Visible) {
                                 _points.push(n1);
                                 if (rcOrg.containsPoint(s1)) {
                                     _points.push(n2);
                                     _points.push(s2);
                                 } else {
                                     _points.push(s1);
                                 }
                                 _points.push(endPoint);
                                 currentPoint = endPoint;
                                 break;
                             } else {
                                 _points.push(n2);
                                 if (rcOrg.containsPoint(s2)) {
                                     _points.push(n1);
                                     _points.push(s1);
                                 } else {
                                     _points.push(s2);
                                 }
                                 _points.push(endPoint);
                                 currentPoint = endPoint;
                                 break;
                             }
                         }
                     }
                 } else {
                     _points.push(endPoint);
                 }

                 _points = optimizeLinePoints(_points, [rcOrg, rcDst]);
                 checkPathEnd(startPoint, endPoint, _points, orthoMargin);

                 if (virtualPinsDst) {
                     dst.pins = dstPins;
                 }
                 if (virtualPinsOrg) {
                     org.pins = orgPins;
                 }

                 apt = [];
                 normalizePoints(apt, _points);
                 return apt;
             };
         }

         //----------------------------------------------------------------
         // PolylineHelper class. A class for finding a point on a polyline
         //----------------------------------------------------------------

         function PolylineHelper(_points) {
             var plh, i, pt, priorSegment, length, tangent,
                 list, Segment, getSegmentLength, getLength;

             plh = this;
             tangent = null;
             list = [];

             // Each segment is part of a polyline. The offset is the length
             // from the beginning.
             Segment = function (offset, point) {
                 var seg = this;
                 seg.offset = offset;
                 seg.point = point;
             };

             getSegmentLength = function (pt1, pt2) {
                 return Math.sqrt(Math.pow(pt2.x - pt1.x, 2) + Math.pow(pt2.y - pt1.y, 2));
             };

             getLength = function () {
                 if (list.length < 2) {
                     return 0;
                 }
                 var segment = list[list.length - 1];
                 return segment.offset;
             };

             for (i = 0; i < _points.length; i++) {
                 pt = _points[i];
                 if (list.length === 0) {
                     list.push(new Segment(0, pt));
                 } else {
                     // Determine accumulated offset of Point
                     priorSegment = list[list.length - 1];
                     length = getSegmentLength(pt, priorSegment.point);
                     list.push(new Segment(priorSegment.offset + length, pt));
                 }
             }

             plh.getPointAtFractionLength = function (progress) {
                 var point, offset, index1, index2, testIndex, seg1, seg2, pt1, pt2,
                     offset1, offset2, dx, dy, d;

                 if (progress < 0 || progress > 1 || getLength() === 0) {
                     return null;
                 }

                 offset = progress * getLength();

                 // Binary search
                 index1 = 0;
                 index2 = list.length - 1;

                 while (index2 - index1 > 1) {
                     testIndex = Math.floor((index2 + index1) / 2);
                     if (offset < list[testIndex].offset) {
                         index2 = testIndex;
                     } else {
                         index1 = testIndex;
                     }
                 }

                 seg1 = list[index1];
                 seg2 = list[index2];
                 pt1 = seg1.point;
                 pt2 = seg2.point;
                 offset1 = seg1.offset;
                 offset2 = seg2.offset;

                 point = {
                     x: ((offset2 - offset) * pt1.x + (offset - offset1) * pt2.x) / (offset2 - offset1),
                     y: ((offset2 - offset) * pt1.y + (offset - offset1) * pt2.y) / (offset2 - offset1)
                 };

                 dx = pt2.x - pt1.x;
                 dy = pt2.y - pt1.y;
                 d = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
                 tangent = {
                     x: dx / d,
                     y: dy / d
                 };
                 return point;
             };

             plh.getTangent = function () {
                 return tangent;
             };
         }


         //----------------------------------------------------------------------------
         // Quadtree class. A class for managing a quadtree structure
         // It allows improving speed performance of diagram display and item selection
         //----------------------------------------------------------------------------

         var Quadtree = {};

         Quadtree._init = function (x, y, w, h) {
             var quadrant;

             quadrant = function (x, y, w, h) {
                 var _items, _topLeft, _topRight, _bottomLeft, _bottomRight;

                 _items = [];
                 _topLeft = null;
                 _topRight = null;
                 _bottomLeft = null;
                 _bottomRight = null;

                 return {
                     x: x, // left 
                     y: y, // right 
                     w: w, // width
                     h: h, // height

                     // Returns the array of items in this quadrant that intersect the given bounds.
                     _getIntersectingItems: function (_array, _bounds) {
                         var topLeft, topRight, bottomLeft, bottomRight, i;

                         if (_bounds === undefined || _bounds === null || _bounds.width === 0 || _bounds.height === 0)
                             return;

                         topLeft = new MyRect(x, y, w / 2, h / 2);
                         topRight = new MyRect(x + w / 2, y, w / 2, h / 2);
                         bottomLeft = new MyRect(x, y + h / 2, w / 2, h / 2);
                         bottomRight = new MyRect(x + w / 2, y + h / 2, w / 2, h / 2);

                         // See if any child quadrants intersects with the rectangle
                         if (topLeft.intersectsWith(_bounds) && _topLeft !== null) {
                             _topLeft._getIntersectingItems(_array, _bounds);
                         }

                         if (topRight.intersectsWith(_bounds) && _topRight !== null) {
                             _topRight._getIntersectingItems(_array, _bounds);
                         }

                         if (bottomLeft.intersectsWith(_bounds) && _bottomLeft !== null) {
                             _bottomLeft._getIntersectingItems(_array, _bounds);
                         }

                         if (bottomRight.intersectsWith(_bounds) && _bottomRight !== null) {
                             _bottomRight._getIntersectingItems(_array, _bounds);
                         }

                         for (i = 0; i < _items.length; i++) {
                             if (_items[i].bounds.intersectsWith(_bounds)) {
                                 _array.push(_items[i]);
                             }
                         }
                     },

                     // Adds a new item to the quadrant.
                     // If the quadrant already has subquadrants, the item gets pushed down one level.
                     // If the item does not fit into the subquadrants, it gets saved in the
                     // "_items" array.   
                     _insert: function (itm, _bounds) {
                         var topLeft, topRight, bottomLeft, bottomRight, _child, i;

                         topLeft = new MyRect(x, y, w / 2, h / 2);
                         topRight = new MyRect(x + w / 2, y, w / 2, h / 2);
                         bottomLeft = new MyRect(x, y + h / 2, w / 2, h / 2);
                         bottomRight = new MyRect(x + w / 2, y + h / 2, w / 2, h / 2);

                         _child = null;

                         if (topLeft.containsRect(_bounds)) {
                             if (_topLeft === null) {
                                 _topLeft = new quadrant(topLeft.left, topLeft.top, topLeft.width, topLeft.height);
                             }
                             _child = _topLeft;
                         } else if (topRight.containsRect(_bounds)) {
                             if (_topRight === null) {
                                 _topRight = new quadrant(topRight.left, topRight.top, topRight.width, topRight.height);
                             }
                             _child = _topRight;
                         } else if (bottomLeft.containsRect(_bounds)) {
                             if (_bottomLeft === null) {
                                 _bottomLeft = new quadrant(bottomLeft.left, bottomLeft.top, bottomLeft.width, bottomLeft.height);
                             }
                             _child = _bottomLeft;
                         } else if (bottomRight.containsRect(_bounds)) {
                             if (_bottomRight === null) {
                                 _bottomRight = new quadrant(bottomRight.left, bottomRight.top, bottomRight.width, bottomRight.height);
                             }
                             _child = _bottomRight;
                         }

                         if (_child !== null) {
                             return _child._insert(itm, _bounds);
                         } else {
                             _items.push(itm);
                             itm.quadrant = this;
                         }
                     },

                     _remove: function (itm) {
                         var idx, i;

                         idx = -1;
                         if (_items !== null) {
                             for (i = 0; i < _items.length; i++) {
                                 if (_items[i] === itm) {
                                     idx = i;
                                     break;
                                 }
                             }
                             _items.splice(idx, 1);
                         }
                     },

                     // Clears the quadrant and all its subquadrants.
                     _clear: function () {
                         if (_topLeft !== null) {
                             _topLeft._clear();
                         }
                         if (_topRight !== null) {
                             _topRight._clear();
                         }
                         if (_bottomLeft !== null) {
                             _bottomLeft._clear();
                         }
                         if (_bottomRight !== null) {
                             _bottomRight._clear();
                         }
                         _items.length = 0;
                     },
                 };
             };

             return {
                 _root: (function () {
                     return quadrant(x, y, w, h);
                 }()),

                 _insert: function (itm, bounds) {
                     this._root._insert(itm, bounds);
                 },

                 _remove: function (itm) {
                     if (itm.quadrant !== null) {
                         itm.quadrant._remove(itm);
                     }
                 },

                 _getItems: function (bounds) {
                     var result = [];
                     this._root._getIntersectingItems(result, bounds);
                     return result;
                 },

                 _clear: function () {
                     this._root._clear();
                 }
             };
         };

         //----------------------------------------------------------------
         /** @description Creates a new Node item.
         @class Node class.
         @constructor Returns a Node object.*/
         //----------------------------------------------------------------

         Node = function (x, y, w, h, text) {
             var _isSelected = false,
                 tsk = null,
                 _links = []; // collection of links coming to the node or leaving it.

             /** @description The item's type. Don't use this
             property which is only provided for the AddFlow infrastructure. */
             this.kindOfItem = 'Node';

             /** @description The zorder of the node. Don't use this
             property which is only provided for the AddFlow infrastructure. */
             this.index = -1;

             this.flow = null;
             this.bounds = null;
             this.quadrant = null;

             /** @description The x coordinate of the node location. Don't use this
             property which is only provided for the AddFlow infrastructure. You
             should use instead the methods setLeft and getLeft. */
             this.x = x;

             /** @description The y coordinate of the node location. Don't use this
             property which is only provided for the AddFlow infrastructure. You
             should use instead the methods setTop and getTop. */
             this.y = y;

             /** @description The width of the node. Don't use this
             property which is only provided for the AddFlow infrastructure. You
             should use instead the methods setWidth and getWidth. */
             this.w = w;

             /** @description The height of the node. Don't use this
             property which is only provided for the AddFlow infrastructure. You
             should use instead the methods setHeight and getHeight. */
             this.h = h;

             /** @description Sets or returns the text associated with the node.
             If the item is a node, the text is displayed inside the node.
             It is a multiline display. The text is wrapped automatically inside the node.
             Linefeed and carriage return characters are allowed. */
             this.text = (text !== undefined) ? text : null;

             /** @description The color used to draw the node */
             this.strokeStyle = '#000';

             /** @description The color used to fill the node */
             this.fillStyle = '#fff';

             /** @description The color used to create a gradient with the
             fillStyle color */
             this.gradientFillStyle = '#fff';

             /** @description The color used to dispaly the text of the node  */
             this.textFillStyle = '#000';

             /** @description The thickness of the lines used to draw the node
             @default 1 */
             this.lineWidth = 1.0;

             /** @description ellipse, rectangle, polygon, other */
             this.shapeFamily = 'ellipse';

             /** @description The set of points defining the node shape if
             if the shapeFamily property is 'polygon'.
             @default null */
             this.polygon = null;

             /** @description The method used to draw the node shape
             if the shapeFamily property is 'other'
             @default null */
             this.drawShape = null;

             /** @description The method used to fill the node shape.
             @default null */
             this.fillShape = null;

             /** @description Sets or gets the list of node pins
             @default null */
             this.pins = null;

             /** @description Determines whether the item is selectable by
             clicking on it with the mouse or unselectable (readonly or inactive)
             @default true */
             this.isSelectable = true;

             /** @description Determines whether the node can be horizontally
             resized or not.
             @default true */
             this.isXSizeable = true;

             /** @description Determines whether the node can be vertically
             resized or not.
             @default true */
             this.isYSizeable = true;

             /** @description Determines whether the node can be horizontally
             moved or not
             @default true */
             this.isXMoveable = true;

             /** @description Determines whether the node can be vertically moved or not
             @default true */
             this.isYMoveable = true;

             /** @description Determines whether the node can be vertically moved or not
             @default true */
             this.isOutLinkable = true;

             /** @description Determines whether the node accept incoming links
             @default true */
             this.isInLinkable = true;

             /** @description Determines if a context handle is displayed when the 
             node is selected
             @default false */
             this.isContextHandle = false;

             /** @description Determines whether a shadow is displayed for the node
             @default false */
             this.isShadowed = false;

             /** @description The image displayed in the node */
             this.image = null;

             /** @description Returns/sets the margins of the text in the node. */
             this.textMargin = {
                 left: 0,
                 top: 0,
                 right: 0,
                 bottom: 0
             };

             /** @description Returns/sets the margins of the image in the node. */
             this.imageMargin = {
                 left: 0,
                 top: 0,
                 right: 0,
                 bottom: 0
             };

             /** @description Used to specify the position of the text in the node.
             leftTop leftMiddle leftBottom rightTop rightMiddle
             rightBottom centerTop centerMiddle centerBottom
             @default centerMiddle */
             this.textPosition = 'centerMiddle';

             /** @description Used to specify the position of the image in the node.
             leftTop leftMiddle leftBottom rightTop rightMiddle
             rightBottom centerTop centerMiddle centerBottom
             @default centerMiddle */
             this.imagePosition = 'centerMiddle';

             /** @description The font used to display the text of the node */
             this.font = '12px Arial';

             /** @description The height of a line of the text of the node */
             this.textLineHeight = null;


             /* Node methods---------------------------------------------------------*/

             /** @description Determines if the node is selected or not */
             this.getIsSelected = function () {
                 return _isSelected;
             };

             /** @description Selects or unselects the node */
             this.setIsSelected = function (sel) {
                 if (sel !== _isSelected) {
                     _isSelected = sel;
                     selectItem(this, selectAllFlag);
                 }
             };

             /** @description Returns the list of links attached to this node.
                If a link is reflexive, it is counted two times. So if a node
                has one reflexive link, this list will contain this reflexive
                two times.
             */
             this.getLinks = function () {
                 return _links;
             };

             /** @description Gets the x coordinate of the node location */
             this.getLeft = function () {
                 return this.x;
             };

             /** @description Sets the x coordinate of the node location */
             this.setLeft = function (x) {
                 var rc = getNodeRect(this);
                 rc.left = x;
                 setNodeRect(this, rc);
             };

             /** @description Gets the y coordinate of the node location */
             this.getTop = function () {
                 return this.y;
             };

             /** @description Sets the y coordinate of the node location */
             this.setTop = function (y) {
                 var rc = getNodeRect(this);
                 rc.top = y;
                 setNodeRect(this, rc);
             };

             /** @description Gets the width of the node */
             this.getWidth = function () {
                 return this.w;
             };

             /** @description Sets the width of the node  */
             this.setWidth = function (w) {
                 var rc = getNodeRect(this);
                 rc.width = w;
                 setNodeRect(this, rc);
             };

             /** @description Gets the height of the node */
             this.getHeight = function () {
                 return this.h;
             };

             /** @description Sets the height of the node */
             this.setHeight = function (h) {
                 var rc = getNodeRect(this);
                 rc.height = h;
                 setNodeRect(this, rc);
             };

             /** @description Cause the node to be updated. */
             this.refresh = function () {
                 invalidateNode(this);
                 updateDrawing();
             };

             /** @description Clone the node */
             this.clone = function () {
                 var _node = new Node(this.x, this.y, this.w, this.h, this.text);
                 copyNodeProperties(_node, this);
                 return _node;
             };
         };

         //----------------------------------------------------------------
         /** @description Creates a new Link item.
         @class Link class
         @constructor Returns a Link object.*/
         //----------------------------------------------------------------

         Link = function (org, dst, text, pinOrg, pinDst) {
             var _isSelected = false,
                 tsk = null;

             /** @description The item's type. Don't use this
             property which is only provided for the AddFlow infrastructure. */
             this.kindOfItem = 'Link';

             /** @description The zorder of the node. Don't use this
             property which is only provided for the AddFlow infrastructure. */
             this.index = -1;

             this.flow = null;
             this.bounds = null;
             this.quadrant = null;

             /** @description The origin node of the link. Don't use this
             property which is only provided for the AddFlow infrastructure. 
             You should use instead the getOrg and setOrg methods. */
             this.org = org;

             /** @description The destination node of the link. Don't use this
             property which is only provided for the AddFlow infrastructure. 
             You should use instead the getDst and setDst methods. */
             this.dst = dst;

             /** @description The index of the origin pin of the link. Don't use this
             property which is only provided for the AddFlow infrastructure. 
             You should use instead the getPinOrg and setPinOrg methods. */
             this.pinOrg = (pinOrg === undefined) ? null : pinOrg;

             /** @description The index of the destination pin of the link. Don't use this
             property which is only provided for the AddFlow infrastructure. 
             You should use instead the getPinDst and setPinDst methods. */
             this.pinDst = (pinDst === undefined) ? null : pinDst;

             /** @description The font used to display the text of the link */
             this.font = '12px Arial';

             /** @description Sets or returns the text associated with the link. */
             this.text = (text !== undefined) ? text : null;

             /** @description The color used to draw the link */
             this.strokeStyle = '#000';

             /** @description The color used to fill the link */
             this.fillStyle = '#fff';

             /** @description The color used to dispaly the text of the link */
             this.textFillStyle = '#000';

             /** @description The thickness of the lines used to draw the node
             @default 1 */
             this.lineWidth = 1.0;

             /** @description Determines whether the link is stretchable or not.
              When a link is not stretchable, the user cannot interactively stretch it
              with the mouse.
              @default true */
             this.isStretchable = true;

             /** @description Determines whether the item is selectable by
             clicking on it with the mouse or unselectable (readonly or inactive)
             @default true */
             this.isSelectable = true;

             /** @description Determines if a context handle is displayed when the 
             link is selected
             @default false */
             this.isContextHandle = false;

             /** @description Determines whether a shadow is displayed for the link
             @default false */
             this.isShadowed = false;

             /** @description Determines whether the first link point can be changed.
             Don't use this property which is only provided for the AddFlow 
             infrastructure. You should use instead the methods getIsOrgPointAdjustable 
             and setIsOrgPointAdjustable
             @default false */
             this.isOrgPointAdjustable = false;

             /** @description Determines whether the last link point can be changed.
             Don't use this property which is only provided for the AddFlow 
             infrastructure. You should use instead the methods getIsDstPointAdjustable 
             and setIsDstPointAdjustable
             @default false */
             this.isDstPointAdjustable = false;

             /** @description Determines the size of the rounded corner at the
             intersection point of 2 segments. This property will have not
             any effect if the style property of the link is bezier.
             @default 0  */
             this.roundedCornerSize = 0;

             /** @description Determines whether the text of the link is aligned with
             the link.
             @default false */
             this.isOrientedText = false;

             /** @description Determines whether the background of the text of the link
             is opaque.
             @default false */
             this.isOpaque = false;

             /** @description The font used to display the text of the node */
             this.font = '12px Arial';

             /** @description Returns/sets the shape of the link
             destination arrow head */
             this.arrowDst = _arrow;

             /** @description Returns/sets the shape of the link
             origin arrow head */
             this.arrowOrg = null;

             /** @description Returns/sets the line style
             (polyline, bezier, spline, database, orthogonal) Don't use this
             property which is only provided for the AddFlow infrastructure. 
             You should use instead the methods getLineStyle and setLineStyle
             @default 'polyline' */
             this.lineStyle = 'polyline';

             /** The margin used to display orthogonal links */
             this.orthoMargin = 30;

             /** @description Don't use this
             property which is only provided for the AddFlow infrastructure. */
             this.firstSegmentHorizontal = false;

             /** @description The collection of link points.
             Don't use this property which is only provided for the
             AddFlow infrastructure. To manipulate the collection of link points,
             you should use instead the methods addPoint, removePoint, clearPoints,
             countPoints, getPoint and setPoint.
             @see Lassalle.Flow-Link#addPoint
             */
             this.points = [];


             /* Link methods---------------------------------------------------------*/

             /** @description Determines if the link is selected or not */
             this.getIsSelected = function () {
                 return _isSelected;
             };

             /** @description Selects or unselects the link */
             this.setIsSelected = function (sel) {
                 if (sel !== _isSelected) {
                     _isSelected = sel;
                     selectItem(this, selectAllFlag);
                 }
             };

             /** @description Returns the origin node of the link */
             this.getOrg = function () {
                 return this.org;
             };

             /** @description Sets a new origin node for the link */
             this.setOrg = function (org) {
                 setLinkOrg(this, org);
             };

             /** @description Returns the destination node of the link */
             this.getDst = function () {
                 return this.dst;
             };

             /** @description Sets a new destination node for the link */
             this.setDst = function (dst) {
                 setLinkDst(this, dst);
             };

             /** @description Returns the pin index of origin node of the link */
             this.getPinOrg = function () {
                 return this.pinOrg;
             };

             /** @description Sets the pin index of the origin node for the link */
             this.setPinOrg = function (pinOrg) {
                 setLinkPinOrg(this, pinOrg);
             };

             /** @description Returns the pin index of destination node of the link */
             this.getPinDst = function () {
                 return this.pinDst;
             };

             /** @description Sets the pin index of the destination node for the link */
             this.setPinDst = function (pinDst) {
                 setLinkPinDst(this, pinDst);
             };

             /** @description Cause the link to be updated. */
             this.refresh = function () {
                 invalidateLink(this);
                 updateDrawing();
             };

             /** @description Clone the link */
             this.clone = function () {
                 var _link =
                     new Link(this.org, this.dst, this.text, this.pinOrg, this.pinDst);
                 copyLinkProperties(_link, this);
                 return _link;
             };

             /** @description Get the link lineStyle
             (polyline, bezier, spline, database, orthogonal) */
             this.getLineStyle = function () {
                 return this.lineStyle;
             };

             /** @description Set the link lineStyle
             (polyline, bezier, spline, database, orthogonal) */
             this.setLineStyle = function (lineStyle) {
                 setLinkLineStyle(this, lineStyle);
             };

             /** @description Get the link isOrgPointAdjustable property value */
             this.getIsOrgPointAdjustable = function () {
                 return this.isOrgPointAdjustable;
             };

             /** @description Set the link isOrgPointAdjustable property value */
             this.setIsOrgPointAdjustable = function (adjustable) {
                 setLinkIsOrgPointAdjustable(this, adjustable);
             };

             /** @description Get the link isDstPointAdjustable property value */
             this.getIsDstPointAdjustable = function () {
                 return this.isDstPointAdjustable;
             };

             /** @description Set the link isDstPointAdjustable property value */
             this.setIsDstPointAdjustable = function (adjustable) {
                 setLinkIsDstPointAdjustable(this, adjustable);
             };

             /** @description Add a point to the collection of points of a link.
             This method will work only if the link lineStyle allows adding points to the
             link. For instance, it will not work if the link has a bezier lineStyle. */
             this.addPoint = function (x, y) {
                 addLinkPoint(this, x, y);
             };

             /** @description Removes the point at the specified index from the collection
             of points of the link.
             This method will work only if the link lineStyle allows removing points to the
             link. For instance, it will not work if the link has a bezier lineStyle. */
             this.removePoint = function (index) {
                 removeLinkPoint(this, index);
             };

             /** @description Clears the collection of points of the link, removing all
             points except the first and the last since a link points collection is never
             empty and contains at least 2 points.
             This method will work only if the link lineStyle allows removing points to the
             link. For instance, it will not work if the link has a bezier lineStyle. */
             this.clearPoints = function () {
                 clearLinkPoints(this);
             };

             /** @description Gets the total number of points in the collection of points
             of a link. */
             this.countPoints = function () {
                 return this.points.length;
             };

             /** @description Returns the point at the specified index.*/
             this.getPoint = function (index) {
                 return getLinkPoint(this, index);
             };

             /** @description Sets a point at the specified index. */
             this.setPoint = function (x, y, index) {
                 setLinkPoint(this, x, y, index);
             };
         };

         //----------------------------------------------------------------
         /** @description The generic class used to manage the undo/redo of 
         AddFlow actions. All class that you will create to manage actions
         should derive from this class.
         @class Task class
         @ignore */
         //----------------------------------------------------------------
         Task = function () {
             this._currentItem = null;
             this.group = -1;

             /** AF_del AF_dst AF_linkAdd AF_linkRemove AF_linkStretch
             AF_moveSelectedNodes AF_nodeAdd  AF_nodeMoveAndSize AF_nodeRemove
             AF_nodeResize AF_none AF_org AF_points AF_resizeSelectedNodes
             AF_rotateSelectedNodes AF_zOrder */
             this.groupCode = 'AF_none';

             /** AF_del AF_dst AF_linkAdd AF_linkRemove AF_linkStretch
             AF_moveSelectedNodes AF_nodeAdd  AF_nodeMoveAndSize AF_nodeRemove
             AF_nodeResize AF_none AF_org AF_points AF_resizeSelectedNodes
             AF_rotateSelectedNodes AF_zOrder */
             this.code = 'AF_none';
         };


         // This class is used to manage the undo/redo of a node
         // move or resize action. It derives from the Task class.
         NodeLayoutTask = function (flow, itm, oldrc) {
             Task.call(this);

             var div, hScrollOffset, vScrollOffset, tsk;

             div = flow.canvas.parentNode;
             hScrollOffset = 0;
             vScrollOffset = 0;
             tsk = this;
             tsk.code = 'AF_nodeMoveAndSize';
             tsk._currentItem = itm;

             if (div !== null && div !== undefined) {
                 hScrollOffset = div.scrollLeft;
                 vScrollOffset = div.scrollTop;
             }

             tsk.redo = function () {
                 tsk.undo();
             };

             tsk.undo = function () {
                 var rc, hScrollOffset2, vScrollOffset2;

                 hScrollOffset2 = 0;
                 vScrollOffset2 = 0;
                 if (div !== null && div !== undefined) {
                     hScrollOffset2 = div.scrollLeft;
                     vScrollOffset2 = div.scrollTop;
                 }

                 rc = getNodeRect(tsk._currentItem);
                 setNodeRect(tsk._currentItem, oldrc);

                 // Draw node and, if it is selected, adjust the position of its handles
                 invalidateNode(tsk._currentItem);

                 // Adjust the position of each link of the node
                 adjustNodeLinks(tsk._currentItem);

                 flow.refresh();

                 oldrc = rc;

                 if (div !== null && div !== undefined) {
                     div.scrollLeft = hScrollOffset;
                     div.scrollTop = vScrollOffset;
                     hScrollOffset = hScrollOffset2;
                     vScrollOffset = vScrollOffset2;
                 }
             };
         };

         // This class is used to manage the undo/redo of a node
         // creation action. It derives from the Task class.
         AddNodeTask = function (flow, _node) {
             var tsk, index;

             Task.call(this);

             tsk = this;
             tsk._currentItem = _node;
             tsk.code = 'AF_nodeAdd';

             tsk.redo = function () {
                 _items.push(_node);
                 _node.index = _items.length - 1;
                 flow.refresh();
             };

             tsk.undo = function () {
                 if (_node.getIsSelected()) {
                     _node.setIsSelected(false);
                 }
                 invalidateNode(_node);
                 index = _node.index;
                 removeItemByIndex(index);
                 updateDiagramSize();
                 flow.refresh();
             };
         };

         // This class is used to manage the undo/redo of a node
         // remove action. It derives from the Task class.
         RemoveNodeTask = function (flow, _node) {
             var tsk, index;

             Task.call(this);

             tsk = this;
             tsk._currentItem = _node;
             tsk.code = 'AF_nodeRemove';

             tsk.redo = function () {
                 invalidateNode(_node);
                 index = _node.index;
                 removeItemByIndex(index);
                 updateDiagramSize();
                 flow.refresh();
             };

             tsk.undo = function () {
                 _items.push(_node);
                 _node.index = _items.length - 1;
                 invalidateNode(_node);
                 flow.refresh();
             };
         };

         // This class is used to manage the undo/redo of a link
         // creation action. It derives from the Task class.
         AddLinkTask = function (flow, _link) {
             var tsk, index;

             Task.call(this);

             tsk = this;
             tsk._currentItem = _link;
             tsk.code = 'AF_linkAdd';

             tsk.redo = function () {
                 var org, dst;

                 _items.push(_link);
                 _link.index = _items.length - 1;
                 invalidateLink(_link);
                 updateDiagramSizeWithRect(getLinkRect(_link));
                 org = _link.org;
                 dst = _link.dst;
                 getNodeLinks(org).push(_link);
                 getNodeLinks(dst).push(_link);
                 flow.refresh();
             };

             tsk.undo = function () {
                 if (_link.getIsSelected()) {
                     _link.setIsSelected(false);
                 }
                 // Delete the link
                 index = _link.index;
                 removeItemByIndex(index);
                 _link.setOrg(null);
                 _link.setDst(null);
                 flow.refresh();
             };
         };

         // This class is used to manage the undo/redo of a link
         // remove action. It derives from the Task class.
         RemoveLinkTask = function (flow, _link) {
             var tsk, index;

             Task.call(this);

             tsk = this;
             tsk._currentItem = _link;
             tsk.code = 'AF_linkRemove';

             tsk.redo = function () {
                 if (_link.getIsSelected()) {
                     _link.setIsSelected(false);
                 }
                 // Delete the link
                 index = _link.index;
                 removeItemByIndex(index);
                 _link.setOrg(null);
                 _link.setDst(null);
                 flow.refresh();
             };

             tsk.undo = function () {
                 var org, dst;

                 _items.push(_link);
                 _link.index = _items.length - 1;
                 invalidateLink(_link);
                 updateDiagramSizeWithRect(getLinkRect(_link));
                 org = _link.org;
                 dst = _link.dst;
                 org.getLinks().push(_link);
                 dst.getLinks().push(_link);
                 flow.refresh();
             };
         };

         // This class is used to manage the undo/redo of a link
         // stretching action. It derives from the Task class.
         StretchLinkTask = function (flow, _link) {
             Task.call(this);

             var tsk, oldPoints, oldIsOrgPointAdjustable, oldIsDstPointAdjustable;

             tsk = this;
             oldPoints = _link.points.slice();
             oldIsOrgPointAdjustable = _link.isOrgPointAdjustable;
             oldIsDstPointAdjustable = _link.isDstPointAdjustable;

             tsk._currentItem = _link;
             tsk.code = 'AF_linkStretch';

             tsk.redo = function () {
                 tsk.undo();
             };

             tsk.undo = function () {
                 var inc, rc, _points, isOrgPointAdjustable, isDstPointAdjustable;

                 inc = _link.lineWidth + flow.handleSize;
                 rc = getLinkRect(_link);
                 rc = rc.inflate(inc, inc);

                 // Points
                 _points = _link.points.slice();
                 _link.points.splice(0, _link.points.length);
                 _link.points = _link.points.concat(oldPoints);
                 oldPoints = _points;

                 // isOrgPointAdjustable and isDst(PointAdjustable properties
                 isOrgPointAdjustable = _link.isOrgPointAdjustable;
                 isDstPointAdjustable = _link.isDstPointAdjustable;
                 _link.setIsOrgPointAdjustable(oldIsOrgPointAdjustable);
                 _link.setIsDstPointAdjustable(oldIsDstPointAdjustable);
                 oldIsOrgPointAdjustable = isOrgPointAdjustable;
                 oldIsDstPointAdjustable = isDstPointAdjustable;

                 invalidate(rc);
                 invalidateLink(_link);

                 flow.refresh();
             };
         };

         // This class is used to manage the undo/redo of a link
         // origin change action. It derives from the Task class.
         SetLinkOrgTask = function (flow, _link, oldOrg) {
             var tsk, org;

             Task.call(this);

             tsk = this;
             tsk._currentItem = _link;
             tsk.code = 'AF_org';

             tsk.redo = function () {
                 tsk.undo();
             };

             tsk.undo = function () {
                 org = tsk._currentItem.org;
                 tsk._currentItem.setOrg(oldOrg);
                 oldOrg = org;
                 flow.refresh();
             };
         };


         // This class is used to manage the undo/redo of a link
         // destination change action. It derives from the Task class.
         SetLinkDstTask = function (flow, _link, oldDst) {
             var tsk, dst;

             Task.call(this);

             tsk = this;
             tsk._currentItem = _link;
             tsk.code = 'AF_dst';

             tsk.redo = function () {
                 tsk.undo();
             };

             tsk.undo = function () {
                 dst = tsk._currentItem.dst;
                 tsk._currentItem.setDst(oldDst);
                 oldDst = dst;
                 flow.refresh();
             };
         };

         // This class is used to manage the undo/redo of a link
         // pin origin change action. It derives from the Task class.
         SetLinkPinOrgTask = function (flow, _link, oldPinOrg) {
             var tsk, pinOrg, oldPoints;

             Task.call(this);

             tsk = this;
             tsk._currentItem = _link;
             tsk.code = 'AF_pinOrg';
             oldPoints = _link.points.slice();

             tsk.redo = function () {
                 tsk.undo();
             };

             tsk.undo = function () {
                 pinOrg = tsk._currentItem.pinOrg;
                 tsk._currentItem.setPinDst(oldPinOrg);
                 oldPinOrg = pinOrg;

                 // Points
                 var _points = _link.points.slice();
                 _link.points.splice(0, _link.points.length);
                 _link.points = _link.points.concat(oldPoints);
                 oldPoints = _points;

                 flow.refresh();
             };
         }

         // This class is used to manage the undo/redo of a link
         // pin destination change action. It derives from the Task class.
         SetLinkPinDstTask = function (flow, _link, oldPinDst) {
             var tsk, pinDst, oldPoints;

             Task.call(this);

             tsk = this;
             tsk._currentItem = _link;
             tsk.code = 'AF_pinDst';
             oldPoints = _link.points.slice();

             tsk.redo = function () {
                 tsk.undo();
             };

             tsk.undo = function () {
                 pinDst = tsk._currentItem.pinDst;
                 tsk._currentItem.setPinDst(oldPinDst);
                 oldPinDst = pinDst;

                 // Points
                 var _points = _link.points.slice();
                 _link.points.splice(0, _link.points.length);
                 _link.points = _link.points.concat(oldPoints);
                 oldPoints = _points;

                 flow.refresh();
             };
         }

         // This class is used to manage the undo/redo of an item zorder
         // change action. It derives from the Task class.
         ZOrderTask = function (flow) {
             var tsk, olditems;

             Task.call(this);

             tsk = this;
             olditems = _items.slice();
             tsk.code = 'AF_zOrder';

             tsk.redo = function () {
                 tsk.undo();
             };

             tsk.undo = function () {
                 var i, curitems;

                 curitems = _items.slice();
                 _items = olditems.slice();
                 olditems = curitems;
                 flow.refresh();

                 // Update indices
                 for (i = 0; i < _items.length; i++) {
                     _items[i].index = i;
                 }
             };
         };

         // This class is used to manage the undo/redo of link lineStyle
         // change action. It derives from the Task class.
         LineStyleTask = function (flow, _link, oldLineStyle) {
             var tsk, oldPoints;

             Task.call(this);

             tsk = this;
             oldPoints = _link.points.slice();

             tsk._currentItem = _link;
             tsk.code = 'AF_lineStyle';

             tsk.redo = function () {
                 tsk.undo();
             };

             tsk.undo = function () {
                 var inc, rc, _points, lineStyle;

                 inc = tsk._currentItem.lineWidth + flow.handleSize;
                 rc = getLinkRect(tsk._currentItem);
                 rc = rc.inflate(inc, inc);

                 lineStyle = tsk._currentItem.lineStyle;
                 _points = tsk._currentItem.points.slice();

                 tsk._currentItem.lineStyle = oldLineStyle;

                 tsk._currentItem.points.splice(0, tsk._currentItem.points.length);
                 tsk._currentItem.points = _link.points.concat(oldPoints);

                 oldLineStyle = lineStyle;
                 oldPoints = _points;

                 invalidate(rc);
                 tsk._currentItem.refresh();
             };
         };

         //----------------------------------------------------------------
         /** @description The object managing the list of tasks and allowing undo/redo.
         @class TaskManager class.
         @constructor Returns a TaskManager object.*/
         //----------------------------------------------------------------

         var TaskManager = function () {
             var tasks = [],
                 index = -1,
                 currentGroup = -1,
                 groupCode = 'AF_none',
                 inActionGroupExternal = false,
                 inActionGroupInternal = false,
                 undoRedoing = false,
                 tm = this;

             /** @description Determines whether undo/redo is allowed.
             @default true
             */
             this.canUndoRedo = true;

             /** @description Returns/sets the number of undo commands that can
             be performed.
             UndoLimit limits the size of the Undo buffer. Therefore, you can use
             this property to save memory.
             Setting UndoLimit to zero means that the size of the Undo buffer
             is unlimited.
             @default 0
             */
             this.undoLimit = 0;

             /** @description Determines whether the next actions are recorded in the
             task manager.
             @default true
             */
             this.skipUndo = false;

             /** @description Returns the code of the next undoable action. */
             this.undoCode = function () {
                 return tm._canUndo() ? _getCode(tasks[index]) : 'AF_none';
             };

             /** @description Returns the code of the next redoable action. */
             this.redoCode = function () {
                 return tm._canRedo() ? _getCode(tasks[index + 1]) : 'AF_none';
             };

             /** @description Returns the item involved in the next undoable action. */
             this.undoItem = function () {
                 return tm._canUndo() ? tasks[index]._currentItem : null;
             };

             /** @description Returns the item involved in the next redoable action. */
             this.redoItem = function () {
                 return tm._canredo() ? tasks[index + 1]._currentItem : null;
             };

             /** @description Indicates if there is an action that can be undone.
             Typically, this method allows to enable or disable the 'Undo'
             menu item of your application. */
             this.canUndo = function () {
                 return tm._canUndo();
             };

             /** @description Indicates if there is an action that can be redone.
             Typically, this method allows to enable or disable the 'Redo'
             menu item of your application. */
             this.canRedo = function () {
                 return tm._canRedo();
             };

             /** @description Undo the last action performed in flow. */
             this.undo = function () {
                 _undo();
             };

             /** @description Redo, if possible, the last action. */
             this.redo = function () {
                 _redo();
             };

             /** @description Start a group of actions that can be undone in one time.
             'code' is a string which must not starts with 'AF_' because this
             prefix is reserved for AddFlow internal use. It allows to identify a group
             of action. It is returned by the undoCode and redoCode properties.
             For instance, if, in your application, the user can open a dialog box
             allowing to change the image of the node, its color and its Text property,
             you will probably allow that user to undo these 3 basic actions in one time.
             To do that, add a call to beginAction before invoking the dialog box and a
             call to endAction just after the dialog box termination. */
             this.beginAction = function (code) {
                 _beginAction(code);
             };

             /** @description Terminate a group of actions that can be
             undone in one time. */
             this.endAction = function () {
                 _endAction();
             };

             /** @description Clears the undo/redo buffer. */
             this.clear = function () {
                 _clear();
             };

             /** @description Add the following actions in the last group of actions.
             This 'add' mode will terminate when calling EndAction. */
             this.addToLastAction = function () {
                 _addToLastAction();
             };

             /** Submit a task (or action) that can be undone and redone.
             'task' is a task to include in the undo list */
             this.submitTask = function (task) {
                 tm._submitTask(task);
             };

             /** @description Remove the last task that has been added in the
             undo/redo buffer. */
             this.removeLastTask = function () {
                 _removeLastTask();
             };

             this.taskCount = function () {
                 return index + 1;
             };

             this.undoAllowed = function () {
                 return tm.canUndoRedo && !tm.skipUndo && !undoRedoing;
             };

             this._canUndo = function () {
                 return tm.canUndoRedo ? (index >= 0) : false;
             };

             this._canRedo = function () {
                 return tm.canUndoRedo ? (index < tasks.length - 1) : false;
             };

             this._beginActionInternal = function (code) {
                 if (!inActionGroupExternal) {
                     inActionGroupInternal = true;
                     currentGroup++;
                     groupCode = code;
                 }
             };

             this._endActionInternal = function () {
                 if (!inActionGroupExternal) {
                     inActionGroupInternal = false;
                     groupCode = 'AF_none';
                 }
             };

             this.isCurrentActionGroup = function () {
                 return inActionGroupInternal || inActionGroupExternal;
             };

             this._submitTask = function (task) {
                 var g;

                 if (task === null) {
                     return;
                 }

                 // Remove all the tasks following the added task,
                 // add the task in the undo/redo list and increment the task index
                 index++;
                 tasks.splice(index, tasks.length - 1 - index, task);

                 // Increment the group number if the task is not already in a group.
                 if (!tm.isCurrentActionGroup()) {
                     currentGroup++;
                 }

                 task.group = currentGroup;
                 task.groupCode = groupCode;

                 // Case of limited undo/redo buffer
                 if (tm.undoLimit > 0) {
                     // If this limit is reached, remove the first task
                     if (index >= tm.undoLimit) {
                         g = tasks[0].group;
                         if (g !== currentGroup) {
                             tasks.spice(0, 1);
                             index--;

                             // If the removed task is part of a group, remove the group.
                             while (index > 0) {
                                 if (tasks[0].group === g) {
                                     tasks.spice(0, 1);
                                     index--;
                                 } else {
                                     break;
                                 }
                             }
                         }
                     }
                 }
             };

             function _removeLastTask() {
                 _undo();
                 while (index + 1 < tasks.length) {
                     tasks.splice(tasks.length - 1, 1);
                 }
             }

             function _undo() {
                 var task, task2;

                 if (!tm.canUndoRedo) {
                     return;
                 }
                 if (tm._canUndo()) {
                     undoRedoing = true;

                     _beginUpdate();

                     // Undo the current entry
                     task = tasks[index];
                     index--;
                     task.undo();
                     for (;;) {
                         if (tm._canUndo()) {
                             task2 = tasks[index];
                             if (task2.group === task.group) {
                                 index--;
                                 task2.undo();
                             } else {
                                 break;
                             }
                         } else {
                             break;
                         }
                     }
                     _endUpdate();
                     undoRedoing = false;
                 }
             }

             function _redo() {
                 var task, task2;

                 if (!tm.canUndoRedo) {
                     return;
                 }
                 if (tm._canRedo()) {
                     undoRedoing = true;

                     _beginUpdate();

                     // Advance to the next entry and execute it.
                     index++;
                     task = tasks[index];
                     task.redo();
                     for (;;) {
                         if (tm._canRedo()) {
                             index++;
                             task2 = tasks[index];
                             if (task2.group === task.group) {
                                 task2.redo();
                             } else {
                                 index--;
                                 break;
                             }
                         } else {
                             break;
                         }
                     }
                     _endUpdate();
                     undoRedoing = false;
                 }
             }

             function _beginAction(code) {
                 // First we verified that the action code does not starts with 'AF_'
                 // This prefix is reserved for AddFlow internal use.
                 if (code.length >= 3) {
                     if (code.substr(0, 3) === 'AF_') {
                         return;
                     }
                 }
                 _beginActionExternal(code);
             }

             function _endAction() {
                 _endActionExternal();
             }

             function _addToLastAction() {
                 inActionGroupExternal = true;
             }

             function _beginActionExternal(code) {
                 var result = false;
                 if (!inActionGroupExternal) {
                     inActionGroupExternal = true;
                     currentGroup++;
                     groupCode = code;
                     result = true;
                 }
                 return result;
             }

             function _endActionExternal() {
                 if (inActionGroupExternal) {
                     inActionGroupExternal = false;
                     groupCode = 'AF_none';
                 }
             }

             function _getCode(itm) {
                 return itm.groupCode !== 'AF_none' ? itm.groupCode : itm.code;
             }

             function _clear() {
                 tasks = [];
                 index = -1;
                 currentGroup = -1;
                 inActionGroupExternal = false;
                 inActionGroupInternal = false;
             }
         };


         /* AddFlow variables---------------------------------------------------------*/

         that = this;
         _taskManager = new TaskManager();
         _items = [];
         _selectedItems = [];
         hittedItem = null;
         _arrow = [
             [0, 0],
             [-10, -4],
             [-10, 4]
         ];
         StretchTypeEnum = {
             none: 0,
             add: 1,
             del: 2,
             first: 3,
             last: 4,
             change: 5
         };
         ResizeHandleEnum = {
             leftUp: 0,
             up: 1,
             rightUp: 2,
             left: 3,
             right: 4,
             leftDown: 5,
             down: 6,
             rightDown: 7
         };
         itemsetEnum = {
             items: 0,
             nodes: 1,
             links: 2,
             selectableItems: 3,
             selectableNodes: 4,
             selectableLinks: 5
         };
         moveStartDist = 8;
         minNodeSize = 8;
         millisec = 100; // The intervals (in millisecond) used for the autoscrolling
         xScrollUnit = 20;
         yScrollUnit = 20;
         ptStart = [0, 0];
         invRect = null;
         selRect = null;
         tmpRect = null;
         graphRect = new MyRect(0, 0, 0, 0);
         _isMouseDown = false;
         startMove = false;
         _handle = 0;
         linkDistance = 0;
         outOrg = false; // used when creating a link to know if it is reflexive
         pinAreas = []; // array of rectangular pin areas
         pinAreaCentral = null;
         pinnedItem = null;
         origin = null;
         pinOrigin = null;
         pinDestination = null;
         stretchedLink = null;
         initialWidth = canvas.width;
         initialHeight = canvas.height;
         offsetDatabase = 35;
         selectAllFlag = false;
         xoffset = 0;
         yoffset = 0;
         _isSelChanged = false;
         okToStartMove = false;
         okToStartNode = false;
         okToStartLink = false;
         okToStartResize = false;
         okToStartStretch = false;
         okToStartSelect = false;
         okToStartZoom = false;
         okToStartPan = false;
         _repaint = 0;
         _isQuadtree = true;

         // Variables indicating the current user action
         _isCreatingNode = false;
         _isCreatingLink = false;
         _isStretchingLink = false;
         _isResizingNode = false;
         _isMovingNode = false;
         _isSelecting = false;
         _isZooming = false;
         _isPanning = false;

         // Variables dedicated to autoscrolling
         xScrollDir = 'none';
         yScrollDir = 'none';
         timerStarted = false;
         timer = null;
         orthoRouter = new OrthoRouter(); // A class for creating orthogonal links

         /* AddFlow properties-----------------------------------------------------*/

         /** @description The canvas where this diagram will paint to. */
         this.canvas = canvas;

         /** @description An object that contains the default property values for nodes.
         When a node is created, it receives these property values. */
         this.nodeModel = new Node(0, 0, 0, 0, '');

         /** @description An object that contains the default property values for links.
         When a link is created, it receives these property values. */
         this.linkModel = new Link(null, null, '');

         /** @description Determines whether the size of the diagram panel is fixed or 
         if it depends on the size of the diagram.
         @default false
         @type boolean */
         this.isFixedSize = false;

         /** @description Determines whether interactive creation of nodes is allowed.
         @default true
         @type boolean */
         this.canDrawNode = true;

         /** @description Determines whether interactive creation of links is allowed.
         @default true
         @type boolean */
         this.canDrawLink = true;

         /** @description Determines whether you can drag nodes interactively.
         @default true
         @type boolean
         */
         this.canMoveNode = true;

         /** @description Determines whether you can resize nodes interactively.
         @default true
         @type boolean
         */
         this.canSizeNode = true;

         /** @description Determines whether you can 'stretch' links (i.e add or 
         remove segments) interactively.
         @default true
         @type boolean
         */
         this.canStretchLink = true;

         /** @description Determines whether you can create several links between 
         two nodes or not.
         @default true
         @type boolean
         */
         this.canMultiLink = true;

         /** @description Determines whether you can create reflexive links. A link is 
         reflexive if its destination and origin nodes are the same.
         @default true
         @type boolean
         */
         this.canReflexLink = true;

         /** @description Determines whether the user can interactively change the 
         origin node of a link.
         @default true
         @type boolean
         */
         this.canChangeOrg = true;

         /** @description Determines whether the user can interactively change the 
         destination node of a link.
         @default true
         @type boolean
         */
         this.canChangeDst = true;

         /** @description Determines whether multiselection mode of nodes and links 
         is allowed or not.
         @default true
         @type boolean
         */
         this.canMultiSelect = true;

         /** @description Determines whether drag scrolling is allowed or not.
         @default true
         @type boolean
         */
         this.canDragScroll = true;

         /** @description Indicates whether the selection of items with the mouse is
         made only when the mouseUp event is fired or at each mouseMove event
         @default true
         @type boolean
         */
         this.canSelectOnMouseMove = true;

         /** @description Determines whether the selectionChanged event is fired or not.
         @default true
         @type boolean
         */
         this.canSendSelectionChangedEvent = true;

         /** @description Determines whether context handles are displayed for selected
         items
         @default true
         @type boolean
         */
         this.canShowContextHandle = true;

         /** @description Returns/sets the selection rectangle action: select, zoom ...
         none. Create nodes with the mouse 
         selection. Select the items partially inside the rectangle
         selection2. Select the items completely inside the rectangle
         zoom. Zoom the rectangle while ensuring a 1:1 aspect ratio
         @type string
         @default 'none'
         */
         this.mouseSelection = 'none';

         /** @description Used to specify the type of the area pointed by the mouse.
         outSide resizeHandle stretchHandle pin link node
         */
         this.hitArea = 'outSide';

         /** @description The object managing the list of tasks and allowing undo/redo. */
         this.taskManager = _taskManager;

         /** @description Returns/sets the X offset of the shadow used to display items
         @default 5
         */
         this.shadowOffsetX = 5;

         /** @description Returns/sets the Y offset of the shadow used to display items
         @default 5
         */
         this.shadowOffsetY = 5;

         /** @description Returns/sets the amount of blur on the shadow used to display 
         items, in pixels.
         @default 2
         */
         this.shadowBlur = 2;

         /** @description Returns/sets the color of the shadow used to display items.
         @default rgba(128, 128, 192, 0.5)
         @type Color
         */
         this.shadowColor = 'rgba(128, 128, 192, 0.5)';

         /** @description Returns/sets the width of the area where the user has to click 
         to select a link.
         @default 6
         */
         this.linkSelectionAreaWidth = 6;

         /** @description Returns/sets a value that determines if the user can remove a 
         link point by dragging the handle to a position where it has a very obtuse angle 
         to its surrounding link points.
         @default 6
         */
         this.removePointDistance = 6;

         /** @description The zooming factor 
         @default 1
         */
         this.zoom = 1;

         /** @description Returns/sets the horizontal grid size. 
         @default 16
         @type integer
         */
         this.gridSizeX = 16;

         /** @description Returns/sets the vertical grid size. 
         @default 16
         @type integer
         */
         this.gridSizeY = 16;

         /** @description Determines whether nodes are aligned on the grid 
         @default false
         @type boolean
         */
         this.gridSnap = false;

         /** @description Determines whether the grid is displayed or not.
         @default false
         @type boolean
         */
         this.gridDraw = false;

         /** @description Returns/sets the grid color.
         @default rgb(192, 192, 192)
         @type Color
         */
         this.gridStrokeStyle = 'rgb(192, 192, 192)';

         /** @description Returns/sets the canvas background color.
         @default #fff
         @type Color
         */
         this.fillStyle = '#fff';

         /** @description A method allowing making custom drawing on the AddFlow canvas.
          @default null
          @type function
         */
         this.ownerDraw = null;

         /** @description Returns/sets the selection rectangle filling color.
         @default 'rgba(192, 192, 192, 0.5)'
         @type Color
         */
         this.selRectFillStyle = 'rgba(224, 224, 224, 0.3)';

         /** @description Returns/sets the selection rectangle color.
         @default 'gray'
         @type Color
         */
         this.selRectStrokeStyle = 'gray';

         /** @description Returns/sets the selection rectangle width.
         @default 1
         @type integer
         */
         this.selRectLineWidth = 1;

         /** @description Returns/sets the drawing color of the lines used 
         for selected bezier links
         @default 'navy'
         @type Color
         */
         this.bezierSelectionLinesStrokeStyle = 'navy'; // rgb(0,0,80)

         /** @description Returns/sets the size of the handles used to select items. 
         @default 6
         */
         this.handleSize = 6;

         /** @description Returns/sets the first color defining the gradient
         style used for handles 
         @default 'white'
         @type Color
         */
         this.handleGradientColor1 = 'white';

         /** @description Returns/sets the second color defining the gradient
         style used for the selection handles of nodes and links.
         @default 'lightgray'
         @type Color
         */
         this.handleGradientColor2 = 'lightgray';

         /** @description Returns/sets the color used to draw a selection handle
         of a node or a link.
         @default 'black'
         @type Color
         */
         this.handleStrokeStyle = 'black';

         /** @description Returns/sets the size of a context handle. It is the
         horizontal size. The vertical sise is equal to the horizontal size 
         multiplied by 2 and divided by 5.
         @default 20
         */
         this.contextHandleSize = 20;

         /** @description Returns/sets the drawing color of the context handles
         @default 'navy'
         @type Color
         */
         this.contextHandleStrokeStyle = 'navy';

         /** @description Returns/sets the first color defining the gradient
        style used for context handles 
        @default 'white'
        @type Color
        */
         this.contextHandleGradientColor1 = 'white';

         /** @description Returns/sets the second color defining the gradient
         style used for context handles 
         @default 'lightblue'
         @type Color
         */
         this.contextHandleGradientColor2 = 'lightblue';

         /** @description Returns/sets the size of the pins used to create links. 
         @default 8
         */
         this.pinSize = 8;

         /** @description Returns/sets the first color defining the gradient
         style used for pins.
         @default 'white'
         @type Color
         */
         this.pinGradientColor1 = 'white';

         /** @description Returns/sets the second color defining the gradient
         style used for pins. 
         @default 'navy'
         @type Color
         */
         this.pinGradientColor2 = 'navy';

         /** @description Returns/sets the color used to draw pins
         @default 'white'
         @type Color
         */
         this.pinStrokeStyle = 'white';

         /** @description Returns/sets the first color defining the gradient
         style used for central pins.
         @default 'white'
         @type Color
         */
         this.centralPinGradientColor1 = 'white';

         /** @description Returns/sets the second color defining the gradient
         style used for central pins.
         @default 'white'
         @type Color
         */
         this.centralPinGradientColor2 = 'white';

         /** @description Returns/sets the color used to draw central pin
         @default 'black'
         @type Color
         */
         this.centralPinStrokeColor = 'black';

         /** @description Resturns/sets the x offset to add the x mouse coordinate.
         This may be useful in some development environments.
         @default 0
         */
         this.xCustomOffset = 0;

         /** @description Resturns/sets the y offset to add the y mouse coordinate.
         This may be useful in some development environments.
         @default 0
         */
         this.yCustomOffset = 0;


         /* AddFlow Methods-----------------------------------------------------------*/

         /** @description Cause the canvas to be updated.
         @function */
         this.refresh = function () {
             invalidate(null);
             updateScrollInfo(); // needed and added in v1.2.0.2
             updateDrawing();
         };

         /** @description Determines whether a Quadtree structure is used to improve speed
         @param isQuadtree A flag determining if a quadtree structure is used
         @function */
         this.useQuadtree = function (isQuadtree) {
             if (_isQuadtree !== isQuadtree) {
                 _isQuadtree = isQuadtree;
                 if (_isQuadtree) {
                     _buildQuadtree();
                 }
             }
         }

         /** @description Get the list of all items (nodes and links)
         @function */
         this.getItems = function () {
             return _items;
         };

         /**  @description Get the list of the selected items. 
          */
         this.getSelectedItems = function () {
             return _selectedItems;
         };

         /** @description Get the item pointed by the mouse.
         @function */
         this.getHitItem = function () {
             return hittedItem;
         };

         /** @description Create a node.
         @param x The horizontal position of the node to create. 
         @param y The vertical position of the node to create. 
         @param w The width of the node to create.
         @param h The height of the node to create. 
         @param [text] A string to be displayed in the node to create.
         @function */
         this.addNode = function (x, y, w, h, text) {
             return _addNode(x, y, w, h, text);
         };

         /** @description Create a link.
         @param org The origin node of the link to create. 
         @param dst The destination node of the link to create.  
         @param [text] A string to be displayed in the node to create.
         @param [pinOrg] The pin of the origin node of the link to create.
         @param [pinDst] The pin of the destination node of the link to create.
         @function */
         this.addLink = function (org, dst, text, pinOrg, pinDst) {
             return _addLink(org, dst, text, pinOrg, pinDst);
         };

         /** @description Remove a node.
         @param node A reference to the node to be removed. 
         @function */
         this.removeNode = function (node) {
             _removeNode(node);
         };

         /** @description Remove a link.
         @param _link A reference to the link to be removed. 
         @function */
         this.removeLink = function (_link) {
             _removeLink(_link);
         };

         /** @description Delete the selected items.
         @function */
         this.deleteSel = function () {
             _deleteSel();
         };

         /** @description Clear the diagram by removing all items.
         @function */
         this.clear = function () {
             _clear();
         };

         /** @description Select all the items.
         @function */
         this.selectAll = function () {
             _selectAll();
         };

         /** @description Unselect all the selected items.
         @function */
         this.unselectAll = function () {
             _unselectAll();
         };

         /** @description The beginUpdate method prevents the control to calculate the  
         size of the diagram until the endUpdate method is called, thus allowing 
         better performance.
         @function */
         this.beginUpdate = function () {
             _beginUpdate();
         };

         /**  The beginUpdate method prevents the control to calculate 
         the size of the diagram until the endUpdate method is called, thus allowing   
         better performance.
         @function */
         this.endUpdate = function () {
             _endUpdate();
         };

         /** @description Set the rectangular portion of AddFlow that needs 
         to be repainted. 
         @function
         @param x The horizontal position of the rectangular region to repaint. 
         @param y The vertical position of the rectangular region to repaint. 
         @param w The width of the rectangular region to repaint.
         @param h The height of the rectangular region to repaint. */
         this.invalidateRect = function (x, y, w, h) {
             invalidate(new MyRect(x, y, w, h));
         };

         /** @description Indicates if the user is currently moving nodes
         @type boolean
         @function
         */
         this.isMovingNode = function () {
             return _isMovingNode;
         };

         /** @description Indicates if the user is currently creating a node.
         @type boolean
         @function
         */
         this.isCreatingNode = function () {
             return _isCreatingNode;
         };

         /** @description Indicates if the user is currently creating a link.
         @type boolean
         @function
         */
         this.isCreatingLink = function () {
             return _isCreatingLink;
         };

         /** @description Indicates if the user is currently stretching a link.
         @type boolean
         @function
         */
         this.isStretchingLink = function () {
             return _isStretchingLink;
         };

         /** @description Indicates if the user is currently resizing a node.
         @type boolean
         @function
         */
         this.isResizingNode = function () {
             return _isResizingNode;
         };

         /** @description Indicates if the user is currently selecting items
         by drawing a rectangle with the mouse.
         @type boolean
         @function
         */
         this.isSelecting = function () {
             return _isSelecting;
         };

         /** @description Indicates if the user is currently zooming the diagram
         by drawing a rectangle with the mouse.
         @function
         @type boolean
         */
         this.isZooming = function () {
             return _isZooming;
         };

         /** @description Indicates if the user is currently panning the diagram.
         @type boolean
         @function
         */
         this.isPanning = function () {
             return _isPanning;
         };

         /** @description Allow to set a flag indicating that the selection has
         changed or not.
         @type boolean
         @function
         @param flag true if you want to indicate that the diagram
         selection has changed else false.
         */
         this.setSelChangedFlag = function (flag) {
             _isSelChanged = flag;
         };

         /** @description Indicates if selection in the AddFlow diagram has changed.
         @type boolean
         @function
         */
         this.isSelChanged = function () {
             return _isSelChanged;
         };

         /**  @description Indicates if the item is a Node object
         @type boolean
         @function
         */
         this.isNode = function (item) {
             return _isNode(item);
         };

         /**  @description Indicates if the item is a Link object
         @type boolean
         @function
         */
         this.isLink = function (item) {
             return _isLink(item);
         };

         /** @description Send the selected items at the back of the zorder list
         @function */
         this.sendToBack = function () {
             _sendToBack();
         };

         /** @description Bring the selected items at the front of the zorder list
         @function */
         this.bringToFront = function () {
             _bringToFront();
         };

         /** @description Zoom and scroll a view to fit a specified rectangular 
         portion of the diagram.
         @function 
         @param x The horizontal position of the rectangular region to zoom. 
         @param y The vertical position of the rectangular region to zoom. 
         @param w The width of the rectangular region to zoom.
         @param h The height of the rectangular region to zoom. */
         this.zoomRectangle = function (x, y, w, h) {
             _zoomRectangle(new MyRect(x, y, w, h));
         };

         /** @description return the horizontal size of the diagram
         @function */
         this.getXExtent = function () {
             return graphRect.width;
         };

         /** @description return the vertical size of the diagram
         @function */
         this.getYExtent = function () {
             return graphRect.height;
         };


         // Initialization sequence.
         initialize(this.canvas);


         /* AddFlow Helpers--------------------------------------------------------*/

         // Initialization sequence.
         function initialize(canvas) {
             // AddFlow Handlers 
             // http://www.informit.com/articles/article.aspx?p=1903884&seqNum=6
             canvas.addEventListener("ready", readyHandler, false);
             canvas.addEventListener("mousedown", mouseDownHandler, false);
             canvas.addEventListener("mousemove", mouseMoveHandler, false);
             canvas.addEventListener("mouseup", mouseUpHandler, false);
             canvas.addEventListener('touchstart', touchStartHandler, false);
             canvas.addEventListener('touchmove', touchMoveHandler, false);
             canvas.addEventListener('touchend', touchEndHandler, false);

             if (_isQuadtree) {
                 _buildQuadtree();
             }
         }

         // context event
         function fireContextEvent(itm) {
             var event;

             event = document.createEvent("Event");
             event.initEvent("context", true, true);
             event.item = itm,
                 document.dispatchEvent(event);
         }

         // selectionChange event
         function fireSelectionChangeEvent(itm) {
             var event;

             event = document.createEvent("Event");
             event.initEvent("selectionChange", true, true);
             event.item = itm,
                 document.dispatchEvent(event);
         }

         // Build the quadtree structure used to improve performance
         function _buildQuadtree() {
             var i, itm;

             _quadtree = Quadtree._init(0, 0, graphRect.width, graphRect.height);
             _quadtree._clear();

             for (i = 0; i < _items.length; i++) {
                 itm = _items[i];
                 if (that.isNode(itm)) {
                     itm.bounds = getNodeRect(itm);
                 } else {
                     itm.bounds = getLinkRect(itm);
                 }
                 _quadtree._insert(itm, itm.bounds);
             }
         }

         // Is the item a node ?
         function _isNode(itm) {
             return (itm instanceof Node);
         }

         // Is the item a link ?
         function _isLink(itm) {
             return (itm instanceof Link);
         }

         function _addNode(x, y, w, h, text) {
             var rc;

             var _node = new Node(x, y, w, h, text);
             _items.push(_node);
             _node.index = that.getItems().length - 1;
             _node.flow = that;
             if (that.nodeModel !== undefined && that.nodeModel !== null) {
                 copyNodeProperties(_node, that.nodeModel);
             }

             if (_repaint === 0) {
                 rc = getNodeRect(_node);
                 updateDiagramSizeWithRect(rc);
                 _node.bounds = rc;
                 if (_isQuadtree) {
                     _quadtree._insert(_node, _node.bounds);
                 }
                 _node.refresh();
             }

             if (_taskManager.undoAllowed()) {
                 _taskManager._submitTask(new AddNodeTask(that, _node));
             }

             return _node;
         }

         function _removeNode(_node) {
             var currentGroup, _links, j;
             if (_node === undefined || _node === null) {
                 return;
             }

             // Group all removing actions
             // (deleting a node cause the deleting of its links)
             currentGroup = false;
             if (_taskManager.undoAllowed()) {
                 currentGroup = _taskManager.isCurrentActionGroup();
                 if (!currentGroup) {
                     _taskManager._beginActionInternal('AF_nodeRemove');
                 }
             }

             // Unselect the node
             if (_node.getIsSelected()) {
                 _node.setIsSelected(false);
             }

             // Delete all links (in and out) linked to the node to delete
             _links = _node.getLinks();
             for (j = _links.length - 1; j >= 0; j--) {
                 _removeLink(_links[j]);
             }

             // Add the action in the Undo/Redo list of actions
             if (_taskManager.undoAllowed()) {
                 _taskManager._submitTask(new RemoveNodeTask(that, _node));
             }

             if (_isQuadtree) {
                 _quadtree._remove(_node);
             }

             // Delete the node
             removeItemByIndex(_node.index);
             that.refresh();

             // End action
             if (_taskManager.undoAllowed()) {
                 if (!currentGroup) {
                     _taskManager._endActionInternal();
                 }
             }
         }

         function _addLink(org, dst, text, pinOrg, pinDst) {
             var _link;

             if (org === undefined || dst === undefined) {
                 return null;
             }
             if (org === null || dst === null) {
                 return null;
             }
             _link = new Link(org, dst, text, pinOrg, pinDst);
             _items.push(_link);
             org.getLinks().push(_link);
             dst.getLinks().push(_link);
             _link.flow = that;
             if (that.linkModel !== undefined && that.linkModel !== null) {
                 copyLinkProperties(_link, that.linkModel);
             }
             initLinkPoints(_link);
             _link.index = that.getItems().length - 1;

             if (_repaint === 0) {
                 var rc = getLinkRect(_link);
                 updateDiagramSizeWithRect(rc);
                 _link.bounds = rc;
                 if (_isQuadtree) {
                     _quadtree._insert(_link, _link.bounds);
                 }
                 _link.refresh();
             }

             if (_taskManager.undoAllowed()) {
                 _taskManager._submitTask(new AddLinkTask(that, _link));
             }
             return _link;
         }

         function _removeLink(_link) {
             var currentGroup;

             if (_link === undefined || _link === null) {
                 return;
             }

             // Unselect the link
             if (_link.getIsSelected()) {
                 _link.setIsSelected(false);
             }

             // Group all removing actions
             // (deleting a node cause the deleting of its links)
             currentGroup = false;
             if (_taskManager.undoAllowed()) {
                 currentGroup = _taskManager.isCurrentActionGroup();
                 if (!currentGroup) {
                     _taskManager._beginActionInternal('AF_linkRemove');
                 }
             }

             _link.setOrg(null);
             _link.setDst(null);

             // Add the action in the Undo/Redo list of actions
             if (_taskManager.undoAllowed()) {
                 _taskManager._submitTask(new RemoveLinkTask(that, _link));
             }

             if (_isQuadtree) {
                 _quadtree._remove(_link);
             }

             // Delete the link
             removeItemByIndex(_link.index);
             that.refresh();

             // End action
             if (_taskManager.undoAllowed()) {
                 if (!currentGroup) {
                     _taskManager._endActionInternal();
                 }
             }
         }

         function _clear() {
             var i, n, nodes;

             if (_items.length === 0) {
                 return;
             }

             _beginUpdate();

             // Get the collection of nodes
             nodes = [];
             for (i = 0; i < _items.length; i++) {
                 if (_isNode(_items[i])) {
                     nodes.push(_items[i]);
                 }
             }

             // We start at the end to avoid a bug with zorder when undoing this action
             for (n = nodes.length - 1; n >= 0; n--) {
                 _removeNode(nodes[n]);
             }

             _endUpdate();
         }

         function _deleteSel() {
             var i, itm, currentGroup;

             if (_selectedItems.length === 0) {
                 return;
             }

             currentGroup = false;
             if (_taskManager.undoAllowed()) {
                 currentGroup = _taskManager.isCurrentActionGroup();
                 if (!currentGroup) {
                     _taskManager._beginActionInternal('AF_del');
                 }
             }

             _beginUpdate();

             // Remove selected links
             for (i = _selectedItems.length - 1; i >= 0; i--) {
                 itm = _selectedItems[i];
                 if (_isLink(itm)) {
                     _removeLink(itm);
                 }
             }

             // Remove selected nodes
             for (i = _selectedItems.length - 1; i >= 0; i--) {
                 itm = _selectedItems[i];
                 if (_isNode(itm)) {
                     // Not needed here
                     _removeNode(itm);
                 }
             }

             _endUpdate();

             // End action
             if (_taskManager.undoAllowed()) {
                 if (!currentGroup) {
                     _taskManager._endActionInternal();
                 }
                 _taskManager._endActionInternal();
             }
         }

         function _selectAll() {
             var i, itm;

             _beginUpdate();
             for (i = 0; i < _items.length; i++) {
                 itm = _items[i];
                 if (!itm.getIsSelected()) {
                     itm.setIsSelected(true);
                 }
             }
             _endUpdate();
         }

         function _unselectAll() {
             var i, itm;

             selectAllFlag = true;
             for (i = _selectedItems.length - 1; i >= 0; i--) {
                 itm = _selectedItems[i];
                 if (itm.getIsSelected()) {
                     itm.setIsSelected(false);
                 }
             }
             _selectedItems = [];
             selectAllFlag = false;
             that.refresh();
         }

         function removeItemByIndex(idx) {
             var i;

             if (idx >= 0 && idx < _items.length) {
                 if (that.isNode(_items[idx])) {
                     invalidateNode(_items[idx]);
                 } else if (that.isLink(_items[idx])) {
                     invalidateLink(_items[idx]);
                 }

                 // Remove item from the list
                 _items.splice(idx, 1);

                 // Adjust indices
                 for (i = idx; i < _items.length; i++) {
                     _items[i].index = i;
                 }
             }
         }

         function _sendToBack() {
             var i, k, idx, itm;

             if (_taskManager.undoAllowed()) {
                 _taskManager._submitTask(new ZOrderTask(that));
             }

             for (i = 0; i < _selectedItems.length; i++) {
                 itm = _selectedItems[i];
                 idx = itm.index;

                 // Remove item from the list
                 _items.splice(idx, 1);

                 // Insert it at the new position
                 _items.splice(0, 0, itm);

                 for (k = 0; k < _selectedItems.length; k++) {
                     if (k !== i && _selectedItems[k].index < idx + 1) {
                         _selectedItems[k].index++;
                     }
                 }
             }

             // Update indices
             for (i = 0; i < _items.length; i++) {
                 _items[i].index = i;
             }

             for (i = 0; i < _selectedItems.length; i++) {
                 itm = _selectedItems[i];
                 itm.refresh();
             }
         }

         function _bringToFront() {
             var i, k, idx, itm;

             if (_taskManager.undoAllowed()) {
                 _taskManager._submitTask(new ZOrderTask(that));
             }

             for (i = 0; i < _selectedItems.length; i++) {
                 itm = _selectedItems[i];
                 idx = itm.index;

                 // Remove item from the list
                 _items.splice(idx, 1);

                 // Insert it at the new position
                 _items.push(itm);

                 for (k = 0; k < _selectedItems.length; k++) {
                     if (k !== i && _selectedItems[k].index > idx - 1) {
                         _selectedItems[k].index--;
                     }
                 }
             }

             // Update indices
             for (i = 0; i < _items.length; i++) {
                 _items[i].index = i;
             }

             for (i = 0; i < _selectedItems.length; i++) {
                 itm = _selectedItems[i];
                 itm.refresh();
             }
         }


         // Helpers for nodes and links------------------------------------------------

         function getNodeContextHandle(_node) {
             var rc, x, y, dx, dy;

             rc = getNodeRect(_node);
             dx = that.contextHandleSize;
             dy = that.contextHandleSize * 2 / 5
             x = rc.left + rc.width - dx;
             y = rc.top + 1 - dx;
             return new MyRect(x, y, dx, dy);
         }

         function getLinkContextHandle(_link) {
             var x, y, dx, dy, apt;

             // Get the position of the text
             apt = [];
             if (_link.lineStyle === 'bezier') {
                 Helpers.flattenBezier(_link.points[0], _link.points[1],
                     _link.points[2], _link.points[3], apt);
             } else {
                 apt = _link.points;
             }
             var polylineHelper = new PolylineHelper(apt);
             var pt = polylineHelper.getPointAtFractionLength(0.5);
             if (pt !== null) {
                 dx = that.contextHandleSize;
                 dy = that.contextHandleSize * 2 / 5;
                 x = pt.x - dx / 2 - 20;
                 y = pt.y - dy / 2 - 20;
                 return new MyRect(x, y, dx, dy);
             } else {
                 return null;
             }
         }

         function getNodeHandles(_node, _handles) {
             var pt, inc, size, rc;

             inc = 1 * that.handleSize;
             size = that.handleSize;
             rc = getNodeRect(_node);
             rc = rc.inflate(inc, inc);

             pt = {
                 x: rc.left,
                 y: rc.top
             };
             _handles.push(new MyRect(pt.x - size / 2, pt.y - size / 2, size, size));

             pt = {
                 x: rc.left + rc.width / 2,
                 y: rc.top
             };
             _handles.push(new MyRect(pt.x - size / 2, pt.y - size / 2, size, size));

             pt = {
                 x: rc.left + rc.width,
                 y: rc.top
             };
             _handles.push(new MyRect(pt.x - size / 2, pt.y - size / 2, size, size));

             pt = {
                 x: rc.left,
                 y: rc.top + rc.height / 2
             };
             _handles.push(new MyRect(pt.x - size / 2, pt.y - size / 2, size, size));

             pt = {
                 x: rc.left + rc.width,
                 y: rc.top + rc.height / 2
             };
             _handles.push(new MyRect(pt.x - size / 2, pt.y - size / 2, size, size));

             pt = {
                 x: rc.left,
                 y: rc.top + rc.height
             };
             _handles.push(new MyRect(pt.x - size / 2, pt.y - size / 2, size, size));

             pt = {
                 x: rc.left + rc.width / 2,
                 y: rc.top + rc.height
             };
             _handles.push(new MyRect(pt.x - size / 2, pt.y - size / 2, size, size));

             pt = {
                 x: rc.left + rc.width,
                 y: rc.top + rc.height
             };
             _handles.push(new MyRect(pt.x - size / 2, pt.y - size / 2, size, size));
         }

         function getNodeRect(node) {
             return new MyRect(node.x, node.y, node.w, node.h);
         }

         function invalidateNode(_node) {
             invalidate(getNodeRectWithHandles(_node));
         }

         function setNodeRect(_node, rect) {
             var currentGroup, rc;

             currentGroup = false;
             if (_taskManager.undoAllowed()) {
                 currentGroup = _taskManager.isCurrentActionGroup();
                 if (!currentGroup) {
                     _taskManager._beginActionInternal('AF_nodeMoveAndSize');
                 }
             }
             if (_taskManager.undoAllowed()) {
                 rc = getNodeRect(_node);
                 _taskManager._submitTask(new NodeLayoutTask(that, _node, rc));
             }

             invalidateNode(_node);
             _node.x = rect.left;
             _node.y = rect.top;
             _node.w = rect.width;
             _node.h = rect.height;
             adjustNodeLinks(_node);
             _node.refresh();

             // End action
             if (_taskManager.undoAllowed()) {
                 if (!currentGroup) {
                     _taskManager._endActionInternal();
                 }
             }
         }

         function isEllipse(node) {
             return (node.shapeFamily === 'ellipse');
         }

         function isRectangle(node) {
             return (node.shapeFamily === 'rectangle');
         }

         function isPolygon(node) {
             return (node.shapeFamily === 'polygon');
         }

         function getNodePolygonPoints(node, polypoints) {
             var boundingRect, x, y, cx, cy, rc, x2, y2, i;

             if (node.polygon !== undefined && node.polygon !== null) {
                 boundingRect = Helpers.getBoundingRect(node.polygon);
                 if (boundingRect === null) {
                     return;
                 }
                 x = boundingRect.left;
                 y = boundingRect.top;
                 cx = boundingRect.width;
                 cy = boundingRect.height;
                 if (cx === 0 || cy === 0) {
                     return;
                 }
                 for (i = 0; i < node.polygon.length; i++) {
                     rc = getNodeRect(node);
                     x2 = rc.left + (rc.width / cx) * (node.polygon[i][0] - x);
                     y2 = rc.top + (rc.height / cy) * (node.polygon[i][1] - y);
                     polypoints.push({
                         x: x2,
                         y: y2
                     });
                 }
             }
         }

         function getNodeLinks(node) {
             return node.getLinks();
         }

         // Adjust the position of each link of the node 
         function adjustNodeLinks(node) {
             var j, _links, _link;

             _links = getNodeLinks(node);
             for (j = 0; j < _links.length; j++) {
                 _link = _links[j];
                 if (_isQuadtree) {
                     _quadtree._remove(_link);
                 }
                 adjustLink(_link);
                 _link.bounds = getLinkRect(_link);
                 if (_isQuadtree) {
                     _quadtree._insert(_link, _link.bounds);
                 }
             }
         }

         // Check if there is a link from node1 to node2 
         function isOriginOf(_node1, _node2) {
             var i, _link, _links, result;

             result = false;
             _links = getNodeLinks(_node1);
             for (i = 0; i < _links.length; i++) {
                 _link = _links[i];
                 // We check both nodes because the link may be reflexive.
                 if (_link.dst === _node2 && _link.org === _node1) {
                     result = true;
                     break;
                 }
             }
             return result;
         }

         // Check if there is a link from node2 to node1 
         function isDestinationOf(_node1, _node2) {
             var i, _link, result, _links;

             result = false;
             _links = getNodeLinks(_node1);
             for (i = 0; i < _links.length; i++) {
                 _link = _links[i];
                 // We check both nodes because the link may be reflexive.
                 if (_link.org === _node2 && _link.dst === _node1) {
                     result = true;
                     break;
                 }
             }
             return result;
         }

         function invalidateLink(_link) {
             invalidate(getLinkRectWithHandles(_link));
         }

         function getLinkHandles(_link, _handles) {
             var create, nbHandles, firstEnabled, lastEnabled, otherEnabled, enabled,
                 j, k, pt, rc;

             create = isLinkNewPointsAllowed(_link);
             nbHandles = create ? 2 * _link.points.length - 1 : _link.points.length;
             firstEnabled = (that.canChangeOrg || _link.org.pins !== null);
             lastEnabled = (that.canChangeDst || _link.dst.pins !== null);
             otherEnabled = that.canStretchLink && _link.isStretchable;
             for (j = 0; j < nbHandles; j++) {
                 enabled = false;
                 if (j === 0) {
                     enabled = firstEnabled;
                 } else if (j === nbHandles - 1) {
                     enabled = lastEnabled;
                 } else {
                     enabled = otherEnabled;
                 }

                 if (create) {
                     if (j % 2 === 0) {
                         pt = _link.points[j / 2];
                     } else {
                         k = Math.round(j / 2) - 1;
                         pt = Helpers.middlePoint(_link.points[k], _link.points[k + 1]);
                     }
                 } else {
                     pt = _link.points[j];
                 }
                 rc = new MyRect(pt.x - that.handleSize / 2, pt.y - that.handleSize / 2,
                     that.handleSize, that.handleSize);
                 _handles.push(rc);
             }
         }

         function isLinkReflexive(_link) {
             return (_link.org === _link.dst);
         }

         function isLinkNewPointsAllowed(_link) {
             return (_link.getLineStyle() === 'polyline' || _link.getLineStyle() === 'spline');
         }

         function adjustLink(_link) {
             invalidateLink(_link);
             if (_link.getLineStyle() === 'database') {
                 fixDatabaseLinkPoints(_link);
             } else if (_link.getLineStyle() === 'orthogonal') {
                 fixOrthogonalLinkPoints(_link);
             }
             if (_link.org.pins === null && !_link.isOrgPointAdjustable) {
                 calcLinkStartPoint(_link);
             }
             if (_link.dst.pins === null && !_link.isDstPointAdjustable) {
                 calcLinkEndPoint(_link);
             }
             invalidateLink(_link);
         }

         function setLinkLineStyle(_link, lineStyle) {
             if (_link.lineStyle === lineStyle) {
                 return;
             }
             if (_link === that.linkModel) {
                 _link.lineStyle = lineStyle;
                 return;
             }

             if (_taskManager.undoAllowed()) {
                 _taskManager._submitTask(
                     new LineStyleTask(that, _link, _link.lineStyle));
             }

             _link.lineStyle = lineStyle;

             if ((_link.lineStyle === 'bezier' && _link.points.length !== 4) ||
                 _link.lineStyle === 'database' || _link.lineStyle === 'orthogonal') {
                 initLinkPoints(_link);
             }

             if (_link.org.pins === null && !_link.isOrgPointAdjustable) {
                 calcLinkStartPoint(_link);
             }
             if (_link.dst.pins === null && !_link.isDstPointAdjustable) {
                 calcLinkEndPoint(_link);
             }

             _link.refresh();
         }

         function setLinkDst(_link, dst) {
             var _links, oldDst, j;

             if (_link === that.linkModel) {
                 _link.dst = dst;
                 return;
             }

             if (_taskManager.undoAllowed()) {
                 _taskManager._submitTask(new SetLinkDstTask(that, _link, _link.dst));
             }

             invalidateLink(_link);
             oldDst = _link.dst;
             if (oldDst !== null) {
                 _links = oldDst.getLinks();
                 for (j = 0; j < _links.length; j++) {
                     if (_links[j] === _link) {
                         break;
                     }
                 }
                 _links.splice(j, 1);
             }
             if (dst !== null) {
                 _links = dst.getLinks();
                 _links.push(_link);
                 _link.dst = dst;

                 if (_link.getLineStyle() === 'database') {
                     fixDatabaseLinkPoints(_link);
                 } else if (_link.getLineStyle() === 'orthogonal') {
                     fixOrthogonalLinkPoints(_link);
                 }
                 if (_link.org.pins === null && !_link.isOrgPointAdjustable) {
                     calcLinkStartPoint(_link);
                 }
                 if (_link.dst.pins === null && !_link.isDstPointAdjustable) {
                     calcLinkEndPoint(_link);
                 }

                 _link.refresh();
             }
         }

         function setLinkOrg(_link, org) {
             var _links, oldOrg, j;

             if (_link === that.linkModel) {
                 _link.org = org;
                 return;
             }

             if (_taskManager.undoAllowed()) {
                 _taskManager._submitTask(new SetLinkOrgTask(that, _link, _link.org));
             }

             invalidateLink(_link);
             oldOrg = _link.org;
             if (oldOrg !== null) {
                 _links = oldOrg.getLinks();
                 for (j = 0; j < _links.length; j++) {
                     if (_links[j] === _link) {
                         break;
                     }
                 }
                 _links.splice(j, 1);
             }
             if (org !== null) {
                 _links = org.getLinks();
                 _links.push(_link);
                 _link.org = org;

                 if (_link.getLineStyle() === 'database') {
                     fixDatabaseLinkPoints(_link);
                 } else if (_link.getLineStyle() === 'orthogonal') {
                     fixOrthogonalLinkPoints(_link);
                 }
                 if (_link.org.pins === null && !_link.isOrgPointAdjustable) {
                     calcLinkStartPoint(_link);
                 }
                 if (_link.dst.pins === null && !_link.isDstPointAdjustable) {
                     calcLinkEndPoint(_link);
                 }

                 _link.refresh();
             }
         }

         function setLinkPinDst(_link, value) {
             var oldValue;

             oldValue = _link.pinDst;
             _link.pinDst = value;
             if (_link.points !== null && _link.points.length > 0) {
                 if (_link.org.pins != null && (_link.pinDst >= 0 && _link.pinDst < _link.dst.pins.length)) {
                     if (_taskManager.undoAllowed()) {
                         _taskManager.submitTask(new SetLinkPinDstTask(that, _link, oldValue));
                     }
                     _link.points[_link.points.length - 1] = getPinPosition(_link.dst, _link.pinDst);
                     _link.refresh();
                 }
             }
         }

         function setLinkPinOrg(_link, value) {
             var oldValue;

             oldValue = _link.pinOrg;
             _link.pinOrg = value;
             if (_link.points !== null && _link.points.length > 0) {
                 if (_link.org.pins != null && (_link.pinOrg >= 0 && _link.pinOrg < _link.org.pins.length)) {
                     if (_taskManager.undoAllowed()) {
                         _taskManager.submitTask(new SetLinkPinOrgTask(that, _link, oldValue));
                     }
                     _link.points[0] = getPinPosition(_link.org, _link.pinOrg);
                     _link.refresh();
                 }
             }
         }

         function setLinkIsOrgPointAdjustable(_link, adjustable) {
             if (_link.isOrgPointAdjustable === adjustable) {
                 return;
             }
             if (_link === that.linkModel) {
                 _link.isOrgPointAdjustable = adjustable;
                 return;
             }

             if (_taskManager.undoAllowed()) {
                 _taskManager._submitTask(new StretchLinkTask(that, _link));
             }

             _link.isOrgPointAdjustable = adjustable;

             if (_link.org.pins === null && !_link.isOrgPointAdjustable) {
                 calcLinkStartPoint(_link);
             }
             if (_link.dst.pins === null && !_link.isDstPointAdjustable) {
                 calcLinkEndPoint(_link);
             }

             _link.refresh();
         }

         function setLinkIsDstPointAdjustable(_link, adjustable) {
             if (_link.isDstPointAdjustable === adjustable) {
                 return;
             }
             if (_link === that.linkModel) {
                 _link.isDstPointAdjustable = adjustable;
                 return;
             }

             if (_taskManager.undoAllowed()) {
                 _taskManager._submitTask(new StretchLinkTask(that, _link));
             }

             _link.isDstPointAdjustable = adjustable;

             if (_link.org.pins === null && !_link.isOrgPointAdjustable) {
                 calcLinkStartPoint(_link);
             }
             if (_link.dst.pins === null && !_link.isDstPointAdjustable) {
                 calcLinkEndPoint(_link);
             }

             _link.refresh();
         }

         function addLinkPoint(_link, x, y) {
             if (_taskManager.undoAllowed()) {
                 _taskManager._submitTask(new StretchLinkTask(that, _link));
             }
             invalidateLink(_link);
             _link.points.splice(_link.points.length - 1, 0, {
                 x: x,
                 y: y
             });
             if (_link.org.pins === null && !_link.isOrgPointAdjustable) {
                 calcLinkStartPoint(_link);
             }
             if (_link.dst.pins === null && !_link.isDstPointAdjustable) {
                 calcLinkEndPoint(_link);
             }
             _link.refresh();
         }

         function removeLinkPoint(_link, index) {
             if (_taskManager.undoAllowed()) {
                 _taskManager._submitTask(new StretchLinkTask(that, _link));
             }
             invalidateLink(_link);
             _link.points.splice(index, 1);
             if (_link.org.pins === null && !_link.isOrgPointAdjustable) {
                 calcLinkStartPoint(_link);
             }
             if (_link.dst.pins === null && !_link.isDstPointAdjustable) {
                 calcLinkEndPoint(_link);
             }
             _link.refresh();
         }

         function clearLinkPoints(_link) {
             if (_taskManager.undoAllowed()) {
                 _taskManager._submitTask(new StretchLinkTask(that, _link));
             }
             invalidateLink(_link);
             initLinkPoints(_link);
             if (_link.org.pins === null && !_link.isOrgPointAdjustable) {
                 calcLinkStartPoint(_link);
             }
             if (_link.dst.pins === null && !_link.isDstPointAdjustable) {
                 calcLinkEndPoint(_link);
             }
             _link.refresh();
         }

         function getLinkPoint(_link, _index) {
             if (_link.points === null || _index < 0 || _index > _link.points.length - 1) {
                 return null;
             }
             return {
                 x: _link.points[_index].x,
                 y: _link.points[_index].y
             };
         }

         function setLinkPoint(_link, x, y, _index) {
             if ((_link.points === null || _index < 0 || _index > _link.points.length - 1) ||
                 (_index === 0 && _link.org.pins === null &&
                     !_link.isOrgPointAdjustable) ||
                 (_index === _link.points.length - 1 && _link.dst.pins === null &&
                     !_link.isDstPointAdjustable)) {
                 return;
             }

             if (_taskManager.undoAllowed()) {
                 _taskManager._submitTask(new StretchLinkTask(that, _link));
             }

             invalidateLink(_link);

             changePoint(_link, _index, {
                 x: x,
                 y: y
             });

             if (_link.org.pins === null && !_link.isOrgPointAdjustable) {
                 calcLinkStartPoint(_link);
             }
             if (_link.dst.pins === null && !_link.isDstPointAdjustable) {
                 calcLinkEndPoint(_link);
             }
             _link.refresh();
         }

         function changePoint(_link, idx, pt) {
             if (_link.points === null) {
                 return;
             }
             _link.points[idx] = pt;
         }

         function getLinkRect(_link) {
             var rc, rcText, i, polylineHelper, pt, ctx, tm, w, h, apt;

             apt = [];
             if (_link.getLineStyle() === 'bezier') {
                 Helpers.flattenBezier(_link.points[0], _link.points[1],
                     _link.points[2], _link.points[3], apt);
                 rc = new MyRect(apt[0].x, apt[0].y, 0, 0);
                 for (i = 0; i < apt.length - 1; i++) {
                     rc.boundingRect(Helpers.getRectByTwoPoints(apt[i], apt[i + 1]));
                 }

                 if (_link.getIsSelected()) {
                     // If the link is a bezier curve and is selected, we include the 
                     // link points because it is the location of the handles.
                     // The link rect must contain all its points
                     for (i = 0; i < _link.points.length - 1; i++) {
                         rc.boundingRect(Helpers.getRectByTwoPoints(_link.points[i],
                             _link.points[i + 1]));
                     }
                 }
             } else {
                 apt = _link.points;

                 // The link rect must contain all its points
                 rc = new MyRect(apt[0].x, apt[0].y, 0, 0);
                 for (i = 0; i < apt.length - 1; i++) {
                     rc.boundingRect(Helpers.getRectByTwoPoints(apt[i], apt[i + 1]));
                 }
             }

             // Include the text
             if (_link.text !== null && _link.text.length > 0) {
                 polylineHelper = new PolylineHelper(apt);
                 pt = polylineHelper.getPointAtFractionLength(0.5);
                 if (pt !== null) {
                     ctx = _link.flow.canvas.getContext('2d');

                     ctx.font = _link.font;
                     tm = ctx.measureText(_link.text);
                     w = tm.width;
                     h = parseInt(_link.font, 10) * 1.2;
                     if (h === undefined) {
                         h = 16;
                     }
                     rcText = new MyRect(pt.x - w / 2, pt.y - h / 2, w, h);
                     rcText.inflate(h / 2, h / 2); // Increase the size of the rect to be sure
                     rc.boundingRect(rcText);
                 }
             }

             rc = rc.inflate(_link.flow.linkSelectionAreaWidth,
                 _link.flow.linkSelectionAreaWidth);
             return rc;
         }

         function initLinkPoints(_link) {
             // clean the collection of points
             _link.points.splice(0, _link.points.length);

             if (_link.getLineStyle() === 'orthogonal') {
                 initLinkPointsOrthogonal(_link);
             } else if (_link.getLineStyle() === 'database') {
                 initLinkPointsDatabase(_link);
             } else if (_link.getLineStyle() === 'bezier') {
                 initLinkPointsBezier(_link);
             } else {
                 initLinkPointsPolyline(_link);
             }
         }

         function initLinkPointsOrthogonal(_link) {
             _link.points = orthoRouter.getConnectionLine(_link.org, _link.dst,
                 _link.pinOrg, _link.pinDst, _link.orthoMargin);
             _link.firstSegmentHorizontal = _link.points[0].y === _link.points[1].y;
         }

         function initLinkPointsDatabase(_link) {
             var k, rc1, rc2;

             for (k = 0; k < 4; k++) {
                 _link.points.push({
                     x: 0,
                     y: 0
                 });
             }

             // Calculate points position
             rc1 = getNodeRect(_link.org);
             rc2 = getNodeRect(_link.dst);
             if (rc1.left + rc1.width / 2 < rc2.left + rc2.width / 2) {
                 if (!isOriginPin(_link)) {
                     _link.points[0] = {
                         x: rc1.left + rc1.width,
                         y: rc1.top + rc1.height / 2
                     };
                 } else {
                     _link.points[0] = getLinkOrgPinPoint(_link);
                 }
                 if (!isDestinationPin(_link)) {
                     _link.points[3] = {
                         x: rc2.left,
                         y: rc2.top + rc2.height / 2
                     };
                 } else {
                     _link.points[3] = getLinkDstPinPoint(_link);
                 }
                 _link.points[1] = {
                     x: Math.max(_link.points[0].x + offsetDatabase, 0),
                     y: _link.points[0].y
                 };
                 _link.points[2] = {
                     x: Math.max(_link.points[3].x - offsetDatabase, 0),
                     y: _link.points[3].y
                 };
             } else {
                 if (!isOriginPin(_link)) {
                     _link.points[0] = {
                         x: rc1.left,
                         y: rc1.top + rc1.height / 2
                     };
                 } else {
                     _link.points[0] = getLinkOrgPinPoint(_link);
                 }
                 if (!isDestinationPin(_link)) {
                     _link.points[3] = {
                         x: rc2.left + rc2.width,
                         y: rc2.top + rc2.height / 2
                     };
                 } else {
                     _link.points[3] = getLinkDstPinPoint(_link);
                 }
                 _link.points[1] = {
                     x: Math.max(_link.points[0].x - offsetDatabase, 0),
                     y: _link.points[0].y
                 };
                 _link.points[2] = {
                     x: Math.max(_link.points[3].x + offsetDatabase, 0),
                     y: _link.points[3].y
                 };
             }
         }

         function initLinkPointsBezier(_link) {
             var pt0, pt3, dx, dy, d, pt1, pt2, rc;

             _link.points.push({
                 x: 0,
                 y: 0
             });
             _link.points.push({
                 x: 0,
                 y: 0
             });

             // Calculate points position
             if (!isLinkReflexive(_link)) {
                 if (!isOriginPin(_link)) {
                     calcLinkStartPoint(_link);
                 } else {
                     _link.points[0] = getLinkOrgPinPoint(_link);
                 }

                 if (!isDestinationPin(_link)) {
                     calcLinkEndPoint(_link);
                 } else {
                     _link.points[_link.points.length - 1] = getLinkDstPinPoint(_link);
                 }

                 pt0 = _link.points[0];
                 pt3 = _link.points[1];
                 dx = pt3.x - pt0.x;
                 dy = pt3.y - pt0.y;
                 d = Math.sqrt(Math.pow(dx, 2) + Math.pow(dy, 2));
                 pt1 = {
                     x: pt0.x + dx / 2 - d / 5,
                     y: pt0.y + dy / 2 - d / 5
                 };
                 pt2 = {
                     x: pt0.x + dx / 2 + d / 5,
                     y: pt0.y + dy / 2 + d / 5
                 };
                 _link.points.splice(0, _link.points.length);
                 _link.points.push(pt0);
                 _link.points.push(pt1);
                 _link.points.push(pt2);
                 _link.points.push(pt3);
                 if (!isOriginPin(_link)) {
                     calcLinkStartPoint(_link);
                 }
                 if (!isDestinationPin(_link)) {
                     calcLinkEndPoint(_link);
                 }
             } else {
                 // reflexive _link: we add two points in order to have 4 points
                 _link.points.push({
                     x: 0,
                     y: 0
                 });
                 _link.points.push({
                     x: 0,
                     y: 0
                 });

                 rc = getNodeRect(_link.org);
                 _link.points[0] = rc.centerPoint();
                 _link.points[1] = {
                     x: rc.left + rc.width + rc.width / 2,
                     y: _link.points[1].y
                 };
                 _link.points[2] = {
                     x: rc.left + rc.width / 2,
                     y: _link.points[2].y
                 };
                 // Manage so that the reflexive link is allways visible even if the
                 // node is placed near the top of the diagram.
                 if (rc.top - rc.height >= 0) {
                     _link.points[1] = {
                         x: _link.points[1].x,
                         y: rc.top - rc.height / 2
                     };
                     _link.points[2] = {
                         x: _link.points[2].x,
                         y: rc.top - rc.height
                     };
                 } else {
                     _link.points[1] = {
                         x: _link.points[1].x,
                         y: rc.top + rc.height + rc.height / 2
                     };
                     _link.points[2] = {
                         x: _link.points[2].x,
                         y: rc.top + rc.height + rc.height
                     };
                 }
                 _link.points[3] = _link.points[0];

                 if (!isOriginPin(_link)) {
                     calcLinkStartPoint(_link);
                 } else {
                     _link.points[0] = getLinkOrgPinPoint(_link);
                 }

                 if (!isDestinationPin(_link)) {
                     calcLinkEndPoint(_link);
                 } else {
                     _link.points[_link.points.length - 1] = getLinkDstPinPoint(_link);
                 }
             }
         }

         function initLinkPointsPolyline(_link) {
             var rc;

             _link.points.push({
                 x: 0,
                 y: 0
             });
             _link.points.push({
                 x: 0,
                 y: 0
             });

             // Calculate points position
             if (!isLinkReflexive(_link)) {
                 if (!isOriginPin(_link)) {
                     calcLinkStartPoint(_link);
                 } else {
                     _link.points[0] = getLinkOrgPinPoint(_link);
                 }

                 if (!isDestinationPin(_link)) {
                     calcLinkEndPoint(_link);
                 } else {
                     _link.points[_link.points.length - 1] = getLinkDstPinPoint(_link);
                 }
             } else {
                 // reflexive link: we add two points in order to have 4 points
                 _link.points.push({
                     x: 0,
                     y: 0
                 });
                 _link.points.push({
                     x: 0,
                     y: 0
                 });

                 rc = getNodeRect(_link.org);
                 _link.points[0] = rc.centerPoint();
                 _link.points[1] = {
                     x: rc.left + rc.width + rc.width / 2,
                     y: _link.points[1].y
                 };
                 _link.points[2] = {
                     x: rc.left + rc.width / 2,
                     y: _link.points[2].y
                 };
                 // Manage so that the reflexive link is allways visible even if the
                 // node is placed near the top of the diagram.
                 if (rc.top - rc.height >= 0) {
                     _link.points[1] = {
                         x: _link.points[1].x,
                         y: rc.top - rc.height / 2
                     };
                     _link.points[2] = {
                         x: _link.points[2].x,
                         y: rc.top - rc.height
                     };
                 } else {
                     _link.points[1] = {
                         x: _link.points[1].x,
                         y: rc.top + rc.height + rc.height / 2
                     };
                     _link.points[2] = {
                         x: _link.points[2].x,
                         y: rc.top + rc.height + rc.height
                     };
                 }
                 _link.points[3] = _link.points[0];
                 calcLinkStartPoint(_link);
                 calcLinkEndPoint(_link);
             }
         }

         function fixDatabaseLinkPoints(_link) {
             var pt1, pt2;

             pt1 = (_link.org.pins === null && !_link.isOrgPointAdjustable) ?
                 getNodeRect(_link.org).centerPoint() :
                 _link.points[0];
             pt2 = (_link.dst.pins === null && !_link.isDstPointAdjustable) ?
                 getNodeRect(_link.dst).centerPoint() :
                 _link.points[3];
             _link.points[1] = {
                 x: _link.points[0].x + offsetDatabase,
                 y: pt1.y
             };
             _link.points[2] = {
                 x: _link.points[3].x - offsetDatabase,
                 y: pt2.y
             };
         }

         function fixOrthogonalLinkPoints(_link) {
             var n, pt1, pt2;

             n = _link.points.length;

             if (_link.org.pins !== null && _link.pinOrg !== undefined) {
                 _link.points[0] = getPinPosition(_link.org, _link.pinOrg);
             }
             if (_link.dst.pins !== null && _link.pinDst !== undefined) {
                 _link.points[n - 1] = getPinPosition(_link.dst, _link.pinDst);
             }
             pt1 = (_link.org.pins === null && !_link.isOrgPointAdjustable) ?
                 getNodeRect(_link.org).centerPoint() :
                 _link.points[0];
             pt2 = (_link.dst.pins === null && !_link.isDstPointAdjustable) ?
                 getNodeRect(_link.dst).centerPoint() :
                 _link.points[n - 1];

             if (_link.firstSegmentHorizontal) {
                 _link.points[1] = {
                     x: _link.points[1].x,
                     y: pt1.y
                 };
                 if (n % 2 === 0) {
                     _link.points[n - 2] = {
                         x: _link.points[n - 2].x,
                         y: pt2.y
                     };
                 } else {
                     _link.points[n - 2] = {
                         x: pt2.x,
                         y: _link.points[n - 2].y
                     };
                 }
             } else {
                 _link.points[1] = {
                     x: pt1.x,
                     y: _link.points[1].y
                 };
                 if (n % 2 === 0) {
                     _link.points[n - 2] = {
                         x: pt2.x,
                         y: _link.points[n - 2].y
                     };
                 } else {
                     _link.points[n - 2] = {
                         x: _link.points[n - 2].x,
                         y: pt2.y
                     };
                 }
             }
         }

         // When the link does not end to a pin, it is necessary to calculate 
         // the end point
         function calcLinkEndPoint(_link) {
             var rcOrg, rcDst, pt1, pt2, pt, n, polypoints;

             rcOrg = getNodeRect(_link.org);
             rcDst = getNodeRect(_link.dst);

             // Get central points of each node
             pt1 = rcOrg.centerPoint();
             pt2 = rcDst.centerPoint();
             n = _link.points.length;

             // Special case
             if (rcDst.width === 0 || rcDst.height === 0) {
                 _link.points[n - 1] = pt2;
                 return;
             }

             // Calculate origin point of the link
             if (n === 2) {
                 if (isOriginPin(_link)) {
                     pt = getLinkOrgPinPoint(_link);
                 } else {
                     pt = pt1;
                 }
             } else {
                 pt = _link.points[n - 2];
             }

             if (isEllipse(_link.dst)) {
                 _link.points[n - 1] = Helpers.getEllipseNearestPt(rcDst, pt, pt2, 0);
             } else if (isPolygon(_link.dst) && _link.dst.polygon !== null) {
                 polypoints = [];
                 getNodePolygonPoints(_link.dst, polypoints);
                 _link.points[n - 1] = Helpers.getPolyNearestPt(polypoints, pt, pt2);
             } else {
                 // all other shapes are considered as rectangular shapes
                 polypoints = [];
                 Helpers.getRectanglePoints(rcDst, polypoints);
                 _link.points[n - 1] = Helpers.getPolyNearestPt(polypoints, pt, pt2);
             }
         }

         // When the link does not start from a pin, it is necessary to calculate 
         // the origin point
         function calcLinkStartPoint(_link) {
             var rcOrg, rcDst, pt1, pt2, pt, n, polypoints;

             rcOrg = getNodeRect(_link.org);
             rcDst = getNodeRect(_link.dst);

             // Get central points of each node
             pt1 = rcOrg.centerPoint();
             pt2 = rcDst.centerPoint();

             // Special case
             if (rcOrg.width === 0 || rcOrg.height === 0) {
                 _link.points[0] = pt1;
                 return;
             }

             // Calculate origin point of the link
             if (_link.points.length === 2) {
                 if (isDestinationPin(_link)) {
                     pt = getLinkDstPinPoint(_link);
                 } else {
                     pt = pt2;
                 }
             } else {
                 pt = _link.points[1];
             }

             if (isEllipse(_link.org)) {
                 _link.points[0] = Helpers.getEllipseNearestPt(rcOrg, pt, pt1, 0);
             } else if (isPolygon(_link.org) && _link.org.polygon !== null) {
                 polypoints = [];
                 getNodePolygonPoints(_link.org, polypoints);
                 _link.points[0] = Helpers.getPolyNearestPt(polypoints, pt, pt1);
             } else {
                 // all other shapes are considered as rectangular shapes
                 polypoints = [];
                 Helpers.getRectanglePoints(rcOrg, polypoints);
                 _link.points[0] = Helpers.getPolyNearestPt(polypoints, pt, pt1);
             }
         }

         function updateLinkPoints(_link, pt, _handle) {
             var n = _link.points.length;
             if (_link.firstSegmentHorizontal) { // First segment horizontal
                 if (n > 3) {
                     if (_handle === 0) {
                         _link.points[0] = pt;
                         _link.points[1] = {
                             x: _link.points[1].x,
                             y: pt.y
                         };
                     } else if (_handle === 1) {
                         _link.points[1] = {
                             x: pt.x,
                             y: _link.points[1].y
                         };
                         _link.points[2] = {
                             x: pt.x,
                             y: _link.points[2].y
                         };
                     } else if (_handle === n - 1) {
                         if (n % 2 === 0) {
                             _link.points[n - 1] = pt;
                             _link.points[n - 2] = {
                                 x: _link.points[n - 2].x,
                                 y: pt.y
                             };
                         } else {
                             _link.points[n - 2] = {
                                 x: pt.x,
                                 y: _link.points[n - 2].y
                             };
                         }
                     } else if (_handle === n - 2) {
                         if (n % 2 === 0) {
                             _link.points[n - 3] = {
                                 x: pt.x,
                                 y: _link.points[n - 3].y
                             };
                             _link.points[n - 2] = {
                                 x: pt.x,
                                 y: _link.points[n - 2].y
                             };
                         } else {
                             _link.points[n - 3] = {
                                 x: _link.points[n - 3].x,
                                 y: pt.y
                             };
                             _link.points[n - 2] = {
                                 x: _link.points[n - 2].x,
                                 y: pt.y
                             };
                         }
                     } else {
                         _link.points[_handle] = pt;
                         if (_handle % 2 === 0) {
                             _link.points[_handle - 1] = {
                                 x: pt.x,
                                 y: _link.points[_handle - 1].y
                             };
                             _link.points[_handle + 1] = {
                                 x: _link.points[_handle + 1].x,
                                 y: pt.y
                             };
                         } else {
                             _link.points[_handle - 1] = {
                                 x: _link.points[_handle - 1].x,
                                 y: pt.y
                             };
                             _link.points[_handle + 1] = {
                                 x: pt.x,
                                 y: _link.points[_handle + 1].y
                             };
                         }
                     }
                 }
             } else { // First segment vertical
                 if (n > 3) {
                     if (_handle === 0) {
                         _link.points[0] = pt;
                         _link.points[1] = {
                             x: pt.x,
                             y: _link.points[1].y
                         };
                     } else if (_handle === 1) {
                         _link.points[1] = {
                             x: _link.points[1].x,
                             y: pt.y
                         };
                         _link.points[2] = {
                             x: _link.points[2].x,
                             y: pt.y
                         };
                     } else if (_handle === n - 1) {
                         if (n % 2 === 0) {
                             _link.points[n - 2] = {
                                 x: pt.x,
                                 y: _link.points[n - 2].y
                             };
                         } else {
                             _link.points[n - 2] = {
                                 x: _link.points[n - 2].x,
                                 y: pt.y
                             };
                         }
                     } else if (_handle === n - 2) {
                         if (n % 2 === 0) {
                             _link.points[n - 3] = {
                                 x: _link.points[n - 3].x,
                                 y: pt.y
                             };
                             _link.points[n - 2] = {
                                 x: _link.points[n - 2].x,
                                 y: pt.y
                             };
                         } else {
                             _link.points[n - 3] = {
                                 x: pt.x,
                                 y: _link.points[n - 3].y
                             };
                             _link.points[n - 2] = {
                                 x: _link.points[n - 2].x,
                                 y: pt.y
                             };
                         }
                     } else {
                         _link.points[_handle] = pt;
                         if (_handle % 2 === 0) {
                             _link.points[_handle - 1] = {
                                 x: _link.points[_handle - 1].x,
                                 y: pt.y
                             };
                             _link.points[_handle + 1] = {
                                 x: pt.x,
                                 y: _link.points[_handle + 1].y
                             };
                         } else {
                             _link.points[_handle - 1] = {
                                 x: pt.x,
                                 y: _link.points[_handle - 1].y
                             };
                             _link.points[_handle + 1] = {
                                 x: _link.points[_handle + 1].x,
                                 y: pt.y
                             };
                         }
                     }
                 }
             }
         }

         // Add a medium point between two points of a link.
         function insertLinkPoint(_link, pt, pos) {
             _link.points.splice(pos + 1, 0, pt);
         }

         // Used when stretching a link
         function saveLinkPoints(_link) {
             var i;

             _link.points2 = [_link.points.length];
             for (i = 0; i < _link.points.length; i++) {
                 _link.points2[i] = _link.points[i];
             }
         }

         // Get the position of the origin pin of the link
         function getLinkOrgPinPoint(_link) {
             var rc, x, y;

             rc = getNodeRect(_link.org);
             x = rc.left + (rc.width / 100) * _link.org.pins[_link.pinOrg][0];
             y = rc.top + (rc.height / 100) * _link.org.pins[_link.pinOrg][1];
             return {
                 x: x,
                 y: y
             };
         }

         // Get the position of the destination pin of the link
         function getLinkDstPinPoint(_link) {
             var rc, x, y;

             rc = getNodeRect(_link.dst);
             x = rc.left + (rc.width / 100) * _link.dst.pins[_link.pinDst][0];
             y = rc.top + (rc.height / 100) * _link.dst.pins[_link.pinDst][1];
             return {
                 x: x,
                 y: y
             };
         }

         // Does the link ends to a pin ? 
         function isDestinationPin(_link) {
             return _link.pinDst !== null && _link.dst.pins !== null &&
                 (_link.pinDst >= 0 && _link.pinDst < _link.dst.pins.length);
         }

         // Does the link start from apin ?
         function isOriginPin(_link) {
             return _link.pinOrg !== null && _link.org.pins !== null &&
                 (_link.pinOrg >= 0 && _link.pinOrg < _link.org.pins.length);
         }

         // Copy the properties of a node model to a node
         function copyNodeProperties(_node, model) {
             if (model.strokeStyle !== undefined) {
                 _node.strokeStyle = model.strokeStyle;
             }
             if (model.fillStyle !== undefined) {
                 _node.fillStyle = model.fillStyle;
             }
             if (model.gradientFillStyle !== undefined) {
                 _node.gradientFillStyle = model.gradientFillStyle;
             }
             if (model.textFillStyle !== undefined) {
                 _node.textFillStyle = model.textFillStyle;
             }
             if (model.lineWidth !== undefined) {
                 _node.lineWidth = model.lineWidth;
             }
             if (model.shapeFamily !== undefined) {
                 _node.shapeFamily = model.shapeFamily;
             }
             if (model.polygon !== undefined) {
                 _node.polygon = model.polygon;
             }
             if (model.drawShape !== undefined) {
                 _node.drawShape = model.drawShape;
             }
             if (model.fillShape !== undefined) {
                 _node.fillShape = model.fillShape;
             }
             if (model.pins !== undefined) {
                 _node.pins = model.pins;
             }
             if (model.isContextHandle !== undefined) {
                 _node.isContextHandle = model.isContextHandle;
             }
             if (model.isXSizeable !== undefined) {
                 _node.isXSizeable = model.isXSizeable;
             }
             if (model.isYSizeable !== undefined) {
                 _node.isYSizeable = model.isYSizeable;
             }
             if (model.isXMoveable !== undefined) {
                 _node.isXMoveable = model.isXMoveable;
             }
             if (model.isYMoveable !== undefined) {
                 _node.isYMoveable = model.isYMoveable;
             }
             if (model.isOutLinkable !== undefined) {
                 _node.isOutLinkable = model.isOutLinkable;
             }
             if (model.isInLinkable !== undefined) {
                 _node.isInLinkable = model.isInLinkable;
             }
             if (model.isSelectable !== undefined) {
                 _node.isSelectable = model.isSelectable;
             }
             if (model.isShadowed !== undefined) {
                 _node.isShadowed = model.isShadowed;
             }
             if (model.image !== undefined) {
                 _node.image = model.image;
             }
             if (model.textMargin !== undefined) {
                 _node.textMargin = model.textMargin;
             }
             if (model.imageMargin !== undefined) {
                 _node.imageMargin = model.imageMargin;
             }
             if (model.textPosition !== undefined) {
                 _node.textPosition = model.textPosition;
             }
             if (model.imagePosition !== undefined) {
                 _node.imagePosition = model.imagePosition;
             }
             if (model.font !== undefined) {
                 _node.font = model.font;
             }
             if (model.textLineHeight !== undefined) {
                 _node.textLineHeight = model.textLineHeight;
             }
         }

         // Copy the properties of a link model to a link
         function copyLinkProperties(_link, model) {
             if (model.strokeStyle !== undefined) {
                 _link.strokeStyle = model.strokeStyle;
             }
             if (model.fillStyle !== undefined) {
                 _link.fillStyle = model.fillStyle;
             }
             if (model.textFillStyle !== undefined) {
                 _link.textFillStyle = model.textFillStyle;
             }
             if (model.lineWidth !== undefined) {
                 _link.lineWidth = model.lineWidth;
             }
             if (model.isStretchable !== undefined) {
                 _link.isStretchable = model.isStretchable;
             }
             if (model.isSelectable !== undefined) {
                 _link.isSelectable = model.isSelectable;
             }
             if (model.isContextHandle !== undefined) {
                 _link.isContextHandle = model.isContextHandle;
             }
             if (model.isShadowed !== undefined) {
                 _link.isShadowed = model.isShadowed;
             }
             if (model.font !== undefined) {
                 _link.font = model.font;
             }
             if (model.roundedCornerSize !== undefined) {
                 _link.roundedCornerSize = model.roundedCornerSize;
             }
             if (model.isOrientedText !== undefined) {
                 _link.isOrientedText = model.isOrientedText;
             }
             if (model.isOpaque !== undefined) {
                 _link.isOpaque = model.isOpaque;
             }
             if (model.arrowDst !== undefined) {
                 _link.arrowDst = model.arrowDst;
             }
             if (model.arrowOrg !== undefined) {
                 _link.arrowOrg = model.arrowOrg;
             }
             if (model.lineStyle !== undefined) {
                 _link.lineStyle = model.lineStyle;
             }
             if (model.orthoMargin !== undefined) {
                 _link.orthoMargin = model.orthoMargin;
             }
             if (model.points !== undefined) {
                 _link.points = model.points.slice();
             }
         }

         // Selection of an item (node or link)
         function selectItem(itm, optimized) {
             var i;

             _isSelChanged = true;
             if (optimized) {
                 if (that.isNode(itm)) {
                     invalidateNode(itm);
                 } else if (that.isLink(itm)) {
                     invalidateLink(itm);
                 }
                 return;
             }
             if (itm.getIsSelected()) {
                 // If the item is selected, add it at the end of the selection list
                 _selectedItems.push(itm);
             } else {
                 // If the item is not selected, remove it from the list of selected items
                 for (i = _selectedItems.length - 1; i >= 0; i--) {
                     if (itm === _selectedItems[i]) {
                         break;
                     }
                 }
                 _selectedItems.splice(i, 1);
             }

             if (that.canSendSelectionChangedEvent) {
                 // Send the selectionChanged event
                 fireSelectionChangeEvent(itm);
             }
             itm.refresh();
         }


         // Painting helpers--------------------------------------------------------------

         // Update the canvas drawing
         function updateDrawing() {
             if (_repaint === 0) {
                 var ctx = that.canvas.getContext('2d');
                 paintInvalidatedRect(ctx);
                 resetInvalidatedRect();
             }
         }

         // Set the rectangular portion of AddFlow that needs to be repainted
         function invalidate(rect) {
             if (rect === null) {
                 rect = new MyRect(0, 0, that.canvas.width / that.zoom, that.canvas.height / that.zoom);
             }
             if (invRect === null) {
                 invRect = rect;
             } else {
                 invRect.boundingRect(rect);
             }
         }

         // Reset the rectangular portion of AddFlow that needs to be repainted
         function resetInvalidatedRect() {
             invRect = null;
         }

         function paintInvalidatedRect(ctx) {
             ctx.save();
             ctx.scale(that.zoom, that.zoom);
             setClipRegion(ctx, invRect);
             drawBackground(ctx, invRect);
             if (that.ownerDraw !== null && invRect !== null) {
                 that.ownerDraw(ctx);
             }
             drawItems(ctx, invRect);
             drawSelection(ctx, invRect);
             drawPins(ctx, pinnedItem);
             drawOutline(ctx);
             ctx.restore();
         }

         // Define a rectangular clipping region
         function setClipRegion(ctx, rect) {
             if (rect === null) {
                 return;
             }
             ctx.beginPath();
             ctx.moveTo(rect.left, rect.top);
             ctx.lineTo(rect.left + rect.width, rect.top);
             ctx.lineTo(rect.left + rect.width, rect.top + rect.height);
             ctx.lineTo(rect.left, rect.top + rect.height);
             ctx.closePath();
             ctx.clip();
         }

         // Paint a rectangular region of the canvas
         function drawBackground(ctx, rect) {
             if (rect === null) {
                 return;
             }
             ctx.fillStyle = that.fillStyle;
             ctx.fillRect(rect.left, rect.top, rect.width, rect.height);
             if (that.gridDraw) {
                 drawGrid(ctx, that.gridSizeX, that.gridSizeY, that.gridStrokeStyle, rect);
             }
         }

         // Draw the grid used for snapping
         function drawGrid(ctx, xgrid, ygrid, strokeStyle, rect) {
             var xStart, yStart, xEnd, yEnd, x, y;

             xStart = Math.floor((rect.left / xgrid)) * xgrid;
             yStart = Math.floor((rect.top / ygrid)) * ygrid;
             xEnd = rect.left + rect.width;
             yEnd = rect.top + rect.height;
             ctx.strokeStyle = strokeStyle;
             ctx.lineWidth = 0.5;
             for (x = xStart; x <= xEnd; x += xgrid) {
                 ctx.beginPath();
                 ctx.moveTo(x, rect.top);
                 ctx.lineTo(x, rect.top + rect.height);
                 ctx.stroke();
             }
             for (y = yStart; y <= yEnd; y += ygrid) {
                 ctx.beginPath();
                 ctx.moveTo(rect.left, y);
                 ctx.lineTo(rect.left + rect.width, y);
                 ctx.stroke();
             }
         }

         // Draw the pins used to create links
         function drawPins(ctx, itm) {
             var k;

             if (itm === null) {
                 return;
             }
             if (!_isCreatingNode && !_isMovingNode && !_isResizingNode &&
                 !_isZooming && !_isSelecting) {
                 if (itm.pins !== null) {
                     for (k = 0; k < pinAreas.length; k++) {
                         drawPinArea(ctx, pinAreas[k]);
                     }
                 } else {
                     if (pinAreaCentral !== null) {
                         drawCentralPinArea(ctx, pinAreaCentral);
                     }
                 }
             }
         }

         // Draw all the items (nodes and links) partially 
         // contained in a rectangular region of the canvas
         function drawItems(ctx, rect) {
             var i, itm, inc, rc, itemList;

             if (rect === null) {
                 return;
             }

             if (_isQuadtree) {
                 itemList = _quadtree._getItems(rect);
             } else {
                 itemList = _items;
             }

             for (i = 0; i < itemList.length; i++) {
                 itm = itemList[i];
                 inc = itm.lineWidth + that.handleSize;
                 if (that.isNode(itm)) {
                     rc = getNodeRect(itm);
                 } else {
                     rc = getLinkRect(itm);
                 }
                 rc = rc.inflate(inc, inc);
                 if (rc.intersectsWith(rect)) {
                     if (that.isNode(itm)) {
                         drawNode(ctx, itm);
                     } else {
                         drawLink(ctx, itm);
                     }
                 }
             }
         }

         // Draw the selection handles of all the selected items (nodes and links)  
         // partially contained in a rectangular region of the canvas.
         function drawSelection(ctx, rect) {
             var i;

             if (rect === null) {
                 return;
             }
             for (i = 0; i < _selectedItems.length; i++) {
                 drawItemSelection(ctx, rect, _selectedItems[i]);
             }
         }

         function drawItemSelection(ctx, rect, itm) {
             var j, _handles, inc, rc;

             _handles = [];
             inc = itm.lineWidth + that.handleSize;
             if (that.isNode(itm)) {
                 rc = getNodeRect(itm);
             } else {
                 rc = getLinkRect(itm);
             }
             rc = rc.inflate(inc, inc);
             if (rc.intersectsWith(rect)) {
                 if (_isNode(itm)) {
                     getNodeHandles(itm, _handles);
                     for (j = 0; j < _handles.length; j++) {
                         drawResizeHandle(ctx, _handles[j]);
                     }
                     if (that.canShowContextHandle && itm.isContextHandle) {
                         drawNodeContextHandle(ctx, itm);
                     }
                 } else if (_isLink(itm)) {
                     getLinkHandles(itm, _handles);
                     for (j = 0; j < _handles.length; j++) {
                         drawStretchHandle(ctx, _handles[j]);
                     }
                     if (that.canShowContextHandle && itm.isContextHandle) {
                         drawLinkContextHandle(ctx, itm);
                     }
                     if (itm.getLineStyle() === 'bezier') {
                         drawBezierVisual(ctx, itm);
                     }
                 }
             }
         }

         function drawNodeContextHandle(ctx, _node) {
             var rc;

             rc = getNodeContextHandle(_node);
             if (rc !== null) {
                 drawContextHandle(ctx, rc.left, rc.top);
             }
         }

         function drawLinkContextHandle(ctx, _link) {
             var rc;

             rc = getLinkContextHandle(_link);
             if (rc !== null) {
                 drawContextHandle(ctx, rc.left, rc.top);
             }
         }

         function drawContextHandle(ctx, x, y) {
             var d, gradObj;

             d = that.contextHandleSize * 2 / 5 - 2;
             ctx.lineWidth = 1;
             ctx.strokeStyle = that.contextHandleStrokeStyle;
             gradObj = ctx.createLinearGradient(x, y, x + d, y + d);
             gradObj.addColorStop(0, that.contextHandleGradientColor1);
             gradObj.addColorStop(1, that.contextHandleGradientColor2);
             ctx.fillStyle = gradObj;
             Helpers.drawEllipse(ctx, x, y, d, d);
             ctx.stroke();
             ctx.fill();
             x += 1 + d;
             gradObj = ctx.createLinearGradient(x, y, x + d, y + d);
             gradObj.addColorStop(0, that.contextHandleGradientColor1);
             gradObj.addColorStop(1, that.contextHandleGradientColor2);
             ctx.fillStyle = gradObj;
             Helpers.drawEllipse(ctx, x, y, d, d);
             ctx.stroke();
             ctx.fill();
             x += 1 + d;
             gradObj = ctx.createLinearGradient(x, y, x + d, y + d);
             gradObj.addColorStop(0, that.contextHandleGradientColor1);
             gradObj.addColorStop(1, that.contextHandleGradientColor2);
             ctx.fillStyle = gradObj;
             Helpers.drawEllipse(ctx, x, y, d, d);
             ctx.stroke();
             ctx.fill();
         }

         // Draw a resizing handle (defined by a rectangle) of a node
         function drawResizeHandle(ctx, rect) {
             var gradObj;

             ctx.lineWidth = 1;
             gradObj = ctx.createLinearGradient(rect.left, rect.top,
                 rect.left + rect.width, rect.top + rect.height);
             gradObj.addColorStop(0, that.handleGradientColor1);
             gradObj.addColorStop(1, that.handleGradientColor2);
             ctx.fillStyle = gradObj;
             ctx.strokeStyle = that.handleStrokeStyle;
             Helpers.drawEllipse(ctx, rect.left, rect.top, rect.width, rect.height);
             ctx.stroke();
             ctx.fill();
         }

         // Draw a node pin used to create links
         function drawPinArea(ctx, rect) {
             var gradObj;

             ctx.lineWidth = 1;
             gradObj = ctx.createLinearGradient(rect.left, rect.top,
                 rect.left + rect.width, rect.top + rect.height);
             gradObj.addColorStop(0, that.pinGradientColor1);
             gradObj.addColorStop(1, that.pinGradientColor2);
             ctx.fillStyle = gradObj;
             ctx.strokeStyle = that.pinStrokeStyle;
             Helpers.drawRectangle(ctx, rect.left, rect.top, rect.width, rect.height);
             ctx.stroke();
             ctx.fill();
         }

         // Draw the central node pin used to create links.
         function drawCentralPinArea(ctx, rect) {
             var gradObj;

             ctx.lineWidth = 1;
             gradObj = ctx.createLinearGradient(rect.left, rect.top,
                 rect.left + rect.width, rect.top + rect.height);
             gradObj.addColorStop(0, that.centralPinGradientColor1);
             gradObj.addColorStop(1, that.centralPinGradientColor2);
             ctx.fillStyle = gradObj;
             ctx.strokeStyle = that.centralPinStrokeColor;
             Helpers.drawRectangle(ctx, rect.left, rect.top, rect.width, rect.height);
             ctx.stroke();
             ctx.fill();
         }

         // Draw a stretching handle (defined by a rectangle) of a link.
         function drawStretchHandle(ctx, rect) {
             var gradObj;

             ctx.lineWidth = 1;
             gradObj = ctx.createLinearGradient(rect.left, rect.top,
                 rect.left + rect.width, rect.top + rect.height);
             gradObj.addColorStop(0, that.handleGradientColor1);
             gradObj.addColorStop(1, that.handleGradientColor2);
             ctx.fillStyle = gradObj;
             ctx.strokeStyle = that.handleStrokeStyle;
             Helpers.drawEllipse(ctx, rect.left, rect.top, rect.width, rect.height);
             ctx.stroke();
             ctx.fill();
         }

         // This function is used when the user creates a node or a link interactively 
         // with the mouse, or when he draws interactively a rectangle to select items
         // or make a zoom.
         function drawOutline(ctx) {
             if (_isCreatingNode) {
                 drawNodeOutline(ctx);
             } else if (_isCreatingLink) {
                 drawLinkOutline(ctx);
             } else if (_isSelecting || _isZooming) {
                 drawSelectOutline(ctx);
             }
         }

         // This function is used when the user creates a node interactively.
         // A node shape is drawn at each mouse move.
         function drawNodeOutline(ctx) {
             var rc, gradObj, polypoints;

             rc = new MyRect(ptOrg.x, ptOrg.y, ptPrior.x - ptOrg.x, ptPrior.y - ptOrg.y);
             ctx.lineWidth = that.nodeModel.lineWidth;
             ctx.strokeStyle = that.nodeModel.strokeStyle;
             if (that.nodeModel.gradientFillStyle !== that.nodeModel.fillStyle) {
                 gradObj = ctx.createLinearGradient(rc.left, rc.top,
                     rc.left + rc.width, rc.top + rc.height);
                 gradObj.addColorStop(0, that.nodeModel.fillStyle);
                 gradObj.addColorStop(1, that.nodeModel.gradientFillStyle);
                 ctx.fillStyle = gradObj;
             } else {
                 ctx.fillStyle = that.nodeModel.fillStyle;
             }
             if (isEllipse(that.nodeModel)) {
                 Helpers.drawEllipse(ctx, rc.left, rc.top, rc.width, rc.height);
             } else if (isRectangle(that.nodeModel)) {
                 Helpers.drawRectangle(ctx, rc.left, rc.top, rc.width, rc.height);
             } else if (isPolygon(that.nodeModel)) {
                 if (that.nodeModel.polygon !== undefined && that.nodeModel.polygon !== null) {
                     polypoints = [];
                     that.nodeModel.x = rc.left;
                     that.nodeModel.y = rc.top;
                     that.nodeModel.w = rc.width;
                     that.nodeModel.h = rc.height;
                     getNodePolygonPoints(that.nodeModel, polypoints);
                     Helpers.drawPolygon(ctx, polypoints);
                 } else {
                     Helpers.drawRectangle(ctx, rc.left, rc.top, rc.width, rc.height);
                 }
             } else {
                 that.nodeModel.drawShape(ctx, rc.left, rc.top, rc.width, rc.height);
             }
             ctx.stroke();
             ctx.fill();
         }

         // This function is used when the user creates a link interactively.
         // A link line is drawn at each mouse move.
         function drawLinkOutline(ctx) {
             ctx.lineWidth = that.linkModel.lineWidth;
             ctx.strokeStyle = that.linkModel.strokeStyle;
             ctx.beginPath();
             ctx.moveTo(ptOrg.x, ptOrg.y);
             ctx.lineTo(ptPrior.x, ptPrior.y);
             ctx.stroke();
         }

         // This function is used when the user draws interactively a rectangle. 
         // to select items or make a zoom.
         // A rectangle is drawn at each mouse move.
         function drawSelectOutline(ctx) {
             ctx.strokeStyle = that.selRectStrokeStyle;
             ctx.fillStyle = that.selRectFillStyle;
             ctx.lineWidth = that.selRectLineWidth;
             ctx.strokeRect(tmpRect.left, tmpRect.top, tmpRect.width, tmpRect.height);
             ctx.fillRect(tmpRect.left, tmpRect.top, tmpRect.width, tmpRect.height);
         }

         // Draw the two lines used to display a selected bezier link.
         function drawBezierVisual(ctx, _link) {
             ctx.lineWidth = 0.2;
             ctx.strokeStyle = that.bezierSelectionLinesStrokeStyle;
             ctx.moveTo(_link.points[0].x, _link.points[0].y);
             ctx.lineTo(_link.points[1].x, _link.points[1].y);
             ctx.moveTo(_link.points[3].x, _link.points[3].y);
             ctx.lineTo(_link.points[2].x, _link.points[2].y);
             ctx.stroke();
         }

         // Just set the shadow properties of the canvas.
         function setShadowProperties(ctx, flow) {
             ctx.shadowOffsetX = flow.shadowOffsetX;
             ctx.shadowOffsetY = flow.shadowOffsetY;
             ctx.shadowBlur = flow.shadowBlur;
             ctx.shadowColor = flow.shadowColor;
         }

         // Node drawing--------------------------------------------------------------

         // Draw a node. 
         // First draw the node shape then the node content (text and image)
         function drawNode(ctx, node) {
             ctx.save();
             drawNodeShape(ctx, node);
             ctx.restore();
             ctx.save();
             drawNodeContent(ctx, node);
             ctx.restore();
         }

         // Draw the shape of a node
         function drawNodeShape(ctx, node) {
             var gradObj, polypoints;

             if (node.isShadowed) {
                 setShadowProperties(ctx, that);
             }
             ctx.lineWidth = node.lineWidth;
             ctx.strokeStyle = node.strokeStyle;

             // Draw node border shape
             if (isEllipse(node)) {
                 Helpers.drawEllipse(ctx, node.x, node.y, node.w, node.h);
             } else if (isRectangle(node)) {
                 Helpers.drawRectangle(ctx, node.x, node.y, node.w, node.h);
             } else if (isPolygon(node)) {
                 if (node.polygon !== undefined && node.polygon !== null) {
                     polypoints = [];
                     getNodePolygonPoints(node, polypoints);
                     Helpers.drawPolygon(ctx, polypoints);
                 } else {
                     Helpers.drawRectangle(ctx, node.x, node.y, node.w, node.h);
                 }
             } else {
                 if (node.drawShape !== undefined && node.drawShape !== null) {
                     node.drawShape(ctx, node.x, node.y, node.w, node.h);
                 } else {
                     Helpers.drawRectangle(ctx, node.x, node.y, node.w, node.h);
                 }
             }
             ctx.stroke();

             // Fill the node shape
             if (node.gradientFillStyle !== node.fillStyle) {
                 gradObj = ctx.createLinearGradient(node.x, node.y,
                     node.x + node.w, node.y + node.h);
                 gradObj.addColorStop(0, node.fillStyle);
                 gradObj.addColorStop(1, node.gradientFillStyle);
                 ctx.fillStyle = gradObj;
             } else {
                 ctx.fillStyle = node.fillStyle;
             }
             ctx.fill();

             if (node.fillShape !== undefined && node.fillShape !== null) {
                 node.fillShape(ctx, node.x, node.y, node.w, node.h);
             }
         }

         // Draw the text and image of a node
         function drawNodeContent(ctx, node) {
             var rcImg, size, x, y, w, h, rc, inc;

             if ((node.text === null || node.text.length === 0) && node.image === null) {
                 return;
             }

             // Set Clip region
             inc = node.lineWidth / 2;
             rc = getNodeRect(node);
             rc = rc.inflate(inc, inc);
             setClipRegion(ctx, rc);

             if (node.image !== undefined && node.image !== null) {
                 /*&& node.image.complete*/
                 x = rc.left + node.imageMargin.left;
                 y = rc.top + node.imageMargin.top;
                 w = Math.max(0, rc.width - node.imageMargin.left - node.imageMargin.right);
                 h = Math.max(0, rc.height - node.imageMargin.top - node.imageMargin.bottom);
                 rcImg = getNodeImageRectangle(node, new MyRect(x, y, w, h), node.image);
                 ctx.drawImage(node.image, rcImg.left, rcImg.top, rcImg.width, rcImg.height);
             }

             if (node.text !== undefined && node.text !== null && node.text.length > 0) {
                 x = rc.left + node.textMargin.left;
                 y = rc.top + node.textMargin.top;
                 w = Math.max(0, rc.width - node.textMargin.left - node.textMargin.right);
                 h = Math.max(0, rc.height - node.textMargin.top - node.textMargin.bottom);

                 ctx.fillStyle = node.textFillStyle;
                 ctx.font = node.font;
                 ctx.textBaseline = 'top';

                 size = {
                     width: 0,
                     height: 0
                 };
                 if (node.textLineHeight !== null) {
                     // Get the size of the text (which may contain several lines)
                     size = Helpers.multiFillText(ctx, node.text, 0, 0,
                         node.textLineHeight, w, false);
                 }

                 // Determines the position of the text
                 switch (node.textPosition) {
                     case 'leftTop':
                         ctx.textAlign = 'start';
                         break;
                     case 'centerTop':
                         ctx.textAlign = 'center';
                         x += w / 2;
                         break;
                     case 'rightTop':
                         ctx.textAlign = 'end';
                         x += w;
                         break;
                     case 'leftMiddle':
                         ctx.textAlign = 'start';
                         if (node.textLineHeight === null) {
                             ctx.textBaseline = 'middle';
                         }
                         y += h / 2 - size.height / 2;
                         break;
                     case 'centerMiddle':
                         ctx.textAlign = 'center';
                         if (node.textLineHeight === null) {
                             ctx.textBaseline = 'middle';
                         }
                         x += w / 2;
                         y += h / 2 - size.height / 2;
                         break;
                     case 'rightMiddle':
                         ctx.textAlign = 'end';
                         if (node.textLineHeight === null) {
                             ctx.textBaseline = 'middle';
                         }
                         x += w;
                         y += h / 2 - size.height / 2;
                         break;
                     case 'leftBottom':
                         ctx.textAlign = 'start';
                         if (node.textLineHeight === null) {
                             ctx.textBaseline = 'bottom';
                         }
                         y += h - size.height;
                         break;
                     case 'centerBottom':
                         ctx.textAlign = 'center';
                         if (node.textLineHeight === null) {
                             ctx.textBaseline = 'bottom';
                         }
                         x += w / 2;
                         y += h - size.height;
                         break;
                     case 'rightBottom':
                         ctx.textAlign = 'end';
                         if (node.textLineHeight === null) {
                             ctx.textBaseline = 'bottom';
                         }
                         x += w;
                         y += h - size.height;
                         break;
                 }

                 // Draw the text
                 if (node.textLineHeight !== null) {
                     Helpers.multiFillText(ctx, node.text, x, y, node.textLineHeight, w, true);
                 } else {
                     ctx.fillText(node.text, x, y);
                 }
             }
         }

         function getNodeImageRectangle(node, rcClip, image) {
             var rcImage = rcClip.doclone();
             rcImage.width = image.width;
             rcImage.height = image.height;
             switch (node.imagePosition) {
                 case 'leftTop':
                     break;
                 case 'leftMiddle':
                     rcImage.top += rcClip.height / 2 - rcImage.height / 2;
                     break;
                 case 'leftBottom':
                     rcImage.top += rcClip.height - rcImage.height;
                     break;
                 case 'rightTop':
                     rcImage.left += rcClip.width - rcImage.width;
                     break;
                 case 'rightMiddle':
                     rcImage.left += rcClip.width - rcImage.width;
                     rcImage.top += rcClip.height / 2 - rcImage.height / 2;
                     break;
                 case 'rightBottom':
                     rcImage.left += rcClip.width - rcImage.width;
                     rcImage.top += rcClip.height - rcImage.height;
                     break;
                 case 'centerTop':
                     rcImage.left += rcClip.width / 2 - rcImage.width / 2;
                     break;
                 case 'centerMiddle':
                     rcImage.left += rcClip.width / 2 - rcImage.width / 2;
                     rcImage.top += rcClip.height / 2 - rcImage.height / 2;
                     break;
                 case 'centerBottom':
                     rcImage.left += rcClip.width / 2 - rcImage.width / 2;
                     rcImage.top += rcClip.height - rcImage.height;
                     break;
             }
             return rcImage;
         }

         // Link drawing -------------------------------------------------------------

         // Draw a link: its line, arrows and text.
         function drawLink(ctx, _link) {
             var r, curvePoints, apt, polylineHelper, pt, ptTan, tm, w, h, rcText, angle;

             ctx.save();

             if (_link.isShadowed) {
                 setShadowProperties(ctx, _link.flow);
             }

             ctx.lineWidth = _link.lineWidth;
             ctx.strokeStyle = _link.strokeStyle;
             switch (_link.getLineStyle()) {
                 case 'polyline':
                 case 'database':
                 case 'orthogonal':
                     r = _link.roundedCornerSize;
                     if (r > 0 && _link.points.length > 2) {
                         Helpers.drawPolylineRounded(ctx, _link.points, r);
                     } else {
                         Helpers.drawPolyline(ctx, _link.points);
                     }
                     break;

                 case 'spline':
                     curvePoints = [];
                     Helpers.getSplinePoints(_link.points, curvePoints);
                     Helpers.drawPolyline(ctx, curvePoints);
                     break;

                 case 'bezier':
                     Helpers.drawBezier(ctx, _link.points[0], _link.points[1],
                         _link.points[2], _link.points[3]);
                     break;
             }
             ctx.stroke();

             if (_link.arrowDst !== undefined && _link.arrowDst !== null) {
                 drawDstArrow(ctx, _link);
             }

             if (_link.arrowOrg !== undefined && _link.arrowOrg !== null) {
                 drawOrgArrow(ctx, _link);
             }

             ctx.restore();

             if (_link.text !== undefined && _link.text !== null && _link.text.length > 0) {
                 // Get the position of the text
                 apt = [];
                 if (_link.lineStyle === 'bezier') {
                     Helpers.flattenBezier(_link.points[0], _link.points[1],
                         _link.points[2], _link.points[3], apt);
                 } else {
                     apt = _link.points;
                 }
                 polylineHelper = new PolylineHelper(apt);
                 pt = polylineHelper.getPointAtFractionLength(0.5);
                 if (pt !== null) {
                     ptTan = polylineHelper.getTangent();
                     if (ptTan !== null) {
                         angle = Math.atan2(ptTan.y, ptTan.y) * (180 / Math.PI);
                         if (ptTan.y < 0) {
                             angle += 180;
                         }
                     } else {
                         angle = 0;
                     }

                     ctx.translate(pt.x, pt.y);
                     if (_link.isOrientedText) {
                         ctx.rotate(-angle);
                     }

                     // Select text color, font and draw text
                     ctx.font = _link.font;
                     tm = ctx.measureText(_link.text);
                     w = tm.width;
                     h = parseInt(_link.font, 10) * 1.2;
                     if (_link.isOpaque && h !== undefined) {
                         rcText = new MyRect(-w / 2, -h / 2, w, h);
                         rcText.inflate(2, 2);
                         ctx.fillStyle = _link.flow.fillStyle;
                         ctx.fillRect(rcText.left, rcText.top, rcText.width, rcText.height);
                         ctx.fillStyle = _link.textFillStyle;
                         ctx.textBaseline = 'middle';
                         ctx.fillText(_link.text, -w / 2, 0);
                     } else {
                         ctx.fillStyle = _link.textFillStyle;
                         ctx.fillText(_link.text, -w / 2, -2);
                     }

                     if (_link.isOrientedText) {
                         ctx.rotate(angle);
                     }
                     ctx.translate(-pt.x, -pt.y);
                 }
             }
         }

         // Draw the destination arrow of a link
         function drawDstArrow(ctx, _link) {
             var pt1, pt2, angle;

             pt1 = _link.points[_link.points.length - 2];
             pt2 = _link.points[_link.points.length - 1];
             if (_link.getLineStyle() === 'bezier') {
                 pt1 = Helpers.getFirstPointOfLastSegmentOfBezier(_link.points[0],
                     _link.points[1], _link.points[2], _link.points[3]);
             }

             angle = Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x);
             ctx.fillStyle = _link.fillStyle;
             ctx.strokeStyle = _link.strokeStyle;
             Helpers.drawArrow(ctx,
                 Helpers.translateShape(
                     Helpers.rotateShape(_link.arrowDst, angle), pt2.x, pt2.y));
         }

         // Draw the origin arrow of a link
         function drawOrgArrow(ctx, _link) {
             var pt1, pt2, angle;

             pt1 = _link.points[1];
             pt2 = _link.points[0];
             if (_link.getLineStyle() === 'bezier') {
                 pt1 = Helpers.getFirstPointOfLastSegmentOfBezier(_link.points[3],
                     _link.points[2], _link.points[1], _link.points[0]);
             }

             angle = Math.atan2(pt2.y - pt1.y, pt2.x - pt1.x);
             ctx.fillStyle = _link.fillStyle;
             ctx.strokeStyle = _link.strokeStyle;
             Helpers.drawArrow(ctx,
                 Helpers.translateShape(
                     Helpers.rotateShape(_link.arrowOrg, angle), pt2.x, pt2.y));
         }


         // Mouse hit helpers ------------------------------------------------------------

         // Determine if a point is over a node
         function hitNodeTest(node, pt) {
             var ctx, t1, t2, t3, ptCtr, _points, hit, rc;

             rc = getNodeRect(node);
             hit = false;
             if (rc.containsPoint(pt)) {
                 if (isRectangle(node)) {
                     hit = true;
                 } else if (isEllipse(node)) {
                     ptCtr = rc.centerPoint();
                     t1 = (rc.height / 2 * (pt.x - ptCtr.x));
                     t2 = (rc.width / 2 * (pt.y - ptCtr.y));
                     t3 = (rc.width / 2 * rc.height / 2);
                     if (t1 * t1 + t2 * t2 <= t3 * t3) {
                         hit = true;
                     }
                 } else if (isPolygon(node)) {
                     ctx = that.canvas.getContext('2d');
                     if (node.polygon !== undefined && node.polygon !== null) {
                         _points = [];
                         getNodePolygonPoints(node, _points);
                         Helpers.drawPolygon(ctx, _points);
                         hit = ctx.isPointInPath(pt.x, pt.y);
                     } else {
                         hit = true;
                     }
                 } else {
                     ctx = that.canvas.getContext('2d');
                     if (node.drawShape !== undefined && node.drawShape !== null) {
                         node.drawShape(ctx, node.x, node.y, node.w, node.h);
                         hit = ctx.isPointInPath(pt.x, pt.y);
                     }
                 }
             }
             return hit;
         }

         // Determine if a point is over the bounding rectangle of a node
         function hitNodeTest2(node, pt) {
             var k, rc;

             rc = getNodeRect(node);
             for (k = 0; k < pinAreas.length; k++) {
                 rc.boundingRect(pinAreas[k]);
             }
             return (rc.containsPoint(pt));
         }

         // Determine if a point is over a link
         function hitLinkTest(_link, pt) {
             var hit, rc, distance, apt;

             hit = false;
             rc = getLinkRect(_link);
             distance = 0.0;
             if (rc.containsPoint(pt)) {
                 apt = [];
                 if (_link.getLineStyle() === 'bezier') {
                     Helpers.flattenBezier(_link.points[0], _link.points[1],
                         _link.points[2], _link.points[3], apt);
                 } else {
                     apt = _link.points;
                 }

                 distance = Helpers.getDistanceBetweenPointAndPolyline(apt, apt.length,
                     pt, that.linkSelectionAreaWidth);
                 if (distance <= that.linkSelectionAreaWidth) {
                     linkDistance = distance;
                     hit = true;
                 }
             }
             return hit;
         }

         // Determine the position of a node pin.
         // The pin is defined by its index.
         function getPinPosition(node, pinIndex) {
             var rc = getNodeRect(node);
             return {
                 x: rc.left + (rc.width / 100) * node.pins[pinIndex][0],
                 y: rc.top + (rc.height / 100) * node.pins[pinIndex][1]
             };
         }

         // Determine where is the mouse cursor
         function checkArea(pt) {
             var i, itm;

             if (_isPanning) {
                 return;
             }

             that.hitArea = 'outSide'; // Default: the mouse over nothing
             _cursor = 'default';

             // Get the new hitted item
             if (_isStretchingLink) {
                 hittedItem = _getHitItem(pt, itemsetEnum.nodes);
             } else {
                 hittedItem = _getHitItem(pt, itemsetEnum.items);
             }

             // Repaint the previous hitted item (to remove the pins)
             if (pinnedItem !== null) {
                 if (hittedItem === null) {
                     if (!hitNodeTest2(pinnedItem, pt)) {
                         invalidateNode(pinnedItem);
                         pinnedItem = null;
                         pinAreas.splice(0, pinAreas.length);
                         pinAreaCentral = null;
                         updateDrawing();
                     } else {
                         if (checkPins(pinnedItem, pt)) {
                             return;
                         }
                     }
                 } else if (hittedItem !== pinnedItem) {
                     invalidateNode(pinnedItem);
                     pinnedItem = null;
                     pinAreas.splice(0, pinAreas.length);
                     pinAreaCentral = null;
                     updateDrawing();
                 }
             }

             if (hittedItem !== null) {
                 if (_isNode(hittedItem)) {
                     // The hitted item is a node
                     that.hitArea = 'node';
                     if (!_isCreatingLink && that.canMoveNode &&
                         (hittedItem.isXMoveable || hittedItem.isYMoveable)) {
                         _cursor = 'move';
                     }
                 } else {
                     // The hitted item is a link
                     that.hitArea = '_link';
                 }

                 // If the hitted item is a node, display its pins
                 if (_isNode(hittedItem)) {
                     pinnedItem = hittedItem;
                     if (checkPins(hittedItem, pt)) {
                         // If the mouse is over a pin, return
                         return;
                     }
                 }
             }

             // Detect if the mouse has left the node area.
             // (this is necessary when creating reflexive links: the mouse
             // must leave the node then return to this node)
             if (!outOrg && _isCreatingLink) {
                 if (hittedItem === null || !_isNode(hittedItem)) {
                     outOrg = true;
                 }
             }

             for (i = 0; i < _selectedItems.length; i++) {
                 itm = _selectedItems[i];
                 if (_isNode(itm)) {
                     checkNodeArea(itm, pt);
                 } else if (_isLink(itm)) {
                     checkLinkArea(itm, pt);
                 }
             }
         }

         // Determine if the mouse cursor is over a node pin.
         function checkPins(itm, pt) {
             var j;

             if (!_isCreatingLink) {
                 if (that.canDrawLink && itm.isOutLinkable) {
                     itm.refresh();

                     if (itm.pins !== null) {
                         getPinAreas(itm, pinAreas);
                         for (j = 0; j < pinAreas.length; j++) {
                             if (pinAreas[j].containsPoint(pt)) {
                                 pinOrigin = j;
                                 ptPinOrigin = pinAreas[j].centerPoint();
                                 that.hitArea = 'pin';
                                 _cursor = 'crosshair';
                                 return true;
                             }
                         }
                     } else {
                         pinAreaCentral = getCentralPinArea(itm);
                         if (pinAreaCentral.containsPoint(pt)) {
                             ptPinOrigin = pinAreaCentral.centerPoint();
                             that.hitArea = 'centralPin';
                             _cursor = 'crosshair';
                             return true;
                         }
                     }
                 }
             } else {
                 if (that.canDrawLink && itm.isInLinkable /*&& itm.pins !== null*/ ) {
                     itm.refresh();

                     if (itm.pins !== null) {
                         getPinAreas(itm, pinAreas);
                         for (j = 0; j < pinAreas.length; j++) {
                             if (pinAreas[j].containsPoint(pt)) {
                                 pinDestination = j;
                                 ptPinDestination = pinAreas[j].centerPoint();
                                 that.hitArea = 'pin';
                                 _cursor = 'crosshair';
                                 return true;
                             }
                         }
                     }
                 }
             }
             return false;
         }

         function getHittedPinIndex(itm, pt) {
             var j, index;

             index = -1;
             if (itm.pins !== null) {
                 getPinAreas(itm, pinAreas);
                 for (j = 0; j < pinAreas.length; j++) {
                     if (pinAreas[j].containsPoint(pt)) {
                         index = j;
                         break;
                     }
                 }
             }
             return index;
         }

         // Get the array of node pin rectangles.
         function getPinAreas(node, pinAreas) {
             var rc, x, y, i, size;

             size = that.pinSize;
             pinAreas.splice(0, pinAreas.length);
             if (node.pins !== undefined && node.pins !== null) {
                 for (i = 0; i < node.pins.length; i++) {
                     rc = getNodeRect(node);
                     x = rc.left + (rc.width / 100) * node.pins[i][0];
                     y = rc.top + (rc.height / 100) * node.pins[i][1];
                     pinAreas.push(new MyRect(x - size / 2, y - size / 2, size, size));
                 }
             }
         }

         // Get the rectangular area of the central pin of a node
         function getCentralPinArea(node) {
             var rc, x, y, size;

             size = that.pinSize;
             rc = getNodeRect(node);
             x = rc.left + rc.width / 2;
             y = rc.top + rc.height / 2;
             return new MyRect(x - size / 2, y - size / 2, size, size);
         }

         // Get the minimal rectangle containing a node and its selection handles
         function getNodeRectWithHandles(_node) {
             var inc, rc;

             inc = _node.lineWidth + 5 * that.handleSize / 2;
             if (_node.isContextHandle) {
                 inc += that.contextHandleSize;
             }
             rc = getNodeRect(_node);
             rc = rc.inflate(inc, inc);
             return rc;
         }

         // Get the minimal rectangle containing a link and its selection handles
         function getLinkRectWithHandles(_link) {
             var rc, inc;

             inc = _link.lineWidth + that.handleSize;
             if (_link.isContextHandle) {
                 inc += that.contextHandleSize;
             }
             rc = getLinkRect(_link);
             rc = rc.inflate(inc, inc);
             return rc;
         }

         // Check if the mouse cursor is over a node or over one of its selection handles
         function checkNodeArea(_node, pt) {
             var j, _handles, rc;

             _handles = [];
             rc = getNodeRectWithHandles(_node);

             if (!rc.containsPoint(pt)) {
                 return;
             }

             if (that.canShowContextHandle && _node.isContextHandle && _isMouseDown) {
                 rc = getNodeContextHandle(_node);
                 if (rc !== null && rc.containsPoint(pt)) {
                     fireContextEvent(_node);
                     _isMouseDown = false;
                     return;
                 }
             }

             getNodeHandles(_node, _handles);
             for (j = 0; j < _handles.length; j++) {
                 if (_handles[j].containsPoint(pt)) {
                     that.hitArea = 'resizeHandle';
                     that._resizeHandle = j;
                     switch (that._resizeHandle) {
                         case ResizeHandleEnum.left:
                         case ResizeHandleEnum.right:
                             if (!that.canSizeNode || !_node.isXSizeable) {
                                 that.hitArea = 'outSide';
                                 _cursor = 'default';
                             } else {
                                 _cursor = 'e-resize';
                             }
                             break;
                         case ResizeHandleEnum.down:
                         case ResizeHandleEnum.up:
                             if (!that.canSizeNode || !_node.isYSizeable) {
                                 that.hitArea = 'outSide';
                                 _cursor = 'default';
                             } else {
                                 _cursor = 'n-resize';
                             }
                             break;
                         case ResizeHandleEnum.leftDown:
                         case ResizeHandleEnum.rightUp:
                         case ResizeHandleEnum.leftUp:
                         case ResizeHandleEnum.rightDown:
                             if (!that.canSizeNode) {
                                 that.hitArea = 'outSide';
                                 _cursor = 'default';
                             } else {
                                 if (!_node.isXSizeable && !_node.isYSizeable) {
                                     that.hitArea = 'outSide';
                                     _cursor = 'default';
                                 } else if (!_node.isXSizeable) {
                                     that.hitArea = 'upHandle';
                                     _cursor = 'n-resize';
                                 } else if (!_node.isYSizeable) {
                                     that.hitArea = 'leftHandle';
                                     _cursor = 'e-resize';
                                 } else {
                                     if (that._resizeHandle === ResizeHandleEnum.leftDown ||
                                         that._resizeHandle === ResizeHandleEnum.rightUp) {
                                         _cursor = 'ne-resize';
                                     } else {
                                         _cursor = 'se-resize';
                                     }
                                 }
                             }
                             break;
                         default:
                             break;
                     }
                     break;
                 }
             }
         }

         // Check if the mouse cursor is over a link or over one of its selection handles
         function checkLinkArea(_link, pt) {
             var j, k, point, nbHandles, rc, nbPt;

             if (_isStretchingLink || _link.points.length < 2) {
                 return;
             }

             rc = getLinkRectWithHandles(_link);
             if (!rc.containsPoint(pt)) {
                 return;
             }

             if (that.canShowContextHandle && _link.isContextHandle && _isMouseDown) {
                 rc = getLinkContextHandle(_link);
                 if (rc !== null && rc.containsPoint(pt)) {
                     fireContextEvent(_link);
                     _isMouseDown = false;
                     return;
                 }
             }

             nbPt = _link.points.length;

             if (isLinkNewPointsAllowed(_link)) {
                 // If it is possible to add points to this link
                 // (for instance a polyline link) ...
                 nbHandles = 2 * nbPt - 1;
                 for (j = 0; j < nbHandles; j++) {
                     if (j % 2 === 0) {
                         point = _link.points[j / 2];
                     } else {
                         k = Math.round(j / 2) - 1;
                         point = Helpers.middlePoint(_link.points[k], _link.points[k + 1]);
                     }
                     rc = new MyRect(point.x - that.handleSize / 2,
                         point.y - that.handleSize / 2,
                         that.handleSize,
                         that.handleSize);
                     if (rc.containsPoint(pt)) {
                         stretchedLink = _link;
                         that.hitArea = 'stretchHandle';
                         if (j === 0) {
                             // First handle clicked
                             // We can perhaps change the origin node of this link
                             if (that.canChangeOrg) {
                                 stretchType = StretchTypeEnum.first;
                                 _cursor = 'crosshair';
                             }
                         } else if (j === nbHandles - 1) {
                             // last handle clicked
                             // We can perhaps change the destination node of this link
                             if (that.canChangeDst) {
                                 stretchType = StretchTypeEnum.last;
                                 _cursor = 'crosshair';
                             }
                         } else {
                             // Other handle clicked
                             // We can perhaps stretch it.
                             if (that.canStretchLink && _link.isStretchable) {
                                 _cursor = 'crosshair';
                                 if (j % 2 !== 0) {
                                     // The stretching action may add a point
                                     stretchType = StretchTypeEnum.add;
                                 } else {
                                     // The stretching action may remove a point
                                     stretchType = StretchTypeEnum.del;
                                 }
                             } else {
                                 stretchType = StretchTypeEnum.none;
                             }
                         }
                         _handle = (j % 2 !== 0) ? Math.round(j / 2) - 1 : j / 2;
                         break;
                     }
                 }
             } else {
                 // If it is not possible to add points to this link 
                 // (for instance a bezier link) ...
                 nbHandles = nbPt;
                 for (j = 0; j < nbHandles; j++) {
                     point = _link.points[j];
                     rc = new MyRect(point.x - that.handleSize / 2,
                         point.y - that.handleSize / 2,
                         that.handleSize,
                         that.handleSize);
                     if (rc.containsPoint(pt)) {
                         that.hitArea = 'stretchHandle';
                         stretchedLink = _link;
                         if (j === 0) {
                             // First handle clicked
                             // We can perhaps change the origin node of this link
                             if (that.canChangeOrg) {
                                 stretchType = StretchTypeEnum.first;
                                 _cursor = 'crosshair';
                             }
                         } else if (j === nbPt - 1) {
                             // last handle clicked
                             // We can perhaps change the destination node of this link
                             if (that.canChangeDst) {
                                 stretchType = StretchTypeEnum.last;
                                 _cursor = 'crosshair';
                             }
                         } else {
                             // Other handle clicked
                             // We can perhaps stretch it.
                             if (that.canStretchLink && _link.isStretchable) {
                                 _cursor = 'crosshair';
                                 stretchType = StretchTypeEnum.change;
                             } else {
                                 stretchType = StretchTypeEnum.none;
                             }
                         }
                         _handle = j;
                         break;
                     }
                 }
             }
         }

         // Determines the item pointed by the mouse cursor
         function _getHitItem(pt, itemset) {
             var i, itm, candidate, widthMin, itemList;

             if (_isQuadtree) {
                 itemList = _quadtree._getItems(new MyRect(pt.x - 5, pt.y - 5, 10, 10));
             } else {
                 itemList = _items;
             }

             candidate = null;
             widthMin = linkDistance;

             for (i = 0; i < itemList.length; i++) {
                 itm = itemList[i];
                 switch (itemset) {
                     case itemsetEnum.items:
                         if (_isNode(itm)) {
                             if (hitNodeTest(itm, pt)) {
                                 candidate = itm;
                             }
                         } else if (_isLink(itm)) {
                             // If the link is one of the links of the candidate node,
                             // we ignore it. We want to be sure to select the node
                             // in this case.
                             if (candidate !== null &&
                                 _isNode(candidate) &&
                                 (itm.dst === candidate || itm.org === candidate)) {
                                 continue;
                             }
                             if (hitLinkTest(itm, pt)) {
                                 if (linkDistance <= that.linkSelectionAreaWidth) {
                                     widthMin = linkDistance;
                                     candidate = itm;
                                 }
                             }
                         }
                         break;

                     case itemsetEnum.nodes:
                         if (_isNode(itm)) {
                             if (hitNodeTest(itm, pt)) {
                                 candidate = itm;
                             }
                         }
                         break;

                     case itemsetEnum.links:
                         if (_isLink(itm)) {
                             if (hitLinkTest(itm, pt)) {
                                 if (linkDistance <= that.linkSelectionAreaWidth) {
                                     widthMin = linkDistance;
                                     candidate = itm;
                                 }
                             }
                         }
                         break;

                     case itemsetEnum.selectableItems:
                         if (itm.isSelectable) {
                             if (_isNode(itm)) {
                                 if (hitNodeTest(itm, pt)) {
                                     candidate = itm;
                                 }
                             } else if (_isLink(itm)) {
                                 // If the link is one of the links of the candidate node,
                                 // we ignore it. We want to be sure to select the node
                                 // in this case.
                                 if (candidate !== null &&
                                     _isNode(candidate) &&
                                     (itm.dst === candidate || itm.org === candidate)) {
                                     continue;
                                 }
                                 if (hitLinkTest(itm, pt)) {
                                     if (linkDistance <= that.linkSelectionAreaWidth) {
                                         widthMin = linkDistance;
                                         candidate = itm;
                                     }
                                 }
                             }
                         }
                         break;

                     case itemsetEnum.selectableNodes:
                         if (itm.isSelectable && _isNode(itm)) {
                             if (hitNodeTest(itm, pt)) {
                                 candidate = itm;
                             }
                         }
                         break;

                     case itemsetEnum.selectableLinks:
                         if (itm.isSelectable && _isLink(itm)) {
                             if (hitLinkTest(itm, pt)) {
                                 if (linkDistance <= that.linkSelectionAreaWidth) {
                                     widthMin = linkDistance;
                                     candidate = itm;
                                 }
                             }
                         }
                         break;
                 }
             }
             return candidate;
         }


         // Scroll and size helpers ------------------------------------------------------

         function _beginUpdate() {
             _repaint++;
         }

         function _endUpdate() {
             _repaint--;
             if (_repaint === 0) {
                 updateDiagramSize();

                 if (_isQuadtree) {
                     _buildQuadtree();
                 }

                 that.refresh();
             }
         }

         function updateScrollInfo() {
             if (that.isFixedSize) {
                 that.canvas.width = initialWidth;
                 that.canvas.height = initialHeight;
             } else {
                 that.canvas.width = graphRect.width * that.zoom + initialWidth;
                 that.canvas.height = graphRect.height * that.zoom + initialHeight;
             }
             invalidate(null);
         }

         function updateDiagramSize() {
             if (_repaint !== 0) {
                 return;
             }
             var rc = getGraphRect();
             if (!rc.equals(graphRect)) {
                 graphRect = rc;
                 updateScrollInfo();
             }
         }

         function updateDiagramSizeWithRect(rect) {
             if (_repaint !== 0) {
                 return;
             }
             var rc = graphRect.unionRect(rect);
             if (!rc.equals(graphRect)) {
                 graphRect = rc;
                 updateScrollInfo();
             }
         }

         function getGraphRect() {
             var i, itm, rc, rc2, first;

             rc = new MyRect(0, 0, 0, 0);
             first = true;

             for (i = 0; i < _items.length; i++) {
                 itm = _items[i];
                 if (that.isNode(itm)) {
                     rc2 = getNodeRect(itm);
                 } else {
                     rc2 = getLinkRect(itm);
                 }
                 if (first) {
                     rc = rc2;
                     first = false;
                 } else {
                     rc.boundingRect(rc2);
                 }
             }
             rc.width += rc.left;
             rc.height += rc.top;
             rc.left = 0;
             rc.top = 0;
             return rc;
         }

         function _zoomRectangle(rc) {
             var div, x, y, width, height, w, h;

             // Determine the new zoom factor.
             // It is an isotropic zoom (same x and y zoom factor)
             width = that.canvas.width;
             height = that.canvas.height;
             div = that.canvas.parentNode;
             if (div !== null && div !== undefined) {
                 w = parseInt(div.style.width, 10);
                 h = parseInt(div.style.height, 10);
                 if (!isNaN(w) && !isNaN(h)) {
                     width = w;
                     height = h;
                 }
             }
             x = width / rc.width;
             y = height / rc.height;
             that.zoom = (x > y) ? y : x;
             that.refresh();

             // Adjust Scrolling position
             if (div !== null && div !== undefined) {
                 div.scrollLeft = rc.left * that.zoom;
                 div.scrollTop = rc.top * that.zoom;
             }
         }


         // Other helpers ----------------------------------------------------------------

         // Determine if a node can be the destination of a link
         // Several properties may determine if a node can be the destination of a link:
         // the isInLinkable Link property and the canReflexLink and canMultiLink AddFlow
         // properties.
         function isNewDstAllowed(_link, newDst) {
             if (!newDst.isInLinkable) {
                 return false;
             }
             if (!that.canReflexLink && _link.org === newDst) {
                 return false;
             }
             if (!that.canMultiLink && isOriginOf(_link.org, newDst)) {
                 return false;
             }
             return true;
         }

         // Determine if a node can be the origin of a link
         // Several properties may determine if a node can be the origin of a link:
         // the isOutLinkable Link property and the canReflexLink and canMultiLink AddFlow
         // properties.
         function isNewOrgAllowed(_link, newOrg) {
             if (!newOrg.isOutLinkable) {
                 return false;
             }
             if (!that.canReflexLink && _link.dst === newOrg) {
                 return false;
             }
             if (!that.canMultiLink && isDestinationOf(_link.dst, newOrg)) {
                 return false;
             }
             return true;
         }

         // Capture the mouse
         function setMouseCapture() {
             if (that.canvas.setCapture) {
                 that.canvas.setCapture();
             } else {
                 if (window.addEventListener) {
                     // all browsers except IE before version 9
                     window.addEventListener("mousemove", that.canvas, true);
                 }
             }
         }

         // Release the mouse
         function releaseMouseCapture() {
             if (that.canvas.releaseCapture) {
                 that.canvas.releaseCapture();
             } else {
                 if (window.removeEventListener) {
                     // all browsers except IE before version 9
                     window.removeEventListener("mousemove", that.canvas, true);
                 }
             }
         }

         // See http://javascript.about.com/library/blmousepos.htm
         // See http://www.html5canvastutorials.com/advanced/html5-canvas-mouse-coordinates/
         function getPosition(e) {
             var x, y, rect;

             rect = canvas.getBoundingClientRect();
             x = e.clientX - rect.left;
             y = e.clientY - rect.top;

             // Add custom value to take account of specific environments.
             // By default, those values are zero.
             x += that.xCustomOffset;
             y += that.yCustomOffset;

             return {
                 'x': x,
                 'y': y
             };
         }

         function readyHandler(e) {
             that.refresh();
         }

         // Fired when a touch is initiated (iPad/iPhone support).
         // See http://tenderlovingcode.com/blog/web-apps/html5-canvas-drawing-on-ipad/
         function touchStartHandler(e) {
             e.preventDefault();
             mouseDownHandler(e);
         }

         // Fired while touching and moving is in progress (iPad/iPhone support).
         function touchMoveHandler(e) {
             e.preventDefault();
             mouseMoveHandler(e);
         }

         // Fired when touch ends (iPad/iPhone suport).
         function touchEndHandler(e) {
             mouseUpHandler(e);
         }

         function mouseDownHandler(e) {
             var clickEvent, clickedItem, pt, ClickZoneEnum, mult,
                 mayMoveNode, mayCreateNode, maySelect, mayZoom, mayPan;

             pt = getPosition(e);
             ClickZoneEnum = {
                 out: 0,
                 outShift: 1,
                 node: 2,
                 selNode: 3,
                 nodeShift: 4,
                 selNodeShift: 5,
                 link: 6,
                 selLink: 7,
                 linkShift: 8,
                 selLinkShift: 9
             };
             mult = that.canMultiSelect && (e.shiftKey || e.ctrlKey);
             mayMoveNode = false;
             mayCreateNode = false;
             maySelect = false;
             mayZoom = false;
             mayPan = false;

             pt.x = pt.x / that.zoom;
             pt.y = pt.y / that.zoom;
             _isMouseDown = true;
             startMove = true;
             okToStartStretch = false;
             okToStartMove = false;
             okToStartNode = false;
             okToStartResize = false;
             okToStartLink = false;
             okToStartSelect = false;
             okToStartZoom = false;
             okToStartPan = false;
             ptStart = pt;
             ptOrg = ptPrior = pt;
             tmpRect = new MyRect(ptOrg.x, ptOrg.y, 0, 0);

             // Where is the mouse ?
             checkArea(pt);

             // If a handle or a pin has been clicked, return
             if (that.hitArea === 'stretchHandle') {
                 okToStartStretch = true;
                 return;
             } else if (that.hitArea === 'resizeHandle') {
                 if (that.gridSnap) {
                     ptPrior = Helpers.adjustGrid(pt, that.gridSizeX, that.gridSizeY);
                 }
                 okToStartResize = true;
                 return;
             } else if (that.hitArea === 'pin' || that.hitArea === 'centralPin') {
                 okToStartLink = true;
                 outOrg = false;
                 origin = pinnedItem;
                 ptPrior = ptPinOrigin;
                 ptOrg = ptPinOrigin;
                 return;
             }

             // Get click event type
             clickedItem = hittedItem;
             if (clickedItem !== null && clickedItem.isSelectable) {
                 if (_isLink(clickedItem)) {
                     if (clickedItem.getIsSelected()) {
                         clickEvent = mult ?
                             ClickZoneEnum.selLinkShift : ClickZoneEnum.selLink;
                     } else {
                         clickEvent = mult ?
                             ClickZoneEnum.linkShift : ClickZoneEnum.link;
                     }
                 } else if (_isNode(clickedItem)) {
                     if (clickedItem.getIsSelected()) {
                         clickEvent = mult ?
                             ClickZoneEnum.selNodeShift : ClickZoneEnum.selNode;
                     } else {
                         clickEvent = mult ?
                             ClickZoneEnum.nodeShift : ClickZoneEnum.node;
                     }
                 }
             } else {
                 clickEvent = mult ? ClickZoneEnum.outShift : ClickZoneEnum.out;
             }

             // Action to do for each event
             switch (clickEvent) {
                 case ClickZoneEnum.out:
                     _unselectAll();
                     if (that.mouseSelection === 'none') {
                         if (that.canDrawNode) {
                             mayCreateNode = true;
                         }
                     } else if (that.mouseSelection === 'zoom') {
                         mayZoom = true;
                     } else if (that.mouseSelection === 'pan') {
                         mayPan = true;
                     } else if (that.mouseSelection !== 'none' && that.mouseSelection !== 'zoom') {
                         maySelect = true;
                     }
                     break;
                 case ClickZoneEnum.link:
                     _unselectAll();
                     if (clickedItem !== null) {
                         clickedItem.setIsSelected(true);
                     }
                     break;
                 case ClickZoneEnum.node:
                     _unselectAll();
                     if (clickedItem !== null) {
                         clickedItem.setIsSelected(true);
                     }
                     if (clickedItem !== null) {
                         if (that.canMoveNode &&
                             (clickedItem.isXMoveable || clickedItem.isYMoveable)) {
                             mayMoveNode = true;
                         }
                     }
                     break;
                 case ClickZoneEnum.selNode:
                     if (clickedItem !== null) {
                         if (that.canMoveNode &&
                             (clickedItem.isXMoveable || clickedItem.isYMoveable)) {
                             mayMoveNode = true;
                         }
                     }
                     break;
                 case ClickZoneEnum.selLink:
                     if (that.canMoveNode) {
                         mayMoveNode = true;
                     }
                     break;
                 case ClickZoneEnum.selNodeShift:
                 case ClickZoneEnum.nodeShift:
                 case ClickZoneEnum.selLinkShift:
                 case ClickZoneEnum.linkShift:
                     if (clickedItem !== null) {
                         clickedItem.setIsSelected(!clickedItem.getIsSelected());
                     }
                     break;
                 default:
                     break;
             }

             // Init actions
             if (mayMoveNode) {
                 okToStartMove = true;
                 if (that.gridSnap) {
                     ptPrior = Helpers.adjustGrid(ptPrior, that.gridSizeX, that.gridSizeY);
                 }
             } else if (mayCreateNode) {
                 okToStartNode = true;
                 if (that.gridSnap) {
                     ptPrior = Helpers.adjustGrid(ptPrior, that.gridSizeX, that.gridSizeY);
                 }
                 ptOrg = ptPrior;
             } else if (maySelect) {
                 okToStartSelect = true;
             } else if (mayZoom) {
                 okToStartZoom = true;
             } else if (mayPan) {
                 okToStartPan = true;
             }

             updateDrawing();
         }

         function mouseMoveHandler(e) {
             var pt, parent, isParentDiv;

             pt = getPosition(e);

             parent = that.canvas.parentNode;
             if (parent !== null) {
                 ptScroll = {
                     x: pt.x - parent.scrollLeft,
                     y: pt.y - parent.scrollTop
                 };
             }

             pt.x = pt.x / that.zoom;
             pt.y = pt.y / that.zoom;

             // If the mouse move is too small, we ignore it
             if (startMove) {
                 if (Math.abs(pt.x - ptStart.x) < moveStartDist &&
                     Math.abs(pt.y - ptStart.y) < moveStartDist) {
                     return;
                 }
                 startMove = false;
             }

             // Check area under mouse (down or up). Don't take account of grid here.
             checkArea(pt);

             // Set the cursor
             that.canvas.style.cursor = _cursor;

             if (_isMouseDown) {
                 if (okToStartNode) {
                     if (!doAutoScrolling(autoNode, parent)) {
                         doNode(pt);
                     }
                 } else if (okToStartLink) {
                     if (!doAutoScrolling(autoLink, parent)) {
                         doLink(pt);
                     }
                 } else if (okToStartMove) {
                     if (!doAutoScrolling(autoMove, parent)) {
                         doMove(pt);
                     }
                 } else if (okToStartResize) {
                     if (!doAutoScrolling(autoSize, parent)) {
                         doResize(pt);
                     }
                 } else if (okToStartStretch) {
                     if (!doAutoScrolling(autoStretch, parent)) {
                         doStretch(pt);
                     }
                 } else if (okToStartSelect) {
                     if (!doAutoScrolling(autoSelect, parent)) {
                         doSelect(pt);
                     }
                 } else if (okToStartZoom) {
                     if (!doAutoScrolling(autoZoom, parent)) {
                         doZoom(pt);
                     }
                 } else if (okToStartPan) {
                     doPan(pt);
                 }
             }
         }

         function mouseUpHandler(e) {
             releaseMouseCapture();

             if (_isMouseDown) {
                 _isMouseDown = false;

                 if (_isCreatingNode) {
                     _isCreatingNode = false;
                     endNode();
                 } else if (_isCreatingLink) {
                     _isCreatingLink = false;
                     endLink();
                 } else if (_isMovingNode) {
                     _isMovingNode = false;
                     endMove();
                 } else if (_isResizingNode) {
                     _isResizingNode = false;
                     endResize();
                 } else if (_isStretchingLink) {
                     _isStretchingLink = false;
                     endStretch();
                 } else if (_isSelecting) {
                     _isSelecting = false;
                     endSelect();
                 } else if (_isZooming) {
                     _isZooming = false;
                     endZoom();
                 } else if (_isPanning) {
                     _isPanning = false;
                     endPan();
                 }
             }
         }

         function doAutoScrolling(autoJob, div) {
             var xScroll, yScroll, rc, w, h;

             if (div === null || div === undefined) {
                 return false;
             }
             w = parseInt(div.style.width, 10);
             h = parseInt(div.style.height, 10);
             if (isNaN(w) || isNaN(h)) {
                 return false;
             }

             xScroll = div.scrollLeft;
             yScroll = div.scrollTop;
             rc = new MyRect(0, 0, w, h);
             rc.width -= 20;
             rc.height -= 20;
             if (!rc.containsPoint(ptScroll)) {
                 if (that.canDragScroll) {
                     xScrollDir = 'none';
                     yScrollDir = 'none';
                     if (ptScroll.x > rc.left + rc.width) {
                         xScrollDir = 'right';
                     } else if (ptScroll.x < rc.left && xScroll > 0) {
                         xScrollDir = 'left';
                     }
                     if (ptScroll.y > rc.top + rc.height) {
                         yScrollDir = 'bottom';
                     } else if (ptScroll.y < rc.top && yScroll > 0) {
                         yScrollDir = 'top';
                     }

                     if (xScrollDir !== 'none' || yScrollDir !== 'none') {
                         if (!timerStarted) {
                             timer = setInterval(autoJob, millisec);
                             timerStarted = true;
                         }
                     }
                 }
                 return true;
             }

             // Here, the mouse is again in the client area so the timer can be killed.
             if (timer !== null) {
                 clearInterval(timer);
             }
             timerStarted = false;
             return false;
         }

         function autoMove() {
             doMove(autoScroll());
         }

         function autoSize() {
             doResize(autoScroll());
         }

         function autoStretch() {
             doStretch(autoScroll());
         }

         function autoNode() {
             doNode(autoScroll());
         }

         function autoLink() {
             doLink(autoScroll());
         }

         function autoSelect() {
             doSelect(autoScroll());
         }

         function autoZoom() {
             doZoom(autoScroll());
         }

         function autoScroll() {
             var dxScroll, dyScroll, div, xScroll, yScroll;

             if (!_isMouseDown) {
                 if (timer !== null) {
                     clearInterval(timer);
                 }
                 timerStarted = false;
             }

             dxScroll = 0;
             dyScroll = 0;
             if (xScrollDir !== 'none') {
                 dxScroll = (xScrollDir === 'right') ? xScrollUnit : -xScrollUnit;
             }
             if (yScrollDir !== 'none') {
                 dyScroll = (yScrollDir === 'bottom') ? yScrollUnit : -yScrollUnit;
             }

             div = that.canvas.parentNode;
             if (div !== null && div !== undefined) {
                 xScroll = div.scrollLeft;
                 yScroll = div.scrollTop;
                 div.scrollLeft = xScroll + dxScroll;
                 div.scrollTop = yScroll + dyScroll;
                 return {
                     x: div.scrollLeft + ptScroll.x,
                     y: div.scrollTop + ptScroll.y
                 };
             }
             return {
                 x: 0,
                 y: 0
             };
         }


         // Node creation-----------------------------------------------------------------

         function beginNode() {
             _isCreatingNode = true;
             setMouseCapture();
         }

         function doNode(pt) {
             var rc, inc;

             if (that.gridSnap) {
                 pt = Helpers.adjustGrid(pt, that.gridSizeX, that.gridSizeY);
             }

             if (!_isCreatingNode) {
                 beginNode();
             }

             inc = that.nodeModel.lineWidth + that.handleSize;

             rc = Helpers.getRectByTwoPoints(ptOrg, ptPrior);
             rc = rc.inflate(inc, inc);
             invalidate(rc);

             rc = Helpers.getRectByTwoPoints(ptOrg, pt);
             rc = rc.inflate(inc, inc);
             invalidate(rc);

             updateDrawing();
             ptPrior = pt;
         }

         function endNode() {
             var rc, rc2, inc, _node;

             rc = Helpers.getRectByTwoPoints(ptOrg, ptPrior);
             inc = that.nodeModel.lineWidth + that.handleSize;
             rc2 = rc.inflate(inc, inc);
             invalidate(rc2);
             updateDrawing();

             if (!that.canDrawNode) {
                 return;
             }

             // We refuse too small nodes
             if (rc.width > minNodeSize && rc.height > minNodeSize) {
                 // Create the node
                 _node = _addNode(rc.left, rc.top, rc.width, rc.height);
                 if (_node !== null && _node.isSelectable) {
                     // Update selection
                     _unselectAll();
                     _node.setIsSelected(true);
                 }
             }
         }


         // Link Creation-----------------------------------------------------------------

         function beginLink() {
             _isCreatingLink = true;
             setMouseCapture();
         }

         function doLink(pt) {
             var rc, inc;

             if (!_isCreatingLink) {
                 beginLink();
             }

             // Detect if the mouse has left the node area.
             // (this is necessary when creating reflexive links: the mouse
             // must leave the node then return to this node)
             if (!outOrg) {
                 if (hittedItem === null || !_isNode(hittedItem)) {
                     outOrg = true;
                 }
             }

             inc = 2 * that.linkModel.lineWidth;

             rc = Helpers.getRectByTwoPoints(ptOrg, ptPrior);
             rc = rc.inflate(inc, inc);
             invalidate(rc);

             rc = Helpers.getRectByTwoPoints(ptOrg, pt);
             rc = rc.inflate(inc, inc);
             invalidate(rc);

             ptPrior = pt;

             updateDrawing();
         }

         function endLink() {
             var rc, pinOrg, pinDst, destination, _link, lineStyle, inc;

             inc = 2 * that.linkModel.lineWidth;
             rc = Helpers.getRectByTwoPoints(ptOrg, ptPrior);
             rc = rc.inflate(inc, inc);
             invalidate(rc);
             updateDrawing();

             if (!that.canDrawLink) {
                 return;
             }

             pinOrg = pinOrigin;
             pinDst = pinDestination;
             pinOrigin = null;
             pinDestination = null;

             // Memorize destination node
             destination = pinnedItem !== null ?
                 pinnedItem : _getHitItem(ptPrior, itemsetEnum.nodes);

             if (destination === null || origin === null) {
                 return;
             }
             if (!destination.isInLinkable) {
                 return;
             }
             if (origin === destination) {
                 if (!that.canReflexLink) {
                     return;
                 }
                 if (!outOrg) {
                     return;
                 }
             }
             if (!that.canMultiLink && isOriginOf(origin, destination)) {
                 return;
             }
             if (origin.pins !== null && pinOrg === null) {
                 return;
             }
             if (destination.pins !== null && pinDst === null) {
                 return;
             }

             // Create the link and select it
             lineStyle = that.linkModel.getLineStyle();
             _link = _addLink(origin, destination, '', pinOrg, pinDst);
             if (_link !== null && _link.isSelectable) {
                 // Update selection
                 _unselectAll();
                 _link.setIsSelected(true);
             }
         }


         // Node moving-------------------------------------------------------------------

         function beginMove() {
             var i, j, _link, itm, _links;

             _isMovingNode = true;
             setMouseCapture();

             // Calculate selection rectangle
             selRect = getSelRect();

             for (i = 0; i < _selectedItems.length; i++) {
                 itm = _selectedItems[i];
                 if (_isNode(itm)) {
                     if (_taskManager.undoAllowed()) {
                         itm.tsk = new NodeLayoutTask(that, itm, getNodeRect(itm));
                     }
                     _links = itm.getLinks();
                     for (j = 0; j < _links.length; j++) {
                         _links[j].flag = true;
                     }
                 }
             }

             for (i = 0; i < _selectedItems.length; i++) {
                 itm = _selectedItems[i];
                 if (_isNode(itm)) {
                     _links = itm.getLinks();
                     for (j = 0; j < _links.length; j++) {
                         _link = _links[j];
                         //if (_link.org.isSelected && _link.dst.isSelected)
                         //    _link.drag = true;
                         if (_link.flag) {
                             _link.tsk = new StretchLinkTask(that, _link);
                             _link.flag = false;
                         }
                     }
                 }
             }
         }

         function doMove(pt) {
             var i, itm, xMove, yMove;

             if (that.gridSnap) {
                 pt = Helpers.adjustGrid(pt, that.gridSizeX, that.gridSizeY);
             }

             if (!_isMovingNode) {
                 beginMove();
             }

             _taskManager.skipUndo = true;

             xMove = pt.x - ptPrior.x;
             yMove = pt.y - ptPrior.y;
             ptPrior = pt;

             if (selRect.left + xMove < 0) {
                 xMove -= selRect.left + xMove;
             }
             if (selRect.top + yMove < 0) {
                 yMove -= selRect.top + yMove;
             }

             if (xMove !== 0 || yMove !== 0) {
                 resetFlagOfLinks();

                 for (i = 0; i < _selectedItems.length; i++) {
                     itm = _selectedItems[i];
                     if (_isNode(itm)) {
                         moveNode(itm, xMove, yMove);
                     }
                 }

                 // Calculate selection rectangle
                 selRect = getSelRect();
             }

             updateDiagramSize();
             updateDrawing();

             _taskManager.skipUndo = false;
         }

         function moveNode(_node, xMove, yMove) {
             var pt, j, k, _link, n, _links, xMove2, yMove2;

             xMove2 = _node.isXMoveable ? xMove : 0;
             yMove2 = _node.isYMoveable ? yMove : 0;
             if (xMove2 === 0 && yMove2 === 0) {
                 return;
             }
             if (_isQuadtree) {
                 _quadtree._remove(_node);
             }

             _links = getNodeLinks(_node);
             for (j = 0; j < _links.length; j++) {
                 _link = _links[j];
                 n = _link.points.length; // number of points
                 invalidateLink(_link);
                 if (_link.org.getIsSelected() && _link.dst.getIsSelected()) {
                     // If the origin and destination nodes are moved ...
                     if (_link.flag) {
                         // If the link has not still been moved, indicates it is the 
                         // case now (to avoid moving it two times, one with its origin
                         // node and one with its destination node)
                         _link.flag = false;
                         for (k = 0; k < n; k++) {
                             // Translate each point
                             pt = _link.points[k];
                             _link.points[k] = {
                                 x: pt.x + xMove2,
                                 y: pt.y + yMove2
                             };
                         }
                     }
                 } else {
                     // If there is a pin or if the first (last) point can be changed, 
                     // translate the corresponding link point.
                     if (_node === _link.dst) {
                         if (_link.dst.pins !== null || _link.isDstPointAdjustable) {
                             pt = _link.points[n - 1];
                             _link.points[n - 1] = {
                                 x: pt.x + xMove2,
                                 y: pt.y + yMove2
                             };
                         }
                     }
                     if (_node === _link.org) {
                         if (_link.org.pins !== null || _link.isOrgPointAdjustable) {
                             pt = _link.points[0];
                             _link.points[0] = {
                                 x: pt.x + xMove2,
                                 y: pt.y + yMove2
                             };
                         }
                     }
                 }
                 invalidateLink(_link);
                 _link.refresh();
             }
             invalidateNode(_node);
             _node.x += xMove2;
             _node.y += yMove2;
             _node.bounds = getNodeRect(_node);
             if (_isQuadtree) {
                 _quadtree._insert(_node, _node.bounds);
             }
             _node.refresh();
             adjustNodeLinks(_node);
         }

         function getSelRect() {
             var rc, rc2, i, j, itm, _links, _link;

             for (i = 0; i < _selectedItems.length; i++) {
                 itm = _selectedItems[i];
                 if (that.isNode(itm)) {
                     rc2 = getNodeRect(itm);
                 } else {
                     rc2 = getLinkRect(itm);
                 }
                 if (i === 0) {
                     rc = rc2;
                 } else {
                     rc.boundingRect(rc2);
                 }
                 if (_isNode(itm)) {
                     _links = itm.getLinks();
                     for (j = 0; j < _links.length; j++) {
                         _link = _links[j];
                         if (_link.org.getIsSelected() && _link.dst.getIsSelected()) {
                             rc.boundingRect(getLinkRect(_link));
                         }
                     }
                 } else if (_isLink(itm)) {
                     if (i === 0 && (itm.org.getIsSelected() && itm.dst.getIsSelected())) {
                         rc = getLinkRect(itm);
                     }
                 }
             }
             return rc;
         }

         function resetFlagOfLinks() {
             var i, j, _links, itm;

             for (i = 0; i < _selectedItems.length; i++) {
                 itm = _selectedItems[i];
                 if (_isNode(itm)) {
                     _links = itm.getLinks();
                     for (j = 0; j < _links.length; j++) {
                         // This flag will be used to avoid moving a link two times
                         _links[j].flag = true;
                     }
                 }
             }
         }

         function endMove() {
             var itm, _link, _links, i, j;

             if (_taskManager.undoAllowed()) {
                 // Store the action in the undo list
                 _taskManager._beginActionInternal('AF_moveSelectedNodes');

                 resetFlagOfLinks();

                 for (i = 0; i < _selectedItems.length; i++) {
                     itm = _selectedItems[i];
                     if (_isNode(itm)) {
                         _taskManager._submitTask(itm.tsk);
                         itm.tsk = null;
                         _links = itm.getLinks();
                         for (j = 0; j < _links.length; j++) {
                             _link = _links[j];
                             invalidateLink(_link);
                             if (_link.flag !== undefined) {
                                 if (_link.flag) {
                                     _link.flag = false;
                                     if (_link.tsk !== null) {
                                         _taskManager._submitTask(_link.tsk);
                                         _link.tsk = null;
                                     }
                                 }
                                 // Remove this temporary property
                                 delete _link["flag"];
                             }
                         }
                     }
                 }

                 _taskManager._endActionInternal();
             }
         }


         // Node resizing-----------------------------------------------------------------

         function beginResize() {
             var i, j, itm, _links;

             _isResizingNode = true;
             setMouseCapture();

             for (i = 0; i < _selectedItems.length; i++) {
                 itm = _selectedItems[i];
                 if (_isNode(itm)) {
                     if (_taskManager.undoAllowed()) {
                         itm.tsk = new NodeLayoutTask(that, itm, getNodeRect(itm));
                     }
                     _links = itm.getLinks();
                     for (j = 0; j < _links.length; j++) {
                         _links[j].flag = true;
                     }
                 }
             }
         }

         function doResize(pt) {
             var i, itm, deltaX, deltaY, rc, x, y;

             if (that.gridSnap) {
                 pt = Helpers.adjustGrid(pt, that.gridSizeX, that.gridSizeY);
             }

             if (!_isResizingNode) {
                 beginResize();
             }

             _taskManager.skipUndo = true;

             deltaX = pt.x - ptPrior.x;
             deltaY = pt.y - ptPrior.y;

             for (i = 0; i < _selectedItems.length; i++) {
                 itm = _selectedItems[i];
                 if (_isNode(itm)) {
                     if (_isQuadtree) {
                         _quadtree._remove(itm);
                     }
                     rc = getNodeRect(itm);
                     x = rc.left;
                     y = rc.top;
                     var dx = (x + deltaX < 0) ? 0 : deltaX;
                     var dy = (y + deltaY < 0) ? 0 : deltaY;

                     // Change the size by the amount the user drags the mouse
                     switch (that._resizeHandle) {
                         case ResizeHandleEnum.leftUp:
                             rc.width = Math.max(rc.width - dx, that.handleSize);
                             rc.height = Math.max(rc.height - dy, that.handleSize);
                             rc.left = x + dx;
                             rc.top = y + dy;
                             break;
                         case ResizeHandleEnum.up:
                             rc.height = Math.max(rc.height - dy, that.handleSize);
                             rc.top = y + dy;
                             break;
                         case ResizeHandleEnum.rightUp:
                             rc.width = Math.max(rc.width + dx, that.handleSize);
                             rc.height = Math.max(rc.height - dy, that.handleSize);
                             rc.top = y + dy;
                             break;
                         case ResizeHandleEnum.left:
                             rc.width = Math.max(rc.width - dx, that.handleSize);
                             rc.left = x + dx;
                             break;
                         case ResizeHandleEnum.right:
                             rc.width = Math.max(rc.width + dx, that.handleSize);
                             break;
                         case ResizeHandleEnum.leftDown:
                             rc.width = Math.max(rc.width - dx, that.handleSize);
                             rc.height = Math.max(dy + rc.height, that.handleSize);
                             rc.left = x + dx;
                             break;
                         case ResizeHandleEnum.down:
                             rc.height = Math.max(rc.height + dy, that.handleSize);
                             break;
                         case ResizeHandleEnum.rightDown:
                             rc.width = Math.max(rc.width + dx, that.handleSize);
                             rc.height = Math.max(dy + rc.height, that.handleSize);
                             break;
                     }
                     setNodeRect(itm, rc);
                     itm.bounds = rc;
                     if (_isQuadtree) {
                         _quadtree._insert(itm, itm.bounds);
                     }

                     itm.refresh();
                     manageLinksOfResizingNode(itm, rc);
                 }
             }
             _taskManager.skipUndo = false;

             updateDiagramSize();
             updateDrawing();
             ptPrior = pt;
         }

         function manageLinksOfResizingNode(itm, rc) {
             var X, Y, j, _links, _link, nbPt;

             _links = itm.getLinks();
             for (j = 0; j < _links.length; j++) {
                 _link = _links[j];
                 if (!_link.flag) {
                     if (itm === _link.dst) {
                         if (_link.dst.pins !== null) {
                             nbPt = _link.points.length;
                             X = (rc.width === 0) ?
                                 0 :
                                 ((_link.points[nbPt - 1].x - rc.left) * rc.width) / rc.width;
                             Y = (rc.height === 0) ?
                                 0 :
                                 (_link.points[nbPt - 1].y - rc.top) * rc.height / rc.height;
                             _link.points[nbPt - 1] = {
                                 x: rc.left + X,
                                 y: rc.top + Y
                             };
                         }
                     }

                     if (itm === _link.org) {
                         if (_link.org.pins !== null) {
                             X = (rc.width === 0) ?
                                 0 :
                                 (_link.points[0].x - rc.left) * rc.width / rc.width;
                             Y = (rc.height === 0) ?
                                 0 :
                                 (_link.points[0].y - rc.top) * rc.height / rc.height;
                             _link.points[0] = {
                                 x: rc.left + X,
                                 y: rc.top + Y
                             };
                         }
                     }
                 }
                 if (isLinkReflexive(_link)) {
                     _link.flag = !_link.flag;
                 }
             }
             updateFirstAndLastPointsOfLinks(itm);
         }

         function updateFirstAndLastPointsOfLinks(_node) {
             var j, n, _link, _links;

             if (_node.pins !== null) {
                 _links = _node.getLinks();
                 for (j = 0; j < _links.length; j++) {
                     _link = _links[j];
                     if (_link.org === _node && _link.pinOrg !== null) {
                         _link.points[0] = getPinPosition(_node, _link.pinOrg);
                     } else if (_link.dst === _node && _link.pinDst !== null) {
                         n = _link.points.length;
                         _link.points[n - 1] = getPinPosition(_node, _link.pinDst);
                     }
                 }
             }
         }

         function endResize() {
             var i, j, itm, _link, _links;

             if (_taskManager.undoAllowed()) {
                 // Store the action in the undo list
                 _taskManager._beginActionInternal('AF_resizeSelectedNodes');
                 for (i = 0; i < _selectedItems.length; i++) {
                     itm = _selectedItems[i];
                     if (_isNode(itm)) {
                         _taskManager._submitTask(itm.tsk);
                     }
                 }
                 _taskManager._endActionInternal();
             }

             for (i = 0; i < _selectedItems.length; i++) {
                 itm = _selectedItems[i];
                 if (_isNode(itm)) {
                     _links = itm.getLinks();
                     for (j = 0; j < _links.length; j++) {
                         _link = _links[j];
                         invalidateLink(_link);
                         if (_link.flag !== undefined) {
                             // Remove this temporary property
                             delete _link["flag"];
                         }
                     }
                 }
             }

             updateDrawing();
         }


         // Link stretching---------------------------------------------------------------

         function beginStretch(_link) {
             var pt2;

             _isStretchingLink = true;
             setMouseCapture();

             if (_taskManager.undoAllowed()) {
                 _link.tsk = new StretchLinkTask(that, _link);
             }

             if (_link.getLineStyle() === 'database') {
                 // Save the old points
                 saveLinkPoints(_link);
             } else {
                 // Save the old points
                 saveLinkPoints(_link);

                 if (stretchType === StretchTypeEnum.add) {
                     // If streching adds a point to the link, we add a point
                     // in the link collection of points.
                     pt2 = Helpers.middlePoint(_link.points[_handle],
                         _link.points[_handle + 1]);
                     insertLinkPoint(_link, pt2, _handle);
                     _handle++;
                 }
             }
         }

         function doStretch(pt) {
             if (stretchedLink === null) {
                 return;
             }

             if (!_isStretchingLink) {
                 beginStretch(stretchedLink);
             }

             if (pt.x < 0) {
                 pt.x = 0;
             }
             if (pt.y < 0) {
                 pt.y = 0;
             }
             if (_isQuadtree) {
                 _quadtree._remove(stretchedLink);
             }
             invalidateLink(stretchedLink);
             if (stretchedLink.getLineStyle() === 'database') {
                 stretchDatabase(pt, stretchedLink);
             } else if (stretchedLink.getLineStyle() === 'orthogonal') {
                 stretchOrthogonal(pt, stretchedLink);
             } else {
                 stretchPoly(pt, stretchedLink);
             }
             invalidateLink(stretchedLink);
             stretchedLink.bounds = getLinkRect(stretchedLink);
             if (_isQuadtree) {
                 _quadtree._insert(stretchedLink, stretchedLink.bounds);
             }
             ptPrior = pt;
             updateDiagramSize();
             updateDrawing();
         }

         function endStretch() {
             var _link, pt, dist, org, dst;

             _link = stretchedLink;
             stretchedLink = null;

             _handle = Math.max(Math.min(_handle, _link.points.length - 1), 0);
             pt = _link.points[_handle];

             // Remove new Point if too near of the segment
             if (isLinkNewPointsAllowed(_link) && (stretchType === StretchTypeEnum.add ||
                     stretchType === StretchTypeEnum.del)) {
                 if (_handle > 0 && _handle < _link.points.length - 1) {
                     dist = Helpers.getSegDist(_link.points[_handle - 1],
                         _link.points[_handle + 1], _link.points[_handle]);
                     if (dist <= that.removePointDistance) {
                         invalidateLink(_link);
                         _link.removePoint(_handle);
                         invalidateLink(_link);
                         stretchType = StretchTypeEnum.none;
                         updateDrawing();
                         return;
                     }
                 }
             }

             invalidateLink(_link);
             if (_link.getLineStyle() === 'database') {
                 fixDatabaseLinkPoints(_link);
             } else if (_link.getLineStyle() === 'orthogonal') {
                 fixOrthogonalLinkPoints(_link);
             }
             if (_link.org.pins === null && !_link.isOrgPointAdjustable) {
                 calcLinkStartPoint(_link);
             }
             if (_link.dst.pins === null && !_link.isDstPointAdjustable) {
                 calcLinkEndPoint(_link);
             }
             invalidateLink(_link);
             updateDrawing();

             if (stretchType === StretchTypeEnum.first && that.canChangeOrg) {
                 org = _getHitItem(pt, itemsetEnum.nodes);
                 if (org === null) {
                     _link.tsk.undo();
                     return;
                 } else {
                     if (org !== _link.org) {
                         if (!isNewOrgAllowed(_link, org)) {
                             _link.tsk.undo();
                             return;
                         }

                         if (_taskManager.undoAllowed) {
                             _taskManager._beginActionInternal('AF_linkStretch');
                         }
                         if (_taskManager.undoAllowed()) {
                             _taskManager._submitTask(_link.tsk);
                         }
                         setLinkPinOrg(_link, getHittedPinIndex(org, pt));
                         _link.setOrg(org);
                         updateDrawing();
                         if (_taskManager.undoAllowed) {
                             _taskManager._endActionInternal();
                         }
                         return;
                     }
                 }
             }

             if (stretchType === StretchTypeEnum.last && that.canChangeDst) {
                 dst = _getHitItem(pt, itemsetEnum.nodes);
                 if (dst === null) {
                     _link.tsk.undo();
                     return;
                 } else {
                     if (dst !== _link.dst) {
                         if (!isNewDstAllowed(_link, dst)) {
                             _link.tsk.undo();
                             return;
                         }

                         if (_taskManager.undoAllowed) {
                             _taskManager._beginActionInternal('AF_linkStretch');
                         }
                         if (_taskManager.undoAllowed()) {
                             _taskManager._submitTask(_link.tsk);
                         }
                         setLinkPinDst(_link, getHittedPinIndex(dst, pt));
                         _link.setDst(dst);
                         updateDrawing();
                         if (_taskManager.undoAllowed) {
                             _taskManager._endActionInternal();
                         }
                         return;
                     }
                 }
             }

             // we submit the task only if is a true stretching, not just a change
             // of the origin or the destination node.
             if (_taskManager.undoAllowed()) {
                 _taskManager._submitTask(_link.tsk);
             }
         }

         function stretchPoly(pt, _link) {
             if (_handle >= 0 && _handle <= _link.points.length - 1) {
                 _link.points[_handle] = pt;
             }
             if (_link.org.pins === null && !_link.isOrgPointAdjustable &&
                 stretchType !== StretchTypeEnum.first) {
                 calcLinkStartPoint(_link);
             }
             if (_link.dst.pins === null && !_link.isDstPointAdjustable &&
                 stretchType !== StretchTypeEnum.last) {
                 calcLinkEndPoint(_link);
             }
         }

         function stretchDatabase(pt, _link) {
             var d1, d2;

             switch (_handle) {
                 case 0:
                     d1 = _link.points[1].x - _link.points[0].x;
                     _link.points[0] = pt;
                     _link.points[1] = {
                         x: _link.points[0].x + d1,
                         y: pt.y
                     };
                     break;
                 case 1:
                     _link.points[1] = {
                         x: pt.x,
                         y: _link.points[1].y
                     };
                     break;
                 case 2:
                     _link.points[2] = {
                         x: pt.x,
                         y: _link.points[2].y
                     };
                     break;
                 case 3:
                     d2 = _link.points[2].x - _link.points[3].x;
                     _link.points[3] = pt;
                     _link.points[2] = {
                         x: _link.points[3].x + d2,
                         y: pt.y
                     };
                     break;
             }
         }

         function stretchOrthogonal(pt, _link) {
             var n, firstSegmentVertical, lastSegmentVertical;

             n = _link.points.length;

             if (n === 3) {
                 if (_handle === 0) {
                     if (!_link.firstSegmentHorizontal) {
                         _link.points[0] = pt;
                         _link.points[1] = {
                             x: pt.x,
                             y: _link.points[1].y
                         };
                     } else {
                         _link.points[0] = pt;
                         _link.points[1] = {
                             x: _link.points[1].x,
                             y: pt.y
                         };
                     }
                 } else if (_handle === 1) {
                     if (!_link.firstSegmentHorizontal) {
                         pt.x = Math.min(pt.x, _link.org.x + _link.org.w);
                         pt.x = Math.max(pt.x, _link.org.x);
                         pt.y = Math.min(pt.y, _link.dst.y + _link.dst.h);
                         pt.y = Math.max(pt.y, _link.dst.y);

                         if (_link.org.pins === null) {
                             _link.points[0] = {
                                 x: pt.x,
                                 y: _link.points[0].y
                             };
                             _link.points[1] = {
                                 x: pt.x,
                                 y: _link.points[1].y
                             };
                         }
                         if (_link.dst.pins === null) {
                             _link.points[2] = {
                                 x: _link.points[2].x,
                                 y: pt.y
                             };
                             _link.points[1] = {
                                 x: _link.points[1].x,
                                 y: pt.y
                             };
                         }
                     } else {
                         pt.x = Math.min(pt.x, _link.dst.x + _link.dst.w);
                         pt.x = Math.max(pt.x, _link.dst.x);
                         pt.y = Math.min(pt.y, _link.org.y + _link.org.h);
                         pt.y = Math.max(pt.y, _link.org.y);
                         if (_link.org.pins === null) {
                             _link.points[0] = {
                                 x: pt.x,
                                 y: _link.points[0].y
                             };
                             _link.points[1] = {
                                 x: _link.points[1].x,
                                 y: pt.y
                             };
                         }
                         if (_link.dst.pins === null) {
                             _link.points[2] = {
                                 x: _link.points[2].x,
                                 y: pt.y
                             };
                             _link.points[1] = {
                                 x: pt.x,
                                 y: _link.points[1].y
                             };
                         }
                     }
                 } else if (_handle === 2) {
                     if (!_link.firstSegmentHorizontal) {
                         _link.points[2] = pt;
                         _link.points[1] = {
                             x: _link.points[1].x,
                             y: pt.y
                         };
                     } else {
                         _link.points[2] = pt;
                         _link.points[1] = {
                             x: pt.x,
                             y: _link.points[1].y
                         };
                     }
                 }
             } else {
                 if (_handle <= 1) {
                     if (_handle === 1) {
                         if (!_link.firstSegmentHorizontal) {
                             if (_link.org.pins !== null) {
                                 _link.points[1] = {
                                     x: _link.points[1].x,
                                     y: pt.y
                                 };
                             } else {
                                 pt.x = Math.min(pt.x, _link.org.x + _link.org.w);
                                 pt.x = Math.max(pt.x, _link.org.x);
                                 _link.points[0] = {
                                     x: pt.x,
                                     y: _link.points[0].y
                                 };
                                 _link.points[1] = pt;
                             }
                         } else {
                             if (_link.org.pins !== null) {
                                 _link.points[1] = {
                                     x: pt.x,
                                     y: _link.points[1].y
                                 };
                             } else {
                                 pt.y = Math.min(pt.y, _link.org.y + _link.org.h);
                                 pt.y = Math.max(pt.y, _link.org.y);
                                 _link.points[0] = {
                                     x: _link.points[0].x,
                                     y: pt.y
                                 };
                                 _link.points[1] = pt;
                             }
                         }
                     }
                 } else if (_handle >= n - 2) {
                     lastSegmentVertical = (_link.firstSegmentHorizontal && (n - 1) % 2 === 0) ||
                         (!_link.firstSegmentHorizontal && (n - 1) % 2 === 1);
                     if (_handle === n - 2) {
                         if (lastSegmentVertical) {
                             if (_link.dst.pins !== null) {
                                 _link.points[n - 2] = {
                                     x: _link.points[n - 1].x,
                                     y: pt.y
                                 };
                             } else {
                                 pt.x = Math.min(pt.x, _link.dst.x + _link.dst.w);
                                 pt.x = Math.max(pt.x, _link.dst.x);
                                 _link.points[n - 1] = {
                                     x: pt.x,
                                     y: _link.points[n - 1].y
                                 };
                                 _link.points[n - 2] = pt;
                             }
                         } else {
                             if (_link.dst.pins !== null) {
                                 _link.points[n - 2] = {
                                     x: pt.x,
                                     y: _link.points[n - 1].y
                                 };
                             } else {
                                 pt.y = Math.min(pt.y, _link.dst.y + _link.dst.h);
                                 pt.y = Math.max(pt.y, _link.dst.y);
                                 _link.points[n - 1] = {
                                     x: _link.points[n - 1].x,
                                     y: pt.y
                                 };
                                 _link.points[n - 2] = pt;
                             }
                         }
                     }
                 }
             }

             updateLinkPoints(_link, pt, _handle);
         }


         // Selection---------------------------------------------------------------------

         function beginSelect() {
             _isSelecting = true;
             setMouseCapture();
         }

         function doSelect(pt) {
             var rc;

             if (!_isSelecting) {
                 beginSelect();
             }

             rc = tmpRect.inflate(that.selRectLineWidth, that.selRectLineWidth);
             invalidate(rc);

             tmpRect = Helpers.getRectByTwoPoints(ptOrg, pt);

             rc = tmpRect.inflate(that.selRectLineWidth, that.selRectLineWidth);
             invalidate(rc);

             if (that.canSelectOnMouseMove) {
                 doSelection();
             }

             updateDrawing();
         }

         function endSelect() {
             var rc = tmpRect.inflate(that.selRectLineWidth, that.selRectLineWidth);
             invalidate(rc);

             if (!that.canSelectOnMouseMove) {
                 doSelection();
             }

             updateDrawing();
         }

         function doSelection() {
             _unselectAll();

             var rcSelection = tmpRect;

             switch (that.mouseSelection) {
                 case 'selection2':
                     if (that.canMultiSelect) {
                         selectItemsEntirelyInRect(rcSelection);
                     }
                     break;

                 case 'selection':
                     if (that.canMultiSelect) {
                         selectItemsPartiallyInRect(rcSelection);
                     }
                     break;
             }
         }

         function selectItemsEntirelyInRect(rcSelection) {
             var i, rc, itm;

             _unselectAll();

             for (i = 0; i < _items.length; i++) {
                 itm = _items[i];
                 if (that.isNode(itm)) {
                     rc = getNodeRect(itm);
                 } else {
                     rc = getLinkRect(itm);
                 }

                 // Select the item if it is completely inside the rectangle
                 if (rcSelection.containsRect(rc)) {
                     if (itm.isSelectable) {
                         itm.setIsSelected(true);
                     }
                 }
             }
         }

         function selectItemsPartiallyInRect(rcSelection) {
             var i, rc, itm;

             _unselectAll();

             for (i = 0; i < _items.length; i++) {
                 itm = _items[i];
                 if (that.isNode(itm)) {
                     rc = getNodeRect(itm);
                 } else {
                     rc = getLinkRect(itm);
                 }

                 // Select the item if it is completely inside the rectangle
                 if (rcSelection.intersectsWith(rc)) {
                     if (itm.isSelectable) {
                         itm.setIsSelected(true);
                     }
                 }
             }
         }


         // Zoom-------------------------------------------------------------------------

         function beginZoom() {
             _isZooming = true;
             setMouseCapture();
         }

         function doZoom(pt) {
             var rc;

             if (!_isZooming) {
                 beginZoom();
             }

             rc = tmpRect.inflate(that.selRectLineWidth, that.selRectLineWidth);
             invalidate(rc);

             tmpRect = Helpers.getRectByTwoPoints(ptOrg, pt);

             rc = tmpRect.inflate(that.selRectLineWidth, that.selRectLineWidth);
             invalidate(rc);

             updateDrawing();
         }

         function endZoom() {
             var rc = tmpRect.inflate(that.selRectLineWidth, that.selRectLineWidth);
             invalidate(rc);
             updateDrawing();

             if (rc.width > moveStartDist && rc.height > moveStartDist) {
                 _zoomRectangle(rc);
             }
         }


         // Pan---------------------------------------------------------------------------

         function beginPan(pt) {
             var div = that.canvas.parentNode;
             if (div !== null && div !== undefined) {
                 _isPanning = true;
                 xoffset = div.scrollLeft;
                 yoffset = div.scrollTop;
                 scrollStartPoint = pt;
                 setMouseCapture();
             }
         }

         function doPan(pt) {
             var canScroll, xdelta, ydelta, div, w, h;

             if (!_isPanning) {
                 beginPan(pt);
             }

             div = that.canvas.parentNode;
             if (div !== null && div !== undefined) {
                 w = parseInt(div.style.width, 10);
                 h = parseInt(div.style.height, 10);
                 if (!isNaN(w) && !isNaN(h)) {
                     // Update the cursor
                     canScroll = (that.canvas.width > w) ||
                         (that.canvas.height > h);
                     _cursor = canScroll ? 'pointer' : 'default';

                     xdelta = (pt.x > scrollStartPoint.x) ?
                         -(pt.x - scrollStartPoint.x) : (scrollStartPoint.x - pt.x);
                     ydelta = (pt.y > scrollStartPoint.y) ?
                         -(pt.y - scrollStartPoint.y) : (scrollStartPoint.y - pt.y);

                     // Scroll to the new position.
                     if (xdelta !== 0) {
                         xoffset += xdelta;
                         div.scrollLeft = xoffset;
                     }
                     if (ydelta !== 0) {
                         yoffset += ydelta;
                         div.scrollTop = yoffset;
                     }
                 }
             }
         }

         function endPan() {
             // Nothing to do
         }
     }
 };