var _ = require('underscore');
var Backbone = require('backbone');

function ContextChartInstrumentor(chart) {
    this._chart = chart;
    this._zoomed = false;
    chart.on('brushend', this._onBrushEnd, this);
}

_.extend(ContextChartInstrumentor.prototype, Backbone.Events);

ContextChartInstrumentor.prototype._onBrushEnd = function(isBrushed) {
    // if it is not already zoomed, fire off the timechart-zoomed event
    if (!this._zoomed) {
        this.trigger('metrics-event', {
            name : 'timechart-zoomed'
        });
    }
    else {
        this.trigger('metrics-event', {
            name : isBrushed ? 'timechart-zoom-updated' : 'timechart-zoom-cleared'
        });
    }

    this._zoomed = isBrushed;
};

ContextChartInstrumentor.prototype.destroy = function() {
    var chart = this._chart;
    chart.off('brushend', this._onBrushEnd, this);
};

module.exports = ContextChartInstrumentor;