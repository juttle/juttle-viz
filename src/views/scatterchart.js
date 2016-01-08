var $ = require('jquery');
var _ = require('underscore');
var d3 = require('d3');
var Backbone = require('backbone');
var JuttleView = require('./juttle-view');
var Timestamp = require('../lib/generators/timestamp');
var AxisLabelGenerator = require('../lib/generators/axis-label');
var Legend = require('../lib/generators/legend');
var Tooltip = require('../lib/generators/tooltip');
var v = require('../lib/object-validation');
var chartColors = require('../lib/utils/jut-color-scale');
var d3formatters = require('../lib/utils/d3-formatters');

var ScatterChart = require('../lib/charts/scatter-chart');
var ValueValidator = require('./utils/value-validator');
var paramUtils = require('./utils/param-utils');

var axisUtils = require('../lib/utils/axis-utils');
var calculateTickValues = axisUtils.calculateTickValues;

var SimpleLayout = require('../lib/layout/simple');

var FacetLayout = require('../lib/layout/facet');
var Faceter = require('../lib/facet/faceter');


var optionValidationConfig = {
    allowedProperties : [
        'id',
        'title',
        'col',
        'row',
        'valueField',
        'controlField',
        'keyField',
        'timeField',
        'xScales',
        'yScales',
        'tooltip',
        'series',
        'facet',
        'markerSize',
        'markerOpacity',
        'duration',
        'limit'
    ],
    properties : {
        markerSize: [
            v.validators.number,
            {
                validator : v.validators.greaterThan,
                options : {
                    threshold : 1
                }
            }
        ],
        duration : [v.validators.duration],
        limit : [v.validators.number],
        markerOpacity: [
            v.validators.number,
            {
                validator : v.validators.greaterThan,
                options : {
                    threshold : 0.1
                }
            },{
                validator : v.validators.lessThanOrEqual,
                options : {
                    threshold : 1
                }
            }
        ],
        valueField : [v.validators.string],
        controlField : [v.validators.string],
        keyField : [v.validators.string],
        timeField : [v.validators.string],
        xScales : [
            {
                validator : v.validators.object,
                options : {
                    allowedProperties : ['primary'],
                    properties : {
                        primary : [
                            {
                                validator : v.validators.object,
                                options : {
                                    allowedProperties : ['label', 'scaling', 'tickFormat', 'minValue', 'maxValue', 'displayOnAxis'],
                                    properties : {
                                        tickFormat : [v.validators.string],
                                        minValue : [
                                            function(value, options) {
                                                if (value !== 'auto' && this.xScales.primary.maxValue !== 'auto') {
                                                    if (value > this.xScales.primary.maxValue) {
                                                        return new v.ValueValidationError(null,'MIN_VALUE_LESS_THAN_MAX_VALUE');
                                                    }
                                                }
                                            }
                                        ],
                                        maxValue : [
                                            function(value, options) {
                                                if (value !== 'auto' && this.xScales.primary.minValue !== 'auto') {
                                                    if (value < this.xScales.primary.minValue) {
                                                        return new v.ValueValidationError(null,'MAX_VALUE_GREATER_THAN_MIN_VALUE');
                                                    }
                                                }
                                            }
                                        ],
                                        displayOnAxis : [
                                             {
                                                 validator : v.validators.enum,
                                                 options : {
                                                    allowedValues : ['bottom']
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
                                }
                            }
                        ]
                    }
                }
            }
        ],
        yScales : [
            {
                validator : v.validators.object,
                options : {
                    allowedProperties : ['primary'],
                    properties : {
                        primary : [
                            {
                                validator : v.validators.object,
                                options : {
                                    allowedProperties : ['label', 'scaling', 'tickFormat', 'minValue', 'maxValue', 'displayOnAxis'],
                                    properties : {
                                        tickFormat : [v.validators.string],
                                        minValue : [
                                            function(value, options) {
                                                if (value !== 'auto' && this.yScales.primary.maxValue !== 'auto') {
                                                    if (value > this.yScales.primary.maxValue) {
                                                        return new v.ValueValidationError(null,'MIN_VALUE_LESS_THAN_MAX_VALUE');
                                                    }
                                                }
                                            }
                                        ],
                                        maxValue : [
                                            function(value, options) {
                                                if (value !== 'auto' && this.yScales.primary.minValue !== 'auto') {
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
                                                    allowedValues : ['left', 'right']
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
                                }
                            }
                        ]
                    }
                }
            }
        ],
        series : [
            function(value, options) {
                return this.keyField === undefined ?
                    new v.ValueValidationError(null, 'MISSING_KEY_FIELD_FOR_SERIES') : undefined;
            },

            function(value, options) {
                var errs = [];

                _.each(value, function(series, i) {
                    var err = v.validators.object.call(this, series, {
                        requiredProperties : ['name'],
                        allowedProperties : ['name','color','label'],
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
                            ]
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
        facet : [
            {
                validator : v.validators.object,
                options : {
                    allowedProperties : ['fields', 'width', 'height'],
                    properties : {
                        fields: [
                           function(value, options) {
                                if (!_.isArray(value)) {
                                    value = [value];
                                }
                                var nonStringItem = _.find(value, function(item) {
                                    return ! _.isString(item);
                                });

                                if (nonStringItem !== undefined) {
                                    return new v.ValueValidationError(null, 'INVALID_TYPE', {
                                        type : 'STRING_ARRAY'
                                    });
                                }
                            }
                       ],
                        height: [
                            v.validators.number,
                            {
                                validator : v.validators.greaterThanOrEqual,
                                options : {
                                    threshold : 50
                                }
                            }
                        ],
                        width: [
                            function(value, options) {
                                var err;
                                if ( _.isString(value) ) {
                                    err = v.validators.enum(value, {
                                        allowedValues: ['100%','50%','25%','20%','1','1/2','1/3','1/4','1/5','1/6']
                                    });
                                    if (err !== undefined) {
                                        return err;
                                    }
                                }
                                else if ( _.isNumber(value) ) {
                                    err = v.validators.greaterThanOrEqual(value, {
                                        threshold : 150
                                    });
                                    if (err !== undefined) {
                                        return err;
                                    }
                                }
                            }
                        ]
                    }
                }
            }
        ]
    }
};

var ScatterChartView = JuttleView.extend({
    initialize: function(options) {

        options = this._applyOptionDefaults(options.params);

        if (options.duration !== undefined) {
            options.duration = paramUtils.convertToDuration(options.duration);
        }

        this._verifyOptionsAreValid(options);

        // runtime messages
        this._outsideRangeMessage = null;
        this._limitReachedMessage = null;

        // currently displayed data points
        this._data = [];
        // counter that is used to generate unique id for each new data point
        this._pointCnt = 0;

        this._dataUpdater = null;

        this.id = options.id;
        this._isFaceted = options.facet ? true : false;

        this._attributes = options;

        // need validator for the controlField
        this._controlValidator = new ValueValidator();

        // if provided apply user configured title
        if (options.title) {
            this.title.text(options.title);
            this._attributes.title = options.title;
        }

        this._attributes.duration = options.duration.asSeconds()*1000;

        this._legend = new Legend(this.sinkBodyEl);

        this._createScales();

        var wrapper = $('<div/>');
        wrapper.addClass('jut-chart-wrapper');
        $(this.sinkBodyEl).append(wrapper);

        // XXX view creates svg instead of chart
        // for facetd layout multiple charts will be rendered onto a single svg
        var svg = d3.select(wrapper[0]).append('svg')
            .attr('class', 'jut-chart')
            .attr('width', this._attributes.width)
            .attr('height', this._attributes.height);

        this._svg = svg;

        // charts that support faceting use layouts
        // when faceted multiple instances of a chart are created
        if (this._isFaceted) {

            if (_.isString(this._attributes.facet.fields)) {
                this._attributes.facet.fields = [this._attributes.facet.fields];
            }

            this._layout = new FacetLayout(svg, this._attributes);
            this._layout.on('facet-width-error', function() {
                this.handleFatalError('COULD_NOT_DETERMINE_FACET_WIDTH', {
                    field: this._attributes.facet.width
                });
            });
            this._faceter = new Faceter(this._attributes.facet.fields);

        }
        // non-faceted use a single instance of a chart
        else {
            this._layout = new SimpleLayout(svg, {
                yScales: this._attributes.yScales
            });
        }

        // tooltip requires margins
        // layouts now handle outer margins
        this._tooltip = new Tooltip(svg.node(), {
            margin: {
                left: 0,
                right: 0,
                top: 0,
                bottom: 0
            }
        });

        // array of charts rendered in the view
        this._charts = [];

        this._timeRangeLabel = new Timestamp(wrapper);
        this._createAxesLabels();

        // if control, value and key fields have been configured, go ahead and set them
        if (this._attributes.controlField) { this._setControlField(this._attributes.controlField); }
        if (this._attributes.valueField) { this._setValueField(this._attributes.valueField); }
        if (this._attributes.keyField) { this._setKeyField(this._attributes.keyField); }

    },

    setDimensions: function(key, width, height) {
        var chartSize = this._layout.resize(width, height);

        _.each(this._charts, function(chart) {
            chart.resize(chartSize.w, chartSize.h);
        });
    },

    _startUpdates: function() {
        this._dataUpdater = setInterval(this._doUpdate.bind(this), 500);
    },

    _stopUpdates: function() {
        clearInterval(this._dataUpdater);
        this._dataUpdater = null;
    },

    _doUpdate: function() {

        this._calibrateScales();

        this._updateLegend();

        _.each(this._charts, function(chart) {
            chart.doUpdate();
        });

    },

    _createScales: function() {
        this._colorScale = chartColors.getColorScale();

        var xScaleType = this._attributes.xScales.primary.scaling;
        var yScaleType = this._attributes.yScales.primary.scaling;

        if (xScaleType === 'linear' ) {
            this._xScale = d3.scale.linear().range([0,0]);
        }
        else {
            throw new Error('Unsupported xScale type: ' + xScaleType);
        }

        if (yScaleType === 'linear' ) {
            this._yScale = d3.scale.linear().range([0,0]);
        }
        else {
            throw new Error('Unsupported yScale type: ' + yScaleType);
        }

        this._xScale.clamp(true);
        this._yScale.clamp(true);

    },

    /**
     * create instance of a chart
     */
    _createChart: function(spec) {
        var self = this;

        var chart = new ScatterChart(spec.el, {
            timeField: this._attributes.timeField,
            markerSize: this._attributes.markerSize,
            markerOpacity: this._attributes.markerOpacity,
            duration: this._attributes.duration,
            limit: this._attributes.limit,
            series: this._attributes.series,
            tooltip: this._attributes.tooltip,
            xScalesOptions: this._attributes.xScales,
            yScalesOptions: this._attributes.yScales,
            xScale: this._xScale,
            yScale: this._yScale,
            colorScale: this._colorScale,
            showRightAxisTicks: this._isFaceted,
            margin: spec.margin,
            controlField: this._attributes.controlField,
            valueField: this._attributes.valueField,
            keyField: this._attributes.keyField

        });

        chart.on('updatetime', function(dates) {
            self._timeRangeLabel.update(dates.from, dates.to);
        });

        chart.on('showtooltip', this._onShowTooltip, this);
        chart.on('hidetooltip', this._onHideTooltip, this);

        this._charts.push(chart);

        chart.resize(spec.width, spec.height);

        return chart;

    },

    _createAxesLabels: function() {
        var rts = this._layout.addAxisLabelContainers();

        this._yAxisLabel = new AxisLabelGenerator(rts.yEl.node(), {
            labelText: this._attributes.yScales.primary.label,
            orientation: this._attributes.yScales.primary.displayOnAxis,
            position: false
        });
        this._yAxisLabel.draw();

        this._xAxisLabel = new AxisLabelGenerator(rts.xEl.node(), {
            labelText: this._attributes.xScales.primary.label,
            orientation: 'bottom',
            position: false
        });
        this._xAxisLabel.draw();

    },

    _consume: function(batch) {
        var self = this;

        // if undefined attempt to determine the valueField
        if (this._attributes.valueField === undefined && !this._determineTheValueField(batch)) {
            return;
        }

        // then if undefined attempt to determine the controlField
        if (this._attributes.controlField === undefined && !this._determineTheControlField(batch)) {
            return;
        }

        if (!this._validateTheBatch(batch)) {
            return;
        }

        this._determineTitleAndKeyField(batch);

        // clip data that is outside of configured scale min/max
        batch = this._clipDataOutsideOfRange(batch);

        if (batch.length > 0) {

            // generate a unique key for new datapoints (needed for d3 data binding)
            _.each(batch,function(d) {
                d.key = self._pointCnt++;
            });

            // add new data to existing
            this._data = this._data.concat(batch);

            // push new data
            if (this._isFaceted) {

                // iterate through points and find facet or create new facet
                _.each(batch, function(point) {
                    var facetFields = _.pick(point, self._attributes.facet.fields);
                    var facet = self._faceter.findFacet(facetFields);

                    if (!facet) {
                        facet = self._faceter.addFacet(facetFields, self._createChart(self._layout.addChart(facetFields)));
                    }
                    facet.chart.getDataTarget().push([point]);
                });

            }
            else {
                if (this._charts.length === 0) {
                    this._createChart(this._layout.addChart());
                }
                _.each(this._charts, function(ch) {
                    ch.getDataTarget().push(batch);
                });
            }

        }

        // if we have time and duration is configured
        // clip points that fall outside of duration
        if (this._data.length > 0 && this._data[0][this._attributes.timeField] && this._attributes.duration > 0) {
            this._clipDataOutsideOfDuration();
        }

        // clip data that falls outside the onfigured limit
        if (this._data.length > this._attributes.limit) {
            this._clipDataOutsideOfLimit();
        }

        if (this._dataUpdater === null) {
            this._doUpdate();
            this._startUpdates();
        }

    },

    _consume_mark: function() {
        _.each(this._charts, function(ch) {
            ch.getDataTarget().batch_end();
        });
    },

    _consume_eof: function() {
        _.each(this._charts, function(ch) {
             ch.getDataTarget().stream_end();
         });
        this._doUpdate();
        this._stopUpdates();
    },

    _calibrateScales: function() {

        if (this._charts.length > 0) {

            var xMinOpt = this._attributes.xScales.primary.minValue;
            var xMaxOpt = this._attributes.xScales.primary.maxValue;
            var yMinOpt = this._attributes.yScales.primary.minValue;
            var yMaxOpt = this._attributes.yScales.primary.maxValue;

            var xMin = xMinOpt === 'auto' ? this._calculateNiceMinValue(this._data, this._attributes.controlField, 0) : xMinOpt;
            var xMax = xMaxOpt === 'auto' ? this._calculateNiceMaxValue(this._data, this._attributes.controlField, 0) : xMaxOpt;
            var yMin = yMinOpt === 'auto' ? this._calculateNiceMinValue(this._data, this._attributes.valueField, 0) : yMinOpt;
            var yMax = yMaxOpt === 'auto' ? this._calculateNiceMaxValue(this._data, this._attributes.valueField, 0) : yMaxOpt;

            var xTicks = this._charts[0].getxAxisTicks();
            var yTicks = this._charts[0].getyAxisTicks();

            var xTickValues = calculateTickValues(xMin, xMax, xTicks);
            var yTickValues = calculateTickValues(yMin, yMax, yTicks);

            this._xScale.domain([xTickValues[0], xTickValues[xTickValues.length -1]]);
            this._yScale.domain([yTickValues[0], yTickValues[yTickValues.length -1]]);

            _.each(this._charts, function(chart) {
                chart.calibrate(xTickValues,yTickValues);
            });
        }

    },

    /**
     * clips data outside of the configured duration
     */
    _clipDataOutsideOfDuration: function() {
        var newestDate;
        var oldestDate;
        var self = this;

        newestDate = _.sortBy(this._data, this._attributes.timeField).pop()[this._attributes.timeField];
        oldestDate = new Date(newestDate - this._attributes.duration);

        this._data = _.filter(this._data, function(d) {
            return d[self._attributes.timeField] >= oldestDate;
        });

        // for each data target clip points that fall outside of duration
        _.each(this._charts, function(ch) {
            ch.getDataTarget().clipOutsideOfDuration(oldestDate);
        });

    },

    /**
     * clips data that is outside the configured limit
     */
    _clipDataOutsideOfLimit: function() {
        var lastPointIdx;
        var lastIdxKey;

        lastPointIdx = this._data.length - this._attributes.limit;
        lastIdxKey = this._data[lastPointIdx].key;

        this._data = _.sortBy(this._data, this._attributes.timeField).splice(lastPointIdx, this._data.length);

         // for each data target clip data that is outside of configured limit
        _.each(this._charts, function(ch) {
            ch.getDataTarget().clipOutsideOfLimit(lastIdxKey);
        });

        if (!this._limitReachedMessage) {
            this._limitReachedMessage = new Backbone.Model({
                code : 'DATA_LIMIT_REACHED',
                info : {
                    limit : this._attributes.limit
                }
            });
            this.runtimeMessages.add(this._limitReachedMessage);
        }

    },

    /**
     * clips data that is outside of the configured min/max scale ranges
     * @param  {Array} data
     * @return {Array}
     */
    _clipDataOutsideOfRange: function(data) {
        var self = this;
        var xMin = this._attributes.xScales.primary.minValue;
        var xMax = this._attributes.xScales.primary.maxValue;
        var yMin = this._attributes.yScales.primary.minValue;
        var yMax = this._attributes.yScales.primary.maxValue;

        if (data.length>0) {
            //remove data-points that fall outside of min/max display values
            if (xMin !== 'auto' || xMax !== 'auto' || yMin !== 'auto' || yMax !== 'auto') {
                data = _.filter(data, function(d) {
                    return  ( xMin === 'auto' || d[self._attributes.controlField] >= xMin ) &&
                            ( xMax === 'auto' || d[self._attributes.controlField] <= xMax ) &&
                            ( yMin === 'auto' || d[self._attributes.valueField] >= yMin ) &&
                            ( yMax === 'auto' || d[self._attributes.valueField] <= yMax );
                });
            }
        }

        // if new data-points are outside of range inform the user
        if (data.length === 0) {

            if (!this._outsideRangeMessage) {
                this._outsideRangeMessage = new Backbone.Model({
                    code : 'DATA_OUTSIDE_RANGE'
                });
                this.runtimeMessages.add(this._outsideRangeMessage);
            }
        }
        // if we have data remove user message if displayed
        else {
            if (this._outsideRangeMessage) {
                this.runtimeMessages.remove(this._outsideRangeMessage);
                this._outsideRangeMessage = null;
            }
        }

        return data;

    },

    _updateLegend: function() {
        var items = this._getLegendItems();
        if (items.length > 0) {
            this._legend.update(items);
        }
    },

    // attempt to extract unique keyfield values and return array of legend items
    _getLegendItems: function() {
        var self = this;
        var items = [];
        var series = this._attributes.series;

        // if keyField has been configured or derived from data group by keyField
        if (this._attributes.keyField) {

            _.each(_.groupBy(this._data, this._attributes.keyField), function(d,k) {
                items.push({
                    name: k,
                    label: k,
                    color: self._colorScale(k)
                });
            });

        }

        // if we have groups and series have been configured
        if (items.length > 0 && series && series.length > 0) {
            _.each(series,function(s) {
                var match = _.find(items, function(i) { return i.name === s.name; });
                //apply params to configured series
                if (match) {
                    if (s.label) { match.label = s.label; }
                    match.color = s.color ? s.color : self._colorScale(match.name);
                }
                // otherwise create item
                else {
                    items.push({
                        name: s.name,
                        label: s.label ? s.label : s.name,
                        color: s.color ? s.color : self._colorScale(s.name)
                    });
                }
            });
        }

        return items;

    },

    _onShowTooltip: function(point,color) {
        var valueFmt = d3.format(this._attributes.tooltip.valueFormat);
        var controlFmt = d3.format(this._attributes.tooltip.controlFormat);

        if (this._live) {
            this.pause();
        }

        var header = $('<span>')
            .css('color', color)
            .text(point[this._attributes.keyField]);

        var body = $('<ul>')
            .addClass("attribute-list");

        // if time is available
        if (point[this._attributes.timeField]) {
            body.append([
                $('<li>').html( '<span class="label">Time: </span>'+d3formatters.timeUTC(point[this._attributes.timeField]) )
            ]);
        }

        body.append([
            $('<li>').html( '<span class="label">'+this._attributes.tooltip.valueLabel+': </span>'+valueFmt(point[this._attributes.valueField])),
            $('<li>').html( '<span class="label">'+this._attributes.tooltip.controlLabel+': </span>'+controlFmt(point[this._attributes.controlField]))
        ]);

        this._tooltip.setHeader(header);
        this._tooltip.setBody(body);

        this._tooltip.position(this._getTooltipPosition());

        this._tooltip.show();
    },

    _onHideTooltip: function() {

        if (this._live) {
            this.play();
        }

        this._tooltip.stopTween();
        this._tooltip.hide();
    },

    _getTooltipPosition: function() {
        // use actual mouse pointer position here as the point might be in transition
        var pos = d3.mouse(this._svg.node());
        return {
            left: pos[0],
            top: pos[1],
            pointWidth: this._attributes.markerSize
        };
    },

    _setControlField: function(key) {
        this._controlValidator.setValueField(key);
        this._attributes.controlField = key;

        _.defaults(this._attributes.tooltip, {controlLabel: key} );
        _.defaults(this._attributes.xScales.primary, {label: key} );

        if (this._xAxisLabel) {
            this._xAxisLabel.setLabelText(this._attributes.xScales.primary.label);
        }
    },

    _setValueField: function(key) {
        this._valueValidator.setValueField(key);
        this._attributes.valueField = key;

        _.defaults(this._attributes.tooltip, {valueLabel: key});
        _.defaults(this._attributes.yScales.primary, {label: key});

        if (this._yAxisLabel) {
            this._yAxisLabel.setLabelText(this._attributes.yScales.primary.label);
        }
    },

    _setKeyField: function(key) {
        this._attributes.keyField = key;
        _.defaults(this._attributes.tooltip, {titleField: key});
    },

    // can not use juttle-view method as we need to consider 2 fields (valueFields and controlField)
    _determineTheValueField: function(batch) {
        if (!batch.length) {
            return;
        }
        var pt = batch[0];
        if ( 'value' in pt && _.isNumber(pt['value'])) {
            this._setValueField('value');
            return true;
        }

        var fields = Object.keys(pt);

        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            if (field !== this._attributes.controlField && field !== this._attributes.timeField && this._valueValidator.isValidValue(pt, field) ) {
                this._setValueField(field);
                return true;
            }
        }

        this.handleFatalError('COULD_NOT_DETERMINE_VALUE_FIELD');
        return false;

    },

    _determineTitleAndKeyField: function(batch) {

        for (var i=0; i<batch.length && (!this._attributes.title || !this._attributes.keyField); i++) {

            // attempt to determine a title
            if (!this._attributes.title && batch[i].hasOwnProperty('name')) {
                this.title.text(batch[i].name);
                this._attributes.title = batch[i].name;
            }

            // attempt to determine a keyField
            if (!this._attributes.keyField) {

                // use name if availble
                if (batch[i].hasOwnProperty('name')) {
                    this._setKeyField('name');
                }
                // use the first field containing a string
                else{
                    _.each(batch[i], function(val, key) {
                        if (_.isString(val)) {
                            this._setKeyField(key);
                        }
                    }, this);
                }

            }
        }
    },

    _determineTheControlField: function(batch) {

        if (!batch.length) {
            return;
        }
        var pt = batch[0];
        if ( 'control' in pt && _.isNumber(pt['control'])) {
            this._setControlField('control');
            return true;
        }

        var fields = Object.keys(pt);

        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            if (field !== this._attributes.valueField && field !== this._attributes.timeField && this._controlValidator.isValidValue(pt, field) ) {
                this._setControlField(field);
                return true;
            }
        }

        this.handleFatalError('SCATTER_COULD_NOT_DETERMINE_CONTROL_FIELD');
        return false;

    },

    _calculateNiceMinValue: function(data, field, threshold) {
        var minValue = d3.min(data, function(d) {
            return d[field];
        } );
        return minValue === undefined || minValue > threshold ? threshold : minValue;
    },

    _calculateNiceMaxValue: function(data, field, threshold) {
        var maxValue = d3.max(data, function(d) {
            return d[field];
        });
        return maxValue === undefined || maxValue < threshold ? threshold : maxValue;
    },

    // both valueField and controlField need to be numeric values
    // instead of using valuevalidator.validateBatch()
    // it is more efficient to only loop batch once
    _validateTheBatch: function(batch) {
        for (var i = 0; i < batch.length; i++) {
            if ( !this._valueValidator.isValidValue(batch[i])) {
                this.handleFatalError('VALUE_FIELD_NON_NUMERIC', {
                    valueField: this._attributes.valueField
                });
                return false;
            }
            if ( !this._controlValidator.isValidValue(batch[i]) ) {
                this.handleFatalError('SCATTER_CONTROL_FIELD_NON_NUMERIC', {
                    controlField: this._attributes.controlField
                });
                return false;
            }

        }
        return true;
    },

    _applyOptionDefaults: function(options) {
        options = options || {};
        _.defaults(options, {
            tooltip : {},
            timeField : 'time',
            markerSize : 6,
            markerOpacity: 1,
            limit: 1000,
            duration: this._live ? 300 : 0 // default to 5min for life feeds
        });

        options.xScales = this._applyScaleOptionDefaults('x', options.xScales, options.controlField);
        options.yScales = this._applyScaleOptionDefaults('y', options.yScales, options.valueField);

        _.defaults(options.tooltip, {
            titleField : options.keyField,
            controlLabel : options.xScales.primary.label,
            controlFormat : options.xScales.primary.tickFormat,
            valueLabel : options.yScales.primary.label,
            valueFormat : options.yScales.primary.tickFormat
        });

        // apply default faceting options
        if (options.facet) {
            _.defaults(options, {
                facet : {}
            });
            _.defaults(options.facet, {
                fields: [],
                width: '1/3'
            });
        }

        return options;
    },

    _applyScaleOptionDefaults : function(type, scales, field) {
        scales = scales || {};
        scales.primary = scales.primary || {};

        _.each(scales, function(scale, name) {
            var disp;

            // y-axis
            if (type === 'y') {
                disp = name === 'primary' ? 'left' : 'right';
            }
            // x-axis
            else{
                disp = 'bottom';
            }

            _.defaults(scale, {
                scaling: 'linear',
                minValue: 'auto',
                maxValue: 'auto',
                displayOnAxis: disp,
                tickFormat : '',
                label: field
            });

        });

        return scales;
    },

    _verifyOptionsAreValid : function(options) {
        var errs = v.validate(options, ScatterChartView.optionValidationConfig);

        if (errs !== undefined) {
            this.throwParamValidationError(errs);
        }
    }

},
// static
    {
        optionValidationConfig: optionValidationConfig
    });

module.exports = ScatterChartView;
