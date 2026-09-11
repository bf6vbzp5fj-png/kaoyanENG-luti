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
            if (/^Section\s*I\b/i.test(p)) {
                // 可能在同一行，也可能下一行是 Use of English
                const nextP = i + 1 < paragraphs.length ? paragraphs[i + 1].trim() : '';
                if (p.indexOf('Use of English') >= 0 || p.indexOf('完形') >= 0 ||
                    nextP.indexOf('Use of English') >= 0 || nextP.indexOf('完形') >= 0) {
                    sections.cloze_start = i;
                }
                continue;
            }

            // Section II Reading Comprehension
            if (/^Section\s*II\b/i.test(p)) {
                const nextP = i + 1 < paragraphs.length ? paragraphs[i + 1].trim() : '';
                if (p.indexOf('Reading') >= 0 || nextP.indexOf('Reading') >= 0) {
                    sections.sectionII_start = i;
                }
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
            if (/^Section\s*III\b/i.test(p)) {
                const nextP = i + 1 < paragraphs.length ? paragraphs[i + 1].trim() : '';
                if (p.toLowerCase().indexOf('writing') >= 0 || nextP.toLowerCase().indexOf('writing') >= 0) {
                    sections.writing_section_start = i;
                    sections.writing_start = i;
                }
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

            if (/^Section\s*I\b/i.test(p)) {
                const nextP = i + 1 < paragraphs.length ? paragraphs[i + 1].trim() : '';
                if (p.indexOf('Use of English') >= 0 || p.indexOf('完形') >= 0 ||
                    nextP.indexOf('Use of English') >= 0 || nextP.indexOf('完形') >= 0) {
                    sections.cloze_start = i;
                }
                continue;
            }

            if (/^Section\s*II\b/i.test(p)) {
                const nextP = i + 1 < paragraphs.length ? paragraphs[i + 1].trim() : '';
                if (p.indexOf('Reading') >= 0 || nextP.indexOf('Reading') >= 0) {
                    sections.reading_section_start = i;
                    sections.sectionII_start = i;
                }
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

            if (/^Section\s*III\b/i.test(p)) {
                const nextP = i + 1 < paragraphs.length ? paragraphs[i + 1].trim() : '';
                if (p.indexOf('Writing') >= 0 || p.indexOf('写作') >= 0 || p.toLowerCase().indexOf('writing') >= 0 ||
                    nextP.indexOf('Writing') >= 0 || nextP.indexOf('写作') >= 0) {
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
            // 支持两种题目起始格式：1.A.xxx  或  【1】A.xxx
            if (/^(?:\d+\s*[.．]|【\d+】)\s*\[?[A-D]\]?/.test(p)) {
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

                // 支持两种题号格式：1.xxx  或  【1】xxx
                const qMatch = p.match(/^(?:(\d+)\s*[.．]|【(\d+)】)/);
                if (qMatch) {
                    const qnum = parseInt(qMatch[1] || qMatch[2]);
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

        // 先找到41题位置，确定选项区域的结束边界
        let itemStart = null;
        for (let idx = optionsStart; idx < paras.length; idx++) {
            if (/^41\s*[.．]/.test(paras[idx].trim())) {
                itemStart = idx;
                break;
            }
        }

        if (itemStart === null) return data;

        // 在选项开始到41题之间，只收集独立的[A-G]选项行
        // 选项行的定义：以[A]、[B]...开头，内容是短语/短句
        // 其余非选项行属于引导段，不会被误收进选项
        const introLines = [];
        for (let idx = optionsStart; idx < itemStart; idx++) {
            const p = paras[idx].trim();
            if (!p) continue;

            const optMatch = p.match(optionPattern);
            if (optMatch) {
                const letter = optMatch[1].toUpperCase();
                if ('ABCDEFG'.indexOf(letter) >= 0) {
                    // 判断这是不是一个独立的选项行（而不是正文中碰巧出现的[字母]）
                    // 独立选项行特征：选项内容相对简短，或后面紧跟下一个选项/题号/空行
                    const optContent = optMatch[2].trim();
                    // 选项行最多允许一行续行（处理七选五长选项跨行的情况）
                    let fullText = optContent;
                    let nextIdx = idx + 1;
                    // 看下一行：如果不是空行、不是新选项、不是题号，且内容不算太长，可能是选项续行
                    if (nextIdx < itemStart) {
                        const nextP = paras[nextIdx].trim();
                        if (nextP && !optionPattern.test(nextP) && !/^\d+\s*[.．]/.test(nextP)) {
                            // 判断是否为选项续行：内容较短（<80字符）且后一行是新选项/空行/题号
                            let isContinuation = false;
                            if (nextP.length < 80) {
                                let afterIdx = nextIdx + 1;
                                while (afterIdx < itemStart && !paras[afterIdx].trim()) {
                                    afterIdx++;
                                }
                                if (afterIdx >= itemStart || optionPattern.test(paras[afterIdx].trim()) || /^\d+\s*[.．]/.test(paras[afterIdx].trim())) {
                                    isContinuation = true;
                                }
                            }
                            if (isContinuation) {
                                fullText += '\n' + nextP;
                                idx = nextIdx; // 跳过已消费的续行
                            }
                        }
                    }
                    data.options[letter] = fullText;
                    data.option_order.push(letter);
                    continue;
                }
            }

            // 非选项行 → 引导段内容
            introLines.push(p);
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

        // 选项去重：同一字母多次出现只保留一次（处理答案标记混入选项列表的情况）
        const seenLetters = {};
        const uniqueOrder = [];
        const uniqueOptions = {};
        for (let oi = 0; oi < data.option_order.length; oi++) {
            const letter = data.option_order[oi];
            if (!seenLetters[letter]) {
                seenLetters[letter] = true;
                uniqueOrder.push(letter);
                uniqueOptions[letter] = data.options[letter];
            }
        }
        data.option_order = uniqueOrder;
        data.options = uniqueOptions;

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

            const qMatch = p.match(/^(?:(\d+)\s*[.．]|【(\d+)】)\s*【答案】\s*\[?([A-D])\]?/);
            if (qMatch) {
                const qnum = parseInt(qMatch[1] || qMatch[2]);
                if (qnum >= 1 && qnum <= 20) {
                    if (currentQnum && currentAnswer) {
                        answers[currentQnum] = {
                            answer: currentAnswer,
                            explanation: currentExplanation.filter(l => l).join('\n').trim(),
                        };
                    }
                    currentQnum = qnum;
                    currentAnswer = qMatch[3].toUpperCase();
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

    // ==================== 月测整卷试题解析 ====================
    function parseYueceExamText(text) {
        const lines = text.split('\n');
        const paragraphs = lines.map(l => l.trim());

        const result = {
            grammar: null,
            vocab_part1: null,
            vocab_part2: null,
            cloze: null,
            translation: null,
        };

        const sections = locateYueceSections(paragraphs);

        // Section Ⅰ Grammar
        if (sections.grammar_start !== undefined) {
            const end = sections.vocab_start !== undefined
                ? sections.vocab_start
                : paragraphs.length;
            const paras = paragraphs.slice(sections.grammar_start, end);
            result.grammar = parseYueceGrammar(paras);
        }

        // Section Ⅱ Vocabulary
        if (sections.vocab_start !== undefined) {
            const end = sections.cloze_start !== undefined
                ? sections.cloze_start
                : paragraphs.length;
            const vocabParas = paragraphs.slice(sections.vocab_start, end);

            // 区分 Part 1 和 Part 2
            let part1End = vocabParas.length;
            let part2Start = -1;
            for (let i = 0; i < vocabParas.length; i++) {
                const p = vocabParas[i].trim();
                if (/^Part\s*[12一Ⅱ]\s*$/i.test(p) || /^Part\s*[12一Ⅱ][\s、．.]/i.test(p)) {
                    if (p.indexOf('2') >= 0 || p.indexOf('二') >= 0 || p.indexOf('Ⅱ') >= 0) {
                        part2Start = i;
                        part1End = i;
                        break;
                    }
                }
            }

            const part1Paras = vocabParas.slice(0, part1End);
            result.vocab_part1 = parseYueceVocab(part1Paras, 'part1');

            if (part2Start >= 0) {
                const part2Paras = vocabParas.slice(part2Start);
                result.vocab_part2 = parseYueceVocab(part2Paras, 'part2');
            }
        }

        // Section Ⅲ Cloze
        if (sections.cloze_start !== undefined) {
            const end = sections.translation_start !== undefined
                ? sections.translation_start
                : paragraphs.length;
            const paras = paragraphs.slice(sections.cloze_start, end);
            result.cloze = parseYueceCloze(paras);
        }

        // Section Ⅳ Translation
        if (sections.translation_start !== undefined) {
            const paras = paragraphs.slice(sections.translation_start);
            result.translation = parseYueceTranslation(paras);
        }

        return result;
    }

    function locateYueceSections(paragraphs) {
        const sections = {};

        // 精确匹配 Section 编号，避免短编号截胡长编号
        // numType: 'III' | 'IV' | 'II' | 'I' （按从长到短排列）
        function isSectionNum(p, numType) {
            const m = p.match(/^Section\s+([^\s:：]+)/i);
            if (!m) return false;
            const num = m[1];
            // 去掉可能跟着的标点
            const clean = num.replace(/[.．,，:：].*$/, '');
            if (numType === 'III') {
                return clean === 'III' || clean === 'Ⅲ' || clean === '3' || clean === '三';
            }
            if (numType === 'IV') {
                return clean === 'IV' || clean === 'Ⅳ' || clean === '4' || clean === '四';
            }
            if (numType === 'II') {
                return clean === 'II' || clean === 'Ⅱ' || clean === '2' || clean === '二';
            }
            if (numType === 'I') {
                return clean === 'I' || clean === 'Ⅰ' || clean === '1' || clean === '一';
            }
            return false;
        }

        for (let i = 0; i < paragraphs.length; i++) {
            let p = paragraphs[i].trim();
            // 去除 markdown 标题标记
            p = p.replace(/^#+\s*/, '');
            if (!p) continue;

            const nextP = i + 1 < paragraphs.length ? paragraphs[i + 1].trim() : '';
            const hasKeyword = (kw) => p.indexOf(kw) >= 0 || nextP.indexOf(kw) >= 0;

            // Section III / Ⅲ / 3 → Cloze / 完形（先匹配长的，避免 I/II 截胡）
            if (isSectionNum(p, 'III')) {
                if (hasKeyword('Cloze') || hasKeyword('完形') || hasKeyword('Use of English')) {
                    sections.cloze_start = i;
                    continue;
                }
            }

            // Section IV / Ⅳ / 4 → Translation / 翻译
            if (isSectionNum(p, 'IV')) {
                if (hasKeyword('Translation') || hasKeyword('翻译')) {
                    sections.translation_start = i;
                    continue;
                }
            }

            // Section II / Ⅱ / 2 → Vocabulary / 词汇
            if (isSectionNum(p, 'II')) {
                if (hasKeyword('Vocabulary') || hasKeyword('词汇')) {
                    sections.vocab_start = i;
                    continue;
                }
            }

            // Section I / Ⅰ / 1 → Grammar / 语法（最后匹配，避免截胡II/III/IV）
            if (isSectionNum(p, 'I')) {
                if (hasKeyword('Grammar') || hasKeyword('语法')) {
                    sections.grammar_start = i;
                    continue;
                }
            }
        }

        return sections;
    }

    // ==================== 月测语法题解析 ====================
    function parseYueceGrammar(paras) {
        const data = {
            directions: '',
            questions: [],
        };

        // 跳过标题行，找到第一个题目
        let qStart = 0;
        for (let i = 0; i < paras.length; i++) {
            const p = paras[i].trim();
            if (/^\d+\s*[.．]\s*/.test(p)) {
                const qnum = parseInt(p.match(/^(\d+)\s*[.．]/)[1]);
                if (qnum >= 1 && qnum <= 5) {
                    qStart = i;
                    break;
                }
            }
        }

        const qParas = paras.slice(qStart);
        const questions = parseYueceSingleChoice(qParas, 1, 5);
        data.questions = questions;

        return data;
    }

    // ==================== 月测词汇题解析 ====================
    function parseYueceVocab(paras, part) {
        part = part || 'part1';
        const data = {
            part: part,
            directions: '',
            questions: [],
        };

        // 找到 Part 标题后的第一题
        let qStart = 0;
        for (let i = 0; i < paras.length; i++) {
            const p = paras[i].trim();
            if (/^\d+\s*[.．]\s*/.test(p)) {
                const qnum = parseInt(p.match(/^(\d+)\s*[.．]/)[1]);
                // 词汇题范围：Part1 是 6-15，Part2 是 16-25
                if (qnum >= 6 && qnum <= 25) {
                    qStart = i;
                    break;
                }
            }
        }

        const qParas = paras.slice(qStart);
        const questions = parseYueceSingleChoice(qParas, 6, 25);
        data.questions = questions;

        return data;
    }

    // 通用：月测单选题解析（语法/词汇通用）
    function parseYueceSingleChoice(paras, minQnum, maxQnum) {
        const questions = [];
        let currentQ = null;
        let collectingOptions = false;

        for (let i = 0; i < paras.length; i++) {
            const p = paras[i].trim();
            if (!p) continue;

            // 检测题号
            const qMatch = p.match(/^(\d+)\s*[.．]\s*(.*)/);
            if (qMatch) {
                const qnum = parseInt(qMatch[1]);
                if (qnum >= minQnum && qnum <= maxQnum) {
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

            if (!currentQ) continue;

            // 检测选项 A. / B. / C. / D.
            const optMatch = p.match(/^([A-D])\s*[.．\]]\s*(.*)/);
            if (optMatch) {
                const letter = optMatch[1].toUpperCase();
                if (currentQ.options[letter] === undefined) {
                    currentQ.options[letter] = optMatch[2];
                    currentQ.option_order.push(letter);
                    collectingOptions = true;
                    continue;
                }
            }

            // 追加内容
            if (!collectingOptions) {
                currentQ.stem += currentQ.stem ? '\n' + p : p;
            } else if (currentQ.option_order.length > 0) {
                const lastLetter = currentQ.option_order[currentQ.option_order.length - 1];
                currentQ.options[lastLetter] += currentQ.options[lastLetter] ? '\n' + p : p;
            }
        }

        if (currentQ) questions.push(currentQ);
        return questions;
    }

    // ==================== 月测完形填空解析 ====================
    function parseYueceCloze(paras) {
        // 复用真题完形的解析逻辑，但题号范围放宽
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

        // 收集文章，直到遇到题目
        let articleStart = dirStart !== null ? dirStart + 1 : 0;
        while (articleStart < paras.length && !paras[articleStart].trim()) {
            articleStart++;
        }

        const articleLines = [];
        let questionStart = null;

        for (let i = articleStart; i < paras.length; i++) {
            const p = paras[i].trim();
            // 题目起始：26. A.xxx 或 【26】A.xxx 等（月测完形从26开始）
            if (/^(?:\d+\s*[.．]|【\d+】)\s*\[?[A-D]\]?/.test(p)) {
                questionStart = i;
                break;
            }
            articleLines.push(p);
        }

        while (articleLines.length > 0 && !articleLines[0]) articleLines.shift();
        while (articleLines.length > 0 && !articleLines[articleLines.length - 1]) articleLines.pop();

        data.article = articleLines.join('\n').trim();

        // 解析题目选项
        if (questionStart !== null) {
            for (let i = questionStart; i < paras.length; i++) {
                const p = paras[i].trim();
                if (!p) continue;

                const qMatch = p.match(/^(?:(\d+)\s*[.．]|【(\d+)】)/);
                if (qMatch) {
                    const qnum = parseInt(qMatch[1] || qMatch[2]);
                    if (qnum >= 21 && qnum <= 40) {
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

    // ==================== 月测翻译解析 ====================
    function parseYueceTranslation(paras) {
        const data = {
            directions: '',
            sentences: [],
        };

        // 找翻译句子（题号 31+）
        for (let i = 0; i < paras.length; i++) {
            const p = paras[i].trim();
            if (!p) continue;

            // 格式: 31. 句子 或 31) 句子 或 (31) 句子
            const m = p.match(/^[(\[]?(\d+)[)\]]?\s*[.．、]?\s*(.*)/);
            if (m) {
                const qnum = parseInt(m[1]);
                if (qnum >= 26 && qnum <= 40) {
                    let text = m[2].trim();
                    // 多行续行
                    for (let j = i + 1; j < paras.length; j++) {
                        const nextP = paras[j].trim();
                        if (!nextP) continue;
                        // 如果下一行是新的题号，停止
                        if (/^[(\[]?\d+[)\]]?\s*[.．、]?\s*/.test(nextP)) {
                            const nextQnum = parseInt(nextP.match(/^[(\[]?(\d+)/)[1]);
                            if (nextQnum > qnum && nextQnum <= 40) break;
                        }
                        // 停止：如果遇到答案标记
                        if (nextP.indexOf('【答案】') >= 0) break;
                        text += '\n' + nextP;
                    }
                    data.sentences.push({ qnum, text });
                }
            }
        }

        return data;
    }

    // ==================== 月测答案解析 ====================
    function parseYueceAnswerText(text) {
        const lines = text.split('\n');
        const paragraphs = lines.map(l => l.trim());

        const result = {
            grammar: {},
            vocab_part1: {},
            vocab_part2: {},
            cloze: {},
            translation: {},
        };

        const sections = locateYueceAnswerSections(paragraphs);

        // 语法题答案
        if (sections.grammar_start !== undefined) {
            const end = sections.vocab_start !== undefined
                ? sections.vocab_start
                : paragraphs.length;
            const paras = paragraphs.slice(sections.grammar_start, end);
            result.grammar = parseYueceChoiceAnswers(paras, 1, 5);
        }

        // 词汇题答案
        if (sections.vocab_start !== undefined) {
            const end = sections.cloze_start !== undefined
                ? sections.cloze_start
                : paragraphs.length;
            const vocabParas = paragraphs.slice(sections.vocab_start, end);

            // 区分 Part 1 和 Part 2
            let part1End = vocabParas.length;
            let part2Start = -1;
            for (let i = 0; i < vocabParas.length; i++) {
                const p = vocabParas[i].trim();
                if (/^Part\s*[12二Ⅱ]\s*$/i.test(p) || /^Part\s*[12二Ⅱ][\s、．.]/i.test(p)) {
                    if (p.indexOf('2') >= 0 || p.indexOf('二') >= 0 || p.indexOf('Ⅱ') >= 0) {
                        part2Start = i;
                        part1End = i;
                        break;
                    }
                }
            }

            const part1Paras = vocabParas.slice(0, part1End);
            result.vocab_part1 = parseYueceChoiceAnswers(part1Paras, 6, 15);

            if (part2Start >= 0) {
                const part2Paras = vocabParas.slice(part2Start);
                result.vocab_part2 = parseYueceChoiceAnswers(part2Paras, 16, 25);
            }
        }

        // 完形答案
        if (sections.cloze_start !== undefined) {
            const end = sections.translation_start !== undefined
                ? sections.translation_start
                : paragraphs.length;
            const paras = paragraphs.slice(sections.cloze_start, end);
            result.cloze = parseYueceClozeAnswers(paras);
        }

        // 翻译答案
        if (sections.translation_start !== undefined) {
            const paras = paragraphs.slice(sections.translation_start);
            result.translation = parseYueceTranslationAnswers(paras);
        }

        return result;
    }

    function locateYueceAnswerSections(paragraphs) {
        const sections = {};

        // 精确匹配 Section 编号，避免短编号截胡长编号
        function isSectionNum(p, numType) {
            const m = p.match(/^Section\s+([^\s:：]+)/i);
            if (!m) return false;
            const num = m[1].replace(/[.．,，:：].*$/, '');
            if (numType === 'III') {
                return num === 'III' || num === 'Ⅲ' || num === '3' || num === '三';
            }
            if (numType === 'IV') {
                return num === 'IV' || num === 'Ⅳ' || num === '4' || num === '四';
            }
            if (numType === 'II') {
                return num === 'II' || num === 'Ⅱ' || num === '2' || num === '二';
            }
            if (numType === 'I') {
                return num === 'I' || num === 'Ⅰ' || num === '1' || num === '一';
            }
            return false;
        }

        for (let i = 0; i < paragraphs.length; i++) {
            let p = paragraphs[i].trim();
            p = p.replace(/^#+\s*/, '');
            if (!p) continue;

            const nextP = i + 1 < paragraphs.length ? paragraphs[i + 1].trim() : '';
            const hasKeyword = (kw) => p.indexOf(kw) >= 0 || nextP.indexOf(kw) >= 0;

            // Section III / Ⅲ / 3 → Cloze / 完形（先匹配长的）
            if (isSectionNum(p, 'III')) {
                if (hasKeyword('Cloze') || hasKeyword('完形') || hasKeyword('Use of English')) {
                    sections.cloze_start = i;
                    continue;
                }
            }

            // Section IV / Ⅳ / 4 → Translation / 翻译
            if (isSectionNum(p, 'IV')) {
                if (hasKeyword('Translation') || hasKeyword('翻译')) {
                    sections.translation_start = i;
                    continue;
                }
            }

            // Section II / Ⅱ / 2 → Vocabulary / 词汇
            if (isSectionNum(p, 'II')) {
                if (hasKeyword('Vocabulary') || hasKeyword('词汇')) {
                    sections.vocab_start = i;
                    continue;
                }
            }

            // Section I / Ⅰ / 1 → Grammar / 语法（最后匹配）
            if (isSectionNum(p, 'I')) {
                if (hasKeyword('Grammar') || hasKeyword('语法')) {
                    sections.grammar_start = i;
                    continue;
                }
            }
        }

        return sections;
    }

    // 月测单选题答案解析（语法/词汇通用）
    function parseYueceChoiceAnswers(paras, minQnum, maxQnum) {
        const answers = {};
        let currentQnum = null;
        let currentAnswer = null;
        let currentExplanation = [];
        let inExplanation = false;

        for (let i = 0; i < paras.length; i++) {
            const p = paras[i].trim();
            if (!p) {
                if (inExplanation && currentQnum) {
                    currentExplanation.push('');
                }
                continue;
            }

            // 格式: 1.【答案】B  或  1 【答案】B  或 【1】【答案】B
            const qMatch = p.match(/^(?:(\d+)\s*[.．]?\s*|【(\d+)】\s*)【答案】\s*\[?([A-D])\]?/);
            if (qMatch) {
                const qnum = parseInt(qMatch[1] || qMatch[2]);
                if (qnum >= minQnum && qnum <= maxQnum) {
                    if (currentQnum && currentAnswer) {
                        answers[currentQnum] = {
                            answer: currentAnswer,
                            explanation: currentExplanation.filter(l => l).join('\n').trim(),
                        };
                    }
                    currentQnum = qnum;
                    currentAnswer = qMatch[3].toUpperCase();
                    currentExplanation = [];
                    inExplanation = false;
                    continue;
                }
            }

            // 单独一行: 【答案】X （前面已经有题号行）
            const ansMatch = p.match(/^【答案】\s*\[?([A-D])\]?/);
            if (ansMatch && !qMatch) {
                // 前面可能有题号单独一行
                // 向前回溯找最近的题号
                let foundQnum = null;
                for (let j = i - 1; j >= 0; j--) {
                    const prevP = paras[j].trim();
                    const prevQMatch = prevP.match(/^(\d+)\s*[.．]?\s*$/) || prevP.match(/^【(\d+)】\s*$/);
                    if (prevQMatch) {
                        const n = parseInt(prevQMatch[1] || prevQMatch[2]);
                        if (n >= minQnum && n <= maxQnum) {
                            foundQnum = n;
                            break;
                        }
                    }
                    if (prevP) break; // 遇到非空非题号行就停
                }
                if (foundQnum) {
                    if (currentQnum && currentAnswer) {
                        answers[currentQnum] = {
                            answer: currentAnswer,
                            explanation: currentExplanation.filter(l => l).join('\n').trim(),
                        };
                    }
                    currentQnum = foundQnum;
                    currentAnswer = ansMatch[1].toUpperCase();
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

    // 月测完形答案解析
    function parseYueceClozeAnswers(paras) {
        const answers = {};
        let currentQnum = null;
        let currentAnswer = null;
        let currentExplanation = [];
        let inExplanation = false;

        for (let i = 0; i < paras.length; i++) {
            const p = paras[i].trim();
            if (!p) {
                if (inExplanation && currentQnum) {
                    currentExplanation.push('');
                }
                continue;
            }

            // 格式: 26.【答案】A 或 26 【答案】A 或 【26】【答案】A
            const qMatch = p.match(/^(?:(\d+)\s*[.．]?\s*|【(\d+)】\s*)【答案】\s*\[?([A-D])\]?/);
            if (qMatch) {
                const qnum = parseInt(qMatch[1] || qMatch[2]);
                if (qnum >= 21 && qnum <= 40) {
                    if (currentQnum && currentAnswer) {
                        answers[currentQnum] = {
                            answer: currentAnswer,
                            explanation: currentExplanation.filter(l => l).join('\n').trim(),
                        };
                    }
                    currentQnum = qnum;
                    currentAnswer = qMatch[3].toUpperCase();
                    currentExplanation = [];
                    inExplanation = false;
                    continue;
                }
            }

            // 单独一行: 【答案】X
            const ansMatch = p.match(/^【答案】\s*\[?([A-D])\]?/);
            if (ansMatch && !qMatch) {
                let foundQnum = null;
                for (let j = i - 1; j >= 0; j--) {
                    const prevP = paras[j].trim();
                    const prevQMatch = prevP.match(/^(\d+)\s*[.．]?\s*$/) || prevP.match(/^【(\d+)】\s*$/);
                    if (prevQMatch) {
                        const n = parseInt(prevQMatch[1] || prevQMatch[2]);
                        if (n >= 21 && n <= 40) {
                            foundQnum = n;
                            break;
                        }
                    }
                    if (prevP) break;
                }
                if (foundQnum) {
                    if (currentQnum && currentAnswer) {
                        answers[currentQnum] = {
                            answer: currentAnswer,
                            explanation: currentExplanation.filter(l => l).join('\n').trim(),
                        };
                    }
                    currentQnum = foundQnum;
                    currentAnswer = ansMatch[1].toUpperCase();
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

    // 月测翻译答案解析
    function parseYueceTranslationAnswers(paras) {
        const answers = {};
        let currentQnum = null;
        let currentTranslation = [];
        let currentAnalysis = [];
        let mode = null; // 'translation' or 'analysis'

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

            // 题号行：31.【答案】xxx  或  31 【答案】xxx
            const qMatch = p.match(/^(?:(\d+)\s*[.．]?\s*|【(\d+)】\s*)【答案】\s*(.*)/);
            if (qMatch) {
                const qnum = parseInt(qMatch[1] || qMatch[2]);
                if (qnum >= 26 && qnum <= 40) {
                    if (currentQnum !== null) {
                        answers[currentQnum] = {
                            translation: currentTranslation.filter(l => l).join('\n').trim(),
                            analysis: currentAnalysis.filter(l => l).join('\n').trim(),
                        };
                    }
                    currentQnum = qnum;
                    const ansContent = qMatch[3].trim();
                    currentTranslation = ansContent ? [ansContent] : [];
                    currentAnalysis = [];
                    mode = 'translation';
                    continue;
                }
            }

            // 【解析】标记
            if ((p.indexOf('【解析】') >= 0 || p.indexOf('【翻译思路】') >= 0) && currentQnum !== null) {
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

            // 追加内容
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

    return {
        parseExamText,
        parseAnswerText,
        parseYueceExamText,
        parseYueceAnswerText,
    };
})();
