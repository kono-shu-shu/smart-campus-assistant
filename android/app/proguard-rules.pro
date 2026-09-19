# 智慧校园助手 ProGuard 规则
# 当前 minifyEnabled false，此文件暂不生效
# 启用混淆时需保留 WebView JavaScriptInterface 方法不被混淆

-keepclassmembers class com.sdsctc.campusbrowser.bridge.WebAppInterface {
    @android.webkit.JavascriptInterface <methods>;
}