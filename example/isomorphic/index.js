var Elem = require('elemjs');

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

var component = Elem.component({
    init: function() {
        console.log("init ...");
    },
    afterRender: function() {
        console.log("after ...");
    },
    render: function(state, props) {
        return RenderOnlyTodoApp;
    }
})({});

console.log(component.renderToString());
console.log(component.renderToStaticHtml());