// Generator that draws data points as circles on a cartesian plane
var _ = require('underscore');
var Backbone = require('backbone');

var defaults = require('../utils/default-options')();

var Points = function(el, options) {
    options = options || {};

    this._points = el;

    this._timeField = options.timeField;
    this._xField = options.controlField;
    this._yField = options.valueField;
    this._keyField = options.keyField;
    this._radius = options.radius;
    this._opacity = options.opacity;
    this._series = options.series;

    this._attributes = _.defaults(options, defaults);

};

_.extend(Points.prototype, Backbone.Events);

Points.prototype.setScales = function(xScale, yScale, colorScale) {

    if (!xScale) {
        throw new Error('A x-scale should be set as xScale property');
    }
    if (!yScale) {
        throw new Error('A y-scale should be set as yScale property');
    }
    if (!colorScale) {
        throw new Error('A color-scale should be set as colorScale property');
    }

    this._xScale = xScale;
    this._yScale = yScale;
    this._colorScale = colorScale;

};

Points.prototype._getX = function(d) {
    return this._xScale(d[this._xField]);
};

Points.prototype._getY = function(d) {
    return this._yScale(d[this._yField]);
};

Points.prototype._getColor = function(d) {        
    var self = this;
    // see if a color has been configured for the series
    var match = _.find(this._series, function(s) { return s.name === d[self._keyField]; });
    return match ? match.color : this._colorScale(d[this._keyField]);
};

Points.prototype.draw = function(data) {
    var self = this;

    this._circles = this._points.selectAll('.point')
        .data(data, function(d, i) {
            return d.key;
        });

    this._circles.enter()
        .append('circle')
        .attr('class', function(d) { return 'point' + (d[self._keyField] ? (' '+d[self._keyField]) : '') + ' uid:' + d.key; })
        .attr('r', this._radius)
        .attr('fill-opacity', 0)
        .attr('fill', function(d) { return self._getColor(d); })
        .on('mouseenter', function(d) { self._onMouseEnter(d); })
        .on('mouseleave', function(d) { self._onMouseLeave(d); });

    this._circles.exit()
        // remove mouse event listeners
        .on('mouseenter', null)
        .on('mouseleave', null)
        // fade out and remove
        .transition()
        .duration(this._attributes.duration)
        .ease('linear')
        .attr('fill-opacity', 0)
        .remove();

    this.redraw();

};

Points.prototype.redraw = function() {
    var self = this;

    this._circles
        .transition()
        .duration(this._attributes.duration)
        .ease('linear')
        .attr('cx', function(d) { return self._getX(d); })
        .attr('cy', function(d) { return self._getY(d); })
        .attr('fill-opacity', this._opacity);

};

Points.prototype._onMouseEnter = function(d) {
    // do nothing if we don't have valid x/y coordinates
    if (d[this._xField] === undefined || d[this._yField] === undefined ) {
        return;
    }
    this._stopAnimation();
    this.trigger('showtooltip', d, this._getColor(d));
};

Points.prototype._onMouseLeave = function(d) {
    this.trigger('hidetooltip');
    // stopped animation only redraws when data is flowing after animation is stopped
    // let's make sure that points finish any interupted animation
    this.redraw(true);
};

// stops animation of data-points
Points.prototype._stopAnimation = function() {
    // stop all animation
    this._points.selectAll('.point')
        .transition()
        .duration(0);
};


module.exports = Points;
