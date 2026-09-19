package com.sdsctc.campusbrowser.widget;

import android.app.PendingIntent;
import android.appwidget.AppWidgetManager;
import android.appwidget.AppWidgetProvider;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.widget.RemoteViews;

import com.sdsctc.campusbrowser.MainActivity;
import com.sdsctc.campusbrowser.R;
import com.sdsctc.campusbrowser.util.PreferenceUtil;

import org.json.JSONObject;

import java.util.Calendar;

public class CourseWidgetProvider extends AppWidgetProvider {

    @Override
    public void onUpdate(Context context, AppWidgetManager appWidgetManager, int[] appWidgetIds) {
        for (int appWidgetId : appWidgetIds) {
            updateAppWidget(context, appWidgetManager, appWidgetId);
        }
    }

    public static void updateAppWidget(Context context, AppWidgetManager appWidgetManager, int appWidgetId) {
        RemoteViews views = new RemoteViews(context.getPackageName(), R.layout.widget_course_schedule);

        // 1. 获取今日最近或正在进行的课程
        JSONObject course = PreferenceUtil.getTodayUpcomingCourse(context);
        boolean autoMute = PreferenceUtil.isAutoMuteEnabled(context);

        views.setTextViewText(R.id.tv_widget_status, autoMute ? "🔕 静音守护中" : "🔔 正常模式");

        if (course != null) {
            String name = course.optString("name", "未命名课程");
            String room = course.optString("room", "待定教室");
            String teacher = course.optString("teacher", "任课老师");
            String start = course.optString("startTime", "");
            String end = course.optString("endTime", "");
            String status = course.optString("statusDesc", "【下节课】");

            views.setTextViewText(R.id.tv_course_time, "⏰ " + start + " - " + end + " " + status);
            views.setTextViewText(R.id.tv_course_name, name);
            views.setTextViewText(R.id.tv_course_location, "📍 " + room + " · " + teacher);
        } else {
            Calendar cal = Calendar.getInstance();
            int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK);
            String dayStr = (dayOfWeek == Calendar.SATURDAY || dayOfWeek == Calendar.SUNDAY) ? "周末" : "今日";

            views.setTextViewText(R.id.tv_course_time, "☕ " + dayStr + "暂无课程安排");
            views.setTextViewText(R.id.tv_course_name, "放松一下，去图书馆或者自习吧~");
            views.setTextViewText(R.id.tv_course_location, "点击进入应用查看完整周课表与笔记");
        }

        // 2. 点击整个小组件跳转至 App
        Intent intent = new Intent(context, MainActivity.class);
        intent.setFlags(Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_ACTIVITY_CLEAR_TOP);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                context, 0, intent,
                PendingIntent.FLAG_UPDATE_CURRENT | PendingIntent.FLAG_IMMUTABLE
        );
        views.setOnClickPendingIntent(R.id.widget_root_layout, pendingIntent);

        // 3. 提交更新
        appWidgetManager.updateAppWidget(appWidgetId, views);
    }

    @Override
    public void onReceive(Context context, Intent intent) {
        super.onReceive(context, intent);
        // 支持自定义广播刷新组件
        AppWidgetManager appWidgetManager = AppWidgetManager.getInstance(context);
        ComponentName thisWidget = new ComponentName(context, CourseWidgetProvider.class);
        int[] appWidgetIds = appWidgetManager.getAppWidgetIds(thisWidget);
        if (appWidgetIds != null && appWidgetIds.length > 0) {
            onUpdate(context, appWidgetManager, appWidgetIds);
        }
    }
}