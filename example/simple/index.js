
var _ = Elem.Utils;

var RenderOnlyTodoApp = Elem.el('div', { className: 'col-md-3' }, [
    Elem.el('h3', 'Todo List'),
    Elem.el('div',
        Elem.el('div', { className: 'row' },
            Elem.el('form', { role: 'form' }, [
                Elem.el('div', { className: ['form-group', 'col-md-10'] },
                    Elem.el('input', {
                        placeholder: 'What do you have to do ?',
                        type: 'text', className: 'form-control', value: '',
                    }, [])
                ),
                Elem.el('div', { className: 'form-group' },
                    Elem.el('div', { className: 'btn-group' }, [
                        Elem.el('button', { type: 'button', className: 'btn btn-success' },
                            Elem.el('span', {
                                className: 'glyphicon glyphicon-floppy-saved'
                            }, [])
                        ),
                        Elem.el('button', { type: 'button', className: 'btn btn-danger' },
                            Elem.el('span', { className: 'glyphicon glyphicon-trash' }, [])
                        )
                    ])
                )
            ])
        )
    ),
    Elem.el('ul', { className: 'list-group' }, [
        Elem.el('li', { className: 'list-group-item' },
            Elem.el('div', { className: 'row' }, [
                Elem.el('div', { className: 'col-md-10' }, 'Buy some beer'),
                Elem.el('div', { className: 'col-md-2' },
                    Elem.el('span', { onclick: function() { alert('pouet'); }, className: { label: true, labelSuccess: true }, style: { cursor: 'pointer' } }, 'Done')
                )
            ])
        ),
        Elem.el('li', { className: 'list-group-item' },
            Elem.el('div', { className: 'row' }, [
                Elem.el('div', { className: 'col-md-10' }, 'Buy some pizza'),
                Elem.el('div', { className: 'col-md-2' },
                    Elem.el('span', { className: { label: true, labelDefault: true }, style: { cursor: 'pointer' } }, 'Done')
                )
            ])
        )
    ])
]);

function NewTask(state, props, comp) {
    function deleteAllDone() {
        var tasks = _.filter(state().tasks, function(item) {
            return item.done === false;
        });
        state.set({ tasks: tasks });
    }
    function createNewTask() {
        var tasks = state().tasks;
        console.log(comp.refs.taskInput.getDOMNode().value);
        if (state().text !== '') {
            tasks.push({
                _id: _.uniqueId('task_'),
                name: state.get('text'),
                done: false
            });
            state.set({
                tasks: tasks,
                text: ''
            });
        }
    }
    function storeName(e) {
        var text = e.target.value;
        state.set({ text: text }, true);
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
                        ref: 'taskInput',
                        dataKey: state().key,
                        onchange: storeName,
                        onkeyup: storeName,
                        onkeydown: storeName,
                        value: state().text,
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

function TaskItem(state, props, comp) {
    function flipTaskState() {
        console.log('tasks ', state().tasks);
        var tasks = _.map(state().tasks, function(item) {
            if (props.task._id === item._id) {
                var newTask = _.clone(item);
                newTask.done = !props.task.done;
                return newTask;
            }
            return item;
        });
        console.log('new tasks ', tasks);
        state.set({ tasks: tasks });
    }
    return Elem.el('li', { className: 'list-group-item', key: props.task._id },
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

function TodoApp(state, props, comp) {
    return Elem.el('div', { className: 'col-md-4' }, [
        Elem.el('h3', 'Todo List'),
        NewTask(state, props, comp),
        Elem.el('ul', { className: 'list-group' }, _.map(state().tasks, function(task) {
            return TaskItem(state, { task: task }, comp);
        }))
    ]);
}

Elem.component({
    container: '#demo1',
    init: function(state, props) {
        state.set({
            tasks: [],
            text: ''
        });
    },
    render: TodoApp
});

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

Elem.registerWebComponent('todo-list1', {
    init: function(state, props) {
        state.set({
            key: _.uniqueId('todolist-'),
            tasks: [],
            text: ''
        });
    },
    render: function(s, p, c) {
      return Elem.el('div', [
        Elem.el('link', { rel: 'stylesheet', href: './css/bootstrap.min.css' }, []),
        TodoApp(s, p, c)
      ]);
    }
});


var commonState = Elem.state({ name: 'Hello' });

function TextBox() {
    function updateModel(e) {
        commonState.set({name: e.target.value});
    }
    return Elem.el('div', { className: 'col-md-4' }, [
        Elem.el('h3', 'Type your name here'),
        Elem.el('form', { role: 'form' }, [
            Elem.el('div', { className: ['form-group', 'col-md-10'] },
                Elem.el('input', {
                    placeholder: 'Type your name',
                    type: 'text',
                    className: 'form-control',
                    value: commonState().name,
                    onkeydown: updateModel,
                    onkeyup: updateModel,
                    onkeypress: updateModel,
                    onchange: updateModel
                }, [])
            )
        ])
    ]);
}

Elem.render(TextBox(), '#demo2');

function Displays(state, props) {
    return Elem.el('div', { className: 'col-md-4' }, [
        Elem.el('h3', 'Displays'),
        Elem.el('ul', { className: 'list-group' }, [
            Elem.el('li', { className: 'list-group-item' }, 'Name : ' + state().name || ''),
            Elem.el('li', { className: 'list-group-item' }, 'Name : ' + state().name || ''),
            Elem.el('li', { className: 'list-group-item' }, 'Name : ' + state().name || ''),
            Elem.el('li', { className: 'list-group-item' }, 'Name : ' + state().name || ''),
        ])
    ]);
}

Elem.component({
    initialState: function() {
      return commonState.all();
    },
    init: function() {
      var that = this;
      commonState.onChange(function() {
        that.replaceState(commonState.all());
      });
    },
    render: Displays
})({}).renderTo('#demo3');

var Clock = Elem.component({
    //container: '#timer',
    init: function(state, props) {
        state.set({
          seconds: moment().seconds(),
          hours: moment().hours(),
          minutes: moment().minutes()
        });
        setInterval(function() {
          var time = moment();
          state.set({
            seconds: time.seconds(),
            hours: time.hours(),
            minutes: time.minutes()
          });
        }, 1000);
    },
    render: function(state, props) {
        var seconds = (state().seconds % 60);
        var minutes = (state().minutes % 60);
        var hours = (state().hours % 12);
        return Elem.el('div', [
            Elem.el('button', { type: 'button', onclick: function() { console.log('yoooo'); }}, "yo"),
            Elem.el('div', { className: 'circle'}, [
                Elem.el('div', { className: 'hour', style: { transform: 'rotate(' + (hours * 30) + 'deg)' }}, ''),
                Elem.el('div', { className: 'minute', style: { transform: 'rotate(' + (minutes * 6) + 'deg)' }}, ''),
                Elem.el('div', { className: 'second', style: { transform: 'rotate(' + (seconds * 6) + 'deg)' }}, ''),
                Elem.el('span', { className: 'centered' }, state().hours + ' h ' + state().minutes + ' m ' + state().seconds + ' s')
            ])
          ]);

    }
});

var clock1 = Clock({});
clock1.renderTo('#timer');

if (window.console) console.log(Elem.renderToString(TextBox()));
if (window.console) console.log(Elem.renderToString(RenderOnlyTodoApp));
if (window.console) console.log(Elem.renderToString(TodoApp(Elem.state(), {})));

if (window.console) console.log(clock1.renderToString());
if (window.console) console.log(clock1.renderToStaticHtml());

var InnerComponent = Elem.component({
    init: function(state, props) {
        state.set({
            date: props.date || 'Inner'
        });
    },
    unmount: function(state, props) {
        //console.log('unmount inner ' + props.id);
    },
    beforeRender: function(state, props) {
        //console.log('mount inner ' + props.id);
    },
    render: function(state, props) {
        return Elem.el('div',
            [
                Elem.el('span', state().date + ''),
                Elem.el('br', ''),
                Elem.el('button', { type: 'button', onclick: function() {
                    state.set({
                        date: new Date()
                    });
                }, className: 'btn btn-primary' }, 'Update inner')
            ]
        );
    }
});

Elem.component({
    container: '#inner',
    init: function(state, props) {
        state.set({
            date: 'Outter'
        });
    },
    unmount: function(state, props) {
        //console.log('unmount outter ');
    },
    beforeRender: function(state, props) {
        //console.log('mount outter ');
    },
    render: function(state, props) {
        return Elem.el('div', [
            Elem.el('h3', 'Outer component'),
            InnerComponent({ date: 'outter ' + state().date, id: 1 }),
            InnerComponent({ date: 'outter ' + state().date, id: 2 }),
            InnerComponent({ date: 'outter ' + state().date, id: 3 }),
            Elem.el('button', { type: 'button', onclick: function() {
                state.set({
                    date: new Date()
                });
            }, className: 'btn btn-primary' }, 'Update outter')
        ]);
    }
});

Elem.Perf.start();
Elem.Perf.markStart('perfs');

var items = [{name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a\"><img src='javascript:;' onerror=\"alert('alert box should not appear')\">"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}, {name: "a"}, {name: "b"}, {name: "c"}];


Elem.component({
    container: '#perfs',
    name: 'PerfComponent',
    render: function() {
        return Elem.el('div', _.map(items, function(item) { return Elem.el('input', { type: 'text', value: item.name }, []); }));
    }
});

Elem.Perf.markStop('perfs');
Elem.Perf.printMeasures();
Elem.Perf.stop();
