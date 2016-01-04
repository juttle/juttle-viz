var _ = require('underscore');
var Backbone = require('backbone');

var Grid = require('../generators/grid');
var Points = require('../generators/points');
var xAxisGenerator = require('../generators/x-axis');
var yAxisGenerator = require('../generators/y-axis');
var commonOptionDefaults = require('../utils/default-options')();

var DataTarget = require('../data-targets/scatter-data-target');

var ScatterChart = function (container, options) {
    this._attributes = options;

    _.defaults(this._attributes, {
        width : commonOptionDefaults.width,
        height : commonOptionDefaults.height
    });

    this._xScale = this._attributes.xScale;
    this._yScale = this._attributes.yScale;
    this._colorScale = this._attributes.colorScale;
    this._controlField = this._attributes.controlField;
    this._valueField = this._attributes.valueField;
    this._keyField = this._attributes.keyField;

    this._chartCont = container.append('g')
        .attr('class', 'chart-container')
        .attr('transform', 'translate(' + this._attributes.margin.left + ',' + this._attributes.margin.top + ')');

    // array of components that need to re-sized when chart re-sizes
    this._components = [];

    // order is important here for both display layering and dependencies
    this._addAxes();
    this._addGrids();
    this._addPoints();

    // configure a data target
    this._dataTarget = new DataTarget(0, {
        timeField: this._attributes.timeField
    });

};

_.extend(ScatterChart.prototype, Backbone.Events);

ScatterChart.prototype._addPoints = function() {
    var dataGrp = this._chartCont.append('g')
        .attr('class', 'data');

    this._points = new Points(dataGrp, {
        radius: this._attributes.markerSize,
        opacity: this._attributes.markerOpacity,
        margin: this._attributes.margin,
        timeField: this._attributes.timeField,
        controlField: this._attributes.controlField,
        valueField: this._attributes.valueField,
        keyField: this._attributes.keyField,
        series: this._attributes.series
    });

    this._points.on('showtooltip', this._onShowTooltip, this);
    this._points.on('hidetooltip', this._onHideTooltip, this);

    this._points.setScales(this._xScale,this._yScale,this._colorScale);

};


ScatterChart.prototype._addAxes = function() {
    var axesArea = this._chartCont.append('g')
        .attr('class', 'axes');

    this._yAxis = new yAxisGenerator(axesArea.node(), _.extend(_.clone(this._attributes), {
        yAxisOrientation : this._attributes.yScalesOptions.primary.displayOnAxis === 'left' ? 'left' : 'right'
    }));

    if (this._attributes.showRightAxisTicks) {
        this._rightAxis = new yAxisGenerator(axesArea.node(), _.extend(_.clone(this._attributes), {
            yAxisOrientation : this._attributes.yScalesOptions.primary.displayOnAxis === 'left' ? 'right' : 'left',
            tickLabelsVisible: false
        }));
        this._rightAxis.setScale(this._yScale);
        this._rightAxis.draw(false);
    }

    this._xAxis = new xAxisGenerator(axesArea.node(), _.extend(_.clone(this._attributes), {
        avoidLabelCollisions : false,
        isCategorical: false
    }));

    this._xAxis.setFormat(this._attributes.xScalesOptions.primary.tickFormat);
    this._xAxis.setScale(this._xScale);
    this._xAxis.draw(false);

    this._yAxis.setFormat(this._attributes.yScalesOptions.primary.tickFormat);
    this._yAxis.setScale(this._yScale);
    this._yAxis.draw(false);

};

ScatterChart.prototype._addGrids = function() {
    
    // this will draw a line at 0 when x minValues < 0
    this._xGrid = new Grid(this._chartCont, {
        orientation : 'vertical' // vs 'vertical'
    });
    this._xGrid.setScale(this._xScale);
    this._xGrid.setLines([0]);
    this._xGrid.setDuration(commonOptionDefaults.duration);
    this.registerComponent(this._xGrid);

    // this will draw a line at 0 when y minValues < 0
    this._yGrid = new Grid(this._chartCont, {
        orientation : 'horizontal' // vs 'vertical'
    });
    this._yGrid.setScale(this._yScale);
    this._yGrid.setLines([0]);
    this._yGrid.setDuration(commonOptionDefaults.duration);
    this.registerComponent(this._yGrid);

};

ScatterChart.prototype.doUpdate = function() {
    this._currentData = this._dataTarget.getData();
    this.draw();
};

ScatterChart.prototype._onShowTooltip = function(point,color) {
    this.trigger('showtooltip', point, color);
};

ScatterChart.prototype._onHideTooltip = function() {
    this.trigger('hidetooltip');
};


// get the start and end of the current data point range
ScatterChart.prototype._getTimeRange = function(data) {
    _.sortBy(data, function(d) { return d[this._attributes.timeField]; }, this);

    return {
        from: data[0][this._attributes.timeField],
        to: data[data.length-1][this._attributes.timeField]
    };

};

ScatterChart.prototype.calibrate = function(xTickValues, yTickValues) {
    
    this._xAxis.axis.tickValues(xTickValues);
    this._yAxis.axis.tickValues(yTickValues);

    this._xAxis.draw();
    this._xGrid.draw();

    this._yAxis.draw();
    this._yGrid.draw();

    if (this._rightAxis) {
        this._rightAxis.axis.tickValues(yTickValues);
        this._rightAxis.draw();
    }
};

ScatterChart.prototype.getxAxisTicks = function() {
    return this._xAxis.axis.ticks()[0];
};

ScatterChart.prototype.getyAxisTicks = function() {
    return this._yAxis.axis.ticks()[0];
};

ScatterChart.prototype.draw = function() {
    var data = this._currentData || [];

    this._points.draw(data);
    
    // if data has 'time' update time range
    if (data[0] && data[0][this._attributes.timeField]) {
        this.trigger('updatetime', this._getTimeRange(data));
    }

};

ScatterChart.prototype.resize = function(w, h) {

    var m = this.getMargin();
    var yRange = [ h - (m.top + m.bottom), 0 ];
    var xRange = [ 0, w - (m.left + m.right) ];

    this._xScale.range(xRange);
    this._yScale.range(yRange);

    this._xAxis.resize(w, h);
    this._yAxis.resize(w, h);

    if (this._rightAxis) {
        this._rightAxis.resize(w, h);
    }

    _.each(this._components, function(cmp) {
        cmp.resize(
            {
                width : w,
                height : h,
                margin : m
            }
        );
    });

    return this.draw();
};

ScatterChart.prototype.getChartContainer = function() {
    return this._chartCont;  
};

ScatterChart.prototype.getDataTarget = function() {
    return this._dataTarget;  
};

ScatterChart.prototype.getMargin = function() {
    return this._attributes.margin;  
};

ScatterChart.prototype.registerComponent = function(component) {
    this._components.push(component);
};

module.exports = ScatterChart;
