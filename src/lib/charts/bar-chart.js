var d3 = require('d3');
var _ = require('underscore');
var Backbone = require('backbone');
var Promise = require('bluebird');

var Grid = require('../generators/grid');
var Bars = require('../generators/bars');
var xAxisGenerator = require('../generators/x-axis');
var yAxisGenerator = require('../generators/y-axis');
var AxisLabelGenerator = require('../generators/axis-label');
var HoverRect = require('../components/hover-rect');
var commonOptionDefaults = require('../utils/default-options')();
var Backbone = require('backbone');

var CategoricalDataTarget = require('../data-targets/categorical-data-target');
var axisUtils = require('../utils/axis-utils');
var calculateTickValues = axisUtils.calculateTickValues;

var BAR_COUNT_LIMIT = 200;
var CLEAR_BARS_DURATION = 500;

var BAR_COUNT_LIMIT_REACHED = new Backbone.Model({
    code : 'BAR_COUNT_LIMIT_REACHED',
    info : {
        barCountLimit : BAR_COUNT_LIMIT
    }
});

var BarChart = function (container, options) {
    _.extend(this, Backbone.Events);
    this.options = this._applyMarginDefaults(options);

    _.extend(this, Backbone.Events);

    _.defaults(this.options, {
        width : commonOptionDefaults.width,
        height : commonOptionDefaults.height
    });

    this.svg = d3.select(container).append('svg')
        .attr('class', 'jut-chart bar-chart ' + this.options.display.orientation)
        .attr('width', options.width)
        .attr('height', options.height);

    this.el = this.svg.append('g')
        .attr('class', 'chart-container')
        .attr('transform', 'translate(' + options.margin.left + ',' + options.margin.top + ')');

    // XXX we are going to have to update this elsewhere
    this.padding = 0.1;

    this.category = options.categoryField;
    this.value = options.valueField;

    this._components = [];

    this._addScales();
    this._addAxes();
    this._addAxesLabels();
    this._addBars();
    this._addGrid();

    this.dataTarget = new CategoricalDataTarget({
        category : this.category,
        value : this.value,
        categoryCountLimit : BAR_COUNT_LIMIT,
        resetCategories : this.options.display.resetCategories
    });

    this.dataTarget.on('update', this._onUpdate, this);
    this.dataTarget.on('categoryCountLimitReachedUpdate', this._onCategoryLimitReachedUpdate, this);

    this.setup_hover_events();
    this._registerInteractions();
};

BarChart.prototype.registerComponent = function(component) {
    this._components.push(component);
};

BarChart.prototype._addScales = function() {
    this.category_scale = d3.scale.ordinal().range([0,0]);

    var valueScaleType = this.options.yScales.primary.scaling;

    if (valueScaleType === 'linear' ) {
        this.value_scale = d3.scale.linear();
    }
    else if (valueScaleType === 'log') {
        this.value_scale = d3.scale.log();
    }
    else {
        throw new Error('Unsupported scale type: ' + valueScaleType);
    }

    this.value_scale.range([0,0]);

    this.value_scale.clamp(true);
};

BarChart.prototype._addAxes = function() {
    var axesArea = this.el.append('g')
            .attr('class', 'axes');

    if (this.options.display.orientation === 'vertical') {
        this.category_axis = new xAxisGenerator(axesArea.node(), _.extend(_.clone(this.options), {
            avoidLabelCollisions : true,
            isCategorical: true
        }));
        this.value_axis = new yAxisGenerator(axesArea.node(), _.extend(_.clone(this.options), {
            yAxisOrientation : this.options.yScales.primary.displayOnAxis
        }));
    } else {
        this.category_axis = new yAxisGenerator(axesArea.node(), _.extend(_.clone(this.options), {
            avoidLabelCollisions : true,
            isCategorical: true
        }));
        this.value_axis = new xAxisGenerator(axesArea.node(), _.clone(this.options));
    }

    this.value_axis.setFormat(this.options.yScales.primary.tickFormat);
    this.category_axis.setFormat();

    this.category_axis.setScale(this.category_scale);
    this.value_axis.setScale(this.value_scale);

};

BarChart.prototype._addAxesLabels = function() {
    var g = this.el.append('g')
            .attr('class', 'axis-labels');

    // value axis label
    this._valueAxisLabel = new AxisLabelGenerator(g.node(), {
        labelText: this.options.yScales.primary.label,
        orientation: this.options.display.orientation === 'vertical' ? this.options.yScales.primary.displayOnAxis : 'bottom',
        margin: this.options.margin
    });
    this.registerComponent(this._valueAxisLabel);
    this._valueAxisLabel.draw();

    // category axis label
    this._categoryAxisLabel = new AxisLabelGenerator(g.node(), {
        labelText: this.options.xScale.label,
        orientation: this.options.display.orientation === 'vertical' ? 'bottom' : 'left',
        margin: this.options.margin
    });
    this.registerComponent(this._categoryAxisLabel);
    this._categoryAxisLabel.draw();

};

BarChart.prototype._addGrid = function() {
    this._grid = new Grid(this.el, {
        orientation : this.options.display.orientation === 'vertical' ? 'horizontal' : 'vertical'
    });

    this._grid.setScale(this.value_scale);
    this._grid.setDuration(commonOptionDefaults.duration);
    this._grid.setLines([0]);
    this.registerComponent(this._grid);
};

BarChart.prototype._addBars = function() {
    var barsArea = this.el.append('g')
        .attr('class', 'bars');
    // XXX
    var baropts = {
        orientation : this.options.display.orientation,
        category : this.category,
        value : this.value,
        tooltip : this.options.tooltip,
        margin : this.options.margin,
        color : this.options.display.color,
        negativeColor : this.options.display.negativeColor
    };

    this.bars = new Bars(barsArea.node(), baropts);
    this.bars.setScales(this.category_scale, this.value_scale);
};

BarChart.prototype._applyMarginDefaults = function(options) {
    options.margin = options.margin || {};
    if (options.display.orientation === 'vertical') {
        _.defaults(options.margin, {
            top: 20,
            bottom: 75,
            left: options.yScales.primary.displayOnAxis === 'left' ? 75 : 20,
            right: options.yScales.primary.displayOnAxis === 'left' ? 20 : 75
        });
    } else {
        _.defaults(options.margin, {
            top: 20,
            bottom: 75,
            left: 100,
            right: 20
        });
    }

    return options;
};

BarChart.prototype._onUpdate = function(eventName, data) {
    this.draw(data);
};

BarChart.prototype._onCategoryLimitReachedUpdate = function(eventName, limitReached) {
    this.trigger(limitReached ? 'addRuntimeMessage' : 'removeRuntimeMessage', BAR_COUNT_LIMIT_REACHED);
};

/**
 * Calculates a nice min value for a set of data. If the raw min value is greater than the threshold,
 * returns the threshold, otherwise returns the raw min value.
 * @param  {[type]} data [description]
 * @return {[type]}      [description]
 */
BarChart.prototype._calculateNiceMinValue = function(data, field, threshold) {
    var minValue = d3.min(data, function(d) {
            return d[field];
        } );
    return minValue === undefined || minValue > threshold ? threshold : minValue;
};

/**
 * Calculates a nice max value for a set of data. If the raw max value is less than the threshold,
 * returns the threshold, otherwise returns the raw max value.
 * @param  {[type]} data [description]
 * @return {[type]}      [description]
 */
BarChart.prototype._calculateNiceMaxValue = function(data, field, threshold) {
    var maxValue = d3.max(data, function(d) {
        return d[field];
    });
    return maxValue === undefined || maxValue < threshold ? threshold : maxValue;
};

BarChart.prototype.draw = function(data) {
    data  = data || [];
    var self = this;
    var oldKeyOrder =  self.category_scale.domain();
    var newKeyOrder = _.pluck(data, self.category);

    var minValueOption = self.options.yScales.primary.minValue;
    var maxValueOption = self.options.yScales.primary.maxValue;

    var minValue = minValueOption === 'auto' ? self._calculateNiceMinValue(data, self.value, 0) : minValueOption;
    var maxValue = maxValueOption === 'auto' ? self._calculateNiceMaxValue(data, self.value, 0) : maxValueOption;

    var categoryToValue = {};

    var curr_date = null;
    _.each(data, function(dataPoint) {
        if (!curr_date || (curr_date < dataPoint.time)) {
            curr_date = dataPoint.time;
        }
        categoryToValue[dataPoint[self.category]] = dataPoint[self.value];
    });

    this.trigger('time-updated', curr_date);

    this._currentData = data;

    var tick_values = calculateTickValues(minValue, maxValue, self.value_axis.axis.ticks()[0]);
    self.value_scale.domain([tick_values[0], tick_values[tick_values.length -1]]);
    self.value_axis.axis.tickValues(tick_values);

    function tickLabelFontStyle(d) {
        return categoryToValue[d] === null ? 'italic' : null;
    }

    this.category_axis.setTickLabelFontStyle(tickLabelFontStyle);

    this._currentData = data;

    return Promise.try(function() {
        // if the new key order doesn't match the old one, we want to give the impression
        // that the chart is totally redrawing its data, so clear the axis and the bar data
        if ( oldKeyOrder.length !== 0 && ! _.isEqual( oldKeyOrder, newKeyOrder )) {
            self.category_scale.domain([]);
            return Promise.all([ self.bars.draw([], { duration: CLEAR_BARS_DURATION } ),
                self.category_axis.draw(true,{ duration: CLEAR_BARS_DURATION })]);
        }

    }).then(function() {
        self.category_scale.domain(newKeyOrder);
        self._currentData = data;
        self._components.forEach(function(component) {
            component.draw();
        });
        return Promise.all([
            self.category_axis.draw(),
            self.value_axis.draw(),
            self.bars.draw(data)
        ]);
    });
};

BarChart.prototype.resize = function(w, h) {
    var self = this;
    this.svg
        .attr('width', w)
        .attr('height', h);

    this.category_axis.resize(w, h);
    this.value_axis.resize(w, h);

    var margin = this.options.margin;
    var yRange = [ h - (margin.top + margin.bottom), 0 ];
    var xRange = [ 0, w - (margin.left + margin.right) ];

    this.hover_rect.resize(w - (margin.left + margin.right), h - (margin.top + margin.bottom));

    // update the scales
    if (this.options.display.orientation === 'vertical') {
        this.category_scale.rangeBands(xRange, this.padding);
        this.value_scale.range(yRange);
    } else {
        this.category_scale.rangeBands(yRange, this.padding);
        this.value_scale.range(xRange);
    }

    this._components.forEach(function(component) {
        component.resize({
            width : w,
            height : h,
            margin : self.options.margin
        });
    });

    return this.draw(self._currentData);
};

BarChart.prototype.set_category = function(cat) {
    this.category = cat;
    this.dataTarget.set_category(cat);
    this.bars.set_category(cat);
};

BarChart.prototype.set_value = function(val) {
    this.value = val;
    this.dataTarget.set_value(val);
    this.bars.set_value(val);
    // if we don't have a value for value axis label, then set it
    if (this.options.yScales.primary.label === undefined) {
        this._valueAxisLabel.setLabelText(val);
    }

};

BarChart.prototype.setup_hover_events = function() {
    var self = this,
        options = this.options;

    // Create an invisible rectangle on top of the barchart area
    // to grab mouse events
    this.hover_rect = new HoverRect(this.el.node(), {
        width : options.width,
        height : options.height
    });

    this.hover_rect
        .on('mouseover', function(event) {
            self.trigger('mousemove', event);
        })
        .on('mousemove', function(mouse) {
            self.trigger('mousemove', mouse);
        })
        .on('mouseout', function(event) {
            self.trigger('mouseout', event);
        });
};

BarChart.prototype.destroy = function() {
    this.off('mousemove');
    this.off('mouseout');
    this.hover_rect.destroy();
};

BarChart.prototype._registerInteractions = function() {
    var d,
        bars,
        data,
        series,
        mousePosition,
        barPosition,
        barSize,
        showTooltip;

    this.on('mousemove', function(mouse) {
        d = d3.event;
        bars = this.bars;
        data = bars._data;
        series = bars.series;
        showTooltip = false;

        data.forEach(function(point) {
            barPosition = bars.category_scale(point[bars.category_field]);
            barSize = bars.category_scale.rangeBand();

            if (bars.orientation === 'vertical') {
                mousePosition = mouse[0];
            }
            else {
                mousePosition = mouse[1];
            }

            if (mousePosition >= barPosition && mousePosition <= barPosition + barSize) {
                showTooltip = true;
                bars.hover_on(point);
            }
        });

        if (!showTooltip) {
            bars.hover_off();
        }
    });

    this.on('mouseout', function(mouse) {
        d = d3.event;

        bars.hover_off(d);
    });

};

BarChart.prototype.getMargin = function() {
    return this.options.margin;
};

module.exports = BarChart;
