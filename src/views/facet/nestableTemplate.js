var $ = require('jquery');

function NestableTemplate() {
    this.el = document.createElement('div');

    this.$header = $('<div/>').addClass('header');
    this.$body =  $('<div/>').addClass('body');
    this.$footer =  $('<div/>').addClass('footer');

    $(this.el).append(this.$header);
    $(this.el).append(this.$body);
    $(this.el).append(this.$footer);
}

NestableTemplate.prototype.setHeader = function(el) {
    this.$header.empty().append(el);
};

NestableTemplate.prototype.setBody = function(el) {
    this.$body.empty().append(el);
};

NestableTemplate.prototype.setFooter = function(el) {
    this.$footer.empty().append(el);
};

module.exports = NestableTemplate;