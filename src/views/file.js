var JuttleView = require('./juttle-view');
var FileSaver = require('filesaver.js');
var v = require('../lib/object-validation');

var optionValidationConfig = {
    allowedProperties: [
        'col',
        'row',
        'filename'
    ],
    properties: {
        filename: [v.validators.string]
    }
};

var FileSink = JuttleView.extend({
    initialize: function(options) {
        this._filename = options.params.filename || "output.json";
        this._data = [];

        this._verifyOptionsAreValid(options.params);
    },

    _consume : function(batch) {
        this._data = this._data.concat(batch);
    },

    _consume_eof : function() {
        var blob = new Blob(
            [JSON.stringify(this._data, null, 2)],
            {type: "application/json;charset=utf-8"});
        FileSaver.saveAs(blob, this._filename);
    },

    _verifyOptionsAreValid : function(options) {

        var errs = v.validate(options, FileSink.optionValidationConfig);

        if (errs !== undefined) {
            this.throwParamValidationError(errs);
        }
    },
},
// static
    {
        optionValidationConfig: optionValidationConfig
    });

module.exports = FileSink;
