/* Shared visual theme for the interactive Plotly maps.
   Runs inside each figure page after the plot has been drawn and restyles it
   to match the project site. Edit the palettes and constants below to tune
   every map at once. */
(function () {
  'use strict';

  var NAVY = '#17233f';
  var INK = '#1b2030';
  var MUTED = '#5d6475';
  var ACCENT = '#c26d4e';
  var FONT = 'Inter, system-ui, -apple-system, "Segoe UI", Roboto, sans-serif';

  // Colors for manually assigned alignment targets ...
  var TARGET_COLORS = {
    'UNDERSPECIFIED': '#9aa0ae',
    'SAFETY': '#dc2626',
    'CULTURAL': '#f97316',
    'PERSONALIZATION': '#2563eb',
    'SOCIAL&SOCIODEMOGRAPHIC': '#9333ea',
    'MORAL&ETHICAL': '#16a34a',
    'FACTUALITY&FAITHFULNESS': '#0891b2',
    'BIAS&FAIRNESS': '#db2777',
    'VALUE': '#ca8a04',
    'DIVERSITY': '#059669',
    'LINGUISTIC&MULTILINGUAL': '#4f46e5',
    'TOXICITY': '#b45309',
    'POLITICAL': '#7c3aed',
    'OPINIONS': '#0d9488',
    'HUMOR': '#e11d48',
    'LEGAL': '#65a30d',
    'LENGTH': '#d946ef'
  };

  // ... and for topic clusters, chosen so that related targets and clusters
  // share a hue (safety red, cultural orange, bias pink, moral green, ...).
  var CLUSTER_COLORS = {
    'biases / political / bias': '#db2777',
    'moral / moral values / norms': '#16a34a',
    'safety / jailbreak / attacks': '#dc2626',
    'cultural / arabic / culturally': '#f97316',
    'languages / multilingual / english': '#4f46e5',
    'user / personalized / preferences': '#2563eb',
    'knowledge / factual / dialogue': '#0891b2',
    'preference / preference data / quality': '#7c3aed',
    'reward / rlhf / feedback': '#b45309',
    'value / values / human values': '#ca8a04'
  };

  // Map labels: by default the first keyword of the cluster name, capitalized.
  var LABEL_OVERRIDES = {
    'user / personalized / preferences': 'Personalization'
  };

  var SPECIAL = {
    'Sociotechnical papers': { color: ACCENT, size: 9, opacity: 0.9, line: 1.2 },
    'Technical papers': { color: '#b9bdc9', size: 6, opacity: 0.55, line: 0.8 }
  };

  var FALLBACK = ['#2563eb', '#f97316', '#16a34a', '#dc2626', '#9333ea', '#0891b2',
    '#db2777', '#ca8a04', '#4f46e5', '#059669', '#b45309', '#7c3aed', '#0d9488',
    '#e11d48', '#65a30d', '#d946ef', '#0ea5e9', '#a16207', '#475569', '#9aa0ae'];

  function baseName(name) {
    return String(name || '').replace(/\s*\(\d+\)\s*$/, '').trim();
  }

  function isCluster(name) { return name.indexOf(' / ') !== -1; }

  function prettyName(name) {
    var m = /^(.*?)(\s*\(\d+\))?$/.exec(name);
    var core = m[1], count = m[2] || '';
    if (core === core.toUpperCase() && /[A-Z]/.test(core)) {
      core = core.toLowerCase().replace(/&/g, ' & ');
      core = core.charAt(0).toUpperCase() + core.slice(1);
    } else if (isCluster(core)) {
      core = core.charAt(0).toUpperCase() + core.slice(1);
    }
    return core + count;
  }

  function hexToRgba(hex, a) {
    var n = parseInt(hex.slice(1), 16);
    return 'rgba(' + (n >> 16) + ',' + ((n >> 8) & 255) + ',' + (n & 255) + ',' + a + ')';
  }

  function darken(hex, f) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.round((n >> 16) * f), g = Math.round(((n >> 8) & 255) * f), b = Math.round((n & 255) * f);
    return 'rgb(' + r + ',' + g + ',' + b + ')';
  }

  function prettyHover(text) {
    var m = /^(.*?)<br>Title: (.*)<br>Label: (.*)$/s.exec(text);
    if (!m) return text;
    return '<b>' + m[1] + '</b><br>' + m[2] + '<br><i>' + m[3] + '</i><br>' +
      '<span style="font-size:11px">Click to open the paper</span>';
  }

  // Plotly exports numeric arrays as base64 typed arrays; decode them so the
  // labels can use every year's points, not just the ones currently visible.
  function decodeArray(v) {
    if (Array.isArray(v)) return v;
    if (!v || typeof v !== 'object' || !v.bdata) return [];
    var bin = atob(v.bdata), bytes = new Uint8Array(bin.length);
    for (var i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
    var ctor = { f8: Float64Array, f4: Float32Array, i4: Int32Array, u4: Uint32Array,
      i2: Int16Array, u2: Uint16Array, i1: Int8Array, u1: Uint8Array }[v.dtype];
    return ctor ? Array.prototype.slice.call(new ctor(bytes.buffer)) : [];
  }

  function median(arr) {
    var a = Array.prototype.slice.call(arr).filter(function (v) { return v === v; }).sort(function (x, y) { return x - y; });
    if (!a.length) return NaN;
    var mid = a.length >> 1;
    return a.length % 2 ? a[mid] : (a[mid - 1] + a[mid]) / 2;
  }

  // Figure 2: show manual labels and topic clusters side by side instead of
  // behind a slider. Cluster traces move to a second subplot with its own
  // legend; axes are matched so pan and zoom stay in sync.
  function layoutComparison(gd, isCluster, baseName) {
    var clusterIdx = [], targetIdx = [];
    gd.data.forEach(function (t, i) {
      if (t.type !== 'scatter') return;
      var g = baseName(t.legendgroup || t.name);
      (isCluster(g) ? clusterIdx : targetIdx).push(i);
    });
    Plotly.restyle(gd, { visible: true, xaxis: 'x', yaxis: 'y', legend: 'legend' }, targetIdx);
    Plotly.restyle(gd, { visible: true, xaxis: 'x2', yaxis: 'y2', legend: 'legend2' }, clusterIdx);

    var stacked = window.innerWidth < 760;
    var ax = { showticklabels: false, showgrid: false, zeroline: false, showline: false, ticks: '' };
    var x0 = gd.layout.xaxis.range, y0 = gd.layout.yaxis.range;
    var lay = {
      'sliders[0].visible': false,
      'margin.l': 10, 'margin.r': 10, 'margin.t': 56, 'margin.b': 16,
      xaxis: Object.assign({ range: x0, domain: stacked ? [0, 0.6] : [0, 0.31] }, ax),
      yaxis: Object.assign({ range: y0, domain: stacked ? [0.54, 1] : [0, 1] }, ax),
      xaxis2: Object.assign({ matches: 'x', domain: stacked ? [0, 0.6] : [0.52, 0.83], anchor: 'y2' }, ax),
      yaxis2: Object.assign({ matches: 'y', domain: stacked ? [0, 0.46] : [0, 1], anchor: 'x2' }, ax),
      legend: { x: stacked ? 0.62 : 0.315, y: 1, xanchor: 'left', yanchor: 'top', orientation: 'v',
        bgcolor: 'rgba(0,0,0,0)', borderwidth: 0, itemsizing: 'constant', itemwidth: 30,
        font: { size: 11.5, color: INK }, title: { text: '<b>Alignment target</b>', font: { size: 12, color: MUTED } } },
      legend2: { x: stacked ? 0.62 : 0.835, y: stacked ? 0.46 : 1, xanchor: 'left', yanchor: 'top', orientation: 'v',
        bgcolor: 'rgba(0,0,0,0)', borderwidth: 0, itemsizing: 'constant', itemwidth: 30,
        font: { size: 11.5, color: INK }, title: { text: '<b>Topic cluster</b>', font: { size: 12, color: MUTED } } }
    };
    var titles = [
      { text: '<b>Manually assigned target labels</b>', xref: 'paper', yref: 'paper', showarrow: false,
        x: stacked ? 0 : 0.155, y: stacked ? 1.0 : 1.04, xanchor: stacked ? 'left' : 'center', yanchor: 'bottom',
        font: { family: FONT, size: 13, color: NAVY } },
      { text: '<b>Automatically identified topic clusters</b>', xref: 'paper', yref: 'paper', showarrow: false,
        x: stacked ? 0 : 0.675, y: stacked ? 0.46 : 1.04, xanchor: stacked ? 'left' : 'center', yanchor: 'bottom',
        font: { family: FONT, size: 13, color: NAVY } },
      { text: 'Same paper, same position in both panels. Hover a paper to see it in both.', xref: 'paper', yref: 'paper',
        showarrow: false, x: 0, y: stacked ? -0.03 : -0.02, xanchor: 'left', yanchor: 'top',
        font: { family: FONT, size: 11, color: MUTED } }
    ];
    var hint = (gd.layout.annotations || []).slice(0, 1).map(function (a) {
      return Object.assign({}, a, { visible: false });
    });
    lay.annotations = hint.concat(titles);
    Plotly.relayout(gd, lay);
  }

  function linkHover(gd) {
    var ring = { type: 'scatter', mode: 'markers', x: [], y: [], hoverinfo: 'skip', showlegend: false,
      marker: { size: 15, color: 'rgba(0,0,0,0)', line: { color: NAVY, width: 2 } } };
    var n = gd.data.length;
    Plotly.addTraces(gd, [
      Object.assign({}, ring, { xaxis: 'x', yaxis: 'y', legend: 'legend' }),
      Object.assign({}, ring, { xaxis: 'x2', yaxis: 'y2', legend: 'legend2' })
    ]);
    gd.on('plotly_hover', function (e) {
      var pt = e.points && e.points[0];
      if (!pt || pt.curveNumber >= n) return;
      Plotly.restyle(gd, { x: [[pt.x], [pt.x]], y: [[pt.y], [pt.y]] }, [n, n + 1]);
    });
    gd.on('plotly_unhover', function () {
      Plotly.restyle(gd, { x: [[], []], y: [[], []] }, [n, n + 1]);
    });
  }

  function applyTheme() {
    var gd = document.querySelector('.plotly-graph-div');
    if (!gd || !gd.data || !gd._fullLayout || !gd._fullData) {
      setTimeout(applyTheme, 100);
      return;
    }

    // ---- assign a color and marker style per legend group
    var groupColor = {};
    var fallbackIdx = 0;
    var allClusters = true;
    gd.data.forEach(function (t) {
      var g = baseName(t.legendgroup || t.name);
      if (!SPECIAL[g] && !isCluster(g)) allClusters = false;
      if (groupColor[g]) return;
      groupColor[g] = (SPECIAL[g] && SPECIAL[g].color) || TARGET_COLORS[g] || CLUSTER_COLORS[g] ||
        FALLBACK[fallbackIdx++ % FALLBACK.length];
    });

    var idx = [], colors = [], sizes = [], opacities = [], lineW = [], names = [], hovers = [];
    var hoverIdx = [];
    gd.data.forEach(function (t, i) {
      if (t.type !== 'scatter') return;
      var g = baseName(t.legendgroup || t.name);
      var sp = SPECIAL[g] || {};
      idx.push(i);
      colors.push(groupColor[g]);
      sizes.push(sp.size || (t.showlegend ? 9 : 8));
      opacities.push(sp.opacity || 0.88);
      lineW.push(sp.line || 1.2);
      names.push(prettyName(t.name || ''));
      if (Array.isArray(t.hovertext)) {
        hoverIdx.push(i);
        hovers.push(t.hovertext.map(prettyHover));
      }
    });

    Plotly.restyle(gd, {
      'marker.color': colors,
      'marker.size': sizes,
      'marker.opacity': opacities,
      'marker.line.color': '#ffffff',
      'marker.line.width': lineW,
      'name': names,
      'hoverlabel.bgcolor': NAVY,
      'hoverlabel.bordercolor': NAVY,
      'hoverlabel.font.color': '#ffffff',
      'hoverlabel.font.family': FONT,
      'hoverlabel.font.size': 12.5,
      'hoverlabel.align': 'left'
    }, idx);
    if (hoverIdx.length) {
      Plotly.restyle(gd, { hovertext: hovers }, hoverIdx);
    }

    // ---- layout: transparent canvas over the page gradient, no axes noise
    var legendTitle = '';
    var kinds = Object.keys(groupColor);
    if (kinds.every(function (k) { return SPECIAL[k]; })) legendTitle = '';
    else if (kinds.every(function (k) { return isCluster(k); })) legendTitle = 'Topic cluster';
    else if (kinds.every(function (k) { return !isCluster(k); })) legendTitle = 'Alignment target';

    var update = {
      'font.family': FONT,
      'font.color': INK,
      'font.size': 13,
      'paper_bgcolor': 'rgba(0,0,0,0)',
      'plot_bgcolor': 'rgba(0,0,0,0)',
      'xaxis.showticklabels': false,
      'yaxis.showticklabels': false,
      'xaxis.showgrid': false,
      'yaxis.showgrid': false,
      'xaxis.zeroline': false,
      'yaxis.zeroline': false,
      'xaxis.showline': false,
      'yaxis.showline': false,
      'xaxis.ticks': '',
      'yaxis.ticks': '',
      'legend.bgcolor': 'rgba(0,0,0,0)',
      'legend.borderwidth': 0,
      'legend.font.size': 12.5,
      'legend.font.color': INK,
      'legend.itemsizing': 'constant',
      'legend.itemwidth': 30,
      'legend.tracegroupgap': 2,
      'legend.title.text': legendTitle ? '<b>' + legendTitle + '</b>' : '',
      'legend.title.font.size': 12,
      'legend.title.font.color': MUTED,
      'hoverlabel.namelength': -1,
      'hovermode': 'closest',
      'modebar.bgcolor': 'rgba(0,0,0,0)',
      'modebar.color': '#9aa0ae',
      'modebar.activecolor': ACCENT
    };

    if (gd.layout.sliders && gd.layout.sliders.length) {
      var sl = gd.layout.sliders[0];
      update['sliders[0].bgcolor'] = '#e9e6df';
      update['sliders[0].activebgcolor'] = ACCENT;
      update['sliders[0].bordercolor'] = 'rgba(0,0,0,0)';
      update['sliders[0].borderwidth'] = 0;
      update['sliders[0].tickcolor'] = 'rgba(0,0,0,0)';
      update['sliders[0].ticklen'] = 0;
      update['sliders[0].minorticklen'] = 0;
      update['sliders[0].font.size'] = 12.5;
      update['sliders[0].font.color'] = MUTED;
      update['sliders[0].currentvalue.font.size'] = 15;
      update['sliders[0].currentvalue.font.color'] = NAVY;
      update['sliders[0].currentvalue.font.family'] = FONT;
      if (sl.currentvalue && sl.currentvalue.visible !== false) {
        update['sliders[0].currentvalue.prefix'] = 'Papers published up to ';
      }
    }

    if (gd.layout.annotations && gd.layout.annotations.length) {
      update['annotations[0].font.size'] = 11;
      update['annotations[0].font.color'] = MUTED;
      update['annotations[0].bordercolor'] = 'rgba(0,0,0,0)';
    }

    Plotly.relayout(gd, update);

    // ---- cluster labels at the median position of each topic cluster
    if (allClusters) {
      var pts = {};
      gd.data.forEach(function (t) {
        if (t.type !== 'scatter') return;
        var xs = decodeArray(t.x), ys = decodeArray(t.y);
        if (xs.length < 2 || xs.length !== ys.length) return;
        var g = baseName(t.legendgroup || t.name);
        pts[g] = pts[g] || { x: [], y: [] };
        for (var k = 0; k < xs.length; k++) { pts[g].x.push(xs[k]); pts[g].y.push(ys[k]); }
      });
      var existing = (gd.layout.annotations || []).slice();
      Object.keys(pts).forEach(function (g) {
        var label = LABEL_OVERRIDES[g] || g.split(' / ')[0].trim();
        label = label.charAt(0).toUpperCase() + label.slice(1);
        existing.push({
          x: median(pts[g].x), y: median(pts[g].y), xref: 'x', yref: 'y',
          text: '<b>' + label + '</b>',
          showarrow: false,
          font: { family: FONT, size: 11, color: darken(groupColor[g], 0.75) },
          bgcolor: 'rgba(255,255,255,0.78)',
          bordercolor: hexToRgba(groupColor[g], 0.5),
          borderwidth: 1,
          borderpad: 3,
          opacity: 0.95
        });
      });
      Plotly.relayout(gd, { annotations: existing });
    }

    // ---- Figure 2: both labelings side by side, linked hover
    var hasTargets = kinds.some(function (k) { return !isCluster(k) && !SPECIAL[k]; });
    var hasClusters = kinds.some(function (k) { return isCluster(k); });
    if (hasTargets && hasClusters) {
      layoutComparison(gd, isCluster, baseName);
      linkHover(gd);
      window.addEventListener('resize', function () {
        setTimeout(function () { layoutComparison(gd, isCluster, baseName); }, 150);
      });
    }

    // ---- modebar: drop the logo and the selection tools that do nothing here
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
