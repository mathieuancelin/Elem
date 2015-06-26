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
  var defaultProps = opts.defaultProps || function() { return {}; };
  var initialState = opts.initialState || function() { return {}; };
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
  var getDOMNode = function() { return _.findNode(el); };
  opts.context = { refs: {}, getDOMNode: getDOMNode };
  var eventsCallback = function(e) { // bubbles listener, TODO : handle mouse event in a clever way
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
      _.each(innerComponents, function(c) { unmountComponent(c); });
      innerComponents = [];
      beforeRender(state, _.clone(props), opts.context);
      Common.markStart(name + '.render');
      var elemToRender = render(state, _.clone(props), opts.context);
      Common.markStop(name + '.render');
      Elem.render(elemToRender, el, { waitingHandlers: waitingHandlers, __rootListener: true, refs: opts.context.refs, __innerComponents: innerComponents });
      afterRender(state, _.clone(props), opts.context);
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
  var Elem = Common.__internalAccess.api;
  var name = opts.name || 'Component';
  var defaultProps = opts.defaultProps || function() { return {}; };
  var initialState = opts.initialState || function() { return {}; };
  var state = State(initialState());
  var props = defaultProps();
  opts.props = props;
  opts.state = state.all();
  opts.setState = state.set;
  opts.replaceState = state.replace;
  opts.context = { refs: refs, getDOMNode: function() {} };
  // autobinding
  _.each(_.keys(opts), function(k) {
    if (_.isFunction(opts[k])) {
      opts[k] = opts[k].bind(opts);
    }
  });
  var render = opts.render;
  var afterRender = opts.afterRender || function() {};
  if (opts.init) { opts.init(state, _.clone(props)); }
  Common.markStart(name + '.globalRendering');
  var refs = {};
  Common.markStart(name + '.render');
  var elemToRender = render(state, _.clone(props), opts.context);
  Common.markStop(name + '.render');
  var str = Elem.renderToString(elemToRender, { waitingHandlers: [], __rootListener: true, refs: refs, __noDataId: nodataid, __innerComponents: [] });
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
