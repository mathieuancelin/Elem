!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Elem=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
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

},{"./utils":7}],2:[function(require,module,exports){
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

},{"./common":1,"./state":5,"./utils":7}],3:[function(require,module,exports){
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

exports.jsx = function(name, attrs) {
  for (var _len = arguments.length, children = Array(_len > 2 ? _len - 2 : 0), _key = 2; _key < _len; _key++) {
    children[_key - 2] = arguments[_key];
  }
  
  var flatChildren = children;
  if (children !== undefined && children.length === 1) {
      flatChildren = children[0];
  }
  return attrs === null ? vel(name, flatChildren) : el(name, attrs, flatChildren);
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

},{"./common":1,"./component":2,"./events":4,"./state":5,"./stringify":6,"./utils":7,"./webcomponent":8}],4:[function(require,module,exports){
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

},{"./utils":7}],5:[function(require,module,exports){
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

},{"./utils":7}],6:[function(require,module,exports){
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

},{"./common":1,"./utils":7}],7:[function(require,module,exports){
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
  var actual = isString(node) ? document.querySelector(node) : node;
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
},{}],8:[function(require,module,exports){
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

},{"./events":4,"./utils":7}]},{},[3])(3)
});