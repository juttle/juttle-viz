/**
 * Displays a list of runtime messages.
 *
 * Messages can be added with runtimeMessages.add and removed with runtimeMessages.remove.
 *
 * Messages are backbone models with the following attributes:
 *     code: the code to be used to look up the string for the message
 *     info: an object with any contextual params that the message needs
 *
 * Updating a message's attributes, runtimeMessages.add, and runtimeMessages.remove
 * will automatically trigger the UI to update with the latest state.
 */

var $ = require('jquery');
var _ = require('underscore');
var Backbone = require('backbone');
var messageStrings = require('../strings/runtime-message-strings');
var StringBundle  = require('../strings/string-bundle');
var escapeHtml = require('escape-html');

var stringBundle = new StringBundle(messageStrings);

function htmlEscapeObjectFields(obj) {
    return _.mapObject(obj, function(val) {
        return escapeHtml(val);
    });
}

var RuntimeMessages = function() {
    var el = this.el = document.createElement('div');
    var messageContentsEl = document.createElement('span');
    messageContentsEl.classList.add('message-contents');

    el.classList.add('juttle-view-runtime-messages');
    el.setAttribute('style', 'display: none');
    el.appendChild(messageContentsEl);

    this._messages = new Backbone.Collection();

    this._messages.on('add', this._render, this);
    this._messages.on('remove', this._render, this);
    this._messages.on('change', this._render, this);
};

RuntimeMessages.prototype.add = function(message) {
    this._messages.add(message);
};

RuntimeMessages.prototype.remove = function(message) {
    this._messages.remove(message);
};

RuntimeMessages.prototype.getMessages = function() {
    return this._messages;
};

RuntimeMessages.prototype._render = function() {
    var $el = $(this.el);

    if (this._messages.length === 0) {
        $el.stop(true).slideUp(function() {
            // a bit hacky but basically we need to clear any
            // other attributes jquery might have added.
            var $thisEl = $(this);
            $thisEl.attr('style', 'display: none;');
            $thisEl.find('.message-contents').html('');
            $el.find('.loader').remove();
        });
    }
    else {
        //loop over messages, if any are the waiting for data, then show it's special display
        var messages = [];

        $el.find('.loader').remove();
        $el.find('.message-icon').remove();

        _.each(this._messages.models, function(msg) {
            if (msg.get('code') === 'WAITING_FOR_DATA') {
                $el.append('<div class="loader die"><svg class="circular"><circle class="path" cx="50" cy="50" r="20" fill="none" stroke-width="4" stroke-miterlimit="10"/></svg></div>');
                setTimeout(function() {
                    var loader = $el.find('.loader');

                    if (loader.length > 0) {
                        loader.html('<div class="message still-waiting">' + stringBundle.getStringForCode('WAITING_FOR_DATA') + '</div>');
                    }
                }, 5000);
            } else {
                var escapedMsgInfo = htmlEscapeObjectFields(msg.get('info'));
                messages.push(stringBundle.getStringForCode(msg.get('code'),escapedMsgInfo));
            }
        });

        if (messages.length > 0) {
            // show the other messages as usual
            var messageIcon = $('<span class="fa fa-exclamation-triangle message-icon"></span>&nbsp;')[0];
            $el[0].insertBefore(messageIcon, $el[0].firstChild);
            $el.find('.message-contents').html(messages.join(' '));
        }

        $el.stop(true).slideDown(function() {
            // a bit hacky but basically we need to clear any
            // other attributes jquery might have added.
            $(this).removeAttr('style');
        });
    }
};

RuntimeMessages.prototype.destroy = function() {
    this.el = null;
    this._messages.off();
    this._messages = null;
};

module.exports = RuntimeMessages;
