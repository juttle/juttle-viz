var JuttleView = require('./juttle-view');
var _ = require('underscore');
var $ = require('jquery');

var v = require('../lib/object-validation');
var Tile = require('../lib/charts/tile');

var Faceter = require('./facet/faceter');

var optionValidationConfig = {
    allowedProperties : [
        'id',
        'title',
        'col',
        'row',
        'valueField',
        'valueFormat',
        'timeField',
        'levelField',
        'facetFields'
    ],
    properties : {
        levelField : [v.validators.string],
        valueFormat : [v.validators.string],
        timeField : [v.validators.string],
        valueField : [v.validators.string]
    }
};

var TileView = JuttleView.extend({
    initialize: function(options) {
        options = this._applyDefaults(options.params);
        this._verifyOptionsAreValid(options);
        this._attributes = this._convertUserOptionsToAttributes(options);
        this._valueValidator.setValueField(this._attributes.valueField);
        this._valueValidator.setValidator(function(value) {
            return value !== undefined;
        }, 'VALUE_FIELD_NON_EXISTANT');

        if (options.title) {
            this.title.text(options.title);
        }

        if (this._attributes.facetFields.length === 0) {
            $(this.el).addClass('not-faceted');
        }

        this._faceter = new Faceter(this.sinkBodyEl, this._attributes.facetFields);
    },

    setDimensions : function(key, width, height) {
        if (width) {
            height = width / 1.6189;

            if (height > 325) {
                height = 325;
            }
        } else {
            return; // use defaults.
        }
    },

    _applyDefaults : function(options) {
        options = options || {};

        _.defaults(options, {
            timeField : 'time',
            facetFields : []
        });

        return options;
    },

    _convertUserOptionsToAttributes : function(options) {
        if (!_.isArray(options.facetFields)) {
            options.facetFields = [options.facetFields];
        }

        return options;
    },

    _verifyOptionsAreValid : function(options) {
        var errs = v.validate(options, TileView.optionValidationConfig);

        if (errs !== undefined) {
            this.throwParamValidationError(errs);
        }
    },

    _setValueField: function(key) {
        this._valueValidator.setValueField(key);
        this._attributes.valueField = key;
    },

    _consume: function(batch) {
        var self = this;

        if (this._attributes.valueField === undefined && !this._determineValueField(batch)) {
            return;
        }

        if (!this._validateBatch(batch)) {
            return;
        }

        batch.forEach(function(point) {
            var facetFields = _.pick(point, self._attributes.facetFields);
            var facet = self._faceter.findFacet(facetFields);

            if (!facet) {
                var tile = new Tile(self._attributes);
                facet = self._faceter.addFacet(facetFields, tile);
            }
            facet.consume([point]);
        });
    },
    _consume_mark: function() {
    },
    _consume_eof: function() {
    }
},
// static
{
    optionValidationConfig: optionValidationConfig
});

module.exports = TileView;
