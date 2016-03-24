'use strict';

let SeriesDetector = require('../lib/series-detector');
let Highcharts = require('highcharts');
let JuttleView = require('./juttle-view');
let _ = require('underscore');

var objectValidation = require('../lib/object-validation');

class HighchartView extends JuttleView {
    constructor(options) {
        super(options);
        options = options || {};
        options = this._applyOptionDefaults(options.params);

        this._verifyOptionsAreValid(options);

        this._attributes = this._convertUserOptionsToAttributes(options);

        this._valueValidator.setValueField(this._attributes.valueField);

        this._series = {};

        this._seriesDetector = new SeriesDetector({
            fieldsToIgnore: [ this._attributes.xField ],
            keyField: this._attributes._keyField
        });

        // Inject this view's el into the user-provided
        // highchart constructor options.
        let highchartConfig = _.extend(options.highchartOptions, {
            chart: _.extend({ renderTo: this.sinkBodyEl }, options.highchartOptions.chart )
        });

        this.chart = Highcharts.chart(highchartConfig);
    }

    _applyOptionDefaults(options) {
        options = options || {};

        return _.extend({
            xField: 'time',
            highchartOptions: this._applyHighchartOptionsDefaults(options.highchartOptions)
        }, options);
    }

    _applyHighchartOptionsDefaults(highchartOptions) {
        highchartOptions = highchartOptions || {};

        return _.extend({
            xAxis: _.extend({
                type: 'datetime'
            }, highchartOptions.xAxis),
            chart: _.extend({}, highchartOptions.chart)
        }, highchartOptions);
    }

    _addSeries(series) {
        let seriesLabel = this._seriesDetector.getSeriesLabel(series.id);
        let config = this._findMatchingSeriesConfig(series.keys);
        seriesLabel = seriesLabel !== '' ? seriesLabel : this._attributes.valueField;

        this.chart.addSeries(_.extend({
            id: 'series-' + series.id,
            name: seriesLabel
        }, config));

        this._series[series.id] = series;
    }

    _convertUserOptionsToAttributes(options) {
        return _.pick(options, 'valueField', 'keyField', 'xField', 'series');
    }

    _consume(points) {
        if (points.length === 0) {
            return;
        }

        if (this._attributes.valueField === undefined && !this._determineValueField(points, [ this._attributes.xField ])) {
            return;
        }

        points.forEach((point) => {
            let series = this._seriesDetector.getSeriesForPoint(point);

            if (!this._series[series.id]) {
                this._addSeries(series);
            }

            let xFieldValue = point[this._attributes.xField];

            this.chart.get('series-' + series.id).addPoint([
                _.isDate(xFieldValue) ? xFieldValue.getTime() : xFieldValue,
                point[this._attributes.valueField] ]);
        });
    }

    // Check to see if any of the `keys` values matches a user-specified
    // series configuration key. If it does, return the series configuration.
    _findMatchingSeriesConfig(keys) {
        let keyValues = _.values(keys);
        let seriesConfig = {};
        if (this._attributes.series) {
            let seriesConfigKeys = Object.keys(this._attributes.series);
            for(let i = 0; i < seriesConfigKeys.length; i++) {
                let configKey = seriesConfigKeys[i];
                let config = this._attributes.series[configKey];

                if (_.contains(keyValues, configKey)) {
                    seriesConfig = config;
                    break;
                }
            }
        }

        return seriesConfig;
    }

    setDimensions(id, width, height) {
        this.chart.setSize(width, height, false);
    }

    destroy() {
        this.chart.destroy();
        super.destroy();
    }

    _verifyOptionsAreValid(options) {
        var errs = objectValidation.validate(options, HighchartView.optionValidationConfig);

        if (errs !== undefined) {
            this.throwParamValidationError(errs);
        }
    }

    _setValueField(valueField) {
        this._attributes.valueField = valueField;
    }

    static optionValidationConfig = {
        allowedProperties : [
            'id',
            'keyField',
            'xField',
            'valueField',
            'highchartOptions',
            'series',
            'row',
            'col'
        ]
    }
}

module.exports = HighchartView;
