class AppConstants {
  // غير عنوان الـ IP هنا فقط ليتم تحديثه في كامل التطبيق تلقائياً
  // 192.168.1.103 هو IP الحاسبة المحلي في الشبكة ليصل إليه الهاتف الحقيقي والمحاكي
  static const String serverIp = '192.168.1.103';
  static const String serverPort = '3000';

  static const String baseUrl = 'http://$serverIp:$serverPort/api';
  static const String socketUrl = 'http://$serverIp:$serverPort';
}
