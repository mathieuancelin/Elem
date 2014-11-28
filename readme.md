Elem.js
================

Simple and idiotic lib to build UI components. Elem.js is just a quick and dirty experiment to avoir string templates and string concat when modifying the DOM and does not care about performance at all (ie. recreate DOM nodes all the time).

How can I use Elem.js ?
----------------------------

First imports `Elem.min.js` in your page. Then you will be able to build your first node

```javascript
var MyAwesomeNode = Elem.el('h1', 'Hello World!');
Elem.render(MyAwesomeNode, '#container');
```

Of course, you can build much more complicated nodes 

```javascript
var node = Elem.el('div', { className: 'col-md-6' }, [
  Elem.el('h3', 'Hello World!'),
  Elem.el('p', { style: { backgroundColor: 'red' } }, "Lorem ipsum ....")
]);
Elem.render(MyAwesomeNode, '#container');
```

As you construct the node tree with functions and arrays, it is prettry easy to map and filter model objects to render your components easily (see the Todo List example above).

Attributes use camel case shaped keys, so something like `backgroundColor` will be rendered as `background-color`. Also, you can notice that the `class` attribute is named `className`. Also, you can provide an object for `className` value with boolean as values. Every key with a false value will not be rendered.

As children are just nodes in an array, it is really easy to add or remove elements from your UI. You can also pass undefined elements or functions that can return undefined to not render nodes.

If you want to provide a child as HTML value, just pass an object like `{__asHtml: '&nbsp;;-)'}`.

You can also attach callback to event on elements like 

```javascript
function saySomething() {
    alert("Something !");
}

var node = Elem.el('div', { className: 'col-md-6' }, [
  Elem.el('h3', 'Hello World!'),
  Elem.el('button', { className: ['btn', 'btn-primary'], onClick: saySomething }, 'Say something'),
  Elem.el('p', { style: { backgroundColor: 'red' } }, "Lorem ipsum ....")
]);
Elem.render(MyAwesomeNode, '#container');
```

Supported events are 

```
wheel scroll touchcancel touchend touchmove touchstart click doubleclick 
drag dragend dragenter dragexit dragleave dragover dragstart drop 
change input submit focus blur keydown keypress keyup copy cut paste
```

Can I create reusable components ?
-----------------------------------

Of course you can. You just need to to something like 

```javascript
var timer = Elem.component({
    container: '#timer',
    init: function(state, props) {
        state.set('time', 0);
        setInterval(function() {
            state.set('time', state.get('time') + 1);
        }, 1000);
    },
    render: function(state, props) {
        return Elem.el('span', 'Elapsed : ' + state.get('time'));
    }
});
```

when creating a component, you can define 

```javascript
{
    container: 'the container where the component will be rendered'
    init: 'init function that receive the state and props as parameters' 
    state: 'the state of the component. If undefined, an empty one will be created'
    props: 'properties for the component'
    render: 'function that will return an Elem node'
}
```

you can pass an external Backbone model as state or use `Elem.state({...})`. Each time the state is changed, the render function will be called and the components will be re-rendered. You can avoid that by using `state.set('key', 'value', false)`.

No let's write a more complicated component :

```javascript
function NewTask(state, props) {
  function deleteAllDone() {
      var tasks = _.filter(state.get('tasks'), function(item) {
          return item.done === false;
      });
      state.set('tasks', tasks);
  }
  function createNewTask() {
      var tasks = state.get('tasks');
      if (state.get('text') !== '') {
          tasks.push({
              _id: _.uniqueId('task_'),
              name: state.get('text'),
              done: false
          });
          state.set('text', '', false);
          state.set('tasks', tasks);
      }
  }
  function storeName(e) {
      var text = e.target.value;
      state.set('text', text, false);
      if (e.keyCode === 13) {
          createNewTask();
          e.preventDefault();
      }
  }
  return Elem.el('div',
      Elem.el('div', { className: 'row' }, [
          Elem.el('form', { role: 'form' }, [
              Elem.el('div', { className: ['form-group', 'col-md-10'] },
                  Elem.el('input', {
                      dataKey: state.get('key'),
                      onchange: storeName,
                      value: state.get('text'),
                      placeholder: 'What do you have to do ?',
                      type: 'text', className: 'form-control',
                  }, [])
              ),
              Elem.el('div', { className: 'form-group' },
                  Elem.el('div', { className: 'btn-group' }, [
                      Elem.el('button', { 
                              type: 'button', 
                              className: 'btn btn-success',
                              onclick: createNewTask
                          },
                          Elem.el('span', {
                              className: 'glyphicon glyphicon-floppy-saved'
                          }, [])
                      ),
                      Elem.el('button', { 
                              onclick: deleteAllDone,
                              type: 'button', 
                              className: 'btn btn-danger' 
                          },
                          Elem.el('span', { className: 'glyphicon glyphicon-trash' }, [])
                      )
                  ])
              )
          ])]
      )
  );    
}

function TaskItem(state, props) {
  function flipTaskState() {
      var tasks = _.map(state.get('tasks'), function(item) {
          if (props.task._id === item._id) {
              var newTask = _.clone(item);
              newTask.done = !props.task.done;
              return newTask;
          }
          return item;
      });
      state.set('tasks', tasks);
  }
  return Elem.el('li', { className: 'list-group-item' },
      Elem.el('div', { className: 'row' }, [
          Elem.el('div', { className: 'col-md-10' }, props.task.name),
          Elem.el('div', { className: 'col-md-2' },
              Elem.el('span', { 
                  onclick: flipTaskState, 
                  className: { 
                      label: true, 
                      labelSuccess: props.task.done, 
                      labelDefault: !props.task.done 
                  }, 
                  style: { 
                      cursor: 'pointer' 
                  } 
              }, 'Done')
          )
      ])
  );
}

function TodoApp(state, props) {
  return Elem.el('div', { className: 'col-md-4' }, [
      Elem.el('h3', 'Todo List'),
      NewTask(state, props),
      Elem.el('ul', { className: 'list-group' }, _.map(state.get('tasks'), function(task) {
          return TaskItem(state, { task: task});
      }))
  ]);
}

Elem.component({
  container: '#container',
  init: function(state, props) {
      state.set('tasks', []);
      state.set('text', '');
  },
  render: TodoApp
});
```

What about webcomponents ?
----------------------------

You can use an Elem component to create webcomponent. To do that, just import elem-webcomp.min.js and write somthing like 

```javascript
Elem.registerWebComponent('todo-list', {
    init: function(state, props) {
        state.set('key', _.uniqueId('todolist-'));
        state.set('tasks', []);
        state.set('text', '');
    },
    render: TodoApp
});
``` 

and use it like 

```html
<div>
  <todo-list></todo-list>
</div>
```

API
----------

* Elem.el : `function(name, attributes, children)` : Create a representation of an HTML element. Children can be a string/number/boolean, an `Elem.el`, an array of `Elem.el` or a `__asHtml` object.
* Elem.sel : `function(name, children)` : Create a representation of a simple HTML element
* Elem.cel : `function(name, attributes)` : Create a representation of a void HTML element
* Elem.nbsp : `function(times)` : creates a `<span>` containing one or more `&nbsp;`
* Elem.text : `function(value)` : creates a `<span>value</span>`
* Elem.elements : `function(elem, ...)` : creates an array or `Elem.el` based on function args
* Elem.render : `function(elem, container)` : render an element to a container in the DOM
* Elem.renderToString : `function(elem)` : render an element as an HTML string
* Elem.component : `function(options)` : render a component and return its state
* Elem.state : `function(defaultValues)` : create a state object. Similar to Backbone models
* Elem.registerWebComponent : `function(elemName, options)` : register a component as a webcomponent.

