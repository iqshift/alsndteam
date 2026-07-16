import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:pdf/pdf.dart';
import 'package:pdf/widgets.dart' as pw;
import 'package:printing/printing.dart';
import 'package:intl/intl.dart';
import 'package:print_bluetooth_thermal/print_bluetooth_thermal.dart';
import 'package:esc_pos_utils_plus/esc_pos_utils_plus.dart';
import 'package:image/image.dart' as img;
import 'package:permission_handler/permission_handler.dart';
import 'package:shared_preferences/shared_preferences.dart';

class PrintService {
  static const String _prefKeyPrinterMac = 'selected_printer_mac';

  // طلب أذونات البلوتوث والموقع اللازمة للاتصال بالطابعة
  static Future<bool> requestPermissions() async {
    final statuses = await [
      Permission.bluetoothScan,
      Permission.bluetoothConnect,
      Permission.locationWhenInUse,
    ].request();

    return statuses.values.every((status) => status.isGranted);
  }

  // عرض نافذة لاختيار طابعة البلوتوث وحفظها
  static Future<String?> _showPrinterSelectionDialog(
      BuildContext context, List<dynamic> devices) async {
    return showDialog<String>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
          title: const Text(
            'اختر طابعة البلوتوث المدمجة',
            textAlign: TextAlign.center,
            style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16),
          ),
          content: SizedBox(
            width: double.maxFinite,
            height: 250,
            child: devices.isEmpty
                ? const Center(
                    child: Text(
                      'لا توجد أجهزة بلوتوث مقترنة. يرجى إقران الطابعة أولاً.',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontFamily: 'Cairo', color: Colors.grey),
                    ),
                  )
                : ListView.builder(
                    itemCount: devices.length,
                    itemBuilder: (context, index) {
                      final device = devices[index];
                      final String name = device.name ?? 'طابعة غير معروفة';
                      final String mac = device.macAdress ?? '';
                      return ListTile(
                        leading: const Icon(Icons.print_rounded, color: Colors.blue),
                        title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold)),
                        subtitle: Text(mac),
                        onTap: () => Navigator.of(context).pop(mac),
                      );
                    },
                  ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.of(context).pop(null),
              child: const Text('إلغاء', style: TextStyle(fontFamily: 'Cairo', color: Colors.red)),
            ),
          ],
        );
      },
    );
  }

  static Future<void> printImage(img.Image image) async {
    try {
      // 1. التحقق من الأذونات
      final hasPermission = await requestPermissions();
      if (!hasPermission) return;

      // 2. التحقق من تشغيل البلوتوث
      final bool isBluetoothEnabled = await PrintBluetoothThermal.bluetoothEnabled;
      if (!isBluetoothEnabled) return;

      // 3. تحديد ماك أدرس الطابعة (البحث في التخزين المحلي)
      final prefs = await SharedPreferences.getInstance();
      String? savedMac = prefs.getString(_prefKeyPrinterMac);

      if (savedMac == null || savedMac.isEmpty) {
        // جلب الأجهزة المقترنة
        final List<dynamic> pairedDevices = await PrintBluetoothThermal.pairedBluetooths;
        
        // البحث التلقائي عن طابعة مدمجة لتسهيل التجربة
        for (final device in pairedDevices) {
          final String name = (device.name ?? '').toLowerCase();
          if (name.contains('inner') || 
              name.contains('pos') || 
              name.contains('thermal') || 
              name.contains('print') || 
              name.contains('built-in')) {
            savedMac = device.macAdress;
            await prefs.setString(_prefKeyPrinterMac, savedMac!);
            break;
          }
        }
      }

      if (savedMac == null || savedMac.isEmpty) return;

      // 4. الاتصال بالطابعة الحرارية
      bool connected = await PrintBluetoothThermal.connect(macPrinterAddress: savedMac);
      if (!connected) {
        await prefs.remove(_prefKeyPrinterMac);
        return;
      }

      // 5. توليد أوامر الطباعة الحرارية للصورة مباشرة
      final profile = await CapabilityProfile.load();
      final generator = Generator(PaperSize.mm58, profile);
      List<int> printBytes = [];
      
      printBytes.addAll(generator.image(image));
      printBytes.addAll(generator.feed(2));
      printBytes.addAll(generator.cut());

      // 6. إرسال البايتات إلى الطابعة الحرارية
      if (printBytes.isNotEmpty) {
        await PrintBluetoothThermal.writeBytes(printBytes);
      }
    } catch (e) {
      print('Print error: $e');
    } finally {
      // فصل الاتصال بشكل نظيف
      await PrintBluetoothThermal.disconnect;
    }
  }
}
