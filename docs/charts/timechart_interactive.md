---
title: Interacting with time charts | Juttle Language Reference
---

Interacting with time charts
============================

Time charts come with some interactive features that require no
configuration.

Here's a sample time chart that you can use to try the features
described below:

```
read stochastic
  -source 'cdn'
  -last :hour:
  -nhosts '12' -dos .1
  name='cpu'
| view timechart -keyField 'host' -title "CPU by host"
```

#### Filtering by series

Every multi-series time chart includes a series filter. Enter any
string or substring and press Enter to isolate one or more series;
non-matching series are hidden. Click the 'x'
![](../images/icons/timechart_filter_clear.png) or simply delete the
string to clear the filter. This is especially useful when your time
chart includes a number of series that all overlap, as in the
example above.

#### Collapsing the legend

If a time chart's legend is verbose, you may find it occupying too
much of the canvas. Just click the chevron
![](../images/icons/timechart_legend_collapse.png) next to the
legend to collapse it. Try it in the example above.

#### Zooming on historical data

When a time chart contains historical data only, it also displays a
context chart at the bottom that allows you to zoom in on a smaller
portion of the chart for closer inspection.

Click and drag across the context chart to select a segment of the
chart to zoom on. Once you've drawn a rectangle in the context
chart, you can drag the rectangle left or right. Click outside the
selected rectangle to reset the zoom.

#### Pinning and copying tooltips

You can click anywhere in a time chart to pin and copy values out of
the tooltip. Click somewhere else in the chart to unpin it.

#### Pausing a live streaming chart

You can pause a time chart by hovering over the chart. Move your
pointer outside the chart to resume the chart's animation. Here's a
live chart you can use to try it:

```
emit -limit 100 | put v = Math.random() | view timechart -duration :10s: -title "Live Random Numbers"
```
