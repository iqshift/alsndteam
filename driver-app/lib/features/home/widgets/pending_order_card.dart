import 'dart:async';
import 'package:flutter/material.dart';

class PendingOrderCard extends StatefulWidget {
  final Map<String, dynamic> order;
  final VoidCallback onAccept;
  final VoidCallback onReject;

  const PendingOrderCard({
    super.key,
    required this.order,
    required this.onAccept,
    required this.onReject,
  });

  @override
  State<PendingOrderCard> createState() => _PendingOrderCardState();
}

class _PendingOrderCardState extends State<PendingOrderCard>
    with SingleTickerProviderStateMixin {
  late AnimationController _controller;
  late Animation<double> _animation;
  late int _countdown;
  Timer? _timer;

  @override
  void initState() {
    super.initState();
    // الحصول على مهلة القرار المحددة ديناميكياً من السيرفر (افتراضي: 30 ثانية)
    final durationSecs = widget.order['decisionDuration'] ?? 30;
    _countdown = durationSecs;

    _controller = AnimationController(
      duration: Duration(seconds: durationSecs),
      vsync: this,
    );
    _animation = Tween<double>(begin: 1, end: 0).animate(_controller);
    _controller.forward();

    _timer = Timer.periodic(const Duration(seconds: 1), (timer) {
      if (mounted) {
        setState(() {
          _countdown--;
          if (_countdown <= 0) {
            timer.cancel();
            widget.onReject();
          }
        });
      }
    });
  }

  @override
  void dispose() {
    _controller.dispose();
    _timer?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final orderValue = double.tryParse(widget.order['orderValue']?.toString() ?? '0') ?? 0.0;
    final deliveryPrice = double.tryParse(widget.order['deliveryPrice']?.toString() ?? '0') ?? 0.0;
    final driverDeduction = double.tryParse(widget.order['driverDeduction']?.toString() ?? '0') ?? 0.0;
    final restaurantCommission = double.tryParse(widget.order['restaurantCommission']?.toString() ?? '0') ?? 0.0;

    final dueToRestaurant = orderValue - restaurantCommission;
    final collectFromCustomer = orderValue + deliveryPrice;
    final netWalletDelivery = deliveryPrice - driverDeduction;

    return Card(
      elevation: 0,
      margin: const EdgeInsets.only(bottom: 16),
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(20),
        side: BorderSide(
          color: _countdown > 10 ? const Color(0xFF5C73FF).withOpacity(0.1) : Colors.red.withOpacity(0.2),
          width: 1.5,
        ),
      ),
      color: _countdown > 10 ? Colors.white : Colors.red.shade50.withOpacity(0.5),
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(8),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF59E0B).withOpacity(0.08),
                    shape: BoxShape.circle,
                  ),
                  child: const Icon(
                    Icons.notification_important_rounded,
                    color: Color(0xFFF59E0B),
                    size: 24,
                  ),
                ),
                const SizedBox(width: 10),
                const Expanded(
                  child: Text(
                    'طلب شحن وتوصيل وارد!',
                    style: TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                ),
                if (widget.order['tier'] != null)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: const Color(0xFF5C73FF).withOpacity(0.08),
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: Text(
                      'موجة ${widget.order['tier']}',
                      style: const TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: Color(0xFF5C73FF),
                      ),
                    ),
                  ),
              ],
            ),
            const Divider(height: 24, thickness: 1),
            _buildInfoRow(
              Icons.storefront_rounded,
              'المطعم',
              widget.order['restaurantName'] ?? 'غير معروف',
              iconColor: const Color(0xFF5C73FF),
            ),
            const SizedBox(height: 8),
            _buildInfoRow(
              Icons.location_on_rounded,
              'عنوان العميل',
              widget.order['customerAddress'] ?? 'غير محدد',
              iconColor: const Color(0xFFEF4444),
            ),
            _buildInfoRow(
              Icons.payments_rounded,
              'سعر التوصيل',
              '${deliveryPrice.toInt()} د.ع',
              iconColor: const Color(0xFF10B981),
            ),
            const SizedBox(height: 8),
            _buildInfoRow(
              Icons.store_mall_directory_rounded,
              'قيمة الطلب للمطعم',
              '${dueToRestaurant.toInt()} د.ع',
              iconColor: const Color(0xFFE11D48),
            ),
            const SizedBox(height: 8),
            _buildInfoRow(
              Icons.assignment_turned_in_rounded,
              'المطلوب من الزبون',
              '${collectFromCustomer.toInt()} د.ع',
              iconColor: const Color(0xFF059669),
            ),
            const SizedBox(height: 18),
            // شريط التقدم التنازلي للمؤقت
            AnimatedBuilder(
              animation: _animation,
              builder: (context, child) {
                final color = _countdown > 10 ? const Color(0xFF5C73FF) : const Color(0xFFEF4444);
                return Column(
                  children: [
                    ClipRRect(
                      borderRadius: BorderRadius.circular(8),
                      child: LinearProgressIndicator(
                        value: _animation.value,
                        minHeight: 5,
                        backgroundColor: const Color(0xFFF1F5F9),
                        valueColor: AlwaysStoppedAnimation<Color>(color),
                      ),
                    ),
                    const SizedBox(height: 6),
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          'تخطي تلقائي خلال $_countdown ثانية',
                          style: TextStyle(
                            color: color,
                            fontSize: 11,
                            fontWeight: FontWeight.bold,
                          ),
                        ),
                        const Icon(Icons.timer_outlined, size: 14, color: Colors.grey),
                      ],
                    ),
                  ],
                );
              },
            ),
            const SizedBox(height: 18),
            Row(
              children: [
                Expanded(
                  flex: 2,
                  child: ElevatedButton(
                    onPressed: widget.onAccept,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF10B981),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                      elevation: 0,
                    ),
                    child: const Row(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Icon(Icons.check_rounded, size: 18),
                        SizedBox(width: 6),
                        Text(
                          'قبول الطلب',
                          style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                Expanded(
                  flex: 1,
                  child: OutlinedButton(
                    onPressed: widget.onReject,
                    style: OutlinedButton.styleFrom(
                      foregroundColor: const Color(0xFFEF4444),
                      side: const BorderSide(color: Color(0xFFEF4444)),
                      padding: const EdgeInsets.symmetric(vertical: 12),
                      shape: RoundedRectangleBorder(
                        borderRadius: BorderRadius.circular(12),
                      ),
                    ),
                    child: const Text(
                      'تخطي',
                      style: TextStyle(fontSize: 14, fontWeight: FontWeight.bold),
                    ),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildInfoRow(IconData icon, String label, String value, {required Color iconColor}) {
    return Row(
      children: [
        Container(
          padding: const EdgeInsets.all(5),
          decoration: BoxDecoration(
            color: iconColor.withOpacity(0.08),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, size: 16, color: iconColor),
        ),
        const SizedBox(width: 8),
        Text(
          '$label: ',
          style: const TextStyle(color: Color(0xFF94A3B8), fontSize: 12.5, fontWeight: FontWeight.w600),
        ),
        Expanded(
          child: Text(
            value,
            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF1E293B)),
          ),
        ),
      ],
    );
  }
}
