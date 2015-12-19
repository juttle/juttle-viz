var d3 = require('d3');
var _ = require('underscore');

var Heatmap = require('../generators/heatmap');
var Line = require('../generators/line');

var TimeWindowedDataTarget = require('../data-targets/time-windowed-data-target');
var chartColors = require('../utils/jut-color-scale');
var xAxisGenerator = require('../generators/x-axis');
var yAxisGenerator = require('../generators/y-axis');

var HeatmapChart = function(container, options) {
    var defaults = require('../utils/default-options')();

     if (options.xAxisOrientation === 'top') {
        // set up a nice margin in case there's none set
        defaults.margin = {
            top: 75,
            bottom: 20,
            left: 20,
            right: 75
        };
    } else {
        // set up a nice margin in case there's none set
        defaults.margin = {
            top: 20,
            bottom: 75,
            left: 75,
            right: 20
        };
    }

    // set to be an object in case
    // it's undefined
    options = options || {};

    // extend the defaults
    options = _.defaults(options, defaults);

    this.options = options;
    this.color_scale = chartColors.getColorScale();
    // set up our options
    if (options.hasOwnProperty('window')) {
        // window is a time duration in ms
        this.window = options.window;
    } else {
        // default to last minute in ms
        this.window = 1000 * 60;
    }

    this.svg = d3.select(container).append('svg')
        .attr('class', 'jut-chart')
        .attr('width', options.width)
        .attr('height', options.height);

    this.el = this.svg.append('g')
        .attr('class', 'chart-container')
        .attr('transform', function() {
            return 'translate(' + options.margin.left + ',' + options.margin.top + ')';
        });

    // we need a clip path for the lines, but only one, so we
    // put it here.
    this.clipRect = this.el.append('defs')
        .append('clipPath')
        .attr("id", "lineClip")
        .append('rect')
        .attr('height', this.options.height - (this.options.margin.top + this.options.margin.bottom))
        .attr('width', this.options.width - (this.options.margin.left + this.options.margin.right));


    // add layers for axes
    // so that the data draws on top
    this.axesArea = this.el.append('g')
        .attr('class', 'axes');

    // and for data
    this.heatArea = this.el.append('g')
        .attr('class', 'heat-area');

    // and the line
    this.lineArea = this.el.append('g')
        .attr('class', 'line-area');

    var yRange = [
        options.height - (options.margin.top + options.margin.bottom),
        0
    ];

    var xRange = [
        0,
        options.width - (options.margin.left + options.margin.right)
    ];


    this.xScale = d3.scale.ordinal()
        .rangeBands(xRange, options.padding);

    this.xAxisScale = d3.time.scale()
        .range(xRange);

    this.yScale = d3.scale.ordinal()
        .rangeBands(yRange, options.padding);

    this.yAxisScale = d3.scale.linear()
        .range(yRange);

    // this is for the lines and the right side axis.
    this.yScale2 = d3.scale.linear()
        .range(yRange);

    this.colorScale = d3.scale.quantize()
        // XXX make this separate.
        .range(["#FFFFFF","#F6E8E5","#EDD1CC","#E4BAB2","#DCA499","#D38D7F","#CA7666","#C2604C","#B94932", "#B03219", "#A81C00"]);


    this.heatmap = new Heatmap(this.heatArea.node(), _.extend(options, {
        // color: this.color_scale(0)
    }));

    // we'll store the lines and their data targets here
    this.lines = [];
    this.dataTargets = [];
    this.lineTokens = []; // store tokens here.

    this.xAxis = new xAxisGenerator(this.axesArea.node(), options);
    this.yAxis = new yAxisGenerator(this.axesArea.node(), options);

    this.heatmap.setScales(this.xScale, this.yScale, this.colorScale);
    this.xAxis.setScale(this.xAxisScale);
    this.yAxis.setScale(this.yAxisScale);

    var self = this;

    this.dataTarget = {
        _data: [],
        push: function(data, doWindow) {
            this._data = this._data.concat(data);

            // calculate what the latest date we can use is
            var newestDate = self.options.xAccessor(this._data[this._data.length - 1]);

            // and what the oldest is (i.e the beggining of our window)
            var oldestDate = new Date(newestDate - self.window);

            // go over the data and snip out any data that
            // doesn't fit with the current window
            // we can't assume the data is sorted so we have
            // to sort it by xAccessor after filtering
            this._data = _.chain(this._data)
                .filter(function(datapoint) {
                    return self.options.xAccessor(datapoint) > oldestDate;
                })
                .sortBy(self.options.xAccessor)
                .value();

            var xDomain = this._data.map(self.options.xAccessor);
            var yDomain = this._data.map(self.options.yAccessor);

            var colorDomain = [0, d3.max(this._data, self.options.colorAccessor)];

            self.onData('data', {
                xDomain : xDomain,
                yDomain : yDomain,
                colorDomain : colorDomain,
                data:this._data
            });

        },
        batch_end: function() {
            // noop - don't do anything with batches.
        },
        stream_end: function() {
            this._data = [];
        }
    };


};

// these functions here will mirror a time series, as they will be called by the
// timeseries sink
HeatmapChart.prototype.addSeries = function(seriesOptions) {

    var id = this.dataTargets.length;

    seriesOptions.window = this.window;

    var dataTarget = new TimeWindowedDataTarget(id, seriesOptions);

    if (seriesOptions.label) {
        dataTarget.label = seriesOptions.label;
    } else {
        dataTarget.label = 'Series ' + id + ' (right axis)';
    }

    if (seriesOptions.color) {
        dataTarget.color = seriesOptions.color;
    } else {
        dataTarget.color = this.color_scale(dataTarget.id);
    }

    // if we haven't set up the yAxis, do it now
    if (!this.yAxis2) {
        this.setupSecondaryAxis();
    }

    this._bindLineDataTarget(dataTarget);
    this.dataTargets.push(dataTarget);
    this._createLineGeneratorFor(dataTarget);

    return dataTarget;

};

HeatmapChart.prototype.setupSecondaryAxis = function() {
    // update the left margin
    this.options.margin.right = 75;
    this.resize();

    this.yAxis2 = new yAxisGenerator(this.axesArea.node(), this.options);
    this.yAxis2.orient('right');
    this.yAxis2.setScale(this.yScale2);

};

HeatmapChart.prototype._bindLineDataTarget = function(dataTarget) {
    this.lineTokens[dataTarget.id] = {
        'data' : dataTarget.on('data', this.onLineUpdate, this),
        'update' : dataTarget.on('update', this.onLineUpdate, this)
    };
};

HeatmapChart.prototype._unbindLineDataTarget = function(dataTarget) {
    var tokens = this.lineTokens[dataTarget.id];
    var i, keys, l;
    for (i = 0, keys = Object.keys(tokens), l = keys.length; i < l; i++) {
        dataTarget.off(tokens[keys[i]]);
    }
    // remove the tokens from the tokens dictionary
    this.lineTokens[dataTarget.id] = null;
};

HeatmapChart.prototype._createLineGeneratorFor = function(dataTarget) {
    var line = new Line(this.lineArea.node(), _.extend(dataTarget.options, {
        color: dataTarget.color,
        label: dataTarget.label
    }));

    line.setScales(this.xAxisScale, this.yScale2);
    this.lines.push(line);
};


HeatmapChart.prototype.onData = function(eventName, data) {
    // update the scales
    this.xScale
        .domain(data.xDomain);
    this.xAxisScale
        .domain(d3.extent(data.xDomain));
    this.yScale
        .domain(data.yDomain);
    this.yAxisScale
        .domain([0, d3.max(data.yDomain)]);
    this.colorScale
        .domain(data.colorDomain);

    this.xAxis.draw();
    this.yAxis.draw();

    if (this.yAxis2) {
        this.yAxis2.draw();
    }

    this.heatmap.draw(data);

    for (var i = 0; i < this.lines.length; i++) {
        this.lines[i].redraw();
    }

};

HeatmapChart.prototype.onLineUpdate = function(eventName, data) {
    data.color = this.dataTargets[data.id].color;
    data.label = this.dataTargets[data.id].label;

    if (eventName === 'update') {
        this.lines[data.id].update(data);
    } else {
        this.lines[data.id].draw(data);
    }

    // this.xScale
    //     .domain(d3.range(data.xDomain)); // try this see if it works
    // this.xAxisScale
    //     .domain(data.xDomain);

    var maxY = d3.max(this.dataTargets, function(dt) {
        return dt.yDomain[1];
    });

    this.yScale2.domain([0, maxY]);

    this.xAxis.draw();
    this.yAxis.draw();
    if (this.yAxis2) {
        this.yAxis2.draw();
    }
    this.heatmap.redraw();

    for (var i = 0; i < this.lines.length; i++) {
        this.lines[i].redraw();
    }

};

HeatmapChart.prototype.resize = function() {
    var yRange = [
        this.options.height - (this.options.margin.top + this.options.margin.bottom),
        0
    ];

    var xRange = [
        0,
        this.options.width - (this.options.margin.left + this.options.margin.right)
    ];

    this.xScale.rangeBands(xRange, this.options.padding);
    this.xAxisScale.range(xRange);
    this.yScale.rangeBands(yRange, this.options.padding);
    this.yAxisScale.range(yRange);
    this.yScale2.range(yRange);

    this.xAxis.resize(this.options.width, this.options.height);
    this.yAxis.resize(this.options.width, this.options.height);

    if (this.yAxis2) {
        this.yAxis2.resize(this.options.width, this.options.height);
    }

    this.svg
        .attr('width', this.options.width)
        .attr('height', this.options.height);

    this.clipRect
        .attr('height', this.options.height - (this.options.margin.top + this.options.margin.bottom))
        .attr('width', this.options.width - (this.options.margin.left + this.options.margin.right));
};

module.exports = HeatmapChart;
