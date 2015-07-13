var _ = require('../utils');

module.exports = function domOutput(ctx) {
  ctx = ctx || {};

  var doc = document;

  function node(name, attrs, ns) {
    attrs = attrs || [];
    var elem = undefined;
    if (ns) {
      elem = doc.createElementNS(ns, name);
    } else {
      elem = doc.createElement(name);
    }
    _.each(attrs, function(item) {
      if (name && name === 'input' && item.key === 'value') {
        elem.value = item.value;
      } else {
        elem.setAttribute(item.key, item.value);
      }
    });

    return {
      appendChild: function(child) {
        elem.appendChild(child.render());
      },
      render: function(node) {
        if (node) {
          if (node.ownerDocument) {
            doc = node.ownerDocument;
          }
          if (_.isString(node)) {
            node = doc.querySelector(node);
          }
          while (!_.isUndefined(node) && !_.isNull(node) && node.firstChild) {
            node.removeChild(node.firstChild);
          }
          if (!_.isUndefined(node) && !_.isNull(node)) {
            node.appendChild(elem);
          }
        } else {
          return elem;
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
        return doc.createTextNode(str);
      }
    };
  }

  return {
    name: 'DOMOuput',
    createTextNode: createTextNode,
    createElementNS: createElementNS,
    createElement: createElement
  };
}
