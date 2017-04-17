
var d3 = require('d3');
var _ = require('underscore');
var chartColors = require('../utils/jut-color-scale');
var Backbone = require('backbone');
var CategoricalDataTarget = require('../data-targets/categorical-data-target');

var OUTER_RADIUS_PADDING = 20;
var ALL_ZERO_VALUES = new Backbone.Model({ code : 'ALL_CATEGORIES_ARE_ZERO' });

function calculateMiddleAngle(d) {
    return d.startAngle + (d.endAngle - d.startAngle)/2;
}

var PieChart = function(element, options) {
    _.extend(this, Backbone.Events);
    var self = this;

    this.options = _.extend({
        duration: 500
    },options);

    this.options.valueField = options.valueField === undefined ? 'value' : options.valueField;

    this.color_scale = chartColors.getColorScale();
    _.extend(this, Backbone.Events);

    this.svg = d3.select(element)
        .append('svg')
        .attr('class', 'jut-chart pie-chart');

    this.pieG = this.svg.append('g');

    this.pieG.append('g')
        .attr('class', 'slices');
    this.pieG.append('g')
        .attr('class', 'labels');
    this.pieG.append('g')
        .attr('class', 'lines');

    this.dataTarget = new CategoricalDataTarget({
        category : this.options.categoryField,
        value : this.options.valueField
    });

    this.dataTarget.on('update', this._onUpdate, this);

    this.domainAccessor = function (d) {
        return d[self.options.categoryField];
    };

    this.valueAccessor = function (d) {
        return d[self.options.valueField];
    };

    this.pie = d3.layout.pie()
        .sort(null)
        .value(this.valueAccessor);

    this.pieArc = d3.svg.arc();
    this.labelArc = d3.svg.arc();
};

PieChart.prototype.resize = function (width, height) {
    this.svg
        .attr('width', width)
        .attr('height', height);

    this.pieG
        .attr('width', width)
        .attr('height', height)
        .attr('transform', 'translate(' + width / 2 + ',' + height / 2 + ')');

    this.radius = Math.min(width, height) / 2 - OUTER_RADIUS_PADDING;

    this.pieArc.outerRadius(this.radius)
        .innerRadius(this.radius * this.options.radiusInner/100);

    this.labelArc.innerRadius(this.radius + OUTER_RADIUS_PADDING/2)
        .outerRadius(this.radius + OUTER_RADIUS_PADDING/2);
};

PieChart.prototype._onUpdate = function(eventName, data) {
    var self = this;

    if (data.length === 0) {
        return;
    }
    var curr_date = null;
    _.each(data, function(dataPoint) {
        if (!curr_date || (curr_date < dataPoint.time)) {
            curr_date = dataPoint.time;
        }
    });

    this.trigger('time-updated', curr_date);

    data = _.map(data, function(dataItem) {
        dataItem = _.clone(dataItem);
        var val = dataItem[self.options.valueField];
        dataItem[self.options.valueField] = val === null ? 0 : val;
        return dataItem;
    });

    var nonZeroValues = _.without(_.pluck(data, self.options.valueField), 0);

    if (nonZeroValues.length === 0) {
        self.trigger('addRuntimeMessage', ALL_ZERO_VALUES);
        return;
    }
    else {
        self.trigger('removeRuntimeMessage', ALL_ZERO_VALUES);
    }

    this.draw(data);
};

PieChart.prototype.draw = function (data) {
    this._drawSlices(data);
    this._drawLabels(data);
    this._drawLines(data);
};

PieChart.prototype._drawSlices = function(data) {
    var self = this;
    var slice = self.pieG.select('.slices').selectAll('path.slice')
        .data(self.pie(data), function(d) {
            return self.domainAccessor(d.data);
        });

    slice.enter()
        .append('path')
        .attr('class', 'slice')
        .style('fill', function(d) {
            return self.color_scale(self.domainAccessor(d.data));
        })
        .each(function(d) {
            this._current = d;
        });

    if (this.options.duration !== 0) {
        slice
            .transition().duration(self.options.duration !== 0)
            .attrTween('d', function(d) {
                var _self = this;
                var interpolate = d3.interpolate(this._current, d);

                return function(t) {
                    _self._current = interpolate(t);
                    return self.pieArc(_self._current);
                };
            });

        slice
            .exit().transition().delay(self.options.duration).duration(0)
            .remove();
    }
};

PieChart.prototype._drawLines = function(data) {
    var self = this;

    var polyline = self.pieG.select('.lines').selectAll('polyline')
        .data(self.pie(data), function (d) {
            return self.domainAccessor(d.data);
        });

    polyline.enter()
        .append('polyline')
        .attr('class','label-line')
        .style('opacity', 0)
        .each(function(d) {
            this._current = d;
        });

    if (this.options.duration !== 0) {
        polyline.transition().duration(self.options.duration)
            .style('opacity', function (d) {
                return self.valueAccessor(d.data) === 0 ? 0 : 1;
            })
            .attrTween('points', function (d) {
                var _self = this;
                var interpolate = d3.interpolate(this._current, d);
                return function(t) {
                    var d2 = interpolate(t);
                    _self._current = d2;
                    var pos = self.labelArc.centroid(d2);
                    pos[0] = ( self.radius + OUTER_RADIUS_PADDING/2 ) * (calculateMiddleAngle(d2) < Math.PI ? 1 : -1);
                    return [self.pieArc.centroid(d2), self.labelArc.centroid(d2), pos];
                };
            });

        polyline
            .exit().transition().delay(self.options.duration)
            .remove();
    }
};

PieChart.prototype._drawLabels = function(data) {
    var self = this;

    var text = self.pieG.select('.labels').selectAll('text')
        .data(self.pie(data), function(d) {
            return self.domainAccessor(d.data);
        });

    text.enter()
        .append('text')
        .attr('class', 'label')
        .attr('dy', '.25em')
        .style('opacity', 0)
        .each(function(d) {
            this._current = d;
        });

    if (this.options.duration !== 0) {
        text.transition().duration(self.options.duration)
            .style('opacity', function(d) {
                return self.valueAccessor(d.data) === 0 ? 0 : 1;
            })
            .text(function(d) {
                var label = d.data[self.options.sliceLabels.nameField];

                if (self.options.sliceLabels.valueField !== '') {
                    label += ': ' + d3.format(self.options.sliceLabels.valueFormat)(d.data[self.options.sliceLabels.valueField]);
                }
                return label;
            })
            .attrTween('transform', function(d) {
                var _self = this;
                var interpolate = d3.interpolate(this._current, d);

                return function(t) {
                    var d2 = interpolate(t);
                    _self._current = d2;
                    var pos = self.labelArc.centroid(d2);
                    pos[0] = ( self.radius + OUTER_RADIUS_PADDING/2 + 3) * (calculateMiddleAngle(d2) < Math.PI ? 1 : -1);
                    return 'translate('+ pos +')';
                };
            })
            .styleTween('text-anchor', function(d) {
                var interpolate = d3.interpolate(this._current, d);
                return function(t) {
                    var d2 = interpolate(t);
                    return calculateMiddleAngle(d2) < Math.PI ? 'start':'end';
                };
            });

        text
            .exit().transition().delay(self.options.duration)
            .remove();
    }
};

PieChart.prototype.setCategoryField = function(category) {
    this.options.categoryField = category;
    this.dataTarget.set_category(category);
    if (this.options.sliceLabels.nameField === undefined) {
        this.options.sliceLabels.nameField = category;
    }
};

PieChart.prototype.getCategoryField = function() {
    return this.options.categoryField;
};

PieChart.prototype.getValueField = function() {
    return this.options.valueField;
};

PieChart.prototype.set_value = function(val) {
    this.options.valueField = val;
    this.options.sliceLabels.valueField = this.options.sliceLabels.valueField || val;
    this.dataTarget.set_value(val);
};


module.exports = PieChart;
