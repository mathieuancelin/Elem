Elem.js
================

Simple and idiotic lib to build UI components. It's a templating library promoting functionnal composition with the full expressiveness of JavaScript and support for all existing JavaScript libraries. Elem.js is just a quick and dirty experiment to avoir string templates and string concat when modifying the DOM and does not care about performance at all (ie. recreate DOM nodes all the time). 

Install
-------

with npm do :

```
npm install elemjs --save
```

API
----------

* `Elem.el(name, attributes, children)` : Create a representation of an HTML element. Children can be a string/number/boolean, an `Elem.el`, an array of `Elem.el` or a `__asHtml` object.
* `Elem.sel(name, children)` : Create a representation of a simple HTML element
* `Elem.vel(name, attributes)` : Create a representation of a void HTML element
* `Elem.nbsp(times)` : creates a `<span>` containing one or more `&nbsp;`
* `Elem.text(value)` : creates a `<span>value</span>`
* `Elem.elements(elems...)` : creates an array or `Elem.el` based on function args
* `Elem.render(elem, container)` : render an element to a container in the DOM
* `Elem.renderToString(elem)` : render an element as an HTML string
* `Elem.component(options)` : render a component and return its state. Return a factory function if opts does not contains a container. See the component section for options
* `Elem.state(defaultValues)` : create a state object. Similar to Backbone models
* `Elem.registerWebComponent(elemName, options)` : register a component as a webcomponent. See the webcomponent section for options.
* `Elem.Utils` : a lot of utils function to deal with JavaScript structures. Similar to some underscore.js functions
* `Elem.Perf` : performance measurement tools 
  * `Elem.Perf.start` : enable performance measures
  * `Elem.Perf.stop` : disable performance measures
  * `Elem.Perf.markStart(name)` : mark the start of a measure
  * `Elem.Perf.markStop(name)` : mark the stop of a measure
  * `Elem.Perf.collectMeasures` : return all collected measures and clear the measures store
  * `Elem.Perf.printMeasures` : print collected measures and clear the measures store

Dependencies
-------------

Elem can be used as a standalone library and that's awesome.

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

```javascript
var shouldDisplayDarkBackground = true;
var shouldDisplayBrightBackground = !shouldDisplayDarkBackground; 
Elem.el('div', { 
  className: { 
    withBackground: true, 
    darkBackground: shouldDisplayDarkBackground, 
    brighBackground: shouldDisplayBrightBackground 
  }
}, 'Hello');
```

will produce

```html
<div class="with-background dark-background">Hello</div>
```

As children are just nodes in an array, it is really easy to add or remove elements from your UI. You can also pass undefined elements or functions that can return undefined to not render nodes.

If you want to provide a child as HTML value, just pass an object like `{__asHtml: '&nbsp;;-)'}`.

You can also attach callback to event on elements like 

```javascript
function saySomething() {
    alert("Something !");
}

var node = Elem.el('div', { className: 'col-md-6' }, [
  Elem.el('h3', 'Hello World!'),
  Elem.el('button', { 
      className: ['btn', 'btn-primary'], 
      onClick: saySomething 
    }, 'Say something'),
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
        state.set({time: 0});
        setInterval(function() {
            state.set({time: state.all().time + 1});
        }, 1000);
    },
    render: function(state, props) {
        return Elem.el('span', 'Elapsed : ' + state.all().time));
    }
});
```

when creating a component, you can define 

```javascript
{
    container: 'the container where the component will be rendered. Can be omitted to use it as a factory'
    init: 'init function that receive the state and props as parameters' 
    state: 'the state of the component. If undefined, an empty one will be created'
    props: 'properties for the component, can be passed at instanciation if factory mode'
    render: 'function that will return an Elem node'
}
```

you can pass an external with `Elem.state({...})`. Each time the state is changed, the render function will be called and the components will be re-rendered. You can avoid that by using `state.set(obj, true)`.

You can use `Elem.component` as a component factory like :

```javascript

var Hello = Elem.component({
    // it's a factory because no container is provided
    render: function(state, props) {
        return Elem.el('div', 
            [
                Elem.el('h3', "Hello " + props.name + "!")
            ]
        );
    }
});

Hello({ name: "World" }).renderTo('#hello'); // render inside #hello div
Hello({ name: "World" }, '#hello2'); // render inside #hello div

```

You can also use a component into a tree of elements by using a component factory like :

```javascript

var InnerComponent = Elem.component({
    // it's a factory because no container is provided
    render: function(state, props) {
        return Elem.el('div', 
            [
                Elem.el('h3', "Hello " + props.name + "!")
            ]
        );
    }
});

Elem.component({
    container: '#inner',
    render: function(state, props) {
        return Elem.el('div', [
            Elem.el('h3', 'Inner component demo'),
            InnerComponent({ name: "World" })
        ]);
    }
});

```

The `component(props)` function returns a function (if you don't provide a container) that you can call to create component that will be rendered in the element tree. The main advantage of using `component` as factory is that when you change the state of the inner component, only that component will be re-rendered instead of the whole root component and its children.

But, how can I get an actual DOM node from inside my component ?
---------------------------------------

That's pretty easy, you just have to use refs. Refs give you access to any node inside your component that has been marked with a `ref` parameter. 

```javascript

function MyComponent(state, props, context) {

  function clickMe() {
    console.log(context.refs.myInputText.getDOMNode().value);
  }

  return Elem.el('div', [
    Elem.el('input', { type: 'text', ref: 'myInputText', value: 'Hello World!' }, []),
    Elem.el('button', 
      { type: 'button', className: 'btn btn-primary', onclick: clickme }, 
      'Click me !!!')    
  ]);
}

Elem.component({
  container: '#test',
  render: MyComponent
});
```

You can also get the root DOM node by using `context.getDOMNode()`.

But you can't render that stuff server side (isomorphic apps), right ?
---------------------------------------------

Actually you can and it's pretty easy. 

First you can use `Elem.renderToString` on any `Elem.el` node you want.

But you can also do the same on components, let's write a funny clock component;

```javascript
module.exports = Elem.component({
    init: function(state, props) {
      function update() {
        state.set({
          seconds: (moment().seconds() % 60) * 6,
          minutes: (moment().minutes() % 60) * 6,
          hours: (moment().hours() % 12) * 30,
        });
      }
      update();
      setInterval(update, 1000);
    },
    render: function(state, props) {
        return Elem.el('div', { className: 'circle'}, [
                Elem.el('div', { className: 'hour', 
                    style: { transform: 'rotate(' + state().hours + 'deg)' }}, ''),
                Elem.el('div', { className: 'minute', 
                    style: { transform: 'rotate(' + state().minutes + 'deg)' }}, ''),
                Elem.el('div', { className: 'second', 
                    style: { transform: 'rotate(' + state().seconds + 'deg)' }}, ''),
                Elem.el('span', { className: 'centered' }, 
                    moment().hours() + ' h ' + moment().minutes() + ' m ' + moment().seconds() + ' s')
            ]
        );
    }
});
```

Now we can instanciate it on the server side, and render it as an HTML string :

```javascript
var express = require('express');
var app = express();
var Clock = require('./clock');

app.get('/clock.html', function (req, res) {
  var clock = Clock(); // instanciate a component
  res.send(clock.renderToString()); 
  // or you can consider the followin for a pure html output
  // clock.renderToStaticHtml 
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Clock app listening at http://%s:%s', host, port);
});
```

on the client side, you just have to re-render the component at the same div dans Elem while re-attach itself generated DOM.

What about webcomponents ?
----------------------------

You can use an Elem component to create webcomponent. To do that, just write something like 

```javascript
Elem.registerWebComponent('todo-list', {
    init: function(state, props) {
      state.set({
        key: _.uniqueId('todolist-'),
        tasks: [],
        text: ''
      });
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

when creating a webcomponent, you can define options like

```javascript
{
    init: 'init function that receive the state and props as parameters' 
    state: 'the state of the webcomponent. If undefined, an empty one will be created'
    render: 'function that will return an Elem node'
}
```
Properties of the webcomponent are defined with the HTML tag attributes. You can use a `renderOnly="true"` attribute to not redraw the webcomponent all the time. You can also use `noshadow="false"` to avoid rendering the component inside the shadow root of the webcomponent.

Now let's write a more complicated component : The Todo list
----------------------------

```javascript
function NewTask(state, props) {
  function deleteAllDone() {
      var tasks = _.filter(state.all().tasks, function(item) {
          return item.done === false;
      });
      state.set({tasks: tasks});
  }
  function createNewTask() {
      var tasks = state.all().tasks;
      if (state.all().text !== '') {
          tasks.push({
              _id: _.uniqueId('task_'),
              name: state.all().text,
              done: false
          });
          state.set({
            text: '',
            tasks: tasks
          });
      }
  }
  function storeName(e) {
      var text = e.target.value;
      state.set({text: text}, true); // silent set
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
                      dataKey: state.all().key,
                      onchange: storeName,
                      value: state.all().text,
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
      var tasks = _.map(state.all().tasks, function(item) {
          if (props.task._id === item._id) {
              var newTask = _.clone(item);
              newTask.done = !props.task.done;
              return newTask;
          }
          return item;
      });
      state.set({tasks: tasks});
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

function TodoApp(state, props, component) {
  return Elem.el('div', { className: 'col-md-4' }, [
      Elem.el('h3', 'Todo List'),
      NewTask(state, props, component),
      Elem.el('ul', { className: 'list-group' }, _.map(state.all().tasks, function(task) {
          return TaskItem(state, { task: task}, component);
      }))
  ]);
}

Elem.component({
  container: '#container',
  init: function(state, props) {
      state.set({
        tasks: [],
        text: ''
      });
  },
  render: TodoApp
});
```