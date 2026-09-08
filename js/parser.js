/**
 * 纯文本试题解析器
 * 从用户粘贴的文本中解析各题型内容
 * 从 parser_text.py 翻译而来
 */

const Parser = (function() {

    // ==================== 整卷试题解析 ====================
    function parseExamText(text) {
        const lines = text.split('\n');
        const paragraphs = lines.map(l => l.trim());

        const result = {
            cloze: null,
            reading: [],
            partb: null,
            translation: null,
            writing_a: null,
            writing_b: null,
        };

        const sections = locateSections(paragraphs);

        // 完形填空
        if (sections.cloze_start !== undefined) {
            const end = sections.sectionII_start !== undefined
                ? sections.sectionII_start
                : (sections.partA_start !== undefined ? sections.partA_start : paragraphs.length);
            const clozeParas = paragraphs.slice(sections.cloze_start, end);
            result.cloze = parseCloze(clozeParas);
        }

        // 阅读理解 Part A
        if (sections.partA_start !== undefined) {
            const end = sections.partB_start !== undefined
                ? sections.partB_start
                : paragraphs.length;
            const partAParas = paragraphs.slice(sections.partA_start, end);
            result.reading = parsePartA(partAParas);
        }

        // 新题型 Part B
        if (sections.partB_start !== undefined) {
            const end = sections.partC_start !== undefined
                ? sections.partC_start
                : (sections.writing_start !== undefined ? sections.writing_start : paragraphs.length);
            const partBParas = paragraphs.slice(sections.partB_start, end);
            result.partb = parsePartB(partBParas);
        }

        // 翻译 Part C
        if (sections.partC_start !== undefined) {
            const end = sections.writing_start !== undefined
                ? sections.writing_start
                : paragraphs.length;
            const partCParas = paragraphs.slice(sections.partC_start, end);
            result.translation = parsePartCText(partCParas);
        }

        // 写作
        if (sections.writing_start !== undefined) {
            const writingParas = paragraphs.slice(sections.writing_start);
            const [wa, wb] = parseWriting(writingParas);
            result.writing_a = wa;
            result.writing_b = wb;
        }

        return result;
    }

    // ==================== 答案解析 ====================
    function parseAnswerText(text) {
        const lines = text.split('\n');
        const paragraphs = lines.map(l => l.trim());

        const result = {
            cloze: {},
            reading: {},
            partb: {},
            translation: {},
            writing_a: {},
            writing_b: {},
        };

        const sections = locateAnswerSections(paragraphs);

        // 完形
        if (sections.cloze_start !== undefined) {
            const end = sections.reading_start !== undefined
                ? sections.reading_start
                : (sections.sectionII_start !== undefined ? sections.sectionII_start : paragraphs.length);
            const clozeParas = paragraphs.slice(sections.cloze_start, end);
            result.cloze = parseClozeAnswers(clozeParas);
        }

        // 阅读
        if (sections.reading_start !== undefined) {
            let end = paragraphs.length;
            if (sections.partB_start !== undefined) end = sections.partB_start;
            else if (sections.translation_start !== undefined) end = sections.translation_start;
            else if (sections.writing_start !== undefined) end = sections.writing_start;
            const readingParas = paragraphs.slice(sections.reading_start, end);
            result.reading = parseReadingAnswers(readingParas);
        }

        // Part B
        if (sections.partB_start !== undefined) {
            const end = sections.translation_start !== undefined
                ? sections.translation_start
                : (sections.writing_start !== undefined ? sections.writing_start : paragraphs.length);
            const partBParas = paragraphs.slice(sections.partB_start, end);
            result.partb = parsePartBAnswers(partBParas);
        }

        // 翻译
        if (sections.translation_start !== undefined) {
            const end = sections.writing_start !== undefined
                ? sections.writing_start
                : paragraphs.length;
            const transParas = paragraphs.slice(sections.translation_start, end);
            result.translation = parseTranslationAnswers(transParas);
        }

        // 写作
        if (sections.writing_start !== undefined) {
            const writingParas = paragraphs.slice(sections.writing_start);
            const [wa, wb] = parseWritingAnswers(writingParas);
            result.writing_a = wa;
            result.writing_b = wb;
        }

        return result;
    }

    // ==================== 定位部分 ====================
    function locateSections(paragraphs) {
        const sections = {};

        for (let i = 0; i < paragraphs.length; i++) {
            let p = paragraphs[i].trim();
            // 去除 markdown 标题标记 (#, ##, ### 等)
            p = p.replace(/^#+\s*/, '');

            // Section I Use of English
            if (/^Section\s*I\s/i.test(p)) {
                if (p.indexOf('Use of English') >= 0 || p.indexOf('完形') >= 0) {
                    sections.cloze_start = i;
                }
                continue;
            }

            // Section II Reading Comprehension
            if (/^Section\s*II\s/i.test(p) && p.indexOf('Reading') >= 0) {
                sections.sectionII_start = i;
                continue;
            }

            // Part A
            if (/^Part\s*A\s*$/i.test(p) && sections.partA_start === undefined) {
                if (sections.sectionII_start !== undefined && i > sections.sectionII_start) {
                    sections.partA_start = i;
                }
            }

            // Part B
            if (/^Part\s*B\s*$/i.test(p) && sections.partB_start === undefined) {
                if (sections.partA_start !== undefined) {
                    sections.partB_start = i;
                }
            }

            // Part C
            if (/^Part\s*C\s*$/i.test(p) && sections.partC_start === undefined) {
                if (sections.partB_start !== undefined) {
                    sections.partC_start = i;
                }
            }

            // Section III Writing
            if (/^Section\s*III\s/i.test(p) && p.toLowerCase().indexOf('writing') >= 0) {
                sections.writing_section_start = i;
                sections.writing_start = i;
            }

            // Writing Part A
            if (/^Part\s*A\s*$/i.test(p) && sections.writing_section_start !== undefined) {
                if (i > sections.writing_section_start && sections.writing_partA_start === undefined) {
                    sections.writing_partA_start = i;
                }
            }

            // Writing Part B
            if (/^Part\s*B\s*$/i.test(p) && sections.writing_section_start !== undefined) {
                if (sections.writing_partA_start !== undefined && i > sections.writing_partA_start) {
                    sections.writing_partB_start = i;
                }
            }
        }

        return sections;
    }

    function locateAnswerSections(paragraphs) {
        const sections = {};

        for (let i = 0; i < paragraphs.length; i++) {
            let p = paragraphs[i].trim();
            // 去除 markdown 标题标记 (#, ##, ### 等)
            p = p.replace(/^#+\s*/, '');

            if (/^Section\s*I\s/i.test(p)) {
                if (p.indexOf('Use of English') >= 0 || p.indexOf('完形') >= 0) {
                    sections.cloze_start = i;
                }
                continue;
            }

            if (/^Section\s*II\s/i.test(p) && p.indexOf('Reading') >= 0) {
                sections.reading_section_start = i;
                sections.sectionII_start = i;
                continue;
            }

            if (/^Part\s*A\s*$/i.test(p)) {
                if (sections.reading_section_start !== undefined && sections.reading_start === undefined) {
                    sections.reading_start = i;
                } else if (sections.writing_section_start !== undefined && sections.writing_partA_start === undefined) {
                    sections.writing_partA_start = i;
                }
            }

            if (/^Part\s*B\s*$/i.test(p)) {
                if (sections.reading_section_start !== undefined && sections.partB_start === undefined) {
                    sections.partB_start = i;
                } else if (sections.writing_section_start !== undefined && sections.writing_partB_start === undefined) {
                    sections.writing_partB_start = i;
                }
            }

            if (/^Part\s*C\s*$/i.test(p)) {
                if (sections.reading_section_start !== undefined && sections.translation_start === undefined) {
                    sections.translation_start = i;
                }
            }

            if (/^Section\s*III\s/i.test(p)) {
                if (p.indexOf('Writing') >= 0 || p.indexOf('写作') >= 0 || p.toLowerCase().indexOf('writing') >= 0) {
                    sections.writing_section_start = i;
                    sections.writing_start = i;
                }
            }
        }

        return sections;
    }

    // ==================== 完形解析 ====================
    function parseCloze(paras) {
        const data = {
            directions: '',
            article: '',
            questions: [],
        };

        // 找 Directions
        let dirStart = null;
        for (let i = 0; i < paras.length; i++) {
            if (paras[i].indexOf('Directions') >= 0) {
                dirStart = i;
                break;
            }
        }

        if (dirStart === null) return data;

        // 收集 Directions
        const dirLines = [];
        let articleStart = null;
        for (let i = dirStart; i < paras.length; i++) {
            const p = paras[i].trim();
            if (!p) {
                if (dirLines.length > 0) {
                    articleStart = i + 1;
                    break;
                }
                continue;
            }
            dirLines.push(p);
            if (p.toLowerCase().indexOf('points') >= 0 && i > dirStart) {
                articleStart = i + 1;
                break;
            }
        }

        data.directions = dirLines.join('\n').trim();

        if (articleStart === null) return data;

        // 跳过空行
        while (articleStart < paras.length && !paras[articleStart].trim()) {
            articleStart++;
        }

        // 收集文章，直到遇到题目
        const articleLines = [];
        let questionStart = null;

        for (let i = articleStart; i < paras.length; i++) {
            const p = paras[i].trim();
            if (/^\d+\s*[.．]\s*\[?[A-D]\]?/.test(p)) {
                questionStart = i;
                break;
            }
            articleLines.push(p);
        }

        // 清理空行
        while (articleLines.length > 0 && !articleLines[0]) articleLines.shift();
        while (articleLines.length > 0 && !articleLines[articleLines.length - 1]) articleLines.pop();

        data.article = articleLines.join('\n').trim();

        // 解析20道题选项
        if (questionStart !== null) {
            for (let i = questionStart; i < paras.length; i++) {
                const p = paras[i].trim();
                if (!p) continue;

                const qMatch = p.match(/^(\d+)\s*[.．]/);
                if (qMatch) {
                    const qnum = parseInt(qMatch[1]);
                    if (qnum >= 1 && qnum <= 20) {
                        const opts = matchOptionsInLine(p);
                        const options = {};
                        const optionOrder = [];
                        opts.forEach(([letter, text]) => {
                            if ('ABCD'.indexOf(letter) >= 0) {
                                options[letter] = text.trim();
                                optionOrder.push(letter);
                            }
                        });

                        if (optionOrder.length > 0) {
                            data.questions.push({
                                qnum: qnum,
                                options: options,
                                option_order: optionOrder,
                            });
                        }
                    }
                }
            }
        }

        return data;
    }

    function matchOptionsInLine(line) {
        const results = [];

        // 模式1: [A] text [B] text ...
        const bracketMatches = [...line.matchAll(/\[([A-G])\]/gi)];
        if (bracketMatches.length >= 2 || (bracketMatches.length === 1 && bracketMatches[0].index === 0)) {
            for (let i = 0; i < bracketMatches.length; i++) {
                const m = bracketMatches[i];
                const letter = m[1].toUpperCase();
                const start = m.index + m[0].length;
                const end = i + 1 < bracketMatches.length ? bracketMatches[i + 1].index : line.length;
                let text = line.substring(start, end).trim();
                text = text.replace(/^[\s\t]+/, '').trim();
                results.push([letter, text]);
            }
            return results;
        }

        // 模式2: A. text B. text ...
        const allDotMatches = [...line.matchAll(/(?:^|\s)([A-G])\s*[.．]\s*/gi)];
        if (allDotMatches.length >= 2) {
            for (let i = 0; i < allDotMatches.length; i++) {
                const m = allDotMatches[i];
                const letter = m[1].toUpperCase();
                const start = m.index + m[0].length;
                const end = i + 1 < allDotMatches.length ? allDotMatches[i + 1].index : line.length;
                const text = line.substring(start, end).trim();
                results.push([letter, text]);
            }
            return results;
        }

        // 模式3: 单个选项行首
        const singleMatch = line.match(/^\[?([A-G])\]?\s*[.．]?\s*(.*)/i);
        if (singleMatch && /^[A-G]\s*[.．\]]/i.test(line.trim())) {
            const letter = singleMatch[1].toUpperCase();
            const text = singleMatch[2].trim();
            results.push([letter, text]);
        }

        return results;
    }

    // ==================== 阅读解析 ====================
    function parsePartA(paras) {
        const texts = [];

        const textIndices = [];
        for (let i = 0; i < paras.length; i++) {
            if (/^Text\s*\d+/i.test(paras[i].trim())) {
                textIndices.push(i);
            }
        }

        if (textIndices.length === 0) return texts;

        for (let idx = 0; idx < textIndices.length; idx++) {
            const textStart = textIndices[idx];
            const textEnd = idx + 1 < textIndices.length ? textIndices[idx + 1] : paras.length;
            const textParas = paras.slice(textStart, textEnd);

            const textData = {
                text_num: idx + 1,
                article: '',
                questions: [],
            };

            const articleLines = [];
            let questionStartIdx = null;

            for (let i = 1; i < textParas.length; i++) {
                const stripped = textParas[i].trim();
                if (/^\d+\s*[.．]\s*/.test(stripped)) {
                    const qnum = parseInt(stripped.match(/^(\d+)\s*[.．]/)[1]);
                    if (qnum >= 21) {
                        questionStartIdx = i;
                        break;
                    }
                }
                articleLines.push(stripped);
            }

            textData.article = articleLines.filter(l => l).join('\n').trim();

            if (questionStartIdx !== null) {
                const qParas = textParas.slice(questionStartIdx);
                const questions = parseReadingQuestions(qParas);
                textData.questions = questions;
            }

            texts.push(textData);
        }

        return texts;
    }

    function parseReadingQuestions(paras) {
        const questions = [];
        let currentQ = null;
        let collectingOptions = false;

        for (let i = 0; i < paras.length; i++) {
            const p = paras[i].trim();
            if (!p) continue;

            const qMatch = p.match(/^(\d+)\s*[.．]\s*(.*)/);
            if (qMatch) {
                const qnum = parseInt(qMatch[1]);
                if (qnum >= 21 && qnum <= 40) {
                    if (currentQ) questions.push(currentQ);
                    currentQ = {
                        qnum: qnum,
                        stem: qMatch[2].trim(),
                        options: {},
                        option_order: [],
                    };
                    collectingOptions = false;
                    continue;
                }
            }

            // 检测选项
            if (currentQ) {
                const opts = matchOptionsInLine(p);
                let matchedAny = false;
                opts.forEach(([letter, optText]) => {
                    if ('ABCD'.indexOf(letter) >= 0 && currentQ.options[letter] === undefined) {
                        currentQ.options[letter] = optText;
                        currentQ.option_order.push(letter);
                        collectingOptions = true;
                        matchedAny = true;
                    }
                });
                if (matchedAny) continue;
            }

            // 追加内容
            if (currentQ) {
                if (!collectingOptions) {
                    currentQ.stem += currentQ.stem ? '\n' + p : p;
                } else if (currentQ.option_order.length > 0) {
                    const lastLetter = currentQ.option_order[currentQ.option_order.length - 1];
                    currentQ.options[lastLetter] += currentQ.options[lastLetter] ? '\n' + p : p;
                }
            }
        }

        if (currentQ) questions.push(currentQ);
        return questions;
    }

    // ==================== Part B 解析 ====================
    function parsePartB(paras) {
        const data = {
            directions: '',
            options: {},
            option_order: [],
            intro_paragraph: '',
            items: [],
            type: '小标题',
        };

        // 找 Directions
        let dirStart = null;
        for (let i = 0; i < paras.length; i++) {
            if (paras[i].indexOf('Directions') >= 0) {
                dirStart = i;
                break;
            }
        }

        if (dirStart === null) return data;

        const dirLines = [];
        let optionsStart = null;
        const optionPattern = /^\[?([A-G])\]?\s*(.*)/i;

        for (let i = dirStart; i < paras.length; i++) {
            const p = paras[i].trim();
            const m = p.match(optionPattern);
            if (m) {
                const letter = m[1].toUpperCase();
                if ('ABCDEFG'.indexOf(letter) >= 0) {
                    optionsStart = i;
                    break;
                }
            }
            dirLines.push(p);
        }

        data.directions = dirLines.join('\n').trim();

        if (optionsStart === null) return data;

        // 收集选项 A-G
        let i = optionsStart;
        while (i < paras.length) {
            const p = paras[i].trim();
            const optMatch = p.match(optionPattern);
            if (optMatch) {
                const letter = optMatch[1].toUpperCase();
                if ('ABCDEFG'.indexOf(letter) >= 0) {
                    let optText = optMatch[2].trim();
                    let j = i + 1;
                    while (j < paras.length) {
                        const nextP = paras[j].trim();
                        if (!nextP) {
                            j++;
                            continue;
                        }
                        if (optionPattern.test(nextP) || /^\d+\s*[.．]/.test(nextP)) {
                            break;
                        }
                        optText += '\n' + nextP;
                        j++;
                    }
                    data.options[letter] = optText;
                    data.option_order.push(letter);
                    i = j;
                    continue;
                }
            }
            if (/^41\s*[.．]/.test(p)) break;
            i++;
        }

        // 找41题开始
        let itemStart = null;
        for (let idx = i; idx < paras.length; idx++) {
            if (/^41\s*[.．]/.test(paras[idx].trim())) {
                itemStart = idx;
                break;
            }
        }

        if (itemStart === null) return data;

        // 引导段
        const introLines = [];
        for (let idx = i; idx < itemStart; idx++) {
            const p = paras[idx].trim();
            if (p && !optionPattern.test(p)) {
                introLines.push(p);
            }
        }
        data.intro_paragraph = introLines.join('\n').trim();

        // 解析各题目
        let currentItem = null;
        for (let idx = itemStart; idx < paras.length; idx++) {
            const p = paras[idx].trim();
            if (!p) continue;

            const qMatch = p.match(/^(\d+)\s*[.．]/);
            if (qMatch) {
                const qnum = parseInt(qMatch[1]);
                if (qnum >= 41 && qnum <= 45) {
                    if (currentItem) {
                        data.items.push(currentItem);
                    }
                    currentItem = {
                        qnum: qnum,
                        paragraph: '',
                    };
                    continue;
                }
            }

            if (currentItem) {
                const nextQMatch = p.match(/^(\d+)\s*[.．]/);
                if (nextQMatch) {
                    const nextQnum = parseInt(nextQMatch[1]);
                    if (nextQnum >= 41 && nextQnum <= 45 && nextQnum !== currentItem.qnum) {
                        data.items.push(currentItem);
                        currentItem = {
                            qnum: nextQnum,
                            paragraph: '',
                        };
                        continue;
                    }
                }

                currentItem.paragraph += currentItem.paragraph ? '\n' + p : p;
            }
        }

        if (currentItem) data.items.push(currentItem);

        // 判断类型
        if (data.option_order.length === 7) {
            const dirText = data.directions.toLowerCase();
            if (dirText.indexOf('heading') >= 0 || dirText.indexOf('title') >= 0 || dirText.indexOf('小标题') >= 0) {
                data.type = '小标题';
            } else {
                data.type = '七选五';
            }
        }

        return data;
    }

    // ==================== 翻译解析 ====================
    function parsePartCText(paras) {
        const data = {
            directions: '',
            article_text: '',
            underlined_sentences: [],
        };

        // directions
        const dirLines = [];
        for (let i = 0; i < paras.length; i++) {
            const stripped = paras[i].trim();
            if (!stripped) {
                if (dirLines.length > 0) break;
                continue;
            }
            dirLines.push(stripped);
            if (stripped.indexOf('ANSWER SHEET') >= 0 || stripped.toLowerCase().indexOf('points') >= 0) {
                break;
            }
        }

        data.directions = dirLines.join('\n').trim();

        // 文章正文
        let articleStart = dirLines.length;
        while (articleStart < paras.length && !paras[articleStart].trim()) {
            articleStart++;
        }

        const articleLines = paras.slice(articleStart);
        const fullText = articleLines.filter(p => p.trim()).join('\n');
        data.article_text = fullText;

        // 提取划线句
        const underlined = [];

        // 先尝试匹配 (46) xxx 这种带题号的
        for (let li = 0; li < articleLines.length; li++) {
            const stripped = articleLines[li].trim();
            const m = stripped.match(/^\s*\(?(\d+)\)?\s*(.*)/);
            if (m) {
                const qnum = parseInt(m[1]);
                if (qnum >= 46 && qnum <= 50) {
                    let sentence = m[2].trim();
                    // 移除可能的标记
                    sentence = sentence.replace(/^[=_]+/, '');
                    sentence = sentence.replace(/[=_]+$/, '');
                    underlined.push({
                        qnum: qnum,
                        text: sentence,
                        para_text: stripped,
                    });
                }
            }
        }

        // 如果没找到带题号的，尝试找 __xxx__ 标记
        if (underlined.length === 0) {
            let qnum = 46;
            const patterns = [/__(.+?)__/g, /==(.+?)==/g];
            patterns.forEach(pattern => {
                let m;
                while ((m = pattern.exec(fullText)) !== null) {
                    const sentence = m[1].trim();
                    if (sentence && qnum <= 50) {
                        underlined.push({
                            qnum: qnum,
                            text: sentence,
                            para_text: '',
                        });
                        qnum++;
                    }
                }
            });
        }

        data.underlined_sentences = underlined;
        return data;
    }

    // ==================== 写作解析 ====================
    function parseWriting(paras) {
        const partAData = { directions: '' };
        const partBData = { directions: '' };

        let partAIdx = null;
        let partBIdx = null;

        for (let i = 0; i < paras.length; i++) {
            const stripped = paras[i].trim();
            if (/^Part\s*A\s*$/i.test(stripped)) {
                if (partAIdx === null) partAIdx = i;
            } else if (/^Part\s*B\s*$/i.test(stripped)) {
                if (partAIdx !== null && partBIdx === null) partBIdx = i;
            }
        }

        if (partAIdx !== null) {
            const end = partBIdx !== null ? partBIdx : paras.length;
            const partAParas = paras.slice(partAIdx, end);

            let dirStart = null;
            for (let i = 0; i < partAParas.length; i++) {
                if (partAParas[i].indexOf('Directions') >= 0) {
                    dirStart = i;
                    break;
                }
            }

            if (dirStart !== null) {
                partAData.directions = partAParas.slice(dirStart).filter(p => p.trim()).join('\n').trim();
            } else {
                partAData.directions = partAParas.filter(p => p.trim()).join('\n').trim();
            }
        }

        if (partBIdx !== null) {
            const partBParas = paras.slice(partBIdx);

            let dirStart = null;
            for (let i = 0; i < partBParas.length; i++) {
                if (partBParas[i].indexOf('Directions') >= 0) {
                    dirStart = i;
                    break;
                }
            }

            if (dirStart !== null) {
                partBData.directions = partBParas.slice(dirStart).filter(p => p.trim()).join('\n').trim();
            } else {
                partBData.directions = partBParas.filter(p => p.trim()).join('\n').trim();
            }
        }

        return [partAData, partBData];
    }

    // ==================== 答案解析 ====================
    function parseClozeAnswers(paras) {
        const answers = {};
        let currentQnum = null;
        let currentAnswer = null;
        let currentExplanation = [];
        let inExplanation = false;
        let inAnalysis = false;

        for (let i = 0; i < paras.length; i++) {
            const p = paras[i].trim();
            if (!p) {
                if (inExplanation && currentQnum) {
                    currentExplanation.push('');
                }
                continue;
            }

            if (p.indexOf('【试题解析】') >= 0) {
                inAnalysis = true;
                continue;
            }

            if (p.indexOf('【参考译文】') >= 0 && inAnalysis) {
                inAnalysis = false;
                if (currentQnum && currentAnswer) {
                    answers[currentQnum] = {
                        answer: currentAnswer,
                        explanation: currentExplanation.filter(l => l).join('\n').trim(),
                    };
                }
                currentQnum = null;
                continue;
            }

            if (!inAnalysis) continue;

            const qMatch = p.match(/^(\d+)\s*[.．]\s*【答案】\s*\[?([A-D])\]?/);
            if (qMatch) {
                const qnum = parseInt(qMatch[1]);
                if (qnum >= 1 && qnum <= 20) {
                    if (currentQnum && currentAnswer) {
                        answers[currentQnum] = {
                            answer: currentAnswer,
                            explanation: currentExplanation.filter(l => l).join('\n').trim(),
                        };
                    }
                    currentQnum = qnum;
                    currentAnswer = qMatch[2].toUpperCase();
                    currentExplanation = [];
                    inExplanation = false;
                    continue;
                }
            }

            if (p.indexOf('【解析】') >= 0 && currentQnum) {
                inExplanation = true;
                const idx = p.indexOf('【解析】');
                const content = p.substring(idx + 4).trim();
                if (content) currentExplanation.push(content);
                continue;
            }

            if (inExplanation && currentQnum) {
                currentExplanation.push(p);
            }
        }

        if (currentQnum && currentAnswer) {
            answers[currentQnum] = {
                answer: currentAnswer,
                explanation: currentExplanation.filter(l => l).join('\n').trim(),
            };
        }

        return answers;
    }

    function parseReadingAnswers(paras) {
        const answers = {};
        let currentQnum = null;
        let currentAnswer = null;
        let currentExplanation = [];
        let inExplanation = false;
        let inAnalysis = false;
        let currentTextNum = 0;
        let questionCountInText = 0;

        for (let i = 0; i < paras.length; i++) {
            const p = paras[i].trim();
            if (!p) {
                if (inExplanation && currentQnum) {
                    currentExplanation.push('');
                }
                continue;
            }

            const textMatch = p.match(/^Text\s*(\d+)/i);
            if (textMatch) {
                if (currentQnum && currentAnswer) {
                    answers[currentQnum] = {
                        answer: currentAnswer,
                        explanation: currentExplanation.filter(l => l).join('\n').trim(),
                    };
                }
                currentTextNum = parseInt(textMatch[1]);
                questionCountInText = 0;
                inAnalysis = false;
                inExplanation = false;
                currentQnum = null;
                continue;
            }

            if (p.indexOf('【试题解析】') >= 0) {
                inAnalysis = true;
                inExplanation = false;
                continue;
            }

            if (p.indexOf('【参考译文】') >= 0 && inAnalysis) {
                inAnalysis = false;
                inExplanation = false;
                if (currentQnum && currentAnswer) {
                    answers[currentQnum] = {
                        answer: currentAnswer,
                        explanation: currentExplanation.filter(l => l).join('\n').trim(),
                    };
                }
                currentQnum = null;
                continue;
            }

            if (!inAnalysis) continue;

            const qMatch = p.match(/^(\d+)\s*[.．]\s*【答案】\s*\[?([A-D])\]?/);
            if (qMatch) {
                if (currentQnum && currentAnswer) {
                    answers[currentQnum] = {
                        answer: currentAnswer,
                        explanation: currentExplanation.filter(l => l).join('\n').trim(),
                    };
                }
                currentQnum = parseInt(qMatch[1]);
                currentAnswer = qMatch[2].toUpperCase();
                currentExplanation = [];
                inExplanation = false;
                if (currentQnum >= 21 && currentQnum <= 25) currentTextNum = 1;
                else if (currentQnum >= 26 && currentQnum <= 30) currentTextNum = 2;
                else if (currentQnum >= 31 && currentQnum <= 35) currentTextNum = 3;
                else if (currentQnum >= 36 && currentQnum <= 40) currentTextNum = 4;
                questionCountInText = currentQnum - (currentTextNum - 1) * 5 - 20;
                continue;
            }

            const ansMatch = p.match(/^【答案】\s*\[?([A-D])\]?/);
            if (ansMatch && !qMatch) {
                if (currentQnum && currentAnswer) {
                    answers[currentQnum] = {
                        answer: currentAnswer,
                        explanation: currentExplanation.filter(l => l).join('\n').trim(),
                    };
                }
                questionCountInText++;
                if (currentTextNum >= 1) {
                    currentQnum = 20 + (currentTextNum - 1) * 5 + questionCountInText;
                } else {
                    currentQnum = 20 + questionCountInText;
                }
                currentAnswer = ansMatch[1].toUpperCase();
                currentExplanation = [];
                inExplanation = false;
                continue;
            }

            if (p.indexOf('【解析】') >= 0 && currentQnum) {
                inExplanation = true;
                const idx = p.indexOf('【解析】');
                const content = p.substring(idx + 4).trim();
                if (content) currentExplanation.push(content);
                continue;
            }

            if (inExplanation && currentQnum) {
                currentExplanation.push(p);
            }
        }

        if (currentQnum && currentAnswer) {
            answers[currentQnum] = {
                answer: currentAnswer,
                explanation: currentExplanation.filter(l => l).join('\n').trim(),
            };
        }

        return answers;
    }

    function parsePartBAnswers(paras) {
        const answers = {};
        let currentQnum = null;
        let currentAnswer = null;
        let currentExplanation = [];
        let inExplanation = false;
        let inAnalysis = false;

        for (let i = 0; i < paras.length; i++) {
            const p = paras[i].trim();
            if (!p) {
                if (inExplanation && currentQnum) {
                    currentExplanation.push('');
                }
                continue;
            }

            if (p.indexOf('【试题解析】') >= 0) {
                inAnalysis = true;
                continue;
            }

            if (p.indexOf('【参考译文】') >= 0 && inAnalysis) {
                inAnalysis = false;
                if (currentQnum && currentAnswer) {
                    answers[currentQnum] = {
                        answer: currentAnswer,
                        explanation: currentExplanation.filter(l => l).join('\n').trim(),
                    };
                }
                currentQnum = null;
                continue;
            }

            if (!inAnalysis) continue;

            const qMatch = p.match(/^(\d+)\s*[.．]?\s*【答案】\s*\[?([A-G])\]?/);
            if (qMatch) {
                const qnum = parseInt(qMatch[1]);
                if (qnum >= 41 && qnum <= 45) {
                    if (currentQnum && currentAnswer) {
                        answers[currentQnum] = {
                            answer: currentAnswer,
                            explanation: currentExplanation.filter(l => l).join('\n').trim(),
                        };
                    }
                    currentQnum = qnum;
                    currentAnswer = qMatch[2].toUpperCase();
                    currentExplanation = [];
                    inExplanation = false;
                    continue;
                }
            }

            if (p.indexOf('【解析】') >= 0 && currentQnum) {
                inExplanation = true;
                const idx = p.indexOf('【解析】');
                const content = p.substring(idx + 4).trim();
                if (content) currentExplanation.push(content);
                continue;
            }

            if (inExplanation && currentQnum) {
                currentExplanation.push(p);
            }
        }

        if (currentQnum && currentAnswer) {
            answers[currentQnum] = {
                answer: currentAnswer,
                explanation: currentExplanation.filter(l => l).join('\n').trim(),
            };
        }

        return answers;
    }

    function parseTranslationAnswers(paras) {
        const answers = {};
        let currentQnum = null;
        let currentTranslation = [];
        let currentAnalysis = [];
        let mode = null;
        let inAnalysisSection = false;

        for (let i = 0; i < paras.length; i++) {
            const p = paras[i].trim();
            if (!p) {
                if (mode === 'translation' && currentTranslation.length > 0) {
                    currentTranslation.push('');
                } else if (mode === 'analysis' && currentAnalysis.length > 0) {
                    currentAnalysis.push('');
                }
                continue;
            }

            if (p.indexOf('【试题解析】') >= 0) {
                inAnalysisSection = true;
                continue;
            }

            if (!inAnalysisSection) continue;

            const qMatch = p.match(/^\(?(\d+)\)?\s*(.*)/);
            if (qMatch) {
                const qnum = parseInt(qMatch[1]);
                if (qnum >= 46 && qnum <= 50) {
                    if (currentQnum !== null) {
                        answers[currentQnum] = {
                            translation: currentTranslation.filter(l => l).join('\n').trim(),
                            analysis: currentAnalysis.filter(l => l).join('\n').trim(),
                        };
                    }
                    currentQnum = qnum;
                    currentTranslation = [];
                    currentAnalysis = [];
                    mode = null;
                    continue;
                }
            }

            if (p.indexOf('【参考译文】') >= 0 && currentQnum !== null) {
                mode = 'translation';
                const idx = p.indexOf('【参考译文】');
                const content = p.substring(idx + 6).trim();
                if (content) currentTranslation.push(content);
                continue;
            }

            if ((p.indexOf('【翻译思路】') >= 0 || p.indexOf('【解析】') >= 0) && currentQnum !== null) {
                mode = 'analysis';
                const tags = ['【翻译思路】', '【解析】'];
                for (let t = 0; t < tags.length; t++) {
                    if (p.indexOf(tags[t]) >= 0) {
                        const idx = p.indexOf(tags[t]);
                        const content = p.substring(idx + tags[t].length).trim();
                        if (content) currentAnalysis.push(content);
                        break;
                    }
                }
                continue;
            }

            if (currentQnum !== null && mode) {
                if (mode === 'translation') {
                    currentTranslation.push(p);
                } else if (mode === 'analysis') {
                    currentAnalysis.push(p);
                }
            }
        }

        if (currentQnum !== null) {
            answers[currentQnum] = {
                translation: currentTranslation.filter(l => l).join('\n').trim(),
                analysis: currentAnalysis.filter(l => l).join('\n').trim(),
            };
        }

        return answers;
    }

    function parseWritingAnswers(paras) {
        let partA = { model_essay: '', translation: '' };
        let partB = { model_essay: '', translation: '' };

        let partAIdx = null;
        let partBIdx = null;

        for (let i = 0; i < paras.length; i++) {
            const stripped = paras[i].trim();
            if (/^Part\s*A\s*$/i.test(stripped) && partAIdx === null) {
                partAIdx = i;
            } else if (/^Part\s*B\s*$/i.test(stripped) && partAIdx !== null && partBIdx === null) {
                partBIdx = i;
            }
        }

        if (partAIdx !== null) {
            const end = partBIdx !== null ? partBIdx : paras.length;
            const partAParas = paras.slice(partAIdx, end);
            partA = extractWritingContent(partAParas);
        }

        if (partBIdx !== null) {
            const partBParas = paras.slice(partBIdx);
            partB = extractWritingContent(partBParas);
        }

        return [partA, partB];
    }

    function extractWritingContent(paras) {
        const result = { model_essay: '', translation: '' };
        let mode = null;
        const content = [];

        for (let i = 0; i < paras.length; i++) {
            const p = paras[i].trim();

            if (p.indexOf('【参考范文】') >= 0) {
                if (mode === 'essay' && content.length > 0) {
                    result.model_essay = content.filter(l => l).join('\n').trim();
                }
                mode = 'essay';
                content.length = 0;
                const idx = p.indexOf('【参考范文】');
                const after = p.substring(idx + 6).trim();
                if (after) content.push(after);
                continue;
            }

            if (p.indexOf('【参考译文】') >= 0) {
                if (mode === 'essay' && content.length > 0) {
                    result.model_essay = content.filter(l => l).join('\n').trim();
                }
                mode = 'translation';
                content.length = 0;
                const idx = p.indexOf('【参考译文】');
                const after = p.substring(idx + 6).trim();
                if (after) content.push(after);
                continue;
            }

            if (mode) content.push(p);
        }

        if (mode === 'essay' && content.length > 0) {
            result.model_essay = content.filter(l => l).join('\n').trim();
        } else if (mode === 'translation' && content.length > 0) {
            result.translation = content.filter(l => l).join('\n').trim();
        }

        return result;
    }

    return {
        parseExamText,
        parseAnswerText,
    };
})();
