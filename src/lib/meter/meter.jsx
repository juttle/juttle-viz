var React = require('react');

var Meter = React.createClass({
    render: function() {
        var spanStyle = {
            width: this.props.percentage +'%'
        };

        return (
            <div className="meter">
                <span style={spanStyle}></span>
            </div>
        );
    }
});

module.exports = Meter;
