!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Elem=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/mathieuancelin/Dropbox/current-projects/elem/src/common.js":[function(require,module,exports){
exports.debug = false;
exports.perfs = false;
exports.voidElements = ["AREA","BASE","BR","COL","COMMAND","EMBED","HR","IMG","INPUT","KEYGEN","LINK","META","PARAM","SOURCE","TRACK","WBR"];
exports.events = ['wheel','scroll','touchcancel','touchend','touchmove','touchstart','click','doubleclick','drag','dragend','dragenter','dragexit','dragleave','dragover','dragstart','drop','change','input','submit','focus','blur','keydown','keypress','keyup','copy','cut','paste','mousedown','mouseenter','mouseleave','mousemove','mouseout','mouseover','mouseup'];
    
// redraw with requestAnimationFrame (https://developer.mozilla.org/fr/docs/Web/API/window.requestAnimationFrame)
// perfs measures (http://www.html5rocks.com/en/tutorials/webperformance/usertiming/)
var Performances = {
  mark: function() {},
  measure: function() {},
  getEntriesByName: function() { return []; },
  getEntriesByType: function() { return []; },
  clearMarks: function() {},
  clearMeasures: function() {}
};

// Avoid some issues in non broser environments
if (typeof window === 'undefined') {
  window = {
    __fake: true
  };
}
// Avoid some issues in older browsers
if (typeof window.console === 'undefined') {
  window.console = {
    log: function() {},
    error: function() {},
    table: function() {},
    debug: function() {},
    trace: function() {} 
  };
}

if (typeof window.performance !== 'undefined' 
    && typeof window.performance.mark !== 'undefined' 
    && typeof window.performance.measure !== 'undefined') {
  Performances = window.performance;  
}

window.requestAnimationFrame = 
    window.requestAnimationFrame || 
    window.mozRequestAnimationFrame ||
    window.webkitRequestAnimationFrame || 
    window.msRequestAnimationFrame || 
    (function() {
        if (window.console) console.error('[ELEMJS] No requestAnimationFrame, using lame polyfill ...');
        return function(callback, element){
            window.setTimeout(callback, 1000 / 60);
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
  if (window.console) console.table(exports.collectMeasures());
};

exports.defer = function(cb) {
    window.requestAnimationFrame.call(window, cb);
};

exports.defered = function(cb) {
    return function() {
        exports.defer(cb);
    };
};

if (!Function.prototype.bind) {
  if (window.console) console.error('[ELEMJS] No Function.prototype.bind, using polyfill ...');
  Function.prototype.bind = function (oThis) {
    if (typeof this !== "function") {
      throw new TypeError("Function.prototype.bind - can't call bounded element");
    }
    var aArgs = Array.prototype.slice.call(arguments, 1);
    var fToBind = this; 
    var fNOP = function () {};
    var fBound = function () {
        return fToBind.apply(this instanceof fNOP && oThis
                 ? this
                 : oThis,
                 aArgs.concat(Array.prototype.slice.call(arguments)));
    };
    fNOP.prototype = this.prototype;
    fBound.prototype = new fNOP();
    return fBound;
  };
}
},{}],"/Users/mathieuancelin/Dropbox/current-projects/elem/src/component.js":[function(require,module,exports){
var Common = require('./common');
var _ = require('./utils');
var Elem = require('./elem');
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
  }
}

function mountComponent(el, opts) {
  var name = opts.name || 'Component';
  var state = opts.state || Elem.state();
  var props = opts.props || {};
  var render = opts.render;
  var eventCallbacks = {};
  var oldHandlers = [];
  var afterRender = opts.afterRender || function() {};
  var beforeRender = opts.beforeRender || function() {};
  var unmount = opts.unmount || function() {};
  var getDOMNode = function() { return _.findNode(el); };
  unmountComponent(el);
  mounted[el] = function() {
    unmount(state, _.clone(props), { refs: {}, getDOMNode: getDOMNode });
    state.replace({});
  };
  if (opts.init) { opts.init(state, _.clone(props)); }
  _.on(el, Common.events, function(e) { // bubbles listener, TODO : handle mouse event in a clever way
      e = e || window.event;
      var node = e.target || e.srcElement;
      var name = data(node, 'nodeid') + '_' + e.type; //node.dataset.nodeid + "_" + e.type;
      if (eventCallbacks[name]) {
          eventCallbacks[name](e);    
      } else {
          while(!eventCallbacks[name] && node && node !== null && hasData(node, 'nodeid')) {//node.dataset && node.dataset.nodeid) {
              node = node.parentElement;
              if (node && node !== null && hasData(node, 'nodeid')) { //node.dataset && node.dataset.nodeid) {
                name = data(node, 'nodeid') + '_' + e.type; //node.dataset.nodeid + "_" + e.type;
              }
          }
          if (eventCallbacks[name]) {
              eventCallbacks[name](e);    
          }
      }
  });
  function rerender() {
      Common.markStart(name + '.globalRendering');
      _.each(oldHandlers, function(handler) {
          delete eventCallbacks[handler];
      });
      oldHandlers = [];
      var focus = document.activeElement || {}; // TODO : check if input/select/textarea, remember cursor position here
      var key = focus.dataset ? focus.dataset.key : (focus.attributes || [])['key']; // TODO : maybe a bug here
      var waitingHandlers = [];
      var refs = {};
      beforeRender(state, _.clone(props), { refs: refs, getDOMNode: getDOMNode });
      Common.markStart(name + '.render');
      var elemToRender = render(state, _.clone(props), { refs: refs, getDOMNode: getDOMNode });
      Common.markStop(name + '.render');
      Elem.render(elemToRender, el, { waitingHandlers: waitingHandlers, __rootListener: true, refs: refs });
      afterRender(state, _.clone(props), { refs: refs, getDOMNode: getDOMNode });
      if (key) {
          var focusNode = document.querySelector('[data-key="' + key + '"]');//$('[data-key="' + key + '"]');
          _.focus(focusNode); // focusNode.focus();  // TODO : maybe a bug here
          if (focusNode.value) { //focusNode.val()) {
              var strLength = focusNode.value.length * 2; // focusNode.val().length * 2;
              focusNode.setSelectionRange(strLength, strLength); //focusNode[0].setSelectionRange(strLength, strLength);  // TODO : handle other kind of input ... like select, etc ...   
          }
      }
      _.each(waitingHandlers, function(handler) {
          oldHandlers.push(handler.id + '_' + handler.event.replace('on', ''));
          eventCallbacks[handler.id + '_' + handler.event.replace('on', '')] = function() {
              handler.callback.apply({ render: render }, arguments);                        
          }
      });
      Common.markStop(name + '.globalRendering');
  }
  rerender();
  state.onChange(rerender);//Common.defered(rerender));
  return state;
}

function serverSideComponent(opts, nodataid) {
  var name = opts.name || 'Component';
  var state = opts.state || Elem.state();
  var props = opts.props || {};
  var render = opts.render;
  var afterRender = opts.afterRender || function() {};
  if (opts.init) { opts.init(state, _.clone(props)); }
  Common.markStart(name + '.globalRendering');
  var refs = {};
  Common.markStart(name + '.render');
  var elemToRender = render(state, _.clone(props), { refs: refs, getDOMNode: function() {} });
  Common.markStop(name + '.render');
  var str = Elem.renderToString(elemToRender, { waitingHandlers: [], __rootListener: true, refs: refs, __noDataId: nodataid });
  afterRender(state, _.clone(props), { refs: refs, getDOMNode: function() {} });
  Common.markStop(name + '.globalRendering');
  return str;
}

function factory(opts) {
  return function(props, to) {
    var api = {
      __componentFactory: true,
      renderToStaticHtml: function() {
        var opt = _.clone(opts);
        opt.props = _.extend(_.clone(opts.props || {}), props || {});
        return serverSideComponent(opt, true);  
      },
      renderToString: function() {
        var opt = _.clone(opts);
        opt.props = _.extend(_.clone(opts.props || {}), props || {});
        return serverSideComponent(opt);
      },
      renderTo: function(el, defer) {
        var opt = _.clone(opts);
        opt.props = _.extend(_.clone(opts.props || {}), props || {});
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
},{"./common":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/common.js","./elem":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/elem.js","./utils":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/utils.js"}],"/Users/mathieuancelin/Dropbox/current-projects/elem/src/elem.js":[function(require,module,exports){
var Common = require('./common');
var _ = require('./utils');
var Components = require('./component');
var state = require('./state');
var registerWebComponent = require('./webcomponent').registerWebComponent;
var Stringifier = require('./stringify');
var Dispatcher = require('./events');

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
    attrsArray = _.filter(attrsArray, function(item) { return !_.isUndefined(item); });
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
    attrsArray = _.filter(attrsArray, function(item) { return !_.isUndefined(item); });
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
                    event: keyName,
                    callback: attrs[key]
                });
            }
        } 
        if (keyName === 'ref' && context && context.refs) context.refs[attrs[key]] = buildRef(nodeId);
    });   
}

function asAttribute(key, value) { return { key: key, value: value }; }

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
    var nodeId = _.uniqueId('node_');
    if (_.isUndefined(children) && !_.isUndefined(attrs) && !attrs.__isAttrs) {
        children = attrs;
        attrs = {};
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
    var selfCloseTag = _.contains(Common.voidElements, name.toUpperCase()) 
        && (_.isNull(children) || _.isUndefined(children) || (_.isArray(children) && children.length === 0));
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
            extractEventHandlers(attrs, nodeId, context);
            var element = doc.createElement(_.escape(name));
            _.each(attrsArray, function(item) {
                element.setAttribute(item.key, item.value);
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
    if (_.isFunction(el)) el = el((context || { props: {}}).props)
    if (!_.isUndefined(el)) {
        if (_.isArray(el)) {
            return _.chain(el).map(function(item) {
                if (_.isFunction(item)) {
                    return item();
                } else {
                    return item;
                }
            }).filter(function (item) {
                return !_.isUndefined(item);
            }).map(function (item) {
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
    var str = _.map(renderToNode(el, Stringifier(context)), function(n) { return n.toHtmlString(); }).join('');
    Common.markStop('Elem.renderToString');
    return str;
};

exports.el = el;

exports.sel = function(name, children) { return el(name, {}, children); }; // simple node sel(name, children)

exports.vel = function(name, attrs) { return el(name, attrs, []); }; // void node, cel(name, attrs)

exports.nbsp = function(times) { return el('span', { __asHtml: _.times(times || 1, function() { return '&nbsp;'; }) }); };

exports.text = function(text) { return el('span', {}, text); };

exports.elements = function() { return _.map(arguments, function(item) { return item; }); };

exports.render = function(el, node, context) {
    Common.markStart('Elem.render');
    var waitingHandlers = (context || {}).waitingHandlers || [];
    var refs = (context || {}).refs || {};
    var props = (context || {}).props || {};
    var doc = document;
    if (node.ownerDocument) {
        doc = node.ownerDocument;
    }
    if (_.isString(node)) {
        node = doc.querySelector(node);
    }
    if (!_.isUndefined(node) && !_.isNull(node)) {
        var htmlNode = renderToNode(el, doc, { root: node, waitingHandlers: waitingHandlers, refs: refs, props: props });
        while (!_.isUndefined(node) && !_.isNull(node) && node.firstChild) { node.removeChild(node.firstChild); }
        _.each(htmlNode, function(n) {
            if (!_.isUndefined(node) && !_.isNull(node)) node.appendChild(n);
        });
        if (!(context && context.__rootListener)) {  // external listener here
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
// exports.componentFactory = Components.componentFactory;
exports.state = state;
exports.Utils = _;
exports.registerWebComponent = registerWebComponent;
exports.dispatcher = Dispatcher;
exports.Perf = {
    start: function() { Common.perfs = true; },
    stop: function() { Common.stop = false; },
    markStart: Common.markStart,
    markStop: Common.markStop,
    collectMeasures: Common.collectMeasures,
    printMeasures: Common.printMeasures
};

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
exports.p = exports.predicate;
exports.ifPred = exports.predicate;
exports.cssClass = function(obj) {
    return _.extend({}, {
        extend: function(o) {
            return _.extend({}, o, obj);    
        }
    }, obj);
};

if (typeof define === 'function' && define.amd) {
    define('elem', [], function() {
        return module.exports;
    });
}

},{"./common":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/common.js","./component":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/component.js","./events":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/events.js","./state":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/state.js","./stringify":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/stringify.js","./utils":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/utils.js","./webcomponent":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/webcomponent.js"}],"/Users/mathieuancelin/Dropbox/current-projects/elem/src/events.js":[function(require,module,exports){
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
      callbacks.push({ name: name, callback: callback });
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
},{"./utils":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/utils.js"}],"/Users/mathieuancelin/Dropbox/current-projects/elem/src/state.js":[function(require,module,exports){
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
    set: function(obj, silentOrCallback) {
      var silent = _.isBoolean(silentOrCallback) && silentOrCallback === true;
      if (!_.isUndefined(obj) && _.isObject(obj)) {
        _.map(_.keys(obj), function(k) {
          theModel[k] = obj[k];
        });
        if (!silent) fireCallbacks();
        if (!silent)(silentOrCallback || function() {})();
      }
    },
    replace: function(obj, silentOrCallback) {
      theModel = {};
      this.set(obj, silentOrCallback);
    },
    remove: function(key) {
      delete theModel[key];
      fireCallbacks();
    }
  });
};
},{"./utils":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/utils.js"}],"/Users/mathieuancelin/Dropbox/current-projects/elem/src/stringify.js":[function(require,module,exports){
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
            appendChild: function(child) { children.push(child); },
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
                toHtmlString: function() { return value; }
            };
        }   
    };
}

},{"./common":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/common.js","./utils":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/utils.js"}],"/Users/mathieuancelin/Dropbox/current-projects/elem/src/utils.js":[function(require,module,exports){
var __idCounter = 0;

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
    for (var key in obj) if (has(obj, key)) keys.push(key);
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
    var i = 0, length = array.length;
    if (isSorted) {
        if (typeof isSorted == 'number') {
            i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
        } else {
            i = sortedIndex(array, item);
            return array[i] === item ? i : -1;
        }
    }
    for (; i < length; i++) if (array[i] === item) return i;
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
    var id = ++__idCounter + '';
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
    return what.replace(/([A-Z\d]+)([A-Z][a-z])/g,'$1_$2')
        .replace(/([a-z\d])([A-Z])/g,'$1_$2')
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

function findNode(selector) {
    return document.querySelector(node);
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
exports.findNode = findNode;
exports.reduce = reduce;
exports.reject = reject;
exports.where = where;
exports.matches = matches;
exports.negate = negate;
exports.property = property;
exports.identity = identity;
exports.pairs = pairs;
},{}],"/Users/mathieuancelin/Dropbox/current-projects/elem/src/webcomponent.js":[function(require,module,exports){

var registrationFunction = undefined

try {
  registrationFunction = (document.registerElement || document.register || function() {
      if (window.console) console.error('[ELEMJS] No registerElement function, webcomponents will not work !!!');
  }).bind(document);
} catch(e) {}

function registerWebComponent(tag, elem) {
  var thatDoc = document;
  var ElementProto = Object.create(HTMLElement.prototype);
  
  ElementProto.createdCallback = function() {
    var props = {};
    for (var i in this.attributes) {
      var item = this.attributes[i];
      props[item.name] = item.value;    
    }
    this.props = props;
    var node = this;
    if (props.noshadow !== 'true') {
      var shadowRoot = this.createShadowRoot();
      node = thatDoc.createElement('div');
      node.setAttribute('class', 'elemcomponent');
      shadowRoot.appendChild(node);
    }
    this._node = node;
    if (props.renderOnly && props.renderOnly === true) {
      this.renderedElement = Elem.render(elem, node); 
    } else {
      this.renderedElement = Elem.component({
        container: node,
        init: elem.init,
        render: elem.render,
        props: props,
        state: elem.state
      }); 
    }
  };

  ElementProto.attributeChangedCallback = function (attr, oldVal, newVal) {
    this.props[attr] = newVal;
    var props = this.props;
    if (this.props.renderOnly && this.props.renderOnly === true) {
      this.renderedElement = Elem.render(elem, this._node); 
    } else {
      this.renderedElement = Elem.component({
        container: this._node,
        init: elem.init,
        render: elem.render,
        props: props,
        state: elem.state
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

},{}]},{},["/Users/mathieuancelin/Dropbox/current-projects/elem/src/elem.js"])("/Users/mathieuancelin/Dropbox/current-projects/elem/src/elem.js")
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY29tbW9uLmpzIiwic3JjL2NvbXBvbmVudC5qcyIsInNyYy9lbGVtLmpzIiwic3JjL2V2ZW50cy5qcyIsInNyYy9zdGF0ZS5qcyIsInNyYy9zdHJpbmdpZnkuanMiLCJzcmMvdXRpbHMuanMiLCJzcmMvd2ViY29tcG9uZW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzFKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOVNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDeENBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJleHBvcnRzLmRlYnVnID0gZmFsc2U7XG5leHBvcnRzLnBlcmZzID0gZmFsc2U7XG5leHBvcnRzLnZvaWRFbGVtZW50cyA9IFtcIkFSRUFcIixcIkJBU0VcIixcIkJSXCIsXCJDT0xcIixcIkNPTU1BTkRcIixcIkVNQkVEXCIsXCJIUlwiLFwiSU1HXCIsXCJJTlBVVFwiLFwiS0VZR0VOXCIsXCJMSU5LXCIsXCJNRVRBXCIsXCJQQVJBTVwiLFwiU09VUkNFXCIsXCJUUkFDS1wiLFwiV0JSXCJdO1xuZXhwb3J0cy5ldmVudHMgPSBbJ3doZWVsJywnc2Nyb2xsJywndG91Y2hjYW5jZWwnLCd0b3VjaGVuZCcsJ3RvdWNobW92ZScsJ3RvdWNoc3RhcnQnLCdjbGljaycsJ2RvdWJsZWNsaWNrJywnZHJhZycsJ2RyYWdlbmQnLCdkcmFnZW50ZXInLCdkcmFnZXhpdCcsJ2RyYWdsZWF2ZScsJ2RyYWdvdmVyJywnZHJhZ3N0YXJ0JywnZHJvcCcsJ2NoYW5nZScsJ2lucHV0Jywnc3VibWl0JywnZm9jdXMnLCdibHVyJywna2V5ZG93bicsJ2tleXByZXNzJywna2V5dXAnLCdjb3B5JywnY3V0JywncGFzdGUnLCdtb3VzZWRvd24nLCdtb3VzZWVudGVyJywnbW91c2VsZWF2ZScsJ21vdXNlbW92ZScsJ21vdXNlb3V0JywnbW91c2VvdmVyJywnbW91c2V1cCddO1xuICAgIFxuLy8gcmVkcmF3IHdpdGggcmVxdWVzdEFuaW1hdGlvbkZyYW1lIChodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9mci9kb2NzL1dlYi9BUEkvd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSlcbi8vIHBlcmZzIG1lYXN1cmVzIChodHRwOi8vd3d3Lmh0bWw1cm9ja3MuY29tL2VuL3R1dG9yaWFscy93ZWJwZXJmb3JtYW5jZS91c2VydGltaW5nLylcbnZhciBQZXJmb3JtYW5jZXMgPSB7XG4gIG1hcms6IGZ1bmN0aW9uKCkge30sXG4gIG1lYXN1cmU6IGZ1bmN0aW9uKCkge30sXG4gIGdldEVudHJpZXNCeU5hbWU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gW107IH0sXG4gIGdldEVudHJpZXNCeVR5cGU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gW107IH0sXG4gIGNsZWFyTWFya3M6IGZ1bmN0aW9uKCkge30sXG4gIGNsZWFyTWVhc3VyZXM6IGZ1bmN0aW9uKCkge31cbn07XG5cbi8vIEF2b2lkIHNvbWUgaXNzdWVzIGluIG5vbiBicm9zZXIgZW52aXJvbm1lbnRzXG5pZiAodHlwZW9mIHdpbmRvdyA9PT0gJ3VuZGVmaW5lZCcpIHtcbiAgd2luZG93ID0ge1xuICAgIF9fZmFrZTogdHJ1ZVxuICB9O1xufVxuLy8gQXZvaWQgc29tZSBpc3N1ZXMgaW4gb2xkZXIgYnJvd3NlcnNcbmlmICh0eXBlb2Ygd2luZG93LmNvbnNvbGUgPT09ICd1bmRlZmluZWQnKSB7XG4gIHdpbmRvdy5jb25zb2xlID0ge1xuICAgIGxvZzogZnVuY3Rpb24oKSB7fSxcbiAgICBlcnJvcjogZnVuY3Rpb24oKSB7fSxcbiAgICB0YWJsZTogZnVuY3Rpb24oKSB7fSxcbiAgICBkZWJ1ZzogZnVuY3Rpb24oKSB7fSxcbiAgICB0cmFjZTogZnVuY3Rpb24oKSB7fSBcbiAgfTtcbn1cblxuaWYgKHR5cGVvZiB3aW5kb3cucGVyZm9ybWFuY2UgIT09ICd1bmRlZmluZWQnIFxuICAgICYmIHR5cGVvZiB3aW5kb3cucGVyZm9ybWFuY2UubWFyayAhPT0gJ3VuZGVmaW5lZCcgXG4gICAgJiYgdHlwZW9mIHdpbmRvdy5wZXJmb3JtYW5jZS5tZWFzdXJlICE9PSAndW5kZWZpbmVkJykge1xuICBQZXJmb3JtYW5jZXMgPSB3aW5kb3cucGVyZm9ybWFuY2U7ICBcbn1cblxud2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSA9IFxuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgXG4gICAgd2luZG93Lm1velJlcXVlc3RBbmltYXRpb25GcmFtZSB8fFxuICAgIHdpbmRvdy53ZWJraXRSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgXG4gICAgd2luZG93Lm1zUmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IFxuICAgIChmdW5jdGlvbigpIHtcbiAgICAgICAgaWYgKHdpbmRvdy5jb25zb2xlKSBjb25zb2xlLmVycm9yKCdbRUxFTUpTXSBObyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUsIHVzaW5nIGxhbWUgcG9seWZpbGwgLi4uJyk7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihjYWxsYmFjaywgZWxlbWVudCl7XG4gICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKTtcbiAgICAgICAgfSAgICBcbiAgICB9KSgpO1xuXG52YXIgRWxlbU1lYXN1cmVTdGFydCA9ICdFbGVtTWVhc3VyZVN0YXJ0JztcbnZhciBFbGVtTWVhc3VyZVN0b3AgPSAnRWxlbU1lYXN1cmVTdG9wJztcbnZhciBFbGVtTWVhc3VyZSA9ICdFbGVtQ29tcG9uZW50UmVuZGVyaW5nTWVhc3VyZSc7XG52YXIgbmFtZXMgPSBbRWxlbU1lYXN1cmVdO1xuXG5leHBvcnRzLm1hcmtTdGFydCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgaWYgKGV4cG9ydHMucGVyZnMpIHtcbiAgICBpZiAobmFtZSkge1xuICAgICAgUGVyZm9ybWFuY2VzLm1hcmsobmFtZSArICdfc3RhcnQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgUGVyZm9ybWFuY2VzLm1hcmsoRWxlbU1lYXN1cmVTdGFydCk7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnRzLm1hcmtTdG9wID0gZnVuY3Rpb24obmFtZSkge1xuICBpZiAoZXhwb3J0cy5wZXJmcykge1xuICAgIGlmIChuYW1lKSB7XG4gICAgICBQZXJmb3JtYW5jZXMubWFyayhuYW1lICsgJ19zdG9wJyk7XG4gICAgICBQZXJmb3JtYW5jZXMubWVhc3VyZShuYW1lLCBuYW1lICsgJ19zdGFydCcsIG5hbWUgKyAnX3N0b3AnKTtcbiAgICAgIGlmICghXy5jb250YWlucyhuYW1lcywgbmFtZSkpIG5hbWVzLnB1c2gobmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIFBlcmZvcm1hbmNlcy5tYXJrKEVsZW1NZWFzdXJlU3RvcCk7XG4gICAgICBQZXJmb3JtYW5jZXMubWVhc3VyZShFbGVtTWVhc3VyZSwgRWxlbU1lYXN1cmVTdGFydCwgRWxlbU1lYXN1cmVTdG9wKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydHMuY29sbGVjdE1lYXN1cmVzID0gZnVuY3Rpb24oKSB7XG4gIGlmICghZXhwb3J0cy5wZXJmcykgcmV0dXJuIFtdO1xuICB2YXIgcmVzdWx0cyA9IFtdO1xuICBfLmVhY2gobmFtZXMsIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXN1bHRzID0gcmVzdWx0cy5jb25jYXQoUGVyZm9ybWFuY2VzLmdldEVudHJpZXNCeU5hbWUobmFtZSkpO1xuICB9KTtcbiAgUGVyZm9ybWFuY2VzLmNsZWFyTWFya3MoKTtcbiAgUGVyZm9ybWFuY2VzLmNsZWFyTWVhc3VyZXMoKTtcbiAgbmFtZXMgPSBbRWxlbU1lYXN1cmVdO1xuICByZXR1cm4gcmVzdWx0cztcbn07XG5cbmV4cG9ydHMucHJpbnRNZWFzdXJlcyA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIWV4cG9ydHMucGVyZnMpIHJldHVybjtcbiAgaWYgKHdpbmRvdy5jb25zb2xlKSBjb25zb2xlLnRhYmxlKGV4cG9ydHMuY29sbGVjdE1lYXN1cmVzKCkpO1xufTtcblxuZXhwb3J0cy5kZWZlciA9IGZ1bmN0aW9uKGNiKSB7XG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZS5jYWxsKHdpbmRvdywgY2IpO1xufTtcblxuZXhwb3J0cy5kZWZlcmVkID0gZnVuY3Rpb24oY2IpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIGV4cG9ydHMuZGVmZXIoY2IpO1xuICAgIH07XG59O1xuXG5pZiAoIUZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kKSB7XG4gIGlmICh3aW5kb3cuY29uc29sZSkgY29uc29sZS5lcnJvcignW0VMRU1KU10gTm8gRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQsIHVzaW5nIHBvbHlmaWxsIC4uLicpO1xuICBGdW5jdGlvbi5wcm90b3R5cGUuYmluZCA9IGZ1bmN0aW9uIChvVGhpcykge1xuICAgIGlmICh0eXBlb2YgdGhpcyAhPT0gXCJmdW5jdGlvblwiKSB7XG4gICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKFwiRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgLSBjYW4ndCBjYWxsIGJvdW5kZWQgZWxlbWVudFwiKTtcbiAgICB9XG4gICAgdmFyIGFBcmdzID0gQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKTtcbiAgICB2YXIgZlRvQmluZCA9IHRoaXM7IFxuICAgIHZhciBmTk9QID0gZnVuY3Rpb24gKCkge307XG4gICAgdmFyIGZCb3VuZCA9IGZ1bmN0aW9uICgpIHtcbiAgICAgICAgcmV0dXJuIGZUb0JpbmQuYXBwbHkodGhpcyBpbnN0YW5jZW9mIGZOT1AgJiYgb1RoaXNcbiAgICAgICAgICAgICAgICAgPyB0aGlzXG4gICAgICAgICAgICAgICAgIDogb1RoaXMsXG4gICAgICAgICAgICAgICAgIGFBcmdzLmNvbmNhdChBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMpKSk7XG4gICAgfTtcbiAgICBmTk9QLnByb3RvdHlwZSA9IHRoaXMucHJvdG90eXBlO1xuICAgIGZCb3VuZC5wcm90b3R5cGUgPSBuZXcgZk5PUCgpO1xuICAgIHJldHVybiBmQm91bmQ7XG4gIH07XG59IiwidmFyIENvbW1vbiA9IHJlcXVpcmUoJy4vY29tbW9uJyk7XG52YXIgXyA9IHJlcXVpcmUoJy4vdXRpbHMnKTtcbnZhciBFbGVtID0gcmVxdWlyZSgnLi9lbGVtJyk7XG52YXIgbW91bnRlZCA9IHt9O1xuXG5mdW5jdGlvbiBoYXNEYXRhKG5vZGUsIG5hbWUpIHtcbiAgcmV0dXJuIG5vZGUuYXR0cmlidXRlcyAmJiBub2RlLmF0dHJpYnV0ZXNbJ2RhdGEtJyArIG5hbWVdO1xufVxuXG5mdW5jdGlvbiBkYXRhKG5vZGUsIG5hbWUpIHtcbiAgaWYgKG5vZGUuZGF0YXNldCkgcmV0dXJuIG5vZGUuZGF0YXNldFtuYW1lXTtcbiAgcmV0dXJuIG5vZGUuYXR0cmlidXRlc1snZGF0YS0nICsgbmFtZV07XG59XG5cbmZ1bmN0aW9uIHVubW91bnRDb21wb25lbnQoZWwpIHtcbiAgaWYgKG1vdW50ZWRbZWxdKSB7XG4gICAgbW91bnRlZFtlbF0oKTtcbiAgICBkZWxldGUgbW91bnRlZFtlbF07ICBcbiAgfVxufVxuXG5mdW5jdGlvbiBtb3VudENvbXBvbmVudChlbCwgb3B0cykge1xuICB2YXIgbmFtZSA9IG9wdHMubmFtZSB8fCAnQ29tcG9uZW50JztcbiAgdmFyIHN0YXRlID0gb3B0cy5zdGF0ZSB8fCBFbGVtLnN0YXRlKCk7XG4gIHZhciBwcm9wcyA9IG9wdHMucHJvcHMgfHwge307XG4gIHZhciByZW5kZXIgPSBvcHRzLnJlbmRlcjtcbiAgdmFyIGV2ZW50Q2FsbGJhY2tzID0ge307XG4gIHZhciBvbGRIYW5kbGVycyA9IFtdO1xuICB2YXIgYWZ0ZXJSZW5kZXIgPSBvcHRzLmFmdGVyUmVuZGVyIHx8IGZ1bmN0aW9uKCkge307XG4gIHZhciBiZWZvcmVSZW5kZXIgPSBvcHRzLmJlZm9yZVJlbmRlciB8fCBmdW5jdGlvbigpIHt9O1xuICB2YXIgdW5tb3VudCA9IG9wdHMudW5tb3VudCB8fCBmdW5jdGlvbigpIHt9O1xuICB2YXIgZ2V0RE9NTm9kZSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gXy5maW5kTm9kZShlbCk7IH07XG4gIHVubW91bnRDb21wb25lbnQoZWwpO1xuICBtb3VudGVkW2VsXSA9IGZ1bmN0aW9uKCkge1xuICAgIHVubW91bnQoc3RhdGUsIF8uY2xvbmUocHJvcHMpLCB7IHJlZnM6IHt9LCBnZXRET01Ob2RlOiBnZXRET01Ob2RlIH0pO1xuICAgIHN0YXRlLnJlcGxhY2Uoe30pO1xuICB9O1xuICBpZiAob3B0cy5pbml0KSB7IG9wdHMuaW5pdChzdGF0ZSwgXy5jbG9uZShwcm9wcykpOyB9XG4gIF8ub24oZWwsIENvbW1vbi5ldmVudHMsIGZ1bmN0aW9uKGUpIHsgLy8gYnViYmxlcyBsaXN0ZW5lciwgVE9ETyA6IGhhbmRsZSBtb3VzZSBldmVudCBpbiBhIGNsZXZlciB3YXlcbiAgICAgIGUgPSBlIHx8IHdpbmRvdy5ldmVudDtcbiAgICAgIHZhciBub2RlID0gZS50YXJnZXQgfHwgZS5zcmNFbGVtZW50O1xuICAgICAgdmFyIG5hbWUgPSBkYXRhKG5vZGUsICdub2RlaWQnKSArICdfJyArIGUudHlwZTsgLy9ub2RlLmRhdGFzZXQubm9kZWlkICsgXCJfXCIgKyBlLnR5cGU7XG4gICAgICBpZiAoZXZlbnRDYWxsYmFja3NbbmFtZV0pIHtcbiAgICAgICAgICBldmVudENhbGxiYWNrc1tuYW1lXShlKTsgICAgXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdoaWxlKCFldmVudENhbGxiYWNrc1tuYW1lXSAmJiBub2RlICYmIG5vZGUgIT09IG51bGwgJiYgaGFzRGF0YShub2RlLCAnbm9kZWlkJykpIHsvL25vZGUuZGF0YXNldCAmJiBub2RlLmRhdGFzZXQubm9kZWlkKSB7XG4gICAgICAgICAgICAgIG5vZGUgPSBub2RlLnBhcmVudEVsZW1lbnQ7XG4gICAgICAgICAgICAgIGlmIChub2RlICYmIG5vZGUgIT09IG51bGwgJiYgaGFzRGF0YShub2RlLCAnbm9kZWlkJykpIHsgLy9ub2RlLmRhdGFzZXQgJiYgbm9kZS5kYXRhc2V0Lm5vZGVpZCkge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBkYXRhKG5vZGUsICdub2RlaWQnKSArICdfJyArIGUudHlwZTsgLy9ub2RlLmRhdGFzZXQubm9kZWlkICsgXCJfXCIgKyBlLnR5cGU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGV2ZW50Q2FsbGJhY2tzW25hbWVdKSB7XG4gICAgICAgICAgICAgIGV2ZW50Q2FsbGJhY2tzW25hbWVdKGUpOyAgICBcbiAgICAgICAgICB9XG4gICAgICB9XG4gIH0pO1xuICBmdW5jdGlvbiByZXJlbmRlcigpIHtcbiAgICAgIENvbW1vbi5tYXJrU3RhcnQobmFtZSArICcuZ2xvYmFsUmVuZGVyaW5nJyk7XG4gICAgICBfLmVhY2gob2xkSGFuZGxlcnMsIGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgICBkZWxldGUgZXZlbnRDYWxsYmFja3NbaGFuZGxlcl07XG4gICAgICB9KTtcbiAgICAgIG9sZEhhbmRsZXJzID0gW107XG4gICAgICB2YXIgZm9jdXMgPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50IHx8IHt9OyAvLyBUT0RPIDogY2hlY2sgaWYgaW5wdXQvc2VsZWN0L3RleHRhcmVhLCByZW1lbWJlciBjdXJzb3IgcG9zaXRpb24gaGVyZVxuICAgICAgdmFyIGtleSA9IGZvY3VzLmRhdGFzZXQgPyBmb2N1cy5kYXRhc2V0LmtleSA6IChmb2N1cy5hdHRyaWJ1dGVzIHx8IFtdKVsna2V5J107IC8vIFRPRE8gOiBtYXliZSBhIGJ1ZyBoZXJlXG4gICAgICB2YXIgd2FpdGluZ0hhbmRsZXJzID0gW107XG4gICAgICB2YXIgcmVmcyA9IHt9O1xuICAgICAgYmVmb3JlUmVuZGVyKHN0YXRlLCBfLmNsb25lKHByb3BzKSwgeyByZWZzOiByZWZzLCBnZXRET01Ob2RlOiBnZXRET01Ob2RlIH0pO1xuICAgICAgQ29tbW9uLm1hcmtTdGFydChuYW1lICsgJy5yZW5kZXInKTtcbiAgICAgIHZhciBlbGVtVG9SZW5kZXIgPSByZW5kZXIoc3RhdGUsIF8uY2xvbmUocHJvcHMpLCB7IHJlZnM6IHJlZnMsIGdldERPTU5vZGU6IGdldERPTU5vZGUgfSk7XG4gICAgICBDb21tb24ubWFya1N0b3AobmFtZSArICcucmVuZGVyJyk7XG4gICAgICBFbGVtLnJlbmRlcihlbGVtVG9SZW5kZXIsIGVsLCB7IHdhaXRpbmdIYW5kbGVyczogd2FpdGluZ0hhbmRsZXJzLCBfX3Jvb3RMaXN0ZW5lcjogdHJ1ZSwgcmVmczogcmVmcyB9KTtcbiAgICAgIGFmdGVyUmVuZGVyKHN0YXRlLCBfLmNsb25lKHByb3BzKSwgeyByZWZzOiByZWZzLCBnZXRET01Ob2RlOiBnZXRET01Ob2RlIH0pO1xuICAgICAgaWYgKGtleSkge1xuICAgICAgICAgIHZhciBmb2N1c05vZGUgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCdbZGF0YS1rZXk9XCInICsga2V5ICsgJ1wiXScpOy8vJCgnW2RhdGEta2V5PVwiJyArIGtleSArICdcIl0nKTtcbiAgICAgICAgICBfLmZvY3VzKGZvY3VzTm9kZSk7IC8vIGZvY3VzTm9kZS5mb2N1cygpOyAgLy8gVE9ETyA6IG1heWJlIGEgYnVnIGhlcmVcbiAgICAgICAgICBpZiAoZm9jdXNOb2RlLnZhbHVlKSB7IC8vZm9jdXNOb2RlLnZhbCgpKSB7XG4gICAgICAgICAgICAgIHZhciBzdHJMZW5ndGggPSBmb2N1c05vZGUudmFsdWUubGVuZ3RoICogMjsgLy8gZm9jdXNOb2RlLnZhbCgpLmxlbmd0aCAqIDI7XG4gICAgICAgICAgICAgIGZvY3VzTm9kZS5zZXRTZWxlY3Rpb25SYW5nZShzdHJMZW5ndGgsIHN0ckxlbmd0aCk7IC8vZm9jdXNOb2RlWzBdLnNldFNlbGVjdGlvblJhbmdlKHN0ckxlbmd0aCwgc3RyTGVuZ3RoKTsgIC8vIFRPRE8gOiBoYW5kbGUgb3RoZXIga2luZCBvZiBpbnB1dCAuLi4gbGlrZSBzZWxlY3QsIGV0YyAuLi4gICBcbiAgICAgICAgICB9XG4gICAgICB9XG4gICAgICBfLmVhY2god2FpdGluZ0hhbmRsZXJzLCBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgICAgb2xkSGFuZGxlcnMucHVzaChoYW5kbGVyLmlkICsgJ18nICsgaGFuZGxlci5ldmVudC5yZXBsYWNlKCdvbicsICcnKSk7XG4gICAgICAgICAgZXZlbnRDYWxsYmFja3NbaGFuZGxlci5pZCArICdfJyArIGhhbmRsZXIuZXZlbnQucmVwbGFjZSgnb24nLCAnJyldID0gZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgIGhhbmRsZXIuY2FsbGJhY2suYXBwbHkoeyByZW5kZXI6IHJlbmRlciB9LCBhcmd1bWVudHMpOyAgICAgICAgICAgICAgICAgICAgICAgIFxuICAgICAgICAgIH1cbiAgICAgIH0pO1xuICAgICAgQ29tbW9uLm1hcmtTdG9wKG5hbWUgKyAnLmdsb2JhbFJlbmRlcmluZycpO1xuICB9XG4gIHJlcmVuZGVyKCk7XG4gIHN0YXRlLm9uQ2hhbmdlKHJlcmVuZGVyKTsvL0NvbW1vbi5kZWZlcmVkKHJlcmVuZGVyKSk7XG4gIHJldHVybiBzdGF0ZTtcbn1cblxuZnVuY3Rpb24gc2VydmVyU2lkZUNvbXBvbmVudChvcHRzLCBub2RhdGFpZCkge1xuICB2YXIgbmFtZSA9IG9wdHMubmFtZSB8fCAnQ29tcG9uZW50JztcbiAgdmFyIHN0YXRlID0gb3B0cy5zdGF0ZSB8fCBFbGVtLnN0YXRlKCk7XG4gIHZhciBwcm9wcyA9IG9wdHMucHJvcHMgfHwge307XG4gIHZhciByZW5kZXIgPSBvcHRzLnJlbmRlcjtcbiAgdmFyIGFmdGVyUmVuZGVyID0gb3B0cy5hZnRlclJlbmRlciB8fCBmdW5jdGlvbigpIHt9O1xuICBpZiAob3B0cy5pbml0KSB7IG9wdHMuaW5pdChzdGF0ZSwgXy5jbG9uZShwcm9wcykpOyB9XG4gIENvbW1vbi5tYXJrU3RhcnQobmFtZSArICcuZ2xvYmFsUmVuZGVyaW5nJyk7XG4gIHZhciByZWZzID0ge307XG4gIENvbW1vbi5tYXJrU3RhcnQobmFtZSArICcucmVuZGVyJyk7XG4gIHZhciBlbGVtVG9SZW5kZXIgPSByZW5kZXIoc3RhdGUsIF8uY2xvbmUocHJvcHMpLCB7IHJlZnM6IHJlZnMsIGdldERPTU5vZGU6IGZ1bmN0aW9uKCkge30gfSk7XG4gIENvbW1vbi5tYXJrU3RvcChuYW1lICsgJy5yZW5kZXInKTtcbiAgdmFyIHN0ciA9IEVsZW0ucmVuZGVyVG9TdHJpbmcoZWxlbVRvUmVuZGVyLCB7IHdhaXRpbmdIYW5kbGVyczogW10sIF9fcm9vdExpc3RlbmVyOiB0cnVlLCByZWZzOiByZWZzLCBfX25vRGF0YUlkOiBub2RhdGFpZCB9KTtcbiAgYWZ0ZXJSZW5kZXIoc3RhdGUsIF8uY2xvbmUocHJvcHMpLCB7IHJlZnM6IHJlZnMsIGdldERPTU5vZGU6IGZ1bmN0aW9uKCkge30gfSk7XG4gIENvbW1vbi5tYXJrU3RvcChuYW1lICsgJy5nbG9iYWxSZW5kZXJpbmcnKTtcbiAgcmV0dXJuIHN0cjtcbn1cblxuZnVuY3Rpb24gZmFjdG9yeShvcHRzKSB7XG4gIHJldHVybiBmdW5jdGlvbihwcm9wcywgdG8pIHtcbiAgICB2YXIgYXBpID0ge1xuICAgICAgX19jb21wb25lbnRGYWN0b3J5OiB0cnVlLFxuICAgICAgcmVuZGVyVG9TdGF0aWNIdG1sOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9wdCA9IF8uY2xvbmUob3B0cyk7XG4gICAgICAgIG9wdC5wcm9wcyA9IF8uZXh0ZW5kKF8uY2xvbmUob3B0cy5wcm9wcyB8fCB7fSksIHByb3BzIHx8IHt9KTtcbiAgICAgICAgcmV0dXJuIHNlcnZlclNpZGVDb21wb25lbnQob3B0LCB0cnVlKTsgIFxuICAgICAgfSxcbiAgICAgIHJlbmRlclRvU3RyaW5nOiBmdW5jdGlvbigpIHtcbiAgICAgICAgdmFyIG9wdCA9IF8uY2xvbmUob3B0cyk7XG4gICAgICAgIG9wdC5wcm9wcyA9IF8uZXh0ZW5kKF8uY2xvbmUob3B0cy5wcm9wcyB8fCB7fSksIHByb3BzIHx8IHt9KTtcbiAgICAgICAgcmV0dXJuIHNlcnZlclNpZGVDb21wb25lbnQob3B0KTtcbiAgICAgIH0sXG4gICAgICByZW5kZXJUbzogZnVuY3Rpb24oZWwsIGRlZmVyKSB7XG4gICAgICAgIHZhciBvcHQgPSBfLmNsb25lKG9wdHMpO1xuICAgICAgICBvcHQucHJvcHMgPSBfLmV4dGVuZChfLmNsb25lKG9wdHMucHJvcHMgfHwge30pLCBwcm9wcyB8fCB7fSk7XG4gICAgICAgIGlmIChkZWZlcikge1xuICAgICAgICAgIENvbW1vbi5kZWZlcihmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIG1vdW50Q29tcG9uZW50KGVsLCBvcHQpO1xuICAgICAgICAgIH0pO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHJldHVybiBtb3VudENvbXBvbmVudChlbCwgb3B0KTtcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH07XG4gICAgaWYgKHRvKSByZXR1cm4gYXBpLnJlbmRlclRvKHRvKTtcbiAgICByZXR1cm4gYXBpOyAgXG4gIH0gIFxufVxuXG5leHBvcnRzLnVubW91bnRDb21wb25lbnQgPSB1bm1vdW50Q29tcG9uZW50O1xuXG5leHBvcnRzLmNvbXBvbmVudCA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgaWYgKCFvcHRzLmNvbnRhaW5lcikgcmV0dXJuIGZhY3Rvcnkob3B0cyk7XG4gIHZhciBlbCA9IG9wdHMuY29udGFpbmVyO1xuICBtb3VudENvbXBvbmVudChlbCwgb3B0cyk7XG59O1xuXG5leHBvcnRzLmNvbXBvbmVudFRvU3RyaW5nID0gZnVuY3Rpb24ob3B0cykge1xuICB2YXIgb3B0ID0gXy5jbG9uZShvcHRzKTtcbiAgb3B0LnByb3BzID0gXy5leHRlbmQoXy5jbG9uZShvcHRzLnByb3BzIHx8IHt9KSwgcHJvcHMgfHwge30pO1xuICByZXR1cm4gc2VydmVyU2lkZUNvbXBvbmVudChvcHQpO1xufTsiLCJ2YXIgQ29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKTtcbnZhciBfID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIENvbXBvbmVudHMgPSByZXF1aXJlKCcuL2NvbXBvbmVudCcpO1xudmFyIHN0YXRlID0gcmVxdWlyZSgnLi9zdGF0ZScpO1xudmFyIHJlZ2lzdGVyV2ViQ29tcG9uZW50ID0gcmVxdWlyZSgnLi93ZWJjb21wb25lbnQnKS5yZWdpc3RlcldlYkNvbXBvbmVudDtcbnZhciBTdHJpbmdpZmllciA9IHJlcXVpcmUoJy4vc3RyaW5naWZ5Jyk7XG52YXIgRGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vZXZlbnRzJyk7XG5cbmZ1bmN0aW9uIHN0eWxlVG9TdHJpbmcoYXR0cnMpIHtcbiAgICBpZiAoXy5pc1VuZGVmaW5lZChhdHRycykpIHJldHVybiAnJztcbiAgICB2YXIgYXR0cnNBcnJheSA9IF8ubWFwKF8ua2V5cyhhdHRycyksIGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIga2V5TmFtZSA9IF8uZGFzaGVyaXplKGtleSk7XG4gICAgICAgIGlmIChrZXkgPT09ICdjbGFzc05hbWUnKSB7XG4gICAgICAgICAgICBrZXlOYW1lID0gJ2NsYXNzJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgdmFsdWUgPSBhdHRyc1trZXldO1xuICAgICAgICBpZiAoIV8uaXNVbmRlZmluZWQodmFsdWUpICYmIF8uaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIV8uaXNVbmRlZmluZWQodmFsdWUpKSB7XG4gICAgICAgICAgICByZXR1cm4ga2V5TmFtZSArICc6ICcgKyB2YWx1ZSArICc7JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBhdHRyc0FycmF5ID0gXy5maWx0ZXIoYXR0cnNBcnJheSwgZnVuY3Rpb24oaXRlbSkgeyByZXR1cm4gIV8uaXNVbmRlZmluZWQoaXRlbSk7IH0pO1xuICAgIHJldHVybiBhdHRyc0FycmF5LmpvaW4oJyAnKTtcbn1cblxuZnVuY3Rpb24gY2xhc3NUb0FycmF5KGF0dHJzKSB7IC8qIEhhbmRsZSBjbGFzcyBhcyBvYmplY3Qgd2l0aCBib29sZWFuIHZhbHVlcyAqL1xuICAgIGlmIChfLmlzVW5kZWZpbmVkKGF0dHJzKSkgcmV0dXJuIFtdO1xuICAgIHZhciBhdHRyc0FycmF5ID0gXy5tYXAoXy5rZXlzKGF0dHJzKSwgZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGF0dHJzW2tleV07XG4gICAgICAgIGlmICghXy5pc1VuZGVmaW5lZCh2YWx1ZSkgJiYgdmFsdWUgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHJldHVybiBfLmRhc2hlcml6ZShrZXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGF0dHJzQXJyYXkgPSBfLmZpbHRlcihhdHRyc0FycmF5LCBmdW5jdGlvbihpdGVtKSB7IHJldHVybiAhXy5pc1VuZGVmaW5lZChpdGVtKTsgfSk7XG4gICAgcmV0dXJuIGF0dHJzQXJyYXk7XG59XG5cbmZ1bmN0aW9uIHdyYXBDaGlsZHJlbihjaGlsZHJlbikge1xuICAgIGlmIChjaGlsZHJlbiA9PT0gMCkge1xuICAgICAgICByZXR1cm4gY2hpbGRyZW47XG4gICAgfSBlbHNlIGlmIChjaGlsZHJlbiA9PT0gJycpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gY2hpbGRyZW4gfHwgW107XG59XG5cbmZ1bmN0aW9uIGJ1aWxkUmVmKGlkKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0RE9NTm9kZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gXy5maW5kTm9kZSgnW2RhdGEtbm9kZWlkPVwiJyArIGlkICsgJ1wiXScpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdEV2ZW50SGFuZGxlcnMoYXR0cnMsIG5vZGVJZCwgY29udGV4dCkge1xuICAgIF8uZWFjaChfLmtleXMoYXR0cnMpLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGtleU5hbWUgPSBfLmRhc2hlcml6ZShrZXkpOyAgXG4gICAgICAgIGlmIChfLnN0YXJ0c1dpdGgoa2V5TmFtZSwgJ29uJykpIHtcbiAgICAgICAgICAgIGlmIChjb250ZXh0ICYmIGNvbnRleHQud2FpdGluZ0hhbmRsZXJzKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dC53YWl0aW5nSGFuZGxlcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHJvb3Q6IGNvbnRleHQucm9vdCxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IG5vZGVJZCwgXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50OiBrZXlOYW1lLFxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogYXR0cnNba2V5XVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IFxuICAgICAgICBpZiAoa2V5TmFtZSA9PT0gJ3JlZicgJiYgY29udGV4dCAmJiBjb250ZXh0LnJlZnMpIGNvbnRleHQucmVmc1thdHRyc1trZXldXSA9IGJ1aWxkUmVmKG5vZGVJZCk7XG4gICAgfSk7ICAgXG59XG5cbmZ1bmN0aW9uIGFzQXR0cmlidXRlKGtleSwgdmFsdWUpIHsgcmV0dXJuIHsga2V5OiBrZXksIHZhbHVlOiB2YWx1ZSB9OyB9XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZXNUb0FycmF5KGF0dHJzKSB7XG4gICAgaWYgKF8uaXNVbmRlZmluZWQoYXR0cnMpKSByZXR1cm4gW107XG4gICAgdmFyIGF0dHJzQXJyYXkgPSBbXTtcbiAgICBfLmVhY2goXy5rZXlzKGF0dHJzKSwgZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBrZXlOYW1lID0gXy5kYXNoZXJpemUoa2V5KTtcbiAgICAgICAgaWYgKGtleSA9PT0gJ2NsYXNzTmFtZScpIHtcbiAgICAgICAgICAgIGtleU5hbWUgPSAnY2xhc3MnO1xuICAgICAgICB9XG4gICAgICAgIGlmICghXy5zdGFydHNXaXRoKGtleU5hbWUsICdvbicpICYmIGtleU5hbWUgIT09ICdyZWYnKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBhdHRyc1trZXldO1xuICAgICAgICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKHZhbHVlKSAmJiBfLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGlmIChfLmlzT2JqZWN0KHZhbHVlKSAmJiBrZXlOYW1lID09PSAnc3R5bGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIGF0dHJzQXJyYXkucHVzaChhc0F0dHJpYnV0ZSgnc3R5bGUnLCBzdHlsZVRvU3RyaW5nKHZhbHVlKSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KHZhbHVlKSAmJiBrZXlOYW1lID09PSAnY2xhc3MnKSB7XG4gICAgICAgICAgICAgICAgICAgIGF0dHJzQXJyYXkucHVzaChhc0F0dHJpYnV0ZShrZXlOYW1lLCB2YWx1ZS5qb2luKCcgJykpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNPYmplY3QodmFsdWUpICYmIGtleU5hbWUgPT09ICdjbGFzcycpIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0cnNBcnJheS5wdXNoKGFzQXR0cmlidXRlKGtleU5hbWUsIGNsYXNzVG9BcnJheSh2YWx1ZSkuam9pbignICcpKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0cnNBcnJheS5wdXNoKGFzQXR0cmlidXRlKGtleU5hbWUsIHZhbHVlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGF0dHJzQXJyYXk7XG59XG5cbmZ1bmN0aW9uIGVsKG5hbWUsIGF0dHJzLCBjaGlsZHJlbikge1xuICAgIHZhciBub2RlSWQgPSBfLnVuaXF1ZUlkKCdub2RlXycpO1xuICAgIGlmIChfLmlzVW5kZWZpbmVkKGNoaWxkcmVuKSAmJiAhXy5pc1VuZGVmaW5lZChhdHRycykgJiYgIWF0dHJzLl9faXNBdHRycykge1xuICAgICAgICBjaGlsZHJlbiA9IGF0dHJzO1xuICAgICAgICBhdHRycyA9IHt9O1xuICAgIH1cbiAgICBuYW1lID0gXy5lc2NhcGUobmFtZSkgfHwgJ3Vua25vd24nO1xuICAgIGF0dHJzID0gYXR0cnMgfHwge307XG4gICAgY2hpbGRyZW4gPSB3cmFwQ2hpbGRyZW4oY2hpbGRyZW4pO1xuICAgIGlmIChfLmlzUmVnRXhwKGNoaWxkcmVuKSB8fCBfLmlzVW5kZWZpbmVkKGNoaWxkcmVuKSB8fCBfLmlzTnVsbChjaGlsZHJlbikpIGNoaWxkcmVuID0gW107IFxuICAgIGlmIChfLmlzQXJyYXkoY2hpbGRyZW4pKSB7XG4gICAgICAgIGNoaWxkcmVuID0gXy5jaGFpbihjaGlsZHJlbikubWFwKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGNoaWxkKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbihpdGVtKSB7IFxuICAgICAgICAgICAgcmV0dXJuICFfLmlzVW5kZWZpbmVkKGl0ZW0pOyBcbiAgICAgICAgfSkudmFsdWUoKTtcbiAgICB9IFxuICAgIHZhciBzZWxmQ2xvc2VUYWcgPSBfLmNvbnRhaW5zKENvbW1vbi52b2lkRWxlbWVudHMsIG5hbWUudG9VcHBlckNhc2UoKSkgXG4gICAgICAgICYmIChfLmlzTnVsbChjaGlsZHJlbikgfHwgXy5pc1VuZGVmaW5lZChjaGlsZHJlbikgfHwgKF8uaXNBcnJheShjaGlsZHJlbikgJiYgY2hpbGRyZW4ubGVuZ3RoID09PSAwKSk7XG4gICAgdmFyIGF0dHJzQXJyYXkgPSBhdHRyaWJ1dGVzVG9BcnJheShhdHRycyk7XG4gICAgYXR0cnNBcnJheS5wdXNoKGFzQXR0cmlidXRlKCdkYXRhLW5vZGVpZCcsIF8uZXNjYXBlKG5vZGVJZCkpKTtcbiAgICBpZiAoQ29tbW9uLmRlYnVnKSBhdHRyc0FycmF5LnB1c2goYXNBdHRyaWJ1dGUoJ3RpdGxlJywgXy5lc2NhcGUobm9kZUlkKSkpO1xuICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgIGF0dHJzOiBhdHRycyxcbiAgICAgICAgY2hpbGRyZW46IGNoaWxkcmVuLFxuICAgICAgICBpc0VsZW1lbnQ6IHRydWUsXG4gICAgICAgIG5vZGVJZDogbm9kZUlkLFxuICAgICAgICB0b0pzb25TdHJpbmc6IGZ1bmN0aW9uKHByZXR0eSkge1xuICAgICAgICAgICAgaWYgKHByZXR0eSkgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRoaXMsIG51bGwsIDIpO1xuICAgICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRoaXMpO1xuICAgICAgICB9LFxuICAgICAgICB0b0h0bWxOb2RlOiBmdW5jdGlvbihkb2MsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIGV4dHJhY3RFdmVudEhhbmRsZXJzKGF0dHJzLCBub2RlSWQsIGNvbnRleHQpO1xuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2MuY3JlYXRlRWxlbWVudChfLmVzY2FwZShuYW1lKSk7XG4gICAgICAgICAgICBfLmVhY2goYXR0cnNBcnJheSwgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKGl0ZW0ua2V5LCBpdGVtLnZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZnVuY3Rpb24gYXBwZW5kU2luZ2xlTm9kZShfX2NoaWxkcmVuLCBfX2VsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc051bWJlcihfX2NoaWxkcmVuKSkge1xuICAgICAgICAgICAgICAgICAgICBfX2VsZW1lbnQuYXBwZW5kQ2hpbGQoZG9jLmNyZWF0ZVRleHROb2RlKF9fY2hpbGRyZW4gKyAnJykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc1N0cmluZyhfX2NoaWxkcmVuKSkge1xuICAgICAgICAgICAgICAgICAgICBfX2VsZW1lbnQuYXBwZW5kQ2hpbGQoZG9jLmNyZWF0ZVRleHROb2RlKF9fY2hpbGRyZW4pKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNCb29sZWFuKF9fY2hpbGRyZW4pKSB7XG4gICAgICAgICAgICAgICAgICAgIF9fZWxlbWVudC5hcHBlbmRDaGlsZChkb2MuY3JlYXRlVGV4dE5vZGUoX19jaGlsZHJlbiArICcnKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzT2JqZWN0KF9fY2hpbGRyZW4pICYmIF9fY2hpbGRyZW4uaXNFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIF9fZWxlbWVudC5hcHBlbmRDaGlsZChfX2NoaWxkcmVuLnRvSHRtbE5vZGUoZG9jLCBjb250ZXh0KSk7IFxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc09iamVjdChfX2NoaWxkcmVuKSAmJiBfX2NoaWxkcmVuLl9fYXNIdG1sKSB7XG4gICAgICAgICAgICAgICAgICAgIF9fZWxlbWVudC5pbm5lckhUTUwgPSBfX2NoaWxkcmVuLl9fYXNIdG1sO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoX19jaGlsZHJlbi5fX2NvbXBvbmVudEZhY3RvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbXBJZCA9IF8uZXNjYXBlKF8udW5pcXVlSWQoJ2NvbXBvbmVudF8nKSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzcGFuID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgICAgICAgICAgc3Bhbi5zZXRBdHRyaWJ1dGUoJ2RhdGEtY29tcG9uZW50aWQnLCBjb21wSWQpO1xuICAgICAgICAgICAgICAgICAgICBfX2VsZW1lbnQuYXBwZW5kQ2hpbGQoc3Bhbik7XG4gICAgICAgICAgICAgICAgICAgIF9fY2hpbGRyZW4ucmVuZGVyVG8oJ1tkYXRhLWNvbXBvbmVudGlkPVwiJyArIGNvbXBJZCArICdcIl0nLCB0cnVlKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBfX2VsZW1lbnQuYXBwZW5kQ2hpbGQoZG9jLmNyZWF0ZVRleHROb2RlKF9fY2hpbGRyZW4udG9TdHJpbmcoKSkpO1xuICAgICAgICAgICAgICAgIH0gICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXNlbGZDbG9zZVRhZykge1xuICAgICAgICAgICAgICAgIGlmIChfLmlzQXJyYXkoY2hpbGRyZW4pKSB7XG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaChjaGlsZHJlbiwgZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGVuZFNpbmdsZU5vZGUoY2hpbGQsIGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhcHBlbmRTaW5nbGVOb2RlKGNoaWxkcmVuLCBlbGVtZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgICAgfVxuICAgIH07XG59IFxuXG5mdW5jdGlvbiByZW5kZXJUb05vZGUoZWwsIGRvYywgY29udGV4dCkge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oZWwpKSBlbCA9IGVsKChjb250ZXh0IHx8IHsgcHJvcHM6IHt9fSkucHJvcHMpXG4gICAgaWYgKCFfLmlzVW5kZWZpbmVkKGVsKSkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KGVsKSkge1xuICAgICAgICAgICAgcmV0dXJuIF8uY2hhaW4oZWwpLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihpdGVtKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhXy5pc1VuZGVmaW5lZChpdGVtKTtcbiAgICAgICAgICAgIH0pLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtLnRvSHRtbE5vZGUoZG9jLCBjb250ZXh0KTtcbiAgICAgICAgICAgIH0pLnZhbHVlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW2VsLnRvSHRtbE5vZGUoZG9jLCBjb250ZXh0KV07XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxufSAgIFxuXG5leHBvcnRzLnJlbmRlclRvU3RyaW5nID0gZnVuY3Rpb24oZWwsIGNvbnRleHQpIHtcbiAgICBDb21tb24ubWFya1N0YXJ0KCdFbGVtLnJlbmRlclRvU3RyaW5nJyk7XG4gICAgdmFyIHN0ciA9IF8ubWFwKHJlbmRlclRvTm9kZShlbCwgU3RyaW5naWZpZXIoY29udGV4dCkpLCBmdW5jdGlvbihuKSB7IHJldHVybiBuLnRvSHRtbFN0cmluZygpOyB9KS5qb2luKCcnKTtcbiAgICBDb21tb24ubWFya1N0b3AoJ0VsZW0ucmVuZGVyVG9TdHJpbmcnKTtcbiAgICByZXR1cm4gc3RyO1xufTtcblxuZXhwb3J0cy5lbCA9IGVsO1xuXG5leHBvcnRzLnNlbCA9IGZ1bmN0aW9uKG5hbWUsIGNoaWxkcmVuKSB7IHJldHVybiBlbChuYW1lLCB7fSwgY2hpbGRyZW4pOyB9OyAvLyBzaW1wbGUgbm9kZSBzZWwobmFtZSwgY2hpbGRyZW4pXG5cbmV4cG9ydHMudmVsID0gZnVuY3Rpb24obmFtZSwgYXR0cnMpIHsgcmV0dXJuIGVsKG5hbWUsIGF0dHJzLCBbXSk7IH07IC8vIHZvaWQgbm9kZSwgY2VsKG5hbWUsIGF0dHJzKVxuXG5leHBvcnRzLm5ic3AgPSBmdW5jdGlvbih0aW1lcykgeyByZXR1cm4gZWwoJ3NwYW4nLCB7IF9fYXNIdG1sOiBfLnRpbWVzKHRpbWVzIHx8IDEsIGZ1bmN0aW9uKCkgeyByZXR1cm4gJyZuYnNwOyc7IH0pIH0pOyB9O1xuXG5leHBvcnRzLnRleHQgPSBmdW5jdGlvbih0ZXh0KSB7IHJldHVybiBlbCgnc3BhbicsIHt9LCB0ZXh0KTsgfTtcblxuZXhwb3J0cy5lbGVtZW50cyA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gXy5tYXAoYXJndW1lbnRzLCBmdW5jdGlvbihpdGVtKSB7IHJldHVybiBpdGVtOyB9KTsgfTtcblxuZXhwb3J0cy5yZW5kZXIgPSBmdW5jdGlvbihlbCwgbm9kZSwgY29udGV4dCkge1xuICAgIENvbW1vbi5tYXJrU3RhcnQoJ0VsZW0ucmVuZGVyJyk7XG4gICAgdmFyIHdhaXRpbmdIYW5kbGVycyA9IChjb250ZXh0IHx8IHt9KS53YWl0aW5nSGFuZGxlcnMgfHwgW107XG4gICAgdmFyIHJlZnMgPSAoY29udGV4dCB8fCB7fSkucmVmcyB8fCB7fTtcbiAgICB2YXIgcHJvcHMgPSAoY29udGV4dCB8fCB7fSkucHJvcHMgfHwge307XG4gICAgdmFyIGRvYyA9IGRvY3VtZW50O1xuICAgIGlmIChub2RlLm93bmVyRG9jdW1lbnQpIHtcbiAgICAgICAgZG9jID0gbm9kZS5vd25lckRvY3VtZW50O1xuICAgIH1cbiAgICBpZiAoXy5pc1N0cmluZyhub2RlKSkge1xuICAgICAgICBub2RlID0gZG9jLnF1ZXJ5U2VsZWN0b3Iobm9kZSk7XG4gICAgfVxuICAgIGlmICghXy5pc1VuZGVmaW5lZChub2RlKSAmJiAhXy5pc051bGwobm9kZSkpIHtcbiAgICAgICAgdmFyIGh0bWxOb2RlID0gcmVuZGVyVG9Ob2RlKGVsLCBkb2MsIHsgcm9vdDogbm9kZSwgd2FpdGluZ0hhbmRsZXJzOiB3YWl0aW5nSGFuZGxlcnMsIHJlZnM6IHJlZnMsIHByb3BzOiBwcm9wcyB9KTtcbiAgICAgICAgd2hpbGUgKCFfLmlzVW5kZWZpbmVkKG5vZGUpICYmICFfLmlzTnVsbChub2RlKSAmJiBub2RlLmZpcnN0Q2hpbGQpIHsgbm9kZS5yZW1vdmVDaGlsZChub2RlLmZpcnN0Q2hpbGQpOyB9XG4gICAgICAgIF8uZWFjaChodG1sTm9kZSwgZnVuY3Rpb24obikge1xuICAgICAgICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKG5vZGUpICYmICFfLmlzTnVsbChub2RlKSkgbm9kZS5hcHBlbmRDaGlsZChuKTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghKGNvbnRleHQgJiYgY29udGV4dC5fX3Jvb3RMaXN0ZW5lcikpIHsgIC8vIGV4dGVybmFsIGxpc3RlbmVyIGhlcmVcbiAgICAgICAgICAgIF8uZWFjaCh3YWl0aW5nSGFuZGxlcnMsIGZ1bmN0aW9uKGhhbmRsZXIpIHsgLy8gaGFuZGxlciBvbiBlYWNoIGNvbmNlcm5lZCBub2RlXG4gICAgICAgICAgICAgICAgXy5vbignW2RhdGEtbm9kZWlkPVwiJyArIGhhbmRsZXIuaWQgKyAnXCJdJywgW2hhbmRsZXIuZXZlbnQucmVwbGFjZSgnb24nLCAnJyldLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICAgICAgaGFuZGxlci5jYWxsYmFjay5hcHBseSh7fSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgICAgICB9KTsgICBcbiAgICAgICAgICAgIH0pO1xuICAgICAgICB9XG4gICAgfVxuICAgIENvbW1vbi5tYXJrU3RvcCgnRWxlbS5yZW5kZXInKTtcbn07XG5leHBvcnRzLnVubW91bnRDb21wb25lbnQgPSBDb21wb25lbnRzLnVubW91bnRDb21wb25lbnQ7XG5leHBvcnRzLmNvbXBvbmVudCA9IENvbXBvbmVudHMuY29tcG9uZW50O1xuZXhwb3J0cy5jb21wb25lbnRUb1N0cmluZyA9IENvbXBvbmVudHMuY29tcG9uZW50VG9TdHJpbmc7XG4vLyBleHBvcnRzLmNvbXBvbmVudEZhY3RvcnkgPSBDb21wb25lbnRzLmNvbXBvbmVudEZhY3Rvcnk7XG5leHBvcnRzLnN0YXRlID0gc3RhdGU7XG5leHBvcnRzLlV0aWxzID0gXztcbmV4cG9ydHMucmVnaXN0ZXJXZWJDb21wb25lbnQgPSByZWdpc3RlcldlYkNvbXBvbmVudDtcbmV4cG9ydHMuZGlzcGF0Y2hlciA9IERpc3BhdGNoZXI7XG5leHBvcnRzLlBlcmYgPSB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkgeyBDb21tb24ucGVyZnMgPSB0cnVlOyB9LFxuICAgIHN0b3A6IGZ1bmN0aW9uKCkgeyBDb21tb24uc3RvcCA9IGZhbHNlOyB9LFxuICAgIG1hcmtTdGFydDogQ29tbW9uLm1hcmtTdGFydCxcbiAgICBtYXJrU3RvcDogQ29tbW9uLm1hcmtTdG9wLFxuICAgIGNvbGxlY3RNZWFzdXJlczogQ29tbW9uLmNvbGxlY3RNZWFzdXJlcyxcbiAgICBwcmludE1lYXN1cmVzOiBDb21tb24ucHJpbnRNZWFzdXJlc1xufTtcblxuZXhwb3J0cy5wcmVkaWNhdGUgPSBmdW5jdGlvbihwcmVkaWNhdGUsIHdoYXQpIHtcbiAgICBpZiAoXy5pc0Z1bmN0aW9uKHByZWRpY2F0ZSkpIHtcbiAgICAgICAgaWYgKHByZWRpY2F0ZSgpID09PSB0cnVlKSB7XG4gICAgICAgICAgICByZXR1cm4gd2hhdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICBpZiAocHJlZGljYXRlID09PSB0cnVlKSB7XG4gICAgICAgICAgICByZXR1cm4gd2hhdDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9XG59O1xuZXhwb3J0cy5wID0gZXhwb3J0cy5wcmVkaWNhdGU7XG5leHBvcnRzLmlmUHJlZCA9IGV4cG9ydHMucHJlZGljYXRlO1xuZXhwb3J0cy5jc3NDbGFzcyA9IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBfLmV4dGVuZCh7fSwge1xuICAgICAgICBleHRlbmQ6IGZ1bmN0aW9uKG8pIHtcbiAgICAgICAgICAgIHJldHVybiBfLmV4dGVuZCh7fSwgbywgb2JqKTsgICAgXG4gICAgICAgIH1cbiAgICB9LCBvYmopO1xufTtcblxuaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZSgnZWxlbScsIFtdLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuICAgIH0pO1xufVxuIiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBldmVudFNwbGl0dGVyID0gL1xccysvO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuXG4gIHZhciBjYWxsYmFja3MgPSBbXTtcblxuICBmdW5jdGlvbiBmaXJlQ2FsbGJhY2tzKG5hbWVzLCBldmVudCkge1xuICAgIHZhciBldmVudE5hbWVzID0gW25hbWVzXTtcbiAgICBpZiAoZXZlbnRTcGxpdHRlci50ZXN0KG5hbWVzKSkge1xuICAgICAgZXZlbnROYW1lcyA9IG5hbWVzLnNwbGl0KGV2ZW50U3BsaXR0ZXIpO1xuICAgIH1cbiAgICBfLmVhY2goZXZlbnROYW1lcywgZnVuY3Rpb24obmFtZSkge1xuICAgICAgXy5lYWNoKGNhbGxiYWNrcywgZnVuY3Rpb24oY2FsbGJhY2tIYXNoKSB7XG4gICAgICAgIGlmIChjYWxsYmFja0hhc2gubmFtZSA9PT0gJ2FsbCcpIHtcbiAgICAgICAgICBjYWxsYmFja0hhc2guY2FsbGJhY2sobmFtZSwgZXZlbnQpO1xuICAgICAgICB9IGVsc2UgaWYgKGNhbGxiYWNrSGFzaC5uYW1lID09PSBuYW1lKSB7XG4gICAgICAgICAgY2FsbGJhY2tIYXNoLmNhbGxiYWNrKGV2ZW50KTtcbiAgICAgICAgfVxuICAgICAgfSk7ICBcbiAgICB9KTsgICAgXG4gIH1cblxuICByZXR1cm4ge1xuICAgIHRyaWdnZXI6IGZpcmVDYWxsYmFja3MsXG4gICAgZGlzcGF0Y2g6IGZpcmVDYWxsYmFja3MsXG4gICAgb246IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICB0aGlzLm9mZihuYW1lLCBjYWxsYmFjayk7XG4gICAgICBjYWxsYmFja3MucHVzaCh7IG5hbWU6IG5hbWUsIGNhbGxiYWNrOiBjYWxsYmFjayB9KTtcbiAgICB9LFxuICAgIG9mZjogZnVuY3Rpb24obmFtZSwgY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrcyA9IF8uZmlsdGVyKGNhbGxiYWNrcywgZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIGlmIChvYmoubmFtZSA9PT0gbmFtZSAmJiBvYmouY2FsbGJhY2sgPT09IGNhbGxiYWNrKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSk7XG4gICAgfSxcbiAgfTtcbn07IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obW9kKSB7XG5cbiAgdmFyIHRoZU1vZGVsID0gXy5leHRlbmQoe30sIG1vZCB8fCB7fSk7XG5cbiAgdmFyIGNhbGxiYWNrcyA9IFtdO1xuXG4gIGZ1bmN0aW9uIGZpcmVDYWxsYmFja3MoKSB7XG4gICAgXy5lYWNoKGNhbGxiYWNrcywgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfSk7XG4gIH1cblxuICB2YXIgYXBpID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF8uY2xvbmUodGhlTW9kZWwpO1xuICB9O1xuXG4gIHJldHVybiBfLmV4dGVuZChhcGksIHtcbiAgICBvbkNoYW5nZTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbiAgICB9LFxuICAgIGdldDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gdGhlTW9kZWxba2V5XTtcbiAgICB9LFxuICAgIGFsbDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gXy5jbG9uZSh0aGVNb2RlbCk7XG4gICAgfSxcbiAgICBmb3JjZVVwZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICBmaXJlQ2FsbGJhY2tzKCk7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKG9iaiwgc2lsZW50T3JDYWxsYmFjaykge1xuICAgICAgdmFyIHNpbGVudCA9IF8uaXNCb29sZWFuKHNpbGVudE9yQ2FsbGJhY2spICYmIHNpbGVudE9yQ2FsbGJhY2sgPT09IHRydWU7XG4gICAgICBpZiAoIV8uaXNVbmRlZmluZWQob2JqKSAmJiBfLmlzT2JqZWN0KG9iaikpIHtcbiAgICAgICAgXy5tYXAoXy5rZXlzKG9iaiksIGZ1bmN0aW9uKGspIHtcbiAgICAgICAgICB0aGVNb2RlbFtrXSA9IG9ialtrXTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghc2lsZW50KSBmaXJlQ2FsbGJhY2tzKCk7XG4gICAgICAgIGlmICghc2lsZW50KShzaWxlbnRPckNhbGxiYWNrIHx8IGZ1bmN0aW9uKCkge30pKCk7XG4gICAgICB9XG4gICAgfSxcbiAgICByZXBsYWNlOiBmdW5jdGlvbihvYmosIHNpbGVudE9yQ2FsbGJhY2spIHtcbiAgICAgIHRoZU1vZGVsID0ge307XG4gICAgICB0aGlzLnNldChvYmosIHNpbGVudE9yQ2FsbGJhY2spO1xuICAgIH0sXG4gICAgcmVtb3ZlOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgIGRlbGV0ZSB0aGVNb2RlbFtrZXldO1xuICAgICAgZmlyZUNhbGxiYWNrcygpO1xuICAgIH1cbiAgfSk7XG59OyIsInZhciBDb21tb24gPSByZXF1aXJlKCcuL2NvbW1vbicpO1xudmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gc3RyaW5naWZ5RG9jKGN0eCkge1xuICAgIGN0eCA9IGN0eCB8fCB7fTtcbiAgICBmdW5jdGlvbiBub2RlKG5hbWUpIHsgXG4gICAgICAgIHZhciBhdHRycyA9IFtdO1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNldEF0dHJpYnV0ZTogZnVuY3Rpb24oa2V5LCB2YWx1ZSkgeyBcbiAgICAgICAgICAgICAgICBpZiAoa2V5ID09PSAnZGF0YS1ub2RlaWQnKSB7XG4gICAgICAgICAgICAgICAgICAgIGlmICghY3R4Ll9fbm9EYXRhSWQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGF0dHJzLnB1c2goJ2RhdGEtc25vZGVpZCcgKyAnPVwiJyArIHZhbHVlICsgJ1wiJyk7IFxuICAgICAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0cnMucHVzaChrZXkgKyAnPVwiJyArIHZhbHVlICsgJ1wiJyk7IFxuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBhcHBlbmRDaGlsZDogZnVuY3Rpb24oY2hpbGQpIHsgY2hpbGRyZW4ucHVzaChjaGlsZCk7IH0sXG4gICAgICAgICAgICB0b0h0bWxTdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmQ2xvc2VUYWcgPSBfLmNvbnRhaW5zKENvbW1vbi52b2lkRWxlbWVudHMsIG5hbWUudG9VcHBlckNhc2UoKSkgJiYgY2hpbGRyZW4ubGVuZ3RoID09PSAwO1xuICAgICAgICAgICAgICAgIGlmIChzZWxmQ2xvc2VUYWcpIHJldHVybiAnPCcgKyBuYW1lICsgJyAnICsgYXR0cnMuam9pbignICcpICsgJyAvPic7XG4gICAgICAgICAgICAgICAgcmV0dXJuICc8JyArIG5hbWUgKyAnICcgKyBhdHRycy5qb2luKCcgJykgKyAnPicgKyBfLm1hcChjaGlsZHJlbiwgZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkLnRvSHRtbFN0cmluZygpO1xuICAgICAgICAgICAgICAgIH0pLmpvaW4oJycpICsgJzwvJyArIG5hbWUgKyAnPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY3JlYXRlRWxlbWVudDogbm9kZSxcbiAgICAgICAgY3JlYXRlVGV4dE5vZGU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHRvSHRtbFN0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSAgIFxuICAgIH07XG59XG4iLCJ2YXIgX19pZENvdW50ZXIgPSAwO1xuXG52YXIgZXNjYXBlTWFwID0ge1xuICAgICcmJzogJyZhbXA7JyxcbiAgICAnPCc6ICcmbHQ7JyxcbiAgICAnPic6ICcmZ3Q7JyxcbiAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICBcIidcIjogJyYjeDI3OycsXG4gICAgJ2AnOiAnJiN4NjA7J1xufTtcblxudmFyIGNyZWF0ZUVzY2FwZXIgPSBmdW5jdGlvbihtYXAsIGtleXMpIHtcbiAgICB2YXIgZXNjYXBlciA9IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiBtYXBbbWF0Y2hdO1xuICAgIH07XG4gICAgdmFyIHNvdXJjZSA9ICcoPzonICsga2V5cyhtYXApLmpvaW4oJ3wnKSArICcpJztcbiAgICB2YXIgdGVzdFJlZ2V4cCA9IFJlZ0V4cChzb3VyY2UpO1xuICAgIHZhciByZXBsYWNlUmVnZXhwID0gUmVnRXhwKHNvdXJjZSwgJ2cnKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICAgIHN0cmluZyA9IHN0cmluZyA9PSBudWxsID8gJycgOiAnJyArIHN0cmluZztcbiAgICAgICAgcmV0dXJuIHRlc3RSZWdleHAudGVzdChzdHJpbmcpID8gc3RyaW5nLnJlcGxhY2UocmVwbGFjZVJlZ2V4cCwgZXNjYXBlcikgOiBzdHJpbmc7XG4gICAgfTtcbn07XG5cbmZ1bmN0aW9uIGtleXMob2JqKSB7XG4gICAgaWYgKCFpc09iamVjdChvYmopKSByZXR1cm4gW107XG4gICAgaWYgKE9iamVjdC5rZXlzKSByZXR1cm4gT2JqZWN0LmtleXMob2JqKTtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChoYXMob2JqLCBrZXkpKSBrZXlzLnB1c2goa2V5KTtcbiAgICByZXR1cm4ga2V5cztcbn1cblxuZnVuY3Rpb24gdmFsdWVzKG9iaikge1xuICAgIHZhciBrZXlzID0ga2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgdmFsdWVzID0gQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhbHVlc1tpXSA9IG9ialtrZXlzW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbn1cblxuZnVuY3Rpb24gaW5kZXhPZihhcnJheSwgaXRlbSwgaXNTb3J0ZWQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIC0xO1xuICAgIHZhciBpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuICAgIGlmIChpc1NvcnRlZCkge1xuICAgICAgICBpZiAodHlwZW9mIGlzU29ydGVkID09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBpID0gaXNTb3J0ZWQgPCAwID8gTWF0aC5tYXgoMCwgbGVuZ3RoICsgaXNTb3J0ZWQpIDogaXNTb3J0ZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpID0gc29ydGVkSW5kZXgoYXJyYXksIGl0ZW0pO1xuICAgICAgICAgICAgcmV0dXJuIGFycmF5W2ldID09PSBpdGVtID8gaSA6IC0xO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoOyBpIDwgbGVuZ3RoOyBpKyspIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xufVxuXG5mdW5jdGlvbiBlYWNoKG9iaiwgZnVuYykge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIG9iajtcbiAgICB2YXIgaSwgbGVuZ3RoID0gb2JqLmxlbmd0aDtcbiAgICBpZiAobGVuZ3RoID09PSArbGVuZ3RoKSB7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZnVuYyhvYmpbaV0sIGksIG9iaik7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIga2V5cyA9IGtleXMob2JqKTtcbiAgICAgICAgZm9yIChpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZnVuYyhvYmpba2V5c1tpXV0sIGtleXNbaV0sIG9iaik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gbWFwKG9iaiwgZnVuYykge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIFtdO1xuICAgIHZhciBrZXlzID0gb2JqLmxlbmd0aCAhPT0gK29iai5sZW5ndGggJiYga2V5cyhvYmopLFxuICAgICAgICBsZW5ndGggPSAoa2V5cyB8fCBvYmopLmxlbmd0aCxcbiAgICAgICAgcmVzdWx0cyA9IEFycmF5KGxlbmd0aCksXG4gICAgICAgIGN1cnJlbnRLZXk7XG4gICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICAgIHJlc3VsdHNbaW5kZXhdID0gZnVuYyhvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xufVxuXG5mdW5jdGlvbiBmaWx0ZXIob2JqLCBwcmVkaWNhdGUpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdHM7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgICBpZiAocHJlZGljYXRlKHZhbHVlLCBpbmRleCwgbGlzdCkpIHJlc3VsdHMucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIHJlZHVjZShvYmosIGl0ZXJhdGVlLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSBvYmogPSBbXTtcbiAgICB2YXIga2V5cyA9IG9iai5sZW5ndGggIT09ICtvYmoubGVuZ3RoICYmIGtleXMob2JqKSxcbiAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGgsXG4gICAgICAgIGluZGV4ID0gMCxcbiAgICAgICAgY3VycmVudEtleTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgaWYgKCFsZW5ndGgpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgICAgICBtZW1vID0gb2JqW2tleXMgPyBrZXlzW2luZGV4KytdIDogaW5kZXgrK107XG4gICAgfVxuICAgIGZvciAoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRlZShtZW1vLCBvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgfVxuICAgIHJldHVybiBtZW1vO1xufVxuXG5mdW5jdGlvbiByZWplY3Qob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gZmlsdGVyKG9iaiwgbmVnYXRlKHByZWRpY2F0ZSksIGNvbnRleHQpO1xufVxuXG5mdW5jdGlvbiB3aGVyZShvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIGZpbHRlcihvYmosIG1hdGNoZXMoYXR0cnMpKTtcbn1cblxuZnVuY3Rpb24gbWF0Y2hlcyhhdHRycykge1xuICAgIHZhciBwYWlycyA9IHBhaXJzKGF0dHJzKSxcbiAgICAgICAgbGVuZ3RoID0gcGFpcnMubGVuZ3RoO1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gIWxlbmd0aDtcbiAgICAgICAgb2JqID0gbmV3IE9iamVjdChvYmopO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcGFpciA9IHBhaXJzW2ldLFxuICAgICAgICAgICAgICAgIGtleSA9IHBhaXJbMF07XG4gICAgICAgICAgICBpZiAocGFpclsxXSAhPT0gb2JqW2tleV0gfHwgIShrZXkgaW4gb2JqKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGlkZW50aXR5KHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBwcm9wZXJ0eShrZXkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmpba2V5XTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBuZWdhdGUocHJlZGljYXRlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gIXByZWRpY2F0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIHBhaXJzKG9iaikge1xuICAgIHZhciBrZXlzID0ga2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgcGFpcnMgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGFpcnNbaV0gPSBba2V5c1tpXSwgb2JqW2tleXNbaV1dXTtcbiAgICB9XG4gICAgcmV0dXJuIHBhaXJzO1xufVxuXG5mdW5jdGlvbiBjaGFpbihvYmopIHtcbiAgICB2YXIgaW50ZXJuYWxPYmogPSBvYmo7XG4gICAgdmFyIHVuZGVyID0gdGhpcztcbiAgICBmdW5jdGlvbiBjaGFpbmFibGVBcGkoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGludGVybmFsT2JqO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hcDogZnVuY3Rpb24oZnVuYykge1xuICAgICAgICAgICAgICAgIGludGVybmFsT2JqID0gdW5kZXIubWFwKGludGVybmFsT2JqLCBmdW5jKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmaWx0ZXI6IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgICAgICAgICAgICBpbnRlcm5hbE9iaiA9IHVuZGVyLmZpbHRlcihpbnRlcm5hbE9iaiwgZnVuYyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZWFjaDogZnVuY3Rpb24oZnVuYykge1xuICAgICAgICAgICAgICAgIHVuZGVyLmVhY2goaW50ZXJuYWxPYmosIGZ1bmMpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHZhbHVlczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVyLnZhbHVlcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGtleXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlci5rZXlzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVkdWNlOiBmdW5jdGlvbihpdGVyYXRlZSwgbWVtbywgY29udGV4dCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlci5yZWR1Y2UoaW50ZXJuYWxPYmosIGl0ZXJhdGVlLCBtZW1vLCBjb250ZXh0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZWplY3Q6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgICAgICAgICAgICAgIGludGVybmFsT2JqID0gdW5kZXIucmVqZWN0KGludGVybmFsT2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHdoZXJlOiBmdW5jdGlvbihhdHRycykge1xuICAgICAgICAgICAgICAgIGludGVybmFsT2JqID0gdW5kZXIud2hlcmUoaW50ZXJuYWxPYmosIGF0dHJzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGNoYWluYWJsZUFwaSgpO1xufVxuXG5mdW5jdGlvbiBjb250YWlucyhvYmosIHRhcmdldCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChvYmoubGVuZ3RoICE9PSArb2JqLmxlbmd0aCkgb2JqID0gdmFsdWVzKG9iaik7XG4gICAgcmV0dXJuIGluZGV4T2Yob2JqLCB0YXJnZXQpID49IDA7XG59XG5cbmZ1bmN0aW9uIHVuaXF1ZUlkKHByZWZpeCkge1xuICAgIHZhciBpZCA9ICsrX19pZENvdW50ZXIgKyAnJztcbiAgICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbn0gIFxuXG5mdW5jdGlvbiB0aW1lcyhuLCBmdW5jKSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICByZXN1bHRzLnB1c2goZnVuYyhuKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xufVxuXG5mdW5jdGlvbiBjbG9uZShvYmopIHtcbiAgICBpZiAoIWlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gICAgcmV0dXJuIGlzQXJyYXkob2JqKSA/IG9iai5zbGljZSgpIDogZXh0ZW5kKHt9LCBvYmopO1xufVxuXG5mdW5jdGlvbiBleHRlbmQob2JqKSB7XG4gICAgaWYgKCFpc09iamVjdChvYmopKSByZXR1cm4gb2JqO1xuICAgIHZhciBzb3VyY2UsIHByb3A7XG4gICAgZm9yICh2YXIgaSA9IDEsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGZvciAocHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBwcm9wKSkge1xuICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB2b2lkIDA7XG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkob2JqKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkpIHJldHVybiBBcnJheS5pc0FycmF5KG9iaik7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChvYmopIHtcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiBvYmo7XG4gICAgcmV0dXJuIHR5cGUgPT09ICdmdW5jdGlvbicgfHwgdHlwZSA9PT0gJ29iamVjdCcgJiYgISFvYmo7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgTnVtYmVyXSc7XG59XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgU3RyaW5nXSc7XG59XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB0cnVlIHx8IG9iaiA9PT0gZmFsc2UgfHwgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEJvb2xlYW5dJztcbn1cblxuZnVuY3Rpb24gaXNSZWdFeHAob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cblxuZnVuY3Rpb24gaXNGdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG59XG5cbmZ1bmN0aW9uIGlzTnVsbChvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc05hTihvYmopIHtcbiAgICByZXR1cm4gaXNOdW1iZXIob2JqKSAmJiBvYmogIT09ICtvYmo7XG59XG5cbmZ1bmN0aW9uIGhhcyhvYmosIGtleSkge1xuICAgIHJldHVybiBvYmogIT0gbnVsbCAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpO1xufVxuXG5mdW5jdGlvbiBkYXNoZXJpemUod2hhdCkge1xuICAgIHJldHVybiB3aGF0LnJlcGxhY2UoLyhbQS1aXFxkXSspKFtBLVpdW2Etel0pL2csJyQxXyQyJylcbiAgICAgICAgLnJlcGxhY2UoLyhbYS16XFxkXSkoW0EtWl0pL2csJyQxXyQyJylcbiAgICAgICAgLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXy9nLCAnLScpO1xufVxuXG5mdW5jdGlvbiBzdGFydHNXaXRoKHNvdXJjZSwgc3RhcnQpIHsgXG4gICAgcmV0dXJuIHNvdXJjZS5pbmRleE9mKHN0YXJ0KSA9PT0gMDsgXG59XG5cbmZ1bmN0aW9uIGZvY3VzKGVsZW0pIHsgXG4gICAgaWYgKGVsZW0uZm9jdXMpIGVsZW0uZm9jdXMoKTtcbn1cblxuZnVuY3Rpb24gaGFzRm9jdXMoZWxlbSkgeyBcbiAgICByZXR1cm4gZWxlbSA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCAmJiAoIWRvY3VtZW50Lmhhc0ZvY3VzIHx8IGRvY3VtZW50Lmhhc0ZvY3VzKCkpICYmICEhKGVsZW0udHlwZSB8fCBlbGVtLmhyZWYgfHwgfmVsZW0udGFiSW5kZXgpOyBcbn1cblxuZnVuY3Rpb24gb24obm9kZSwgdHlwZXMsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGFjdHVhbCA9IGlzU3RyaW5nKG5vZGUpID8gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcihub2RlKSA6IG5vZGU7XG4gICAgZWFjaCh0eXBlcywgZnVuY3Rpb24odHlwZSkge1xuICAgICAgICBpZiAoYWN0dWFsICYmIGFjdHVhbCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKGFjdHVhbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIGZhbHNlKTsgLy8gZG9lcyBub3Qgd29yayBpbiBmZiAzLjUgd2l0aG91dCBmYWxzZVxuICAgICAgICAgICAgfSBlbHNlIGlmIChhY3R1YWwuYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgICAgICAgICBhY3R1YWwuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjayk7IC8vIHdvcmsgaW4gaWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBmaW5kTm9kZShzZWxlY3Rvcikge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKG5vZGUpO1xufVxuXG5leHBvcnRzLmVzY2FwZSA9IGNyZWF0ZUVzY2FwZXIoZXNjYXBlTWFwLCBrZXlzKTtcbmV4cG9ydHMua2V5cyA9IGtleXM7XG5leHBvcnRzLnZhbHVlcyA9IHZhbHVlcztcbmV4cG9ydHMuaW5kZXhPZiA9IGluZGV4T2Y7XG5leHBvcnRzLmVhY2ggPSBlYWNoO1xuZXhwb3J0cy5tYXAgPSBtYXA7XG5leHBvcnRzLmZpbHRlciA9IGZpbHRlcjtcbmV4cG9ydHMuY2hhaW4gPSBjaGFpbjtcbmV4cG9ydHMuY29udGFpbnMgPSBjb250YWlucztcbmV4cG9ydHMudW5pcXVlSWQgPSB1bmlxdWVJZDtcbmV4cG9ydHMudGltZXMgPSB0aW1lcztcbmV4cG9ydHMuY2xvbmUgPSBjbG9uZTtcbmV4cG9ydHMuZXh0ZW5kID0gZXh0ZW5kO1xuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuZXhwb3J0cy5pc05hTiA9IGlzTmFOO1xuZXhwb3J0cy5oYXMgPSBoYXM7XG5leHBvcnRzLmRhc2hlcml6ZSA9IGRhc2hlcml6ZTtcbmV4cG9ydHMuc3RhcnRzV2l0aCA9IHN0YXJ0c1dpdGg7XG5leHBvcnRzLmZvY3VzID0gZm9jdXM7XG5leHBvcnRzLmhhc0ZvY3VzID0gaGFzRm9jdXM7XG5leHBvcnRzLm9uID0gb247XG5leHBvcnRzLmZpbmROb2RlID0gZmluZE5vZGU7XG5leHBvcnRzLnJlZHVjZSA9IHJlZHVjZTtcbmV4cG9ydHMucmVqZWN0ID0gcmVqZWN0O1xuZXhwb3J0cy53aGVyZSA9IHdoZXJlO1xuZXhwb3J0cy5tYXRjaGVzID0gbWF0Y2hlcztcbmV4cG9ydHMubmVnYXRlID0gbmVnYXRlO1xuZXhwb3J0cy5wcm9wZXJ0eSA9IHByb3BlcnR5O1xuZXhwb3J0cy5pZGVudGl0eSA9IGlkZW50aXR5O1xuZXhwb3J0cy5wYWlycyA9IHBhaXJzOyIsIlxudmFyIHJlZ2lzdHJhdGlvbkZ1bmN0aW9uID0gdW5kZWZpbmVkXG5cbnRyeSB7XG4gIHJlZ2lzdHJhdGlvbkZ1bmN0aW9uID0gKGRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudCB8fCBkb2N1bWVudC5yZWdpc3RlciB8fCBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh3aW5kb3cuY29uc29sZSkgY29uc29sZS5lcnJvcignW0VMRU1KU10gTm8gcmVnaXN0ZXJFbGVtZW50IGZ1bmN0aW9uLCB3ZWJjb21wb25lbnRzIHdpbGwgbm90IHdvcmsgISEhJyk7XG4gIH0pLmJpbmQoZG9jdW1lbnQpO1xufSBjYXRjaChlKSB7fVxuXG5mdW5jdGlvbiByZWdpc3RlcldlYkNvbXBvbmVudCh0YWcsIGVsZW0pIHtcbiAgdmFyIHRoYXREb2MgPSBkb2N1bWVudDtcbiAgdmFyIEVsZW1lbnRQcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlKTtcbiAgXG4gIEVsZW1lbnRQcm90by5jcmVhdGVkQ2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcHJvcHMgPSB7fTtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMuYXR0cmlidXRlcykge1xuICAgICAgdmFyIGl0ZW0gPSB0aGlzLmF0dHJpYnV0ZXNbaV07XG4gICAgICBwcm9wc1tpdGVtLm5hbWVdID0gaXRlbS52YWx1ZTsgICAgXG4gICAgfVxuICAgIHRoaXMucHJvcHMgPSBwcm9wcztcbiAgICB2YXIgbm9kZSA9IHRoaXM7XG4gICAgaWYgKHByb3BzLm5vc2hhZG93ICE9PSAndHJ1ZScpIHtcbiAgICAgIHZhciBzaGFkb3dSb290ID0gdGhpcy5jcmVhdGVTaGFkb3dSb290KCk7XG4gICAgICBub2RlID0gdGhhdERvYy5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIG5vZGUuc2V0QXR0cmlidXRlKCdjbGFzcycsICdlbGVtY29tcG9uZW50Jyk7XG4gICAgICBzaGFkb3dSb290LmFwcGVuZENoaWxkKG5vZGUpO1xuICAgIH1cbiAgICB0aGlzLl9ub2RlID0gbm9kZTtcbiAgICBpZiAocHJvcHMucmVuZGVyT25seSAmJiBwcm9wcy5yZW5kZXJPbmx5ID09PSB0cnVlKSB7XG4gICAgICB0aGlzLnJlbmRlcmVkRWxlbWVudCA9IEVsZW0ucmVuZGVyKGVsZW0sIG5vZGUpOyBcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZW5kZXJlZEVsZW1lbnQgPSBFbGVtLmNvbXBvbmVudCh7XG4gICAgICAgIGNvbnRhaW5lcjogbm9kZSxcbiAgICAgICAgaW5pdDogZWxlbS5pbml0LFxuICAgICAgICByZW5kZXI6IGVsZW0ucmVuZGVyLFxuICAgICAgICBwcm9wczogcHJvcHMsXG4gICAgICAgIHN0YXRlOiBlbGVtLnN0YXRlXG4gICAgICB9KTsgXG4gICAgfVxuICB9O1xuXG4gIEVsZW1lbnRQcm90by5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sgPSBmdW5jdGlvbiAoYXR0ciwgb2xkVmFsLCBuZXdWYWwpIHtcbiAgICB0aGlzLnByb3BzW2F0dHJdID0gbmV3VmFsO1xuICAgIHZhciBwcm9wcyA9IHRoaXMucHJvcHM7XG4gICAgaWYgKHRoaXMucHJvcHMucmVuZGVyT25seSAmJiB0aGlzLnByb3BzLnJlbmRlck9ubHkgPT09IHRydWUpIHtcbiAgICAgIHRoaXMucmVuZGVyZWRFbGVtZW50ID0gRWxlbS5yZW5kZXIoZWxlbSwgdGhpcy5fbm9kZSk7IFxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlbmRlcmVkRWxlbWVudCA9IEVsZW0uY29tcG9uZW50KHtcbiAgICAgICAgY29udGFpbmVyOiB0aGlzLl9ub2RlLFxuICAgICAgICBpbml0OiBlbGVtLmluaXQsXG4gICAgICAgIHJlbmRlcjogZWxlbS5yZW5kZXIsXG4gICAgICAgIHByb3BzOiBwcm9wcyxcbiAgICAgICAgc3RhdGU6IGVsZW0uc3RhdGVcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICByZWdpc3RyYXRpb25GdW5jdGlvbih0YWcsIHtcbiAgICBwcm90b3R5cGU6IEVsZW1lbnRQcm90b1xuICB9KTtcbn1cblxuaWYgKHJlZ2lzdHJhdGlvbkZ1bmN0aW9uKSB7XG4gIGV4cG9ydHMucmVnaXN0ZXJXZWJDb21wb25lbnQgPSByZWdpc3RlcldlYkNvbXBvbmVudDtcbn0gZWxzZSB7XG4gIGV4cG9ydHMucmVnaXN0ZXJXZWJDb21wb25lbnQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAod2luZG93LmNvbnNvbGUpIGNvbnNvbGUuZXJyb3IoJ1tFTEVNSlNdIFdlYkNvbXBvbmVudCBub3QgYXZhaWxhYmxlIGhlcmUgOignKTtcbiAgfTtcbn1cbiJdfQ==
