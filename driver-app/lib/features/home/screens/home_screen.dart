import 'dart:async';
import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:driver_app/core/services/api_service.dart';
import 'package:driver_app/core/services/socket_service.dart';
import 'package:driver_app/core/services/location_service.dart';
import 'package:driver_app/features/auth/bloc/auth_bloc.dart';
import 'package:driver_app/features/home/bloc/order_bloc.dart';
import 'package:driver_app/features/home/widgets/order_card.dart';
import 'package:driver_app/features/home/widgets/pending_order_card.dart';
import 'package:driver_app/features/auth/screens/login_screen.dart';
import 'package:driver_app/features/wallet/screens/wallet_screen.dart';
import 'package:driver_app/features/wallet/bloc/wallet_bloc.dart';
import 'package:driver_app/features/home/screens/order_history_screen.dart';
import 'package:driver_app/features/home/widgets/low_balance_banner.dart';
import 'package:driver_app/core/config/constants.dart';
import 'package:driver_app/features/home/screens/support_chat_screen.dart';


class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  bool _isAvailable = false;
  int _currentIndex = 0;
  String? _driverId;
  String? _driverName;
  String? _driverPhotoUrl;
  Timer? _locationPingTimer; // ← يُبقي الموقع محدثاً حتى عند الوقوف
  int _unreadSupportMessagesCount = 0;

  void _loadUnreadSupportCount() async {
    try {
      final apiService = context.read<ApiService>();
      final messages = await apiService.getSupportMessages();
      final count = messages.where((m) => m['sender'] == 'admin' && m['isRead'] == false).length;
      if (mounted) {
        setState(() {
          _unreadSupportMessagesCount = count;
        });
      }
    } catch (_) {}
  }

  void _onNewSupportMessage(dynamic data) {
    if (!mounted) return;
    if (SupportChatScreen.isActive) return;
    final message = Map<String, dynamic>.from(data);
    if (message['driverId'] == _driverId && message['sender'] == 'admin') {
      setState(() {
        _unreadSupportMessagesCount++;
      });
    }
  }

  @override
  void initState() {
    super.initState();
    _initServices();
    context.read<OrderBloc>().add(OrderLoadMyOrders());
  }

  @override
  void dispose() {
    _locationPingTimer?.cancel();
    try {
      final socketService = context.read<SocketService>();
      socketService.socket?.off('new_support_message', _onNewSupportMessage);
    } catch (_) {}
    super.dispose();
  }

  void _initServices() async {
    final apiService = context.read<ApiService>();
    final socketService = context.read<SocketService>();
    final locationService = context.read<LocationService>();

    try {
      final profile = await apiService.getProfile();
      final isAvailable = profile['availabilityStatus'] == 'available';
      setState(() {
        _driverId = profile['id'];
        _driverName = profile['name'];
        _isAvailable = isAvailable;
        final photoPath = profile['photo'];
        if (photoPath != null && photoPath.isNotEmpty) {
          _driverPhotoUrl = '${AppConstants.socketUrl}$photoPath';
        }
      });
      // ← مزامنة حالة التوفر مع الـ BLoC فور تحميل الـ Profile
      if (mounted) {
        context.read<OrderBloc>().add(
              OrderAvailabilityChanged(isAvailable: isAvailable),
            );
      }
      socketService.connect(profile['id']);
      _loadUnreadSupportCount();
      socketService.socket?.on('new_support_message', _onNewSupportMessage);

      // الاستماع لمكافآت المحفظة وعرض إشعار منبثق فوري
      socketService.onWalletReward.listen((data) {
        if (mounted) {
          showDialog(
            context: context,
            barrierDismissible: false,
            builder: (context) => PopScope(
              canPop: false,
              child: AlertDialog(
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
                title: const Row(
                  children: [
                    Icon(Icons.card_giftcard_rounded, color: Color(0xFFE11D48), size: 30),
                    SizedBox(width: 10),
                    Text(
                      'مكافأة جديدة! 🎉',
                      style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 18),
                    ),
                  ],
                ),
                content: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      data['message'] ?? 'مبروك لقد حصلت على مكافئه',
                      style: const TextStyle(fontFamily: 'Cairo', fontSize: 15, fontWeight: FontWeight.w600),
                    ),
                    const SizedBox(height: 16),
                    Container(
                      width: double.infinity,
                      padding: const EdgeInsets.symmetric(vertical: 12, horizontal: 16),
                      decoration: BoxDecoration(
                        color: const Color(0xFF10B981).withOpacity(0.1),
                        borderRadius: BorderRadius.circular(12),
                        border: Border.all(color: const Color(0xFF10B981).withOpacity(0.3)),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'المبلغ المضاف:',
                            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, color: Color(0xFF065F46)),
                          ),
                          Text(
                            '+${data['amount']} د.ع',
                            style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFF047857)),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                actions: [
                  ElevatedButton(
                    onPressed: () {
                      Navigator.pop(context);
                      context.read<WalletBloc>().add(WalletLoadBalance());
                    },
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD81B60),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                    child: const Text('شكراً لك', style: TextStyle(fontFamily: 'Cairo', color: Colors.white)),
                  ),
                ],
              ),
            ),
          );
        }
      });
    } catch (_) {}

    final hasPermission = await locationService.checkPermission();
    if (hasPermission) {
      // إرسال الموقع الحالي فوراً عند فتح التطبيق
      try {
        final currentPos = await locationService.getCurrentPosition();
        if (currentPos != null) {
          apiService.updateLocation(currentPos.latitude, currentPos.longitude);
          socketService.updateLocation(currentPos.latitude, currentPos.longitude);
        }
      } catch (_) {}

      // ─── Ping دوري كل 5 دقائق حتى عند الوقوف ───
      // يضمن أن السائق يظل مؤهلاً لاستلام الطلبات حتى لو لم يتحرك
      _locationPingTimer = Timer.periodic(const Duration(minutes: 5), (_) async {
        try {
          final pos = await locationService.getCurrentPosition();
          if (pos != null) {
            apiService.updateLocation(pos.latitude, pos.longitude);
            socketService.updateLocation(pos.latitude, pos.longitude);
          }
        } catch (_) {}
      });

      // بدء الاستماع للتحديثات المستمرة عند الحركة
      locationService.startTracking();
      locationService.onLocationUpdate.listen((position) {
        apiService.updateLocation(position.latitude, position.longitude);
      });
    }
  }

  void _contactSupport() async {
    if (_driverId != null) {
      setState(() {
        _unreadSupportMessagesCount = 0;
      });
      await Navigator.push(
        context,
        MaterialPageRoute(
          builder: (_) => SupportChatScreen(
            driverId: _driverId!,
            driverName: _driverName ?? 'شريك التوصيل',
          ),
        ),
      );
      _loadUnreadSupportCount();
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        if (state is AuthUnauthenticated) {
          Navigator.pushAndRemoveUntil(
            context,
            MaterialPageRoute(builder: (_) => const LoginScreen()),
            (route) => false,
          );
        }
      },
      child: Scaffold(
        backgroundColor: const Color(0xFFF4F7FE),
        appBar: AppBar(
          centerTitle: false,
          title: Row(
            children: [
              Container(
                decoration: BoxDecoration(
                  shape: BoxShape.circle,
                  border: Border.all(color: const Color(0xFF5C73FF).withOpacity(0.15), width: 1.5),
                ),
                child: CircleAvatar(
                  radius: 20,
                  backgroundColor: Colors.white,
                  backgroundImage: _driverPhotoUrl != null
                      ? NetworkImage(_driverPhotoUrl!)
                      : null,
                  child: _driverPhotoUrl == null
                      ? const Icon(Icons.person_rounded, size: 20, color: Color(0xFF94A3B8))
                      : null,
                ),
              ),
              const SizedBox(width: 10),
              Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text(
                    'مرحباً بك شريكنا المتميز 👋',
                    style: TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 10,
                      color: Color(0xFF64748B),
                    ),
                  ),
                  Text(
                    _driverName ?? 'شريك التوصيل',
                    style: const TextStyle(
                      fontFamily: 'Cairo',
                      fontSize: 14,
                      fontWeight: FontWeight.w900,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                ],
              ),
            ],
          ),
          actions: [
            Badge(
              label: Text('$_unreadSupportMessagesCount'),
              isLabelVisible: _unreadSupportMessagesCount > 0,
              backgroundColor: const Color(0xFFEF4444),
              child: IconButton(
                icon: const Icon(Icons.support_agent_rounded, color: Color(0xFF5C73FF)),
                tooltip: 'الدعم الفني',
                onPressed: _contactSupport,
              ),
            ),
            IconButton(
              icon: const Icon(Icons.logout_rounded, color: Color(0xFFEF4444)),
              onPressed: () {
                context.read<AuthBloc>().add(AuthLogoutRequested());
              },
            ),
          ],
        ),
        body: IndexedStack(
          index: _currentIndex,
          children: [
            _buildHomeTab(),
            const WalletScreen(),
            const OrderHistoryScreen(),
          ],
        ),
        bottomNavigationBar: Container(
          decoration: BoxDecoration(
            boxShadow: [
              BoxShadow(
                color: Colors.black.withOpacity(0.04),
                blurRadius: 20,
                offset: const Offset(0, -4),
              ),
            ],
          ),
          child: BottomNavigationBar(
            elevation: 0,
            backgroundColor: Colors.white,
            selectedItemColor: const Color(0xFF5C73FF),
            unselectedItemColor: const Color(0xFF94A3B8),
            selectedLabelStyle: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 11),
            unselectedLabelStyle: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 11),
            currentIndex: _currentIndex,
            onTap: (index) => setState(() => _currentIndex = index),
            items: const [
              BottomNavigationBarItem(
                icon: Icon(Icons.home_rounded),
                activeIcon: Icon(Icons.home_rounded),
                label: 'الرئيسية',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.account_balance_wallet_rounded),
                activeIcon: Icon(Icons.account_balance_wallet_rounded),
                label: 'المحفظة',
              ),
              BottomNavigationBarItem(
                icon: Icon(Icons.history_rounded),
                activeIcon: Icon(Icons.history_rounded),
                label: 'السجل',
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildHomeTab() {
    return BlocConsumer<OrderBloc, OrderState>(
      listener: (context, state) {
        if (state is OrderActive) {
          if (state.actionError != null) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  state.actionError!,
                  style: const TextStyle(fontFamily: 'Cairo'),
                ),
                backgroundColor: Colors.red,
              ),
            );
          }
          if (state.lastUpdatedStatus == 'delivered') {
            context.read<WalletBloc>().add(WalletLoadBalance());
          }
        }
      },
      builder: (context, state) {
        if (state is OrderLoading) {
          return const Center(child: CircularProgressIndicator());
        }

        if (state is OrderActive) {
          return SingleChildScrollView(
            padding: const EdgeInsets.all(16),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                // Low Balance Banner
                const LowBalanceBanner(),
                const SizedBox(height: 14),

                // Availability Toggle Widget
                Card(
                  child: Padding(
                    padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Row(
                          children: [
                            Container(
                              width: 10,
                              height: 10,
                              decoration: BoxDecoration(
                                color: _isAvailable ? const Color(0xFF10B981) : const Color(0xFF94A3B8),
                                shape: BoxShape.circle,
                                boxShadow: _isAvailable
                                    ? [
                                        BoxShadow(
                                          color: const Color(0xFF10B981).withOpacity(0.4),
                                          blurRadius: 8,
                                          spreadRadius: 2,
                                        )
                                      ]
                                    : null,
                              ),
                            ),
                            const SizedBox(width: 12),
                            Text(
                              _isAvailable ? 'متاح لاستلام الطلبات' : 'غير متوفر للعمل',
                              style: const TextStyle(
                                fontSize: 15,
                                fontWeight: FontWeight.bold,
                                color: Color(0xFF1E293B),
                              ),
                            ),
                          ],
                        ),
                        Switch(
                          value: _isAvailable,
                          activeColor: const Color(0xFF10B981),
                          activeTrackColor: const Color(0xFF10B981).withOpacity(0.2),
                          onChanged: (value) {
                            setState(() => _isAvailable = value);
                            // إخبار الـ BLoC لمسح الطلبات المعلقة فوراً عند الإطفاء
                            context.read<OrderBloc>().add(
                                  OrderAvailabilityChanged(isAvailable: value),
                                );
                            context.read<ApiService>().updateAvailability(
                                  value ? 'available' : 'offline',
                                );
                          },
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 20),

                // Pending Broadcast Cards (الطلبات الواردة المتعددة)
                if (state.pendingBroadcasts.isNotEmpty && state.activeOrder == null) ...[
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4),
                    child: Text(
                      'طلبات التوصيل المتاحة حالياً',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF1E293B),
                        fontFamily: 'Cairo',
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  ...state.pendingBroadcasts.map((order) {
                    return PendingOrderCard(
                      key: ValueKey(order['orderId']),
                      order: order,
                      onAccept: () {
                        context.read<OrderBloc>().add(
                              OrderAcceptRequested(orderId: order['orderId']),
                            );
                      },
                      onReject: () {
                        context.read<OrderBloc>().add(
                              OrderRejectRequested(orderId: order['orderId']),
                            );
                      },
                    );
                  }).toList(),
                  const SizedBox(height: 10),
                ],

                // Active Order
                if (state.activeOrder != null) ...[
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4),
                    child: Text(
                      'الطلب الحالي النشط',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                  ),
                  const SizedBox(height: 10),
                  OrderCard(order: state.activeOrder!),
                ] else if (state.pendingBroadcasts.isEmpty) ...[
                  Center(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 60),
                      child: Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          Container(
                            padding: const EdgeInsets.all(24),
                            decoration: BoxDecoration(
                              color: const Color(0xFF5C73FF).withOpacity(0.06),
                              shape: BoxShape.circle,
                            ),
                            child: const Icon(
                              Icons.two_wheeler_rounded,
                              size: 64,
                              color: Color(0xFF5C73FF),
                            ),
                          ),
                          const SizedBox(height: 20),
                          const Text(
                            'لا يوجد طلب نشط حالياً',
                            style: TextStyle(
                              color: Color(0xFF1E293B),
                              fontSize: 16,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const SizedBox(height: 6),
                          const Text(
                            'قم بتفعيل حالة التوفر لتلقي الطلبات الجديدة فوراً',
                            style: TextStyle(
                              color: Color(0xFF94A3B8),
                              fontSize: 12,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                ],
              ],
            ),
          );
        }

        return const Center(child: Text('خطأ في تحميل البيانات'));
      },
    );
  }
}

