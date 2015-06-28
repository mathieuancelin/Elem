var Common = require('./common');
var _ = require('./utils');

module.exports = function stringifyDoc(ctx) {
  ctx = ctx || {};

  function node(name) {
    var attrs = [];
    var children = [];
    return {
      setAttribute: function(key, value) {
        if (key === 'data-nodeid') {
          if (!ctx.__noDataId) {
            attrs.push('data-snodeid' + '="' + value + '"');
          }
        } else {
          attrs.push(key + '="' + value + '"');
        }
      },
      appendChild: function(child) {
        children.push(child);
      },
      toHtmlString: function() {
        var selfCloseTag = _.contains(Common.voidElements, name.toUpperCase()) && children.length === 0;
        if (selfCloseTag) return '<' + name + ' ' + attrs.join(' ') + ' />';
        return '<' + name + ' ' + attrs.join(' ') + '>' + _.map(children, function(child) {
          return child.toHtmlString();
        }).join('') + '</' + name + '>';
      }
    }
  }
  
  return {
    createElement: node,
    createTextNode: function(value) {
      return {
        toHtmlString: function() {
          return value;
        }
      };
    }
  };
}
