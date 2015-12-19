var d3 = require('d3');
var _ = require('underscore');
var axisUtils = require('../utils/axis-utils');

var LABEL_TRUNCATE_LENGTH = 8;
var NUM_TICKS = 8;

var TICK_TO_LABEL_SPACE = 3;
// constructor
var yAxis = function(el, options) {
    var defaults = require('../utils/default-options')();

    if (typeof options === 'undefined') {
        options = {};
    }

    this.options = _.defaults(options, defaults, {
        avoidLabelCollisions : false,
        tickSize : 6,
        tickLabelsVisible : true
    });

    if (!this.options.hasOwnProperty('yAxisOrientation')) {
        this.options.yAxisOrientation = 'left';
    }

    this.el = el;

    this.selection = d3.select(el);
    this.g = null;

    this.axis = d3.svg.axis()
        .tickSize(0,0)
        .ticks(NUM_TICKS);

    this.orient(this.options.yAxisOrientation);

    this.margin = this.options.margin;

};

yAxis.prototype.setDuration = function(duration) {
    this.options.duration = duration;
};

/**
 * Set visiblity of tick labels
 * @param {Boolean} isVisible - true to show tick labels
 */
yAxis.prototype.setTickLabelVisibility = function(isVisible) {
    this.options.tickLabelsVisible = isVisible;
};

// orient the axis left or right. We set this as public
// method so that time chart can choose to orient the axes
// at a latter date.
yAxis.prototype.orient = function(direction) {
    if (!direction) {
        direction = this.options.yAxisOrientation;
    }

    this.axis.orient(direction);
};

yAxis.prototype.setFormat = function(format) {
    var self = this;

    if (_.isString(format) && format !== '') {
        this.axis.tickFormat(d3.format(format));
    } else if (_.isFunction(format)) {
        this.axis.tickFormat(format);
    } else if (this.options.isCategorical) {
        if (this.options.avoidLabelCollisions) {
            this.axis.tickFormat(function(label) {
                return self._truncateLabel(label, LABEL_TRUNCATE_LENGTH);
            });
        }
    } else {
        this.axis.tickFormat(axisUtils.getDefaultTickFormat());
    }
};

yAxis.prototype.set_margin = function(margin) {
    this.margin = margin;
};

yAxis.prototype.resize = function(width, height) {
    this.options.width = width;
    this.options.height = height;

    if (this.g !== null) {
        this.draw();
    }
};

yAxis.prototype.setScale = function(yScale) {
    this.yScale = yScale;
    this.axis.scale(this.yScale);
};

/**
 * Set the function that will be called for each category
 * to determine the font-style for its tick label.
 * The function will receive the category value as its first argument.
 * @param {[type]} func [description]
 */
yAxis.prototype.setTickLabelFontStyle = function(func) {
    this.tickLabelFontStyle = func;
};

yAxis.prototype.draw = function(animate) {
    var self = this;
    if (animate === undefined) { animate = true; }

    if (this.g === null) {
        this.g = this.selection
            .append('g')
            .attr('class', 'y axis ' + this.axis.orient());
    }
    

    var g = this.g;
    // XXX revisit this
    // ticks should animate if animate = true
    // axis positioning should not
    if (animate) {
        g = g
          .transition()
            .duration(this.options.duration)
            .ease('linear');
    }

    var tx = (this.axis.orient() === 'right')
        ? this.options.width - (this.margin.left + this.margin.right) : 0;

    g.attr('transform', 'translate(' + tx + ')')
        .call(this.axis);

    // show the tick marks everywhere except at the ends and at 0
    // we are manually setting the tick size instead of relying on d3's
    // tickSize because we need greater and don't want the tick-ish looking
    // things that d3 puts at the ends but are part of the axis path 
    g.selectAll('g.tick').select('line')
        .attr('x2',function(d) {
            if (!self.options.isCategorical && (d === self.yScale.domain()[0] || d === self.yScale.domain()[1] || d === 0)) {
                return 0;
            }
            else {
                return (self.axis.orient() === 'left' ? -1 : 1) * self.options.tickSize;
            }
        });


    g.selectAll('g.tick').select('text')
        .attr('class', this.options.tickLabelsVisible ? '' : 'hidden')
        .attr('x',(this.axis.orient() === 'left' ? -1 : 1) * (self.options.tickSize + TICK_TO_LABEL_SPACE));

    if (this.tickLabelFontStyle) {
        g.selectAll('.tick')
            .style('font-style',this.tickLabelFontStyle);
    }

    var labels = this.g.selectAll('g.tick').select('text');
    labels.append('title').text(function(d) {return d;});


};

yAxis.prototype._truncateLabel = function(label, length) {
    if (!length) { length = LABEL_TRUNCATE_LENGTH; }

    if (!_.isString(label)) {
        label = label + '';
    }

    if (label.length > length) {
        label = label.substr(0,length - 1) + '\u2026';
    }

    return label;
};

module.exports = yAxis;
