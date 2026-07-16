import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:driver_app/features/home/bloc/order_bloc.dart';
import 'package:url_launcher/url_launcher.dart';

class OrderCard extends StatelessWidget {
  final Map<String, dynamic> order;

  const OrderCard({super.key, required this.order});

  String get _statusText {
    switch (order['status']) {
      case 'assigned':
        return 'تم التعيين - في انتظارك';
      case 'arrived_at_restaurant':
        return 'وصلت للمطعم';
      case 'heading_to_customer':
        return 'في الطريق للعميل';
      default:
        return order['status'];
    }
  }

  Color get _statusColor {
    switch (order['status']) {
      case 'assigned':
        return const Color(0xFF5C73FF);
      case 'arrived_at_restaurant':
        return const Color(0xFF7C3AED);
      case 'heading_to_customer':
        return const Color(0xFF10B981);
      default:
        return const Color(0xFF64748B);
    }
  }

  @override
  Widget build(BuildContext context) {
    final orderValue = double.tryParse(order['orderValue']?.toString() ?? '0') ?? 0.0;
    final deliveryPrice = double.tryParse(order['deliveryPrice']?.toString() ?? '0') ?? 0.0;
    final driverDeduction = double.tryParse(order['driverDeduction']?.toString() ?? '0') ?? 0.0;
    final restaurantCommission = double.tryParse(order['restaurantCommission']?.toString() ?? '0') ?? 0.0;

    final dueToRestaurant = orderValue - restaurantCommission;
    final collectFromCustomer = orderValue + deliveryPrice;
    final netWalletDelivery = deliveryPrice - driverDeduction;

    return Card(
      margin: const EdgeInsets.only(bottom: 16),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Status Badge
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  decoration: BoxDecoration(
                    color: _statusColor.withOpacity(0.08),
                    borderRadius: BorderRadius.circular(30),
                    border: Border.all(color: _statusColor.withOpacity(0.18), width: 1.5),
                  ),
                  child: Text(
                    _statusText,
                    style: TextStyle(
                      color: _statusColor,
                      fontWeight: FontWeight.bold,
                      fontSize: 13,
                    ),
                  ),
                ),
                Builder(builder: (context) {
                  final rawNum = (order['orderNumber']?.toString() ?? 
                      (int.tryParse((order['id'] ?? '').toString().replaceAll('-', '').substring(0, 8), radix: 16)?.toString() ?? ''));
                  final orderNum = rawNum.length > 6 ? rawNum.substring(0, 6) : rawNum;
                  return Text(
                    '#$orderNum',
                    style: const TextStyle(
                      fontFamily: 'Plus Jakarta Sans',
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF94A3B8),
                      fontSize: 13,
                    ),
                  );
                }),
              ],
            ),
            const SizedBox(height: 20),

            // Restaurant Info
            _buildInfoTile(
              Icons.storefront_rounded,
              'المطعم',
              order['restaurant']?['name'] ?? 'غير معروف',
              iconColor: const Color(0xFF5C73FF),
            ),
            const SizedBox(height: 8),

            // Customer Address
            _buildInfoTile(
              Icons.location_on_rounded,
              'عنوان العميل',
              order['customerAddress'] ?? 'غير محدد',
              iconColor: const Color(0xFFEF4444),
            ),

            // Landmark
            if (order['nearestLandmark'] != null && order['nearestLandmark'].toString().isNotEmpty) ...[
              const SizedBox(height: 8),
              _buildInfoTile(
                Icons.place_rounded,
                'نقطة دالة',
                order['nearestLandmark'],
                iconColor: const Color(0xFFF59E0B),
              ),
            ],
            const SizedBox(height: 8),

            // Delivery Price
            _buildInfoTile(
              Icons.payments_rounded,
              'سعر التوصيل',
              '${deliveryPrice.toInt()} د.ع',
              iconColor: const Color(0xFF10B981),
            ),
            const SizedBox(height: 8),

            // Due to Restaurant
            _buildInfoTile(
              Icons.store_mall_directory_rounded,
              'قيمة الطلب للمطعم',
              '${dueToRestaurant.toInt()} د.ع',
              iconColor: const Color(0xFFE11D48),
            ),
            const SizedBox(height: 8),

            // Collect From Customer
            _buildInfoTile(
              Icons.assignment_turned_in_rounded,
              'المطلوب من الزبون',
              '${collectFromCustomer.toInt()} د.ع',
              iconColor: const Color(0xFF059669),
            ),

            const Padding(
              padding: EdgeInsets.symmetric(vertical: 16),
              child: Divider(color: Color(0xFFF1F5F9), height: 1),
            ),

            // Action Buttons based on status
            _buildActionButtons(context),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoTile(IconData icon, String label, String value, {required Color iconColor}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            padding: const EdgeInsets.all(6),
            decoration: BoxDecoration(
              color: iconColor.withOpacity(0.08),
              borderRadius: BorderRadius.circular(10),
            ),
            child: Icon(icon, size: 18, color: iconColor),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  label,
                  style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 11, fontWeight: FontWeight.w600),
                ),
                const SizedBox(height: 2),
                Text(
                  value,
                  style: const TextStyle(fontSize: 13.5, color: Color(0xFF1E293B), fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildActionButtons(BuildContext context) {
    switch (order['status']) {
      case 'assigned':
        return Column(
          children: [
            Row(
              children: [
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _openWaze(),
                    icon: const Icon(Icons.navigation_rounded, size: 18),
                    label: const Text('التنقل للمطعم'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF5C73FF),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: ElevatedButton.icon(
                    onPressed: () => _callRestaurant(),
                    icon: const Icon(Icons.call_rounded, size: 18),
                    label: const Text('اتصال'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => context.read<OrderBloc>().add(
                      OrderUpdateStatus(
                        orderId: order['id'],
                        status: 'arrived_at_restaurant',
                      ),
                    ),
                icon: const Icon(Icons.pin_drop_rounded, size: 20),
                label: const Text('لقد وصلت للمطعم'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF7C3AED),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
          ],
        );

      case 'arrived_at_restaurant':
        return SizedBox(
          width: double.infinity,
          child: ElevatedButton.icon(
            onPressed: () => context.read<OrderBloc>().add(
                  OrderUpdateStatus(
                    orderId: order['id'],
                    status: 'heading_to_customer',
                  ),
                ),
            icon: const Icon(Icons.local_mall_rounded, size: 20),
            label: const Text('تم الاستلام - في الطريق للعميل'),
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF7C3AED),
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
              padding: const EdgeInsets.symmetric(vertical: 16),
            ),
          ),
        );

      case 'heading_to_customer':
        return Column(
          children: [
            // Customer Contact
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _callCustomer(),
                    icon: const Icon(Icons.call_rounded, size: 18),
                    label: const Text('اتصال بالعميل'),
                    style: OutlinedButton.styleFrom(
                      side: BorderSide(color: Colors.grey.withOpacity(0.2)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  child: OutlinedButton.icon(
                    onPressed: () => _whatsappCustomer(),
                    icon: const Icon(Icons.chat_bubble_outline_rounded, size: 18),
                    label: const Text('واتساب'),
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFF10B981),
                      side: const BorderSide(color: Color(0xFF10B981)),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            SizedBox(
              width: double.infinity,
              child: ElevatedButton.icon(
                onPressed: () => context.read<OrderBloc>().add(
                      OrderUpdateStatus(
                        orderId: order['id'],
                        status: 'delivered',
                      ),
                    ),
                icon: const Icon(Icons.check_circle_rounded, size: 20),
                label: const Text('تم التوصيل وتسليم الطلب'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFF10B981),
                  foregroundColor: Colors.white,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  padding: const EdgeInsets.symmetric(vertical: 16),
                ),
              ),
            ),
          ],
        );

      default:
        return const SizedBox.shrink();
    }
  }

  void _openWaze() {
    final lat = order['restaurant']?['lat'] ?? 33.3128;
    final lng = order['restaurant']?['lng'] ?? 44.3615;
    launchUrl(Uri.parse('waze://ul?ll=$lat,$lng&navigate=yes'));
  }


  void _callRestaurant() {
    final phone = order['restaurant']?['phone'] ?? '';
    launchUrl(Uri.parse('tel:$phone'));
  }

  void _callCustomer() {
    final phone = order['customerPhone'] ?? '';
    launchUrl(Uri.parse('tel:$phone'));
  }

  void _whatsappCustomer() {
    final phone = order['customerPhone'] ?? '';
    launchUrl(Uri.parse('https://wa.me/$phone'));
  }
}
