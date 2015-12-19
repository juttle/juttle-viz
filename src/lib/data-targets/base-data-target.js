var Base = require('extendable-base');

// a data target mediates between the
// generators of the charts, providing
// events for the generators to subscribe to.
// implements Addy Osmani's Design Patterns pubsub
// http://addyosmani.com/resources/essentialjsdesignpatterns/book/#observerpatternjavascript

var BaseDataTarget = Base.extend({
    initialize: function(id) {
        this._data = [];
        this.id = id;
        this.subscriberID = -1;
        // where we keep the events
        this.events = {};
    },
    push: function(data) {
        throw new Error("Not Implemented");
    },
    batch_end: function(data) {
        throw new Error("Not Implemented");
    },
    stream_end: function(data) {
        throw new Error("Not Implemented");
    },

    on: function(eventName, callback, context) {
        if (!this.events.hasOwnProperty(eventName)) {
            this.events[eventName] = [];
        }

        var token = (++this.subscriberID).toString();

        this.events[eventName].push({
            token: token,
            callback: callback,
            context: context
        });

        return token;
    },
    off: function(token) {
        var i, j, keys, li, lj;
        // fastest way to iterate over an object's properties
        // http://jsperf.com/iterating-over-object-properties/2
        for (i = 0, keys = Object.keys(this.events), li = keys.length; i < li; i++) {
            if (this.events[keys[i]]) {
                for (j = 0, lj = this.events[keys[i]].length; j < lj; j++) {
                    if (this.events[keys[i]][j].token === token) {
                        this.events[keys[i]].splice(j, 1);
                        return token;
                    }
                }
            }
        }
        return false;
    },
    trigger: function(eventName) {

        if (!this.events[eventName]) {
            return false;
        }

        var subscribers = this.events[eventName];
        var args = Array.prototype.slice.call(arguments, 1);
        var nameAndArgs = [eventName].concat(args);

        var i, l, subs;
        for (i = 0, l = subscribers.length; i < l; i++ ) {
            subs = subscribers[i];
            subs.callback.apply(subs.context || this, nameAndArgs);
        }

        return this;

    }
});

module.exports = BaseDataTarget;

