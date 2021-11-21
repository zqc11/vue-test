/* This file offers two methods for serializing an AddFlow diagram in JSON format.
- toJSON
- fromJSON
Both methods are used in the file json.htm.
Notice that both methods contains code specific to the diagram drawn in json.htm.
The "specific" code is between 
                // BEGIN SPECIFIC
                and
                // END SPECIFIC
You may adapt this file to your own serializing needs.
*/

export default {
    /** Save an AddFlow diagram to data in JSON format */
    toJSON: function (flow) {
        var jsonItems, items, item, i;

        function JsonNode(_node) {
            this.node = _node.clone();
            this.node.index = _node.index;
            this.node.flow = null;

            // Replace the image by a link to this image
            if (this.node.image !== undefined && this.node.image !== null) {
                this.node.srcImage = this.image.src;
                this.node.image = null;
            }

            this.toJSON = function () {
                var propertyName;

                // BEGIN SPECIFIC
                // JSON does not save functions. So we just replace the function by a key 
                // and we suppose that the destination AddFlow component will know what to do 
                // with that key
                this.node.drawShapeKey = 'drawTerminator';
                this.node.fillShapeKey = 'fillPredefinedProcess';
                // END SPECIFIC

                for (propertyName in this.node) {
                    if (this.node[propertyName] === null ||
                        (this.node[propertyName] === _node.flow.nodeModel[propertyName] &&
                            propertyName !== 'kindOfItem')) {
                        delete this.node[propertyName];
                    }
                }
                return this.node;
            };
        }

        function JsonLink(_link) {
            this.link = _link.clone();
            this.link.index = _link.index;
            this.link.idOrg = _link.org != null ? _link.org.index : -1;
            this.link.idDst = _link.dst != null ? _link.dst.index : -1;
            this.link.org = null;
            this.link.dst = null;
            this.link.flow = null;

            this.toJSON = function () {
                var propertyName;

                for (propertyName in this.link) {
                    if (this.link[propertyName] === null ||
                        (this.link[propertyName] === _link.flow.linkModel[propertyName] &&
                            propertyName !== 'kindOfItem')) {
                        delete this.link[propertyName];
                    }
                }
                return this.link;
            };
        }


        jsonItems = [];
        items = flow.getItems();
        for (i = 0; i < items.length; i++) {
            item = items[i];
            if (flow.isNode(item)) {
                jsonItems.push(new JsonNode(item));
            } else if (flow.isLink(item)) {
                jsonItems.push(new JsonLink(item));
            }
        }

        return JSON.stringify(jsonItems, undefined, ' ');
    },

    /** Load an AddFlow diagram from data in JSON format */
    fromJSON: function (flow, jsonData) {
        var i, k, jsonItems, node, link, jnode, jlink, items, links,
            oldItemCount, org, dst, image, idxOrder, idxOrderNodeMax;

        function copyNodeProperties(node, model) {
            if (model.strokeStyle !== undefined) {
                node.strokeStyle = model.strokeStyle;
            }
            if (model.fillStyle !== undefined) {
                node.fillStyle = model.fillStyle;
            }
            if (model.gradientFillStyle !== undefined) {
                node.gradientFillStyle = model.gradientFillStyle;
            }
            if (model.textFillStyle !== undefined) {
                node.textFillStyle = model.textFillStyle;
            }
            if (model.lineWidth !== undefined) {
                node.lineWidth = model.lineWidth;
            }
            if (model.shapeFamily !== undefined) {
                node.shapeFamily = model.shapeFamily;
            }
            if (model.polygon !== undefined) {
                node.polygon = model.polygon;
            }
            if (model.drawShape !== undefined) {
                node.drawShape = model.drawShape;
            }
            if (model.fillShape !== undefined) {
                node.fillShape = model.fillShape;
            }
            if (model.pins !== undefined) {
                node.pins = model.pins;
            }
            if (model.isXSizeable !== undefined) {
                node.isXSizeable = model.isXSizeable;
            }
            if (model.isYSizeable !== undefined) {
                node.isYSizeable = model.isYSizeable;
            }
            if (model.isXMoveable !== undefined) {
                node.isXMoveable = model.isXMoveable;
            }
            if (model.isYMoveable !== undefined) {
                node.isYMoveable = model.isYMoveable;
            }
            if (model.isOutLinkable !== undefined) {
                node.isOutLinkable = model.isOutLinkable;
            }
            if (model.isInLinkable !== undefined) {
                node.isInLinkable = model.isInLinkable;
            }
            if (model.isSelectable !== undefined) {
                node.isSelectable = model.isSelectable;
            }
            if (model.isContextHandle !== undefined) {
                node.isContextHandle = model.isContextHandle;
            }
            if (model.isShadowed !== undefined) {
                node.isShadowed = model.isShadowed;
            }
            if (model.image !== undefined) {
                node.image = model.image;
            }
            if (model.textMargin !== undefined) {
                node.textMargin = model.textMargin;
            }
            if (model.imageMargin !== undefined) {
                node.imageMargin = model.imageMargin;
            }
            if (model.textPosition !== undefined) {
                node.textPosition = model.textPosition;
            }
            if (model.imagePosition !== undefined) {
                node.imagePosition = model.imagePosition;
            }
            if (model.font !== undefined) {
                node.font = model.font;
            }
            if (model.textLineHeight !== undefined) {
                node.textLineHeight = model.textLineHeight;
            }
        }

        function copyLinkProperties(link, model) {
            if (model.strokeStyle !== undefined) {
                link.strokeStyle = model.strokeStyle;
            }
            if (model.fillStyle !== undefined) {
                link.fillStyle = model.fillStyle;
            }
            if (model.textFillStyle !== undefined) {
                link.textFillStyle = model.textFillStyle;
            }
            if (model.lineWidth !== undefined) {
                link.lineWidth = model.lineWidth;
            }
            if (model.isStretchable !== undefined) {
                link.isStretchable = model.isStretchable;
            }
            if (model.isSelectable !== undefined) {
                link.isSelectable = model.isSelectable;
            }
            if (model.isContextHandle !== undefined) {
                link.isContextHandle = model.isContextHandle;
            }
            if (model.isShadowed !== undefined) {
                link.isShadowed = model.isShadowed;
            }
            if (model.font !== undefined) {
                link.font = model.font;
            }
            if (model.roundedCornerSize !== undefined) {
                link.roundedCornerSize = model.roundedCornerSize;
            }
            if (model.isOrientedText !== undefined) {
                link.isOrientedText = model.isOrientedText;
            }
            if (model.isOpaque !== undefined) {
                link.isOpaque = model.isOpaque;
            }
            if (model.arrowDst !== undefined) {
                link.arrowDst = model.arrowDst;
            }
            if (model.arrowOrg !== undefined) {
                link.arrowOrg = model.arrowOrg;
            }
            if (model.lineStyle !== undefined) {
                link.lineStyle = model.lineStyle;
            }
            if (model.orthoMargin !== undefined) {
                link.orthoMargin = model.orthoMargin;
            }
            if (model.points !== undefined) {
                link.points = model.points.slice();
            }
        }

        if (jsonData === undefined || jsonData === null || jsonData === '') {
            return;
        }

        // The AddFlow component may already contains items.
        idxOrderNodeMax = 0;
        items = flow.getItems();
        oldItemCount = items.length;

        // Parse the json data to obtain a Serial object
        jsonItems = JSON.parse(jsonData);

        // 3 steps:
        // - creation of nodes
        // - creation of links
        // - ZOrder adjustments. The links have beeen created after the nodes and therefore 
        // have a zorder index superior to the nodes. However some links may have 
        // a zorder inferior so we have to adjust that.

        // First step: create the nodes
        for (i = 0; i < jsonItems.length; i++) {
            if (jsonItems[i].kindOfItem === 'Node') {
                jnode = jsonItems[i];

                // Create the node
                node = flow.addNode(jnode.x, jnode.y, jnode.w, jnode.h, jnode.text);

                // Set its properties 
                copyNodeProperties(node, jnode);

                // Image
                if (jnode.srcImage !== undefined && jnode.srcImage !== null) {
                    image = new Image();
                    image.src = jnode.srcImage;
                    node.image = image;
                    node.image.onload = function () {
                        node.refresh();
                    };
                }

                // BEGIN SPECIFIC
                // Specific treatment for custom drawShape and fillShape methods
                // if (jnode.drawShapeKey === 'drawTerminator') {
                //     node.drawShape = drawTerminator;
                // }
                // if (jnode.fillShapeKey === 'fillPredefinedProcess') {
                //     node.fillShape = fillPredefinedProcess;
                // }
                // END SPECIFIC

                // We update the item in the array. This will be used to 
                // retrieve the org and dst of links in the second step.
                jsonItems[i] = node;

                idxOrder = jnode.index + oldItemCount;
                if (idxOrder > idxOrderNodeMax) {
                    idxOrderNodeMax = idxOrder;
                }
            }
        }

        // Second step: Create the links
        links = []; // An array to store the links. Will be used in third step
        for (i = 0; i < jsonItems.length; i++) {
            if (jsonItems[i].kindOfItem === 'Link') {
                jlink = jsonItems[i];
                org = jsonItems[jlink.idOrg];
                dst = jsonItems[jlink.idDst];
                if (org !== null && dst !== null) {
                    // Create the link
                    link = flow.addLink(org, dst, jlink.text, jlink.pinOrg, jlink.pinDst);

                    // Set its properties
                    copyLinkProperties(link, jlink);

                    // We fill the links arrays for the third step
                    links.push(link);
                    link.tmpIdx = jlink.index + oldItemCount;
                }
            }
        }

        // Third step; preserve the zordering of links
        for (k = 0; k < links.length; k++) {
            link = links[k];
            if (link.tmpIdx < idxOrderNodeMax) {
                // Remove item from the list
                items.splice(link.index, 1);
                // Insert it at the proper place
                items.splice(link.tmpIdx, 0, link);
            }
            delete link['tmpIdx'];
        }

        flow.refresh();
    }
}