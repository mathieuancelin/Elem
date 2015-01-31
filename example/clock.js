Elem.component({
    container: '#timer',
    init: function(state, props) {
        state.set({
          seconds: 0,
          hours: 0,
          minutes: 0
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
        return Elem.el('div', { className: 'circle'}, [
                Elem.el('div', { className: 'hour', style: { transform: 'rotate(' + (hours * 30) + 'deg);' }}, ''),
                Elem.el('div', { className: 'minute', style: { transform: 'rotate(' + (minutes * 6) + 'deg);' }}, ''),
                Elem.el('div', { className: 'second', style: { transform: 'rotate(' + (seconds * 6) + 'deg);' }}, ''),
                Elem.el('span', { className: 'centered' }, state().hours + ' h ' + state().minutes + ' m ' + state().seconds + ' s')
            ]
        );
    }
});
