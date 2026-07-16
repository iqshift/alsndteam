import 'package:flutter/material.dart';
import 'package:flutter_localizations/flutter_localizations.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:pos_app/core/services/api_service.dart';
import 'package:pos_app/features/auth/bloc/auth_bloc.dart';
import 'package:pos_app/features/auth/screens/splash_screen.dart';
import 'package:pos_app/features/home/bloc/code_bloc.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  
  final apiService = ApiService();
  Color primaryColor = const Color(0xFFD81B60); // اللون الافتراضي (تيم السند)
  
  try {
    final settings = await apiService.getPublicSettings();
    if (settings['posThemeColor'] != null) {
      final hexColor = settings['posThemeColor'].toString().replaceAll('#', '');
      primaryColor = Color(int.parse('FF$hexColor', radix: 16));
    }
  } catch (_) {
    // Keep default color
  }

  runApp(PosApp(initialPrimaryColor: primaryColor));
}

class PosApp extends StatelessWidget {
  final Color initialPrimaryColor;
  const PosApp({super.key, required this.initialPrimaryColor});

  @override
  Widget build(BuildContext context) {
    return MultiRepositoryProvider(
      providers: [
        RepositoryProvider(create: (_) => ApiService()),
      ],
      child: MultiBlocProvider(
        providers: [
          BlocProvider(
            create: (context) => AuthBloc(
              apiService: context.read<ApiService>(),
            )..add(AuthCheckRequested()),
          ),
          BlocProvider(
            create: (context) => CodeBloc(
              apiService: context.read<ApiService>(),
            ),
          ),
        ],
        child: MaterialApp(
          title: 'موظف نقاط البيع',
          debugShowCheckedModeBanner: false,
          theme: ThemeData(
            useMaterial3: true,
            fontFamily: 'Cairo',
            primaryColor: initialPrimaryColor,
            scaffoldBackgroundColor: const Color(0xFFF4F7FE),
            colorScheme: ColorScheme.light(
              primary: initialPrimaryColor,
              secondary: const Color(0xFF10B981),
              error: const Color(0xFFEF4444),
              background: const Color(0xFFF4F7FE),
              surface: Colors.white,
            ),
            cardTheme: CardThemeData(
              elevation: 0,
              color: Colors.white,
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.circular(20),
                side: BorderSide(color: Colors.grey.withOpacity(0.08), width: 1),
              ),
            ),
            appBarTheme: const AppBarTheme(
              backgroundColor: Colors.white,
              elevation: 0,
              centerTitle: true,
              iconTheme: IconThemeData(color: Color(0xFF1E293B)),
              titleTextStyle: TextStyle(
                fontFamily: 'Cairo',
                color: Color(0xFF1E293B),
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            inputDecorationTheme: InputDecorationTheme(
              filled: true,
              fillColor: Colors.white,
              contentPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 16),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: Colors.grey.withOpacity(0.15)),
              ),
              enabledBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: Colors.grey.withOpacity(0.15)),
              ),
              focusedBorder: OutlineInputBorder(
                borderRadius: BorderRadius.circular(16),
                borderSide: BorderSide(color: initialPrimaryColor, width: 2),
              ),
              labelStyle: const TextStyle(color: Color(0xFF64748B), fontSize: 14),
            ),
            elevatedButtonTheme: ElevatedButtonThemeData(
              style: ElevatedButton.styleFrom(
                backgroundColor: initialPrimaryColor,
                foregroundColor: Colors.white,
                elevation: 0,
                padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 24),
                shape: RoundedRectangleBorder(
                  borderRadius: BorderRadius.circular(16),
                ),
                textStyle: const TextStyle(
                  fontFamily: 'Cairo',
                  fontSize: 16,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ),
          locale: const Locale('ar', 'AE'),
          supportedLocales: const [
            Locale('ar', 'AE'),
          ],
          localizationsDelegates: const [
            GlobalMaterialLocalizations.delegate,
            GlobalWidgetsLocalizations.delegate,
            GlobalCupertinoLocalizations.delegate,
          ],
          home: const SplashScreen(),
        ),
      ),
    );
  }
}
