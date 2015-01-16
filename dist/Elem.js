!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.Elem=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({"/Users/mathieuancelin/Dropbox/current-projects/elem/src/common.js":[function(require,module,exports){
exports.debug = false;
exports.perfs = false;
exports.voidElements = ["AREA","BASE","BR","COL","COMMAND","EMBED","HR","IMG","INPUT","KEYGEN","LINK","META","PARAM","SOURCE","TRACK","WBR"];
exports.events = ['wheel','scroll','touchcancel','touchend','touchmove','touchstart','click','doubleclick','drag','dragend','dragenter','dragexit','dragleave','dragover','dragstart','drop','change','input','submit','focus','blur','keydown','keypress','keyup','copy','cut','paste','mousedown','mouseenter','mouseleave','mousemove','mouseout','mouseover','mouseup'];
    
// redraw with requestAnimationFrame (https://developer.mozilla.org/fr/docs/Web/API/window.requestAnimationFrame)
// perfs measures (http://www.html5rocks.com/en/tutorials/webperformance/usertiming/)
window.performance = window.performance || {
  mark: function() {},
  measure: function() {},
  getEntriesByName: function() { return []; },
  getEntriesByType: function() { return []; },
  clearMarks: function() {},
  clearMeasures: function() {}
};

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
      window.performance.mark(name + '_start');
    } else {
      window.performance.mark(ElemMeasureStart);
    }
  }
};

exports.markStop = function(name) {
  if (exports.perfs) {
    if (name) {
      window.performance.mark(name + '_stop');
      window.performance.measure(name, name + '_start', name + '_stop');
      if (!_.contains(names, name)) names.push(name);
    } else {
      window.performance.mark(ElemMeasureStop);
      window.performance.measure(ElemMeasure, ElemMeasureStart, ElemMeasureStop);
    }
  }
};

exports.collectMeasures = function() {
  if (!exports.perfs) return [];
  var results = [];
  _.each(names, function(name) {
    results = results.concat(window.performance.getEntriesByName(name));
  });
  window.performance.clearMarks();
  window.performance.clearMeasures();
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
        if (actual && actual !== null) actual.addEventListener(type, callback, false); // does not work in ff 3.5 without false
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Rvb2xzL2hvbWVicmV3L2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNyYy9jb21tb24uanMiLCJzcmMvY29tcG9uZW50LmpzIiwic3JjL2VsZW0uanMiLCJzcmMvZXZlbnRzLmpzIiwic3JjL3N0YXRlLmpzIiwic3JjL3N0cmluZ2lmeS5qcyIsInNyYy91dGlscy5qcyIsInNyYy93ZWJjb21wb25lbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDaEdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJleHBvcnRzLmRlYnVnID0gZmFsc2U7XG5leHBvcnRzLnBlcmZzID0gZmFsc2U7XG5leHBvcnRzLnZvaWRFbGVtZW50cyA9IFtcIkFSRUFcIixcIkJBU0VcIixcIkJSXCIsXCJDT0xcIixcIkNPTU1BTkRcIixcIkVNQkVEXCIsXCJIUlwiLFwiSU1HXCIsXCJJTlBVVFwiLFwiS0VZR0VOXCIsXCJMSU5LXCIsXCJNRVRBXCIsXCJQQVJBTVwiLFwiU09VUkNFXCIsXCJUUkFDS1wiLFwiV0JSXCJdO1xuZXhwb3J0cy5ldmVudHMgPSBbJ3doZWVsJywnc2Nyb2xsJywndG91Y2hjYW5jZWwnLCd0b3VjaGVuZCcsJ3RvdWNobW92ZScsJ3RvdWNoc3RhcnQnLCdjbGljaycsJ2RvdWJsZWNsaWNrJywnZHJhZycsJ2RyYWdlbmQnLCdkcmFnZW50ZXInLCdkcmFnZXhpdCcsJ2RyYWdsZWF2ZScsJ2RyYWdvdmVyJywnZHJhZ3N0YXJ0JywnZHJvcCcsJ2NoYW5nZScsJ2lucHV0Jywnc3VibWl0JywnZm9jdXMnLCdibHVyJywna2V5ZG93bicsJ2tleXByZXNzJywna2V5dXAnLCdjb3B5JywnY3V0JywncGFzdGUnLCdtb3VzZWRvd24nLCdtb3VzZWVudGVyJywnbW91c2VsZWF2ZScsJ21vdXNlbW92ZScsJ21vdXNlb3V0JywnbW91c2VvdmVyJywnbW91c2V1cCddO1xuICAgIFxuLy8gcmVkcmF3IHdpdGggcmVxdWVzdEFuaW1hdGlvbkZyYW1lIChodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9mci9kb2NzL1dlYi9BUEkvd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSlcbi8vIHBlcmZzIG1lYXN1cmVzIChodHRwOi8vd3d3Lmh0bWw1cm9ja3MuY29tL2VuL3R1dG9yaWFscy93ZWJwZXJmb3JtYW5jZS91c2VydGltaW5nLylcbndpbmRvdy5wZXJmb3JtYW5jZSA9IHdpbmRvdy5wZXJmb3JtYW5jZSB8fCB7XG4gIG1hcms6IGZ1bmN0aW9uKCkge30sXG4gIG1lYXN1cmU6IGZ1bmN0aW9uKCkge30sXG4gIGdldEVudHJpZXNCeU5hbWU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gW107IH0sXG4gIGdldEVudHJpZXNCeVR5cGU6IGZ1bmN0aW9uKCkgeyByZXR1cm4gW107IH0sXG4gIGNsZWFyTWFya3M6IGZ1bmN0aW9uKCkge30sXG4gIGNsZWFyTWVhc3VyZXM6IGZ1bmN0aW9uKCkge31cbn07XG5cbndpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUgPSBcbiAgICB3aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IFxuICAgIHdpbmRvdy5tb3pSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHxcbiAgICB3aW5kb3cud2Via2l0UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8IFxuICAgIHdpbmRvdy5tc1JlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBcbiAgICAoZnVuY3Rpb24oKSB7XG4gICAgICAgIGlmICh3aW5kb3cuY29uc29sZSkgY29uc29sZS5lcnJvcignTm8gcmVxdWVzdEFuaW1hdGlvbkZyYW1lLCB1c2luZyBsYW1lIHBvbHlmaWxsIC4uLicpO1xuICAgICAgICByZXR1cm4gZnVuY3Rpb24oY2FsbGJhY2ssIGVsZW1lbnQpe1xuICAgICAgICAgICAgd2luZG93LnNldFRpbWVvdXQoY2FsbGJhY2ssIDEwMDAgLyA2MCk7XG4gICAgICAgIH0gICAgXG4gICAgfSkoKTtcblxudmFyIEVsZW1NZWFzdXJlU3RhcnQgPSAnRWxlbU1lYXN1cmVTdGFydCc7XG52YXIgRWxlbU1lYXN1cmVTdG9wID0gJ0VsZW1NZWFzdXJlU3RvcCc7XG52YXIgRWxlbU1lYXN1cmUgPSAnRWxlbUNvbXBvbmVudFJlbmRlcmluZ01lYXN1cmUnO1xudmFyIG5hbWVzID0gW0VsZW1NZWFzdXJlXTtcblxuZXhwb3J0cy5tYXJrU3RhcnQgPSBmdW5jdGlvbihuYW1lKSB7XG4gIGlmIChleHBvcnRzLnBlcmZzKSB7XG4gICAgaWYgKG5hbWUpIHtcbiAgICAgIHdpbmRvdy5wZXJmb3JtYW5jZS5tYXJrKG5hbWUgKyAnX3N0YXJ0Jyk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpbmRvdy5wZXJmb3JtYW5jZS5tYXJrKEVsZW1NZWFzdXJlU3RhcnQpO1xuICAgIH1cbiAgfVxufTtcblxuZXhwb3J0cy5tYXJrU3RvcCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgaWYgKGV4cG9ydHMucGVyZnMpIHtcbiAgICBpZiAobmFtZSkge1xuICAgICAgd2luZG93LnBlcmZvcm1hbmNlLm1hcmsobmFtZSArICdfc3RvcCcpO1xuICAgICAgd2luZG93LnBlcmZvcm1hbmNlLm1lYXN1cmUobmFtZSwgbmFtZSArICdfc3RhcnQnLCBuYW1lICsgJ19zdG9wJyk7XG4gICAgICBpZiAoIV8uY29udGFpbnMobmFtZXMsIG5hbWUpKSBuYW1lcy5wdXNoKG5hbWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICB3aW5kb3cucGVyZm9ybWFuY2UubWFyayhFbGVtTWVhc3VyZVN0b3ApO1xuICAgICAgd2luZG93LnBlcmZvcm1hbmNlLm1lYXN1cmUoRWxlbU1lYXN1cmUsIEVsZW1NZWFzdXJlU3RhcnQsIEVsZW1NZWFzdXJlU3RvcCk7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnRzLmNvbGxlY3RNZWFzdXJlcyA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIWV4cG9ydHMucGVyZnMpIHJldHVybiBbXTtcbiAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgXy5lYWNoKG5hbWVzLCBmdW5jdGlvbihuYW1lKSB7XG4gICAgcmVzdWx0cyA9IHJlc3VsdHMuY29uY2F0KHdpbmRvdy5wZXJmb3JtYW5jZS5nZXRFbnRyaWVzQnlOYW1lKG5hbWUpKTtcbiAgfSk7XG4gIHdpbmRvdy5wZXJmb3JtYW5jZS5jbGVhck1hcmtzKCk7XG4gIHdpbmRvdy5wZXJmb3JtYW5jZS5jbGVhck1lYXN1cmVzKCk7XG4gIG5hbWVzID0gW0VsZW1NZWFzdXJlXTtcbiAgcmV0dXJuIHJlc3VsdHM7XG59O1xuXG5leHBvcnRzLnByaW50TWVhc3VyZXMgPSBmdW5jdGlvbigpIHtcbiAgaWYgKCFleHBvcnRzLnBlcmZzKSByZXR1cm47XG4gIGlmICh3aW5kb3cuY29uc29sZSkgY29uc29sZS50YWJsZShleHBvcnRzLmNvbGxlY3RNZWFzdXJlcygpKTtcbn07XG5cbmV4cG9ydHMuZGVmZXIgPSBmdW5jdGlvbihjYikge1xuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUuY2FsbCh3aW5kb3csIGNiKTtcbn07XG5cbmV4cG9ydHMuZGVmZXJlZCA9IGZ1bmN0aW9uKGNiKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBleHBvcnRzLmRlZmVyKGNiKTtcbiAgICB9O1xufTsiLCJ2YXIgQ29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKTtcbnZhciBfID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5mdW5jdGlvbiBoYXNEYXRhKG5vZGUsIG5hbWUpIHtcbiAgcmV0dXJuIG5vZGUuYXR0cmlidXRlcyAmJiBub2RlLmF0dHJpYnV0ZXNbJ2RhdGEtJyArIG5hbWVdO1xufVxuXG5mdW5jdGlvbiBkYXRhKG5vZGUsIG5hbWUpIHtcbiAgaWYgKG5vZGUuZGF0YXNldCkgcmV0dXJuIG5vZGUuZGF0YXNldFtuYW1lXTtcbiAgcmV0dXJuIG5vZGUuYXR0cmlidXRlc1snZGF0YS0nICsgbmFtZV07XG59XG5cbmZ1bmN0aW9uIG1vdW50Q29tcG9uZW50KGVsLCBvcHRzKSB7XG4gIHZhciBuYW1lID0gb3B0cy5uYW1lIHx8ICdDb21wb25lbnQnO1xuICB2YXIgc3RhdGUgPSBvcHRzLnN0YXRlIHx8IEVsZW0uc3RhdGUoKTtcbiAgdmFyIHByb3BzID0gb3B0cy5wcm9wcyB8fCB7fTtcbiAgdmFyIHJlbmRlciA9IG9wdHMucmVuZGVyO1xuICB2YXIgZXZlbnRDYWxsYmFja3MgPSB7fTtcbiAgdmFyIG9sZEhhbmRsZXJzID0gW107XG4gIHZhciBhZnRlclJlbmRlciA9IG9wdHMuYWZ0ZXJSZW5kZXIgfHwgZnVuY3Rpb24oKSB7fTtcbiAgdmFyIGdldERPTU5vZGUgPSBmdW5jdGlvbigpIHsgcmV0dXJuIF8uZmluZE5vZGUoZWwpOyB9O1xuICBpZiAob3B0cy5pbml0KSB7IG9wdHMuaW5pdChzdGF0ZSwgXy5jbG9uZShwcm9wcykpOyB9XG4gIF8ub24oZWwsIENvbW1vbi5ldmVudHMsIGZ1bmN0aW9uKGUpIHsgLy8gYnViYmxlcyBsaXN0ZW5lciwgVE9ETyA6IGhhbmRsZSBtb3VzZSBldmVudCBpbiBhIGNsZXZlciB3YXlcbiAgICAgIHZhciBub2RlID0gZS50YXJnZXQ7XG4gICAgICB2YXIgbmFtZSA9IGRhdGEobm9kZSwgJ25vZGVpZCcpICsgJ18nICsgZS50eXBlOyAvL25vZGUuZGF0YXNldC5ub2RlaWQgKyBcIl9cIiArIGUudHlwZTtcbiAgICAgIGlmIChldmVudENhbGxiYWNrc1tuYW1lXSkge1xuICAgICAgICAgIGV2ZW50Q2FsbGJhY2tzW25hbWVdKGUpOyAgICBcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgd2hpbGUoIWV2ZW50Q2FsbGJhY2tzW25hbWVdICYmIG5vZGUgJiYgbm9kZSAhPT0gbnVsbCAmJiBoYXNEYXRhKG5vZGUsICdub2RlaWQnKSkgey8vbm9kZS5kYXRhc2V0ICYmIG5vZGUuZGF0YXNldC5ub2RlaWQpIHtcbiAgICAgICAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50RWxlbWVudDtcbiAgICAgICAgICAgICAgaWYgKG5vZGUgJiYgbm9kZSAhPT0gbnVsbCAmJiBoYXNEYXRhKG5vZGUsICdub2RlaWQnKSkgeyAvL25vZGUuZGF0YXNldCAmJiBub2RlLmRhdGFzZXQubm9kZWlkKSB7XG4gICAgICAgICAgICAgICAgbmFtZSA9IGRhdGEobm9kZSwgJ25vZGVpZCcpICsgJ18nICsgZS50eXBlOyAvL25vZGUuZGF0YXNldC5ub2RlaWQgKyBcIl9cIiArIGUudHlwZTtcbiAgICAgICAgICAgICAgfVxuICAgICAgICAgIH1cbiAgICAgICAgICBpZiAoZXZlbnRDYWxsYmFja3NbbmFtZV0pIHtcbiAgICAgICAgICAgICAgZXZlbnRDYWxsYmFja3NbbmFtZV0oZSk7ICAgIFxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgfSk7XG4gIGZ1bmN0aW9uIHJlcmVuZGVyKCkge1xuICAgICAgQ29tbW9uLm1hcmtTdGFydChuYW1lICsgJy5nbG9iYWxSZW5kZXJpbmcnKTtcbiAgICAgIF8uZWFjaChvbGRIYW5kbGVycywgZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgICAgIGRlbGV0ZSBldmVudENhbGxiYWNrc1toYW5kbGVyXTtcbiAgICAgIH0pO1xuICAgICAgb2xkSGFuZGxlcnMgPSBbXTtcbiAgICAgIHZhciBmb2N1cyA9IGRvY3VtZW50LmFjdGl2ZUVsZW1lbnQgfHwge307IC8vIFRPRE8gOiBjaGVjayBpZiBpbnB1dC9zZWxlY3QvdGV4dGFyZWEsIHJlbWVtYmVyIGN1cnNvciBwb3NpdGlvbiBoZXJlXG4gICAgICB2YXIga2V5ID0gZm9jdXMuZGF0YXNldCA/IGZvY3VzLmRhdGFzZXQua2V5IDogKGZvY3VzLmF0dHJpYnV0ZXMgfHwgW10pWydrZXknXTsgLy8gVE9ETyA6IG1heWJlIGEgYnVnIGhlcmVcbiAgICAgIHZhciB3YWl0aW5nSGFuZGxlcnMgPSBbXTtcbiAgICAgIHZhciByZWZzID0ge307XG4gICAgICBDb21tb24ubWFya1N0YXJ0KG5hbWUgKyAnLnJlbmRlcicpO1xuICAgICAgdmFyIGVsZW1Ub1JlbmRlciA9IHJlbmRlcihzdGF0ZSwgXy5jbG9uZShwcm9wcyksIHsgcmVmczogcmVmcywgZ2V0RE9NTm9kZTogZ2V0RE9NTm9kZSB9KTtcbiAgICAgIENvbW1vbi5tYXJrU3RvcChuYW1lICsgJy5yZW5kZXInKTtcbiAgICAgIEVsZW0ucmVuZGVyKGVsZW1Ub1JlbmRlciwgZWwsIHsgd2FpdGluZ0hhbmRsZXJzOiB3YWl0aW5nSGFuZGxlcnMsIF9fcm9vdExpc3RlbmVyOiB0cnVlLCByZWZzOiByZWZzIH0pO1xuICAgICAgYWZ0ZXJSZW5kZXIoc3RhdGUsIF8uY2xvbmUocHJvcHMpLCB7IHJlZnM6IHJlZnMsIGdldERPTU5vZGU6IGdldERPTU5vZGUgfSk7XG4gICAgICBpZiAoa2V5KSB7XG4gICAgICAgICAgdmFyIGZvY3VzTm9kZSA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJ1tkYXRhLWtleT1cIicgKyBrZXkgKyAnXCJdJyk7Ly8kKCdbZGF0YS1rZXk9XCInICsga2V5ICsgJ1wiXScpO1xuICAgICAgICAgIF8uZm9jdXMoZm9jdXNOb2RlKTsgLy8gZm9jdXNOb2RlLmZvY3VzKCk7ICAvLyBUT0RPIDogbWF5YmUgYSBidWcgaGVyZVxuICAgICAgICAgIGlmIChmb2N1c05vZGUudmFsdWUpIHsgLy9mb2N1c05vZGUudmFsKCkpIHtcbiAgICAgICAgICAgICAgdmFyIHN0ckxlbmd0aCA9IGZvY3VzTm9kZS52YWx1ZS5sZW5ndGggKiAyOyAvLyBmb2N1c05vZGUudmFsKCkubGVuZ3RoICogMjtcbiAgICAgICAgICAgICAgZm9jdXNOb2RlLnNldFNlbGVjdGlvblJhbmdlKHN0ckxlbmd0aCwgc3RyTGVuZ3RoKTsgLy9mb2N1c05vZGVbMF0uc2V0U2VsZWN0aW9uUmFuZ2Uoc3RyTGVuZ3RoLCBzdHJMZW5ndGgpOyAgLy8gVE9ETyA6IGhhbmRsZSBvdGhlciBraW5kIG9mIGlucHV0IC4uLiBsaWtlIHNlbGVjdCwgZXRjIC4uLiAgIFxuICAgICAgICAgIH1cbiAgICAgIH1cbiAgICAgIF8uZWFjaCh3YWl0aW5nSGFuZGxlcnMsIGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgICBvbGRIYW5kbGVycy5wdXNoKGhhbmRsZXIuaWQgKyAnXycgKyBoYW5kbGVyLmV2ZW50LnJlcGxhY2UoJ29uJywgJycpKTtcbiAgICAgICAgICBldmVudENhbGxiYWNrc1toYW5kbGVyLmlkICsgJ18nICsgaGFuZGxlci5ldmVudC5yZXBsYWNlKCdvbicsICcnKV0gPSBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgaGFuZGxlci5jYWxsYmFjay5hcHBseSh7IHJlbmRlcjogcmVuZGVyIH0sIGFyZ3VtZW50cyk7ICAgICAgICAgICAgICAgICAgICAgICAgXG4gICAgICAgICAgfVxuICAgICAgfSk7XG4gICAgICBDb21tb24ubWFya1N0b3AobmFtZSArICcuZ2xvYmFsUmVuZGVyaW5nJyk7XG4gIH1cbiAgcmVyZW5kZXIoKTtcbiAgc3RhdGUub25DaGFuZ2UocmVyZW5kZXIpOy8vQ29tbW9uLmRlZmVyZWQocmVyZW5kZXIpKTtcbiAgcmV0dXJuIHN0YXRlO1xufVxuXG5mdW5jdGlvbiBmYWN0b3J5KG9wdHMpIHtcbiAgcmV0dXJuIGZ1bmN0aW9uKHByb3BzLCB0bykge1xuICAgIHZhciBhcGkgPSB7XG4gICAgICBfX2NvbXBvbmVudEZhY3Rvcnk6IHRydWUsXG4gICAgICByZW5kZXJUbzogZnVuY3Rpb24oZWwpIHtcbiAgICAgICAgdmFyIG9wdCA9IF8uY2xvbmUob3B0cyk7XG4gICAgICAgIG9wdC5wcm9wcyA9IF8uZXh0ZW5kKF8uY2xvbmUob3B0cy5wcm9wcyB8fCB7fSksIHByb3BzIHx8IHt9KTtcbiAgICAgICAgQ29tbW9uLmRlZmVyKGZ1bmN0aW9uKCkge1xuICAgICAgICAgIG1vdW50Q29tcG9uZW50KGVsLCBvcHQpO1xuICAgICAgICB9KTtcbiAgICAgIH1cbiAgICB9O1xuICAgIGlmICh0bykgcmV0dXJuIGFwaS5yZW5kZXJUbyh0byk7XG4gICAgcmV0dXJuIGFwaTsgIFxuICB9ICBcbn1cblxuZXhwb3J0cy5jb21wb25lbnQgPSBmdW5jdGlvbihvcHRzKSB7XG4gIGlmICghb3B0cy5jb250YWluZXIpIHJldHVybiBmYWN0b3J5KG9wdHMpO1xuICB2YXIgZWwgPSBvcHRzLmNvbnRhaW5lcjtcbiAgbW91bnRDb21wb25lbnQoZWwsIG9wdHMpO1xufTsiLCJ2YXIgQ29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKTtcbnZhciBfID0gcmVxdWlyZSgnLi91dGlscycpO1xudmFyIENvbXBvbmVudHMgPSByZXF1aXJlKCcuL2NvbXBvbmVudCcpO1xudmFyIHN0YXRlID0gcmVxdWlyZSgnLi9zdGF0ZScpO1xudmFyIHJlZ2lzdGVyV2ViQ29tcG9uZW50ID0gcmVxdWlyZSgnLi93ZWJjb21wb25lbnQnKS5yZWdpc3RlcldlYkNvbXBvbmVudDtcbnZhciBTdHJpbmdpZmllciA9IHJlcXVpcmUoJy4vc3RyaW5naWZ5Jyk7XG52YXIgRGlzcGF0Y2hlciA9IHJlcXVpcmUoJy4vZXZlbnRzJyk7XG5cbmZ1bmN0aW9uIHN0eWxlVG9TdHJpbmcoYXR0cnMpIHtcbiAgICBpZiAoXy5pc1VuZGVmaW5lZChhdHRycykpIHJldHVybiAnJztcbiAgICB2YXIgYXR0cnNBcnJheSA9IF8ubWFwKF8ua2V5cyhhdHRycyksIGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIga2V5TmFtZSA9IF8uZGFzaGVyaXplKGtleSk7XG4gICAgICAgIGlmIChrZXkgPT09ICdjbGFzc05hbWUnKSB7XG4gICAgICAgICAgICBrZXlOYW1lID0gJ2NsYXNzJztcbiAgICAgICAgfVxuICAgICAgICB2YXIgdmFsdWUgPSBhdHRyc1trZXldO1xuICAgICAgICBpZiAoIV8uaXNVbmRlZmluZWQodmFsdWUpICYmIF8uaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUoKTtcbiAgICAgICAgfVxuICAgICAgICBpZiAoIV8uaXNVbmRlZmluZWQodmFsdWUpKSB7XG4gICAgICAgICAgICByZXR1cm4ga2V5TmFtZSArICc6ICcgKyB2YWx1ZSArICc7JztcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiB1bmRlZmluZWQ7XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICBhdHRyc0FycmF5ID0gXy5maWx0ZXIoYXR0cnNBcnJheSwgZnVuY3Rpb24oaXRlbSkgeyByZXR1cm4gIV8uaXNVbmRlZmluZWQoaXRlbSk7IH0pO1xuICAgIHJldHVybiBhdHRyc0FycmF5LmpvaW4oJyAnKTtcbn1cblxuZnVuY3Rpb24gY2xhc3NUb0FycmF5KGF0dHJzKSB7IC8qIEhhbmRsZSBjbGFzcyBhcyBvYmplY3Qgd2l0aCBib29sZWFuIHZhbHVlcyAqL1xuICAgIGlmIChfLmlzVW5kZWZpbmVkKGF0dHJzKSkgcmV0dXJuIFtdO1xuICAgIHZhciBhdHRyc0FycmF5ID0gXy5tYXAoXy5rZXlzKGF0dHJzKSwgZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciB2YWx1ZSA9IGF0dHJzW2tleV07XG4gICAgICAgIGlmICghXy5pc1VuZGVmaW5lZCh2YWx1ZSkgJiYgdmFsdWUgPT09IHRydWUpIHtcbiAgICAgICAgICAgIHJldHVybiBfLmRhc2hlcml6ZShrZXkpO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGF0dHJzQXJyYXkgPSBfLmZpbHRlcihhdHRyc0FycmF5LCBmdW5jdGlvbihpdGVtKSB7IHJldHVybiAhXy5pc1VuZGVmaW5lZChpdGVtKTsgfSk7XG4gICAgcmV0dXJuIGF0dHJzQXJyYXk7XG59XG5cbmZ1bmN0aW9uIHdyYXBDaGlsZHJlbihjaGlsZHJlbikge1xuICAgIGlmIChjaGlsZHJlbiA9PT0gMCkge1xuICAgICAgICByZXR1cm4gY2hpbGRyZW47XG4gICAgfSBlbHNlIGlmIChjaGlsZHJlbiA9PT0gJycpIHtcbiAgICAgICAgcmV0dXJuIFtdO1xuICAgIH1cbiAgICByZXR1cm4gY2hpbGRyZW4gfHwgW107XG59XG5cbmZ1bmN0aW9uIGJ1aWxkUmVmKGlkKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgZ2V0RE9NTm9kZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICByZXR1cm4gXy5maW5kTm9kZSgnW2RhdGEtbm9kZWlkPVwiJyArIGlkICsgJ1wiXScpO1xuICAgICAgICB9XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gZXh0cmFjdEV2ZW50SGFuZGxlcnMoYXR0cnMsIG5vZGVJZCwgY29udGV4dCkge1xuICAgIF8uZWFjaChfLmtleXMoYXR0cnMpLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGtleU5hbWUgPSBfLmRhc2hlcml6ZShrZXkpOyAgXG4gICAgICAgIGlmIChfLnN0YXJ0c1dpdGgoa2V5TmFtZSwgJ29uJykpIHtcbiAgICAgICAgICAgIGlmIChjb250ZXh0ICYmIGNvbnRleHQud2FpdGluZ0hhbmRsZXJzKSB7XG4gICAgICAgICAgICAgICAgY29udGV4dC53YWl0aW5nSGFuZGxlcnMucHVzaCh7XG4gICAgICAgICAgICAgICAgICAgIHJvb3Q6IGNvbnRleHQucm9vdCxcbiAgICAgICAgICAgICAgICAgICAgaWQ6IG5vZGVJZCwgXG4gICAgICAgICAgICAgICAgICAgIGV2ZW50OiBrZXlOYW1lLFxuICAgICAgICAgICAgICAgICAgICBjYWxsYmFjazogYXR0cnNba2V5XVxuICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgfVxuICAgICAgICB9IFxuICAgICAgICBpZiAoa2V5TmFtZSA9PT0gJ3JlZicgJiYgY29udGV4dCAmJiBjb250ZXh0LnJlZnMpIGNvbnRleHQucmVmc1thdHRyc1trZXldXSA9IGJ1aWxkUmVmKG5vZGVJZCk7XG4gICAgfSk7ICAgXG59XG5cbmZ1bmN0aW9uIGFzQXR0cmlidXRlKGtleSwgdmFsdWUpIHsgcmV0dXJuIHsga2V5OiBrZXksIHZhbHVlOiB2YWx1ZSB9OyB9XG5cbmZ1bmN0aW9uIGF0dHJpYnV0ZXNUb0FycmF5KGF0dHJzKSB7XG4gICAgaWYgKF8uaXNVbmRlZmluZWQoYXR0cnMpKSByZXR1cm4gW107XG4gICAgdmFyIGF0dHJzQXJyYXkgPSBbXTtcbiAgICBfLmVhY2goXy5rZXlzKGF0dHJzKSwgZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBrZXlOYW1lID0gXy5kYXNoZXJpemUoa2V5KTtcbiAgICAgICAgaWYgKGtleSA9PT0gJ2NsYXNzTmFtZScpIHtcbiAgICAgICAgICAgIGtleU5hbWUgPSAnY2xhc3MnO1xuICAgICAgICB9XG4gICAgICAgIGlmICghXy5zdGFydHNXaXRoKGtleU5hbWUsICdvbicpICYmIGtleU5hbWUgIT09ICdyZWYnKSB7XG4gICAgICAgICAgICB2YXIgdmFsdWUgPSBhdHRyc1trZXldO1xuICAgICAgICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKHZhbHVlKSAmJiBfLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSgpO1xuICAgICAgICAgICAgfVxuICAgICAgICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKHZhbHVlKSkge1xuICAgICAgICAgICAgICAgIGlmIChfLmlzT2JqZWN0KHZhbHVlKSAmJiBrZXlOYW1lID09PSAnc3R5bGUnKSB7XG4gICAgICAgICAgICAgICAgICAgIGF0dHJzQXJyYXkucHVzaChhc0F0dHJpYnV0ZSgnc3R5bGUnLCBzdHlsZVRvU3RyaW5nKHZhbHVlKSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc0FycmF5KHZhbHVlKSAmJiBrZXlOYW1lID09PSAnY2xhc3MnKSB7XG4gICAgICAgICAgICAgICAgICAgIGF0dHJzQXJyYXkucHVzaChhc0F0dHJpYnV0ZShrZXlOYW1lLCB2YWx1ZS5qb2luKCcgJykpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNPYmplY3QodmFsdWUpICYmIGtleU5hbWUgPT09ICdjbGFzcycpIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0cnNBcnJheS5wdXNoKGFzQXR0cmlidXRlKGtleU5hbWUsIGNsYXNzVG9BcnJheSh2YWx1ZSkuam9pbignICcpKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0cnNBcnJheS5wdXNoKGFzQXR0cmlidXRlKGtleU5hbWUsIHZhbHVlKSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfSk7XG4gICAgcmV0dXJuIGF0dHJzQXJyYXk7XG59XG5cbmZ1bmN0aW9uIGVsKG5hbWUsIGF0dHJzLCBjaGlsZHJlbikge1xuICAgIHZhciBub2RlSWQgPSBfLnVuaXF1ZUlkKCdub2RlXycpO1xuICAgIGlmIChfLmlzVW5kZWZpbmVkKGNoaWxkcmVuKSAmJiAhXy5pc1VuZGVmaW5lZChhdHRycykgJiYgIWF0dHJzLl9faXNBdHRycykge1xuICAgICAgICBjaGlsZHJlbiA9IGF0dHJzO1xuICAgICAgICBhdHRycyA9IHt9O1xuICAgIH1cbiAgICBuYW1lID0gXy5lc2NhcGUobmFtZSkgfHwgJ3Vua25vd24nO1xuICAgIGF0dHJzID0gYXR0cnMgfHwge307XG4gICAgY2hpbGRyZW4gPSB3cmFwQ2hpbGRyZW4oY2hpbGRyZW4pO1xuICAgIGlmIChfLmlzUmVnRXhwKGNoaWxkcmVuKSB8fCBfLmlzVW5kZWZpbmVkKGNoaWxkcmVuKSB8fCBfLmlzTnVsbChjaGlsZHJlbikpIGNoaWxkcmVuID0gW107IFxuICAgIGlmIChfLmlzQXJyYXkoY2hpbGRyZW4pKSB7XG4gICAgICAgIGNoaWxkcmVuID0gXy5jaGFpbihjaGlsZHJlbikubWFwKGZ1bmN0aW9uKGNoaWxkKSB7XG4gICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGNoaWxkKSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZCgpO1xuICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGQ7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbihpdGVtKSB7IFxuICAgICAgICAgICAgcmV0dXJuICFfLmlzVW5kZWZpbmVkKGl0ZW0pOyBcbiAgICAgICAgfSkudmFsdWUoKTtcbiAgICB9IFxuICAgIHZhciBzZWxmQ2xvc2VUYWcgPSBfLmNvbnRhaW5zKENvbW1vbi52b2lkRWxlbWVudHMsIG5hbWUudG9VcHBlckNhc2UoKSkgXG4gICAgICAgICYmIChfLmlzTnVsbChjaGlsZHJlbikgfHwgXy5pc1VuZGVmaW5lZChjaGlsZHJlbikgfHwgKF8uaXNBcnJheShjaGlsZHJlbikgJiYgY2hpbGRyZW4ubGVuZ3RoID09PSAwKSk7XG4gICAgdmFyIGF0dHJzQXJyYXkgPSBhdHRyaWJ1dGVzVG9BcnJheShhdHRycyk7XG4gICAgYXR0cnNBcnJheS5wdXNoKGFzQXR0cmlidXRlKCdkYXRhLW5vZGVpZCcsIF8uZXNjYXBlKG5vZGVJZCkpKTtcbiAgICBpZiAoQ29tbW9uLmRlYnVnKSBhdHRyc0FycmF5LnB1c2goYXNBdHRyaWJ1dGUoJ3RpdGxlJywgXy5lc2NhcGUobm9kZUlkKSkpO1xuICAgIHJldHVybiB7XG4gICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgIGF0dHJzOiBhdHRycyxcbiAgICAgICAgY2hpbGRyZW46IGNoaWxkcmVuLFxuICAgICAgICBpc0VsZW1lbnQ6IHRydWUsXG4gICAgICAgIG5vZGVJZDogbm9kZUlkLFxuICAgICAgICB0b0pzb25TdHJpbmc6IGZ1bmN0aW9uKHByZXR0eSkge1xuICAgICAgICAgICAgaWYgKHByZXR0eSkgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRoaXMsIG51bGwsIDIpO1xuICAgICAgICAgICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KHRoaXMpO1xuICAgICAgICB9LFxuICAgICAgICB0b0h0bWxOb2RlOiBmdW5jdGlvbihkb2MsIGNvbnRleHQpIHtcbiAgICAgICAgICAgIGV4dHJhY3RFdmVudEhhbmRsZXJzKGF0dHJzLCBub2RlSWQsIGNvbnRleHQpO1xuICAgICAgICAgICAgdmFyIGVsZW1lbnQgPSBkb2MuY3JlYXRlRWxlbWVudChfLmVzY2FwZShuYW1lKSk7XG4gICAgICAgICAgICBfLmVhY2goYXR0cnNBcnJheSwgZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgICAgICAgIGVsZW1lbnQuc2V0QXR0cmlidXRlKGl0ZW0ua2V5LCBpdGVtLnZhbHVlKTtcbiAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgZnVuY3Rpb24gYXBwZW5kU2luZ2xlTm9kZShfX2NoaWxkcmVuLCBfX2VsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc051bWJlcihfX2NoaWxkcmVuKSkge1xuICAgICAgICAgICAgICAgICAgICBfX2VsZW1lbnQuYXBwZW5kQ2hpbGQoZG9jLmNyZWF0ZVRleHROb2RlKF9fY2hpbGRyZW4gKyAnJykpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc1N0cmluZyhfX2NoaWxkcmVuKSkge1xuICAgICAgICAgICAgICAgICAgICBfX2VsZW1lbnQuYXBwZW5kQ2hpbGQoZG9jLmNyZWF0ZVRleHROb2RlKF9fY2hpbGRyZW4pKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNCb29sZWFuKF9fY2hpbGRyZW4pKSB7XG4gICAgICAgICAgICAgICAgICAgIF9fZWxlbWVudC5hcHBlbmRDaGlsZChkb2MuY3JlYXRlVGV4dE5vZGUoX19jaGlsZHJlbiArICcnKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzT2JqZWN0KF9fY2hpbGRyZW4pICYmIF9fY2hpbGRyZW4uaXNFbGVtZW50KSB7XG4gICAgICAgICAgICAgICAgICAgIF9fZWxlbWVudC5hcHBlbmRDaGlsZChfX2NoaWxkcmVuLnRvSHRtbE5vZGUoZG9jLCBjb250ZXh0KSk7IFxuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc09iamVjdChfX2NoaWxkcmVuKSAmJiBfX2NoaWxkcmVuLl9fYXNIdG1sKSB7XG4gICAgICAgICAgICAgICAgICAgIF9fZWxlbWVudC5pbm5lckhUTUwgPSBfX2NoaWxkcmVuLl9fYXNIdG1sO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoX19jaGlsZHJlbi5fX2NvbXBvbmVudEZhY3RvcnkpIHtcbiAgICAgICAgICAgICAgICAgICAgdmFyIGNvbXBJZCA9IF8uZXNjYXBlKF8udW5pcXVlSWQoJ2NvbXBvbmVudF8nKSk7XG4gICAgICAgICAgICAgICAgICAgIHZhciBzcGFuID0gZG9jLmNyZWF0ZUVsZW1lbnQoJ3NwYW4nKTtcbiAgICAgICAgICAgICAgICAgICAgc3Bhbi5zZXRBdHRyaWJ1dGUoJ2RhdGEtY29tcG9uZW50aWQnLCBjb21wSWQpO1xuICAgICAgICAgICAgICAgICAgICBfX2VsZW1lbnQuYXBwZW5kQ2hpbGQoc3Bhbik7XG4gICAgICAgICAgICAgICAgICAgIF9fY2hpbGRyZW4ucmVuZGVyVG8oJ1tkYXRhLWNvbXBvbmVudGlkPVwiJyArIGNvbXBJZCArICdcIl0nKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBfX2VsZW1lbnQuYXBwZW5kQ2hpbGQoZG9jLmNyZWF0ZVRleHROb2RlKF9fY2hpbGRyZW4udG9TdHJpbmcoKSkpO1xuICAgICAgICAgICAgICAgIH0gICAgXG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIXNlbGZDbG9zZVRhZykge1xuICAgICAgICAgICAgICAgIGlmIChfLmlzQXJyYXkoY2hpbGRyZW4pKSB7XG4gICAgICAgICAgICAgICAgICAgIF8uZWFjaChjaGlsZHJlbiwgZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgICAgIGFwcGVuZFNpbmdsZU5vZGUoY2hpbGQsIGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgICAgICB9KTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhcHBlbmRTaW5nbGVOb2RlKGNoaWxkcmVuLCBlbGVtZW50KTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICByZXR1cm4gZWxlbWVudDtcbiAgICAgICAgfVxuICAgIH07XG59IFxuXG5mdW5jdGlvbiByZW5kZXJUb05vZGUoZWwsIGRvYywgY29udGV4dCkge1xuICAgIGlmIChfLmlzRnVuY3Rpb24oZWwpKSBlbCA9IGVsKChjb250ZXh0IHx8IHsgcHJvcHM6IHt9fSkucHJvcHMpXG4gICAgaWYgKCFfLmlzVW5kZWZpbmVkKGVsKSkge1xuICAgICAgICBpZiAoXy5pc0FycmF5KGVsKSkge1xuICAgICAgICAgICAgcmV0dXJuIF8uY2hhaW4oZWwpLm1hcChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNGdW5jdGlvbihpdGVtKSkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gaXRlbSgpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH0pLmZpbHRlcihmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgIHJldHVybiAhXy5pc1VuZGVmaW5lZChpdGVtKTtcbiAgICAgICAgICAgIH0pLm1hcChmdW5jdGlvbiAoaXRlbSkge1xuICAgICAgICAgICAgICAgIHJldHVybiBpdGVtLnRvSHRtbE5vZGUoZG9jLCBjb250ZXh0KTtcbiAgICAgICAgICAgIH0pLnZhbHVlKCk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gW2VsLnRvSHRtbE5vZGUoZG9jLCBjb250ZXh0KV07XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxufSAgIFxuXG5leHBvcnRzLnJlbmRlclRvU3RyaW5nID0gZnVuY3Rpb24oZWwsIGNvbnRleHQpIHtcbiAgICBDb21tb24ubWFya1N0YXJ0KCdFbGVtLnJlbmRlclRvU3RyaW5nJyk7XG4gICAgdmFyIHN0ciA9IF8ubWFwKHJlbmRlclRvTm9kZShlbCwgU3RyaW5naWZpZXIoKSksIGZ1bmN0aW9uKG4pIHsgcmV0dXJuIG4udG9IdG1sU3RyaW5nKCk7IH0pLmpvaW4oJycpO1xuICAgIENvbW1vbi5tYXJrU3RvcCgnRWxlbS5yZW5kZXJUb1N0cmluZycpO1xuICAgIHJldHVybiBzdHI7XG59O1xuXG5leHBvcnRzLmVsID0gZWw7XG5cbmV4cG9ydHMuc2VsID0gZnVuY3Rpb24obmFtZSwgY2hpbGRyZW4pIHsgcmV0dXJuIGVsKG5hbWUsIHt9LCBjaGlsZHJlbik7IH07IC8vIHNpbXBsZSBub2RlIHNlbChuYW1lLCBjaGlsZHJlbilcblxuZXhwb3J0cy52ZWwgPSBmdW5jdGlvbihuYW1lLCBhdHRycykgeyByZXR1cm4gZWwobmFtZSwgYXR0cnMsIFtdKTsgfTsgLy8gdm9pZCBub2RlLCBjZWwobmFtZSwgYXR0cnMpXG5cbmV4cG9ydHMubmJzcCA9IGZ1bmN0aW9uKHRpbWVzKSB7IHJldHVybiBlbCgnc3BhbicsIHsgX19hc0h0bWw6IF8udGltZXModGltZXMgfHwgMSwgZnVuY3Rpb24oKSB7IHJldHVybiAnJm5ic3A7JzsgfSkgfSk7IH07XG5cbmV4cG9ydHMudGV4dCA9IGZ1bmN0aW9uKHRleHQpIHsgcmV0dXJuIGVsKCdzcGFuJywge30sIHRleHQpOyB9O1xuXG5leHBvcnRzLmVsZW1lbnRzID0gZnVuY3Rpb24oKSB7IHJldHVybiBfLm1hcChhcmd1bWVudHMsIGZ1bmN0aW9uKGl0ZW0pIHsgcmV0dXJuIGl0ZW07IH0pOyB9O1xuXG5leHBvcnRzLnJlbmRlciA9IGZ1bmN0aW9uKGVsLCBub2RlLCBjb250ZXh0KSB7XG4gICAgQ29tbW9uLm1hcmtTdGFydCgnRWxlbS5yZW5kZXInKTtcbiAgICB2YXIgd2FpdGluZ0hhbmRsZXJzID0gKGNvbnRleHQgfHwge30pLndhaXRpbmdIYW5kbGVycyB8fCBbXTtcbiAgICB2YXIgcmVmcyA9IChjb250ZXh0IHx8IHt9KS5yZWZzIHx8IHt9O1xuICAgIHZhciBwcm9wcyA9IChjb250ZXh0IHx8IHt9KS5wcm9wcyB8fCB7fTtcbiAgICB2YXIgZG9jID0gZG9jdW1lbnQ7XG4gICAgaWYgKG5vZGUub3duZXJEb2N1bWVudCkge1xuICAgICAgICBkb2MgPSBub2RlLm93bmVyRG9jdW1lbnQ7XG4gICAgfVxuICAgIHZhciBodG1sTm9kZSA9IHJlbmRlclRvTm9kZShlbCwgZG9jLCB7IHJvb3Q6IG5vZGUsIHdhaXRpbmdIYW5kbGVyczogd2FpdGluZ0hhbmRsZXJzLCByZWZzOiByZWZzLCBwcm9wczogcHJvcHMgfSk7XG4gICAgaWYgKF8uaXNTdHJpbmcobm9kZSkpIHtcbiAgICAgICAgbm9kZSA9IGRvYy5xdWVyeVNlbGVjdG9yKG5vZGUpO1xuICAgIH1cbiAgICB3aGlsZSAobm9kZS5maXJzdENoaWxkKSB7IG5vZGUucmVtb3ZlQ2hpbGQobm9kZS5maXJzdENoaWxkKTsgfVxuICAgIF8uZWFjaChodG1sTm9kZSwgZnVuY3Rpb24obikge1xuICAgICAgICBub2RlLmFwcGVuZENoaWxkKG4pO1xuICAgIH0pO1xuICAgIGlmICghKGNvbnRleHQgJiYgY29udGV4dC5fX3Jvb3RMaXN0ZW5lcikpIHsgIC8vIGV4dGVybmFsIGxpc3RlbmVyIGhlcmVcbiAgICAgICAgXy5lYWNoKHdhaXRpbmdIYW5kbGVycywgZnVuY3Rpb24oaGFuZGxlcikgeyAvLyBoYW5kbGVyIG9uIGVhY2ggY29uY2VybmVkIG5vZGVcbiAgICAgICAgICAgIF8ub24oJ1tkYXRhLW5vZGVpZD1cIicgKyBoYW5kbGVyLmlkICsgJ1wiXScsIFtoYW5kbGVyLmV2ZW50LnJlcGxhY2UoJ29uJywgJycpXSwgZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgaGFuZGxlci5jYWxsYmFjay5hcHBseSh7fSwgYXJndW1lbnRzKTtcbiAgICAgICAgICAgIH0pOyAgIFxuICAgICAgICB9KTtcbiAgICB9XG4gICAgQ29tbW9uLm1hcmtTdG9wKCdFbGVtLnJlbmRlcicpO1xufTtcbmV4cG9ydHMuY29tcG9uZW50ID0gQ29tcG9uZW50cy5jb21wb25lbnQ7XG5leHBvcnRzLmNvbXBvbmVudEZhY3RvcnkgPSBDb21wb25lbnRzLmNvbXBvbmVudEZhY3Rvcnk7XG5leHBvcnRzLnN0YXRlID0gc3RhdGU7XG5leHBvcnRzLlV0aWxzID0gXztcbmV4cG9ydHMucmVnaXN0ZXJXZWJDb21wb25lbnQgPSByZWdpc3RlcldlYkNvbXBvbmVudDtcbmV4cG9ydHMuZGlzcGF0Y2hlciA9IERpc3BhdGNoZXI7XG5leHBvcnRzLlBlcmYgPSB7XG4gICAgc3RhcnQ6IGZ1bmN0aW9uKCkgeyBDb21tb24ucGVyZnMgPSB0cnVlOyB9LFxuICAgIHN0b3A6IGZ1bmN0aW9uKCkgeyBDb21tb24uc3RvcCA9IGZhbHNlOyB9LFxuICAgIG1hcmtTdGFydDogQ29tbW9uLm1hcmtTdGFydCxcbiAgICBtYXJrU3RvcDogQ29tbW9uLm1hcmtTdG9wLFxuICAgIGNvbGxlY3RNZWFzdXJlczogQ29tbW9uLmNvbGxlY3RNZWFzdXJlcyxcbiAgICBwcmludE1lYXN1cmVzOiBDb21tb24ucHJpbnRNZWFzdXJlc1xufTtcblxuaWYgKHR5cGVvZiBkZWZpbmUgPT09ICdmdW5jdGlvbicgJiYgZGVmaW5lLmFtZCkge1xuICAgIGRlZmluZSgnZWxlbScsIFtdLCBmdW5jdGlvbigpIHtcbiAgICAgICAgcmV0dXJuIG1vZHVsZS5leHBvcnRzO1xuICAgIH0pO1xufSIsInZhciBfID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG52YXIgZXZlbnRTcGxpdHRlciA9IC9cXHMrLztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbigpIHtcblxuICB2YXIgY2FsbGJhY2tzID0gW107XG5cbiAgZnVuY3Rpb24gZmlyZUNhbGxiYWNrcyhuYW1lcywgZXZlbnQpIHtcbiAgICB2YXIgZXZlbnROYW1lcyA9IFtuYW1lc107XG4gICAgaWYgKGV2ZW50U3BsaXR0ZXIudGVzdChuYW1lcykpIHtcbiAgICAgIGV2ZW50TmFtZXMgPSBuYW1lcy5zcGxpdChldmVudFNwbGl0dGVyKTtcbiAgICB9XG4gICAgXy5lYWNoKGV2ZW50TmFtZXMsIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICAgIF8uZWFjaChjYWxsYmFja3MsIGZ1bmN0aW9uKGNhbGxiYWNrSGFzaCkge1xuICAgICAgICBpZiAoY2FsbGJhY2tIYXNoLm5hbWUgPT09ICdhbGwnKSB7XG4gICAgICAgICAgY2FsbGJhY2tIYXNoLmNhbGxiYWNrKG5hbWUsIGV2ZW50KTtcbiAgICAgICAgfSBlbHNlIGlmIChjYWxsYmFja0hhc2gubmFtZSA9PT0gbmFtZSkge1xuICAgICAgICAgIGNhbGxiYWNrSGFzaC5jYWxsYmFjayhldmVudCk7XG4gICAgICAgIH1cbiAgICAgIH0pOyAgXG4gICAgfSk7ICAgIFxuICB9XG5cbiAgcmV0dXJuIHtcbiAgICB0cmlnZ2VyOiBmaXJlQ2FsbGJhY2tzLFxuICAgIGRpc3BhdGNoOiBmaXJlQ2FsbGJhY2tzLFxuICAgIG9uOiBmdW5jdGlvbihuYW1lLCBjYWxsYmFjaykge1xuICAgICAgdGhpcy5vZmYobmFtZSwgY2FsbGJhY2spO1xuICAgICAgY2FsbGJhY2tzLnB1c2goeyBuYW1lOiBuYW1lLCBjYWxsYmFjazogY2FsbGJhY2sgfSk7XG4gICAgfSxcbiAgICBvZmY6IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFja3MgPSBfLmZpbHRlcihjYWxsYmFja3MsIGZ1bmN0aW9uKG9iaikge1xuICAgICAgICBpZiAob2JqLm5hbWUgPT09IG5hbWUgJiYgb2JqLmNhbGxiYWNrID09PSBjYWxsYmFjaykge1xuICAgICAgICAgIHJldHVybiBmYWxzZTtcbiAgICAgICAgfVxuICAgICAgICByZXR1cm4gdHJ1ZTtcbiAgICAgIH0pO1xuICAgIH0sXG4gIH07XG59OyIsInZhciBfID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKG1vZCkge1xuXG4gIHZhciB0aGVNb2RlbCA9IF8uZXh0ZW5kKHt9LCBtb2QgfHwge30pO1xuXG4gIHZhciBjYWxsYmFja3MgPSBbXTtcblxuICBmdW5jdGlvbiBmaXJlQ2FsbGJhY2tzKCkge1xuICAgIF8uZWFjaChjYWxsYmFja3MsIGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFjaygpO1xuICAgIH0pO1xuICB9XG5cbiAgdmFyIGFwaSA9IGZ1bmN0aW9uKCkge1xuICAgIHJldHVybiBfLmNsb25lKHRoZU1vZGVsKTtcbiAgfTtcblxuICByZXR1cm4gXy5leHRlbmQoYXBpLCB7XG4gICAgb25DaGFuZ2U6IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XG4gICAgICBjYWxsYmFja3MucHVzaChjYWxsYmFjayk7XG4gICAgfSxcbiAgICBnZXQ6IGZ1bmN0aW9uKGtleSkge1xuICAgICAgcmV0dXJuIHRoZU1vZGVsW2tleV07XG4gICAgfSxcbiAgICBhbGw6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIF8uY2xvbmUodGhlTW9kZWwpO1xuICAgIH0sXG4gICAgZm9yY2VVcGRhdGU6IGZ1bmN0aW9uKCkge1xuICAgICAgZmlyZUNhbGxiYWNrcygpO1xuICAgIH0sXG4gICAgc2V0OiBmdW5jdGlvbihvYmosIHNpbGVudE9yQ2FsbGJhY2spIHtcbiAgICAgIHZhciBzaWxlbnQgPSBfLmlzQm9vbGVhbihzaWxlbnRPckNhbGxiYWNrKSAmJiBzaWxlbnRPckNhbGxiYWNrID09PSB0cnVlO1xuICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKG9iaikgJiYgXy5pc09iamVjdChvYmopKSB7XG4gICAgICAgIF8ubWFwKF8ua2V5cyhvYmopLCBmdW5jdGlvbihrKSB7XG4gICAgICAgICAgdGhlTW9kZWxba10gPSBvYmpba107XG4gICAgICAgIH0pO1xuICAgICAgICBpZiAoIXNpbGVudCkgZmlyZUNhbGxiYWNrcygpO1xuICAgICAgICBpZiAoIXNpbGVudCkoc2lsZW50T3JDYWxsYmFjayB8fCBmdW5jdGlvbigpIHt9KSgpO1xuICAgICAgfVxuICAgIH0sXG4gICAgcmVwbGFjZTogZnVuY3Rpb24ob2JqLCBzaWxlbnRPckNhbGxiYWNrKSB7XG4gICAgICB0aGVNb2RlbCA9IHt9O1xuICAgICAgdGhpcy5zZXQob2JqLCBzaWxlbnRPckNhbGxiYWNrKTtcbiAgICB9LFxuICAgIHJlbW92ZTogZnVuY3Rpb24oa2V5KSB7XG4gICAgICBkZWxldGUgdGhlTW9kZWxba2V5XTtcbiAgICAgIGZpcmVDYWxsYmFja3MoKTtcbiAgICB9XG4gIH0pO1xufTsiLCJ2YXIgQ29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKTtcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBzdHJpbmdpZnlEb2MoKSB7XG4gICAgZnVuY3Rpb24gbm9kZShuYW1lKSB7IFxuICAgICAgICB2YXIgYXR0cnMgPSBbXTtcbiAgICAgICAgdmFyIGNoaWxkcmVuID0gW107XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICBzZXRBdHRyaWJ1dGU6IGZ1bmN0aW9uKGtleSwgdmFsdWUpIHsgYXR0cnMucHVzaChrZXkgKyAnPVwiJyArIHZhbHVlICsgJ1wiJyk7IH0sXG4gICAgICAgICAgICBhcHBlbmRDaGlsZDogZnVuY3Rpb24oY2hpbGQpIHsgY2hpbGRyZW4ucHVzaChjaGlsZCk7IH0sXG4gICAgICAgICAgICB0b0h0bWxTdHJpbmc6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHZhciBzZWxmQ2xvc2VUYWcgPSBfLmNvbnRhaW5zKENvbW1vbi52b2lkRWxlbWVudHMsIG5hbWUudG9VcHBlckNhc2UoKSkgJiYgY2hpbGRyZW4ubGVuZ3RoID09PSAwO1xuICAgICAgICAgICAgICAgIGlmIChzZWxmQ2xvc2VUYWcpIHJldHVybiAnPCcgKyBuYW1lICsgJyAnICsgYXR0cnMuam9pbignICcpICsgJyAvPic7XG4gICAgICAgICAgICAgICAgcmV0dXJuICc8JyArIG5hbWUgKyAnICcgKyBhdHRycy5qb2luKCcgJykgKyAnPicgKyBfLm1hcChjaGlsZHJlbiwgZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkLnRvSHRtbFN0cmluZygpO1xuICAgICAgICAgICAgICAgIH0pLmpvaW4oJycpICsgJzwvJyArIG5hbWUgKyAnPic7XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHtcbiAgICAgICAgY3JlYXRlRWxlbWVudDogbm9kZSxcbiAgICAgICAgY3JlYXRlVGV4dE5vZGU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgICAgICByZXR1cm4ge1xuICAgICAgICAgICAgICAgIHRvSHRtbFN0cmluZzogZnVuY3Rpb24oKSB7IHJldHVybiB2YWx1ZTsgfVxuICAgICAgICAgICAgfTtcbiAgICAgICAgfSAgIFxuICAgIH07XG59XG4iLCJ2YXIgX19pZENvdW50ZXIgPSAwO1xuXG52YXIgZXNjYXBlTWFwID0ge1xuICAgICcmJzogJyZhbXA7JyxcbiAgICAnPCc6ICcmbHQ7JyxcbiAgICAnPic6ICcmZ3Q7JyxcbiAgICAnXCInOiAnJnF1b3Q7JyxcbiAgICBcIidcIjogJyYjeDI3OycsXG4gICAgJ2AnOiAnJiN4NjA7J1xufTtcblxudmFyIGNyZWF0ZUVzY2FwZXIgPSBmdW5jdGlvbihtYXAsIGtleXMpIHtcbiAgICB2YXIgZXNjYXBlciA9IGZ1bmN0aW9uKG1hdGNoKSB7XG4gICAgICAgIHJldHVybiBtYXBbbWF0Y2hdO1xuICAgIH07XG4gICAgdmFyIHNvdXJjZSA9ICcoPzonICsga2V5cyhtYXApLmpvaW4oJ3wnKSArICcpJztcbiAgICB2YXIgdGVzdFJlZ2V4cCA9IFJlZ0V4cChzb3VyY2UpO1xuICAgIHZhciByZXBsYWNlUmVnZXhwID0gUmVnRXhwKHNvdXJjZSwgJ2cnKTtcbiAgICByZXR1cm4gZnVuY3Rpb24oc3RyaW5nKSB7XG4gICAgICAgIHN0cmluZyA9IHN0cmluZyA9PSBudWxsID8gJycgOiAnJyArIHN0cmluZztcbiAgICAgICAgcmV0dXJuIHRlc3RSZWdleHAudGVzdChzdHJpbmcpID8gc3RyaW5nLnJlcGxhY2UocmVwbGFjZVJlZ2V4cCwgZXNjYXBlcikgOiBzdHJpbmc7XG4gICAgfTtcbn07XG5cbmZ1bmN0aW9uIGtleXMob2JqKSB7XG4gICAgaWYgKCFpc09iamVjdChvYmopKSByZXR1cm4gW107XG4gICAgaWYgKE9iamVjdC5rZXlzKSByZXR1cm4gT2JqZWN0LmtleXMob2JqKTtcbiAgICB2YXIga2V5cyA9IFtdO1xuICAgIGZvciAodmFyIGtleSBpbiBvYmopIGlmIChoYXMob2JqLCBrZXkpKSBrZXlzLnB1c2goa2V5KTtcbiAgICByZXR1cm4ga2V5cztcbn1cblxuZnVuY3Rpb24gdmFsdWVzKG9iaikge1xuICAgIHZhciBrZXlzID0ga2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgdmFsdWVzID0gQXJyYXkobGVuZ3RoKTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHZhbHVlc1tpXSA9IG9ialtrZXlzW2ldXTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlcztcbn1cblxuZnVuY3Rpb24gaW5kZXhPZihhcnJheSwgaXRlbSwgaXNTb3J0ZWQpIHtcbiAgICBpZiAoYXJyYXkgPT0gbnVsbCkgcmV0dXJuIC0xO1xuICAgIHZhciBpID0gMCwgbGVuZ3RoID0gYXJyYXkubGVuZ3RoO1xuICAgIGlmIChpc1NvcnRlZCkge1xuICAgICAgICBpZiAodHlwZW9mIGlzU29ydGVkID09ICdudW1iZXInKSB7XG4gICAgICAgICAgICBpID0gaXNTb3J0ZWQgPCAwID8gTWF0aC5tYXgoMCwgbGVuZ3RoICsgaXNTb3J0ZWQpIDogaXNTb3J0ZWQ7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICBpID0gc29ydGVkSW5kZXgoYXJyYXksIGl0ZW0pO1xuICAgICAgICAgICAgcmV0dXJuIGFycmF5W2ldID09PSBpdGVtID8gaSA6IC0xO1xuICAgICAgICB9XG4gICAgfVxuICAgIGZvciAoOyBpIDwgbGVuZ3RoOyBpKyspIGlmIChhcnJheVtpXSA9PT0gaXRlbSkgcmV0dXJuIGk7XG4gICAgcmV0dXJuIC0xO1xufVxuXG5mdW5jdGlvbiBlYWNoKG9iaiwgZnVuYykge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIG9iajtcbiAgICB2YXIgaSwgbGVuZ3RoID0gb2JqLmxlbmd0aDtcbiAgICBpZiAobGVuZ3RoID09PSArbGVuZ3RoKSB7XG4gICAgICAgIGZvciAoaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZnVuYyhvYmpbaV0sIGksIG9iaik7XG4gICAgICAgIH1cbiAgICB9IGVsc2Uge1xuICAgICAgICB2YXIga2V5cyA9IGtleXMob2JqKTtcbiAgICAgICAgZm9yIChpID0gMCwgbGVuZ3RoID0ga2V5cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICAgICAgZnVuYyhvYmpba2V5c1tpXV0sIGtleXNbaV0sIG9iaik7XG4gICAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIG9iajtcbn1cblxuZnVuY3Rpb24gbWFwKG9iaiwgZnVuYykge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIFtdO1xuICAgIHZhciBrZXlzID0gb2JqLmxlbmd0aCAhPT0gK29iai5sZW5ndGggJiYga2V5cyhvYmopLFxuICAgICAgICBsZW5ndGggPSAoa2V5cyB8fCBvYmopLmxlbmd0aCxcbiAgICAgICAgcmVzdWx0cyA9IEFycmF5KGxlbmd0aCksXG4gICAgICAgIGN1cnJlbnRLZXk7XG4gICAgZm9yICh2YXIgaW5kZXggPSAwOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICAgIHJlc3VsdHNbaW5kZXhdID0gZnVuYyhvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xufVxuXG5mdW5jdGlvbiBmaWx0ZXIob2JqLCBwcmVkaWNhdGUpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIHJlc3VsdHM7XG4gICAgZWFjaChvYmosIGZ1bmN0aW9uKHZhbHVlLCBpbmRleCwgbGlzdCkge1xuICAgICAgICBpZiAocHJlZGljYXRlKHZhbHVlLCBpbmRleCwgbGlzdCkpIHJlc3VsdHMucHVzaCh2YWx1ZSk7XG4gICAgfSk7XG4gICAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIHJlZHVjZShvYmosIGl0ZXJhdGVlLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSBvYmogPSBbXTtcbiAgICB2YXIga2V5cyA9IG9iai5sZW5ndGggIT09ICtvYmoubGVuZ3RoICYmIGtleXMob2JqKSxcbiAgICAgICAgbGVuZ3RoID0gKGtleXMgfHwgb2JqKS5sZW5ndGgsXG4gICAgICAgIGluZGV4ID0gMCxcbiAgICAgICAgY3VycmVudEtleTtcbiAgICBpZiAoYXJndW1lbnRzLmxlbmd0aCA8IDMpIHtcbiAgICAgICAgaWYgKCFsZW5ndGgpIHRocm93IG5ldyBUeXBlRXJyb3IocmVkdWNlRXJyb3IpO1xuICAgICAgICBtZW1vID0gb2JqW2tleXMgPyBrZXlzW2luZGV4KytdIDogaW5kZXgrK107XG4gICAgfVxuICAgIGZvciAoOyBpbmRleCA8IGxlbmd0aDsgaW5kZXgrKykge1xuICAgICAgICBjdXJyZW50S2V5ID0ga2V5cyA/IGtleXNbaW5kZXhdIDogaW5kZXg7XG4gICAgICAgIG1lbW8gPSBpdGVyYXRlZShtZW1vLCBvYmpbY3VycmVudEtleV0sIGN1cnJlbnRLZXksIG9iaik7XG4gICAgfVxuICAgIHJldHVybiBtZW1vO1xufVxuXG5mdW5jdGlvbiByZWplY3Qob2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpIHtcbiAgICByZXR1cm4gZmlsdGVyKG9iaiwgbmVnYXRlKHByZWRpY2F0ZSksIGNvbnRleHQpO1xufVxuXG5mdW5jdGlvbiB3aGVyZShvYmosIGF0dHJzKSB7XG4gICAgcmV0dXJuIGZpbHRlcihvYmosIG1hdGNoZXMoYXR0cnMpKTtcbn1cblxuZnVuY3Rpb24gbWF0Y2hlcyhhdHRycykge1xuICAgIHZhciBwYWlycyA9IHBhaXJzKGF0dHJzKSxcbiAgICAgICAgbGVuZ3RoID0gcGFpcnMubGVuZ3RoO1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gIWxlbmd0aDtcbiAgICAgICAgb2JqID0gbmV3IE9iamVjdChvYmopO1xuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICB2YXIgcGFpciA9IHBhaXJzW2ldLFxuICAgICAgICAgICAgICAgIGtleSA9IHBhaXJbMF07XG4gICAgICAgICAgICBpZiAocGFpclsxXSAhPT0gb2JqW2tleV0gfHwgIShrZXkgaW4gb2JqKSkgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIGlkZW50aXR5KHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlO1xufVxuXG5mdW5jdGlvbiBwcm9wZXJ0eShrZXkpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIHJldHVybiBvYmpba2V5XTtcbiAgICB9O1xufVxuXG5mdW5jdGlvbiBuZWdhdGUocHJlZGljYXRlKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gIXByZWRpY2F0ZS5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIHBhaXJzKG9iaikge1xuICAgIHZhciBrZXlzID0ga2V5cyhvYmopO1xuICAgIHZhciBsZW5ndGggPSBrZXlzLmxlbmd0aDtcbiAgICB2YXIgcGFpcnMgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGFpcnNbaV0gPSBba2V5c1tpXSwgb2JqW2tleXNbaV1dXTtcbiAgICB9XG4gICAgcmV0dXJuIHBhaXJzO1xufVxuXG5mdW5jdGlvbiBjaGFpbihvYmopIHtcbiAgICB2YXIgaW50ZXJuYWxPYmogPSBvYmo7XG4gICAgdmFyIHVuZGVyID0gdGhpcztcbiAgICBmdW5jdGlvbiBjaGFpbmFibGVBcGkoKSB7XG4gICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICB2YWx1ZTogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGludGVybmFsT2JqO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIG1hcDogZnVuY3Rpb24oZnVuYykge1xuICAgICAgICAgICAgICAgIGludGVybmFsT2JqID0gdW5kZXIubWFwKGludGVybmFsT2JqLCBmdW5jKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBmaWx0ZXI6IGZ1bmN0aW9uKGZ1bmMpIHtcbiAgICAgICAgICAgICAgICBpbnRlcm5hbE9iaiA9IHVuZGVyLmZpbHRlcihpbnRlcm5hbE9iaiwgZnVuYyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgZWFjaDogZnVuY3Rpb24oZnVuYykge1xuICAgICAgICAgICAgICAgIHVuZGVyLmVhY2goaW50ZXJuYWxPYmosIGZ1bmMpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHZhbHVlczogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVyLnZhbHVlcygpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGtleXM6IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlci5rZXlzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgcmVkdWNlOiBmdW5jdGlvbihpdGVyYXRlZSwgbWVtbywgY29udGV4dCkge1xuICAgICAgICAgICAgICAgIHJldHVybiB1bmRlci5yZWR1Y2UoaW50ZXJuYWxPYmosIGl0ZXJhdGVlLCBtZW1vLCBjb250ZXh0KTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZWplY3Q6IGZ1bmN0aW9uKHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgICAgICAgICAgICAgIGludGVybmFsT2JqID0gdW5kZXIucmVqZWN0KGludGVybmFsT2JqLCBwcmVkaWNhdGUsIGNvbnRleHQpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHdoZXJlOiBmdW5jdGlvbihhdHRycykge1xuICAgICAgICAgICAgICAgIGludGVybmFsT2JqID0gdW5kZXIud2hlcmUoaW50ZXJuYWxPYmosIGF0dHJzKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfTtcbiAgICB9XG4gICAgcmV0dXJuIGNoYWluYWJsZUFwaSgpO1xufVxuXG5mdW5jdGlvbiBjb250YWlucyhvYmosIHRhcmdldCkge1xuICAgIGlmIChvYmogPT0gbnVsbCkgcmV0dXJuIGZhbHNlO1xuICAgIGlmIChvYmoubGVuZ3RoICE9PSArb2JqLmxlbmd0aCkgb2JqID0gdmFsdWVzKG9iaik7XG4gICAgcmV0dXJuIGluZGV4T2Yob2JqLCB0YXJnZXQpID49IDA7XG59XG5cbmZ1bmN0aW9uIHVuaXF1ZUlkKHByZWZpeCkge1xuICAgIHZhciBpZCA9ICsrX19pZENvdW50ZXIgKyAnJztcbiAgICByZXR1cm4gcHJlZml4ID8gcHJlZml4ICsgaWQgOiBpZDtcbn0gIFxuXG5mdW5jdGlvbiB0aW1lcyhuLCBmdW5jKSB7XG4gICAgdmFyIHJlc3VsdHMgPSBbXTtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IG47IGkrKykge1xuICAgICAgICByZXN1bHRzLnB1c2goZnVuYyhuKSk7XG4gICAgfVxuICAgIHJldHVybiByZXN1bHRzO1xufVxuXG5mdW5jdGlvbiBjbG9uZShvYmopIHtcbiAgICBpZiAoIWlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gICAgcmV0dXJuIGlzQXJyYXkob2JqKSA/IG9iai5zbGljZSgpIDogZXh0ZW5kKHt9LCBvYmopO1xufVxuXG5mdW5jdGlvbiBleHRlbmQob2JqKSB7XG4gICAgaWYgKCFpc09iamVjdChvYmopKSByZXR1cm4gb2JqO1xuICAgIHZhciBzb3VyY2UsIHByb3A7XG4gICAgZm9yICh2YXIgaSA9IDEsIGxlbmd0aCA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBzb3VyY2UgPSBhcmd1bWVudHNbaV07XG4gICAgICAgIGZvciAocHJvcCBpbiBzb3VyY2UpIHtcbiAgICAgICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwoc291cmNlLCBwcm9wKSkge1xuICAgICAgICAgICAgICAgIG9ialtwcm9wXSA9IHNvdXJjZVtwcm9wXTtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG5mdW5jdGlvbiBpc1VuZGVmaW5lZChvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB2b2lkIDA7XG59XG5cbmZ1bmN0aW9uIGlzQXJyYXkob2JqKSB7XG4gICAgaWYgKEFycmF5LmlzQXJyYXkpIHJldHVybiBBcnJheS5pc0FycmF5KG9iaik7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBBcnJheV0nO1xufVxuXG5mdW5jdGlvbiBpc09iamVjdChvYmopIHtcbiAgICB2YXIgdHlwZSA9IHR5cGVvZiBvYmo7XG4gICAgcmV0dXJuIHR5cGUgPT09ICdmdW5jdGlvbicgfHwgdHlwZSA9PT0gJ29iamVjdCcgJiYgISFvYmo7XG59XG5cbmZ1bmN0aW9uIGlzTnVtYmVyKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgTnVtYmVyXSc7XG59XG5cbmZ1bmN0aW9uIGlzU3RyaW5nKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgU3RyaW5nXSc7XG59XG5cbmZ1bmN0aW9uIGlzQm9vbGVhbihvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSB0cnVlIHx8IG9iaiA9PT0gZmFsc2UgfHwgT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEJvb2xlYW5dJztcbn1cblxuZnVuY3Rpb24gaXNSZWdFeHAob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBSZWdFeHBdJztcbn1cblxuZnVuY3Rpb24gaXNGdW5jdGlvbihvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEZ1bmN0aW9uXSc7XG59XG5cbmZ1bmN0aW9uIGlzTnVsbChvYmopIHtcbiAgICByZXR1cm4gb2JqID09PSBudWxsO1xufVxuXG5mdW5jdGlvbiBpc05hTihvYmopIHtcbiAgICByZXR1cm4gaXNOdW1iZXIob2JqKSAmJiBvYmogIT09ICtvYmo7XG59XG5cbmZ1bmN0aW9uIGhhcyhvYmosIGtleSkge1xuICAgIHJldHVybiBvYmogIT0gbnVsbCAmJiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpO1xufVxuXG5mdW5jdGlvbiBkYXNoZXJpemUod2hhdCkge1xuICAgIHJldHVybiB3aGF0LnJlcGxhY2UoLyhbQS1aXFxkXSspKFtBLVpdW2Etel0pL2csJyQxXyQyJylcbiAgICAgICAgLnJlcGxhY2UoLyhbYS16XFxkXSkoW0EtWl0pL2csJyQxXyQyJylcbiAgICAgICAgLnRvTG93ZXJDYXNlKCkucmVwbGFjZSgvXy9nLCAnLScpO1xufVxuXG5mdW5jdGlvbiBzdGFydHNXaXRoKHNvdXJjZSwgc3RhcnQpIHsgXG4gICAgcmV0dXJuIHNvdXJjZS5pbmRleE9mKHN0YXJ0KSA9PT0gMDsgXG59XG5cbmZ1bmN0aW9uIGZvY3VzKGVsZW0pIHsgXG4gICAgaWYgKGVsZW0uZm9jdXMpIGVsZW0uZm9jdXMoKTtcbn1cblxuZnVuY3Rpb24gaGFzRm9jdXMoZWxlbSkgeyBcbiAgICByZXR1cm4gZWxlbSA9PT0gZG9jdW1lbnQuYWN0aXZlRWxlbWVudCAmJiAoIWRvY3VtZW50Lmhhc0ZvY3VzIHx8IGRvY3VtZW50Lmhhc0ZvY3VzKCkpICYmICEhKGVsZW0udHlwZSB8fCBlbGVtLmhyZWYgfHwgfmVsZW0udGFiSW5kZXgpOyBcbn1cblxuZnVuY3Rpb24gb24obm9kZSwgdHlwZXMsIGNhbGxiYWNrKSB7XG4gICAgdmFyIGFjdHVhbCA9IGlzU3RyaW5nKG5vZGUpID8gZG9jdW1lbnQucXVlcnlTZWxlY3Rvcihub2RlKSA6IG5vZGU7XG4gICAgZWFjaCh0eXBlcywgZnVuY3Rpb24odHlwZSkge1xuICAgICAgICBpZiAoYWN0dWFsICYmIGFjdHVhbCAhPT0gbnVsbCkgYWN0dWFsLmFkZEV2ZW50TGlzdGVuZXIodHlwZSwgY2FsbGJhY2ssIGZhbHNlKTsgLy8gZG9lcyBub3Qgd29yayBpbiBmZiAzLjUgd2l0aG91dCBmYWxzZVxuICAgIH0pO1xufVxuXG5mdW5jdGlvbiBmaW5kTm9kZShzZWxlY3Rvcikge1xuICAgIHJldHVybiBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKG5vZGUpO1xufVxuXG5leHBvcnRzLmVzY2FwZSA9IGNyZWF0ZUVzY2FwZXIoZXNjYXBlTWFwLCBrZXlzKTtcbmV4cG9ydHMua2V5cyA9IGtleXM7XG5leHBvcnRzLnZhbHVlcyA9IHZhbHVlcztcbmV4cG9ydHMuaW5kZXhPZiA9IGluZGV4T2Y7XG5leHBvcnRzLmVhY2ggPSBlYWNoO1xuZXhwb3J0cy5tYXAgPSBtYXA7XG5leHBvcnRzLmZpbHRlciA9IGZpbHRlcjtcbmV4cG9ydHMuY2hhaW4gPSBjaGFpbjtcbmV4cG9ydHMuY29udGFpbnMgPSBjb250YWlucztcbmV4cG9ydHMudW5pcXVlSWQgPSB1bmlxdWVJZDtcbmV4cG9ydHMudGltZXMgPSB0aW1lcztcbmV4cG9ydHMuY2xvbmUgPSBjbG9uZTtcbmV4cG9ydHMuZXh0ZW5kID0gZXh0ZW5kO1xuZXhwb3J0cy5pc1VuZGVmaW5lZCA9IGlzVW5kZWZpbmVkO1xuZXhwb3J0cy5pc0FycmF5ID0gaXNBcnJheTtcbmV4cG9ydHMuaXNPYmplY3QgPSBpc09iamVjdDtcbmV4cG9ydHMuaXNOdW1iZXIgPSBpc051bWJlcjtcbmV4cG9ydHMuaXNTdHJpbmcgPSBpc1N0cmluZztcbmV4cG9ydHMuaXNCb29sZWFuID0gaXNCb29sZWFuO1xuZXhwb3J0cy5pc1JlZ0V4cCA9IGlzUmVnRXhwO1xuZXhwb3J0cy5pc0Z1bmN0aW9uID0gaXNGdW5jdGlvbjtcbmV4cG9ydHMuaXNOdWxsID0gaXNOdWxsO1xuZXhwb3J0cy5pc05hTiA9IGlzTmFOO1xuZXhwb3J0cy5oYXMgPSBoYXM7XG5leHBvcnRzLmRhc2hlcml6ZSA9IGRhc2hlcml6ZTtcbmV4cG9ydHMuc3RhcnRzV2l0aCA9IHN0YXJ0c1dpdGg7XG5leHBvcnRzLmZvY3VzID0gZm9jdXM7XG5leHBvcnRzLmhhc0ZvY3VzID0gaGFzRm9jdXM7XG5leHBvcnRzLm9uID0gb247XG5leHBvcnRzLmZpbmROb2RlID0gZmluZE5vZGU7XG5leHBvcnRzLnJlZHVjZSA9IHJlZHVjZTtcbmV4cG9ydHMucmVqZWN0ID0gcmVqZWN0O1xuZXhwb3J0cy53aGVyZSA9IHdoZXJlO1xuZXhwb3J0cy5tYXRjaGVzID0gbWF0Y2hlcztcbmV4cG9ydHMubmVnYXRlID0gbmVnYXRlO1xuZXhwb3J0cy5wcm9wZXJ0eSA9IHByb3BlcnR5O1xuZXhwb3J0cy5pZGVudGl0eSA9IGlkZW50aXR5O1xuZXhwb3J0cy5wYWlycyA9IHBhaXJzOyIsIlxudmFyIHJlZ2lzdHJhdGlvbkZ1bmN0aW9uID0gdW5kZWZpbmVkXG5cbnRyeSB7XG4gIHJlZ2lzdHJhdGlvbkZ1bmN0aW9uID0gKGRvY3VtZW50LnJlZ2lzdGVyRWxlbWVudCB8fCBkb2N1bWVudC5yZWdpc3RlciB8fCBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh3aW5kb3cuY29uc29sZSkgY29uc29sZS5lcnJvcignTm8gcmVnaXN0ZXJFbGVtZW50IGZ1bmN0aW9uLCB3ZWJjb21wb25lbnRzIHdpbGwgbm90IHdvcmsgISEhJyk7XG4gIH0pLmJpbmQoZG9jdW1lbnQpO1xufSBjYXRjaChlKSB7fVxuXG5mdW5jdGlvbiByZWdpc3RlcldlYkNvbXBvbmVudCh0YWcsIGVsZW0pIHtcbiAgdmFyIHRoYXREb2MgPSBkb2N1bWVudDtcbiAgdmFyIEVsZW1lbnRQcm90byA9IE9iamVjdC5jcmVhdGUoSFRNTEVsZW1lbnQucHJvdG90eXBlKTtcbiAgXG4gIEVsZW1lbnRQcm90by5jcmVhdGVkQ2FsbGJhY2sgPSBmdW5jdGlvbigpIHtcbiAgICB2YXIgcHJvcHMgPSB7fTtcbiAgICBmb3IgKHZhciBpIGluIHRoaXMuYXR0cmlidXRlcykge1xuICAgICAgdmFyIGl0ZW0gPSB0aGlzLmF0dHJpYnV0ZXNbaV07XG4gICAgICBwcm9wc1tpdGVtLm5hbWVdID0gaXRlbS52YWx1ZTsgICAgXG4gICAgfVxuICAgIHRoaXMucHJvcHMgPSBwcm9wcztcbiAgICB2YXIgbm9kZSA9IHRoaXM7XG4gICAgaWYgKHByb3BzLm5vc2hhZG93ICE9PSAndHJ1ZScpIHtcbiAgICAgIHZhciBzaGFkb3dSb290ID0gdGhpcy5jcmVhdGVTaGFkb3dSb290KCk7XG4gICAgICBub2RlID0gdGhhdERvYy5jcmVhdGVFbGVtZW50KCdkaXYnKTtcbiAgICAgIG5vZGUuc2V0QXR0cmlidXRlKCdjbGFzcycsICdlbGVtY29tcG9uZW50Jyk7XG4gICAgICBzaGFkb3dSb290LmFwcGVuZENoaWxkKG5vZGUpO1xuICAgIH1cbiAgICB0aGlzLl9ub2RlID0gbm9kZTtcbiAgICBpZiAocHJvcHMucmVuZGVyT25seSAmJiBwcm9wcy5yZW5kZXJPbmx5ID09PSB0cnVlKSB7XG4gICAgICB0aGlzLnJlbmRlcmVkRWxlbWVudCA9IEVsZW0ucmVuZGVyKGVsZW0sIG5vZGUpOyBcbiAgICB9IGVsc2Uge1xuICAgICAgdGhpcy5yZW5kZXJlZEVsZW1lbnQgPSBFbGVtLmNvbXBvbmVudCh7XG4gICAgICAgIGNvbnRhaW5lcjogbm9kZSxcbiAgICAgICAgaW5pdDogZWxlbS5pbml0LFxuICAgICAgICByZW5kZXI6IGVsZW0ucmVuZGVyLFxuICAgICAgICBwcm9wczogcHJvcHMsXG4gICAgICAgIHN0YXRlOiBlbGVtLnN0YXRlXG4gICAgICB9KTsgXG4gICAgfVxuICB9O1xuXG4gIEVsZW1lbnRQcm90by5hdHRyaWJ1dGVDaGFuZ2VkQ2FsbGJhY2sgPSBmdW5jdGlvbiAoYXR0ciwgb2xkVmFsLCBuZXdWYWwpIHtcbiAgICB0aGlzLnByb3BzW2F0dHJdID0gbmV3VmFsO1xuICAgIHZhciBwcm9wcyA9IHRoaXMucHJvcHM7XG4gICAgaWYgKHRoaXMucHJvcHMucmVuZGVyT25seSAmJiB0aGlzLnByb3BzLnJlbmRlck9ubHkgPT09IHRydWUpIHtcbiAgICAgIHRoaXMucmVuZGVyZWRFbGVtZW50ID0gRWxlbS5yZW5kZXIoZWxlbSwgdGhpcy5fbm9kZSk7IFxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlbmRlcmVkRWxlbWVudCA9IEVsZW0uY29tcG9uZW50KHtcbiAgICAgICAgY29udGFpbmVyOiB0aGlzLl9ub2RlLFxuICAgICAgICBpbml0OiBlbGVtLmluaXQsXG4gICAgICAgIHJlbmRlcjogZWxlbS5yZW5kZXIsXG4gICAgICAgIHByb3BzOiBwcm9wcyxcbiAgICAgICAgc3RhdGU6IGVsZW0uc3RhdGVcbiAgICAgIH0pO1xuICAgIH1cbiAgfTtcblxuICByZWdpc3RyYXRpb25GdW5jdGlvbih0YWcsIHtcbiAgICBwcm90b3R5cGU6IEVsZW1lbnRQcm90b1xuICB9KTtcbn1cblxuaWYgKHJlZ2lzdHJhdGlvbkZ1bmN0aW9uKSB7XG4gIGV4cG9ydHMucmVnaXN0ZXJXZWJDb21wb25lbnQgPSByZWdpc3RlcldlYkNvbXBvbmVudDtcbn0gZWxzZSB7XG4gIGV4cG9ydHMucmVnaXN0ZXJXZWJDb21wb25lbnQgPSBmdW5jdGlvbigpIHtcbiAgICBpZiAod2luZG93LmNvbnNvbGUpIGNvbnNvbGUuZXJyb3IoJ1dlYkNvbXBvbmVudCBub3QgYXZhaWxhYmxlIGhlcmUgOignKTtcbiAgfTtcbn1cbiJdfQ==
