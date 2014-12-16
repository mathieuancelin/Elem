var Common = require('./common');
var _ = require('./utils');

exports.component = function(opts) {
  if (!opts.container) return exports.componentFactory(opts);
  var el = opts.container;
  var name = opts.name || 'Component';
  var state = opts.state || Elem.state();
  var props = opts.props || {};
  var render = opts.render;
  var eventCallbacks = {};
  var oldHandlers = [];
  var afterRender = opts.afterRender || function() {};
  var getDOMNode = function() { return _.findNode(el); };
  if (opts.init) { opts.init(state, _.clone(props)); }
  _.on(el, Common.events + ' ' + Common.mouseEvents, function(e) { // bubbles listener, TODO : handle mouse event in a clever way
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
};

exports.componentFactory = function(opts) {
  return function(props) {
    return {
      __componentFactory: true,
      renderTo: function(el) {
        var opt = _.clone(opts);
        opt.container = el;
        opt.props = _.extend(_.clone(opts.props || {}), props || {});
        Common.defer(function() {
          exports.component(opt);
        });
      }
    };  
  }
};