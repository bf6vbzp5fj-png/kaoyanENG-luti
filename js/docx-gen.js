/**
 * Word 文档生成器（前端版）
 * 使用 docx.js 库在浏览器中生成 .docx 文件
 * 从 generator.py 翻译而来
 *
 * 依赖：docx.js (CDN)、file-saver.js (CDN)
 * 全局变量：docx、saveAs
 */

const DocxGen = (function() {

    const {
        Document, Packer, Paragraph, TextRun,
        HeadingLevel, PageBreak, AlignmentType,
        UnderlineType,
    } = docx;

    // ========== 工具函数 ==========
    function addHeading(children, text) {
        children.push(
            new Paragraph({
                children: [
                    new TextRun({
                        text: text,
                        bold: true,
                        size: 28, // 14pt = 28 half-points
                        font: 'SimSun',
                    }),
                ],
            })
        );
    }

    function addMarkedText(paragraph, text) {
        // 向段落中添加带格式的文本，解析 **加粗** 和 __下划线__ 标记
        const tokens = Formatter.parseMarks(text);
        tokens.forEach(token => {
            const runOptions = {
                text: token.text,
                font: 'SimSun',
            };
            if (token.bold) runOptions.bold = true;
            if (token.underline) runOptions.underline = { type: UnderlineType.SINGLE };
            paragraph.addChildElement(new TextRun(runOptions));
        });
    }

    function addMultilineMarked(children, text) {
        // 添加多行带标记的文本
        const lines = text.split('\n');
        lines.forEach(line => {
            if (line.trim()) {
                const para = new Paragraph({});
                addMarkedText(para, line);
                children.push(para);
            } else {
                children.push(new Paragraph({}));
            }
        });
    }

    function addParagraph(children, text) {
        children.push(new Paragraph({
            children: [
                new TextRun({ text: text, font: 'SimSun' }),
            ],
        }));
    }

    function addPageBreak(children) {
        // PageBreak 必须放在 Paragraph 内部
        children.push(new Paragraph({
            children: [new PageBreak()],
        }));
    }

    // ========== 完形填空 ==========
    function buildCloze(children, data, answers, sectionNum) {
        sectionNum = sectionNum || 1;
        answers = answers || {};

        addHeading(children, `${sectionNum}、【完形填空】【完形填空】`);

        // 文章 - 空位数字下划线 + 标记
        const article = data.article || '';
        writeClozeArticle(children, article);

        children.push(new Paragraph({}));

        // 子题
        const questions = data.questions || [];
        questions.forEach((q, idx) => {
            const options = q.options || {};
            const optionOrder = q.option_order || q.optionOrder || [];

            children.push(new Paragraph({
                children: [
                    new TextRun({ text: `【${idx + 1}】`, font: 'SimSun' }),
                ],
            }));

            optionOrder.forEach(letter => {
                const optText = options[letter] || '';
                const para = new Paragraph({});
                para.addChildElement(new TextRun({ text: `${letter}. `, font: 'SimSun' }));
                addMarkedText(para, optText);
                children.push(para);
            });
        });

        // 答案
        const answerLetters = [];
        questions.forEach(q => {
            const qnum = q.qnum || 0;
            const ans = (answers[qnum] && answers[qnum].answer) || '';
            answerLetters.push(ans);
        });

        children.push(new Paragraph({
            children: [
                new TextRun({ text: `答：${answerLetters.join('')}`, font: 'SimSun' }),
            ],
        }));

        // 解析
        children.push(new Paragraph({
            children: [new TextRun({ text: '解：', font: 'SimSun' })],
        }));

        questions.forEach((q, idx) => {
            const qnum = q.qnum || 0;
            const expl = (answers[qnum] && answers[qnum].explanation) || '';
            if (expl) {
                const para = new Paragraph({});
                para.addChildElement(new TextRun({ text: `【${idx + 1}】`, font: 'SimSun' }));
                addMarkedText(para, expl);
                children.push(para);
            }
        });
    }

    function writeClozeArticle(children, article) {
        // 写入完形文章，处理空位下划线和标记
        const lines = article.split('\n');
        let clozeCounter = 0;  // 空位序号从1开始顺延重排

        lines.forEach(line => {
            const stripped = line.trim();
            if (!stripped) {
                children.push(new Paragraph({}));
                return;
            }

            const para = new Paragraph({});

            // 先按标记分割，再在每个token中检查是否有空位数字
            const tokens = Formatter.parseMarks(line);

            tokens.forEach(token => {
                const text = token.text;
                const bold = token.bold;
                const underline = token.underline;

                // 空位识别：仅识别 __数字__ 标记
                // parseMarks 会把 __数字__ 拆成单独的 underline token（内容为 " 数字 " 或 "数字"）
                // 但如果数字两侧有空格被剥离到外面，数字本身是纯 underline token
                // 最稳妥的方式：在原始行上先匹配 __数字__，再逐段生成 run
                // 这里简化处理：若 token 是纯 underline 且内容匹配 "数字" 格式（两侧可能带空格），则视为空位
                const isClozeBlank = underline && /^\s*\d+\s*$/.test(text) && !bold;

                if (isClozeBlank) {
                    clozeCounter += 1;
                    const blankOpts = {
                        text: ` ${clozeCounter} `,
                        font: 'SimSun',
                        underline: { type: UnderlineType.SINGLE },
                    };
                    para.addChildElement(new TextRun(blankOpts));
                    return;
                }

                // 非空位 token 直接输出
                const opts = { text, font: 'SimSun' };
                if (bold) opts.bold = true;
                if (underline) opts.underline = { type: UnderlineType.SINGLE };
                para.addChildElement(new TextRun(opts));
            });

            children.push(para);
        });
    }

    // ========== 阅读理解 ==========
    function buildReading(children, data, answers, sectionNum) {
        sectionNum = sectionNum || 2;
        answers = answers || {};
        const textNum = data.text_num || 1;

        addHeading(children, `${sectionNum}、【复合题】【阅读理解】`);

        children.push(new Paragraph({
            children: [new TextRun({ text: `Text ${textNum}`, font: 'SimSun' })],
        }));
        children.push(new Paragraph({}));

        // 文章
        const article = data.article || '';
        addMultilineMarked(children, article);

        // 分析
        children.push(new Paragraph({
            children: [new TextRun({ text: '分析：', font: 'SimSun' })],
        }));

        // 子题
        const questions = data.questions || [];
        questions.forEach((q, idx) => {
            const qnum = q.qnum || 0;
            const stem = q.stem || '';
            const options = q.options || {};
            const optionOrder = q.option_order || q.optionOrder || [];
            const ans = (answers[qnum] && answers[qnum].answer) || '';
            const expl = (answers[qnum] && answers[qnum].explanation) || '';

            // 子题标题
            const titlePara = new Paragraph({});
            titlePara.addChildElement(new TextRun({ text: `【${idx + 1}】【单选题】${qnum}. `, font: 'SimSun' }));
            addMarkedText(titlePara, stem);
            children.push(titlePara);

            // 选项
            optionOrder.forEach(letter => {
                const optText = options[letter] || '';
                const optPara = new Paragraph({});
                optPara.addChildElement(new TextRun({ text: `${letter}. `, font: 'SimSun' }));
                addMarkedText(optPara, optText);
                children.push(optPara);
            });

            // 答
            children.push(new Paragraph({
                children: [
                    new TextRun({ text: `答：${ans}`, font: 'SimSun' }),
                ],
            }));

            // 解
            if (expl) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: '解：', font: 'SimSun' })],
                }));
                addMultilineMarked(children, expl);
            }

            children.push(new Paragraph({}));
        });
    }

    // ========== 新题型 ==========
    function buildPartb(children, data, answers, sectionNum) {
        sectionNum = sectionNum || 6;
        answers = answers || {};
        const qtypeLabel = data.type || '小标题';

        addHeading(children, `${sectionNum}、【复合题】【${qtypeLabel}】`);

        const options = data.options || {};
        const optionOrder = data.option_order || data.optionOrder || [];

        // 选项 A-G
        optionOrder.forEach(letter => {
            const optText = options[letter] || '';
            const para = new Paragraph({});
            para.addChildElement(new TextRun({ text: `[${letter}] `, font: 'SimSun' }));
            addMarkedText(para, optText);
            children.push(para);
        });

        children.push(new Paragraph({}));

        // 文章内容
        const articleText = data.article_text || '';
        if (!articleText) {
            const intro = data.intro_paragraph || '';
            if (intro) {
                addMultilineMarked(children, intro);
                children.push(new Paragraph({}));
            }

            const items = data.items || [];
            items.forEach(item => {
                const qnum = item.qnum || 0;
                const paragraph = item.paragraph || '';
                children.push(new Paragraph({
                    children: [
                        new TextRun({ text: `${qnum}._______________________________`, font: 'SimSun' }),
                    ],
                }));
                addMultilineMarked(children, paragraph);
                children.push(new Paragraph({}));
            });
        } else {
            addMultilineMarked(children, articleText);
        }

        // 分析
        children.push(new Paragraph({
            children: [new TextRun({ text: '分析：', font: 'SimSun' })],
        }));

        let items = data.items || [];
        if (items.length === 0) {
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

            children.push(new Paragraph({
                children: [
                    new TextRun({ text: `【${idx + 1}】【单选题】${qnum}.`, font: 'SimSun' }),
                ],
            }));

            optionOrder.forEach(letter => {
                const optText = options[letter] || '';
                const para = new Paragraph({});
                para.addChildElement(new TextRun({ text: `${letter}. `, font: 'SimSun' }));
                addMarkedText(para, optText);
                children.push(para);
            });

            children.push(new Paragraph({
                children: [
                    new TextRun({ text: `答：${ans}`, font: 'SimSun' }),
                ],
            }));

            if (expl) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: '解：', font: 'SimSun' })],
                }));
                addMultilineMarked(children, expl);
            }

            children.push(new Paragraph({}));
        });
    }

    // ========== 翻译 ==========
    function buildTranslation(children, data, answers, paperType) {
        paperType = paperType || 'yingyi';
        if (paperType === 'yinger') {
            buildTranslationYinger(children, data, answers);
        } else {
            buildTranslationYingyi(children, data, answers);
        }
    }

    function buildTranslationYingyi(children, data, answers, sectionNum) {
        sectionNum = sectionNum || 7;
        answers = answers || {};

        addHeading(children, `${sectionNum}、【复合题】【翻译】`);

        const article = data.article_text || '';
        const underlined = data.underlined_sentences || [];

        // 文章 - 划线句
        writeTranslationArticle(children, article, underlined);

        // 分析
        children.push(new Paragraph({
            children: [new TextRun({ text: '分析：', font: 'SimSun' })],
        }));

        underlined.forEach((sent, idx) => {
            const qnum = sent.qnum || 0;
            const sentText = sent.text || '';
            const ansData = answers[qnum] || {};
            const translation = ansData.translation || '';
            const analysis = ansData.analysis || '';

            // 子题
            const para = new Paragraph({});
            para.addChildElement(new TextRun({ text: `【${idx + 1}】【复合题】(${qnum}) `, font: 'SimSun' }));
            para.addChildElement(new TextRun({
                text: sentText,
                font: 'SimSun',
                underline: { type: UnderlineType.SINGLE },
            }));
            children.push(para);

            // 答
            children.push(new Paragraph({
                children: [new TextRun({ text: '答：', font: 'SimSun' })],
            }));
            if (translation) {
                addMultilineMarked(children, translation);
            }

            // 解
            if (analysis) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: '解：', font: 'SimSun' })],
                }));
                addMultilineMarked(children, analysis);
            }

            children.push(new Paragraph({}));
        });
    }

    function writeTranslationArticle(children, articleText, underlinedSentences) {
        // 写入翻译文章，处理划线句和标记
        const lines = articleText.split('\n');

        lines.forEach(line => {
            const stripped = line.trim();
            if (!stripped) {
                children.push(new Paragraph({}));
                return;
            }

            // 找出这一行中的划线句
            const matches = [];
            underlinedSentences.forEach(s => {
                const sentence = (s.text || '').trim();
                if (!sentence) return;
                const idx = stripped.indexOf(sentence);
                if (idx >= 0) {
                    matches.push([idx, idx + sentence.length, sentence]);
                }
            });

            if (matches.length === 0) {
                const para = new Paragraph({});
                addMarkedText(para, stripped);
                children.push(para);
                return;
            }

            matches.sort((a, b) => a[0] - b[0]);

            const para = new Paragraph({});
            let cursor = 0;

            matches.forEach(([start, end, sentence]) => {
                if (start > cursor) {
                    addMarkedText(para, stripped.substring(cursor, start));
                }
                para.addChildElement(new TextRun({
                    text: sentence,
                    font: 'SimSun',
                    underline: { type: UnderlineType.SINGLE },
                }));
                cursor = end;
            });

            if (cursor < stripped.length) {
                addMarkedText(para, stripped.substring(cursor));
            }

            children.push(para);
        });
    }

    function buildTranslationYinger(children, data, answers, sectionNum) {
        sectionNum = sectionNum || 7;
        answers = answers || {};

        addHeading(children, `${sectionNum}、【解答题】【翻译】`);

        const source = data.source || data.article_text || '';
        addMultilineMarked(children, source);

        let translation = '';
        let analysis = '';
        if (typeof answers === 'object' && answers !== null) {
            translation = answers.translation || '';
            analysis = answers.analysis || '';
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

        children.push(new Paragraph({
            children: [new TextRun({ text: '答：', font: 'SimSun' })],
        }));
        if (translation) {
            addMultilineMarked(children, translation);
        }

        if (analysis) {
            children.push(new Paragraph({
                children: [new TextRun({ text: '解：', font: 'SimSun' })],
            }));
            addMultilineMarked(children, analysis);
        }
    }

    // ========== 写作 ==========
    function buildWriting(children, data, answerData, isPartA, sectionNum) {
        sectionNum = sectionNum || (isPartA ? 8 : 9);
        answerData = answerData || {};

        const category = isPartA ? '小作文' : '大作文';
        const partLabel = isPartA ? 'Part A' : 'Part B';

        addHeading(children, `${sectionNum}、【写作题】【${category}】`);

        const directions = data.directions || '';
        if (directions) {
            children.push(new Paragraph({
                children: [new TextRun({ text: partLabel, font: 'SimSun' })],
            }));
            children.push(new Paragraph({}));
            addMultilineMarked(children, directions);
        }

        children.push(new Paragraph({
            children: [new TextRun({ text: '答：', font: 'SimSun' })],
        }));
        children.push(new Paragraph({
            children: [new TextRun({ text: '【参考范文】', font: 'SimSun' })],
        }));

        const modelEssay = answerData.model_essay || '';
        if (modelEssay) {
            addMultilineMarked(children, modelEssay);
        }

        children.push(new Paragraph({
            children: [new TextRun({ text: '解：', font: 'SimSun' })],
        }));
        children.push(new Paragraph({
            children: [new TextRun({ text: '【参考译文】', font: 'SimSun' })],
        }));

        const translation = answerData.translation || '';
        if (translation) {
            addMultilineMarked(children, translation);
        }
    }

    // ========== 语法题（月测） ==========
    function buildGrammar(children, data, answers, sectionNum, isYuece) {
        sectionNum = sectionNum || 1;
        answers = answers || {};
        const questions = data.questions || [];

        if (!isYuece) {
            addHeading(children, `${sectionNum}、【复合题】【语法题】`);
        }

        questions.forEach((q, idx) => {
            const qnum = q.qnum || 0;
            const stem = q.stem || '';
            const options = q.options || {};
            const optionOrder = q.option_order || q.optionOrder || [];
            const ans = (answers[qnum] && answers[qnum].answer) || '';
            const expl = (answers[qnum] && answers[qnum].explanation) || '';

            // 子题标题
            const titlePara = new Paragraph({});
            if (isYuece) {
                titlePara.addChildElement(new TextRun({ text: '1、【单选题】【语法题】', bold: true, font: 'SimSun' }));
            } else {
                titlePara.addChildElement(new TextRun({ text: `【${idx + 1}】【单选题】${qnum}. `, font: 'SimSun' }));
            }
            addMarkedText(titlePara, stem);
            children.push(titlePara);

            // 选项
            optionOrder.forEach(letter => {
                const optText = options[letter] || '';
                const optPara = new Paragraph({});
                optPara.addChildElement(new TextRun({ text: `${letter}. `, font: 'SimSun' }));
                addMarkedText(optPara, optText);
                children.push(optPara);
            });

            // 答
            children.push(new Paragraph({
                children: [new TextRun({ text: `答：${ans}`, font: 'SimSun' })],
            }));

            // 解
            if (expl) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: '解：', font: 'SimSun' })],
                }));
                addMultilineMarked(children, expl);
            }

            children.push(new Paragraph({}));
        });
    }
    // ========== 词汇题（月测） ==========
    function buildVocab(children, data, answers, sectionNum, partLabel, isYuece) {
        sectionNum = sectionNum || 2;
        answers = answers || {};
        partLabel = partLabel || 'part1';
        const questions = data.questions || [];

        const category = partLabel === 'part2' ? '选词填空' : '同义替换';
        if (!isYuece) {
            addHeading(children, `${sectionNum}、【复合题】【词汇题-${category}】`);
        }

        questions.forEach((q, idx) => {
            const qnum = q.qnum || 0;
            const stem = q.stem || '';
            const options = q.options || {};
            const optionOrder = q.option_order || q.optionOrder || [];
            const ans = (answers[qnum] && answers[qnum].answer) || '';
            const expl = (answers[qnum] && answers[qnum].explanation) || '';

            // 子题标题
            const titlePara = new Paragraph({});
            if (isYuece) {
                titlePara.addChildElement(new TextRun({ text: '1、【单选题】【' + category + '】', bold: true, font: 'SimSun' }));
            } else {
                titlePara.addChildElement(new TextRun({ text: `【${idx + 1}】【单选题】${qnum}. `, font: 'SimSun' }));
            }
            addMarkedText(titlePara, stem);
            children.push(titlePara);

            // 选项
            optionOrder.forEach(letter => {
                const optText = options[letter] || '';
                const optPara = new Paragraph({});
                optPara.addChildElement(new TextRun({ text: `${letter}. `, font: 'SimSun' }));
                addMarkedText(optPara, optText);
                children.push(optPara);
            });

            // 答
            children.push(new Paragraph({
                children: [new TextRun({ text: `答：${ans}`, font: 'SimSun' })],
            }));

            // 解（词汇题解析中划线词用下划线格式标记，通过 __xxx__ 标记实现）
            if (expl) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: '解：', font: 'SimSun' })],
                }));
                addMultilineMarked(children, expl);
            }

            children.push(new Paragraph({}));
        });
    }
    // ========== 月测完形填空 ==========
    function buildYueceCloze(children, data, answers, sectionNum) {
        sectionNum = sectionNum || 3;
        answers = answers || {};

        addHeading(children, '1、【完形填空】【完形填空】');

        // 文章
        const article = data.article || '';
        writeClozeArticle(children, article);

        children.push(new Paragraph({}));

        // 子题
        const questions = data.questions || [];
        questions.forEach((q, idx) => {
            const options = q.options || {};
            const optionOrder = q.option_order || q.optionOrder || [];

            children.push(new Paragraph({
                children: [new TextRun({ text: `【${idx + 1}】`, font: 'SimSun' })],
            }));

            optionOrder.forEach(letter => {
                const optText = options[letter] || '';
                const para = new Paragraph({});
                para.addChildElement(new TextRun({ text: `${letter}. `, font: 'SimSun' }));
                addMarkedText(para, optText);
                children.push(para);
            });
        });

        // 答案
        const answerLetters = [];
        questions.forEach(q => {
            const qnum = q.qnum || 0;
            const ans = (answers[qnum] && answers[qnum].answer) || '';
            answerLetters.push(ans);
        });

        children.push(new Paragraph({
            children: [
                new TextRun({ text: `答：${answerLetters.join('')}`, font: 'SimSun' }),
            ],
        }));

        // 解析
        children.push(new Paragraph({
            children: [new TextRun({ text: '解：', font: 'SimSun' })],
        }));

        questions.forEach((q, idx) => {
            const qnum = q.qnum || 0;
            const expl = (answers[qnum] && answers[qnum].explanation) || '';
            if (expl) {
                const para = new Paragraph({});
                para.addChildElement(new TextRun({ text: `【${idx + 1}】`, font: 'SimSun' }));
                addMarkedText(para, expl);
                children.push(para);
            }
        });
    }

    // ========== 月测翻译 ==========
    function buildYueceTranslation(children, data, answers, sectionNum) {
        sectionNum = sectionNum || 4;
        answers = answers || {};
        const sentences = data.sentences || [];

        sentences.forEach((sent, idx) => {
            const qnum = sent.qnum || 0;
            const sentText = sent.text || '';
            const ansData = answers[qnum] || {};
            const translation = ansData.translation || '';
            const analysis = ansData.analysis || '';

            // 每道题独立大题标题
            addHeading(children, '1、【解答题】【翻译】');

            // 子题
            const para = new Paragraph({});
            para.addChildElement(new TextRun({ text: `【1】【解答题】(${qnum}) `, font: 'SimSun' }));
            addMarkedText(para, sentText);
            children.push(para);

            // 答
            children.push(new Paragraph({
                children: [new TextRun({ text: '答：', font: 'SimSun' })],
            }));
            if (translation) {
                addMultilineMarked(children, translation);
            }

            // 解
            if (analysis) {
                children.push(new Paragraph({
                    children: [new TextRun({ text: '解：', font: 'SimSun' })],
                }));
                addMultilineMarked(children, analysis);
            }

            children.push(new Paragraph({}));
        });
    }

    // ========== 创建文档（统一入口） ==========
    function createDocument(children, styles) {
        styles = styles || {};
        return new Document({
            styles: {
                default: {
                    document: {
                        run: {
                            font: 'SimSun',
                            size: 24, // 12pt = 24 half-points
                        },
                    },
                },
            },
            sections: [{
                properties: {},
                children: children,
            }],
        });
    }

    // ========== 导出函数 ==========
    async function generateCloze(data, answers, filename) {
        const children = [];
        buildCloze(children, data, answers, 1);
        const doc = createDocument(children);
        await downloadDoc(doc, filename || '完形填空.docx');
    }

    async function generateReading(data, answers, filename) {
        const children = [];
        buildReading(children, data, answers, 2);
        const doc = createDocument(children);
        await downloadDoc(doc, filename || '阅读理解.docx');
    }

    async function generatePartb(data, answers, filename) {
        const children = [];
        buildPartb(children, data, answers, 6);
        const doc = createDocument(children);
        await downloadDoc(doc, filename || '新题型.docx');
    }

    async function generateTranslation(data, answers, paperType, filename) {
        const children = [];
        buildTranslation(children, data, answers, paperType);
        const doc = createDocument(children);
        await downloadDoc(doc, filename || '翻译.docx');
    }

    async function generateWriting(data, answerData, isPartA, filename) {
        const children = [];
        buildWriting(children, data, answerData, isPartA, isPartA ? 8 : 9);
        const doc = createDocument(children);
        await downloadDoc(doc, filename || (isPartA ? '小作文.docx' : '大作文.docx'));
    }

    async function generateGrammar(data, answers, filename) {
        const children = [];
        buildGrammar(children, data, answers, 1, true);
        const doc = createDocument(children);
        await downloadDoc(doc, filename || '语法题.docx');
    }

    async function generateVocab(data1, answers1, data2, answers2, filename) {
        const children = [];
        let sectionNum = 2;
        if (data1 && data1.questions && data1.questions.length > 0) {
            buildVocab(children, data1, answers1 || {}, sectionNum, 'part1', true);
            sectionNum++;
            if (data2 && data2.questions && data2.questions.length > 0) {
                addPageBreak(children);
            }
        }
        if (data2 && data2.questions && data2.questions.length > 0) {
            buildVocab(children, data2, answers2 || {}, sectionNum, 'part2', true);
        }
        const doc = createDocument(children);
        const name = '词汇题-月测.docx';
        await downloadDoc(doc, filename || name);
    }

    async function generateYueceCloze(data, answers, filename) {
        const children = [];
        buildYueceCloze(children, data, answers, 3);
        const doc = createDocument(children);
        await downloadDoc(doc, filename || '完形填空-月测.docx');
    }

    async function generateYueceTranslation(data, answers, filename) {
        const children = [];
        buildYueceTranslation(children, data, answers, 4);
        const doc = createDocument(children);
        await downloadDoc(doc, filename || '翻译-月测.docx');
    }

    async function generateYueceFullPaper(examData, answerData, filename) {
        examData = examData || {};
        answerData = answerData || {};

        const allChildren = [];
        let sectionNum = 1;

        // 语法题
        if (examData.grammar && examData.grammar.questions && examData.grammar.questions.length > 0) {
            buildGrammar(allChildren, examData.grammar, answerData.grammar || {}, sectionNum, true);
            sectionNum++;
            addPageBreak(allChildren);
        }

        // 词汇题 Part 1
        if (examData.vocab_part1 && examData.vocab_part1.questions && examData.vocab_part1.questions.length > 0) {
            buildVocab(allChildren, examData.vocab_part1, answerData.vocab_part1 || {}, sectionNum, 'part1', true);
            sectionNum++;
            addPageBreak(allChildren);
        }

        // 词汇题 Part 2
        if (examData.vocab_part2 && examData.vocab_part2.questions && examData.vocab_part2.questions.length > 0) {
            buildVocab(allChildren, examData.vocab_part2, answerData.vocab_part2 || {}, sectionNum, 'part2', true);
            sectionNum++;
            addPageBreak(allChildren);
        }

        // 完形填空
        if (examData.cloze) {
            buildYueceCloze(allChildren, examData.cloze, answerData.cloze || {}, sectionNum);
            sectionNum++;
            addPageBreak(allChildren);
        }

        // 翻译
        if (examData.translation) {
            buildYueceTranslation(allChildren, examData.translation, answerData.translation || {}, sectionNum);
            sectionNum++;
        }

        // 移除最后的分页符
        if (allChildren.length > 0) {
            const last = allChildren[allChildren.length - 1];
            if (last && last.root && last.root.length > 0 && last.root[0] instanceof PageBreak) {
                allChildren.pop();
            }
        }

        const doc = createDocument(allChildren);
        await downloadDoc(doc, filename || '考研英语月测整卷.docx');
    }

    async function generateFullPaper(examData, answerData, paperType, transType, filename) {
        examData = examData || {};
        answerData = answerData || {};
        paperType = paperType || 'yingyi';
        transType = transType || paperType;

        const allChildren = [];
        let sectionNum = 1;

        // 完形
        if (examData.cloze) {
            buildCloze(allChildren, examData.cloze, answerData.cloze || {}, sectionNum);
            sectionNum++;
            addPageBreak(allChildren);
        }

        // 阅读
        if (examData.reading && examData.reading.length > 0) {
            examData.reading.forEach(textData => {
                buildReading(allChildren, textData, answerData.reading || {}, sectionNum);
                sectionNum++;
                addPageBreak(allChildren);
            });
        }

        // 新题型
        if (examData.partb) {
            buildPartb(allChildren, examData.partb, answerData.partb || {}, sectionNum);
            sectionNum++;
            addPageBreak(allChildren);
        }

        // 翻译
        if (examData.translation) {
            buildTranslation(allChildren, examData.translation, answerData.translation || {}, transType);
            sectionNum++;
            addPageBreak(allChildren);
        }

        // 小作文
        if (examData.writing_a) {
            buildWriting(allChildren, examData.writing_a, answerData.writing_a || {}, true, sectionNum);
            sectionNum++;
            addPageBreak(allChildren);
        }

        // 大作文
        if (examData.writing_b) {
            buildWriting(allChildren, examData.writing_b, answerData.writing_b || {}, false, sectionNum);
            sectionNum++;
        }

        // 移除最后的分页符（如果最后一个元素是分页段落）
        if (allChildren.length > 0) {
            const last = allChildren[allChildren.length - 1];
            // 检查是否是只包含 PageBreak 的段落
            if (last && last.root && last.root.length > 0 && last.root[0] instanceof PageBreak) {
                allChildren.pop();
            }
        }

        const doc = createDocument(allChildren);
        await downloadDoc(doc, filename || '考研英语整卷.docx');
    }

    async function downloadDoc(doc, filename) {
        const blob = await Packer.toBlob(doc);
        saveAs(blob, filename);
    }

    return {
        generateCloze,
        generateReading,
        generatePartb,
        generateTranslation,
        generateWriting,
        generateGrammar,
        generateVocab,
        generateYueceCloze,
        generateYueceTranslation,
        generateFullPaper,
        generateYueceFullPaper,
    };
})();
