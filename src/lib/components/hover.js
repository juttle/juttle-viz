var _ = require('underscore');
var $ = require('jquery');
var Backbone = require('backbone');

var Tooltip = require('../generators/tooltip');
var TimeBars = require('../generators/time-bars');
var Line = require('../generators/line');
var EventMarkers = require('../generators/event-markers');
var d3formatters = require('../utils/d3-formatters');

var TOOLTIP_SERIES_TYPE_ORDERING = [Line, TimeBars, EventMarkers];

var Hover = function(timechart, options) {
    var self = this;
    this.timeChart = timechart;

    this.options = this._applyOptionDefaults(options);

    // when hover is a pinned state, both yellow line and
    // the tooltip don't move
    this.pinned = false;

    this._userHasHovered = false;

    this.hover_line = this.timeChart.el.insert('line', 'g')
        .attr('class', 'vertical-line indicator')
        .style('opacity', 0)
        // XXX
        .attr('y1', 0)
        .attr('y2', this.timeChart.height - (this.timeChart.margin.top + this.timeChart.margin.bottom));

    this.tooltip = new Tooltip(this.timeChart.el.node(), {
        margin : this.timeChart.margin
    });

    this.timeChart.on('box-model-update', function(boxModel) {
        self.tooltip.set_margin(boxModel.margin);
        self.hover_line.attr('y2', boxModel.height - (boxModel.margin.top + boxModel.margin.bottom));
    });

    this.timeChart.on('mouseover', function() {
        self.turnOn();
    });

    this.timeChart.on('mouseout', function(e) {
        if (self.pinned) {
            return;
        }
        self.turnOff();
    });

    this.timeChart.on('mousemove', function(mouse) {
        self.turnOn();
        if (!self.pinned) {
            self.update(mouse);
        }
    });

    this.timeChart.on('click', function(mouse) {
        self.togglePin();
        self.update(mouse);
    });

    this.timeChart.on('update', function() {
        if (self._isHovering) {
            self.update();
        }
    });
};

_.extend(Hover.prototype, Backbone.Events);

Hover.prototype._applyOptionDefaults = function(options) {
    options = options || {};
    return _.defaults(options, {
        xfield : 'time'
    });
};

Hover.prototype.turnOn = function() {
    if (this._isHovering) { return; }

    this._showHoverLine();
    this._showTooltip();
    this._isHovering = true;
    this._userHasHovered = true;
};

/**
 * Toggles the pinned state.
 * @param  {[type]} pin Sets the pinned state to this value if passed in.
 * @return {[type]}     [description]
 */
Hover.prototype.togglePin = function(pin) {
    this.pinned = pin !== undefined ? pin : !this.pinned;
    this.tooltip.togglePin(this.pinned);
    this.trigger('pinned', this.pinned);
};

Hover.prototype.turnOff = function() {
    var self = this;
    var series = this.timeChart.series;

    self._hideHoverLine();
    this._hideTooltip();

    _.map(series, function(series) {
        series.generator.hover_off && series.generator.hover_off();
    } );
    self._isHovering = false;
};

Hover.prototype.update = function(mouse) {
    // remember the last mouse position and use that
    // (used when chart updates and the mouse is not touched)
    this._lastHoverPosition = mouse ? mouse[0] : this._lastHoverPosition;
    var x = mouse ? mouse[0] : this._lastHoverPosition;

    var items = this._getSeriesAndClosePoints(x);

    // update hover line positioning
    this.hover_line
        .attr('x1', x)
        .attr('x2', x);

    // update tooltip positioning
    this.tooltip.position({
        top : 40,
        left : x,
        pointWidth : 0
    });

    this._updateSeriesHover(items);

    this._updateTooltip(this.timeChart.getDisplayedXScale().invert(x), this._buildTooltipBody(items));
};

/**
 * Returns an array where each item contains a series and a point in that series
 * that falls within threshold (if there is one)
 * @param  {[type]} x         [description]
 * @param  {[type]} threshold [description]
 * @return {[type]}           [description]
 */
Hover.prototype._getSeriesAndClosePoints = function(x) {
    var series = this.timeChart.getVisibleSeries();

    return _.map(series, function(series) {
        var t = series.xScale.d3scale.invert(x);
        var closestPoint = series.generator.hover_find && series.generator.hover_find(t);
        return {
            point : closestPoint,
            series : series
        };
    } );
};

Hover.prototype._updateTooltip = function(time, tooltipBody) {
    this.tooltip.setHeader(d3formatters.timeUTC(time));
    this.tooltip.setBody(tooltipBody);
};

/**
 * Update the hover indicators for the series in items
 * based on whether there is a "close point" for each series
 * @param  {[type]} items [description]
 * @return {[type]}       [description]
 */
Hover.prototype._updateSeriesHover = function(items) {
    _.each(items, function(item) {
        var gen = item.series.generator;
        if (item.point) {
            if (gen.hover_on) {
                gen.hover_on(item.point);   
            }
        }
        else {
            if (gen.hover_off) {
                gen.hover_off();
            }
        }
    });
};

/**
 * Returns a list element that contains the contents for all the series
 * that need to be shown.
 * @param  {[type]} items [description]
 * @return {[type]}       [description]
 */
Hover.prototype._buildTooltipBody = function(items) {
    var self = this;
    var tooltipBody = document.createElement('ul');
    $(tooltipBody).addClass('series');

    function buildTooltipItemsForSeries(items) {
        var tooltipItems = items.map(function(item, i) {
            return item.series.generator.getTooltipContents(item.point, item.series);
        }).filter(function(item) {
            return item !== null;
        });

        return tooltipItems.map(function(item, i) {
            if (i === tooltipItems.length - 1) {
                $(item).addClass('last');
            }
            if (i === 0) {
                $(item).addClass('first');
            }
            return item;
        });
    }

    TOOLTIP_SERIES_TYPE_ORDERING.forEach(function(seriesGenerator) {
        var seriesTypeItems = items.filter(function(item) {
            return item.series.generator instanceof seriesGenerator;
        });

        if (self._seriesOrder) {
            seriesTypeItems = _.sortBy(seriesTypeItems, function(item) {
                return self._seriesOrder.indexOf(item.series.id);
            });
        }

        buildTooltipItemsForSeries(seriesTypeItems).forEach(function(item) {
            $(tooltipBody).append(item);
        });
    });

    return tooltipBody;
};

Hover.prototype._hideHoverLine = function() {
    if (this.hover_line) {
        // matches tooltip behavior. would be good to coordinate or make configurable
        this.hover_line.transition().duration(250).style('opacity', 0);
    }
};

Hover.prototype._showHoverLine = function() {
    if (this.hover_line) {
        // matches tooltip behavior. would be good to coordinate or make configurable
        this.hover_line.transition().duration(250).style('opacity', 1);
    }
};

Hover.prototype._hideTooltip = function() {
    this.tooltip.hide();
};

Hover.prototype._showTooltip = function() {
    this.tooltip.show();
};

Hover.prototype.setSeriesOrder = function(seriesOrder) {
    this._seriesOrder = seriesOrder;
};

Hover.prototype.resize = function(boxModel) {
    if (this.hover_line && boxModel) {
        this.hover_line.attr('y2', boxModel.height - (boxModel.margin.top + boxModel.margin.bottom));
    }
};

module.exports = Hover;
