# Preserve generic signatures for Gson/TypeToken
-keepattributes Signature
-keepattributes *Annotation*
-keep class sun.misc.Unsafe { *; }
-keep class com.google.gson.stream.** { *; }

# Flutter Local Notifications rules
-keep class com.dexterous.flutterlocalnotifications.** { *; }
-keep public class com.google.gson.** { *; }
-keep public class com.google.gson.reflect.TypeToken
-keep public class * extends com.google.gson.reflect.TypeToken
-keep public class * implements com.google.gson.TypeAdapterFactory

# Preserve names of models if they are serialized/deserialized via reflection
-keepclassmembers class * {
  @com.google.gson.annotations.SerializedName <fields>;
}

# Prevent R8 from obfuscating important notification handling classes
-keep class com.dexterous.flutterlocalnotifications.models.** { *; }
