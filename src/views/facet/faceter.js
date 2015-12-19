var _ = require('underscore');
var $ = require('jquery');
var LayoutManager = require('./layoutManager');
var FacetedPanel = require('./facetedPanel');

function Faceter(container, facetFields) {
    this._facetFields = facetFields;
    this._layoutManager = new LayoutManager();
    $(container).append(this._layoutManager.el);
    this._facets = [];
}

Faceter.prototype.findFacet = function(facetFieldValues) {
    var facet = _.find(this._facets, function(thisFacet) {
        if (_.isEqual(thisFacet.facetFieldValues, facetFieldValues)) {
            return true;
        }
    });

    if (facet) {
        return facet.body;
    }
};

Faceter.prototype._registerFacet = function(facetFieldValues, obj) {
    var facet = {
        facetFieldValues : facetFieldValues,
        body : obj
    };

    this._facets.push(facet);
    return facet;
};

Faceter.prototype._getOrderedFieldsWithValues = function(facetFieldValues) {
    return this._facetFields.map(function(facetField) {
        return {
            name : facetField,
            value : facetFieldValues[facetField]
        };
    });
};

Faceter.prototype._createAndAddPanel = function(orderedFieldsAndValues, obj) {
    var facetedPanel = new FacetedPanel(orderedFieldsAndValues);
    facetedPanel.setBody(obj.el);
    this._layoutManager.add(facetedPanel.el);
};

Faceter.prototype.addFacet = function(facetFieldValues, obj) {
    var facet = this._registerFacet(facetFieldValues, obj);
    var orderedFieldsWithValues = this._getOrderedFieldsWithValues(facetFieldValues);
    this._createAndAddPanel(orderedFieldsWithValues, obj);
    return facet.body;
};

Faceter.prototype.resize = function(width, height) {
    this._layoutManager.resize(width, height);
};

module.exports = Faceter;