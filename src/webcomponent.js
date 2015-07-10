var EventBus = require('./events');
var Utils = require('./utils');
var registrationFunction = undefined

try {
  registrationFunction = (document.registerElement || document.register || function() {
    if (window.console) console.error('[ELEMJS] No registerElement function, webcomponents will not work !!!');
  }).bind(document);
} catch (e) {}

var Bus = EventBus();

function registerWebComponent(tag, elem) {
  var thatDoc = document;
  var ElementProto = Object.create(HTMLElement.prototype);

  ElementProto.createdCallback = function() {
    var elemInstance = Utils.extend({}, elem);
    this._id = Utils.uniqueId('WebComponent_');
    var props = {};
    for (var i in this.attributes) {
      var item = this.attributes[i];
      props[item.name] = item.value;
    }
    this.props = props;
    var theNode = undefined;
    theNode = thatDoc.createElement('content');
    theNode.setAttribute('class', 'elemcomponent');
    theNode.setAttribute('id', this._id);
    if (props.shadow) {
      var shadowRoot = this.createShadowRoot();
      shadowRoot.appendChild(theNode);
    } else {
      this.appendChild(theNode);
    }
    this._theNode = theNode;
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
      this.renderedElement = Elem.render(elemInstance, node);
    } else {
      this.renderedElement = Elem.component({
        container: theNode,
        init: elemInstance.init,
        render: elemInstance.render,
        defaultProps: function() {
          return props;
        },
        initialState: elemInstance.initialState
      });
    }
  };

  ElementProto.attributeChangedCallback = function(attr, oldVal, newVal) {
    var elemInstance = Utils.extend({}, elem);
    this.props[attr] = newVal;
    var props = this.props;
    if (this.props.renderOnly && this.props.renderOnly === true) {
      this.renderedElement = Elem.render(elemInstance, this._node);
    } else {
      this.renderedElement = Elem.component({
        container: this._node,
        init: elemInstance.init,
        render: elemInstance.render,
        props: props,
        state: elemInstance.state
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
