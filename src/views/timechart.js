var _ = require('underscore');
var d3 = require('d3');
var JuttleView = require('./juttle-view');
var $ = require('jquery');

var v = require('../lib/object-validation');

var TimeChart = require('../lib/charts/time-base');
var Line = require('../lib/generators/line');
var TimeBars = require('../lib/generators/time-bars');
var Hover = require('../lib/components/hover');
var Legend = require('../lib/generators/legend');
var jutColors = require('../lib/utils/jut-color-scale');
var ContextChart = require('../lib/components/context-chart');
var Grid = require('../lib/generators/grid');
var moment = require('moment');
var AxisLabelGenerator = require('../lib/generators/axis-label');
var TimeRangeGenerator = require('../lib/generators/timestamp');

var juttleViewUtils = require('./utils/juttle-view-utils');

var d3Formatters = require('../lib/utils/d3-formatters');

var Backbone = require('backbone');

var DOWNSAMPLING_WARNING_MESSSAGE = new Backbone.Model({
    code : 'DOWNSAMPLING_WARNING'
});

var MULTIPLE_POINTS_SAME_TIME_SAME_SERIES_MESSAGE = new Backbone.Model({
    code : 'MULTIPLE_POINTS_SAME_TIME_SAME_SERIES'
});

function getHumanizedDuration(duration) {
    var durationLengths = ['years', 'months', 'weeks', 'days', 'hours', 'minutes', 'seconds'];

    return durationLengths.map(function(durationLength) {
        var value = duration[durationLength]();

        if (value !== 0) {
            duration = duration.subtract(value,durationLength);
            return value + ' ' + ( value === 1 ? durationLength.substr(0,durationLength.length-1) : durationLength );
        }
    }).filter(function(val) {
        return val !== undefined;
    }).join(', ');
}

var optionValidationConfig = {
    allowedProperties : [
        'id',
        'title',
        'col',
        'row',
        'display',
        'xScale',
        'yScales',
        'keyField',
        'valueField',
        'timeField',
        'series',
        'interval',
        'duration',
        'overlayTime',
        'markerSize',
        'seriesLimit'
    ],
    properties : {
        duration : [v.validators.duration],
        overlayTime : [v.validators.boolean],
        markerSize : [v.validators.number],
        display : [
            {
                validator : v.validators.object,
                options : {
                    allowedProperties : ['dataDensity'],
                    properties : {
                        dataDensity : [v.validators.number]
                    }
                }
            }
        ],
        seriesLimit : [v.validators.number],
        xScales : [
            {
                validator : v.validators.object,
                options : {
                    allowedProperties : ['label', 'tickFormat'],
                    properties : {
                        label : [v.validators.string],
                        tickFormat : [v.validators.string]
                    }
                }
            }
        ],
        yScales : [
            function(value, options) {
                var errs = [];
                _.each(value, function(scale, scaleName) {
                    if ( scaleName !== 'primary' && scaleName !== 'secondary') {
                        errs.push(new v.ValueValidationError(null,'INVALID_SCALE',{scale : scaleName}));
                    }
                    var err = v.validators.object.call(this,scale, {
                        allowedProperties : ['label', 'tickFormat', 'minValue', 'maxValue', 'scaling', 'displayOnAxis'],
                        properties : {
                            minValue : [
                                function(value, options) {
                                    if (value !== 'auto' && scale.maxValue !== 'auto') {
                                        if (value > this.yScales.primary.maxValue) {
                                            return new v.ValueValidationError(null,'MIN_VALUE_LESS_THAN_MAX_VALUE');
                                        }
                                    }
                                }
                            ],
                            maxValue : [
                                function(value, options) {
                                    if (value !== 'auto' && scale.minValue !== 'auto') {
                                        if (value < this.yScales.primary.minValue) {
                                            return new v.ValueValidationError(null,'MAX_VALUE_GREATER_THAN_MIN_VALUE');
                                        }
                                    }
                                }
                            ],
                            displayOnAxis : [
                                {
                                    validator : v.validators.enum,
                                    options : {
                                        allowedValues : ['top', 'bottom', 'left', 'right']
                                    }
                                }
                            ],
                            scaling : [
                                {
                                    validator : v.validators.enum,
                                    options : {
                                        allowedValues : ['linear']
                                    }
                                }
                            ]
                        }
                    }, this);

                    if (err !== undefined) {
                        errs.push(new v.PropertyValidationError(null, null,
                            {
                                property : scaleName,
                                errors : err
                            }
                        ));
                    }
                }, this);
                return errs.length > 0 ? errs : undefined;
            }
        ],
        series : [
            function(value, options) {
                var errs = [];

                _.each(value,function(series, i) {
                    var err = v.validators.object.call(this, series, {
                        allowedProperties : ['name','color','label','yScale','geom','valueFormat'],
                        properties : {
                            yScale : [
                                function(value, options) {
                                    if (Object.keys(this.yScales).indexOf(value) === -1) {
                                        return new v.ValueValidationError(null, 'SERIES_SCALE_NOT_FOUND',
                                            {
                                                scale : value
                                            }
                                        );
                                    }
                                    return undefined;
                                }
                            ],
                            geom : [
                                {
                                    validator : v.validators.enum,
                                    options : {
                                        allowedValues : ['line', 'bars']
                                    }
                                }
                            ],
                            valueFormat : [v.validators.string]
                        }
                    });

                    if (err !== undefined) {
                        errs.push(new v.PropertyValidationError(null, null, {
                            property : i,
                            errors : err
                        }));
                    }
                }, this);

                return errs.length > 0 ? errs : undefined;
            }
        ],
        valueField : [v.validators.string],
        interval : [v.validators.duration]
    }
};

var TimeChartView = JuttleView.extend({
    initialize: function(options) {
        options = options || {};

        this._juttleNow = options.juttleEnv.now;
        // fail if we don't receive a value for now
        if (this._juttleNow === undefined) {
            throw "ERROR: 'juttleEnv.now' not passed into the timechart constructor";
        }

        options = this._applyOptionDefaults(options.params);

        this._verifyOptionsAreValid(options);

        this._hasReceivedData = false;

        this._valueValidator.setValueField(options.valueField);

        var attributes = this._attributes = this._convertUserOptionsToAttributes(options);

        this._isTimeRangeOverlay = attributes.overlayTime;

        this._colorScale = jutColors.getColorScale();

        this._createVisuals(attributes.title, attributes.duration, attributes.timeField, attributes.display.timeFormat, attributes.valueField);

        this._createScales(attributes.scales);
        this._createGrid(this.chart);
        this._createAxisLabels(attributes.scales);
        this._registerInteractions();

        this._setTimeRangeFrom(this._jut_time_bounds, this._juttleNow);

        // setup series filter
        this._seriesFilter = this.setupSeriesFilter();
        this._seriesFilter.on('filter', this._onSeriesFilter, this);
        this._seriesFilter.on('clear', this._onClearSeriesFilter, this);
    },

    _checkIfSeriesMatchesFilter: function(series, filterValue) {
        var rawKeys = series.keys.rawKeys;

        var match = _.find(rawKeys, function(val, key) {
            return val.toString().indexOf(filterValue) !== -1;
        });

        return match !== undefined;
    },

    _onSeriesFilter: function(filterValue) {
        if (filterValue === '') {
            this._onClearSeriesFilter();
            return;
        }

        var counter = 0;
        var limitReached = false;

        _.each(this.series, function(series, id) {
            if (this._checkIfSeriesMatchesFilter(series, filterValue)) {
                if (counter >= this._attributes.seriesLimit) {
                    limitReached = true;
                    this.chart.hide_series(series.series.id);
                    series.series.visible = false;
                }
                else {
                    this.chart.show_series(series.series.id);
                    series.series.visible = true;
                    counter++;
                }
            }
            else {
                this.chart.hide_series(series.series.id);
                series.series.visible = false;
            }
        }, this);

        this._toggleSeriesLimitReachedMessage(limitReached);
        this._updateLegend();
        this.chart.apply_update();
    },

    _onClearSeriesFilter: function() {
        var self = this;
        var counter = 0;
        _.each(this.series, function(series, id) {
            if (counter < self._attributes.seriesLimit) {
                self.chart.show_series(series.series.id);
            }
            else {
                self.chart.hide_series(series.series.id);
            }
            counter++;
        });

        this._toggleSeriesLimitReachedMessage(counter > this._attributes.seriesLimit);

        this._updateLegend();
        this.chart.apply_update();
    },

    _setTimeRangeFrom: function(timeBounds, juttleNow) {
        var from = juttleViewUtils.getExtremeTimeBound(timeBounds, juttleNow, "from");
        if (from) {
            this.extendTimeRange(from);
        }
    },

    _setTimeRangeTo: function(timeBounds, juttleNow) {
        var to = juttleViewUtils.getExtremeTimeBound(timeBounds, juttleNow, "to");
        if (to) {
            this.extendTimeRange(to);
        }
    },

    _createGrid: function(chart) {
        var grid = new Grid(chart.el, {
            orientation : 'horizontal'
        });
        grid.setScale(chart.scales.yScales.primary.d3scale);
        grid.setLines([0]);
        chart.registerComponent(grid);
    },

    _createVisuals: function(title, duration, timeField, timeFormat, valueField) {
        var self = this;
        if (title) {
            this.title.text(title);
        }

        this.legend = new Legend(this.sinkBodyEl);

        var windowDuration;
        if (duration) {
            windowDuration = 1000 * duration.asSeconds();
        }

        this.chart = new TimeChart(this.sinkBodyEl, {
            window: windowDuration,
            xfield: timeField,
            yfield: valueField,
            live: this._live,
            timeFormat : timeFormat
        });

        this.chart.on('updatetime', function(dates) {
            if (self._xTimeRangeLabel) {
                self._xTimeRangeLabel.update(dates.from, dates.to);
            }
        });

        if (!this._isTimeRangeOverlay && !this._live) {
            this._createContextChart();
        }

    },

    _createAxisLabels: function(scales) {
        var margin = _.clone(this.chart.margin);
        // XXX following implementation of grid; might want to re-think
        var g = this.chart.el.append('g')
            .attr('class', 'axis-labels');

        var secondaryLabel = scales.yScales.secondary && scales.yScales.secondary.label !== undefined;

        // if -xScale.label is configured create x-axis label
        if (scales.xScales.primary.label !== undefined) {
            margin.bottom = 75;
            this.chart.set_margin(margin);
            this._xAxisLabel = new AxisLabelGenerator (g.node(), {
                labelText: scales.xScales.primary.label,
                orientation: 'bottom',
                margin: margin
            });
            this.chart.registerComponent(this._xAxisLabel);
            this._xAxisLabel.draw();
        }
        // otherwise we use a time range label
        else {
            this._xTimeRangeLabel = new TimeRangeGenerator(this.sinkBodyEl);
            // now we don't need as much bottom-margin
            margin.bottom = 35;
            this.chart.set_margin(margin);
        }

        // if -yScales.primary.label is configured create primary y-axis label
        if (scales.yScales.primary.label !== undefined) {
            this._primaryYAxisLabel = new AxisLabelGenerator(g.node(), {
                labelText: scales.yScales.primary.label,
                orientation: secondaryLabel ? 'left' : scales.yScales.primary.displayOnAxis,
                margin: margin
            });
            this.chart.registerComponent(this._primaryYAxisLabel);
            this._primaryYAxisLabel.draw();
        }

        // if -yScales.secondary.label is configured create a secondary y-axis label
        if (secondaryLabel) {
            this._secondaryYAxisLabel = new AxisLabelGenerator(g.node(), {
                labelText: scales.yScales.secondary.label,
                orientation: 'right',
                margin: margin
            });
            this.chart.registerComponent(this._secondaryYAxisLabel);
            this._secondaryYAxisLabel.draw();
        }

    },

    _createContextChart : function() {
        var parentChart = this.chart;

        this.contextChart = new ContextChart({
            window: this._attributes.duration === undefined ? undefined : this._attributes.duration.asSeconds() * 1000,
            xfield: this._attributes.timeField,
            yfield: this._attributes.valueField,
            live: this._live,
            margin: _.clone(parentChart.margin)
        });

        this.contextChart.on('brush', this.updateDomain, this);
    },

    updateDomain: function(newDomain) {
        var chart = this.chart;

        _.each(chart.series, function(series, id) {
            series.target.resetDataByRange(newDomain);
        });

        chart.time_range.set_range(newDomain);
    },

    // adds secondary scale if necessary
    _addSecondaryScale: function(options) {
        var userOptions = options;
        var series = userOptions.series;
        if (!series) {
            return userOptions;
        }
        series.forEach(function(value, index) {
            if (Object.keys(userOptions.yScales).length < 2 && Object.keys(userOptions.yScales).indexOf(value.yScale) === -1 && value.yScale === 'secondary') {
                userOptions.yScales[value.yScale] = {
                    scaling: 'linear',
                    minValue: 'auto',
                    maxValue: 'auto',
                    displayOnAxis: 'right'
                };
            }
        });
        return userOptions;
    },

    _createScales: function(scales) {
        var self = this;
        _.each(scales.xScales, function(opts, name) {
            this.chart.add_scale(true, name, d3.time.scale.utc().range([0,0]), opts);
            if (this.contextChart) {
                var contextChartScale = d3.time.scale.utc().range([0,0]);
                var optsClone = _.clone(opts);
                optsClone.label = '';
                this.contextChart.chart.add_scale(true, name, contextChartScale, optsClone);
                // right now we only have one xScale. tbd what we do when we have more than one
                // and which one the brush should be using (if any)
                this.contextChart.setBrushScale(contextChartScale);
            }

        }, this);

        _.each(scales.yScales, function(opts, name) {
            this.chart.add_scale(false, name, d3.scale.linear().range([0,0]), opts);
            if (this.contextChart) {
                var optsClone =  _.clone(opts);
                optsClone.displayOnAxis = 'none';
                this.contextChart.chart.add_scale(false, name, d3.scale.linear().range([0,0]), optsClone);
            }
        }, this);

        this.chart.show_scale(true, 'primary');
        this.chart.show_scale(false, 'primary');

        if (this.chart.hasSecondaryY()) {
            this.chart.show_scale(false, 'secondary');
        }

        if (this.contextChart) {
            this.contextChart.chart.show_scale(true, 'primary');

            this.contextChart.chart.set_margin(_.extend(this.contextChart.chart.margin, {
                left : self.chart.margin.left,
                right : self.chart.margin.right
            }));
        }
    },

    _registerInteractions : function() {
        var self = this;
        // mixin hover behavior
        this.hover = new Hover(this.chart, {
            xfield : this._attributes.timeField
        });

        this.chart.on('mouseover', function(mouse) {
            if (self.hover.pinned) {
                return;
            }
            if (self._live) {
                self.pause();
            }

        });

        this.chart.on('mouseout', function(mouse) {
            if (self.hover.pinned) {
                return;
            }
            if (self._live) {
                self.play();
            }

        });
    },

    _applyOptionDefaults : function(options) {
        options = options || {};

        _.defaults(options, {
            timeField : 'time',
            seriesLimit : 20,
            markerSize : 0,
            overlayTime : false
        });

        options.display = options.display || {};

        _.defaults(options.display, {
            dataDensity : 5
        });

        options.xScale = options.xScale || {};

        _.defaults(options.xScale, {
            scaling : 'time'
        });

        options.yScales = this._applyYScalesDefaults(options.yScales);

        if (options.series && !_.isArray(options.series)) {
            options.series = [options.series];
        }

        options = this._addSecondaryScale(options);

        return options;
    },

    _applyYScalesDefaults : function(yScales) {
        yScales = yScales || {};

        yScales.primary = yScales.primary || {};

        _.each(yScales, function(scale, name) {
            _.defaults(scale, {
                scaling: 'linear', //TODO we only support linear currently
                minValue: 'auto',
                maxValue: 'auto',
                displayOnAxis: name === 'primary' ? 'left' : 'right'
            });
        });

        return yScales;
    },

    _convertUserOptionsToAttributes : function(options) {
        options.display.timeFormat = options.display.timeFormat ? d3.time.format.utc(options.display.timeFormat) : d3Formatters.timeUTC;

        return {
            title : options.title,
            series : options.series,
            seriesLimit : options.seriesLimit,
            keyField : options.keyField,
            valueField : options.valueField,
            timeField : options.timeField,
            timeLabel : options.timeLabel,
            legendTable : this._defaultLegendTable(options.legendTable, options.timeLabel, options.valueField),
            scales : {
                xScales : {
                    primary : options.xScale
                },
                yScales : options.yScales
            },
            display : options.display,
            markerSize : options.markerSize,
            duration : options.duration,
            overlayTime : options.overlayTime,
            interval : options.interval
        };
    },

    _defaultLegendTable: function(legendOptions, timeField, valueField) {
        legendOptions = legendOptions || {};

        return {
            //NOTE: empty string for any of these parameters suppresses display of that element
            indexField: legendOptions.indexField, // the first column, default is keyField value,
            // if keyfield = auto, the displayed as 'value ' + 'value ' + ...
            timeField: legendOptions.timeField || timeField, // optional, auto defaults to timeField, can provide a different field name
            valueField: legendOptions.valueField || valueField // optional, auto defaults to valueField
        };
    },

    _verifyOptionsAreValid : function(options) {
        var errs = v.validate(options, TimeChartView.optionValidationConfig);

        if (errs !== undefined) {
            this.throwParamValidationError(errs);
        }
    },

    _find_keys: function(point) {
        /*
         * With no grouping field, we group by all non-numeric, non-timeField, and non-valueField fields.
         * This routine builds an objects with the values of all such fields.
         */
        var keys = {};

        if (this._attributes.keyField !== undefined) {
            keys[this._attributes.keyField] = point[this._attributes.keyField];
        }
        else {
            _.each(point, function(val, name) {
                if (!_.isNumber(val) && name !== this._attributes.timeField && name !== this._attributes.valueField) {
                    keys[name] = val;
                }
            }, this);
        }

        return {
            rawKeys : keys,
            derivedKeys : this._find_derived_keys(point)
        };
    },

    _find_derived_keys: function(point) {
        var self = this;

        function getTimeRangeBucketStart(time, from, duration) {
            var tmpDate = moment(from);

            while(tmpDate.toDate() <= time) {
                tmpDate = tmpDate.add(duration);
            }

            tmpDate = tmpDate.subtract(duration);
            return tmpDate.toDate();
        }

        return {
            timeRangeStart : self._attributes.duration === undefined ? null : getTimeRangeBucketStart(point[self._attributes.timeField], self._from, self._attributes.duration)
        };
    },

    _findOrCreateSeries: function(point) {
        /*
         * Since we're grouping on the combination of many fields,
         * we don't have a quick lookup, loop through all the series
         * looking for this one.
         */
        var keys = {}; //= this._attributes.keyField !== undefined ? {this._attributes.keyField === undefinedthis._find_keys(point);
        if (this._attributes.keyField !== undefined) {
            keys[this._attributes.keyField] = point[this._attributes.keyField];
            keys = {
                rawKeys : keys,
                derivedKeys : this._find_derived_keys(point)
            };
        }
        else {
            keys = this._find_keys(point);
        }
        var series_keys = _.keys(this.series);
        for (var i=0; i<series_keys.length; i++) {
            if (this._isTimeRangeOverlay) {
                if (_.isEqual(keys, this.series[series_keys[i]].keys)) {
                    return series_keys[i];
                }
            }
            else {
                if (_.isEqual(keys.rawKeys, this.series[series_keys[i]].keys.rawKeys)) {
                    return series_keys[i];
                }
            }
        }

        return this._create_series(point);
    },

    _toggleSeriesLimitReachedMessage: function(limitReached) {
        if (!this._seriesLimitReachedMessage && limitReached) {
            this._seriesLimitReachedMessage = new Backbone.Model({
                code : 'SERIES_LIMIT_REACHED',
                info : {
                    seriesLimit : this._attributes.seriesLimit
                }
            });
        }

        if (limitReached) {
            this.runtimeMessages.add(this._seriesLimitReachedMessage);
        }
        else if (this._seriesLimitReachedMessage && !limitReached) {
            this.runtimeMessages.remove(this._seriesLimitReachedMessage);
        }
    },

    // returns a series def if the series def has a name value
    // that matches one of the series keys.
    _findMatchingSeriesDef : function(seriesKeys) {
        var fieldValues = _.values(seriesKeys),
            matchingSeriesDef = _.find(this._attributes.series, function(seriesDef) {
                return _.contains(fieldValues, seriesDef.name);
            });
        if (!matchingSeriesDef) {
            return _.find(this._attributes.series, function(seriesDef) {
                return !seriesDef.name;
            });
        }
        return matchingSeriesDef;
    },

    _create_series: function(point, options) {
        options = options || {};
        var seriesDef = this._findMatchingSeriesDef(this._find_keys(point).rawKeys);
        if (seriesDef) {
            _.extend(options, seriesDef);
        }

        if (this.series === undefined) {
            this.series = {};
        }

        if (this.next_series === undefined) {
            this.next_series = 0;
        }

        var id = this.next_series++;

        options = options || {};

        var seriesKeys = this._find_keys(point);

        if (options.label === undefined) {
            if (this._attributes.keyField !== undefined) {
                options.label = point[this._attributes.keyField];
            }
            else {
                options.label = _.keys(seriesKeys.rawKeys).sort().map(function(fieldName) {
                    return fieldName + ": " + seriesKeys.rawKeys[fieldName];
                }).join(', ') || this._attributes.valueField;
            }
        }

        options.color = options.color || this._colorScale(id);

        var seriesLimitReached = this._checkIfSeriesLimitReached();
        options.visible = !seriesLimitReached;

        if (seriesLimitReached) {
            this._toggleSeriesLimitReachedMessage(true);
        }

        var seriesopts = {
            xfield: this._attributes.timeField,
            yfield: this._attributes.valueField,
            label: options.label
        };

        var yScaleName = options.yScale || 'primary';
        var xScaleName = 'primary';

        var GeneratorConstructor = options.geom === 'bars' ? TimeBars : Line;

        var generator = new GeneratorConstructor(this.chart.field(), _.extend({
            clipId: this.chart.clipId,
            markerSize: this._attributes.markerSize
        }, seriesopts));

        if (this._isTimeRangeOverlay) {
            xScaleName = seriesKeys.derivedKeys.timeRangeStart + Date.now();

            this._createAndAddScaleForTimeRange(xScaleName, seriesKeys.derivedKeys.timeRangeStart);

            if (this._live && point[this._attributes.timeField] > this._juttleNow) {
                this._removeOldestTimeRangeSeries(seriesKeys.rawKeys);
            }
        }

        var series = this.chart.add_series(generator, xScaleName, yScaleName, options);
        var seriesForContextChart;

        if (this.contextChart) {
            var generatorForContextChart = new GeneratorConstructor(this.contextChart.chart.field(), _.extend({
                clipId: this.contextChart.chart.clipId
            }, seriesopts));
            var optionsClone = _.clone(options);
            optionsClone.color = 'gray';
            seriesForContextChart = this.contextChart.chart.add_series(generatorForContextChart, xScaleName, yScaleName, optionsClone);
        }

        var self = this;
        function downsampleListener(series, what, factor) {
            self._show_downsample_warning(series, factor);
        }

        series.target.on('downsample', _.bind(downsampleListener,this, series));

        this.series[id] = {
            keys: seriesKeys,
            series : series,
            id : id,
            contextChartSeries : seriesForContextChart
        };

        this._updateLabels();

        if (this._isTimeRangeOverlay) {
            this._updateColors();
            this._updateSeriesOrder();
        }

        this._updateLegend();

        return id;
    },

    _checkIfSeriesLimitReached: function() {
        return this._getVisibleSeries().length >= this._attributes.seriesLimit;
    },

    _getVisibleSeries: function() {
        return this.chart.getVisibleSeries();
    },

    _updateLegend: function() {
        this.legend.update(_.where(this._getVisibleSeries(), {show_on_legend: true}));
    },

    _createAndAddScaleForTimeRange : function(name, timeRangeStart) {
        var scale = d3.time.scale.utc();
        var timeRangeDomain = [timeRangeStart,
            moment(timeRangeStart).add(this._attributes.duration).toDate()];
        scale.domain(timeRangeDomain);
        this.chart.add_scale(true, name, scale, {});
        this.chart.setDisplayedXScale(scale);
    },

    _removeOldestTimeRangeSeries : function(rawKeys) {
        var sameSeries = _.filter(_.values(this.series), function(serie) {
            return _.isEqual(serie.keys.rawKeys, rawKeys);
        });

        var oldestSeries = sameSeries[0];
        if (oldestSeries) {
            for (var i = 0; i < sameSeries.length; i++) {
                var serie = sameSeries[i];
                if (oldestSeries.keys.derivedKeys.timeRangeStart > serie.keys.derivedKeys.timeRangeStart) {
                    oldestSeries = serie;
                }
            }

            this._removeSeries(oldestSeries.id);
        }
    },

    _removeSeries : function(id) {
        this.chart.remove_series(this.series[id].series.id);
        delete(this.series[id]);
    },

    _updateColors : function() {
        var seriesByTime = _.sortBy(this.series, function(serie) {
            return serie.keys.derivedKeys.timeRangeStart;
        });

        seriesByTime.reverse();

        var newColorScale = jutColors.getColorScale();

        var colorCounter = 0;

        // would be better to call setColor on series which in turn will setColor on the generator...
        seriesByTime.forEach(function(serie) {
            var newColor = newColorScale(colorCounter++);
            serie.series.color = newColor;
            if (serie.series.generator.set_color) {
                serie.series.generator.set_color(newColor);
            }
        });
    },

    _updateSeriesOrder : function() {
        var seriesOrder = _.sortBy(this.series, function(serie) {
            return serie.keys.derivedKeys.timeRangeStart;
        }).reverse().map(function(serie) {
            return serie.series.id;
        });

        this.hover.setSeriesOrder(seriesOrder);
        this.legend.setSeriesOrder(seriesOrder);

    },

    _getAllKeys: function() {
        // Gets all possible keys across all series
        var all_series_key_values = _.pluck(_.pluck(_.values(this.series), 'keys'), 'rawKeys');
        var all_keys = _.map(all_series_key_values, function (x) { return Object.keys(x); });
        var keys = _.uniq(_.reduce(all_keys, function(a, b) {
            return a.concat(b);
        }, []));
        return keys;
    },

    _getKeysToShow: function(keys) {
        // Finds out what keys have unique values between series
        var all_series_key_values = _.pluck(_.pluck(_.values(this.series), 'keys'), 'rawKeys');
        var keys_to_show = [];
        for (var k = 0; k < keys.length; k++) {
            var key = keys[k];
            var values = _.pluck(all_series_key_values, key);
            if (_.uniq(values).length > 1) {
                keys_to_show.push(key);
            }
        }
        if (!keys_to_show.length) {
            keys_to_show.push(keys.sort()[0]);
        }
        return keys_to_show;
    },

    _buildSeriesLabelFromKeys: function(rawKeys, keys_to_show) {
        var label;
        keys_to_show.sort();

        // if all the keys we want to show are missing,
        // then show the first one (and show its value as null)
        var seriesFieldValues = _.values(_.pick(rawKeys, keys_to_show));
        if (_.without(seriesFieldValues, undefined).length === 0) {
            label = keys_to_show[0] + ': null';
        }
        // else show all the keys and their values
        // (ignoring the keys that don't have values)
        else {
            var labels = keys_to_show.map(function(fieldName) {
                var value = rawKeys[fieldName];
                if (value === undefined || value === null) { return null; }
                return fieldName + ": " + value;
            });
            label = _.compact(labels).join(', ');
        }

        return label;
    },

    _updateSeriesLabels: function(keys_to_show) {
        var self = this;
        // Updates series labels
        _.each(this.series, function(serie) {
            var label;
            if (self._attributes.keyField !== undefined) {
                var seriesDef = _.findWhere(self._attributes.series, { name : serie.keys.rawKeys[self._attributes.keyField]});

                if (seriesDef && seriesDef.label) {
                    label = seriesDef.label;
                }
                else {
                    label = serie.keys.rawKeys[self._attributes.keyField];
                }
            }
            else if (Object.keys(serie.keys.rawKeys).length) {
                label = this._buildSeriesLabelFromKeys(serie.keys.rawKeys, keys_to_show);
            }
            else {
                label = this._attributes.valueField;
            }

            function getMostRecentTimeRange(serie) {
                var mostRecentRange = self._from;
                _.each(self.series, function(thisSerie) {
                    if (_.isEqual(thisSerie.keys.rawKeys, serie.keys.rawKeys)) {
                        mostRecentRange = thisSerie.keys.derivedKeys.timeRangeStart > mostRecentRange ? thisSerie.keys.derivedKeys.timeRangeStart : mostRecentRange;
                    }
                });

                return mostRecentRange;
            }

            if (this._isTimeRangeOverlay) {
                var mostRecentRange = getMostRecentTimeRange(serie);
                if (mostRecentRange.getTime() !== serie.keys.derivedKeys.timeRangeStart.getTime()) {
                    label += ' (' + getHumanizedDuration(moment.duration(moment(mostRecentRange).diff(serie.keys.derivedKeys.timeRangeStart))) + ' ago)';
                }

            }
            serie.series.label = label;
            serie.series.generator.set_id(label);
        }, this);
    },

    _updateLabels: function() {
        var keys = this._getAllKeys();
        var keys_to_show = this._getKeysToShow(keys);
        this._updateSeriesLabels(keys_to_show);
    },

    _setValueField: function(key) {
        this._attributes.valueField = key;
        this._valueValidator.setValueField(key);
        this.chart.set_value(key);
        this.legend.set_value(key);
        if (this.contextChart) {
            this.contextChart.chart.set_value(key);
        }
        _.each(this.series, function(serie) {
            serie.series.generator.set_yfield(key);
            serie.series.target.set_yfield(key);
            if (this.contextChart) {
                serie.contextChartSeries.generator.set_yfield(key);
                serie.contextChartSeries.target.set_yfield(key);
            }
        }, this);
    },

    _consume: function(batch) {
        var i;

        if (this._from === undefined) {
            this._from = batch[0][this._attributes.timeField];
        }

        if (this._attributes.valueField === undefined && !this._determineValueField(batch)) {
            return;
        }

        if (!this._validateBatch(batch)) {
            return;
        }

        batch = this._filterOutNonNumericValues(batch);

        // sort points into which series they belong to, creating new
        // series object as necessary.
        var updates = {};
        for (i=0; i<batch.length; i++) {
            var pt = batch[i];
            var id = this._findOrCreateSeries(pt);
            if (id === null) {
                continue;
            }
            if (!updates.hasOwnProperty(id)) {
                updates[id] = [];
            }
            updates[id].push(pt);
        }

        this._checkForMultiplePointsSameTimeSameSeries(updates);

        // actually push the points to their series objects
        _.each(updates, function(points, id) {
            this._createIntervalBasedInterpolationBreaks(this.series[id], points);
            this.series[id].lastPointSeen = _.last(points);
            this.series[id].series.target.push(points);
            if (this.contextChart) {
                this.series[id].contextChartSeries.target.push(points);
            }
        }, this);

        if (this._getVisibleSeries().length < 2 && this._seriesFilter.getValue() === '') {
            this._seriesFilter.el.addClass('hidden');
        } else {
            this._seriesFilter.el.removeClass('hidden');
        }
    },

    _createIntervalBasedInterpolationBreaks : function(series, points) {
        if (this._attributes.interval) {
            var pointsToCheck = points;
            if (series.lastPointSeen) {
                pointsToCheck = [series.lastPointSeen].concat(points);
            }

            for (var i = 0; i < pointsToCheck.length - 1; i++) {
                var time1 = pointsToCheck[i][this._attributes.timeField].getTime();
                var time2 = pointsToCheck[i+1][this._attributes.timeField].getTime();

                var maxTimeOfNextPoint = moment(time1).add(this._attributes.interval);

                if (time2 > maxTimeOfNextPoint.toDate().getTime()) {
                    var interpolationBreak = new Date(Math.floor((time2+time1))/2);
                    series.series.target.addInterpolationBreak(interpolationBreak);
                    if (this.contextChart) {
                        series.contextChartSeries.target.addInterpolationBreak(interpolationBreak);
                    }
                }
            }
        }
    },

    _filterOutNonNumericValues : function(batch) {
        var self = this;
        return batch.filter(function(pt) {
            return _.isNumber(pt[self._attributes.valueField]);
        });
    },

    _show_downsample_warning: function(series, factor) {
        this._downsamplingBySeries = this._downsamplingBySeries || {};

        if (factor === 1) {
            delete(this._downsamplingBySeries[series.id]);
        }
        else {
            // keep track of the factor in case we want to
            // display it on a per-series basis in the future
            this._downsamplingBySeries[series.id] = {
                series : series,
                factor : factor
            };
        }

        if (Object.keys(this._downsamplingBySeries).length === 0) {
            if (this._isDownsampling) {
                this.runtimeMessages.remove(DOWNSAMPLING_WARNING_MESSSAGE);
            }
            this._isDownsampling = false;
        }
        else {
            if (!this._isDownsampling) {
                this.runtimeMessages.add(DOWNSAMPLING_WARNING_MESSSAGE);
            }
            this._isDownsampling = true;
        }
    },

    _checkForMultiplePointsSameTimeSameSeries : function(updates) {
        _.each(updates, function(points, id) {
            for ( var i = 0; i < points.length - 1; i++) {
                if (_.isEqual(points[i][this._attributes.timeField], points[i+1][this._attributes.timeField])) {
                    this.runtimeMessages.add(MULTIPLE_POINTS_SAME_TIME_SAME_SERIES_MESSAGE);
                }
            }
        }, this);
    },

    setDimensions: function(key, width, height) {
        if (width) {
            height = width / 1.6189;

            if (height > 325) {
                height = 325;
            }

            this.reallySetDimensions(width, height);
        } else {
            return; // use defaults.
        }
    },

    // the guts of setDimensions(), just honors the given
    // width and height, no monkey business.
    reallySetDimensions: function(width, height) {
        // XXX this should subtract the axis widths...
        var limit = width / this._attributes.display.dataDensity;
        this.chart.set_downsample_limit(limit);
        _.each(this.dataTargets, function(target) {
            target.set_downsample_limit(limit);
        } );

        this.chart.resize(width, height);

        this.legend.resize(width, height);

        if (this.contextChart) {
            this.contextChart.resize(width);
        }
    },

    // gets called when a stream finishes
    _consume_eof: function() {
        this._setTimeRangeTo(this._jut_time_bounds, this._juttleNow);

        if (this._hasReceivedData && this.contextChart) {
            $(this.sinkBodyEl).append(this.contextChart.el);
            this.chart.toggleAnimations(false);
        }
    },

    extendTimeRange: function(t) {
        this.chart.extendTimeRange(t);
        if (this.contextChart) {
            this.contextChart.chart.extendTimeRange(t);
        }
    },

    destroy: function() {
        JuttleView.prototype.destroy.apply(this, arguments);
        this.chart.destroy();
        if (this.contextChart) {
            this.contextChart.destroy();
        }
    }
},
// static
    {
        optionValidationConfig: optionValidationConfig
    });

module.exports = TimeChartView;
