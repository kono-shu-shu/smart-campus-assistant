/**
 * 数据管理与持久化存储模块 (LocalStorage + 默认业务数据)
 * 纯净专业设计规范，移除冗余表情符号，预留后端 RESTful API 接入点
 */

// 统一 API 基地址：确保 file:// 协议与 Android WebView 下均可正确访问后端
const API_BASE = 'http://8.220.210.247:3000';

const STORAGE_KEYS = {
    USER: 'campus_app_user',
    ACCOUNTS: 'campus_app_accounts',
    COURSES: 'campus_app_courses',
    NOTES: 'campus_app_notes',
    WALL_POSTS: 'campus_app_wall_posts',
    MESSAGES: 'campus_app_chat_messages',
    SETTINGS: 'campus_app_settings'
};

// 预设系统基础账号 (用于默认展示与通讯录列表，包含同班与外班同学)
const PRESET_ACCOUNTS = [
    {
        id: 'acc_stu_1',
        role: 'student',
        accountNo: '260203',
        password: '123',
        name: '李晨阳',
        college: '信息技术学院',
        major: '软件技术(移动互联方向)',
        grade: '2024级',
        classGrade: '软件2401班',
        avatarText: '李'
    },
    {
        id: 'acc_stu_classmate_1',
        role: 'student',
        accountNo: '260201',
        password: '123',
        name: '张宇轩',
        college: '信息技术学院',
        major: '软件技术(移动互联方向)',
        grade: '2024级',
        classGrade: '软件2401班',
        avatarText: '张'
    },
    {
        id: 'acc_stu_classmate_2',
        role: 'student',
        accountNo: '260202',
        password: '123',
        name: '王小敏',
        college: '信息技术学院',
        major: '软件技术(移动互联方向)',
        grade: '2024级',
        classGrade: '软件2401班',
        avatarText: '王'
    },
    {
        id: 'acc_stu_2',
        role: 'student',
        accountNo: '260204',
        password: '123',
        name: '苏雨婷',
        college: '商学院',
        major: '电子商务',
        grade: '2024级',
        classGrade: '电商2402班',
        avatarText: '苏'
    },
    {
        id: 'acc_stu_other_1',
        role: 'student',
        accountNo: '260305',
        password: '123',
        name: '陈浩然',
        college: '商学院',
        major: '国际贸易',
        grade: '2024级',
        classGrade: '国贸2401班',
        avatarText: '陈'
    },
    {
        id: 'acc_admin_1',
        role: 'admin',
        accountNo: '114514',
        password: 'admin',
        name: '赵辅导员',
        college: '信息技术学院',
        major: '学生工作办公室',
        grade: '教务处',
        classGrade: '辅导员工作组',
        avatarText: '管'
    }
];

// 预设默认课程数据 (匹配大学一周课程)
const DEFAULT_COURSES = [
    { id: 'c1', name: '大学计算机基础与实践', teacher: '张教授', room: '信息楼 A302', dayOfWeek: 1, startTime: '08:00', endTime: '09:40', color: '#4338ca' },
    { id: 'c2', name: '高等数学 (工科)', teacher: '李老师', room: '博学楼 105', dayOfWeek: 1, startTime: '10:00', endTime: '11:40', color: '#0284c7' },
    { id: 'c3', name: 'Java面向对象程序设计', teacher: '王导师', room: '实训楼 B204', dayOfWeek: 2, startTime: '14:00', endTime: '15:40', color: '#059669' },
    { id: 'c4', name: '大学英语(听说与交流)', teacher: 'Sarah', room: '外语楼 201', dayOfWeek: 2, startTime: '16:00', endTime: '17:40', color: '#d97706' },
    { id: 'c5', name: '数据结构与算法', teacher: '陈研究员', room: '信息楼 C102', dayOfWeek: 3, startTime: '08:00', endTime: '09:40', color: '#db2777' },
    { id: 'c6', name: '计算机网络技术', teacher: '刘工程师', room: '实验楼 401', dayOfWeek: 4, startTime: '10:00', endTime: '11:40', color: '#7c3aed' },
    { id: 'c7', name: '思想道德与法治', teacher: '赵老师', room: '博学楼 204', dayOfWeek: 5, startTime: '14:00', endTime: '15:40', color: '#dc2626' }
];

// 预设默认笔记
const DEFAULT_NOTES = [];

// 预设校园高品质示意图（SVG Data URL，保障离线与弱网秒开，完全契合 Soft Geometric Bold 风格）
const CAMPUS_PRESET_IMAGES = {
    notice: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="600" height="340" fill="%23FFFBEB"/><rect x="20" y="20" width="560" height="300" rx="16" fill="%23FFFFFF" stroke="%232D3142" stroke-width="3"/><rect x="40" y="40" width="220" height="40" rx="8" fill="%23E05A47"/><text x="55" y="66" fill="%23FFFFFF" font-size="16" font-family="sans-serif" font-weight="bold">教务处重要公告</text><circle cx="500" cy="80" r="36" fill="%23FCD34D" stroke="%232D3142" stroke-width="2"/><text x="490" y="87" fill="%232D3142" font-size="22" font-weight="bold">评</text><rect x="40" y="110" width="520" height="12" rx="6" fill="%23E2E8F0"/><rect x="40" y="136" width="460" height="12" rx="6" fill="%23E2E8F0"/><rect x="40" y="162" width="380" height="12" rx="6" fill="%23E2E8F0"/><rect x="40" y="210" width="180" height="50" rx="10" fill="%232D3142"/><text x="65" y="242" fill="%23FFFFFF" font-size="16" font-family="sans-serif" font-weight="bold">进入综合评教</text></svg>',
    stylus: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="600" height="340" fill="%23F1F5F9"/><rect x="20" y="20" width="560" height="300" rx="16" fill="%23FFFFFF" stroke="%232D3142" stroke-width="3"/><circle cx="120" cy="170" r="60" fill="%23E0E7FF" stroke="%232D3142" stroke-width="2"/><rect x="180" y="130" width="350" height="30" rx="6" fill="%232D3142"/><text x="195" y="151" fill="%23FFFFFF" font-size="15" font-family="sans-serif" font-weight="bold">图书馆二楼自习区 拾遗物品</text><line x1="80" y1="210" x2="160" y2="130" stroke="%232D3142" stroke-width="8" stroke-linecap="round"/><circle cx="165" cy="125" r="4" fill="%23E05A47"/><text x="195" y="195" fill="%2364748B" font-size="14" font-family="sans-serif">特征：黑色触控电容笔，附磁吸充电触点</text><rect x="195" y="220" width="120" height="32" rx="6" fill="%23FEF3C7" stroke="%232D3142" stroke-width="1.5"/><text x="210" y="242" fill="%2392400E" font-size="13" font-weight="bold">前台妥善保管</text></svg>',
    sunset1: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23FFEDD5"/><circle cx="200" cy="180" r="100" fill="%23FB923C"/><rect x="0" y="210" width="400" height="90" fill="%23334155"/><polygon points="60,210 100,140 140,210" fill="%231E293B"/><polygon points="260,210 320,120 380,210" fill="%231E293B"/><text x="30" y="50" fill="%239A3412" font-size="16" font-family="sans-serif" font-weight="bold">齐鲁商道 · 暮色博学楼</text></svg>',
    sunset2: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23E0F2FE"/><circle cx="320" cy="80" r="40" fill="%23BAE6FD"/><rect x="0" y="230" width="400" height="70" fill="%230F172A"/><rect x="40" y="100" width="100" height="130" fill="%2338BDF8" stroke="%230F172A" stroke-width="2"/><rect x="160" y="130" width="120" height="100" fill="%237DD3FC" stroke="%230F172A" stroke-width="2"/><text x="30" y="50" fill="%230369A1" font-size="16" font-family="sans-serif" font-weight="bold">银杏路林荫小径</text></svg>',
    sunset3: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300"><rect width="400" height="300" fill="%23DCFCE7"/><circle cx="100" cy="100" r="60" fill="%2386EFAC"/><path d="M0 240 Q100 180 200 240 T400 240 L400 300 L0 300 Z" fill="%2315803D"/><text x="30" y="50" fill="%23166534" font-size="16" font-family="sans-serif" font-weight="bold">校园中心湖畔晨读区</text></svg>',
    coding: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="340" viewBox="0 0 600 340"><rect width="600" height="340" fill="%231E293B"/><rect x="20" y="20" width="560" height="300" rx="12" fill="%230F172A" stroke="%23475569" stroke-width="2"/><circle cx="50" cy="45" r="6" fill="%23EF4444"/><circle cx="70" cy="45" r="6" fill="%23F59E0B"/><circle cx="90" cy="45" r="6" fill="%2310B981"/><rect x="40" y="80" width="260" height="14" rx="4" fill="%2338BDF8"/><rect x="40" y="110" width="420" height="14" rx="4" fill="%23818CF8"/><rect x="40" y="140" width="340" height="14" rx="4" fill="%234ADE80"/><rect x="40" y="170" width="200" height="14" rx="4" fill="%23F472B6"/><rect x="40" y="220" width="520" height="60" rx="8" fill="%231E293B" stroke="%23334155" stroke-width="1.5"/><text x="60" y="256" fill="%23F8FAFC" font-size="15" font-family="Consolas, monospace">AppWidget Provider Sync: 100% PASS</text></svg>'
};

// 预设校园墙动态
const DEFAULT_POSTS = [];

// 预设群聊初始消息
const DEFAULT_CHAT_MESSAGES = [
    { id: 'm1', sessionKey: 'group:public', chatType: 'group', sender: '系统助手', senderName: '系统助手', senderRole: 'admin', isSelf: false, avatarText: '系', text: '欢迎进入山东商业职业技术大学移动校园大厅，请文明交流。', time: '09:00' }
];

const DataManager = {
    getAccounts: function () {
        const stored = localStorage.getItem(STORAGE_KEYS.ACCOUNTS);
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { }
        }
        this.saveAccounts(PRESET_ACCOUNTS);
        return PRESET_ACCOUNTS;
    },

    saveAccounts: function (accounts) {
        localStorage.setItem(STORAGE_KEYS.ACCOUNTS, JSON.stringify(accounts));
    },

    /**
     * 异步登录鉴权处理：优先请求回环后端服务 (8.220.210.247:3000)，如后端未启动则自动平滑降级为本地离线匹配
     */
    loginAsync: async function (accountNo, password, role = 'student') {
        const payload = { accountNo, password, role };
        try {
            // 尝试请求回环后端接口
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 2000); // 2秒超时
            const res = await fetch('http://8.220.210.247:3000/api/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
                signal: controller.signal
            });
            clearTimeout(timeoutId);

            const result = await res.json();
            if (res.ok && result.code === 200) {
                this.saveUser(result.user);
                return { success: true, user: result.user, mode: 'backend' };
            } else {
                return { success: false, message: result.message || '账号或密码错误' };
            }
        } catch (networkErr) {
            console.log('[数据层] 后端服务未连接，启用本地离线匹配:', networkErr.message);
            // 优雅降级：本地离线验证（匹配预设学生 260203/123456 与 管理 114514/abcd）
            const isStu = role === 'student' && accountNo === '260203' && password === '123456';
            const isAdmin = role === 'admin' && accountNo === '114514' && password === 'abcd';

            if (isStu || isAdmin) {
                const user = {
                    id: isStu ? 'acc_stu_260203' : 'acc_adm_114514',
                    role: role,
                    name: isStu ? '李晨阳' : '赵辅导员',
                    accountNo: accountNo,
                    college: '信息技术学院',
                    major: isStu ? '软件技术(移动互联方向)' : '学生工作办公室',
                    grade: '2024级',
                    classGrade: isStu ? '软件2401班' : '辅导员工作组',
                    avatarText: isStu ? '李' : '赵',
                    isLoggedIn: true,
                    loginTime: new Date().toLocaleString()
                };
                this.saveUser(user);
                return { success: true, user: user, mode: 'local' };
            } else {
                return { success: false, message: '账号或密码错误（测试学生: 260203 / 123456，管理员: 114514 / abcd）' };
            }
        }
    },

    // 退出登录
    logout: function () {
        const guestUser = {
            id: 'guest',
            role: 'guest',
            name: '未登录',
            accountNo: '',
            college: '山东商业职业技术大学',
            major: '访客',
            grade: '',
            classGrade: '',
            avatarText: '访',
            isLoggedIn: false
        };
        this.saveUser(guestUser);
        return guestUser;
    },

    // 获取当前登录用户
    getCurrentUser: function () {
        const stored = localStorage.getItem(STORAGE_KEYS.USER);
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { }
        }
        const defaultUser = {
            id: 'acc_stu_1',
            role: 'student',
            name: '李晨阳',
            accountNo: '2024090123',
            college: '信息技术学院',
            major: '软件技术(移动互联方向)',
            grade: '2024级',
            classGrade: '软件2401班',
            avatarText: '李',
            isLoggedIn: true
        };
        this.saveUser(defaultUser);
        return defaultUser;
    },

    saveUser: function (user) {
        localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    },

    // 课程表管理
    getCourses: function () {
        const stored = localStorage.getItem(STORAGE_KEYS.COURSES);
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { }
        }
        this.saveCourses(DEFAULT_COURSES);
        return DEFAULT_COURSES;
    },

    saveCourses: function (courses) {
        localStorage.setItem(STORAGE_KEYS.COURSES, JSON.stringify(courses));
        if (window.JSBridge) {
            window.JSBridge.syncCoursesToWidget(JSON.stringify(courses));
        }
    },

    addCourse: function (course) {
        const list = this.getCourses();
        course.id = 'c_' + Date.now();
        list.push(course);
        this.saveCourses(list);
        return list;
    },

    deleteCourse: function (courseId) {
        let list = this.getCourses();
        list = list.filter(c => c.id !== courseId);
        this.saveCourses(list);
        return list;
    },

    // 时光序 (ShiGuangSchedule) 标准课表协议导出
    exportShiGuangSchedule: function () {
        const courses = this.getCourses();
        const user = this.getCurrentUser();
        const exportData = {
            version: "1.0",
            appName: "ShiGuangSchedule",
            platform: "SmartCampus-SdSctc",
            exportTime: new Date().toISOString(),
            school: "山东商业职业技术大学",
            studentInfo: user.isLoggedIn ? {
                name: user.name,
                accountNo: user.accountNo,
                college: user.college,
                major: user.major
            } : null,
            courseCount: courses.length,
            courses: courses.map(c => {
                // 根据时间反推节次（若未显式指定）
                let startSec = c.startSection || 1;
                let endSec = c.endSection || 2;
                if (c.startTime) {
                    const h = parseInt(c.startTime.split(':')[0]);
                    if (h <= 9) { startSec = 1; endSec = 2; }
                    else if (h <= 11) { startSec = 3; endSec = 4; }
                    else if (h <= 15) { startSec = 5; endSec = 6; }
                    else if (h <= 17) { startSec = 7; endSec = 8; }
                    else { startSec = 9; endSec = 10; }
                }
                return {
                    name: c.name || "未命名课程",
                    teacher: c.teacher || "任课教师",
                    room: c.room || c.position || "教学楼教室",
                    dayOfWeek: c.dayOfWeek || 1,
                    startTime: c.startTime || "08:00",
                    endTime: c.endTime || "09:40",
                    startSection: startSec,
                    endSection: endSec,
                    startWeek: c.startWeek || 1,
                    endWeek: c.endWeek || 18,
                    weekType: typeof c.weekType !== 'undefined' ? c.weekType : 0,
                    color: c.color || "#4338ca"
                };
            })
        };
        return exportData;
    },

    // 时光序 / 通用课表协议智能解析器
    parseShiGuangData: function (rawInput) {
        if (!rawInput || typeof rawInput !== 'string') {
            return { success: false, error: '输入内容为空' };
        }
        let parsed;
        try {
            parsed = JSON.parse(rawInput.trim());
        } catch (e) {
            return { success: false, error: 'JSON 格式有误，请核对数据格式' };
        }

        // 提取课程列表（兼容直接数组，或 { courses: [...] } 包装）
        let rawList = [];
        if (Array.isArray(parsed)) {
            rawList = parsed;
        } else if (parsed && Array.isArray(parsed.courses)) {
            rawList = parsed.courses;
        } else if (parsed && Array.isArray(parsed.courseList)) {
            rawList = parsed.courseList;
        } else {
            return { success: false, error: '未能识别到标准的 courses 课程列表数组' };
        }

        if (rawList.length === 0) {
            return { success: false, error: '课表数据中未包含任何课程项目' };
        }

        const standardColors = ['#4338ca', '#0284c7', '#059669', '#d97706', '#db2777', '#7c3aed', '#dc2626', '#0891b2'];
        const validCourses = [];

        rawList.forEach((item, index) => {
            if (!item || typeof item !== 'object') return;
            const name = (item.name || item.courseName || item.course || item.title || '').trim();
            if (!name) return; // 必须有课程名称

            const teacher = (item.teacher || item.teacherName || item.instructor || '未指定教师').trim();
            const room = (item.room || item.position || item.classroom || item.location || '校内教室').trim();
            
            // 星期归一化 (兼容 1-7 或 "周一"、"星期一" 等)
            let dayOfWeek = 1;
            let rawDay = item.dayOfWeek !== undefined ? item.dayOfWeek : (item.day !== undefined ? item.day : item.weekDay);
            if (typeof rawDay === 'number') {
                dayOfWeek = Math.min(Math.max(Math.floor(rawDay), 1), 7);
            } else if (typeof rawDay === 'string') {
                const dayMap = { '一': 1, '二': 2, '三': 3, '四': 4, '五': 5, '六': 6, '日': 7, '天': 7, '1': 1, '2': 2, '3': 3, '4': 4, '5': 5, '6': 6, '7': 7 };
                for (let k in dayMap) {
                    if (rawDay.includes(k)) {
                        dayOfWeek = dayMap[k];
                        break;
                    }
                }
            }

            // 节次与时间推导
            let startTime = item.startTime;
            let endTime = item.endTime;
            const startSec = parseInt(item.startSection) || 1;
            const endSec = parseInt(item.endSection) || startSec + 1;

            if (!startTime || !endTime) {
                // 根据高校常规节次表推导
                const sectionSchedule = {
                    1: { start: '08:00', end: '08:45' },
                    2: { start: '08:55', end: '09:40' },
                    3: { start: '10:00', end: '10:45' },
                    4: { start: '10:55', end: '11:40' },
                    5: { start: '14:00', end: '14:45' },
                    6: { start: '14:55', end: '15:40' },
                    7: { start: '16:00', end: '16:45' },
                    8: { start: '16:55', end: '17:40' },
                    9: { start: '19:00', end: '19:45' },
                    10: { start: '19:55', end: '20:40' }
                };
                startTime = (sectionSchedule[startSec] ? sectionSchedule[startSec].start : '08:00');
                endTime = (sectionSchedule[endSec] ? sectionSchedule[endSec].end : (sectionSchedule[startSec] ? sectionSchedule[startSec].end : '09:40'));
            }

            // 配色与 ID
            const color = item.color || standardColors[index % standardColors.length];
            validCourses.push({
                id: 'c_' + Date.now() + '_' + index,
                name: name,
                teacher: teacher,
                room: room,
                dayOfWeek: dayOfWeek,
                startTime: startTime,
                endTime: endTime,
                startSection: startSec,
                endSection: endSec,
                startWeek: parseInt(item.startWeek) || 1,
                endWeek: parseInt(item.endWeek) || 18,
                weekType: typeof item.weekType === 'number' ? item.weekType : 0,
                color: color
            });
        });

        if (validCourses.length === 0) {
            return { success: false, error: '未解析出有效的合法课程（课程名不能为空）' };
        }

        return { success: true, count: validCourses.length, courses: validCourses };
    },

    // 导入课表并持久化与广播
    importCourses: function (newCourses, mode = 'replace') {
        let currentCourses = this.getCourses();
        let targetList = [];

        if (mode === 'replace') {
            targetList = newCourses;
        } else {
            // merge 模式：以 name + dayOfWeek + startTime 联合去重
            const existingKeys = new Set(currentCourses.map(c => `${c.name}_${c.dayOfWeek}_${c.startTime}`));
            targetList = [...currentCourses];
            newCourses.forEach(nc => {
                const key = `${nc.name}_${nc.dayOfWeek}_${nc.startTime}`;
                if (!existingKeys.has(key)) {
                    targetList.push(nc);
                    existingKeys.add(key);
                }
            });
        }

        this.saveCourses(targetList);
        return { success: true, total: targetList.length, importedCount: newCourses.length };
    },

    // 笔记管理（后端优先，本地降级：后端离线时使用 localStorage 缓存或预设数据）
    getNotes: async function () {
        try {
            const res = await fetch(`${API_BASE}/api/notes`);
            if (res.ok) {
                const json = await res.json();
                if (json.code === 200 && Array.isArray(json.data) && json.data.length > 0) {
                    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(json.data));
                    return json.data;
                }
            }
        } catch (e) { }
        const stored = localStorage.getItem(STORAGE_KEYS.NOTES);
        if (stored) { try { return JSON.parse(stored); } catch (e) { } }
        return DEFAULT_NOTES;
    },

    addNote: async function (note) {
        note.id = 'n_' + Date.now();
        note.time = '刚刚';
        note.likes = 0;
        const stored = localStorage.getItem(STORAGE_KEYS.NOTES);
        let list = stored ? JSON.parse(stored) : [...DEFAULT_NOTES];
        list.unshift(note);
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(list));
        try {
            await fetch(`${API_BASE}/api/notes`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(note)
            });
        } catch (e) { }
        return list;
    },

    deleteNote: async function (noteId, user) {
        const stored = localStorage.getItem(STORAGE_KEYS.NOTES);
        let list = stored ? JSON.parse(stored) : [...DEFAULT_NOTES];
        list = list.filter(n => n.id !== noteId);
        localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(list));
        try {
            await fetch(`${API_BASE}/api/notes/${noteId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: user && user.role, accountNo: user && user.accountNo, name: user && user.name })
            });
        } catch (e) { }
        return { success: true, message: '笔记已删除' };
    },

    // 校园墙管理（后端优先，本地降级）
    getPresetImages: function () {
        return CAMPUS_PRESET_IMAGES;
    },

    getPosts: async function () {
        try {
            const res = await fetch(`${API_BASE}/api/posts`);
            if (res.ok) {
                const json = await res.json();
                if (json.code === 200 && Array.isArray(json.data) && json.data.length > 0) {
                    const normalized = json.data.map(p => {
                        if (!Array.isArray(p.images)) p.images = [];
                        if (!Array.isArray(p.comments)) p.comments = [];
                        return p;
                    });
                    localStorage.setItem(STORAGE_KEYS.WALL_POSTS, JSON.stringify(normalized));
                    return normalized;
                }
            }
        } catch (e) { }
        const stored = localStorage.getItem(STORAGE_KEYS.WALL_POSTS);
        if (stored) { try { return JSON.parse(stored); } catch (e) { } }
        return DEFAULT_POSTS;
    },

    addPost: async function (post) {
        post.id = 'p_' + Date.now();
        post.time = '刚刚';
        post.likes = 0;
        post.isLiked = false;
        post.images = Array.isArray(post.images) ? post.images : [];
        post.comments = [];
        const stored = localStorage.getItem(STORAGE_KEYS.WALL_POSTS);
        let list = stored ? JSON.parse(stored) : [...DEFAULT_POSTS];
        const pinned = list.filter(p => p.isPinned);
        const normals = list.filter(p => !p.isPinned);
        normals.unshift(post);
        const combined = [...pinned, ...normals];
        localStorage.setItem(STORAGE_KEYS.WALL_POSTS, JSON.stringify(combined));
        try {
            await fetch(`${API_BASE}/api/posts`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(post)
            });
        } catch (e) { }
        return combined;
    },

    toggleLikePost: async function (postId) {
        const stored = localStorage.getItem(STORAGE_KEYS.WALL_POSTS);
        let list = stored ? JSON.parse(stored) : [...DEFAULT_POSTS];
        const item = list.find(p => p.id === postId);
        if (item) {
            item.isLiked = !item.isLiked;
            item.likes += (item.isLiked ? 1 : -1);
            localStorage.setItem(STORAGE_KEYS.WALL_POSTS, JSON.stringify(list));
        }
        try {
            if (item && item.isLiked) {
                await fetch(`${API_BASE}/api/posts/${postId}/like`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
            }
        } catch (e) { }
        return list;
    },

    addComment: async function (postId, commentPayload) {
        const stored = localStorage.getItem(STORAGE_KEYS.WALL_POSTS);
        let list = stored ? JSON.parse(stored) : [...DEFAULT_POSTS];
        const item = list.find(p => p.id === postId);
        if (item) {
            if (!Array.isArray(item.comments)) item.comments = [];
            const commentObj = {
                id: 'c_' + Date.now(),
                user: commentPayload.user || '同学',
                role: commentPayload.role || 'student',
                dept: commentPayload.dept || '信息技术学院',
                time: '刚刚',
                text: commentPayload.text || ''
            };
            item.comments.push(commentObj);
            localStorage.setItem(STORAGE_KEYS.WALL_POSTS, JSON.stringify(list));
            try {
                await fetch(`${API_BASE}/api/posts/${postId}/comments`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(commentPayload)
                });
            } catch (e) { }
            return { success: true, comment: commentObj, total: item.comments.length };
        }
        return { success: false, message: '贴文不存在' };
    },

    togglePinPost: async function (postId) {
        const stored = localStorage.getItem(STORAGE_KEYS.WALL_POSTS);
        let list = stored ? JSON.parse(stored) : [...DEFAULT_POSTS];
        const item = list.find(p => p.id === postId);
        if (item) {
            const currentPinnedCount = list.filter(p => p.isPinned && p.id !== postId).length;
            if (!item.isPinned && currentPinnedCount >= 3) {
                return { success: false, message: '置顶贴文上限为3篇' };
            }
            item.isPinned = !item.isPinned;
            const pinned = list.filter(p => p.isPinned);
            const normals = list.filter(p => !p.isPinned);
            const sorted = [...pinned, ...normals];
            localStorage.setItem(STORAGE_KEYS.WALL_POSTS, JSON.stringify(sorted));
            try {
                const res = await fetch(`${API_BASE}/api/posts/${postId}/pin`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ isPinned: item.isPinned })
                });
                if (res.ok) {
                    const json = await res.json();
                    if (json.code === 200 && Array.isArray(json.data)) {
                        localStorage.setItem(STORAGE_KEYS.WALL_POSTS, JSON.stringify(json.data));
                        return { success: true, posts: json.data };
                    }
                }
            } catch (e) { }
            return { success: true, posts: sorted };
        }
        return { success: false, message: '未找到对应贴文' };
    },

    deletePost: async function (postId, user) {
        const stored = localStorage.getItem(STORAGE_KEYS.WALL_POSTS);
        let list = stored ? JSON.parse(stored) : [...DEFAULT_POSTS];
        list = list.filter(p => p.id !== postId);
        localStorage.setItem(STORAGE_KEYS.WALL_POSTS, JSON.stringify(list));
        try {
            await fetch(`${API_BASE}/api/posts/${postId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' }
            });
        } catch (e) { }
        return { success: true, message: '动态贴文已删除' };
    },

    // 聊天群组与私聊会话管理
    CHAT_GROUPS_KEY: 'campus_app_chat_groups',
    CHAT_SESSION_KEY: 'campus_app_active_chat_session',

    getChatGroups: function () {
        const defaultGroups = [
            { id: 'public', name: '全校公共大厅', type: 'public', creator: 'system', members: ['all'] },
            { id: 'g_software_2401', name: '软件高职2401班级群', type: 'class', classGrade: '软件2401班', creator: '114514', members: ['260201', '260202', '260203'] }
        ];
        const stored = localStorage.getItem(this.CHAT_GROUPS_KEY);
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { }
        }
        this.saveChatGroups(defaultGroups);
        return defaultGroups;
    },

    saveChatGroups: function (groups) {
        localStorage.setItem(this.CHAT_GROUPS_KEY, JSON.stringify(groups));
    },

    createChatGroup: function (name, memberAccounts = [], memberNames = []) {
        const list = this.getChatGroups();
        const user = this.getCurrentUser();
        const newGroup = {
            id: 'g_' + Date.now(),
            name: name.trim(),
            type: 'custom',
            creatorAccount: user.accountNo,
            creatorName: user.name,
            members: [user.accountNo, ...memberAccounts],
            memberNames: [user.name, ...memberNames],
            createdAt: new Date().toLocaleDateString()
        };
        list.push(newGroup);
        this.saveChatGroups(list);

        // 同步通知后端持久化
        fetch(`${API_BASE}/api/chat/groups`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newGroup)
        }).catch(() => { });

        return newGroup;
    },

    // 聊天消息管理（后端优先，本地降级：后端离线时使用 localStorage 缓存）
    getChatMessages: async function (sessionKey) {
        try {
            const url = sessionKey
                ? `${API_BASE}/api/chat/messages?sessionKey=${encodeURIComponent(sessionKey)}`
                : `${API_BASE}/api/chat/messages`;
            const res = await fetch(url);
            if (res.ok) {
                const json = await res.json();
                if (json.code === 200 && Array.isArray(json.data) && json.data.length > 0) {
                    return json.data;
                }
            }
        } catch (e) { }
        const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES);
        let all = stored ? JSON.parse(stored) : [...DEFAULT_CHAT_MESSAGES];
        return all.filter(m => m.sessionKey === sessionKey || (!m.sessionKey && sessionKey === 'group:public'));
    },

    addChatMessage: async function (sessionKey, text, extra = {}) {
        const now = new Date();
        const timeStr = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const user = this.getCurrentUser();

        const newMsg = {
            id: 'm_' + Date.now(),
            sessionKey: sessionKey,
            chatType: extra.chatType || (sessionKey.startsWith('private:') ? 'private' : 'group'),
            targetId: extra.targetId || '',
            targetName: extra.targetName || '',
            senderAccount: user.accountNo || '',
            senderName: user.name || '同学',
            senderRole: user.role || 'student',
            isSelf: true,
            avatarText: user.avatarText || (user.name ? user.name.charAt(0) : '同'),
            text: text.trim(),
            time: timeStr,
            timestamp: now.toISOString()
        };

        const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES);
        let all = stored ? JSON.parse(stored) : [...DEFAULT_CHAT_MESSAGES];
        all.push(newMsg);
        localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(all));

        try {
            await fetch(`${API_BASE}/api/chat/messages`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newMsg)
            });
        } catch (e) { }

        return newMsg;
    },

    getSettings: function () {
        const stored = localStorage.getItem(STORAGE_KEYS.SETTINGS);
        if (stored) {
            try { return JSON.parse(stored); } catch (e) { }
        }
        const defaultSettings = {
            autoMute: true,
            widgetAutoRefresh: true
        };
        this.saveSettings(defaultSettings);
        return defaultSettings;
    },

    saveSettings: function (settings) {
        localStorage.setItem(STORAGE_KEYS.SETTINGS, JSON.stringify(settings));
        if (window.JSBridge) {
            window.JSBridge.setAutoMuteEnabled(settings.autoMute);
        }
    },

    // 全量同步本地聊天消息到后端（合并去重，保证管理员可调取完整记录）
    syncChatMessagesToBackend: async function () {
        const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES);
        if (!stored) return;
        let allMsgs = [];
        try { allMsgs = JSON.parse(stored); } catch (e) { return; }
        if (!allMsgs.length) return;

        try {
            await fetch(`${API_BASE}/api/chat/sync`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ messages: allMsgs })
            });
        } catch (e) {
            console.log('[数据层] 聊天消息后端同步未成功，待下次重试', e.message);
        }
    },

    // 从后端拉取全量聊天消息并合并到本地（管理员视角或多端同步）
    fetchChatMessagesFromBackend: async function () {
        try {
            const res = await fetch(`${API_BASE}/api/chat/messages`);
            if (!res.ok) return null;
            const json = await res.json();
            if (json.code === 200 && Array.isArray(json.data)) {
                const stored = localStorage.getItem(STORAGE_KEYS.MESSAGES);
                let local = stored ? JSON.parse(stored) : [...DEFAULT_CHAT_MESSAGES];
                const localIds = new Set(local.map(m => m.id));
                json.data.forEach(m => {
                    if (!localIds.has(m.id)) local.push(m);
                });
                localStorage.setItem(STORAGE_KEYS.MESSAGES, JSON.stringify(local));
                return local;
            }
        } catch (e) { }
        return null;
    }
};

window.DataManager = DataManager;
