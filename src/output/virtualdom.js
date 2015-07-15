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
