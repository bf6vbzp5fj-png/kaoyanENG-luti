/**
 * 考研英语录题格式转换工具 - 前端主逻辑（纯前端版）
 * 所有功能在浏览器中运行，不需要后端服务器
 */

// ========== 全局状态 ==========
const state = {
    paperType: 'yingyi', // yingyi / yinger
    transType: 'yingyi',
    examData: {
        cloze: null,
        reading: [null, null, null, null],
        partb: null,
        translation: null,
        writing_a: null,
        writing_b: null,
    },
    answerData: {
        cloze: {},
        reading: {},
        partb: {},
        translation: {},
        writing_a: {},
        writing_b: {},
    },
    currentText: 0,
    partbStartQnum: 41,
};

// ========== 初始化 ==========
document.addEventListener('DOMContentLoaded', function() {
    initTabs();
    initReadingTextButtons();
    initInputListeners();
    initImportButtons();
    initExportButtons();

    updatePreview('cloze');
    updatePreview('reading');
    updatePreview('partb');
    updatePreview('translation');
    updatePreview('writing-a');
    updatePreview('writing-b');
});

// ========== 英一/英二切换 ==========
function switchPaperType(type) {
    state.paperType = type;
    state.transType = type;

    // 切换翻译类型显示
    if (type === 'yingyi') {
        document.querySelector('input[name="transType"][value="yingyi"]').checked = true;
        document.getElementById('trans-yingyi').style.display = 'block';
        document.getElementById('trans-yinger').style.display = 'none';
    } else {
        document.querySelector('input[name="transType"][value="yinger"]').checked = true;
        document.getElementById('trans-yingyi').style.display = 'none';
        document.getElementById('trans-yinger').style.display = 'block';
    }

    updatePreview('translation');
    showToast(`已切换到${type === 'yingyi' ? '英语一' : '英语二'}模式`);
}

function switchTranslationType(type) {
    state.transType = type;
    if (type === 'yingyi') {
        document.getElementById('trans-yingyi').style.display = 'block';
        document.getElementById('trans-yinger').style.display = 'none';
    } else {
        document.getElementById('trans-yingyi').style.display = 'none';
        document.getElementById('trans-yinger').style.display = 'block';
    }
    updatePreview('translation');
}

// ========== 标签页切换 ==========
function initTabs() {
    const tabBtns = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const tab = btn.dataset.tab;

            tabBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            tabContents.forEach(c => c.classList.remove('active'));
            const target = document.getElementById('tab-' + tab);
            if (target) target.classList.add('active');

            if (['cloze', 'reading', 'partb', 'translation', 'writing-a', 'writing-b'].includes(tab)) {
                updatePreview(tab);
            }
        });
    });
}

// ========== 阅读 Text 切换 ==========
function initReadingTextButtons() {
    const textBtns = document.querySelectorAll('.text-btn');
    textBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            saveCurrentReadingText();

            const idx = parseInt(btn.dataset.text);
            state.currentText = idx;

            textBtns.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            loadReadingText(idx);
            updatePreview('reading');
        });
    });
}

function saveCurrentReadingText() {
    const idx = state.currentText;
    const article = document.getElementById('reading-article').value;
    const questions = document.getElementById('reading-questions').value;
    const answers = document.getElementById('reading-answers').value;

    if (!state.examData.reading[idx]) {
        state.examData.reading[idx] = { text_num: idx + 1, article: '', questions: [] };
    }
    state.examData.reading[idx]._raw_article = article;
    state.examData.reading[idx]._raw_questions = questions;
    state.examData.reading[idx]._raw_answers = answers;
}

function loadReadingText(idx) {
    const data = state.examData.reading[idx];
    if (data) {
        document.getElementById('reading-article').value = data._raw_article || data.article || '';
        document.getElementById('reading-questions').value = data._raw_questions || '';
        document.getElementById('reading-answers').value = data._raw_answers || '';
    } else {
        document.getElementById('reading-article').value = '';
        document.getElementById('reading-questions').value = '';
        document.getElementById('reading-answers').value = '';
    }
}

// ========== 输入监听（防抖） ==========
function initInputListeners() {
    const setup = (ids, type) => {
        ids.forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('input', () => debounceUpdate(type));
                el.addEventListener('change', () => debounceUpdate(type));
            }
        });
    };

    setup(['cloze-article', 'cloze-options', 'cloze-answer', 'cloze-explanation'], 'cloze');
    setup(['reading-article', 'reading-questions', 'reading-answers'], 'reading');
    setup(['partb-type', 'partb-options', 'partb-article', 'partb-answers', 'partb-start-qnum'], 'partb');
    setup(['translation-article', 'translation-sentences', 'translation-trans', 'translation-analysis',
           'yinger-source', 'yinger-translation', 'yinger-analysis'], 'translation');
    setup(['writing-a-directions', 'writing-a-essay', 'writing-a-translation'], 'writing-a');
    setup(['writing-b-directions', 'writing-b-essay', 'writing-b-translation'], 'writing-b');
}

let debounceTimers = {};
function debounceUpdate(type) {
    if (debounceTimers[type]) clearTimeout(debounceTimers[type]);
    debounceTimers[type] = setTimeout(() => updatePreview(type), 300);
}

// ========== 更新预览 ==========
function updatePreview(type) {
    let html = '';
    switch(type) {
        case 'cloze':
            html = formatClozeLocal();
            document.getElementById('cloze-preview').innerHTML = html;
            break;
        case 'reading':
            html = formatReadingLocal();
            document.getElementById('reading-preview').innerHTML = html;
            break;
        case 'partb':
            html = formatPartbLocal();
            document.getElementById('partb-preview').innerHTML = html;
            break;
        case 'translation':
            html = formatTranslationLocal();
            document.getElementById('translation-preview').innerHTML = html;
            break;
        case 'writing-a':
            html = formatWritingLocal(true);
            document.getElementById('writing-a-preview').innerHTML = html;
            break;
        case 'writing-b':
            html = formatWritingLocal(false);
            document.getElementById('writing-b-preview').innerHTML = html;
            break;
    }
}

// ========== 完形填空本地格式化 ==========
function formatClozeLocal() {
    const article = document.getElementById('cloze-article').value || '';
    const optionsText = document.getElementById('cloze-options').value || '';
    const answer = document.getElementById('cloze-answer').value || '';
    const explText = document.getElementById('cloze-explanation').value || '';

    let html = '<div class="section-title">1、【完形填空】【完形填空】</div><br>';

    // 文章 - 空位数字加下划线 + 特殊标记
    let articleHtml = Formatter.addClozeUnderlineHtml(article);
    articleHtml = applyMarksToHtmlLines(articleHtml);

    articleHtml.split('\n').forEach(line => {
        html += line.trim() ? `<p>${line}</p>` : '<p>&nbsp;</p>';
    });
    html += '<br>';

    const questions = parseClozeOptions(optionsText);

    // 子题
    questions.forEach((q, idx) => {
        html += `<p>【${idx + 1}】</p>`;
        q.optionOrder.forEach(letter => {
            html += `<p>${letter}. ${Formatter.applyMarksHtml(q.options[letter] || '')}</p>`;
        });
    });

    html += `<p class="answer-line">答：${escapeHtml(answer.toUpperCase())}</p>`;
    html += '<p>解：</p>';

    const explanations = parseClozeExplanations(explText);
    explanations.forEach((expl, idx) => {
        if (expl) html += `<p>【${idx + 1}】${Formatter.applyMarksHtml(expl)}</p>`;
    });

    return html;
}

function applyMarksToHtmlLines(text) {
    // 对每行应用特殊标记（已经有 <u> 标签的空位数字也要保留）
    const lines = text.split('\n');
    return lines.map(line => {
        let result = line;
        // **加粗**
        result = result.replace(/\*\*(.+?)\*\*/g, (match, content) => `<b>${content}</b>`);
        // __下划线__ （但要注意不要和空位数字的 <u> 冲突，只处理非数字的）
        result = result.replace(/__(.+?)__/g, (match, content) => {
            if (/^\d+$/.test(content.trim())) return match;
            return `<u>${content}</u>`;
        });
        return result;
    }).join('\n');
}

function parseClozeOptions(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const questions = [];

    lines.forEach(line => {
        line = line.trim();
        const qMatch = line.match(/^(\d+)\s*(.*)/);
        if (!qMatch) return;

        const qnum = parseInt(qMatch[1]);
        const rest = qMatch[2];

        const options = {};
        const optionOrder = [];

        const optPattern = /(?:^|\s)([A-D])\s*[.．\]]\s*/g;
        const matches = [...rest.matchAll(optPattern)];

        if (matches.length >= 2) {
            matches.forEach((m, i) => {
                const letter = m[1].toUpperCase();
                const start = m.index + m[0].length;
                const end = i < matches.length - 1 ? matches[i + 1].index : rest.length;
                options[letter] = rest.substring(start, end).trim();
                optionOrder.push(letter);
            });
        }

        if (optionOrder.length > 0) {
            questions.push({ qnum, options, optionOrder });
        }
    });

    return questions;
}

function parseClozeExplanations(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const explanations = [];

    lines.forEach(line => {
        line = line.trim();
        const match = line.match(/^(\d+)[|｜\.:：、]\s*(.*)/);
        if (match) {
            const idx = parseInt(match[1]) - 1;
            explanations[idx] = match[2];
        }
    });

    return explanations;
}

// ========== 阅读理解本地格式化 ==========
function formatReadingLocal() {
    const article = document.getElementById('reading-article').value || '';
    const questionsText = document.getElementById('reading-questions').value || '';
    const answersText = document.getElementById('reading-answers').value || '';

    const textNum = state.currentText + 1;
    const sectionNum = textNum + 1;

    let html = `<div class="section-title">${sectionNum}、【复合题】【阅读理解】</div>`;
    html += `<p><strong>Text ${textNum}</strong></p><p>&nbsp;</p>`;

    // 文章
    article.split('\n').forEach(line => {
        html += line.trim() ? `<p>${Formatter.applyMarksHtml(line)}</p>` : '<p>&nbsp;</p>';
    });

    html += '<p>分析：</p>';

    const questions = parseReadingQuestions(questionsText);
    const answers = parseReadingAnswers(answersText);

    questions.forEach((q, idx) => {
        const qnum = q.qnum;
        const ansData = answers[qnum] || {};

        html += `<p>【${idx + 1}】【单选题】${qnum}. ${Formatter.applyMarksHtml(q.stem)}</p>`;

        q.optionOrder.forEach(letter => {
            html += `<p>${letter}. ${Formatter.applyMarksHtml(q.options[letter] || '')}</p>`;
        });

        html += `<p class="answer-line">答：${escapeHtml(ansData.answer || '')}</p>`;

        if (ansData.explanation) {
            html += '<p>解：</p>';
            ansData.explanation.split('\n').forEach(line => {
                html += line.trim() ? `<p>${Formatter.applyMarksHtml(line)}</p>` : '<p>&nbsp;</p>';
            });
        }

        html += '<p>&nbsp;</p>';
    });

    return html;
}

function parseReadingQuestions(text) {
    const lines = text.split('\n');
    const questions = [];
    let currentQ = null;
    let collectingOptions = false;

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        const qMatch = line.match(/^(\d+)\s*[.．]\s*(.*)/);
        if (qMatch) {
            const qnum = parseInt(qMatch[1]);
            if (qnum >= 21 && qnum <= 40) {
                if (currentQ) questions.push(currentQ);
                currentQ = { qnum, stem: qMatch[2], options: {}, optionOrder: [] };
                collectingOptions = false;
                return;
            }
        }

        if (!currentQ) return;

        const optMatch = line.match(/^([A-D])\s*[.．\]]\s*(.*)/);
        if (optMatch) {
            const letter = optMatch[1].toUpperCase();
            if (letter >= 'A' && letter <= 'D') {
                currentQ.options[letter] = optMatch[2];
                currentQ.optionOrder.push(letter);
                collectingOptions = true;
                return;
            }
        }

        if (!collectingOptions) {
            currentQ.stem += '\n' + line;
        } else if (currentQ.optionOrder.length > 0) {
            const lastLetter = currentQ.optionOrder[currentQ.optionOrder.length - 1];
            currentQ.options[lastLetter] += '\n' + line;
        }
    });

    if (currentQ) questions.push(currentQ);
    return questions;
}

function parseReadingAnswers(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const answers = {};

    lines.forEach(line => {
        line = line.trim();
        const parts = line.split(/[|｜]/);
        if (parts.length >= 2) {
            const qnum = parseInt(parts[0]);
            if (qnum >= 21 && qnum <= 40) {
                answers[qnum] = {
                    answer: (parts[1] || '').trim().toUpperCase(),
                    explanation: parts[2] ? parts[2].trim() : '',
                };
            }
        }
    });

    return answers;
}

// ========== 新题型本地格式化 ==========
function updatePartbQnums() {
    const startVal = parseInt(document.getElementById('partb-start-qnum').value) || 41;
    state.partbStartQnum = startVal;

    // 更新提示
    const hint = document.querySelector('#tab-partb .input-hint');
    if (hint) hint.textContent = `共5题 (${startVal}-${startVal + 4})`;

    // 自动更新答案解析里的题号
    const answersText = document.getElementById('partb-answers').value;
    const lines = answersText.split('\n');
    const newLines = lines.map((line, idx) => {
        const match = line.match(/^(\d+)([|｜].*)/);
        if (match && idx < 5) {
            return (startVal + idx) + match[2];
        }
        return line;
    });
    document.getElementById('partb-answers').value = newLines.join('\n');

    updatePreview('partb');
}

function formatPartbLocal() {
    const type = document.getElementById('partb-type').value || '小标题';
    const optionsText = document.getElementById('partb-options').value || '';
    const articleText = document.getElementById('partb-article').value || '';
    const answersText = document.getElementById('partb-answers').value || '';
    const startQnum = state.partbStartQnum;

    let html = `<div class="section-title">6、【复合题】【${escapeHtml(type)}】</div>`;

    const { options, optionOrder } = parsePartbOptions(optionsText);

    // 选项 A-G
    optionOrder.forEach(letter => {
        html += `<p>[${letter}] ${Formatter.applyMarksHtml(options[letter] || '')}</p>`;
    });
    html += '<p>&nbsp;</p>';

    // 文章
    articleText.split('\n').forEach(line => {
        html += line.trim() ? `<p>${Formatter.applyMarksHtml(line)}</p>` : '<p>&nbsp;</p>';
    });

    html += '<p>分析：</p>';

    // 5个子题，题号从 startQnum 开始
    const answers = parsePartbAnswers(answersText);

    for (let i = 0; i < 5; i++) {
        const qnum = startQnum + i;
        const ansData = answers[qnum] || {};

        html += `<p>【${i + 1}】【单选题】${qnum}.</p>`;

        optionOrder.forEach(letter => {
            html += `<p>${letter}. ${Formatter.applyMarksHtml(options[letter] || '')}</p>`;
        });

        html += `<p class="answer-line">答：${escapeHtml(ansData.answer || '')}</p>`;

        if (ansData.explanation) {
            html += '<p>解：</p>';
            ansData.explanation.split('\n').forEach(line => {
                html += line.trim() ? `<p>${Formatter.applyMarksHtml(line)}</p>` : '<p>&nbsp;</p>';
            });
        }

        html += '<p>&nbsp;</p>';
    }

    return html;
}

function parsePartbOptions(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const options = {};
    const optionOrder = [];

    lines.forEach(line => {
        line = line.trim();
        const match = line.match(/^([A-G])\s*[.．\]]?\s*(.*)/);
        if (match) {
            const letter = match[1].toUpperCase();
            options[letter] = match[2];
            optionOrder.push(letter);
        }
    });

    return { options, optionOrder };
}

function parsePartbAnswers(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const answers = {};

    lines.forEach(line => {
        line = line.trim();
        const parts = line.split(/[|｜]/);
        if (parts.length >= 2) {
            const qnum = parseInt(parts[0]);
            if (!isNaN(qnum)) {
                answers[qnum] = {
                    answer: (parts[1] || '').trim().toUpperCase(),
                    explanation: parts[2] ? parts[2].trim() : '',
                };
            }
        }
    });

    return answers;
}

// ========== 翻译本地格式化 ==========
function formatTranslationLocal() {
    if (state.transType === 'yinger') {
        return formatTranslationYinger();
    }
    return formatTranslationYingyi();
}

function formatTranslationYingyi() {
    const article = document.getElementById('translation-article').value || '';
    const sentencesText = document.getElementById('translation-sentences').value || '';
    const transText = document.getElementById('translation-trans').value || '';
    const analysisText = document.getElementById('translation-analysis').value || '';

    let html = '<div class="section-title">7、【复合题】【翻译】</div>';

    const sentences = parseTranslationSentences(sentencesText);
    const translations = parseLineKeyValue(transText);
    const analysises = parseLineKeyValue(analysisText);

    // 文章 - 划线句加下划线
    let articleHtml = article;
    sentences.forEach(s => {
        if (s.text && articleHtml.includes(s.text)) {
            articleHtml = articleHtml.replaceAll(s.text, `__UNDERLINE_START__${s.text}__UNDERLINE_END__`);
        }
    });
    articleHtml = Formatter.applyMarksHtml(articleHtml);
    articleHtml = articleHtml.replace(/__UNDERLINE_START__/g, '<u>').replace(/__UNDERLINE_END__/g, '</u>');

    articleHtml.split('\n').forEach(line => {
        html += line.trim() ? `<p>${line}</p>` : '<p>&nbsp;</p>';
    });

    html += '<p>分析：</p>';

    sentences.forEach((sent, idx) => {
        const qnum = sent.qnum;
        const trans = translations[qnum] || '';
        const analysis = analysises[qnum] || '';

        html += `<p>【${idx + 1}】【解答题】(${qnum}) <u>${Formatter.applyMarksHtml(sent.text)}</u></p>`;

        html += '<p>答：</p>';
        if (trans) {
            trans.split('\n').forEach(line => {
                html += line.trim() ? `<p>${Formatter.applyMarksHtml(line)}</p>` : '<p>&nbsp;</p>';
            });
        }

        if (analysis) {
            html += '<p>解：</p>';
            analysis.split('\n').forEach(line => {
                html += line.trim() ? `<p>${Formatter.applyMarksHtml(line)}</p>` : '<p>&nbsp;</p>';
            });
        }

        html += '<p>&nbsp;</p>';
    });

    return html;
}

function formatTranslationYinger() {
    const source = document.getElementById('yinger-source').value || '';
    const translation = document.getElementById('yinger-translation').value || '';
    const analysis = document.getElementById('yinger-analysis').value || '';

    let html = '<div class="section-title">7、【解答题】【翻译】</div>';

    source.split('\n').forEach(line => {
        html += line.trim() ? `<p>${Formatter.applyMarksHtml(line)}</p>` : '<p>&nbsp;</p>';
    });

    html += '<p>答：</p>';
    if (translation) {
        translation.split('\n').forEach(line => {
            html += line.trim() ? `<p>${Formatter.applyMarksHtml(line)}</p>` : '<p>&nbsp;</p>';
        });
    }

    if (analysis) {
        html += '<p>解：</p>';
        analysis.split('\n').forEach(line => {
            html += line.trim() ? `<p>${Formatter.applyMarksHtml(line)}</p>` : '<p>&nbsp;</p>';
        });
    }

    return html;
}

function parseTranslationSentences(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const sentences = [];

    lines.forEach(line => {
        line = line.trim();
        const parts = line.split(/[|｜]/);
        if (parts.length >= 2) {
            const qnum = parseInt(parts[0]);
            if (!isNaN(qnum)) {
                sentences.push({ qnum, text: parts[1].trim() });
            }
        }
    });

    return sentences;
}

function parseLineKeyValue(text) {
    const lines = text.split('\n');
    const result = {};
    let currentKey = null;

    lines.forEach(line => {
        line = line.trim();
        const match = line.match(/^(\d+)\s*[|｜]\s*(.*)/);
        if (match) {
            currentKey = parseInt(match[1]);
            result[currentKey] = match[2];
        } else if (currentKey !== null && line) {
            result[currentKey] += '\n' + line;
        }
    });

    return result;
}

// ========== 写作本地格式化 ==========
function formatWritingLocal(isPartA) {
    const prefix = isPartA ? 'writing-a' : 'writing-b';
    const sectionNum = isPartA ? 8 : 9;
    const category = isPartA ? '小作文' : '大作文';
    const partLabel = isPartA ? 'Part A' : 'Part B';

    const directions = document.getElementById(`${prefix}-directions`).value || '';
    const essay = document.getElementById(`${prefix}-essay`).value || '';
    const translation = document.getElementById(`${prefix}-translation`).value || '';

    let html = `<div class="section-title">${sectionNum}、【写作题】【${category}】</div>`;

    html += `<p><strong>${partLabel}</strong></p><p>&nbsp;</p>`;

    directions.split('\n').forEach(line => {
        html += line.trim() ? `<p>${Formatter.applyMarksHtml(line)}</p>` : '<p>&nbsp;</p>';
    });

    html += '<p>答：</p>';
    html += '<p>【参考范文】</p>';

    essay.split('\n').forEach(line => {
        html += line.trim() ? `<p>${Formatter.applyMarksHtml(line)}</p>` : '<p>&nbsp;</p>';
    });

    html += '<p>解：</p>';
    html += '<p>【参考译文】</p>';

    translation.split('\n').forEach(line => {
        html += line.trim() ? `<p>${Formatter.applyMarksHtml(line)}</p>` : '<p>&nbsp;</p>';
    });

    return html;
}

// ========== 标点规范功能 ==========
function normalizePunct(textareaId, mode) {
    const el = document.getElementById(textareaId);
    if (!el) return;

    let text = el.value;

    if (mode === 'english') {
        text = Punct.toEnglishPunct(text);
    } else if (mode === 'chinese') {
        text = Punct.toChinesePunct(text);
    }

    el.value = text;
    el.dispatchEvent(new Event('input'));
    showToast('标点已规范', 'success');
}

function normalizeClozePunct() {
    const article = document.getElementById('cloze-article');
    const options = document.getElementById('cloze-options');
    const expl = document.getElementById('cloze-explanation');

    article.value = Punct.toEnglishPunct(article.value);
    options.value = Punct.toEnglishPunct(options.value);
    expl.value = Punct.toChinesePunct(expl.value);

    article.dispatchEvent(new Event('input'));
    showToast('标点已规范', 'success');
}

function normalizeReadingPunct() {
    const article = document.getElementById('reading-article');
    const questions = document.getElementById('reading-questions');
    const answers = document.getElementById('reading-answers');

    article.value = Punct.toEnglishPunct(article.value);
    questions.value = Punct.toEnglishPunct(questions.value);

    // 答案解析部分：答案是字母，解析是中文
    const lines = answers.value.split('\n');
    const newLines = lines.map(line => {
        const match = line.match(/^(\d+)\|([A-D])\|(.*)/);
        if (match) {
            return `${match[1]}|${match[2]}|${Punct.toChinesePunct(match[3])}`;
        }
        return line;
    });
    answers.value = newLines.join('\n');

    article.dispatchEvent(new Event('input'));
    showToast('标点已规范', 'success');
}

function normalizePartbPunct() {
    const options = document.getElementById('partb-options');
    const article = document.getElementById('partb-article');
    const answers = document.getElementById('partb-answers');

    options.value = Punct.toEnglishPunct(options.value);
    article.value = Punct.toEnglishPunct(article.value);

    const lines = answers.value.split('\n');
    const newLines = lines.map(line => {
        const match = line.match(/^(\d+)\|([A-G])\|(.*)/);
        if (match) {
            return `${match[1]}|${match[2]}|${Punct.toChinesePunct(match[3])}`;
        }
        return line;
    });
    answers.value = newLines.join('\n');

    document.getElementById('partb-options').dispatchEvent(new Event('input'));
    showToast('标点已规范', 'success');
}

function normalizeTranslationPunct() {
    if (state.transType === 'yingyi') {
        const article = document.getElementById('translation-article');
        const sentences = document.getElementById('translation-sentences');
        const trans = document.getElementById('translation-trans');
        const analysis = document.getElementById('translation-analysis');

        article.value = Punct.toEnglishPunct(article.value);
        sentences.value = Punct.toEnglishPunct(sentences.value);
        trans.value = Punct.toChinesePunct(trans.value);
        analysis.value = Punct.toChinesePunct(analysis.value);
    } else {
        const source = document.getElementById('yinger-source');
        const trans = document.getElementById('yinger-translation');
        const analysis = document.getElementById('yinger-analysis');

        source.value = Punct.toEnglishPunct(source.value);
        trans.value = Punct.toChinesePunct(trans.value);
        analysis.value = Punct.toChinesePunct(analysis.value);
    }

    document.getElementById('translation-article').dispatchEvent(new Event('input'));
    showToast('标点已规范', 'success');
}

function normalizeWritingPunct(part) {
    const prefix = part === 'a' ? 'writing-a' : 'writing-b';
    const dir = document.getElementById(`${prefix}-directions`);
    const essay = document.getElementById(`${prefix}-essay`);
    const trans = document.getElementById(`${prefix}-translation`);

    dir.value = Punct.toEnglishPunct(dir.value);
    essay.value = Punct.toEnglishPunct(essay.value);
    trans.value = Punct.toChinesePunct(trans.value);

    dir.dispatchEvent(new Event('input'));
    showToast('标点已规范', 'success');
}

// ========== 整卷导入（纯前端） ==========
function initImportButtons() {
    document.getElementById('btn-parse').addEventListener('click', parseFullExam);
    document.getElementById('btn-clear-import').addEventListener('click', clearImport);
}

function initExportButtons() {
    document.getElementById('btn-export-full').addEventListener('click', exportFullPaper);
}

function parseFullExam() {
    const examText = document.getElementById('exam-text').value;
    const answerText = document.getElementById('answer-text').value;
    const statusEl = document.getElementById('parse-status');

    if (!examText.trim()) {
        statusEl.textContent = '请输入试题文本';
        statusEl.className = 'parse-status error';
        return;
    }

    statusEl.textContent = '正在智能拆分...';
    statusEl.className = 'parse-status';

    try {
        // 直接使用前端 Parser 解析
        const examResult = Parser.parseExamText(examText);

        let answerResult = {
            cloze: {}, reading: {}, partb: {}, translation: {},
            writing_a: {}, writing_b: {},
        };
        if (answerText.trim()) {
            answerResult = Parser.parseAnswerText(answerText);
        }

        fillExamData(examResult, answerResult);

        // 计算统计
        const stats = calcStats(examResult, answerResult);
        showParseStats(stats.exam, stats.answer);

        statusEl.textContent = '✓ 拆分完成！已填充到各题型标签页';
        statusEl.className = 'parse-status success';
        showToast('智能拆分成功！', 'success');

    } catch (e) {
        console.error(e);
        statusEl.textContent = '错误：' + e.message;
        statusEl.className = 'parse-status error';
        showToast('拆分失败：' + e.message, 'error');
    }
}

function calcStats(examData, answerData) {
    const examStats = {
        has_cloze: !!examData.cloze,
        cloze_questions: (examData.cloze && examData.cloze.questions) ? examData.cloze.questions.length : 0,
        reading_count: (examData.reading || []).length,
        reading_questions: (examData.reading || []).reduce((sum, t) => sum + (t.questions ? t.questions.length : 0), 0),
        has_partb: !!examData.partb,
        partb_items: (examData.partb && examData.partb.items) ? examData.partb.items.length : 0,
        has_translation: !!examData.translation,
        translation_sentences: (examData.translation && examData.translation.underlined_sentences) ? examData.translation.underlined_sentences.length : 0,
        has_writing_a: !!(examData.writing_a && examData.writing_a.directions),
        has_writing_b: !!(examData.writing_b && examData.writing_b.directions),
    };
    return { exam: examStats, answer: {} };
}

function clearImport() {
    document.getElementById('exam-text').value = '';
    document.getElementById('answer-text').value = '';
    document.getElementById('parse-status').textContent = '';
    document.getElementById('parse-stats').classList.remove('show');
}

function showParseStats(examStats, answerStats) {
    const statsEl = document.getElementById('parse-stats');
    let html = '<h3>📊 解析结果统计</h3>';
    html += '<div class="stats-grid">';

    if (examStats.has_cloze) {
        html += `<div class="stat-item"><div class="stat-num">${examStats.cloze_questions || 0}</div><div class="stat-label">完形填空</div></div>`;
    }
    if (examStats.reading_count) {
        html += `<div class="stat-item"><div class="stat-num">${examStats.reading_count}篇/${examStats.reading_questions || 0}题</div><div class="stat-label">阅读理解</div></div>`;
    }
    if (examStats.has_partb) {
        html += `<div class="stat-item"><div class="stat-num">${examStats.partb_items || 0}</div><div class="stat-label">新题型</div></div>`;
    }
    if (examStats.has_translation) {
        html += `<div class="stat-item"><div class="stat-num">${examStats.translation_sentences || 0}</div><div class="stat-label">翻译句子</div></div>`;
    }
    if (examStats.has_writing_a) {
        html += `<div class="stat-item"><div class="stat-num">✓</div><div class="stat-label">小作文</div></div>`;
    }
    if (examStats.has_writing_b) {
        html += `<div class="stat-item"><div class="stat-num">✓</div><div class="stat-label">大作文</div></div>`;
    }

    html += '</div>';
    statsEl.innerHTML = html;
    statsEl.classList.add('show');
}

function fillExamData(examData, answerData) {
    // 完形
    if (examData.cloze) {
        const cloze = examData.cloze;
        state.examData.cloze = cloze;
        state.answerData.cloze = answerData.cloze || {};

        document.getElementById('cloze-article').value = cloze.article || '';

        const optLines = (cloze.questions || []).map(q => {
            const parts = (q.option_order || q.optionOrder || []).map(l => `${l}. ${q.options[l]}`).join(' ');
            return `${q.qnum} ${parts}`;
        });
        document.getElementById('cloze-options').value = optLines.join('\n');

        const answerStr = (cloze.questions || []).map(q => {
            return (answerData.cloze && answerData.cloze[q.qnum])
                ? answerData.cloze[q.qnum].answer : '';
        }).join('');
        document.getElementById('cloze-answer').value = answerStr;

        const explLines = (cloze.questions || []).map(q => {
            const expl = (answerData.cloze && answerData.cloze[q.qnum])
                ? answerData.cloze[q.qnum].explanation : '';
            return expl ? `${q.qnum}|${expl.split('\n').join(' ')}` : '';
        }).filter(l => l);
        document.getElementById('cloze-explanation').value = explLines.join('\n');

        updatePreview('cloze');
    }

    // 阅读
    if (examData.reading && examData.reading.length > 0) {
        state.examData.reading = [];
        state.answerData.reading = answerData.reading || {};

        examData.reading.forEach((textData, idx) => {
            state.examData.reading[idx] = textData;

            const qLines = [];
            (textData.questions || []).forEach(q => {
                qLines.push(`${q.qnum}. ${q.stem}`);
                (q.option_order || q.optionOrder || []).forEach(l => qLines.push(`${l}. ${q.options[l]}`));
            });

            const ansLines = [];
            (textData.questions || []).forEach(q => {
                const ans = (answerData.reading && answerData.reading[q.qnum])
                    ? answerData.reading[q.qnum].answer : '';
                const expl = (answerData.reading && answerData.reading[q.qnum])
                    ? answerData.reading[q.qnum].explanation : '';
                if (ans || expl) ansLines.push(`${q.qnum}|${ans}|${expl.split('\n').join(' ')}`);
            });

            textData._raw_article = textData.article || '';
            textData._raw_questions = qLines.join('\n');
            textData._raw_answers = ansLines.join('\n');
        });

        loadReadingText(state.currentText);
        updatePreview('reading');
    }

    // 新题型
    if (examData.partb) {
        const partb = examData.partb;
        state.examData.partb = partb;
        state.answerData.partb = answerData.partb || {};

        document.getElementById('partb-type').value = partb.type || '小标题';

        const optLines = (partb.option_order || partb.optionOrder || []).map(l => `${l} ${partb.options[l]}`);
        document.getElementById('partb-options').value = optLines.join('\n');

        // 更新起始题号
        if (partb.items && partb.items.length > 0) {
            state.partbStartQnum = partb.items[0].qnum;
            document.getElementById('partb-start-qnum').value = partb.items[0].qnum;
        }

        let articleParts = [];
        if (partb.intro_paragraph) articleParts.push(partb.intro_paragraph);
        (partb.items || []).forEach(item => {
            articleParts.push(`${item.qnum}._______________________________`);
            articleParts.push(item.paragraph || '');
            articleParts.push('');
        });
        document.getElementById('partb-article').value = articleParts.join('\n');

        const ansLines = (partb.items || []).map(item => {
            const ans = (answerData.partb && answerData.partb[item.qnum])
                ? answerData.partb[item.qnum].answer : '';
            const expl = (answerData.partb && answerData.partb[item.qnum])
                ? answerData.partb[item.qnum].explanation : '';
            return `${item.qnum}|${ans}|${expl.split('\n').join(' ')}`;
        });
        document.getElementById('partb-answers').value = ansLines.join('\n');

        updatePreview('partb');
    }

    // 翻译
    if (examData.translation) {
        const trans = examData.translation;
        state.examData.translation = trans;
        state.answerData.translation = answerData.translation || {};

        document.getElementById('translation-article').value = trans.article_text || '';

        const sentLines = (trans.underlined_sentences || []).map(s => `${s.qnum}|${s.text}`);
        document.getElementById('translation-sentences').value = sentLines.join('\n');

        const transLines = (trans.underlined_sentences || []).map(s => {
            const tr = (answerData.translation && answerData.translation[s.qnum])
                ? answerData.translation[s.qnum].translation : '';
            return `${s.qnum}|${tr.split('\n').join(' ')}`;
        });
        document.getElementById('translation-trans').value = transLines.join('\n');

        const analysisLines = (trans.underlined_sentences || []).map(s => {
            const a = (answerData.translation && answerData.translation[s.qnum])
                ? answerData.translation[s.qnum].analysis : '';
            return `${s.qnum}|${a.split('\n').join(' ')}`;
        });
        document.getElementById('translation-analysis').value = analysisLines.join('\n');

        updatePreview('translation');
    }

    // 小作文
    if (examData.writing_a) {
        state.examData.writing_a = examData.writing_a;
        state.answerData.writing_a = answerData.writing_a || {};

        document.getElementById('writing-a-directions').value = examData.writing_a.directions || '';
        document.getElementById('writing-a-essay').value = (answerData.writing_a && answerData.writing_a.model_essay) || '';
        document.getElementById('writing-a-translation').value = (answerData.writing_a && answerData.writing_a.translation) || '';

        updatePreview('writing-a');
    }

    // 大作文
    if (examData.writing_b) {
        state.examData.writing_b = examData.writing_b;
        state.answerData.writing_b = answerData.writing_b || {};

        document.getElementById('writing-b-directions').value = examData.writing_b.directions || '';
        document.getElementById('writing-b-essay').value = (answerData.writing_b && answerData.writing_b.model_essay) || '';
        document.getElementById('writing-b-translation').value = (answerData.writing_b && answerData.writing_b.translation) || '';

        updatePreview('writing-b');
    }
}

// ========== 富文本复制 ==========
function copyRichText(type) {
    const previewId = {
        'cloze': 'cloze-preview',
        'reading': 'reading-preview',
        'partb': 'partb-preview',
        'translation': 'translation-preview',
        'writing-a': 'writing-a-preview',
        'writing-b': 'writing-b-preview',
    }[type];

    const previewEl = document.getElementById(previewId);
    if (!previewEl) return;

    const htmlContent = previewEl.innerHTML;
    const plainText = previewEl.innerText;

    if (navigator.clipboard && window.ClipboardItem) {
        const htmlBlob = new Blob([htmlContent], { type: 'text/html' });
        const textBlob = new Blob([plainText], { type: 'text/plain' });

        navigator.clipboard.write([
            new ClipboardItem({
                'text/html': htmlBlob,
                'text/plain': textBlob,
            })
        ]).then(() => {
            showToast('已复制（含格式），可直接粘贴到Word', 'success');
        }).catch(() => {
            fallbackCopy(plainText);
        });
    } else {
        fallbackCopy(plainText);
    }
}

function fallbackCopy(text) {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    try {
        document.execCommand('copy');
        showToast('已复制（纯文本）', 'success');
    } catch (e) {
        showToast('复制失败', 'error');
    }
    document.body.removeChild(textarea);
}

// ========== Word 导出（前端 docx.js） ==========
async function exportDocx(type) {
    let data, answers;

    switch(type) {
        case 'cloze':
            data = collectClozeData();
            answers = collectClozeAnswers();
            break;
        case 'reading':
            data = collectReadingData();
            answers = collectReadingAnswers();
            break;
        case 'partb':
            data = collectPartbData();
            answers = collectPartbAnswers();
            break;
        case 'translation':
            data = collectTranslationData();
            answers = collectTranslationAnswers();
            break;
        case 'writing_a':
            data = collectWritingData(true);
            answers = collectWritingAnswers(true);
            break;
        case 'writing_b':
            data = collectWritingData(false);
            answers = collectWritingAnswers(false);
            break;
        default:
            return;
    }

    showToast('正在生成Word...');

    try {
        if (type === 'cloze') {
            await DocxGen.generateCloze(data, answers);
        } else if (type === 'reading') {
            await DocxGen.generateReading(data, answers);
        } else if (type === 'partb') {
            await DocxGen.generatePartb(data, answers);
        } else if (type === 'translation') {
            await DocxGen.generateTranslation(data, answers, state.transType);
        } else if (type === 'writing_a') {
            await DocxGen.generateWriting(data, answers, true);
        } else if (type === 'writing_b') {
            await DocxGen.generateWriting(data, answers, false);
        }
        showToast('Word 下载成功！', 'success');
    } catch (e) {
        console.error(e);
        showToast('生成失败：' + e.message, 'error');
    }
}

async function exportFullPaper() {
    const examData = {
        cloze: collectClozeData(),
        reading: collectAllReadingData(),
        partb: collectPartbData(),
        translation: collectTranslationData(),
        writing_a: collectWritingData(true),
        writing_b: collectWritingData(false),
    };

    const answerData = {
        cloze: collectClozeAnswers(),
        reading: collectAllReadingAnswers(),
        partb: collectPartbAnswers(),
        translation: collectTranslationAnswers(),
        writing_a: collectWritingAnswers(true),
        writing_b: collectWritingAnswers(false),
    };

    showToast('正在生成整卷Word...');

    try {
        await DocxGen.generateFullPaper(examData, answerData, state.paperType, state.transType);
        showToast('整卷 Word 下载成功！', 'success');
    } catch (e) {
        console.error(e);
        showToast('生成失败：' + e.message, 'error');
    }
}

// ========== 数据收集 ==========

function collectClozeData() {
    const article = document.getElementById('cloze-article').value || '';
    const optionsText = document.getElementById('cloze-options').value || '';
    const questions = parseClozeOptions(optionsText);
    // 转换为 option_order 格式（与 Python 端一致）
    const qs = questions.map(q => ({
        qnum: q.qnum,
        options: q.options,
        option_order: q.optionOrder,
    }));
    return { article, questions: qs };
}

function collectClozeAnswers() {
    const answer = document.getElementById('cloze-answer').value || '';
    const explText = document.getElementById('cloze-explanation').value || '';
    const explanations = parseClozeExplanations(explText);
    const questions = parseClozeOptions(document.getElementById('cloze-options').value || '');

    const answers = {};
    questions.forEach((q, idx) => {
        answers[q.qnum] = {
            answer: (answer[idx] || '').toUpperCase(),
            explanation: explanations[idx] || '',
        };
    });
    return answers;
}

function collectReadingData() {
    const article = document.getElementById('reading-article').value || '';
    const questionsText = document.getElementById('reading-questions').value || '';
    const questions = parseReadingQuestions(questionsText);
    // 转换为 option_order 格式
    const qs = questions.map(q => ({
        qnum: q.qnum,
        stem: q.stem,
        options: q.options,
        option_order: q.optionOrder,
    }));
    return {
        text_num: state.currentText + 1,
        article,
        questions: qs,
    };
}

function collectReadingAnswers() {
    return parseReadingAnswers(document.getElementById('reading-answers').value || '');
}

function collectAllReadingData() {
    saveCurrentReadingText();
    const result = [];
    for (let i = 0; i < 4; i++) {
        if (state.examData.reading[i]) {
            const data = state.examData.reading[i];
            // 重新从 raw 数据构建
            if (data._raw_article !== undefined) {
                const qs = parseReadingQuestions(data._raw_questions || '');
                result.push({
                    text_num: i + 1,
                    article: data._raw_article,
                    questions: qs.map(q => ({
                        qnum: q.qnum,
                        stem: q.stem,
                        options: q.options,
                        option_order: q.optionOrder,
                    })),
                });
            } else if (data.article) {
                result.push(data);
            }
        }
    }
    return result;
}

function collectAllReadingAnswers() {
    const allAnswers = {};
    for (let i = 0; i < 4; i++) {
        if (state.examData.reading[i] && state.examData.reading[i]._raw_answers) {
            const ans = parseReadingAnswers(state.examData.reading[i]._raw_answers);
            Object.assign(allAnswers, ans);
        }
    }
    return allAnswers;
}

function collectPartbData() {
    const type = document.getElementById('partb-type').value || '小标题';
    const optionsText = document.getElementById('partb-options').value || '';
    const articleText = document.getElementById('partb-article').value || '';
    const startQnum = state.partbStartQnum;

    const { options, optionOrder } = parsePartbOptions(optionsText);

    // 构造5个items
    const items = [];
    for (let i = 0; i < 5; i++) {
        items.push({ qnum: startQnum + i, paragraph: '' });
    }

    return {
        type,
        options,
        option_order: optionOrder,
        intro_paragraph: '',
        items,
        article_text: articleText,
    };
}

function collectPartbAnswers() {
    return parsePartbAnswers(document.getElementById('partb-answers').value || '');
}

function collectTranslationData() {
    if (state.transType === 'yinger') {
        return {
            paper_type: 'yinger',
            source: document.getElementById('yinger-source').value || '',
        };
    }

    const article = document.getElementById('translation-article').value || '';
    const sentencesText = document.getElementById('translation-sentences').value || '';
    return {
        paper_type: 'yingyi',
        article_text: article,
        underlined_sentences: parseTranslationSentences(sentencesText),
    };
}

function collectTranslationAnswers() {
    if (state.transType === 'yinger') {
        return {
            translation: document.getElementById('yinger-translation').value || '',
            analysis: document.getElementById('yinger-analysis').value || '',
        };
    }

    const transText = document.getElementById('translation-trans').value || '';
    const analysisText = document.getElementById('translation-analysis').value || '';
    const translations = parseLineKeyValue(transText);
    const analysises = parseLineKeyValue(analysisText);

    const answers = {};
    Object.keys(translations).forEach(qnum => {
        answers[qnum] = { translation: translations[qnum] || '', analysis: analysises[qnum] || '' };
    });
    Object.keys(analysises).forEach(qnum => {
        if (!answers[qnum]) {
            answers[qnum] = { translation: '', analysis: analysises[qnum] || '' };
        }
    });
    return answers;
}

function collectWritingData(isPartA) {
    const prefix = isPartA ? 'writing-a' : 'writing-b';
    return { directions: document.getElementById(`${prefix}-directions`).value || '' };
}

function collectWritingAnswers(isPartA) {
    const prefix = isPartA ? 'writing-a' : 'writing-b';
    return {
        model_essay: document.getElementById(`${prefix}-essay`).value || '',
        translation: document.getElementById(`${prefix}-translation`).value || '',
    };
}

// ========== 工具函数 ==========

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function showToast(message, type = '') {
    const toast = document.getElementById('toast');
    toast.textContent = message;
    toast.className = 'toast show ' + type;

    setTimeout(() => toast.classList.remove('show'), 2500);
}
