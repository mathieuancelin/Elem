var ElemUtils = ElemUtils || {};
(function(exports) {
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
    var underscore = {
        keys: function(obj) {
            if (!underscore.isObject(obj)) return [];
            if (Object.keys) return Object.keys(obj);
            var keys = [];
            for (var key in obj) if (underscore.has(obj, key)) keys.push(key);
            return keys;
        },
        values: function(obj) {
            var keys = underscore.keys(obj);
            var length = keys.length;
            var values = Array(length);
            for (var i = 0; i < length; i++) {
                values[i] = obj[keys[i]];
            }
            return values;
        },
        indexOf: function(array, item, isSorted) {
            if (array == null) return -1;
            var i = 0, length = array.length;
            if (isSorted) {
                if (typeof isSorted == 'number') {
                    i = isSorted < 0 ? Math.max(0, length + isSorted) : isSorted;
                } else {
                    i = underscore.sortedIndex(array, item);
                    return array[i] === item ? i : -1;
                }
            }
            for (; i < length; i++) if (array[i] === item) return i;
            return -1;
        },
        each: function(obj, func) {
            if (obj == null) return obj;
            var i, length = obj.length;
            if (length === +length) {
                for (i = 0; i < length; i++) {
                    func(obj[i], i, obj);
                }
            } else {
                var keys = underscore.keys(obj);
                for (i = 0, length = keys.length; i < length; i++) {
                    func(obj[keys[i]], keys[i], obj);
                }
            }
            return obj;
        },
        map: function(obj, func) {
            if (obj == null) return [];
            var keys = obj.length !== +obj.length && underscore.keys(obj),
                length = (keys || obj).length,
                results = Array(length),
                currentKey;
            for (var index = 0; index < length; index++) {
                currentKey = keys ? keys[index] : index;
                results[index] = func(obj[currentKey], currentKey, obj);
            }
            return results;
        },
        filter: function(obj, predicate) {
            var results = [];
            if (obj == null) return results;
            underscore.each(obj, function(value, index, list) {
                if (predicate(value, index, list)) results.push(value);
            });
            return results;
        },
        chain: function(obj) {
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
                    }
                };
            }
            return chainableApi();
        },
        contains: function(obj, target) {
            if (obj == null) return false;
            if (obj.length !== +obj.length) obj = underscore.values(obj);
            return underscore.indexOf(obj, target) >= 0;
        },
        uniqueId: function(prefix) {
            var id = ++__idCounter + '';
            return prefix ? prefix + id : id;
        },  
        times: function(n, func) {
            var results = [];
            for (var i = 0; i < n; i++) {
                results.push(func(n));
            }
            return results;
        },
        clone: function(obj) {
            if (!underscore.isObject(obj)) return obj;
            return underscore.isArray(obj) ? obj.slice() : underscore.extend({}, obj);
        },
        extend: function(obj) {
            if (!underscore.isObject(obj)) return obj;
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
        },
        isUndefined: function(obj) {
            return obj === void 0;
        },
        isArray: function(obj) {
            if (Array.isArray) return Array.isArray(obj);
            return Object.prototype.toString.call(obj) === '[object Array]';
        },
        isObject: function(obj) {
            var type = typeof obj;
            return type === 'function' || type === 'object' && !!obj;
        },
        isNumber: function(obj) {
            return Object.prototype.toString.call(obj) === '[object Number]';
        },
        isString: function(obj) {
            return Object.prototype.toString.call(obj) === '[object String]';
        },
        isBoolean: function(obj) {
            return obj === true || obj === false || Object.prototype.toString.call(obj) === '[object Boolean]';
        },
        isRegExp: function(obj) {
            return Object.prototype.toString.call(obj) === '[object RegExp]';
        },
        isFunction: function(obj) {
            return Object.prototype.toString.call(obj) === '[object Function]';
        },
        isNull: function(obj) {
            return obj === null;
        },
        isNaN: function(obj) {
            return underscore.isNumber(obj) && obj !== +obj;
        },
        has: function(obj, key) {
            return obj != null && Object.prototype.hasOwnProperty.call(obj, key);
        },
        dasherize: function(what) {
            return what.replace(/([A-Z\d]+)([A-Z][a-z])/g,'$1_$2')
                .replace(/([a-z\d])([A-Z])/g,'$1_$2')
                .toLowerCase().replace(/_/g, '-');
        },
        startsWith: function(source, start) { 
            return source.indexOf(start) === 0; 
        },
        focus: function(elem) { 
            if (elem.focus) elem.focus();
        },
        hasFocus: function(elem) { 
            return elem === document.activeElement && (!document.hasFocus || document.hasFocus()) && !!(elem.type || elem.href || ~elem.tabIndex); 
        },
        on: function(node, types, callback) {
            if ($) {
                $(node).on(types, callback);
            } else {
                underscore.each(types.split(' '), function(type) {
                    if (underscore.isString(node)) {
                        document.querySelector(node).addEventListener(type, callback);
                    } else {
                        node.addEventListener(type, callback);
                    }
                });
            }
        },
        findNode: function(selector) {
            return document.querySelector(node);
        }
    };
    underscore.escape = createEscaper(escapeMap, underscore.keys);
    exports.underscore = underscore;
})(ElemUtils);