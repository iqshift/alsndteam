import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:driver_app/core/config/constants.dart';

class SocketService {
  io.Socket? _socket;
  String? _driverId;
  io.Socket? get socket => _socket;
  final _orderController = StreamController<Map<String, dynamic>>.broadcast();
  final _statusController = StreamController<Map<String, dynamic>>.broadcast();
  final _orderUnavailableController = StreamController<String>.broadcast();
  final _rewardController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionController = StreamController<bool>.broadcast();

  Stream<Map<String, dynamic>> get onNewOrder => _orderController.stream;
  Stream<Map<String, dynamic>> get onOrderStatusUpdate => _statusController.stream;
  Stream<String> get onOrderUnavailable => _orderUnavailableController.stream;
  Stream<Map<String, dynamic>> get onWalletReward => _rewardController.stream;
  Stream<bool> get onConnectionStatus => _connectionController.stream;

  void connect(String driverId) {
    _driverId = driverId;
    _socket = io.io(AppConstants.socketUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
    });

    _socket!.onConnect((_) {
      print('Socket connected');
      _connectionController.add(true);
      _socket!.emit('join_driver', {'driverId': driverId});
    });

    _socket!.on('new_order', (data) {
      _orderController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('order_status_update', (data) {
      _statusController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('order_no_longer_available', (data) {
      _orderUnavailableController.add(data['orderId']);
    });

    _socket!.on('wallet_reward', (data) {
      _rewardController.add(Map<String, dynamic>.from(data));
    });

    _socket!.onDisconnect((_) {
      print('Socket disconnected');
      _connectionController.add(false);
    });

    _socket!.connect();
  }

  void joinOrderRoom(String orderId) {
    _socket?.emit('join_order', {'orderId': orderId});
  }

  void updateLocation(double lat, double lng) {
    if (_driverId != null) {
      _socket?.emit('driver_location_update', {
        'driverId': _driverId,
        'lat': lat,
        'lng': lng,
      });
    }
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
  }

  void dispose() {
    _orderController.close();
    _statusController.close();
    _orderUnavailableController.close();
    _rewardController.close();
    _connectionController.close();
    disconnect();
  }
}
