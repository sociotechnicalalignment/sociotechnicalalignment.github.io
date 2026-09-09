/* Shared visual theme for the interactive Plotly maps.
   Runs inside each figure page after the plot has been drawn and restyles it
   to match the project site (navy text, terracotta accent, Inter font). */
(function () {
  'use strict';

  var NAVY = '#17233f';
  var INK = '#1b2030';
  var MUTED = '#5d6475';
  var LINE = '#e3dfd6';
  var ACCENT = '#c26d4e';
  var SKY = '#e8f0fb';
  var FONT = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  function darken(color, factor) {
    var m = /rgba?\((\d+),\s*(\d+),\s*(\d+)/.exec(color || '');
    if (!m) return color;
    return 'rgb(' + [m[1], m[2], m[3]].map(function (c) {
      return Math.round(parseInt(c, 10) * factor);
    }).join(', ') + ')';
  }

  function applyTheme() {
    var gd = document.querySelector('.plotly-graph-div');
    if (!gd || !gd.data || !gd._fullLayout) {
      setTimeout(applyTheme, 100);
      return;
    }

    // Traces: keep each category's fill, but outline it in a darker tone of the
    // same hue instead of black, and give hover boxes the site's navy.
    var indices = [];
    var lineColors = [];
    gd.data.forEach(function (trace, i) {
      if (trace.type !== 'scatter') return;
      var fill = trace.marker && trace.marker.color;
      indices.push(i);
      lineColors.push(typeof fill === 'string' ? darken(fill, 0.62) : NAVY);
    });
    if (indices.length) {
      Plotly.restyle(gd, {
        'marker.line.color': lineColors,
        'marker.line.width': 1,
        'marker.opacity': 0.92,
        'hoverlabel.bgcolor': NAVY,
        'hoverlabel.bordercolor': NAVY,
        'hoverlabel.font.color': '#ffffff',
        'hoverlabel.font.family': FONT,
        'hoverlabel.font.size': 12,
        'hoverlabel.align': 'left'
      }, indices);
    }

    // Layout: typography, quiet axes (UMAP coordinates carry no meaning),
    // legend and slider in the site's palette.
    var update = {
      'font.family': FONT,
      'font.color': INK,
      'font.size': 13,
      'paper_bgcolor': '#ffffff',
      'plot_bgcolor': '#faf9f6',
      'xaxis.showticklabels': false,
      'yaxis.showticklabels': false,
      'xaxis.gridcolor': '#ebe8e1',
      'yaxis.gridcolor': '#ebe8e1',
      'xaxis.zeroline': false,
      'yaxis.zeroline': false,
      'xaxis.showline': false,
      'yaxis.showline': false,
      'legend.bgcolor': 'rgba(255,255,255,0.92)',
      'legend.bordercolor': LINE,
      'legend.borderwidth': 1,
      'legend.font.size': 12,
      'legend.font.color': INK,
      'legend.itemsizing': 'constant',
      'hoverlabel.namelength': -1,
      'modebar.bgcolor': 'rgba(0,0,0,0)',
      'modebar.color': '#9aa0ae',
      'modebar.activecolor': ACCENT
    };

    if (gd.layout.sliders && gd.layout.sliders.length) {
      update['sliders[0].bgcolor'] = SKY;
      update['sliders[0].activebgcolor'] = ACCENT;
      update['sliders[0].bordercolor'] = LINE;
      update['sliders[0].borderwidth'] = 1;
      update['sliders[0].tickcolor'] = '#b3b8c4';
      update['sliders[0].ticklen'] = 5;
      update['sliders[0].minorticklen'] = 0;
      update['sliders[0].font.size'] = 12;
      update['sliders[0].font.color'] = MUTED;
      update['sliders[0].currentvalue.font.size'] = 14;
      update['sliders[0].currentvalue.font.color'] = NAVY;
    }

    if (gd.layout.annotations && gd.layout.annotations.length) {
      update['annotations[0].font.size'] = 11;
      update['annotations[0].font.color'] = MUTED;
      update['annotations[0].bordercolor'] = 'rgba(0,0,0,0)';
    }

    Plotly.relayout(gd, update);

    // Modebar: drop the Plotly logo and the selection tools that do nothing here.
    var config = Object.assign({}, gd._context || {}, {
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d', 'autoScale2d', 'toggleSpikelines'],
      scrollZoom: true,
      responsive: true
    });
    Plotly.react(gd, gd.data, gd.layout, config);
  }

  if (document.readyState === 'complete') {
    setTimeout(applyTheme, 0);
  } else {
    window.addEventListener('load', function () { setTimeout(applyTheme, 0); });
  }
})();
