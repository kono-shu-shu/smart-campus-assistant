/**
 * =========================================================================
 * 开源项目引用声明 (Open Source Attribution):
 * -------------------------------------------------------------------------
 * 项目名称: EasyMDE / SimpleMDE - Markdown Editor
 * 官方仓库: https://github.com/Ionaru/easy-markdown-editor
 * 初始作者: Next Step Webs, Inc. & Jeroen Akkerman
 * 开源协议: MIT License (https://opensource.org/licenses/MIT)
 * 说明:
 *   本项目引入 EasyMDE / SimpleMDE 开源设计规范与交互逻辑，并在其基础上
 *   深度定制适配「山东商业职业技术大学 - 华为开发者大赛：智慧校园助手」
 *   的 Soft Geometric Bold (柔和几何大胆风) 移动端与混合架构容器环境。
 * =========================================================================
 */

(function (global) {
    'use strict';

    function EasyMDE(options) {
        options = options || {};
        this.element = typeof options.element === 'string' ? document.querySelector(options.element) : options.element;
        if (!this.element) {
            console.error('[EasyMDE] Target element not found');
            return;
        }

        this.initialValue = options.initialValue || this.element.value || '';
        this.placeholder = options.placeholder || '在此使用 Markdown 语法书写你的笔记...';
        this.previewRender = options.previewRender || (window.marked ? window.marked.parse : (t => t));
        this.sideBySideActive = options.sideBySide || false;
        this.fullscreenActive = false;

        this.history = [this.initialValue];
        this.historyIndex = 0;

        this._initUI();
        this._bindEvents();
        this.setValue(this.initialValue);
    }

    EasyMDE.prototype._initUI = function () {
        // 隐藏原始 textarea
        this.element.style.display = 'none';

        // 创建容器
        this.container = document.createElement('div');
        this.container.className = 'EasyMDEContainer';

        // 1. 创建工具条
        this.toolbar = document.createElement('div');
        this.toolbar.className = 'editor-toolbar';
        this.toolbar.innerHTML = `
            <button type="button" data-cmd="bold" title="加粗 (Ctrl+B)"><strong>B</strong></button>
            <button type="button" data-cmd="italic" title="斜体 (Ctrl+I)"><em>I</em></button>
            <button type="button" data-cmd="h1" title="一级标题">H1</button>
            <button type="button" data-cmd="h2" title="二级标题">H2</button>
            <i class="separator">|</i>
            <button type="button" data-cmd="quote" title="引用块">“ ”</button>
            <button type="button" data-cmd="code" title="代码块">&lt;/&gt;</button>
            <button type="button" data-cmd="table" title="插入表格">⊞ 表格</button>
            <i class="separator">|</i>
            <button type="button" data-cmd="ul" title="无序列表">• 列表</button>
            <button type="button" data-cmd="ol" title="有序列表">1. 列表</button>
            <button type="button" data-cmd="task" title="待办任务">☑ 待办</button>
            <button type="button" data-cmd="hr" title="分割线">―</button>
            <i class="separator">|</i>
            <button type="button" data-cmd="preview" title="预览开关 (Ctrl+P)">👁 预览</button>
            <button type="button" data-cmd="sideBySide" title="双栏实时分屏 (F9)">◫ 分栏</button>
            <button type="button" data-cmd="fullscreen" title="全屏专注 (F11)">⛶ 全屏</button>
            <i class="separator">|</i>
            <button type="button" data-cmd="undo" title="撤销 (Ctrl+Z)">↶</button>
            <button type="button" data-cmd="redo" title="重做 (Ctrl+Y)">↷</button>
        `;

        // 2. 创建主编辑视口区
        this.wrapper = document.createElement('div');
        this.wrapper.className = 'editor-wrapper';

        // 编辑输入面板
        this.textareaPanel = document.createElement('div');
        this.textareaPanel.className = 'editor-textarea-panel';

        this.editorField = document.createElement('textarea');
        this.editorField.className = 'editor-textarea-field';
        this.editorField.placeholder = this.placeholder;

        this.previewFull = document.createElement('div');
        this.previewFull.className = 'editor-preview-full preview-content';

        this.textareaPanel.appendChild(this.editorField);
        this.textareaPanel.appendChild(this.previewFull);

        // 双栏分屏预览面板
        this.previewPanel = document.createElement('div');
        this.previewPanel.className = 'editor-preview-panel preview-content';

        this.wrapper.appendChild(this.textareaPanel);
        this.wrapper.appendChild(this.previewPanel);

        // 3. 创建状态栏
        this.statusbar = document.createElement('div');
        this.statusbar.className = 'editor-statusbar';
        this.statusbar.innerHTML = `
            <span class="status-tip">开源 Markdown 引擎 (EasyMDE / Marked)</span>
            <span class="status-stats">0 行 | 0 字</span>
        `;

        // 组装并挂载
        this.container.appendChild(this.toolbar);
        this.container.appendChild(this.wrapper);
        this.container.appendChild(this.statusbar);

        this.element.parentNode.insertBefore(this.container, this.element.nextSibling);

        if (this.sideBySideActive) {
            this.toggleSideBySide(true);
        }
    };

    EasyMDE.prototype._bindEvents = function () {
        const self = this;

        // 工具栏点击命令分发
        this.toolbar.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-cmd]');
            if (!btn) return;
            e.preventDefault();
            const cmd = btn.getAttribute('data-cmd');
            self.executeCommand(cmd);
        });

        // 键盘快捷键监听
        this.editorField.addEventListener('keydown', (e) => {
            const isCtrl = e.ctrlKey || e.metaKey;
            if (isCtrl && e.key.toLowerCase() === 'b') {
                e.preventDefault(); self.executeCommand('bold');
            } else if (isCtrl && e.key.toLowerCase() === 'i') {
                e.preventDefault(); self.executeCommand('italic');
            } else if (isCtrl && e.key.toLowerCase() === 'p') {
                e.preventDefault(); self.executeCommand('preview');
            } else if (isCtrl && e.key.toLowerCase() === 'z') {
                e.preventDefault(); self.executeCommand('undo');
            } else if (isCtrl && e.key.toLowerCase() === 'y') {
                e.preventDefault(); self.executeCommand('redo');
            } else if (e.key === 'F11') {
                e.preventDefault(); self.executeCommand('fullscreen');
            } else if (e.key === 'F9') {
                e.preventDefault(); self.executeCommand('sideBySide');
            } else if (e.key === 'Tab') {
                // Tab 缩进支持
                e.preventDefault();
                const start = self.editorField.selectionStart;
                const end = self.editorField.selectionEnd;
                const val = self.editorField.value;
                self.editorField.value = val.substring(0, start) + '    ' + val.substring(end);
                self.editorField.selectionStart = self.editorField.selectionEnd = start + 4;
                self._onContentChange();
            }
        });

        // 输入内容更新与统计
        this.editorField.addEventListener('input', () => {
            self._onContentChange();
        });

        // 左右滚动条同步
        this.editorField.addEventListener('scroll', () => {
            if (self.sideBySideActive) {
                const percent = self.editorField.scrollTop / (self.editorField.scrollHeight - self.editorField.clientHeight || 1);
                self.previewPanel.scrollTop = percent * (self.previewPanel.scrollHeight - self.previewPanel.clientHeight);
            }
        });
    };

    EasyMDE.prototype._onContentChange = function () {
        const val = this.editorField.value;
        this.element.value = val;

        // 历史快照 (简易撤销重做队列)
        if (this.history[this.historyIndex] !== val) {
            this.history = this.history.slice(0, this.historyIndex + 1);
            this.history.push(val);
            if (this.history.length > 50) this.history.shift();
            this.historyIndex = this.history.length - 1;
        }

        // 更新状态统计
        const lines = val ? val.split('\n').length : 0;
        const words = val.replace(/\s+/g, '').length;
        const statsEl = this.statusbar.querySelector('.status-stats');
        if (statsEl) {
            statsEl.textContent = `${lines} 行 | ${words} 字`;
        }

        // 实时更新分屏渲染
        if (this.sideBySideActive) {
            this.previewPanel.innerHTML = this.previewRender(val);
        }
    };

    EasyMDE.prototype.executeCommand = function (cmd) {
        const field = this.editorField;
        const start = field.selectionStart;
        const end = field.selectionEnd;
        const sel = field.value.substring(start, end);
        const val = field.value;

        const replaceSelection = (newText, cursorOffset) => {
            field.value = val.substring(0, start) + newText + val.substring(end);
            field.focus();
            const pos = cursorOffset !== undefined ? start + cursorOffset : start + newText.length;
            field.selectionStart = field.selectionEnd = pos;
            this._onContentChange();
        };

        switch (cmd) {
            case 'bold':
                replaceSelection(sel ? `**${sel}**` : '**加粗文字**', sel ? sel.length + 4 : 2);
                break;
            case 'italic':
                replaceSelection(sel ? `*${sel}*` : '*斜体文字*', sel ? sel.length + 2 : 1);
                break;
            case 'h1':
                replaceSelection(`\n# ${sel || '一级标题'}\n`, 3);
                break;
            case 'h2':
                replaceSelection(`\n## ${sel || '二级标题'}\n`, 4);
                break;
            case 'quote':
                replaceSelection(`\n> ${sel || '引用文本'}\n`, 3);
                break;
            case 'code':
                replaceSelection(`\n\`\`\`javascript\n${sel || '// 代码实现'}\n\`\`\`\n`, 14);
                break;
            case 'table':
                replaceSelection('\n| 列标题 1 | 列标题 2 | 列标题 3 |\n| :--- | :--- | :--- |\n| 数据内容 1 | 数据内容 2 | 数据内容 3 |\n', 3);
                break;
            case 'ul':
                replaceSelection(`\n- ${sel || '列表项目'}\n`, 3);
                break;
            case 'ol':
                replaceSelection(`\n1. ${sel || '列表条目'}\n`, 4);
                break;
            case 'task':
                replaceSelection(`\n- [ ] ${sel || '待办任务'}\n`, 7);
                break;
            case 'hr':
                replaceSelection('\n---\n', 5);
                break;
            case 'preview':
                this.togglePreview();
                break;
            case 'sideBySide':
                this.toggleSideBySide();
                break;
            case 'fullscreen':
                this.toggleFullscreen();
                break;
            case 'undo':
                if (this.historyIndex > 0) {
                    this.historyIndex--;
                    field.value = this.history[this.historyIndex];
                    this._onContentChange();
                }
                break;
            case 'redo':
                if (this.historyIndex < this.history.length - 1) {
                    this.historyIndex++;
                    field.value = this.history[this.historyIndex];
                    this._onContentChange();
                }
                break;
        }
    };

    EasyMDE.prototype.togglePreview = function () {
        const isShown = this.previewFull.classList.contains('active');
        const btn = this.toolbar.querySelector('button[data-cmd="preview"]');
        if (isShown) {
            this.previewFull.classList.remove('active');
            if (btn) btn.classList.remove('active');
        } else {
            this.previewFull.innerHTML = this.previewRender(this.editorField.value);
            this.previewFull.classList.add('active');
            if (btn) btn.classList.add('active');
        }
    };

    EasyMDE.prototype.toggleSideBySide = function (forceState) {
        this.sideBySideActive = forceState !== undefined ? forceState : !this.sideBySideActive;
        const btn = this.toolbar.querySelector('button[data-cmd="sideBySide"]');

        if (this.sideBySideActive) {
            this.previewPanel.classList.add('active');
            this.previewPanel.innerHTML = this.previewRender(this.editorField.value);
            if (btn) btn.classList.add('active');
        } else {
            this.previewPanel.classList.remove('active');
            if (btn) btn.classList.remove('active');
        }
    };

    EasyMDE.prototype.toggleFullscreen = function () {
        this.fullscreenActive = !this.fullscreenActive;
        const btn = this.toolbar.querySelector('button[data-cmd="fullscreen"]');
        if (this.fullscreenActive) {
            this.container.classList.add('fullscreen');
            if (btn) btn.classList.add('active');
        } else {
            this.container.classList.remove('fullscreen');
            if (btn) btn.classList.remove('active');
        }
    };

    EasyMDE.prototype.value = function (val) {
        if (val !== undefined) {
            this.editorField.value = val;
            this._onContentChange();
        }
        return this.editorField.value;
    };

    EasyMDE.prototype.setValue = function (val) {
        return this.value(val);
    };

    EasyMDE.prototype.getValue = function () {
        return this.value();
    };

    global.EasyMDE = EasyMDE;
})(window);