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
