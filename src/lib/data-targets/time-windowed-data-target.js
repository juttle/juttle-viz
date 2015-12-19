// window version of the data target.
// we will inherit from BaseDataTarget which handles
// all of the pub-sub stuff
var BaseDataTarget = require('./base-data-target');
var _ = require('underscore');
var d3 = require('d3');

var TimeWindowedDataTarget = BaseDataTarget.extend({
    initialize: function (id, options) {
        options = options || {};

        // set up our options
        if (options.hasOwnProperty('window')) {
            // window is a time duration in ms
            this.window = options.window;
        } else {
            // default to last 5 minutes in ms
            this.window = 1000 * 60 * 5;
        }

        this.yDomain = [];

        if (options.hasOwnProperty('xAccessor')) {
            this.xAccessor = options.xAccessor;
        } else {
            this.xAccessor = function(d) {
                return d.time;
            };
        }

        if (options.hasOwnProperty('yAccessor')) {
            this.yAccessor = options.yAccessor;
        } else {
            this.yAccessor = function(d) {
                return d.value;
            };
        }

        this.options = options;
    },
    push: function(data) {
        // decide whether we're triggering an update
        // or a data (i.e. a draw)
        var nextEvent = 'update';

        // if our data is [], then we're redrawing,
        // so we trigger a 'data' event.
        if (this._data.length === 0) {
            nextEvent = 'data';
        }

        // concat the data
        this._data = this._data.concat(data);

        // keep a copy for updating the line
        var newData = this._data.slice();

        // stop if newData is empty, so as to not cause any
        // errors
        if (!newData.length) {
            return;
        }

        // calculate what the latest date we can use is
        var newestDate = this.xAccessor(newData[newData.length - 1]);

        // and what the oldest is (i.e the beggining of our window)
        var oldestDate = new Date(newestDate - this.window);

        // go over the data and snip out any data that
        // doesn't fit with the current window
        // we can't assume the data is sorted so we have
        // to sort it by xAccessor after filtering
        var self = this;
        this._data = _.chain(this._data)
            .filter(function(datapoint) {
                return self.xAccessor(datapoint) >= oldestDate;
            })
            .sortBy(this.xAccessor)
            .value();

        var xDomain = [oldestDate, newestDate];

        var yDomain = d3.extent(this._data, this.yAccessor);

        this.yDomain = yDomain;
        this.xDomain = xDomain;

        this.trigger(nextEvent, {
            data: this._data,
            newData: newData,
            xDomain: xDomain,
            yDomain: yDomain,
            id: this.id
        });
    },
    batch_end: function() {},
    stream_end: function() {}
});

module.exports = TimeWindowedDataTarget;
