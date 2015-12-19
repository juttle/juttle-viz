var d3 = require('d3');
var _ = require('underscore');

var Heatmap = function(el, options) {

    this.el = el;

    options = options || {};

    var defaults = require('../utils/default-options')();

    this.options = _.defaults(options, defaults);

    this.selection = d3.select(el);

    this.series = this.selection.append('g')
        .attr('class', 'series');

    this.xAccessor = this.options.xAccessor;
    this.yAccessor = this.options.yAccessor;
    this.colorAccessor = this.options.colorAccessor;

};

Heatmap.prototype.setScales = function(xScale, yScale, color) {

    var self = this;

    if (!xScale) {
        throw new Error('An x scale should be set as xScale property');
    }

    if (!yScale) {
        throw new Error('A y scale should be set as yScale property');
    }

    this.xScale = xScale;
    this.yScale = yScale;
    this.colorScale = color;


    this.x = function(d, i) {
        return self.xScale(self.xAccessor(d, i));
    };
    this.y = function(d, i) {
        return self.yScale(self.yAccessor(d, i));
    };
    this.color = function(d, i) {
        return self.colorScale(self.colorAccessor(d, i));
    };

};

Heatmap.prototype.draw = function(dataObject) {
    var data = dataObject.data;

    var cellW = this.xScale.rangeBand();
    var cellH = this.yScale.rangeBand();

    var self = this;

    this.rects = this.series.selectAll('rect.cell')
        .data(data, function(d, i) {
            return self.xAccessor(d, i) + self.yAccessor(d, i);
        });

    this.rects.enter()
        .append('rect')
        .attr('class', 'cell')
        .attr('x', function(d, i) {
            return self.x(d, i) + self.xScale.rangeBand();
        })
        .attr('y', this.y)
        .attr('width', cellW)
        .attr('height', cellH)
        .attr('fill-opacity', 0)
        .attr('fill', this.color);

    this.rects.exit()
        .transition()
        .duration(this.options.duration)
        .ease('linear')
        .attr('x', -self.xScale.rangeBand())
        .attr('fill-opacity', 0)
        .remove();

    this.redraw();

};

Heatmap.prototype.redraw = function() {

    var cellW = this.xScale.rangeBand();
    var cellH = this.yScale.rangeBand();

    this.rects
        .attr('fill', this.color)
        .transition()
        .duration(this.options.duration)
        .ease('linear')
        .attr('x', this.x)
        .attr('y', this.y)
        .attr('width', cellW)
        .attr('height', cellH)
        .attr('fill-opacity', 1);

};

module.exports = Heatmap;
