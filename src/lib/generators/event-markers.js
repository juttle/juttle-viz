var d3 = require('d3');
var _ = require('underscore');
var EventIcons = require('../utils/marker-icon-unicode');
var seriesGeneratorUtils = require('./utils/series-generator-utils');
var marked = require('marked');

// the marker path generator
var markerPath = 'M44,0C18.818,0,0,21.996,0,47.416C0,79.621,44,100,44,100s44-20.379,44-52.584  C88,22.33,69.228,0,44,0z';

// event marker constructor
var EventMarkers = function(el, options) {
    // default options for the line
    var defaults = require('../utils/default-options')();

    // if we don't pass options, just
    // make it an empty object
    if (typeof options === 'undefined' ) {
        options = {};
    }

    options = _.defaults(options, defaults);
    this.width = options.width;
    this.height = options.height;
    this.margin = options.margin;
    
    this.useMarkdown = options.useMarkdown;

    this.el = el;

    this._data = [];

    this.selection = d3.select(el).append('g')
        .attr('class', 'markerSeries');
    if (options.clipId) {
        this.selection.attr('clip-path', 'url(#' + options.clipId + ')');
    }

    this.xScale = function() {
        throw new Error('X scale not set');
    };

    this.xfield = options.xfield;
    this.xfieldFormat = options.xfieldFormat;
    this.title = options.title;
    this.text = options.text;
    this.type = options.type;

    // XXX wire this up
    this.duration = options.duration || 250;

    this.currentDatapoint = null;

    this.draw_range = null;
};

EventMarkers.prototype.setScales = function(xScale, ignored) {
    this.xScale = xScale;
};

EventMarkers.prototype.set_duration = function(d) {
    this.duration = d;
};

EventMarkers.prototype.hide = function() {
    this.selection.attr('display', 'none');
};

EventMarkers.prototype.show = function() {
    this.selection.attr('display', null);
};

EventMarkers.prototype.hover_find = function(t) {
    var closestIndex = seriesGeneratorUtils.getClosestIndex(t, _.pluck(this._data, this.xfield));
    var closestPoint = this._data[closestIndex];

    return seriesGeneratorUtils.checkIfPointWithinThreshold(t, closestPoint, this.xScale, this.xfield) ? closestPoint : null;
};

EventMarkers.prototype.hover_on = function(data) {
    this.selection.selectAll('g.event-marker').classed('hover', function(d) {
        return data === d;
    });
};

EventMarkers.prototype.hover_off = function(data) {
    this.selection.selectAll('g.event-marker').classed('hover', false);
};

EventMarkers.prototype.getTooltipContents = function(d, series) {
    if (d === null) {
        return null;
    }
    var elem = d3.select(document.createElement('li'));
    elem.classed('event', true);
    
    if (this.useMarkdown) {
        elem.append('div').classed('event-name', true).html(marked(d[this.title] || ''));
        elem.append('div').classed('event-message', true).html(marked(d[this.text] || ''));
    } else {
        elem.append('div').classed('event-name', true).text(d[this.title] || '');
        elem.append('div').classed('event-message', true).text(d[this.text] || '');
    }
    return elem.node();
};

EventMarkers.prototype.update = function(payload, range) {
    var data = payload.data;
    if (range !== undefined) {
        this.draw_range = range;
    }

    if (data !== undefined) {
        this._data = data;
    }

    this.draw();
};

EventMarkers.prototype.redraw = function(range) {
    this.draw_range = range;
    this.draw();
};

EventMarkers.prototype.draw = function() {
    var self = this;

    this.selection.selectAll('g.event-marker')
        .data(this._data, function(d) { return d[self.xfield]; })
        .call(drawMarker);

    function calculateTransform (d) {
        var x = self.xScale(d[self.xfield]);
        return 'translate(' + x + ',' + '-' + self.margin.top + ')';
    }

    // function to draw one marker
    function drawMarker (d, i) {
        var markerGroup = this;

        markerGroup.exit()
            .transition()
            .duration(self.duration/2)
            .ease('linear')
            .attr('opacity', 0)
            .attr('transform', calculateTransform)
            .each('end', function(d) {
                d3.select(this).remove();
            });

        var markerGroupEnter = markerGroup.enter()
            .append('g')
            .attr('class', 'event-marker')
            .attr('opacity', 0)
            .attr('transform', calculateTransform);

        // draw the line
        markerGroupEnter.append('line')
            .attr('class', 'vertical-line')
            .attr('x1', 0)
            .attr('x2', 0)
            .attr('y1', self.margin.top)
            .attr('y2', self.height - self.margin.bottom + 4);

        // draw the icon
        var icon = markerGroupEnter.append('g')
            .attr('class', 'icon')
            .attr('fill', '#7EC7FF')
            .attr('transform', 'translate(-9,1)');

        icon.append('path')
            .attr('class', 'iconMarker')
            .attr('d', markerPath)
            .attr('transform', 'scale(0.2)');

        icon.append('text')
            .attr('font-family', 'FontAwesome')
            .attr('dominant-baseline', 'central')
            .attr('font-size', '15px')
            .attr('text-anchor', 'middle')
            .attr('y', 9)
            .attr('x', 9)
            .text(function(d) {
                if (!d[self.type]) {
                    return;
                }

                var fullClass = (d[self.type].indexOf('fa-') === 0) ? d[self.type] : 'fa-' + d[self.type];
                return EventIcons[fullClass] ? String.fromCharCode(parseInt(EventIcons[fullClass],16)) : '';
            });

        // update the transform on the markerGroup
        markerGroup
            .attr('opacity', 1)
            .attr('transform', calculateTransform);

    }
};

EventMarkers.prototype.resize = function(w, h) {
    this.width = w;
    this.height = h;
    this.selection.select('line.vertical-line')
        .attr('y1', this.margin.top)
        .attr('y2', this.height - this.margin.bottom + 4);
};

module.exports = EventMarkers;
