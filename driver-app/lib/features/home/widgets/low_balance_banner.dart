import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:driver_app/features/wallet/bloc/wallet_bloc.dart';
import 'package:driver_app/features/wallet/screens/wallet_screen.dart';

class LowBalanceBanner extends StatefulWidget {
  const LowBalanceBanner({super.key});

  @override
  State<LowBalanceBanner> createState() => _LowBalanceBannerState();
}

class _LowBalanceBannerState extends State<LowBalanceBanner> {
  @override
  void initState() {
    super.initState();
    final walletBloc = context.read<WalletBloc>();
    if (walletBloc.state is WalletInitial) {
      walletBloc.add(WalletLoadBalance());
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<WalletBloc, WalletState>(
      builder: (context, state) {
        if (state is WalletLoading || state is WalletInitial) {
          return const SizedBox.shrink();
        }

        double balance = 0.0;
        if (state is WalletLoaded) {
          balance = state.balance;
        } else if (state is WalletRechargeSuccess) {
          balance = state.newBalance;
        } else {
          return const SizedBox.shrink();
        }

        if (balance >= 2000) {
          return const SizedBox.shrink();
        }

        return Container(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 14),
          decoration: BoxDecoration(
            color: const Color(0xFFF59E0B).withOpacity(0.08),
            borderRadius: BorderRadius.circular(20),
            border: Border.all(color: const Color(0xFFF59E0B).withOpacity(0.2), width: 1.5),
          ),
          child: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(
                  color: const Color(0xFFF59E0B).withOpacity(0.12),
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Icon(Icons.warning_amber_rounded, color: Color(0xFFD97706), size: 24),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text(
                      'رصيد منخفض',
                      style: TextStyle(
                        fontWeight: FontWeight.bold,
                        color: Color(0xFFD97706),
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 3),
                    Text(
                      balance <= 0
                          ? 'رصيدك الحالي ${balance.toInt()} د.ع — لن تستلم طلبات جديدة حتى تشحن محفظتك'
                          : 'رصيدك الحالي ${balance.toInt()} د.ع — ربما لن تصلك بعض الطلبات بسبب انخفاض رصيد محفظتك',
                      style: const TextStyle(fontSize: 11.5, color: Color(0xFF1E293B)),
                    ),
                  ],
                ),
              ),
              ElevatedButton(
                onPressed: () {
                  Navigator.push(
                    context,
                    MaterialPageRoute(builder: (_) => const WalletScreen()),
                  );
                },
                style: ElevatedButton.styleFrom(
                  backgroundColor: const Color(0xFFD97706),
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                  minimumSize: Size.zero,
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  textStyle: const TextStyle(fontFamily: 'Cairo', fontSize: 13, fontWeight: FontWeight.bold),
                ),
                child: const Text('شحن'),
              ),
            ],
          ),
        );
      },
    );
  }
}
