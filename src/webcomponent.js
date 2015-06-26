
var EventBus = require('./events');
var Utils = require('./utils');
var registrationFunction = undefined

try {
  registrationFunction = (document.registerElement || document.register || function() {
      if (window.console) console.error('[ELEMJS] No registerElement function, webcomponents will not work !!!');
  }).bind(document);
} catch(e) {}

var Bus = EventBus();

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

    this._id = Utils.uniqueId('WebComponent_');
    this._internalBus = EventBus();
    this._internalBus._trigger = this._internalBus.trigger;
    this._internalBus.trigger = function(name, evt) {
      Bus.trigger('ElemEvent', {
        name: name,
        id: this._id,
        payload: evt
      });
    }.bind(this);

    Bus.on('ElemEvent', function(evt) {
      var from = evt.id;
      if (from !== this._id) {
        var name = evt.name;
        var payload = evt.payload;
        this._internalBus._trigger(name, payload);
      }
    }.bind(this));

    props.componentsBus = this._internalBus;

    if (props.renderOnly && props.renderOnly === true) {
      this.renderedElement = Elem.render(elem, node);
    } else {
      this.renderedElement = Elem.component({
        container: node,
        init: elem.init,
        render: elem.render,
        defaultProps: function() { return props; },
        initialState: elem.initialState
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
    if (window.console) console.error('[ELEMJS] WebComponent not available here :(');
  };
}
