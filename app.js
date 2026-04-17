// app.js — FormLens

var state = {
  questions: [],
  nextId: 1,
  surveyData: null,
};

var chartInstances = {};


// ── FORM BUILDER ──────────────────────────────

function addQuestion(type) {
  var defaultOptions = {
    multiple_choice: ['Option 1', 'Option 2'],
    checkbox:        ['Option A', 'Option B'],
    text:            [],
    rating:          [],
  };

  var question = {
    id:      state.nextId,
    type:    type,
    text:    '',
    options: defaultOptions[type],
  };

  state.questions.push(question);
  state.nextId++;
  renderBuilder();
}

function deleteQuestion(id) {
  state.questions = state.questions.filter(function(q) {
    return q.id !== id;
  });
  renderBuilder();
}

function updateQuestionText(id, value) {
  var q = state.questions.find(function(q) { return q.id === id; });
  if (q) q.text = value;
  // no re-render — would reset cursor position
}

function updateOption(id, index, value) {
  var q = state.questions.find(function(q) { return q.id === id; });
  if (q) q.options[index] = value;
}

function addOption(id) {
  var q = state.questions.find(function(q) { return q.id === id; });
  if (q) {
    q.options.push('');
    renderBuilder();
  }
}

function removeOption(id, index) {
  var q = state.questions.find(function(q) { return q.id === id; });
  if (q && q.options.length > 1) {
    q.options.splice(index, 1);
    renderBuilder();
  }
}

function renderBuilder() {
  var list       = document.getElementById('question-list');
  var emptyState = document.getElementById('empty-state');

  if (state.questions.length === 0) {
    emptyState.style.display = 'block';
    list.innerHTML = '';
    return;
  }

  emptyState.style.display = 'none';
  list.innerHTML = state.questions.map(function(q, index) {
    return buildQuestionCard(q, index);
  }).join('');
}

function buildQuestionCard(q, index) {
  var typeLabels = {
    multiple_choice: 'Multiple Choice',
    checkbox:        'Checkboxes',
    text:            'Short Answer',
    rating:          'Rating',
  };

  var cardHTML = `
    <div class="q-card" id="qcard-${q.id}">
      <div class="q-card-header">
        <span class="q-number">Q${index + 1}</span>
        <span class="q-type-tag tag-${q.type}">${typeLabels[q.type]}</span>
        <input
          class="q-text-input"
          type="text"
          placeholder="Type your question here..."
          value="${escapeAttr(q.text)}"
          oninput="updateQuestionText(${q.id}, this.value)"
        />
        <button class="q-delete-btn" onclick="deleteQuestion(${q.id})" title="Delete question">✕</button>
      </div>
  `;

  if (q.type === 'multiple_choice' || q.type === 'checkbox') {
    var dotClass = q.type === 'checkbox' ? 'dot-checkbox' : '';

    var optionsHTML = q.options.map(function(opt, i) {
      return `
        <div class="option-row">
          <span class="option-dot ${dotClass}"></span>
          <input
            class="option-input"
            type="text"
            placeholder="Option ${i + 1}"
            value="${escapeAttr(opt)}"
            oninput="updateOption(${q.id}, ${i}, this.value)"
          />
          <button class="option-remove-btn" onclick="removeOption(${q.id}, ${i})" title="Remove option">×</button>
        </div>
      `;
    }).join('');

    cardHTML += `
      <div class="q-card-body">
        ${optionsHTML}
        <button class="add-option-btn" onclick="addOption(${q.id})">＋ Add option</button>
      </div>
    `;

  } else if (q.type === 'rating') {
    cardHTML += `
      <div class="q-card-body">
        <div class="rating-preview">★ ★ ★ ★ ★</div>
        <div class="rating-note">Respondents will pick a rating from 1 to 5</div>
      </div>
    `;

  } else if (q.type === 'text') {
    cardHTML += `
      <div class="q-card-body">
        <input class="text-preview-input" type="text" placeholder="Respondent's short answer..." disabled />
      </div>
    `;
  }

  cardHTML += `</div>`;
  return cardHTML;
}

function escapeAttr(str) {
  if (!str) return '';
  return str
    .replace(/&/g,  '&amp;')
    .replace(/"/g,  '&quot;')
    .replace(/'/g,  '&#39;')
    .replace(/</g,  '&lt;')
    .replace(/>/g,  '&gt;');
}


// ── TAB SWITCHING ──────────────────────────────

function switchTab(tabName) {
  document.querySelectorAll('.nav-btn').forEach(function(btn) {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.tab-panel').forEach(function(panel) {
    panel.classList.remove('active');
  });
  document.getElementById('nav-' + tabName).classList.add('active');
  document.getElementById('tab-' + tabName).classList.add('active');

  if (tabName === 'analyze') renderReport();
}


// ── INIT ───────────────────────────────────────

(function() {
  addQuestion('multiple_choice');
  document.addEventListener('DOMContentLoaded', function() {
    initDragAndDrop();
  });
})();


// ── DATA COLLECTION ────────────────────────────

function switchCollectTab(name) {
  document.querySelectorAll('.inner-tab').forEach(function(btn) {
    btn.classList.remove('active');
  });
  document.querySelectorAll('.collect-panel').forEach(function(panel) {
    panel.classList.remove('active');
  });
  document.getElementById('itab-' + name).classList.add('active');
  document.getElementById('cpanel-' + name).classList.add('active');
}

function handleFileSelect(input) {
  var file = input.files[0];
  if (!file) return;

  var reader = new FileReader();
  reader.onload = function(event) {
    parseCSV(event.target.result);
  };
  reader.readAsText(file);
}

function initDragAndDrop() {
  var zone = document.getElementById('upload-zone');

  zone.addEventListener('dragover', function(e) {
    e.preventDefault();
    zone.classList.add('drag-over');
  });

  zone.addEventListener('dragleave', function() {
    zone.classList.remove('drag-over');
  });

  zone.addEventListener('drop', function(e) {
    e.preventDefault();
    zone.classList.remove('drag-over');

    var file = e.dataTransfer.files[0];
    if (file && file.name.endsWith('.csv')) {
      var reader = new FileReader();
      reader.onload = function(event) {
        parseCSV(event.target.result);
      };
      reader.readAsText(file);
    } else {
      alert('Please drop a .csv file.');
    }
  });
}

function parsePastedData() {
  var text = document.getElementById('paste-input').value.trim();
  if (!text) {
    alert('Please paste some CSV data first.');
    return;
  }
  parseCSV(text);
}

function fillPasteExample() {
  document.getElementById('paste-input').value =
    'Timestamp,Satisfaction,Work-Life Balance,Team Communication,Suggestions\n' +
    '2024-01-10,Very Satisfied,4,Excellent,More async communication\n' +
    '2024-01-11,Satisfied,3,Good,Clearer project goals\n' +
    '2024-01-12,Neutral,2,Fair,More 1-on-1 time with managers\n' +
    '2024-01-13,Very Satisfied,5,Excellent,Keep up the great work\n' +
    '2024-01-14,Dissatisfied,2,Poor,Better tooling for remote workers\n' +
    '2024-01-15,Satisfied,4,Good,Regular retrospectives would help\n' +
    '2024-01-16,Very Satisfied,5,Excellent,Nothing to improve right now\n' +
    '2024-01-17,Neutral,3,Fair,More documentation\n';
}

function parseCSV(text) {
  var lines = text.replace(/\r\n/g, '\n').split('\n').filter(function(line) {
    return line.trim() !== '';
  });

  if (lines.length < 2) {
    alert('CSV must have at least a header row and one data row.');
    return;
  }

  var allRows = lines.map(parseLine);
  var headers = allRows[0];
  var rows    = allRows.slice(1);

  state.surveyData = { headers: headers, rows: rows };

  showDataSummary();
  renderPreviewTable();
}

function parseLine(line) {
  var fields  = [];
  var current = '';
  var inQuote = false;

  for (var i = 0; i < line.length; i++) {
    var ch = line[i];

    if (ch === '"') {
      inQuote = !inQuote;
    } else if (ch === ',' && !inQuote) {
      fields.push(current.trim());
      current = '';
    } else {
      current += ch;
    }
  }

  fields.push(current.trim());
  return fields;
}

function showDataSummary() {
  var d = state.surveyData;

  document.getElementById('data-summary').classList.remove('hidden');
  document.getElementById('stat-row').classList.remove('hidden');

  document.getElementById('summary-title').textContent = d.rows.length + ' responses loaded';
  document.getElementById('summary-sub').textContent   = d.headers.length + ' columns detected';

  document.getElementById('stat-responses').textContent = d.rows.length;
  document.getElementById('stat-questions').textContent = d.headers.length - 1;
  document.getElementById('stat-columns').textContent   = d.headers.length;
}

function renderPreviewTable() {
  var d = state.surveyData;

  document.getElementById('preview-section').classList.remove('hidden');
  document.getElementById('preview-count').textContent = '(' + d.rows.length + ' total responses)';

  var table = document.getElementById('preview-table');

  var thead = '<thead><tr>' +
    d.headers.map(function(h) {
      return '<th>' + escapeHTML(h) + '</th>';
    }).join('') +
  '</tr></thead>';

  var tbody = '<tbody>' +
    d.rows.slice(0, 5).map(function(row) {
      return '<tr>' +
        row.map(function(cell) {
          return '<td>' + escapeHTML(cell) + '</td>';
        }).join('') +
      '</tr>';
    }).join('') +
  '</tbody>';

  table.innerHTML = thead + tbody;
}

function clearData() {
  state.surveyData = null;
  document.getElementById('data-summary').classList.add('hidden');
  document.getElementById('stat-row').classList.add('hidden');
  document.getElementById('preview-section').classList.add('hidden');
  document.getElementById('preview-table').innerHTML = '';
  document.getElementById('paste-input').value = '';
  document.getElementById('csv-file-input').value = '';
}

function loadSampleData() {
  var sampleCSV =
    'Timestamp,Satisfaction,Work-Life Balance,Team Communication,NPS Score,Suggestions\n' +
    '2024-01-10,Very Satisfied,4,Excellent,9,More async communication\n' +
    '2024-01-11,Satisfied,3,Good,7,Clearer project goals\n' +
    '2024-01-12,Neutral,2,Fair,5,More 1-on-1 time with managers\n' +
    '2024-01-13,Very Satisfied,5,Excellent,10,Keep up the great work\n' +
    '2024-01-14,Dissatisfied,2,Poor,3,Better tooling for remote workers\n' +
    '2024-01-15,Satisfied,4,Good,8,Regular retrospectives would help\n' +
    '2024-01-16,Very Satisfied,5,Excellent,10,Nothing to improve right now\n' +
    '2024-01-17,Neutral,3,Fair,6,More documentation please\n' +
    '2024-01-18,Satisfied,4,Good,7,Faster code reviews\n' +
    '2024-01-19,Very Satisfied,5,Excellent,9,Love the new office setup\n' +
    '2024-01-20,Dissatisfied,1,Poor,2,Management needs to communicate more\n' +
    '2024-01-21,Satisfied,3,Good,7,More budget for tools\n' +
    '2024-01-22,Very Satisfied,4,Excellent,9,Great team culture\n' +
    '2024-01-23,Neutral,3,Fair,5,Better onboarding process\n' +
    '2024-01-24,Satisfied,4,Good,8,Flexible hours would be great\n';

  parseCSV(sampleCSV);
  switchTab('collect');
}

function escapeHTML(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}


// ── CHARTS & REPORT ────────────────────────────

function renderReport() {
  var noData     = document.getElementById('no-data-state');
  var reportBody = document.getElementById('report-body');

  if (!state.surveyData || state.surveyData.rows.length === 0) {
    noData.classList.remove('hidden');
    reportBody.classList.add('hidden');
    return;
  }

  noData.classList.add('hidden');
  reportBody.classList.remove('hidden');

  var d = state.surveyData;

  document.getElementById('report-title').textContent    = document.getElementById('survey-title').value || 'Survey Results';
  document.getElementById('report-subtitle').textContent = 'Collected ' + d.rows.length + ' responses across ' + d.headers.length + ' columns';
  document.getElementById('hero-responses').textContent  = d.rows.length;
  document.getElementById('hero-questions').textContent  = d.headers.length - 1;

  var container = document.getElementById('report-cards');
  container.innerHTML = '';

  d.headers.forEach(function(header, colIndex) {
    var colType = detectColumnType(d.rows, colIndex);
    var card    = buildReportCard(header, colIndex, colType, d.rows, d.rows.length);
    container.insertAdjacentHTML('beforeend', card);
  });

  // defer chart drawing until canvas elements are in the DOM
  setTimeout(function() {
    d.headers.forEach(function(header, colIndex) {
      var colType = detectColumnType(d.rows, colIndex);
      drawChart(header, colIndex, colType, d.rows, d.rows.length);
      animateBars(colIndex);
    });
  }, 0);
}

function detectColumnType(rows, colIndex) {
  var values = rows
    .map(function(row) { return (row[colIndex] || '').trim(); })
    .filter(function(v) { return v !== ''; });

  if (values.length === 0) return 'text';

  var firstVal = values[0];
  if (/^\d{4}-\d{2}-\d{2}/.test(firstVal) || /^\d{1,2}\/\d{1,2}\/\d{4}/.test(firstVal)) {
    return 'timestamp';
  }

  var numericCount = values.filter(function(v) {
    return !isNaN(parseFloat(v)) && isFinite(v);
  }).length;

  if (numericCount / values.length > 0.8) return 'numeric';

  var uniqueValues = {};
  values.forEach(function(v) { uniqueValues[v] = true; });
  var uniqueCount = Object.keys(uniqueValues).length;
  var uniqueRatio = uniqueCount / values.length;
  var avgLength   = values.reduce(function(sum, v) { return sum + v.length; }, 0) / values.length;

  if (uniqueRatio <= 0.5 || (uniqueCount <= 8 && avgLength <= 30)) return 'categorical';

  return 'text';
}

function getColumnValues(rows, colIndex) {
  return rows
    .map(function(row) { return (row[colIndex] || '').trim(); })
    .filter(function(v) { return v !== ''; });
}

function countValues(values) {
  var counts = {};
  values.forEach(function(v) {
    counts[v] = (counts[v] || 0) + 1;
  });

  var sorted = Object.keys(counts).map(function(key) {
    return [key, counts[key]];
  }).sort(function(a, b) { return b[1] - a[1]; });

  return { counts: counts, sorted: sorted };
}

var CHART_COLORS = [
  '#f5b800',
  '#00d4a8',
  '#a78bff',
  '#ff5e7d',
  '#38bdf8',
  '#fb923c',
  '#4ade80',
  '#f472b6',
];

function getColor(index) {
  return CHART_COLORS[index % CHART_COLORS.length];
}

function buildReportCard(header, colIndex, colType, rows, total) {
  var typeLabels = {
    categorical: 'Categorical',
    numeric:     'Numeric',
    text:        'Open Text',
    timestamp:   'Timestamp',
  };

  var values = getColumnValues(rows, colIndex);

  var headerHTML = '<div class="report-card-header">' +
    '<div>' +
      '<div class="report-card-title">' + escapeHTML(header) + '</div>' +
      '<div class="report-card-meta">' + values.length + ' responses</div>' +
    '</div>' +
    '<span class="col-type-tag type-' + colType + '">' + typeLabels[colType] + '</span>' +
  '</div>';

  var bodyHTML = '';
  if (colType === 'categorical') {
    bodyHTML = buildCategoricalBody(colIndex, values, total);
  } else if (colType === 'numeric') {
    bodyHTML = buildNumericBody(colIndex);
  } else if (colType === 'text') {
    bodyHTML = buildTextBody(values, colIndex);
  } else {
    bodyHTML = '<p class="timestamp-note">Timestamp column — skipped in analysis.</p>';
  }

  return '<div class="report-card" id="card-' + colIndex + '">' + headerHTML + bodyHTML + '</div>';
}

function buildCategoricalBody(colIndex, values, total) {
  var result = countValues(values);

  var barsHTML = result.sorted.map(function(pair, i) {
    var label = pair[0];
    var count = pair[1];
    var pct   = Math.round((count / values.length) * 100);
    var color = getColor(i);

    return '<div class="breakdown-row" data-pct="' + pct + '" data-color="' + color + '">' +
      '<div class="breakdown-label-row">' +
        '<span class="breakdown-label">' + escapeHTML(label) + '</span>' +
        '<span class="breakdown-stats">' + count + ' &nbsp;·&nbsp; ' + pct + '%</span>' +
      '</div>' +
      '<div class="breakdown-track">' +
        '<div class="breakdown-fill" id="bar-' + colIndex + '-' + i + '" style="background:' + color + ';width:0%"></div>' +
      '</div>' +
    '</div>';
  }).join('');

  return '<div class="chart-layout">' +
    '<div class="chart-wrap"><canvas id="chart-' + colIndex + '" width="220" height="220"></canvas></div>' +
    '<div class="breakdown-list">' + barsHTML + '</div>' +
  '</div>';
}

function buildNumericBody(colIndex) {
  return '<div class="chart-wrap-full"><canvas id="chart-' + colIndex + '"></canvas></div>';
}

function buildTextBody(values, colIndex) {
  if (values.length < 3) {
    return '<p class="timestamp-note">Not enough text responses to generate a word cloud.</p>';
  }
  return buildWordCloudBody(colIndex, values);
}

function drawChart(header, colIndex, colType, rows, total) {
  if (colType === 'timestamp') return;

  var canvasId = 'chart-' + colIndex;
  var canvas   = document.getElementById(canvasId);
  if (!canvas) return;

  if (chartInstances[canvasId]) chartInstances[canvasId].destroy();

  var values = getColumnValues(rows, colIndex);
  var ctx    = canvas.getContext('2d');

  if (colType === 'categorical') {
    drawPieChart(ctx, canvasId, values);
  } else if (colType === 'numeric') {
    drawBarChart(ctx, canvasId, header, values);
  } else if (colType === 'text') {
    var freqs = getWordFrequency(values);
    renderWordCloud('wcloud-' + colIndex, freqs);
  }
}

function drawPieChart(ctx, canvasId, values) {
  var result = countValues(values);
  var labels = result.sorted.map(function(p) { return p[0]; });
  var counts = result.sorted.map(function(p) { return p[1]; });
  var colors = labels.map(function(_, i) { return getColor(i); });

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'doughnut',
    data: {
      labels: labels,
      datasets: [{
        data:            counts,
        backgroundColor: colors,
        borderColor:     '#16161f',
        borderWidth:     3,
        hoverOffset:     6,
      }]
    },
    options: {
      responsive: true,
      cutout: '60%',
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              var total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0);
              var pct   = Math.round((context.parsed / total) * 100);
              return ' ' + context.label + ': ' + context.parsed + ' (' + pct + '%)';
            }
          }
        }
      },
      animation: { animateRotate: true, duration: 800 }
    }
  });
}

function drawBarChart(ctx, canvasId, header, values) {
  var nums = values.map(parseFloat).filter(function(n) { return !isNaN(n); });
  if (nums.length === 0) return;

  var min = Math.min.apply(null, nums);
  var max = Math.max.apply(null, nums);

  var allIntegers = nums.every(function(n) { return n === Math.floor(n); });
  var range       = max - min;
  var labels, binCounts;

  if (allIntegers && range <= 10) {
    labels    = [];
    binCounts = [];
    for (var v = min; v <= max; v++) {
      labels.push(String(v));
      binCounts.push(nums.filter(function(n) { return n === v; }).length);
    }
  } else {
    var binCount = Math.min(8, range);
    var binSize  = range / binCount;
    labels    = [];
    binCounts = [];

    for (var i = 0; i < binCount; i++) {
      var lo    = min + i * binSize;
      var hi    = lo + binSize;
      var count = nums.filter(function(n) { return n >= lo && (i === binCount - 1 ? n <= hi : n < hi); }).length;
      labels.push(lo.toFixed(1) + '–' + hi.toFixed(1));
      binCounts.push(count);
    }
  }

  chartInstances[canvasId] = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [{
        label:           header,
        data:            binCounts,
        backgroundColor: CHART_COLORS[0],
        borderColor:     CHART_COLORS[0],
        borderRadius:    6,
        borderWidth:     0,
      }]
    },
    options: {
      responsive:          true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: function(context) {
              var total = context.dataset.data.reduce(function(a, b) { return a + b; }, 0);
              var pct   = Math.round((context.parsed.y / total) * 100);
              return ' ' + context.parsed.y + ' responses (' + pct + '%)';
            }
          }
        }
      },
      scales: {
        x: {
          grid:  { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#9999b8', font: { size: 11 } },
        },
        y: {
          beginAtZero: true,
          grid:  { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#9999b8', font: { size: 11 }, stepSize: 1 },
        }
      },
      animation: { duration: 700 }
    }
  });
}

function animateBars(colIndex) {
  var card = document.getElementById('card-' + colIndex);
  if (!card) return;

  card.querySelectorAll('.breakdown-row').forEach(function(row, i) {
    var pct  = row.getAttribute('data-pct');
    var fill = document.getElementById('bar-' + colIndex + '-' + i);
    if (fill && pct) {
      setTimeout(function() {
        fill.style.width = pct + '%';
      }, i * 60);
    }
  });
}

function printReport() {
  window.print();
}


// ── WORD CLOUD ─────────────────────────────────

var STOP_WORDS = new Set([
  'a','an','the','and','or','but','in','on','at','to','for',
  'of','with','by','from','is','are','was','were','be','been',
  'have','has','had','do','does','did','will','would','could',
  'should','may','might','i','we','you','he','she','they','it',
  'this','that','these','those','my','your','our','their','its',
  'me','him','her','us','them','what','which','who','not','no',
  'so','if','as','up','out','more','also','just','than','then',
  'when','there','here','all','about','into','very','can','get',
  'got','make','made','like','need','use','used','think','know',
]);

function getWordFrequency(responses) {
  var text = responses
    .join(' ')
    .toLowerCase()
    .replace(/[^a-z\s]/g, ' ');

  var words    = text.split(/\s+/);
  var filtered = words.filter(function(w) { return w.length > 2 && !STOP_WORDS.has(w); });

  var counts = {};
  filtered.forEach(function(w) { counts[w] = (counts[w] || 0) + 1; });

  return Object.keys(counts)
    .map(function(w) { return [w, counts[w]]; })
    .sort(function(a, b) { return b[1] - a[1]; });
}

function renderWordCloud(containerId, wordFreqs) {
  var container = document.getElementById(containerId);
  if (!container) return;

  container.innerHTML = '';

  var words    = wordFreqs.slice(0, 40);
  if (words.length === 0) return;

  var maxCount   = words[0][1];
  var minCount   = words[words.length - 1][1];
  var containerW = container.offsetWidth  || 500;
  var containerH = container.offsetHeight || 260;
  var MAX_FONT   = 36;
  var MIN_FONT   = 12;

  function getFontSize(count) {
    if (maxCount === minCount) return (MAX_FONT + MIN_FONT) / 2;
    return MIN_FONT + ((count - minCount) / (maxCount - minCount)) * (MAX_FONT - MIN_FONT);
  }

  var x = 12, y = 16, rowH = 0, padding = 10;

  words.forEach(function(pair, i) {
    var word  = pair[0];
    var count = pair[1];
    var size  = getFontSize(count);
    var color = CHART_COLORS[i % CHART_COLORS.length];

    // measure word width before placing
    var probe = document.createElement('span');
    probe.style.cssText = 'position:absolute;visibility:hidden;font-size:' + size + 'px;font-family:Syne,sans-serif;font-weight:700;white-space:nowrap;';
    probe.textContent = word;
    document.body.appendChild(probe);
    var wordW = probe.offsetWidth;
    var wordH = probe.offsetHeight;
    document.body.removeChild(probe);

    if (x + wordW + padding > containerW && x > 12) {
      x = 12; y += rowH + 8; rowH = 0;
    }
    if (y + wordH > containerH) return;

    var el = document.createElement('span');
    el.className   = 'cloud-word';
    el.textContent = word;
    el.title       = count + ' occurrence' + (count !== 1 ? 's' : '');
    el.style.cssText = [
      'left:'            + x + 'px',
      'top:'             + y + 'px',
      'font-size:'       + size + 'px',
      'color:'           + color,
      'opacity:'         + (0.5 + 0.5 * ((count - minCount) / (maxCount - minCount || 1))),
      'animation-delay:' + (i * 30) + 'ms',
    ].join(';');

    container.appendChild(el);
    x += wordW + padding;
    rowH = Math.max(rowH, wordH);
  });
}

function buildWordCloudBody(colIndex, values) {
  var freqs    = getWordFrequency(values);
  var topWords = freqs.slice(0, 10);
  var maxCount = topWords.length > 0 ? topWords[0][1] : 1;

  var cloudHTML = '<div class="word-cloud" id="wcloud-' + colIndex + '"></div>';

  var tableRows = topWords.map(function(pair, i) {
    var word  = pair[0];
    var count = pair[1];
    var pct   = Math.round((count / maxCount) * 100);
    var color = CHART_COLORS[i % CHART_COLORS.length];
    return '<tr>' +
      '<td>' + escapeHTML(word) + '</td>' +
      '<td><span class="word-freq-bar" style="width:' + (pct * 0.6) + 'px;background:' + color + '"></span>' + count + ' mention' + (count !== 1 ? 's' : '') + '</td>' +
      '<td>' + pct + '%</td>' +
    '</tr>';
  }).join('');

  return cloudHTML +
    '<table class="word-table">' +
      '<thead><tr><th>Word</th><th>Frequency</th><th>Rel. %</th></tr></thead>' +
      '<tbody>' + tableRows + '</tbody>' +
    '</table>';
}