var Common = require('./common');
var _ = require('./utils');
var Components = require('./component');
var state = require('./state');
var registerWebComponent = require('./webcomponent').registerWebComponent;
var Stringifier = require('./stringify');
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
  attrs = attrs || {};
  children = wrapChildren(children);
  if(_.isFunction(name)) {
    var context = {
      props: attrs,
      children: children
    };
    return name.bind(context)(attrs, children);
  }
  name = _.escape(name) || 'unknown';
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
    toJsonString: function(pretty) {
      if (pretty) return JSON.stringify(this, null, 2);
      return JSON.stringify(this);
    },
    toHtmlNode: function(doc, context) {
      var elemName = this.name;
      extractEventHandlers(attrs, nodeId, context);
      var element = undefined;
      if (svg) {
        element = doc.createElementNS(svg, _.escape(name));
      } else {
        element = doc.createElement(_.escape(name));
      }
      _.each(attrsArray, function(item) {
        if (elemName && elemName === 'input' && item.key === 'value') {
          element.value = item.value;
        } else {
          element.setAttribute(item.key, item.value);
        }
      });

      function appendSingleNode(__children, __element) {
        if (_.isNumber(__children)) {
          __element.appendChild(doc.createTextNode(__children + ''));
        } else if (_.isString(__children)) {
          __element.appendChild(doc.createTextNode(__children));
        } else if (_.isBoolean(__children)) {
          __element.appendChild(doc.createTextNode(__children + ''));
        } else if (_.isObject(__children) && __children.isElement) {
          __element.appendChild(__children.toHtmlNode(doc, context));
        } else if (_.isObject(__children) && __children.__asHtml) {
          __element.innerHTML = __children.__asHtml;
        } else if (__children.__componentFactory) {
          var compId = _.escape(_.uniqueId('component_'));
          var span = doc.createElement('span');
          span.setAttribute('data-componentid', compId);
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
  if (_.isFunction(el)) el = el((context || {
    props: {}
  }).props)
  if (!_.isUndefined(el)) {
    if (_.isArray(el)) {
      return _.chain(el).map(function(item) {
        if (_.isFunction(item)) {
          return item();
        } else {
          return item;
        }
      }).filter(function(item) {
        return !_.isUndefined(item);
      }).map(function(item) {
        return item.toHtmlNode(doc, context);
      }).value();
    } else {
      return [el.toHtmlNode(doc, context)];
    }
  } else {
    return [];
  }
}

exports.renderToString = function(el, context) {
  Common.markStart('Elem.renderToString');
  var str = _.map(renderToNode(el, Stringifier(context)), function(n) {
    return n.toHtmlString();
  }).join('');
  Common.markStop('Elem.renderToString');
  return str;
};

exports.renderToStaticHtml = function(el) {
  Common.markStart('Elem.renderToStaticHtml');
  var str = _.map(renderToNode(el, Stringifier({
    __noDataId: true
  })), function(n) {
    return n.toHtmlString();
  }).join('');
  Common.markStop('Elem.renderToStaticHtml');
  return str;
}

exports.el = el;

var svgElements = ['altGlyph', 'altGlyphDef', 'altGlyphItem', 'animate',
  'animateColor', 'animateMotion', 'animateTransform',
  'circle', 'clipPath', 'color-profile', 'cursor', 'defs',
  'desc', 'ellipse', 'feBlend', 'feColorMatrix', 'feComponentTransfer',
  'feComposite', 'feConvolveMatrix', 'feDiffuseLighting', 'feDisplacementMap',
  'feDistantLight', 'feFlood', 'feFuncA', 'feFuncB', 'feFuncG', 'feFuncR',
  'feGaussianBlur', 'feImage', 'feMerge', 'feMergeNode', 'feMorphology',
  'feOffset', 'fePointLight', 'feSpecularLighting', 'feSpotLight',
  'feTile', 'feTurbulence', 'filter', 'font', 'font-face', 'font-face-format',
  'font-face-name', 'font-face-src', 'font-face-uri', 'foreignObject', 'g',
  'glyph', 'glyphRef', 'hkern', 'image', 'line', 'linearGradient', 'marker',
  'mask', 'metadata', 'missing-glyph', 'mpath', 'path', 'pattern', 'polygon',
  'polyline', 'radialGradient', 'rect', 'set', 'stop', 'svg', 'switch', 'symbol',
  'text', 'textPath', 'tref', 'tspan', 'use', 'view', 'vkern'];

exports.jsx = function(name, attrs) {
  for (var _len = arguments.length, children = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    children[_key - 2] = arguments[_key];
  }
  children = [].concat.apply([], children);
  if (_.contains(svgElements, type)) {
    return exports.svg(name, attrs || {}, children || []);
  }
  return el(name, attrs || {}, children || []);
}

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

exports.render = function(el, node, context) {
  if (_.isFunction(el)) {
    return exports.render(el(), node, context);
  }
  Common.markStart('Elem.render');
  var waitingHandlers = (context || {}).waitingHandlers || [];
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
  }
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

function autoExtend(base, custom) {
  var final = _.extend({}, base, custom);
  final.extend = function (custom2) {
    return autoExtend(final, custom2);
  };
  return final;
}

exports.style = function(obj, type, media) {
  var stylesheetElement = undefined;
  var mounted = false;
  var result = {};
  var sheet = obj;
  while (sheet.extend) {
    if (sheet.extend) {
      var value = sheet.extend;
      delete sheet.extend;
      sheet = _.extend({}, value, sheet);
    }
  }
  var keys = _.keys(sheet);
  keys.forEach(function (key) {
    var clazz = sheet[key];
    if (_.isObject(clazz)) {
      // Handle 'class' that extends other 'classes'
      while (clazz.extend) {
        if (clazz.extend) {
          var value = clazz.extend;
          delete clazz.extend;
          clazz = _.extend({}, value, clazz);
        }
      }
      // Add an extend function to a 'class'
      result[key] = _.extend({}, {
        extend: function extend(o) {
          return autoExtend(clazz, o);
        }
      }, clazz);
    }
  });
  // Add an extend function to the sheet
  result.extend = function (o) {
    return autoExtend(sheet, o);
  };
  result.toString = function (asClasses) {
    return _.keys(result).filter(function (key) {
      return key !== 'extend' && key !== 'mount' && key !== 'unmount' && key !== 'toString';
    }).map(function (key) {
      var value = result[key];
      return (asClasses ? '.' : '') + _.dasherize(key) + ' {\n' + _.keys(value).filter(function (k) {
        return k !== 'extend';
      }).map(function (k) {
        return '    ' + _.dasherize(k) + ': ' + value[k] + ';';
      }).join('\n') + '\n}';
    }).join('\n');
  };
  result.mount = function (asClasses) {
    if (!mounted && typeof document !== 'undefined') {
      stylesheetElement = document.createElement('style');
      if (type) stylesheetElement.setAttribute('type', type);
      if (media) stylesheetElement.setAttribute('media', media);
      stylesheetElement.innerHTML = result.toString(asClasses);
      document.head.appendChild(stylesheetElement);
      mounted = true;
    }
    return result;
  };
  result.unmount = function () {
    if (mounted && typeof document !== 'undefined') {
      stylesheetElement.parentNode.removeChild(stylesheetElement);
      mounted = false;
    }
    return result;
  };
  return result;
};

Common.__internalAccess.api = exports;

if (typeof define === 'function' && define.amd) {
  define('elem', [], function() {
    return module.exports;
  });
}
