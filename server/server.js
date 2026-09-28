const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PORT = 3000;
const HOST = '0.0.0.0';

const DATA_DIR = path.join(__dirname, 'data');
const STUDENTS_XLSX = path.join(DATA_DIR, 'students.xlsx');
const ADMINS_XLSX = path.join(DATA_DIR, 'admins.xlsx');
const STUDENTS_CSV = path.join(DATA_DIR, 'students.csv');
const ADMINS_CSV = path.join(DATA_DIR, 'admins.csv');
const NOTES_FILE = path.join(DATA_DIR, 'notes.json');
const COMMENTS_FILE = path.join(DATA_DIR, 'comments.json');
const CHAT_GROUPS_FILE = path.join(DATA_DIR, 'chat_groups.json');
const CHAT_MESSAGES_FILE = path.join(DATA_DIR, 'chat_messages.json');
const WALL_POSTS_FILE = path.join(DATA_DIR, 'wall_posts.json');
const USER_LOGS_FILE = path.join(DATA_DIR, 'user_logs.csv');
const WEB_DIR = path.join(__dirname, '..', 'web');

const MiniXLSX = require('./mini_xlsx');

/**
 * 加载账号表数据：优先读取 Excel (.xlsx) 格式，兼容降级读取 CSV
 */
function loadAccounts(role) {
    const isTeacherOrAdmin = (role === 'admin');
    const xlsxPath = isTeacherOrAdmin ? ADMINS_XLSX : STUDENTS_XLSX;
    const csvPath = isTeacherOrAdmin ? ADMINS_CSV : STUDENTS_CSV;

    if (fs.existsSync(xlsxPath)) {
        try {
            const list = MiniXLSX.readXlsx(xlsxPath);
            if (list && list.length > 0) {
                return list;
            }
        } catch (err) {
            console.error(`[读取Excel失败] ${xlsxPath}:`, err.message);
        }
    }

    // 兼容降级读取 CSV
    return parseCsv(csvPath);
}

/**
 * 持久化保存学生账号表：同时更新 students.xlsx 与 students.csv
 */
function saveStudents(students) {
    const headers = ['accountNo', 'passwordHash', 'name', 'college', 'major', 'grade', 'classGrade'];
    // 写入 Excel 格式 (.xlsx)
    MiniXLSX.writeXlsx(STUDENTS_XLSX, students, headers);

    // 写入 CSV 备份
    const lines = [headers.join(',')];
    students.forEach(s => {
        const row = headers.map(h => String(s[h] !== undefined && s[h] !== null ? s[h] : '').replace(/,/g, ' '));
        lines.push(row.join(','));
    });
    fs.writeFileSync(STUDENTS_CSV, lines.join('\n'), 'utf-8');
}

/**
 * 解析 CSV 表格数据为对象数组
 */
function parseCsv(filePath) {
    if (!fs.existsSync(filePath)) return [];
    const content = fs.readFileSync(filePath, 'utf-8');
    const lines = content.split(/\r?\n/).filter(line => line.trim() !== '');
    if (lines.length < 2) return [];

    const headers = lines[0].split(',').map(h => h.trim());
    const records = [];

    for (let i = 1; i < lines.length; i++) {
        const values = lines[i].split(',');
        const obj = {};
        headers.forEach((header, index) => {
            obj[header] = (values[index] || '').trim();
        });
        records.push(obj);
    }
    return records;
}

/**
 * 向 CSV 追加单条记录
 */
function appendCsv(filePath, headers, dataObj) {
    const isNew = !fs.existsSync(filePath) || fs.statSync(filePath).size === 0;
    let line = '';
    if (isNew) {
        line += headers.join(',') + '\n';
    }
    const row = headers.map(h => {
        let val = String(dataObj[h] !== undefined ? dataObj[h] : '');
        val = val.replace(/[\r\n]+/g, ' ').replace(/,/g, '，');
        return val;
    }).join(',');
    line += row + '\n';
    fs.appendFileSync(filePath, line, 'utf-8');
}

/**
 * JSON 数据读取与写入帮助函数
 */
function readJson(filePath, defaultValue = []) {
    if (!fs.existsSync(filePath)) return defaultValue;
    try {
        const text = fs.readFileSync(filePath, 'utf-8');
        return JSON.parse(text);
    } catch (e) {
        return defaultValue;
    }
}

function writeJson(filePath, data) {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

/**
 * 记录用户行为操作审计日志 (暂缓功能已注释保留，后续按需启用)
 */
function recordUserLog(logData) {
    /*
    const headers = ['id', 'timestamp', 'accountNo', 'userName', 'role', 'actionType', 'targetId', 'targetTitle', 'detail', 'ip'];
    const currentLogs = parseCsv(USER_LOGS_FILE);
    const nextId = currentLogs.length > 0 ? (parseInt(currentLogs[currentLogs.length - 1].id) || currentLogs.length) + 1 : 1;
    
    const now = new Date();
    const timeStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;

    const entry = {
        id: nextId,
        timestamp: timeStr,
        accountNo: logData.accountNo || 'anonymous',
        userName: logData.userName || '访客',
        role: logData.role || 'student',
        actionType: logData.actionType || 'UNKNOWN',
        targetId: logData.targetId || '',
        targetTitle: logData.targetTitle || '',
        detail: logData.detail || '',
        ip: logData.ip || '127.0.0.1'
    };

    appendCsv(USER_LOGS_FILE, headers, entry);
    console.log(`[审计日志] ${timeStr} | ${entry.userName}(${entry.accountNo}) | ${entry.actionType} | ${entry.targetTitle}`);
    return entry;
    */
    return null;
}

/**
 * 计算密码的 SHA-256 哈希值
 */
function hashPassword(password) {
    return crypto.createHash('sha256').update(password).digest('hex');
}

/**
 * 设置跨域与统一 JSON 响应头
 */
function setCorsHeaders(res) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization, x-user-role, x-user-account');
}

/**
 * 原生即时解析 Body
 */
function parseBody(req, callback) {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
        try {
            callback(null, JSON.parse(body || '{}'));
        } catch (e) {
            callback(null, {});
        }
    });
    req.on('error', err => callback(err, {}));
}

const server = http.createServer((req, res) => {
    setCorsHeaders(res);


    // 预检请求直接通过
    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
    const pathname = parsedUrl.pathname;
    const clientIp = req.socket.remoteAddress || '127.0.0.1';

    // 1. 健康检查接口
    if (pathname === '/api/health' && req.method === 'GET') {
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ status: 'ok', time: new Date().toISOString() }));
        return;
    }

    // 2. 真实身份认证接口：POST /api/login
    if (pathname === '/api/login' && req.method === 'POST') {
        parseBody(req, (err, data) => {
            try {
                const role = (data.role || 'student').trim();
                const accountNo = (data.accountNo || '').trim();
                const password = (data.password || '').trim();

                if (!accountNo || !password) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ code: 400, message: '账号或密码不能为空' }));
                    return;
                }

                const clientHash = hashPassword(password);
                const accounts = loadAccounts(role);
                const matched = accounts.find(a => a.accountNo === accountNo && a.passwordHash === clientHash);

                if (matched) {
                    console.log(`[认证成功] 角色: ${role} | 账号: ${accountNo} | 姓名: ${matched.name}`);
                    const user = {
                        role: role,
                        accountNo: matched.accountNo,
                        name: matched.name,
                        college: matched.college,
                        major: matched.major,
                        grade: matched.grade,
                        classGrade: matched.classGrade,
                        avatarText: matched.name ? matched.name.charAt(0) : (role === 'admin' ? '管' : '生'),
                        isLoggedIn: true,
                        loginTime: new Date().toLocaleString()
                    };

                    recordUserLog({
                        accountNo: user.accountNo,
                        userName: user.name,
                        role: user.role,
                        actionType: 'LOGIN',
                        targetId: 'auth',
                        targetTitle: '系统身份认证',
                        detail: `${user.name} 登录了智慧校园系统 (${role === 'admin' ? '教工管理员' : '在校学生'})`,
                        ip: clientIp
                    });

                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ code: 200, message: '认证成功', user: user }));
                } else {
                    console.log(`[认证失败] 角色: ${role} | 账号: ${accountNo} | 哈希比对未通过`);
                    res.writeHead(401, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ code: 401, message: '账号或密码错误，请核对后重试' }));
                }
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 500, message: '服务端处理异常: ' + e.message }));
            }
        });
        return;
    }

    // 3. 获取笔记列表：GET /api/notes
    if (pathname === '/api/notes' && req.method === 'GET') {
        const category = parsedUrl.searchParams.get('category');
        let notes = readJson(NOTES_FILE, []);
        if (category && category !== 'all') {
            notes = notes.filter(n => n.category === category);
        }
        const allComments = readJson(COMMENTS_FILE, []);
        const notesWithStats = notes.map(n => {
            const count = allComments.filter(c => c.noteId === n.id).length;
            return { ...n, commentCount: count };
        });

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ code: 200, data: notesWithStats }));
        return;
    }

    // 4. 获取单篇笔记详情与对应评论：GET /api/notes/:id
    const noteDetailMatch = pathname.match(/^\/api\/notes\/([a-zA-Z0-9_-]+)$/);
    if (noteDetailMatch && req.method === 'GET') {
        const noteId = noteDetailMatch[1];
        const notes = readJson(NOTES_FILE, []);
        const note = notes.find(n => n.id === noteId);

        if (!note) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 404, message: '未找到指定笔记' }));
            return;
        }

        const allComments = readJson(COMMENTS_FILE, []);
        const comments = allComments.filter(c => c.noteId === noteId);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            code: 200,
            data: {
                ...note,
                comments: comments
            }
        }));
        return;
    }

    // 5. 发布新 Markdown 笔记：POST /api/notes
    if (pathname === '/api/notes' && req.method === 'POST') {
        parseBody(req, (err, body) => {
            try {
                const { title, category, tags, content, authorName, authorAccount, role } = body;

                if (!title || !content) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ code: 400, message: '笔记标题和 Markdown 正文不能为空' }));
                    return;
                }

                const notes = readJson(NOTES_FILE, []);
                const newNote = {
                    id: 'n_' + Date.now(),
                    title: title.trim(),
                    category: category || '专业必修',
                    authorName: authorName || '',
                    authorAccount: authorAccount || '',
                    time: '刚刚',
                    likes: 0,
                    tags: Array.isArray(tags) ? tags : (tags ? String(tags).split(/[\s,，]+/).filter(Boolean) : []),
                    content: content,
                    createdAt: new Date().toLocaleString()
                };

                notes.unshift(newNote);
                writeJson(NOTES_FILE, notes);

                recordUserLog({
                    accountNo: newNote.authorAccount,
                    userName: newNote.authorName,
                    role: role || 'student',
                    actionType: 'CREATE_NOTE',
                    targetId: newNote.id,
                    targetTitle: newNote.title,
                    detail: `发布了新Markdown笔记《${newNote.title}》(分类: ${newNote.category})`,
                    ip: clientIp
                });

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 200, message: '笔记发布成功', data: newNote }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 500, message: '服务内部异常: ' + e.message }));
            }
        });
        return;
    }

    // 5.1 删除笔记接口：DELETE /api/notes/:id
    const noteDeleteMatch = pathname.match(/^\/api\/notes\/([a-zA-Z0-9_-]+)$/);
    if (noteDeleteMatch && req.method === 'DELETE') {
        const noteId = noteDeleteMatch[1];
        parseBody(req, (err, body) => {
            try {
                const operatorRole = (body.role || 'student').trim();
                const operatorAccount = (body.accountNo || '').trim();
                const operatorName = (body.name || '').trim();

                const notes = readJson(NOTES_FILE, []);
                const noteIndex = notes.findIndex(n => n.id === noteId);

                if (noteIndex === -1) {
                    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ code: 404, message: '未找到指定笔记' }));
                    return;
                }

                const targetNote = notes[noteIndex];
                const isAdmin = (operatorRole === 'admin' || operatorRole === 'teacher');
                const isOwner = (operatorAccount && targetNote.authorAccount === operatorAccount) || (operatorName && targetNote.authorName === operatorName);

                if (!isAdmin && !isOwner) {
                    res.writeHead(403, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ code: 403, message: '权限不足：仅作者本人或管理员可删除笔记' }));
                    return;
                }

                notes.splice(noteIndex, 1);
                writeJson(NOTES_FILE, notes);

                // 同时清理相关评论
                const allComments = readJson(COMMENTS_FILE, []);
                const filteredComments = allComments.filter(c => c.noteId !== noteId);
                writeJson(COMMENTS_FILE, filteredComments);

                recordUserLog({
                    accountNo: operatorAccount,
                    userName: operatorName,
                    role: operatorRole,
                    actionType: 'DELETE_NOTE',
                    targetId: noteId,
                    targetTitle: targetNote.title,
                    detail: `${operatorName} 删除了笔记《${targetNote.title}》`,
                    ip: clientIp
                });

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 200, message: '笔记已成功删除' }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 500, message: '删除失败: ' + e.message }));
            }
        });
        return;
    }


    // 6. 为指定笔记添加评论：POST /api/notes/:id/comments
    const noteCommentMatch = pathname.match(/^\/api\/notes\/([a-zA-Z0-9_-]+)\/comments$/);
    if (noteCommentMatch && req.method === 'POST') {
        parseBody(req, (err, body) => {
            try {
                const noteId = noteCommentMatch[1];
                const notes = readJson(NOTES_FILE, []);
                const note = notes.find(n => n.id === noteId);

                if (!note) {
                    res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ code: 404, message: '笔记不存在，无法评论' }));
                    return;
                }

                const { content, authorName, authorAccount, role } = body;

                if (!content || !content.trim()) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ code: 400, message: '评论内容不能为空' }));
                    return;
                }

                const comments = readJson(COMMENTS_FILE, []);
                const newComment = {
                    id: 'cm_' + Date.now(),
                    noteId: noteId,
                    authorName: authorName || '',
                    authorAccount: authorAccount || '',
                    content: content.trim(),
                    time: '刚刚',
                    createdAt: new Date().toLocaleString()
                };

                comments.push(newComment);
                writeJson(COMMENTS_FILE, comments);

                recordUserLog({
                    accountNo: newComment.authorAccount,
                    userName: newComment.authorName,
                    role: role || 'student',
                    actionType: 'COMMENT_NOTE',
                    targetId: noteId,
                    targetTitle: note.title,
                    detail: `在笔记《${note.title}》发表了评论：“${newComment.content.slice(0, 40)}${newComment.content.length > 40 ? '...' : ''}”`,
                    ip: clientIp
                });

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 200, message: '评论发表成功', data: newComment }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 500, message: '评论失败: ' + e.message }));
            }
        });
        return;
    }

    // 7. 用户行为日志埋点上报：POST /api/logs
    if (pathname === '/api/logs' && req.method === 'POST') {
        parseBody(req, (err, body) => {
            try {
                const { accountNo, userName, role, actionType, targetId, targetTitle, detail } = body;

                if (!accountNo || !actionType) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ code: 400, message: '缺少必要的日志审计字段' }));
                    return;
                }

                const logEntry = recordUserLog({
                    accountNo, userName, role, actionType, targetId, targetTitle, detail, ip: clientIp
                });

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 200, message: '审计日志已记录', logId: logEntry.id }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 500, message: '日志记录失败: ' + e.message }));
            }
        });
        return;
    }

    // 8. 管理员查询用户操作日志轨迹：GET /api/logs
    if (pathname === '/api/logs' && req.method === 'GET') {
        const accountNo = parsedUrl.searchParams.get('accountNo');
        const limit = parseInt(parsedUrl.searchParams.get('limit')) || 100;
        let logs = parseCsv(USER_LOGS_FILE);

        if (accountNo) {
            logs = logs.filter(l => l.accountNo === accountNo);
        }

        logs.reverse();
        if (logs.length > limit) {
            logs = logs.slice(0, limit);
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            code: 200,
            total: logs.length,
            data: logs
        }));
        return;
    }

    // 8.1 聊天模块接口：获取全部群聊列表及成员信息 GET /api/chat/groups
    if (pathname === '/api/chat/groups' && req.method === 'GET') {
        const defaultGroups = [
            { id: 'public', name: '全校公共大厅', type: 'public', creator: 'system', members: ['all'], createdAt: '2026-03-01' }
        ];
        const groups = readJson(CHAT_GROUPS_FILE, defaultGroups);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ code: 200, data: groups }));
        return;
    }

    // 8.2 聊天模块接口：创建新群聊 POST /api/chat/groups
    if (pathname === '/api/chat/groups' && req.method === 'POST') {
        parseBody(req, (err, body) => {
            try {
                const { name, creatorAccount, creatorName, memberAccounts, memberNames } = body;
                if (!name || !name.trim()) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ code: 400, message: '群聊名称不能为空' }));
                    return;
                }

                const defaultGroups = [
                    { id: 'public', name: '全校公共大厅', type: 'public', creator: 'system', members: ['all'], createdAt: '2026-03-01' }
                ];
                const groups = readJson(CHAT_GROUPS_FILE, defaultGroups);
                const newGroup = {
                    id: 'g_' + Date.now(),
                    name: name.trim(),
                    type: 'custom',
                    creatorAccount: creatorAccount || '',
                    creatorName: creatorName || '',
                    members: Array.isArray(memberAccounts) ? memberAccounts : [],
                    memberNames: Array.isArray(memberNames) ? memberNames : [],
                    createdAt: new Date().toLocaleString()
                };

                groups.push(newGroup);
                writeJson(CHAT_GROUPS_FILE, groups);

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 200, message: '群聊创建成功', data: newGroup }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 500, message: '创建群聊失败: ' + e.message }));
            }
        });
        return;
    }

    // 8.3 聊天模块接口：获取聊天记录（支持会话 sessionKey 筛选；管理员可不传以获取全量）GET /api/chat/messages
    if (pathname === '/api/chat/messages' && req.method === 'GET') {
        const sessionKey = parsedUrl.searchParams.get('sessionKey'); // 如 "group:public" 或 "private:260203_260204"
        const allMessages = readJson(CHAT_MESSAGES_FILE, []);

        let result = allMessages;
        if (sessionKey) {
            result = allMessages.filter(m => m.sessionKey === sessionKey);
        }

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            code: 200,
            total: result.length,
            data: result
        }));
        return;
    }

    // 8.4 聊天模块接口：发送聊天消息（实时落盘记录，以便管理员随时调取）POST /api/chat/messages
    if (pathname === '/api/chat/messages' && req.method === 'POST') {
        parseBody(req, (err, body) => {
            try {
                const { sessionKey, chatType, targetId, targetName, senderAccount, senderName, senderRole, text } = body;
                if (!text || !text.trim() || !sessionKey) {
                    res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ code: 400, message: '消息正文与会话标识不能为空' }));
                    return;
                }

                const allMessages = readJson(CHAT_MESSAGES_FILE, []);
                const now = new Date();
                const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

                const newMsg = {
                    id: 'm_' + Date.now(),
                    sessionKey: sessionKey,
                    chatType: chatType || 'group', // 'group' 或 'private'
                    targetId: targetId, // 群ID 或 对方账号
                    targetName: targetName,
                    senderAccount: senderAccount || '',
                    senderName: senderName || '',
                    senderRole: senderRole || 'student',
                    avatarText: (senderName || '同').charAt(0),
                    text: text.trim(),
                    time: timeStr,
                    timestamp: now.toISOString()
                };

                allMessages.push(newMsg);
                writeJson(CHAT_MESSAGES_FILE, allMessages);

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 200, message: '消息发送成功并已安全存盘', data: newMsg }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 500, message: '保存消息失败: ' + e.message }));
            }
        });
        return;
    }

    // 8.4.1 聊天消息批量同步：POST /api/chat/sync (前端将本地全量消息上传合并去重)
    if (pathname === '/api/chat/sync' && req.method === 'POST') {
        parseBody(req, (err, body) => {
            try {
                const incomingMsgs = Array.isArray(body.messages) ? body.messages : [];
                if (!incomingMsgs.length) {
                    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                    res.end(JSON.stringify({ code: 200, message: '无消息需同步', merged: 0 }));
                    return;
                }

                const existing = readJson(CHAT_MESSAGES_FILE, []);
                const existingIds = new Set(existing.map(m => m.id));

                let mergedCount = 0;
                incomingMsgs.forEach(msg => {
                    if (msg && msg.id && !existingIds.has(msg.id)) {
                        // 规范化字段：确保 sessionKey 和 chatType 存在
                        const normalized = {
                            id: msg.id,
                            sessionKey: msg.sessionKey || (msg.group ? `group:${msg.group}` : 'group:public'),
                            chatType: msg.chatType || (msg.sessionKey && msg.sessionKey.startsWith('private:') ? 'private' : 'group'),
                            targetId: msg.targetId || '',
                            targetName: msg.targetName || '',
                            senderAccount: msg.senderAccount || '',
                            senderName: msg.senderName || msg.sender || '',
                            senderRole: msg.senderRole || 'student',
                            avatarText: msg.avatarText || (msg.senderName || msg.sender || '同').charAt(0),
                            text: msg.text || '',
                            time: msg.time || '',
                            timestamp: msg.timestamp || new Date().toISOString()
                        };
                        existing.push(normalized);
                        existingIds.add(msg.id);
                        mergedCount++;
                    }
                });

                if (mergedCount > 0) {
                    writeJson(CHAT_MESSAGES_FILE, existing);
                }

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 200, message: `同步完成，合并 ${mergedCount} 条新消息`, merged: mergedCount }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 500, message: '同步失败: ' + e.message }));
            }
        });
        return;
    }

    // 8.5 校园墙帖子列表获取：GET /api/posts
    if (pathname === '/api/posts' && req.method === 'GET') {
        const posts = readJson(WALL_POSTS_FILE, []);
        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ code: 200, data: posts }));
        return;
    }

    // 8.5.1 校园墙帖子大数据采集：POST /api/posts (发布图文动态时自动同步存档)
    if (pathname === '/api/posts' && req.method === 'POST') {
        parseBody(req, (err, body) => {
            try {
                const posts = readJson(WALL_POSTS_FILE, []);
                const newPost = {
                    id: body.id || ('p_' + Date.now()),
                    type: (body.type || 'confession'),
                    typeLabel: body.typeLabel || '校园动态',
                    typeColor: body.typeColor || '#4338ca',
                    isPinned: !!body.isPinned,
                    author: body.author || '',
                    authorAccount: body.authorAccount || '',
                    role: body.role || 'student',
                    dept: body.dept || '',
                    content: body.content || '',
                    time: body.time || '刚刚',
                    likes: body.likes || 0,
                    isLiked: false,
                    images: Array.isArray(body.images) ? body.images : [],
                    comments: [],
                    createdAt: new Date().toISOString()
                };

                posts.unshift(newPost);
                writeJson(WALL_POSTS_FILE, posts);

                res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 200, message: '帖子已归档', data: newPost }));
            } catch (e) {
                res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 500, message: '帖子归档失败: ' + e.message }));
            }
        });
        return;
    }

    // 8.6 校园墙帖子删除：DELETE /api/posts/:id
    const postDeleteMatch = pathname.match(/^\/api\/posts\/([a-zA-Z0-9_-]+)$/);
    if (postDeleteMatch && req.method === 'DELETE') {
        const postId = postDeleteMatch[1];
        const posts = readJson(WALL_POSTS_FILE, []);
        const updated = posts.filter(p => p.id !== postId);
        writeJson(WALL_POSTS_FILE, updated);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ code: 200, message: '帖子存档已删除' }));
        return;
    }

    // 8.6.1 校园墙帖子点赞：POST /api/posts/:id/like
    const postLikeMatch = pathname.match(/^\/api\/posts\/([a-zA-Z0-9_-]+)\/like$/);
    if (postLikeMatch && req.method === 'POST') {
        const postId = postLikeMatch[1];
        const posts = readJson(WALL_POSTS_FILE, []);
        const post = posts.find(p => p.id === postId);
        if (!post) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 404, message: '帖子不存在' }));
            return;
        }
        post.likes = (post.likes || 0) + 1;
        post.isLiked = true;
        writeJson(WALL_POSTS_FILE, posts);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ code: 200, data: { likes: post.likes, isLiked: true } }));
        return;
    }

    // 8.6.2 校园墙帖子评论：POST /api/posts/:id/comments
    const postCommentMatch = pathname.match(/^\/api\/posts\/([a-zA-Z0-9_-]+)\/comments$/);
    if (postCommentMatch && req.method === 'POST') {
        parseBody(req, (err, body) => {
            const postId = postCommentMatch[1];
            const posts = readJson(WALL_POSTS_FILE, []);
            const post = posts.find(p => p.id === postId);
            if (!post) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 404, message: '帖子不存在' }));
                return;
            }
            if (!Array.isArray(post.comments)) post.comments = [];
            const newComment = {
                id: 'c_' + Date.now(),
                    user: body.user || '',
                role: body.role || 'student',
                dept: body.dept || '',
                time: '刚刚',
                text: body.text || ''
            };
            post.comments.push(newComment);
            writeJson(WALL_POSTS_FILE, posts);

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 200, message: '评论成功', data: newComment, total: post.comments.length }));
        });
        return;
    }

    // 8.6.3 校园墙帖子置顶/取消置顶：PATCH /api/posts/:id/pin
    const postPinMatch = pathname.match(/^\/api\/posts\/([a-zA-Z0-9_-]+)\/pin$/);
    if (postPinMatch && (req.method === 'PATCH' || req.method === 'POST')) {
        parseBody(req, (err, body) => {
            const postId = postPinMatch[1];
            const posts = readJson(WALL_POSTS_FILE, []);
            const post = posts.find(p => p.id === postId);
            if (!post) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 404, message: '帖子不存在' }));
                return;
            }
            const pinnedCount = posts.filter(p => p.isPinned && p.id !== postId).length;
            if (!post.isPinned && pinnedCount >= 3) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 400, message: '置顶贴文上限为3篇' }));
                return;
            }
            post.isPinned = !post.isPinned;
            const pinned = posts.filter(p => p.isPinned);
            const normals = posts.filter(p => !p.isPinned);
            const sorted = [...pinned, ...normals];
            writeJson(WALL_POSTS_FILE, sorted);

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 200, message: '置顶状态已更新', data: sorted }));
        });
        return;
    }

    // 8.7 管理员大数据统计汇总：GET /api/admin/stats (数据采集->存储->统计->可视化)
    if (pathname === '/api/admin/stats' && req.method === 'GET') {
        try {
            const students = loadAccounts('student');
            const admins = loadAccounts('admin');
            const notes = readJson(NOTES_FILE, []);
            const comments = readJson(COMMENTS_FILE, []);
            const posts = readJson(WALL_POSTS_FILE, []);
            const chatGroups = readJson(CHAT_GROUPS_FILE, []);
            const chatMessages = readJson(CHAT_MESSAGES_FILE, []);

            // 学生按学院聚合统计
            const collegeMap = {};
            students.forEach(s => {
                const key = s.college || '其他学院';
                collegeMap[key] = (collegeMap[key] || 0) + 1;
            });

            // 学生按班级聚合统计
            const classMap = {};
            students.forEach(s => {
                const key = s.classGrade || '未分班';
                classMap[key] = (classMap[key] || 0) + 1;
            });

            // 笔记按分类聚合统计
            const noteCategoryMap = {};
            notes.forEach(n => {
                const key = n.category || '未分类';
                noteCategoryMap[key] = (noteCategoryMap[key] || 0) + 1;
            });

            // 校园墙帖子按板块类型聚合统计
            const postTypeMap = {};
            posts.forEach(p => {
                const key = p.typeLabel || '校园动态';
                postTypeMap[key] = (postTypeMap[key] || 0) + 1;
            });

            // 聊天记录按群聊/私聊拆分统计（同时兼容旧格式 group 字段与无 sessionKey 的消息）
            const isPrivate = (m) => m.chatType === 'private' || (m.sessionKey || '').startsWith('private:');
            const isGroup = (m) => !isPrivate(m);
            const groupMsgCount = chatMessages.filter(isGroup).length;
            const privateMsgCount = chatMessages.filter(isPrivate).length;

            // 私聊会话维度统计：按 sessionKey 聚合每个私聊会话的消息数与参与者
            const privateSessionMap = {};
            chatMessages.filter(isPrivate).forEach(m => {
                const key = m.sessionKey || 'private:unknown';
                if (!privateSessionMap[key]) {
                    privateSessionMap[key] = { messageCount: 0, participants: new Set(), lastTime: '' };
                }
                privateSessionMap[key].messageCount++;
                if (m.senderAccount) privateSessionMap[key].participants.add(m.senderAccount);
                if (m.targetId) privateSessionMap[key].participants.add(m.targetId);
                if (m.timestamp > privateSessionMap[key].lastTime) privateSessionMap[key].lastTime = m.timestamp;
            });
            const privateSessionList = Object.entries(privateSessionMap).map(([key, val]) => ({
                sessionKey: key,
                messageCount: val.messageCount,
                participants: Array.from(val.participants),
                lastTime: val.lastTime
            }));

            // 群聊会话维度统计
            const groupSessionMap = {};
            chatMessages.filter(isGroup).forEach(m => {
                const key = m.sessionKey || 'group:public';
                groupSessionMap[key] = (groupSessionMap[key] || 0) + 1;
            });

            // 活跃发言者统计
            const senderMap = {};
            chatMessages.forEach(m => {
                const name = m.senderName || m.sender || '未知';
                senderMap[name] = (senderMap[name] || 0) + 1;
            });

            const stats = {
                generatedAt: new Date().toLocaleString(),
                overview: {
                    studentCount: students.length,
                    adminCount: admins.length,
                    noteCount: notes.length,
                    commentCount: comments.length,
                    postCount: posts.length,
                    chatGroupCount: chatGroups.length,
                    chatMessageCount: chatMessages.length,
                    groupMessageCount: groupMsgCount,
                    privateMessageCount: privateMsgCount,
                    privateSessionCount: privateSessionList.length,
                    groupSessionCount: Object.keys(groupSessionMap).length
                },
                dimensions: {
                    studentsByCollege: collegeMap,
                    studentsByClass: classMap,
                    notesByCategory: noteCategoryMap,
                    postsByType: postTypeMap,
                    messagesByType: {
                        '群聊消息': groupMsgCount,
                        '私聊消息': privateMsgCount
                    },
                    messagesBySender: senderMap,
                    privateSessions: privateSessionList,
                    groupSessions: groupSessionMap
                }
            };

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 200, data: stats }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 500, message: '统计服务异常: ' + e.message }));
        }
        return;
    }

    // 8.8 管理员学生管理接口：GET /api/admin/students
    if (pathname === '/api/admin/students' && req.method === 'GET') {
        try {
            const students = loadAccounts('student');
            const safeList = students.map(s => ({
                accountNo: s.accountNo,
                name: s.name,
                college: s.college || '',
                major: s.major || '',
                grade: s.grade || '',
                classGrade: s.classGrade || ''
            }));
            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 200, data: safeList }));
        } catch (e) {
            res.writeHead(500, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 500, message: '获取学生列表失败: ' + e.message }));
        }
        return;
    }

    // 8.9 管理员添加学生账号：POST /api/admin/students
    if (pathname === '/api/admin/students' && req.method === 'POST') {
        parseBody(req, (err, body) => {
            const accountNo = (body.accountNo || '').trim();
            const name = (body.name || '').trim();
            const password = (body.password || '').trim();
            const college = (body.college || '').trim();
            const major = (body.major || '').trim();
            const grade = (body.grade || '').trim();
            const classGrade = (body.classGrade || '').trim();

            if (!accountNo || !name) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 400, message: '学号和姓名不能为空' }));
                return;
            }

            const students = loadAccounts('student');
            if (students.some(s => s.accountNo === accountNo)) {
                res.writeHead(400, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 400, message: `学号 ${accountNo} 已存在，请勿重复添加` }));
                return;
            }

            const rawPwd = password || '123456';
            const passwordHash = hashPassword(rawPwd);

            const newStudent = {
                accountNo,
                passwordHash,
                name,
                college: college || '',
                major: major || '',
                grade: grade || '',
                classGrade: classGrade || ''
            };

            students.push(newStudent);
            saveStudents(students);

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                code: 200,
                message: '学生添加成功',
                data: {
                    accountNo: newStudent.accountNo,
                    name: newStudent.name,
                    college: newStudent.college,
                    major: newStudent.major,
                    grade: newStudent.grade,
                    classGrade: newStudent.classGrade
                }
            }));
        });
        return;
    }

    // 8.10 管理员修改学生信息/重置密码：PUT /api/admin/students/:accountNo
    const matchPutStudent = pathname.match(/^\/api\/admin\/students\/([^/]+)$/);
    if (matchPutStudent && req.method === 'PUT') {
        const targetAccount = decodeURIComponent(matchPutStudent[1]);
        parseBody(req, (err, body) => {
            const students = loadAccounts('student');
            const student = students.find(s => s.accountNo === targetAccount);
            if (!student) {
                res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
                res.end(JSON.stringify({ code: 404, message: '未找到对应学号的学生' }));
                return;
            }

            if (body.name !== undefined && body.name.trim()) student.name = body.name.trim();
            if (body.college !== undefined) student.college = body.college.trim();
            if (body.major !== undefined) student.major = body.major.trim();
            if (body.grade !== undefined) student.grade = body.grade.trim();
            if (body.classGrade !== undefined) student.classGrade = body.classGrade.trim();

            if (body.password && body.password.trim()) {
                student.passwordHash = hashPassword(body.password.trim());
            }

            saveStudents(students);

            res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({
                code: 200,
                message: '学生信息更新成功',
                data: {
                    accountNo: student.accountNo,
                    name: student.name,
                    college: student.college,
                    major: student.major,
                    grade: student.grade,
                    classGrade: student.classGrade
                }
            }));
        });
        return;
    }

    // 8.11 管理员删除学生账号：DELETE /api/admin/students/:accountNo
    const matchDelStudent = pathname.match(/^\/api\/admin\/students\/([^/]+)$/);
    if (matchDelStudent && req.method === 'DELETE') {
        const targetAccount = decodeURIComponent(matchDelStudent[1]);
        const students = loadAccounts('student');
        const index = students.findIndex(s => s.accountNo === targetAccount);
        if (index === -1) {
            res.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
            res.end(JSON.stringify({ code: 404, message: '未找到对应学号的学生' }));
            return;
        }

        const removed = students.splice(index, 1)[0];
        saveStudents(students);

        res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({ code: 200, message: `学生 [${removed.name}] (${targetAccount}) 账号已删除` }));
        return;
    }

    // 9. 静态文件代理托管
    let reqPath = pathname === '/' ? '/login.html' : pathname;
    const staticFilePath = path.join(WEB_DIR, reqPath);

    if (fs.existsSync(staticFilePath) && fs.statSync(staticFilePath).isFile()) {
        const ext = path.extname(staticFilePath);
        const mimeMap = {
            '.html': 'text/html; charset=utf-8',
            '.css': 'text/css; charset=utf-8',
            '.js': 'application/javascript; charset=utf-8',
            '.json': 'application/json; charset=utf-8',
            '.png': 'image/png',
            '.jpg': 'image/jpeg',
            '.svg': 'image/svg+xml'
        };
        res.writeHead(200, { 'Content-Type': mimeMap[ext] || 'text/plain' });
        fs.createReadStream(staticFilePath).pipe(res);
        return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('404 Not Found');
});

// 支持直接运行或被 require
if (require.main === module) {
    server.listen(PORT, HOST, () => {
        console.log(`=======================================================`);
        console.log(`智慧校园综合后端服务已就绪 (回环模式)`);
        console.log(`- 服务地址: http://${HOST}:${PORT}`);
        console.log(`- 认证接口: http://${HOST}:${PORT}/api/login`);
        console.log(`- 笔记接口: http://${HOST}:${PORT}/api/notes`);
        console.log(`- 日志接口: http://${HOST}:${PORT}/api/logs`);
        console.log(`- 日志存储: ${USER_LOGS_FILE}`);
        console.log(`=======================================================`);
    });
}

module.exports = server;
