var Elem = Elem || {};
(function(exports) {
    var voidElements = ["AREA","BASE","BR","COL","COMMAND","EMBED","HR","IMG","INPUT","KEYGEN","LINK","META","PARAM","SOURCE","TRACK","WBR"];
    var debug = false;
    function styleToString(attrs) {
        if (_.isUndefined(attrs)) return '';
        var attrsArray = _.map(_.keys(attrs), function(key) {
            var keyName = key.dasherize();
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

    function classToArray(attrs) {
        if (_.isUndefined(attrs)) return [];
        var attrsArray = _.map(_.keys(attrs), function(key) {
            var value = attrs[key];
            if (!_.isUndefined(value) && value === true) {
                return key.dasherize();
            } else {
                return undefined;
            }
        });
        attrsArray = _.filter(attrsArray, function(item) { return !_.isUndefined(item); });
        return attrsArray;
    }

    function buildRef(id) {
        return {
            getDOMNode: function() {
                return $('[data-nodeid="' + id + '"]');
            }
        };
    }

    function objToString(node, context) {
        if (_.isUndefined(node.attrs)) return '';
        var attrsArray = _.map(_.keys(node.attrs), function(key) {
            var keyName = key.dasherize();
            if (key === 'className') {
                keyName = 'class';
            }
            if (keyName.startsWith('on')) {
                if (context && context.waitingHandlers) {
                    context.waitingHandlers.push({
                        root: context.root,
                        id: node.nodeId,
                        event: keyName,
                        callback: node.attrs[key]
                    });
                }
                return undefined;
            } else {
                var value = node.attrs[key];
                if (keyName === 'ref' && context && context.refs) {
                    context.refs[value] = buildRef(node.nodeId);
                    return undefined;
                }
                if (!_.isUndefined(value) && _.isFunction(value)) {
                    value = value();
                }
                if (!_.isUndefined(value)) {
                    if (_.isObject(value) && keyName === 'style') {
                        return keyName + '="' + styleToString(value) + '"';
                    } else if (_.isArray(value) && keyName === 'class') {
                        return keyName + '="' + value.join(' ') + '"';
                    } else if (_.isObject(value) && keyName === 'class') {
                        return keyName + '="' + classToArray(value).join(' ') + '"';
                    } else {
                        return keyName + '="' + value + '"';
                    }
                } else {
                    return undefined;
                }
            }
        });
        attrsArray = _.filter(attrsArray, function(item) { return !_.isUndefined(item); });
        return attrsArray.join(' ');
    }

    function wrapChildren(children) {
        if (children === 0) {
            return children;
        } else if (children === '') {
            return children;
        }
        return children || [];
    }

    function toHtml(node, context) {
        node.name = node.name || 'unknown';
        node.attrs = node.attrs || {};
        node.children = wrapChildren(node.children);
        var selfCloseTag = _.contains(voidElements, node.name.toUpperCase())
            && ((_.isNull(node.children) || _.isUndefined(node.children)) || (_.isArray(node.children) && node.children.length === 0));
        var html = '<' + _.escape(node.name) + ' data-nodeid="' + _.escape(node.nodeId) + '" ' + objToString(node, context);
        if (debug) html = html + (' title="' + node.nodeId) + '"';
        if (selfCloseTag) {
            html = html + '/>';
        } else {
            html = html + '>';
            if (_.isArray(node.children)) {
                var elementsToHtml = _.chain(node.children).map(function(child) {
                    if (_.isFunction(child)) {
                        return child();
                    } else {
                        return child;
                    }
                }).filter(function(item) {
                    return !_.isUndefined(item);
                }).map(function(child) {
                    return toHtml(child, context);
                }).value().join('');
                html = html + elementsToHtml;
            } else if (_.isNumber(node.children)) {
                html = html + node.children;
            } else if (_.isString(node.children)) {
                html = html + _.escape(node.children);
            } else if (_.isBoolean(node.children)) {
                html = html + node.children;
            } else if (_.isObject(node.children) && node.children.isElement) {
                html = html + toHtml(node.children, context);
            } else if (_.isObject(node.children) && node.children.__asHtml) {
                html = html + node.children.__asHtml;
            } else if (_.isRegExp(node.children) || _.isUndefined(node.children) || _.isNull(node.children)) { // do nothing
            } else {
                html = html + _.escape(node.children.toString());
            }
            html = html + '</' + node.name + '>';
        }
        return html;
    }

    function el(name, attrs, children) {
        if (_.isUndefined(children) && !_.isUndefined(attrs) && !attrs.__isAttrs) {
            children = attrs;
            attrs = {};
        }
        return {
            name: name || 'unknown',
            attrs: attrs || {},
            children: wrapChildren(children),
            isElement: true,
            nodeId: _.uniqueId('node_')
        };
    }

    function renderToString(el, context) {
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
                    return toHtml(item, context);
                }).value().join('');
            } else {
                return toHtml(el, context);
            }
        } else {
            return '';
        }
    }
    exports.el = el;
    exports.sel = function(name, children) { return el(name, {}, children); };// simple node sel(name, children)
    exports.vel = function(name, attrs) { return el(name, attrs, []); };  // node without content, cel(name, attrs)
    exports.nbsp = function(times) { return el('span', { __asHtml: _.times(times || 1, function() { return '&nbsp;'; }) }); };
    exports.text = function(value) { return el('span', value); };
    exports.renderToString = renderToString;
    exports.spans = function() {
        return _.map(arguments, function(text) {
            return exports.text(text);
        });
    };
    exports.elements = function() {
        var elems = [];
        _.each(arguments, function(item) {
            elems.push(item);
        });
        return elems;
    };
    exports.render = function(el, node, refs) {
        var waitingHandlers = [];
        var html = renderToString(el, { root: node, waitingHandlers: waitingHandlers, refs: refs, props: {} });
        if (_.isString(node)) {
            $(node).html(html);
        } else if (node.jquery) {
            node.html(html);
        } else {
            node.innerHTML = html;
        }
        _.each(waitingHandlers, function(handler) {
            $('[data-nodeid="' + handler.id + '"]').on(handler.event.replace('on', ''), function() {
                handler.callback.apply({}, arguments);
            });
        });
    };
    exports.component = function(opts) {
        var el = opts.container;
        var model = opts.state || Elem.state();
        var render = opts.render;
        var props = opts.props || {};
        var refs = {};
        var getDOMNode = function() { return $(el); };
        if (opts.init) {
            opts.init(model, props);
        }
        Elem.render(render(model, props, { refs: refs, getDOMNode: getDOMNode }), el, refs);
        model.onChange(function() {
            refs = {};
            Elem.render(render(model, props, { refs: refs, getDOMNode: getDOMNode }), el, refs);
        });
        return model;
    };
    exports.state = function(mod) {
        var theModel = _.extend({}, mod || {});
        var callbacks = [];
        function fireCallbacks() {
            _.each(callbacks, function(callback) { callback(); });
        }
        return {
            onChange: function(callback) { callbacks.push(callback); },
            get: function(key) { return theModel[key]; },
            all: function() { return _.clone(theModel); },
            forceUpdate: function() { fireCallbacks(); },
            set: function(obj, silentOrCallback) {
                var silent = _.isBoolean(silentOrCallback) && silentOrCallback === true;
                if (!_.isUndefined(obj) && _.isObject(obj)) {
                    _.map(_.keys(obj), function(k) {
                        theModel[k] = obj[k];
                    });
                    if (!silent) fireCallbacks();
                    if (!silent) (silentOrCallback || function() {})();
                }
            },
            replace: function(obj, silentOrCallback) {
                theModel = {};
                this.set(obj, silentOrCallback);
            }
        };
    };
})(Elem);