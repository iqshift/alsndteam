import 'package:flutter/material.dart';
import 'package:flutter/rendering.dart';
import 'dart:ui' as ui;
import 'dart:typed_data';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:intl/intl.dart';
import 'package:pos_app/features/auth/bloc/auth_bloc.dart';
import 'package:pos_app/features/home/bloc/code_bloc.dart';
import 'package:qr_flutter/qr_flutter.dart';
import 'package:image/image.dart' as img;
import 'package:pos_app/core/services/print_service.dart';

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> {
  final _amountController = TextEditingController();
  final List<double> _quickAmounts = [2000, 5000, 10000, 15000, 25000];

  final GlobalKey _boundaryKey = GlobalKey();
  Map<String, dynamic>? _printingCodeData;
  String? _printingEmployeeName;

  @override
  void initState() {
    super.initState();
    context.read<CodeBloc>().add(CodeLoadTodayRequested());
    _amountController.addListener(_onAmountChanged);
  }

  void _onAmountChanged() {
    setState(() {});
  }

  @override
  void dispose() {
    _amountController.removeListener(_onAmountChanged);
    _amountController.dispose();
    super.dispose();
  }

  Future<void> _captureAndPrint(Map<String, dynamic> codeData, String employeeName) async {
    try {
      // 1. عرض ويدجت الإيصال في الخلفية
      setState(() {
        _printingCodeData = codeData;
        _printingEmployeeName = employeeName;
      });

      // 2. الانتظار حتى يرسم محرك فلاتر الواجهة بالكامل
      await Future.delayed(const Duration(milliseconds: 100));

      // 3. التقاط الـ RepaintBoundary كـ Image
      final RenderRepaintBoundary? boundary = _boundaryKey.currentContext?.findRenderObject() as RenderRepaintBoundary?;
      if (boundary == null) return;

      final ui.Image uiImage = await boundary.toImage(pixelRatio: 1.5);
      final ByteData? byteData = await uiImage.toByteData(format: ui.ImageByteFormat.rawRgba);
      if (byteData == null) return;

      final rawBytes = byteData.buffer.asUint8List();
      final image = img.Image.fromBytes(
        width: uiImage.width,
        height: uiImage.height,
        bytes: rawBytes.buffer,
        format: img.Format.uint8,
        numChannels: 4,
      );

      // 4. إرسال الصورة الجاهزة للطابعة مباشرة
      await PrintService.printImage(image);
    } catch (e) {
      print('Capture and print error: $e');
    } finally {
      // 5. إخفاء ويدجت الإيصال
      if (mounted) {
        setState(() {
          _printingCodeData = null;
          _printingEmployeeName = null;
        });
      }
    }
  }



  void _submitCodeCreation() {
    final amountText = _amountController.text.trim();
    final value = double.tryParse(amountText) ?? 0;
    if (value < 1000) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: const Text(
            'أقل قيمة للبطاقة هي 1,000 د.ع',
            textAlign: TextAlign.center,
            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
          ),
          backgroundColor: Theme.of(context).colorScheme.error,
          behavior: SnackBarBehavior.floating,
        ),
      );
      return;
    }

    context.read<CodeBloc>().add(CodeCreateRequested(value: value));
  }

  @override
  Widget build(BuildContext context) {
    final authState = context.read<AuthBloc>().state;
    String employeeName = 'الموظف';
    if (authState is AuthAuthenticated) {
      employeeName = authState.user['name'] ?? 'الموظف';
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('نقاط البيع POS'),
        actions: [
          IconButton(
            icon: const Icon(Icons.logout_rounded, color: Color(0xFFEF4444)),
            onPressed: () {
              context.read<AuthBloc>().add(AuthLogoutRequested());
            },
          ),
        ],
      ),
      body: Stack(
        children: [
          BlocListener<CodeBloc, CodeState>(
        listener: (context, state) {
          if (state is CodeCreateSuccess) {
            _amountController.clear();
            _captureAndPrint(state.code, employeeName);
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(
                content: Text(
                  'تم إنشاء وطباعة البطاقة بنجاح',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                ),
                backgroundColor: Color(0xFF10B981),
                behavior: SnackBarBehavior.floating,
              ),
            );
            context.read<CodeBloc>().add(CodeLoadTodayRequested());
          } else if (state is CodeFailure) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  state.message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                ),
                backgroundColor: Theme.of(context).colorScheme.error,
                behavior: SnackBarBehavior.floating,
              ),
            );
          }
        },
        child: ListView(
          padding: const EdgeInsets.all(16),
          children: [
            // كارت الترحيب
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    CircleAvatar(
                      radius: 24,
                      backgroundColor:
                          Theme.of(context).primaryColor.withOpacity(0.1),
                      child: Icon(
                        Icons.person_rounded,
                        color: Theme.of(context).primaryColor,
                      ),
                    ),
                    const SizedBox(width: 16),
                    Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        const Text(
                          'مرحباً بك،',
                          style: TextStyle(fontSize: 12, color: Colors.grey),
                        ),
                        Text(
                          employeeName,
                          style: const TextStyle(
                            fontSize: 16,
                            fontWeight: FontWeight.bold,
                            color: Color(0xFF1E293B),
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 16),

            // كارت توليد الكود
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.stretch,
                  children: [
                    const Text(
                      'قيمة البطاقة (د.ع)',
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontWeight: FontWeight.bold,
                        fontSize: 14,
                      ),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: _amountController,
                      keyboardType: TextInputType.number,
                      style: const TextStyle(
                        fontSize: 20,
                        fontWeight: FontWeight.bold,
                      ),
                      decoration: const InputDecoration(
                        hintText: 'مثال: 5000',
                        prefixIcon: Icon(Icons.wallet_rounded),
                      ),
                    ),
                    const SizedBox(height: 12),
                    // المبالغ السريعة
                    Wrap(
                      spacing: 8,
                      runSpacing: 8,
                      children: _quickAmounts.map((amt) {
                        final label = NumberFormat.decimalPattern().format(amt);
                        final isSelected = double.tryParse(_amountController.text.trim()) == amt;
                        return ActionChip(
                          label: Text('$label د.ع'),
                          backgroundColor: isSelected 
                              ? Theme.of(context).primaryColor 
                              : null,
                          labelStyle: TextStyle(
                            fontFamily: 'Cairo',
                            fontSize: 12,
                            fontWeight: FontWeight.bold,
                            color: isSelected ? Colors.white : Colors.black87,
                          ),
                          onPressed: () {
                            setState(() {
                              _amountController.text = amt.toInt().toString();
                            });
                          },
                        );
                      }).toList(),
                    ),
                    const SizedBox(height: 20),
                    BlocBuilder<CodeBloc, CodeState>(
                      builder: (context, state) {
                        final isLoading = state is CodeLoading;
                        return ElevatedButton.icon(
                          onPressed: isLoading ? null : _submitCodeCreation,
                          icon: const Icon(Icons.print_rounded),
                          label: isLoading
                              ? const SizedBox(
                                  height: 20,
                                  width: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                        Colors.white),
                                  ),
                                )
                              : const Text('إنشاء وطباعة البطاقة'),
                          style: ElevatedButton.styleFrom(
                            minimumSize: const Size.fromHeight(56),
                          ),
                        );
                      },
                    ),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // الأكواد المنشأة اليوم
            const Padding(
              padding: EdgeInsets.symmetric(horizontal: 4),
              child: Text(
                'البطاقات المنشأة اليوم',
                style: TextStyle(
                  fontFamily: 'Cairo',
                  fontWeight: FontWeight.bold,
                  fontSize: 15,
                  color: Color(0xFF1E293B),
                ),
              ),
            ),
            const SizedBox(height: 8),

            BlocBuilder<CodeBloc, CodeState>(
              builder: (context, state) {
                if (state is CodeLoading && state is! CodeLoadSuccess) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(20.0),
                      child: CircularProgressIndicator(),
                    ),
                  );
                }

                List<Map<String, dynamic>> codes = [];
                if (state is CodeLoadSuccess) {
                  codes = state.codes;
                }

                if (codes.isEmpty) {
                  return const Center(
                    child: Padding(
                      padding: EdgeInsets.all(20.0),
                      child: Text(
                        'لم تقم بإنشاء أي بطاقات اليوم بعد',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          color: Colors.grey,
                          fontSize: 13,
                        ),
                      ),
                    ),
                  );
                }

                return ListView.builder(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: codes.length,
                  itemBuilder: (context, index) {
                    final code = codes[index];
                    final formattedVal = NumberFormat.decimalPattern().format(
                      double.tryParse(code['value'].toString()) ?? 0,
                    );
                    final timeStr = DateFormat('hh:mm a').format(
                      DateTime.tryParse(code['createdAt'].toString()) ??
                          DateTime.now(),
                    );

                    return Card(
                      margin: const EdgeInsets.symmetric(vertical: 4),
                      child: ListTile(
                        leading: CircleAvatar(
                          backgroundColor: Theme.of(context)
                              .colorScheme
                              .secondary
                              .withOpacity(0.1),
                          child: Icon(
                            Icons.qr_code_rounded,
                            color: Theme.of(context).colorScheme.secondary,
                          ),
                        ),
                        title: Text(
                          code['code'].toString(),
                          style: const TextStyle(
                            fontFamily: 'monospace',
                            fontWeight: FontWeight.bold,
                            letterSpacing: 2.0,
                          ),
                        ),
                        subtitle: Text(
                          'الوقت: $timeStr',
                          style: const TextStyle(fontSize: 11, color: Colors.grey),
                        ),
                        trailing: Text(
                          '$formattedVal د.ع',
                          style: TextStyle(
                            fontFamily: 'Cairo',
                            fontWeight: FontWeight.bold,
                            color: Theme.of(context).primaryColor,
                          ),
                        ),
                      ),
                    );
                  },
                );
              },
            ),
          ],
        ),
      ),
          if (_printingCodeData != null)
            Positioned(
              left: -9999,
              top: 0,
              child: RepaintBoundary(
                key: _boundaryKey,
                child: _buildReceiptWidget(_printingCodeData!, _printingEmployeeName ?? ''),
              ),
            ),
        ],
      ),
    );
  }

  Widget _buildReceiptWidget(Map<String, dynamic> codeData, String employeeName) {
    final formattedValue = NumberFormat.decimalPattern().format(
      double.tryParse(codeData['value'].toString()) ?? 0,
    );
    final dateStr = DateFormat('yyyy-MM-dd HH:mm:ss').format(
      DateTime.tryParse(codeData['createdAt'].toString()) ?? DateTime.now(),
    );

    return Container(
      width: 256, // 256px wide, which at pixelRatio: 1.5 yields exactly 384px (58mm native printer width)
      color: Colors.white,
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
      child: Column(
        mainAxisSize: MainAxisSize.min,
        crossAxisAlignment: CrossAxisAlignment.center,
        children: [
          const Text(
            'إيصال شحن رصيد',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontWeight: FontWeight.bold,
              fontSize: 18,
              color: Colors.black,
            ),
          ),
          const SizedBox(height: 2),
          const Text(
            'منصة التوصيل السريع',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 13,
              color: Colors.black,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            '- - - - - - - - - - - - - - - - - - - - -',
            style: TextStyle(fontSize: 12, color: Colors.black),
          ),
          const SizedBox(height: 6),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'الموظف:',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 12, color: Colors.black),
              ),
              Text(
                employeeName,
                style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 12, color: Colors.black),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              const Text(
                'التاريخ:',
                style: TextStyle(fontFamily: 'Cairo', fontSize: 12, color: Colors.black),
              ),
              Text(
                dateStr,
                style: const TextStyle(fontFamily: 'Cairo', fontSize: 11, color: Colors.black),
              ),
            ],
          ),
          const SizedBox(height: 6),
          const Text(
            '- - - - - - - - - - - - - - - - - - - - -',
            style: TextStyle(fontSize: 12, color: Colors.black),
          ),
          const SizedBox(height: 6),
          const Text(
            'كود الشحن:',
            style: TextStyle(fontFamily: 'Cairo', fontSize: 12, color: Colors.black),
          ),
          const SizedBox(height: 4),
          Text(
            codeData['code'].toString(),
            style: const TextStyle(
              fontFamily: 'monospace',
              fontSize: 16,
              fontWeight: FontWeight.bold,
              letterSpacing: 1.5,
              color: Colors.black,
            ),
          ),
          const SizedBox(height: 10),
          QrImageView(
            data: codeData['code'].toString(),
            version: QrVersions.auto,
            size: 130.0,
            gapless: false,
          ),
          const SizedBox(height: 10),
          Text(
            '$formattedValue د.ع',
            style: const TextStyle(
              fontFamily: 'Cairo',
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: Colors.black,
            ),
          ),
          const SizedBox(height: 4),
          const Text(
            '- - - - - - - - - - - - - - - - - - - - -',
            style: TextStyle(fontSize: 12, color: Colors.black),
          ),
          const SizedBox(height: 6),
          const Text(
            'شكراً لاستخدامكم خدماتنا!',
            style: TextStyle(
              fontFamily: 'Cairo',
              fontSize: 12,
              fontWeight: FontWeight.bold,
              color: Colors.black,
            ),
          ),
        ],
      ),
    );
  }
}
