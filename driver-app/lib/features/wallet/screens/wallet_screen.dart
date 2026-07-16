import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:driver_app/features/wallet/bloc/wallet_bloc.dart';
import 'package:intl/intl.dart' as intl;
import 'package:permission_handler/permission_handler.dart';
import 'package:driver_app/features/wallet/screens/qr_scanner_screen.dart';

class WalletScreen extends StatefulWidget {
  const WalletScreen({super.key});

  @override
  State<WalletScreen> createState() => _WalletScreenState();
}

class _WalletScreenState extends State<WalletScreen> {
  final _codeController = TextEditingController();
  final Set<String> _expandedTxIds = {};

  Future<void> _startQRScan() async {
    final status = await Permission.camera.request();
    if (status.isGranted) {
      if (!mounted) return;
      final String? scannedCode = await Navigator.of(context).push<String>(
        MaterialPageRoute(
          builder: (context) => const QrScannerScreen(),
        ),
      );

      if (scannedCode != null && scannedCode.isNotEmpty) {
        setState(() {
          _codeController.text = scannedCode;
        });
      }
    } else {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('إذن الكاميرا مطلوب لمسح الـ QR code', style: TextStyle(fontFamily: 'Cairo')),
          backgroundColor: Color(0xFFEF4444),
          behavior: SnackBarBehavior.floating,
        ),
      );
    }
  }

  @override
  void initState() {
    super.initState();
    context.read<WalletBloc>().add(WalletLoadBalance());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FE),
      body: BlocConsumer<WalletBloc, WalletState>(
        listener: (context, state) {
          if (state is WalletRechargeSuccess) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text('تم شحن الرصيد بنجاح', style: TextStyle(fontFamily: 'Cairo')),
                backgroundColor: const Color(0xFF10B981),
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            );
            _codeController.clear();
          } else if (state is WalletError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(state.message, style: const TextStyle(fontFamily: 'Cairo')),
                backgroundColor: const Color(0xFFEF4444),
                behavior: SnackBarBehavior.floating,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            );
          }
        },
        builder: (context, state) {
          if (state is WalletLoading) {
            return const Center(child: CircularProgressIndicator());
          }

          double? balance;
          List<dynamic> transactions = const [];

          if (state is WalletLoaded) {
            balance = state.balance;
            transactions = state.transactions;
          } else if (state is WalletError && state.balance != null) {
            balance = state.balance;
            transactions = state.transactions ?? const [];
          }

          if (balance != null) {
            return SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // Premium Gradient Balance Card
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      gradient: const LinearGradient(
                        colors: [Color(0xFF859DFB), Color(0xFF5C73FF)],
                        begin: Alignment.topLeft,
                        end: Alignment.bottomRight,
                      ),
                      borderRadius: BorderRadius.circular(24),
                      boxShadow: [
                        BoxShadow(
                          color: const Color(0xFF5C73FF).withOpacity(0.3),
                          blurRadius: 20,
                          offset: const Offset(0, 10),
                        )
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.center,
                      children: [
                        const Text(
                          'الرصيد الحالي بالمحفظة',
                          style: TextStyle(
                            fontSize: 14,
                            fontWeight: FontWeight.w600,
                            color: Colors.white70,
                          ),
                        ),
                        const SizedBox(height: 10),
                        Text(
                          '${balance.toInt().toString().replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')} د.ع',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 34,
                            fontWeight: FontWeight.w900,
                            fontFamily: 'Plus Jakarta Sans',
                          ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 28),

                  // Recharge Section
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4),
                    child: Text(
                      'تعبئة رصيد جديد',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _codeController,
                          decoration: InputDecoration(
                            hintText: 'أدخل كود الشحن المكون من 12 رقماً',
                            suffixIcon: IconButton(
                              icon: const Icon(
                                Icons.qr_code_scanner_rounded, 
                                color: Color(0xFF5C73FF),
                                size: 26,
                              ),
                              onPressed: _startQRScan,
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      ElevatedButton(
                        onPressed: () {
                          if (_codeController.text.isNotEmpty) {
                            context.read<WalletBloc>().add(
                                  WalletRechargeRequested(
                                    code: _codeController.text,
                                  ),
                                );
                          }
                        },
                        style: ElevatedButton.styleFrom(
                          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
                          backgroundColor: const Color(0xFF5C73FF),
                        ),
                        child: const Text('تفعيل'),
                      ),
                    ],
                  ),
                  const SizedBox(height: 32),

                  // Transactions
                  const Padding(
                    padding: EdgeInsets.symmetric(horizontal: 4),
                    child: Text(
                      'سجل المعاملات الأخيرة',
                      style: TextStyle(
                        fontSize: 16,
                        fontWeight: FontWeight.w900,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                  ),
                  const SizedBox(height: 12),
                  if (transactions.isEmpty)
                    Center(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 40),
                        child: Column(
                          children: [
                            Container(
                              padding: const EdgeInsets.all(16),
                              decoration: BoxDecoration(
                                color: const Color(0xFF5C73FF).withOpacity(0.06),
                                shape: BoxShape.circle,
                              ),
                              child: const Icon(
                                Icons.receipt_long_rounded,
                                size: 48,
                                color: Color(0xFF94A3B8),
                              ),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'لا توجد معاملات بعد',
                              style: TextStyle(color: Color(0xFF94A3B8), fontWeight: FontWeight.bold),
                            ),
                          ],
                        ),
                      ),
                    )
                  else
                    ListView.builder(
                      shrinkWrap: true,
                      physics: const NeverScrollableScrollPhysics(),
                      itemCount: transactions.length,
                      itemBuilder: (context, index) {
                        final tx = transactions[index];
                        return _buildTransactionTile(tx);
                      },
                    ),
                ],
              ),
            );
          }

          if (state is WalletError) {
            return Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisAlignment: MainAxisAlignment.center,
                  children: [
                    Container(
                      padding: const EdgeInsets.all(16),
                      decoration: BoxDecoration(
                        color: const Color(0xFFEF4444).withOpacity(0.1),
                        shape: BoxShape.circle,
                      ),
                      child: const Icon(
                        Icons.error_outline_rounded,
                        color: Color(0xFFEF4444),
                        size: 48,
                      ),
                    ),
                    const SizedBox(height: 16),
                    Text(
                      state.message,
                      textAlign: TextAlign.center,
                      style: const TextStyle(
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.bold,
                        fontSize: 16,
                        color: Color(0xFF1E293B),
                      ),
                    ),
                    const SizedBox(height: 24),
                    ElevatedButton.icon(
                      onPressed: () {
                        context.read<WalletBloc>().add(WalletLoadBalance());
                      },
                      icon: const Icon(Icons.refresh_rounded),
                      label: const Text(
                        'إعادة المحاولة',
                        style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                      ),
                      style: ElevatedButton.styleFrom(
                        backgroundColor: const Color(0xFF5C73FF),
                        padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 12),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                    ),
                  ],
                ),
              ),
            );
          }

          return const SizedBox.shrink();
        },
      ),
    );
  }

  Widget _buildTransactionTile(Map<String, dynamic> tx) {
    final isRecharge = tx['type'] == 'recharge';
    final color = isRecharge ? const Color(0xFF10B981) : const Color(0xFFEF4444);
    final icon = isRecharge ? Icons.add_circle_outline_rounded : Icons.remove_circle_outline_rounded;
    final label = isRecharge ? 'شحن رصيد' : 'خصم عمولة';
    final txId = tx['id']?.toString() ?? '';
    final isExpanded = _expandedTxIds.contains(txId);
    final order = tx['order'];

    return Card(
      margin: const EdgeInsets.only(bottom: 10),
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: isRecharge
            ? null
            : () {
                setState(() {
                  if (isExpanded) {
                    _expandedTxIds.remove(txId);
                  } else {
                    _expandedTxIds.add(txId);
                  }
                });
              },
        child: Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: color.withOpacity(0.08),
                      shape: BoxShape.circle,
                    ),
                    child: Icon(icon, color: color, size: 22),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          label,
                          style: const TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 14,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          intl.DateFormat('yyyy-MM-dd HH:mm').format(
                            DateTime.parse(tx['createdAt']),
                          ),
                          style: const TextStyle(fontSize: 11, color: Color(0xFF94A3B8)),
                        ),
                      ],
                    ),
                  ),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.end,
                    children: [
                      Text(
                        '${isRecharge ? "+" : "-"}${tx['amount']} د.ع',
                        style: TextStyle(
                          fontFamily: 'Plus Jakarta Sans',
                          fontWeight: FontWeight.bold,
                          fontSize: 14,
                          color: color,
                        ),
                      ),
                      if (isRecharge) ...[
                        const SizedBox(height: 2),
                        Text(
                          'الرصيد: ${tx['balanceAfter']} د.ع',
                          style: const TextStyle(fontSize: 11, color: Color(0xFF64748B)),
                        ),
                      ],
                    ],
                  ),
                ],
              ),
              if (isExpanded && order != null) ...[
                const Divider(height: 20, thickness: 1, color: Color(0xFFE2E8F0)),
                Padding(
                  padding: const EdgeInsets.only(top: 4, bottom: 4),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      _buildDetailRow(
                        'رقم الطلب:',
                        '#${order['orderNumber'] ?? order['id'].toString().substring(0, 8)}',
                      ),
                      const SizedBox(height: 6),
                      _buildDetailRow(
                        'سعر الطلب:',
                        '${order['orderValue']} د.ع',
                      ),
                      const SizedBox(height: 6),
                      _buildDetailRow(
                        'سعر التوصيل:',
                        '${order['deliveryPrice']} د.ع',
                      ),
                      const SizedBox(height: 6),
                      _buildDetailRow(
                        'عمولة التوصيل:',
                        '${order['driverDeduction']} د.ع',
                      ),
                      const SizedBox(height: 6),
                      _buildDetailRow(
                        'عمولة المطعم:',
                        '${order['restaurantCommission']} د.ع',
                      ),
                      const SizedBox(height: 6),
                      _buildDetailRow(
                        'اسم المطعم:',
                        '${order['restaurant']?['name'] ?? 'غير متوفر'}',
                      ),
                      const SizedBox(height: 6),
                      _buildDetailRow(
                        'منطقة التوصيل:',
                        '${order['zone']?['name'] ?? 'غير متوفر'}',
                      ),
                    ],
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(
          label,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.w600,
            color: Color(0xFF64748B),
            fontFamily: 'Cairo',
          ),
        ),
        Text(
          value,
          style: const TextStyle(
            fontSize: 12,
            fontWeight: FontWeight.bold,
            color: Color(0xFF1E293B),
            fontFamily: 'Cairo',
          ),
        ),
      ],
    );
  }
}
