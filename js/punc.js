/**
 * 标点规范工具
 * 中英文标点互转
 */

const Punct = (function() {

    // 英文标点 → 中文标点（用于中文文本）
    function toChinesePunct(text) {
        if (!text) return text;

        let result = text;

        // 逗号：英文 , → 中文 ，（仅当后面跟中文字符时）
        result = result.replace(/,(\s*[\u4e00-\u9fa5])/g, '，$1');

        // 句号：英文 . → 中文 。（仅当后面跟中文字符或换行/结尾时，且不是数字中的小数点）
        result = result.replace(/\.(\s*[\u4e00-\u9fa5])/g, '。$1');
        result = result.replace(/\.(\s*$)/gm, '。$1');

        // 问号
        result = result.replace(/\?(\s*[\u4e00-\u9fa5])/g, '？$1');
        result = result.replace(/\?(\s*$)/gm, '？$1');

        // 感叹号
        result = result.replace(/!(\s*[\u4e00-\u9fa5])/g, '！$1');
        result = result.replace(/!(\s*$)/gm, '！$1');

        // 冒号
        result = result.replace(/:(\s*[\u4e00-\u9fa5])/g, '：$1');

        // 分号
        result = result.replace(/;(\s*[\u4e00-\u9fa5])/g, '；$1');

        // 引号（英文双引号转中文双引号）
        result = result.replace(/"([^"]*[\u4e00-\u9fa5][^"]*)"/g, '“$1”');

        // 单引号
        result = result.replace(/'([^']*[\u4e00-\u9fa5][^']*)'/g, '‘$1’');

        // 括号（中文语境的英文括号）
        result = result.replace(/\(([^)]*[\u4e00-\u9fa5][^)]*)\)/g, '（$1）');

        return result;
    }

    // 中文标点 → 英文标点（用于英文文本）
    function toEnglishPunct(text) {
        if (!text) return text;

        let result = text;

        // 中文逗号 → 英文逗号
        result = result.replace(/，/g, ', ');
        // 清理多余空格
        result = result.replace(/,\s{2,}/g, ', ');

        // 中文句号 → 英文句号
        result = result.replace(/。/g, '.');

        // 中文问号 → 英文问号
        result = result.replace(/？/g, '?');

        // 中文感叹号 → 英文感叹号
        result = result.replace(/！/g, '!');

        // 中文冒号 → 英文冒号
        result = result.replace(/：/g, ': ');
        result = result.replace(/:\s{2,}/g, ': ');

        // 中文分号 → 英文分号
        result = result.replace(/；/g, '; ');
        result = result.replace(/;\s{2,}/g, '; ');

        // 中文双引号 → 英文双引号
        result = result.replace(/"/g, '"');
        result = result.replace(/"/g, '"');

        // 中文单引号 → 英文单引号
        result = result.replace(/'/g, "'");
        result = result.replace(/'/g, "'");

        // 中文括号 → 英文括号
        result = result.replace(/（/g, '(');
        result = result.replace(/）/g, ')');

        // 中文顿号 → 英文逗号（英文里没有顿号）
        result = result.replace(/、/g, ', ');
        result = result.replace(/,\s{2,}/g, ', ');

        // 中文省略号 → 英文三个点
        result = result.replace(/……/g, '...');
        result = result.replace(/…/g, '...');

        // 中文破折号 → 英文两个 dash
        result = result.replace(/——/g, '--');
        result = result.replace(/—/g, '-');

        // 行首行尾多余空格清理
        result = result.split('\n').map(line => line.replace(/\s+$/g, '')).join('\n');

        return result;
    }

    return {
        toChinesePunct,
        toEnglishPunct,
    };
})();
