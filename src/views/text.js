var $ = require('jquery');
var _ = require('underscore');
var JuttleView = require('./juttle-view');
var tabularDataUtils = require('../lib/utils/tabular-data-utils');
var Backbone = require('backbone');

var JSON_INDENT = 4;
var v = require('../lib/object-validation');

var TextComponent = function(element, options) {
    var self = this;
    _.extend(this, Backbone.Events);
    this.options = options;
    this.textbox = $('<textarea>').attr('rows', options.height);
    $(element).append(this.textbox);

    this.dataTarget = {
        buffer : [],
        push: function(data) {
            if (this._checkIfLimitReached(options.limit)) {
                return;
            }

            this._appendToBuffer(data, options.limit);

            self.trigger('update');
            self._draw(this.buffer);
        },
        tick: function(time) {
            if (!options.ticks || options.format !== 'raw') {
                return ;
            }
            var text = '. . . . . . . . . . . . . . . . . . . . . . . . . . . . . . . ';
            if (options.times) {
                text += time.toISOString();
            }
            self.dataTarget.push([text]);
        },
        batch_end: function(time) {
            if (!options.marks || options.format !== 'raw') {
                return ;
            }
            var text = '--------------------------------------------------------------';
            if (options.times) {
                text += time.toISOString();
            }
            self.dataTarget.push([text]);
        },
        stream_end: function() {
            if (options.format !== 'raw') {
                return;
            }

            self.dataTarget.push(['==============================================================']);
        },
        /**
         * Checks if we have reached the display limit.
         * Sends a message if it is.
         * @return {[type]} [description]
         */
        _checkIfLimitReached : function(limit) {
            if (this.buffer.length >= limit) {
                self._sendDisplayLimitReachedMessage(limit);
                return true;
            }

            return false;
        },
        /**
         * Appends the new data to the buffer up to the current limit.
         * Sends a message if limit is reached.
         * @param  {[type]} data [description]
         * @return {[type]}      [description]
         */
        _appendToBuffer : function(newData, limit) {
            if ((this.buffer.length + newData.length) > options.limit) {
                this.buffer = this.buffer.concat(newData.slice(0, options.limit - this.buffer.length));
                self._sendDisplayLimitReachedMessage(limit);
            }
            else {
                this.buffer = this.buffer.concat(newData);
            }
        }
    };
};

TextComponent.prototype._sendDisplayLimitReachedMessage = function(limit) {
    if (!this._displayLimitReachedMessage) {
        this._displayLimitReachedMessage = new Backbone.Model({
            code : 'LOGGER_DISPLAY_LIMIT_REACHED',
            info : {
                displayLimit : limit
            }
        });
    }

    this.trigger('addRuntimeMessage', this._displayLimitReachedMessage);
};

TextComponent.prototype._findColumns = function(data) {
    this._currentColumns = this._currentColumns || [];
    this._currentColumns = tabularDataUtils.findColumns(data, this._currentColumns);
    return this._currentColumns;
};

TextComponent.prototype._draw = function(data) {
    var self = this;
    var options = this.options;

    var output = '';

    switch(options.format) {
        case 'raw':
            output = self._formatAsRaw(data);
            break;
        case 'json':
            output = self._formatAsJSON(data);
            break;
        case 'csv':
            output = self._formatAsCSV(data,self._findColumns(data));
            break;
    }

    self.textbox.val(output);
};

TextComponent.prototype._formatAsRaw = function(data) {
    return data.map(function(dataItem) {
        return _.isString(dataItem) ? dataItem : JSON.stringify(dataItem);
    }).join('\n');
};

TextComponent.prototype._formatAsJSON = function(data) {
    return JSON.stringify(data, null, JSON_INDENT);
};

TextComponent.prototype._formatAsCSV = function(data, columnOrder) {
    var output = data.map(function(dataItem) {
        return columnOrder.map(function(column) {
            var value = dataItem[column];
            if (value === undefined) {
                return;
            }

            if (_.isDate(value)) {
                value = value.toISOString();
            }

            return _.isNumber(value) ? value : '"' + value + '"';
        }).join(',');
    }).join('\n');

    return columnOrder.map(function(column) {
        return '"' + column + '"';
    }).join(',') + '\n' + output;
};

var optionValidationConfig = {
    allowedProperties : [
        'id',
        'title',
        'col',
        'row',
        'height',
        'limit',
        'format',
        'times',
        'ticks',
        'marks'
    ],

    properties : {
        height : [
            v.validators.integer,
            {
                validator : v.validators.greaterThan,
                options : {
                    threshold : 0
                }
            }
        ],
        limit : [
            v.validators.integer,
            {
                validator : v.validators.greaterThan,
                options : {
                    threshold : 0
                }
            }
        ],
        format : [
            {
                validator : v.validators.enum,
                options : {
                    allowedValues : ['raw', 'json', 'csv']
                }
            }
        ],
        times : [ v.validators.boolean ],
        marks : [ v.validators.boolean ],
        ticks : [ v.validators.boolean ]
    }
};

var TextView = JuttleView.extend({
    initialize: function(options) {
        var self = this;
        options = options || {};
        options = this._applyOptionDefaults(options.params);

        this._verifyOptionsAreValid(options);

        if (options.title) {
            this.title.text(options.title);
        }

        this.textComponent = new TextComponent(this.sinkBodyEl, options);

        this.textComponent.on('update', function() {
            self._receivedData();
        });

        this.textComponent.on('addRuntimeMessage', function(message) {
            self.runtimeMessages.add(message);
        });

        this.textComponent.on('removeRuntimeMessage', function(message) {
            self.runtimeMessages.remove(message);
        });
    },

    _applyOptionDefaults : function(options) {
        options = options || {};

        _.defaults(options, {
            title: '',
            height : 20,
            limit : 1000,
            format : 'raw',
            times : false,
            ticks : false,
            marks : true
        });

        return options;
    },

    _verifyOptionsAreValid : function(options) {

        var errs = v.validate(options, TextView.optionValidationConfig);

        if (errs !== undefined) {
            this.throwParamValidationError(errs);
        }
    },

    _consume: function(batch) {
        this.textComponent.dataTarget.push(batch);
    },

    // gets called when a batch finishes
    _consume_mark: function(time) {
        this.textComponent.dataTarget.batch_end(time);
    },

    // gets called for ticks
    _consume_tick: function(time) {
        this.textComponent.dataTarget.tick(time);
    },

    // gets called when a stream finishes
    _consume_eof: function() {
        this.textComponent.dataTarget.stream_end();
    },
    setDimensions: function() {
        //does nothing, but required
    }
},
// static
    {
        optionValidationConfig: optionValidationConfig
    }
);

module.exports = TextView;
