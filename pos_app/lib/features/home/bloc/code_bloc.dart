import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:pos_app/core/services/api_service.dart';

// ─── Events ───
abstract class CodeEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class CodeLoadTodayRequested extends CodeEvent {}

class CodeCreateRequested extends CodeEvent {
  final double value;
  CodeCreateRequested({required this.value});
  @override
  List<Object?> get props => [value];
}

// ─── States ───
abstract class CodeState extends Equatable {
  @override
  List<Object?> get props => [];
}

class CodeInitial extends CodeState {}
class CodeLoading extends CodeState {}
class CodeLoadSuccess extends CodeState {
  final List<Map<String, dynamic>> codes;
  CodeLoadSuccess({required this.codes});
  @override
  List<Object?> get props => [codes];
}
class CodeCreateSuccess extends CodeState {
  final Map<String, dynamic> code;
  CodeCreateSuccess({required this.code});
  @override
  List<Object?> get props => [code];
}
class CodeFailure extends CodeState {
  final String message;
  CodeFailure({required this.message});
  @override
  List<Object?> get props => [message];
}

// ─── BLoC ───
class CodeBloc extends Bloc<CodeEvent, CodeState> {
  final ApiService _apiService;

  CodeBloc({required ApiService apiService})
      : _apiService = apiService,
        super(CodeInitial()) {
    on<CodeLoadTodayRequested>(_onLoadTodayRequested);
    on<CodeCreateRequested>(_onCreateRequested);
  }

  Future<void> _onLoadTodayRequested(
      CodeLoadTodayRequested event, Emitter<CodeState> emit) async {
    emit(CodeLoading());
    try {
      final codes = await _apiService.getMyCodesToday();
      emit(CodeLoadSuccess(codes: codes));
    } catch (e) {
      emit(CodeFailure(message: 'فشل جلب الأكواد المنشأة اليوم'));
    }
  }

  Future<void> _onCreateRequested(
      CodeCreateRequested event, Emitter<CodeState> emit) async {
    emit(CodeLoading());
    try {
      final code = await _apiService.createCode(event.value);
      emit(CodeCreateSuccess(code: code));
    } catch (e) {
      emit(CodeFailure(message: 'فشل إنشاء الكود. تحقق من الاتصال وقيمة البطاقة'));
    }
  }
}
