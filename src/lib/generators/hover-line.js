

function HoverLine(el, xScale, height) {
    this._isHovering = false;
    this._userHasHovered = false;

    this.xScale = xScale;

    this.hover_line = el.append('line')
        .attr('class', 'vertical-line')
        .style('display', 'none')
        // XXX
        .attr('stroke-width', 1)
        .attr('stroke', 'yellow')
        .attr('y1', 0)
        .attr('y2', height);

    this.hover_line;
}

HoverLine.prototype.show = function() {
    this.hover_line.style('display', null);
};

HoverLine.prototype.hide = function() {
    this.hover_line.style('display', 'none');
};


HoverLine.prototype.update = function(mouse) {
    var x = mouse[0];
    if (!this._isHovering && this._userHasHovered) {
        return;
    }
    // user has not hovered yet so put the line on the far right
    else if (!this._isHovering && !this._userHasHovered) {
        this._showHoverLine();
        x = this.xScale.range()[1];
    }
    else {
        // remember the last mouse position and use that
        // (used when chart updates and the mouse is not touched)
        this._lastHoverPosition = mouse ? mouse[0] : this._lastHoverPosition;
        x = mouse ? mouse[0] : this._lastHoverPosition;  
    }

    this.hover_line
        .attr('x1', x)
        .attr('x2', x);
};

HoverLine.prototype.hide = function() {
    this.hover_line.style('display', 'none');
};