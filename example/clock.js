var _ = Elem.Utils;
var cssClass = Elem.cssClass;

var Style = {
  circle: cssClass({
    borderRadius: '50%',
    width: '120px',
    height: '120px',
    marginLeft: '10px',
    marginTop: '10px',
    background: 'white',
    border: '3px solid #61b2a7',
    position: 'relative',
  }),
  circleCentered: cssClass({
    position: 'absolute',
    top: '55%',
    left: '0px',
    width: '120px',
    textAlign: 'center',
    fontFamily: "'Montserrat',sans-serif",
    textShadow: '1px 1px 1px rgba(34, 34, 34, 0.5)'
  }),
  circleSecond: cssClass({
    width: '0',
    height: '0',
    position: 'absolute',
    top: '50%',
    left: '50%',
    margin: '-40% -1px 0 0',
    padding: '40% 1px 0',
    background: '#61b2a9',
    '-webkit-transform-origin': '50% 100%',
    '-ms-transform-origin': '50% 100%',
    transformOrigin: '50% 100%'
  }),
  circleMinute: cssClass({
    width: '0',
    height: '0',
    position: 'absolute',
    top: '50%',
    left: '50%',
    margin: '-40% -3px 0',
    padding: '40% 3px 0',
    borderRadius: '3px',
    background: '#61b2a7',
    '-webkit-transform-origin': '50% 100%',
    '-ms-transform-origin': '50% 100%',
    transformOrigin: '50% 100%'
  }),
  circleHour: cssClass({
    width: '0',
    height: '0',
    position: 'absolute',
    top: '50%',
    left: '50%',
    margin: '-25% -4px 0',
    padding: '25% 4px 0',
    borderRadius: '3px',
    background: '#61b2a7',
    '-webkit-transform-origin': '50% 100%',
    '-ms-transform-origin': '50% 100%',
    transformOrigin: '50% 100%'
  }),
  circleAfter: cssClass({
    position: 'absolute',
    top: '50%',
    left: '50%',
    width: '12px',
    height: '12px',
    margin: '-6px 0 0 -6px',
    background: '#fff',
    borderRadius: '6px',
    content: "",
    background: '#61b2a7',
    display: 'block'
  })
};

var Clock = Elem.component({
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
    return Elem.el('div', { style: Style.circle }, [
      Elem.el('div', { style: Style.circleHour.extend({ transform: 'rotate(' + state().hours + 'deg)' }) }, ''),
      Elem.el('div', { style: Style.circleMinute.extend({ transform: 'rotate(' + state().minutes + 'deg)' }) }, ''),
      Elem.el('div', { style: Style.circleSecond.extend({ transform: 'rotate(' + state().seconds + 'deg)' }) }, ''),
      Elem.el('span', { style: Style.circleAfter }, ''),
      Elem.el('span', { style: Style.circleCentered }, moment().hours() + ' h ' + moment().minutes() + ' m ' + moment().seconds() + ' s')
    ]);
  }
});

var clock1 = Clock();
clock1.renderTo('#timer');