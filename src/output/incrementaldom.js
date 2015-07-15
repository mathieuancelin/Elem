var _ = require('../utils');
var Common = require('../common');

var IncrementalDOM = require('incremental-dom');
var elementOpen = IncrementalDOM.elementOpen;
var elementClose = IncrementalDOM.elementClose;
var elementVoid = IncrementalDOM.elementVoid;
var text = IncrementalDOM.text;
var attr = IncrementalDOM.attr;
var patch = IncrementalDOM.patch;

var listenerCache = {};

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
          var rootId = node.getAttribute('data-rootid');
          if (rootId) {
            _.each(_.keys(listenerCache), function(key) {
              if (key.indexOf(rootId) === 0) {
                var value = listenerCache[key];
                doc.querySelector(value.key).removeEventListener(value.type, value.listener);
                delete listenerCache[key];
              }
            });
          } else {
            rootId = _.uniqueId('data-rootid-');
            node.setAttribute('data-rootid', rootId);
          }
          patch(node, inner);
          if (!renderContext.__rootListener) { // external listener here
            _.each(renderContext.waitingHandlers, function(handler) { // handler on each concerned node
              var key = '[data-nodeid="' + handler.id + '"]';
              var type = handler.event.replace('on', '');
              var listener = function() {
                handler.callback.apply({}, arguments);
              };
              listenerCache[rootId + '-' + key] = {
                key: key,
                type: type,
                listener: listener
              }
              _.on(key, [type], listener);
            });
          }
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
    createElement: createElement,
    setRenderContext: setRenderContext
  };
}
