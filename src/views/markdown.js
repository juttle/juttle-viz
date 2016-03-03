var JuttleView = require('./juttle-view');
var marked = require('marked');
var _ = require('underscore');
var v = require('../lib/object-validation');

var optionValidationConfig = {
    allowedProperties: [
        'id',
        'col',
        'row',
        'title',
        'field'
    ],
    properties: {
        field: [v.validators.string]
    }
};

var MarkdownView = JuttleView.extend({
    initialize: function(options) {
        options = options || {};
        var params = options.params || {};
        this._field = params.field;

        this._verifyOptionsAreValid(params);
    },
    _consume: function(batch) {
        var lastPoint = _.last(batch);

        if (!this._field) {
            this._field =  _.without(Object.keys(lastPoint), 'time')[0];
        }

        this.sinkBodyEl.innerHTML = marked(this._field ? lastPoint[this._field] : '');
    },

    _verifyOptionsAreValid : function(options) {

        var errs = v.validate(options, MarkdownView.optionValidationConfig);

        if (errs !== undefined) {
            this.throwParamValidationError(errs);
        }
    }
},
// static
    {
        optionValidationConfig: optionValidationConfig
    }
);

module.exports = MarkdownView;
