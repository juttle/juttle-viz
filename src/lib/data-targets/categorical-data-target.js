var _ = require('underscore');
var Promise = require('bluebird');
var BaseDataTarget = require('./base-data-target');

var DEFAULT_CATEGORY_COUNT_LIMIT = 200;

var CategoricalDataTarget = BaseDataTarget.extend({
    initialize : function(options) {
        options = options || {};

        this.category = options.category;
        this.value = options.value;
        this.resetCategories = options.resetCategories || 0;
        this.categoryCountLimit = options.categoryCountLimit || DEFAULT_CATEGORY_COUNT_LIMIT;

        this._data = {};
        this._key_order = [];
        this.batched = false;
        this._batchCount = 0;
        this._categoriesSeen = {};
    },
    push: function(data) {
        var self = this;
        return Promise.try(function() {
            var categoryCountLimitReached = Object.keys(self._data).length >= self.categoryCountLimit;

            if (self.batched && self.batchEnded) {
                self._batchCount++;
                self._key_order = [];
                self._data = {};

                if (self.resetCategories !== 0 &&
                    self._batchCount % self.resetCategories === 0) {
                    self._categoriesSeen = {};
                }

                self.batchEnded = false;
            }

            _.each(data, function(d) {
                // coerce to category value for lookup/storage in data
                var key = String(d[self.category]);
                if (!self._data.hasOwnProperty(key)) {
                    // if we have reached our bar count limit, don't add this new category/key
                    if (categoryCountLimitReached || Object.keys(self._data).length >= self.categoryCountLimit) {
                        categoryCountLimitReached = true;
                        return;
                    }
                    else {
                        self._key_order.push(key);
                    }
                }
                self._categoriesSeen[key] = true;
                self._data[key] = d;
            } );

            self.trigger('categoryCountLimitReachedUpdate',categoryCountLimitReached);

            if (!self.batched) {
                // probably want to debounce this, ie with requestAnimationFrame
                // as we do in timechart...
                return self.triggerUpdate();
            }
            else {
                return;
            }
        });
    
    },
    batch_end: function() {
        this.batchEnded = true;
        this.triggerUpdate();
        this.batched = true;
    },
    stream_end: function() {
        this.triggerUpdate();
    },
    set_category: function(category) {
        this.category = category;
    },
    set_value: function(value) {
        this.value = value;
    },
    set_reset_categories: function(cnt) {
        this.resetCategories = cnt;
    },
    set_category_count_limit : function(limit) {
        this.categoryCountLimit = limit;
    },
    triggerUpdate: function() {
        var self = this;
        var data = _.map(self._key_order, function(k) {
            return self._data[k];
        } );

        // append the missing keys to the end of the data array
        var missingKeys = _.difference( Object.keys(self._categoriesSeen), self._key_order );
        data = data.concat(missingKeys.map(function(missingKey) {
            var d = {};
            d[self.category] = missingKey;
            d[self.value] = null;
            return d;
        }));

        self.trigger('update', data);
    }

});

module.exports = CategoricalDataTarget;
