import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:restaurant_app/core/services/api_service.dart';
import 'package:restaurant_app/core/services/socket_service.dart';
import 'package:restaurant_app/features/auth/bloc/auth_bloc.dart';
import 'package:restaurant_app/features/home/bloc/order_bloc.dart';
import 'package:restaurant_app/features/home/screens/order_form_screen.dart';
import 'package:restaurant_app/features/home/screens/order_tracking_screen.dart';
import 'package:restaurant_app/features/home/screens/order_history_screen.dart';
import 'package:restaurant_app/features/home/screens/delivery_prices_screen.dart';


import 'package:restaurant_app/features/auth/screens/login_screen.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}
class _HomeScreenState extends State<HomeScreen> {
  int _currentIndex = 0;
  Map<String, dynamic>? _profile;

  @override
  void initState() {
    super.initState();
    _initSocket();
    context.read<OrderBloc>().add(OrderLoadZones());
  }

  void _initSocket() async {
    final apiService = context.read<ApiService>();
    final socketService = context.read<SocketService>();
    try {
      final profile = await apiService.getProfile();
      setState(() {
        _profile = profile;
      });
      socketService.connect(profile['id']);
    } catch (_) {}
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
      appBar: AppBar(
        leadingWidth: 0,
        leading: const SizedBox.shrink(),
        title: Row(
          children: [
            Container(
              width: 38,
              height: 38,
              decoration: BoxDecoration(
                shape: BoxShape.circle,
                boxShadow: [
                  BoxShadow(
                    color: const Color(0xFF5C6BC0).withOpacity(0.3),
                    blurRadius: 6,
                    offset: const Offset(0, 2),
                  ),
                ],
              ),
              child: ClipRRect(
                borderRadius: BorderRadius.circular(19),
                child: _profile?['imageUrl'] != null && _profile!['imageUrl'].toString().isNotEmpty
                    ? Image.network(
                        _profile!['imageUrl'].toString(),
                        fit: BoxFit.cover,
                        errorBuilder: (context, error, stackTrace) => _buildLogoPlaceholder(),
                      )
                    : _buildLogoPlaceholder(),
              ),
            ),
            const SizedBox(width: 10),
            Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _profile?['name'] ?? 'بوابة المطعم الكبرى',
                  style: const TextStyle(
                    fontSize: 14,
                    fontWeight: FontWeight.w800,
                    color: Color(0xFF1E293B),
                    fontFamily: 'Cairo',
                  ),
                ),
                Text(
                  _currentIndex == 0
                      ? 'الرئيسية'
                      : _currentIndex == 1
                          ? 'سجل الطلبات السابقة'
                          : 'دليل أسعار التوصيل',
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF64748B),
                    fontFamily: 'Cairo',
                  ),
                ),
              ],
            ),
          ],
        ),
        actions: [
          Container(
            margin: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              color: Colors.red.shade50,
              borderRadius: BorderRadius.circular(12),
            ),
            child: IconButton(
              icon: const Icon(Icons.logout_rounded, color: Colors.red, size: 20),
              onPressed: () {
                context.read<AuthBloc>().add(AuthLogoutRequested());
              },
            ),
          ),
        ],
      ),
      body: IndexedStack(
        index: _currentIndex,
        children: [
          _buildHomeTab(),
          const OrderHistoryScreen(),
          const DeliveryPricesScreen(),
        ],
      ),
      floatingActionButton: _currentIndex == 0
          ? FloatingActionButton.extended(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const OrderFormScreen()),
                );
              },
              backgroundColor: Theme.of(context).primaryColor,
              elevation: 4,
              icon: const Icon(Icons.add_circle_outline_rounded, color: Colors.white),
              label: const Text(
                'طلب سائق جديد',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold),
              ),
            )
          : null,
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
          currentIndex: _currentIndex,
          onTap: (index) => setState(() => _currentIndex = index),
          selectedItemColor: Theme.of(context).primaryColor,
          unselectedItemColor: const Color(0xFF94A3B8),
          selectedLabelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12),
          unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w500, fontSize: 12),
          backgroundColor: Colors.white,
          elevation: 0,
          type: BottomNavigationBarType.fixed,
          items: const [
            BottomNavigationBarItem(
              icon: Icon(Icons.dashboard_outlined),
              activeIcon: Icon(Icons.dashboard_rounded),
              label: 'الرئيسية',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.history_toggle_off_rounded),
              activeIcon: Icon(Icons.history_rounded),
              label: 'سجل الطلبات',
            ),
            BottomNavigationBarItem(
              icon: Icon(Icons.delivery_dining_outlined),
              activeIcon: Icon(Icons.delivery_dining_rounded),
              label: 'أسعار التوصيل',
            ),

          ],
        ),
      ),
    ),
  );
}

  Widget _buildHomeTab() {
    return BlocBuilder<OrderBloc, OrderState>(
      builder: (context, state) {
        if (state is OrderLoading || state is OrderSubmitting || state is OrderSubmitted) {
          return Center(
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).primaryColor),
            ),
          );
        }
        if (state is OrderReady) {
          // قائمة جميع الطلبات النشطة
          if (state.activeOrders.isNotEmpty) {
            return Container(
              color: const Color(0xFFF0F2FA),
              child: ListView(
                padding: const EdgeInsets.fromLTRB(0, 8, 0, 100),
                children: [
                  // رأس الصفحة
                  Padding(
                    padding: const EdgeInsets.fromLTRB(16, 8, 16, 4),
                    child: Row(
                      children: [
                        Container(
                          padding: const EdgeInsets.all(8),
                          decoration: BoxDecoration(
                            color: const Color(0xFF5C6BC0).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Icon(Icons.radar_rounded,
                              color: Color(0xFF5C6BC0), size: 18),
                        ),
                        const SizedBox(width: 10),
                        const Text('الطلبات النشطة',
                          style: TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.w800,
                            color: Color(0xFF1E293B),
                            fontFamily: 'Cairo',
                          ),
                        ),
                        const Spacer(),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                          decoration: BoxDecoration(
                            color: const Color(0xFF5C6BC0).withOpacity(0.1),
                            borderRadius: BorderRadius.circular(20),
                          ),
                          child: Text('${state.activeOrders.length} طلب',
                            style: const TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.w700,
                              color: Color(0xFF5C6BC0),
                              fontFamily: 'Cairo',
                            ),
                          ),
                        ),
                      ],
                    ),
                  ),
                  // بطاقات الطلبات النشطة
                  ...state.activeOrders.map((order) => OrderTrackingScreen(order: order)),
                ],
              ),
            );
          }

          // لا يوجد طلب نشط
          return Center(
            child: SingleChildScrollView(
              physics: const BouncingScrollPhysics(),
              child: Padding(
                padding: const EdgeInsets.all(32),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Image.asset(
                      'assets/images/logo.png',
                      height: 180,
                      width: 180,
                      fit: BoxFit.contain,
                    ),
                    const SizedBox(height: 32),
                    const Text(
                      'لا يوجد طلب نشط حالياً',
                      style: TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 12),
                    const Text(
                      'اضغط على زر "طلب سائق جديد" أسفل الشاشة لإرسال طلب شحن وتوصيل فوري',
                      textAlign: TextAlign.center,
                      style: TextStyle(
                        fontSize: 14,
                        color: Color(0xFF64748B),
                        height: 1.5,
                      ),
                    ),
                  ],
                ),
              ),
            ),
          );
        }

        return Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              const Icon(Icons.error_outline_rounded, size: 48, color: Colors.red),
              const SizedBox(height: 16),
              const Text(
                'فشل تحميل الطلبات',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
              ),
              const SizedBox(height: 8),
              ElevatedButton.icon(
                onPressed: () {
                  context.read<OrderBloc>().add(OrderLoadZones());
                },
                icon: const Icon(Icons.refresh_rounded, size: 18),
                label: const Text('إعادة المحاولة'),
              ),
            ],
          ),
        );
      },
    );
  }
  Widget _buildLogoPlaceholder() {
    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          colors: [Color(0xFF5C6BC0), Color(0xFF3F51B5)],
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
        ),
      ),
      child: Center(
        child: Text(
          _profile?['name'] != null && _profile!['name'].toString().isNotEmpty
              ? _profile!['name'].toString().substring(0, 1).toUpperCase()
              : 'R',
          style: const TextStyle(
            color: Colors.white,
            fontWeight: FontWeight.w900,
            fontSize: 15,
            fontFamily: 'Cairo',
          ),
        ),
      ),
    );
  }
}
