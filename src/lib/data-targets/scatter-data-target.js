// data target for usage with scatter chart
var BaseDataTarget = require('./base-data-target');
var _ = require('underscore');

var ScatterDataTarget = BaseDataTarget.extend({
    
    initialize : function(id, options) {
        options = options || {};
        this._timeField = options.timeField;
    },

    getData: function () {
        return this._data;
    },

    push: function(data) {
        data = data || [];

        // if new data-points 
        if (data.length > 0) {
            
            // add new data to existing
            this._data = this._data.concat(data);

        }

    },

    /**
     * clip points outside of display.limit
     * @param  {Number} lastIdxKey
     */
    clipOutsideOfLimit: function(lastIdxKey) {
        this._data = _.filter(this._data, function(d) { 
            return d.key >= lastIdxKey; 
        });
    },

    /**
     * clip points with time past the oldest date
     * @param  {Date} oldestDate 
     */
    clipOutsideOfDuration: function(oldestDate) {
        var self = this;
        this._data = _.filter(this._data, function(d) { 
            return d[self._timeField] >= oldestDate; 
        });
    },

    // no-op
    batch_end: function(data) {},
    
    // no-op
    stream_end: function(data) {}

});

module.exports = ScatterDataTarget;
