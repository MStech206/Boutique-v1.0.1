import 'package:flutter/material.dart';

/// Sapthala Boutique Theme - Elegant Gold-accented premium design
class AppTheme {
  // Primary Colors
  static const Color ivoryWhite = Color(0xFFFFFDF8);
  static const Color champagneGold = Color(0xFFC6A867);
  static const Color deepGold = Color(0xFFB8964B);
  static const Color lightGold = Color(0xFFE8D5A3);
  
  // Secondary Colors
  static const Color charcoal = Color(0xFF2D2D2D);
  static const Color warmGray = Color(0xFF6B6B6B);
  static const Color softGray = Color(0xFFF5F5F5);
  static const Color accentRose = Color(0xFFD4A5A5);
  
  // Status Colors
  static const Color successGreen = Color(0xFF4CAF50);
  static const Color warningOrange = Color(0xFFFF9800);
  static const Color errorRed = Color(0xFFE53935);
  static const Color infoBlue = Color(0xFF2196F3);

  // Order Status Colors
  static const Map<String, Color> orderStatusColors = {
    'draft': warmGray,
    'confirmed': infoBlue,
    'cutting': Color(0xFF9C27B0),
    'stitching': Color(0xFF673AB7),
    'finishing': Color(0xFF3F51B5),
    'qc': warningOrange,
    'dispatch': Color(0xFF00BCD4),
    'delivered': successGreen,
    'completed': deepGold,
    'canceled': errorRed,
  };

  static ThemeData lightTheme() => ThemeData(
        useMaterial3: true,
        scaffoldBackgroundColor: ivoryWhite,
        colorScheme: ColorScheme.fromSeed(
          seedColor: champagneGold,
          brightness: Brightness.light,
          primary: champagneGold,
          secondary: deepGold,
          surface: ivoryWhite,
          background: ivoryWhite,
          onPrimary: Colors.white,
          onSecondary: Colors.white,
          onSurface: charcoal,
          onBackground: charcoal,
        ),
        
        // AppBar Theme
        appBarTheme: const AppBarTheme(
          backgroundColor: ivoryWhite,
          foregroundColor: charcoal,
          elevation: 0,
          centerTitle: true,
          titleTextStyle: TextStyle(
            color: charcoal,
            fontSize: 20,
            fontWeight: FontWeight.w600,
            letterSpacing: 1.2,
          ),
          iconTheme: IconThemeData(color: champagneGold),
        ),
        
        // Elevated Button Theme
        elevatedButtonTheme: ElevatedButtonThemeData(
          style: ElevatedButton.styleFrom(
            backgroundColor: champagneGold,
            foregroundColor: Colors.white,
            elevation: 2,
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
            textStyle: const TextStyle(
              fontSize: 16,
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ),
        
        // Outlined Button Theme
        outlinedButtonTheme: OutlinedButtonThemeData(
          style: OutlinedButton.styleFrom(
            foregroundColor: champagneGold,
            side: const BorderSide(color: champagneGold, width: 1.5),
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(12),
            ),
          ),
        ),
        
        // Text Button Theme
        textButtonTheme: TextButtonThemeData(
          style: TextButton.styleFrom(
            foregroundColor: champagneGold,
            textStyle: const TextStyle(
              fontWeight: FontWeight.w600,
              letterSpacing: 0.5,
            ),
          ),
        ),
        
        // Card Theme
        cardTheme: CardThemeData(
          color: Colors.white,
          elevation: 2,
          shadowColor: Colors.black.withOpacity(0.1),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(16),
          ),
          margin: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
        ),
        
        // Input Decoration Theme
        inputDecorationTheme: InputDecorationTheme(
          filled: true,
          fillColor: Colors.white,
          contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
          border: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: warmGray.withOpacity(0.3)),
          ),
          enabledBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: BorderSide(color: warmGray.withOpacity(0.3)),
          ),
          focusedBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: champagneGold, width: 2),
          ),
          errorBorder: OutlineInputBorder(
            borderRadius: BorderRadius.circular(12),
            borderSide: const BorderSide(color: errorRed),
          ),
          labelStyle: const TextStyle(color: warmGray),
          hintStyle: TextStyle(color: warmGray.withOpacity(0.7)),
        ),
        
        // Bottom Navigation Bar Theme
        bottomNavigationBarTheme: const BottomNavigationBarThemeData(
          backgroundColor: Colors.white,
          selectedItemColor: champagneGold,
          unselectedItemColor: warmGray,
          type: BottomNavigationBarType.fixed,
          elevation: 8,
          selectedLabelStyle: TextStyle(fontWeight: FontWeight.w600),
        ),
        
        // Chip Theme
        chipTheme: ChipThemeData(
          backgroundColor: softGray,
          selectedColor: lightGold,
          labelStyle: const TextStyle(color: charcoal),
          padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
        ),
        
        // Dialog Theme
        dialogTheme: DialogThemeData(
          backgroundColor: Colors.white,
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(20),
          ),
          titleTextStyle: const TextStyle(
            color: charcoal,
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
        ),
        
        // Floating Action Button Theme
        floatingActionButtonTheme: const FloatingActionButtonThemeData(
          backgroundColor: champagneGold,
          foregroundColor: Colors.white,
          elevation: 4,
        ),
        
        // Snackbar Theme
        snackBarTheme: SnackBarThemeData(
          backgroundColor: charcoal,
          contentTextStyle: const TextStyle(color: Colors.white),
          shape: RoundedRectangleBorder(
            borderRadius: BorderRadius.circular(12),
          ),
          behavior: SnackBarBehavior.floating,
        ),
        
        // Divider Theme
        dividerTheme: DividerThemeData(
          color: warmGray.withOpacity(0.2),
          thickness: 1,
        ),
        
        // Icon Theme
        iconTheme: const IconThemeData(
          color: champagneGold,
          size: 24,
        ),
        
        // Text Theme
        textTheme: const TextTheme(
          displayLarge: TextStyle(
            color: charcoal,
            fontSize: 32,
            fontWeight: FontWeight.bold,
            letterSpacing: -0.5,
          ),
          displayMedium: TextStyle(
            color: charcoal,
            fontSize: 28,
            fontWeight: FontWeight.bold,
          ),
          displaySmall: TextStyle(
            color: charcoal,
            fontSize: 24,
            fontWeight: FontWeight.w600,
          ),
          headlineLarge: TextStyle(
            color: charcoal,
            fontSize: 22,
            fontWeight: FontWeight.w600,
          ),
          headlineMedium: TextStyle(
            color: charcoal,
            fontSize: 20,
            fontWeight: FontWeight.w600,
          ),
          headlineSmall: TextStyle(
            color: charcoal,
            fontSize: 18,
            fontWeight: FontWeight.w600,
          ),
          titleLarge: TextStyle(
            color: charcoal,
            fontSize: 16,
            fontWeight: FontWeight.w600,
          ),
          titleMedium: TextStyle(
            color: charcoal,
            fontSize: 14,
            fontWeight: FontWeight.w600,
          ),
          titleSmall: TextStyle(
            color: charcoal,
            fontSize: 12,
            fontWeight: FontWeight.w600,
          ),
          bodyLarge: TextStyle(
            color: charcoal,
            fontSize: 16,
            fontWeight: FontWeight.normal,
          ),
          bodyMedium: TextStyle(
            color: charcoal,
            fontSize: 14,
            fontWeight: FontWeight.normal,
          ),
          bodySmall: TextStyle(
            color: warmGray,
            fontSize: 12,
            fontWeight: FontWeight.normal,
          ),
          labelLarge: TextStyle(
            color: charcoal,
            fontSize: 14,
            fontWeight: FontWeight.w600,
            letterSpacing: 0.5,
          ),
          labelMedium: TextStyle(
            color: warmGray,
            fontSize: 12,
            fontWeight: FontWeight.w500,
          ),
          labelSmall: TextStyle(
            color: warmGray,
            fontSize: 10,
            fontWeight: FontWeight.w500,
            letterSpacing: 0.5,
          ),
        ),
      );

  // Custom text styles for special cases
  static const TextStyle priceStyle = TextStyle(
    color: deepGold,
    fontSize: 18,
    fontWeight: FontWeight.bold,
  );

  static const TextStyle sectionTitleStyle = TextStyle(
    color: charcoal,
    fontSize: 18,
    fontWeight: FontWeight.w600,
    letterSpacing: 0.5,
  );

  static const TextStyle brandTitleStyle = TextStyle(
    color: champagneGold,
    fontSize: 28,
    fontWeight: FontWeight.bold,
    letterSpacing: 2,
  );

  // Gradient for premium elements
  static const LinearGradient goldGradient = LinearGradient(
    colors: [champagneGold, deepGold],
    begin: Alignment.topLeft,
    end: Alignment.bottomRight,
  );

  static const LinearGradient premiumGradient = LinearGradient(
    colors: [Color(0xFFD4AF37), Color(0xFFB8860B), Color(0xFFDAA520)],
    begin: Alignment.topCenter,
    end: Alignment.bottomCenter,
  );

  // Box Shadows
  static List<BoxShadow> get softShadow => [
        BoxShadow(
          color: Colors.black.withOpacity(0.08),
          blurRadius: 10,
          offset: const Offset(0, 4),
        ),
      ];

  static List<BoxShadow> get cardShadow => [
        BoxShadow(
          color: Colors.black.withOpacity(0.05),
          blurRadius: 15,
          offset: const Offset(0, 5),
        ),
      ];

  // Border Radius
  static BorderRadius get cardRadius => BorderRadius.circular(16);
  static BorderRadius get buttonRadius => BorderRadius.circular(12);
  static BorderRadius get chipRadius => BorderRadius.circular(20);
}