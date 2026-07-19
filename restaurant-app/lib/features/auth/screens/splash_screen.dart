import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:restaurant_app/features/auth/bloc/auth_bloc.dart';
import 'package:restaurant_app/features/auth/screens/login_screen.dart';
import 'package:restaurant_app/features/home/screens/home_screen.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  bool _navigated = false;

  @override
  void initState() {
    super.initState();
    _startTimer();
  }

  void _startTimer() async {
    await Future.delayed(const Duration(seconds: 2));
    if (mounted) {
      _checkStateAndNavigate(context.read<AuthBloc>().state, forceFallback: true);
    }
  }

  void _checkStateAndNavigate(AuthState state, {bool forceFallback = false}) {
    if (_navigated || !mounted) return;

    if (state is AuthAuthenticated) {
      _navigated = true;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const HomeScreen()),
      );
    } else if (state is AuthUnauthenticated || state is AuthError || forceFallback) {
      _navigated = true;
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(builder: (_) => const LoginScreen()),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    return BlocListener<AuthBloc, AuthState>(
      listener: (context, state) {
        _checkStateAndNavigate(state);
      },
      child: Scaffold(
        body: SizedBox.expand(
          child: Image.asset(
            'assets/images/splash.png',
            fit: BoxFit.cover,
          ),
        ),
      ),
    );
  }
}
