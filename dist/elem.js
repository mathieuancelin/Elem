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
        if (window.console) console.error('No requestAnimationFrame, using lame polyfill ...');
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
  if (window.console) console.error('No Function.prototype.bind, using polyfill ...');
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

function hasData(node, name) {
  return node.attributes && node.attributes['data-' + name];
}

function data(node, name) {
  if (node.dataset) return node.dataset[name];
  return node.attributes['data-' + name];
}

function mountComponent(el, opts) {
  var name = opts.name || 'Component';
  var state = opts.state || Elem.state();
  var props = opts.props || {};
  var render = opts.render;
  var eventCallbacks = {};
  var oldHandlers = [];
  var afterRender = opts.afterRender || function() {};
  var getDOMNode = function() { return _.findNode(el); };
  if (opts.init) { opts.init(state, _.clone(props)); }
  _.on(el, Common.events, function(e) { // bubbles listener, TODO : handle mouse event in a clever way
      var node = e.target;
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

function factory(opts) {
  return function(props, to) {
    var api = {
      __componentFactory: true,
      renderTo: function(el) {
        var opt = _.clone(opts);
        opt.props = _.extend(_.clone(opts.props || {}), props || {});
        Common.defer(function() {
          mountComponent(el, opt);
        });
      }
    };
    if (to) return api.renderTo(to);
    return api;  
  }  
}

exports.component = function(opts) {
  if (!opts.container) return factory(opts);
  var el = opts.container;
  mountComponent(el, opts);
};
},{"./common":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/common.js","./utils":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/utils.js"}],"/Users/mathieuancelin/Dropbox/current-projects/elem/src/elem.js":[function(require,module,exports){
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
                    __children.renderTo('[data-componentid="' + compId + '"]');
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
    var str = _.map(renderToNode(el, Stringifier()), function(n) { return n.toHtmlString(); }).join('');
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
    var htmlNode = renderToNode(el, doc, { root: node, waitingHandlers: waitingHandlers, refs: refs, props: props });
    if (_.isString(node)) {
        node = doc.querySelector(node);
    }
    while (node.firstChild) { node.removeChild(node.firstChild); }
    _.each(htmlNode, function(n) {
        node.appendChild(n);
    });
    if (!(context && context.__rootListener)) {  // external listener here
        _.each(waitingHandlers, function(handler) { // handler on each concerned node
            _.on('[data-nodeid="' + handler.id + '"]', [handler.event.replace('on', '')], function() {
                handler.callback.apply({}, arguments);
            });   
        });
    }
    Common.markStop('Elem.render');
};
exports.component = Components.component;
exports.componentFactory = Components.componentFactory;
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

module.exports = function stringifyDoc() {
    function node(name) { 
        var attrs = [];
        var children = [];
        return {
            setAttribute: function(key, value) { attrs.push(key + '="' + value + '"'); },
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

},{"./common":"/Users/mathieuancelin/Dropbox/current-projects/elem/src/common.js"}],"/Users/mathieuancelin/Dropbox/current-projects/elem/src/utils.js":[function(require,module,exports){
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
      if (window.console) console.error('No registerElement function, webcomponents will not work !!!');
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
    if (window.console) console.error('WebComponent not available here :(');
  };
}

},{}]},{},["/Users/mathieuancelin/Dropbox/current-projects/elem/src/elem.js"])("/Users/mathieuancelin/Dropbox/current-projects/elem/src/elem.js")
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvY29tbW9uLmpzIiwic3JjL2NvbXBvbmVudC5qcyIsInNyYy9lbGVtLmpzIiwic3JjL2V2ZW50cy5qcyIsInNyYy9zdGF0ZS5qcyIsInNyYy9zdHJpbmdpZnkuanMiLCJzcmMvdXRpbHMuanMiLCJzcmMvd2ViY29tcG9uZW50LmpzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiJBQUFBO0FDQUE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNUdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2hHQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuU0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJleHBvcnRzLmRlYnVnID0gZmFsc2U7XG5leHBvcnRzLnBlcmZzID0gZmFsc2U7XG5leHBvcnRzLnZvaWRFbGVtZW50cyA9IFtcIkFSRUFcIixcIkJBU0VcIixcIkJSXCIsXCJDT0xcIixcIkNPTU1BTkRcIixcIkVNQkVEXCIsXCJIUlwiLFwiSU1HXCIsXCJJTlBVVFwiLFwiS0VZR0VOXCIsXCJMSU5LXCIsXCJNRVRBXCIsXCJQQVJBTVwiLFwiU09VUkNFXCIsXCJUUkFDS1wiLFwiV0JSXCJdO1xuZXhwb3J0cy5ldmVudHMgPSBbJ3doZWVsJywnc2Nyb2xsJywndG91Y2hjYW5jZWwnLCd0b3VjaGVuZCcsJ3RvdWNobW92ZScsJ3RvdWNoc3RhcnQnLCdjbGljaycsJ2RvdWJsZWNsaWNrJywnZHJhZycsJ2RyYWdlbmQnLCdkcmFnZW50ZXInLCdkcmFnZXhpdCcsJ2RyYWdsZWF2ZScsJ2RyYWdvdmVyJywnZHJhZ3N0YXJ0JywnZHJvcCcsJ2NoYW5nZScsJ2lucHV0Jywnc3VibWl0JywnZm9jdXMnLCdibHVyJywna2V5ZG93bicsJ2tleXByZXNzJywna2V5dXAnLCdjb3B5JywnY3V0JywncGFzdGUnLCdtb3VzZWRvd24nLCdtb3VzZWVudGVyJywnbW91c2VsZWF2ZScsJ21vdXNlbW92ZScsJ21vdXNlb3V0JywnbW91c2VvdmVyJywnbW91c2V1cCddO1xuICAgIFxuLy8gcmVkcmF3IHdpdGggcmVxdWVzdEFuaW1hdGlvbkZyYW1lIChodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9mci9kb2NzL1dlYi9BUEkvd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSlcbi8vIHBlcmZzIG1lYXN1cmVzIChodHRwOi8vd3d3Lmh0bWw1cm9ja3MuY29tL2VuL3R1dG9yaWFscy93ZWJwZXJmb3JtYW5jZS91c2VydGltaW5nLylcbnZhciBQZXJmb3JtYW5jZXMgPSB7XG4gIG1hcms6IGZ1bmN0aW9uKCkge30sXG4gIG1lYXN1cmU6IGZ1bmN0aW9uKCkge30sXG4gIGdldEVudHJpZXNCeU5hbWU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gW107IH0sXG4gIGdldEVudHJpZXNCeVR5cGU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gW107IH0sXG4gIGNsZWFyTWFya3M6IGZ1bmN0aW9uKCkge30sXG4gIGNsZWFyTWVhc3VyZXM6IGZ1bmN0aW9uKCkge31cbn07XG5cbmlmICh0eXBlb2Ygd2luZG93LnBlcmZvcm1hbmNlICE9PSAndW5kZWZpbmVkJyBcbiAgICAmJiB0eXBlb2Ygd2luZG93LnBlcmZvcm1hbmNlLm1hcmsgIT09ICd1bmRlZmluZWQnIFxuICAgICYmIHR5cGVvZiB3aW5kb3cucGVyZm9ybWFuY2UubWVhc3VyZSAhPT0gJ3VuZGVmaW5lZCcpIHtcbiAgUGVyZm9ybWFuY2VzID0gd2luZG93LnBlcmZvcm1hbmNlOyAgXG59XG5cbndpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IFxuICAgIHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IFxuICAgIHdpbmRvdy5tc1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBcbiAgICAoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh3aW5kb3cuY29uc29sZSkgY29uc29sZS5lcnJvcignTm8gcmVxdWVzdEFuaW1hdGlvbkZyYW1lLCB1c2luZyBsYW1lIHBvbHlmaWxsIC4uLicpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oY2FsbGJhY2ssIGVsZW1lbnQpe1xuICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MCk7XG4gICAgICAgIH0gICAgXG4gICAgfSkoKTtcblxudmFyIEVsZW1NZWFzdXJlU3RhcnQgPSAnRWxlbU1lYXN1cmVTdGFydCc7XG52YXIgRWxlbU1lYXN1cmVTdG9wID0gJ0VsZW1NZWFzdXJlU3RvcCc7XG52YXIgRWxlbU1lYXN1cmUgPSAnRWxlbUNvbXBvbmVudFJlbmRlcmluZ01lYXN1cmUnO1xudmFyIG5hbWVzID0gW0VsZW1NZWFzdXJlXTtcblxuZXhwb3J0cy5tYXJrU3RhcnQgPSBmdW5jdGlvbihuYW1lKSB7XG4gIGlmIChleHBvcnRzLnBlcmZzKSB7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIFBlcmZvcm1hbmNlcy5tYXJrKG5hbWUgKyAnX3N0YXJ0Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIFBlcmZvcm1hbmNlcy5tYXJrKEVsZW1NZWFzdXJlU3RhcnQpO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0cy5tYXJrU3RvcCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgaWYgKGV4cG9ydHMucGVyZnMpIHtcbiAgICBpZiAobmFtZSkge1xuICAgICAgUGVyZm9ybWFuY2VzLm1hcmsobmFtZSArICdfc3RvcCcpO1xuICAgICAgUGVyZm9ybWFuY2VzLm1lYXN1cmUobmFtZSwgbmFtZSArICdfc3RhcnQnLCBuYW1lICsgJ19zdG9wJyk7XG4gICAgICBpZiAoIV8uY29udGFpbnMobmFtZXMsIG5hbWUpKSBuYW1lcy5wdXNoKG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICBQZXJmb3JtYW5jZXMubWFyayhFbGVtTWVhc3VyZVN0b3ApO1xuICAgICAgUGVyZm9ybWFuY2VzLm1lYXN1cmUoRWxlbU1lYXN1cmUsIEVsZW1NZWFzdXJlU3RhcnQsIEVsZW1NZWFzdXJlU3RvcCk7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnRzLmNvbGxlY3RNZWFzdXJlcyA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIWV4cG9ydHMucGVyZnMpIHJldHVybiBbXTtcbiAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgXy5lYWNoKG5hbWVzLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KFBlcmZvcm1hbmNlcy5nZXRFbnRyaWVzQnlOYW1lKG5hbWUpKTtcbiAgfSk7XG4gIFBlcmZvcm1hbmNlcy5jbGVhck1hcmtzKCk7XG4gIFBlcmZvcm1hbmNlcy5jbGVhck1lYXN1cmVzKCk7XG4gIG5hbWVzID0gW0VsZW1NZWFzdXJlXTtcbiAgcmV0dXJuIHJlc3VsdHM7XG59O1xuXG5leHBvcnRzLnByaW50TWVhc3VyZXMgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCFleHBvcnRzLnBlcmZzKSByZXR1cm47XG4gIGlmICh3aW5kb3cuY29uc29sZSkgY29uc29sZS50YWJsZShleHBvcnRzLmNvbGxlY3RNZWFzdXJlcygpKTtcbn07XG5cbmV4cG9ydHMuZGVmZXIgPSBmdW5jdGlvbihjYikge1xuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUuY2FsbCh3aW5kb3csIGNiKTtcbn07XG5cbmV4cG9ydHMuZGVmZXJlZCA9IGZ1bmN0aW9uKGNiKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBleHBvcnRzLmRlZmVyKGNiKTtcbiAgICB9O1xufTtcblxuaWYgKCFGdW5jdGlvbi5wcm90b3R5cGUuYmluZCkge1xuICBpZiAod2luZG93LmNvbnNvbGUpIGNvbnNvbGUuZXJyb3IoJ05vIEZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kLCB1c2luZyBwb2x5ZmlsbCAuLi4nKTtcbiAgRnVuY3Rpb24ucHJvdG90eXBlLmJpbmQgPSBmdW5jdGlvbiAob1RoaXMpIHtcbiAgICBpZiAodHlwZW9mIHRoaXMgIT09IFwiZnVuY3Rpb25cIikge1xuICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkZ1bmN0aW9uLnByb3RvdHlwZS5iaW5kIC0gY2FuJ3QgY2FsbCBib3VuZGVkIGVsZW1lbnRcIik7XG4gICAgfVxuICAgIHZhciBhQXJncyA9IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSk7XG4gICAgdmFyIGZUb0JpbmQgPSB0aGlzOyBcbiAgICB2YXIgZk5PUCA9IGZ1bmN0aW9uICgpIHt9O1xuICAgIHZhciBmQm91bmQgPSBmdW5jdGlvbiAoKSB7XG4gICAgICAgIHJldHVybiBmVG9CaW5kLmFwcGx5KHRoaXMgaW5zdGFuY2VvZiBmTk9QICYmIG9UaGlzXG4gICAgICAgICAgICAgICAgID8gdGhpc1xuICAgICAgICAgICAgICAgICA6IG9UaGlzLFxuICAgICAgICAgICAgICAgICBhQXJncy5jb25jYXQoQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzKSkpO1xuICAgIH07XG4gICAgZk5PUC5wcm90b3R5cGUgPSB0aGlzLnByb3RvdHlwZTtcbiAgICBmQm91bmQucHJvdG90eXBlID0gbmV3IGZOT1AoKTtcbiAgICByZXR1cm4gZkJvdW5kO1xuICB9O1xufSIsInZhciBDb21tb24gPSByZXF1aXJlKCcuL2NvbW1vbicpO1xudmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbmZ1bmN0aW9uIGhhc0RhdGEobm9kZSwgbmFtZSkge1xuICByZXR1cm4gbm9kZS5hdHRyaWJ1dGVzICYmIG5vZGUuYXR0cmlidXRlc1snZGF0YS0nICsgbmFtZV07XG59XG5cbmZ1bmN0aW9uIGRhdGEobm9kZSwgbmFtZSkge1xuICBpZiAobm9kZS5kYXRhc2V0KSByZXR1cm4gbm9kZS5kYXRhc2V0W25hbWVdO1xuICByZXR1cm4gbm9kZS5hdHRyaWJ1dGVzWydkYXRhLScgKyBuYW1lXTtcbn1cblxuZnVuY3Rpb24gbW91bnRDb21wb25lbnQoZWwsIG9wdHMpIHtcbiAgdmFyIG5hbWUgPSBvcHRzLm5hbWUgfHwgJ0NvbXBvbmVudCc7XG4gIHZhciBzdGF0ZSA9IG9wdHMuc3RhdGUgfHwgRWxlbS5zdGF0ZSgpO1xuICB2YXIgcHJvcHMgPSBvcHRzLnByb3BzIHx8IHt9O1xuICB2YXIgcmVuZGVyID0gb3B0cy5yZW5kZXI7XG4gIHZhciBldmVudENhbGxiYWNrcyA9IHt9O1xuICB2YXIgb2xkSGFuZGxlcnMgPSBbXTtcbiAgdmFyIGFmdGVyUmVuZGVyID0gb3B0cy5hZnRlclJlbmRlciB8fCBmdW5jdGlvbigpIHt9O1xuICB2YXIgZ2V0RE9NTm9kZSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gXy5maW5kTm9kZShlbCk7IH07XG4gIGlmIChvcHRzLmluaXQpIHsgb3B0cy5pbml0KHN0YXRlLCBfLmNsb25lKHByb3BzKSk7IH1cbiAgXy5vbihlbCwgQ29tbW9uLmV2ZW50cywgZnVuY3Rpb24oZSkgeyAvLyBidWJibGVzIGxpc3RlbmVyLCBUT0RPIDogaGFuZGxlIG1vdXNlIGV2ZW50IGluIGEgY2xldmVyIHdheVxuICAgICAgdmFyIG5vZGUgPSBlLnRhcmdldDtcbiAgICAgIHZhciBuYW1lID0gZGF0YShub2RlLCAnbm9kZWlkJykgKyAnXycgKyBlLnR5cGU7IC8vbm9kZS5kYXRhc2V0Lm5vZGVpZCArIFwiX1wiICsgZS50eXBlO1xuICAgICAgaWYgKGV2ZW50Q2FsbGJhY2tzW25hbWVdKSB7XG4gICAgICAgICAgZXZlbnRDYWxsYmFja3NbbmFtZV0oZSk7ICAgIFxuICAgICAgfSBlbHNlIHtcbiAgICAgICAgICB3aGlsZSghZXZlbnRDYWxsYmFja3NbbmFtZV0gJiYgbm9kZSAmJiBub2RlICE9PSBudWxsICYmIGhhc0RhdGEobm9kZSwgJ25vZGVpZCcpKSB7Ly9ub2RlLmRhdGFzZXQgJiYgbm9kZS5kYXRhc2V0Lm5vZGVpZCkge1xuICAgICAgICAgICAgICBub2RlID0gbm9kZS5wYXJlbnRFbGVtZW50O1xuICAgICAgICAgICAgICBpZiAobm9kZSAmJiBub2RlICE9PSBudWxsICYmIGhhc0RhdGEobm9kZSwgJ25vZGVpZCcpKSB7IC8vbm9kZS5kYXRhc2V0ICYmIG5vZGUuZGF0YXNldC5ub2RlaWQpIHtcbiAgICAgICAgICAgICAgICBuYW1lID0gZGF0YShub2RlLCAnbm9kZWlkJykgKyAnXycgKyBlLnR5cGU7IC8vbm9kZS5kYXRhc2V0Lm5vZGVpZCArIFwiX1wiICsgZS50eXBlO1xuICAgICAgICAgICAgICB9XG4gICAgICAgICAgfVxuICAgICAgICAgIGlmIChldmVudENhbGxiYWNrc1tuYW1lXSkge1xuICAgICAgICAgICAgICBldmVudENhbGxiYWNrc1tuYW1lXShlKTsgICAgXG4gICAgICAgICAgfVxuICAgICAgfVxuICB9KTtcbiAgZnVuY3Rpb24gcmVyZW5kZXIoKSB7XG4gICAgICBDb21tb24ubWFya1N0YXJ0KG5hbWUgKyAnLmdsb2JhbFJlbmRlcmluZycpO1xuICAgICAgXy5lYWNoKG9sZEhhbmRsZXJzLCBmdW5jdGlvbihoYW5kbGVyKSB7XG4gICAgICAgICAgZGVsZXRlIGV2ZW50Q2FsbGJhY2tzW2hhbmRsZXJdO1xuICAgICAgfSk7XG4gICAgICBvbGRIYW5kbGVycyA9IFtdO1xuICAgICAgdmFyIGZvY3VzID0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCB8fCB7fTsgLy8gVE9ETyA6IGNoZWNrIGlmIGlucHV0L3NlbGVjdC90ZXh0YXJlYSwgcmVtZW1iZXIgY3Vyc29yIHBvc2l0aW9uIGhlcmVcbiAgICAgIHZhciBrZXkgPSBmb2N1cy5kYXRhc2V0ID8gZm9jdXMuZGF0YXNldC5rZXkgOiAoZm9jdXMuYXR0cmlidXRlcyB8fCBbXSlbJ2tleSddOyAvLyBUT0RPIDogbWF5YmUgYSBidWcgaGVyZVxuICAgICAgdmFyIHdhaXRpbmdIYW5kbGVycyA9IFtdO1xuICAgICAgdmFyIHJlZnMgPSB7fTtcbiAgICAgIENvbW1vbi5tYXJrU3RhcnQobmFtZSArICcucmVuZGVyJyk7XG4gICAgICB2YXIgZWxlbVRvUmVuZGVyID0gcmVuZGVyKHN0YXRlLCBfLmNsb25lKHByb3BzKSwgeyByZWZzOiByZWZzLCBnZXRET01Ob2RlOiBnZXRET01Ob2RlIH0pO1xuICAgICAgQ29tbW9uLm1hcmtTdG9wKG5hbWUgKyAnLnJlbmRlcicpO1xuICAgICAgRWxlbS5yZW5kZXIoZWxlbVRvUmVuZGVyLCBlbCwgeyB3YWl0aW5nSGFuZGxlcnM6IHdhaXRpbmdIYW5kbGVycywgX19yb290TGlzdGVuZXI6IHRydWUsIHJlZnM6IHJlZnMgfSk7XG4gICAgICBhZnRlclJlbmRlcihzdGF0ZSwgXy5jbG9uZShwcm9wcyksIHsgcmVmczogcmVmcywgZ2V0RE9NTm9kZTogZ2V0RE9NTm9kZSB9KTtcbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgICB2YXIgZm9jdXNOb2RlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEta2V5PVwiJyArIGtleSArICdcIl0nKTsvLyQoJ1tkYXRhLWtleT1cIicgKyBrZXkgKyAnXCJdJyk7XG4gICAgICAgICAgXy5mb2N1cyhmb2N1c05vZGUpOyAvLyBmb2N1c05vZGUuZm9jdXMoKTsgIC8vIFRPRE8gOiBtYXliZSBhIGJ1ZyBoZXJlXG4gICAgICAgICAgaWYgKGZvY3VzTm9kZS52YWx1ZSkgeyAvL2ZvY3VzTm9kZS52YWwoKSkge1xuICAgICAgICAgICAgICB2YXIgc3RyTGVuZ3RoID0gZm9jdXNOb2RlLnZhbHVlLmxlbmd0aCAqIDI7IC8vIGZvY3VzTm9kZS52YWwoKS5sZW5ndGggKiAyO1xuICAgICAgICAgICAgICBmb2N1c05vZGUuc2V0U2VsZWN0aW9uUmFuZ2Uoc3RyTGVuZ3RoLCBzdHJMZW5ndGgpOyAvL2ZvY3VzTm9kZVswXS5zZXRTZWxlY3Rpb25SYW5nZShzdHJMZW5ndGgsIHN0ckxlbmd0aCk7ICAvLyBUT0RPIDogaGFuZGxlIG90aGVyIGtpbmQgb2YgaW5wdXQgLi4uIGxpa2Ugc2VsZWN0LCBldGMgLi4uICAgXG4gICAgICAgICAgfVxuICAgICAgfVxuICAgICAgXy5lYWNoKHdhaXRpbmdIYW5kbGVycywgZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgICAgIG9sZEhhbmRsZXJzLnB1c2goaGFuZGxlci5pZCArICdfJyArIGhhbmRsZXIuZXZlbnQucmVwbGFjZSgnb24nLCAnJykpO1xuICAgICAgICAgIGV2ZW50Q2FsbGJhY2tzW2hhbmRsZXIuaWQgKyAnXycgKyBoYW5kbGVyLmV2ZW50LnJlcGxhY2UoJ29uJywgJycpXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBoYW5kbGVyLmNhbGxiYWNrLmFwcGx5KHsgcmVuZGVyOiByZW5kZXIgfSwgYXJndW1lbnRzKTsgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIENvbW1vbi5tYXJrU3RvcChuYW1lICsgJy5nbG9iYWxSZW5kZXJpbmcnKTtcbiAgfVxuICByZXJlbmRlcigpO1xuICBzdGF0ZS5vbkNoYW5nZShyZXJlbmRlcik7Ly9Db21tb24uZGVmZXJlZChyZXJlbmRlcikpO1xuICByZXR1cm4gc3RhdGU7XG59XG5cbmZ1bmN0aW9uIGZhY3Rvcnkob3B0cykge1xuICByZXR1cm4gZnVuY3Rpb24ocHJvcHMsIHRvKSB7XG4gICAgdmFyIGFwaSA9IHtcbiAgICAgIF9fY29tcG9uZW50RmFjdG9yeTogdHJ1ZSxcbiAgICAgIHJlbmRlclRvOiBmdW5jdGlvbihlbCkge1xuICAgICAgICB2YXIgb3B0ID0gXy5jbG9uZShvcHRzKTtcbiAgICAgICAgb3B0LnByb3BzID0gXy5leHRlbmQoXy5jbG9uZShvcHRzLnByb3BzIHx8IHt9KSwgcHJvcHMgfHwge30pO1xuICAgICAgICBDb21tb24uZGVmZXIoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbW91bnRDb21wb25lbnQoZWwsIG9wdCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gICAgaWYgKHRvKSByZXR1cm4gYXBpLnJlbmRlclRvKHRvKTtcbiAgICByZXR1cm4gYXBpOyAgXG4gIH0gIFxufVxuXG5leHBvcnRzLmNvbXBvbmVudCA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgaWYgKCFvcHRzLmNvbnRhaW5lcikgcmV0dXJuIGZhY3Rvcnkob3B0cyk7XG4gIHZhciBlbCA9IG9wdHMuY29udGFpbmVyO1xuICBtb3VudENvbXBvbmVudChlbCwgb3B0cyk7XG59OyIsInZhciBDb21tb24gPSByZXF1aXJlKCcuL2NvbW1vbicpO1xudmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgQ29tcG9uZW50cyA9IHJlcXVpcmUoJy4vY29tcG9uZW50Jyk7XG52YXIgc3RhdGUgPSByZXF1aXJlKCcuL3N0YXRlJyk7XG52YXIgcmVnaXN0ZXJXZWJDb21wb25lbnQgPSByZXF1aXJlKCcuL3dlYmNvbXBvbmVudCcpLnJlZ2lzdGVyV2ViQ29tcG9uZW50O1xudmFyIFN0cmluZ2lmaWVyID0gcmVxdWlyZSgnLi9zdHJpbmdpZnknKTtcbnZhciBEaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9ldmVudHMnKTtcblxuZnVuY3Rpb24gc3R5bGVUb1N0cmluZyhhdHRycykge1xuICAgIGlmIChfLmlzVW5kZWZpbmVkKGF0dHJzKSkgcmV0dXJuICcnO1xuICAgIHZhciBhdHRyc0FycmF5ID0gXy5tYXAoXy5rZXlzKGF0dHJzKSwgZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBrZXlOYW1lID0gXy5kYXNoZXJpemUoa2V5KTtcbiAgICAgICAgaWYgKGtleSA9PT0gJ2NsYXNzTmFtZScpIHtcbiAgICAgICAgICAgIGtleU5hbWUgPSAnY2xhc3MnO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2YWx1ZSA9IGF0dHJzW2tleV07XG4gICAgICAgIGlmICghXy5pc1VuZGVmaW5lZCh2YWx1ZSkgJiYgXy5pc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghXy5pc1VuZGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBrZXlOYW1lICsgJzogJyArIHZhbHVlICsgJzsnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGF0dHJzQXJyYXkgPSBfLmZpbHRlcihhdHRyc0FycmF5LCBmdW5jdGlvbihpdGVtKSB7IHJldHVybiAhXy5pc1VuZGVmaW5lZChpdGVtKTsgfSk7XG4gICAgcmV0dXJuIGF0dHJzQXJyYXkuam9pbignICcpO1xufVxuXG5mdW5jdGlvbiBjbGFzc1RvQXJyYXkoYXR0cnMpIHsgLyogSGFuZGxlIGNsYXNzIGFzIG9iamVjdCB3aXRoIGJvb2xlYW4gdmFsdWVzICovXG4gICAgaWYgKF8uaXNVbmRlZmluZWQoYXR0cnMpKSByZXR1cm4gW107XG4gICAgdmFyIGF0dHJzQXJyYXkgPSBfLm1hcChfLmtleXMoYXR0cnMpLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gYXR0cnNba2V5XTtcbiAgICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKHZhbHVlKSAmJiB2YWx1ZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIF8uZGFzaGVyaXplKGtleSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgYXR0cnNBcnJheSA9IF8uZmlsdGVyKGF0dHJzQXJyYXksIGZ1bmN0aW9uKGl0ZW0pIHsgcmV0dXJuICFfLmlzVW5kZWZpbmVkKGl0ZW0pOyB9KTtcbiAgICByZXR1cm4gYXR0cnNBcnJheTtcbn1cblxuZnVuY3Rpb24gd3JhcENoaWxkcmVuKGNoaWxkcmVuKSB7XG4gICAgaWYgKGNoaWxkcmVuID09PSAwKSB7XG4gICAgICAgIHJldHVybiBjaGlsZHJlbjtcbiAgICB9IGVsc2UgaWYgKGNoaWxkcmVuID09PSAnJykge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBjaGlsZHJlbiB8fCBbXTtcbn1cblxuZnVuY3Rpb24gYnVpbGRSZWYoaWQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRET01Ob2RlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBfLmZpbmROb2RlKCdbZGF0YS1ub2RlaWQ9XCInICsgaWQgKyAnXCJdJyk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5mdW5jdGlvbiBleHRyYWN0RXZlbnRIYW5kbGVycyhhdHRycywgbm9kZUlkLCBjb250ZXh0KSB7XG4gICAgXy5lYWNoKF8ua2V5cyhhdHRycyksIGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIga2V5TmFtZSA9IF8uZGFzaGVyaXplKGtleSk7ICBcbiAgICAgICAgaWYgKF8uc3RhcnRzV2l0aChrZXlOYW1lLCAnb24nKSkge1xuICAgICAgICAgICAgaWYgKGNvbnRleHQgJiYgY29udGV4dC53YWl0aW5nSGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0LndhaXRpbmdIYW5kbGVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgcm9vdDogY29udGV4dC5yb290LFxuICAgICAgICAgICAgICAgICAgICBpZDogbm9kZUlkLCBcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQ6IGtleU5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBhdHRyc1trZXldXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gXG4gICAgICAgIGlmIChrZXlOYW1lID09PSAncmVmJyAmJiBjb250ZXh0ICYmIGNvbnRleHQucmVmcykgY29udGV4dC5yZWZzW2F0dHJzW2tleV1dID0gYnVpbGRSZWYobm9kZUlkKTtcbiAgICB9KTsgICBcbn1cblxuZnVuY3Rpb24gYXNBdHRyaWJ1dGUoa2V5LCB2YWx1ZSkgeyByZXR1cm4geyBrZXk6IGtleSwgdmFsdWU6IHZhbHVlIH07IH1cblxuZnVuY3Rpb24gYXR0cmlidXRlc1RvQXJyYXkoYXR0cnMpIHtcbiAgICBpZiAoXy5pc1VuZGVmaW5lZChhdHRycykpIHJldHVybiBbXTtcbiAgICB2YXIgYXR0cnNBcnJheSA9IFtdO1xuICAgIF8uZWFjaChfLmtleXMoYXR0cnMpLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGtleU5hbWUgPSBfLmRhc2hlcml6ZShrZXkpO1xuICAgICAgICBpZiAoa2V5ID09PSAnY2xhc3NOYW1lJykge1xuICAgICAgICAgICAga2V5TmFtZSA9ICdjbGFzcyc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFfLnN0YXJ0c1dpdGgoa2V5TmFtZSwgJ29uJykgJiYga2V5TmFtZSAhPT0gJ3JlZicpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGF0dHJzW2tleV07XG4gICAgICAgICAgICBpZiAoIV8uaXNVbmRlZmluZWQodmFsdWUpICYmIF8uaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIV8uaXNVbmRlZmluZWQodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNPYmplY3QodmFsdWUpICYmIGtleU5hbWUgPT09ICdzdHlsZScpIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0cnNBcnJheS5wdXNoKGFzQXR0cmlidXRlKCdzdHlsZScsIHN0eWxlVG9TdHJpbmcodmFsdWUpKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzQXJyYXkodmFsdWUpICYmIGtleU5hbWUgPT09ICdjbGFzcycpIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0cnNBcnJheS5wdXNoKGFzQXR0cmlidXRlKGtleU5hbWUsIHZhbHVlLmpvaW4oJyAnKSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc09iamVjdCh2YWx1ZSkgJiYga2V5TmFtZSA9PT0gJ2NsYXNzJykge1xuICAgICAgICAgICAgICAgICAgICBhdHRyc0FycmF5LnB1c2goYXNBdHRyaWJ1dGUoa2V5TmFtZSwgY2xhc3NUb0FycmF5KHZhbHVlKS5qb2luKCcgJykpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhdHRyc0FycmF5LnB1c2goYXNBdHRyaWJ1dGUoa2V5TmFtZSwgdmFsdWUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gYXR0cnNBcnJheTtcbn1cblxuZnVuY3Rpb24gZWwobmFtZSwgYXR0cnMsIGNoaWxkcmVuKSB7XG4gICAgdmFyIG5vZGVJZCA9IF8udW5pcXVlSWQoJ25vZGVfJyk7XG4gICAgaWYgKF8uaXNVbmRlZmluZWQoY2hpbGRyZW4pICYmICFfLmlzVW5kZWZpbmVkKGF0dHJzKSAmJiAhYXR0cnMuX19pc0F0dHJzKSB7XG4gICAgICAgIGNoaWxkcmVuID0gYXR0cnM7XG4gICAgICAgIGF0dHJzID0ge307XG4gICAgfVxuICAgIG5hbWUgPSBfLmVzY2FwZShuYW1lKSB8fCAndW5rbm93bic7XG4gICAgYXR0cnMgPSBhdHRycyB8fCB7fTtcbiAgICBjaGlsZHJlbiA9IHdyYXBDaGlsZHJlbihjaGlsZHJlbik7XG4gICAgaWYgKF8uaXNSZWdFeHAoY2hpbGRyZW4pIHx8IF8uaXNVbmRlZmluZWQoY2hpbGRyZW4pIHx8IF8uaXNOdWxsKGNoaWxkcmVuKSkgY2hpbGRyZW4gPSBbXTsgXG4gICAgaWYgKF8uaXNBcnJheShjaGlsZHJlbikpIHtcbiAgICAgICAgY2hpbGRyZW4gPSBfLmNoYWluKGNoaWxkcmVuKS5tYXAoZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24oY2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHsgXG4gICAgICAgICAgICByZXR1cm4gIV8uaXNVbmRlZmluZWQoaXRlbSk7IFxuICAgICAgICB9KS52YWx1ZSgpO1xuICAgIH0gXG4gICAgdmFyIHNlbGZDbG9zZVRhZyA9IF8uY29udGFpbnMoQ29tbW9uLnZvaWRFbGVtZW50cywgbmFtZS50b1VwcGVyQ2FzZSgpKSBcbiAgICAgICAgJiYgKF8uaXNOdWxsKGNoaWxkcmVuKSB8fCBfLmlzVW5kZWZpbmVkKGNoaWxkcmVuKSB8fCAoXy5pc0FycmF5KGNoaWxkcmVuKSAmJiBjaGlsZHJlbi5sZW5ndGggPT09IDApKTtcbiAgICB2YXIgYXR0cnNBcnJheSA9IGF0dHJpYnV0ZXNUb0FycmF5KGF0dHJzKTtcbiAgICBhdHRyc0FycmF5LnB1c2goYXNBdHRyaWJ1dGUoJ2RhdGEtbm9kZWlkJywgXy5lc2NhcGUobm9kZUlkKSkpO1xuICAgIGlmIChDb21tb24uZGVidWcpIGF0dHJzQXJyYXkucHVzaChhc0F0dHJpYnV0ZSgndGl0bGUnLCBfLmVzY2FwZShub2RlSWQpKSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgYXR0cnM6IGF0dHJzLFxuICAgICAgICBjaGlsZHJlbjogY2hpbGRyZW4sXG4gICAgICAgIGlzRWxlbWVudDogdHJ1ZSxcbiAgICAgICAgbm9kZUlkOiBub2RlSWQsXG4gICAgICAgIHRvSnNvblN0cmluZzogZnVuY3Rpb24ocHJldHR5KSB7XG4gICAgICAgICAgICBpZiAocHJldHR5KSByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcywgbnVsbCwgMik7XG4gICAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcyk7XG4gICAgICAgIH0sXG4gICAgICAgIHRvSHRtbE5vZGU6IGZ1bmN0aW9uKGRvYywgY29udGV4dCkge1xuICAgICAgICAgICAgZXh0cmFjdEV2ZW50SGFuZGxlcnMoYXR0cnMsIG5vZGVJZCwgY29udGV4dCk7XG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IGRvYy5jcmVhdGVFbGVtZW50KF8uZXNjYXBlKG5hbWUpKTtcbiAgICAgICAgICAgIF8uZWFjaChhdHRyc0FycmF5LCBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoaXRlbS5rZXksIGl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBmdW5jdGlvbiBhcHBlbmRTaW5nbGVOb2RlKF9fY2hpbGRyZW4sIF9fZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIGlmIChfLmlzTnVtYmVyKF9fY2hpbGRyZW4pKSB7XG4gICAgICAgICAgICAgICAgICAgIF9fZWxlbWVudC5hcHBlbmRDaGlsZChkb2MuY3JlYXRlVGV4dE5vZGUoX19jaGlsZHJlbiArICcnKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzU3RyaW5nKF9fY2hpbGRyZW4pKSB7XG4gICAgICAgICAgICAgICAgICAgIF9fZWxlbWVudC5hcHBlbmRDaGlsZChkb2MuY3JlYXRlVGV4dE5vZGUoX19jaGlsZHJlbikpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc0Jvb2xlYW4oX19jaGlsZHJlbikpIHtcbiAgICAgICAgICAgICAgICAgICAgX19lbGVtZW50LmFwcGVuZENoaWxkKGRvYy5jcmVhdGVUZXh0Tm9kZShfX2NoaWxkcmVuICsgJycpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNPYmplY3QoX19jaGlsZHJlbikgJiYgX19jaGlsZHJlbi5pc0VsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgX19lbGVtZW50LmFwcGVuZENoaWxkKF9fY2hpbGRyZW4udG9IdG1sTm9kZShkb2MsIGNvbnRleHQpKTsgXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzT2JqZWN0KF9fY2hpbGRyZW4pICYmIF9fY2hpbGRyZW4uX19hc0h0bWwpIHtcbiAgICAgICAgICAgICAgICAgICAgX19lbGVtZW50LmlubmVySFRNTCA9IF9fY2hpbGRyZW4uX19hc0h0bWw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfX2NoaWxkcmVuLl9fY29tcG9uZW50RmFjdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29tcElkID0gXy5lc2NhcGUoXy51bmlxdWVJZCgnY29tcG9uZW50XycpKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNwYW4gPSBkb2MuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgICAgICAgICBzcGFuLnNldEF0dHJpYnV0ZSgnZGF0YS1jb21wb25lbnRpZCcsIGNvbXBJZCk7XG4gICAgICAgICAgICAgICAgICAgIF9fZWxlbWVudC5hcHBlbmRDaGlsZChzcGFuKTtcbiAgICAgICAgICAgICAgICAgICAgX19jaGlsZHJlbi5yZW5kZXJUbygnW2RhdGEtY29tcG9uZW50aWQ9XCInICsgY29tcElkICsgJ1wiXScpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIF9fZWxlbWVudC5hcHBlbmRDaGlsZChkb2MuY3JlYXRlVGV4dE5vZGUoX19jaGlsZHJlbi50b1N0cmluZygpKSk7XG4gICAgICAgICAgICAgICAgfSAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghc2VsZkNsb3NlVGFnKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheShjaGlsZHJlbikpIHtcbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGNoaWxkcmVuLCBmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBwZW5kU2luZ2xlTm9kZShjaGlsZCwgZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcGVuZFNpbmdsZU5vZGUoY2hpbGRyZW4sIGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50O1xuICAgICAgICB9XG4gICAgfTtcbn0gXG5cbmZ1bmN0aW9uIHJlbmRlclRvTm9kZShlbCwgZG9jLCBjb250ZXh0KSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihlbCkpIGVsID0gZWwoKGNvbnRleHQgfHwgeyBwcm9wczoge319KS5wcm9wcylcbiAgICBpZiAoIV8uaXNVbmRlZmluZWQoZWwpKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkoZWwpKSB7XG4gICAgICAgICAgICByZXR1cm4gXy5jaGFpbihlbCkubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGl0ZW0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICFfLmlzVW5kZWZpbmVkKGl0ZW0pO1xuICAgICAgICAgICAgfSkubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0udG9IdG1sTm9kZShkb2MsIGNvbnRleHQpO1xuICAgICAgICAgICAgfSkudmFsdWUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbZWwudG9IdG1sTm9kZShkb2MsIGNvbnRleHQpXTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG59ICAgXG5cbmV4cG9ydHMucmVuZGVyVG9TdHJpbmcgPSBmdW5jdGlvbihlbCwgY29udGV4dCkge1xuICAgIENvbW1vbi5tYXJrU3RhcnQoJ0VsZW0ucmVuZGVyVG9TdHJpbmcnKTtcbiAgICB2YXIgc3RyID0gXy5tYXAocmVuZGVyVG9Ob2RlKGVsLCBTdHJpbmdpZmllcigpKSwgZnVuY3Rpb24obikgeyByZXR1cm4gbi50b0h0bWxTdHJpbmcoKTsgfSkuam9pbignJyk7XG4gICAgQ29tbW9uLm1hcmtTdG9wKCdFbGVtLnJlbmRlclRvU3RyaW5nJyk7XG4gICAgcmV0dXJuIHN0cjtcbn07XG5cbmV4cG9ydHMuZWwgPSBlbDtcblxuZXhwb3J0cy5zZWwgPSBmdW5jdGlvbihuYW1lLCBjaGlsZHJlbikgeyByZXR1cm4gZWwobmFtZSwge30sIGNoaWxkcmVuKTsgfTsgLy8gc2ltcGxlIG5vZGUgc2VsKG5hbWUsIGNoaWxkcmVuKVxuXG5leHBvcnRzLnZlbCA9IGZ1bmN0aW9uKG5hbWUsIGF0dHJzKSB7IHJldHVybiBlbChuYW1lLCBhdHRycywgW10pOyB9OyAvLyB2b2lkIG5vZGUsIGNlbChuYW1lLCBhdHRycylcblxuZXhwb3J0cy5uYnNwID0gZnVuY3Rpb24odGltZXMpIHsgcmV0dXJuIGVsKCdzcGFuJywgeyBfX2FzSHRtbDogXy50aW1lcyh0aW1lcyB8fCAxLCBmdW5jdGlvbigpIHsgcmV0dXJuICcmbmJzcDsnOyB9KSB9KTsgfTtcblxuZXhwb3J0cy50ZXh0ID0gZnVuY3Rpb24odGV4dCkgeyByZXR1cm4gZWwoJ3NwYW4nLCB7fSwgdGV4dCk7IH07XG5cbmV4cG9ydHMuZWxlbWVudHMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIF8ubWFwKGFyZ3VtZW50cywgZnVuY3Rpb24oaXRlbSkgeyByZXR1cm4gaXRlbTsgfSk7IH07XG5cbmV4cG9ydHMucmVuZGVyID0gZnVuY3Rpb24oZWwsIG5vZGUsIGNvbnRleHQpIHtcbiAgICBDb21tb24ubWFya1N0YXJ0KCdFbGVtLnJlbmRlcicpO1xuICAgIHZhciB3YWl0aW5nSGFuZGxlcnMgPSAoY29udGV4dCB8fCB7fSkud2FpdGluZ0hhbmRsZXJzIHx8IFtdO1xuICAgIHZhciByZWZzID0gKGNvbnRleHQgfHwge30pLnJlZnMgfHwge307XG4gICAgdmFyIHByb3BzID0gKGNvbnRleHQgfHwge30pLnByb3BzIHx8IHt9O1xuICAgIHZhciBkb2MgPSBkb2N1bWVudDtcbiAgICBpZiAobm9kZS5vd25lckRvY3VtZW50KSB7XG4gICAgICAgIGRvYyA9IG5vZGUub3duZXJEb2N1bWVudDtcbiAgICB9XG4gICAgdmFyIGh0bWxOb2RlID0gcmVuZGVyVG9Ob2RlKGVsLCBkb2MsIHsgcm9vdDogbm9kZSwgd2FpdGluZ0hhbmRsZXJzOiB3YWl0aW5nSGFuZGxlcnMsIHJlZnM6IHJlZnMsIHByb3BzOiBwcm9wcyB9KTtcbiAgICBpZiAoXy5pc1N0cmluZyhub2RlKSkge1xuICAgICAgICBub2RlID0gZG9jLnF1ZXJ5U2VsZWN0b3Iobm9kZSk7XG4gICAgfVxuICAgIHdoaWxlIChub2RlLmZpcnN0Q2hpbGQpIHsgbm9kZS5yZW1vdmVDaGlsZChub2RlLmZpcnN0Q2hpbGQpOyB9XG4gICAgXy5lYWNoKGh0bWxOb2RlLCBmdW5jdGlvbihuKSB7XG4gICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQobik7XG4gICAgfSk7XG4gICAgaWYgKCEoY29udGV4dCAmJiBjb250ZXh0Ll9fcm9vdExpc3RlbmVyKSkgeyAgLy8gZXh0ZXJuYWwgbGlzdGVuZXIgaGVyZVxuICAgICAgICBfLmVhY2god2FpdGluZ0hhbmRsZXJzLCBmdW5jdGlvbihoYW5kbGVyKSB7IC8vIGhhbmRsZXIgb24gZWFjaCBjb25jZXJuZWQgbm9kZVxuICAgICAgICAgICAgXy5vbignW2RhdGEtbm9kZWlkPVwiJyArIGhhbmRsZXIuaWQgKyAnXCJdJywgW2hhbmRsZXIuZXZlbnQucmVwbGFjZSgnb24nLCAnJyldLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBoYW5kbGVyLmNhbGxiYWNrLmFwcGx5KHt9LCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfSk7ICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBDb21tb24ubWFya1N0b3AoJ0VsZW0ucmVuZGVyJyk7XG59O1xuZXhwb3J0cy5jb21wb25lbnQgPSBDb21wb25lbnRzLmNvbXBvbmVudDtcbmV4cG9ydHMuY29tcG9uZW50RmFjdG9yeSA9IENvbXBvbmVudHMuY29tcG9uZW50RmFjdG9yeTtcbmV4cG9ydHMuc3RhdGUgPSBzdGF0ZTtcbmV4cG9ydHMuVXRpbHMgPSBfO1xuZXhwb3J0cy5yZWdpc3RlcldlYkNvbXBvbmVudCA9IHJlZ2lzdGVyV2ViQ29tcG9uZW50O1xuZXhwb3J0cy5kaXNwYXRjaGVyID0gRGlzcGF0Y2hlcjtcbmV4cG9ydHMuUGVyZiA9IHtcbiAgICBzdGFydDogZnVuY3Rpb24oKSB7IENvbW1vbi5wZXJmcyA9IHRydWU7IH0sXG4gICAgc3RvcDogZnVuY3Rpb24oKSB7IENvbW1vbi5zdG9wID0gZmFsc2U7IH0sXG4gICAgbWFya1N0YXJ0OiBDb21tb24ubWFya1N0YXJ0LFxuICAgIG1hcmtTdG9wOiBDb21tb24ubWFya1N0b3AsXG4gICAgY29sbGVjdE1lYXN1cmVzOiBDb21tb24uY29sbGVjdE1lYXN1cmVzLFxuICAgIHByaW50TWVhc3VyZXM6IENvbW1vbi5wcmludE1lYXN1cmVzXG59O1xuXG5leHBvcnRzLnByZWRpY2F0ZSA9IGZ1bmN0aW9uKHByZWRpY2F0ZSwgd2hhdCkge1xuICAgIGlmIChfLmlzRnVuY3Rpb24ocHJlZGljYXRlKSkge1xuICAgICAgICBpZiAocHJlZGljYXRlKCkgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHJldHVybiB3aGF0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIGlmIChwcmVkaWNhdGUgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHJldHVybiB3aGF0O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH1cbn07XG5leHBvcnRzLnAgPSBleHBvcnRzLnByZWRpY2F0ZTtcbmV4cG9ydHMuaWZQcmVkID0gZXhwb3J0cy5wcmVkaWNhdGU7XG5cbmlmICh0eXBlb2YgZGVmaW5lID09PSAnZnVuY3Rpb24nICYmIGRlZmluZS5hbWQpIHtcbiAgICBkZWZpbmUoJ2VsZW0nLCBbXSwgZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBtb2R1bGUuZXhwb3J0cztcbiAgICB9KTtcbn1cbiIsInZhciBfID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgZXZlbnRTcGxpdHRlciA9IC9cXHMrLztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcblxuICB2YXIgY2FsbGJhY2tzID0gW107XG5cbiAgZnVuY3Rpb24gZmlyZUNhbGxiYWNrcyhuYW1lcywgZXZlbnQpIHtcbiAgICB2YXIgZXZlbnROYW1lcyA9IFtuYW1lc107XG4gICAgaWYgKGV2ZW50U3BsaXR0ZXIudGVzdChuYW1lcykpIHtcbiAgICAgIGV2ZW50TmFtZXMgPSBuYW1lcy5zcGxpdChldmVudFNwbGl0dGVyKTtcbiAgICB9XG4gICAgXy5lYWNoKGV2ZW50TmFtZXMsIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIF8uZWFjaChjYWxsYmFja3MsIGZ1bmN0aW9uKGNhbGxiYWNrSGFzaCkge1xuICAgICAgICBpZiAoY2FsbGJhY2tIYXNoLm5hbWUgPT09ICdhbGwnKSB7XG4gICAgICAgICAgY2FsbGJhY2tIYXNoLmNhbGxiYWNrKG5hbWUsIGV2ZW50KTtcbiAgICAgICAgfSBlbHNlIGlmIChjYWxsYmFja0hhc2gubmFtZSA9PT0gbmFtZSkge1xuICAgICAgICAgIGNhbGxiYWNrSGFzaC5jYWxsYmFjayhldmVudCk7XG4gICAgICAgIH1cbiAgICAgIH0pOyAgXG4gICAgfSk7ICAgIFxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICB0cmlnZ2VyOiBmaXJlQ2FsbGJhY2tzLFxuICAgIGRpc3BhdGNoOiBmaXJlQ2FsbGJhY2tzLFxuICAgIG9uOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaykge1xuICAgICAgdGhpcy5vZmYobmFtZSwgY2FsbGJhY2spO1xuICAgICAgY2FsbGJhY2tzLnB1c2goeyBuYW1lOiBuYW1lLCBjYWxsYmFjazogY2FsbGJhY2sgfSk7XG4gICAgfSxcbiAgICBvZmY6IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFja3MgPSBfLmZpbHRlcihjYWxsYmFja3MsIGZ1bmN0aW9uKG9iaikge1xuICAgICAgICBpZiAob2JqLm5hbWUgPT09IG5hbWUgJiYgb2JqLmNhbGxiYWNrID09PSBjYWxsYmFjaykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuICAgIH0sXG4gIH07XG59OyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG1vZCkge1xuXG4gIHZhciB0aGVNb2RlbCA9IF8uZXh0ZW5kKHt9LCBtb2QgfHwge30pO1xuXG4gIHZhciBjYWxsYmFja3MgPSBbXTtcblxuICBmdW5jdGlvbiBmaXJlQ2FsbGJhY2tzKCkge1xuICAgIF8uZWFjaChjYWxsYmFja3MsIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH0pO1xuICB9XG5cbiAgdmFyIGFwaSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLmNsb25lKHRoZU1vZGVsKTtcbiAgfTtcblxuICByZXR1cm4gXy5leHRlbmQoYXBpLCB7XG4gICAgb25DaGFuZ2U6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gICAgfSxcbiAgICBnZXQ6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIHRoZU1vZGVsW2tleV07XG4gICAgfSxcbiAgICBhbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIF8uY2xvbmUodGhlTW9kZWwpO1xuICAgIH0sXG4gICAgZm9yY2VVcGRhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgZmlyZUNhbGxiYWNrcygpO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihvYmosIHNpbGVudE9yQ2FsbGJhY2spIHtcbiAgICAgIHZhciBzaWxlbnQgPSBfLmlzQm9vbGVhbihzaWxlbnRPckNhbGxiYWNrKSAmJiBzaWxlbnRPckNhbGxiYWNrID09PSB0cnVlO1xuICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKG9iaikgJiYgXy5pc09iamVjdChvYmopKSB7XG4gICAgICAgIF8ubWFwKF8ua2V5cyhvYmopLCBmdW5jdGlvbihrKSB7XG4gICAgICAgICAgdGhlTW9kZWxba10gPSBvYmpba107XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXNpbGVudCkgZmlyZUNhbGxiYWNrcygpO1xuICAgICAgICBpZiAoIXNpbGVudCkoc2lsZW50T3JDYWxsYmFjayB8fCBmdW5jdGlvbigpIHt9KSgpO1xuICAgICAgfVxuICAgIH0sXG4gICAgcmVwbGFjZTogZnVuY3Rpb24ob2JqLCBzaWxlbnRPckNhbGxiYWNrKSB7XG4gICAgICB0aGVNb2RlbCA9IHt9O1xuICAgICAgdGhpcy5zZXQob2JqLCBzaWxlbnRPckNhbGxiYWNrKTtcbiAgICB9LFxuICAgIHJlbW92ZTogZnVuY3Rpb24oa2V5KSB7XG4gICAgICBkZWxldGUgdGhlTW9kZWxba2V5XTtcbiAgICAgIGZpcmVDYWxsYmFja3MoKTtcbiAgICB9XG4gIH0pO1xufTsiLCJ2YXIgQ29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzdHJpbmdpZnlEb2MoKSB7XG4gICAgZnVuY3Rpb24gbm9kZShuYW1lKSB7IFxuICAgICAgICB2YXIgYXR0cnMgPSBbXTtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gW107XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZXRBdHRyaWJ1dGU6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHsgYXR0cnMucHVzaChrZXkgKyAnPVwiJyArIHZhbHVlICsgJ1wiJyk7IH0sXG4gICAgICAgICAgICBhcHBlbmRDaGlsZDogZnVuY3Rpb24oY2hpbGQpIHsgY2hpbGRyZW4ucHVzaChjaGlsZCk7IH0sXG4gICAgICAgICAgICB0b0h0bWxTdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmQ2xvc2VUYWcgPSBfLmNvbnRhaW5zKENvbW1vbi52b2lkRWxlbWVudHMsIG5hbWUudG9VcHBlckNhc2UoKSkgJiYgY2hpbGRyZW4ubGVuZ3RoID09PSAwO1xuICAgICAgICAgICAgICAgIGlmIChzZWxmQ2xvc2VUYWcpIHJldHVybiAnPCcgKyBuYW1lICsgJyAnICsgYXR0cnMuam9pbignICcpICsgJyAvPic7XG4gICAgICAgICAgICAgICAgcmV0dXJuICc8JyArIG5hbWUgKyAnICcgKyBhdHRycy5qb2luKCcgJykgKyAnPicgKyBfLm1hcChjaGlsZHJlbiwgZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkLnRvSHRtbFN0cmluZygpO1xuICAgICAgICAgICAgICAgIH0pLmpvaW4oJycpICsgJzwvJyArIG5hbWUgKyAnPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY3JlYXRlRWxlbWVudDogbm9kZSxcbiAgICAgICAgY3JlYXRlVGV4dE5vZGU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHRvSHRtbFN0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSAgIFxuICAgIH07XG59XG4iLCJ2YXIgX19pZENvdW50ZXIgPSAwO1xuXG52YXIgZXNjYXBlTWFwID0ge1xuICAgICcmJzogJyZhbXA7JyxcbiAgICAnPCc6ICcmbHQ7JyxcbiAgICAnPic6ICcmZ3Q7JyxcbiAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICBcIidcIjogJyYjeDI3OycsXG4gICAgJ2AnOiAnJiN4NjA7J1xufTtcblxudmFyIGNyZWF0ZUVzY2FwZXIgPSBmdW5jdGlvbihtYXAsIGtleXMpIHtcbiAgICB2YXIgZXNjYXBlciA9IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiBtYXBbbWF0Y2hdO1xuICAgIH07XG4gICAgdmFyIHNvdXJjZSA9ICcoPzonICsga2V5cyhtYXApLmpvaW4oJ3wnKSArICcpJztcbiAgICB2YXIgdGVzdFJlZ2V4cCA9IFJlZ0V4cChzb3VyY2UpO1xuICAgIHZhciByZXBsYWNlUmVnZXhwID0gUmVnRXhwKHNvdXJjZSwgJ2cnKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICAgIHN0cmluZyA9IHN0cmluZyA9PSBudWxsID8gJycgOiAnJyArIHN0cmluZztcbiAgICAgICAgcmV0dXJuIHRlc3RSZWdleHAudGVzdChzdHJpbmcpID8gc3RyaW5nLnJlcGxhY2UocmVwbGFjZVJlZ2V4cCwgZXNjYXBlcikgOiBzdHJpbmc7XG4gICAgfTtcbn07XG5cbmZ1bmN0aW9uIGtleXMob2JqKSB7XG4gICAgaWYgKCFpc09iamVjdChvYmopKSByZXR1cm4gW107XG4gICAgaWYgKE9iamVjdC5rZXlzKSByZXR1cm4gT2JqZWN0LmtleXMob2JqKTtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChoYXMob2JqLCBrZXkpKSBrZXlzLnB1c2goa2V5KTtcbiAgICByZXR1cm4ga2V5cztcbn1cblxuZnVuY3Rpb24gdmFsdWVzKG9iaikge1xuICAgIHZhciBrZXlzID0ga2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgdmFsdWVzID0gQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhbHVlc1tpXSA9IG9ialtrZXlzW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbn1cblxuZnVuY3Rpb24gaW5kZXhPZihhcnJheSwgaXRlbSwgaXNTb3J0ZWQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIC0xO1xuICAgIHZhciBpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuICAgIGlmIChpc1NvcnRlZCkge1xuICAgICAgICBpZiAodHlwZW9mIGlzU29ydGVkID09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBpID0gaXNTb3J0ZWQgPCAwID8gTWF0aC5tYXgoMCwgbGVuZ3RoICsgaXNTb3J0ZWQpIDogaXNTb3J0ZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpID0gc29ydGVkSW5kZXgoYXJyYXksIGl0ZW0pO1xuICAgICAgICAgICAgcmV0dXJuIGFycmF5W2ldID09PSBpdGVtID8gaSA6IC0xO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoOyBpIDwgbGVuZ3RoOyBpKyspIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xufVxuXG5mdW5jdGlvbiBlYWNoKG9iaiwgZnVuYykge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIG9iajtcbiAgICB2YXIgaSwgbGVuZ3RoID0gb2JqLmxlbmd0aDtcbiAgICBpZiAobGVuZ3RoID09PSArbGVuZ3RoKSB7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZnVuYyhvYmpbaV0sIGksIG9iaik7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIga2V5cyA9IGtleXMob2JqKTtcbiAgICAgICAgZm9yIChpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZnVuYyhvYmpba2V5c1tpXV0sIGtleXNbaV0sIG9iaik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gbWFwKG9iaiwgZnVuYykge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIFtdO1xuICAgIHZhciBrZXlzID0gb2JqLmxlbmd0aCAhPT0gK29iai5sZW5ndGggJiYga2V5cyhvYmopLFxuICAgICAgICBsZW5ndGggPSAoa2V5cyB8fCBvYmopLmxlbmd0aCxcbiAgICAgICAgcmVzdWx0cyA9IEFycmF5KGxlbmd0aCksXG4gICAgICAgIGN1cnJlbnRLZXk7XG4gICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICAgIHJlc3VsdHNbaW5kZXhdID0gZnVuYyhvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xufVxuXG5mdW5jdGlvbiBmaWx0ZXIob2JqLCBwcmVkaWNhdGUpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdHM7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgICBpZiAocHJlZGljYXRlKHZhbHVlLCBpbmRleCwgbGlzdCkpIHJlc3VsdHMucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIHJlZHVjZShvYmosIGl0ZXJhdGVlLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSBvYmogPSBbXTtcbiAgICB2YXIga2V5cyA9IG9iai5sZW5ndGggIT09ICtvYmoubGVuZ3RoICYmIGtleXMob2JqKSxcbiAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGgsXG4gICAgICAgIGluZGV4ID0gMCxcbiAgICAgICAgY3VycmVudEtleTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgaWYgKCFsZW5ndGgpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgICAgICBtZW1vID0gb2JqW2tleXMgPyBrZXlzW2luZGV4KytdIDogaW5kZXgrK107XG4gICAgfVxuICAgIGZvciAoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRlZShtZW1vLCBvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgfVxuICAgIHJldHVybiBtZW1vO1xufVxuXG5mdW5jdGlvbiByZWplY3Qob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gZmlsdGVyKG9iaiwgbmVnYXRlKHByZWRpY2F0ZSksIGNvbnRleHQpO1xufVxuXG5mdW5jdGlvbiB3aGVyZShvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIGZpbHRlcihvYmosIG1hdGNoZXMoYXR0cnMpKTtcbn1cblxuZnVuY3Rpb24gbWF0Y2hlcyhhdHRycykge1xuICAgIHZhciBwYWlycyA9IHBhaXJzKGF0dHJzKSxcbiAgICAgICAgbGVuZ3RoID0gcGFpcnMubGVuZ3RoO1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gIWxlbmd0aDtcbiAgICAgICAgb2JqID0gbmV3IE9iamVjdChvYmopO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcGFpciA9IHBhaXJzW2ldLFxuICAgICAgICAgICAgICAgIGtleSA9IHBhaXJbMF07XG4gICAgICAgICAgICBpZiAocGFpclsxXSAhPT0gb2JqW2tleV0gfHwgIShrZXkgaW4gb2JqKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGlkZW50aXR5KHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBwcm9wZXJ0eShrZXkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmpba2V5XTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBuZWdhdGUocHJlZGljYXRlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gIXByZWRpY2F0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIHBhaXJzKG9iaikge1xuICAgIHZhciBrZXlzID0ga2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgcGFpcnMgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGFpcnNbaV0gPSBba2V5c1tpXSwgb2JqW2tleXNbaV1dXTtcbiAgICB9XG4gICAgcmV0dXJuIHBhaXJzO1xufVxuXG5mdW5jdGlvbiBjaGFpbihvYmopIHtcbiAgICB2YXIgaW50ZXJuYWxPYmogPSBvYmo7XG4gICAgdmFyIHVuZGVyID0gdGhpcztcbiAgICBmdW5jdGlvbiBjaGFpbmFibGVBcGkoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGludGVybmFsT2JqO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hcDogZnVuY3Rpb24oZnVuYykge1xuICAgICAgICAgICAgICAgIGludGVybmFsT2JqID0gdW5kZXIubWFwKGludGVybmFsT2JqLCBmdW5jKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmaWx0ZXI6IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgICAgICAgICAgICBpbnRlcm5hbE9iaiA9IHVuZGVyLmZpbHRlcihpbnRlcm5hbE9iaiwgZnVuYyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZWFjaDogZnVuY3Rpb24oZnVuYykge1xuICAgICAgICAgICAgICAgIHVuZGVyLmVhY2goaW50ZXJuYWxPYmosIGZ1bmMpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHZhbHVlczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVyLnZhbHVlcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGtleXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlci5rZXlzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVkdWNlOiBmdW5jdGlvbihpdGVyYXRlZSwgbWVtbywgY29udGV4dCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlci5yZWR1Y2UoaW50ZXJuYWxPYmosIGl0ZXJhdGVlLCBtZW1vLCBjb250ZXh0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZWplY3Q6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgICAgICAgICAgICAgIGludGVybmFsT2JqID0gdW5kZXIucmVqZWN0KGludGVybmFsT2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHdoZXJlOiBmdW5jdGlvbihhdHRycykge1xuICAgICAgICAgICAgICAgIGludGVybmFsT2JqID0gdW5kZXIud2hlcmUoaW50ZXJuYWxPYmosIGF0dHJzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGNoYWluYWJsZUFwaSgpO1xufVxuXG5mdW5jdGlvbiBjb250YWlucyhvYmosIHRhcmdldCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChvYmoubGVuZ3RoICE9PSArb2JqLmxlbmd0aCkgb2JqID0gdmFsdWVzKG9iaik7XG4gICAgcmV0dXJuIGluZGV4T2Yob2JqLCB0YXJnZXQpID49IDA7XG59XG5cbmZ1bmN0aW9uIHVuaXF1ZUlkKHByZWZpeCkge1xuICAgIHZhciBpZCA9ICsrX19pZENvdW50ZXIgKyAnJztcbiAgICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbn0gIFxuXG5mdW5jdGlvbiB0aW1lcyhuLCBmdW5jKSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICByZXN1bHRzLnB1c2goZnVuYyhuKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xufVxuXG5mdW5jdGlvbiBjbG9uZShvYmopIHtcbiAgICBpZiAoIWlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gICAgcmV0dXJuIGlzQXJyYXkob2JqKSA/IG9iai5zbGljZSgpIDogZXh0ZW5kKHt9LCBvYmopO1xufVxuXG5mdW5jdGlvbiBleHRlbmQob2JqKSB7XG4gICAgaWYgKCFpc09iamVjdChvYmopKSByZXR1cm4gb2JqO1xuICAgIHZhciBzb3VyY2UsIHByb3A7XG4gICAgZm9yICh2YXIgaSA9IDEsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGZvciAocHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBwcm9wKSkge1xuICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB2b2lkIDA7XG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkob2JqKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkpIHJldHVybiBBcnJheS5pc0FycmF5KG9iaik7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChvYmopIHtcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiBvYmo7XG4gICAgcmV0dXJuIHR5cGUgPT09ICdmdW5jdGlvbicgfHwgdHlwZSA9PT0gJ29iamVjdCcgJiYgISFvYmo7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgTnVtYmVyXSc7XG59XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgU3RyaW5nXSc7XG59XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB0cnVlIHx8IG9iaiA9PT0gZmFsc2UgfHwgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEJvb2xlYW5dJztcbn1cblxuZnVuY3Rpb24gaXNSZWdFeHAob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cblxuZnVuY3Rpb24gaXNGdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG59XG5cbmZ1bmN0aW9uIGlzTnVsbChvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc05hTihvYmopIHtcbiAgICByZXR1cm4gaXNOdW1iZXIob2JqKSAmJiBvYmogIT09ICtvYmo7XG59XG5cbmZ1bmN0aW9uIGhhcyhvYmosIGtleSkge1xuICAgIHJldHVybiBvYmogIT0gbnVsbCAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpO1xufVxuXG5mdW5jdGlvbiBkYXNoZXJpemUod2hhdCkge1xuICAgIHJldHVybiB3aGF0LnJlcGxhY2UoLyhbQS1aXFxkXSspKFtBLVpdW2Etel0pL2csJyQxXyQyJylcbiAgICAgICAgLnJlcGxhY2UoLyhbYS16XFxkXSkoW0EtWl0pL2csJyQxXyQyJylcbiAgICAgICAgLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXy9nLCAnLScpO1xufVxuXG5mdW5jdGlvbiBzdGFydHNXaXRoKHNvdXJjZSwgc3RhcnQpIHsgXG4gICAgcmV0dXJuIHNvdXJjZS5pbmRleE9mKHN0YXJ0KSA9PT0gMDsgXG59XG5cbmZ1bmN0aW9uIGZvY3VzKGVsZW0pIHsgXG4gICAgaWYgKGVsZW0uZm9jdXMpIGVsZW0uZm9jdXMoKTtcbn1cblxuZnVuY3Rpb24gaGFzRm9jdXMoZWxlbSkgeyBcbiAgICByZXR1cm4gZWxlbSA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCAmJiAoIWRvY3VtZW50Lmhhc0ZvY3VzIHx8IGRvY3VtZW50Lmhhc0ZvY3VzKCkpICYmICEhKGVsZW0udHlwZSB8fCBlbGVtLmhyZWYgfHwgfmVsZW0udGFiSW5kZXgpOyBcbn1cblxuZnVuY3Rpb24gb24obm9kZSwgdHlwZXMsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGFjdHVhbCA9IGlzU3RyaW5nKG5vZGUpID8gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcihub2RlKSA6IG5vZGU7XG4gICAgZWFjaCh0eXBlcywgZnVuY3Rpb24odHlwZSkge1xuICAgICAgICBpZiAoYWN0dWFsICYmIGFjdHVhbCAhPT0gbnVsbCkge1xuICAgICAgICAgICAgaWYgKGFjdHVhbC5hZGRFdmVudExpc3RlbmVyKSB7XG4gICAgICAgICAgICAgICAgYWN0dWFsLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIGZhbHNlKTsgLy8gZG9lcyBub3Qgd29yayBpbiBmZiAzLjUgd2l0aG91dCBmYWxzZVxuICAgICAgICAgICAgfSBlbHNlIGlmIChhY3R1YWwuYXR0YWNoRXZlbnQpIHtcbiAgICAgICAgICAgICAgICBhY3R1YWwuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjayk7IC8vIHdvcmsgaW4gaWVcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBmaW5kTm9kZShzZWxlY3Rvcikge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKG5vZGUpO1xufVxuXG5leHBvcnRzLmVzY2FwZSA9IGNyZWF0ZUVzY2FwZXIoZXNjYXBlTWFwLCBrZXlzKTtcbmV4cG9ydHMua2V5cyA9IGtleXM7XG5leHBvcnRzLnZhbHVlcyA9IHZhbHVlcztcbmV4cG9ydHMuaW5kZXhPZiA9IGluZGV4T2Y7XG5leHBvcnRzLmVhY2ggPSBlYWNoO1xuZXhwb3J0cy5tYXAgPSBtYXA7XG5leHBvcnRzLmZpbHRlciA9IGZpbHRlcjtcbmV4cG9ydHMuY2hhaW4gPSBjaGFpbjtcbmV4cG9ydHMuY29udGFpbnMgPSBjb250YWlucztcbmV4cG9ydHMudW5pcXVlSWQgPSB1bmlxdWVJZDtcbmV4cG9ydHMudGltZXMgPSB0aW1lcztcbmV4cG9ydHMuY2xvbmUgPSBjbG9uZTtcbmV4cG9ydHMuZXh0ZW5kID0gZXh0ZW5kO1xuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuZXhwb3J0cy5pc05hTiA9IGlzTmFOO1xuZXhwb3J0cy5oYXMgPSBoYXM7XG5leHBvcnRzLmRhc2hlcml6ZSA9IGRhc2hlcml6ZTtcbmV4cG9ydHMuc3RhcnRzV2l0aCA9IHN0YXJ0c1dpdGg7XG5leHBvcnRzLmZvY3VzID0gZm9jdXM7XG5leHBvcnRzLmhhc0ZvY3VzID0gaGFzRm9jdXM7XG5leHBvcnRzLm9uID0gb247XG5leHBvcnRzLmZpbmROb2RlID0gZmluZE5vZGU7XG5leHBvcnRzLnJlZHVjZSA9IHJlZHVjZTtcbmV4cG9ydHMucmVqZWN0ID0gcmVqZWN0O1xuZXhwb3J0cy53aGVyZSA9IHdoZXJlO1xuZXhwb3J0cy5tYXRjaGVzID0gbWF0Y2hlcztcbmV4cG9ydHMubmVnYXRlID0gbmVnYXRlO1xuZXhwb3J0cy5wcm9wZXJ0eSA9IHByb3BlcnR5O1xuZXhwb3J0cy5pZGVudGl0eSA9IGlkZW50aXR5O1xuZXhwb3J0cy5wYWlycyA9IHBhaXJzOyIsIlxudmFyIHJlZ2lzdHJhdGlvbkZ1bmN0aW9uID0gdW5kZWZpbmVkXG5cbnRyeSB7XG4gIHJlZ2lzdHJhdGlvbkZ1bmN0aW9uID0gKGRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudCB8fCBkb2N1bWVudC5yZWdpc3RlciB8fCBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh3aW5kb3cuY29uc29sZSkgY29uc29sZS5lcnJvcignTm8gcmVnaXN0ZXJFbGVtZW50IGZ1bmN0aW9uLCB3ZWJjb21wb25lbnRzIHdpbGwgbm90IHdvcmsgISEhJyk7XG4gIH0pLmJpbmQoZG9jdW1lbnQpO1xufSBjYXRjaChlKSB7fVxuXG5mdW5jdGlvbiByZWdpc3RlcldlYkNvbXBvbmVudCh0YWcsIGVsZW0pIHtcbiAgdmFyIHRoYXREb2MgPSBkb2N1bWVudDtcbiAgdmFyIEVsZW1lbnRQcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlKTtcbiAgXG4gIEVsZW1lbnRQcm90by5jcmVhdGVkQ2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcHJvcHMgPSB7fTtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMuYXR0cmlidXRlcykge1xuICAgICAgdmFyIGl0ZW0gPSB0aGlzLmF0dHJpYnV0ZXNbaV07XG4gICAgICBwcm9wc1tpdGVtLm5hbWVdID0gaXRlbS52YWx1ZTsgICAgXG4gICAgfVxuICAgIHRoaXMucHJvcHMgPSBwcm9wcztcbiAgICB2YXIgbm9kZSA9IHRoaXM7XG4gICAgaWYgKHByb3BzLm5vc2hhZG93ICE9PSAndHJ1ZScpIHtcbiAgICAgIHZhciBzaGFkb3dSb290ID0gdGhpcy5jcmVhdGVTaGFkb3dSb290KCk7XG4gICAgICBub2RlID0gdGhhdERvYy5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIG5vZGUuc2V0QXR0cmlidXRlKCdjbGFzcycsICdlbGVtY29tcG9uZW50Jyk7XG4gICAgICBzaGFkb3dSb290LmFwcGVuZENoaWxkKG5vZGUpO1xuICAgIH1cbiAgICB0aGlzLl9ub2RlID0gbm9kZTtcbiAgICBpZiAocHJvcHMucmVuZGVyT25seSAmJiBwcm9wcy5yZW5kZXJPbmx5ID09PSB0cnVlKSB7XG4gICAgICB0aGlzLnJlbmRlcmVkRWxlbWVudCA9IEVsZW0ucmVuZGVyKGVsZW0sIG5vZGUpOyBcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZW5kZXJlZEVsZW1lbnQgPSBFbGVtLmNvbXBvbmVudCh7XG4gICAgICAgIGNvbnRhaW5lcjogbm9kZSxcbiAgICAgICAgaW5pdDogZWxlbS5pbml0LFxuICAgICAgICByZW5kZXI6IGVsZW0ucmVuZGVyLFxuICAgICAgICBwcm9wczogcHJvcHMsXG4gICAgICAgIHN0YXRlOiBlbGVtLnN0YXRlXG4gICAgICB9KTsgXG4gICAgfVxuICB9O1xuXG4gIEVsZW1lbnRQcm90by5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sgPSBmdW5jdGlvbiAoYXR0ciwgb2xkVmFsLCBuZXdWYWwpIHtcbiAgICB0aGlzLnByb3BzW2F0dHJdID0gbmV3VmFsO1xuICAgIHZhciBwcm9wcyA9IHRoaXMucHJvcHM7XG4gICAgaWYgKHRoaXMucHJvcHMucmVuZGVyT25seSAmJiB0aGlzLnByb3BzLnJlbmRlck9ubHkgPT09IHRydWUpIHtcbiAgICAgIHRoaXMucmVuZGVyZWRFbGVtZW50ID0gRWxlbS5yZW5kZXIoZWxlbSwgdGhpcy5fbm9kZSk7IFxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlbmRlcmVkRWxlbWVudCA9IEVsZW0uY29tcG9uZW50KHtcbiAgICAgICAgY29udGFpbmVyOiB0aGlzLl9ub2RlLFxuICAgICAgICBpbml0OiBlbGVtLmluaXQsXG4gICAgICAgIHJlbmRlcjogZWxlbS5yZW5kZXIsXG4gICAgICAgIHByb3BzOiBwcm9wcyxcbiAgICAgICAgc3RhdGU6IGVsZW0uc3RhdGVcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICByZWdpc3RyYXRpb25GdW5jdGlvbih0YWcsIHtcbiAgICBwcm90b3R5cGU6IEVsZW1lbnRQcm90b1xuICB9KTtcbn1cblxuaWYgKHJlZ2lzdHJhdGlvbkZ1bmN0aW9uKSB7XG4gIGV4cG9ydHMucmVnaXN0ZXJXZWJDb21wb25lbnQgPSByZWdpc3RlcldlYkNvbXBvbmVudDtcbn0gZWxzZSB7XG4gIGV4cG9ydHMucmVnaXN0ZXJXZWJDb21wb25lbnQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAod2luZG93LmNvbnNvbGUpIGNvbnNvbGUuZXJyb3IoJ1dlYkNvbXBvbmVudCBub3QgYXZhaWxhYmxlIGhlcmUgOignKTtcbiAgfTtcbn1cbiJdfQ==
