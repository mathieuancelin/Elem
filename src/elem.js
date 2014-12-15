var Common = require('./common');
var _ = require('./utils');
var component = require('./component');
var state = require('./state');
var registerWebComponent = require('./webcomponent').registerWebComponent;
var Stringifier = require('./stringify');

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
            if (!selfCloseTag) {
                if (_.isArray(children)) {
                    _.each(children, function(child) {
                        element.appendChild(child.toHtmlNode(doc, context)); 
                    });
                } else if (_.isNumber(children)) {
                    element.appendChild(doc.createTextNode(children + ''));
                } else if (_.isString(children)) {
                    element.appendChild(doc.createTextNode(children));
                } else if (_.isBoolean(children)) {
                    element.appendChild(doc.createTextNode(children + ''));
                } else if (_.isObject(children) && children.isElement) {
                    element.appendChild(children.toHtmlNode(doc, context)); 
                } else if (_.isObject(children) && children.__asHtml) {
                    element.innerHTML = children.__asHtml;
                } else {
                    element.appendChild(doc.createTextNode(children.toString()));
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
    return _.map(renderToNode(el, Stringifier()), function(n) { return n.toHtmlString(); }).join('');
};

exports.el = el;

exports.sel = function(name, children) { return el(name, {}, children); }; // simple node sel(name, children)

exports.vel = function(name, attrs) { return el(name, attrs, []); }; // void node, cel(name, attrs)

exports.nbsp = function(times) { return el('span', { __asHtml: _.times(times || 1, function() { return '&nbsp;'; }) }); };

exports.text = function(text) { return el('span', {}, text); };

exports.elements = function() { return _.map(arguments, function(item) { return item; }); };

exports.render = function(el, node, context) {
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
            _.on('[data-nodeid="' + handler.id + '"]', handler.event.replace('on', ''), function() {
                handler.callback.apply({}, arguments);
            });   
        });
    }
};
exports.component = component;
exports.state = state;
exports.Utils = _;
exports.registerWebComponent = registerWebComponent;