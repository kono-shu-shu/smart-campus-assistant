package com.sdsctc.campusbrowser.bridge;

import android.appwidget.AppWidgetManager;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.net.Uri;
import android.webkit.JavascriptInterface;
import android.widget.Toast;

import com.sdsctc.campusbrowser.receiver.CourseMuteReceiver;
import com.sdsctc.campusbrowser.util.PreferenceUtil;
import com.sdsctc.campusbrowser.widget.CourseWidgetProvider;

public class WebAppInterface {
    private final Context mContext;

    public WebAppInterface(Context context) {
        this.mContext = context;
    }

    @JavascriptInterface
    public void showToast(String message) {
        Toast.makeText(mContext, message, Toast.LENGTH_SHORT).show();
    }

    @JavascriptInterface
    public void syncCourseSchedule(String coursesJson) {
        // 1. 持久化存储课程表数据
        PreferenceUtil.saveCoursesJson(mContext, coursesJson);

        // 2. 触发刷新桌面小组件 AppWidget
        Intent widgetIntent = new Intent(mContext, CourseWidgetProvider.class);
        widgetIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids = AppWidgetManager.getInstance(mContext)
                .getAppWidgetIds(new ComponentName(mContext, CourseWidgetProvider.class));
        widgetIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        mContext.sendBroadcast(widgetIntent);

        // 3. 触发上课静音日程检查
        CourseMuteReceiver.checkAndScheduleMute(mContext);
    }

    @JavascriptInterface
    public void setAutoMuteEnabled(boolean enabled) {
        PreferenceUtil.setAutoMuteEnabled(mContext, enabled);
        if (enabled) {
            CourseMuteReceiver.checkAndScheduleMute(mContext);
        }
    }

    @JavascriptInterface
    public void openExternalUrl(String url) {
        try {
            Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            mContext.startActivity(intent);
        } catch (Exception e) {
            Toast.makeText(mContext, "无法打开外部浏览器: " + e.getMessage(), Toast.LENGTH_SHORT).show();
        }
    }
}