var _ = require('underscore');
var d3 = require('d3');

var seriesGeneratorUtils = require('./utils/series-generator-utils');

var TimeBars = function(el, options) {
    if (typeof options === 'undefined' ) {
        options = {};
    }

    this.xfield = options.xfield || 'time';
    this.yfield = options.yfield || 'value';
    this.type = 'slide';
    this.duration = options.duration || 0;

    this.el = el;

    this.selection = d3.select(el);

    this.series = this.selection.append('g')
        .attr("class", "series");

    this._attributes = options;

    if (options.label) {
        this.series.attr("id", options.label);
    }

    this.data = [];
    this.draw_range = undefined;

    this.hover_point = null;
};

TimeBars.prototype.set_yfield = function(y) {
    this.yfield = y;
};

TimeBars.prototype.set_id = function(id) {
    this.id = id;
    this.series.attr("id", id);
};

TimeBars.prototype.set_color = function(c) {
    this.color = c;
};

TimeBars.prototype.set_duration = function(d) {
    this.duration = d;
};

TimeBars.prototype.remove = function() {
    this.series.remove();
};

TimeBars.prototype.hide = function() {
    this.series.attr('display', 'none');
};

TimeBars.prototype.show = function() {
    this.series.attr('display', null);
};

TimeBars.prototype.setScales = function(xScale, yScale) {
    if (!xScale) {
        throw new Error('An x scale should be set as xScale property');
    }

    if (!yScale) {
        throw new Error('A y scale should be set as yScale property');
    }

    this.xScale = xScale;
    this.yScale = yScale;
};

TimeBars.prototype.redraw = function(range) {
    this.draw_range = range;
    this.draw();
};

TimeBars.prototype.update = function(payload, range) {
    this.data = payload.data;

    this.draw_range = range;
    
    this.draw();
};

TimeBars.prototype.draw = function() {
    var self = this;
    if (this.data.length === 0) { return; }

    var data = this.data.filter(function(d) {
        return d[self.xfield] > self.xScale.domain()[0];
    });
    
    var bars = this.series.selectAll('rect.time-bar').data(data, function(d) {
        return d[self.xfield];
    });

    bars.enter()
        .append('rect')
        .attr('class', 'time-bar');

    bars.style('fill', this.color)
        .attr('y', function(d) {
            if (self.yScale(0) - self.yScale(d[self.yfield]) >= 0) {
                return self.yScale(d[self.yfield]);
            }
            return self.yScale(0);
        })
        .attr('x', function(d, i) {
            if (i === 0) {
                return self.xScale.range()[0];
            }
            else {
                return self.xScale(data[i - 1][self.xfield]);
            }
        })
        .attr('width', function(d, i) {
            if (i === 0) {
                return self.xScale(d[self.xfield]) - self.xScale.range()[0];
            }
            else {
                return self.xScale(d[self.xfield]) - self.xScale(data[i - 1][self.xfield]);
            }
            
        })
        .attr('height', function(d) {
            return Math.abs(self.yScale(0)
                - self.yScale(d[self.yfield]));
        });

    bars.exit().remove();
};

TimeBars.prototype.hover_find = function(t) {
    var closestIndex = seriesGeneratorUtils.getClosestIndex(
                        t,
                        _.pluck(this.data, this.xfield),
                        'right'
                    );

    return this.data[closestIndex];
};

TimeBars.prototype.hover_on = function(d) {
    this.series.selectAll('rect.time-bar').classed('hover', function(thisD) {
        return thisD === d;
    });
};

TimeBars.prototype.hover_off = function() {
    this.series.selectAll('rect.time-bar').classed('hover', false);
};

TimeBars.prototype.getTooltipContents = function(d, series) {
    return seriesGeneratorUtils.getTooltipContents(d ? d[this.yfield] : null, series);
};

module.exports = TimeBars;