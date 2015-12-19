var $ = require('jquery');
var _ = require('underscore');
var JuttleView = require('./juttle-view');
var Timestamp = require('../lib/generators/timestamp');
var PieChart = require('../lib/charts/pie-chart');

var v = require('../lib/object-validation');

// When looking for a category to use when one isn't specified,
// these fields are not valid options.
var NON_CATEGORY_FIELDS = ['time','value'];

var optionValidationConfig = {
    allowedProperties : [
        'id',
        'title',
        'col',
        'row',
        'categoryField',
        'valueField',
        'radiusInner',
        'sliceLabels'
    ],
    properties : {
        valueField : [v.validators.string],
        categoryField : [v.validators.string],
        radiusInner : [
            v.validators.number,
            {
                validator : v.validators.greaterThanOrEqual,
                options : {
                    threshold : 0
                }
            },
            {
                validator : v.validators.lessThanOrEqual,
                options : {
                    threshold : 100
                }
            }
        ],
        sliceLabels : [
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
        ]
    }
};

var piechart = JuttleView.extend({
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

        this.pieChartEl = document.createElement('div');
        $(this.sinkBodyEl).append(this.pieChartEl);

        this.chart = new PieChart(this.pieChartEl, options);

        this.chart.on('addRuntimeMessage', function(message) {
            self.runtimeMessages.add(message);
        });

        this.chart.on('removeRuntimeMessage', function(message) {
            self.runtimeMessages.remove(message);
        });


        this.timestamp = new Timestamp(this.pieChartEl);

        this.chart.on("time-updated", function(msg) {
            self.timestamp.update(msg);
        });
    },

    _applyOptionDefaults: function(options) {
        options = options || {};

        _.defaults(options, {
            radiusInner : 0,
            sliceLabels : {}
        });

        _.defaults(options.sliceLabels, {
            nameField : options.categoryField,
            valueField : options.valueField,
            valueFormat : '.3s'
        });

        return options;
    },

    _verifyOptionsAreValid : function(options) {
        var errs = v.validate(options, piechart.optionValidationConfig);

        if (errs !== undefined) {
            this.throwParamValidationError(errs);
        }
    },

    _setValueField: function(key) {
        this._attributes.valueField = key;
        this._valueValidator.setValueField(key);
        this.chart.set_value(key);
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
        this.chart.resize(width,height);
    },

    _consume: function(batch) {
        var self = this;

        if (this._attributes.valueField === undefined && !this._determineValueField(batch)) {
            return;
        }

        if (!this._validateBatch(batch)) {
            return;
        }

        for (var i=0; i<batch.length && this.chart.getCategoryField() === undefined; i++) {
            if (this.chart.getCategoryField() === undefined) {
                var potentialCategoryFields = _.filter(_.keys(batch[i]), function(k) {
                    return ! _.contains(NON_CATEGORY_FIELDS, k) && k !== self._attributes.valueField;
                });

                if (potentialCategoryFields.length === 1) {
                    this.chart.setCategoryField(potentialCategoryFields[0]);
                }
                else {
                    this.handleFatalError('COULD_NOT_DETERMINE_CATEGORY_FIELD');
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
    }
},
// static
{
    optionValidationConfig: optionValidationConfig
});

module.exports = piechart;
