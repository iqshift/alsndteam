import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:restaurant_app/features/home/bloc/order_bloc.dart';
import 'package:intl/intl.dart';

class OrderHistoryScreen extends StatelessWidget {
  const OrderHistoryScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OrderBloc, OrderState>(
      builder: (context, state) {
        if (state is! OrderReady) {
          return Center(
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).primaryColor),
            ),
          );
        }

        final activeOrders = state.activeOrders;
        final completedOrders = state.orderHistory.where((o) => o['status'] == 'delivered').toList();
        final cancelledOrders = state.orderHistory.where((o) => o['status'] != 'delivered').toList();

        return DefaultTabController(
          length: 3,
          child: Column(
            children: [
              Container(
                margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: TabBar(
                  labelColor: Colors.white,
                  unselectedLabelColor: const Color(0xFF64748B),
                  indicatorSize: TabBarIndicatorSize.tab,
                  indicator: BoxDecoration(
                    color: Theme.of(context).primaryColor,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  dividerColor: Colors.transparent,
                  labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, fontFamily: 'Cairo'),
                  unselectedLabelStyle: const TextStyle(fontWeight: FontWeight.w600, fontSize: 13, fontFamily: 'Cairo'),
                  tabs: const [
                    Tab(text: 'الحالية'),
                    Tab(text: 'مكتمل'),
                    Tab(text: 'ملغي'),
                  ],
                ),
              ),
              Expanded(
                child: TabBarView(
                  children: [
                    _buildOrderList(context, activeOrders, 'لا توجد طلبات نشطة حالياً'),
                    _buildOrderList(context, completedOrders, 'لا توجد طلبات مكتملة حالياً'),
                    _buildOrderList(context, cancelledOrders, 'لا توجد طلبات ملغية حالياً'),
                  ],
                ),
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildEmptyState(String title, String subtitle) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Container(
              height: 100,
              width: 100,
              decoration: BoxDecoration(
                color: Colors.grey.shade100,
                shape: BoxShape.circle,
              ),
              child: Icon(
                Icons.history_toggle_off_rounded,
                size: 50,
                color: Colors.grey.shade400,
              ),
            ),
            const SizedBox(height: 20),
            Text(
              title,
              style: const TextStyle(
                fontSize: 16,
                fontWeight: FontWeight.bold,
                color: Color(0xFF64748B),
                fontFamily: 'Cairo',
              ),
            ),
            const SizedBox(height: 6),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: const TextStyle(fontSize: 12, color: Colors.grey, fontFamily: 'Cairo'),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildOrderList(BuildContext context, List<dynamic> orders, String emptyMessage) {
    if (orders.isEmpty) {
      return _buildEmptyState('لا توجد طلبات', emptyMessage);
    }
    return RefreshIndicator(
      onRefresh: () async {
        context.read<OrderBloc>().add(OrderLoadHistory());
      },
      child: ListView.builder(
        padding: const EdgeInsets.fromLTRB(16, 8, 16, 16),
        itemCount: orders.length,
        itemBuilder: (context, index) {
          final Map<String, dynamic> order = orders[index] as Map<String, dynamic>;
          return _buildOrderTile(order);
        },
      ),
    );
  }

  Widget _buildOrderTile(Map<String, dynamic> order) {
    final status = order['status'] ?? '';
    final id = order['id']?.toString() ?? '';
    final rawNum = order['orderNumber']?.toString() ?? 
        (int.tryParse(id.replaceAll('-', '').substring(0, 8), radix: 16)?.toString() ?? id);
    final orderNum = rawNum.length > 6 ? rawNum.substring(0, 6) : rawNum;

    // تنسيق التاريخ والوقت
    final createdAtStr = order['createdAt'];
    String formattedDate = '';
    if (createdAtStr != null) {
      try {
        final parsedDate = DateTime.parse(createdAtStr.toString()).toLocal();
        formattedDate = DateFormat('yyyy-MM-dd | hh:mm a').format(parsedDate);
      } catch (_) {}
    }

    Color statusColor;
    IconData statusIcon;
    String statusText;

    if (status == 'delivered') {
      statusColor = const Color(0xFF10B981);
      statusIcon = Icons.check_circle_rounded;
      statusText = 'تم التوصيل';
    } else if (status == 'cancelled') {
      statusColor = const Color(0xFFEF4444);
      statusIcon = Icons.cancel_rounded;
      statusText = 'ملغي';
    } else if (status == 'searching_driver') {
      statusColor = const Color(0xFF3B82F6);
      statusIcon = Icons.search_rounded;
      statusText = 'بحث عن سائق';
    } else if (status == 'accepted') {
      statusColor = const Color(0xFF8B5CF6);
      statusIcon = Icons.directions_bike_rounded;
      statusText = 'مقبول';
    } else if (status == 'arrived_restaurant') {
      statusColor = const Color(0xFFEC4899);
      statusIcon = Icons.store_rounded;
      statusText = 'وصل المطعم';
    } else if (status == 'picked_up') {
      statusColor = const Color(0xFFF59E0B);
      statusIcon = Icons.local_shipping_rounded;
      statusText = 'جاري التوصيل';
    } else {
      statusColor = const Color(0xFFF59E0B);
      statusIcon = Icons.warning_amber_rounded;
      statusText = 'لا يوجد سائقون';
    }

    return Container(
      margin: const EdgeInsets.only(bottom: 12),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: Colors.grey.withOpacity(0.08)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.03),
            blurRadius: 12,
            offset: const Offset(0, 3),
          ),
        ],
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            // أيقونة الحالة
            Container(
              height: 48,
              width: 48,
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(14),
              ),
              child: Icon(statusIcon, color: statusColor, size: 24),
            ),
            const SizedBox(width: 14),
            // تفاصيل الطلب
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    'طلب رقم: #$orderNum',
                    style: const TextStyle(
                      fontWeight: FontWeight.w800,
                      fontSize: 14,
                      color: Color(0xFF1E293B),
                      fontFamily: 'Cairo',
                    ),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    'الهاتف: ${order['customerPhone'] ?? ''}',
                    style: const TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w600,
                      color: Color(0xFF475569),
                    ),
                  ),
                  const SizedBox(height: 2),
                  Text(
                    'العنوان: ${order['customerAddress'] ?? ''}',
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                    style: const TextStyle(
                      fontSize: 12,
                      color: Color(0xFF64748B),
                      fontFamily: 'Cairo',
                    ),
                  ),
                  const SizedBox(height: 2),
                  if (formattedDate.isNotEmpty)
                    Text(
                      'الوقت: $formattedDate',
                      style: const TextStyle(
                        fontSize: 11,
                        color: Color(0xFF94A3B8),
                        fontFamily: 'Cairo',
                      ),
                    ),
                  const SizedBox(height: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: statusColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      statusText,
                      style: TextStyle(
                        fontSize: 11,
                        color: statusColor,
                        fontWeight: FontWeight.bold,
                        fontFamily: 'Cairo',
                      ),
                    ),
                  ),
                ],
              ),
            ),
            // السعر والمنطقة
            Column(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Text(
                  '${order['deliveryPrice']} د.ع',
                  style: const TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 14,
                    color: Color(0xFF1E293B),
                  ),
                ),
                const SizedBox(height: 4),
                Text(
                  order['zone']?['name'] ?? '',
                  style: const TextStyle(
                    fontSize: 11,
                    color: Color(0xFF94A3B8),
                    fontFamily: 'Cairo',
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}
