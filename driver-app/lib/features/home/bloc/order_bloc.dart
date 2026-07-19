import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:driver_app/core/services/api_service.dart';
import 'package:driver_app/core/services/socket_service.dart';
import 'package:dio/dio.dart';

// ─── Events ───
abstract class OrderEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class OrderLoadMyOrders extends OrderEvent {}

class OrderNewBroadcastReceived extends OrderEvent {
  final Map<String, dynamic> orderData;
  OrderNewBroadcastReceived({required this.orderData});
  @override
  List<Object?> get props => [orderData];
}

class OrderAcceptRequested extends OrderEvent {
  final String orderId;
  OrderAcceptRequested({required this.orderId});
  @override
  List<Object?> get props => [orderId];
}

class OrderRejectRequested extends OrderEvent {
  final String orderId;
  OrderRejectRequested({required this.orderId});
  @override
  List<Object?> get props => [orderId];
}

class OrderUpdateStatus extends OrderEvent {
  final String orderId;
  final String status;
  OrderUpdateStatus({required this.orderId, required this.status});
  @override
  List<Object?> get props => [orderId, status];
}

class OrderStatusUpdated extends OrderEvent {
  final String orderId;
  final String status;
  OrderStatusUpdated({required this.orderId, required this.status});
  @override
  List<Object?> get props => [orderId, status];
}

class OrderUnavailable extends OrderEvent {
  final String orderId;
  OrderUnavailable({required this.orderId});
  @override
  List<Object?> get props => [orderId];
}

/// يُستدعى عند تغيير حالة التوفر لإطفاء الطلبات المعلقة فوراً
class OrderAvailabilityChanged extends OrderEvent {
  final bool isAvailable;
  OrderAvailabilityChanged({required this.isAvailable});
  @override
  List<Object?> get props => [isAvailable];
}

// ─── States ───
abstract class OrderState extends Equatable {
  @override
  List<Object?> get props => [];
}

class OrderInitial extends OrderState {}
class OrderLoading extends OrderState {}
class OrderActive extends OrderState {
  final Map<String, dynamic>? activeOrder;
  final List<dynamic> orderHistory;
  final List<Map<String, dynamic>> pendingBroadcasts;
  final String? actionError;
  final String? lastUpdatedStatus;
  OrderActive({
    this.activeOrder,
    this.orderHistory = const [],
    this.pendingBroadcasts = const [],
    this.actionError,
    this.lastUpdatedStatus,
  });
  @override
  List<Object?> get props => [activeOrder, orderHistory, pendingBroadcasts, actionError, lastUpdatedStatus];
}
class OrderError extends OrderState {
  final String message;
  OrderError({required this.message});
  @override
  List<Object?> get props => [message];
}

// ─── BLoC ───
class OrderBloc extends Bloc<OrderEvent, OrderState> {
  final ApiService _apiService;
  final SocketService _socketService;
  StreamSubscription? _orderSub;
  StreamSubscription? _statusSub;
  StreamSubscription? _unavailableSub;
  StreamSubscription? _connSub;

  // ← تُخزَّن الطلبات هنا إذا وصلت قبل اكتمال تحميل البيانات
  final List<Map<String, dynamic>> _pendingBroadcastBuffer = [];

  // ← حالة التوفر الداخلية للـ BLoC
  bool _isDriverAvailable = true;

  OrderBloc({
    required ApiService apiService,
    required SocketService socketService,
  })  : _apiService = apiService,
        _socketService = socketService,
        super(OrderInitial()) {
    on<OrderLoadMyOrders>(_onLoadOrders);
    on<OrderNewBroadcastReceived>(_onNewBroadcast);
    on<OrderAcceptRequested>(_onAccept);
    on<OrderRejectRequested>(_onReject);
    on<OrderUpdateStatus>(_onUpdateStatus);
    on<OrderStatusUpdated>(_onStatusUpdated);
    on<OrderUnavailable>(_onUnavailable);
    on<OrderAvailabilityChanged>(_onAvailabilityChanged);

    _listenToSocket();
  }

  void _listenToSocket() {
    _orderSub = _socketService.onNewOrder.listen((data) {
      add(OrderNewBroadcastReceived(orderData: data));
    });

    _statusSub = _socketService.onOrderStatusUpdate.listen((data) {
      add(OrderStatusUpdated(
        orderId: data['orderId'],
        status: data['status'],
      ));
    });

    _unavailableSub = _socketService.onOrderUnavailable.listen((orderId) {
      add(OrderUnavailable(orderId: orderId));
    });

    _connSub = _socketService.onConnectionStatus.listen((connected) {
      if (connected) {
        add(OrderLoadMyOrders());
      }
    });
  }

  Future<void> _onLoadOrders(
      OrderLoadMyOrders event, Emitter<OrderState> emit) async {
    emit(OrderLoading());
    try {
      final orders = await _apiService.getMyOrders();
      final pendingBroadcasts = await _apiService.getPendingBroadcasts();
      final activeOrder = orders.firstWhere(
        (o) => !['delivered', 'cancelled'].contains(o['status']),
        orElse: () => null,
      );
      // ← تطبيق أي طلب معلق وصل أثناء التحميل
      final pending = List<Map<String, dynamic>>.from(_pendingBroadcastBuffer);
      _pendingBroadcastBuffer.clear();

      for (var pb in pendingBroadcasts) {
        final exists = pending.any((o) => o['orderId'] == pb['orderId']);
        if (!exists) {
          pending.add(Map<String, dynamic>.from(pb));
        }
      }

      emit(OrderActive(
        activeOrder: activeOrder,
        orderHistory: orders
            .where((o) => ['delivered', 'cancelled'].contains(o['status']))
            .toList(),
        pendingBroadcasts: activeOrder == null ? pending : const [],
      ));
    } catch (e) {
      emit(OrderError(message: e.toString()));
    }
  }

  void _onNewBroadcast(
      OrderNewBroadcastReceived event, Emitter<OrderState> emit) {
    // ← تجاهل الطلب تماماً إذا كان السائق غير متوفر
    if (!_isDriverAvailable) return;

    final currentState = state;
    if (currentState is OrderActive && currentState.activeOrder == null) {
      // تحقق من عدم تكرار نفس الطلب في القائمة
      final exists = currentState.pendingBroadcasts.any(
        (o) => o['orderId'] == event.orderData['orderId'],
      );
      if (!exists) {
        final updatedList = List<Map<String, dynamic>>.from(currentState.pendingBroadcasts)
          ..add(event.orderData);
        emit(OrderActive(
          activeOrder: currentState.activeOrder,
          orderHistory: currentState.orderHistory,
          pendingBroadcasts: updatedList,
        ));
      }
    } else if (currentState is! OrderActive) {
      // الحالة لم تُحمَّل بعد — احفظ الطلب في البفر
      final exists = _pendingBroadcastBuffer.any(
        (o) => o['orderId'] == event.orderData['orderId'],
      );
      if (!exists) {
        _pendingBroadcastBuffer.add(event.orderData);
      }
    }
  }

  void _onAvailabilityChanged(
      OrderAvailabilityChanged event, Emitter<OrderState> emit) {
    _isDriverAvailable = event.isAvailable;

    // عند الإطفاء: مسح كل الطلبات المعلقة فوراً من الشاشة
    if (!event.isAvailable) {
      _pendingBroadcastBuffer.clear();
      final currentState = state;
      if (currentState is OrderActive) {
        emit(OrderActive(
          activeOrder: currentState.activeOrder,
          orderHistory: currentState.orderHistory,
          pendingBroadcasts: const [], // ← تفريغ القائمة
        ));
      }
    }
  }

  Future<void> _onAccept(
      OrderAcceptRequested event, Emitter<OrderState> emit) async {
    final currentState = state;
    List<dynamic> orderHistory = const [];
    List<Map<String, dynamic>> pendingBroadcasts = const [];

    if (currentState is OrderActive) {
      orderHistory = currentState.orderHistory;
      pendingBroadcasts = currentState.pendingBroadcasts;
    }

    try {
      await _apiService.acceptOrder(event.orderId);
      _socketService.joinOrderRoom(event.orderId);
      final orders = await _apiService.getMyOrders();
      final activeOrder = orders.firstWhere(
        (o) => o['id'] == event.orderId,
        orElse: () => null,
      );
      emit(OrderActive(
        activeOrder: activeOrder,
        orderHistory: orders
            .where((o) => ['delivered', 'cancelled'].contains(o['status']))
            .toList(),
        pendingBroadcasts: const [],
      ));
    } catch (e) {
      print('❌ خطأ أثناء قبول الطلب: $e');
      String message = 'فشل قبول الطلب. يرجى التحقق من اتصالك بالإنترنت';
      if (e is DioException) {
        final responseData = e.response?.data;
        if (responseData is Map && responseData.containsKey('message')) {
          message = responseData['message'].toString();
        }
      }
      emit(OrderActive(
        activeOrder: null,
        orderHistory: orderHistory,
        pendingBroadcasts: pendingBroadcasts,
        actionError: message,
      ));
    }
  }

  Future<void> _onReject(
      OrderRejectRequested event, Emitter<OrderState> emit) async {
    final currentState = state;
    Map<String, dynamic>? activeOrder;
    List<dynamic> orderHistory = const [];
    List<Map<String, dynamic>> pendingBroadcasts = const [];

    if (currentState is OrderActive) {
      activeOrder = currentState.activeOrder;
      orderHistory = currentState.orderHistory;
      pendingBroadcasts = currentState.pendingBroadcasts;
    }

    try {
      await _apiService.rejectOrder(event.orderId);
      final updatedList = List<Map<String, dynamic>>.from(pendingBroadcasts)
        ..removeWhere((o) => o['orderId'] == event.orderId);
      emit(OrderActive(
        activeOrder: activeOrder,
        orderHistory: orderHistory,
        pendingBroadcasts: updatedList,
      ));
    } catch (e) {
      print('❌ خطأ أثناء تخطي الطلب: $e');
      String message = 'فشل تخطي الطلب';
      if (e is DioException) {
        final responseData = e.response?.data;
        if (responseData is Map && responseData.containsKey('message')) {
          message = responseData['message'].toString();
        }
      }
      emit(OrderActive(
        activeOrder: activeOrder,
        orderHistory: orderHistory,
        pendingBroadcasts: pendingBroadcasts,
        actionError: message,
      ));
    }
  }

  Future<void> _onUpdateStatus(
      OrderUpdateStatus event, Emitter<OrderState> emit) async {
    final currentState = state;
    Map<String, dynamic>? activeOrder;
    List<dynamic> orderHistory = const [];
    List<Map<String, dynamic>> pendingBroadcasts = const [];

    if (currentState is OrderActive) {
      activeOrder = currentState.activeOrder;
      orderHistory = currentState.orderHistory;
      pendingBroadcasts = currentState.pendingBroadcasts;
    }

    try {
      await _apiService.updateOrderStatus(event.orderId, event.status);
      final orders = await _apiService.getMyOrders();
      final updatedActiveOrder = orders.firstWhere(
        (o) => !['delivered', 'cancelled'].contains(o['status']),
        orElse: () => null,
      );
      emit(OrderActive(
        activeOrder: updatedActiveOrder,
        orderHistory: orders
            .where((o) => ['delivered', 'cancelled'].contains(o['status']))
            .toList(),
        pendingBroadcasts: pendingBroadcasts,
        lastUpdatedStatus: event.status,
      ));
    } catch (e) {
      print('❌ خطأ أثناء تحديث حالة الطلب: $e');
      String message = 'فشل تحديث حالة الطلب';
      if (e is DioException) {
        final responseData = e.response?.data;
        if (responseData is Map && responseData.containsKey('message')) {
          message = responseData['message'].toString();
        }
      }
      emit(OrderActive(
        activeOrder: activeOrder,
        orderHistory: orderHistory,
        pendingBroadcasts: pendingBroadcasts,
        actionError: message,
      ));
    }
  }


  void _onStatusUpdated(
      OrderStatusUpdated event, Emitter<OrderState> emit) {
    final currentState = state;
    if (currentState is OrderActive) {
      final activeOrder = currentState.activeOrder;
      if (activeOrder != null && activeOrder['id'] == event.orderId) {
        final updatedOrder = Map<String, dynamic>.from(activeOrder);
        updatedOrder['status'] = event.status;
        emit(OrderActive(
          activeOrder: ['delivered', 'cancelled'].contains(event.status)
              ? null
              : updatedOrder,
          orderHistory: currentState.orderHistory,
          pendingBroadcasts: currentState.pendingBroadcasts,
          lastUpdatedStatus: event.status,
        ));
      }
    }
  }

  void _onUnavailable(OrderUnavailable event, Emitter<OrderState> emit) {
    final currentState = state;
    if (currentState is OrderActive) {
      final exists = currentState.pendingBroadcasts.any(
        (o) => o['orderId'] == event.orderId,
      );
      if (exists) {
        final updatedList = List<Map<String, dynamic>>.from(currentState.pendingBroadcasts)
          ..removeWhere((o) => o['orderId'] == event.orderId);
        emit(OrderActive(
          activeOrder: currentState.activeOrder,
          orderHistory: currentState.orderHistory,
          pendingBroadcasts: updatedList,
        ));
      }
    }
  }

  @override
  Future<void> close() {
    _orderSub?.cancel();
    _statusSub?.cancel();
    _unavailableSub?.cancel();
    _connSub?.cancel();
    return super.close();
  }
}
