import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:dio/dio.dart';
import 'package:restaurant_app/core/services/api_service.dart';

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
    try {
      await _apiService.loadTokens();
      print("AuthCheckRequested: loadTokens finished. isAuthenticated: ${_apiService.isAuthenticated}");
      if (_apiService.isAuthenticated) {
        try {
          final user = await _apiService.getProfile();
          print("AuthCheckRequested: getProfile success. User: ${user['name']}");
          emit(AuthAuthenticated(user: user));
        } catch (e) {
          print("AuthCheckRequested: getProfile failed: $e");
          emit(AuthUnauthenticated());
        }
      } else {
        print("AuthCheckRequested: Not authenticated");
        emit(AuthUnauthenticated());
      }
    } catch (e) {
      print("AuthCheckRequested: loadTokens failed: $e");
      emit(AuthUnauthenticated());
    }
  }

  Future<void> _onLoginRequested(
      AuthLoginRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await _apiService.login(phone: event.phone, password: event.password);
      final user = await _apiService.getProfile();
      emit(AuthAuthenticated(user: user));
    } catch (e) {
      String errMsg = 'فشل تسجيل الدخول. يرجى التحقق من البيانات والاتصال.';
      if (e is DioException) {
        if (e.response?.data != null && e.response?.data['message'] != null) {
          final serverMsg = e.response?.data['message'];
          if (serverMsg == 'Invalid credentials') {
            errMsg = 'رقم الهاتف أو كلمة المرور غير صحيحة';
          } else if (serverMsg == 'Account suspended') {
            errMsg = 'تم تعليق هذا الحساب. يرجى التواصل مع الإدارة.';
          } else {
            errMsg = serverMsg.toString();
          }
        }
      }
      emit(AuthError(message: errMsg));
    }
  }

  Future<void> _onLogout(
      AuthLogoutRequested event, Emitter<AuthState> emit) async {
    await _apiService.logout();
    emit(AuthUnauthenticated());
  }
}
