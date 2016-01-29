var Base = require('extendable-base');
var commonRuntimeMessages = require('../lib/utils/common-runtime-messages');
var RuntimeMessages = require('../lib/components/runtimeMessages');
var FixedLengthQueue = require('../lib/fixed-length-queue');
var ValueValidator = require('./utils/value-validator');
var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var v = require('../lib/object-validation');
var BaseError = require('../lib/base-error');

var SeriesFilter = require('../lib/generators/series-filter');

var StringBundle  = require('../lib/strings/string-bundle');
var paramValidationErrorStrings = require('../lib/strings/param-validation-error-strings');
var paramValidationErrorStringBundle = new StringBundle(paramValidationErrorStrings);

// the base view that other views extend.

var JuttleView = Base.extend({
    initialize: function(options) {
        options = options || {};
        options.params = options.params || {};  /*XXX*/

        this.type = options.type;
        this.channel = options.channel;
        this.viewId = options.params.id;
        this.location = options.location;

        this._title = options.params.title;

        this._hasReceivedData = false;
        this._startDisplayed = options.startDisplayed;
        this._paused = false;
        this._jut_time_bounds = options._jut_time_bounds || [];
        this._live = this._determineIfLive(options._jut_time_bounds || []);
        this.pauseQueue = new FixedLengthQueue(1000);
        this.error_state = false;

        this._valueValidator = new ValueValidator();

        this.subscriberID = -1;
        this.events = {};

        this._setupCommonSinkComponents();
    },
    teardown: function() {},

    _consume: function(batch) {}, //to be overridden as part of the consume template pattern defined below
    consume: function (batch) {
        var i;

        if (batch.length === 0) {
            return;
        }

        if (this.error_state) {
            return;
        }

        if (this._paused) {
            for (i = 0; i < batch.length; i++) {
                this.pauseQueue.push(this.consume.bind(this, [batch[i]]));
            }

            return;
        }

        if (batch.length !== 0) {
            this._receivedData();
        }

        this._validateTimeFieldsInBatch(batch);

        if (_.isFunction(this._consume)) {
            this._consume(batch);
        }
    },

    _consume_mark: function(time) {}, //to be overridden as part of the consume_mark template pattern defined below
    consume_mark: function(time) {
        if (_.isString(time)) {
            time = new Date(time);
        }

        if (this._paused) {
            this.pauseQueue.push(this.consume_mark.bind(this, time));
            return;
        }

        if (_.isFunction(this._consume_mark)) {
            this._consume_mark(time);
        }
    },

    _consume_eof: function() {}, //to be overridden as part of the consume_eof template pattern defined below
    consume_eof: function() {
        if (this._paused) {
            this.pauseQueue.push(this.consume_eof.bind(this));
            return;
        }

        if (_.isFunction(this._consume_eof)) {
            this._consume_eof();
        }

        if (!this._hasReceivedData) {
            this.runtimeMessages.remove(commonRuntimeMessages.WAITING_FOR_DATA);
            this.runtimeMessages.add(commonRuntimeMessages.NO_DATA_RECEIVED);
        }
    },

    _consume_tick: function() {}, //to be overridden as part of the consume_tick template pattern defined below
    consume_tick: function(time) {
        if (_.isString(time)) {
            time = new Date(time);
        }

        if (this._paused) {
            this.pauseQueue.push(this.consume_tick.bind(this, time));
            return;
        }

        if (_.isFunction(this._consume_tick)) {
            this._consume_tick(time);
        }
    },

    pause : function() {
        this._paused = true;
        this.trigger('pause');
    },

    play : function() {
        this._paused = false;

        this.pauseQueue.flush().forEach(function(bufferedValue) {
            bufferedValue();
        });

        this.trigger('play');
    },

    on: function(eventName, callback, context) {
        if (!this.events.hasOwnProperty(eventName)) {
            this.events[eventName] = [];
        }

        var token = (++this.subscriberID).toString();

        this.events[eventName].push({
            token: token,
            callback: callback,
            context: context
        });

        return token;
    },
    off: function(token) {
        var i, j, keys, li, lj;
        // fastest way to iterate over an object's properties
        // http://jsperf.com/iterating-over-object-properties/2
        for (i = 0, keys = Object.keys(this.events), li = keys.length; i < li; i++) {
            if (this.events[keys[i]]) {
                for (j = 0, lj = this.events[keys[i]].length; j < lj; j++) {
                    if (this.events[keys[i]][j].token === token) {
                        this.events[keys[i]].splice(j, 1);
                        return token;
                    }
                }
            }
        }
        return false;
    },
    trigger: function(eventName) {
        if (!this.events[eventName]) {
            return false;
        }

        var subscribers = this.events[eventName];
        var args = Array.prototype.slice.call(arguments, 1);
        var nameAndArgs = [eventName].concat(args);

        var i, l, subs;
        for (i = 0, l = subscribers.length; i < l; i++ ) {
            subs = subscribers[i];
            subs.callback.apply(subs.context || this, nameAndArgs);
        }

        return this;
    },
    setDimensions: function() {}, //noop to be override with appropriate sinks

    setupSeriesFilter: function() {

        var el = $(this.el).find('.series-filter');
        var seriesFilter = new SeriesFilter(el);

        return seriesFilter;

    },

    _determineValueField: function(batch) {
        var self = this;

        var pt = batch[0];
        if ( 'value' in pt && this._valueValidator.isValidValue(pt, 'value')) {
            self._setValueField('value');
            return true;
        }

        var fields = Object.keys(pt);

        for (var i = 0; i < fields.length; i++) {
            var field = fields[i];
            if (field !== self._attributes.timeField && this._valueValidator.isValidValue(pt, field)) {
                self._setValueField(field);
                return true;
            }
        }

        this.handleFatalError('COULD_NOT_DETERMINE_VALUE_FIELD');
        return false;
    },

    _validateBatch : function(batch) {
        var errCode = this._valueValidator.validateBatch(batch);
        if (errCode !== undefined) {
            this.handleFatalError(errCode, {
                valueField: this._attributes.valueField
            });
        }

        return !(errCode);
    },

    _setupCommonSinkComponents : function() {
        this._setupVisuals();
        this._setupHeader();
        this._setupRuntimeMessages();
        this._setupSinkBody();
        this._showWaitingForData();
    },

    _setupVisuals : function() {
        this.el = document.createElement('div');
        $(this.el)
            .addClass('juttle-view')
            .addClass(this.type);
        this.visuals = { 0: this.el };
    },

    _setupHeader : function() {
        if (this._title) {
            var header = $('<div>').addClass('jut-chart-header');
            var wrapper = $('<div>').addClass('jut-chart-drag-wrapper');
            header.append(wrapper);

            var drag_icon = this.dragIcon = $('<i>').addClass('fa fa-arrows chart-drag-icon jut-drag-handle');
            drag_icon.hover(function () {
                $(this).parent().addClass('hover');
            }, function () {
                $(this).parent().removeClass('hover');
            });

            drag_icon.on('dragstart', function(e) {
                e.originalEvent.dataTransfer.setDragImage(this.parentElement, 0, 0);
            });

            wrapper.append(drag_icon);

            // add series filter container
            var series_filter = $('<div>').addClass('series-filter has-feedback');
            wrapper.append(series_filter);

            this.title = $('<div>').addClass('jut-chart-title');
            this.title.html("&nbsp;");
            wrapper.append(this.title);
            $(this.el).append(header);
        }
    },

    _setupRuntimeMessages : function() {
        this.runtimeMessages = new RuntimeMessages();

        if (!this.hideMessages) {
            this.el.appendChild(this.runtimeMessages.el);
        }
    },

    _setupSinkBody : function() {
        this.sinkBodyEl = document.createElement('div');
        if (!this._startDisplayed) {
            $(this.sinkBodyEl).css('display', 'none');
        }
        $(this.el).append(this.sinkBodyEl);
    },

    _showWaitingForData : function() {
        this.runtimeMessages.add(commonRuntimeMessages.WAITING_FOR_DATA);
    },

    _validateTimeFieldsInBatch : function(batch) {
        if (this._attributes && this._attributes.timeField) {
            for (var i=0; i<batch.length; i++) {
                var timeFieldValue = batch[i][this._attributes.timeField];

                if (!this._validateTimeField(timeFieldValue)) {
                    this._handleInvalidTimeField();
                    return;
                }
            }
        }
    },

    _validateTimeField : function(time) {
        return true;
    },

    _handleInvalidTimeField : function() {
        this.handleFatalError("TIME_FIELD_ERROR");
    },

    _receivedData : function() {
        if (this._hasReceivedData) {
            return;
        }

        if (!this._startDisplayed) {
            $(this.sinkBodyEl).slideDown('slow');
        }

        if (this.runtimeMessages) {
            this.runtimeMessages.remove(commonRuntimeMessages.WAITING_FOR_DATA);
        }

        this._hasReceivedData = true;
    },

    _determineIfLive : function(fromToQueries) {
        for (var i = 0; i < fromToQueries.length; i++) {
            var query = fromToQueries[i];
            if (query.last !== null || query.to !== null) {
                return false;
            }
        }

        return true;
    },

    handleFatalError : function(runtime_message_code, info) {

        this.error_state = true;

        // Adds a runtime message to the sink that threw the error
        // with the provided runtime_message_code
        if (runtime_message_code && this.runtimeMessages) {
            var fatalErrorModel = new Backbone.Model({
                code : runtime_message_code,
                info : info
            });
            this.runtimeMessages.add(fatalErrorModel);
        }

        // Hides the chart part of the sink, but the runtime message
        // and the title is still displayed
        if (this.sinkBodyEl) {
            this.sinkBodyEl.style.display = 'none';
            this.hidden = true;
        }
    },
    destroy: function() {
        this.runtimeMessages.destroy();
        this.runtimeMessages = null;
        this.visuals = null;
        this.el = null;
        this.sinkBodyEl = null;
        this.title = null;
        this.pauseQueue = null;

        if (this.dragIcon) {
            this.dragIcon.off();
        }

        this.trigger('destroy');
    },

    throwParamValidationError: function(errors) {
        throw new BaseError(null,
            "PARAM_VALIDATION",
            {
                errors: errors,
                sinkName : this.type,
                location : this.location
            });
    }
},
    {
        getValidOptionsFlattened: function() {
            var optionValidationConfig = this.optionValidationConfig;
            if (!optionValidationConfig) {
                return [];
            }

            var validFlattenedOptions = [];
            function findFlattenedOptions(obj, prefix) {
                _.each(obj.allowedProperties, function(allowedProperty) {
                    if (obj.properties &&
                            obj.properties[allowedProperty] &&
                            obj.properties[allowedProperty][0].validator === v.validators.object) {
                        findFlattenedOptions(
                                obj.properties[allowedProperty][0].options,
                                prefix === '' ? allowedProperty : prefix + "." + allowedProperty
                                );
                    }
                    else {
                        validFlattenedOptions.push(prefix === '' ? allowedProperty : prefix + "." + allowedProperty);
                    }
                });
            }
            findFlattenedOptions(optionValidationConfig, '');

            return validFlattenedOptions;
        },

        getFlattenedParamValidationErrors: function(errs) {
            return _.mapObject(v.flattenErrors(errs), function(flattenedError, paramName) {
                return flattenedError.map(function(singleError) {
                    var info = _.extend({
                        paramName: paramName
                    }, singleError.info);

                    var code = singleError.code;

                    if (code === 'INVALID_TYPE' || code === 'OUT_OF_RANGE') {
                        code += '_' + singleError.info.type;
                    }

                    return _.extend(singleError, {
                        message: paramValidationErrorStringBundle.getStringForCode(code,{info: info})
                    });
                });
            });
        }
    }
);


module.exports = JuttleView;
