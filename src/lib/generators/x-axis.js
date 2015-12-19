var d3 = require('d3');
var _ = require('underscore');
var Promise = require('bluebird');
var axisUtils = require('../utils/axis-utils');

var LABEL_TRUNCATE_LENGTH = 10;
var LABEL_TRUNCATE_LENGTH_SHORTER = 5;
var COLLISION_PADDING = 4;
var LABEL_ROW_HEIGHT = 20;
var TICK_TO_LABEL_SPACE = 3;

// constructor
var xAxis = function(el, options) {

    var defaults = require('../utils/default-options')();

    if (typeof options === 'undefined') {
        options = {};
    }

    this.options = _.defaults(options, defaults, {
        avoidLabelCollisions : false,
        tickSize : 6,
        tickLabelsVisible : true
    });

    this.el = el;

    this.selection = d3.select(el);
    this.g = null;

    this.axis = d3.svg.axis()
        .orient('bottom')
        .tickSize(0,0)
        .outerTickSize(0);

    this.axis.orient('bottom');

};

// orient the axis top or bottom. We set this as public
// method so that time chart can choose to orient the axes
// at a latter date.
xAxis.prototype.orient = function(direction) {
    if (direction) {
        this.axis.orient(direction);
    }
};

xAxis.prototype.setFormat = function(format) {
    if (_.isString(format) && format !== '') {
        this.axis.tickFormat(d3.format(format));
    } else if (_.isFunction(format)) {
        this.axis.tickFormat(format);
    } else {
        this.axis.tickFormat(axisUtils.getDefaultTickFormat());
    }
};


xAxis.prototype.resize = function(width, height) {
    this.options.width = width;
    this.options.height = height;
    if (this.options.drawGrid || this.options.drawXGrid) {
        this.axis
            .tickSize(-(this.options.height - (this.options.margin.top + this.options.margin.bottom)));
    }

    if (this.g !== null) {
        this.draw();
    }
};

xAxis.prototype.setMargin = function(margin) {
    this.options.margin = margin;
};

xAxis.prototype.setScale = function(xScale) {
    this.xScale = xScale;
    this.axis.scale(xScale);
};

xAxis.prototype.setDuration = function(duration) {
    this.options.duration = duration;
};

/**
 * Set visiblity of tick labels
 * @param {Boolean} isVisible - true to show tick labels
 */
xAxis.prototype.setTickLabelVisibility = function(isVisible) {
    this.options.tickLabelsVisible = isVisible;
};

/**
 * Applies the appropriate label transformation to avoid label collisions.
 * @return {[type]} [description]
 */
xAxis.prototype._avoidLabelCollision = function(gTransition) {
    var self = this;
    var haveCollision = false;
    var g = this.g;

    var labels = g.selectAll('g.tick').select('text');
    var tickLines = g.selectAll('g.tick').select('line');

    // for tick transformations, hook into the ongoing transition
    // so that our transformations (making the second row ticks longer)
    // don't get overridden by the d3's transition into the default tickSize.
    var tickLinesTransition = gTransition.selectAll('g.tick').select('line');

    haveCollision = self._doLabelsHaveCollision(labels);

    if (!haveCollision) {
        self._showLabelsStandard(labels, tickLinesTransition);
        return;
    }

    // test to see if labels would have a collision if they were split up into two rows
    haveCollision = self._doLabelsHaveCollision(labels.filter(function(d,i) { return i%2 === 0;})) ||
        self._doLabelsHaveCollision(labels.filter(function(d,i) { return i%2 === 1;}));

    if (!haveCollision) {
        self._showLabelsInTwoRows(labels,tickLinesTransition);
        return;
    }

    // test to see if labels would have a collision if they were split up into two rows and truncated
    haveCollision = self._doLabelsHaveCollision(labels.filter(function(d,i) { return i%2 === 0;})) ||
        self._doLabelsHaveCollision(labels.filter(function(d,i) { return i%2 === 1;}));

    if (!haveCollision) {
        labels.text(function(label) {
            return self._truncateLabel(label, LABEL_TRUNCATE_LENGTH);
        }).append('title').text(function(d) {return d;});

        self._showLabelsInTwoRows(labels,tickLinesTransition);
        return;
    }

    labels.text(function(label) {
        return self._truncateLabel(label, LABEL_TRUNCATE_LENGTH_SHORTER);
    }).append('title').text(function(d) {return d;});

    self._showLabelsRotated(labels,tickLines);
};

xAxis.prototype._showLabelsInTwoRows = function(labels, tickLines) {
    var self = this;

    // make the ticks for second row labels longer
    tickLines.attr('y2', function(d,i) {
        var tickSize = self.options.tickSize;
        return i % 2 === 1 ? tickSize + LABEL_ROW_HEIGHT : tickSize;
    });

    labels
        .style('text-anchor','middle')
        .attr('transform', function(d, i) {
            return 'translate(0,' + ( i % 2 === 1 ? LABEL_ROW_HEIGHT + self.options.tickSize : self.options.tickSize ) + ')' ;
        });

    this._labelStyle = 'TWO_ROWS';
};

xAxis.prototype._showLabelsRotated = function(labels, tickLines) {
    var self = this;

    // make all the ticks their standard height
    tickLines.attr('y2', function() {
        return self.options.tickSize;
    });

    // last resort: rotate them
    labels
        .style('text-anchor','end')
        .attr('transform', function(d) {
            var thisLabel = self._truncateLabel(d, LABEL_TRUNCATE_LENGTH_SHORTER);
            var transformStr = 'rotate(-45)';
            // tweak the alignment for non-truncated labels
            if (thisLabel.charAt(thisLabel.length-1) !== '\u2026') {
                transformStr += 'translate(-10)';
            }
            return transformStr;
        });

    this._labelStyle = 'ROTATED';
};

xAxis.prototype._showLabelsStandard = function(labels, tickLines) {
    var self = this;

    labels
        .attr('transform', 'translate(0,' + self.options.tickSize + ')')
        .style('text-anchor','middle');

    // make all the ticks their standard height
    tickLines.attr('y2', function() {
        return self.options.tickSize;
    });

    this._labelStyle = 'STANDARD';
};

/**
 * Checks if a d3 text selection (list of text elements) has any collisions horizontally.
 * @param  {[type]} labels [description]
 * @return {[type]}        [description]
 */
xAxis.prototype._doLabelsHaveCollision = function(labels) {
    var self = this;

    var haveCollision = false;
    var previousRight = null;

    labels.each(function(d) {
        var tickPosition = self.xScale(d);

        // compute half of the label length which we'll use to compute the left and right boundaries
        // of the label by adding/subtracting from the tick position which is located at the center of the label
        var halfLabelLength = this.getComputedTextLength()/2;

        if (previousRight !== null && (tickPosition - halfLabelLength - previousRight < COLLISION_PADDING)) {
            haveCollision = true;
        }

        previousRight = tickPosition + halfLabelLength;
    });

    return haveCollision;
};

xAxis.prototype._truncateLabel = function(label, length) {
    if (!length) { length = LABEL_TRUNCATE_LENGTH; }

    if (!_.isString(label)) {
        label = label + '';
    }

    if (label.length > length) {
        label = label.substr(0,length - 1) + '\u2026';
    }

    return label;
};

/**
 * Set the function that will be called for each category
 * to determine the font-style for its tick label.
 * The function will receive the category value as its first argument.
 * @param {[type]} func [description]
 */
xAxis.prototype.setTickLabelFontStyle = function(func) {
    this.tickLabelFontStyle = func;
};

xAxis.prototype.draw = function(animate, options) {
    var self = this;

    return new Promise(function(resolve, reject) {
        if (animate === undefined) { animate = true; }

        var duration;

        if (options && options.duration) {
            duration = options.duration;
        }
        else {
            duration = self.options.duration;
        }

        var ty = (self.axis.orient() === 'bottom') ?
                self.options.height - (self.options.margin.top + self.options.margin.bottom) : 0;

        if (self.g === null) {
            self.g = self.selection
                .append('g')
                .attr("class", 'x axis');
        }

        self.g.attr('transform', 'translate(0,' + ty + ')');

        var g = self.g;
        if (animate) {
            g = g
              .transition()
                .duration(duration)
                .ease('linear').each('end',function() {
                    resolve();
                });
        }

        g.call(self.axis);

        if (self.tickLabelFontStyle) {
            g.selectAll('.tick')
                .style('font-style',self.tickLabelFontStyle);
        }

        if (self.options.avoidLabelCollisions && self.options.tickLabelsVisible) {
            self._avoidLabelCollision(g);
        }
        else {
            // show the tick marks everywhere except at the ends and at 0
            // we are manually setting the tick size instead of relying on d3's
            // tickSize because we need greater and don't want the tick-ish looking
            // things that d3 puts at the ends but are part of the axis path
            g.selectAll('.tick').select('line')
                .attr('y2',function(d) {
                    if (!self.options.isCategorical && (d === self.xScale.domain()[0] || d === self.xScale.domain()[1] || d === 0)) {
                        return 0;
                    }
                    else {
                        return (self.axis.orient() === 'bottom' ? 1 : -1) * self.options.tickSize;
                    }
                });

            g.selectAll('g.tick').select('text')
                .attr('class', self.options.tickLabelsVisible ? '' : 'hidden')
                .attr('y',(self.axis.orient() === 'bottom' ? 1 : -1 ) * (self.options.tickSize + TICK_TO_LABEL_SPACE));
        }

        // if we aren't transitioning, the changes are done immediately so resolve the promise
        if (!animate) {
            resolve();
        }

    });
};

module.exports = xAxis;
