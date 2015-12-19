var $ = require('jquery');
var _ = require('underscore');
var JuttleView = require('./juttle-view');
var Timestamp = require('../lib/generators/timestamp');
var v = require('../lib/object-validation');
var chartColors = require('../lib/utils/jut-color-scale');

var DEFAULT_COLOR = chartColors.getColorMappings()[0].value;
var DEFAULT_NEGATIVE_COLOR = chartColors.getColorMappings()[1].value;

var BarChart = require('../lib/charts/bar-chart');

// When looking for a category to use when one isn't specified,
// these fields are not valid options.
var NON_CATEGORY_FIELDS = ['time','value'];

var optionValidationConfig = {
    allowedProperties : [
        'id',
        'col',
        'row',
        'title',
        'categoryField',
        'valueField',
        'xScale',
        'yScales',
        'display',
        'tooltip'
    ],
    properties : {
        valueField : [v.validators.string],
        categoryField : [v.validators.string],
        display : [
            {
                validator : v.validators.object,
                options : {
                    allowedProperties : ['orientation', 'resetCategories', 'color', 'negativeColor', 'colorful'],
                    properties : {
                        orientation : [
                            {
                                validator : v.validators.enum,
                                options : {
                                    allowedValues : ['vertical', 'horizontal']
                                }
                            }
                        ],
                        resetCategories : [
                            v.validators.integer,
                            {
                                validator : v.validators.greaterThanOrEqual,
                                options : {
                                    threshold : 0
                                }
                            }
                        ]
                    }
                }
            }
        ],
        tooltip : [
            {
                validator : v.validators.object,
                options : {
                    allowedProperties : ['nameField', 'valueField', 'valueFormat'],
                    properties : {
                        nameField : [v.validators.string],
                        valueField : [v.validators.string],
                        valueFormat : [v.validators.string]
                    }
                }
            }
        ],
        xScale : [
            {
                validator : v.validators.object,
                options : {
                    allowedProperties : ['label']
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
        ]
    }
};

var BarChartView = JuttleView.extend({

    initialize: function(options) {
        var self = this;
        options = this._applyOptionDefaults(options.params);
        this._verifyOptionsAreValid(options);
        this._attributes = options;
        this._attributes.timeField = 'time';
        this._valueValidator.setValueField(this._attributes.valueField);

        if (options.title) {
            this.title.text(options.title);
        }

        var wrapper = $('<div/>');
        wrapper.addClass('jut-chart-wrapper');
        $(this.sinkBodyEl).append(wrapper);
        this.chart = new BarChart(wrapper[0], options);

        this.chart.on('addRuntimeMessage', function(message) {
            self.runtimeMessages.add(message);
        });

        this.chart.on('removeRuntimeMessage', function(message) {
            self.runtimeMessages.remove(message);
        });

        this.timestamp = new Timestamp(wrapper);
        var chartMargin = this.chart.getMargin();
        this.timestamp.setHorizontalPadding(chartMargin.left, chartMargin.right);

        this.chart.on("time-updated", function(msg) {
            self.timestamp.update(msg);
        });

    },

    setDimensions: function(key, width, height) {
        if (width) {
            height = width / 1.6189;

            if (height > 325) {
                height = 325;
            }
        } else {
            return; // use defaults.
        }

        this.chart.resize(width, height);
    },

    _consume: function(batch) {
        var self = this;
        if (this._attributes.valueField === undefined && !this._determineValueField(batch)) {
            return;
        }

        if (!this._validateBatch(batch)) {
            return;
        }

        for (var i=0; i<batch.length && this.category === undefined; i++) {
            if (this.chart.category === undefined) {
                var potentialCategoryFields = _.filter(_.keys(batch[i]), function(k) {
                    return ! _.contains(NON_CATEGORY_FIELDS, k) && k !== self._attributes.valueField;
                });

                if (potentialCategoryFields.length === 1) {
                    this.chart.set_category(potentialCategoryFields[0]);
                }
            }
        }

        this.chart.dataTarget.push(batch);
    },

    _consume_mark: function() {
        this.chart.dataTarget.batch_end();
    },

    _consume_eof: function() {
        this.chart.dataTarget.stream_end();
    },

    _setValueField: function(key) {
        var self = this;
        this._valueValidator.setValueField(key);
        self._attributes.valueField = key;
        self.chart.set_value(key);
    },

    _applyOptionDefaults : function(options) {
        options = options || {};
        _.defaults(options, {
            display : {},
            title : '',
            tooltip : {},
            xScale : {},
            yScales : {}
        });

        _.defaults(options.display, {
            orientation : 'vertical',
            resetCategories : 0
        });

        _.extend(options.display, this._applyColorDefaultOptions(options.display));

        _.defaults(options.yScales, {
            primary : {}
        });

        _.defaults(options.yScales.primary, {
            //label : options.valueField,
            tickFormat : '',
            scaling : 'linear',
            minValue : 'auto',
            maxValue : 'auto',
            displayOnAxis : 'left'
        });

        _.defaults(options.tooltip, {
            nameField : options.categoryField,
            valueField : options.valueField,
            valueFormat : '.3s'
        });

        _.defaults(options.xScale, {
            label : options.categoryField
        });

        return options;
    },

    _applyColorDefaultOptions : function(displayOptions) {
        var color;
        var negativeColor;
        if (displayOptions.colorful) {
            color = chartColors.getColorScale();
            negativeColor = chartColors.getColorScale();
        }
        else {
            color = displayOptions.color || DEFAULT_COLOR;
            negativeColor = displayOptions.negativeColor || DEFAULT_NEGATIVE_COLOR;
        }

        return {
            color : color,
            negativeColor : negativeColor
        };
    },

    _verifyOptionsAreValid : function(options) {
        var errs = v.validate(options, BarChartView.optionValidationConfig);

        if (errs !== undefined) {
            this.throwParamValidationError(errs);
        }
    }
},
// static
{
    optionValidationConfig: optionValidationConfig
});

module.exports = BarChartView;
