var $ = require('jquery');

function LayoutManager(options) {
    options = options || {};
    this.el = document.createElement('div');
    this.$el = $(this.el);
    this.$el.addClass('facet-layout');
    this.resize(options.width, options.height);
}

LayoutManager.prototype.add = function(el) {
    this.$el.append(el);
};

LayoutManager.prototype.resize = function(width,height) {
    this.width = width;
    this.height = height;

    this.$el.css('width', this.width);
    this.$el.css('height', this.height);
};

module.exports = LayoutManager;