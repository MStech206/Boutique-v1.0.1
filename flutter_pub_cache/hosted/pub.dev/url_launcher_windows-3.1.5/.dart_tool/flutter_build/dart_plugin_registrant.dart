//
// Generated file. Do not edit.
// This file is generated from template in file `flutter_tools/lib/src/flutter_plugins.dart`.
//

// @dart = 3.8

import 'dart:io'; // flutter_ignore: dart_io_import.
import 'package:url_launcher_windows/url_launcher_windows.dart' as url_launcher_windows;

@pragma('vm:entry-point')
class _PluginRegistrant {

  @pragma('vm:entry-point')
  static void register() {
    if (Platform.isAndroid) {
    } else if (Platform.isIOS) {
    } else if (Platform.isLinux) {
    } else if (Platform.isMacOS) {
    } else if (Platform.isWindows) {
      try {
        url_launcher_windows.UrlLauncherWindows.registerWith();
      } catch (err) {
        print(
          '`url_launcher_windows` threw an error: $err. '
          'The app may not function as expected until you remove this plugin from pubspec.yaml'
        );
      }

    }
  }
}
