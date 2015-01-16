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
        console.error('No requestAnimationFrame, using lame polyfill ...');
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
  console.table(exports.collectMeasures());
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
      var name = node.dataset.nodeid + "_" + e.type;
      if (eventCallbacks[name]) {
          eventCallbacks[name](e);    
      } else {
          while(!eventCallbacks[name] && node && node !== null && node.dataset && node.dataset.nodeid) {
              node = node.parentElement;
              if (node && node !== null && node.dataset && node.dataset.nodeid) {
                name = node.dataset.nodeid + "_" + e.type;
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
      var focus = document.activeElement; // TODO : check if input/select/textarea, remember cursor position here
      var key = focus.dataset.key; //$(focus).data('key');
      var waitingHandlers = [];
      var refs = {};
      Common.markStart(name + '.render');
      var elemToRender = render(state, _.clone(props), { refs: refs, getDOMNode: getDOMNode });
      Common.markStop(name + '.render');
      Elem.render(elemToRender, el, { waitingHandlers: waitingHandlers, __rootListener: true, refs: refs });
      afterRender(state, _.clone(props), { refs: refs, getDOMNode: getDOMNode });
      if (key) {
          var focusNode = document.querySelector('[data-key="' + key + '"]');//$('[data-key="' + key + '"]');
          _.focus(focusNode); // focusNode.focus(); 
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
        if (actual && actual !== null) actual.addEventListener(type, callback);
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

var registrationFunction = (document.registerElement || document.register || function() {
    console.error('No registerElement function, webcomponents will not work !!!');
}).bind(document);

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

exports.registerWebComponent = registerWebComponent;

},{}]},{},["/Users/mathieuancelin/Dropbox/current-projects/elem/src/elem.js"])("/Users/mathieuancelin/Dropbox/current-projects/elem/src/elem.js")
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi4uLy4uLy4uL3Rvb2xzL2hvbWVicmV3L2xpYi9ub2RlX21vZHVsZXMvd2F0Y2hpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXJpZnkvbm9kZV9tb2R1bGVzL2Jyb3dzZXItcGFjay9fcHJlbHVkZS5qcyIsInNyYy9jb21tb24uanMiLCJzcmMvY29tcG9uZW50LmpzIiwic3JjL2VsZW0uanMiLCJzcmMvZXZlbnRzLmpzIiwic3JjL3N0YXRlLmpzIiwic3JjL3N0cmluZ2lmeS5qcyIsInNyYy91dGlscy5qcyIsInNyYy93ZWJjb21wb25lbnQuanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqRkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdkZBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNoUkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN4Q0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMzQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pXQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiZXhwb3J0cy5kZWJ1ZyA9IGZhbHNlO1xuZXhwb3J0cy5wZXJmcyA9IGZhbHNlO1xuZXhwb3J0cy52b2lkRWxlbWVudHMgPSBbXCJBUkVBXCIsXCJCQVNFXCIsXCJCUlwiLFwiQ09MXCIsXCJDT01NQU5EXCIsXCJFTUJFRFwiLFwiSFJcIixcIklNR1wiLFwiSU5QVVRcIixcIktFWUdFTlwiLFwiTElOS1wiLFwiTUVUQVwiLFwiUEFSQU1cIixcIlNPVVJDRVwiLFwiVFJBQ0tcIixcIldCUlwiXTtcbmV4cG9ydHMuZXZlbnRzID0gWyd3aGVlbCcsJ3Njcm9sbCcsJ3RvdWNoY2FuY2VsJywndG91Y2hlbmQnLCd0b3VjaG1vdmUnLCd0b3VjaHN0YXJ0JywnY2xpY2snLCdkb3VibGVjbGljaycsJ2RyYWcnLCdkcmFnZW5kJywnZHJhZ2VudGVyJywnZHJhZ2V4aXQnLCdkcmFnbGVhdmUnLCdkcmFnb3ZlcicsJ2RyYWdzdGFydCcsJ2Ryb3AnLCdjaGFuZ2UnLCdpbnB1dCcsJ3N1Ym1pdCcsJ2ZvY3VzJywnYmx1cicsJ2tleWRvd24nLCdrZXlwcmVzcycsJ2tleXVwJywnY29weScsJ2N1dCcsJ3Bhc3RlJywnbW91c2Vkb3duJywnbW91c2VlbnRlcicsJ21vdXNlbGVhdmUnLCdtb3VzZW1vdmUnLCdtb3VzZW91dCcsJ21vdXNlb3ZlcicsJ21vdXNldXAnXTtcbiAgICBcbi8vIHJlZHJhdyB3aXRoIHJlcXVlc3RBbmltYXRpb25GcmFtZSAoaHR0cHM6Ly9kZXZlbG9wZXIubW96aWxsYS5vcmcvZnIvZG9jcy9XZWIvQVBJL3dpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUpXG4vLyBwZXJmcyBtZWFzdXJlcyAoaHR0cDovL3d3dy5odG1sNXJvY2tzLmNvbS9lbi90dXRvcmlhbHMvd2VicGVyZm9ybWFuY2UvdXNlcnRpbWluZy8pXG53aW5kb3cucGVyZm9ybWFuY2UgPSB3aW5kb3cucGVyZm9ybWFuY2UgfHwge1xuICBtYXJrOiBmdW5jdGlvbigpIHt9LFxuICBtZWFzdXJlOiBmdW5jdGlvbigpIHt9LFxuICBnZXRFbnRyaWVzQnlOYW1lOiBmdW5jdGlvbigpIHsgcmV0dXJuIFtdOyB9LFxuICBnZXRFbnRyaWVzQnlUeXBlOiBmdW5jdGlvbigpIHsgcmV0dXJuIFtdOyB9LFxuICBjbGVhck1hcmtzOiBmdW5jdGlvbigpIHt9LFxuICBjbGVhck1lYXN1cmVzOiBmdW5jdGlvbigpIHt9XG59O1xuXG53aW5kb3cucmVxdWVzdEFuaW1hdGlvbkZyYW1lID0gXG4gICAgd2luZG93LnJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBcbiAgICB3aW5kb3cubW96UmVxdWVzdEFuaW1hdGlvbkZyYW1lIHx8XG4gICAgd2luZG93LndlYmtpdFJlcXVlc3RBbmltYXRpb25GcmFtZSB8fCBcbiAgICB3aW5kb3cubXNSZXF1ZXN0QW5pbWF0aW9uRnJhbWUgfHwgXG4gICAgKGZ1bmN0aW9uKCkge1xuICAgICAgICBjb25zb2xlLmVycm9yKCdObyByZXF1ZXN0QW5pbWF0aW9uRnJhbWUsIHVzaW5nIGxhbWUgcG9seWZpbGwgLi4uJyk7XG4gICAgICAgIHJldHVybiBmdW5jdGlvbihjYWxsYmFjaywgZWxlbWVudCl7XG4gICAgICAgICAgICB3aW5kb3cuc2V0VGltZW91dChjYWxsYmFjaywgMTAwMCAvIDYwKTtcbiAgICAgICAgfSAgICBcbiAgICB9KSgpO1xuXG52YXIgRWxlbU1lYXN1cmVTdGFydCA9ICdFbGVtTWVhc3VyZVN0YXJ0JztcbnZhciBFbGVtTWVhc3VyZVN0b3AgPSAnRWxlbU1lYXN1cmVTdG9wJztcbnZhciBFbGVtTWVhc3VyZSA9ICdFbGVtQ29tcG9uZW50UmVuZGVyaW5nTWVhc3VyZSc7XG52YXIgbmFtZXMgPSBbRWxlbU1lYXN1cmVdO1xuXG5leHBvcnRzLm1hcmtTdGFydCA9IGZ1bmN0aW9uKG5hbWUpIHtcbiAgaWYgKGV4cG9ydHMucGVyZnMpIHtcbiAgICBpZiAobmFtZSkge1xuICAgICAgd2luZG93LnBlcmZvcm1hbmNlLm1hcmsobmFtZSArICdfc3RhcnQnKTtcbiAgICB9IGVsc2Uge1xuICAgICAgd2luZG93LnBlcmZvcm1hbmNlLm1hcmsoRWxlbU1lYXN1cmVTdGFydCk7XG4gICAgfVxuICB9XG59O1xuXG5leHBvcnRzLm1hcmtTdG9wID0gZnVuY3Rpb24obmFtZSkge1xuICBpZiAoZXhwb3J0cy5wZXJmcykge1xuICAgIGlmIChuYW1lKSB7XG4gICAgICB3aW5kb3cucGVyZm9ybWFuY2UubWFyayhuYW1lICsgJ19zdG9wJyk7XG4gICAgICB3aW5kb3cucGVyZm9ybWFuY2UubWVhc3VyZShuYW1lLCBuYW1lICsgJ19zdGFydCcsIG5hbWUgKyAnX3N0b3AnKTtcbiAgICAgIGlmICghXy5jb250YWlucyhuYW1lcywgbmFtZSkpIG5hbWVzLnB1c2gobmFtZSk7XG4gICAgfSBlbHNlIHtcbiAgICAgIHdpbmRvdy5wZXJmb3JtYW5jZS5tYXJrKEVsZW1NZWFzdXJlU3RvcCk7XG4gICAgICB3aW5kb3cucGVyZm9ybWFuY2UubWVhc3VyZShFbGVtTWVhc3VyZSwgRWxlbU1lYXN1cmVTdGFydCwgRWxlbU1lYXN1cmVTdG9wKTtcbiAgICB9XG4gIH1cbn07XG5cbmV4cG9ydHMuY29sbGVjdE1lYXN1cmVzID0gZnVuY3Rpb24oKSB7XG4gIGlmICghZXhwb3J0cy5wZXJmcykgcmV0dXJuIFtdO1xuICB2YXIgcmVzdWx0cyA9IFtdO1xuICBfLmVhY2gobmFtZXMsIGZ1bmN0aW9uKG5hbWUpIHtcbiAgICByZXN1bHRzID0gcmVzdWx0cy5jb25jYXQod2luZG93LnBlcmZvcm1hbmNlLmdldEVudHJpZXNCeU5hbWUobmFtZSkpO1xuICB9KTtcbiAgd2luZG93LnBlcmZvcm1hbmNlLmNsZWFyTWFya3MoKTtcbiAgd2luZG93LnBlcmZvcm1hbmNlLmNsZWFyTWVhc3VyZXMoKTtcbiAgbmFtZXMgPSBbRWxlbU1lYXN1cmVdO1xuICByZXR1cm4gcmVzdWx0cztcbn07XG5cbmV4cG9ydHMucHJpbnRNZWFzdXJlcyA9IGZ1bmN0aW9uKCkge1xuICBpZiAoIWV4cG9ydHMucGVyZnMpIHJldHVybjtcbiAgY29uc29sZS50YWJsZShleHBvcnRzLmNvbGxlY3RNZWFzdXJlcygpKTtcbn07XG5cbmV4cG9ydHMuZGVmZXIgPSBmdW5jdGlvbihjYikge1xuICAgIHdpbmRvdy5yZXF1ZXN0QW5pbWF0aW9uRnJhbWUuY2FsbCh3aW5kb3csIGNiKTtcbn07XG5cbmV4cG9ydHMuZGVmZXJlZCA9IGZ1bmN0aW9uKGNiKSB7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKCkge1xuICAgICAgICBleHBvcnRzLmRlZmVyKGNiKTtcbiAgICB9O1xufTsiLCJ2YXIgQ29tbW9uID0gcmVxdWlyZSgnLi9jb21tb24nKTtcbnZhciBfID0gcmVxdWlyZSgnLi91dGlscycpO1xuXG5mdW5jdGlvbiBtb3VudENvbXBvbmVudChlbCwgb3B0cykge1xuICB2YXIgbmFtZSA9IG9wdHMubmFtZSB8fCAnQ29tcG9uZW50JztcbiAgdmFyIHN0YXRlID0gb3B0cy5zdGF0ZSB8fCBFbGVtLnN0YXRlKCk7XG4gIHZhciBwcm9wcyA9IG9wdHMucHJvcHMgfHwge307XG4gIHZhciByZW5kZXIgPSBvcHRzLnJlbmRlcjtcbiAgdmFyIGV2ZW50Q2FsbGJhY2tzID0ge307XG4gIHZhciBvbGRIYW5kbGVycyA9IFtdO1xuICB2YXIgYWZ0ZXJSZW5kZXIgPSBvcHRzLmFmdGVyUmVuZGVyIHx8IGZ1bmN0aW9uKCkge307XG4gIHZhciBnZXRET01Ob2RlID0gZnVuY3Rpb24oKSB7IHJldHVybiBfLmZpbmROb2RlKGVsKTsgfTtcbiAgaWYgKG9wdHMuaW5pdCkgeyBvcHRzLmluaXQoc3RhdGUsIF8uY2xvbmUocHJvcHMpKTsgfVxuICBfLm9uKGVsLCBDb21tb24uZXZlbnRzLCBmdW5jdGlvbihlKSB7IC8vIGJ1YmJsZXMgbGlzdGVuZXIsIFRPRE8gOiBoYW5kbGUgbW91c2UgZXZlbnQgaW4gYSBjbGV2ZXIgd2F5XG4gICAgICB2YXIgbm9kZSA9IGUudGFyZ2V0O1xuICAgICAgdmFyIG5hbWUgPSBub2RlLmRhdGFzZXQubm9kZWlkICsgXCJfXCIgKyBlLnR5cGU7XG4gICAgICBpZiAoZXZlbnRDYWxsYmFja3NbbmFtZV0pIHtcbiAgICAgICAgICBldmVudENhbGxiYWNrc1tuYW1lXShlKTsgICAgXG4gICAgICB9IGVsc2Uge1xuICAgICAgICAgIHdoaWxlKCFldmVudENhbGxiYWNrc1tuYW1lXSAmJiBub2RlICYmIG5vZGUgIT09IG51bGwgJiYgbm9kZS5kYXRhc2V0ICYmIG5vZGUuZGF0YXNldC5ub2RlaWQpIHtcbiAgICAgICAgICAgICAgbm9kZSA9IG5vZGUucGFyZW50RWxlbWVudDtcbiAgICAgICAgICAgICAgaWYgKG5vZGUgJiYgbm9kZSAhPT0gbnVsbCAmJiBub2RlLmRhdGFzZXQgJiYgbm9kZS5kYXRhc2V0Lm5vZGVpZCkge1xuICAgICAgICAgICAgICAgIG5hbWUgPSBub2RlLmRhdGFzZXQubm9kZWlkICsgXCJfXCIgKyBlLnR5cGU7XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgICAgaWYgKGV2ZW50Q2FsbGJhY2tzW25hbWVdKSB7XG4gICAgICAgICAgICAgIGV2ZW50Q2FsbGJhY2tzW25hbWVdKGUpOyAgICBcbiAgICAgICAgICB9XG4gICAgICB9XG4gIH0pO1xuICBmdW5jdGlvbiByZXJlbmRlcigpIHtcbiAgICAgIENvbW1vbi5tYXJrU3RhcnQobmFtZSArICcuZ2xvYmFsUmVuZGVyaW5nJyk7XG4gICAgICBfLmVhY2gob2xkSGFuZGxlcnMsIGZ1bmN0aW9uKGhhbmRsZXIpIHtcbiAgICAgICAgICBkZWxldGUgZXZlbnRDYWxsYmFja3NbaGFuZGxlcl07XG4gICAgICB9KTtcbiAgICAgIG9sZEhhbmRsZXJzID0gW107XG4gICAgICB2YXIgZm9jdXMgPSBkb2N1bWVudC5hY3RpdmVFbGVtZW50OyAvLyBUT0RPIDogY2hlY2sgaWYgaW5wdXQvc2VsZWN0L3RleHRhcmVhLCByZW1lbWJlciBjdXJzb3IgcG9zaXRpb24gaGVyZVxuICAgICAgdmFyIGtleSA9IGZvY3VzLmRhdGFzZXQua2V5OyAvLyQoZm9jdXMpLmRhdGEoJ2tleScpO1xuICAgICAgdmFyIHdhaXRpbmdIYW5kbGVycyA9IFtdO1xuICAgICAgdmFyIHJlZnMgPSB7fTtcbiAgICAgIENvbW1vbi5tYXJrU3RhcnQobmFtZSArICcucmVuZGVyJyk7XG4gICAgICB2YXIgZWxlbVRvUmVuZGVyID0gcmVuZGVyKHN0YXRlLCBfLmNsb25lKHByb3BzKSwgeyByZWZzOiByZWZzLCBnZXRET01Ob2RlOiBnZXRET01Ob2RlIH0pO1xuICAgICAgQ29tbW9uLm1hcmtTdG9wKG5hbWUgKyAnLnJlbmRlcicpO1xuICAgICAgRWxlbS5yZW5kZXIoZWxlbVRvUmVuZGVyLCBlbCwgeyB3YWl0aW5nSGFuZGxlcnM6IHdhaXRpbmdIYW5kbGVycywgX19yb290TGlzdGVuZXI6IHRydWUsIHJlZnM6IHJlZnMgfSk7XG4gICAgICBhZnRlclJlbmRlcihzdGF0ZSwgXy5jbG9uZShwcm9wcyksIHsgcmVmczogcmVmcywgZ2V0RE9NTm9kZTogZ2V0RE9NTm9kZSB9KTtcbiAgICAgIGlmIChrZXkpIHtcbiAgICAgICAgICB2YXIgZm9jdXNOb2RlID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvcignW2RhdGEta2V5PVwiJyArIGtleSArICdcIl0nKTsvLyQoJ1tkYXRhLWtleT1cIicgKyBrZXkgKyAnXCJdJyk7XG4gICAgICAgICAgXy5mb2N1cyhmb2N1c05vZGUpOyAvLyBmb2N1c05vZGUuZm9jdXMoKTsgXG4gICAgICAgICAgaWYgKGZvY3VzTm9kZS52YWx1ZSkgeyAvL2ZvY3VzTm9kZS52YWwoKSkge1xuICAgICAgICAgICAgICB2YXIgc3RyTGVuZ3RoID0gZm9jdXNOb2RlLnZhbHVlLmxlbmd0aCAqIDI7IC8vIGZvY3VzTm9kZS52YWwoKS5sZW5ndGggKiAyO1xuICAgICAgICAgICAgICBmb2N1c05vZGUuc2V0U2VsZWN0aW9uUmFuZ2Uoc3RyTGVuZ3RoLCBzdHJMZW5ndGgpOyAvL2ZvY3VzTm9kZVswXS5zZXRTZWxlY3Rpb25SYW5nZShzdHJMZW5ndGgsIHN0ckxlbmd0aCk7ICAvLyBUT0RPIDogaGFuZGxlIG90aGVyIGtpbmQgb2YgaW5wdXQgLi4uIGxpa2Ugc2VsZWN0LCBldGMgLi4uICAgXG4gICAgICAgICAgfVxuICAgICAgfVxuICAgICAgXy5lYWNoKHdhaXRpbmdIYW5kbGVycywgZnVuY3Rpb24oaGFuZGxlcikge1xuICAgICAgICAgIG9sZEhhbmRsZXJzLnB1c2goaGFuZGxlci5pZCArICdfJyArIGhhbmRsZXIuZXZlbnQucmVwbGFjZSgnb24nLCAnJykpO1xuICAgICAgICAgIGV2ZW50Q2FsbGJhY2tzW2hhbmRsZXIuaWQgKyAnXycgKyBoYW5kbGVyLmV2ZW50LnJlcGxhY2UoJ29uJywgJycpXSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICAgICAgICBoYW5kbGVyLmNhbGxiYWNrLmFwcGx5KHsgcmVuZGVyOiByZW5kZXIgfSwgYXJndW1lbnRzKTsgICAgICAgICAgICAgICAgICAgICAgICBcbiAgICAgICAgICB9XG4gICAgICB9KTtcbiAgICAgIENvbW1vbi5tYXJrU3RvcChuYW1lICsgJy5nbG9iYWxSZW5kZXJpbmcnKTtcbiAgfVxuICByZXJlbmRlcigpO1xuICBzdGF0ZS5vbkNoYW5nZShyZXJlbmRlcik7Ly9Db21tb24uZGVmZXJlZChyZXJlbmRlcikpO1xuICByZXR1cm4gc3RhdGU7XG59XG5cbmZ1bmN0aW9uIGZhY3Rvcnkob3B0cykge1xuICByZXR1cm4gZnVuY3Rpb24ocHJvcHMsIHRvKSB7XG4gICAgdmFyIGFwaSA9IHtcbiAgICAgIF9fY29tcG9uZW50RmFjdG9yeTogdHJ1ZSxcbiAgICAgIHJlbmRlclRvOiBmdW5jdGlvbihlbCkge1xuICAgICAgICB2YXIgb3B0ID0gXy5jbG9uZShvcHRzKTtcbiAgICAgICAgb3B0LnByb3BzID0gXy5leHRlbmQoXy5jbG9uZShvcHRzLnByb3BzIHx8IHt9KSwgcHJvcHMgfHwge30pO1xuICAgICAgICBDb21tb24uZGVmZXIoZnVuY3Rpb24oKSB7XG4gICAgICAgICAgbW91bnRDb21wb25lbnQoZWwsIG9wdCk7XG4gICAgICAgIH0pO1xuICAgICAgfVxuICAgIH07XG4gICAgaWYgKHRvKSByZXR1cm4gYXBpLnJlbmRlclRvKHRvKTtcbiAgICByZXR1cm4gYXBpOyAgXG4gIH0gIFxufVxuXG5leHBvcnRzLmNvbXBvbmVudCA9IGZ1bmN0aW9uKG9wdHMpIHtcbiAgaWYgKCFvcHRzLmNvbnRhaW5lcikgcmV0dXJuIGZhY3Rvcnkob3B0cyk7XG4gIHZhciBlbCA9IG9wdHMuY29udGFpbmVyO1xuICBtb3VudENvbXBvbmVudChlbCwgb3B0cyk7XG59OyIsInZhciBDb21tb24gPSByZXF1aXJlKCcuL2NvbW1vbicpO1xudmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG52YXIgQ29tcG9uZW50cyA9IHJlcXVpcmUoJy4vY29tcG9uZW50Jyk7XG52YXIgc3RhdGUgPSByZXF1aXJlKCcuL3N0YXRlJyk7XG52YXIgcmVnaXN0ZXJXZWJDb21wb25lbnQgPSByZXF1aXJlKCcuL3dlYmNvbXBvbmVudCcpLnJlZ2lzdGVyV2ViQ29tcG9uZW50O1xudmFyIFN0cmluZ2lmaWVyID0gcmVxdWlyZSgnLi9zdHJpbmdpZnknKTtcbnZhciBEaXNwYXRjaGVyID0gcmVxdWlyZSgnLi9ldmVudHMnKTtcblxuZnVuY3Rpb24gc3R5bGVUb1N0cmluZyhhdHRycykge1xuICAgIGlmIChfLmlzVW5kZWZpbmVkKGF0dHJzKSkgcmV0dXJuICcnO1xuICAgIHZhciBhdHRyc0FycmF5ID0gXy5tYXAoXy5rZXlzKGF0dHJzKSwgZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBrZXlOYW1lID0gXy5kYXNoZXJpemUoa2V5KTtcbiAgICAgICAgaWYgKGtleSA9PT0gJ2NsYXNzTmFtZScpIHtcbiAgICAgICAgICAgIGtleU5hbWUgPSAnY2xhc3MnO1xuICAgICAgICB9XG4gICAgICAgIHZhciB2YWx1ZSA9IGF0dHJzW2tleV07XG4gICAgICAgIGlmICghXy5pc1VuZGVmaW5lZCh2YWx1ZSkgJiYgXy5pc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAgICAgdmFsdWUgPSB2YWx1ZSgpO1xuICAgICAgICB9XG4gICAgICAgIGlmICghXy5pc1VuZGVmaW5lZCh2YWx1ZSkpIHtcbiAgICAgICAgICAgIHJldHVybiBrZXlOYW1lICsgJzogJyArIHZhbHVlICsgJzsnO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcbiAgICAgICAgfVxuICAgIH0pO1xuICAgIGF0dHJzQXJyYXkgPSBfLmZpbHRlcihhdHRyc0FycmF5LCBmdW5jdGlvbihpdGVtKSB7IHJldHVybiAhXy5pc1VuZGVmaW5lZChpdGVtKTsgfSk7XG4gICAgcmV0dXJuIGF0dHJzQXJyYXkuam9pbignICcpO1xufVxuXG5mdW5jdGlvbiBjbGFzc1RvQXJyYXkoYXR0cnMpIHsgLyogSGFuZGxlIGNsYXNzIGFzIG9iamVjdCB3aXRoIGJvb2xlYW4gdmFsdWVzICovXG4gICAgaWYgKF8uaXNVbmRlZmluZWQoYXR0cnMpKSByZXR1cm4gW107XG4gICAgdmFyIGF0dHJzQXJyYXkgPSBfLm1hcChfLmtleXMoYXR0cnMpLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gYXR0cnNba2V5XTtcbiAgICAgICAgaWYgKCFfLmlzVW5kZWZpbmVkKHZhbHVlKSAmJiB2YWx1ZSA9PT0gdHJ1ZSkge1xuICAgICAgICAgICAgcmV0dXJuIF8uZGFzaGVyaXplKGtleSk7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xuICAgICAgICB9XG4gICAgfSk7XG4gICAgYXR0cnNBcnJheSA9IF8uZmlsdGVyKGF0dHJzQXJyYXksIGZ1bmN0aW9uKGl0ZW0pIHsgcmV0dXJuICFfLmlzVW5kZWZpbmVkKGl0ZW0pOyB9KTtcbiAgICByZXR1cm4gYXR0cnNBcnJheTtcbn1cblxuZnVuY3Rpb24gd3JhcENoaWxkcmVuKGNoaWxkcmVuKSB7XG4gICAgaWYgKGNoaWxkcmVuID09PSAwKSB7XG4gICAgICAgIHJldHVybiBjaGlsZHJlbjtcbiAgICB9IGVsc2UgaWYgKGNoaWxkcmVuID09PSAnJykge1xuICAgICAgICByZXR1cm4gW107XG4gICAgfVxuICAgIHJldHVybiBjaGlsZHJlbiB8fCBbXTtcbn1cblxuZnVuY3Rpb24gYnVpbGRSZWYoaWQpIHtcbiAgICByZXR1cm4ge1xuICAgICAgICBnZXRET01Ob2RlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgIHJldHVybiBfLmZpbmROb2RlKCdbZGF0YS1ub2RlaWQ9XCInICsgaWQgKyAnXCJdJyk7XG4gICAgICAgIH1cbiAgICB9O1xufVxuXG5mdW5jdGlvbiBleHRyYWN0RXZlbnRIYW5kbGVycyhhdHRycywgbm9kZUlkLCBjb250ZXh0KSB7XG4gICAgXy5lYWNoKF8ua2V5cyhhdHRycyksIGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIga2V5TmFtZSA9IF8uZGFzaGVyaXplKGtleSk7ICBcbiAgICAgICAgaWYgKF8uc3RhcnRzV2l0aChrZXlOYW1lLCAnb24nKSkge1xuICAgICAgICAgICAgaWYgKGNvbnRleHQgJiYgY29udGV4dC53YWl0aW5nSGFuZGxlcnMpIHtcbiAgICAgICAgICAgICAgICBjb250ZXh0LndhaXRpbmdIYW5kbGVycy5wdXNoKHtcbiAgICAgICAgICAgICAgICAgICAgcm9vdDogY29udGV4dC5yb290LFxuICAgICAgICAgICAgICAgICAgICBpZDogbm9kZUlkLCBcbiAgICAgICAgICAgICAgICAgICAgZXZlbnQ6IGtleU5hbWUsXG4gICAgICAgICAgICAgICAgICAgIGNhbGxiYWNrOiBhdHRyc1trZXldXG4gICAgICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICB9XG4gICAgICAgIH0gXG4gICAgICAgIGlmIChrZXlOYW1lID09PSAncmVmJyAmJiBjb250ZXh0ICYmIGNvbnRleHQucmVmcykgY29udGV4dC5yZWZzW2F0dHJzW2tleV1dID0gYnVpbGRSZWYobm9kZUlkKTtcbiAgICB9KTsgICBcbn1cblxuZnVuY3Rpb24gYXNBdHRyaWJ1dGUoa2V5LCB2YWx1ZSkgeyByZXR1cm4geyBrZXk6IGtleSwgdmFsdWU6IHZhbHVlIH07IH1cblxuZnVuY3Rpb24gYXR0cmlidXRlc1RvQXJyYXkoYXR0cnMpIHtcbiAgICBpZiAoXy5pc1VuZGVmaW5lZChhdHRycykpIHJldHVybiBbXTtcbiAgICB2YXIgYXR0cnNBcnJheSA9IFtdO1xuICAgIF8uZWFjaChfLmtleXMoYXR0cnMpLCBmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGtleU5hbWUgPSBfLmRhc2hlcml6ZShrZXkpO1xuICAgICAgICBpZiAoa2V5ID09PSAnY2xhc3NOYW1lJykge1xuICAgICAgICAgICAga2V5TmFtZSA9ICdjbGFzcyc7XG4gICAgICAgIH1cbiAgICAgICAgaWYgKCFfLnN0YXJ0c1dpdGgoa2V5TmFtZSwgJ29uJykgJiYga2V5TmFtZSAhPT0gJ3JlZicpIHtcbiAgICAgICAgICAgIHZhciB2YWx1ZSA9IGF0dHJzW2tleV07XG4gICAgICAgICAgICBpZiAoIV8uaXNVbmRlZmluZWQodmFsdWUpICYmIF8uaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICAgICAgICB2YWx1ZSA9IHZhbHVlKCk7XG4gICAgICAgICAgICB9XG4gICAgICAgICAgICBpZiAoIV8uaXNVbmRlZmluZWQodmFsdWUpKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNPYmplY3QodmFsdWUpICYmIGtleU5hbWUgPT09ICdzdHlsZScpIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0cnNBcnJheS5wdXNoKGFzQXR0cmlidXRlKCdzdHlsZScsIHN0eWxlVG9TdHJpbmcodmFsdWUpKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzQXJyYXkodmFsdWUpICYmIGtleU5hbWUgPT09ICdjbGFzcycpIHtcbiAgICAgICAgICAgICAgICAgICAgYXR0cnNBcnJheS5wdXNoKGFzQXR0cmlidXRlKGtleU5hbWUsIHZhbHVlLmpvaW4oJyAnKSkpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc09iamVjdCh2YWx1ZSkgJiYga2V5TmFtZSA9PT0gJ2NsYXNzJykge1xuICAgICAgICAgICAgICAgICAgICBhdHRyc0FycmF5LnB1c2goYXNBdHRyaWJ1dGUoa2V5TmFtZSwgY2xhc3NUb0FycmF5KHZhbHVlKS5qb2luKCcgJykpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgICAgICBhdHRyc0FycmF5LnB1c2goYXNBdHRyaWJ1dGUoa2V5TmFtZSwgdmFsdWUpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICB9KTtcbiAgICByZXR1cm4gYXR0cnNBcnJheTtcbn1cblxuZnVuY3Rpb24gZWwobmFtZSwgYXR0cnMsIGNoaWxkcmVuKSB7XG4gICAgdmFyIG5vZGVJZCA9IF8udW5pcXVlSWQoJ25vZGVfJyk7XG4gICAgaWYgKF8uaXNVbmRlZmluZWQoY2hpbGRyZW4pICYmICFfLmlzVW5kZWZpbmVkKGF0dHJzKSAmJiAhYXR0cnMuX19pc0F0dHJzKSB7XG4gICAgICAgIGNoaWxkcmVuID0gYXR0cnM7XG4gICAgICAgIGF0dHJzID0ge307XG4gICAgfVxuICAgIG5hbWUgPSBfLmVzY2FwZShuYW1lKSB8fCAndW5rbm93bic7XG4gICAgYXR0cnMgPSBhdHRycyB8fCB7fTtcbiAgICBjaGlsZHJlbiA9IHdyYXBDaGlsZHJlbihjaGlsZHJlbik7XG4gICAgaWYgKF8uaXNSZWdFeHAoY2hpbGRyZW4pIHx8IF8uaXNVbmRlZmluZWQoY2hpbGRyZW4pIHx8IF8uaXNOdWxsKGNoaWxkcmVuKSkgY2hpbGRyZW4gPSBbXTsgXG4gICAgaWYgKF8uaXNBcnJheShjaGlsZHJlbikpIHtcbiAgICAgICAgY2hpbGRyZW4gPSBfLmNoYWluKGNoaWxkcmVuKS5tYXAoZnVuY3Rpb24oY2hpbGQpIHtcbiAgICAgICAgICAgIGlmIChfLmlzRnVuY3Rpb24oY2hpbGQpKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGNoaWxkKCk7XG4gICAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgICAgIHJldHVybiBjaGlsZDtcbiAgICAgICAgICAgIH1cbiAgICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHsgXG4gICAgICAgICAgICByZXR1cm4gIV8uaXNVbmRlZmluZWQoaXRlbSk7IFxuICAgICAgICB9KS52YWx1ZSgpO1xuICAgIH0gXG4gICAgdmFyIHNlbGZDbG9zZVRhZyA9IF8uY29udGFpbnMoQ29tbW9uLnZvaWRFbGVtZW50cywgbmFtZS50b1VwcGVyQ2FzZSgpKSBcbiAgICAgICAgJiYgKF8uaXNOdWxsKGNoaWxkcmVuKSB8fCBfLmlzVW5kZWZpbmVkKGNoaWxkcmVuKSB8fCAoXy5pc0FycmF5KGNoaWxkcmVuKSAmJiBjaGlsZHJlbi5sZW5ndGggPT09IDApKTtcbiAgICB2YXIgYXR0cnNBcnJheSA9IGF0dHJpYnV0ZXNUb0FycmF5KGF0dHJzKTtcbiAgICBhdHRyc0FycmF5LnB1c2goYXNBdHRyaWJ1dGUoJ2RhdGEtbm9kZWlkJywgXy5lc2NhcGUobm9kZUlkKSkpO1xuICAgIGlmIChDb21tb24uZGVidWcpIGF0dHJzQXJyYXkucHVzaChhc0F0dHJpYnV0ZSgndGl0bGUnLCBfLmVzY2FwZShub2RlSWQpKSk7XG4gICAgcmV0dXJuIHtcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgYXR0cnM6IGF0dHJzLFxuICAgICAgICBjaGlsZHJlbjogY2hpbGRyZW4sXG4gICAgICAgIGlzRWxlbWVudDogdHJ1ZSxcbiAgICAgICAgbm9kZUlkOiBub2RlSWQsXG4gICAgICAgIHRvSnNvblN0cmluZzogZnVuY3Rpb24ocHJldHR5KSB7XG4gICAgICAgICAgICBpZiAocHJldHR5KSByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcywgbnVsbCwgMik7XG4gICAgICAgICAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkodGhpcyk7XG4gICAgICAgIH0sXG4gICAgICAgIHRvSHRtbE5vZGU6IGZ1bmN0aW9uKGRvYywgY29udGV4dCkge1xuICAgICAgICAgICAgZXh0cmFjdEV2ZW50SGFuZGxlcnMoYXR0cnMsIG5vZGVJZCwgY29udGV4dCk7XG4gICAgICAgICAgICB2YXIgZWxlbWVudCA9IGRvYy5jcmVhdGVFbGVtZW50KF8uZXNjYXBlKG5hbWUpKTtcbiAgICAgICAgICAgIF8uZWFjaChhdHRyc0FycmF5LCBmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgICAgICAgICAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoaXRlbS5rZXksIGl0ZW0udmFsdWUpO1xuICAgICAgICAgICAgfSk7XG4gICAgICAgICAgICBmdW5jdGlvbiBhcHBlbmRTaW5nbGVOb2RlKF9fY2hpbGRyZW4sIF9fZWxlbWVudCkge1xuICAgICAgICAgICAgICAgIGlmIChfLmlzTnVtYmVyKF9fY2hpbGRyZW4pKSB7XG4gICAgICAgICAgICAgICAgICAgIF9fZWxlbWVudC5hcHBlbmRDaGlsZChkb2MuY3JlYXRlVGV4dE5vZGUoX19jaGlsZHJlbiArICcnKSk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzU3RyaW5nKF9fY2hpbGRyZW4pKSB7XG4gICAgICAgICAgICAgICAgICAgIF9fZWxlbWVudC5hcHBlbmRDaGlsZChkb2MuY3JlYXRlVGV4dE5vZGUoX19jaGlsZHJlbikpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSBpZiAoXy5pc0Jvb2xlYW4oX19jaGlsZHJlbikpIHtcbiAgICAgICAgICAgICAgICAgICAgX19lbGVtZW50LmFwcGVuZENoaWxkKGRvYy5jcmVhdGVUZXh0Tm9kZShfX2NoaWxkcmVuICsgJycpKTtcbiAgICAgICAgICAgICAgICB9IGVsc2UgaWYgKF8uaXNPYmplY3QoX19jaGlsZHJlbikgJiYgX19jaGlsZHJlbi5pc0VsZW1lbnQpIHtcbiAgICAgICAgICAgICAgICAgICAgX19lbGVtZW50LmFwcGVuZENoaWxkKF9fY2hpbGRyZW4udG9IdG1sTm9kZShkb2MsIGNvbnRleHQpKTsgXG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfLmlzT2JqZWN0KF9fY2hpbGRyZW4pICYmIF9fY2hpbGRyZW4uX19hc0h0bWwpIHtcbiAgICAgICAgICAgICAgICAgICAgX19lbGVtZW50LmlubmVySFRNTCA9IF9fY2hpbGRyZW4uX19hc0h0bWw7XG4gICAgICAgICAgICAgICAgfSBlbHNlIGlmIChfX2NoaWxkcmVuLl9fY29tcG9uZW50RmFjdG9yeSkge1xuICAgICAgICAgICAgICAgICAgICB2YXIgY29tcElkID0gXy5lc2NhcGUoXy51bmlxdWVJZCgnY29tcG9uZW50XycpKTtcbiAgICAgICAgICAgICAgICAgICAgdmFyIHNwYW4gPSBkb2MuY3JlYXRlRWxlbWVudCgnc3BhbicpO1xuICAgICAgICAgICAgICAgICAgICBzcGFuLnNldEF0dHJpYnV0ZSgnZGF0YS1jb21wb25lbnRpZCcsIGNvbXBJZCk7XG4gICAgICAgICAgICAgICAgICAgIF9fZWxlbWVudC5hcHBlbmRDaGlsZChzcGFuKTtcbiAgICAgICAgICAgICAgICAgICAgX19jaGlsZHJlbi5yZW5kZXJUbygnW2RhdGEtY29tcG9uZW50aWQ9XCInICsgY29tcElkICsgJ1wiXScpO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIF9fZWxlbWVudC5hcHBlbmRDaGlsZChkb2MuY3JlYXRlVGV4dE5vZGUoX19jaGlsZHJlbi50b1N0cmluZygpKSk7XG4gICAgICAgICAgICAgICAgfSAgICBcbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIGlmICghc2VsZkNsb3NlVGFnKSB7XG4gICAgICAgICAgICAgICAgaWYgKF8uaXNBcnJheShjaGlsZHJlbikpIHtcbiAgICAgICAgICAgICAgICAgICAgXy5lYWNoKGNoaWxkcmVuLCBmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICAgICAgYXBwZW5kU2luZ2xlTm9kZShjaGlsZCwgZWxlbWVudCk7XG4gICAgICAgICAgICAgICAgICAgIH0pO1xuICAgICAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgICAgICAgIGFwcGVuZFNpbmdsZU5vZGUoY2hpbGRyZW4sIGVsZW1lbnQpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cbiAgICAgICAgICAgIHJldHVybiBlbGVtZW50O1xuICAgICAgICB9XG4gICAgfTtcbn0gXG5cbmZ1bmN0aW9uIHJlbmRlclRvTm9kZShlbCwgZG9jLCBjb250ZXh0KSB7XG4gICAgaWYgKF8uaXNGdW5jdGlvbihlbCkpIGVsID0gZWwoKGNvbnRleHQgfHwgeyBwcm9wczoge319KS5wcm9wcylcbiAgICBpZiAoIV8uaXNVbmRlZmluZWQoZWwpKSB7XG4gICAgICAgIGlmIChfLmlzQXJyYXkoZWwpKSB7XG4gICAgICAgICAgICByZXR1cm4gXy5jaGFpbihlbCkubWFwKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICAgICAgICBpZiAoXy5pc0Z1bmN0aW9uKGl0ZW0pKSB7XG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBpdGVtKCk7XG4gICAgICAgICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW07XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgfSkuZmlsdGVyKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuICFfLmlzVW5kZWZpbmVkKGl0ZW0pO1xuICAgICAgICAgICAgfSkubWFwKGZ1bmN0aW9uIChpdGVtKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIGl0ZW0udG9IdG1sTm9kZShkb2MsIGNvbnRleHQpO1xuICAgICAgICAgICAgfSkudmFsdWUoKTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHJldHVybiBbZWwudG9IdG1sTm9kZShkb2MsIGNvbnRleHQpXTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiBbXTtcbiAgICB9XG59ICAgXG5cbmV4cG9ydHMucmVuZGVyVG9TdHJpbmcgPSBmdW5jdGlvbihlbCwgY29udGV4dCkge1xuICAgIENvbW1vbi5tYXJrU3RhcnQoJ0VsZW0ucmVuZGVyVG9TdHJpbmcnKTtcbiAgICB2YXIgc3RyID0gXy5tYXAocmVuZGVyVG9Ob2RlKGVsLCBTdHJpbmdpZmllcigpKSwgZnVuY3Rpb24obikgeyByZXR1cm4gbi50b0h0bWxTdHJpbmcoKTsgfSkuam9pbignJyk7XG4gICAgQ29tbW9uLm1hcmtTdG9wKCdFbGVtLnJlbmRlclRvU3RyaW5nJyk7XG4gICAgcmV0dXJuIHN0cjtcbn07XG5cbmV4cG9ydHMuZWwgPSBlbDtcblxuZXhwb3J0cy5zZWwgPSBmdW5jdGlvbihuYW1lLCBjaGlsZHJlbikgeyByZXR1cm4gZWwobmFtZSwge30sIGNoaWxkcmVuKTsgfTsgLy8gc2ltcGxlIG5vZGUgc2VsKG5hbWUsIGNoaWxkcmVuKVxuXG5leHBvcnRzLnZlbCA9IGZ1bmN0aW9uKG5hbWUsIGF0dHJzKSB7IHJldHVybiBlbChuYW1lLCBhdHRycywgW10pOyB9OyAvLyB2b2lkIG5vZGUsIGNlbChuYW1lLCBhdHRycylcblxuZXhwb3J0cy5uYnNwID0gZnVuY3Rpb24odGltZXMpIHsgcmV0dXJuIGVsKCdzcGFuJywgeyBfX2FzSHRtbDogXy50aW1lcyh0aW1lcyB8fCAxLCBmdW5jdGlvbigpIHsgcmV0dXJuICcmbmJzcDsnOyB9KSB9KTsgfTtcblxuZXhwb3J0cy50ZXh0ID0gZnVuY3Rpb24odGV4dCkgeyByZXR1cm4gZWwoJ3NwYW4nLCB7fSwgdGV4dCk7IH07XG5cbmV4cG9ydHMuZWxlbWVudHMgPSBmdW5jdGlvbigpIHsgcmV0dXJuIF8ubWFwKGFyZ3VtZW50cywgZnVuY3Rpb24oaXRlbSkgeyByZXR1cm4gaXRlbTsgfSk7IH07XG5cbmV4cG9ydHMucmVuZGVyID0gZnVuY3Rpb24oZWwsIG5vZGUsIGNvbnRleHQpIHtcbiAgICBDb21tb24ubWFya1N0YXJ0KCdFbGVtLnJlbmRlcicpO1xuICAgIHZhciB3YWl0aW5nSGFuZGxlcnMgPSAoY29udGV4dCB8fCB7fSkud2FpdGluZ0hhbmRsZXJzIHx8IFtdO1xuICAgIHZhciByZWZzID0gKGNvbnRleHQgfHwge30pLnJlZnMgfHwge307XG4gICAgdmFyIHByb3BzID0gKGNvbnRleHQgfHwge30pLnByb3BzIHx8IHt9O1xuICAgIHZhciBkb2MgPSBkb2N1bWVudDtcbiAgICBpZiAobm9kZS5vd25lckRvY3VtZW50KSB7XG4gICAgICAgIGRvYyA9IG5vZGUub3duZXJEb2N1bWVudDtcbiAgICB9XG4gICAgdmFyIGh0bWxOb2RlID0gcmVuZGVyVG9Ob2RlKGVsLCBkb2MsIHsgcm9vdDogbm9kZSwgd2FpdGluZ0hhbmRsZXJzOiB3YWl0aW5nSGFuZGxlcnMsIHJlZnM6IHJlZnMsIHByb3BzOiBwcm9wcyB9KTtcbiAgICBpZiAoXy5pc1N0cmluZyhub2RlKSkge1xuICAgICAgICBub2RlID0gZG9jLnF1ZXJ5U2VsZWN0b3Iobm9kZSk7XG4gICAgfVxuICAgIHdoaWxlIChub2RlLmZpcnN0Q2hpbGQpIHsgbm9kZS5yZW1vdmVDaGlsZChub2RlLmZpcnN0Q2hpbGQpOyB9XG4gICAgXy5lYWNoKGh0bWxOb2RlLCBmdW5jdGlvbihuKSB7XG4gICAgICAgIG5vZGUuYXBwZW5kQ2hpbGQobik7XG4gICAgfSk7XG4gICAgaWYgKCEoY29udGV4dCAmJiBjb250ZXh0Ll9fcm9vdExpc3RlbmVyKSkgeyAgLy8gZXh0ZXJuYWwgbGlzdGVuZXIgaGVyZVxuICAgICAgICBfLmVhY2god2FpdGluZ0hhbmRsZXJzLCBmdW5jdGlvbihoYW5kbGVyKSB7IC8vIGhhbmRsZXIgb24gZWFjaCBjb25jZXJuZWQgbm9kZVxuICAgICAgICAgICAgXy5vbignW2RhdGEtbm9kZWlkPVwiJyArIGhhbmRsZXIuaWQgKyAnXCJdJywgW2hhbmRsZXIuZXZlbnQucmVwbGFjZSgnb24nLCAnJyldLCBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICBoYW5kbGVyLmNhbGxiYWNrLmFwcGx5KHt9LCBhcmd1bWVudHMpO1xuICAgICAgICAgICAgfSk7ICAgXG4gICAgICAgIH0pO1xuICAgIH1cbiAgICBDb21tb24ubWFya1N0b3AoJ0VsZW0ucmVuZGVyJyk7XG59O1xuZXhwb3J0cy5jb21wb25lbnQgPSBDb21wb25lbnRzLmNvbXBvbmVudDtcbmV4cG9ydHMuY29tcG9uZW50RmFjdG9yeSA9IENvbXBvbmVudHMuY29tcG9uZW50RmFjdG9yeTtcbmV4cG9ydHMuc3RhdGUgPSBzdGF0ZTtcbmV4cG9ydHMuVXRpbHMgPSBfO1xuZXhwb3J0cy5yZWdpc3RlcldlYkNvbXBvbmVudCA9IHJlZ2lzdGVyV2ViQ29tcG9uZW50O1xuZXhwb3J0cy5kaXNwYXRjaGVyID0gRGlzcGF0Y2hlcjtcbmV4cG9ydHMuUGVyZiA9IHtcbiAgICBzdGFydDogZnVuY3Rpb24oKSB7IENvbW1vbi5wZXJmcyA9IHRydWU7IH0sXG4gICAgc3RvcDogZnVuY3Rpb24oKSB7IENvbW1vbi5zdG9wID0gZmFsc2U7IH0sXG4gICAgbWFya1N0YXJ0OiBDb21tb24ubWFya1N0YXJ0LFxuICAgIG1hcmtTdG9wOiBDb21tb24ubWFya1N0b3AsXG4gICAgY29sbGVjdE1lYXN1cmVzOiBDb21tb24uY29sbGVjdE1lYXN1cmVzLFxuICAgIHByaW50TWVhc3VyZXM6IENvbW1vbi5wcmludE1lYXN1cmVzXG59O1xuXG5pZiAodHlwZW9mIGRlZmluZSA9PT0gJ2Z1bmN0aW9uJyAmJiBkZWZpbmUuYW1kKSB7XG4gICAgZGVmaW5lKCdlbGVtJywgW10sIGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gbW9kdWxlLmV4cG9ydHM7XG4gICAgfSk7XG59IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbnZhciBldmVudFNwbGl0dGVyID0gL1xccysvO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uKCkge1xuXG4gIHZhciBjYWxsYmFja3MgPSBbXTtcblxuICBmdW5jdGlvbiBmaXJlQ2FsbGJhY2tzKG5hbWVzLCBldmVudCkge1xuICAgIHZhciBldmVudE5hbWVzID0gW25hbWVzXTtcbiAgICBpZiAoZXZlbnRTcGxpdHRlci50ZXN0KG5hbWVzKSkge1xuICAgICAgZXZlbnROYW1lcyA9IG5hbWVzLnNwbGl0KGV2ZW50U3BsaXR0ZXIpO1xuICAgIH1cbiAgICBfLmVhY2goZXZlbnROYW1lcywgZnVuY3Rpb24obmFtZSkge1xuICAgICAgXy5lYWNoKGNhbGxiYWNrcywgZnVuY3Rpb24oY2FsbGJhY2tIYXNoKSB7XG4gICAgICAgIGlmIChjYWxsYmFja0hhc2gubmFtZSA9PT0gJ2FsbCcpIHtcbiAgICAgICAgICBjYWxsYmFja0hhc2guY2FsbGJhY2sobmFtZSwgZXZlbnQpO1xuICAgICAgICB9IGVsc2UgaWYgKGNhbGxiYWNrSGFzaC5uYW1lID09PSBuYW1lKSB7XG4gICAgICAgICAgY2FsbGJhY2tIYXNoLmNhbGxiYWNrKGV2ZW50KTtcbiAgICAgICAgfVxuICAgICAgfSk7ICBcbiAgICB9KTsgICAgXG4gIH1cblxuICByZXR1cm4ge1xuICAgIHRyaWdnZXI6IGZpcmVDYWxsYmFja3MsXG4gICAgZGlzcGF0Y2g6IGZpcmVDYWxsYmFja3MsXG4gICAgb246IGZ1bmN0aW9uKG5hbWUsIGNhbGxiYWNrKSB7XG4gICAgICB0aGlzLm9mZihuYW1lLCBjYWxsYmFjayk7XG4gICAgICBjYWxsYmFja3MucHVzaCh7IG5hbWU6IG5hbWUsIGNhbGxiYWNrOiBjYWxsYmFjayB9KTtcbiAgICB9LFxuICAgIG9mZjogZnVuY3Rpb24obmFtZSwgY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrcyA9IF8uZmlsdGVyKGNhbGxiYWNrcywgZnVuY3Rpb24ob2JqKSB7XG4gICAgICAgIGlmIChvYmoubmFtZSA9PT0gbmFtZSAmJiBvYmouY2FsbGJhY2sgPT09IGNhbGxiYWNrKSB7XG4gICAgICAgICAgcmV0dXJuIGZhbHNlO1xuICAgICAgICB9XG4gICAgICAgIHJldHVybiB0cnVlO1xuICAgICAgfSk7XG4gICAgfSxcbiAgfTtcbn07IiwidmFyIF8gPSByZXF1aXJlKCcuL3V0aWxzJyk7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24obW9kKSB7XG5cbiAgdmFyIHRoZU1vZGVsID0gXy5leHRlbmQoe30sIG1vZCB8fCB7fSk7XG5cbiAgdmFyIGNhbGxiYWNrcyA9IFtdO1xuXG4gIGZ1bmN0aW9uIGZpcmVDYWxsYmFja3MoKSB7XG4gICAgXy5lYWNoKGNhbGxiYWNrcywgZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrKCk7XG4gICAgfSk7XG4gIH1cblxuICB2YXIgYXBpID0gZnVuY3Rpb24oKSB7XG4gICAgcmV0dXJuIF8uY2xvbmUodGhlTW9kZWwpO1xuICB9O1xuXG4gIHJldHVybiBfLmV4dGVuZChhcGksIHtcbiAgICBvbkNoYW5nZTogZnVuY3Rpb24oY2FsbGJhY2spIHtcbiAgICAgIGNhbGxiYWNrcy5wdXNoKGNhbGxiYWNrKTtcbiAgICB9LFxuICAgIGdldDogZnVuY3Rpb24oa2V5KSB7XG4gICAgICByZXR1cm4gdGhlTW9kZWxba2V5XTtcbiAgICB9LFxuICAgIGFsbDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gXy5jbG9uZSh0aGVNb2RlbCk7XG4gICAgfSxcbiAgICBmb3JjZVVwZGF0ZTogZnVuY3Rpb24oKSB7XG4gICAgICBmaXJlQ2FsbGJhY2tzKCk7XG4gICAgfSxcbiAgICBzZXQ6IGZ1bmN0aW9uKG9iaiwgc2lsZW50T3JDYWxsYmFjaykge1xuICAgICAgdmFyIHNpbGVudCA9IF8uaXNCb29sZWFuKHNpbGVudE9yQ2FsbGJhY2spICYmIHNpbGVudE9yQ2FsbGJhY2sgPT09IHRydWU7XG4gICAgICBpZiAoIV8uaXNVbmRlZmluZWQob2JqKSAmJiBfLmlzT2JqZWN0KG9iaikpIHtcbiAgICAgICAgXy5tYXAoXy5rZXlzKG9iaiksIGZ1bmN0aW9uKGspIHtcbiAgICAgICAgICB0aGVNb2RlbFtrXSA9IG9ialtrXTtcbiAgICAgICAgfSk7XG4gICAgICAgIGlmICghc2lsZW50KSBmaXJlQ2FsbGJhY2tzKCk7XG4gICAgICAgIGlmICghc2lsZW50KShzaWxlbnRPckNhbGxiYWNrIHx8IGZ1bmN0aW9uKCkge30pKCk7XG4gICAgICB9XG4gICAgfSxcbiAgICByZXBsYWNlOiBmdW5jdGlvbihvYmosIHNpbGVudE9yQ2FsbGJhY2spIHtcbiAgICAgIHRoZU1vZGVsID0ge307XG4gICAgICB0aGlzLnNldChvYmosIHNpbGVudE9yQ2FsbGJhY2spO1xuICAgIH0sXG4gICAgcmVtb3ZlOiBmdW5jdGlvbihrZXkpIHtcbiAgICAgIGRlbGV0ZSB0aGVNb2RlbFtrZXldO1xuICAgICAgZmlyZUNhbGxiYWNrcygpO1xuICAgIH1cbiAgfSk7XG59OyIsInZhciBDb21tb24gPSByZXF1aXJlKCcuL2NvbW1vbicpO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIHN0cmluZ2lmeURvYygpIHtcbiAgICBmdW5jdGlvbiBub2RlKG5hbWUpIHsgXG4gICAgICAgIHZhciBhdHRycyA9IFtdO1xuICAgICAgICB2YXIgY2hpbGRyZW4gPSBbXTtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHNldEF0dHJpYnV0ZTogZnVuY3Rpb24oa2V5LCB2YWx1ZSkgeyBhdHRycy5wdXNoKGtleSArICc9XCInICsgdmFsdWUgKyAnXCInKTsgfSxcbiAgICAgICAgICAgIGFwcGVuZENoaWxkOiBmdW5jdGlvbihjaGlsZCkgeyBjaGlsZHJlbi5wdXNoKGNoaWxkKTsgfSxcbiAgICAgICAgICAgIHRvSHRtbFN0cmluZzogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgdmFyIHNlbGZDbG9zZVRhZyA9IF8uY29udGFpbnMoQ29tbW9uLnZvaWRFbGVtZW50cywgbmFtZS50b1VwcGVyQ2FzZSgpKSAmJiBjaGlsZHJlbi5sZW5ndGggPT09IDA7XG4gICAgICAgICAgICAgICAgaWYgKHNlbGZDbG9zZVRhZykgcmV0dXJuICc8JyArIG5hbWUgKyAnICcgKyBhdHRycy5qb2luKCcgJykgKyAnIC8+JztcbiAgICAgICAgICAgICAgICByZXR1cm4gJzwnICsgbmFtZSArICcgJyArIGF0dHJzLmpvaW4oJyAnKSArICc+JyArIF8ubWFwKGNoaWxkcmVuLCBmdW5jdGlvbihjaGlsZCkge1xuICAgICAgICAgICAgICAgICAgICByZXR1cm4gY2hpbGQudG9IdG1sU3RyaW5nKCk7XG4gICAgICAgICAgICAgICAgfSkuam9pbignJykgKyAnPC8nICsgbmFtZSArICc+JztcbiAgICAgICAgICAgIH1cbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4ge1xuICAgICAgICBjcmVhdGVFbGVtZW50OiBub2RlLFxuICAgICAgICBjcmVhdGVUZXh0Tm9kZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgICAgIHJldHVybiB7XG4gICAgICAgICAgICAgICAgdG9IdG1sU3RyaW5nOiBmdW5jdGlvbigpIHsgcmV0dXJuIHZhbHVlOyB9XG4gICAgICAgICAgICB9O1xuICAgICAgICB9ICAgXG4gICAgfTtcbn1cbiIsInZhciBfX2lkQ291bnRlciA9IDA7XG5cbnZhciBlc2NhcGVNYXAgPSB7XG4gICAgJyYnOiAnJmFtcDsnLFxuICAgICc8JzogJyZsdDsnLFxuICAgICc+JzogJyZndDsnLFxuICAgICdcIic6ICcmcXVvdDsnLFxuICAgIFwiJ1wiOiAnJiN4Mjc7JyxcbiAgICAnYCc6ICcmI3g2MDsnXG59O1xuXG52YXIgY3JlYXRlRXNjYXBlciA9IGZ1bmN0aW9uKG1hcCwga2V5cykge1xuICAgIHZhciBlc2NhcGVyID0gZnVuY3Rpb24obWF0Y2gpIHtcbiAgICAgICAgcmV0dXJuIG1hcFttYXRjaF07XG4gICAgfTtcbiAgICB2YXIgc291cmNlID0gJyg/OicgKyBrZXlzKG1hcCkuam9pbignfCcpICsgJyknO1xuICAgIHZhciB0ZXN0UmVnZXhwID0gUmVnRXhwKHNvdXJjZSk7XG4gICAgdmFyIHJlcGxhY2VSZWdleHAgPSBSZWdFeHAoc291cmNlLCAnZycpO1xuICAgIHJldHVybiBmdW5jdGlvbihzdHJpbmcpIHtcbiAgICAgICAgc3RyaW5nID0gc3RyaW5nID09IG51bGwgPyAnJyA6ICcnICsgc3RyaW5nO1xuICAgICAgICByZXR1cm4gdGVzdFJlZ2V4cC50ZXN0KHN0cmluZykgPyBzdHJpbmcucmVwbGFjZShyZXBsYWNlUmVnZXhwLCBlc2NhcGVyKSA6IHN0cmluZztcbiAgICB9O1xufTtcblxuZnVuY3Rpb24ga2V5cyhvYmopIHtcbiAgICBpZiAoIWlzT2JqZWN0KG9iaikpIHJldHVybiBbXTtcbiAgICBpZiAoT2JqZWN0LmtleXMpIHJldHVybiBPYmplY3Qua2V5cyhvYmopO1xuICAgIHZhciBrZXlzID0gW107XG4gICAgZm9yICh2YXIga2V5IGluIG9iaikgaWYgKGhhcyhvYmosIGtleSkpIGtleXMucHVzaChrZXkpO1xuICAgIHJldHVybiBrZXlzO1xufVxuXG5mdW5jdGlvbiB2YWx1ZXMob2JqKSB7XG4gICAgdmFyIGtleXMgPSBrZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciB2YWx1ZXMgPSBBcnJheShsZW5ndGgpO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsdWVzW2ldID0gb2JqW2tleXNbaV1dO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWVzO1xufVxuXG5mdW5jdGlvbiBpbmRleE9mKGFycmF5LCBpdGVtLCBpc1NvcnRlZCkge1xuICAgIGlmIChhcnJheSA9PSBudWxsKSByZXR1cm4gLTE7XG4gICAgdmFyIGkgPSAwLCBsZW5ndGggPSBhcnJheS5sZW5ndGg7XG4gICAgaWYgKGlzU29ydGVkKSB7XG4gICAgICAgIGlmICh0eXBlb2YgaXNTb3J0ZWQgPT0gJ251bWJlcicpIHtcbiAgICAgICAgICAgIGkgPSBpc1NvcnRlZCA8IDAgPyBNYXRoLm1heCgwLCBsZW5ndGggKyBpc1NvcnRlZCkgOiBpc1NvcnRlZDtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIGkgPSBzb3J0ZWRJbmRleChhcnJheSwgaXRlbSk7XG4gICAgICAgICAgICByZXR1cm4gYXJyYXlbaV0gPT09IGl0ZW0gPyBpIDogLTE7XG4gICAgICAgIH1cbiAgICB9XG4gICAgZm9yICg7IGkgPCBsZW5ndGg7IGkrKykgaWYgKGFycmF5W2ldID09PSBpdGVtKSByZXR1cm4gaTtcbiAgICByZXR1cm4gLTE7XG59XG5cbmZ1bmN0aW9uIGVhY2gob2JqLCBmdW5jKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gb2JqO1xuICAgIHZhciBpLCBsZW5ndGggPSBvYmoubGVuZ3RoO1xuICAgIGlmIChsZW5ndGggPT09ICtsZW5ndGgpIHtcbiAgICAgICAgZm9yIChpID0gMDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBmdW5jKG9ialtpXSwgaSwgb2JqKTtcbiAgICAgICAgfVxuICAgIH0gZWxzZSB7XG4gICAgICAgIHZhciBrZXlzID0ga2V5cyhvYmopO1xuICAgICAgICBmb3IgKGkgPSAwLCBsZW5ndGggPSBrZXlzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgICAgICBmdW5jKG9ialtrZXlzW2ldXSwga2V5c1tpXSwgb2JqKTtcbiAgICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gb2JqO1xufVxuXG5mdW5jdGlvbiBtYXAob2JqLCBmdW5jKSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gW107XG4gICAgdmFyIGtleXMgPSBvYmoubGVuZ3RoICE9PSArb2JqLmxlbmd0aCAmJiBrZXlzKG9iaiksXG4gICAgICAgIGxlbmd0aCA9IChrZXlzIHx8IG9iaikubGVuZ3RoLFxuICAgICAgICByZXN1bHRzID0gQXJyYXkobGVuZ3RoKSxcbiAgICAgICAgY3VycmVudEtleTtcbiAgICBmb3IgKHZhciBpbmRleCA9IDA7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgIGN1cnJlbnRLZXkgPSBrZXlzID8ga2V5c1tpbmRleF0gOiBpbmRleDtcbiAgICAgICAgcmVzdWx0c1tpbmRleF0gPSBmdW5jKG9ialtjdXJyZW50S2V5XSwgY3VycmVudEtleSwgb2JqKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIGZpbHRlcihvYmosIHByZWRpY2F0ZSkge1xuICAgIHZhciByZXN1bHRzID0gW107XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gcmVzdWx0cztcbiAgICBlYWNoKG9iaiwgZnVuY3Rpb24odmFsdWUsIGluZGV4LCBsaXN0KSB7XG4gICAgICAgIGlmIChwcmVkaWNhdGUodmFsdWUsIGluZGV4LCBsaXN0KSkgcmVzdWx0cy5wdXNoKHZhbHVlKTtcbiAgICB9KTtcbiAgICByZXR1cm4gcmVzdWx0cztcbn1cblxuZnVuY3Rpb24gcmVkdWNlKG9iaiwgaXRlcmF0ZWUsIG1lbW8sIGNvbnRleHQpIHtcbiAgICBpZiAob2JqID09IG51bGwpIG9iaiA9IFtdO1xuICAgIHZhciBrZXlzID0gb2JqLmxlbmd0aCAhPT0gK29iai5sZW5ndGggJiYga2V5cyhvYmopLFxuICAgICAgICBsZW5ndGggPSAoa2V5cyB8fCBvYmopLmxlbmd0aCxcbiAgICAgICAgaW5kZXggPSAwLFxuICAgICAgICBjdXJyZW50S2V5O1xuICAgIGlmIChhcmd1bWVudHMubGVuZ3RoIDwgMykge1xuICAgICAgICBpZiAoIWxlbmd0aCkgdGhyb3cgbmV3IFR5cGVFcnJvcihyZWR1Y2VFcnJvcik7XG4gICAgICAgIG1lbW8gPSBvYmpba2V5cyA/IGtleXNbaW5kZXgrK10gOiBpbmRleCsrXTtcbiAgICB9XG4gICAgZm9yICg7IGluZGV4IDwgbGVuZ3RoOyBpbmRleCsrKSB7XG4gICAgICAgIGN1cnJlbnRLZXkgPSBrZXlzID8ga2V5c1tpbmRleF0gOiBpbmRleDtcbiAgICAgICAgbWVtbyA9IGl0ZXJhdGVlKG1lbW8sIG9ialtjdXJyZW50S2V5XSwgY3VycmVudEtleSwgb2JqKTtcbiAgICB9XG4gICAgcmV0dXJuIG1lbW87XG59XG5cbmZ1bmN0aW9uIHJlamVjdChvYmosIHByZWRpY2F0ZSwgY29udGV4dCkge1xuICAgIHJldHVybiBmaWx0ZXIob2JqLCBuZWdhdGUocHJlZGljYXRlKSwgY29udGV4dCk7XG59XG5cbmZ1bmN0aW9uIHdoZXJlKG9iaiwgYXR0cnMpIHtcbiAgICByZXR1cm4gZmlsdGVyKG9iaiwgbWF0Y2hlcyhhdHRycykpO1xufVxuXG5mdW5jdGlvbiBtYXRjaGVzKGF0dHJzKSB7XG4gICAgdmFyIHBhaXJzID0gcGFpcnMoYXR0cnMpLFxuICAgICAgICBsZW5ndGggPSBwYWlycy5sZW5ndGg7XG4gICAgcmV0dXJuIGZ1bmN0aW9uKG9iaikge1xuICAgICAgICBpZiAob2JqID09IG51bGwpIHJldHVybiAhbGVuZ3RoO1xuICAgICAgICBvYmogPSBuZXcgT2JqZWN0KG9iaik7XG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbGVuZ3RoOyBpKyspIHtcbiAgICAgICAgICAgIHZhciBwYWlyID0gcGFpcnNbaV0sXG4gICAgICAgICAgICAgICAga2V5ID0gcGFpclswXTtcbiAgICAgICAgICAgIGlmIChwYWlyWzFdICE9PSBvYmpba2V5XSB8fCAhKGtleSBpbiBvYmopKSByZXR1cm4gZmFsc2U7XG4gICAgICAgIH1cbiAgICAgICAgcmV0dXJuIHRydWU7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gaWRlbnRpdHkodmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWU7XG59XG5cbmZ1bmN0aW9uIHByb3BlcnR5KGtleSkge1xuICAgIHJldHVybiBmdW5jdGlvbihvYmopIHtcbiAgICAgICAgcmV0dXJuIG9ialtrZXldO1xuICAgIH07XG59XG5cbmZ1bmN0aW9uIG5lZ2F0ZShwcmVkaWNhdGUpIHtcbiAgICByZXR1cm4gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiAhcHJlZGljYXRlLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gICAgfTtcbn1cblxuZnVuY3Rpb24gcGFpcnMob2JqKSB7XG4gICAgdmFyIGtleXMgPSBrZXlzKG9iaik7XG4gICAgdmFyIGxlbmd0aCA9IGtleXMubGVuZ3RoO1xuICAgIHZhciBwYWlycyA9IEFycmF5KGxlbmd0aCk7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBsZW5ndGg7IGkrKykge1xuICAgICAgICBwYWlyc1tpXSA9IFtrZXlzW2ldLCBvYmpba2V5c1tpXV1dO1xuICAgIH1cbiAgICByZXR1cm4gcGFpcnM7XG59XG5cbmZ1bmN0aW9uIGNoYWluKG9iaikge1xuICAgIHZhciBpbnRlcm5hbE9iaiA9IG9iajtcbiAgICB2YXIgdW5kZXIgPSB0aGlzO1xuICAgIGZ1bmN0aW9uIGNoYWluYWJsZUFwaSgpIHtcbiAgICAgICAgcmV0dXJuIHtcbiAgICAgICAgICAgIHZhbHVlOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gaW50ZXJuYWxPYmo7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgbWFwOiBmdW5jdGlvbihmdW5jKSB7XG4gICAgICAgICAgICAgICAgaW50ZXJuYWxPYmogPSB1bmRlci5tYXAoaW50ZXJuYWxPYmosIGZ1bmMpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIGZpbHRlcjogZnVuY3Rpb24oZnVuYykge1xuICAgICAgICAgICAgICAgIGludGVybmFsT2JqID0gdW5kZXIuZmlsdGVyKGludGVybmFsT2JqLCBmdW5jKTtcbiAgICAgICAgICAgICAgICByZXR1cm4gdGhpcztcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICBlYWNoOiBmdW5jdGlvbihmdW5jKSB7XG4gICAgICAgICAgICAgICAgdW5kZXIuZWFjaChpbnRlcm5hbE9iaiwgZnVuYyk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgdmFsdWVzOiBmdW5jdGlvbigpIHtcbiAgICAgICAgICAgICAgICByZXR1cm4gdW5kZXIudmFsdWVzKCk7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAga2V5czogZnVuY3Rpb24oKSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVyLmtleXMoKTtcbiAgICAgICAgICAgIH0sXG4gICAgICAgICAgICByZWR1Y2U6IGZ1bmN0aW9uKGl0ZXJhdGVlLCBtZW1vLCBjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHVuZGVyLnJlZHVjZShpbnRlcm5hbE9iaiwgaXRlcmF0ZWUsIG1lbW8sIGNvbnRleHQpO1xuICAgICAgICAgICAgfSxcbiAgICAgICAgICAgIHJlamVjdDogZnVuY3Rpb24ocHJlZGljYXRlLCBjb250ZXh0KSB7XG4gICAgICAgICAgICAgICAgaW50ZXJuYWxPYmogPSB1bmRlci5yZWplY3QoaW50ZXJuYWxPYmosIHByZWRpY2F0ZSwgY29udGV4dCk7XG4gICAgICAgICAgICAgICAgcmV0dXJuIHRoaXM7XG4gICAgICAgICAgICB9LFxuICAgICAgICAgICAgd2hlcmU6IGZ1bmN0aW9uKGF0dHJzKSB7XG4gICAgICAgICAgICAgICAgaW50ZXJuYWxPYmogPSB1bmRlci53aGVyZShpbnRlcm5hbE9iaiwgYXR0cnMpO1xuICAgICAgICAgICAgICAgIHJldHVybiB0aGlzO1xuICAgICAgICAgICAgfVxuICAgICAgICB9O1xuICAgIH1cbiAgICByZXR1cm4gY2hhaW5hYmxlQXBpKCk7XG59XG5cbmZ1bmN0aW9uIGNvbnRhaW5zKG9iaiwgdGFyZ2V0KSB7XG4gICAgaWYgKG9iaiA9PSBudWxsKSByZXR1cm4gZmFsc2U7XG4gICAgaWYgKG9iai5sZW5ndGggIT09ICtvYmoubGVuZ3RoKSBvYmogPSB2YWx1ZXMob2JqKTtcbiAgICByZXR1cm4gaW5kZXhPZihvYmosIHRhcmdldCkgPj0gMDtcbn1cblxuZnVuY3Rpb24gdW5pcXVlSWQocHJlZml4KSB7XG4gICAgdmFyIGlkID0gKytfX2lkQ291bnRlciArICcnO1xuICAgIHJldHVybiBwcmVmaXggPyBwcmVmaXggKyBpZCA6IGlkO1xufSAgXG5cbmZ1bmN0aW9uIHRpbWVzKG4sIGZ1bmMpIHtcbiAgICB2YXIgcmVzdWx0cyA9IFtdO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgbjsgaSsrKSB7XG4gICAgICAgIHJlc3VsdHMucHVzaChmdW5jKG4pKTtcbiAgICB9XG4gICAgcmV0dXJuIHJlc3VsdHM7XG59XG5cbmZ1bmN0aW9uIGNsb25lKG9iaikge1xuICAgIGlmICghaXNPYmplY3Qob2JqKSkgcmV0dXJuIG9iajtcbiAgICByZXR1cm4gaXNBcnJheShvYmopID8gb2JqLnNsaWNlKCkgOiBleHRlbmQoe30sIG9iaik7XG59XG5cbmZ1bmN0aW9uIGV4dGVuZChvYmopIHtcbiAgICBpZiAoIWlzT2JqZWN0KG9iaikpIHJldHVybiBvYmo7XG4gICAgdmFyIHNvdXJjZSwgcHJvcDtcbiAgICBmb3IgKHZhciBpID0gMSwgbGVuZ3RoID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGxlbmd0aDsgaSsrKSB7XG4gICAgICAgIHNvdXJjZSA9IGFyZ3VtZW50c1tpXTtcbiAgICAgICAgZm9yIChwcm9wIGluIHNvdXJjZSkge1xuICAgICAgICAgICAgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzb3VyY2UsIHByb3ApKSB7XG4gICAgICAgICAgICAgICAgb2JqW3Byb3BdID0gc291cmNlW3Byb3BdO1xuICAgICAgICAgICAgfVxuICAgICAgICB9XG4gICAgfVxuICAgIHJldHVybiBvYmo7XG59XG5cbmZ1bmN0aW9uIGlzVW5kZWZpbmVkKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHZvaWQgMDtcbn1cblxuZnVuY3Rpb24gaXNBcnJheShvYmopIHtcbiAgICBpZiAoQXJyYXkuaXNBcnJheSkgcmV0dXJuIEFycmF5LmlzQXJyYXkob2JqKTtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IEFycmF5XSc7XG59XG5cbmZ1bmN0aW9uIGlzT2JqZWN0KG9iaikge1xuICAgIHZhciB0eXBlID0gdHlwZW9mIG9iajtcbiAgICByZXR1cm4gdHlwZSA9PT0gJ2Z1bmN0aW9uJyB8fCB0eXBlID09PSAnb2JqZWN0JyAmJiAhIW9iajtcbn1cblxuZnVuY3Rpb24gaXNOdW1iZXIob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBOdW1iZXJdJztcbn1cblxuZnVuY3Rpb24gaXNTdHJpbmcob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopID09PSAnW29iamVjdCBTdHJpbmddJztcbn1cblxuZnVuY3Rpb24gaXNCb29sZWFuKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IHRydWUgfHwgb2JqID09PSBmYWxzZSB8fCBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgQm9vbGVhbl0nO1xufVxuXG5mdW5jdGlvbiBpc1JlZ0V4cChvYmopIHtcbiAgICByZXR1cm4gT2JqZWN0LnByb3RvdHlwZS50b1N0cmluZy5jYWxsKG9iaikgPT09ICdbb2JqZWN0IFJlZ0V4cF0nO1xufVxuXG5mdW5jdGlvbiBpc0Z1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKSA9PT0gJ1tvYmplY3QgRnVuY3Rpb25dJztcbn1cblxuZnVuY3Rpb24gaXNOdWxsKG9iaikge1xuICAgIHJldHVybiBvYmogPT09IG51bGw7XG59XG5cbmZ1bmN0aW9uIGlzTmFOKG9iaikge1xuICAgIHJldHVybiBpc051bWJlcihvYmopICYmIG9iaiAhPT0gK29iajtcbn1cblxuZnVuY3Rpb24gaGFzKG9iaiwga2V5KSB7XG4gICAgcmV0dXJuIG9iaiAhPSBudWxsICYmIE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChvYmosIGtleSk7XG59XG5cbmZ1bmN0aW9uIGRhc2hlcml6ZSh3aGF0KSB7XG4gICAgcmV0dXJuIHdoYXQucmVwbGFjZSgvKFtBLVpcXGRdKykoW0EtWl1bYS16XSkvZywnJDFfJDInKVxuICAgICAgICAucmVwbGFjZSgvKFthLXpcXGRdKShbQS1aXSkvZywnJDFfJDInKVxuICAgICAgICAudG9Mb3dlckNhc2UoKS5yZXBsYWNlKC9fL2csICctJyk7XG59XG5cbmZ1bmN0aW9uIHN0YXJ0c1dpdGgoc291cmNlLCBzdGFydCkgeyBcbiAgICByZXR1cm4gc291cmNlLmluZGV4T2Yoc3RhcnQpID09PSAwOyBcbn1cblxuZnVuY3Rpb24gZm9jdXMoZWxlbSkgeyBcbiAgICBpZiAoZWxlbS5mb2N1cykgZWxlbS5mb2N1cygpO1xufVxuXG5mdW5jdGlvbiBoYXNGb2N1cyhlbGVtKSB7IFxuICAgIHJldHVybiBlbGVtID09PSBkb2N1bWVudC5hY3RpdmVFbGVtZW50ICYmICghZG9jdW1lbnQuaGFzRm9jdXMgfHwgZG9jdW1lbnQuaGFzRm9jdXMoKSkgJiYgISEoZWxlbS50eXBlIHx8IGVsZW0uaHJlZiB8fCB+ZWxlbS50YWJJbmRleCk7IFxufVxuXG5mdW5jdGlvbiBvbihub2RlLCB0eXBlcywgY2FsbGJhY2spIHtcbiAgICB2YXIgYWN0dWFsID0gaXNTdHJpbmcobm9kZSkgPyBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKG5vZGUpIDogbm9kZTtcbiAgICBlYWNoKHR5cGVzLCBmdW5jdGlvbih0eXBlKSB7XG4gICAgICAgIGlmIChhY3R1YWwgJiYgYWN0dWFsICE9PSBudWxsKSBhY3R1YWwuYWRkRXZlbnRMaXN0ZW5lcih0eXBlLCBjYWxsYmFjayk7XG4gICAgfSk7XG59XG5cbmZ1bmN0aW9uIGZpbmROb2RlKHNlbGVjdG9yKSB7XG4gICAgcmV0dXJuIGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3Iobm9kZSk7XG59XG5cbmV4cG9ydHMuZXNjYXBlID0gY3JlYXRlRXNjYXBlcihlc2NhcGVNYXAsIGtleXMpO1xuZXhwb3J0cy5rZXlzID0ga2V5cztcbmV4cG9ydHMudmFsdWVzID0gdmFsdWVzO1xuZXhwb3J0cy5pbmRleE9mID0gaW5kZXhPZjtcbmV4cG9ydHMuZWFjaCA9IGVhY2g7XG5leHBvcnRzLm1hcCA9IG1hcDtcbmV4cG9ydHMuZmlsdGVyID0gZmlsdGVyO1xuZXhwb3J0cy5jaGFpbiA9IGNoYWluO1xuZXhwb3J0cy5jb250YWlucyA9IGNvbnRhaW5zO1xuZXhwb3J0cy51bmlxdWVJZCA9IHVuaXF1ZUlkO1xuZXhwb3J0cy50aW1lcyA9IHRpbWVzO1xuZXhwb3J0cy5jbG9uZSA9IGNsb25lO1xuZXhwb3J0cy5leHRlbmQgPSBleHRlbmQ7XG5leHBvcnRzLmlzVW5kZWZpbmVkID0gaXNVbmRlZmluZWQ7XG5leHBvcnRzLmlzQXJyYXkgPSBpc0FycmF5O1xuZXhwb3J0cy5pc09iamVjdCA9IGlzT2JqZWN0O1xuZXhwb3J0cy5pc051bWJlciA9IGlzTnVtYmVyO1xuZXhwb3J0cy5pc1N0cmluZyA9IGlzU3RyaW5nO1xuZXhwb3J0cy5pc0Jvb2xlYW4gPSBpc0Jvb2xlYW47XG5leHBvcnRzLmlzUmVnRXhwID0gaXNSZWdFeHA7XG5leHBvcnRzLmlzRnVuY3Rpb24gPSBpc0Z1bmN0aW9uO1xuZXhwb3J0cy5pc051bGwgPSBpc051bGw7XG5leHBvcnRzLmlzTmFOID0gaXNOYU47XG5leHBvcnRzLmhhcyA9IGhhcztcbmV4cG9ydHMuZGFzaGVyaXplID0gZGFzaGVyaXplO1xuZXhwb3J0cy5zdGFydHNXaXRoID0gc3RhcnRzV2l0aDtcbmV4cG9ydHMuZm9jdXMgPSBmb2N1cztcbmV4cG9ydHMuaGFzRm9jdXMgPSBoYXNGb2N1cztcbmV4cG9ydHMub24gPSBvbjtcbmV4cG9ydHMuZmluZE5vZGUgPSBmaW5kTm9kZTtcbmV4cG9ydHMucmVkdWNlID0gcmVkdWNlO1xuZXhwb3J0cy5yZWplY3QgPSByZWplY3Q7XG5leHBvcnRzLndoZXJlID0gd2hlcmU7XG5leHBvcnRzLm1hdGNoZXMgPSBtYXRjaGVzO1xuZXhwb3J0cy5uZWdhdGUgPSBuZWdhdGU7XG5leHBvcnRzLnByb3BlcnR5ID0gcHJvcGVydHk7XG5leHBvcnRzLmlkZW50aXR5ID0gaWRlbnRpdHk7XG5leHBvcnRzLnBhaXJzID0gcGFpcnM7IiwiXG52YXIgcmVnaXN0cmF0aW9uRnVuY3Rpb24gPSAoZG9jdW1lbnQucmVnaXN0ZXJFbGVtZW50IHx8IGRvY3VtZW50LnJlZ2lzdGVyIHx8IGZ1bmN0aW9uKCkge1xuICAgIGNvbnNvbGUuZXJyb3IoJ05vIHJlZ2lzdGVyRWxlbWVudCBmdW5jdGlvbiwgd2ViY29tcG9uZW50cyB3aWxsIG5vdCB3b3JrICEhIScpO1xufSkuYmluZChkb2N1bWVudCk7XG5cbmZ1bmN0aW9uIHJlZ2lzdGVyV2ViQ29tcG9uZW50KHRhZywgZWxlbSkge1xuICB2YXIgdGhhdERvYyA9IGRvY3VtZW50O1xuICB2YXIgRWxlbWVudFByb3RvID0gT2JqZWN0LmNyZWF0ZShIVE1MRWxlbWVudC5wcm90b3R5cGUpO1xuICBcbiAgRWxlbWVudFByb3RvLmNyZWF0ZWRDYWxsYmFjayA9IGZ1bmN0aW9uKCkge1xuICAgIHZhciBwcm9wcyA9IHt9O1xuICAgIGZvciAodmFyIGkgaW4gdGhpcy5hdHRyaWJ1dGVzKSB7XG4gICAgICB2YXIgaXRlbSA9IHRoaXMuYXR0cmlidXRlc1tpXTtcbiAgICAgIHByb3BzW2l0ZW0ubmFtZV0gPSBpdGVtLnZhbHVlOyAgICBcbiAgICB9XG4gICAgdGhpcy5wcm9wcyA9IHByb3BzO1xuICAgIHZhciBub2RlID0gdGhpcztcbiAgICBpZiAocHJvcHMubm9zaGFkb3cgIT09ICd0cnVlJykge1xuICAgICAgdmFyIHNoYWRvd1Jvb3QgPSB0aGlzLmNyZWF0ZVNoYWRvd1Jvb3QoKTtcbiAgICAgIG5vZGUgPSB0aGF0RG9jLmNyZWF0ZUVsZW1lbnQoJ2RpdicpO1xuICAgICAgbm9kZS5zZXRBdHRyaWJ1dGUoJ2NsYXNzJywgJ2VsZW1jb21wb25lbnQnKTtcbiAgICAgIHNoYWRvd1Jvb3QuYXBwZW5kQ2hpbGQobm9kZSk7XG4gICAgfVxuICAgIHRoaXMuX25vZGUgPSBub2RlO1xuICAgIGlmIChwcm9wcy5yZW5kZXJPbmx5ICYmIHByb3BzLnJlbmRlck9ubHkgPT09IHRydWUpIHtcbiAgICAgIHRoaXMucmVuZGVyZWRFbGVtZW50ID0gRWxlbS5yZW5kZXIoZWxlbSwgbm9kZSk7IFxuICAgIH0gZWxzZSB7XG4gICAgICB0aGlzLnJlbmRlcmVkRWxlbWVudCA9IEVsZW0uY29tcG9uZW50KHtcbiAgICAgICAgY29udGFpbmVyOiBub2RlLFxuICAgICAgICBpbml0OiBlbGVtLmluaXQsXG4gICAgICAgIHJlbmRlcjogZWxlbS5yZW5kZXIsXG4gICAgICAgIHByb3BzOiBwcm9wcyxcbiAgICAgICAgc3RhdGU6IGVsZW0uc3RhdGVcbiAgICAgIH0pOyBcbiAgICB9XG4gIH07XG5cbiAgRWxlbWVudFByb3RvLmF0dHJpYnV0ZUNoYW5nZWRDYWxsYmFjayA9IGZ1bmN0aW9uIChhdHRyLCBvbGRWYWwsIG5ld1ZhbCkge1xuICAgIHRoaXMucHJvcHNbYXR0cl0gPSBuZXdWYWw7XG4gICAgdmFyIHByb3BzID0gdGhpcy5wcm9wcztcbiAgICBpZiAodGhpcy5wcm9wcy5yZW5kZXJPbmx5ICYmIHRoaXMucHJvcHMucmVuZGVyT25seSA9PT0gdHJ1ZSkge1xuICAgICAgdGhpcy5yZW5kZXJlZEVsZW1lbnQgPSBFbGVtLnJlbmRlcihlbGVtLCB0aGlzLl9ub2RlKTsgXG4gICAgfSBlbHNlIHtcbiAgICAgIHRoaXMucmVuZGVyZWRFbGVtZW50ID0gRWxlbS5jb21wb25lbnQoe1xuICAgICAgICBjb250YWluZXI6IHRoaXMuX25vZGUsXG4gICAgICAgIGluaXQ6IGVsZW0uaW5pdCxcbiAgICAgICAgcmVuZGVyOiBlbGVtLnJlbmRlcixcbiAgICAgICAgcHJvcHM6IHByb3BzLFxuICAgICAgICBzdGF0ZTogZWxlbS5zdGF0ZVxuICAgICAgfSk7XG4gICAgfVxuICB9O1xuXG4gIHJlZ2lzdHJhdGlvbkZ1bmN0aW9uKHRhZywge1xuICAgIHByb3RvdHlwZTogRWxlbWVudFByb3RvXG4gIH0pO1xufVxuXG5leHBvcnRzLnJlZ2lzdGVyV2ViQ29tcG9uZW50ID0gcmVnaXN0ZXJXZWJDb21wb25lbnQ7XG4iXX0=
