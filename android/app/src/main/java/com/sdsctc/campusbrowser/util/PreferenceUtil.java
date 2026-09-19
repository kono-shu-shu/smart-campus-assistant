package com.sdsctc.campusbrowser.util;

import android.content.Context;
import android.content.SharedPreferences;

import org.json.JSONArray;
import org.json.JSONObject;

import java.util.Calendar;

public class PreferenceUtil {
    private static final String PREF_NAME = "campus_browser_pref";
    private static final String KEY_COURSES = "key_courses_json";
    private static final String KEY_AUTO_MUTE = "key_auto_mute";

    private static SharedPreferences getPrefs(Context context) {
        return context.getSharedPreferences(PREF_NAME, Context.MODE_PRIVATE);
    }

    public static void saveCoursesJson(Context context, String coursesJson) {
        getPrefs(context).edit().putString(KEY_COURSES, coursesJson).apply();
    }

    public static String getCoursesJson(Context context) {
        return getPrefs(context).getString(KEY_COURSES, "[]");
    }

    public static void setAutoMuteEnabled(Context context, boolean enabled) {
        getPrefs(context).edit().putBoolean(KEY_AUTO_MUTE, enabled).apply();
    }

    public static boolean isAutoMuteEnabled(Context context) {
        return getPrefs(context).getBoolean(KEY_AUTO_MUTE, true);
    }

    /**
     * 获取今天下一节或当前正在进行的课程概要
     */
    public static JSONObject getTodayUpcomingCourse(Context context) {
        try {
            String jsonStr = getCoursesJson(context);
            JSONArray array = new JSONArray(jsonStr);
            Calendar cal = Calendar.getInstance();
            int dayOfWeek = cal.get(Calendar.DAY_OF_WEEK); // 1: Sunday, 2: Monday...
            int chineseDay = (dayOfWeek == Calendar.SUNDAY) ? 7 : (dayOfWeek - 1);

            int currentHour = cal.get(Calendar.HOUR_OF_DAY);
            int currentMinute = cal.get(Calendar.MINUTE);
            int currentTimeMinutes = currentHour * 60 + currentMinute;

            JSONObject bestMatch = null;
            int minFutureDiff = Integer.MAX_VALUE;

            for (int i = 0; i < array.length(); i++) {
                JSONObject item = array.getJSONObject(i);
                int cDay = item.optInt("dayOfWeek", 1);
                if (cDay == chineseDay) {
                    String startStr = item.optString("startTime", "00:00");
                    String[] parts = startStr.split(":");
                    int startMinutes = Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);

                    String endStr = item.optString("endTime", "23:59");
                    String[] endParts = endStr.split(":");
                    int endMinutes = Integer.parseInt(endParts[0]) * 60 + Integer.parseInt(endParts[1]);

                    // 如果正在上课
                    if (currentTimeMinutes >= startMinutes && currentTimeMinutes <= endMinutes) {
                        item.put("statusDesc", "【正在上课】");
                        return item;
                    }

                    // 如果是稍后的课程
                    if (startMinutes > currentTimeMinutes) {
                        int diff = startMinutes - currentTimeMinutes;
                        if (diff < minFutureDiff) {
                            minFutureDiff = diff;
                            bestMatch = item;
                            bestMatch.put("statusDesc", "【下一节】");
                        }
                    }
                }
            }
            return bestMatch;
        } catch (Exception e) {
            e.printStackTrace();
        }
        return null;
    }
}