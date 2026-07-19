import 'dart:async';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:equatable/equatable.dart';
import 'package:restaurant_app/core/services/api_service.dart';
import 'package:restaurant_app/core/services/socket_service.dart';

// ─── Events ───
abstract class OrderEvent extends Equatable {
  @override
  List<Object?> get props => [];
}

class OrderLoadZones extends OrderEvent {}
class OrderLoadHistory extends OrderEvent {}
class OrderSubmit extends OrderEvent {
  final String customerPhone;
  final String customerAddress;
  final String? nearestLandmark;
  final double orderValue;
  final String zoneId;
  OrderSubmit({
    required this.customerPhone,
    required this.customerAddress,
    this.nearestLandmark,
    required this.orderValue,
    required this.zoneId,
  });
  @override
  List<Object?> get props => [customerPhone, customerAddress, orderValue, zoneId];
}

class OrderStatusUpdated extends OrderEvent {
  final String orderId;
  final String status;
  OrderStatusUpdated({required this.orderId, required this.status});
  @override
  List<Object?> get props => [orderId, status];
}

class OrderAcceptedByDriver extends OrderEvent {
  final String orderId;
  final String? driverId;
  OrderAcceptedByDriver({required this.orderId, this.driverId});
  @override
  List<Object?> get props => [orderId, driverId];
}

class OrderCancelRequested extends OrderEvent {
  final String orderId;
  OrderCancelRequested({required this.orderId});
  @override
  List<Object?> get props => [orderId];
}

// ─── States ───
abstract class OrderState extends Equatable {
  @override
  List<Object?> get props => [];
}

class OrderInitial extends OrderState {}
class OrderLoading extends OrderState {}
class OrderReady extends OrderState {
  final List<dynamic> zones;
  final List<dynamic> activeOrders;
  final List<dynamic> orderHistory;
  OrderReady({
    this.zones = const [],
    this.activeOrders = const [],
    this.orderHistory = const [],
  });
  @override
  List<Object?> get props => [zones, activeOrders, orderHistory];
}
class OrderSubmitting extends OrderState {}
class OrderSubmitted extends OrderState {
  final Map<String, dynamic> order;
  OrderSubmitted({required this.order});
  @override
  List<Object?> get props => [order];
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
  StreamSubscription? _statusSub;
  StreamSubscription? _acceptedSub;
  StreamSubscription? _connSub;

  OrderBloc({
    required ApiService apiService,
    required SocketService socketService,
  })  : _apiService = apiService,
        _socketService = socketService,
        super(OrderInitial()) {
    on<OrderLoadZones>(_onLoadZones);
    on<OrderLoadHistory>(_onLoadHistory);
    on<OrderSubmit>(_onSubmit);
    on<OrderStatusUpdated>(_onStatusUpdated);
    on<OrderAcceptedByDriver>(_onAcceptedByDriver);
    on<OrderCancelRequested>(_onCancelOrder);

    _listenToSocket();
  }

  void _listenToSocket() {
    _statusSub = _socketService.onOrderStatusUpdate.listen((data) {
      add(OrderStatusUpdated(
        orderId: data['orderId'],
        status: data['status'],
      ));
    });

    _acceptedSub = _socketService.onOrderAccepted.listen((data) {
      add(OrderAcceptedByDriver(
        orderId: data['orderId'],
        driverId: data['driverId'],
      ));
    });

    _connSub = _socketService.onConnectionStatus.listen((connected) {
      if (connected) {
        add(OrderLoadZones());
      }
    });
  }

  Future<void> _onLoadZones(
      OrderLoadZones event, Emitter<OrderState> emit) async {
    emit(OrderLoading());
    try {
      final zones = await _apiService.getZones();
      final orders = await _apiService.getMyOrders();
      final activeOrders = orders
          .where((o) => !['delivered', 'cancelled', 'no_drivers_available'].contains(o['status']))
          .toList();

      for (var activeOrder in activeOrders) {
        _socketService.joinOrderRoom(activeOrder['id']);
      }

      emit(OrderReady(
        zones: zones,
        activeOrders: activeOrders,
        orderHistory: orders
            .where((o) => ['delivered', 'cancelled', 'no_drivers_available'].contains(o['status']))
            .toList(),
      ));
    } catch (e) {
      emit(OrderError(message: e.toString()));
    }
  }

  Future<void> _onLoadHistory(
      OrderLoadHistory event, Emitter<OrderState> emit) async {
    try {
      final orders = await _apiService.getMyOrders();
      final currentState = state;
      if (currentState is OrderReady) {
        emit(OrderReady(
          zones: currentState.zones,
          activeOrders: currentState.activeOrders,
          orderHistory: orders
              .where((o) => ['delivered', 'cancelled', 'no_drivers_available'].contains(o['status']))
              .toList(),
        ));
      }
    } catch (e) {
      emit(OrderError(message: e.toString()));
    }
  }

  Future<void> _onSubmit(OrderSubmit event, Emitter<OrderState> emit) async {
    emit(OrderSubmitting());
    try {
      final order = await _apiService.createOrder(
        customerPhone: event.customerPhone,
        customerAddress: event.customerAddress,
        nearestLandmark: event.nearestLandmark,
        orderValue: event.orderValue,
        zoneId: event.zoneId,
      );
      _socketService.joinOrderRoom(order['id']);
      emit(OrderSubmitted(order: order));

      // جلب البيانات الطازجة للانتقال لحالة الجاهزية تلقائياً وعرض شاشة التتبع
      final freshZones = await _apiService.getZones();
      final freshOrders = await _apiService.getMyOrders();
      final activeOrders = freshOrders
          .where((o) => !['delivered', 'cancelled', 'no_drivers_available'].contains(o['status']))
          .toList();
      
      emit(OrderReady(
        zones: freshZones,
        activeOrders: activeOrders,
        orderHistory: freshOrders
            .where((o) => ['delivered', 'cancelled', 'no_drivers_available'].contains(o['status']))
            .toList(),
      ));
    } catch (e) {
      emit(OrderError(message: e.toString()));
      // إعادة تعيين الحالة لتكون جاهزة لكي لا تتعطل الواجهة بعد إغلاق شاشة الخطأ
      try {
        final freshZones = await _apiService.getZones();
        final freshOrders = await _apiService.getMyOrders();
        final activeOrders = freshOrders
            .where((o) => !['delivered', 'cancelled', 'no_drivers_available'].contains(o['status']))
            .toList();
        emit(OrderReady(
          zones: freshZones,
          activeOrders: activeOrders,
          orderHistory: freshOrders
              .where((o) => ['delivered', 'cancelled', 'no_drivers_available'].contains(o['status']))
              .toList(),
        ));
      } catch (_) {}
    }
  }

  void _onStatusUpdated(OrderStatusUpdated event, Emitter<OrderState> emit) {
    final currentState = state;
    if (currentState is OrderReady) {
      final updatedOrders = currentState.activeOrders.map((o) {
        if (o['id'] == event.orderId) {
          final updated = Map<String, dynamic>.from(o);
          updated['status'] = event.status;
          return updated;
        }
        return o;
      }).toList();

      final isFinished = ['delivered', 'cancelled', 'no_drivers_available']
          .contains(event.status);

      final finishedOrder = updatedOrders.firstWhere(
        (o) => o['id'] == event.orderId && isFinished,
        orElse: () => null,
      );

      final activeList = updatedOrders.where((o) => !['delivered', 'cancelled', 'no_drivers_available'].contains(o['status'])).toList();
      final historyList = List<dynamic>.from(currentState.orderHistory);
      if (finishedOrder != null) {
        historyList.insert(0, finishedOrder);
      }

      emit(OrderReady(
        zones: currentState.zones,
        activeOrders: activeList,
        orderHistory: historyList,
      ));
    }
  }

  void _onAcceptedByDriver(
      OrderAcceptedByDriver event, Emitter<OrderState> emit) {
    final currentState = state;
    if (currentState is OrderReady) {
      if (event.driverId == null) return;
      // Refresh list to fetch driver name/phone details
      add(OrderLoadZones());
    }
  }

  Future<void> _onCancelOrder(
      OrderCancelRequested event, Emitter<OrderState> emit) async {
    final currentState = state;
    if (currentState is! OrderReady) return;
    try {
      await _apiService.cancelOrder(event.orderId);
      final cancelledOrder = currentState.activeOrders.firstWhere((o) => o['id'] == event.orderId, orElse: () => null);
      if (cancelledOrder == null) return;
      
      final updatedCancelled = Map<String, dynamic>.from(cancelledOrder);
      updatedCancelled['status'] = 'cancelled';
      
      final activeList = currentState.activeOrders.where((o) => o['id'] != event.orderId).toList();
      emit(OrderReady(
        zones: currentState.zones,
        activeOrders: activeList,
        orderHistory: [updatedCancelled, ...currentState.orderHistory],
      ));
    } catch (e) {
      emit(OrderError(message: 'فشل الإلغاء: ${e.toString()}'));
      emit(currentState); // إعادة الحالة السابقة
    }
  }

  @override
  Future<void> close() {
    _statusSub?.cancel();
    _acceptedSub?.cancel();
    _connSub?.cancel();
    return super.close();
  }
}
