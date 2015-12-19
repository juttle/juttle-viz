var d3 = require('d3');
var _ = require('underscore');
var defaults = require('../utils/default-options')();

/**
 * Axis label component that can be used for x or y axis
 * @param {Object} el - the HTML element
 * @param {string} options.labelText - the label text
 * @param {string} options.orientation - supported values 'left', 'right', 'bottom'
 */
var AxisLabel = function(el, options) {

    if (typeof options === 'undefined') {
        options = {};
    }

    // apply defaults
    options = _.defaults(options, defaults, {
        orientation : 'left',
        labelText: '',
        // true to position the axis-label
        // when chart uses layout positioning of axis-labels is handled by layout
        position: true 
    });

    this._labelText = options.labelText;
    this._animDuration = options.duration;
    this._orientation = options.orientation;
    this._margin = options.margin;
    this._width = options.width;
    this._height = options.height;
    this._isPositioned = options.position;

    this._container = d3.select(el);
    this._g = null;
    this._text = null;

};

AxisLabel.prototype.draw = function() {
    var cls;

    if (this._g === null) {
        
        switch(this._orientation) {
            case 'left':
                cls = 'y left';
                break;
            case 'right':
                cls = 'y right';
                break;
            case 'bottom':
                cls = 'x';
                break;
        }

        this._g = this._container
            .append('g')
            .attr('class', 'axis-label ' + cls);

        this._text = this._g.append('text')
            .attr("text-anchor", "middle")
            .text(this._labelText);
    }

};

AxisLabel.prototype.setLabelText = function(labelText) {
    this._labelText = labelText;
    this._updateLabelText();
};

AxisLabel.prototype.setDuration = function(duration) {
    this._animDuration = duration;
};

AxisLabel.prototype.resize = function(boxmodel) {
    this._width = boxmodel.width;
    this._height = boxmodel.height;

    if (boxmodel.margin) {
        this._margin = boxmodel.margin;
    }

    if (this._g !== null && this._isPositioned) {
        this._position();
    }

};

AxisLabel.prototype._position = function() {
    var x, y, rotate;

    if (this._orientation === 'left') {
        x = -this._margin.left + 25; // 25 is the distance in px from the outer chart area border
        y = (this._height-this._margin.bottom-this._margin.top)/2;
        rotate = -90;
    }

    if (this._orientation === 'right') {
        x = this._width - this._margin.left - 25;
        y = (this._height-this._margin.top-this._margin.bottom)/2;
        rotate = 90;
    }

    if (this._orientation === 'bottom') {
        x = (this._width - this._margin.left - this._margin.right)/2;
        y = this._height - 30;
        rotate = 0;
    }

    this._g
        .attr('transform','translate(' + x + ',' + y + ')rotate(' + rotate + ')');

};

AxisLabel.prototype._updateLabelText = function() {

    if (this._text !== null) {
        this._text
            .text(this._labelText);
    }

};


module.exports = AxisLabel;
