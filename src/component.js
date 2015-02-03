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
    // TODO : find a way to remove all listeners
  }
}

function mountComponent(el, opts) {
  var name = opts.name || 'Component';
  var state = opts.state || Elem.state();
  var props = opts.props || {};
  var eventCallbacks = {};
  var oldHandlers = [];
  var innerComponents = [];
  var init = (opts.init || function() {}).bind(opts);
  var beforeRender = (opts.beforeRender || function() {}).bind(opts);
  var render = (opts.render || function() {}).bind(opts);
  var afterRender = (opts.afterRender || function() {}).bind(opts);
  var unmount = (opts.unmount || function() {}).bind(opts);
  var getDOMNode = function() { return _.findNode(el); };
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
    unmount(state, _.clone(props), { refs: {}, getDOMNode: getDOMNode });
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
      var refs = {};
      var waitingHandlers = [];
      _.each(innerComponents, function(c) { unmountComponent(c); });
      innerComponents = [];
      beforeRender(state, _.clone(props), { refs: refs, getDOMNode: getDOMNode });
      Common.markStart(name + '.render');
      var elemToRender = render(state, _.clone(props), { refs: refs, getDOMNode: getDOMNode });
      Common.markStop(name + '.render');
      Elem.render(elemToRender, el, { waitingHandlers: waitingHandlers, __rootListener: true, refs: refs, __innerComponents: innerComponents });
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
  var str = Elem.renderToString(elemToRender, { waitingHandlers: [], __rootListener: true, refs: refs, __noDataId: nodataid, __innerComponents: [] });
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