/**
 * 智慧校园助手核心业务逻辑 (App.js)
 * 规范、纯净、高可读性的移动端产品交互
 */

document.addEventListener('DOMContentLoaded', () => {
    App.init();
});

const App = {
    currentTab: 'schedule', // 默认进入课程表界面
    selectedDay: new Date().getDay() === 0 ? 7 : new Date().getDay(), // 1~7 (周一~周日)
    postDraftImages: [], // 校园墙图文发布草稿图片列表
    expandedComments: {}, // 校园墙帖子评论区展开状态管理
    chatFilter: 'groups', // 聊天导航过滤: 'groups' | 'classmates' | 'all_students'
    activeChatSession: {
        sessionKey: 'group:public',
        chatType: 'group',
        targetId: 'public',
        title: '校园公共交流大厅',
        desc: '全校师生公共大厅 · 记录实时留存归档'
    },

    init: async function () {
        // 移动端路由鉴权守卫：未登录直接拦截并跳转至登录页
        const user = DataManager.getCurrentUser();
        if (!user || !user.isLoggedIn) {
            window.location.replace('login.html');
            return;
        }

        this.bindNavEvents();
        this.bindScheduleEvents();
        this.bindNotesEvents();
        this.bindWallEvents();
        this.bindChatEvents();
        this.bindProfileEvents();
        this.bindModalEvents();


        // 页面初始化渲染（支持 URL 参数指定初始 Tab，例如 index.html?tab=notes）
        const urlParams = new URLSearchParams(window.location.search);
        const initialTab = urlParams.get('tab') || 'schedule';
        this.switchTab(initialTab);
        this.updateHeaderUserInfo();
        this.renderSchedule();
        await this.renderNotes();
        await this.renderWall();
        await this.renderChat();
        this.renderProfile();

        // 初始化时自动将课表同步至原生桌面小组件
        if (window.JSBridge) {
            const courses = DataManager.getCourses();
            JSBridge.syncCoursesToWidget(JSON.stringify(courses));
        }
    },

    // 顶部用户信息栏更新
    updateHeaderUserInfo: function () {
        const user = DataManager.getCurrentUser();
        const avatarEl = document.getElementById('header-user-avatar');
        const nameEl = document.getElementById('header-user-name');
        if (avatarEl) avatarEl.textContent = user.avatarText || user.name.charAt(0);
        if (nameEl) nameEl.textContent = user.isLoggedIn ? user.name : '未登录';
    },

    // 底部导航栏 Tab 切换
    bindNavEvents: function () {
        const tabs = document.querySelectorAll('.tab-item');
        tabs.forEach(tab => {
            tab.addEventListener('click', () => {
                const target = tab.getAttribute('data-tab');
                this.switchTab(target);
            });
        });

        // 顶部头像点击进入个人主页
        const headerBtn = document.getElementById('header-user-btn');
        if (headerBtn) {
            headerBtn.addEventListener('click', () => {
                this.switchTab('profile');
            });
        }

        // 全局浮动操作按钮 FAB
        const fabBtn = document.getElementById('global-fab-btn');
        if (fabBtn) {
            fabBtn.addEventListener('click', () => {
                const user = DataManager.getCurrentUser();
                if (!user.isLoggedIn) {
                    JSBridge.showToast('请先登录账号');
                    window.location.href = 'login.html';
                    return;
                }

                if (this.currentTab === 'schedule') {
                    this.openModal('modal-add-course');
                } else if (this.currentTab === 'notes') {
                    window.location.href = 'note_edit.html';
                } else if (this.currentTab === 'wall') {
                    this.openModal('modal-add-post');
                }
            });
        }
    },

    switchTab: function (tabName) {
        this.currentTab = tabName;

        // 更新导航激活态
        document.querySelectorAll('.tab-item').forEach(btn => {
            btn.classList.toggle('active', btn.getAttribute('data-tab') === tabName);
        });

        // 切换页面视口
        document.querySelectorAll('.tab-page').forEach(page => {
            page.classList.toggle('active', page.id === `page-${tabName}`);
        });

        // 控制 FAB 按钮显示与隐藏
        const fabBtn = document.getElementById('global-fab-btn');
        if (fabBtn) {
            if (['schedule', 'notes', 'wall'].includes(tabName)) {
                fabBtn.style.display = 'flex';
            } else {
                fabBtn.style.display = 'none';
            }
        }
    },

    // 1. 课程表模块 (Schedule)
    bindScheduleEvents: function () {
        // 星期切换
        const chips = document.querySelectorAll('.day-chip');
        chips.forEach(chip => {
            chip.addEventListener('click', () => {
                chips.forEach(c => c.classList.remove('active'));
                chip.classList.add('active');
                this.selectedDay = parseInt(chip.getAttribute('data-day'));
                this.renderSchedule();
            });
        });

        // 自动静音开关切换
        const muteToggle = document.getElementById('auto-mute-toggle');
        const settings = DataManager.getSettings();
        if (muteToggle) {
            muteToggle.checked = settings.autoMute;
            muteToggle.addEventListener('change', (e) => {
                settings.autoMute = e.target.checked;
                DataManager.saveSettings(settings);
            });
        }


        // 打开时光序标准课表导出弹窗
        const openExportBtn = document.getElementById('btn-open-export-modal');
        if (openExportBtn) {
            openExportBtn.addEventListener('click', () => {
                const exportData = DataManager.exportShiGuangSchedule();
                const jsonStr = JSON.stringify(exportData, null, 2);
                const previewEl = document.getElementById('export-json-preview');
                if (previewEl) {
                    previewEl.value = jsonStr;
                }
                this.openModal('modal-export-schedule');
            });
        }

        // 复制导出的 JSON 文本
        const copyExportBtn = document.getElementById('btn-copy-export-json');
        if (copyExportBtn) {
            copyExportBtn.addEventListener('click', () => {
                const previewEl = document.getElementById('export-json-preview');
                if (!previewEl || !previewEl.value) return;

                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(previewEl.value).then(() => {
                        JSBridge.showToast('课表 JSON 数据已复制到剪贴板');
                    }).catch(() => {
                        this._fallbackCopyText(previewEl);
                    });
                } else {
                    this._fallbackCopyText(previewEl);
                }
            });
        }

        // 下载 .json 课表文件
        const downloadExportBtn = document.getElementById('btn-download-export-json');
        if (downloadExportBtn) {
            downloadExportBtn.addEventListener('click', () => {
                const previewEl = document.getElementById('export-json-preview');
                if (!previewEl || !previewEl.value) return;

                try {
                    const blob = new Blob([previewEl.value], { type: 'application/json;charset=utf-8' });
                    const blobUrl = URL.createObjectURL(blob);
                    const link = document.createElement('a');
                    const timestamp = new Date().toISOString().slice(0, 10);
                    link.href = blobUrl;
                    link.download = `shiguang_schedule_${timestamp}.json`;
                    document.body.appendChild(link);
                    link.click();
                    document.body.removeChild(link);
                    URL.revokeObjectURL(blobUrl);
                    JSBridge.showToast('课表文件下载已启动');
                } catch (e) {
                    JSBridge.showToast('下载失败，请直接复制 JSON 文本');
                }
            });
        }

        // 打开时光序课表导入弹窗
        const openImportBtn = document.getElementById('btn-open-import-modal');
        if (openImportBtn) {
            openImportBtn.addEventListener('click', () => {
                const inputArea = document.getElementById('input-import-json');
                const fileInput = document.getElementById('input-schedule-file');
                const uploadText = document.getElementById('file-upload-text');
                const errorBox = document.getElementById('import-error-tip');

                if (inputArea) inputArea.value = '';
                if (fileInput) fileInput.value = '';
                if (uploadText) uploadText.textContent = '点击选择 .json 格式课表文件';
                if (errorBox) {
                    errorBox.style.display = 'none';
                    errorBox.textContent = '';
                }

                this.openModal('modal-import-schedule');
            });
        }

        // 触发本地课表文件选择
        const triggerUploadBtn = document.getElementById('btn-trigger-file-upload');
        const fileInput = document.getElementById('input-schedule-file');
        if (triggerUploadBtn && fileInput) {
            triggerUploadBtn.addEventListener('click', () => {
                fileInput.click();
            });

            fileInput.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (!file) return;

                const uploadText = document.getElementById('file-upload-text');
                if (uploadText) {
                    uploadText.textContent = `已选文件: ${file.name} (${(file.size / 1024).toFixed(1)} KB)`;
                }

                const reader = new FileReader();
                reader.onload = (event) => {
                    const content = event.target.result;
                    const inputArea = document.getElementById('input-import-json');
                    if (inputArea) {
                        inputArea.value = content;
                    }
                    JSBridge.showToast('文件载入成功，请确认后点击导入');
                };
                reader.onerror = () => {
                    JSBridge.showToast('文件读取失败，请检查文件格式');
                };
                reader.readAsText(file, 'utf-8');
            });
        }

        // 执行解析与导入
        const submitImportBtn = document.getElementById('btn-submit-import');
        if (submitImportBtn) {
            submitImportBtn.addEventListener('click', () => {
                const inputArea = document.getElementById('input-import-json');
                const errorBox = document.getElementById('import-error-tip');
                const rawJson = inputArea ? inputArea.value.trim() : '';

                if (!rawJson) {
                    if (errorBox) {
                        errorBox.style.display = 'block';
                        errorBox.textContent = '请先选择课表文件或粘贴 JSON 数据';
                    }
                    return;
                }

                const parseResult = DataManager.parseShiGuangData(rawJson);
                if (!parseResult.success) {
                    if (errorBox) {
                        errorBox.style.display = 'block';
                        errorBox.textContent = `导入解析失败: ${parseResult.error}`;
                    }
                    return;
                }

                // 获取选中的导入模式 (replace 或 merge)
                const modeRadio = document.querySelector('input[name="import-mode"]:checked');
                const mode = modeRadio ? modeRadio.value : 'replace';

                // 执行导入与持久化
                const importRes = DataManager.importCourses(parseResult.courses, mode);
                if (errorBox) {
                    errorBox.style.display = 'none';
                }

                this.closeModals();
                this.renderSchedule();
                JSBridge.showToast(`成功导入 ${parseResult.count} 门课程并同步至桌面小组件`);
            });
        }

        // 添加课程提交
        const addCourseForm = document.getElementById('form-add-course');
        if (addCourseForm) {
            addCourseForm.addEventListener('submit', (e) => {
                e.preventDefault();
                const name = document.getElementById('input-course-name').value.trim();
                const teacher = document.getElementById('input-course-teacher').value.trim();
                const room = document.getElementById('input-course-room').value.trim();
                const day = parseInt(document.getElementById('input-course-day').value);
                const startTime = document.getElementById('input-course-start').value;
                const endTime = document.getElementById('input-course-end').value;

                if (!name || !room) {
                    JSBridge.showToast('请填写课程名称和教室地点');
                    return;
                }

                // 根据时间推导节次
                let startSec = 1;
                let endSec = 2;
                if (startTime) {
                    const h = parseInt(startTime.split(':')[0]);
                    if (h <= 9) { startSec = 1; endSec = 2; }
                    else if (h <= 11) { startSec = 3; endSec = 4; }
                    else if (h <= 15) { startSec = 5; endSec = 6; }
                    else if (h <= 17) { startSec = 7; endSec = 8; }
                    else { startSec = 9; endSec = 10; }
                }

                DataManager.addCourse({
                    name, teacher, room,
                    dayOfWeek: day,
                    startTime, endTime,
                    startSection: startSec,
                    endSection: endSec,
                    startWeek: 1,
                    endWeek: 18,
                    color: '#4338ca'
                });

                this.closeModals();
                addCourseForm.reset();
                this.renderSchedule();
                JSBridge.showToast('课程已保存并同步至小组件');
            });
        }
    },

    // 点击空槽快速预填添加课程
    quickAddCourse: function (day, start, end) {
        const daySelect = document.getElementById('input-course-day');
        const startInput = document.getElementById('input-course-start');
        const endInput = document.getElementById('input-course-end');
        if (daySelect) daySelect.value = day;
        if (startInput) startInput.value = start;
        if (endInput) endInput.value = end;
        this.openModal('modal-add-course');
    },

    renderSchedule: function () {
        const listContainer = document.getElementById('course-list-container');
        const userDescEl = document.getElementById('schedule-user-info');
        const user = DataManager.getCurrentUser();

        if (userDescEl) {
            userDescEl.textContent = user.isLoggedIn 
                ? `${user.college} · ${user.classGrade || user.major}` 
                : '山东商业职业技术大学 · 访客';
        }

        if (!listContainer) return;

        const allCourses = DataManager.getCourses();
        const currentDayCourses = allCourses.filter(c => c.dayOfWeek === this.selectedDay);

        // 拾光课表标准节次固定时间槽（1-2节，3-4节，5-6节，7-8节，9-10节）
        const STANDARD_SLOTS = [
            { section: '1-2', label: '第 1-2 节', period: '上午', startTime: '08:00', endTime: '09:40', startSec: 1, endSec: 2 },
            { section: '3-4', label: '第 3-4 节', period: '上午', startTime: '10:00', endTime: '11:40', startSec: 3, endSec: 4 },
            { section: '5-6', label: '第 5-6 节', period: '下午', startTime: '14:00', endTime: '15:40', startSec: 5, endSec: 6 },
            { section: '7-8', label: '第 7-8 节', period: '下午', startTime: '16:00', endTime: '17:40', startSec: 7, endSec: 8 },
            { section: '9-10', label: '第 9-10 节', period: '晚间', startTime: '19:00', endTime: '20:40', startSec: 9, endSec: 10 }
        ];

        // 映射课程至固定时间槽
        const getSlotForCourse = (course) => {
            if (course.startSection) {
                const sec = parseInt(course.startSection);
                const found = STANDARD_SLOTS.find(s => sec >= s.startSec && sec <= s.endSec);
                if (found) return found.section;
            }
            if (course.startTime) {
                const [h, m] = course.startTime.split(':').map(Number);
                const totalMin = h * 60 + (m || 0);
                if (totalMin < 10 * 60) return '1-2';
                if (totalMin < 13 * 60) return '3-4';
                if (totalMin < 16 * 60) return '5-6';
                if (totalMin < 18 * 60 + 30) return '7-8';
                return '9-10';
            }
            return '1-2';
        };

        const slotMap = {};
        STANDARD_SLOTS.forEach(s => { slotMap[s.section] = []; });
        currentDayCourses.forEach(c => {
            const slotKey = getSlotForCourse(c);
            if (slotMap[slotKey]) {
                slotMap[slotKey].push(c);
            } else {
                slotMap['1-2'].push(c);
            }
        });

        // 渲染时间固定排列列表（左侧节次+时间，右侧课表或留空）
        let html = '<div class="schedule-timeline-list">';
        STANDARD_SLOTS.forEach(slot => {
            const matched = slotMap[slot.section];
            html += `
                <div class="schedule-slot-row">
                    <!-- 左侧：第几节课及对应上课起止时间 -->
                    <div class="slot-left-col">
                        <span class="slot-period-tag">${slot.period}</span>
                        <div class="slot-section-title">${slot.label}</div>
                        <div class="slot-time-range">${slot.startTime} - ${slot.endTime}</div>
                    </div>

                    <!-- 右侧：课表内容卡片 或 留空展示 -->
                    <div class="slot-right-col">
            `;

            if (matched && matched.length > 0) {
                matched.forEach(c => {
                    html += `
                        <div class="course-slot-card" style="border-left-color: ${c.color || 'var(--primary)'};">
                            <div class="course-card-main">
                                <div class="course-header-line">
                                    <div class="course-title-text">${c.name}</div>
                                    <button class="btn-icon btn-delete-course" onclick="App.deleteCourse('${c.id}')" title="删除课程">✕</button>
                                </div>
                                <div class="course-meta-tags">
                                    <span class="meta-pill">📍 ${c.room || '校内教室'}</span>
                                    <span class="meta-pill">👤 ${c.teacher || '任课教师'}</span>
                                    ${c.startWeek ? `<span class="meta-pill">📅 第${c.startWeek}-${c.endWeek || 18}周</span>` : ''}
                                </div>
                            </div>
                        </div>
                    `;
                });
            } else {
                // 没课的时间留空
                html += `
                    <div class="slot-empty-card" onclick="App.quickAddCourse(${this.selectedDay}, '${slot.startTime}', '${slot.endTime}')" title="此时段暂无课程，点击可快捷添加">
                        <div class="slot-empty-content">
                            <span class="slot-empty-status">无课程安排</span>
                            <span class="slot-empty-action">+ 添加课程</span>
                        </div>
                    </div>
                `;
            }

            html += `
                    </div>
                </div>
            `;
        });
        html += '</div>';

        listContainer.innerHTML = html;
    },

    deleteCourse: function (id) {
        if (confirm('确认删除该门课程？')) {
            DataManager.deleteCourse(id);
            this.renderSchedule();
            JSBridge.showToast('课程已删除');
        }
    },

    // 2. 笔记共享模块 (Notes)
    bindNotesEvents: function () {
        document.querySelectorAll('.note-filter-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                document.querySelectorAll('.note-filter-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                const category = btn.getAttribute('data-cat');
                this.renderNotes(category);
            });
        });

        // 跳转至独立 Markdown 写笔记页面
        const gotoEditBtn = document.getElementById('btn-goto-note-edit');
        if (gotoEditBtn) {
            gotoEditBtn.addEventListener('click', () => {
                const user = DataManager.getCurrentUser();
                if (!user.isLoggedIn) {
                    JSBridge.showToast('请先登录账号后再撰写笔记');
                    window.location.href = 'login.html';
                    return;
                }
                window.location.href = 'note_edit.html';
            });
        }
    },

    renderNotes: async function (filterCat = 'all') {
        const container = document.getElementById('notes-list-container');
        if (!container) return;

        let notes = await DataManager.getNotes();
        if (filterCat !== 'all') {
            notes = notes.filter(n => n.category === filterCat);
        }

        if (notes.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 48px 20px; color: var(--text-muted);">
                    <div style="font-size: 14px; font-weight: 600;">暂无相关分类笔记</div>
                    <div style="font-size: 12px; margin-top: 4px;">点击右上角“+ 写笔记”发布第一篇 Markdown 笔记吧</div>
                </div>
            `;
            return;
        }

        const currentUser = DataManager.getCurrentUser();
        const isAdmin = currentUser && (currentUser.role === 'admin' || currentUser.role === 'teacher');

        container.innerHTML = notes.map(n => {
            const isOwner = currentUser && ((currentUser.accountNo && (n.authorAccount === currentUser.accountNo || n.authorId === currentUser.accountNo)) || (n.authorName === currentUser.name || n.author === currentUser.name));
            const canDelete = isAdmin || isOwner;

            return `
            <div class="feed-card note-interactive-card" onclick="window.location.href='note_detail.html?id=${n.id}'" style="cursor: pointer;">
                <div class="feed-header">
                    <div class="user-badge">
                        <div class="user-avatar-circle">${(n.authorName || n.author || '李').charAt(0)}</div>
                        <div>
                            <div class="user-meta-name">${n.authorName || n.author || '在校生'}</div>
                            <div class="user-meta-time">${n.createdAt || n.time || '刚刚'} · <span style="color: var(--primary);">${n.category}</span></div>
                        </div>
                    </div>
                    <div style="display: flex; gap: 6px; align-items: center;">
                        <span class="tag-badge" style="background: #e0e7ff; color: var(--primary);">
                            ${n.commentCount !== undefined ? `💬 ${n.commentCount} 研讨` : 'Markdown 笔记'}
                        </span>
                        ${canDelete ? `
                            <button class="btn-action" style="color: #ef4444; background: #fee2e2; border: 1px solid #fca5a5; padding: 2px 8px; font-size: 11px;" onclick="event.stopPropagation(); App.deleteNote('${n.id}', '${n.title.replace(/'/g, "\\'")}')">
                                删除
                            </button>
                        ` : ''}
                    </div>
                </div>
                <div class="feed-title">${n.title}</div>
                <div class="feed-body" style="display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; color: var(--text-muted); font-size: 13px;">
                    ${(n.content || '').replace(/[#*`\->|]/g, '').trim()}
                </div>
                ${n.tags && n.tags.length ? `
                    <div style="display: flex; gap: 6px; margin-top: 10px; flex-wrap: wrap;">
                        ${n.tags.map(t => `<span style="font-size: 11px; background: #f1f5f9; padding: 2px 8px; border-radius: 4px; color: var(--text-muted); border: 1px solid #e2e8f0;">#${t}</span>`).join('')}
                    </div>
                ` : ''}
                <div class="feed-actions" style="margin-top: 12px; border-top: 1px solid #f1f5f9; padding-top: 10px;">
                    <button class="btn-action" onclick="event.stopPropagation(); JSBridge.showToast('点赞成功')">赞 (${n.likes || 0})</button>
                    <button class="btn-action" onclick="event.stopPropagation(); window.location.href='note_detail.html?id=${n.id}'">查看全文与研讨</button>
                    <button class="btn-action" onclick="event.stopPropagation(); JSBridge.showToast('已复制笔记分享链接')">分享</button>
                </div>
            </div>
            `;
        }).join('');
    },

    deleteNote: async function (noteId, noteTitle) {
        if (!confirm(`确定要删除笔记《${noteTitle || ''}》吗？删除后不可恢复。`)) {
            return;
        }

        const user = DataManager.getCurrentUser();
        const res = await DataManager.deleteNote(noteId, user);
        if (res.success) {
            await this.renderNotes();
            JSBridge.showToast(res.message || '笔记已删除');
        } else {
            JSBridge.showToast(res.message || '删除失败');
        }
    },

    // 3. 校园墙模块 (Wall - 图文混排、高清晰度网格、大图预览与内嵌深度评论)
    bindWallEvents: function () {
        const formAddPost = document.getElementById('form-add-post');
        const fileInput = document.getElementById('input-post-file');
        const triggerUploadBtn = document.getElementById('btn-trigger-upload');
        const closeLightboxBtn = document.getElementById('btn-close-lightbox');
        const lightboxModal = document.getElementById('modal-image-lightbox');

        if (triggerUploadBtn && fileInput) {
            triggerUploadBtn.addEventListener('click', () => {
                fileInput.click();
            });
        }

        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                const files = Array.from(e.target.files || []);
                if (!files.length) return;

                let loadedCount = 0;
                files.forEach(file => {
                    const reader = new FileReader();
                    reader.onload = (uploadEvent) => {
                        if (uploadEvent.target && uploadEvent.target.result) {
                            this.postDraftImages.push(uploadEvent.target.result);
                        }
                        loadedCount++;
                        if (loadedCount === files.length) {
                            this.renderDraftThumbs();
                            fileInput.value = '';
                        }
                    };
                    reader.readAsDataURL(file);
                });
            });
        }

        if (formAddPost) {
            formAddPost.addEventListener('submit', async (e) => {
                e.preventDefault();
                const user = DataManager.getCurrentUser();
                if (!user.isLoggedIn) {
                    JSBridge.showToast('请先登录账号');
                    window.location.href = 'login.html';
                    return;
                }

                const type = document.getElementById('input-post-type').value;
                const content = document.getElementById('input-post-content').value.trim();
                const isAnon = document.getElementById('input-post-anon').checked;

                let typeLabel = '校园动态';
                let typeColor = '#4338ca';
                if (type === 'lost') { typeLabel = '寻物启事'; typeColor = '#d97706'; }
                if (type === 'treehole') { typeLabel = '学习讨论'; typeColor = '#7c3aed'; }
                if (type === 'market') { typeLabel = '二手闲置'; typeColor = '#059669'; }

                await DataManager.addPost({
                    type,
                    typeLabel,
                    typeColor,
                    content,
                    isPinned: false,
                    author: isAnon ? '匿名同学' : user.name,
                    authorAccount: isAnon ? '' : (user.accountNo || ''),
                    role: user.role || 'student',
                    dept: user.dept || (user.role === 'admin' ? '教务与学生处' : '信息技术学院'),
                    images: [...this.postDraftImages]
                });

                this.postDraftImages = [];
                this.renderDraftThumbs();
                this.closeModals();
                formAddPost.reset();
                await this.renderWall();
                JSBridge.showToast('图文动态已发布');
            });
        }

        if (closeLightboxBtn) {
            closeLightboxBtn.addEventListener('click', () => {
                this.closeLightbox();
            });
        }

        if (lightboxModal) {
            lightboxModal.addEventListener('click', (e) => {
                if (e.target === lightboxModal) {
                    this.closeLightbox();
                }
            });
        }
    },

    addPresetImageToDraft: function (key) {
        const presets = DataManager.getPresetImages ? DataManager.getPresetImages() : null;
        if (presets && presets[key]) {
            this.postDraftImages.push(presets[key]);
            this.renderDraftThumbs();
            JSBridge.showToast('已添加校园配图');
        }
    },

    removeDraftImage: function (index) {
        if (index >= 0 && index < this.postDraftImages.length) {
            this.postDraftImages.splice(index, 1);
            this.renderDraftThumbs();
        }
    },

    renderDraftThumbs: function () {
        const container = document.getElementById('post-draft-thumbs');
        if (!container) return;

        if (!this.postDraftImages || !this.postDraftImages.length) {
            container.innerHTML = '';
            return;
        }

        container.innerHTML = this.postDraftImages.map((src, idx) => `
            <div class="upload-thumb-card">
                <img src="${src}" alt="配图预览">
                <button type="button" class="btn-remove-thumb" onclick="App.removeDraftImage(${idx})">✕</button>
            </div>
        `).join('');
    },

    openLightbox: function (src) {
        const modal = document.getElementById('modal-image-lightbox');
        const img = document.getElementById('lightbox-full-img');
        if (modal && img) {
            img.src = src;
            modal.classList.add('active');
        }
    },

    closeLightbox: function () {
        const modal = document.getElementById('modal-image-lightbox');
        if (modal) {
            modal.classList.remove('active');
        }
    },

    renderPostMedia: function (images, postId) {
        if (!images || !Array.isArray(images) || images.length === 0) {
            return '';
        }

        if (images.length === 1) {
            return `
                <div class="post-media-container">
                    <div class="post-media-single" onclick="App.openLightbox('${images[0]}')">
                        <img src="${images[0]}" alt="动态配图" loading="lazy">
                    </div>
                </div>
            `;
        }

        const gridClass = (images.length === 2 || images.length === 4) ? 'post-media-grid-2' : 'post-media-grid-3';
        return `
            <div class="post-media-container">
                <div class="${gridClass}">
                    ${images.map(img => `
                        <div class="post-media-item" onclick="App.openLightbox('${img}')">
                            <img src="${img}" alt="动态配图" loading="lazy">
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
    },

    renderWall: async function () {
        const container = document.getElementById('wall-list-container');
        if (!container) return;

        const posts = await DataManager.getPosts();
        const currentUser = DataManager.getCurrentUser();
        const isAdmin = currentUser.role === 'admin';

        container.innerHTML = posts.map(p => {
            const commentsCount = p.comments ? p.comments.length : 0;
            const isCommentsExpanded = this.expandedComments[p.id] !== false; // 默认展开增强评论区以提升互动沉浸感
            const roleBadgeClass = p.role === 'admin' ? 'comment-role-pill admin' : 'comment-role-pill student';
            const roleBadgeText = p.role === 'admin' ? '管理员' : (p.dept || '学生');
            const isOwner = currentUser && ((currentUser.accountNo && p.authorAccount === currentUser.accountNo) || p.author === currentUser.name);
            const canDelete = isAdmin || isOwner;

            return `
                <div class="feed-card" style="${p.isPinned ? 'border: 2px solid #f87171; background: #fffdfd;' : ''}">
                    <div class="feed-header">
                        <div class="user-badge">
                            <div class="user-avatar-circle" style="background: ${p.typeColor}15; color: ${p.typeColor};">
                                ${(p.author || '校').charAt(0)}
                            </div>
                            <div>
                                <div style="display: flex; align-items: center; gap: 6px;">
                                    <span class="user-meta-name">${p.author}</span>
                                    <span class="${roleBadgeClass}">${roleBadgeText}</span>
                                </div>
                                <div class="user-meta-time">${p.time}</div>
                            </div>
                        </div>
                        <div style="display: flex; gap: 6px; align-items: center;">
                            <span class="tag-badge" style="background: ${p.typeColor}12; color: ${p.typeColor};">
                                ${p.isPinned ? '置顶 · ' : ''}${p.typeLabel}
                            </span>
                            ${isAdmin ? `
                                <button onclick="App.togglePin('${p.id}')" style="border: 1.5px solid #ef4444; background: #fee2e2; color: #ef4444; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; cursor: pointer;">
                                    ${p.isPinned ? '取消置顶' : '置顶'}
                                </button>
                            ` : ''}
                            ${canDelete ? `
                                <button onclick="App.deletePost('${p.id}')" style="border: 1.5px solid #fca5a5; background: #fee2e2; color: #ef4444; font-size: 11px; font-weight: 800; padding: 2px 8px; border-radius: 4px; cursor: pointer;">
                                    删除
                                </button>
                            ` : ''}
                        </div>
                    </div>
                    
                    <div class="feed-body">${p.content}</div>

                    ${this.renderPostMedia(p.images, p.id)}

                    <div class="feed-actions">
                        <button class="btn-action ${p.isLiked ? 'liked' : ''}" onclick="App.likePost('${p.id}')">
                            <span style="font-size: 13px;">${p.isLiked ? '♥' : '♡'}</span>
                            <span>${p.isLiked ? '已赞' : '点赞'}</span>
                            <span style="font-weight: 800;">(${p.likes})</span>
                        </button>
                        <button class="btn-action" onclick="App.toggleComments('${p.id}')">
                            <span style="font-size: 13px;">💬</span>
                            <span>评论</span>
                            <span style="font-weight: 800;">(${commentsCount})</span>
                        </button>
                    </div>

                    ${isCommentsExpanded ? `
                        <div class="post-comments-wrapper" id="comments-section-${p.id}">
                            <div class="post-comments-header">
                                <span>互动评论 (${commentsCount})</span>
                                <span style="font-size: 11px; color: var(--text-muted); cursor: pointer;" onclick="App.toggleComments('${p.id}')">收起</span>
                            </div>
                            
                            <div class="post-comments-list">
                                ${p.comments && p.comments.length ? p.comments.map(c => `
                                    <div class="post-comment-item">
                                        <div class="comment-avatar-badge" style="background: ${c.role === 'admin' ? '#fee2e2' : '#eef2ff'};">
                                            ${(c.user || '同').charAt(0)}
                                        </div>
                                        <div class="comment-body-wrap">
                                            <div class="comment-meta-line">
                                                <span class="comment-user-name">${c.user}</span>
                                                <span class="comment-role-pill ${c.role === 'admin' ? 'admin' : 'student'}">
                                                    ${c.role === 'admin' ? '教师' : (c.dept || '同学')}
                                                </span>
                                                <span class="comment-time-text">${c.time || '近期'}</span>
                                            </div>
                                            <div class="comment-content-text">${c.text}</div>
                                        </div>
                                    </div>
                                `).join('') : `
                                    <div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 10px 0;">
                                        暂无评论，留下第一条真诚发言吧~
                                    </div>
                                `}
                            </div>

                            <!-- 快捷评论发表条 -->
                            <div class="comment-input-bar">
                                <input type="text" 
                                       id="comment-input-${p.id}" 
                                       class="comment-input-field" 
                                       placeholder="说点什么，支持回车发送..." 
                                       onkeydown="if(event.key==='Enter') App.submitComment('${p.id}')">
                                <button type="button" class="btn-send-comment" onclick="App.submitComment('${p.id}')">
                                    发送
                                </button>
                            </div>
                        </div>
                    ` : ''}
                </div>
            `;
        }).join('');
    },

    toggleComments: async function (postId) {
        this.expandedComments[postId] = this.expandedComments[postId] === false;
        await this.renderWall();
        if (this.expandedComments[postId]) {
            setTimeout(() => {
                const input = document.getElementById(`comment-input-${postId}`);
                if (input) input.focus();
            }, 50);
        }
    },

    submitComment: async function (postId) {
        const user = DataManager.getCurrentUser();
        if (!user || !user.isLoggedIn) {
            JSBridge.showToast('请先登录账号后发表评论');
            window.location.href = 'login.html';
            return;
        }

        const input = document.getElementById(`comment-input-${postId}`);
        if (!input) return;
        const text = input.value.trim();
        if (!text) {
            JSBridge.showToast('请输入评论内容');
            return;
        }

        const result = await DataManager.addComment(postId, {
            user: user.name,
            role: user.role || 'student',
            dept: user.dept || (user.role === 'admin' ? '教务与学生处' : '信息技术学院'),
            text: text
        });

        if (result.success) {
            input.value = '';
            this.expandedComments[postId] = true;
            await this.renderWall();
            JSBridge.showToast('评论发表成功');
        }
    },

    togglePin: async function (postId) {
        const res = await DataManager.togglePinPost(postId);
        if (res.success) {
            await this.renderWall();
            JSBridge.showToast('置顶状态已更新');
        } else {
            alert(res.message);
        }
    },

    likePost: async function (id) {
        await DataManager.toggleLikePost(id);
        await this.renderWall();
    },

    deletePost: async function (postId) {
        if (!confirm('确定要删除这条校园动态吗？删除后不可恢复。')) {
            return;
        }

        const user = DataManager.getCurrentUser();
        const res = await DataManager.deletePost(postId, user);
        if (res.success) {
            await this.renderWall();
            JSBridge.showToast('动态已成功删除');
        } else {
            JSBridge.showToast(res.message || '删除失败');
        }
    },

    // 4. 校园即时沟通模块 (Chat - 支持群聊/同班同学/全校学生私聊与自建群聊)
    bindChatEvents: function () {
        const sendBtn = document.getElementById('btn-chat-send');
        const input = document.getElementById('input-chat-text');
        const openCreateGroupBtn = document.getElementById('btn-open-create-group');
        const formCreateGroup = document.getElementById('form-create-group');
        const backBtn = document.getElementById('btn-chat-back');

        // 窄屏下从全屏聊天视图返回会话/通讯录列表
        if (backBtn) {
            backBtn.addEventListener('click', () => {
                const layout = document.querySelector('.chat-main-layout');
                if (layout) layout.classList.remove('chat-fullscreen');
                backBtn.style.display = 'none';
                const sidebar = document.querySelector('.chat-sidebar-panel');
                if (sidebar) sidebar.style.display = 'flex';
            });
        }

        // 会话切换分类 Tab 事件 (群聊 / 同班同学 / 全部学生)
        document.querySelectorAll('.chat-filter-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const filter = e.target.getAttribute('data-chat-filter');
                this.chatFilter = filter;
                document.querySelectorAll('.chat-filter-btn').forEach(b => b.classList.toggle('active', b === e.target));
                this.renderChatSessionList();
            });
        });

        // 新建群聊弹窗唤起
        if (openCreateGroupBtn) {
            openCreateGroupBtn.addEventListener('click', () => {
                this.openCreateGroupModal();
            });
        }

        // 提交新建群聊
        if (formCreateGroup) {
            formCreateGroup.addEventListener('submit', (e) => {
                e.preventDefault();
                const groupName = document.getElementById('input-group-name').value.trim();
                if (!groupName) return;

                const checkedBoxes = Array.from(document.querySelectorAll('#create-group-member-checklist input[type="checkbox"]:checked'));
                const memberAccounts = checkedBoxes.map(cb => cb.value);
                const memberNames = checkedBoxes.map(cb => cb.getAttribute('data-name'));

                const newGroup = DataManager.createChatGroup(groupName, memberAccounts, memberNames);
                this.closeModals();
                formCreateGroup.reset();

                // 切换到新群聊
                this.chatFilter = 'groups';
                document.querySelectorAll('.chat-filter-btn').forEach(b => b.classList.toggle('active', b.getAttribute('data-chat-filter') === 'groups'));
                this.switchChatSession({
                    sessionKey: `group:${newGroup.id}`,
                    chatType: 'group',
                    targetId: newGroup.id,
                    title: newGroup.name,
                    desc: `群主: ${newGroup.creatorName} · 成员共 ${newGroup.members.length} 人`
                });

                JSBridge.showToast('新群聊已创建并归档');
            });
        }

        const doSend = async () => {
            const user = DataManager.getCurrentUser();
            if (!user.isLoggedIn) {
                JSBridge.showToast('请先登录后发言');
                window.location.href = 'login.html';
                return;
            }

            const text = input.value.trim();
            if (!text) return;

            await DataManager.addChatMessage(this.activeChatSession.sessionKey, text, {
                chatType: this.activeChatSession.chatType,
                targetId: this.activeChatSession.targetId,
                targetName: this.activeChatSession.title
            });

            input.value = '';
            await this.renderChatMessages();
            localStorage.setItem('campus_chat_read_' + this.activeChatSession.sessionKey, new Date().toISOString());
            this.renderChatSessionList();
        };

        if (sendBtn) sendBtn.addEventListener('click', doSend);
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') doSend();
            });
        }
    },

    openCreateGroupModal: function () {
        const checklist = document.getElementById('create-group-member-checklist');
        if (!checklist) return;

        const currentUser = DataManager.getCurrentUser();
        const accounts = DataManager.getAccounts ? DataManager.getAccounts() : [];
        const candidateStudents = accounts.filter(a => a.role === 'student' && a.accountNo !== currentUser.accountNo);

        if (!candidateStudents.length) {
            checklist.innerHTML = '<div style="font-size: 11px; color: var(--text-muted); padding: 8px;">暂无其他在校生候选</div>';
        } else {
            checklist.innerHTML = candidateStudents.map(s => {
                const isClassmate = s.classGrade && s.classGrade === currentUser.classGrade;
                return `
                    <label style="display: flex; align-items: center; gap: 8px; font-size: 12px; cursor: pointer; padding: 4px; border-radius: 4px; background: #ffffff; border: 1px solid #e2e8f0;">
                        <input type="checkbox" value="${s.accountNo}" data-name="${s.name}" style="width: auto;">
                        <span style="font-weight: 700; color: var(--text-main);">${s.name}</span>
                        <span style="font-size: 11px; color: var(--text-muted);">(${s.accountNo} · ${s.classGrade || s.college || '在校生'})</span>
                        ${isClassmate ? '<span style="font-size: 10px; background: #dcfce7; color: #166534; padding: 1px 4px; border-radius: 3px; margin-left: auto;">同班</span>' : ''}
                    </label>
                `;
            }).join('');
        }

        this.openModal('modal-create-group');
    },

    switchChatSession: async function (session) {
        this.activeChatSession = session;

        const titleEl = document.getElementById('chat-active-title');
        const descEl = document.getElementById('chat-active-desc');
        const summaryBadge = document.getElementById('chat-member-summary');
        const backBtn = document.getElementById('btn-chat-back');
        const layout = document.querySelector('.chat-main-layout');

        // 窄屏设备：点击会话后直接进入独立全屏聊天视图，聊天区域最大化加宽
        if (layout && window.innerWidth <= 768) {
            layout.classList.add('chat-fullscreen');
            const sidebar = document.querySelector('.chat-sidebar-panel');
            if (sidebar) sidebar.style.display = 'none';
            if (backBtn) backBtn.style.display = 'inline-flex';
        }

        if (titleEl) titleEl.textContent = session.title;
        if (descEl) descEl.textContent = session.desc;
        if (summaryBadge) {
            summaryBadge.textContent = session.chatType === 'group' ? '群聊' : '私聊';
            summaryBadge.style.background = session.chatType === 'group' ? '#eef2ff' : '#ecfdf5';
            summaryBadge.style.color = session.chatType === 'group' ? '#4338ca' : '#059669';
        }

        this.renderChatSessionList();
        await this.renderChatMessages();

        // 标记当前会话已读
        localStorage.setItem('campus_chat_read_' + session.sessionKey, new Date().toISOString());
        this.renderChatSessionList();
    },

    renderChat: async function () {
        this.renderChatSessionList();
        await this.renderChatMessages();
    },

    renderChatSessionList: function () {
        const container = document.getElementById('chat-session-list');
        if (!container) return;

        const currentUser = DataManager.getCurrentUser();
        const activeKey = this.activeChatSession.sessionKey;

        // 未读消息红点辅助函数
        const hasUnread = (sKey) => {
            const stored = localStorage.getItem('campus_messages');
            if (!stored) return false;
            try {
                const all = JSON.parse(stored);
                const msgs = all.filter(m => m.sessionKey === sKey);
                if (!msgs.length) return false;
                const readKey = 'campus_chat_read_' + sKey;
                const lastRead = localStorage.getItem(readKey);
                if (!lastRead) return true;
                return msgs.some(m => {
                    const ts = m.timestamp || m.time || '';
                    return ts > lastRead && m.senderAccount !== currentUser.accountNo && !m.isSelf;
                });
            } catch (e) { return false; }
        };
        const unreadDot = '<span style="position:absolute;top:8px;right:10px;width:8px;height:8px;background:#ef4444;border-radius:50%;border:1.5px solid #fff;"></span>';

        // 1. 群聊分类列表
        if (this.chatFilter === 'groups') {
            const groups = DataManager.getChatGroups();
            container.innerHTML = groups.map(g => {
                const sKey = `group:${g.id}`;
                const isActive = activeKey === sKey;
                const isClass = g.type === 'class';
                const unread = hasUnread(sKey);
                return `
                    <div class="chat-session-item ${isActive ? 'active' : ''}" style="position:relative;" onclick="App.switchChatSession({ sessionKey: '${sKey}', chatType: 'group', targetId: '${g.id}', title: '${g.name.replace(/'/g, "\\'")}', desc: '${isClass ? (g.classGrade + ' 班级群') : (g.creatorName ? ('群主: ' + g.creatorName) : '全校交流群')}' })">
                        ${unread ? unreadDot : ''}
                        <div class="chat-session-avatar" style="background: ${isClass ? '#dcfce7' : '#e0e7ff'}; color: ${isClass ? '#166534' : '#4338ca'};">
                            ${isClass ? '班' : '群'}
                        </div>
                        <div class="chat-session-info">
                            <div class="chat-session-title-line">
                                <span class="chat-session-name">${g.name}</span>
                                <span class="chat-session-tag">${isClass ? '同班' : '群组'}</span>
                            </div>
                            <div class="chat-session-sub">${isClass ? g.classGrade : (g.type === 'public' ? '全校公共大厅' : '自建研讨群')}</div>
                        </div>
                    </div>
                `;
            }).join('');
            return;
        }

        // 2. 老师列表（学生可主动发起与老师私聊）
        if (this.chatFilter === 'teachers') {
            const allAccounts = DataManager.getAccounts ? DataManager.getAccounts() : [];
            const teacherList = allAccounts.filter(a => a.role === 'admin' && a.accountNo !== currentUser.accountNo);

            if (!teacherList.length) {
                container.innerHTML = `<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 20px;">暂无老师联系人</div>`;
                return;
            }

            container.innerHTML = teacherList.map(t => {
                const pairKey = [currentUser.accountNo || 'me', t.accountNo || 'other'].sort().join('_');
                const sKey = `private:${pairKey}`;
                const isActive = activeKey === sKey;
                const unread = hasUnread(sKey);

                return `
                    <div class="chat-session-item ${isActive ? 'active' : ''}" style="position:relative;" onclick="App.switchChatSession({ sessionKey: '${sKey}', chatType: 'private', targetId: '${t.accountNo}', title: '与 ${t.name} 私聊', desc: '${t.college || ''} · ${t.major || t.classGrade || ''}' })">
                        ${unread ? unreadDot : ''}
                        <div class="chat-session-avatar" style="background: #fef3c7; color: #92400e;">
                            ${t.avatarText || t.name.charAt(0)}
                        </div>
                        <div class="chat-session-info">
                            <div class="chat-session-title-line">
                                <span class="chat-session-name">${t.name}</span>
                                <span class="chat-session-tag" style="background:#fef3c7; color:#92400e;">老师</span>
                            </div>
                            <div class="chat-session-sub">${t.major || t.classGrade || t.accountNo}</div>
                        </div>
                    </div>
                `;
            }).join('');
            return;
        }

        // 3. 联系人分类（同班同学 / 全部学生）
        const allAccounts = DataManager.getAccounts ? DataManager.getAccounts() : [];
        let candidateList = allAccounts.filter(a => a.role === 'student' && a.accountNo !== currentUser.accountNo);

        if (this.chatFilter === 'classmates') {
            candidateList = candidateList.filter(a => a.classGrade && currentUser.classGrade && a.classGrade === currentUser.classGrade);
        }

        if (!candidateList.length) {
            container.innerHTML = `<div style="font-size: 11px; color: var(--text-muted); text-align: center; padding: 20px;">${this.chatFilter === 'classmates' ? '暂无其他同班同学' : '暂无其他学生'}</div>`;
            return;
        }

        container.innerHTML = candidateList.map(s => {
            const pairKey = [currentUser.accountNo || 'me', s.accountNo || 'other'].sort().join('_');
            const sKey = `private:${pairKey}`;
            const isActive = activeKey === sKey;
            const isClassmate = s.classGrade && s.classGrade === currentUser.classGrade;
            const unread = hasUnread(sKey);

            return `
                <div class="chat-session-item ${isActive ? 'active' : ''}" style="position:relative;" onclick="App.switchChatSession({ sessionKey: '${sKey}', chatType: 'private', targetId: '${s.accountNo}', title: '与 ${s.name} 私聊', desc: '${s.college || ''} · ${s.classGrade || s.major || ''}' })">
                    ${unread ? unreadDot : ''}
                    <div class="chat-session-avatar" style="background: ${isClassmate ? '#fef3c7' : '#f1f5f9'}; color: ${isClassmate ? '#92400e' : '#334155'};">
                        ${s.avatarText || s.name.charAt(0)}
                    </div>
                    <div class="chat-session-info">
                        <div class="chat-session-title-line">
                            <span class="chat-session-name">${s.name}</span>
                            <span class="chat-session-tag" style="${isClassmate ? 'background:#dcfce7; color:#166534;' : ''}">
                                ${isClassmate ? '同班' : '学生'}
                            </span>
                        </div>
                        <div class="chat-session-sub">${s.classGrade || s.major || s.accountNo}</div>
                    </div>
                </div>
            `;
        }).join('');
    },

    renderChatMessages: async function () {
        const container = document.getElementById('chat-messages-box');
        if (!container) return;

        const currentKey = this.activeChatSession.sessionKey;
        const messages = await DataManager.getChatMessages(currentKey);
        const currentUser = DataManager.getCurrentUser();

        if (!messages.length) {
            container.innerHTML = `
                <div style="font-size: 12px; color: var(--text-muted); text-align: center; padding: 40px 10px;">
                    <div>暂无历史消息</div>
                    <div style="font-size: 11px; margin-top: 4px;">发条消息开始交流吧，所有对话内容将安全留存</div>
                </div>
            `;
            return;
        }

        container.innerHTML = messages.map(m => {
            const isSelf = m.isSelf || (currentUser && m.senderAccount === currentUser.accountNo) || (currentUser && m.sender === currentUser.name);
            return `
                <div class="chat-bubble ${isSelf ? 'self' : 'other'}">
                    <div class="user-avatar-circle" style="width: 32px; height: 32px; font-size: 12px; flex-shrink: 0;">
                        ${m.avatarText || (m.senderName || m.sender || '同').charAt(0)}
                    </div>
                    <div>
                        <div style="font-size: 11px; color: var(--text-muted); margin-bottom: 2px; text-align: ${isSelf ? 'right' : 'left'}">
                            ${m.senderName || m.sender || '同学'}
                        </div>
                        <div class="chat-content">${m.text}</div>
                        <div class="chat-time" style="text-align: ${isSelf ? 'right' : 'left'}">${m.time}</div>
                    </div>
                </div>
            `;
        }).join('');

        container.scrollTop = container.scrollHeight;
    },

    // 5. 个人中心模块 (Profile)
    bindProfileEvents: function () {
        const switchBtn = document.getElementById('btn-switch-account');
        if (switchBtn) {
            switchBtn.addEventListener('click', () => {
                window.location.href = 'login.html';
            });
        }

        const logoutBtn = document.getElementById('btn-logout');
        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => {
                if (confirm('确认退出当前登录状态？')) {
                    DataManager.logout();
                    JSBridge.showToast('已退出登录');
                    setTimeout(() => {
                        window.location.replace('login.html');
                    }, 300);
                }
            });
        }

        // 打开用户操作审计日志大屏
        const openLogsBtn = document.getElementById('btn-open-user-logs');
        if (openLogsBtn) {
            openLogsBtn.addEventListener('click', () => {
                this.loadUserLogs();
                this.openModal('modal-user-logs');
            });
        }

        // 检索特定学号的操作日志
        const searchLogsBtn = document.getElementById('btn-search-logs');
        if (searchLogsBtn) {
            searchLogsBtn.addEventListener('click', () => {
                const input = document.getElementById('input-filter-log-account');
                const account = input ? input.value.trim() : '';
                this.loadUserLogs(account);
            });
        }
    },

    loadUserLogs: async function (accountNo = '') {
        const container = document.getElementById('logs-list-container');
        if (!container) return;
        container.innerHTML = '<div style="text-align: center; color: #94a3b8; font-size: 12px; padding: 20px;">正在获取操作审计日志...</div>';

        let logs = [];
        try {
            const url = accountNo ? `http://8.220.210.247:3000/api/logs?accountNo=${encodeURIComponent(accountNo)}` : 'http://8.220.210.247:3000/api/logs';
            const res = await fetch(url);
            if (res.ok) {
                const json = await res.json();
                if (json.code === 200 && Array.isArray(json.data)) {
                    logs = json.data;
                }
            }
        } catch (e) {
            console.warn('后端获取日志失败:', e);
        }

        if (logs.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; color: #94a3b8; font-size: 12px; padding: 30px;">
                    暂无${accountNo ? `账号 ${accountNo} 的` : ''}操作行为记录
                </div>
            `;
            return;
        }

        const actionTagMap = {
            'LOGIN': { label: '身份登录', bg: '#e0f2fe', color: '#0284c7' },
            'VIEW_NOTE': { label: '查看笔记', bg: '#fef3c7', color: '#d97706' },
            'COMMENT_NOTE': { label: '发表评论', bg: '#dcfce7', color: '#16a34a' },
            'CREATE_NOTE': { label: '发布笔记', bg: '#ede9fe', color: '#7c3aed' }
        };

        container.innerHTML = logs.map(l => {
            const tag = actionTagMap[l.actionType] || { label: l.actionType, bg: '#f1f5f9', color: '#475569' };
            return `
                <div style="background: #ffffff; border: var(--geo-border); border-radius: var(--geo-radius-sm); padding: 10px 12px; box-shadow: 1px 1px 0px rgba(45,49,66,0.1);">
                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 4px;">
                        <div style="display: flex; align-items: center; gap: 6px;">
                            <strong style="font-size: 12px; color: var(--text-main);">${l.userName || '未知用户'}</strong>
                            <span style="font-size: 11px; color: var(--text-muted);">(${l.accountNo})</span>
                            <span class="tag-badge" style="background: ${tag.bg}; color: ${tag.color}; font-size: 10px; padding: 1px 6px;">${tag.label}</span>
                        </div>
                        <span style="font-size: 10px; color: var(--text-muted);">${l.timestamp}</span>
                    </div>
                    <div style="font-size: 12px; color: #334155; line-height: 1.4; margin-top: 4px;">
                        ${l.detail}
                    </div>
                </div>
            `;
        }).join('');
    },

    inspectAccountLogs: function (accountNo) {
        const input = document.getElementById('input-filter-log-account');
        if (input) input.value = accountNo;
        this.loadUserLogs(accountNo);
        this.openModal('modal-user-logs');
    },

    renderProfile: function () {
        const user = DataManager.getCurrentUser();
        const nameEl = document.getElementById('profile-name');
        const snoEl = document.getElementById('profile-student-no');
        const collegeEl = document.getElementById('profile-college');
        const classEl = document.getElementById('profile-class');
        const avatarEl = document.getElementById('profile-avatar');
        const roleBadge = document.getElementById('profile-role-badge');
        const adminCard = document.getElementById('admin-panel-card');

        if (nameEl) nameEl.textContent = user.name;
        if (avatarEl) avatarEl.textContent = user.avatarText || user.name.charAt(0);

        if (user.isLoggedIn) {
            if (user.role === 'admin') {
                if (snoEl) snoEl.textContent = `工号: ${user.accountNo}`;
                if (collegeEl) collegeEl.textContent = `${user.college} · ${user.major}`;
                if (classEl) classEl.textContent = `${user.classGrade}`;
                if (roleBadge) {
                    roleBadge.textContent = '教工 / 管理员';
                    roleBadge.style.background = '#ef444415';
                    roleBadge.style.color = '#ef4444';
                }
                if (adminCard) {
                    adminCard.style.display = 'block';
                    this.renderAdminAccounts();
                }
            } else {
                if (snoEl) snoEl.textContent = `学号: ${user.accountNo}`;
                if (collegeEl) collegeEl.textContent = `${user.college} · ${user.major}`;
                if (classEl) classEl.textContent = `${user.grade} · ${user.classGrade}`;
                if (roleBadge) {
                    roleBadge.textContent = '在校学生';
                    roleBadge.style.background = '#10b98115';
                    roleBadge.style.color = '#10b981';
                }
                if (adminCard) adminCard.style.display = 'none';
            }
        } else {
            if (snoEl) snoEl.textContent = '未绑定学号';
            if (collegeEl) collegeEl.textContent = '点击切换账号进行登录';
            if (classEl) classEl.textContent = '暂无班级信息';
            if (roleBadge) {
                roleBadge.textContent = '访客';
                roleBadge.style.background = '#e2e8f0';
                roleBadge.style.color = '#64748b';
            }
            if (adminCard) adminCard.style.display = 'none';
        }
    },

    renderAdminAccounts: function () {
        const listEl = document.getElementById('admin-account-list');
        if (!listEl) return;
        const accounts = DataManager.getAccounts();
        listEl.innerHTML = accounts.map(a => `
            <div style="background: #ffffff; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center; font-size: 12px;">
                <div>
                    <strong>${a.name}</strong>
                    <span style="color: var(--text-muted); font-size: 11px;">(${a.role === 'admin' ? '教工' : '学号: ' + a.accountNo})</span>
                    <div style="color: var(--text-muted); font-size: 11px; margin-top: 2px;">
                        ${a.college} · ${a.classGrade || a.major}
                    </div>
                </div>
                <div style="display: flex; gap: 6px; align-items: center;">
                    <!-- 行为日志查轨迹按钮暂时注释保留
                    <button class="btn-glass" onclick="App.inspectAccountLogs('${a.accountNo}')" style="padding: 3px 8px; font-size: 10px;">
                        查轨迹
                    </button>
                    -->
                    <span class="tag-badge" style="background: ${a.role === 'admin' ? '#fee2e2' : '#e0e7ff'}; color: ${a.role === 'admin' ? '#ef4444' : 'var(--primary)'}; font-size: 10px;">
                        ${a.role === 'admin' ? '管理' : '在读'}
                    </span>
                </div>
            </div>
        `).join('');
    },

    // 模态弹窗控制
    bindModalEvents: function () {
        document.querySelectorAll('.modal-overlay').forEach(modal => {
            modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                    this.closeModals();
                }
            });
        });
        document.querySelectorAll('.btn-close-modal').forEach(btn => {
            btn.addEventListener('click', () => this.closeModals());
        });
    },

    openModal: function (modalId) {
        if (modalId === 'modal-add-post') {
            this.postDraftImages = [];
            this.renderDraftThumbs();
        }
        const modal = document.getElementById(modalId);
        if (modal) modal.classList.add('active');
    },

    closeModals: function () {
        document.querySelectorAll('.modal-overlay').forEach(m => m.classList.remove('active'));
    },

    // 剪贴板复制兜底处理
    _fallbackCopyText: function (textareaEl) {
        try {
            textareaEl.select();
            textareaEl.setSelectionRange(0, 99999);
            const successful = document.execCommand('copy');
            if (successful) {
                JSBridge.showToast('已复制课表 JSON 到剪贴板');
            } else {
                JSBridge.showToast('复制失败，请手动全选文本框复制');
            }
        } catch (err) {
            JSBridge.showToast('请手动全选文本框内容进行复制');
        }
    }
};

window.App = App;
