var d3 = require('d3');
var _ = require('underscore');

// area constructor -- pretty much the same
// as line (area is just a line path with closing ends.)
var Area = function(el, options) {
    var defaults = require('../utils/default-options')();

    if (typeof options === 'undefined') {
        options = {};
    }

    this.options = _.extend(defaults, options);
    this.color = this.options.color;

    this.xAccessor = this.options.xAccessor;
    this.yAccessor = this.options.yAccessor;

    this.el = el;

    this.selection = d3.select(el);

    this.transform = 0;

    this._data = [];

    this.area = d3.svg.area();

    this.zeroArea = d3.svg.area();

    this.series = this.selection.append('g')
        .attr('class', 'series')
        .attr('clip-path', 'url(#areaClip)');
};

// setup accessors and scales together to feed
// to the area generator
Area.prototype.setScales = function(xScale, yScale) {
    var self = this;

    if (!xScale) {
        throw new Error('An x scale should be set as xScale property');
    }

    if (!yScale) {
        throw new Error('An y scale should be set as yScale property');
    }

    this.xScale = xScale;
    this.yScale = yScale;

    this.x = function(d, i) {
        return self.xScale(self.xAccessor(d, i));
    };
    this.y = function(d, i) {
        return self.yScale(self.yAccessor(d, i));
    };

    this.area.x(this.x).y0(this.options.height).y1(this.y);
    this.zeroArea.x(this.x).y0(this.options.height).y1(this.options.height);
};

// creates and attaches a <g><path/></g> to the
// container
Area.prototype.draw = function(data) {

    this.paths = this.series.selectAll('path.area')
        .data([data.data]);

    this.paths.exit()
        .transition()
        .duration(this.options.duration)
        .remove();

    this.paths.enter()
        .append('path')
        .attr('class', 'area')
        .attr('fill', this.options.color)
        .attr("d", this.zeroArea);

    this.redraw();

    // set the first "old" point.
    this.old_x_right = data.data[data.data.length - 1];
};

// update the area with new data. if `options.transition === replace`
// or if we've never drawn the area, the current line will just be
// replaced, otherwise, we do a window transition so it slides
// smoothly
Area.prototype.update = function(data) {

    // calculate the transform to apply to the area
    var transform = 0;
    var new_x_right;
    if (data.data.length > 0) {
        new_x_right = data.data[data.data.length - 1];
    }

    if (this.old_x_right) {
        transform = this.x(this.old_x_right) - this.x(new_x_right);
    }

    if (!_.isUndefined(new_x_right)) {
        this.old_x_right = new_x_right;
    }

    this.transform = transform;

    this.paths
        .data([data.newData]);

    this.redraw();

};

Area.prototype.redraw = function() {
    if (!this.paths) {
        return;
    }

    this.paths
        .attr('d', this.area)
        .attr('transform', null)
        .transition()
        .duration(this.options.duration - 25)
        .ease("linear")
        .attr("transform", 'translate(' + this.transform + ', 0)');
};

module.exports = Area;














