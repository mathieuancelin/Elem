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
