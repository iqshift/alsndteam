import 'dart:async';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'package:restaurant_app/core/config/constants.dart';class SocketService {
  io.Socket? _socket;
  final _statusController = StreamController<Map<String, dynamic>>.broadcast();
  final _acceptedController = StreamController<Map<String, dynamic>>.broadcast();
  final Set<String> _joinedRooms = {}; // قائمة الغرف التي تم الانضمام إليها لمنع ضياعها في حال تأخر الاتصال

  Stream<Map<String, dynamic>> get onOrderStatusUpdate => _statusController.stream;
  Stream<Map<String, dynamic>> get onOrderAccepted => _acceptedController.stream;

  void connect(String restaurantId) {
    _socket = io.io(AppConstants.socketUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': false,
    });

    _socket!.onConnect((_) {
      print('Socket connected');
      // إعادة الانضمام لجميع غرف الطلبات النشطة فور نجاح الاتصال
      for (var orderId in _joinedRooms) {
        _socket?.emit('join_order', {'orderId': orderId});
        print('Auto re-joined order room: $orderId');
      }
    });

    _socket!.on('order_status_update', (data) {
      _statusController.add(Map<String, dynamic>.from(data));
    });

    _socket!.on('order_accepted', (data) {
      _acceptedController.add(Map<String, dynamic>.from(data));
    });

    _socket!.onDisconnect((_) {
      print('Socket disconnected');
    });

    _socket!.connect();
  }

  void joinOrderRoom(String orderId) {
    _joinedRooms.add(orderId);
    if (_socket != null && _socket!.connected) {
      _socket!.emit('join_order', {'orderId': orderId});
      print('Emitted join_order for: $orderId');
    }
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _joinedRooms.clear();
  }

  void dispose() {
    _statusController.close();
    _acceptedController.close();
    disconnect();
  }
}
