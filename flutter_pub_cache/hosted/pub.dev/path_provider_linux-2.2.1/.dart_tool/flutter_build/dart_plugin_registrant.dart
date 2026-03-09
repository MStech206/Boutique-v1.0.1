//
// Generated file. Do not edit.
// This file is generated from template in file `flutter_tools/lib/src/flutter_plugins.dart`.
//

// @dart = 2.19

import 'dart:io'; // flutter_ignore: dart_io_import.
import 'package:path_provider_linux/path_provider_linux.dart' as path_provider_linux;

@pragma('vm:entry-point')
class _PluginRegistrant {

  @pragma('vm:entry-point')
  static void register() {
    if (Platform.isAndroid) {
    } else if (Platform.isIOS) {
    } else if (Platform.isLinux) {
      try {
        path_provider_linux.PathProviderLinux.registerWith();
      } catch (err) {
        print(
          '`path_provider_linux` threw an error: $err. '
          'The app may not function as expected until you remove this plugin from pubspec.yaml'
        );
      }

    } else if (Platform.isMacOS) {
    } else if (Platform.isWindows) {
    }
  }
}
