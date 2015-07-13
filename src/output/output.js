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
