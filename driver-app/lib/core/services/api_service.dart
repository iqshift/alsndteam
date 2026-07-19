import 'package:dio/dio.dart';
import 'package:flutter_secure_storage/flutter_secure_storage.dart';
import 'package:driver_app/core/config/constants.dart';

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
  Future<Map<String, dynamic>> register({
    required String name,
    required String phone,
    required String password,
  }) async {
    final response = await _dio.post('/auth/register/driver', data: {
      'name': name,
      'phone': phone,
      'password': password,
    });
    _accessToken = response.data['accessToken'];
    _refreshToken = response.data['refreshToken'];
    await _saveTokens();
    return response.data;
  }

  Future<Map<String, dynamic>> login({
    required String phone,
    required String password,
  }) async {
    final response = await _dio.post('/auth/login', data: {
      'phone': phone,
      'password': password,
      'userType': 'driver',
    });
    _accessToken = response.data['accessToken'];
    _refreshToken = response.data['refreshToken'];
    await _saveTokens();
    return response.data;
  }

  Future<void> sendOtp(String phone) async {
    await _dio.post('/auth/otp/send', data: {'phone': phone});
  }

  Future<Map<String, dynamic>> verifyOtp({
    required String phone,
    required String code,
  }) async {
    final response = await _dio.post('/auth/otp/verify', data: {
      'phone': phone,
      'code': code,
      'userType': 'driver',
    });
    _accessToken = response.data['accessToken'];
    _refreshToken = response.data['refreshToken'];
    await _saveTokens();
    return response.data;
  }

  // ─── Profile ───
  Future<Map<String, dynamic>> getProfile() async {
    final response = await _dio.get('/drivers/profile');
    return response.data;
  }

  Future<void> updateProfilePhoto(String filePath) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        filePath,
        filename: filePath.split('/').last,
      ),
    });
    await _dio.patch('/drivers/photo', data: formData);
  }

  // ─── Availability ───
  Future<void> updateAvailability(String status) async {
    await _dio.patch('/drivers/availability', data: {'status': status});
  }

  // ─── Location ───
  Future<void> updateLocation(double lat, double lng) async {
    await _dio.patch('/drivers/location', data: {'lat': lat, 'lng': lng});
  }

  // ─── Orders ───
  Future<List<dynamic>> getMyOrders() async {
    final response = await _dio.get('/orders/driver');
    return response.data;
  }

  Future<List<dynamic>> getPendingBroadcasts() async {
    final response = await _dio.get('/orders/driver/broadcasts');
    return response.data;
  }

  Future<Map<String, dynamic>> acceptOrder(String orderId) async {
    final response = await _dio.post('/orders/driver/accept', data: {
      'orderId': orderId,
      'response': 'accepted',
    });
    return response.data;
  }

  Future<void> rejectOrder(String orderId) async {
    await _dio.post('/orders/driver/reject', data: {
      'orderId': orderId,
      'response': 'rejected',
    });
  }

  Future<Map<String, dynamic>> updateOrderStatus(
      String orderId, String status) async {
    final response = await _dio.patch('/orders/driver/$orderId/status', data: {
      'status': status,
    });
    return response.data;
  }

  // ─── Wallet ───
  Future<Map<String, dynamic>> getBalance() async {
    final response = await _dio.get('/wallet/balance');
    return response.data;
  }

  Future<Map<String, dynamic>> recharge(String code) async {
    final response = await _dio.post('/wallet/recharge', data: {'code': code});
    return response.data;
  }

  Future<List<dynamic>> getTransactions() async {
    final response = await _dio.get('/wallet/transactions');
    return response.data;
  }

  // ─── Settings ───
  Future<Map<String, dynamic>> getPublicSettings() async {
    final response = await _dio.get('/settings/public');
    return response.data;
  }

  // ─── Support Chat ───
  Future<List<dynamic>> getSupportMessages() async {
    final response = await _dio.get('/support/messages');
    return response.data;
  }

  Future<Map<String, dynamic>> sendSupportMessage(String content) async {
    final response = await _dio.post('/support/messages', data: {'content': content});
    return response.data;
  }

  Future<String> uploadSupportImage(String filePath) async {
    final formData = FormData.fromMap({
      'file': await MultipartFile.fromFile(
        filePath,
        filename: filePath.split('/').last,
      ),
    });
    final response = await _dio.post('/support/upload', data: formData);
    return response.data['url'];
  }

  // ─── Logout ───
  Future<void> logout() async {
    await clearTokens();
  }
}
