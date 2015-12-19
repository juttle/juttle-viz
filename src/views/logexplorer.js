var JuttleView = require('./juttle-view');
var LogExplorerComponent = require('../lib/components/log-explorer/log-explorer');
var React = require('react');
var ReactDOM = require('react-dom');

var LogExplorer = JuttleView.extend({
    initialize: function(options) {
        var elToRenderInto = this.sinkBodyEl;

        if (options.params.title) {
            this.title.text(options.params.title);
        }

        this._logExplorerComponent = ReactDOM.render(React.createElement(LogExplorerComponent), elToRenderInto);

        this.on('destroy', function() {
            React.unmountComponentAtNode(elToRenderInto);
        });
    },

    _consume : function(batch) {
        this._logExplorerComponent.pushLines(batch.map(function(point) {
            return point.time.toISOString() + ': ' + point.message;
        }));
    }
});

module.exports = LogExplorer;
