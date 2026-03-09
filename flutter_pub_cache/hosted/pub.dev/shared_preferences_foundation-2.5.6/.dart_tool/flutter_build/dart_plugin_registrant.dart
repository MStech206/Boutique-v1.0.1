//
// Generated file. Do not edit.
// This file is generated from template in file `flutter_tools/lib/src/flutter_plugins.dart`.
//

// @dart = 3.9

import 'dart:io'; // flutter_ignore: dart_io_import.
import 'package:shared_preferences_foundation/shared_preferences_foundation.dart' as shared_preferences_foundation;
import 'package:shared_preferences_foundation/shared_preferences_foundation.dart' as shared_preferences_foundation;

@pragma('vm:entry-point')
class _PluginRegistrant {

  @pragma('vm:entry-point')
  static void register() {
    if (Platform.isAndroid) {
    } else if (Platform.isIOS) {
      try {
        shared_preferences_foundation.SharedPreferencesFoundation.registerWith();
      } catch (err) {
        print(
          '`shared_preferences_foundation` threw an error: $err. '
          'The app may not function as expected until you remove this plugin from pubspec.yaml'
        );
      }

    } else if (Platform.isLinux) {
    } else if (Platform.isMacOS) {
      try {
        shared_preferences_foundation.SharedPreferencesFoundation.registerWith();
      } catch (err) {
        print(
          '`shared_preferences_foundation` threw an error: $err. '
          'The app may not function as expected until you remove this plugin from pubspec.yaml'
        );
      }

    } else if (Platform.isWindows) {
    }
  }
}
