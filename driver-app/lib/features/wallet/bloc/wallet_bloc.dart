import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:dio/dio.dart';
import 'package:driver_app/core/services/api_service.dart';

// ─── Events ───
abstract class WalletEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class WalletLoadBalance extends WalletEvent {}
class WalletLoadTransactions extends WalletEvent {}

class WalletRechargeRequested extends WalletEvent {
  final String code;
  WalletRechargeRequested({required this.code});
  @override
  List<Object?> get props => [code];
}

// ─── States ───
abstract class WalletState extends Equatable {
  @override
  List<Object?> get props => [];
}

class WalletInitial extends WalletState {}
class WalletLoading extends WalletState {}
class WalletLoaded extends WalletState {
  final double balance;
  final List<dynamic> transactions;
  WalletLoaded({required this.balance, this.transactions = const []});
  @override
  List<Object?> get props => [balance, transactions];
}
class WalletError extends WalletState {
  final String message;
  final double? balance;
  final List<dynamic>? transactions;

  WalletError({
    required this.message,
    this.balance,
    this.transactions,
  });

  @override
  List<Object?> get props => [message, balance, transactions];
}
class WalletRechargeSuccess extends WalletState {
  final double newBalance;
  WalletRechargeSuccess({required this.newBalance});
  @override
  List<Object?> get props => [newBalance];
}

// ─── BLoC ───
class WalletBloc extends Bloc<WalletEvent, WalletState> {
  final ApiService _apiService;

  WalletBloc({required ApiService apiService})
      : _apiService = apiService,
        super(WalletInitial()) {
    on<WalletLoadBalance>(_onLoadBalance);
    on<WalletLoadTransactions>(_onLoadTransactions);
    on<WalletRechargeRequested>(_onRecharge);
  }

  Future<void> _onLoadBalance(
      WalletLoadBalance event, Emitter<WalletState> emit) async {
    emit(WalletLoading());
    try {
      final result = await _apiService.getBalance();
      final balance = double.tryParse(result['balance'].toString()) ?? 0.0;
      final transactions = await _apiService.getTransactions();
      emit(WalletLoaded(balance: balance, transactions: transactions));
    } catch (e) {
      String message = 'فشل تحميل بيانات المحفظة. يرجى التحقق من اتصالك بالإنترنت';
      if (e is DioException) {
        final responseData = e.response?.data;
        if (responseData is Map && responseData.containsKey('message')) {
          message = responseData['message'].toString();
        }
      }
      emit(WalletError(message: message));
    }
  }

  Future<void> _onLoadTransactions(
      WalletLoadTransactions event, Emitter<WalletState> emit) async {
    final currentState = state;
    double? oldBalance;
    List<dynamic>? oldTransactions;
    if (currentState is WalletLoaded) {
      oldBalance = currentState.balance;
      oldTransactions = currentState.transactions;
    }
    try {
      final transactions = await _apiService.getTransactions();
      if (currentState is WalletLoaded) {
        emit(WalletLoaded(
          balance: currentState.balance,
          transactions: transactions,
        ));
      }
    } catch (e) {
      String message = 'فشل تحديث المعاملات الأخيرة';
      if (e is DioException) {
        final responseData = e.response?.data;
        if (responseData is Map && responseData.containsKey('message')) {
          message = responseData['message'].toString();
        }
      }
      emit(WalletError(
        message: message,
        balance: oldBalance,
        transactions: oldTransactions,
      ));
    }
  }

  Future<void> _onRecharge(
      WalletRechargeRequested event, Emitter<WalletState> emit) async {
    final currentState = state;
    double? oldBalance;
    List<dynamic>? oldTransactions;
    if (currentState is WalletLoaded) {
      oldBalance = currentState.balance;
      oldTransactions = currentState.transactions;
    } else if (currentState is WalletError) {
      oldBalance = currentState.balance;
      oldTransactions = currentState.transactions;
    }

    emit(WalletLoading());
    try {
      final result = await _apiService.recharge(event.code);
      final newBalance = double.tryParse(result['balance'].toString()) ?? 0.0;
      emit(WalletRechargeSuccess(newBalance: newBalance));
      // Reload transactions
      final transactions = await _apiService.getTransactions();
      emit(WalletLoaded(balance: newBalance, transactions: transactions));
    } catch (e) {
      String message = 'فشل الاتصال بالخادم، يرجى المحاولة لاحقاً';
      if (e is DioException) {
        final responseData = e.response?.data;
        if (responseData is Map && responseData.containsKey('message')) {
          final backendMsg = responseData['message'].toString();
          if (backendMsg == 'Invalid recharge code') {
            message = 'كود الشحن المدخل غير صحيح';
          } else if (backendMsg == 'Code already used') {
            message = 'كود الشحن هذا مستخدم بالفعل';
          } else {
            message = backendMsg;
          }
        } else if (e.type == DioExceptionType.connectionTimeout ||
                   e.type == DioExceptionType.receiveTimeout) {
          message = 'انتهت مهلة الاتصال بالخادم، يرجى التحقق من الإنترنت';
        }
      } else {
        message = e.toString();
      }
      emit(WalletError(
        message: message,
        balance: oldBalance,
        transactions: oldTransactions,
      ));
    }
  }
}
