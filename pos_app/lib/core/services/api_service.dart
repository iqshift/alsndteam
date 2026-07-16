import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:pos_app/core/config/constants.dart';

class ApiService {
  static const String baseUrl = AppConstants.baseUrl;
  late final Dio _dio;
  String? _accessToken;
  String? _refreshToken;
  final _secureStorage = const FlutterSecureStorage();

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 10),
      receiveTimeout: const Duration(seconds: 10),
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_accessToken != null) {
          options.headers['Authorization'] = 'Bearer $_accessToken';
        }
        return handler.next(options);
      },
      onError: (DioException e, handler) async {
        if (e.response?.statusCode == 401 && _refreshToken != null && !e.requestOptions.path.contains('login')) {
          if (e.requestOptions.extra['retry'] == true) {
            await logout();
            return handler.reject(e);
          }
          try {
            final response = await Dio().post(
              '$baseUrl/auth/refresh',
              data: {'refreshToken': _refreshToken},
            );
            final newAccessToken = response.data['accessToken'];
            final newRefreshToken = response.data['refreshToken'];

            await _saveTokens(newAccessToken, newRefreshToken);

            e.requestOptions.headers['Authorization'] = 'Bearer $newAccessToken';
            e.requestOptions.extra['retry'] = true;
            final cloneReq = await _dio.fetch(e.requestOptions);
            return handler.resolve(cloneReq);
          } catch (_) {
            await logout();
            return handler.reject(e);
          }
        }
        return handler.next(e);
      },
    ));
  }

  Future<void> init() async {
    _accessToken = await _secureStorage.read(key: 'access_token');
    _refreshToken = await _secureStorage.read(key: 'refresh_token');
  }

  bool get isAuthenticated => _accessToken != null;

  Future<void> login(String phone, String password) async {
    final response = await _dio.post('/auth/login', data: {
      'phone': phone,
      'password': password,
      'userType': 'employee',
    });

    final accessToken = response.data['accessToken'];
    final refreshToken = response.data['refreshToken'];

    await _saveTokens(accessToken, refreshToken);
  }

  Future<void> logout() async {
    _accessToken = null;
    _refreshToken = null;
    await _secureStorage.delete(key: 'access_token');
    await _secureStorage.delete(key: 'refresh_token');
  }

  Future<Map<String, dynamic>> getProfile() async {
    final response = await _dio.get('/employees/profile');
    return response.data;
  }

  Future<Map<String, dynamic>> createCode(double value) async {
    final response = await _dio.post('/employees/codes', data: {
      'value': value,
    });
    return response.data;
  }

  Future<List<Map<String, dynamic>>> getMyCodesToday() async {
    final response = await _dio.get('/employees/my-codes');
    return List<Map<String, dynamic>>.from(response.data);
  }

  Future<void> _saveTokens(String accessToken, String refreshToken) async {
    _accessToken = accessToken;
    _refreshToken = refreshToken;
    await _secureStorage.write(key: 'access_token', value: accessToken);
    await _secureStorage.write(key: 'refresh_token', value: refreshToken);
  }

  // ─── Settings ───
  Future<Map<String, dynamic>> getPublicSettings() async {
    final response = await _dio.get('/settings/public');
    return response.data;
  }
}
