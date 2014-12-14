var Common = require('./common');
var _ = require('./utils');

module.exports = function(opts) {
  var el = opts.container;
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
          while(!eventCallbacks[name] && node.dataset.nodeid) {
              node = node.parentElement;
              name = node.dataset.nodeid + "_" + e.type;
          }
          if (eventCallbacks[name]) {
              eventCallbacks[name](e);    
          }
      }
  });
  function rerender() {
      _.each(oldHandlers, function(handler) {
          delete eventCallbacks[handler];
      });
      oldHandlers = [];
      var focus = document.activeElement; // TODO : check if input/select/textarea, remember cursor position here
      var key = focus.dataset.key; //$(focus).data('key');
      var waitingHandlers = [];
      var refs = {};
      Elem.render(render(state, _.clone(props), { refs: refs, getDOMNode: getDOMNode }), el, { waitingHandlers: waitingHandlers, __rootListener: true, refs: refs });
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
  }
  rerender();
  state.onChange(rerender);
  return state;
};