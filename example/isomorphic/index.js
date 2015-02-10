var express = require('express');
var Elem = require('elemjs');
var _ = Elem.Utils;

var component = Elem.component({
    init: function(state) {
        console.log("init ...");
        state.set({
            tasks: [
                {
                    name: 'Buy some beer',
                    done: true
                },
                {
                    name: 'Buy some pizza',
                    done: false
                }
            ]
        }, true);
    },
    afterRender: function() {
        console.log("after ...");
    },
    render: function(state, props) {
        return Elem.el('div', { className: 'col-md-4' }, [
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
            Elem.el('ul', { className: 'list-group' }, 
                _.map(state().tasks, function(task) {
                    return Elem.el('li', { className: 'list-group-item' },
                        Elem.el('div', { className: 'row' }, [
                            Elem.el('div', { className: 'col-md-10' }, task.name),
                            Elem.el('div', { className: 'col-md-2' },
                                Elem.el('span', { 
                                    className: { 
                                        label: true, 
                                        labelDefault: !task.done, 
                                        labelSuccess: task.done 
                                    }, 
                                    style: { 
                                        cursor: 'pointer' 
                                    } 
                                }, 'Done')
                            )
                        ])
                    ); 
                })
            )
        ]);
    }
})();

console.log(component.renderToString());
console.log(component.renderToStaticHtml());

var app = express();

app.get('/app.html', function (req, res) {
  res.send('<html><head><title>Isomorphic demo</title><link rel="stylesheet" href="https://maxcdn.bootstrapcdn.com/bootstrap/3.3.1/css/bootstrap.min.css"><style type="text/css"></style></head><body><div id="app">' + component.renderToStaticHtml() + '</div></body></html>'); 
});

var server = app.listen(3000, function () {
  var host = server.address().address;
  var port = server.address().port;
  console.log('Isomorphic app listening at http://%s:%s', host, port);
});