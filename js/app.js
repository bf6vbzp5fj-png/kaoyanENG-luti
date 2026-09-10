/**
 * 考研英语录题格式转换工具 - 前端主逻辑（纯前端版）
 * 所有功能在浏览器中运行，不需要后端服务器
 */

// ========== 全局状态 ==========
const state = {
    mode: 'zhenti', // zhenti / yuece
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
    // 月测模式状态
    yuece: {
        vocabSubtab: 'part1', // part1 / part2
        examData: {
            grammar: null,
            vocab_part1: null,
            vocab_part2: null,
            cloze: null,
            translation: null,
        },
        answerData: {
            grammar: {},
            vocab_part1: {},
            vocab_part2: {},
            cloze: {},
            translation: {},
        },
    },
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
    updatePreview('grammar');
    updatePreview('vocab');
    updatePreview('yuece-cloze');
    updatePreview('yuece-translation');
});

// ========== 模式切换（真题/月测） ==========
function switchMode(mode) {
    state.mode = mode;

    const zhentiTabs = document.querySelector('.zhenti-tabs');
    const yueceTabs = document.querySelector('.yuece-tabs');
    const paperTypeSwitch = document.getElementById('paper-type-switch');

    if (mode === 'yuece') {
        // 切换到月测
        if (zhentiTabs) zhentiTabs.style.display = 'none';
        if (yueceTabs) yueceTabs.style.display = 'flex';
        if (paperTypeSwitch) paperTypeSwitch.style.display = 'none';

        // 隐藏所有真题tab-content，激活月测第一个tab
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const firstYueceTab = document.getElementById('tab-import-yuece');
        if (firstYueceTab) firstYueceTab.classList.add('active');

        // 更新tab按钮状态：仅月测组第一个激活
        document.querySelectorAll('.zhenti-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.yuece-tabs .tab-btn').forEach((b, i) => {
            b.classList.toggle('active', i === 0);
        });

        showToast('已切换到月测模式');
    } else {
        // 切换到真题
        if (zhentiTabs) zhentiTabs.style.display = 'flex';
        if (yueceTabs) yueceTabs.style.display = 'none';
        if (paperTypeSwitch) paperTypeSwitch.style.display = 'flex';

        // 隐藏所有月测tab-content，激活真题第一个tab
        document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
        const firstZhentiTab = document.getElementById('tab-import-zhenti');
        if (firstZhentiTab) firstZhentiTab.classList.add('active');

        // 更新tab按钮状态：仅真题组第一个激活
        document.querySelectorAll('.yuece-tabs .tab-btn').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.zhenti-tabs .tab-btn').forEach((b, i) => {
            b.classList.toggle('active', i === 0);
        });

        showToast('已切换到真题/模拟模式');
    }
}

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

            // 只在当前tab组内切换激活状态
            const parentNav = btn.closest('.tabs');
            if (parentNav) {
                parentNav.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
            }
            btn.classList.add('active');

            tabContents.forEach(c => c.classList.remove('active'));
            const target = document.getElementById('tab-' + tab);
            if (target) target.classList.add('active');

            if (['cloze', 'reading', 'partb', 'translation', 'writing-a', 'writing-b',
                 'grammar', 'vocab', 'yuece-cloze', 'yuece-translation'].includes(tab)) {
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

    // 完形答案框：失去焦点时自动清洗空格换行，强制连写
    const clozeAnswerEl = document.getElementById('cloze-answer');
    if (clozeAnswerEl) {
        clozeAnswerEl.addEventListener('blur', function() {
            let val = this.value.replace(/\s+/g, '').toUpperCase();
            if (val !== this.value) {
                this.value = val;
                updatePreview('cloze');
                showToast('答案已自动连写');
            }
        });
    }
    setup(['reading-article', 'reading-questions', 'reading-answers'], 'reading');
    setup(['partb-type', 'partb-options', 'partb-article', 'partb-answers', 'partb-start-qnum'], 'partb');
    setup(['translation-article', 'translation-sentences', 'translation-trans', 'translation-analysis',
           'yinger-source', 'yinger-translation', 'yinger-analysis'], 'translation');
    setup(['writing-a-directions', 'writing-a-essay', 'writing-a-translation'], 'writing-a');
    setup(['writing-b-directions', 'writing-b-essay', 'writing-b-translation'], 'writing-b');
    // 月测题型
    setup(['grammar-questions', 'grammar-answers'], 'grammar');
    setup(['vocab-part1-questions', 'vocab-part1-answers', 'vocab-part2-questions', 'vocab-part2-answers'], 'vocab');
    setup(['yuece-cloze-article', 'yuece-cloze-options', 'yuece-cloze-answer', 'yuece-cloze-explanation'], 'yuece-cloze');
    setup(['yuece-trans-sentences', 'yuece-trans-translation', 'yuece-trans-analysis'], 'yuece-translation');

    // 粘贴自动转换：从Word/网页粘贴时，自动把 <u>下划线</u> 转成 __下划线__ 标记
    const pasteIds = [
        // 整卷导入
        'exam-text', 'answer-text',
        'yuece-exam-text', 'yuece-answer-text',
        // 月测题型
        'grammar-questions', 'grammar-answers',
        'vocab-part1-questions', 'vocab-part1-answers',
        'vocab-part2-questions', 'vocab-part2-answers',
        'yuece-cloze-article', 'yuece-cloze-options',
        'yuece-cloze-answer', 'yuece-cloze-explanation',
        'yuece-trans-sentences', 'yuece-trans-translation', 'yuece-trans-analysis',
        // 真题题型
        'cloze-article', 'cloze-options', 'cloze-answer', 'cloze-explanation',
        'reading-article', 'reading-questions', 'reading-answers',
        'partb-options', 'partb-article', 'partb-answers',
        'translation-article', 'translation-sentences', 'translation-trans', 'translation-analysis',
        'yinger-source', 'yinger-translation', 'yinger-analysis',
    ];
    pasteIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('paste', function(e) {
                const html = (e.clipboardData || window.clipboardData).getData('text/html');
                if (!html) return; // 纯文本粘贴走默认
                e.preventDefault();
                const text = htmlToMarkedText(html);
                
                // 完形文章框：自动拆分文章和选项（粘贴内容含选项行时）
                if (id === 'cloze-article' || id === 'yuece-cloze-article') {
                    const { article, options } = splitClozeArticleAndOptions(text);
                    if (options) {
                        this.value = article;
                        const optId = id === 'cloze-article' ? 'cloze-options' : 'yuece-cloze-options';
                        const optEl = document.getElementById(optId);
                        if (optEl) {
                            optEl.value = options;
                            optEl.dispatchEvent(new Event('input'));
                        }
                        // 光标放末尾
                        this.setSelectionRange(article.length, article.length);
                        this.dispatchEvent(new Event('input'));
                        return;
                    }
                }
                
                // 在光标位置插入
                const start = this.selectionStart;
                const end = this.selectionEnd;
                const before = this.value.substring(0, start);
                const after = this.value.substring(end);
                this.value = before + text + after;
                // 恢复光标位置
                const newPos = start + text.length;
                this.setSelectionRange(newPos, newPos);
                // 触发更新
                this.dispatchEvent(new Event('input'));
            });
        }
    });

    // 拆分完形文章和选项：检测到选项行返回 {article, options}，否则返回 {article: text, options: ''}
    function splitClozeArticleAndOptions(text) {
        // 先尝试按行匹配（标准格式）
        const lines = text.split('\n');
        const optionLines = [];
        const articleLines = [];
        let foundOptions = false;
        // 选项行格式：数字 A.xxx B.xxx C.xxx D.xxx 或 数字. [A]xxx [B]xxx
        const optLinePattern = /^\s*\d+\s*[.．]?\s*(?:[A-Da-d][.．\)]|\[[A-Da-d]\])\s*\S/;

        for (let i = 0; i < lines.length; i++) {
            const trimmed = lines[i].trim();
            if (!trimmed) {
                if (foundOptions) {
                    optionLines.push('');
                } else {
                    articleLines.push('');
                }
                continue;
            }
            if (optLinePattern.test(trimmed)) {
                foundOptions = true;
                optionLines.push(trimmed);
            } else if (foundOptions) {
                optionLines.push(lines[i]);
            } else {
                articleLines.push(lines[i]);
            }
        }

        if (foundOptions) {
            while (articleLines.length > 0 && articleLines[articleLines.length - 1].trim() === '') articleLines.pop();
            while (optionLines.length > 0 && optionLines[optionLines.length - 1].trim() === '') optionLines.pop();
            return { article: articleLines.join('\n'), options: optionLines.join('\n') };
        }

        // 再尝试连写格式：文章末尾紧跟 1. [A]... 2. [A]... 这样的选项
        // 匹配第一个 "数字. [字母]" 或 "数字 字母." 的位置
        const inlinePattern = /(\d+)\s*[.．]?\s*(?:\[[A-Da-d]\]|[A-Da-d][.．\)])\s*\S/;
        // 从后往前找第20题附近，或从前往后找第1题
        let match = text.match(inlinePattern);
        if (match && match.index > 50) { // 文章至少50个字符才合理
            const articlePart = text.substring(0, match.index).trim();
            const optionsPart = text.substring(match.index).trim();
            // 把选项拆成每行一题：在 数字. [字母] 前面换行
            const formattedOptions = optionsPart
                .replace(/(\d+)\s*[.．]?\s*(?=\[[A-Da-d]\]|[A-Da-d][.．\)])/g, '\n$1. ')
                .trim();
            return { article: articlePart, options: formattedOptions };
        }

        return { article: text, options: '' };
    }

    // 快捷键：Ctrl+U 加下划线、Ctrl+B 加粗
    pasteIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('keydown', function(e) {
                if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'u') {
                    e.preventDefault();
                    wrapSelection(this, '__', '__');
                } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'b') {
                    e.preventDefault();
                    wrapSelection(this, '**', '**');
                }
            });
        }
    });
}

// 给 textarea 中选中的文字包上前缀后缀
function wrapSelection(textarea, prefix, suffix) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const value = textarea.value;
    const selected = value.substring(start, end);

    // 如果选中文字已经被相同标记包裹，则取消包裹
    const alreadyWrapped = value.substring(start - prefix.length, start) === prefix
        && value.substring(end, end + suffix.length) === suffix;

    let newValue;
    let newStart, newEnd;
    if (alreadyWrapped && selected) {
        newValue = value.substring(0, start - prefix.length) + selected + value.substring(end + suffix.length);
        newStart = start - prefix.length;
        newEnd = newStart + selected.length;
    } else {
        newValue = value.substring(0, start) + prefix + selected + suffix + value.substring(end);
        newStart = start + prefix.length;
        newEnd = start + prefix.length + selected.length;
    }

    textarea.value = newValue;
    textarea.setSelectionRange(newStart, newEnd);
    textarea.dispatchEvent(new Event('input'));
}

// 将HTML片段转换为带 __下划线__ / **加粗** 标记的纯文本
function htmlToMarkedText(html) {
    if (!html) return '';

    // 先清洗：移除 style/script/head 及 Word 的条件注释、命名空间垃圾
    let cleaned = html;
    cleaned = cleaned.replace(/<!DOCTYPE[^>]*>/gi, '');
    cleaned = cleaned.replace(/<\?xml[^>]*\?>/gi, '');
    cleaned = cleaned.replace(/<!--\[if[^>]*>[\s\S]*?<!\[endif\]-->/gi, '');
    cleaned = cleaned.replace(/<!--[\s\S]*?-->/g, '');
    cleaned = cleaned.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');
    cleaned = cleaned.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
    cleaned = cleaned.replace(/<head[^>]*>[\s\S]*?<\/head>/gi, '');
    cleaned = cleaned.replace(/<\/?[a-z]+:[^>]*>/gi, ''); // Office命名空间标签
    cleaned = cleaned.replace(/<!\[if[^>]*>/gi, '');

    const div = document.createElement('div');
    div.innerHTML = cleaned;

    // 收集所有"字符 + 格式属性"对，避免嵌套标签导致标记叠加
    const chars = []; // [{c: 'x', underline: bool, bold: bool}]

    function collectChars(node, underline, bold) {
        if (node.nodeType === Node.TEXT_NODE) {
            const text = node.textContent;
            for (let i = 0; i < text.length; i++) {
                chars.push({ c: text[i], underline, bold });
            }
            return;
        }
        if (node.nodeType !== Node.ELEMENT_NODE) return;

        const tag = node.tagName.toLowerCase();

        // 完全跳过这些标签
        const skipTags = ['style', 'script', 'head', 'title', 'meta', 'link', 'base', 'noscript'];
        if (skipTags.includes(tag)) return;

        // 检查当前元素是否增加下划线
        let addUnderline = false;
        let addBold = false;

        const style = node.getAttribute('style') || '';

        // 下划线：<u>/<ins> 或 style 中含 text-decoration: underline
        if (tag === 'u' || tag === 'ins') {
            addUnderline = true;
        } else if (style.includes('text-decoration')) {
            if (/text-decoration\s*:[^;]*underline/i.test(style)) {
                addUnderline = true;
            }
        }

        // 加粗：<b>/<strong> 或 style 中 font-weight >= 600 且不是 normal/normal数值
        if (tag === 'b' || tag === 'strong') {
            addBold = true;
        } else if (style.includes('font-weight')) {
            const m = style.match(/font-weight\s*:\s*([a-z0-9]+)/i);
            if (m) {
                const val = m[1].toLowerCase();
                // 只明确认定 bold/700/800/900 为加粗，避免 normal/400/500 误判
                if (val === 'bold' || val === 'bolder' || val === '700' || val === '800' || val === '900' || val === '600') {
                    addBold = true;
                }
            }
        }

        const newUnderline = underline || addUnderline;
        const newBold = bold || addBold;

        // 块级元素先加换行
        const blockTags = ['p', 'div', 'br', 'li', 'tr', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
                           'table', 'tbody', 'thead', 'tfoot', 'td', 'th', 'ul', 'ol', 'dl',
                           'dd', 'dt', 'section', 'article', 'aside', 'nav', 'header', 'footer',
                           'pre', 'blockquote'];

        if (tag === 'br') {
            chars.push({ c: '\n', underline: false, bold: false });
        } else if (blockTags.includes(tag)) {
            chars.push({ c: '\n', underline: false, bold: false });
        }

        for (const child of node.childNodes) {
            collectChars(child, newUnderline, newBold);
        }

        if (blockTags.includes(tag) && tag !== 'br') {
            chars.push({ c: '\n', underline: false, bold: false });
        }
    }

    collectChars(div, false, false);

    // 从字符序列生成带标记的文本
    // 规则：__下划线__ 和 **加粗** 按连续同格式的片段包裹
    let result = '';
    let i = 0;
    while (i < chars.length) {
        const ch = chars[i];
        // 找连续相同格式的片段
        let j = i;
        while (j < chars.length && chars[j].underline === ch.underline && chars[j].bold === ch.bold) {
            j++;
        }
        let segment = '';
        for (let k = i; k < j; k++) {
            segment += chars[k].c;
        }

        // 对非空白内容加格式标记（空白不加，避免下划线/加粗伸出一截）
        if (segment.trim() && (ch.underline || ch.bold)) {
            // 把前后空格剥离，标记只包文字
            const leading = segment.match(/^\s*/)[0];
            const trailing = segment.match(/\s*$/)[0];
            const trimmed = segment.trim();
            let wrapped = trimmed;
            if (ch.underline) wrapped = `__${wrapped}__`;
            if (ch.bold) wrapped = `**${wrapped}**`;
            segment = leading + wrapped + trailing;
        }

        result += segment;
        i = j;
    }

    // 清理空行和首尾空白
    result = result.replace(/\n{3,}/g, '\n\n');
    result = result.replace(/^\n+|\n+$/g, '');
    // 把不间断空格换成普通空格
    result = result.replace(/\u00a0/g, ' ');

    return result;
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
        case 'grammar':
            html = formatGrammarLocal();
            document.getElementById('grammar-preview').innerHTML = html;
            break;
        case 'vocab':
            html = formatVocabLocal();
            document.getElementById('vocab-preview').innerHTML = html;
            break;
        case 'yuece-cloze':
            html = formatYueceClozeLocal();
            document.getElementById('yuece-cloze-preview').innerHTML = html;
            break;
        case 'yuece-translation':
            html = formatYueceTranslationLocal();
            document.getElementById('yuece-translation-preview').innerHTML = html;
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
    // __ 中间必须有非下划线字符才算标记，避免匹配到空位的纯下划线串（如 ________）
    const lines = text.split('\n');
    return lines.map(line => {
        let result = line;
        // **加粗**
        result = result.replace(/\*\*(.+?)\*\*/g, (match, content) => `<b>${content}</b>`);
        // __下划线__ （但要注意不要和空位数字的 <u> 冲突，只处理非数字且非纯下划线的）
        result = result.replace(/__([^_]+?)__/g, (match, content) => {
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
        // 支持两种题号格式：1 A.xxx  或  【1】A.xxx
        const qMatch = line.match(/^【(\d+)】\s*(.*)/) || line.match(/^(\d+)\s*(.*)/);
        if (!qMatch) return;

        const qnum = parseInt(qMatch[1]);
        const rest = qMatch[2];

        const options = {};
        const optionOrder = [];

        // 模式1: [A] text [B] text ... （方括号格式）
        const bracketMatches = [...rest.matchAll(/\[([A-D])\]/gi)];
        if (bracketMatches.length >= 2) {
            bracketMatches.forEach((m, i) => {
                const letter = m[1].toUpperCase();
                const start = m.index + m[0].length;
                const end = i < bracketMatches.length - 1 ? bracketMatches[i + 1].index : rest.length;
                let optText = rest.substring(start, end).trim();
                optText = optText.replace(/^[.．\s]+/, '').trim();
                options[letter] = optText;
                optionOrder.push(letter);
            });
        }

        // 模式2: A. text B. text ... （点号格式）
        if (optionOrder.length === 0) {
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
    let currentIdx = -1;

    lines.forEach(line => {
        line = line.trim();
        let matched = false;

        // 模式1: 1|解析内容 / 1.解析 / 1：解析 等数字+分隔符格式
        const match1 = line.match(/^(\d+)[|｜\.:：、]\s*(.*)/);
        if (match1) {
            const idx = parseInt(match1[1]) - 1;
            let content = match1[2];
            // 如果内容以 【答案】 开头，跳过答案部分，取后面的
            if (content.indexOf('【答案】') >= 0) {
                const ansIdx = content.indexOf('【答案】');
                // 答案后可能是 【解析】 或者直接是解析内容
                const rest = content.substring(ansIdx + 4);
                if (rest.indexOf('【解析】') >= 0) {
                    content = rest.substring(rest.indexOf('【解析】') + 4).trim();
                } else {
                    // 答案行后面没有解析，跳过
                    currentIdx = idx;
                    return;
                }
            }
            explanations[idx] = content;
            currentIdx = idx;
            matched = true;
            return;
        }

        // 模式2: 【1】解析内容 / 【1】【答案】...【解析】...
        const match2 = line.match(/^【(\d+)】\s*(.*)/);
        if (match2) {
            const idx = parseInt(match2[1]) - 1;
            let rest = match2[2];
            // 跳过可能的【答案】部分
            if (rest.indexOf('【答案】') >= 0) {
                const ansIdx = rest.indexOf('【答案】');
                rest = rest.substring(ansIdx + 4);
            }
            // 如果有【解析】，取【解析】之后的内容
            if (rest.indexOf('【解析】') >= 0) {
                const parseIdx = rest.indexOf('【解析】');
                rest = rest.substring(parseIdx + 4).trim();
            }
            explanations[idx] = rest;
            currentIdx = idx;
            matched = true;
            return;
        }

        // 单独的 【解析】xxx 行（前面已经有题号了）
        if (!matched && line.indexOf('【解析】') === 0 && currentIdx >= 0) {
            const content = line.substring(4).trim();
            if (content) {
                if (explanations[currentIdx]) {
                    explanations[currentIdx] += '\n' + content;
                } else {
                    explanations[currentIdx] = content;
                }
            }
            return;
        }

        // 追加到当前解析（如果是解析内容的延续）
        if (currentIdx >= 0 && explanations[currentIdx] !== undefined) {
            explanations[currentIdx] += '\n' + line;
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

// ========== 词汇双Part数据同步 ==========
// 由于HTML已改为上下两块双Part布局，不再有子标签切换概念，
// 以下函数同步/读取两个输入框的数据到state中

function switchVocabSubtab(part) {
    // 兼容保留：上下布局不再需要切换子标签，直接同步数据并刷新预览
    saveVocabPartsToState();
    updatePreview('vocab');
}

function saveVocabPartsToState() {
    // 同时保存 part1 和 part2 两个输入框的内容
    ['part1', 'part2'].forEach(part => {
        const key = part === 'part1' ? 'vocab_part1' : 'vocab_part2';
        const qId = part === 'part1' ? 'vocab-part1-questions' : 'vocab-part2-questions';
        const aId = part === 'part1' ? 'vocab-part1-answers' : 'vocab-part2-answers';

        const questions = document.getElementById(qId)?.value || '';
        const answers = document.getElementById(aId)?.value || '';

        if (!state.yuece.examData[key]) {
            state.yuece.examData[key] = { questions: [] };
        }
        state.yuece.examData[key]._raw_questions = questions;
        state.yuece.examData[key]._raw_answers = answers;
    });
}

// 旧函数名兼容，内部委托给新函数
function saveCurrentVocabSubtab() {
    saveVocabPartsToState();
}

function loadVocabSubtab(part) {
    // 上下布局直接从state加载两个输入框
    ['part1', 'part2'].forEach(p => {
        const key = p === 'part1' ? 'vocab_part1' : 'vocab_part2';
        const qId = p === 'part1' ? 'vocab-part1-questions' : 'vocab-part2-questions';
        const aId = p === 'part1' ? 'vocab-part1-answers' : 'vocab-part2-answers';
        const data = state.yuece.examData[key];
        if (data) {
            const qEl = document.getElementById(qId);
            const aEl = document.getElementById(aId);
            if (qEl) qEl.value = data._raw_questions || '';
            if (aEl) aEl.value = data._raw_answers || '';
        }
    });
}

// ========== 语法题本地格式化 ==========
function formatGrammarLocal() {
    const questionsText = document.getElementById('grammar-questions').value || '';
    const answersText = document.getElementById('grammar-answers').value || '';

    const questions = parseGrammarQuestionsLocal(questionsText);
    const answers = parseChoiceAnswersLocal(answersText, 1, 5);

    let html = '<div class="section-title">1、【单选题】【语法题】</div>';

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

function parseGrammarQuestionsLocal(text) {
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
            if (qnum >= 1 && qnum <= 5) {
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

// ========== 词汇题本地格式化（两部分合并显示） ==========
function formatVocabLocal() {
    const parts = [
        { key: 'part1', label: '词义替换', sectionNum: 2, minQ: 6, maxQ: 15,
          qId: 'vocab-part1-questions', aId: 'vocab-part1-answers' },
        { key: 'part2', label: '选词填空', sectionNum: 3, minQ: 16, maxQ: 25,
          qId: 'vocab-part2-questions', aId: 'vocab-part2-answers' },
    ];

    let html = '';

    parts.forEach(part => {
        const questionsText = document.getElementById(part.qId)?.value || '';
        const answersText = document.getElementById(part.aId)?.value || '';

        const questions = parseVocabQuestionsLocal(questionsText, part.key);
        const answers = parseChoiceAnswersLocal(answersText, part.minQ, part.maxQ);

        html += `<div class="section-title">${part.sectionNum}、【单选题】【${part.label}】</div>`;

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
    });

    return html;
}

function parseVocabQuestionsLocal(text, part) {
    part = part || 'part1';
    const minQ = part === 'part1' ? 6 : 16;
    const maxQ = part === 'part1' ? 15 : 25;

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
            if (qnum >= minQ && qnum <= maxQ) {
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

// 通用：单选题答案解析（格式：题号|答案|解析，解析可多行）
function parseChoiceAnswersLocal(text, minQ, maxQ) {
    const lines = text.split('\n').filter(l => l.trim());
    const answers = {};
    let currentQnum = null;
    let inExplanation = false;

    lines.forEach(line => {
        line = line.trim();
        if (!line) return;

        // 格式1：题号|答案|解析（竖线分隔）
        const parts = line.split(/[|｜]/);
        if (parts.length >= 2) {
            const qnum = parseInt(parts[0]);
            if (qnum >= minQ && qnum <= maxQ) {
                currentQnum = qnum;
                inExplanation = false;
                answers[qnum] = {
                    answer: (parts[1] || '').trim().toUpperCase(),
                    explanation: parts[2] ? parts[2].trim() : '',
                };
                return;
            }
        }

        // 格式2：1.【答案】B （Word原始答案格式）
        const answerMatch = line.match(/^(\d+)[.．、\s]*[【\[]\s*答案\s*[】\]]\s*([A-G])?/i);
        if (answerMatch) {
            const qnum = parseInt(answerMatch[1]);
            if (qnum >= minQ && qnum <= maxQ) {
                currentQnum = qnum;
                inExplanation = false;
                answers[qnum] = {
                    answer: (answerMatch[2] || '').trim().toUpperCase(),
                    explanation: '',
                };
                // 行内答案后的剩余内容也算解析
                const rest = line.replace(/^\d+[.．、\s]*[【\[]\s*答案\s*[】\]]\s*[A-G]?\s*/i, '').trim();
                if (rest) {
                    answers[qnum].explanation = rest;
                }
                return;
            }
        }

        // 格式2补充：【解析】开头 → 切换到解析模式
        const explMatch = line.match(/^[【\[]\s*(解析|分析|详解|答案解析)\s*[】\]]\s*(.*)/i);
        if (explMatch && currentQnum && answers[currentQnum]) {
            inExplanation = true;
            const rest = explMatch[2] || '';
            if (rest.trim()) {
                if (answers[currentQnum].explanation) {
                    answers[currentQnum].explanation += '\n' + rest.trim();
                } else {
                    answers[currentQnum].explanation = rest.trim();
                }
            }
            return;
        }

        // 格式2补充：【题干翻译】【参考译文】等小节标题也在解析内
        const sectionMatch = line.match(/^[【\[]\s*(题干翻译|参考译文|中文翻译|句子翻译|核心词汇|难句分析|句子分析|考点分析|题目解析|解题思路|技巧点拨|知识拓展|词汇积累|固定搭配)\s*[】\]]\s*(.*)/i);
        if (sectionMatch && currentQnum && answers[currentQnum]) {
            inExplanation = true;
            const title = sectionMatch[1];
            const rest = sectionMatch[2] || '';
            const fullLine = rest.trim() ? `${title}：${rest.trim()}` : `${title}：`;
            if (answers[currentQnum].explanation) {
                answers[currentQnum].explanation += '\n' + fullLine;
            } else {
                answers[currentQnum].explanation = fullLine;
            }
            return;
        }

        // 多行续行
        if (currentQnum && answers[currentQnum]) {
            if (answers[currentQnum].explanation) {
                answers[currentQnum].explanation += '\n' + line;
            } else {
                answers[currentQnum].explanation = line;
            }
        }
    });

    return answers;
}

// ========== 月测完形本地格式化 ==========
function formatYueceClozeLocal() {
    const article = document.getElementById('yuece-cloze-article').value || '';
    const optionsText = document.getElementById('yuece-cloze-options').value || '';
    const answer = document.getElementById('yuece-cloze-answer').value || '';
    const explText = document.getElementById('yuece-cloze-explanation').value || '';

    let html = '<div class="section-title">4、【完形填空】【完形填空】</div><br>';

    // 文章
    let articleHtml = Formatter.addClozeUnderlineHtml(article);
    articleHtml = applyMarksToHtmlLines(articleHtml);

    articleHtml.split('\n').forEach(line => {
        html += line.trim() ? `<p>${line}</p>` : '<p>&nbsp;</p>';
    });
    html += '<br>';

    const questions = parseYueceClozeOptions(optionsText);

    questions.forEach((q, idx) => {
        html += `<p>【${idx + 1}】</p>`;
        q.optionOrder.forEach(letter => {
            html += `<p>${letter}. ${Formatter.applyMarksHtml(q.options[letter] || '')}</p>`;
        });
    });

    html += `<p class="answer-line">答：${escapeHtml(answer.toUpperCase())}</p>`;
    html += '<p>解：</p>';

    const explanations = parseYueceClozeExplanations(explText);
    explanations.forEach((expl, idx) => {
        if (expl) html += `<p>【${idx + 1}】${Formatter.applyMarksHtml(expl)}</p>`;
    });

    return html;
}

function parseYueceClozeOptions(text) {
    const lines = text.split('\n').filter(l => l.trim());
    const questions = [];

    lines.forEach(line => {
        line = line.trim();
        const qMatch = line.match(/^【(\d+)】\s*(.*)/) || line.match(/^(\d+)\s*(.*)/);
        if (!qMatch) return;

        const qnum = parseInt(qMatch[1]);
        const rest = qMatch[2];

        const options = {};
        const optionOrder = [];

        // 方括号格式
        const bracketMatches = [...rest.matchAll(/\[([A-D])\]/gi)];
        if (bracketMatches.length >= 2) {
            bracketMatches.forEach((m, i) => {
                const letter = m[1].toUpperCase();
                const start = m.index + m[0].length;
                const end = i < bracketMatches.length - 1 ? bracketMatches[i + 1].index : rest.length;
                let optText = rest.substring(start, end).trim();
                optText = optText.replace(/^[.．\s]+/, '').trim();
                options[letter] = optText;
                optionOrder.push(letter);
            });
        }

        // 点号格式
        if (optionOrder.length === 0) {
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
        }

        if (optionOrder.length > 0) {
            questions.push({ qnum, options, optionOrder });
        }
    });

    return questions;
}

function parseYueceClozeExplanations(text) {
    // 复用真题完形的解析逻辑
    return parseClozeExplanations(text);
}

// ========== 月测翻译本地格式化 ==========
function formatYueceTranslationLocal() {
    const sentencesText = document.getElementById('yuece-trans-sentences').value || '';
    const transText = document.getElementById('yuece-trans-translation').value || '';
    const analysisText = document.getElementById('yuece-trans-analysis').value || '';

    const sentences = parseTranslationSentences(sentencesText);
    
    // 检测翻译输入框是否为 Word 格式（数字.【答案】...【解析】...）
    // 若是，则统一从中提取翻译和解析
    let translations, analysises;
    const wordFormatResult = parseWordTranslationAnswer(transText);
    if (wordFormatResult) {
        translations = wordFormatResult.translations;
        analysises = wordFormatResult.analysises;
    } else {
        translations = parseLineKeyValue(transText);
        analysises = parseLineKeyValue(analysisText);
    }

    let html = '<div class="section-title">5、【复合题】【翻译】</div>';

    sentences.forEach((sent, idx) => {
        const qnum = sent.qnum;
        const trans = translations[qnum] || '';
        const analysis = analysises[qnum] || '';

        html += `<p>【${idx + 1}】【复合题】(${qnum}) ${Formatter.applyMarksHtml(sent.text)}</p>`;

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

// 解析 Word 格式翻译答案：数字.【答案】...【解析】...
// 返回 { translations: {num: text}, analysises: {num: text} }，若不是该格式返回 null
function parseWordTranslationAnswer(text) {
    const lines = text.split('\n');
    const translations = {};
    const analysises = {};
    let hasWordFormat = false;
    let currentNum = null;
    let currentPart = null; // 'answer' or 'analysis'

    lines.forEach(line => {
        const trimmed = line.trim();
        const answerMatch = trimmed.match(/^(\d+)\s*[.．]\s*【答案】(.*)/);
        if (answerMatch) {
            hasWordFormat = true;
            currentNum = parseInt(answerMatch[1]);
            translations[currentNum] = answerMatch[2];
            analysises[currentNum] = '';
            currentPart = 'answer';
            return;
        }
        const analysisMatch = trimmed.match(/^【解析】(.*)/);
        if (analysisMatch && currentNum !== null) {
            analysises[currentNum] = analysisMatch[1];
            currentPart = 'analysis';
            return;
        }
        // 多行内容追加
        if (currentNum !== null && currentPart && trimmed) {
            if (currentPart === 'answer') {
                translations[currentNum] += '\n' + trimmed;
            } else if (currentPart === 'analysis') {
                analysises[currentNum] += '\n' + trimmed;
            }
        }
    });

    return hasWordFormat ? { translations, analysises } : null;
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

// ========== 月测标点规范 ==========
function normalizeGrammarPunct() {
    const questions = document.getElementById('grammar-questions');
    const answers = document.getElementById('grammar-answers');

    questions.value = Punct.toEnglishPunct(questions.value);

    const lines = answers.value.split('\n');
    const newLines = lines.map(line => {
        const match = line.match(/^(\d+)\|([A-D])\|(.*)/);
        if (match) {
            return `${match[1]}|${match[2]}|${Punct.toChinesePunct(match[3])}`;
        }
        return line;
    });
    answers.value = newLines.join('\n');

    questions.dispatchEvent(new Event('input'));
    showToast('标点已规范', 'success');
}

function normalizeVocabPunct(part) {
    part = part || 'part1';
    const questions = document.getElementById(`vocab-${part}-questions`);
    const answers = document.getElementById(`vocab-${part}-answers`);
    if (!questions || !answers) return;

    questions.value = Punct.toEnglishPunct(questions.value);

    const lines = answers.value.split('\n');
    const newLines = lines.map(line => {
        const match = line.match(/^(\d+)\|([A-D])\|(.*)/);
        if (match) {
            return `${match[1]}|${match[2]}|${Punct.toChinesePunct(match[3])}`;
        }
        return line;
    });
    answers.value = newLines.join('\n');

    questions.dispatchEvent(new Event('input'));
    answers.dispatchEvent(new Event('input'));
    showToast('标点已规范', 'success');
}

function normalizeYueceClozePunct() {
    const article = document.getElementById('yuece-cloze-article');
    const options = document.getElementById('yuece-cloze-options');
    const expl = document.getElementById('yuece-cloze-explanation');

    article.value = Punct.toEnglishPunct(article.value);
    options.value = Punct.toEnglishPunct(options.value);
    expl.value = Punct.toChinesePunct(expl.value);

    article.dispatchEvent(new Event('input'));
    showToast('标点已规范', 'success');
}

function normalizeYueceTranslationPunct() {
    const sentences = document.getElementById('yuece-trans-sentences');
    const trans = document.getElementById('yuece-trans-translation');
    const analysis = document.getElementById('yuece-trans-analysis');

    sentences.value = Punct.toEnglishPunct(sentences.value);
    trans.value = Punct.toChinesePunct(trans.value);
    analysis.value = Punct.toChinesePunct(analysis.value);

    sentences.dispatchEvent(new Event('input'));
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

function parseFullExam(mode) {
    mode = mode || state.mode || 'zhenti';

    if (mode === 'yuece') {
        parseYueceFullExam();
        return;
    }

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

function parseYueceFullExam() {
    const examText = document.getElementById('yuece-exam-text').value;
    const answerText = document.getElementById('yuece-answer-text').value;
    const statusEl = document.getElementById('yuece-parse-status');

    if (!examText.trim()) {
        statusEl.textContent = '请输入月测试题文本';
        statusEl.className = 'parse-status error';
        return;
    }

    statusEl.textContent = '正在智能拆分...';
    statusEl.className = 'parse-status';

    try {
        const examResult = Parser.parseYueceExamText(examText);

        let answerResult = {
            grammar: {}, vocab_part1: {}, vocab_part2: {},
            cloze: {}, translation: {},
        };
        if (answerText.trim()) {
            answerResult = Parser.parseYueceAnswerText(answerText);
        }

        fillYueceExamData(examResult, answerResult);

        // 计算统计
        const stats = calcYueceStats(examResult, answerResult);
        showYueceParseStats(stats.exam, stats.answer);

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

function clearImport(mode) {
    mode = mode || state.mode || 'zhenti';
    if (mode === 'yuece') {
        document.getElementById('yuece-exam-text').value = '';
        document.getElementById('yuece-answer-text').value = '';
        document.getElementById('yuece-parse-status').textContent = '';
        document.getElementById('yuece-parse-stats').classList.remove('show');
        return;
    }
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

// ========== 月测填充数据 ==========
function fillYueceExamData(examData, answerData) {
    examData = examData || {};
    answerData = answerData || {};

    // 语法题
    if (examData.grammar) {
        state.yuece.examData.grammar = examData.grammar;
        state.yuece.answerData.grammar = answerData.grammar || {};

        const qLines = [];
        (examData.grammar.questions || []).forEach(q => {
            qLines.push(`${q.qnum}. ${q.stem}`);
            (q.option_order || q.optionOrder || []).forEach(l => qLines.push(`${l}. ${q.options[l]}`));
        });
        document.getElementById('grammar-questions').value = qLines.join('\n');

        const ansLines = [];
        (examData.grammar.questions || []).forEach(q => {
            const ans = (answerData.grammar && answerData.grammar[q.qnum])
                ? answerData.grammar[q.qnum].answer : '';
            const expl = (answerData.grammar && answerData.grammar[q.qnum])
                ? answerData.grammar[q.qnum].explanation : '';
            if (ans || expl) {
                const explLines = expl ? expl.split('\n') : [];
                ansLines.push(`${q.qnum}|${ans}|${explLines[0] || ''}`);
                for (let i = 1; i < explLines.length; i++) {
                    ansLines.push(explLines[i]);
                }
            }
        });
        document.getElementById('grammar-answers').value = ansLines.join('\n');

        updatePreview('grammar');
    }

    // 词汇题 Part 1
    if (examData.vocab_part1) {
        state.yuece.examData.vocab_part1 = examData.vocab_part1;
        state.yuece.answerData.vocab_part1 = answerData.vocab_part1 || {};

        const qLines = [];
        (examData.vocab_part1.questions || []).forEach(q => {
            qLines.push(`${q.qnum}. ${q.stem}`);
            (q.option_order || q.optionOrder || []).forEach(l => qLines.push(`${l}. ${q.options[l]}`));
        });

        const ansLines = [];
        (examData.vocab_part1.questions || []).forEach(q => {
            const ans = (answerData.vocab_part1 && answerData.vocab_part1[q.qnum])
                ? answerData.vocab_part1[q.qnum].answer : '';
            const expl = (answerData.vocab_part1 && answerData.vocab_part1[q.qnum])
                ? answerData.vocab_part1[q.qnum].explanation : '';
            if (ans || expl) {
                const explLines = expl ? expl.split('\n') : [];
                ansLines.push(`${q.qnum}|${ans}|${explLines[0] || ''}`);
                for (let i = 1; i < explLines.length; i++) {
                    ansLines.push(explLines[i]);
                }
            }
        });

        examData.vocab_part1._raw_questions = qLines.join('\n');
        examData.vocab_part1._raw_answers = ansLines.join('\n');

        // 填充到 Part1 输入框
        document.getElementById('vocab-part1-questions').value = qLines.join('\n');
        document.getElementById('vocab-part1-answers').value = ansLines.join('\n');

        updatePreview('vocab');
    }

    // 词汇题 Part 2
    if (examData.vocab_part2) {
        state.yuece.examData.vocab_part2 = examData.vocab_part2;
        state.yuece.answerData.vocab_part2 = answerData.vocab_part2 || {};

        const qLines = [];
        (examData.vocab_part2.questions || []).forEach(q => {
            qLines.push(`${q.qnum}. ${q.stem}`);
            (q.option_order || q.optionOrder || []).forEach(l => qLines.push(`${l}. ${q.options[l]}`));
        });

        const ansLines = [];
        (examData.vocab_part2.questions || []).forEach(q => {
            const ans = (answerData.vocab_part2 && answerData.vocab_part2[q.qnum])
                ? answerData.vocab_part2[q.qnum].answer : '';
            const expl = (answerData.vocab_part2 && answerData.vocab_part2[q.qnum])
                ? answerData.vocab_part2[q.qnum].explanation : '';
            if (ans || expl) {
                const explLines = expl ? expl.split('\n') : [];
                ansLines.push(`${q.qnum}|${ans}|${explLines[0] || ''}`);
                for (let i = 1; i < explLines.length; i++) {
                    ansLines.push(explLines[i]);
                }
            }
        });

        examData.vocab_part2._raw_questions = qLines.join('\n');
        examData.vocab_part2._raw_answers = ansLines.join('\n');

        // 填充到 Part2 输入框
        document.getElementById('vocab-part2-questions').value = qLines.join('\n');
        document.getElementById('vocab-part2-answers').value = ansLines.join('\n');

        updatePreview('vocab');
    }

    // 月测完形
    if (examData.cloze) {
        state.yuece.examData.cloze = examData.cloze;
        state.yuece.answerData.cloze = answerData.cloze || {};

        document.getElementById('yuece-cloze-article').value = examData.cloze.article || '';

        const optLines = (examData.cloze.questions || []).map(q => {
            const parts = (q.option_order || q.optionOrder || []).map(l => `${l}. ${q.options[l]}`).join(' ');
            return `${q.qnum} ${parts}`;
        });
        document.getElementById('yuece-cloze-options').value = optLines.join('\n');

        const answerStr = (examData.cloze.questions || []).map(q => {
            return (answerData.cloze && answerData.cloze[q.qnum])
                ? answerData.cloze[q.qnum].answer : '';
        }).join('');
        document.getElementById('yuece-cloze-answer').value = answerStr;

        const explLines = (examData.cloze.questions || []).map(q => {
            const expl = (answerData.cloze && answerData.cloze[q.qnum])
                ? answerData.cloze[q.qnum].explanation : '';
            return expl ? `${q.qnum}|${expl.split('\n').join(' ')}` : '';
        }).filter(l => l);
        document.getElementById('yuece-cloze-explanation').value = explLines.join('\n');

        updatePreview('yuece-cloze');
    }

    // 月测翻译
    if (examData.translation) {
        state.yuece.examData.translation = examData.translation;
        state.yuece.answerData.translation = answerData.translation || {};

        const sentLines = (examData.translation.sentences || []).map(s => `${s.qnum}|${s.text}`);
        document.getElementById('yuece-trans-sentences').value = sentLines.join('\n');

        const transLines = (examData.translation.sentences || []).map(s => {
            const tr = (answerData.translation && answerData.translation[s.qnum])
                ? answerData.translation[s.qnum].translation : '';
            return `${s.qnum}|${tr.split('\n').join(' ')}`;
        });
        document.getElementById('yuece-trans-translation').value = transLines.join('\n');

        const analysisLines = (examData.translation.sentences || []).map(s => {
            const a = (answerData.translation && answerData.translation[s.qnum])
                ? answerData.translation[s.qnum].analysis : '';
            return `${s.qnum}|${a.split('\n').join(' ')}`;
        });
        document.getElementById('yuece-trans-analysis').value = analysisLines.join('\n');

        updatePreview('yuece-translation');
    }
}

function calcYueceStats(examData, answerData) {
    const examStats = {
        has_grammar: !!examData.grammar,
        grammar_questions: (examData.grammar && examData.grammar.questions) ? examData.grammar.questions.length : 0,
        has_vocab_part1: !!examData.vocab_part1,
        vocab_part1_questions: (examData.vocab_part1 && examData.vocab_part1.questions) ? examData.vocab_part1.questions.length : 0,
        has_vocab_part2: !!examData.vocab_part2,
        vocab_part2_questions: (examData.vocab_part2 && examData.vocab_part2.questions) ? examData.vocab_part2.questions.length : 0,
        has_cloze: !!examData.cloze,
        cloze_questions: (examData.cloze && examData.cloze.questions) ? examData.cloze.questions.length : 0,
        has_translation: !!examData.translation,
        translation_sentences: (examData.translation && examData.translation.sentences) ? examData.translation.sentences.length : 0,
    };
    return { exam: examStats, answer: {} };
}

function showYueceParseStats(examStats, answerStats) {
    const statsEl = document.getElementById('yuece-parse-stats');
    let html = '<h3>📊 解析结果统计</h3>';
    html += '<div class="stats-grid">';

    if (examStats.has_grammar) {
        html += `<div class="stat-item"><div class="stat-num">${examStats.grammar_questions || 0}</div><div class="stat-label">语法题</div></div>`;
    }
    if (examStats.has_vocab_part1) {
        html += `<div class="stat-item"><div class="stat-num">${examStats.vocab_part1_questions || 0}</div><div class="stat-label">词汇Part1</div></div>`;
    }
    if (examStats.has_vocab_part2) {
        html += `<div class="stat-item"><div class="stat-num">${examStats.vocab_part2_questions || 0}</div><div class="stat-label">词汇Part2</div></div>`;
    }
    if (examStats.has_cloze) {
        html += `<div class="stat-item"><div class="stat-num">${examStats.cloze_questions || 0}</div><div class="stat-label">完形填空</div></div>`;
    }
    if (examStats.has_translation) {
        html += `<div class="stat-item"><div class="stat-num">${examStats.translation_sentences || 0}</div><div class="stat-label">翻译</div></div>`;
    }

    html += '</div>';
    statsEl.innerHTML = html;
    statsEl.classList.add('show');
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
        'grammar': 'grammar-preview',
        'vocab': 'vocab-preview',
        'yuece-cloze': 'yuece-cloze-preview',
        'yuece-translation': 'yuece-translation-preview',
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
        case 'grammar':
            data = collectGrammarData();
            answers = collectGrammarAnswers();
            break;
        case 'vocab':
            data = collectVocabData();
            answers = collectVocabAnswers();
            break;
        case 'yuece-cloze':
            data = collectYueceClozeData();
            answers = collectYueceClozeAnswers();
            break;
        case 'yuece-translation':
            data = collectYueceTranslationData();
            answers = collectYueceTranslationAnswers();
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
        } else if (type === 'grammar') {
            await DocxGen.generateGrammar(data, answers);
        } else if (type === 'vocab') {
            await DocxGen.generateVocab(data.part1, answers.part1, data.part2, answers.part2);
        } else if (type === 'yuece-cloze') {
            await DocxGen.generateYueceCloze(data, answers);
        } else if (type === 'yuece-translation') {
            await DocxGen.generateYueceTranslation(data, answers);
        }
        showToast('Word 下载成功！', 'success');
    } catch (e) {
        console.error(e);
        showToast('生成失败：' + e.message, 'error');
    }
}

async function exportFullPaper(mode) {
    mode = mode || state.mode || 'zhenti';

    if (mode === 'yuece') {
        await exportYueceFullPaper();
        return;
    }

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

// ========== 月测数据收集 ==========

function collectGrammarData() {
    const questionsText = document.getElementById('grammar-questions').value || '';
    const questions = parseGrammarQuestionsLocal(questionsText);
    const qs = questions.map(q => ({
        qnum: q.qnum,
        stem: q.stem,
        options: q.options,
        option_order: q.optionOrder,
    }));
    return { questions: qs };
}

function collectGrammarAnswers() {
    return parseChoiceAnswersLocal(
        document.getElementById('grammar-answers').value || '',
        1, 5
    );
}

function collectVocabData() {
    const parts = {
        part1: { qId: 'vocab-part1-questions' },
        part2: { qId: 'vocab-part2-questions' },
    };

    const result = {};
    ['part1', 'part2'].forEach(part => {
        const questionsText = document.getElementById(parts[part].qId)?.value || '';
        const questions = parseVocabQuestionsLocal(questionsText, part);
        const qs = questions.map(q => ({
            qnum: q.qnum,
            stem: q.stem,
            options: q.options,
            option_order: q.optionOrder,
        }));
        result[part] = { part: part, questions: qs };
    });

    return result;
}

function collectVocabAnswers() {
    const parts = {
        part1: { aId: 'vocab-part1-answers', minQ: 6, maxQ: 15 },
        part2: { aId: 'vocab-part2-answers', minQ: 16, maxQ: 25 },
    };

    const result = {};
    ['part1', 'part2'].forEach(part => {
        const p = parts[part];
        const answersText = document.getElementById(p.aId)?.value || '';
        result[part] = parseChoiceAnswersLocal(answersText, p.minQ, p.maxQ);
    });

    return result;
}

function collectYueceClozeData() {
    const article = document.getElementById('yuece-cloze-article').value || '';
    const optionsText = document.getElementById('yuece-cloze-options').value || '';
    const questions = parseYueceClozeOptions(optionsText);
    const qs = questions.map(q => ({
        qnum: q.qnum,
        options: q.options,
        option_order: q.optionOrder,
    }));
    return { article, questions: qs };
}

function collectYueceClozeAnswers() {
    const answer = document.getElementById('yuece-cloze-answer').value || '';
    const explText = document.getElementById('yuece-cloze-explanation').value || '';
    const explanations = parseYueceClozeExplanations(explText);
    const questions = parseYueceClozeOptions(
        document.getElementById('yuece-cloze-options').value || ''
    );

    const answers = {};
    questions.forEach((q, idx) => {
        answers[q.qnum] = {
            answer: (answer[idx] || '').toUpperCase(),
            explanation: explanations[idx] || '',
        };
    });
    return answers;
}

function collectYueceTranslationData() {
    const sentencesText = document.getElementById('yuece-trans-sentences').value || '';
    return {
        sentences: parseTranslationSentences(sentencesText),
    };
}

function collectYueceTranslationAnswers() {
    const transText = document.getElementById('yuece-trans-translation').value || '';
    const analysisText = document.getElementById('yuece-trans-analysis').value || '';
    
    // 检测翻译输入框是否为 Word 格式（数字.【答案】...【解析】...）
    let translations, analysises;
    const wordFormatResult = parseWordTranslationAnswer(transText);
    if (wordFormatResult) {
        translations = wordFormatResult.translations;
        analysises = wordFormatResult.analysises;
    } else {
        translations = parseLineKeyValue(transText);
        analysises = parseLineKeyValue(analysisText);
    }

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

function collectAllYueceVocabData() {
    saveCurrentVocabSubtab();
    return {
        part1: state.yuece.examData.vocab_part1,
        part2: state.yuece.examData.vocab_part2,
    };
}

function collectAllYueceVocabAnswers() {
    saveCurrentVocabSubtab();
    const allAnswers = { part1: {}, part2: {} };

    ['part1', 'part2'].forEach(part => {
        const data = state.yuece.examData[part === 'part1' ? 'vocab_part1' : 'vocab_part2'];
        if (data && data._raw_answers) {
            const minQ = part === 'part1' ? 6 : 16;
            const maxQ = part === 'part1' ? 15 : 25;
            allAnswers[part] = parseChoiceAnswersLocal(data._raw_answers, minQ, maxQ);
        } else if (state.yuece.answerData[part === 'part1' ? 'vocab_part1' : 'vocab_part2']) {
            allAnswers[part] = state.yuece.answerData[part === 'part1' ? 'vocab_part1' : 'vocab_part2'];
        }
    });

    return allAnswers;
}

async function exportYueceFullPaper() {
    saveCurrentVocabSubtab();

    const examData = {
        grammar: collectGrammarData(),
        vocab_part1: collectVocabPartDataFromState('part1'),
        vocab_part2: collectVocabPartDataFromState('part2'),
        cloze: collectYueceClozeData(),
        translation: collectYueceTranslationData(),
    };

    const vocabAnswers = collectAllYueceVocabAnswers();
    const answerData = {
        grammar: collectGrammarAnswers(),
        vocab_part1: vocabAnswers.part1,
        vocab_part2: vocabAnswers.part2,
        cloze: collectYueceClozeAnswers(),
        translation: collectYueceTranslationAnswers(),
    };

    showToast('正在生成月测整卷Word...');

    try {
        await DocxGen.generateYueceFullPaper(examData, answerData);
        showToast('月测整卷 Word 下载成功！', 'success');
    } catch (e) {
        console.error(e);
        showToast('生成失败：' + e.message, 'error');
    }
}

function collectVocabPartDataFromState(part) {
    const data = state.yuece.examData[part === 'part1' ? 'vocab_part1' : 'vocab_part2'];
    if (!data) return { questions: [] };

    if (data._raw_questions) {
        const qs = parseVocabQuestionsLocal(data._raw_questions, part);
        return {
            part: part,
            questions: qs.map(q => ({
                qnum: q.qnum,
                stem: q.stem,
                options: q.options,
                option_order: q.optionOrder,
            })),
        };
    }
    return data;
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
