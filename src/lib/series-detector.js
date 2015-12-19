/*
    Series Detector
     - Detects what series a given point belongs to and returns it.
     - If the series doesn't exist yet, it is created using the point's fields and values (except the ignored ones).
     - A point belongs to a series if its fields and values (except for the ignored ones) match a series' keys.
*/

var Base = require('extendable-base');
var _ = require('underscore');

var SeriesDetector = Base.extend({
    initialize: function(options) {
        this._fieldsToIgnore = options.fieldsToIgnore;
        this._keyField = options.keyField;
        this._series = {};
    },

    getSeriesForPoint: function(point) {
        var keys = this._findKeys(point);
        var series = this._findSeriesWithKeys(keys);

        return series || this._createSeries(keys);
    },

    _findSeriesWithKeys: function(keys) {
        return _.find(_.values(this._series), function(thisSeries) {
            return _.isEqual(thisSeries.keys, keys);
        });
    },

    _createSeries: function(keys) {
        var newSeriesId = _.keys(this._series).length;

        this._series[newSeriesId] = {
            id: newSeriesId,
            keys: keys
        };

        return this._series[newSeriesId];
    },

    _findKeys: function(point) {
        var keys = {};

        if (this.keyField !== undefined) {
            keys[this.keyField] = point[this.keyField];
        }
        else {
            _.each(point, function(val, name) {
                if (!_.isNumber(val) && ! _.contains(this._fieldsToIgnore, name)) {
                    keys[name] = val;
                }
            }, this);
        }

        return keys;
    }
});

module.exports = SeriesDetector;
