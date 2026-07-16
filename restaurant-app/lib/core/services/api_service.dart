import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:restaurant_app/core/config/constants.dart';

class ApiService {
  static const String baseUrl = AppConstants.baseUrl;
  late final Dio _dio;
  String? _accessToken;
  String? _refreshToken;
  final _secureStorage = const FlutterSecureStorage();

  ApiService() {
    _dio = Dio(BaseOptions(
      baseUrl: baseUrl,
      connectTimeout: const Duration(seconds: 3),
      receiveTimeout: const Duration(seconds: 3),
    ));

    _dio.interceptors.add(InterceptorsWrapper(
      onRequest: (options, handler) {
        if (_accessToken != null) {
          options.headers['Authorization'] = 'Bearer $_accessToken';
        }
        handler.next(options);
      },
      onError: (error, handler) async {
        if (error.response?.statusCode == 401 && _refreshToken != null) {
          try {
            final response = await _dio.post('/auth/refresh', data: {
              'refreshToken': _refreshToken,
            });
            _accessToken = response.data['accessToken'];
            _refreshToken = response.data['refreshToken'];
            await _saveTokens();
            error.requestOptions.headers['Authorization'] = 'Bearer $_accessToken';
            final retryResponse = await _dio.fetch(error.requestOptions);
            return handler.resolve(retryResponse);
          } catch (_) {
            await clearTokens();
          }
        }
        handler.next(error);
      },
    ));
  }

  // ─── Token Management ───
  Future<void> _saveTokens() async {
    if (_accessToken != null) {
      await _secureStorage.write(key: 'access_token', value: _accessToken!);
    }
    if (_refreshToken != null) {
      await _secureStorage.write(key: 'refresh_token', value: _refreshToken!);
    }
  }

  Future<void> loadTokens() async {
    _accessToken = await _secureStorage.read(key: 'access_token');
    _refreshToken = await _secureStorage.read(key: 'refresh_token');
  }

  Future<void> clearTokens() async {
    _accessToken = null;
    _refreshToken = null;
    await _secureStorage.delete(key: 'access_token');
    await _secureStorage.delete(key: 'refresh_token');
  }

  bool get isAuthenticated => _accessToken != null;

  // ─── Auth ───
  Future<Map<String, dynamic>> login({
    required String phone,
    required String password,
  }) async {
    final response = await _dio.post('/auth/login', data: {
      'phone': phone,
      'password': password,
      'userType': 'restaurant',
    });
    _accessToken = response.data['accessToken'];
    _refreshToken = response.data['refreshToken'];
    await _saveTokens();
    return response.data;
  }

  // ─── Profile ───
  Future<Map<String, dynamic>> getProfile() async {
    final response = await _dio.get('/restaurants/profile');
    return response.data;
  }

  // ─── Zones ───
  Future<List<dynamic>> getZones() async {
    final response = await _dio.get('/restaurants/zones');
    return response.data;
  }

  // ─── Settings ───
  Future<Map<String, dynamic>> getRestaurantSettings() async {
    final response = await _dio.get('/restaurants/settings');
    return response.data;
  }

  Future<Map<String, dynamic>> getPublicSettings() async {
    final response = await _dio.get('/settings/public');
    return response.data;
  }

  // ─── Orders ───
  Future<Map<String, dynamic>> createOrder({
    required String customerPhone,
    required String customerAddress,
    String? nearestLandmark,
    required double orderValue,
    required String zoneId,
  }) async {
    final response = await _dio.post('/orders', data: {
      'customerPhone': customerPhone,
      'customerAddress': customerAddress,
      'nearestLandmark': nearestLandmark,
      'orderValue': orderValue,
      'zoneId': zoneId,
    });
    return response.data;
  }

  Future<List<dynamic>> getMyOrders() async {
    final response = await _dio.get('/orders/restaurant');
    return response.data;
  }

  Future<void> cancelOrder(String orderId) async {
    await _dio.post('/orders/$orderId/cancel');
  }

  // ─── Logout ───
  Future<void> logout() async {
    await clearTokens();
  }
}
