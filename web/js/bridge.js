/**
 * 混合应用 JSBridge 通信适配层
 * 统一封装 Web 前端与 Android 原生宿主的双向数据交互
 */
const JSBridge = {
    // 检测是否运行在 Android 原生 WebView 容器中
    isAndroidApp: function () {
        return typeof window.AndroidBridge !== 'undefined';
    },

    // 显示原生轻提示 Toast
    showToast: function (message) {
        if (this.isAndroidApp() && typeof window.AndroidBridge.showToast === 'function') {
            window.AndroidBridge.showToast(message);
        } else {
            console.log('[JSBridge Mock] Toast:', message);
            this._showWebToast(message);
        }
    },

    // 同步课程表数据到 Android 手机桌面小组件 (AppWidget)
    syncCoursesToWidget: function (coursesJsonString) {
        if (this.isAndroidApp() && typeof window.AndroidBridge.syncCourseSchedule === 'function') {
            window.AndroidBridge.syncCourseSchedule(coursesJsonString);
            console.log('[JSBridge] 课程数据已发送至原生桌面小组件');
        } else {
            console.log('[JSBridge Mock] 同步桌面小组件数据:', coursesJsonString);
            this._showWebToast('已同步课程至桌面小组件（浏览器预览模式）');
        }
    },

    // 开启/关闭系统上课自动静音功能
    setAutoMuteEnabled: function (enabled) {
        if (this.isAndroidApp() && typeof window.AndroidBridge.setAutoMuteEnabled === 'function') {
            window.AndroidBridge.setAutoMuteEnabled(enabled);
            console.log('[JSBridge] 自动静音状态设置:', enabled);
        } else {
            console.log('[JSBridge Mock] 自动静音开关切换为:', enabled);
            this._showWebToast(enabled ? '上课自动静音已开启' : '上课自动静音已关闭');
        }
    },

    // 调用原生宿主用系统外部浏览器打开页面
    openExternalUrl: function (url) {
        if (this.isAndroidApp() && typeof window.AndroidBridge.openExternalUrl === 'function') {
            window.AndroidBridge.openExternalUrl(url);
        } else {
            window.open(url, '_blank');
        }
    },

    // 网页纯前端调试时的轻量提示条
    _showWebToast: function (msg) {
        let toast = document.getElementById('web-toast-notification');
        if (!toast) {
            toast = document.createElement('div');
            toast.id = 'web-toast-notification';
            toast.style.cssText = `
                position: fixed;
                bottom: 80px;
                left: 50%;
                transform: translateX(-50%);
                background: rgba(30, 41, 59, 0.92);
                color: #ffffff;
                padding: 10px 20px;
                border-radius: 24px;
                font-size: 13px;
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.25);
                z-index: 99999;
                transition: opacity 0.3s ease, transform 0.3s ease;
                pointer-events: none;
                backdrop-filter: blur(8px);
                border: 1px solid rgba(255, 255, 255, 0.1);
            `;
            document.body.appendChild(toast);
        }
        toast.textContent = msg;
        toast.style.opacity = '1';
        toast.style.transform = 'translateX(-50%) translateY(0)';
        
        clearTimeout(this._toastTimer);
        this._toastTimer = setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateX(-50%) translateY(10px)';
        }, 2200);
    }
};

window.JSBridge = JSBridge;