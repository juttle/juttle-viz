var _ = require('underscore');

var Faceter = function (facetFields) {
    this._facetFields = facetFields;
    this._facets = [];
};

Faceter.prototype.findFacet = function(facetFieldValues) {
    return _.find(this._facets, function(f) {
        if (_.isEqual(f.facetFieldValues, facetFieldValues)) {
            return true;
        }
    });
};

Faceter.prototype.addFacet = function(facetFieldValues, chart) {
    var facet = this._registerFacet(facetFieldValues, chart);
    return facet;
};

Faceter.prototype._registerFacet = function(facetFieldValues, chart) {
    var facet = {
        facetFieldValues : facetFieldValues,
        chart : chart
    };

    this._facets.push(facet);
    return facet;
};

module.exports = Faceter;