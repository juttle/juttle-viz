var JuttleView = require('./juttle-view');
var _ = require('underscore');
var v = require('../lib/object-validation');

var TableGenerator = require('../lib/charts/table');

var optionValidationConfig = {
    allowedProperties : [
        'id',
        'title',
        'col',
        'row',
        'columnOrder',
        'markdownFields',
        'limit',
        'update',
        'height',
    ],
    properties : {
        limit : [
            v.validators.integer,
            {
                validator : v.validators.greaterThan,
                options : {
                    threshold : 0
                }
            }
        ],
        height : [
            v.validators.integer,
            {
                validator : v.validators.greaterThan,
                options : {
                    threshold : 0
                }
            }
        ],
        update : [
            {
                validator : v.validators.enum,
                options : {
                    allowedValues : ['replace', 'append']
                }
            }
        ],
        columnOrder : [
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
        markdownFields: [
            v.validators.array,
            function(value, options) {
                var nonStringItem = _.find(value, function(item) {
                    return ! _.isString(item);
                });

                if (nonStringItem !== undefined) {
                    return new v.ValueValidationError(null, 'INVALID_TYPE', {
                        type : 'STRING_ARRAY'
                    });
                }
            }
        ]
    }
};

var table = JuttleView.extend({
    initialize: function(options) {
        var self = this;
        options = options || {};

        options = this._applyOptionDefaults(options.params);
        this._verifyOptionsAreValid(options);

        if (options.title) {
            this.title.text(options.title);
        }

        this.table = new TableGenerator(this.sinkBodyEl, options);
        this.table.on('addRuntimeMessage', function(message) {
            self.runtimeMessages.add(message);
        });

        this.table.on('removeRuntimeMessage', function(message) {
            self.runtimeMessages.remove(message);
        });
    },

    _applyOptionDefaults: function(options) {
        options = options || {};

        _.defaults(options, {
            height : 400,
            limit : 1000,
            update : 'append'
        });

        return options;
    },

    _verifyOptionsAreValid: function(options) {
        var errs = v.validate(options, table.optionValidationConfig);

        if (errs !== undefined) {
            this.throwParamValidationError(errs);
        }

    },

    setDimensions: function(key, width, height) {
        if (width) {
            this.table.options.width = width;
        }
        if (height) {
            this.table.options.height = height;
        }
        this.table.resize();
    },

    _consume: function(batch) {
        this.table.dataTarget.push(batch);
    },

    // gets called when a batch finishes
    _consume_mark: function() {
        this.table.dataTarget.batch_end();
    },

    // gets called when a stream finishes
    _consume_eof: function() {
        this.table.dataTarget.stream_end();
    }
},
// static
{
    optionValidationConfig: optionValidationConfig
});

module.exports = table;
