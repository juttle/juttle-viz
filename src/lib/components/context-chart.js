var _ = require('underscore');
var Backbone = require('backbone');
var TimeChart = require('../charts/time-base');
var d3 = require('d3');

var CONTEXT_CHART_HEIGHT = 50;
var DATA_DENSITY = 5;

function ContextChart(options) {
    this.el = document.createElement('div');

    this.chart = new TimeChart(this.el, {
        window: options.window,
        xfield: options.xfield,
        yfield: options.yfield,
        live: options.live,
        margin: _.extend(_.clone(options.margin), { top: 0, bottom: 20})
    });

    this._series = [];

    this._brush = d3.svg.brush()
        .on('brush', _.bind(this._onBrushed, this))
        .on('brushend', _.bind(this._onBrushEnded, this));

    this._brushEl = this.chart.el
        .append('g')
        .attr('class', 'x brush')
        .call(this._brush);

    this._brushEl
        .selectAll('rect')
        .attr('height', this.chart.height - (this.chart.margin.top + this.chart.margin.bottom));
}

_.extend(ContextChart.prototype, Backbone.Events);

ContextChart.prototype.resize = function(width) {
    this.chart.resize(width, CONTEXT_CHART_HEIGHT);
    this._brushEl.call(this._brush);

    this.chart.set_downsample_limit(Math.floor(width/DATA_DENSITY));
    _.values(this.chart.series).forEach(function (series) {
        series.target.set_downsample_limit(Math.floor(width/DATA_DENSITY));
    });

    this._brushEl
        .selectAll('rect')
        .attr('height', this.chart.height - (this.chart.margin.top + this.chart.margin.bottom));
};

ContextChart.prototype.setBrushScale = function(scale) {
    this._brushScale = scale;
    this._brush.x(this._brushScale);
    this._brushEl.call(this._brush);
};

ContextChart.prototype._onBrushed = function() {
    var newDomain = this._getDomainFromBrush();
    this.trigger('brush', newDomain);
};

ContextChart.prototype._onBrushEnded = function() {
    this.trigger('brushend', !this._brush.empty());
};

ContextChart.prototype._getDomainFromBrush = function() {
    return this._brush.empty() ? this._brushScale.domain() : this._brush.extent();
};

ContextChart.prototype.destroy = function() {
    this._brush.on('brush', null);
    this.chart.destroy();
};

module.exports = ContextChart;
