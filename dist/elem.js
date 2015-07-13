!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Elem=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
// shim for using process in browser

var process = module.exports = {};

process.nextTick = (function () {
    var canSetImmediate = typeof window !== 'undefined'
    && window.setImmediate;
    var canMutationObserver = typeof window !== 'undefined'
    && window.MutationObserver;
    var canPost = typeof window !== 'undefined'
    && window.postMessage && window.addEventListener
    ;

    if (canSetImmediate) {
        return function (f) { return window.setImmediate(f) };
    }

    var queue = [];

    if (canMutationObserver) {
        var hiddenDiv = document.createElement("div");
        var observer = new MutationObserver(function () {
            var queueList = queue.slice();
            queue.length = 0;
            queueList.forEach(function (fn) {
                fn();
            });
        });

        observer.observe(hiddenDiv, { attributes: true });

        return function nextTick(fn) {
            if (!queue.length) {
                hiddenDiv.setAttribute('yes', 'no');
            }
            queue.push(fn);
        };
    }

    if (canPost) {
        window.addEventListener('message', function (ev) {
            var source = ev.source;
            if ((source === window || source === null) && ev.data === 'process-tick') {
                ev.stopPropagation();
                if (queue.length > 0) {
                    var fn = queue.shift();
                    fn();
                }
            }
        }, true);

        return function nextTick(fn) {
            queue.push(fn);
            window.postMessage('process-tick', '*');
        };
    }

    return function nextTick(fn) {
        setTimeout(fn, 0);
    };
})();

process.title = 'browser';
process.browser = true;
process.env = {};
process.argv = [];

function noop() {}

process.on = noop;
process.addListener = noop;
process.once = noop;
process.off = noop;
process.removeListener = noop;
process.removeAllListeners = noop;
process.emit = noop;

process.binding = function (name) {
    throw new Error('process.binding is not supported');
};

// TODO(shtylman)
process.cwd = function () { return '/' };
process.chdir = function (dir) {
    throw new Error('process.chdir is not supported');
};

},{}],2:[function(require,module,exports){
/**
 * @license
 * Copyright 2015 The Incremental DOM Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var patch = require('./src/patch').patch;
var elements = require('./src/virtual_elements');

module.exports = {
  patch: patch,
  elementVoid: elements.elementVoid,
  elementOpenStart: elements.elementOpenStart,
  elementOpenEnd: elements.elementOpenEnd,
  elementOpen: elements.elementOpen,
  elementClose: elements.elementClose,
  text: elements.text,
  attr: elements.attr
};


},{"./src/patch":7,"./src/virtual_elements":10}],3:[function(require,module,exports){
/**
 * Copyright 2015 The Incremental DOM Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var nodes = require('./nodes'),
    createNode = nodes.createNode,
    getKey = nodes.getKey,
    getNodeName = nodes.getNodeName,
    getChild = nodes.getChild,
    registerChild = nodes.registerChild;
var markVisited = require('./traversal').markVisited;
var getWalker = require('./walker').getWalker;


/**
 * Checks whether or not a given node matches the specified nodeName and key.
 *
 * @param {?Node} node An HTML node, typically an HTMLElement or Text.
 * @param {?string} nodeName The nodeName for this node.
 * @param {?string} key An optional key that identifies a node.
 * @return {boolean} True if the node matches, false otherwise.
 */
var matches = function(node, nodeName, key) {
  return node &&
         key === getKey(node) &&
         nodeName === getNodeName(node);
};


/**
 * Aligns the virtual Element definition with the actual DOM, moving the
 * corresponding DOM node to the correct location or creating it if necessary.
 * @param {?string} nodeName For an Element, this should be a valid tag string.
 *     For a Text, this should be #text.
 * @param {?string} key The key used to identify this element.
 * @param {?Array<*>|string} statics For an Element, this should be an array of
 *     name-value pairs. For a Text, this should be the text content of the
 *     node.
 * @return {!Node} The matching node.
 */
var alignWithDOM = function(nodeName, key, statics) {
  var walker = getWalker();
  var currentNode = walker.currentNode;
  var parent = walker.getCurrentParent();
  var matchingNode;

  // Check to see if we have a node to reuse
  if (matches(currentNode, nodeName, key)) {
    matchingNode = currentNode;
  } else {
    var existingNode = key && getChild(parent, key);

    // Check to see if the node has moved within the parent or if a new one
    // should be created
    if (existingNode) {
      matchingNode = existingNode;
    } else {
      matchingNode = createNode(walker.doc, nodeName, key, statics);
      registerChild(parent, key, matchingNode);
    }

    parent.insertBefore(matchingNode, currentNode);
    walker.currentNode = matchingNode;
  }

  markVisited(parent, matchingNode);

  return matchingNode;
};


/** */
module.exports = {
  alignWithDOM: alignWithDOM
};


},{"./nodes":6,"./traversal":8,"./walker":11}],4:[function(require,module,exports){
/**
 * Copyright 2015 The Incremental DOM Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var getData = require('./node_data').getData;


/**
 * Applies an attribute or property to a given Element. If the value is a object
 * or a function (which includes null), it is set as a property on the Element.
 * Otherwise, the value is set as an attribute.
 * @param {!Element} el
 * @param {string} name The attribute's name.
 * @param {*} value The attribute's value. If the value is a string, it is set
 *     as an HTML attribute, otherwise, it is set on node.
 */
var applyAttr = function(el, name, value) {
  var data = getData(el);
  var attrs = data.attrs;

  if (attrs[name] === value) {
    return;
  }

  var type = typeof value;

  if (value === undefined) {
    el.removeAttribute(name);
  } else if (type === 'object' || type === 'function') {
    el[name] = value;
  } else {
    el.setAttribute(name, value);
  }

  attrs[name] = value;
};


/**
 * Applies a style to an Element. No vendor prefix expansion is done for
 * property names/values.
 * @param {!Element} el
 * @param {string|Object<string,string>} style The style to set. Either a string
 *     of css or an object containing property-value pairs.
 */
var applyStyle = function(el, style) {
  if (typeof style === 'string' || style instanceof String) {
    el.style.cssText = style;
  } else {
    el.style.cssText = '';

    for (var prop in style) {
      el.style[prop] = style[prop];
    }
  }
};


/**
 * Updates a single attribute on an Element. For some types (e.g. id or class),
 * the value is applied directly to the Element using the corresponding accessor
 * function.
 * @param {!Element} el
 * @param {string} name The attribute's name.
 * @param {*} value The attribute's value. If the value is a string, it is set
 *     as an HTML attribute, otherwise, it is set on node.
 */
var updateAttribute = function(el, name, value) {
  switch (name) {
    case 'id':
      el.id = value;
      break;
    case 'class':
      el.className = value;
      break;
    case 'tabindex':
      el.tabIndex = value;
      break;
    case 'style':
      applyStyle(el, value);
      break;
    default:
      applyAttr(el, name, value);
      break;
  }
};


/** */
module.exports = {
  updateAttribute: updateAttribute
};


},{"./node_data":5}],5:[function(require,module,exports){
/**
 * Copyright 2015 The Incremental DOM Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */


/**
 * Keeps track of information needed to perform diffs for a given DOM node.
 * @param {?string} nodeName
 * @param {?string} key
 * @constructor
 */
function NodeData(nodeName, key) {
  /**
   * The attributes and their values.
   * @const
   */
  this.attrs = {};

  /**
   * An array of attribute name/value pairs, used for quickly diffing the
   * incomming attributes to see if the DOM node's attributes need to be
   * updated.
   * @const {Array<*>}
   */
  this.attrsArr = [];

  /**
   * The incoming attributes for this Node, before they are updated.
   * @const {!Object<string, *>}
   */
  this.newAttrs = {};

  /**
   * The key used to identify this node, used to preserve DOM nodes when they
   * move within their parent.
   * @const
   */
  this.key = key;

  /**
   * Keeps track of children within this node by their key.
   * {?Object<string, Node>}
   */
  this.keyMap = null;

  /**
   * The last child to have been visited within the current pass.
   * {?Node}
   */
  this.lastVisitedChild = null;

  /**
   * The node name for this node.
   * @const
   */
  this.nodeName = nodeName;

  /**
   * @const {string}
   */
  this.text = null;
}


/**
 * Initializes a NodeData object for a Node.
 *
 * @param {!Node} node The node to initialze data for.
 * @param {string} nodeName The node name of node.
 * @param {?string} key The key that identifies the node.
 * @return {!NodeData} The newly initialized data object
 */
var initData = function(node, nodeName, key) {
  var data = new NodeData(nodeName, key);
  node['__incrementalDOMData'] = data;
  return data;
};


/**
 * Retrieves the NodeData object for a Node, creating it if necessary.
 *
 * @param {!Node} node The node to retrieve the data for.
 * @return {NodeData} The NodeData for this Node.
 */
var getData = function(node) {
  var data = node['__incrementalDOMData'];

  if (!data) {
    var nodeName = node.nodeName.toLowerCase();
    var key = null;

    if (node instanceof Element) {
      key = node.getAttribute('key');
    }

    data = initData(node, nodeName, key);
  }

  return data;
};


/** */
module.exports = {
  getData: getData,
  initData: initData
};


},{}],6:[function(require,module,exports){
/**
 * Copyright 2015 The Incremental DOM Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var updateAttribute = require('./attributes').updateAttribute;
var nodeData = require('./node_data'),
    getData = nodeData.getData,
    initData = nodeData.initData;


/**
 * Creates an Element.
 * @param {!Document} doc The document with which to create the Element.
 * @param {string} tag The tag for the Element.
 * @param {?string} key A key to identify the Element.
 * @param {?Array<*>} statics An array of attribute name/value pairs of
 *     the static attributes for the Element.
 * @return {!Element}
 */
var createElement = function(doc, tag, key, statics) {
  var el = doc.createElement(tag);
  initData(el, tag, key);

  if (statics) {
    for (var i = 0; i < statics.length; i += 2) {
      updateAttribute(el, statics[i], statics[i + 1]);
    }
  }

  return el;
};

/**
 * Creates a Text.
 * @param {!Document} doc The document with which to create the Text.
 * @param {string} text The intial content of the Text.
 * @return {!Text}
 */
var createTextNode = function(doc, text) {
  var node = doc.createTextNode(text);
  getData(node).text = text;

  return node;
};


/**
 * Creates a Node, either a Text or an Element depending on the node name
 * provided.
 * @param {!Document} doc The document with which to create the Node.
 * @param {string} nodeName The tag if creating an element or #text to create
 *     a Text.
 * @param {?string} key A key to identify the Element.
 * @param {?Array<*>|string} statics The static data to initialize the Node
 *     with. For an Element, an array of attribute name/value pairs of
 *     the static attributes for the Element. For a Text, a string with the
 *     intial content of the Text.
 * @return {!Node}
 */
var createNode = function(doc, nodeName, key, statics) {
  if (nodeName === '#text') {
    return createTextNode(doc, statics);
  }

  return createElement(doc, nodeName, key, statics);
};


/**
 * Creates a mapping that can be used to look up children using a key.
 * @param {!Element} el
 * @return {!Object<string, !Node>} A mapping of keys to the children of the
 *     Element.
 */
var createKeyMap = function(el) {
  var map = {};
  var children = el.children;
  var count = children.length;

  for (var i = 0; i < count; i += 1) {
    var child = children[i];
    var key = getKey(child);

    if (key) {
      map[key] = child;
    }
  }

  return map;
};


/**
 * @param {?Node} node A node to get the key for.
 * @return {?string} The key for the Node, if applicable.
 */
var getKey = function(node) {
  return getData(node).key;
};


/**
 * @param {?Node} node A node to get the node name for.
 * @return {?string} The node name for the Node, if applicable.
 */
var getNodeName = function(node) {
  return getData(node).nodeName;
};


/**
 * Retrieves the mapping of key to child node for a given Element, creating it
 * if necessary.
 * @param {!Element} el
 * @return {!Object<string,!Node>} A mapping of keys to child Nodes
 */
var getKeyMap = function(el) {
  var data = getData(el);

  if (!data.keyMap) {
    data.keyMap = createKeyMap(el);
  }

  return data.keyMap;
};


/**
 * Retrieves a child from the parent with the given key.
 * @param {!Element} parent
 * @param {?string} key
 * @return {?Node} The child corresponding to the key.
 */
var getChild = function(parent, key) {
  return getKeyMap(parent)[key];
};


/**
 * Registers a node as being a child. If a key is provided, the parent will
 * keep track of the child using the key. The child can be retrieved using the
 * same key using getKeyMap. The provided key should be unique within the
 * parent Element.
 * @param {!Element} parent The parent of child.
 * @param {?string} key A key to identify the child with.
 * @param {!Node} child The child to register.
 */
var registerChild = function(parent, key, child) {
  if (key) {
    getKeyMap(parent)[key] = child;
  }
};


/** */
module.exports = {
  createNode: createNode,
  getKey: getKey,
  getNodeName: getNodeName,
  getChild: getChild,
  registerChild: registerChild
};


},{"./attributes":4,"./node_data":5}],7:[function(require,module,exports){
/**
 * Copyright 2015 The Incremental DOM Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var traversal = require('./traversal'),
    firstChild = traversal.firstChild,
    parentNode = traversal.parentNode;
var TreeWalker = require('./tree_walker');
var walker = require('./walker'),
    getWalker = walker.getWalker,
    setWalker = walker.setWalker;


/**
 * Patches the document starting at el with the provided function. This function
 * may be called during an existing patch operation.
 * @param {!Element} el the element to patch
 * @param {!function} fn A function containing elementOpen/elementClose/etc.
 *     calls that describe the DOM.
 */
var patch = function(el, fn) {
  var prevWalker = getWalker();
  setWalker(new TreeWalker(el));

  firstChild();
  fn();
  parentNode();

  setWalker(prevWalker);
};


/** */
module.exports = {
  patch: patch
};


},{"./traversal":8,"./tree_walker":9,"./walker":11}],8:[function(require,module,exports){
/**
 * Copyright 2015 The Incremental DOM Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var getWalker = require('./walker').getWalker;
var getData = require('./node_data').getData;


/**
 * Enters a Element, clearing out the last visited child field.
 * @param {!Element} node
 */
var enterNode = function(node) {
  var data = getData(node);
  data.lastVisitedChild = null;
};


/**
 * Clears out any unvisited Nodes, as the corresponding virtual element
 * functions were never called for them.
 * @param {!Element} node
 */
var exitNode = function(node) {
  var data = getData(node);
  var lastVisitedChild = data.lastVisitedChild;

  if (node.lastChild === lastVisitedChild) {
    return;
  }

  while (node.lastChild !== lastVisitedChild) {
    node.removeChild(node.lastChild);
  }

  // Invalidate the key map since we removed children. It will get recreated
  // next time we need it.
  data.keyMap = null;
};


/**
 * Marks a parent as having visited a child.
 * @param {!Element} parent
 * @param {!Node} child
 */
var markVisited = function(parent, child) {
  var data = getData(parent);
  data.lastVisitedChild = child;
};


/**
 * Changes to the first child of the current node.
 */
var firstChild = function() {
  var walker = getWalker();
  enterNode(walker.currentNode);
  walker.firstChild();
};


/**
 * Changes to the next sibling of the current node.
 */
var nextSibling = function() {
  var walker = getWalker();
  walker.nextSibling();
};


/**
 * Changes to the parent of the current node, removing any unvisited children.
 */
var parentNode = function() {
  var walker = getWalker();
  walker.parentNode();
  exitNode(walker.currentNode);
};


/** */
module.exports = {
  firstChild: firstChild,
  nextSibling: nextSibling,
  parentNode: parentNode,
  markVisited: markVisited
};


},{"./node_data":5,"./walker":11}],9:[function(require,module,exports){
/**
 * Copyright 2015 The Incremental DOM Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * Similar to the built-in Treewalker class, but simplified and allows direct
 * access to modify the currentNode property.
 * @param {!Node} node The root Node of the subtree the walker should start
 *     traversing.
 * @constructor
 */
function TreeWalker(node) {
  /**
   * Keeps track of the current parent node. This is necessary as the traversal
   * methods may traverse past the last child and we still need a way to get
   * back to the parent.
   * @const @private {!Array<!Node>}
   */
  this.stack_ = [];

  /** {?Node} */
  this.currentNode = node;

  /** {!Document} */
  this.doc = node.ownerDocument;
}


/**
 * @return {!Node} The current parent of the current location in the subtree.
 */
TreeWalker.prototype.getCurrentParent = function() {
  return this.stack_[this.stack_.length - 1];
};


/**
 * Changes the current location the firstChild of the current location.
 */
TreeWalker.prototype.firstChild = function() {
  this.stack_.push(this.currentNode);
  this.currentNode = this.currentNode.firstChild;
};


/**
 * Changes the current location the nextSibling of the current location.
 */
TreeWalker.prototype.nextSibling = function() {
  this.currentNode = this.currentNode.nextSibling;
};


/**
 * Changes the current location the parentNode of the current location.
 */
TreeWalker.prototype.parentNode = function() {
  this.currentNode = this.stack_.pop();
};


/** */
module.exports = TreeWalker;


},{}],10:[function(require,module,exports){
(function (process){
/**
 * Copyright 2015 The Incremental DOM Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

var alignWithDOM = require('./alignment').alignWithDOM;
var updateAttribute = require('./attributes').updateAttribute;
var getData = require('./node_data').getData;
var getWalker = require('./walker').getWalker;
var traversal = require('./traversal'),
    firstChild = traversal.firstChild,
    nextSibling = traversal.nextSibling,
    parentNode = traversal.parentNode;


/**
 * The offset in the virtual element declaration where the attributes are
 * specified.
 * @const
 */
var ATTRIBUTES_OFFSET = 3;


/**
 * Builds an array of arguments for use with elementOpenStart, attr and
 * elementOpenEnd.
 * @type {Array<*>}
 * @const
 */
var argsBuilder = [];


if (process.env.NODE_ENV !== 'production') {
  /**
   * Keeps track whether or not we are in an attributes declaration (after
   * elementOpenStart, but before elementOpenEnd).
   * @type {boolean}
   */
  var inAttributes = false;


  /** Makes sure that the caller is not where attributes are expected. */
  var assertNotInAttributes = function() {
    if (inAttributes) {
      throw new Error('Was not expecting a call to attr or elementOpenEnd, ' +
          'they must follow a call to elementOpenStart.');
    }
  };


  /** Makes sure that the caller is where attributes are expected. */
  var assertInAttributes = function() {
    if (!inAttributes) {
      throw new Error('Was expecting a call to attr or elementOpenEnd. ' +
          'elementOpenStart must be followed by zero or more calls to attr, ' +
          'then one call to elementOpenEnd.');
    }
  };


  /** Updates the state to being in an attribute declaration. */
  var setInAttributes = function() {
    inAttributes = true;
  };


  /** Updates the state to not being in an attribute declaration. */
  var setNotInAttributes = function() {
    inAttributes = false;
  };
}


/**
 * Checks to see if one or more attributes have changed for a given
 * Element. When no attributes have changed, this function is much faster than
 * checking each individual argument. When attributes have changed, the overhead
 * of this function is minimal.
 *
 * This function is called in the context of the Element and the arguments from
 * elementOpen-like function so that the arguments are not de-optimized.
 *
 * @this {Element} The Element to check for changed attributes.
 * @param {*} unused1
 * @param {*} unused2
 * @param {*} unused3
 * @param {...*} var_args Attribute name/value pairs of the dynamic attributes
 *     for the Element.
 * @return {boolean} True if the Element has one or more changed attributes,
 *     false otherwise.
 */
var hasChangedAttrs = function(unused1, unused2, unused3, var_args) {
  var data = getData(this);
  var attrsArr = data.attrsArr;
  var attrsChanged = false;
  var i;

  for (i = ATTRIBUTES_OFFSET; i < arguments.length; i += 2) {
    // Translate the from the arguments index (for values) to the attribute's
    // ordinal. The attribute values are at arguments index 3, 5, 7, etc. To get
    // the ordinal, need to subtract the offset and divide by 2
    if (attrsArr[(i - ATTRIBUTES_OFFSET) >> 1] !== arguments[i + 1]) {
      attrsChanged = true;
      break;
    }
  }

  if (attrsChanged) {
    for (i = ATTRIBUTES_OFFSET; i < arguments.length; i += 2) {
      attrsArr[(i - ATTRIBUTES_OFFSET) >> 1] = arguments[i + 1];
    }
  }

  return attrsChanged;
};


/**
 * Updates the newAttrs object for an Element.
 *
 * This function is called in the context of the Element and the arguments from
 * elementOpen-like function so that the arguments are not de-optimized.
 *
 * @this {Element} The Element to update newAttrs for.
 * @param {*} unused1
 * @param {*} unused2
 * @param {*} unused3
 * @param {...*} var_args Attribute name/value pairs of the dynamic attributes
 *     for the Element.
 * @return {!Object<string, *>} The updated newAttrs object.
 */
var updateNewAttrs = function(unused1, unused2, unused3, var_args) {
  var node = this;
  var data = getData(node);
  var newAttrs = data.newAttrs;

  for (var attr in newAttrs) {
    newAttrs[attr] = undefined;
  }

  for (var i = ATTRIBUTES_OFFSET; i < arguments.length; i += 2) {
    newAttrs[arguments[i]] = arguments[i + 1];
  }

  return newAttrs;
};


/**
 * Updates the attributes for a given Element.
 * @param {!Element} node
 * @param {!Object<string,*>} newAttrs The new attributes for node
 */
var updateAttributes = function(node, newAttrs) {
  for (var attr in newAttrs) {
    updateAttribute(node, attr, newAttrs[attr]);
  }
};


/**
 * Declares a virtual Element at the current location in the document. This
 * corresponds to an opening tag and a elementClose tag is required.
 * @param {string} tag The element's tag.
 * @param {?string} key The key used to identify this element. This can be an
 *     empty string, but performance may be better if a unique value is used
 *     when iterating over an array of items.
 * @param {?Array<*>} statics An array of attribute name/value pairs of the
 *     static attributes for the Element. These will only be set once when the
 *     Element is created.
 * @param {...*} var_args Attribute name/value pairs of the dynamic attributes
 *     for the Element.
 */
var elementOpen = function(tag, key, statics, var_args) {
  if (process.env.NODE_ENV !== 'production') {
    assertNotInAttributes();
  }

  var node = alignWithDOM(tag, key, statics);

  if (hasChangedAttrs.apply(node, arguments)) {
    var newAttrs = updateNewAttrs.apply(node, arguments);
    updateAttributes(node, newAttrs);
  }

  firstChild();
};


/**
 * Declares a virtual Element at the current location in the document. This
 * corresponds to an opening tag and a elementClose tag is required. This is
 * like elementOpen, but the attributes are defined using the attr function
 * rather than being passed as arguments. Must be folllowed by 0 or more calls
 * to attr, then a call to elementOpenEnd.
 * @param {string} tag The element's tag.
 * @param {?string} key The key used to identify this element. This can be an
 *     empty string, but performance may be better if a unique value is used
 *     when iterating over an array of items.
 * @param {?Array<*>} statics An array of attribute name/value pairs of the
 *     static attributes for the Element. These will only be set once when the
 *     Element is created.
 */
var elementOpenStart = function(tag, key, statics) {
  if (process.env.NODE_ENV !== 'production') {
    assertNotInAttributes();
    setInAttributes();
  }

  argsBuilder[0] = tag;
  argsBuilder[1] = key;
  argsBuilder[2] = statics;
  argsBuilder.length = ATTRIBUTES_OFFSET;
};


/***
 * Defines a virtual attribute at this point of the DOM. This is only valid
 * when called between elementOpenStart and elementOpenEnd.
 *
 * @param {string} name
 * @param {*} value
 */
var attr = function(name, value) {
  if (process.env.NODE_ENV !== 'production') {
    assertInAttributes();
  }

  argsBuilder.push(name, value);
};


/**
 * Closes an open tag started with elementOpenStart.
 */
var elementOpenEnd = function() {
  if (process.env.NODE_ENV !== 'production') {
    assertInAttributes();
    setNotInAttributes();
  }

  elementOpen.apply(null, argsBuilder);
};


/**
 * Closes an open virtual Element.
 *
 * @param {string} tag The element's tag.
 */
var elementClose = function(tag) {
  if (process.env.NODE_ENV !== 'production') {
    assertNotInAttributes();
  }

  parentNode();
  nextSibling();
};


/**
 * Declares a virtual Element at the current location in the document that has
 * no children.
 * @param {string} tag The element's tag.
 * @param {?string} key The key used to identify this element. This can be an
 *     empty string, but performance may be better if a unique value is used
 *     when iterating over an array of items.
 * @param {?Array<*>} statics An array of attribute name/value pairs of the
 *     static attributes for the Element. These will only be set once when the
 *     Element is created.
 * @param {...*} var_args Attribute name/value pairs of the dynamic attributes
 *     for the Element.
 */
var elementVoid = function(tag, key, statics, var_args) {
  if (process.env.NODE_ENV !== 'production') {
    assertNotInAttributes();
  }

  elementOpen.apply(null, arguments);
  elementClose.apply(null, arguments);
};


/**
 * Declares a virtual Text at this point in the document.
 *
 * @param {string} value The text of the Text.
 */
var text = function(value) {
  if (process.env.NODE_ENV !== 'production') {
    assertNotInAttributes();
  }

  var node = alignWithDOM('#text', null, value);
  var data = getData(node);

  if (data.text !== value) {
    node.data = value;
    data.text = value;
  }

  nextSibling();
};


/** */
module.exports = {
  elementOpenStart: elementOpenStart,
  elementOpenEnd: elementOpenEnd,
  elementOpen: elementOpen,
  elementVoid: elementVoid,
  elementClose: elementClose,
  text: text,
  attr: attr
};


}).call(this,require('_process'))
},{"./alignment":3,"./attributes":4,"./node_data":5,"./traversal":8,"./walker":11,"_process":1}],11:[function(require,module,exports){
/**
 * Copyright 2015 The Incremental DOM Authors. All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *      http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS-IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

/**
 * @type {TreeWalker}
 */
var walker_;


/**
 * @return {TreeWalker} the current TreeWalker
 */
var getWalker = function() {
  return walker_;
};


/**
 * Sets the current TreeWalker
 * @param {TreeWalker} walker
 */
var setWalker = function(walker) {
  walker_ = walker;
};


/** */
module.exports = {
  getWalker: getWalker,
  setWalker: setWalker
};


},{}],12:[function(require,module,exports){
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

},{"./utils":20}],13:[function(require,module,exports){
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

},{"./common":12,"./state":19,"./utils":20}],14:[function(require,module,exports){
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

  var node = renderToNode(el, output, {
    waitingHandlers: waitingHandlers,
    refs: refs,
    props: props,
    __innerComponents: __innerComponents
  });
  // need to find another place for that
  if (!context.__rootListener) { // external listener here
    _.each(waitingHandlers, function(handler) { // handler on each concerned node
      console.log('reg on [data-nodeid="' + handler.id + '"] of types ' + handler.event.replace('on', ''));
      _.on('[data-nodeid="' + handler.id + '"]', [handler.event.replace('on', '')], function() {
        console.log('event on [data-nodeid="' + handler.id + '"] of type ' + handler.event);
        handler.callback.apply({}, arguments);
      });
    });
  }
  Common.markStop('Elem.renderWith');
  return node;
};

var DOMOuput = require('./output/incrementaldom');

exports.render = function(el, node, context) {
  Common.markStart('Elem.render');
  /*var waitingHandlers = (context || {}).waitingHandlers || [];
  var refs = (context || {}).refs || {};
  var props = (context || {}).props || {};
  var __innerComponents = (context || {}).__innerComponents || [];
  var doc = document;
  if (node.ownerDocument) {
    doc = node.ownerDocument;
  }
  if (_.isString(node)) {
    node = doc.querySelector(node);
  }
  if (!_.isUndefined(node) && !_.isNull(node)) {
    var htmlNode = renderToNode(el, doc, {
      root: node,
      waitingHandlers: waitingHandlers,
      refs: refs,
      props: props,
      __innerComponents: __innerComponents
    });
    while (!_.isUndefined(node) && !_.isNull(node) && node.firstChild) {
      node.removeChild(node.firstChild);
    }
    _.each(htmlNode, function(n) {
      if (!_.isUndefined(node) && !_.isNull(node)) node.appendChild(n);
    });
    if (!(context && context.__rootListener)) { // external listener here
      _.each(waitingHandlers, function(handler) { // handler on each concerned node
        _.on('[data-nodeid="' + handler.id + '"]', [handler.event.replace('on', '')], function() {
          handler.callback.apply({}, arguments);
        });
      });
    }
  }*/
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

},{"./common":12,"./component":13,"./events":15,"./output/incrementaldom":16,"./output/output":17,"./output/stringify":18,"./state":19,"./utils":20,"./webcomponent":21}],15:[function(require,module,exports){
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

},{"./utils":20}],16:[function(require,module,exports){
var _ = require('../utils');
var Common = require('../common');

var IncrementalDOM = require('incremental-dom');
var elementOpen = IncrementalDOM.elementOpen;
var elementClose = IncrementalDOM.elementClose;
var elementVoid = IncrementalDOM.elementVoid;
var text = IncrementalDOM.text;
var attr = IncrementalDOM.attr;
var patch = IncrementalDOM.patch;

module.exports = function domOutput(ctx) {
  ctx = ctx || {};

  var doc = document;

  function node(name, attrs, ns) {
    attrs = attrs || [];
    var children = [];
    return {
      appendChild: function(child) {
        children.push(child);
      },
      render: function(node) {

        function inner() {
          var selfCloseTag = _.contains(Common.voidElements, name.toUpperCase()) && children.length === 0;
          var newAttrs = [];
          _.each(attrs, function(o) {
            newAttrs.push(o.key);
            newAttrs.push(o.value);
          });
          if (selfCloseTag) {
            elementVoid.apply(null, [name, attrs.key || '', null].concat(newAttrs));
          } else {
            elementOpen.apply(null, [name, attrs.key || '', null].concat(newAttrs));
            _.each(children, function(c) {
              c.render();
            });
            elementClose(name);
          }
        }

        if (node) {
          var doc = document;
          if (node.ownerDocument) {
            doc = node.ownerDocument;
          }
          if (_.isString(node)) {
            node = doc.querySelector(node);
          }
          patch(node, inner);
        } else {
          inner();
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
        text(str);
      }
    };
  }

  return {
    name: 'IncrementalDOMOuput',
    createTextNode: createTextNode,
    createElementNS: createElementNS,
    createElement: createElement
  };
}

},{"../common":12,"../utils":20,"incremental-dom":2}],17:[function(require,module,exports){
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

},{"../utils":20}],18:[function(require,module,exports){
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

},{"../common":12,"../utils":20}],19:[function(require,module,exports){
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

},{"./utils":20}],20:[function(require,module,exports){
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

function on(node, types, callback) {
  try {
  var actual = isString(node) ? document.querySelector(node) : node;
  each(types, function(type) {
    if (actual && actual !== null) {
      if (types.length < 10) console.log('add listener for ', types);
      if (actual.addEventListener) {
        actual.addEventListener(type, callback, false); // does not work in ff 3.5 without false
      } else if (actual.attachEvent) {
        actual.addEventListener(type, callback); // work in ie
      }
    }
  });
} catch(e) {
  console.error(e);
}
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
},{}],21:[function(require,module,exports){
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

},{"./events":15,"./utils":20}]},{},[14])(14)
});