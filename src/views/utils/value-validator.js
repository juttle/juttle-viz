var _ = require('underscore');

function defaultValidator(point, valueField) {
    valueField = valueField || this._valueField;
    return point[valueField] === null || _.isNumber(point[valueField]);
}

var ValueValidator = function(valueField) {
    this._valueField = valueField || 'value';
    this._errorCode = 'VALUE_FIELD_NON_NUMERIC';
    this._validator = defaultValidator;
};

ValueValidator.prototype.validateBatch = function(batch) {
    for (var i = 0; i < batch.length; i++) {
        if (!this.isValidValue(batch[i])) {
            return this._errorCode;
        }
    }
    return undefined;
};

ValueValidator.prototype.setValueField = function(valueField) {
    this._valueField = valueField;
};

ValueValidator.prototype.isValidValue = function(point, valueField) {
    return this._validator(point, valueField);
};

ValueValidator.prototype.setValidator = function(validator, errorCode) {
    if (validator) {
        this._validator = validator;
    }
    
    if (errorCode) {
        this._errorCode = errorCode;
    }
};

module.exports = ValueValidator;