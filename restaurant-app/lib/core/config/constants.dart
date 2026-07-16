class AppConstants {
  // غير عنوان الـ IP هنا فقط ليتم تحديثه في كامل التطبيق تلقائياً
  static const String serverIp = '192.168.1.115';
  static const String serverPort = '3000';

  static const String baseUrl = 'http://$serverIp:$serverPort/api';
  static const String socketUrl = 'http://$serverIp:$serverPort';
}
