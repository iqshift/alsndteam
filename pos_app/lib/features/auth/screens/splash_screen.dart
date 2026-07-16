import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:pos_app/features/auth/bloc/auth_bloc.dart';
import 'package:pos_app/features/auth/screens/login_screen.dart';
import 'package:pos_app/features/home/screens/home_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _navigateToNext();
  }

  void _navigateToNext() async {
    await Future.delayed(const Duration(seconds: 1)); // عرض الشعار لثانية واحدة
    if (!mounted) return;

    final authBloc = context.read<AuthBloc>();
    int attempts = 0;
    // الانتظار حتى تنتهي العملية مع حد أقصى 1.5 ثانية (15 محاولة) للتأكد من عدم الوقوف
    while ((authBloc.state is AuthInitial || authBloc.state is AuthLoading) && attempts < 15) {
      await Future.delayed(const Duration(milliseconds: 100));
      attempts++;
      if (!mounted) return;
    }

    if (authBloc.state is AuthAuthenticated) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    } else {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: SizedBox.expand(
        child: Image.asset(
          'assets/images/splash.png',
          fit: BoxFit.cover,
        ),
      ),
    );
  }
}
