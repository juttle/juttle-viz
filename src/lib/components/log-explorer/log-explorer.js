var React = require('react');
var _ = require('underscore');

var LogLine = require('./log-line');

var WINDOW_SIZE = 20;

var LogExplorer = React.createClass({
    getInitialState : function() {
        return {
            allLines : [],
            searchTerm : null,
            cursorPosition : 0,
            windowStart : 0
        };
    },
    pushLines : function(newLines) {
        var curNumLines = this.state.allLines.length;

        var newLinesWithIndex = newLines.map(function(newLine, i) {
            return {
                text : newLine,
                index : i + curNumLines
            };
        });
        this.setState({
            allLines : this.state.allLines.concat(newLinesWithIndex)
        });
    },
    _onKeyUpSearchBox: function(e) {
        if (e.keyCode !== 13) { // return if not enter key
            return;
        }

        e.preventDefault();

        var searchTerm = this.refs.searchTermBox.getDOMNode().value;

        var matches = [];

        for(var i = 0; i < this.state.allLines.length; i++) {
            var lineLowerCase = this.state.allLines[i].text.toLowerCase();

            if (lineLowerCase.indexOf(searchTerm.toLowerCase()) !== -1) {
                matches.push(i);
            }
        }

        this.setState({
            matches : matches,
            searchTerm : searchTerm
        });

        this.refs.currentLogOutput.getDOMNode().focus();

        if (this._searchRoleReversal) {
            this._moveToPrevMatch(matches);
        }
        else {
            this._moveToNextMatch(matches);
        }
    },
    _onKeyDownLogWindow: function(e) {
        var keyCode = e.keyCode;
        var pos = this.state.cursorPosition;
        var newWindowStart;
        var handled = false;
        switch(keyCode) {
            case 78: // n
                handled = true;
                if (this._searchRoleReversal) {
                    this._moveToPrevMatch(this.state.matches);
                }
                else {
                    this._moveToNextMatch(this.state.matches);
                }
                break;
            case 80: // p
                handled = true;
                if (this._searchRoleReversal) {
                    this._moveToNextMatch(this.state.matches);
                }
                else {
                    this._moveToPrevMatch(this.state.matches);
                }
                break;
            case 191: // /
                handled = true;
                this._searchRoleReversal = !!e.shiftKey;
                this.refs.searchTermBox.getDOMNode().focus();
                this.refs.searchTermBox.getDOMNode().select();
                break;
            case 71: // g
                handled = true;
                if (e.shiftKey) {
                    this._goToEnd();
                }
                else {
                    this._goToStart();
                }
                break;
            case 32: // space
                handled = true;
                this._pageDown();
                break;
            case 66: // b
                handled = true;
                this._pageUp();
                break;
            case 75: // k
            case 38: // up arrow
                handled = true;
                if (pos !== 0) {
                    if (this.state.cursorPosition === this.state.windowStart) {
                        newWindowStart = this.state.windowStart - 1;
                        this.setState({
                            windowStart : newWindowStart
                        });
                    }

                    this.setState({
                        cursorPosition : pos-1
                    });
                }
                break;
            case 74: // j
            case 40: // down arrow
                handled = true;
                if (this.state.cursorPosition !== this.state.allLines.length-1) {
                    if (this.state.cursorPosition === this.state.windowStart + WINDOW_SIZE) {
                        newWindowStart = this.state.windowStart + 1;
                        this.setState({
                            windowStart : newWindowStart
                        });
                    }

                    this.setState({
                        cursorPosition : pos+1
                    });
                }
                break;
        }

        if (handled) {
            e.preventDefault();
        }
    },
    _moveToNextMatch : function(matches) {
        var pos = this.state.cursorPosition;
        var match = _.find(matches, function(match) {
            return match > pos;
        });

        if (match !== undefined) {
            this.setState({
                cursorPosition : match
            });

            if (match >= this.state.windowStart + WINDOW_SIZE) {
                this.setState({
                    windowStart : match - WINDOW_SIZE + 1
                });
            }
        }
    },
    _moveToPrevMatch : function(matches) {
        var pos = this.state.cursorPosition;
        var match = _.find(matches.slice().reverse(), function(match) {
            return match < pos;
        });

        if (match !== undefined) {
            this.setState({
                cursorPosition : match
            });

            if (match < this.state.windowStart) {
                this.setState({
                    windowStart : match
                });
            }
        }
    },
    _goToStart : function() {
        this.setState({
            cursorPosition : 0,
            windowStart: 0
        });
    },
    _goToEnd : function() {
        this.setState({
            cursorPosition : this.state.allLines.length-1,
            windowStart : this.state.allLines.length - WINDOW_SIZE
        });
    },
    _pageUp : function() {
        if(this.state.windowStart - WINDOW_SIZE < 0) {
            this._goToStart();
        }
        else {
            this.setState({
                cursorPosition : this.state.cursorPosition - WINDOW_SIZE,
                windowStart : this.state.windowStart - WINDOW_SIZE
            });
        }
    },
    _pageDown : function() {
        if(this.state.windowStart + 2*WINDOW_SIZE > this.state.allLines.length-1) {
            this._goToEnd();
        }
        else {
            this.setState({
                cursorPosition : this.state.cursorPosition + WINDOW_SIZE,
                windowStart : this.state.windowStart + WINDOW_SIZE
            });
        }
    },
    _onCursorPositionUpdate : function(lineNumber, charIndex) {
        this.setState({
            cursorPosition : [lineNumber, charIndex]
        });
    },
    render: function() {
        var self = this;

        var linesToShow = self.state.allLines.slice(self.state.windowStart, self.state.windowStart + WINDOW_SIZE)
            .map(function(line) {
                return <LogLine cursorLine={line.index === self.state.cursorPosition} searchTerm={self.state.searchTerm} lineText={line.text}/>;
            });

        return (
            <div className="log-explorer">
                <div tabIndex={1} ref="currentLogOutput" onKeyDown={this._onKeyDownLogWindow}>
                    {linesToShow}
                </div>
                <input className="search-box" ref="searchTermBox" onKeyUp={this._onKeyUpSearchBox} type="text" onChange={this._onQueryChange}/>
                <div className="line-counts">{this.state.cursorPosition} / {this.state.allLines.length - 1}</div>
            </div>
        );
    }
});

module.exports = LogExplorer;
