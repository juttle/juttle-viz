var d3 = require('d3');
var _ = require('underscore');
var $ = require('jquery');

var POSITION_OFFSET = 5;

var Tooltip = function(el, options) {

    this.el = el;

    this.options = options;

    var $el = $(el);
    this.$svg = $el.closest('svg');

    //append a tooltip div as a sibling to the svg
    this.div = d3.select(this.$svg.parent().get(0)).append('div')
        .attr('class', 'jut-charts tooltip')
        .style('opacity', 1e-6);

    this.header = this.div.append('div')
        .attr('class', 'header');

    this.header = this.header.append('h4')
        .attr('class', 'title');

    this.body = this.div.append('div')
        .attr('class', 'body');

    this.currentPosition = null;

};

Tooltip.prototype.setHeader = function(header) {
    if (_.isString(header)) {
        this.header.text(header);
    }
    else {
        $(this.header.node()).empty().append(header);
    }
};

Tooltip.prototype.setBody = function(body) {
    if (_.isString(body)) {
        this.body.text(body);
    }
    else {
        $(this.body.node()).empty().append(body);
    }
};

Tooltip.prototype.set_margin = function(margin) {
    this.options.margin = margin;
};

Tooltip.prototype.position = function(d) {

    if (d) {
        this.currentPosition = d;
    }
    else {
        d = this.currentPosition;
    }
    

    //svg's offset parent is always the window for firefox, so we need to use the parent to get the position
    var svgPosition = this.$svg.parent().position();

    var orientation = 'right';
    var triangleWidth = 20; // the triangle arrow thing is 20 pixels wide, so we

    var left = svgPosition.left + d.left + this.options.margin.left + POSITION_OFFSET;
    var top = svgPosition.top + d.top + this.options.margin.top;

    var width = $(this.div.node()).outerWidth();

    var tooltipEndpoint = left + width;

    var svgWidth = this.$svg.width();

    // see if we should orient left
    if (tooltipEndpoint > svgWidth) {
        orientation = 'left';
        left -= (width + d.pointWidth + triangleWidth + 2 * POSITION_OFFSET);
        // if orienting left would make the left side of the tooltip extend beyond svg,
        // orient it in the right direction on the left side
        if (left < 0) {
            orientation = 'right';
            left += (width + 2 * triangleWidth);
        }
    } else {
        left += triangleWidth;
    }

    if (orientation === 'right') {
        this.div
            .classed('left', false);
    } else {
        this.div
            .classed('right', false);
    }

    this.div
        .classed(orientation, true)
        .style('left', Math.floor(left) + 'px')
        .style('top', Math.floor(top) + 'px');

};

Tooltip.prototype.show = function() {

    this.shown = true;

    this.div
        .style('opacity', 0)
        .transition()
        .duration(250)
        .style('opacity', 1);
};

Tooltip.prototype.hide = function() {

    this.shown = false;

    this.div
        .transition()
        .duration(250)
        .style('opacity', 0);
};

Tooltip.prototype.stopTween = function() {
     // stop any currently running tooltip tweening transitions
    d3.select(this.div)
        .transition()
        .duration(0);
};

Tooltip.prototype.togglePin = function(pin) {
    pin = pin !== undefined ? pin : !this._pinned;
    this.div.classed('pinned', pin);
};


Tooltip.prototype.tweenPosition = function(to) {
    if (!this.shown) {
        return;
    }

    var self = this;
    d3.select(this.div)
        .transition()
        .duration(this.options.duration)
        .tween('position', function() {
            var x = d3.interpolate(self.currentPosition.left, to.left);
            var y = d3.interpolate(self.currentPosition.top, to.top);
            var pw = d3.interpolate(self.currentPosition.pointWidth, to.pointWidth);

            return function(t) {
                self.position({
                    left: x(t),
                    top : y(t),
                    pointWidth: pw(t)
                });
            };
        });
};


module.exports = Tooltip;
