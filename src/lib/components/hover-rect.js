var d3 = require('d3');
var Backbone = require('backbone');
var _ = require('underscore');


/**
 * Creates a hoverable area which will trigger mouseover, mouseout, mousemove, and click events.
 * The area has a base width and height and can be extended using padding (via the extendPadding() method).
 * @param {[type]} el      [description]
 * @param {[type]} options [description]
 */
function HoverRect(container, options) {
    this.width = options.width;
    this.height = options.height;
    this.padding = options.padding || {
        top : 0,
        bottom : 0,
        left : 0,
        right : 0
    };
    
    // Create an invisible rectangle to grab mouse events
    this.hover_rect = d3.select(container).append('rect', ':first-child')
        .style('fill', 'none')
        .style('pointer-events', 'all');

    this.resize();

    this._setupEvents();
}

_.extend(HoverRect.prototype, Backbone.Events);

HoverRect.prototype._setupEvents = function() {
    var self = this;
    this.hover_rect
        .on('mouseover', function() {
            self.trigger('mouseover', d3.event);
        })
        .on('mouseout', function() {
            self.trigger('mouseout', d3.event);
        })
        .on('mousemove', function() {
            var mouse = d3.mouse(this);
            self.trigger('mousemove', mouse);
        })
        .on('click', function(e) {
            var mouse = d3.mouse(this);
            self.trigger('click', mouse);
        });
};

HoverRect.prototype.destroy = function() {
    this.hover_rect.on('mouseover', null);
    this.hover_rect.on('mouseout', null);
    this.hover_rect.on('mousemove', null);
    this.hover_rect.on('click', null);
};

HoverRect.prototype.resize = function(width, height, padding) {
    this.width = width || this.width;
    this.height = height || this.height;

    this.padding = _.extend(this.padding,padding);

    this.hover_rect
        .attr('x', -1 * this.padding.left)
        .attr('y', -1 * this.padding.top)
        .attr('width', this.width + this.padding.left + this.padding.right)
        .attr('height', this.height + this.padding.top + this.padding.bottom);
};

/**
 * Extends (increases if its not already that big) the padding.
 * @param  {[type]} padding [description]
 * @return {[type]}         [description]
 */
HoverRect.prototype.extendPadding = function(padding) {
    this.padding.top = d3.max([padding.top, this.padding.top]);
    this.padding.right = d3.max([padding.right, this.padding.right]);
    this.padding.bottom = d3.max([padding.bottom, this.padding.bottom]);
    this.padding.left = d3.max([padding.left, this.padding.left]);

    this.resize(this.width, this.height, this.padding);
};

module.exports = HoverRect;
