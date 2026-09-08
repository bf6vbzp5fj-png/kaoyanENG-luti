/**
 * 内容格式化器
 * 将各题型数据格式化为录题格式的文本和HTML
 * 用于实时预览和Word生成
 * 支持特殊标记：__下划线__  **加粗**
 */

const Formatter = (function() {

    // ========== 完形填空 ==========
    function formatCloze(data, answers) {
        answers = answers || {};

        const textLines = [];
        const htmlLines = [];

        textLines.push('1、【完形填空】【完形填空】');
        textLines.push('');
        htmlLines.push('<div class="section-title">1、【完形填空】【完形填空】</div>');
        htmlLines.push('');

        // 文章
        const article = data.article || '';
        const articleText = applyMarksText(article);
        const articleHtml = addClozeUnderlineHtml(applyMarksHtml(article));

        articleText.split('\n').forEach(line => {
            textLines.push(line);
        });

        articleHtml.split('\n').forEach(line => {
            if (line.trim()) {
                htmlLines.push(`<p>${line}</p>`);
            } else {
                htmlLines.push('<p>&nbsp;</p>');
            }
        });

        textLines.push('');
        htmlLines.push('');

        // 子题
        const questions = data.questions || [];
        questions.forEach((q, idx) => {
            const options = q.options || {};
            const optionOrder = q.option_order || q.optionOrder || [];
            const qIdx = idx + 1;

            textLines.push(`【${qIdx}】`);
            htmlLines.push(`<p>【${qIdx}】</p>`);

            optionOrder.forEach(letter => {
                const optText = applyMarksText(options[letter] || '');
                const optHtml = applyMarksHtml(options[letter] || '');
                textLines.push(`${letter}. ${optText}`);
                htmlLines.push(`<p>${letter}. ${optHtml}</p>`);
            });
        });

        // 答案
        const answerLetters = [];
        questions.forEach(q => {
            const qnum = q.qnum || 0;
            const ans = (answers[qnum] && answers[qnum].answer) || '';
            answerLetters.push(ans);
        });
        const answerStr = answerLetters.join('');

        textLines.push(`答：${answerStr}`);
        htmlLines.push(`<p class="answer-line">答：${answerStr}</p>`);

        // 解析
        textLines.push('解：');
        htmlLines.push('<p>解：</p>');

        questions.forEach((q, idx) => {
            const qnum = q.qnum || 0;
            const expl = (answers[qnum] && answers[qnum].explanation) || '';
            if (expl) {
                const explText = applyMarksText(expl);
                const explHtml = applyMarksHtml(expl);
                textLines.push(`【${idx + 1}】${explText}`);
                htmlLines.push(`<p>【${idx + 1}】${explHtml}</p>`);
            }
        });

        return {
            text: textLines.join('\n'),
            html: htmlLines.join('\n'),
        };
    }

    // ========== 阅读理解 ==========
    function formatReading(data, answers) {
        answers = answers || {};
        const textNum = data.text_num || 1;
        const sectionNum = textNum + 1;

        const textLines = [];
        const htmlLines = [];

        textLines.push(`${sectionNum}、【复合题】【阅读理解】`);
        textLines.push('');
        htmlLines.push(`<div class="section-title">${sectionNum}、【复合题】【阅读理解】</div>`);
        htmlLines.push('');

        const article = data.article || '';
        textLines.push(`Text ${textNum}`);
        textLines.push('');
        htmlLines.push(`<p><strong>Text ${textNum}</strong></p>`);

        article.split('\n').forEach(line => {
            textLines.push(applyMarksText(line));
            if (line.trim()) {
                htmlLines.push(`<p>${applyMarksHtml(line)}</p>`);
            } else {
                htmlLines.push('<p>&nbsp;</p>');
            }
        });

        textLines.push('分析：');
        htmlLines.push('<p>分析：</p>');

        const questions = data.questions || [];
        questions.forEach((q, idx) => {
            const qnum = q.qnum || 0;
            const stem = q.stem || '';
            const options = q.options || {};
            const optionOrder = q.option_order || q.optionOrder || [];
            const ans = (answers[qnum] && answers[qnum].answer) || '';
            const expl = (answers[qnum] && answers[qnum].explanation) || '';
            const qIdx = idx + 1;

            textLines.push(`【${qIdx}】【单选题】${qnum}. ${applyMarksText(stem)}`);
            htmlLines.push(`<p>【${qIdx}】【单选题】${qnum}. ${applyMarksHtml(stem)}</p>`);

            optionOrder.forEach(letter => {
                const optText = applyMarksText(options[letter] || '');
                const optHtml = applyMarksHtml(options[letter] || '');
                textLines.push(`${letter}. ${optText}`);
                htmlLines.push(`<p>${letter}. ${optHtml}</p>`);
            });

            textLines.push(`答：${ans}`);
            htmlLines.push(`<p class="answer-line">答：${ans}</p>`);

            if (expl) {
                textLines.push('解：');
                htmlLines.push('<p>解：</p>');
                expl.split('\n').forEach(line => {
                    textLines.push(applyMarksText(line));
                    if (line.trim()) {
                        htmlLines.push(`<p>${applyMarksHtml(line)}</p>`);
                    } else {
                        htmlLines.push('<p>&nbsp;</p>');
                    }
                });
            }

            textLines.push('');
            htmlLines.push('');
        });

        return {
            text: textLines.join('\n'),
            html: htmlLines.join('\n'),
        };
    }

    // ========== 新题型 ==========
    function formatPartb(data, answers) {
        answers = answers || {};
        const qtypeLabel = data.type || '小标题';
        const sectionNum = 6;

        const textLines = [];
        const htmlLines = [];

        textLines.push(`${sectionNum}、【复合题】【${qtypeLabel}】`);
        textLines.push('');
        htmlLines.push(`<div class="section-title">${sectionNum}、【复合题】【${qtypeLabel}】</div>`);
        htmlLines.push('');

        const options = data.options || {};
        const optionOrder = data.option_order || data.optionOrder || [];

        optionOrder.forEach(letter => {
            const optText = applyMarksText(options[letter] || '');
            const optHtml = applyMarksHtml(options[letter] || '');
            textLines.push(`[${letter}] ${optText}`);
            htmlLines.push(`<p>[${letter}] ${optHtml}</p>`);
        });

        textLines.push('');
        htmlLines.push('');

        // 文章内容
        const articleText = data.article_text || '';
        if (!articleText) {
            // 兼容旧格式：intro + items
            const intro = data.intro_paragraph || '';
            if (intro) {
                intro.split('\n').forEach(line => {
                    textLines.push(applyMarksText(line));
                    if (line.trim()) {
                        htmlLines.push(`<p>${applyMarksHtml(line)}</p>`);
                    } else {
                        htmlLines.push('<p>&nbsp;</p>');
                    }
                });
                textLines.push('');
                htmlLines.push('');
            }

            const items = data.items || [];
            items.forEach(item => {
                const qnum = item.qnum || 0;
                const paragraph = item.paragraph || '';
                textLines.push(`${qnum}._______________________________`);
                htmlLines.push(`<p>${qnum}._______________________________</p>`);
                paragraph.split('\n').forEach(line => {
                    textLines.push(applyMarksText(line));
                    if (line.trim()) {
                        htmlLines.push(`<p>${applyMarksHtml(line)}</p>`);
                    } else {
                        htmlLines.push('<p>&nbsp;</p>');
                    }
                });
                textLines.push('');
                htmlLines.push('');
            });
        } else {
            articleText.split('\n').forEach(line => {
                textLines.push(applyMarksText(line));
                if (line.trim()) {
                    htmlLines.push(`<p>${applyMarksHtml(line)}</p>`);
                } else {
                    htmlLines.push('<p>&nbsp;</p>');
                }
            });
        }

        textLines.push('分析：');
        htmlLines.push('<p>分析：</p>');

        let items = data.items || [];
        if (!items || items.length === 0) {
            const startQnum = data.start_qnum || 41;
            items = [];
            for (let i = 0; i < 5; i++) {
                items.push({ qnum: startQnum + i, paragraph: '' });
            }
        }

        items.forEach((item, idx) => {
            const qnum = item.qnum || 0;
            const ans = (answers[qnum] && answers[qnum].answer) || '';
            const expl = (answers[qnum] && answers[qnum].explanation) || '';
            const qIdx = idx + 1;

            textLines.push(`【${qIdx}】【单选题】${qnum}.`);
            htmlLines.push(`<p>【${qIdx}】【单选题】${qnum}.</p>`);

            optionOrder.forEach(letter => {
                const optText = applyMarksText(options[letter] || '');
                const optHtml = applyMarksHtml(options[letter] || '');
                textLines.push(`${letter}. ${optText}`);
                htmlLines.push(`<p>${letter}. ${optHtml}</p>`);
            });

            textLines.push(`答：${ans}`);
            htmlLines.push(`<p class="answer-line">答：${ans}</p>`);

            if (expl) {
                textLines.push('解：');
                htmlLines.push('<p>解：</p>');
                expl.split('\n').forEach(line => {
                    textLines.push(applyMarksText(line));
                    if (line.trim()) {
                        htmlLines.push(`<p>${applyMarksHtml(line)}</p>`);
                    } else {
                        htmlLines.push('<p>&nbsp;</p>');
                    }
                });
            }

            textLines.push('');
            htmlLines.push('');
        });

        return {
            text: textLines.join('\n'),
            html: htmlLines.join('\n'),
        };
    }

    // ========== 翻译 ==========
    function formatTranslation(data, answers, paperType) {
        answers = answers || {};
        paperType = paperType || 'yingyi';

        if (paperType === 'yinger') {
            return formatTranslationYinger(data, answers);
        }
        return formatTranslationYingyi(data, answers);
    }

    function formatTranslationYingyi(data, answers) {
        const sectionNum = 7;

        const textLines = [];
        const htmlLines = [];

        textLines.push(`${sectionNum}、【复合题】【翻译】`);
        textLines.push('');
        htmlLines.push(`<div class="section-title">${sectionNum}、【复合题】【翻译】</div>`);
        htmlLines.push('');

        const article = data.article_text || '';
        const underlined = data.underlined_sentences || [];

        // 文章 - 划线句加下划线
        const articleText = applyMarksText(article);
        const articleHtml = addTranslationUnderlineHtml(applyMarksHtml(article), underlined);

        articleText.split('\n').forEach(line => {
            textLines.push(line);
        });

        articleHtml.split('\n').forEach(line => {
            if (line.trim()) {
                htmlLines.push(`<p>${line}</p>`);
            } else {
                htmlLines.push('<p>&nbsp;</p>');
            }
        });

        textLines.push('分析：');
        htmlLines.push('<p>分析：</p>');

        underlined.forEach((sent, idx) => {
            const qnum = sent.qnum || 0;
            const sentText = sent.text || '';
            const ansData = answers[qnum] || {};
            const translation = ansData.translation || '';
            const analysis = ansData.analysis || '';
            const qIdx = idx + 1;

            textLines.push(`【${qIdx}】【解答题】(${qnum}) ${applyMarksText(sentText)}`);
            htmlLines.push(`<p>【${qIdx}】【解答题】(${qnum}) <u>${applyMarksHtml(sentText)}</u></p>`);

            textLines.push('答：');
            htmlLines.push('<p>答：</p>');
            if (translation) {
                translation.split('\n').forEach(line => {
                    textLines.push(applyMarksText(line));
                    if (line.trim()) {
                        htmlLines.push(`<p>${applyMarksHtml(line)}</p>`);
                    } else {
                        htmlLines.push('<p>&nbsp;</p>');
                    }
                });
            }

            if (analysis) {
                textLines.push('解：');
                htmlLines.push('<p>解：</p>');
                analysis.split('\n').forEach(line => {
                    textLines.push(applyMarksText(line));
                    if (line.trim()) {
                        htmlLines.push(`<p>${applyMarksHtml(line)}</p>`);
                    } else {
                        htmlLines.push('<p>&nbsp;</p>');
                    }
                });
            }

            textLines.push('');
            htmlLines.push('');
        });

        return {
            text: textLines.join('\n'),
            html: htmlLines.join('\n'),
        };
    }

    function formatTranslationYinger(data, answers) {
        const sectionNum = 7;

        const textLines = [];
        const htmlLines = [];

        textLines.push(`${sectionNum}、【解答题】【翻译】`);
        textLines.push('');
        htmlLines.push(`<div class="section-title">${sectionNum}、【解答题】【翻译】</div>`);
        htmlLines.push('');

        const source = data.source || data.article_text || '';

        source.split('\n').forEach(line => {
            textLines.push(applyMarksText(line));
            if (line.trim()) {
                htmlLines.push(`<p>${applyMarksHtml(line)}</p>`);
            } else {
                htmlLines.push('<p>&nbsp;</p>');
            }
        });

        // answers 可以是 dict 也可以是直接的字符串
        let translation = '';
        let analysis = '';
        if (typeof answers === 'object' && answers !== null) {
            if (answers.translation) translation = answers.translation;
            if (answers.analysis) analysis = answers.analysis;
            // 兼容 {qnum: {...}} 格式
            if (!translation && !analysis) {
                for (const k in answers) {
                    const v = answers[k];
                    if (typeof v === 'object' && v !== null) {
                        translation = v.translation || '';
                        analysis = v.analysis || '';
                        break;
                    }
                }
            }
        }

        textLines.push('答：');
        htmlLines.push('<p>答：</p>');
        if (translation) {
            translation.split('\n').forEach(line => {
                textLines.push(applyMarksText(line));
                if (line.trim()) {
                    htmlLines.push(`<p>${applyMarksHtml(line)}</p>`);
                } else {
                    htmlLines.push('<p>&nbsp;</p>');
                }
            });
        }

        if (analysis) {
            textLines.push('解：');
            htmlLines.push('<p>解：</p>');
            analysis.split('\n').forEach(line => {
                textLines.push(applyMarksText(line));
                if (line.trim()) {
                    htmlLines.push(`<p>${applyMarksHtml(line)}</p>`);
                } else {
                    htmlLines.push('<p>&nbsp;</p>');
                }
            });
        }

        return {
            text: textLines.join('\n'),
            html: htmlLines.join('\n'),
        };
    }

    // ========== 写作 ==========
    function formatWriting(data, answerData, isPartA) {
        answerData = answerData || {};

        let sectionNum, category, partLabel;
        if (isPartA) {
            sectionNum = 8;
            category = '小作文';
            partLabel = 'Part A';
        } else {
            sectionNum = 9;
            category = '大作文';
            partLabel = 'Part B';
        }

        const textLines = [];
        const htmlLines = [];

        textLines.push(`${sectionNum}、【写作题】【${category}】`);
        textLines.push('');
        htmlLines.push(`<div class="section-title">${sectionNum}、【写作题】【${category}】</div>`);
        htmlLines.push('');

        const directions = data.directions || '';
        if (directions) {
            textLines.push(partLabel);
            textLines.push('');
            htmlLines.push(`<p><strong>${partLabel}</strong></p>`);

            directions.split('\n').forEach(line => {
                textLines.push(applyMarksText(line));
                if (line.trim()) {
                    htmlLines.push(`<p>${applyMarksHtml(line)}</p>`);
                } else {
                    htmlLines.push('<p>&nbsp;</p>');
                }
            });
        }

        textLines.push('答：');
        htmlLines.push('<p>答：</p>');
        textLines.push('【参考范文】');
        htmlLines.push('<p>【参考范文】</p>');

        const modelEssay = answerData.model_essay || '';
        if (modelEssay) {
            modelEssay.split('\n').forEach(line => {
                textLines.push(applyMarksText(line));
                if (line.trim()) {
                    htmlLines.push(`<p>${applyMarksHtml(line)}</p>`);
                } else {
                    htmlLines.push('<p>&nbsp;</p>');
                }
            });
        }

        textLines.push('解：');
        htmlLines.push('<p>解：</p>');
        textLines.push('【参考译文】');
        htmlLines.push('<p>【参考译文】</p>');

        const translation = answerData.translation || '';
        if (translation) {
            translation.split('\n').forEach(line => {
                textLines.push(applyMarksText(line));
                if (line.trim()) {
                    htmlLines.push(`<p>${applyMarksHtml(line)}</p>`);
                } else {
                    htmlLines.push('<p>&nbsp;</p>');
                }
            });
        }

        return {
            text: textLines.join('\n'),
            html: htmlLines.join('\n'),
        };
    }

    // ==================== 辅助函数 ====================

    function applyMarksText(text) {
        // 纯文本：移除 __ 和 ** 标记，保留内容
        let result = text;
        result = result.replace(/\*\*(.+?)\*\*/g, '$1');
        result = result.replace(/__(.+?)__/g, '$1');
        return result;
    }

    function applyMarksHtml(text) {
        // HTML：__xxx__ → <u>xxx</u>, **xxx** → <b>xxx</b>
        let result = escapeHtml(text);
        result = result.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
        result = result.replace(/__(.+?)__/g, '<u>$1</u>');
        return result;
    }

    function escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    function addClozeUnderlineHtml(text) {
        // 完形文章空位数字加下划线（HTML版）
        const pattern = /(^|\s)([1-9]|1[0-9]|20)(?=\s|$|[,.!?;:])/gm;

        const lines = text.split('\n');
        const resultLines = [];

        lines.forEach(line => {
            const newLine = line.replace(pattern, (match, prefix, num) => {
                return `${prefix}<u>${num}</u>`;
            });
            resultLines.push(newLine);
        });

        return resultLines.join('\n');
    }

    function addTranslationUnderlineHtml(text, underlinedSentences) {
        // 翻译文章划线句（HTML版）
        if (!underlinedSentences || underlinedSentences.length === 0) {
            return text;
        }

        let result = text;
        underlinedSentences.forEach(sent => {
            const sentText = sent.text || '';
            if (sentText && result.indexOf(sentText) >= 0) {
                result = result.replaceAll(sentText, `<u>${sentText}</u>`);
            }
        });

        return result;
    }

    function getClozeUnderlineNumbers(text) {
        // 提取完形文章中需要下划线的空位数字列表
        const pattern = /(?:^|\s)([1-9]|1[0-9]|20)(?=\s|$|[,.!?;:])/gm;
        const matches = [];
        let m;
        while ((m = pattern.exec(text)) !== null) {
            matches.push(parseInt(m[1]));
        }
        return matches;
    }

    // 解析文本中的标记，返回 token 列表
    // 每个 token: { text: '...', bold: bool, underline: bool }
    function parseMarks(text) {
        const tokens = [];

        if (!text) {
            return [{ text: '', bold: false, underline: false }];
        }

        const pattern = /(\*\*.+?\*\*)|(__.+?__)/g;
        let lastEnd = 0;
        let match;

        while ((match = pattern.exec(text)) !== null) {
            const start = match.index;
            const end = match.index + match[0].length;

            // 添加前面的普通文本
            if (start > lastEnd) {
                tokens.push({
                    text: text.substring(lastEnd, start),
                    bold: false,
                    underline: false,
                });
            }

            // 处理标记
            const matchedText = match[0];
            if (matchedText.startsWith('**')) {
                tokens.push({
                    text: matchedText.substring(2, matchedText.length - 2),
                    bold: true,
                    underline: false,
                });
            } else if (matchedText.startsWith('__')) {
                tokens.push({
                    text: matchedText.substring(2, matchedText.length - 2),
                    bold: false,
                    underline: true,
                });
            }

            lastEnd = end;
        }

        // 剩余的普通文本
        if (lastEnd < text.length) {
            tokens.push({
                text: text.substring(lastEnd),
                bold: false,
                underline: false,
            });
        }

        if (tokens.length === 0) {
            tokens.push({ text: text, bold: false, underline: false });
        }

        return tokens;
    }

    return {
        formatCloze,
        formatReading,
        formatPartb,
        formatTranslation,
        formatWriting,
        applyMarksText,
        applyMarksHtml,
        escapeHtml,
        addClozeUnderlineHtml,
        addTranslationUnderlineHtml,
        getClozeUnderlineNumbers,
        parseMarks,
    };
})();
