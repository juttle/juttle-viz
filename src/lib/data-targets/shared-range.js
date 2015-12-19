
var BaseDataTarget = require('./base-data-target');

var SharedRange = BaseDataTarget.extend({
    initialize : function(options) {
        options = options || {};
        
        this.window = options.window;
        this.tfield = options.tfield || 'time';
        this.live = options.live || false;

        this.range = null;
    },

    windowed : function() { 
        return this.window !== undefined;
    },

    /**
     * Set the window of the range.
     * @param {Number} window (in milliseconds)
     */
    set_window : function(v) {
        this.window = v;
        this.trigger('realtime', v);
    },

    set_range : function(r) {
        this.range = r;
        this.trigger('change:range', r);
    },

    is_live : function() {
        return this.live;
    }
});

module.exports = SharedRange;
