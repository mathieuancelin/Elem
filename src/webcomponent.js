
var registrationFunction = (document.registerElement || document.register).bind(document);
if (registrationFunction === undefined) {
  console.error('No registerElement function, webcomponents will not work !!!');
}

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
      node.setAttribute('id', 'reactcomponent');
      shadowRoot.appendChild(node);
    }
    this._node = node;
    if (props.renderOnly && props.renderOnly === true) {
      this.renderedElement = Elem.render(elem, node); 
    } else {
      this.renderedElement = Elem.component({
        container: node,
        init: elem.init,
        render: elem.render,
        props: props,
        state: elem.state
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

exports.registerWebComponent = registerWebComponent;
