/**
 * 纯原生零依赖 Markdown 解析与渲染引擎 (轻量高效、安全防XSS)
 * 适配移动端与混合应用环境，离线完全可用
 */
const MarkdownParser = {
    // HTML 特殊字符转义
    escapeHtml: function (text) {
        return text
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    },

    // 核心渲染方法
    render: function (markdown) {
        if (!markdown || typeof markdown !== 'string') return '';

        let html = markdown;

        // 1. 代码块提取并预保护 (```lang ... ```)
        const codeBlocks = [];
        html = html.replace(/```([a-zA-Z0-9_-]*)\r?\n([\s\S]*?)```/g, (match, lang, code) => {
            const index = codeBlocks.length;
            const cleanCode = this.escapeHtml(code.replace(/\r?\n$/, ''));
            const langLabel = lang ? `<span class="code-lang-badge">${lang}</span>` : '';
            codeBlocks.push(`<pre class="code-block-wrapper">${langLabel}<code class="code-block">${cleanCode}</code></pre>`);
            return `__CODE_BLOCK_${index}__`;
        });

        // 2. 行内代码提取并预保护 (`code`)
        const inlineCodes = [];
        html = html.replace(/`([^`\n]+)`/g, (match, code) => {
            const index = inlineCodes.length;
            inlineCodes.push(`<code class="inline-code">${this.escapeHtml(code)}</code>`);
            return `__INLINE_CODE_${index}__`;
        });

        // 3. 处理表格 (| a | b |)
        html = this._renderTables(html);

        // 4. 水平分割线
        html = html.replace(/^(?:---|\*\*\*|___)\s*$/gm, '<hr class="markdown-hr" />');

        // 5. 标题 (H1 - H4)
        html = html.replace(/^#### (.*$)/gm, '<h4 class="md-h4">$1</h4>');
        html = html.replace(/^### (.*$)/gm, '<h3 class="md-h3">$1</h3>');
        html = html.replace(/^## (.*$)/gm, '<h2 class="md-h2">$1</h2>');
        html = html.replace(/^# (.*$)/gm, '<h1 class="md-h1">$1</h1>');

        // 6. 引用块 (> quote)
        html = html.replace(/^\> (.*$)/gm, '<blockquote class="md-blockquote">$1</blockquote>');

        // 7. 粗体、斜体、删除线
        html = html.replace(/\*\*\*(.*?)\*\*\*/g, '<strong><em>$1</em></strong>');
        html = html.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
        html = html.replace(/\*(.*?)\*/g, '<em>$1</em>');
        html = html.replace(/~~(.*?)~~/g, '<del>$1</del>');

        // 8. 任务列表与普通列表 (- [x], - [ ], - item, 1. item)
        html = html.replace(/^- \[x\] (.*$)/gm, '<div class="task-item checked"><span class="task-box">✓</span> <span>$1</span></div>');
        html = html.replace(/^- \[ \] (.*$)/gm, '<div class="task-item"><span class="task-box">○</span> <span>$1</span></div>');
        html = html.replace(/^[\*\-] (.*$)/gm, '<li class="md-li">$1</li>');
        html = html.replace(/^\d+\. (.*$)/gm, '<li class="md-li md-ol-li">$1</li>');

        // 9. 段落与换行
        const lines = html.split(/\r?\n/);
        const outputLines = [];
        let inList = false;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            if (line.startsWith('<li class="md-li')) {
                if (!inList) {
                    outputLines.push('<ul class="md-ul">');
                    inList = true;
                }
                outputLines.push(line);
            } else {
                if (inList) {
                    outputLines.push('</ul>');
                    inList = false;
                }
                if (line.trim() !== '' && 
                    !line.startsWith('<h') && 
                    !line.startsWith('<blockquote') && 
                    !line.startsWith('<hr') && 
                    !line.startsWith('<table') &&
                    !line.startsWith('</table') &&
                    !line.startsWith('<tr>') &&
                    !line.startsWith('<div class="task-item') &&
                    !line.startsWith('__CODE_BLOCK_')) {
                    outputLines.push(`<p class="md-p">${line}</p>`);
                } else {
                    outputLines.push(line);
                }
            }
        }
        if (inList) outputLines.push('</ul>');
        html = outputLines.join('\n');

        // 10. 还原代码块与行内代码
        codeBlocks.forEach((codeHtml, idx) => {
            html = html.replace(`__CODE_BLOCK_${idx}__`, codeHtml);
        });
        inlineCodes.forEach((codeHtml, idx) => {
            html = html.replace(`__INLINE_CODE_${idx}__`, codeHtml);
        });

        return html;
    },

    // 简单高效的 Markdown 表格渲染
    _renderTables: function (text) {
        const tableRegex = /((?:\|.+?\|\r?\n)+)/g;
        return text.replace(tableRegex, (match) => {
            const lines = match.trim().split(/\r?\n/);
            if (lines.length < 2) return match;

            const headerLine = lines[0];
            const separatorLine = lines[1];

            // 验证是否是分隔行 |:---|:---|
            if (!/^[\|\s\-:]+$/.test(separatorLine)) return match;

            const headers = headerLine.split('|').map(s => s.trim()).filter((s, idx, arr) => idx > 0 && idx < arr.length - 1);
            let tableHtml = '<div class="md-table-wrap"><table class="md-table"><thead><tr>';
            headers.forEach(h => {
                tableHtml += `<th>${h}</th>`;
            });
            tableHtml += '</tr></thead><tbody>';

            for (let i = 2; i < lines.length; i++) {
                const rowCells = lines[i].split('|').map(s => s.trim()).filter((s, idx, arr) => idx > 0 && idx < arr.length - 1);
                if (rowCells.length === 0) continue;
                tableHtml += '<tr>';
                rowCells.forEach(cell => {
                    tableHtml += `<td>${cell}</td>`;
                });
                tableHtml += '</tr>';
            }
            tableHtml += '</tbody></table></div>';
            return tableHtml;
        });
    }
};

window.MarkdownParser = MarkdownParser;