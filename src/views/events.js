// var $ = require('jquery');
var _ = require('underscore');
var d3 = require('d3');
var JuttleView = require('./juttle-view');

var d3Formatters = require('../lib/utils/d3-formatters');

var TableGenerator = require('../lib/charts/table');
var MarkerGenerator = require('../lib/generators/event-markers');

var v = require('../lib/object-validation');

var EVENT_MARKER_HEIGHT = 20;

var optionValidationConfig = {
    optionValidationConfig: {
        allowedProperties : [
            'id',
            'title',
            'col',
            'row',
            'nameField',
            'messageField',
            'timeField',
            'on',
            'typeField',
            'useMarkdown'
        ],
        properties : {
            typeField : [v.validators.string],
            nameField : [v.validators.string],
            messageField : [v.validators.string],
            timeField : [v.validators.string],
            useMarkdown: [v.validators.boolean]
        }
    }
};

var EventsView = JuttleView.extend({
    initialize: function(options, views) {
        var self = this;
        this._attributes = options = this._applyOptionDefaults(options.params);

        this._verifyOptionsAreValid(options, views);

        if (options.on) {
            // clear the this.visuals so the canvas doesn't create a well for this sink
            this.visuals = undefined;
            var targetView = this._targetView = _.findWhere(views, { viewId: options.on });

            targetView.chart.hover_rect.extendPadding({top : EVENT_MARKER_HEIGHT});

            this.el = targetView.chart.el
              .append('g')
                .attr('class', 'markers');

            var generator = new MarkerGenerator(targetView.chart.field(), {
                xfield: options.timeField,
                xfieldFormat : d3Formatters.timeUTC,
                title: options.nameField,
                type: options.typeField,
                text: options.messageField,
                clipId: targetView.chart.clipId,
                margin: targetView.chart.margin,
                useMarkdown: options.useMarkdown
            });

            var opts = { show_on_legend: false };

            this.target = targetView.chart.add_series(generator, 'primary', 'primary', opts).target;

            targetView.on('pause', function() {
                self.pause();
            });

            targetView.on('play', function() {
                self.play();
            });

        } else {
            if (options.title) {
                this.title.text(options.title);
            }

            this.table = new TableGenerator(this.sinkBodyEl, {
                display : {
                    limit : 1000
                }
            });
            this.target= this.table.dataTarget;
        }
    },

    _applyOptionDefaults : function(options) {
        options = options || {};

        _.defaults(options, {
            typeField : 'type',
            nameField : 'name',
            messageField : 'message',
            timeField : 'time'
        });

        return options;
    },

    _verifyOptionsAreValid : function(options, views) {
        // tack on validation for -on which needs to be one of the present views
        var properties = _.extend({
            on: [
                function(value, options) {
                    if (! _.findWhere(views, { viewId: value })) {
                        return new v.ValueValidationError(
                            null,
                            'OVERLAY_SINK_NOT_FOUND',
                            {
                                overlayId : value
                            }
                        );
                    }
                }
            ]},
            EventsView.optionValidationConfig.properties
        );
        var errs = v.validate(options, _.extend({properties: properties}, _.omit(EventsView.optionValidationConfig, 'properties')));

        if (errs !== undefined) {
            this.throwParamValidationError(errs);
        }
    },

    _consume: function(points) {
        this.target.push(points);
    },

    _consume_mark: function() {
        this.target.batch_end();
    },

    // gets called when a stream finishes
    _consume_eof: function() {
        this.target.stream_end();
    },

    _validateTimeField : function(time) {
        // if in timechart overlay, timeField needs to actually be a Date
        if (this._targetView) {
            return _.isDate(time) && !_.isNaN(time.getTime());
        }
        else {
            return true;
        }
    },

    _handleInvalidTimeField : function() {
        JuttleView.prototype._handleInvalidTimeField.apply(this);
        if (this._targetView) {
            this._targetView._handleInvalidTimeField(); // if in timechart overlay, timechart should display error
        }
    },
},
optionValidationConfig
);

module.exports = EventsView;
