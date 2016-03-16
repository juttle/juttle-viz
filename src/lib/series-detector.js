/*
    Series Detector
     - Detects what series a given point belongs to and returns it.
       The returned value contains the series' unique id and its keys. Example:
         {
             id: 0,
             keys: {
                name: 'cpu',
                host: 'host1'
             }
         }
     - If the series doesn't exist yet, it is created using the point's fields and values (except the ignored ones).
     - A point belongs to a series if its fields and values (except for the ignored ones) match a series' keys.
*/

let _ = require('underscore');

class SeriesDetector {
    constructor(options = {}) {
        this._fieldsToIgnore = options.fieldsToIgnore;
        this._keyField = options.keyField;
        this._series = {};
    }

    getSeriesForPoint(point) {
        var keys = this._findKeys(point);
        var series = this._findSeriesWithKeys(keys);

        return series || this._createSeries(keys);
    }

    getSeriesLabel(id) {
        let keys = this._series[id].keys;

        return Object.keys(keys).sort().map((key) => {
            return `${key}: ${keys[key]}`;
        }).join(', ');
    }

    _findSeriesWithKeys(keys) {
        return _.find(_.values(this._series), function(thisSeries) {
            return _.isEqual(thisSeries.keys, keys);
        });
    }

    _createSeries(keys) {
        var newSeriesId = _.keys(this._series).length;

        this._series[newSeriesId] = {
            id: newSeriesId,
            keys: keys
        };

        return this._series[newSeriesId];
    }

    _findKeys(point) {
        var keys = {};

        if (this._keyField !== undefined) {
            keys[this._keyField] = point[this._keyField];
        }
        else {
            _.each(point, function(val, name) {
                if (val !== null && !_.isNumber(val) && ! _.contains(this._fieldsToIgnore, name)) {
                    keys[name] = val;
                }
            }, this);
        }

        return keys;
    }
}

module.exports = SeriesDetector;
