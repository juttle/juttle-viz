var d3 = require('d3');
var _ = require('underscore');
var Tooltip = require('./tooltip');
var Promise = require('bluebird');

var Bars = function(el, options) {
    var defaults = require('../utils/default-options')();

    if (typeof options === 'undefined') {
        options = {};
    }

    this.options = _.defaults(options, defaults);

    this.category_field = this.options.category;
    this.value_field = this.options.value;
    this.tooltipOptions = this.options.tooltip || {};

    this.tooltipOptions.d3ValueFormat = d3.format(this.tooltipOptions.valueFormat);

    this.el = el;

    this.selection = d3.select(el);

    this.tooltip = new Tooltip(el, options);

    this.series = this.selection.append('g')
        .attr('class', 'series');

    this.orientation = options.orientation || 'vertical';
};

Bars.prototype.setScales = function(category_scale, value_scale) {
    this.category_scale = category_scale;
    this.value_scale = value_scale;
};

Bars.prototype.set_category = function(cat) {
    this.category_field = cat;
    if (this.tooltipOptions.nameField === undefined) {
        this.tooltipOptions.nameField = cat;
    }
};

Bars.prototype.set_value = function(val) {
    this.value_field = val;
    this.tooltipOptions.valueField = this.tooltipOptions.valueField || val;
};

Bars.prototype.draw = function(data,options) {
    var self = this;

    return new Promise(function(resolve, reject) {
        var duration;

        self._data = data;

        if (options && options.duration) {
            duration = options.duration;
        }
        else {
            duration = self.options.duration;
        }

        var bars = self.series.selectAll('rect.bar')
            .data(data, function(d) { return d[self.category_field]; } );

        var barsenter = bars.enter()
          .append('rect')
            .attr('class', 'bar');

        var barsexit = bars.exit()
            .each(function(d) { self.removeTooltip(d); } )
            .transition().duration(duration);

        var update = bars
            .each(function(d) { self.updateTooltip(d); } )
            .style('fill', function(d) {
                if (d[self.value_field] === 0) {
                    // keep the current color if we are transitioning to 0
                    return d3.select(this).style('fill');
                }
                else if (d[self.value_field] > 0) {
                    return _.isFunction(self.options.color) ?
                    self.options.color(d[self.category_field]) :
                    self.options.color;
                }
                else {
                    return _.isFunction(self.options.negativeColor) ?
                        self.options.negativeColor(d[self.category_field]) :
                        self.options.negativeColor;
                }

            })
            .transition().duration(self.options.duration);

        var transitionCount = update.size() + barsexit.size();

        var transitionFinished = _.after(transitionCount, function () {
            resolve();
        });

        if (self.orientation === 'vertical') {
            barsenter
                .attr('width', self.category_scale.rangeBand())
                .attr('opacity',0)
                .attr('height', 0)
                .attr('y',self.value_scale(0))
                .attr('x', function(d) {
                    return self.category_scale(d[self.category_field]);
                });

            barsexit
                .attr('y', self.value_scale(0))
                .attr('height', 0)
                .attr('opacity', 0)
                .remove()
                .each( 'end', function(d) {
                    transitionFinished();
                });

            update
                .attr('x', function(d) {
                    return self.category_scale(d[self.category_field]);
                } )
                .attr('y', function(d) {
                    var value = d[self.value_field];
                    if (value > 0) {
                        return self.value_scale(value);
                    }
                    else {
                        return self.value_scale(0);
                    }
                } )
                .attr('width', self.category_scale.rangeBand())
                .attr('opacity',1)
                .attr('height', function(d) {
                    if (d[self.value_field] >= 0 ) {
                        return self.value_scale(0)
                            - self.value_scale(d[self.value_field]);
                    }
                    else {
                        return self.value_scale(d[self.value_field]) - self.value_scale(0);
                    }
                } )
                .each( 'end', function() {
                    transitionFinished();
                });
        }
        else {
            barsenter
                .attr('opacity',0)
                .attr('width', 0)
                .attr('height', self.category_scale.rangeBand())
                .attr('x', self.value_scale(0))
                .attr('y', function(d) {
                    return self.category_scale(d[self.category_field]);
                });

            barsexit
                .attr('x', self.value_scale(0))
                .attr('width', 0)
                .attr('opacity', 0)
                .remove()
                .each( 'end', function(d) {
                    transitionFinished();
                });

            update
                .attr('x', function(d) {
                    var value = d[self.value_field];
                    if (value > 0) {
                        return self.value_scale(0);
                    }
                    else {
                        return self.value_scale(value);
                    }
                })
                .attr('opacity',1)
                .attr('y', function(d) {
                    return self.category_scale(d[self.category_field]);
                } )
                .attr('width', function(d) {
                    var value = d[self.value_field];
                    if (value > 0) {
                        return self.value_scale(d[self.value_field]) - self.value_scale(0);
                    }
                    else {
                        return self.value_scale(0) - self.value_scale(d[self.value_field]);
                    }
                } )
                .attr('height', self.category_scale.rangeBand())
                .each( 'end', function() {
                    transitionFinished();
                });
        }

        if (transitionCount === 0) {
            transitionFinished();
        }
    });
};


Bars.prototype.hover_on = function(d) {
    if (!d[this.value_field]) {
        return;
    }

    this.currentDatapoint = d;

    this.tooltip.position(this.calculateTooltipPosition(d));

    this.tooltip.setHeader(d[this.tooltipOptions.nameField]);
    this.tooltip.setBody(this.tooltipOptions.valueField + ': ' + this.tooltipOptions.d3ValueFormat(d[this.tooltipOptions.valueField]));

    if (!this.tooltip.shown) {
        this.tooltip.show();
    }

    this.series.selectAll('rect.bar').classed('hover', _.bind(function(thisD) {
        return thisD[this.category_field] === d[this.category_field] && thisD[this.value_field] === d[this.value_field];
    }, this));
};

Bars.prototype.hover_off = function() {
    this.tooltip.stopTween();
    this.removeTooltip();

    this.series.selectAll('rect.bar').classed('hover', false);
};

Bars.prototype.removeTooltip = function() {
    if (!this.currentDatapoint) {
        return;
    }

    this.currentDatapoint = null;

    // hide the tooltip
    this.tooltip.hide();
};

Bars.prototype.updateTooltip = function(d) {
    // update the datapoint if it's there
    if (!this.currentDatapoint) {
        return;
    }

    if (d[this.category_field] === this.currentDatapoint[this.category_field]) {
        this.currentDatapoint = d;

        this.tooltip.setHeader(d[this.tooltipOptions.nameField]);
        this.tooltip.setBody(this.tooltipOptions.valueField + ': ' + this.tooltipOptions.d3ValueFormat(d[this.tooltipOptions.valueField]));

        if (this.tooltip.shown) {
            this.tweenTooltip();
        }
    }
};

Bars.prototype.calculateTooltipPosition = function(d) {
    var barValue = d[this.value_field],
        mousePosition,
        valueEdge = this.value_scale(d[this.value_field]),
        zeroEdge = this.value_scale(0);

    if (this.orientation === 'horizontal') {
        mousePosition = d3.mouse(this.el)[0];
        if (barValue >= 0) {
            if (mousePosition >= valueEdge) {
                mousePosition = valueEdge;
            }
            else if (mousePosition <= zeroEdge) {
                mousePosition = zeroEdge;
            }
        }
        else {
            if (mousePosition >= zeroEdge) {
                mousePosition = zeroEdge;
            }
            else if (mousePosition <= valueEdge) {
                mousePosition = valueEdge;
            }
        }
        return {
            left: mousePosition,
            top: this.category_scale(d[this.category_field]),
            pointWidth: this.value_scale(d[this.value_field])
        };
    } else {
        mousePosition = d3.mouse(this.el)[1];
        if (barValue >= 0) {
            if (mousePosition <= valueEdge) {
                mousePosition = valueEdge;
            }
            else if (mousePosition >= zeroEdge) {
                mousePosition = zeroEdge;
            }
        }
        else {
            if (mousePosition <= zeroEdge) {
                mousePosition = zeroEdge;
            }
            else if (mousePosition >= valueEdge) {
                mousePosition = valueEdge;
            }
        }
        return {
            left: this.category_scale(d[this.category_field]) + this.category_scale.rangeBand(),
            top: mousePosition,
            pointWidth: this.category_scale.rangeBand()
        };
    }
};

Bars.prototype.tweenTooltip = function() {
    // if we don't have a datapoint,
    // don't do anything
    if (!this.currentDatapoint) {
        return null;
    }

    var newPosition = this.calculateTooltipPosition(this.currentDatapoint);
    this.tooltip.tweenPosition(newPosition);
};

module.exports = Bars;
