var _done = false;

module.exports = {
    init: function() {
        if (_done) {
            return;
        }
        _done = true;

        var jsdom = require('jsdom');

        global.document = jsdom.jsdom();
        global.window = global.document.defaultView;

        // This silences a bunch of unhandled rejections for the missing
        // getComputedTextLength method
        global.document._createElementNS = global.document.createElementNS;
        global.document.createElementNS = function(namespace, name) {
            var element = this._createElementNS(namespace, name);

            element.getComputedTextLength = function() {
                return this.offsetWidth;
            };

            // XXX temporary fix due to:
            //     https://github.com/tmpvar/jsdom/issues/717
            element._ownerDocument = global.document;
            element.document = global.document;
            element._hacked = true;
            return element;
        };

        global.document._createElement = global.document.createElement;
        global.document.createElement = function(name) {
            var element = this._createElement(name);

            // XXX temporary fix due to:
            //     https://github.com/tmpvar/jsdom/issues/717
            element._ownerDocument = global.document;
            element.document = global.document;
            element._hacked = true;
            return element;
        };

        global.document._createTextNode = global.document.createTextNode;
        global.document.createTextNode = function(data) {
            var element = this._createTextNode(data);

            // XXX temporary fix due to:
            //     https://github.com/tmpvar/jsdom/issues/717
            element._ownerDocument = global.document;
            element.document = global.document;
            element._hacked = true;
            return element;
        };

        // exposed globally for tests under lib/generators
        global.HTMLElement = window.HTMLElement;

        var d3 = require('d3');
        // d3 transformations will simply be mocked out this way
        d3.transform = function() {
            return {
                translate: function() {},
                rotate: function() {},
                scale: function() {},
                skew: function() {}
            };
        };
    }
};
