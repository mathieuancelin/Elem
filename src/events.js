var _ = require('./utils');

var eventSplitter = /\s+/;

module.exports = function() {

  var callbacks = [];

  function fireCallbacks(names, event) {
    var eventNames = [names];
    if (eventSplitter.test(names)) {
      eventNames = names.split(eventSplitter);
    }
    _.each(eventNames, function(name) {
      _.each(callbacks, function(callbackHash) {
        if (callbackHash.name === 'all') {
          callbackHash.callback(name, event);
        } else if (callbackHash.name === name) {
          callbackHash.callback(event);
        }
      });
    });
  }

  return {
    trigger: fireCallbacks,
    dispatch: fireCallbacks,
    on: function(name, callback) {
      this.off(name, callback);
      callbacks.push({
        name: name,
        callback: callback
      });
    },
    off: function(name, callback) {
      callbacks = _.filter(callbacks, function(obj) {
        if (obj.name === name && obj.callback === callback) {
          return false;
        }
        return true;
      });
    },
  };
};
