import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:restaurant_app/features/home/bloc/order_bloc.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:restaurant_app/core/config/constants.dart';
import 'package:restaurant_app/features/auth/bloc/auth_bloc.dart';

// ── ألوان ثابتة ──────────────────────────────────
const _primary   = Color(0xFF5C6BC0);
const _success   = Color(0xFF10B981);
const _warning   = Color(0xFFF59E0B);
const _danger    = Color(0xFFEF4444);
const _dark      = Color(0xFF1E293B);
const _muted     = Color(0xFF64748B);
const _bgPage    = Color(0xFFF0F2FA);

// ─────────────────────────────────────────────────
class OrderTrackingScreen extends StatelessWidget {
  final Map<String, dynamic> order;
  const OrderTrackingScreen({super.key, required this.order});

  @override
  Widget build(BuildContext context) {
    return _OrderCard(order: order, isFullScreen: true);
  }
}

// ─────────────────────────────────────────────────
/// بطاقة الطلب الكاملة
class _OrderCard extends StatefulWidget {
  final Map<String, dynamic> order;
  final bool isFullScreen;

  const _OrderCard({required this.order, this.isFullScreen = false});

  @override
  State<_OrderCard> createState() => _OrderCardState();
}

class _OrderCardState extends State<_OrderCard> {
  bool _isExpanded = false;

  @override
  Widget build(BuildContext context) {
    final order  = widget.order;
    final status = order['status'] as String? ?? '';
    final isCancelled     = status == 'cancelled';
    final isNoDrivers     = status == 'no_drivers_available';
    final isSpecialStatus = isCancelled || isNoDrivers;

    final primaryColor = Theme.of(context).primaryColor;
    Color statusColor = primaryColor;
    String statusLabel = _statusLabel(status);
    IconData statusIcon = _statusIcon(status);
    if (isCancelled)           { statusColor = _danger;  }
    if (isNoDrivers)           { statusColor = _warning; }
    if (status == 'delivered') { statusColor = _success; }

    // ─── التحقق من الاشتراك ───
    final authState = context.read<AuthBloc>().state;
    Map<String, dynamic>? restaurantProfile;
    if (authState is AuthAuthenticated) {
      restaurantProfile = authState.user;
    }

    final billingMode = restaurantProfile?['billingMode']?.toString() ?? 'commission';
    final subExpiresStr = restaurantProfile?['subscriptionExpiresAt']?.toString();
    bool isSubscribed = false;
    if (billingMode == 'subscription') {
      if (subExpiresStr != null) {
        final expires = DateTime.tryParse(subExpiresStr);
        if (expires != null && expires.isAfter(DateTime.now())) {
          isSubscribed = true;
        }
      }
    }

    final double orderValue = double.tryParse(order['orderValue']?.toString() ?? '0') ?? 0.0;
    final double commission = double.tryParse(order['restaurantCommission']?.toString() ?? '0') ?? 0.0;
    final double deliveryPrice = double.tryParse(order['deliveryPrice']?.toString() ?? '0') ?? 0.0;
    final double afterDiscount = orderValue - commission;

    final bool showFinancialDetails = !isSubscribed || commission > 0;

    return Container(
      margin: widget.isFullScreen
          ? const EdgeInsets.fromLTRB(14, 14, 14, 14)
          : EdgeInsets.zero,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        boxShadow: [
          BoxShadow(
            color: primaryColor.withOpacity(0.03),
            blurRadius: 24,
            offset: const Offset(0, 8),
          ),
        ],
      ),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [

          // ── رأس البطاقة ─────────────────────────
          _CardHeader(
            orderId: order['id']?.toString() ?? '',
            orderNumber: order['orderNumber']?.toString(),
            status: status,
            statusColor: statusColor,
            statusLabel: statusLabel,
            statusIcon: statusIcon,
            orderValue: order['orderValue'],
            deliveryPrice: order['deliveryPrice'],
          ),

          // ── شريط التقدم ──────────────────────────
          if (!isSpecialStatus) ...[
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 0, 16, 0),
              child: _HorizontalStepper(currentStatus: status),
            ),
          ] else ...[
            _StatusBanner(
              color: statusColor,
              icon: statusIcon,
              label: statusLabel,
              subtitle: isCancelled
                  ? 'تم إلغاء هذا الطلب.'
                  : 'لا يوجد سائق متاح حالياً في المنطقة.',
            ),
          ],

          // ── Collapsible: تفاصيل الطلب ────────────
          const _Divider(),
          _ExpandableSection(
            title: 'معلومات الطلب',
            icon: Icons.info_outline_rounded,
            isExpanded: _isExpanded,
            onToggle: () => setState(() => _isExpanded = !_isExpanded),
            children: [
              _InfoRow(Icons.phone_rounded,       'العميل',    order['customerPhone'] ?? '',   const Color(0xFF0EA5E9)),
              if ((order['customerAddress'] ?? '').toString().isNotEmpty)
                _InfoRow(Icons.location_on_rounded, 'العنوان', order['customerAddress'] ?? '', _danger),
              _InfoRow(Icons.map_rounded,         'المنطقة',   order['zone']?['name'] ?? '',   primaryColor),
              if ((order['nearestLandmark'] ?? '').toString().isNotEmpty)
                _InfoRow(Icons.place_rounded, 'نقطة دالة', order['nearestLandmark'], _warning),
              
              // تفاصيل المبالغ والعمولات للمطاعم غير المشتركة
              if (showFinancialDetails) ...[
                const Padding(
                  padding: EdgeInsets.symmetric(vertical: 8),
                  child: Divider(height: 1, thickness: 1, color: Color(0xFFE2E8F0)),
                ),
                Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Row(
                    children: [
                      Icon(Icons.payment_rounded, color: primaryColor, size: 16),
                      const SizedBox(width: 8),
                      const Text(
                        'التفاصيل المالية والخصومات',
                        style: TextStyle(
                          fontSize: 12,
                          fontWeight: FontWeight.bold,
                          color: _dark,
                          fontFamily: 'Cairo',
                        ),
                      ),
                    ],
                  ),
                ),
                _InfoRow(Icons.monetization_on_outlined, 'سعر الطلب', '${orderValue.toStringAsFixed(0)} د.ع', _success),
                _InfoRow(Icons.percent_rounded, 'خصم عمولة المطعم', '${commission.toStringAsFixed(0)} د.ع', _danger),
                _InfoRow(Icons.account_balance_wallet_outlined, 'السعر بعد الخصم', '${afterDiscount.toStringAsFixed(0)} د.ع', primaryColor),
                _InfoRow(Icons.delivery_dining_rounded, 'سعر التوصيل', '${deliveryPrice.toStringAsFixed(0)} د.ع', _warning),
              ]
            ],
          ),

          // ── معلومات السائق ───────────────────────
          if (order['driver'] != null && order['driver']['name'] != null) ...[
            const _Divider(),
            _DriverRow(order: order),
          ],

          // ── زر الإلغاء ───────────────────────────
          if (['searching_driver', 'no_drivers_available'].contains(status)) ...[
            const SizedBox(height: 4),
            _CancelButton(orderId: order['id']),
          ],

          const SizedBox(height: 16),
        ],
      ),
    );
  }

  static String _statusLabel(String s) => {
    'searching_driver':      'جاري البحث عن سائق...',
    'assigned':              'السائق في الطريق للمطعم',
    'arrived_at_restaurant': 'السائق وصل للمطعم',
    'heading_to_customer':   'جاري التوصيل للعميل',
    'delivered':             'تم التوصيل بنجاح ✓',
    'cancelled':             'تم إلغاء الطلب',
    'no_drivers_available':  'لا يوجد سائق متاح',
  }[s] ?? s;

  static IconData _statusIcon(String s) => {
    'searching_driver':      Icons.search_rounded,
    'assigned':              Icons.two_wheeler_rounded,
    'arrived_at_restaurant': Icons.store_rounded,
    'heading_to_customer':   Icons.route_rounded,
    'delivered':             Icons.check_circle_rounded,
    'cancelled':             Icons.cancel_rounded,
    'no_drivers_available':  Icons.warning_amber_rounded,
  }[s] ?? Icons.info_rounded;
}

// ─────────────────────────────────────────────────
/// رأس البطاقة - الحالة + المبالغ
class _CardHeader extends StatelessWidget {
  final String orderId;
  final String? orderNumber;
  final String status;
  final Color statusColor;
  final String statusLabel;
  final IconData statusIcon;
  final dynamic orderValue;
  final dynamic deliveryPrice;

  const _CardHeader({
    required this.orderId,
    this.orderNumber,
    required this.status,
    required this.statusColor,
    required this.statusLabel,
    required this.statusIcon,
    required this.orderValue,
    required this.deliveryPrice,
  });

  @override
  Widget build(BuildContext context) {
    String orderNum = orderNumber ?? '';
    if (orderNum.isEmpty) {
      final hexSnippet = orderId.replaceAll('-', '');
      if (hexSnippet.length >= 8) {
        final parsed = int.tryParse(hexSnippet.substring(0, 8), radix: 16);
        if (parsed != null) {
          orderNum = parsed.toString();
        }
      }
    }
    if (orderNum.isEmpty) orderNum = orderId;
    if (orderNum.length > 6) {
      orderNum = orderNum.substring(0, 6);
    }
    return Container(
      padding: const EdgeInsets.fromLTRB(18, 18, 18, 14),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [statusColor.withOpacity(0.01), Colors.white],
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
        ),
        borderRadius: const BorderRadius.vertical(top: Radius.circular(24)),
      ),
      child: Row(
        children: [
          // أيقونة الحالة
          Container(
            padding: const EdgeInsets.all(10),
            decoration: BoxDecoration(
              color: statusColor.withOpacity(0.12),
              shape: BoxShape.circle,
            ),
            child: Icon(statusIcon, color: statusColor, size: 22),
          ),
          const SizedBox(width: 12),
          // نص الحالة
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  'طلب رقم: #$orderNum',
                  style: const TextStyle(
                    fontSize: 12,
                    fontWeight: FontWeight.bold,
                    color: _dark,
                    fontFamily: 'Cairo',
                  ),
                ),
                const SizedBox(height: 2),
                Text(
                  statusLabel,
                  style: TextStyle(
                    fontWeight: FontWeight.w800,
                    fontSize: 14,
                    color: statusColor,
                    fontFamily: 'Cairo',
                  ),
                ),
              ],
            ),
          ),
          // المبالغ
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              _AmountChip(label: 'الطلب', value: '$orderValue'),
              const SizedBox(height: 4),
              _AmountChip(label: 'التوصيل', value: '$deliveryPrice'),
            ],
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────
/// شريط التقدم الأفقي
class _HorizontalStepper extends StatelessWidget {
  final String currentStatus;
  const _HorizontalStepper({required this.currentStatus});

  static const _steps = [
    {'s': 'searching_driver',      'label': 'بحث',     'icon': Icons.search_rounded},
    {'s': 'assigned',              'label': 'قُبل',    'icon': Icons.two_wheeler_rounded},
    {'s': 'arrived_at_restaurant', 'label': 'استلام',  'icon': Icons.store_rounded},
    {'s': 'heading_to_customer',   'label': 'توصيل',   'icon': Icons.route_rounded},
    {'s': 'delivered',             'label': 'تم ✓',    'icon': Icons.check_circle_rounded},
  ];

  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).primaryColor;
    int active = _steps.indexWhere((s) => s['s'] == currentStatus);
    if (active == -1) active = currentStatus == 'delivered' ? 4 : 0;
    final progress = (active + 1) / _steps.length;

    return Column(
      children: [
        const SizedBox(height: 16),
        // البطاقات
        SizedBox(
          height: 88,
          child: Row(
            children: List.generate(_steps.length, (i) {
              final isCompleted = i < active;
              final isActive    = i == active;
              final isPending   = i > active;

              final Color fg = isCompleted ? _success
                             : isActive    ? primaryColor
                             : const Color(0xFFCBD5E1);
              final Color bg = isCompleted ? _success.withOpacity(0.07)
                             : isActive    ? primaryColor.withOpacity(0.08)
                             : const Color(0xFFF8FAFC);
              final Color border = isCompleted ? _success.withOpacity(0.3)
                                 : isActive    ? primaryColor.withOpacity(0.5)
                                 : const Color(0xFFE8ECF4);

              return Expanded(
                child: Row(
                  children: [
                    Expanded(
                      child: AnimatedContainer(
                        duration: const Duration(milliseconds: 400),
                        curve: Curves.easeInOut,
                        padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 2),
                        decoration: BoxDecoration(
                          color: bg,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: border, width: isActive ? 1.8 : 1),
                          boxShadow: isActive ? [
                            BoxShadow(color: primaryColor.withOpacity(0.2),
                                      blurRadius: 10, offset: const Offset(0, 3))
                          ] : [],
                        ),
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            AnimatedContainer(
                              duration: const Duration(milliseconds: 400),
                              width: isActive ? 36 : 30,
                              height: isActive ? 36 : 30,
                              decoration: BoxDecoration(
                                color: fg.withOpacity(isActive ? 0.15 : 0.1),
                                shape: BoxShape.circle,
                              ),
                              child: Icon(
                                isCompleted ? Icons.check_rounded : _steps[i]['icon'] as IconData,
                                color: isPending ? const Color(0xFFCBD5E1) : fg,
                                size: isActive ? 18 : 14,
                              ),
                            ),
                            const SizedBox(height: 5),
                            Text(
                              _steps[i]['label'] as String,
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                fontSize: isActive ? 10.5 : 9,
                                fontWeight: isActive ? FontWeight.w800 : FontWeight.w600,
                                color: isPending ? const Color(0xFFCBD5E1) : fg,
                                fontFamily: 'Cairo',
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                    if (i < _steps.length - 1)
                      AnimatedContainer(
                        duration: const Duration(milliseconds: 400),
                        width: 6, height: 2,
                        margin: const EdgeInsets.only(bottom: 10),
                        decoration: BoxDecoration(
                          color: i < active
                              ? _success.withOpacity(0.5)
                              : const Color(0xFFE8ECF4),
                          borderRadius: BorderRadius.circular(2),
                        ),
                      ),
                  ],
                ),
              );
            }),
          ),
        ),

        const SizedBox(height: 8),
      ],
    );
  }
}

// ─────────────────────────────────────────────────
class _StatusBanner extends StatelessWidget {
  final Color color;
  final IconData icon;
  final String label;
  final String subtitle;
  const _StatusBanner({required this.color, required this.icon,
      required this.label, required this.subtitle});

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 12, 16, 8),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: color.withOpacity(0.07),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: color.withOpacity(0.2)),
      ),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.all(8),
          decoration: BoxDecoration(color: color.withOpacity(0.15), shape: BoxShape.circle),
          child: Icon(icon, color: color, size: 18),
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(label, style: TextStyle(fontWeight: FontWeight.w800,
                color: color, fontSize: 13, fontFamily: 'Cairo')),
            Text(subtitle, style: TextStyle(color: color.withOpacity(0.75),
                fontSize: 11, fontFamily: 'Cairo')),
          ],
        )),
      ]),
    );
  }
}

// ─────────────────────────────────────────────────
class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;
  final Color color;
  const _InfoRow(this.icon, this.label, this.value, this.color);

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 6),
      child: Row(children: [
        Container(
          padding: const EdgeInsets.all(6),
          decoration: BoxDecoration(
            color: color.withOpacity(0.1),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Icon(icon, color: color, size: 14),
        ),
        const SizedBox(width: 10),
        SizedBox(
          width: 70,
          child: Text(label, style: const TextStyle(
              fontSize: 11, color: _muted, fontFamily: 'Cairo')),
        ),
        Expanded(child: Text(value, textAlign: TextAlign.left,
            style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w700,
                color: _dark, fontFamily: 'Cairo'))),
      ]),
    );
  }
}

// ─────────────────────────────────────────────────
class _DriverRow extends StatelessWidget {
  final Map<String, dynamic> order;
  const _DriverRow({required this.order});

  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).primaryColor;
    final driver = order['driver'] as Map<String, dynamic>;
    final photoPath = driver['photo'] as String?;
    final String? photoUrl = (photoPath != null && photoPath.isNotEmpty)
        ? '${AppConstants.socketUrl}$photoPath'
        : null;
    return Container(
      margin: const EdgeInsets.fromLTRB(16, 4, 16, 4),
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          colors: [_success.withOpacity(0.06), primaryColor.withOpacity(0.06)],
          begin: Alignment.centerRight,
          end: Alignment.centerLeft,
        ),
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: _success.withOpacity(0.2)),
      ),
      child: Row(children: [
        Container(
          width: 44, height: 44,
          decoration: BoxDecoration(
            gradient: photoUrl != null
                ? null
                : LinearGradient(
                    colors: [primaryColor, _success],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
            shape: BoxShape.circle,
            image: photoUrl != null
                ? DecorationImage(
                    image: NetworkImage(photoUrl),
                    fit: BoxFit.cover,
                  )
                : null,
            boxShadow: [BoxShadow(color: primaryColor.withOpacity(0.3),
                blurRadius: 8, offset: const Offset(0, 3))],
          ),
          child: photoUrl == null
              ? const Icon(Icons.two_wheeler_rounded, color: Colors.white, size: 22)
              : null,
        ),
        const SizedBox(width: 12),
        Expanded(child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(driver['name'] ?? '', style: const TextStyle(
                fontWeight: FontWeight.w800, fontSize: 14,
                color: _dark, fontFamily: 'Cairo')),
            const SizedBox(height: 2),
            Row(children: [
              const Icon(Icons.phone_rounded, size: 11, color: _muted),
              const SizedBox(width: 4),
              Text(driver['phone'] ?? '', style: const TextStyle(
                  fontSize: 11, color: _muted, fontFamily: 'Cairo')),
            ]),
          ],
        )),
        // أزرار التواصل
        _CircleBtn(Icons.call_rounded, _success, () =>
            launchUrl(Uri.parse('tel:${driver['phone']}'))),
        const SizedBox(width: 6),
        _CircleBtn(Icons.chat_rounded, const Color(0xFF25D366), () =>
            launchUrl(Uri.parse('https://wa.me/${driver['phone']}'))),
      ]),
    );
  }
}

class _CircleBtn extends StatelessWidget {
  final IconData icon;
  final Color color;
  final VoidCallback onTap;
  const _CircleBtn(this.icon, this.color, this.onTap);

  @override
  Widget build(BuildContext context) => GestureDetector(
    onTap: onTap,
    child: Container(
      width: 36, height: 36,
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        shape: BoxShape.circle,
        border: Border.all(color: color.withOpacity(0.25)),
      ),
      child: Icon(icon, color: color, size: 16),
    ),
  );
}

// ─────────────────────────────────────────────────
class _CancelButton extends StatelessWidget {
  final String orderId;
  const _CancelButton({required this.orderId});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.fromLTRB(16, 4, 16, 0),
      child: GestureDetector(
        onTap: () => _showDialog(context),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 12),
          decoration: BoxDecoration(
            color: _danger.withOpacity(0.06),
            borderRadius: BorderRadius.circular(14),
            border: Border.all(color: _danger.withOpacity(0.2)),
          ),
          child: Row(mainAxisAlignment: MainAxisAlignment.center, children: [
            Icon(Icons.cancel_rounded, color: _danger.withOpacity(0.8), size: 17),
            const SizedBox(width: 8),
            Text('إلغاء الطلب', style: TextStyle(
                fontWeight: FontWeight.w700, fontSize: 13,
                color: _danger, fontFamily: 'Cairo')),
          ]),
        ),
      ),
    );
  }

  void _showDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Text('تأكيد الإلغاء',
            style: TextStyle(fontWeight: FontWeight.bold, fontFamily: 'Cairo')),
        content: const Text('هل تريد إلغاء طلب السائق؟',
            style: TextStyle(fontFamily: 'Cairo')),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('تراجع', style: TextStyle(fontFamily: 'Cairo')),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(ctx);
              context.read<OrderBloc>().add(OrderCancelRequested(orderId: orderId));
            },
            style: ElevatedButton.styleFrom(
              backgroundColor: _danger,
              foregroundColor: Colors.white,
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
            ),
            child: const Text('نعم، إلغاء', style: TextStyle(fontFamily: 'Cairo')),
          ),
        ],
      ),
    );
  }
}

// ─────────────────────────────────────────────────
class _AmountChip extends StatelessWidget {
  final String label;
  final String value;
  const _AmountChip({required this.label, required this.value});

  @override
  Widget build(BuildContext context) => Container(
    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
    decoration: BoxDecoration(
      color: const Color(0xFFF1F5F9),
      borderRadius: BorderRadius.circular(20),
      border: Border.all(color: const Color(0xFFE2E8F0)),
    ),
    child: RichText(
      text: TextSpan(
        style: const TextStyle(fontFamily: 'Cairo'),
        children: [
          TextSpan(text: '$label: ',
              style: const TextStyle(fontSize: 10, color: Color(0xFF64748B), fontWeight: FontWeight.w600)),
          TextSpan(text: value,
              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w800, color: Color(0xFF1E293B))),
        ],
      ),
    ),
  );
}

class _Divider extends StatelessWidget {
  const _Divider();

  @override
  Widget build(BuildContext context) =>
      const Divider(height: 1, thickness: 1, color: Color(0xFFF0F2FA),
          indent: 16, endIndent: 16);
}

// ─────────────────────────────────────────────────
/// قسم قابل للطي (Accordion)
class _ExpandableSection extends StatelessWidget {
  final String title;
  final IconData icon;
  final bool isExpanded;
  final VoidCallback onToggle;
  final List<Widget> children;

  const _ExpandableSection({
    required this.title,
    required this.icon,
    required this.isExpanded,
    required this.onToggle,
    required this.children,
  });

  @override
  Widget build(BuildContext context) {
    final primaryColor = Theme.of(context).primaryColor;
    return Column(
      mainAxisSize: MainAxisSize.min,
      children: [
        // ── رأس القسم (زر التبديل) ───────────────
        InkWell(
          onTap: onToggle,
          borderRadius: BorderRadius.circular(12),
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            child: Row(
              children: [
                Container(
                  padding: const EdgeInsets.all(6),
                  decoration: BoxDecoration(
                    color: primaryColor.withOpacity(0.1),
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Icon(icon, color: primaryColor, size: 15),
                ),
                const SizedBox(width: 10),
                Text(
                  title,
                  style: const TextStyle(
                    fontSize: 13,
                    fontWeight: FontWeight.w700,
                    color: _dark,
                    fontFamily: 'Cairo',
                  ),
                ),
                const Spacer(),
                // سهم يتحرك عند الفتح/الإغلاق
                AnimatedRotation(
                  turns: isExpanded ? 0.5 : 0,
                  duration: const Duration(milliseconds: 250),
                  child: Container(
                    padding: const EdgeInsets.all(4),
                    decoration: BoxDecoration(
                      color: isExpanded
                          ? primaryColor.withOpacity(0.1)
                          : const Color(0xFFF1F4FB),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(
                      Icons.keyboard_arrow_down_rounded,
                      color: isExpanded ? primaryColor : _muted,
                      size: 18,
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),

        AnimatedCrossFade(
          duration: const Duration(milliseconds: 280),
          firstCurve: Curves.easeInOut,
          secondCurve: Curves.easeInOut,
          sizeCurve: Curves.easeInOut,
          crossFadeState: isExpanded
              ? CrossFadeState.showSecond
              : CrossFadeState.showFirst,
          firstChild: const SizedBox(width: double.infinity),
          secondChild: Container(
            width: double.infinity,
            decoration: BoxDecoration(
              color: const Color(0xFFF7F9FF),
              border: Border(
                top: BorderSide(color: primaryColor.withOpacity(0.08)),
                bottom: BorderSide(color: primaryColor.withOpacity(0.08)),
              ),
            ),
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: children,
            ),
          ),
        ),
      ],
    );
  }
}
