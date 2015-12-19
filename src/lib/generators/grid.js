var d3 = require('d3');
var _ = require('underscore');

var Grid = function(el, options) {
    this.options = _.defaults(options, {
        orientation : 'horizontal'
    });

    this.el = el;
    this.g = null;

    this.duration = 250;

    this._axis = d3.svg.axis()
        .orient( this.options.orientation === 'horizontal' ? 'left' : 'top')
        .outerTickSize(0);
};

Grid.prototype.setScale = function(scale) {
    this._axis.scale(scale);
};

Grid.prototype.setLines = function(lines) {
    this._axis.tickValues(lines);
};

Grid.prototype.setDuration = function(duration) {
    this.duration = duration;
};

Grid.prototype.resize = function(boxModel) {
    if (this.options.orientation === 'horizontal') {
        this._axis.tickSize(-1 * ( boxModel.width - (boxModel.margin.left + boxModel.margin.right)));    
    }
    else {
        this._axis.tickSize(-1 * ( boxModel.height - (boxModel.margin.bottom + boxModel.margin.top)));
    }
    if (this.g !== null) {
        this.draw();
    }
};

Grid.prototype.draw = function() {

    if (this.g === null) {
        this.g = this.el
            .insert('g', ':first-child')
            .attr('class', 'grid');
    }
    this.g.transition().ease('linear').duration(this.duration).call(this._axis);
};

module.exports = Grid;