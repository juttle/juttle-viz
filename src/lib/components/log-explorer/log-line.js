var React = require('react');
var classnames = require('classnames');

var LogLine = React.createClass({
    _findMatches: function(text, searchTerm) {
        if (!searchTerm) {
            return [];
        }

        var matches = [];
        var startIndex = 0;
        var lineTextLowerCase = text.toLowerCase();
        var searchTermLowerCase = searchTerm.toLowerCase();
        var searchTermLength = searchTerm.length;
        var match;
        do {
            match = lineTextLowerCase.indexOf(searchTermLowerCase);
            if (match !== -1) {
                matches.push(startIndex+match);
            }

            startIndex += match+searchTermLength;

            lineTextLowerCase = lineTextLowerCase.slice(match+searchTermLength);
        } while(match !== -1);

        return matches;
    },

    _buildLineSpans: function(matches, searchTermLength, cursorLine) {
        var startIndex = 0;

        var nonMatchedClass = classnames({
            'cursor-line': cursorLine
        });

        var spans = [];
        for(var i = 0; i < matches.length; i++) {
            var matchStart = matches[i];
            spans.push(<span className={nonMatchedClass}>{this.props.lineText.substr(startIndex,matchStart - startIndex)}</span>);
            spans.push(<span className="match">{this.props.lineText.substr(matchStart,searchTermLength)}</span>);
            startIndex = matchStart + searchTermLength;
        }

        spans.push(<span className={nonMatchedClass}>{this.props.lineText.substr(startIndex)}</span>);

        return spans;
    },

    render : function() {
        var searchTermLength = this.props.searchTerm ? this.props.searchTerm.length : 0;

        var matches = this._findMatches(this.props.lineText, this.props.searchTerm);
        var spans = this._buildLineSpans(matches,searchTermLength, this.props.cursorLine);

        return (
            <div className="log-line">{spans}</div>
        );
    }
});

module.exports = LogLine;
