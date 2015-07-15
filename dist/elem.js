!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Elem=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){

},{}],2:[function(require,module,exports){
var createElement = require("./vdom/create-element.js")

module.exports = createElement

},{"./vdom/create-element.js":9}],3:[function(require,module,exports){
var diff = require("./vtree/diff.js")

module.exports = diff

},{"./vtree/diff.js":25}],4:[function(require,module,exports){
(function (global){
var topLevel = typeof global !== 'undefined' ? global :
    typeof window !== 'undefined' ? window : {}
var minDoc = require('min-document');

if (typeof document !== 'undefined') {
    module.exports = document;
} else {
    var doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'];

    if (!doccy) {
        doccy = topLevel['__GLOBAL_DOCUMENT_CACHE@4'] = minDoc;
    }

    module.exports = doccy;
}

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"min-document":1}],5:[function(require,module,exports){
"use strict";

module.exports = function isObject(x) {
	return typeof x === "object" && x !== null;
};

},{}],6:[function(require,module,exports){
var nativeIsArray = Array.isArray
var toString = Object.prototype.toString

module.exports = nativeIsArray || isArray

function isArray(obj) {
    return toString.call(obj) === "[object Array]"
}

},{}],7:[function(require,module,exports){
var patch = require("./vdom/patch.js")

module.exports = patch

},{"./vdom/patch.js":12}],8:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook.js")

module.exports = applyProperties

function applyProperties(node, props, previous) {
    for (var propName in props) {
        var propValue = props[propName]

        if (propValue === undefined) {
            removeProperty(node, propName, propValue, previous);
        } else if (isHook(propValue)) {
            removeProperty(node, propName, propValue, previous)
            if (propValue.hook) {
                propValue.hook(node,
                    propName,
                    previous ? previous[propName] : undefined)
            }
        } else {
            if (isObject(propValue)) {
                patchObject(node, props, previous, propName, propValue);
            } else {
                node[propName] = propValue
            }
        }
    }
}

function removeProperty(node, propName, propValue, previous) {
    if (previous) {
        var previousValue = previous[propName]

        if (!isHook(previousValue)) {
            if (propName === "attributes") {
                for (var attrName in previousValue) {
                    node.removeAttribute(attrName)
                }
            } else if (propName === "style") {
                for (var i in previousValue) {
                    node.style[i] = ""
                }
            } else if (typeof previousValue === "string") {
                node[propName] = ""
            } else {
                node[propName] = null
            }
        } else if (previousValue.unhook) {
            previousValue.unhook(node, propName, propValue)
        }
    }
}

function patchObject(node, props, previous, propName, propValue) {
    var previousValue = previous ? previous[propName] : undefined

    // Set attributes
    if (propName === "attributes") {
        for (var attrName in propValue) {
            var attrValue = propValue[attrName]

            if (attrValue === undefined) {
                node.removeAttribute(attrName)
            } else {
                node.setAttribute(attrName, attrValue)
            }
        }

        return
    }

    if(previousValue && isObject(previousValue) &&
        getPrototype(previousValue) !== getPrototype(propValue)) {
        node[propName] = propValue
        return
    }

    if (!isObject(node[propName])) {
        node[propName] = {}
    }

    var replacer = propName === "style" ? "" : undefined

    for (var k in propValue) {
        var value = propValue[k]
        node[propName][k] = (value === undefined) ? replacer : value
    }
}

function getPrototype(value) {
    if (Object.getPrototypeOf) {
        return Object.getPrototypeOf(value)
    } else if (value.__proto__) {
        return value.__proto__
    } else if (value.constructor) {
        return value.constructor.prototype
    }
}

},{"../vnode/is-vhook.js":16,"is-object":5}],9:[function(require,module,exports){
var document = require("global/document")

var applyProperties = require("./apply-properties")

var isVNode = require("../vnode/is-vnode.js")
var isVText = require("../vnode/is-vtext.js")
var isWidget = require("../vnode/is-widget.js")
var handleThunk = require("../vnode/handle-thunk.js")

module.exports = createElement

function createElement(vnode, opts) {
    var doc = opts ? opts.document || document : document
    var warn = opts ? opts.warn : null

    vnode = handleThunk(vnode).a

    if (isWidget(vnode)) {
        return vnode.init()
    } else if (isVText(vnode)) {
        return doc.createTextNode(vnode.text)
    } else if (!isVNode(vnode)) {
        if (warn) {
            warn("Item is not a valid virtual dom node", vnode)
        }
        return null
    }

    var node = (vnode.namespace === null) ?
        doc.createElement(vnode.tagName) :
        doc.createElementNS(vnode.namespace, vnode.tagName)

    var props = vnode.properties
    applyProperties(node, props)

    var children = vnode.children

    for (var i = 0; i < children.length; i++) {
        var childNode = createElement(children[i], opts)
        if (childNode) {
            node.appendChild(childNode)
        }
    }

    return node
}

},{"../vnode/handle-thunk.js":14,"../vnode/is-vnode.js":17,"../vnode/is-vtext.js":18,"../vnode/is-widget.js":19,"./apply-properties":8,"global/document":4}],10:[function(require,module,exports){
// Maps a virtual DOM tree onto a real DOM tree in an efficient manner.
// We don't want to read all of the DOM nodes in the tree so we use
// the in-order tree indexing to eliminate recursion down certain branches.
// We only recurse into a DOM node if we know that it contains a child of
// interest.

var noChild = {}

module.exports = domIndex

function domIndex(rootNode, tree, indices, nodes) {
    if (!indices || indices.length === 0) {
        return {}
    } else {
        indices.sort(ascending)
        return recurse(rootNode, tree, indices, nodes, 0)
    }
}

function recurse(rootNode, tree, indices, nodes, rootIndex) {
    nodes = nodes || {}


    if (rootNode) {
        if (indexInRange(indices, rootIndex, rootIndex)) {
            nodes[rootIndex] = rootNode
        }

        var vChildren = tree.children

        if (vChildren) {

            var childNodes = rootNode.childNodes

            for (var i = 0; i < tree.children.length; i++) {
                rootIndex += 1

                var vChild = vChildren[i] || noChild
                var nextIndex = rootIndex + (vChild.count || 0)

                // skip recursion down the tree if there are no nodes down here
                if (indexInRange(indices, rootIndex, nextIndex)) {
                    recurse(childNodes[i], vChild, indices, nodes, rootIndex)
                }

                rootIndex = nextIndex
            }
        }
    }

    return nodes
}

// Binary search for an index in the interval [left, right]
function indexInRange(indices, left, right) {
    if (indices.length === 0) {
        return false
    }

    var minIndex = 0
    var maxIndex = indices.length - 1
    var currentIndex
    var currentItem

    while (minIndex <= maxIndex) {
        currentIndex = ((maxIndex + minIndex) / 2) >> 0
        currentItem = indices[currentIndex]

        if (minIndex === maxIndex) {
            return currentItem >= left && currentItem <= right
        } else if (currentItem < left) {
            minIndex = currentIndex + 1
        } else  if (currentItem > right) {
            maxIndex = currentIndex - 1
        } else {
            return true
        }
    }

    return false;
}

function ascending(a, b) {
    return a > b ? 1 : -1
}

},{}],11:[function(require,module,exports){
var applyProperties = require("./apply-properties")

var isWidget = require("../vnode/is-widget.js")
var VPatch = require("../vnode/vpatch.js")

var render = require("./create-element")
var updateWidget = require("./update-widget")

module.exports = applyPatch

function applyPatch(vpatch, domNode, renderOptions) {
    var type = vpatch.type
    var vNode = vpatch.vNode
    var patch = vpatch.patch

    switch (type) {
        case VPatch.REMOVE:
            return removeNode(domNode, vNode)
        case VPatch.INSERT:
            return insertNode(domNode, patch, renderOptions)
        case VPatch.VTEXT:
            return stringPatch(domNode, vNode, patch, renderOptions)
        case VPatch.WIDGET:
            return widgetPatch(domNode, vNode, patch, renderOptions)
        case VPatch.VNODE:
            return vNodePatch(domNode, vNode, patch, renderOptions)
        case VPatch.ORDER:
            reorderChildren(domNode, patch)
            return domNode
        case VPatch.PROPS:
            applyProperties(domNode, patch, vNode.properties)
            return domNode
        case VPatch.THUNK:
            return replaceRoot(domNode,
                renderOptions.patch(domNode, patch, renderOptions))
        default:
            return domNode
    }
}

function removeNode(domNode, vNode) {
    var parentNode = domNode.parentNode

    if (parentNode) {
        parentNode.removeChild(domNode)
    }

    destroyWidget(domNode, vNode);

    return null
}

function insertNode(parentNode, vNode, renderOptions) {
    var newNode = render(vNode, renderOptions)

    if (parentNode) {
        parentNode.appendChild(newNode)
    }

    return parentNode
}

function stringPatch(domNode, leftVNode, vText, renderOptions) {
    var newNode

    if (domNode.nodeType === 3) {
        domNode.replaceData(0, domNode.length, vText.text)
        newNode = domNode
    } else {
        var parentNode = domNode.parentNode
        newNode = render(vText, renderOptions)

        if (parentNode && newNode !== domNode) {
            parentNode.replaceChild(newNode, domNode)
        }
    }

    return newNode
}

function widgetPatch(domNode, leftVNode, widget, renderOptions) {
    var updating = updateWidget(leftVNode, widget)
    var newNode

    if (updating) {
        newNode = widget.update(leftVNode, domNode) || domNode
    } else {
        newNode = render(widget, renderOptions)
    }

    var parentNode = domNode.parentNode

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    if (!updating) {
        destroyWidget(domNode, leftVNode)
    }

    return newNode
}

function vNodePatch(domNode, leftVNode, vNode, renderOptions) {
    var parentNode = domNode.parentNode
    var newNode = render(vNode, renderOptions)

    if (parentNode && newNode !== domNode) {
        parentNode.replaceChild(newNode, domNode)
    }

    return newNode
}

function destroyWidget(domNode, w) {
    if (typeof w.destroy === "function" && isWidget(w)) {
        w.destroy(domNode)
    }
}

function reorderChildren(domNode, moves) {
    var childNodes = domNode.childNodes
    var keyMap = {}
    var node
    var remove
    var insert

    for (var i = 0; i < moves.removes.length; i++) {
        remove = moves.removes[i]
        node = childNodes[remove.from]
        if (remove.key) {
            keyMap[remove.key] = node
        }
        domNode.removeChild(node)
    }

    var length = childNodes.length
    for (var j = 0; j < moves.inserts.length; j++) {
        insert = moves.inserts[j]
        node = keyMap[insert.key]
        // this is the weirdest bug i've ever seen in webkit
        domNode.insertBefore(node, insert.to >= length++ ? null : childNodes[insert.to])
    }
}

function replaceRoot(oldRoot, newRoot) {
    if (oldRoot && newRoot && oldRoot !== newRoot && oldRoot.parentNode) {
        oldRoot.parentNode.replaceChild(newRoot, oldRoot)
    }

    return newRoot;
}

},{"../vnode/is-widget.js":19,"../vnode/vpatch.js":22,"./apply-properties":8,"./create-element":9,"./update-widget":13}],12:[function(require,module,exports){
var document = require("global/document")
var isArray = require("x-is-array")

var domIndex = require("./dom-index")
var patchOp = require("./patch-op")
module.exports = patch

function patch(rootNode, patches) {
    return patchRecursive(rootNode, patches)
}

function patchRecursive(rootNode, patches, renderOptions) {
    var indices = patchIndices(patches)

    if (indices.length === 0) {
        return rootNode
    }

    var index = domIndex(rootNode, patches.a, indices)
    var ownerDocument = rootNode.ownerDocument

    if (!renderOptions) {
        renderOptions = { patch: patchRecursive }
        if (ownerDocument !== document) {
            renderOptions.document = ownerDocument
        }
    }

    for (var i = 0; i < indices.length; i++) {
        var nodeIndex = indices[i]
        rootNode = applyPatch(rootNode,
            index[nodeIndex],
            patches[nodeIndex],
            renderOptions)
    }

    return rootNode
}

function applyPatch(rootNode, domNode, patchList, renderOptions) {
    if (!domNode) {
        return rootNode
    }

    var newNode

    if (isArray(patchList)) {
        for (var i = 0; i < patchList.length; i++) {
            newNode = patchOp(patchList[i], domNode, renderOptions)

            if (domNode === rootNode) {
                rootNode = newNode
            }
        }
    } else {
        newNode = patchOp(patchList, domNode, renderOptions)

        if (domNode === rootNode) {
            rootNode = newNode
        }
    }

    return rootNode
}

function patchIndices(patches) {
    var indices = []

    for (var key in patches) {
        if (key !== "a") {
            indices.push(Number(key))
        }
    }

    return indices
}

},{"./dom-index":10,"./patch-op":11,"global/document":4,"x-is-array":6}],13:[function(require,module,exports){
var isWidget = require("../vnode/is-widget.js")

module.exports = updateWidget

function updateWidget(a, b) {
    if (isWidget(a) && isWidget(b)) {
        if ("name" in a && "name" in b) {
            return a.id === b.id
        } else {
            return a.init === b.init
        }
    }

    return false
}

},{"../vnode/is-widget.js":19}],14:[function(require,module,exports){
var isVNode = require("./is-vnode")
var isVText = require("./is-vtext")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")

module.exports = handleThunk

function handleThunk(a, b) {
    var renderedA = a
    var renderedB = b

    if (isThunk(b)) {
        renderedB = renderThunk(b, a)
    }

    if (isThunk(a)) {
        renderedA = renderThunk(a, null)
    }

    return {
        a: renderedA,
        b: renderedB
    }
}

function renderThunk(thunk, previous) {
    var renderedThunk = thunk.vnode

    if (!renderedThunk) {
        renderedThunk = thunk.vnode = thunk.render(previous)
    }

    if (!(isVNode(renderedThunk) ||
            isVText(renderedThunk) ||
            isWidget(renderedThunk))) {
        throw new Error("thunk did not return a valid node");
    }

    return renderedThunk
}

},{"./is-thunk":15,"./is-vnode":17,"./is-vtext":18,"./is-widget":19}],15:[function(require,module,exports){
module.exports = isThunk

function isThunk(t) {
    return t && t.type === "Thunk"
}

},{}],16:[function(require,module,exports){
module.exports = isHook

function isHook(hook) {
    return hook &&
      (typeof hook.hook === "function" && !hook.hasOwnProperty("hook") ||
       typeof hook.unhook === "function" && !hook.hasOwnProperty("unhook"))
}

},{}],17:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualNode

function isVirtualNode(x) {
    return x && x.type === "VirtualNode" && x.version === version
}

},{"./version":20}],18:[function(require,module,exports){
var version = require("./version")

module.exports = isVirtualText

function isVirtualText(x) {
    return x && x.type === "VirtualText" && x.version === version
}

},{"./version":20}],19:[function(require,module,exports){
module.exports = isWidget

function isWidget(w) {
    return w && w.type === "Widget"
}

},{}],20:[function(require,module,exports){
module.exports = "2"

},{}],21:[function(require,module,exports){
var version = require("./version")
var isVNode = require("./is-vnode")
var isWidget = require("./is-widget")
var isThunk = require("./is-thunk")
var isVHook = require("./is-vhook")

module.exports = VirtualNode

var noProperties = {}
var noChildren = []

function VirtualNode(tagName, properties, children, key, namespace) {
    this.tagName = tagName
    this.properties = properties || noProperties
    this.children = children || noChildren
    this.key = key != null ? String(key) : undefined
    this.namespace = (typeof namespace === "string") ? namespace : null

    var count = (children && children.length) || 0
    var descendants = 0
    var hasWidgets = false
    var hasThunks = false
    var descendantHooks = false
    var hooks

    for (var propName in properties) {
        if (properties.hasOwnProperty(propName)) {
            var property = properties[propName]
            if (isVHook(property) && property.unhook) {
                if (!hooks) {
                    hooks = {}
                }

                hooks[propName] = property
            }
        }
    }

    for (var i = 0; i < count; i++) {
        var child = children[i]
        if (isVNode(child)) {
            descendants += child.count || 0

            if (!hasWidgets && child.hasWidgets) {
                hasWidgets = true
            }

            if (!hasThunks && child.hasThunks) {
                hasThunks = true
            }

            if (!descendantHooks && (child.hooks || child.descendantHooks)) {
                descendantHooks = true
            }
        } else if (!hasWidgets && isWidget(child)) {
            if (typeof child.destroy === "function") {
                hasWidgets = true
            }
        } else if (!hasThunks && isThunk(child)) {
            hasThunks = true;
        }
    }

    this.count = count + descendants
    this.hasWidgets = hasWidgets
    this.hasThunks = hasThunks
    this.hooks = hooks
    this.descendantHooks = descendantHooks
}

VirtualNode.prototype.version = version
VirtualNode.prototype.type = "VirtualNode"

},{"./is-thunk":15,"./is-vhook":16,"./is-vnode":17,"./is-widget":19,"./version":20}],22:[function(require,module,exports){
var version = require("./version")

VirtualPatch.NONE = 0
VirtualPatch.VTEXT = 1
VirtualPatch.VNODE = 2
VirtualPatch.WIDGET = 3
VirtualPatch.PROPS = 4
VirtualPatch.ORDER = 5
VirtualPatch.INSERT = 6
VirtualPatch.REMOVE = 7
VirtualPatch.THUNK = 8

module.exports = VirtualPatch

function VirtualPatch(type, vNode, patch) {
    this.type = Number(type)
    this.vNode = vNode
    this.patch = patch
}

VirtualPatch.prototype.version = version
VirtualPatch.prototype.type = "VirtualPatch"

},{"./version":20}],23:[function(require,module,exports){
var version = require("./version")

module.exports = VirtualText

function VirtualText(text) {
    this.text = String(text)
}

VirtualText.prototype.version = version
VirtualText.prototype.type = "VirtualText"

},{"./version":20}],24:[function(require,module,exports){
var isObject = require("is-object")
var isHook = require("../vnode/is-vhook")

module.exports = diffProps

function diffProps(a, b) {
    var diff

    for (var aKey in a) {
        if (!(aKey in b)) {
            diff = diff || {}
            diff[aKey] = undefined
        }

        var aValue = a[aKey]
        var bValue = b[aKey]

        if (aValue === bValue) {
            continue
        } else if (isObject(aValue) && isObject(bValue)) {
            if (getPrototype(bValue) !== getPrototype(aValue)) {
                diff = diff || {}
                diff[aKey] = bValue
            } else if (isHook(bValue)) {
                 diff = diff || {}
                 diff[aKey] = bValue
            } else {
                var objectDiff = diffProps(aValue, bValue)
                if (objectDiff) {
                    diff = diff || {}
                    diff[aKey] = objectDiff
                }
            }
        } else {
            diff = diff || {}
            diff[aKey] = bValue
        }
    }

    for (var bKey in b) {
        if (!(bKey in a)) {
            diff = diff || {}
            diff[bKey] = b[bKey]
        }
    }

    return diff
}

function getPrototype(value) {
  if (Object.getPrototypeOf) {
    return Object.getPrototypeOf(value)
  } else if (value.__proto__) {
    return value.__proto__
  } else if (value.constructor) {
    return value.constructor.prototype
  }
}

},{"../vnode/is-vhook":16,"is-object":5}],25:[function(require,module,exports){
var isArray = require("x-is-array")

var VPatch = require("../vnode/vpatch")
var isVNode = require("../vnode/is-vnode")
var isVText = require("../vnode/is-vtext")
var isWidget = require("../vnode/is-widget")
var isThunk = require("../vnode/is-thunk")
var handleThunk = require("../vnode/handle-thunk")

var diffProps = require("./diff-props")

module.exports = diff

function diff(a, b) {
    var patch = { a: a }
    walk(a, b, patch, 0)
    return patch
}

function walk(a, b, patch, index) {
    if (a === b) {
        return
    }

    var apply = patch[index]
    var applyClear = false

    if (isThunk(a) || isThunk(b)) {
        thunks(a, b, patch, index)
    } else if (b == null) {

        // If a is a widget we will add a remove patch for it
        // Otherwise any child widgets/hooks must be destroyed.
        // This prevents adding two remove patches for a widget.
        if (!isWidget(a)) {
            clearState(a, patch, index)
            apply = patch[index]
        }

        apply = appendPatch(apply, new VPatch(VPatch.REMOVE, a, b))
    } else if (isVNode(b)) {
        if (isVNode(a)) {
            if (a.tagName === b.tagName &&
                a.namespace === b.namespace &&
                a.key === b.key) {
                var propsPatch = diffProps(a.properties, b.properties)
                if (propsPatch) {
                    apply = appendPatch(apply,
                        new VPatch(VPatch.PROPS, a, propsPatch))
                }
                apply = diffChildren(a, b, patch, apply, index)
            } else {
                apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
                applyClear = true
            }
        } else {
            apply = appendPatch(apply, new VPatch(VPatch.VNODE, a, b))
            applyClear = true
        }
    } else if (isVText(b)) {
        if (!isVText(a)) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
            applyClear = true
        } else if (a.text !== b.text) {
            apply = appendPatch(apply, new VPatch(VPatch.VTEXT, a, b))
        }
    } else if (isWidget(b)) {
        if (!isWidget(a)) {
            applyClear = true
        }

        apply = appendPatch(apply, new VPatch(VPatch.WIDGET, a, b))
    }

    if (apply) {
        patch[index] = apply
    }

    if (applyClear) {
        clearState(a, patch, index)
    }
}

function diffChildren(a, b, patch, apply, index) {
    var aChildren = a.children
    var orderedSet = reorder(aChildren, b.children)
    var bChildren = orderedSet.children

    var aLen = aChildren.length
    var bLen = bChildren.length
    var len = aLen > bLen ? aLen : bLen

    for (var i = 0; i < len; i++) {
        var leftNode = aChildren[i]
        var rightNode = bChildren[i]
        index += 1

        if (!leftNode) {
            if (rightNode) {
                // Excess nodes in b need to be added
                apply = appendPatch(apply,
                    new VPatch(VPatch.INSERT, null, rightNode))
            }
        } else {
            walk(leftNode, rightNode, patch, index)
        }

        if (isVNode(leftNode) && leftNode.count) {
            index += leftNode.count
        }
    }

    if (orderedSet.moves) {
        // Reorder nodes last
        apply = appendPatch(apply, new VPatch(
            VPatch.ORDER,
            a,
            orderedSet.moves
        ))
    }

    return apply
}

function clearState(vNode, patch, index) {
    // TODO: Make this a single walk, not two
    unhook(vNode, patch, index)
    destroyWidgets(vNode, patch, index)
}

// Patch records for all destroyed widgets must be added because we need
// a DOM node reference for the destroy function
function destroyWidgets(vNode, patch, index) {
    if (isWidget(vNode)) {
        if (typeof vNode.destroy === "function") {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(VPatch.REMOVE, vNode, null)
            )
        }
    } else if (isVNode(vNode) && (vNode.hasWidgets || vNode.hasThunks)) {
        var children = vNode.children
        var len = children.length
        for (var i = 0; i < len; i++) {
            var child = children[i]
            index += 1

            destroyWidgets(child, patch, index)

            if (isVNode(child) && child.count) {
                index += child.count
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

// Create a sub-patch for thunks
function thunks(a, b, patch, index) {
    var nodes = handleThunk(a, b)
    var thunkPatch = diff(nodes.a, nodes.b)
    if (hasPatches(thunkPatch)) {
        patch[index] = new VPatch(VPatch.THUNK, null, thunkPatch)
    }
}

function hasPatches(patch) {
    for (var index in patch) {
        if (index !== "a") {
            return true
        }
    }

    return false
}

// Execute hooks when two nodes are identical
function unhook(vNode, patch, index) {
    if (isVNode(vNode)) {
        if (vNode.hooks) {
            patch[index] = appendPatch(
                patch[index],
                new VPatch(
                    VPatch.PROPS,
                    vNode,
                    undefinedKeys(vNode.hooks)
                )
            )
        }

        if (vNode.descendantHooks || vNode.hasThunks) {
            var children = vNode.children
            var len = children.length
            for (var i = 0; i < len; i++) {
                var child = children[i]
                index += 1

                unhook(child, patch, index)

                if (isVNode(child) && child.count) {
                    index += child.count
                }
            }
        }
    } else if (isThunk(vNode)) {
        thunks(vNode, null, patch, index)
    }
}

function undefinedKeys(obj) {
    var result = {}

    for (var key in obj) {
        result[key] = undefined
    }

    return result
}

// List diff, naive left to right reordering
function reorder(aChildren, bChildren) {
    // O(M) time, O(M) memory
    var bChildIndex = keyIndex(bChildren)
    var bKeys = bChildIndex.keys
    var bFree = bChildIndex.free

    if (bFree.length === bChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(N) time, O(N) memory
    var aChildIndex = keyIndex(aChildren)
    var aKeys = aChildIndex.keys
    var aFree = aChildIndex.free

    if (aFree.length === aChildren.length) {
        return {
            children: bChildren,
            moves: null
        }
    }

    // O(MAX(N, M)) memory
    var newChildren = []

    var freeIndex = 0
    var freeCount = bFree.length
    var deletedItems = 0

    // Iterate through a and match a node in b
    // O(N) time,
    for (var i = 0 ; i < aChildren.length; i++) {
        var aItem = aChildren[i]
        var itemIndex

        if (aItem.key) {
            if (bKeys.hasOwnProperty(aItem.key)) {
                // Match up the old keys
                itemIndex = bKeys[aItem.key]
                newChildren.push(bChildren[itemIndex])

            } else {
                // Remove old keyed items
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        } else {
            // Match the item in a with the next free item in b
            if (freeIndex < freeCount) {
                itemIndex = bFree[freeIndex++]
                newChildren.push(bChildren[itemIndex])
            } else {
                // There are no free items in b to match with
                // the free items in a, so the extra free nodes
                // are deleted.
                itemIndex = i - deletedItems++
                newChildren.push(null)
            }
        }
    }

    var lastFreeIndex = freeIndex >= bFree.length ?
        bChildren.length :
        bFree[freeIndex]

    // Iterate through b and append any new keys
    // O(M) time
    for (var j = 0; j < bChildren.length; j++) {
        var newItem = bChildren[j]

        if (newItem.key) {
            if (!aKeys.hasOwnProperty(newItem.key)) {
                // Add any new keyed items
                // We are adding new items to the end and then sorting them
                // in place. In future we should insert new items in place.
                newChildren.push(newItem)
            }
        } else if (j >= lastFreeIndex) {
            // Add any leftover non-keyed items
            newChildren.push(newItem)
        }
    }

    var simulate = newChildren.slice()
    var simulateIndex = 0
    var removes = []
    var inserts = []
    var simulateItem

    for (var k = 0; k < bChildren.length;) {
        var wantedItem = bChildren[k]
        simulateItem = simulate[simulateIndex]

        // remove items
        while (simulateItem === null && simulate.length) {
            removes.push(remove(simulate, simulateIndex, null))
            simulateItem = simulate[simulateIndex]
        }

        if (!simulateItem || simulateItem.key !== wantedItem.key) {
            // if we need a key in this position...
            if (wantedItem.key) {
                if (simulateItem && simulateItem.key) {
                    // if an insert doesn't put this key in place, it needs to move
                    if (bKeys[simulateItem.key] !== k + 1) {
                        removes.push(remove(simulate, simulateIndex, simulateItem.key))
                        simulateItem = simulate[simulateIndex]
                        // if the remove didn't put the wanted item in place, we need to insert it
                        if (!simulateItem || simulateItem.key !== wantedItem.key) {
                            inserts.push({key: wantedItem.key, to: k})
                        }
                        // items are matching, so skip ahead
                        else {
                            simulateIndex++
                        }
                    }
                    else {
                        inserts.push({key: wantedItem.key, to: k})
                    }
                }
                else {
                    inserts.push({key: wantedItem.key, to: k})
                }
                k++
            }
            // a key in simulate has no matching wanted key, remove it
            else if (simulateItem && simulateItem.key) {
                removes.push(remove(simulate, simulateIndex, simulateItem.key))
            }
        }
        else {
            simulateIndex++
            k++
        }
    }

    // remove all the remaining nodes from simulate
    while(simulateIndex < simulate.length) {
        simulateItem = simulate[simulateIndex]
        removes.push(remove(simulate, simulateIndex, simulateItem && simulateItem.key))
    }

    // If the only moves we have are deletes then we can just
    // let the delete patch remove these items.
    if (removes.length === deletedItems && !inserts.length) {
        return {
            children: newChildren,
            moves: null
        }
    }

    return {
        children: newChildren,
        moves: {
            removes: removes,
            inserts: inserts
        }
    }
}

function remove(arr, index, key) {
    arr.splice(index, 1)

    return {
        from: index,
        key: key
    }
}

function keyIndex(children) {
    var keys = {}
    var free = []
    var length = children.length

    for (var i = 0; i < length; i++) {
        var child = children[i]

        if (child.key) {
            keys[child.key] = i
        } else {
            free.push(i)
        }
    }

    return {
        keys: keys,     // A hash of key name to index
        free: free,     // An array of unkeyed item indices
    }
}

function appendPatch(apply, patch) {
    if (apply) {
        if (isArray(apply)) {
            apply.push(patch)
        } else {
            apply = [apply, patch]
        }

        return apply
    } else {
        return patch
    }
}

},{"../vnode/handle-thunk":14,"../vnode/is-thunk":15,"../vnode/is-vnode":17,"../vnode/is-vtext":18,"../vnode/is-widget":19,"../vnode/vpatch":22,"./diff-props":24,"x-is-array":6}],26:[function(require,module,exports){
var _ = require('./utils');

var globalObject = _.memoGobalObject();

exports.debug = false;
exports.perfs = false;
exports.voidElements = ["AREA", "BASE", "BR", "COL", "COMMAND", "EMBED", "HR", "IMG", "INPUT", "KEYGEN", "LINK", "META", "PARAM", "SOURCE", "TRACK", "WBR"];
exports.events = ['wheel', 'scroll', 'touchcancel', 'touchend', 'touchmove', 'touchstart', 'click', 'doubleclick', 'drag', 'dragend', 'dragenter', 'dragexit', 'dragleave', 'dragover', 'dragstart', 'drop', 'change', 'input', 'submit', 'focus', 'blur', 'keydown', 'keypress', 'keyup', 'copy', 'cut', 'paste', 'mousedown', 'mouseenter', 'mouseleave', 'mousemove', 'mouseout', 'mouseover', 'mouseup'];

// redraw with requestAnimationFrame (https://developer.mozilla.org/fr/docs/Web/API/window.requestAnimationFrame)
// perfs measures (http://www.html5rocks.com/en/tutorials/webperformance/usertiming/)
var Performances = {
  mark: function() {},
  measure: function() {},
  getEntriesByName: function() {
    return [];
  },
  getEntriesByType: function() {
    return [];
  },
  clearMarks: function() {},
  clearMeasures: function() {}
};

// Avoid some issues in non browser environments
if (typeof globalObject === 'undefined') {
  globalObject = {
    __fake: true
  };
}
// Avoid some issues in older browsers
if (typeof globalObject.console === 'undefined') {
  globalObject.console = {
    log: function() {},
    error: function() {},
    table: function() {},
    debug: function() {},
    trace: function() {}
  };
}

if (typeof globalObject.performance !== 'undefined' && typeof globalObject.performance.mark !== 'undefined' && typeof globalObject.performance.measure !== 'undefined') {
  Performances = globalObject.performance;
}

globalObject.requestAnimationFrame =
  globalObject.requestAnimationFrame ||
  globalObject.mozRequestAnimationFrame ||
  globalObject.webkitRequestAnimationFrame ||
  globalObject.msRequestAnimationFrame ||
  (function() {
    if (globalObject.console) console.error('[ELEMJS] No requestAnimationFrame, using lame polyfill ...');
    return function(callback, element) {
      globalObject.setTimeout(callback, 1000 / 60);
    }
  })();

var ElemMeasureStart = 'ElemMeasureStart';
var ElemMeasureStop = 'ElemMeasureStop';
var ElemMeasure = 'ElemComponentRenderingMeasure';
var names = [ElemMeasure];

exports.markStart = function(name) {
  if (exports.perfs) {
    if (name) {
      Performances.mark(name + '_start');
    } else {
      Performances.mark(ElemMeasureStart);
    }
  }
};

exports.markStop = function(name) {
  if (exports.perfs) {
    if (name) {
      Performances.mark(name + '_stop');
      Performances.measure(name, name + '_start', name + '_stop');
      if (!_.contains(names, name)) names.push(name);
    } else {
      Performances.mark(ElemMeasureStop);
      Performances.measure(ElemMeasure, ElemMeasureStart, ElemMeasureStop);
    }
  }
};

exports.collectMeasures = function() {
  if (!exports.perfs) return [];
  var results = [];
  _.each(names, function(name) {
    results = results.concat(Performances.getEntriesByName(name));
  });
  Performances.clearMarks();
  Performances.clearMeasures();
  names = [ElemMeasure];
  return results;
};

exports.printMeasures = function() {
  if (!exports.perfs) return;
  if (globalObject.console) console.table(exports.collectMeasures());
};

exports.defer = function(cb) {
  globalObject.requestAnimationFrame.call(globalObject, cb);
};

exports.defered = function(cb) {
  return function() {
    exports.defer(cb);
  };
};

exports.__internalAccess = {};

if (!Function.prototype.bind) {
  if (globalObject.console) console.error('[ELEMJS] No Function.prototype.bind, using polyfill ...');
  Function.prototype.bind = function(oThis) {
    if (typeof this !== "function") {
      throw new TypeError("Function.prototype.bind - can't call bounded element");
    }
    var aArgs = Array.prototype.slice.call(arguments, 1);
    var fToBind = this;
    var fNOP = function() {};
    var fBound = function() {
      return fToBind.apply(this instanceof fNOP && oThis ? this : oThis,
        aArgs.concat(Array.prototype.slice.call(arguments)));
    };
    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();
    return fBound;
  };
}

},{"./utils":34}],27:[function(require,module,exports){
var Common = require('./common');
var State = require('./state');
var _ = require('./utils');
var mounted = {};

function hasData(node, name) {
  return node.attributes && node.attributes['data-' + name];
}

function data(node, name) {
  if (node.dataset) return node.dataset[name];
  return node.attributes['data-' + name];
}

function unmountComponent(el) {
  if (mounted[el]) {
    mounted[el]();
    delete mounted[el];
    // TODO : find a way to remove all listeners
  }
}

function mountComponent(el, opts) {
  var Elem = Common.__internalAccess.api;
  var name = opts.name || 'Component';
  var defaultProps = opts.defaultProps || function() {
    return {};
  };
  var initialState = opts.initialState || function() {
    return {};
  };
  var state = State(initialState());
  var props = defaultProps();
  opts.props = props;
  opts.state = state.all();
  opts.setState = state.set;
  opts.replaceState = state.replace;
  state.onChange(function() {
    opts.state = state.all();
  });
  var eventCallbacks = {};
  var oldHandlers = [];
  var innerComponents = [];
  // autobinding
  _.each(_.keys(opts), function(k) {
    if (_.isFunction(opts[k])) {
      opts[k] = opts[k].bind(opts);
    }
  });
  var init = (opts.init || function() {});
  var beforeRender = (opts.beforeRender || function() {});
  var render = (opts.render || function() {});
  var afterRender = (opts.afterRender || function() {});
  var unmount = (opts.unmount || function() {});
  var getDOMNode = function() {
    return _.findNode(el);
  };
  opts.context = {
    refs: {},
    getDOMNode: getDOMNode
  };
  var eventsCallback = function(e) { // bubbles listener, TODO : handle mouse event in a clever way
    e = e || window.event;
    var node = e.target || e.srcElement;
    var name = data(node, 'nodeid') + '_' + e.type; //node.dataset.nodeid + "_" + e.type;
    if (eventCallbacks[name]) {
      eventCallbacks[name](e);
    } else {
      while (!eventCallbacks[name] && node && node !== null && hasData(node, 'nodeid')) { //node.dataset && node.dataset.nodeid) {
        node = node.parentElement;
        if (node && node !== null && hasData(node, 'nodeid')) { //node.dataset && node.dataset.nodeid) {
          name = data(node, 'nodeid') + '_' + e.type; //node.dataset.nodeid + "_" + e.type;
        }
      }
      if (eventCallbacks[name]) {
        eventCallbacks[name](e);
      }
    }
  };
  unmountComponent(el);
  mounted[el] = function() {
    unmount(state, _.clone(props), opts.context);
    state.replace({}, true);
    _.off(el, Common.events, eventsCallback);
  };
  init(state, _.clone(props));
  _.on(el, Common.events, eventsCallback);

  function rerender() {
    Common.markStart(name + '.globalRendering');
    _.each(oldHandlers, function(handler) {
      delete eventCallbacks[handler];
    });
    oldHandlers = [];
    var focus = document.activeElement || {}; // TODO : check if input/select/textarea, remember cursor position here
    var key = focus.dataset ? focus.dataset.key : (focus.attributes || [])['key']; // TODO : maybe a bug here
    opts.context.refs = {};
    var waitingHandlers = [];
    _.each(innerComponents, function(c) {
      unmountComponent(c);
    });
    innerComponents = [];
    beforeRender(state, _.clone(props), opts.context);
    Common.markStart(name + '.render');
    var elemToRender = render(state, _.clone(props), opts.context);
    Common.markStop(name + '.render');
    Elem.render(elemToRender, el, {
      waitingHandlers: waitingHandlers,
      __rootListener: true,
      refs: opts.context.refs,
      __innerComponents: innerComponents
    });
    afterRender(state, _.clone(props), opts.context);
    if (key) {
      var focusNode = document.querySelector('[data-key="' + key + '"]'); //$('[data-key="' + key + '"]');
      _.focus(focusNode); // focusNode.focus();  // TODO : maybe a bug here
      if (focusNode.value) { //focusNode.val()) {
        var strLength = focusNode.value.length * 2; // focusNode.val().length * 2;
        focusNode.setSelectionRange(strLength, strLength); //focusNode[0].setSelectionRange(strLength, strLength);  // TODO : handle other kind of input ... like select, etc ...
      }
    }
    _.each(waitingHandlers, function(handler) {
      oldHandlers.push(handler.id + '_' + handler.event.replace('on', ''));
      eventCallbacks[handler.id + '_' + handler.event.replace('on', '')] = function() {
        handler.callback.apply({
          render: render
        }, arguments);
      }
    });
    Common.markStop(name + '.globalRendering');
  }
  rerender();
  state.onChange(rerender); //Common.defered(rerender));
  return state;
}

function serverSideComponent(opts, nodataid) {
  var Elem = Common.__internalAccess.api;
  var name = opts.name || 'Component';
  var defaultProps = opts.defaultProps || function() {
    return {};
  };
  var initialState = opts.initialState || function() {
    return {};
  };
  var state = State(initialState());
  var props = defaultProps();
  opts.props = props;
  opts.state = state.all();
  opts.setState = state.set;
  opts.replaceState = state.replace;
  opts.context = {
    refs: refs,
    getDOMNode: function() {}
  };
  // autobinding
  _.each(_.keys(opts), function(k) {
    if (_.isFunction(opts[k])) {
      opts[k] = opts[k].bind(opts);
    }
  });
  var render = opts.render;
  var afterRender = opts.afterRender || function() {};
  if (opts.init) {
    opts.init(state, _.clone(props));
  }
  Common.markStart(name + '.globalRendering');
  var refs = {};
  Common.markStart(name + '.render');
  var elemToRender = render(state, _.clone(props), opts.context);
  Common.markStop(name + '.render');
  var str = Elem.renderToString(elemToRender, {
    waitingHandlers: [],
    __rootListener: true,
    refs: refs,
    __noDataId: nodataid,
    __innerComponents: []
  });
  afterRender(state, _.clone(props), opts.context);
  Common.markStop(name + '.globalRendering');
  return str;
}

function factory(opts) {
  var defaultProps = {};
  if (opts.defaultProps) {
    defaultProps = opts.defaultProps();
  }
  return function(props, to) {
    var api = {
      __componentFactory: true,
      renderToStaticHtml: function() {
        var opt = _.clone(opts);
        opt.props = _.extend(_.clone(defaultProps || {}), props || {});
        return serverSideComponent(opt, true);
      },
      renderToString: function() {
        var opt = _.clone(opts);
        opt.props = _.extend(_.clone(defaultProps || {}), props || {});
        return serverSideComponent(opt);
      },
      renderTo: function(el, defer) {
        var opt = _.clone(opts);
        opt.defaultProps = function() {
          return _.extend(_.clone(defaultProps || {}), props || {});
        };
        if (defer) {
          Common.defer(function() {
            mountComponent(el, opt);
          });
        } else {
          return mountComponent(el, opt);
        }
      }
    };
    if (to) return api.renderTo(to);
    return api;
  }
}

exports.unmountComponent = unmountComponent;

exports.component = function(opts) {
  if (!opts.container) return factory(opts);
  var el = opts.container;
  mountComponent(el, opts);
};

exports.componentToString = function(opts) {
  var opt = _.clone(opts);
  opt.props = _.extend(_.clone(opts.props || {}), props || {});
  return serverSideComponent(opt);
};

},{"./common":26,"./state":33,"./utils":34}],28:[function(require,module,exports){
var Common = require('./common');
var _ = require('./utils');
var Components = require('./component');
var state = require('./state');
var registerWebComponent = require('./webcomponent').registerWebComponent;
var Stringifier = require('./output/stringify');
var Dispatcher = require('./events');

exports.svgNS = "http://www.w3.org/2000/svg";

function styleToString(attrs) {
  if (_.isUndefined(attrs)) return '';
  var attrsArray = _.map(_.keys(attrs), function(key) {
    var keyName = _.dasherize(key);
    if (key === 'className') {
      keyName = 'class';
    }
    var value = attrs[key];
    if (!_.isUndefined(value) && _.isFunction(value)) {
      value = value();
    }
    if (!_.isUndefined(value)) {
      return keyName + ': ' + value + ';';
    } else {
      return undefined;
    }
  });
  attrsArray = _.filter(attrsArray, function(item) {
    return !_.isUndefined(item);
  });
  return attrsArray.join(' ');
}

function classToArray(attrs) { /* Handle class as object with boolean values */
  if (_.isUndefined(attrs)) return [];
  var attrsArray = _.map(_.keys(attrs), function(key) {
    var value = attrs[key];
    if (!_.isUndefined(value) && value === true) {
      return _.dasherize(key);
    } else {
      return undefined;
    }
  });
  attrsArray = _.filter(attrsArray, function(item) {
    return !_.isUndefined(item);
  });
  return attrsArray;
}

function wrapChildren(children) {
  if (children === 0) {
    return children;
  } else if (children === '') {
    return [];
  }
  return children || [];
}

function buildRef(id) {
  return {
    getDOMNode: function() {
      return _.findNode('[data-nodeid="' + id + '"]');
    }
  };
}

function extractEventHandlers(attrs, nodeId, context) {
  _.each(_.keys(attrs), function(key) {
    var keyName = _.dasherize(key);
    if (_.startsWith(keyName, 'on')) {
      if (context && context.waitingHandlers) {
        context.waitingHandlers.push({
          root: context.root,
          id: nodeId,
          event: keyName.toLowerCase(),
          callback: attrs[key]
        });
      }
    }
    if (keyName === 'ref' && context && context.refs) context.refs[attrs[key]] = buildRef(nodeId);
  });
}

function asAttribute(key, value) {
  return {
    key: key,
    value: value
  };
}

function attributesToArray(attrs) {
  if (_.isUndefined(attrs)) return [];
  var attrsArray = [];
  _.each(_.keys(attrs), function(key) {
    var keyName = _.dasherize(key);
    if (key === 'className') {
      keyName = 'class';
    }
    if (!_.startsWith(keyName, 'on') && keyName !== 'ref') {
      var value = attrs[key];
      if (!_.isUndefined(value) && _.isFunction(value)) {
        value = value();
      }
      if (!_.isUndefined(value)) {
        if (_.isObject(value) && keyName === 'style') {
          attrsArray.push(asAttribute('style', styleToString(value)));
        } else if (_.isArray(value) && keyName === 'class') {
          attrsArray.push(asAttribute(keyName, value.join(' ')));
        } else if (_.isObject(value) && keyName === 'class') {
          attrsArray.push(asAttribute(keyName, classToArray(value).join(' ')));
        } else {
          attrsArray.push(asAttribute(keyName, value));
        }
      }
    }
  });
  return attrsArray;
}

function el(name, attrs, children) {
  var svg = attrs.namespace;
  delete attrs.namespace;
  var nodeId = _.uniqueId('node_');
  if (_.isUndefined(children) && !_.isUndefined(attrs) && !attrs.__isAttrs) {
    children = attrs;
    attrs = {};
  }
  if (arguments.length > 3) {
    name = arguments[0];
    if (!attrs.isElement) {
      attrs = arguments[1];
    } else {
      attrs = {};
    }
    children = [].concat(arguments);
    children.shift();
    children.shift();
  }
  name = _.escape(name) || 'unknown';
  attrs = attrs || {};
  children = wrapChildren(children);
  if (_.isRegExp(children) || _.isUndefined(children) || _.isNull(children)) children = [];
  if (_.isArray(children)) {
    children = _.chain(children).map(function(child) {
      if (_.isFunction(child)) {
        return child();
      } else {
        return child;
      }
    }).filter(function(item) {
      return !_.isUndefined(item);
    }).value();
  }
  var selfCloseTag = _.contains(Common.voidElements, name.toUpperCase()) && (_.isNull(children) || _.isUndefined(children) || (_.isArray(children) && children.length === 0));
  var attrsArray = attributesToArray(attrs);
  attrsArray.push(asAttribute('data-nodeid', _.escape(nodeId)));
  if (Common.debug) attrsArray.push(asAttribute('title', _.escape(nodeId)));
  return {
    name: name,
    attrs: attrs,
    children: children,
    isElement: true,
    nodeId: nodeId,
    outputWith: function(doc, context) {
      var elemName = this.name;
      extractEventHandlers(attrs, nodeId, context);
      var element = undefined;
      if (svg) {
        element = doc.createElementNS(svg, _.escape(name), attrsArray);
      } else {
        element = doc.createElement(_.escape(name), attrsArray);
      }
      function appendSingleNode(__children, __element) {
        if (_.isNumber(__children)) {
          __element.appendChild(doc.createTextNode(__children + ''));
        } else if (_.isString(__children)) {
          __element.appendChild(doc.createTextNode(__children));
        } else if (_.isBoolean(__children)) {
          __element.appendChild(doc.createTextNode(__children + ''));
        } else if (_.isObject(__children) && __children.isElement) {
          __element.appendChild(__children.outputWith(doc, context));
        } else if (_.isObject(__children) && __children.__asHtml) {
          __element.innerHTML = __children.__asHtml;
        } else if (__children.__componentFactory) {
          var compId = _.escape(_.uniqueId('component_'));
          var span = doc.createElement('span', [{ key: 'data-componentid', value: compId }]);
          __element.appendChild(span);
          context.__innerComponents.push('[data-componentid="' + compId + '"]');
          __children.renderTo('[data-componentid="' + compId + '"]', true);
        } else {
          __element.appendChild(doc.createTextNode(__children.toString()));
        }
      }
      if (!selfCloseTag) {
        if (_.isArray(children)) {
          _.each(children, function(child) {
            appendSingleNode(child, element);
          });
        } else {
          appendSingleNode(children, element);
        }
      }
      return element;
    }
  };
}

function renderToNode(el, doc, context) {
  if (_.isFunction(el)) el = el((context || { props: {}}).props);
  if (!_.isUndefined(el)) {
    return el.outputWith(doc, context);
  }
  return {
    render: function() {
      throw new Error("Your element is undefined");
    }
  };
}
var JsonOutput = require('./output/output');

exports.renderToJson = function(el, context) {
  Common.markStart('Elem.renderToJson');
  var output = JsonOutput(context);
  var json = renderToNode(el, output).render();
  Common.markStop('Elem.renderToJson');
  return json;
};

exports.renderToJsonString = function(el, context, pretty) {
  if (pretty) {
    return Json.stringify(exports.renderToJson(el, context), null, 2);
  }
  return Json.stringify(exports.renderToJson(el, context));
};

exports.renderToString = function(el, context) {
  Common.markStart('Elem.renderToString');
  var output = Stringifier(context);
  var str = renderToNode(el, output).render();
  Common.markStop('Elem.renderToString');
  return str;
};

exports.renderToStaticHtml = function(el) {
  Common.markStart('Elem.renderToStaticHtml');
  var str = renderToNode(el, Stringifier({ __noDataId: true })).render();
  Common.markStop('Elem.renderToStaticHtml');
  return str;
}

exports.el = el;

exports.sel = function(name, children) {
  return el(name, {}, children);
}; // simple node sel(name, children)

exports.vel = function(name, attrs) {
  return el(name, attrs, []);
}; // void node, cel(name, attrs)

exports.svg = function(name, attrs, children) {
  attrs.namespace = exports.svgNS;
  if (!children) {
    return el(name, {}, attrs);
  }
  return el(name, attrs, children);
};

exports.vsvg = function(name, attrs) {
  attrs.namespace = exports.svgNS;
  return el(name, attrs, []);
};

exports.nbsp = function(times) {
  return el('span', {
    __asHtml: _.times(times || 1, function() {
      return '&nbsp;';
    })
  });
};

exports.text = function(text) {
  return el('span', {}, text);
};

exports.renderWith = function(el) {
  Common.markStart('Elem.renderWith');
  var output = {};
  var context = {};
  if (arguments.length === 2) {
    output = arguments[1];
  }
  if (arguments.length === 3) {
    context = arguments[1];
    output = arguments[2];
  }
  context = context || {};
  var waitingHandlers = context.waitingHandlers || [];
  var refs = context.refs || {};
  var props = context.props || {};
  var __innerComponents = context.__innerComponents || [];
  var __rootListener = context.__rootListener || false;

  var renderContext = {
    waitingHandlers: waitingHandlers,
    refs: refs,
    props: props,
    __rootListener: __rootListener,
    __innerComponents: __innerComponents
  };
  output.setRenderContext(renderContext);
  var node = renderToNode(el, output, renderContext);
  Common.markStop('Elem.renderWith');
  return node;
};

//var DOMOuput = require('./output/dom');
//var DOMOuput = require('./output/incrementaldom');
var DOMOuput = require('./output/virtualdom');

exports.render = function(el, node, context) {
  Common.markStart('Elem.render');
  var output = DOMOuput(context);
  exports.renderWith(el, context, output).render(node);
  Common.markStop('Elem.render');
};
exports.unmountComponent = Components.unmountComponent;
exports.component = Components.component;
exports.componentToString = Components.componentToString;
exports.state = state;
exports.Utils = _;
exports.registerWebComponent = registerWebComponent;
exports.dispatcher = Dispatcher;
exports.Perf = {
  start: function() {
    Common.perfs = true;
  },
  stop: function() {
    Common.stop = false;
  },
  markStart: Common.markStart,
  markStop: Common.markStop,
  collectMeasures: Common.collectMeasures,
  printMeasures: Common.printMeasures
};
exports.defer = Common.defer;
exports.predicate = function(predicate, what) {
  if (_.isFunction(predicate)) {
    if (predicate() === true) {
      return what;
    } else {
      return undefined;
    }
  } else {
    if (predicate === true) {
      return what;
    } else {
      return undefined;
    }
  }
};
exports.style = function(obj) {
  var result = {};
  var keys = _.keys(obj);
  _.each(keys, function(key) {
    var clazz = obj[key];
    if (_.isObject(clazz)) {
      result[key] = _.extend({}, {
        extend: function(o) {
          return _.extend({}, o, clazz);
        }
      }, clazz);
    }
  });
  result.extend = _.extend({}, {
    extend: function(o) {
      return _.extend({}, o, obj);
    }
  }, obj);
  return result;
};

Common.__internalAccess.api = exports;

if (typeof define === 'function' && define.amd) {
  define('elem', [], function() {
    return module.exports;
  });
}

},{"./common":26,"./component":27,"./events":29,"./output/output":30,"./output/stringify":31,"./output/virtualdom":32,"./state":33,"./utils":34,"./webcomponent":35}],29:[function(require,module,exports){
var _ = require('./utils');

var eventSplitter = /\s+/;

module.exports = function() {

  var callbacks = [];

  function fireCallbacks(names, event) {
    var eventNames = [names];
    if (eventSplitter.test(names)) {
      eventNames = names.split(eventSplitter);
    }
    _.each(eventNames, function(name) {
      _.each(callbacks, function(callbackHash) {
        if (callbackHash.name === 'all') {
          callbackHash.callback(name, event);
        } else if (callbackHash.name === name) {
          callbackHash.callback(event);
        }
      });
    });
  }

  return {
    trigger: fireCallbacks,
    dispatch: fireCallbacks,
    on: function(name, callback) {
      this.off(name, callback);
      callbacks.push({
        name: name,
        callback: callback
      });
    },
    off: function(name, callback) {
      callbacks = _.filter(callbacks, function(obj) {
        if (obj.name === name && obj.callback === callback) {
          return false;
        }
        return true;
      });
    },
  };
};

},{"./utils":34}],30:[function(require,module,exports){
var _ = require('../utils');

module.exports = function jsonOutput(ctx) {
  ctx = ctx || {};

  function node(name, attrs, ns) {
    var attrs = attrs || [];
    var children = [];
    return {
      appendChild: function(child) {
        children.push(child);
      },
      render: function() {
        return {
          name: name,
          attrs: attrs,
          children: _.map(children, function(i) { return children.render(); })
        }
      }
    }
  }

  function createElementNS(ns, name, attrs) {
    return node(name, attrs, ns);
  }

  function createElement(name, attrs) {
    return node(name, attrs);
  }

  function createTextNode(str) {
    return {
      render: function() {
        return str;
      }
    };
  }

  return {
    name: 'JsonOutput',
    createTextNode: createTextNode,
    createElementNS: createElementNS,
    createElement: createElement
  };
}

},{"../utils":34}],31:[function(require,module,exports){
var Common = require('../common');
var _ = require('../utils');

module.exports = function stringifyDoc(ctx) {
  ctx = ctx || {};

  function node(name, attrs, ns) {
    var attrs = attrs || [];
    var children = [];
    return {
      appendChild: function(child) {
        children.push(child);
      },
      render: function() {
        if (this.value) {
          var value = this.value;
          children.push({
            render: function() {
              return value;
            }
          });
        }
        if (this.innerHTML) {
          var html = this.innerHTML;
          children.push({
            render: function() {
              return html;
            }
          });
        }
        attrs = _.map(attrs, function(attr) {
          var key = attr.key;
          var value = attr.value;
          if (key === 'data-nodeid') {
            if (!ctx.__noDataId) {
              return 'data-snodeid' + '="' + value + '"';
            }
            return '';
          } else {
            return key + '="' + value + '"';
          }
        });
        var selfCloseTag = _.contains(Common.voidElements, name.toUpperCase()) && children.length === 0;
        if (selfCloseTag) return '<' + name + ' ' + attrs.join(' ') + ' />';
        return '<' + name + ' ' + attrs.join(' ') + '>' + _.map(children, function(child) {
          return child.render();
        }).join('') + '</' + name + '>';
      }
    }
  }

  function createElementNS(ns, name, attrs) {
    return node(name, attrs, ns);
  }

  function createElement(name, attrs) {
    return node(name, attrs);
  }

  function createTextNode(str) {
    return {
      render: function() {
        return str;
      }
    };
  }

  return {
    name: 'StringOutput',
    createTextNode: createTextNode,
    createElementNS: createElementNS,
    createElement: createElement
  };
}

},{"../common":26,"../utils":34}],32:[function(require,module,exports){
var _ = require('../utils');
var Common = require('../common');

var diff = require('virtual-dom/diff');
var patch = require('virtual-dom/patch');
var VDOMCreateElement = require('virtual-dom/create-element');
var VNode = require('virtual-dom/vnode/vnode');
var VText = require('virtual-dom/vnode/vtext');

var treeCache = {};

module.exports = function domOutput(ctx) {
  ctx = ctx || {};

  var renderContext = {};
  var doc = document;

  function setRenderContext(c) {
    renderContext = c;
  }

  function node(name, attrs, ns) {
    attrs = attrs || [];
    var children = [];
    return {
      appendChild: function(child) {
        children.push(child);
      },
      render: function(node) {
        function getAttrs() {
          var newAttrs = {};
          var nodeId = undefined;
          newAttrs.attributes = {};
          _.each(attrs, function(o) {
            if (o.key === 'data-nodeid') {
              nodeId = o.value;
            }
            if (o.key === 'style') {
              newAttrs.attributes.style = o.value;
            } else if (o.key === 'class') {
              newAttrs.attributes['class'] = o.value;
            } else {
              newAttrs.attributes[o.key] = o.value;
            }
          });
          if (!renderContext.__rootListener) { // external listener here
            _.each(renderContext.waitingHandlers, function(handler) { // handler on each concerned node
              if (handler.id === nodeId) {
                newAttrs[handler.event] = function() {
                  handler.callback.apply({}, arguments);
                };
              }
            });
          }
          return newAttrs;
        }

        if (node) {
          var doc = document;
          if (node.ownerDocument) {
            doc = node.ownerDocument;
          }
          if (_.isString(node)) {
            node = doc.querySelector(node);
          }
          if (node !== null) {
            var rootId = node.getAttribute('data-rootid');
            if (!rootId) {
              rootId = _.uniqueId('data-rootid-');
              node.setAttribute('data-rootid', rootId);
            }
            var oldDom = treeCache[rootId];
            if (!oldDom) {
              var tree = new VNode(name, getAttrs(), _.map(children, function(c) { return c.render(); }), attrs.key, ns);
              var rootNode = VDOMCreateElement(tree);
              node.appendChild(rootNode);
              treeCache[rootId] = {
                tree: tree,
                rootNode: rootNode
              };
            } else {
              var newTree = new VNode(name, getAttrs(), _.map(children, function(c) { return c.render(); }), attrs.key, ns);
              var patches = diff(oldDom.tree, newTree);
              var rootNode = patch(oldDom.rootNode, patches);
              treeCache[rootId] = {
                tree: newTree,
                rootNode: rootNode
              };
            }
          }
        } else {
          return new VNode(name, getAttrs(), _.map(children, function(c) { return c.render(); }));
        }
      }
    }
  }

  function createElementNS(ns, name, attrs) {
    return node(name, attrs, ns);
  }

  function createElement(name, attrs) {
    return node(name, attrs);
  }

  function createTextNode(str) {
    return {
      render: function() {
        return new VText(str);
      }
    };
  }

  return {
    name: 'VirtualDOMOuput',
    createTextNode: createTextNode,
    createElementNS: createElementNS,
    createElement: createElement,
    setRenderContext: setRenderContext
  };
}

},{"../common":26,"../utils":34,"virtual-dom/create-element":2,"virtual-dom/diff":3,"virtual-dom/patch":7,"virtual-dom/vnode/vnode":21,"virtual-dom/vnode/vtext":23}],33:[function(require,module,exports){
var _ = require('./utils');

module.exports = function(mod) {

  var theModel = _.extend({}, mod || {});

  var callbacks = [];

  function fireCallbacks() {
    _.each(callbacks, function(callback) {
      callback();
    });
  }

  var api = function() {
    return _.clone(theModel);
  };

  function set(obj, silentOrCallback) {
    var silent = _.isBoolean(silentOrCallback) && silentOrCallback === true;
    if (!_.isUndefined(obj) && _.isObject(obj)) {
      _.map(_.keys(obj), function(k) {
        theModel[k] = obj[k];
      });
      if (!silent) fireCallbacks();
      if (!silent)(silentOrCallback || function() {})();
    }
  }

  return _.extend(api, {
    onChange: function(callback) {
      callbacks.push(callback);
    },
    get: function(key) {
      return theModel[key];
    },
    all: function() {
      return _.clone(theModel);
    },
    forceUpdate: function() {
      fireCallbacks();
    },
    set: set,
    replace: function(obj, silentOrCallback) {
      theModel = {};
      set(obj, silentOrCallback);
    },
    remove: function(key) {
      delete theModel[key];
      fireCallbacks();
    }
  });
};

},{"./utils":34}],34:[function(require,module,exports){
(function (global){
function getGlobalObject() {
  // Workers don’t have `window`, only `self`
  if (typeof self !== undefined) {
    return self;
  }
  if (typeof global !== undefined) {
    return global;
  }
  if (typeof window !== undefined) {
    return window;
  }
  // Not all environments allow eval and Function
  // Use only as a last resort:
  return new Function('return this')();
}

//var __idCounter = 0;
var globalObject = getGlobalObject() || {}; //global || window || {};

globalObject.__ElemInternals = globalObject.__ElemInternals || {};
globalObject.__ElemInternals.Utils = globalObject.__ElemInternals.Utils || {};
globalObject.__ElemInternals.Utils.__idCounter = globalObject.__ElemInternals.Utils.__idCounter || 0;

var escapeMap = {
  '&': '&amp;',
  '<': '&lt;',
  '>': '&gt;',
  '"': '&quot;',
  "'": '&#x27;',
  '`': '&#x60;'
};

var createEscaper = function(map, keys) {
  var escaper = function(match) {
    return map[match];
  };
  var source = '(?:' + keys(map).join('|') + ')';
  var testRegexp = RegExp(source);
  var replaceRegexp = RegExp(source, 'g');
  return function(string) {
    string = string == null ? '' : '' + string;
    return testRegexp.test(string) ? string.replace(replaceRegexp, escaper) : string;
  };
};

function keys(obj) {
  if (!isObject(obj)) return [];
  if (Object.keys) return Object.keys(obj);
  var keys = [];
  for (var key in obj)
    if (has(obj, key)) keys.push(key);
  return keys;
}

function values(obj) {
  var keys = keys(obj);
  var length = keys.length;
  var values = Array(length);
  for (var i = 0; i < length; i++) {
    values[i] = obj[keys[i]];
  }
  return values;
}

function indexOf(array, item, isSorted) {
  if (array == null) return -1;
  var i = 0,
    length = array.length;
  if (isSorted) {
    if (typeof isSorted == 'number') {
      i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
    } else {
      i = sortedIndex(array, item);
      return array[i] === item ? i : -1;
    }
  }
  for (; i < length; i++)
    if (array[i] === item) return i;
  return -1;
}

function each(obj, func) {
  if (obj == null) return obj;
  var i, length = obj.length;
  if (length === +length) {
    for (i = 0; i < length; i++) {
      func(obj[i], i, obj);
    }
  } else {
    var keys = keys(obj);
    for (i = 0, length = keys.length; i < length; i++) {
      func(obj[keys[i]], keys[i], obj);
    }
  }
  return obj;
}

function map(obj, func) {
  if (obj == null) return [];
  var keys = obj.length !== +obj.length && keys(obj),
    length = (keys || obj).length,
    results = Array(length),
    currentKey;
  for (var index = 0; index < length; index++) {
    currentKey = keys ? keys[index] : index;
    results[index] = func(obj[currentKey], currentKey, obj);
  }
  return results;
}

function filter(obj, predicate) {
  var results = [];
  if (obj == null) return results;
  each(obj, function(value, index, list) {
    if (predicate(value, index, list)) results.push(value);
  });
  return results;
}

function reduce(obj, iteratee, memo, context) {
  if (obj == null) obj = [];
  var keys = obj.length !== +obj.length && keys(obj),
    length = (keys || obj).length,
    index = 0,
    currentKey;
  if (arguments.length < 3) {
    if (!length) throw new TypeError(reduceError);
    memo = obj[keys ? keys[index++] : index++];
  }
  for (; index < length; index++) {
    currentKey = keys ? keys[index] : index;
    memo = iteratee(memo, obj[currentKey], currentKey, obj);
  }
  return memo;
}

function reject(obj, predicate, context) {
  return filter(obj, negate(predicate), context);
}

function where(obj, attrs) {
  return filter(obj, matches(attrs));
}

function matches(attrs) {
  var pairs = pairs(attrs),
    length = pairs.length;
  return function(obj) {
    if (obj == null) return !length;
    obj = new Object(obj);
    for (var i = 0; i < length; i++) {
      var pair = pairs[i],
        key = pair[0];
      if (pair[1] !== obj[key] || !(key in obj)) return false;
    }
    return true;
  };
}

function identity(value) {
  return value;
}

function property(key) {
  return function(obj) {
    return obj[key];
  };
}

function negate(predicate) {
  return function() {
    return !predicate.apply(this, arguments);
  };
}

function pairs(obj) {
  var keys = keys(obj);
  var length = keys.length;
  var pairs = Array(length);
  for (var i = 0; i < length; i++) {
    pairs[i] = [keys[i], obj[keys[i]]];
  }
  return pairs;
}

function chain(obj) {
  var internalObj = obj;
  var under = this;

  function chainableApi() {
    return {
      value: function() {
        return internalObj;
      },
      map: function(func) {
        internalObj = under.map(internalObj, func);
        return this;
      },
      filter: function(func) {
        internalObj = under.filter(internalObj, func);
        return this;
      },
      each: function(func) {
        under.each(internalObj, func);
        return this;
      },
      values: function() {
        return under.values();
      },
      keys: function() {
        return under.keys();
      },
      reduce: function(iteratee, memo, context) {
        return under.reduce(internalObj, iteratee, memo, context);
      },
      reject: function(predicate, context) {
        internalObj = under.reject(internalObj, predicate, context);
        return this;
      },
      where: function(attrs) {
        internalObj = under.where(internalObj, attrs);
        return this;
      }
    };
  }
  return chainableApi();
}

function contains(obj, target) {
  if (obj == null) return false;
  if (obj.length !== +obj.length) obj = values(obj);
  return indexOf(obj, target) >= 0;
}

function uniqueId(prefix) {
  var id = ++globalObject.__ElemInternals.Utils.__idCounter + '';
  return prefix ? prefix + id : id;
}

function times(n, func) {
  var results = [];
  for (var i = 0; i < n; i++) {
    results.push(func(n));
  }
  return results;
}

function clone(obj) {
  if (!isObject(obj)) return obj;
  return isArray(obj) ? obj.slice() : extend({}, obj);
}

function extend(obj) {
  if (!isObject(obj)) return obj;
  var source, prop;
  for (var i = 1, length = arguments.length; i < length; i++) {
    source = arguments[i];
    for (prop in source) {
      if (Object.prototype.hasOwnProperty.call(source, prop)) {
        obj[prop] = source[prop];
      }
    }
  }
  return obj;
}

function isUndefined(obj) {
  return obj === void 0;
}

function isArray(obj) {
  if (Array.isArray) return Array.isArray(obj);
  return Object.prototype.toString.call(obj) === '[object Array]';
}

function isObject(obj) {
  var type = typeof obj;
  return type === 'function' || type === 'object' && !!obj;
}

function isNumber(obj) {
  return Object.prototype.toString.call(obj) === '[object Number]';
}

function isString(obj) {
  return Object.prototype.toString.call(obj) === '[object String]';
}

function isBoolean(obj) {
  return obj === true || obj === false || Object.prototype.toString.call(obj) === '[object Boolean]';
}

function isRegExp(obj) {
  return Object.prototype.toString.call(obj) === '[object RegExp]';
}

function isFunction(obj) {
  return Object.prototype.toString.call(obj) === '[object Function]';
}

function isNull(obj) {
  return obj === null;
}

function isNaN(obj) {
  return isNumber(obj) && obj !== +obj;
}

function has(obj, key) {
  return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
}

function dasherize(what) {
  return what.replace(/([A-Z\d]+)([A-Z][a-z])/g, '$1_$2')
    .replace(/([a-z\d])([A-Z])/g, '$1_$2')
    .toLowerCase().replace(/_/g, '-');
}

function startsWith(source, start) {
  return source.indexOf(start) === 0;
}

function focus(elem) {
  if (elem.focus) elem.focus();
}

function hasFocus(elem) {
  return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex);
}

function on(nodeExpression, types, callback) {
  var actual = isString(nodeExpression) ? document.querySelector(nodeExpression) : nodeExpression;
  each(types, function(type) {
    if (actual && actual !== null) {
      if (actual.addEventListener) {
        actual.addEventListener(type, callback, false); // does not work in ff 3.5 without false
      } else if (actual.attachEvent) {
        actual.addEventListener(type, callback); // work in ie
      }
    }
  });
}

function off(node, types, callback) {
  var actual = isString(node) ? document.querySelector(node) : node;
  each(types, function(type) {
    if (actual && actual !== null) {
      if (actual.removeEventListener) {
        actual.removeEventListener(type, callback, false); // does not work in ff 3.5 without false
      }
    }
  });
}

function findNode(selector) {
  return document.querySelector(selector);
}

// Works with deep structures
function keyMirror(obj, p) {
  var prefix = p;
  if (!prefix) {
    prefix = '';
  }
  var ret = {};
  var key;
  if (!(obj instanceof Object && !Array.isArray(obj))) {
    throw new Error('keyMirror(...): Argument must be an object.');
  }
  for (key in obj) {
    if (!obj.hasOwnProperty(key)) {
      continue;
    }
    if (obj[key] instanceof Object) {
      ret[key] = keyMirror(obj[key], key + '.');
    } else {
      ret[key] = prefix + key;
    }
  }
  return ret;
}

function memoize(func) {
  var cache = undefined;
  return function() {
    if (!cache) {
      cache = func();
    }
    return cache;
  };
}

exports.escape = createEscaper(escapeMap, keys);
exports.keys = keys;
exports.values = values;
exports.indexOf = indexOf;
exports.each = each;
exports.map = map;
exports.filter = filter;
exports.chain = chain;
exports.contains = contains;
exports.uniqueId = uniqueId;
exports.times = times;
exports.clone = clone;
exports.extend = extend;
exports.isUndefined = isUndefined;
exports.isArray = isArray;
exports.isObject = isObject;
exports.isNumber = isNumber;
exports.isString = isString;
exports.isBoolean = isBoolean;
exports.isRegExp = isRegExp;
exports.isFunction = isFunction;
exports.isNull = isNull;
exports.isNaN = isNaN;
exports.has = has;
exports.dasherize = dasherize;
exports.startsWith = startsWith;
exports.focus = focus;
exports.hasFocus = hasFocus;
exports.on = on;
exports.off = off;
exports.findNode = findNode;
exports.reduce = reduce;
exports.reject = reject;
exports.where = where;
exports.matches = matches;
exports.negate = negate;
exports.property = property;
exports.identity = identity;
exports.pairs = pairs;
exports.keyMirror = keyMirror;
exports.globalObject = getGlobalObject;
exports.memoize = memoize;
exports.memoGobalObject = memoize(getGlobalObject);

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{}],35:[function(require,module,exports){
var EventBus = require('./events');
var Utils = require('./utils');
var registrationFunction = undefined

try {
  registrationFunction = (document.registerElement || document.register || function() {
    if (window.console) console.error('[ELEMJS] No registerElement function, webcomponents will not work !!!');
  }).bind(document);
} catch (e) {}

var Bus = EventBus();

function registerWebComponent(tag, elem) {
  var thatDoc = document;
  var ElementProto = Object.create(HTMLElement.prototype);

  ElementProto.createdCallback = function() {
    var elemInstance = Utils.extend({}, elem);
    this._id = Utils.uniqueId('WebComponent_');
    var props = {};
    for (var i in this.attributes) {
      var item = this.attributes[i];
      props[item.name] = item.value;
    }
    this.props = props;
    var theNode = undefined;
    theNode = thatDoc.createElement('content');
    theNode.setAttribute('class', 'elemcomponent');
    theNode.setAttribute('id', this._id);
    if (props.shadow) {
      var shadowRoot = this.createShadowRoot();
      shadowRoot.appendChild(theNode);
    } else {
      this.appendChild(theNode);
    }
    this._theNode = theNode;
    this._internalBus = EventBus();
    this._internalBus._trigger = this._internalBus.trigger;
    this._internalBus.trigger = function(name, evt) {
      Bus.trigger('ElemEvent', {
        name: name,
        id: this._id,
        payload: evt
      });
    }.bind(this);

    Bus.on('ElemEvent', function(evt) {
      var from = evt.id;
      if (from !== this._id) {
        var name = evt.name;
        var payload = evt.payload;
        this._internalBus._trigger(name, payload);
      }
    }.bind(this));

    props.componentsBus = this._internalBus;

    if (props.renderOnly && props.renderOnly === true) {
      this.renderedElement = Elem.render(elemInstance, node);
    } else {
      this.renderedElement = Elem.component({
        container: theNode,
        init: elemInstance.init,
        render: elemInstance.render,
        defaultProps: function() {
          return props;
        },
        initialState: elemInstance.initialState
      });
    }
  };

  ElementProto.attributeChangedCallback = function(attr, oldVal, newVal) {
    var elemInstance = Utils.extend({}, elem);
    this.props[attr] = newVal;
    var props = this.props;
    if (this.props.renderOnly && this.props.renderOnly === true) {
      this.renderedElement = Elem.render(elemInstance, this._node);
    } else {
      this.renderedElement = Elem.component({
        container: this._node,
        init: elemInstance.init,
        render: elemInstance.render,
        props: props,
        state: elemInstance.state
      });
    }
  };

  registrationFunction(tag, {
    prototype: ElementProto
  });
}

if (registrationFunction) {
  exports.registerWebComponent = registerWebComponent;
} else {
  exports.registerWebComponent = function() {
    if (window.console) console.error('[ELEMJS] WebComponent not available here :(');
  };
}

},{"./events":29,"./utils":34}]},{},[28])(28)
});