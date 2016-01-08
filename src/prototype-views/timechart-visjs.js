var Base = require('extendable-base');
var vis = require('vis');
var SeriesDetector = require('../lib/series-detector');

var Timechart = Base.extend({
    initialize: function(options) {

        // TODO: don't hardcode fieldsToIgnore
        this._seriesDetector = new SeriesDetector({
            fieldsToIgnore: ['time', 'value']
        });

        this._groups = new vis.DataSet();

        var container = document.createElement('div');
        this.visuals = [
            container
        ];

        this._data = new vis.DataSet();

        this._graph = new vis.Graph2d(container, this._data, this._groups, {
            legend: true
        });
    },

    consume: function(points) {
        var self = this;

        if (!this._hasReceivedData) {
            this._hasReceivedData = true;
        }
        points.forEach(function(point) {
            var series = self._seriesDetector.getSeriesForPoint(point);
            if (!self._groups.get(series.id)) {
                // TODO: build correct series label
                self._groups.add({
                    id: series.id,
                    content: 'Series ' + series.id
                });
            }
            // TODO: use automatically determined value field
            self._data.add({
                x: point.time,
                y: point.value,
                group: series.id
            });
        });
    },

    consume_eof: function() {
        // TODO: tried updating the window in `consume` as points arrive
        // but updating it multiple times wasn't working so updating here once we have all the data
        //  - won't work for streaming
        //  - should be able to do it more efficiently by getting the first item and last item
        //    in the data set, but couldn't find the methods for it in the docs yet...
        this._graph.setWindow(this._data.min('x').x, this._data.max('x').x);
    }
});

module.exports = Timechart;
