var metricsManager = require('applib/jut-app/managers/metrics-manager').getInstance();
var ContextChartInstrumentor = require('applib/components/jut-charts/components/context-chart-instrumentor');

function TimechartInstrumentor(chart, options) {
    options = options || {};
    this._jobId = options.jobId;
    this._chart = chart;
    chart.on('play', this._onPlay, this);
    chart.on('pause', this._onPause, this);
    chart.hover.on('pinned', this._pinChanged, this);

    if (chart.contextChart) {
        this._contextChartInstrumentor = new ContextChartInstrumentor(chart.contextChart, {
            jobId : options.jobId
        });

        this._contextChartInstrumentor.on('metrics-event', function(payload) {
            this._reportEvent(payload.name, payload.attrs);
        }, this);
    }
}

TimechartInstrumentor.prototype.destroy = function() {
    var chart = this._chart;
    chart.off('play', this._onPlay, this);
    chart.off('pause', this._onPause, this);
    chart.hover.off('pinned', this._pinChanged, this);

    if (this._contextChartInstrumentor) {
        this._contextChartInstrumentor.destroy();
        this._contextChartInstrumentor.off('metrics-event');
    }
};

TimechartInstrumentor.prototype._addCommonAttributes = function(attrs) {
    if (!attrs) {
        attrs = {};
    }
    attrs.jobId = this._jobId;
    return attrs;
};

TimechartInstrumentor.prototype._onPlay = function() {
    this._reportEvent('timechart-played');
};

TimechartInstrumentor.prototype._onPause = function() {
    this._reportEvent('timechart-paused');
};

TimechartInstrumentor.prototype._pinChanged = function(isPinned) {
    this._reportEvent(isPinned ? 'timechart-pinned' : 'timechart-unpinned');
};

TimechartInstrumentor.prototype._reportEvent = function(eventName, attrs) {
    metricsManager.reportEvent(eventName, this._addCommonAttributes(attrs));
};

module.exports = TimechartInstrumentor;