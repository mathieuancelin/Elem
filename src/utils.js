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