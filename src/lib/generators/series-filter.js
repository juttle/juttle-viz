var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');

/**
 * A text input with a 'clear' feature
 */
var SeriesFilter = function(el) {

    this._input = $("<input type='text' placeholder='Series Filter'>")
        .addClass("form-control")
        .keyup(this._onKeyUp.bind(this))
        .keypress(this._onKeyPress.bind(this));

    this._clearBtn = $("<span class='clear-btn fa fa-remove form-control-feedback' ></span>")
        .hide(this._input.prev('input').val())
        .mouseenter(function() {
            $(this).addClass('hover');
        })
        .mouseleave(function() {
            $(this).removeClass('hover');
        })
        .click(this._onClearBtnClick.bind(this));

    this.el = $(el);

    this.el.append([this._input, this._clearBtn]);

};

_.extend(SeriesFilter.prototype, Backbone.Events);


SeriesFilter.prototype.setValue = function(value) {
    this._input.val(value);
    this._toggleClearBtn();
};

SeriesFilter.prototype.reset = function() {
    this._input.val('');
    this._toggleClearBtn();
};

SeriesFilter.prototype.getValue = function() {
    return this._input.val();
};

SeriesFilter.prototype._onKeyUp = function() {
    this._toggleClearBtn();
    if (this._input.val() === '') {
        this.trigger('clear');
    }
};

SeriesFilter.prototype._onClearBtnClick = function() {
      this._input.val('').focus();
      this._clearBtn.hide();
      this.trigger('clear');
};

SeriesFilter.prototype._onKeyPress = function(e) {
    // ENTER key
    if (e.which === 13) {
        this.trigger('filter', this._input.val());
    }
};

SeriesFilter.prototype._toggleClearBtn = function() {
    this._clearBtn.toggle(Boolean(this._input.val()));
};

module.exports = SeriesFilter;
