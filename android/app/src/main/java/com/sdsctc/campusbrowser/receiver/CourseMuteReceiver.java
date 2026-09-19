package com.sdsctc.campusbrowser.receiver;

import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.appwidget.AppWidgetManager;
import android.content.BroadcastReceiver;
import android.content.ComponentName;
import android.content.Context;
import android.content.Intent;
import android.media.AudioManager;
import android.os.Build;
import androidx.core.app.NotificationCompat;

import com.sdsctc.campusbrowser.util.PreferenceUtil;
import com.sdsctc.campusbrowser.widget.CourseWidgetProvider;

import org.json.JSONObject;

public class CourseMuteReceiver extends BroadcastReceiver {
    public static final String ACTION_CHECK_MUTE = "com.sdsctc.campusbrowser.ACTION_CHECK_MUTE";
    private static final String CHANNEL_ID = "campus_mute_channel";
    private static boolean sHasMutedByApp = false;

    @Override
    public void onReceive(Context context, Intent intent) {
        checkAndScheduleMute(context);
    }

    public static void checkAndScheduleMute(Context context) {
        if (!PreferenceUtil.isAutoMuteEnabled(context)) {
            return;
        }

        AudioManager audioManager = (AudioManager) context.getSystemService(Context.AUDIO_SERVICE);
        if (audioManager == null) return;

        JSONObject currentCourse = PreferenceUtil.getTodayUpcomingCourse(context);
        boolean isInClass = false;
        String courseName = "";

        if (currentCourse != null) {
            String desc = currentCourse.optString("statusDesc", "");
            if (desc.contains("正在上课")) {
                isInClass = true;
                courseName = currentCourse.optString("name", "当前课程");
            }
        }

        try {
            if (isInClass) {
                // 上课时间：设置为振动/静音
                if (audioManager.getRingerMode() != AudioManager.RINGER_MODE_VIBRATE &&
                    audioManager.getRingerMode() != AudioManager.RINGER_MODE_SILENT) {
                    
                    audioManager.setRingerMode(AudioManager.RINGER_MODE_VIBRATE);
                    sHasMutedByApp = true;
                    showNotification(context, "🔕 已为您开启课堂自动静音", "正在上课: " + courseName);
                }
            } else {
                // 非上课时间：如果之前由本 App 设置了静音，则自动恢复正常响铃
                if (sHasMutedByApp) {
                    audioManager.setRingerMode(AudioManager.RINGER_MODE_NORMAL);
                    sHasMutedByApp = false;
                    showNotification(context, "🔔 已为您恢复正常铃声", "下课休息时间已到");
                }
            }
        } catch (Exception e) {
            e.printStackTrace();
        }

        // 同步刷新桌面小组件状态
        Intent widgetIntent = new Intent(context, CourseWidgetProvider.class);
        widgetIntent.setAction(AppWidgetManager.ACTION_APPWIDGET_UPDATE);
        int[] ids = AppWidgetManager.getInstance(context)
                .getAppWidgetIds(new ComponentName(context, CourseWidgetProvider.class));
        widgetIntent.putExtra(AppWidgetManager.EXTRA_APPWIDGET_IDS, ids);
        context.sendBroadcast(widgetIntent);
    }

    private static void showNotification(Context context, String title, String text) {
        NotificationManager nm = (NotificationManager) context.getSystemService(Context.NOTIFICATION_SERVICE);
        if (nm == null) return;

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "上课静音守护提醒",
                    NotificationManager.IMPORTANCE_DEFAULT
            );
            channel.setDescription("用于通知上课静音状态切换");
            nm.createNotificationChannel(channel);
        }

        NotificationCompat.Builder builder = new NotificationCompat.Builder(context, CHANNEL_ID)
                .setSmallIcon(android.R.drawable.ic_lock_silent_mode)
                .setContentTitle(title)
                .setContentText(text)
                .setPriority(NotificationCompat.PRIORITY_DEFAULT)
                .setAutoCancel(true);

        nm.notify(1001, builder.build());
    }
}