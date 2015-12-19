/* seriously jshint? */
/*jshint bitwise: false*/

// A data target that automatically adapts and figures out
// whether to buffer incoming data or to maintain a fixed
// time-based window of recent data.
// If the `window` option is supplied, this target behaves just
// like TimeWindowedDataTarget.  If no window is given, this target
// begins in "historical" mode, accumulating all data it sees.
// It then observes the rate at which data comes in.  If it appears
// to be live data, the target establishes a time window based on
// how much data it has seen so far and changes its behavior to
// be just like a TimeWindowedDataTarget.
// For very large data historical data sets, the behavior of
// buffering everything can obviously create significant resource
// problems.  For this case, this target can also downsample the
// incoming data when the total number of points exceed a threshold.
// XXX describe more about downsampling.

var _ = require('underscore');
var d3 = require('d3');

var BaseDataTarget = require('./base-data-target');
var SharedRange = require('./shared-range');

// go-oleg TODO: uncomment and/or remove dependency
// var logger = require('logger').get('timechart');

// find points to plot based on the focus chart
// based on the domain. we want to plot one extra
// point on each side of the domain so the lines
// leaving the left and right sides of the graph
// are angled in the right direction
// (towards the points that are off the actual chart)
function findPointsToPlot(points, domain) {
    var i;

    var firstPoint = 0;
    var lastPoint = points.length - 1;

    for (i = 1; i < points.length; i++) {
        if (points[i].time >= domain[0]) {
            firstPoint = i - 1;
            break;
        }
    }

    for (i = points.length - 1; i > 0; i--) {
        if (points[i].time <= domain[1]) {
            lastPoint = i + 1;
            break;
        }
    }

    return points.slice(firstPoint, lastPoint + 1);
}

var AdaptiveDataTarget = BaseDataTarget.extend({
    initialize : function(id, options) {

        options = options || {};

        this.xfield = options.xfield || 'time';
        this.yfield = options.yfield || 'value';
        this.downsample_limit = options.downsample_limit;

        this.range = options.range || new SharedRange();

        var self = this;
        this.range.on('change:range', function(e, r) { self.update(r[1]); } );

        // keeps track of all data pushed into the dataTarget until while in historical mode
        this._allData = [];

        this._interpolationBreaks = [];

        // XXX describe
        this._resetDownsampling();

        // XXX get rid of these
        this.xDomain = null;
        this.yDomain = null;
    },

    set_yfield : function(y) {
        this.yfield = y;
    },

    set_downsample_limit : function(v) {
        this.downsample_limit = v;
    },

    is_sorted : function(list) {
        if (list.length < 2) { return true; }
        var end = list.length - 1;
        for (var i=0; i<end; i++) {
            if (list[i][this.xfield] > list[i+1][this.xfield]) {
                return false;
            }
        }
        return true;
    },

    resetDataByRange : function(range) {
        this._reset(findPointsToPlot(this._allData, range));
    },

    _filter : function(min_t) {
        var self = this;
        this._data = _.filter(this._data, function(d) {
            return d[self.xfield] >= min_t;
        } );

        this._interpolationBreaks = _.filter(this._interpolationBreaks, function(t) {
            return t >= min_t;
        } );
    },

    addInterpolationBreak : function(point) {
        this._interpolationBreaks.push(point);
    },

    // TODO: a better job separating out push and reset and when points should
    // be recorded in the _allData history and when they shouldn't be
    push : function(data, record) {
        if (data.length === 0) { return; }

        if (record === undefined) {
            record = true;
        }

        var self = this;

        if (!this.is_sorted(data)) {
            data = _.sortBy(data, function(d) { return d[self.xfield]; } );
        }

        if (this._data.length > 0) {
            var last_t = this._data[this._data.length-1][this.xfield];
            if (data[0][this.xfield] < last_t) {
                console.log('timechart is seeing out of order data!'
                            + '(' + data[0][this.xfield]
                            + ' came after ' + last_t + ')'
                );
                // go-oleg TODO: this was logger before but commented out because of dependency
                // logger.warn('timechart is seeing out of order data!'
                //             + '(' + data[0][this.xfield]
                //             + ' came after ' + last_t + ')');
                return;
            }
        }

        if (record && !this.range.is_live()) {
            this._allData = this._allData.concat(data);
        }

        var o;

        // no fixed window, keep everything
        // downsample if necessary
        if (this.downsampling) {
            this.downsample_buffer = this.downsample_buffer.concat(data);

            var npts = 1 << this.downsampling;
            while (this.downsample_buffer.length >= npts) {
                var oldpts = this.downsample_buffer.slice(0, npts);
                this.downsample_buffer = this.downsample_buffer.slice(npts);

                o = {};
                o[this.xfield] = oldpts[0][this.xfield];

                // XXX parameterize downsampling fn
                o[this.yfield] = d3.mean(_.map(oldpts, function(d) {
                    return d[self.yfield];
                }));

                // XXX need field names but we just have accessors
                this._data.push(o);
            }
        }
        else {
            this._data = this._data.concat(data);
        }

        // check for increasing level of downsampling
        while (this.downsample_limit !== undefined
               && this._data.length > this.downsample_limit) {
            this.downsampling++;

            this.trigger('downsample', (1<<this.downsampling));

            var i;
            var newbuf = [];
            for (i=0; i<this.downsample_buffer.length; i++) {
                newbuf.push(this.downsample_buffer[i]);
                newbuf.push(this.downsample_buffer[i]);
            }
            this.downsample_buffer = newbuf;

            var newdata = [];
            for (i=0; i+1 < this._data.length; i += 2) {
                o = {};
                o[this.xfield] = this._data[i][this.xfield];
                o[this.yfield] = d3.mean([ this._data[i][this.yfield],
                                           this._data[i+1][this.yfield] ]);
                newdata.push(o);
            }

            if (i < this._data.length) {
                this.downsample_buffer.push(this._data[i]);
            }
            this._data = newdata;

        }

        var max_t = this._data[this._data.length-1][this.xfield];

        this.xDomain = this._calculateNewDomain(this._data);

        if (this.range.range === null || max_t > this.range.range[1]) {
            this.inpush = true;
            this.range.set_range(this.xDomain);
            this.inpush = false;
        }

        // XXX this doesn't belong here, ugh
        this.yDomain = d3.extent(this._data, function(d) { return d[self.yfield]; });

        this.trigger('update', {
            data: this._data,
            interpolationBreaks: this._interpolationBreaks,
            xDomain: this.xDomain,
            id: this.id
        });
    },

    update : function(max_t) {
        if (!this.range.windowed()) {
            return;
        }

        var min_t = new Date(max_t - this.range.window);

        var old = this._data.length;

        this._filter(min_t);
        if (this._data.length === old) { return; }

        // XXX these don't belong here, ugh
        this.xDomain = [ min_t, max_t ];
        var self = this;
        this.yDomain = d3.extent(this._data, function(d) { return d[self.yfield]; });

        if (this.inpush) {
            return;
        }

        this.trigger('update', {
            data: this._data,
            interpolationBreaks: this._interpolationBreaks,
            xDomain: this.xDomain,
            id: this.id
        });
    },

    _calculateNewDomain : function(data) {
        var max_t = data[data.length-1][this.xfield];
        var min_t = data[0][this.xfield];
        var windowInMillis = this.range.window;
        var xDomain;
        if (!this.range.windowed()) {
            // We're not windowed, which means we should only expand the
            // range, make sure we don't actually move the left edge forward.
            var oldestPointTime = data[0][this.xfield];
            xDomain = [
                this.range.range !== null
                    ? ( oldestPointTime < this.range.range[0] ? oldestPointTime : this.range.range[0] )
                    : oldestPointTime, max_t ];
        }
        else {
            // if the range is set and we have a point past the end of it, update the domain
            xDomain = this._calculateWindowedDomain(this.range.range, windowInMillis, min_t, max_t);
        }

        return xDomain;
    },

    _calculateWindowedDomain : function(range, windowInMillis, min_t, max_t) {
        var windowStartBasedOnEnd = new Date(max_t.getTime() - windowInMillis);
        var windowEndBasedOnStart = new Date(min_t.getTime() + windowInMillis);

        var xDomain;

        if (range !== null) {
            if (max_t > range[1]) {
                if (range[0] > windowStartBasedOnEnd) {
                    xDomain = [ range[0], new Date(range[0].getTime() + windowInMillis) ];
                }
                else {
                    xDomain = [windowStartBasedOnEnd, max_t];
                }
            }
        }
        else {
            // if the range hasn't been set, but our data spans the window, set the range ending at the last point
            if ((max_t - min_t) > windowInMillis) {
                xDomain = [ windowStartBasedOnEnd, max_t ];
            }
            else {
                xDomain = [ min_t, windowEndBasedOnStart ];
            }
        }

        return xDomain;
    },

    /**
     * Reset the data in the dataTarget. Does not affect the "point history".
     * @param  {[type]} data [description]
     * @return {[type]}      [description]
     */
    _reset : function(data) {
        this._data = [];
        this._resetDownsampling();
        // do not record these points since we are "re-pushing" existing points
        this.push(data, false);
    },

    _resetDownsampling : function() {
        this.downsample_buffer = [];
        this.downsampling = 0;
        this.trigger('downsample', (1<<this.downsampling));
    },

    batch_end : function(t) {
    },

    // no-op
    stream_end : function() { }
});

module.exports = AdaptiveDataTarget;
