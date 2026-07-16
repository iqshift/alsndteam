import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:dio/dio.dart';
import 'package:pos_app/core/services/api_service.dart';

// ─── Events ───
abstract class AuthEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class AuthCheckRequested extends AuthEvent {}

class AuthLoginRequested extends AuthEvent {
  final String phone;
  final String password;
  AuthLoginRequested({required this.phone, required this.password});
  @override
  List<Object?> get props => [phone, password];
}

class AuthLogoutRequested extends AuthEvent {}

// ─── States ───
abstract class AuthState extends Equatable {
  @override
  List<Object?> get props => [];
}

class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}
class AuthAuthenticated extends AuthState {
  final Map<String, dynamic> user;
  AuthAuthenticated({required this.user});
  @override
  List<Object?> get props => [user];
}
class AuthUnauthenticated extends AuthState {}
class AuthError extends AuthState {
  final String message;
  AuthError({required this.message});
  @override
  List<Object?> get props => [message];
}

// ─── BLoC ───
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final ApiService _apiService;

  AuthBloc({required ApiService apiService})
      : _apiService = apiService,
        super(AuthInitial()) {
    on<AuthCheckRequested>(_onCheckRequested);
    on<AuthLoginRequested>(_onLoginRequested);
    on<AuthLogoutRequested>(_onLogout);
  }

  Future<void> _onCheckRequested(
      AuthCheckRequested event, Emitter<AuthState> emit) async {
    await _apiService.init();
    if (_apiService.isAuthenticated) {
      try {
        final user = await _apiService.getProfile();
        emit(AuthAuthenticated(user: user));
      } catch (_) {
        emit(AuthUnauthenticated());
      }
    } else {
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onLoginRequested(
      AuthLoginRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await _apiService.login(event.phone, event.password);
      final user = await _apiService.getProfile();
      emit(AuthAuthenticated(user: user));
    } catch (e) {
      String msg = 'رقم الهاتف أو كلمة المرور غير صحيحة';
      if (e is DioException) {
        if (e.type == DioExceptionType.connectionTimeout || e.type == DioExceptionType.receiveTimeout) {
          msg = 'انتهت مهلة الاتصال بالخادم. تحقق من الـ IP والشبكة';
        } else if (e.response != null && e.response!.data != null) {
          final data = e.response!.data;
          if (data is Map) {
            final serverMsg = data['message']?.toString() ?? '';
            final serverErr = data['error']?.toString() ?? '';
            if (serverMsg == 'Unauthorized' || serverMsg == 'Invalid credentials' || serverErr == 'Unauthorized') {
              msg = 'رقم الهاتف أو كلمة المرور غير صحيحة';
            } else {
              msg = serverMsg.isNotEmpty ? serverMsg : 'حدث خطأ غير متوقع';
            }
          }
        } else {
          msg = 'فشل الاتصال بالخادم. يرجى التحقق من الشبكة والـ IP';
        }
      }
      emit(AuthError(message: msg));
    }
  }

  Future<void> _onLogout(
      AuthLogoutRequested event, Emitter<AuthState> emit) async {
    await _apiService.logout();
    emit(AuthUnauthenticated());
  }
}
