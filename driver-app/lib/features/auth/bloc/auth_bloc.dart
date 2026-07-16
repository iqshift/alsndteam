import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:dio/dio.dart';
import 'package:driver_app/core/services/api_service.dart';

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

class AuthRegisterRequested extends AuthEvent {
  final String name;
  final String phone;
  final String password;
  AuthRegisterRequested({
    required this.name,
    required this.phone,
    required this.password,
  });
  @override
  List<Object?> get props => [name, phone, password];
}

class AuthOtpSendRequested extends AuthEvent {
  final String phone;
  AuthOtpSendRequested({required this.phone});
  @override
  List<Object?> get props => [phone];
}

class AuthOtpVerifyRequested extends AuthEvent {
  final String phone;
  final String code;
  AuthOtpVerifyRequested({required this.phone, required this.code});
  @override
  List<Object?> get props => [phone, code];
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
class AuthOtpSent extends AuthState {
  final String phone;
  AuthOtpSent({required this.phone});
  @override
  List<Object?> get props => [phone];
}

// ─── BLoC ───
class AuthBloc extends Bloc<AuthEvent, AuthState> {
  final ApiService _apiService;

  AuthBloc({required ApiService apiService})
      : _apiService = apiService,
        super(AuthInitial()) {
    on<AuthCheckRequested>(_onCheckRequested);
    on<AuthLoginRequested>(_onLoginRequested);
    on<AuthRegisterRequested>(_onRegisterRequested);
    on<AuthOtpSendRequested>(_onOtpSend);
    on<AuthOtpVerifyRequested>(_onOtpVerify);
    on<AuthLogoutRequested>(_onLogout);
  }

  Future<void> _onCheckRequested(
      AuthCheckRequested event, Emitter<AuthState> emit) async {
    await _apiService.loadTokens();
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

  Future<void> _onRegisterRequested(
      AuthRegisterRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await _apiService.register(
        name: event.name,
        phone: event.phone,
        password: event.password,
      );
      final user = await _apiService.getProfile();
      emit(AuthAuthenticated(user: user));
    } catch (e) {
      emit(AuthError(message: e.toString()));
    }
  }

  Future<void> _onOtpSend(
      AuthOtpSendRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await _apiService.sendOtp(event.phone);
      emit(AuthOtpSent(phone: event.phone));
    } catch (e) {
      emit(AuthError(message: e.toString()));
    }
  }

  Future<void> _onOtpVerify(
      AuthOtpVerifyRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      await _apiService.verifyOtp(phone: event.phone, code: event.code);
      final user = await _apiService.getProfile();
      emit(AuthAuthenticated(user: user));
    } catch (e) {
      emit(AuthError(message: e.toString()));
    }
  }

  Future<void> _onLogout(
      AuthLogoutRequested event, Emitter<AuthState> emit) async {
    await _apiService.logout();
    emit(AuthUnauthenticated());
  }
}
