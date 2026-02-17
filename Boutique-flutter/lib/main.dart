import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';
import 'package:http/http.dart' as http;
import 'package:flutter/foundation.dart'
    show kIsWeb, defaultTargetPlatform, TargetPlatform;
import 'src/features/measurements/measurement_wizard.dart';
import 'src/services/notification_service.dart';
import 'src/services/workflow_service.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await NotificationService.initialize();
  runApp(const ProviderScope(child: SapthalaStaffApp()));
}

class SapthalaStaffApp extends StatelessWidget {
  const SapthalaStaffApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'SAPTHALA Staff',
      theme: ThemeData(
        primarySwatch: Colors.deepPurple,
        useMaterial3: true,
      ),
      home: const StaffApp(),
      debugShowCheckedModeBanner: false,
    );
  }
}

class ApiService {
  // API URL Configuration
  // Dynamically choose base URL depending on platform:
  // - Web: http://localhost:3000
  // - Android emulator: http://10.0.2.2:3000
  // - iOS simulator / desktop: http://localhost:3000
  static String get baseUrl {
    if (kIsWeb) return 'http://localhost:3000/api';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000/api';
    }
    return 'http://localhost:3000/api';
  }

  static String get imageBase {
    if (kIsWeb) return 'http://localhost:3000';
    if (defaultTargetPlatform == TargetPlatform.android) {
      return 'http://10.0.2.2:3000';
    }
    return 'http://localhost:3000';
  }

  static Future<http.Response> post(
      String endpoint, Map<String, dynamic> body) async {
    try {
      print('🌐 POST ${ApiService.baseUrl}$endpoint');
      final response = await http
          .post(
            Uri.parse('${ApiService.baseUrl}$endpoint'),
            headers: {'Content-Type': 'application/json'},
            body: jsonEncode(body),
          )
          .timeout(const Duration(seconds: 10));
      print('✅ ${response.statusCode}');
      return response;
    } catch (e) {
      print('❌ $e');
      rethrow;
    }
  }

  static Future<http.Response> get(String endpoint, {String? token}) async {
    final headers = {
      'Content-Type': 'application/json',
      if (token != null) 'Authorization': 'Bearer $token',
    };
    return await http
        .get(Uri.parse('${ApiService.baseUrl}$endpoint'), headers: headers)
        .timeout(const Duration(seconds: 10));
  }
}

class StaffApp extends StatefulWidget {
  const StaffApp({super.key});

  @override
  State<StaffApp> createState() => _StaffAppState();
}

class _StaffAppState extends State<StaffApp> {
  bool _isLoggedIn = false;
  Map<String, dynamic>? _currentStaff;
  String? _token;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkLoginStatus();
  }

  Future<void> _checkLoginStatus() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      final staffData = prefs.getString('staff_data');
      final token = prefs.getString('staff_token');

      if (staffData != null && token != null) {
        setState(() {
          _currentStaff = jsonDecode(staffData);
          _token = token;
          _isLoggedIn = true;
        });
      }
    } catch (e) {
      print('Login check error: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  void _login(Map<String, dynamic> staff, String token) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('staff_data', jsonEncode(staff));
    await prefs.setString('staff_token', token);
    setState(() {
      _currentStaff = staff;
      _token = token;
      _isLoggedIn = true;
    });
  }

  void _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.clear();
    setState(() {
      _currentStaff = null;
      _token = null;
      _isLoggedIn = false;
    });
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              CircularProgressIndicator(),
              SizedBox(height: 16),
              Text('Loading SAPTHALA...'),
            ],
          ),
        ),
      );
    }

    return _isLoggedIn
        ? StaffDashboard(
            staff: _currentStaff!, token: _token!, onLogout: _logout)
        : StaffLogin(onLogin: _login);
  }
}

class StaffLogin extends StatefulWidget {
  final Function(Map<String, dynamic>, String) onLogin;

  const StaffLogin({super.key, required this.onLogin});

  @override
  State<StaffLogin> createState() => _StaffLoginState();
}

class _StaffLoginState extends State<StaffLogin> {
  String? _selectedStaff;
  String? _selectedBranch;
  final _pinController = TextEditingController();
  bool _isLoading = false;
  String _errorMessage = '';

  // Example staff list with branch property. In production, fetch from API.
  final List<Map<String, String>> _staffList = [];

  List<Map<String, String>> _loadedStaff = [];
  List<Map<String, String>> _loadedBranches = [];

  @override
  void initState() {
    super.initState();
    _fetchBranchesAndStaff();
  }

  Future<void> _fetchBranchesAndStaff() async {
    try {
      // Fetch public branches (no auth required)
      List<dynamic> branchesData = [];
      try {
        final branchesResp = await ApiService.get('/public/branches');
        branchesData = jsonDecode(branchesResp.body);
      } catch (e) {
        print('Could not fetch/parse branches: $e');
      }

      // Map branches to id/name pairs
      final branchList = <Map<String, String>>[];
      for (final b in branchesData) {
        if (b is Map) {
          final id =
              (b['branchId'] ?? b['branch'] ?? b['id'])?.toString() ?? '';
          final name = (b['branchName'] ?? b['branch'] ?? id)?.toString() ?? id;
          if (id.isNotEmpty) branchList.add({'id': id, 'name': name});
        }
      }

      // Fetch staff list (public endpoint) - we will fetch for All Branches initially
      List<dynamic> staffData = [];
      try {
        final staffResp = await ApiService.get('/staff');
        final parsed = jsonDecode(staffResp.body);
        if (parsed is List) {
          staffData = parsed;
        } else if (parsed is Map && parsed['staff'] is List)
          staffData = parsed['staff'];
      } catch (e) {
        print('Could not fetch/parse staff: $e');
      }

      _loadedStaff = staffData
          .map<Map<String, String>>((s) {
            if (s is Map) {
              return {
                'id': (s['staffId'] ?? s['id'] ?? s['_id'])?.toString() ?? '',
                'name': (s['name'] ?? s['fullName'])?.toString() ?? 'Staff',
                'role': (s['role'] ?? s['designation'])?.toString() ?? '',
                'branch': (s['branch'] ?? s['branchId'] ?? s['branchName'])
                        ?.toString() ??
                    ''
              };
            }
            return {'id': '', 'name': '', 'role': '', 'branch': ''};
          })
          .where((m) => m['id']!.isNotEmpty)
          .toList();

      // If branches not returned separately, derive from staff
      if (branchList.isEmpty) {
        final ids = <String>{};
        for (final s in _loadedStaff) {
          final bid = s['branch'] ?? '';
          if (bid.isNotEmpty && !ids.contains(bid)) {
            ids.add(bid);
            branchList.add({'id': bid, 'name': bid});
          }
        }
      }

      branchList.sort((a, b) => a['name']!.compareTo(b['name']!));
      _loadedBranches = branchList;
      setState(() {});
    } catch (e) {
      print('Could not fetch staff/branches: $e');
      // fallback to demo (empty)
      _loadedStaff = [];
      _loadedBranches = [];
      setState(() {});
    }
  }

  Future<void> _fetchStaffForBranch(String? branch) async {
    try {
      List<dynamic> staffData = [];
      final endpoint =
          (branch == null || branch == '' || branch == 'All Branches')
              ? '/staff'
              : '/staff?branch=${Uri.encodeComponent(branch)}';
      final staffResp = await ApiService.get(endpoint);
      final parsed = jsonDecode(staffResp.body);
      if (parsed is List) {
        staffData = parsed;
      } else if (parsed is Map && parsed['staff'] is List)
        staffData = parsed['staff'];

      _loadedStaff = staffData
          .map<Map<String, String>>((s) {
            if (s is Map) {
              return {
                'id': (s['staffId'] ?? s['id'] ?? s['_id'])?.toString() ?? '',
                'name': (s['name'] ?? s['fullName'])?.toString() ?? 'Staff',
                'role': (s['role'] ?? s['designation'])?.toString() ?? '',
                'branch': (s['branch'] ?? s['branchId'] ?? s['branchName'])
                        ?.toString() ??
                    ''
              };
            }
            return {'id': '', 'name': '', 'role': '', 'branch': ''};
          })
          .where((m) => m['id']!.isNotEmpty)
          .toList();

      setState(() {});
    } catch (e) {
      print('Fetch staff for branch error: $e');
    }
  }

  List<Map<String, String>> get _branches {
    final list = List<Map<String, String>>.from(_loadedBranches);
    if (list.isEmpty || list.first['id'] != '') {
      list.insert(0, {'id': '', 'name': 'All Branches'});
    }
    return list;
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.deepPurple.shade300, Colors.deepPurple.shade700],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(20),
              child: Card(
                elevation: 8,
                shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(16)),
                child: Padding(
                  padding: const EdgeInsets.all(24),
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      // Logo with company branding
                      Container(
                        width: 80,
                        height: 80,
                        decoration: BoxDecoration(
                          color: Colors.deepPurple.shade100,
                          shape: BoxShape.circle,
                        ),
                        child: ClipOval(
                          child: Image.network(
                            '${ApiService.imageBase}/img/sapthala%20logo.png',
                            width: 60,
                            height: 60,
                            fit: BoxFit.cover,
                            errorBuilder: (context, error, stackTrace) =>
                                const Icon(Icons.work_outline,
                                    size: 40, color: Colors.deepPurple),
                          ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Company Title
                      const Text(
                        'SAPTHALA',
                        style: TextStyle(
                          fontSize: 28,
                          fontWeight: FontWeight.bold,
                          color: Colors.deepPurple,
                        ),
                      ),
                      const Text(
                        'Designer Workshop - Staff Portal',
                        style: TextStyle(
                          fontSize: 14,
                          color: Colors.grey,
                        ),
                      ),
                      const SizedBox(height: 30),

                      // Branch Selection
                      DropdownButtonFormField<String>(
                        initialValue: _selectedBranch ?? '',
                        decoration: InputDecoration(
                          labelText: 'Select Branch',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          prefixIcon: const Icon(Icons.store),
                        ),
                        items: _branches
                            .map((b) => DropdownMenuItem(
                                value: b['id'],
                                child: Text(b['name'] ?? b['id'] ?? '')))
                            .toList(),
                        onChanged: (val) {
                          setState(() {
                            _selectedBranch = val;
                            _selectedStaff = null;
                            _errorMessage = '';
                          });
                          // fetch staff for selected branch (val is branchId or empty for all)
                          _fetchStaffForBranch(val);
                        },
                      ),
                      const SizedBox(height: 12),

                      // Staff Selection
                      DropdownButtonFormField<String>(
                        initialValue: _selectedStaff,
                        decoration: InputDecoration(
                          labelText: 'Select Staff Member',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          prefixIcon: const Icon(Icons.person),
                        ),
                        items: _loadedStaff
                            .where((s) =>
                                _selectedBranch == null ||
                                _selectedBranch == '' ||
                                s['branch'] == _selectedBranch)
                            .map((staff) {
                          return DropdownMenuItem<String>(
                            value: staff['id'],
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Text(
                                  staff['name']!,
                                  style: const TextStyle(
                                      fontWeight: FontWeight.w600),
                                ),
                                Text(
                                  staff['role']!,
                                  style: TextStyle(
                                    fontSize: 12,
                                    color: Colors.grey[600],
                                  ),
                                ),
                                if (staff['branch'] != null)
                                  Text(staff['branch']!,
                                      style: TextStyle(
                                          fontSize: 11,
                                          color: Colors.grey[500])),
                              ],
                            ),
                          );
                        }).toList(),
                        onChanged: (value) {
                          setState(() {
                            _selectedStaff = value;
                            _errorMessage = '';
                          });
                        },
                      ),
                      const SizedBox(height: 20),

                      // PIN Input
                      TextField(
                        controller: _pinController,
                        decoration: InputDecoration(
                          labelText: 'PIN',
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(8),
                          ),
                          prefixIcon: const Icon(Icons.lock),
                          hintText: 'Enter 4-digit PIN',
                        ),
                        obscureText: true,
                        keyboardType: TextInputType.number,
                        maxLength: 4,
                        onChanged: (value) {
                          setState(() => _errorMessage = '');
                        },
                      ),
                      const SizedBox(height: 20),

                      // Error Message
                      if (_errorMessage.isNotEmpty)
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(8),
                            border: Border.all(color: Colors.red.shade200),
                          ),
                          child: Row(
                            children: [
                              Icon(Icons.error_outline,
                                  color: Colors.red.shade600, size: 20),
                              const SizedBox(width: 8),
                              Expanded(
                                child: Text(
                                  _errorMessage,
                                  style: TextStyle(
                                      color: Colors.red.shade700, fontSize: 14),
                                ),
                              ),
                            ],
                          ),
                        ),
                      if (_errorMessage.isNotEmpty) const SizedBox(height: 20),

                      // Login Button
                      SizedBox(
                        width: double.infinity,
                        height: 50,
                        child: ElevatedButton(
                          onPressed: _isLoading ? null : _handleLogin,
                          style: ElevatedButton.styleFrom(
                            backgroundColor: Colors.deepPurple,
                            foregroundColor: Colors.white,
                            shape: RoundedRectangleBorder(
                              borderRadius: BorderRadius.circular(8),
                            ),
                          ),
                          child: _isLoading
                              ? const SizedBox(
                                  width: 20,
                                  height: 20,
                                  child: CircularProgressIndicator(
                                    strokeWidth: 2,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                        Colors.white),
                                  ),
                                )
                              : const Text(
                                  'Login to Dashboard',
                                  style: TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.bold),
                                ),
                        ),
                      ),
                      const SizedBox(height: 20),

                      // Demo Info
                      Container(
                        width: double.infinity,
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.blue.shade50,
                          borderRadius: BorderRadius.circular(8),
                          border: Border.all(color: Colors.blue.shade200),
                        ),
                        child: Row(
                          children: [
                            Icon(Icons.info_outline,
                                color: Colors.blue.shade600, size: 20),
                            const SizedBox(width: 8),
                            const Expanded(
                              child: Text(
                                'Demo: Use PIN 1234 for any staff member',
                                style:
                                    TextStyle(fontSize: 12, color: Colors.blue),
                              ),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _handleLogin() async {
    if (_selectedStaff == null) {
      setState(() => _errorMessage = 'Please select a staff member');
      return;
    }

    if (_pinController.text.isEmpty) {
      setState(() => _errorMessage = 'Please enter your PIN');
      return;
    }

    if (_pinController.text.length != 4) {
      setState(() => _errorMessage = 'PIN must be 4 digits');
      return;
    }

    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      print('🔑 Attempting login for $_selectedStaff');

      final response = await ApiService.post('/staff/login', {
        'staffId': _selectedStaff,
        'pin': _pinController.text,
        'branch': _selectedBranch == 'All Branches' ? null : _selectedBranch,
      });

      if (response.statusCode == 200) {
        final data = jsonDecode(response.body);
        print('✅ Login successful: ${data['staff']['name']}');

        // Show success message
        if (mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(
              content: Text('✅ Welcome ${data['staff']['name']}!'),
              backgroundColor: Colors.green,
              duration: const Duration(seconds: 2),
            ),
          );
        }

        // attach selected branch to staff object for context
        try {
          if (data['staff'] is Map) {
            data['staff']['branch'] =
                _selectedBranch == 'All Branches' ? null : _selectedBranch;
          }
        } catch (_) {}
        widget.onLogin(data['staff'], data['token']);
      } else {
        final error = jsonDecode(response.body);
        setState(() => _errorMessage =
            error['error'] ?? 'Login failed. Please check your credentials.');
      }
    } on Exception catch (e) {
      print('❌ Login exception: $e');
      String errorMsg = 'Connection failed. ';
      if (e.toString().contains('timeout')) {
        errorMsg +=
            'Server is not responding. Please ensure backend is running.';
      } else if (e.toString().contains('SocketException')) {
        errorMsg +=
            'Cannot reach server. Check if server is running on port 3000.';
      } else {
        errorMsg += 'Please try again.';
      }
      setState(() => _errorMessage = errorMsg);
    } catch (e) {
      print('❌ Unexpected error: $e');
      setState(() =>
          _errorMessage = 'An unexpected error occurred. Please try again.');
    } finally {
      if (mounted) {
        setState(() => _isLoading = false);
      }
    }
  }

  @override
  void dispose() {
    _pinController.dispose();
    super.dispose();
  }
}

class StaffDashboard extends StatefulWidget {
  final Map<String, dynamic> staff;
  final String token;
  final VoidCallback onLogout;

  const StaffDashboard(
      {super.key,
      required this.staff,
      required this.token,
      required this.onLogout});

  @override
  State<StaffDashboard> createState() => _StaffDashboardState();
}

class _StaffDashboardState extends State<StaffDashboard> {
  List<Map<String, dynamic>> _myTasks = [];
  List<Map<String, dynamic>> _availableTasks = [];
  bool _isLoading = true;
  String _errorMessage = '';

  @override
  void initState() {
    super.initState();
    _loadData();
    _setupPeriodicRefresh();
    _startNotificationService();
  }

  void _startNotificationService() {
    // Start real-time notification polling
    NotificationService.startPeriodicCheck(
      widget.staff['staffId'],
      widget.token,
      onNewTask: () {
        // Reload tasks when new notification arrives
        _loadData();
      },
    );
  }

  void _setupPeriodicRefresh() {
    // Auto-refresh every 15 seconds for real-time updates
    Future.delayed(const Duration(seconds: 15), () {
      if (mounted) {
        _loadData();
        _setupPeriodicRefresh();
      }
    });
  }

  Future<void> _loadData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = '';
    });

    try {
      await Future.wait([
        _loadMyTasks(),
        _loadAvailableTasks(),
      ]);
    } catch (e) {
      setState(() => _errorMessage = 'Failed to load data');
      print('Load data error: $e');
    } finally {
      setState(() => _isLoading = false);
    }
  }

  Future<void> _loadMyTasks() async {
    try {
      final tasks = await WorkflowService.getMyTasks(
          widget.staff['staffId'], widget.token);
      setState(() {
        _myTasks = tasks;
      });
      print('✅ Loaded ${tasks.length} tasks for ${widget.staff['name']}');
    } catch (e) {
      print('❌ Error loading my tasks: $e');
      setState(() {
        _myTasks = [];
      });
    }
  }

  Future<void> _loadAvailableTasks() async {
    try {
      final tasks = await WorkflowService.getAvailableTasks(
          widget.staff['staffId'], widget.token);
      setState(() {
        _availableTasks = tasks;
      });
      print('✅ Loaded ${tasks.length} available tasks');
    } catch (e) {
      print('❌ Error loading available tasks: $e');
      setState(() {
        _availableTasks = [];
      });
    }
  }

  String _getStageIcon(String stage) {
    switch (stage) {
      case 'dyeing':
        return '🎨';
      case 'cutting':
        return '✂️';
      case 'stitching':
        return '🧵';
      case 'khakha':
        return '🔧';
      case 'maggam':
        return '✨';
      case 'painting':
        return '🎭';
      case 'finishing':
        return '🏁';
      case 'quality-check':
        return '🔍';
      case 'ready-to-deliver':
        return '📦';
      default:
        return '📋';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Row(
          children: [
            ClipOval(
              child: Image.network(
                '${ApiService.imageBase}/img/sapthala%20logo.png',
                width: 24,
                height: 24,
                fit: BoxFit.cover,
                errorBuilder: (context, error, stackTrace) => CircleAvatar(
                  radius: 12,
                  backgroundColor: Colors.white,
                  child: Text(
                    widget.staff['name']?.substring(0, 1) ?? 'S',
                    style: const TextStyle(
                      color: Colors.deepPurple,
                      fontWeight: FontWeight.bold,
                      fontSize: 12,
                    ),
                  ),
                ),
              ),
            ),
            const SizedBox(width: 8),
            Expanded(
              child: Text(
                'Hi, ${widget.staff['name']?.split(' ').first ?? 'Staff'}',
                style: const TextStyle(fontSize: 18),
              ),
            ),
          ],
        ),
        backgroundColor: Colors.deepPurple,
        foregroundColor: Colors.white,
        elevation: 2,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadData,
          ),
          PopupMenuButton(
            icon: const Icon(Icons.more_vert),
            itemBuilder: (context) => [
              PopupMenuItem(
                onTap: widget.onLogout,
                child: const Row(
                  children: [
                    Icon(Icons.logout, color: Colors.red),
                    SizedBox(width: 8),
                    Text('Logout'),
                  ],
                ),
              ),
            ],
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        onPressed: () {
          Navigator.of(context).push(
            MaterialPageRoute(
              builder: (context) => const MeasurementWizard(),
            ),
          );
        },
        backgroundColor: Colors.deepPurple,
        child: const Icon(Icons.straighten, color: Colors.white),
      ),
      body: _isLoading
          ? const Center(
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  CircularProgressIndicator(),
                  SizedBox(height: 16),
                  Text('Loading workflow tasks...'),
                ],
              ),
            )
          : _errorMessage.isNotEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Icon(Icons.error_outline,
                          size: 64, color: Colors.red.shade300),
                      const SizedBox(height: 16),
                      Text(
                        _errorMessage,
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 16),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton(
                        onPressed: _loadData,
                        child: const Text('Retry'),
                      ),
                    ],
                  ),
                )
              : RefreshIndicator(
                  onRefresh: _loadData,
                  child: SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        _buildStaffCard(),
                        const SizedBox(height: 20),
                        _buildStatsRow(),
                        const SizedBox(height: 20),
                        _buildTaskSection('My Tasks', _myTasks, true),
                        const SizedBox(height: 20),
                        _buildTaskSection(
                            'Available Tasks', _availableTasks, false),
                      ],
                    ),
                  ),
                ),
    );
  }

  Widget _buildStaffCard() {
    return Card(
      elevation: 4,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 30,
              backgroundColor: Colors.deepPurple.shade100,
              child: Text(
                widget.staff['name']?.substring(0, 1) ?? 'S',
                style: const TextStyle(
                  fontSize: 24,
                  fontWeight: FontWeight.bold,
                  color: Colors.deepPurple,
                ),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.staff['name'] ?? 'Staff Member',
                    style: const TextStyle(
                      fontSize: 18,
                      fontWeight: FontWeight.bold,
                    ),
                  ),
                  Text(
                    widget.staff['role'] ?? 'Role',
                    style: TextStyle(
                      fontSize: 14,
                      color: Colors.grey[600],
                    ),
                  ),
                  const SizedBox(height: 4),
                  Container(
                    padding:
                        const EdgeInsets.symmetric(horizontal: 8, vertical: 4),
                    decoration: BoxDecoration(
                      color: Colors.green.shade100,
                      borderRadius: BorderRadius.circular(12),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.circle, color: Colors.green, size: 8),
                        const SizedBox(width: 4),
                        Text(
                          'Available',
                          style: TextStyle(
                            color: Colors.green.shade700,
                            fontSize: 12,
                            fontWeight: FontWeight.w600,
                          ),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsRow() {
    final activeTasks = _myTasks
        .where((t) => ['started', 'resumed'].contains(t['status']))
        .length;
    final pausedTasks = _myTasks.where((t) => t['status'] == 'paused').length;
    final availableCount = _availableTasks.length;

    return Row(
      children: [
        Expanded(
            child: _buildStatCard(
                'Active', '$activeTasks', Icons.play_arrow, Colors.green)),
        const SizedBox(width: 12),
        Expanded(
            child: _buildStatCard(
                'Paused', '$pausedTasks', Icons.pause, Colors.orange)),
        const SizedBox(width: 12),
        Expanded(
            child: _buildStatCard(
                'Available', '$availableCount', Icons.inbox, Colors.blue)),
      ],
    );
  }

  Widget _buildStatCard(
      String title, String value, IconData icon, Color color) {
    return Card(
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 4),
            Text(
              value,
              style: TextStyle(
                fontSize: 20,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text(
              title,
              style: const TextStyle(fontSize: 11),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildTaskSection(
      String title, List<Map<String, dynamic>> tasks, bool isMyTask) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            Text(
              title,
              style: const TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
            ),
            Text(
              '${tasks.length} tasks',
              style: TextStyle(color: Colors.grey[600], fontSize: 14),
            ),
          ],
        ),
        const SizedBox(height: 8),
        if (tasks.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(
                      isMyTask ? Icons.task_alt : Icons.inbox,
                      size: 48,
                      color: Colors.grey[400],
                    ),
                    const SizedBox(height: 8),
                    Text(
                      'No ${title.toLowerCase()}',
                      style: TextStyle(color: Colors.grey[600]),
                    ),
                  ],
                ),
              ),
            ),
          )
        else
          ...tasks
              .take(isMyTask ? 5 : 3)
              .map((task) => _buildTaskCard(task, isMyTask)),
      ],
    );
  }

  Widget _buildTaskCard(Map<String, dynamic> task, bool isMyTask) {
    Color statusColor = _getStatusColor(task['status']);

    return Card(
      margin: const EdgeInsets.only(bottom: 8),
      elevation: 2,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
      child: ListTile(
        contentPadding: const EdgeInsets.all(12),
        leading: CircleAvatar(
          backgroundColor: statusColor.withOpacity(0.2),
          child: Text(
            task['stageIcon'] ?? '📋',
            style: const TextStyle(fontSize: 18),
          ),
        ),
        title: Text(
          '${task['stageName']} - #${task['orderId']}',
          style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const SizedBox(height: 4),
            Text('Customer: ${task['customerName']}'),
            Text('Garment: ${task['garmentType']}'),
            Container(
              margin: const EdgeInsets.only(top: 4),
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: statusColor.withOpacity(0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                task['status'].toUpperCase(),
                style: TextStyle(
                  color: statusColor,
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ),
          ],
        ),
        trailing: isMyTask ? _buildTaskActions(task) : _buildAcceptButton(task),
        onTap: () => _showTaskDetails(task),
      ),
    );
  }

  Widget _buildTaskActions(Map<String, dynamic> task) {
    switch (task['status']) {
      case 'assigned':
        return ElevatedButton(
          onPressed: () => _updateTaskStatus(task, 'started'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.green,
            foregroundColor: Colors.white,
            minimumSize: const Size(60, 32),
          ),
          child: const Text('Start', style: TextStyle(fontSize: 12)),
        );
      case 'started':
      case 'resumed':
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              onPressed: () => _updateTaskStatus(task, 'paused'),
              icon: const Icon(Icons.pause, color: Colors.orange, size: 20),
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            ),
            IconButton(
              onPressed: () => _completeTask(task),
              icon:
                  const Icon(Icons.check_circle, color: Colors.green, size: 20),
              constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
            ),
          ],
        );
      case 'paused':
        return ElevatedButton(
          onPressed: () => _updateTaskStatus(task, 'resumed'),
          style: ElevatedButton.styleFrom(
            backgroundColor: Colors.blue,
            foregroundColor: Colors.white,
            minimumSize: const Size(60, 32),
          ),
          child: const Text('Resume', style: TextStyle(fontSize: 12)),
        );
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildAcceptButton(Map<String, dynamic> task) {
    return ElevatedButton(
      onPressed: () => _acceptTask(task),
      style: ElevatedButton.styleFrom(
        backgroundColor: Colors.green,
        foregroundColor: Colors.white,
        minimumSize: const Size(60, 32),
      ),
      child: const Text('Accept', style: TextStyle(fontSize: 12)),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending':
        return Colors.grey;
      case 'assigned':
        return Colors.blue;
      case 'started':
      case 'resumed':
        return Colors.green;
      case 'paused':
        return Colors.orange;
      case 'completed':
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  void _showTaskDetails(Map<String, dynamic> task) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${task['stageName']} Details'),
        content: SingleChildScrollView(
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              _buildDetailRow('Order ID', task['orderId']),
              _buildDetailRow('Customer', task['customerName']),
              _buildDetailRow('Garment', task['garmentType']),
              _buildDetailRow('Status', task['status'].toUpperCase()),
              if (task['deliveryDate'] != null)
                _buildDetailRow('Delivery', task['deliveryDate']),
              const Divider(height: 20),
              if (task['measurements'] != null && task['measurements'] is Map)
                ..._buildMeasurements(task['measurements']),
              if (task['designNotes'] != null &&
                  task['designNotes'].toString().isNotEmpty)
                _buildDesignNotes(task['designNotes']),
            ],
          ),
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  List<Widget> _buildMeasurements(Map<String, dynamic> measurements) {
    final measurementLabels = {
      'BL': 'Blouse Length',
      'B': 'Bust',
      'W': 'Waist',
      'SH': 'Shoulder',
      'LL': 'Lehenga Length',
      'LW': 'Lehenga Waist',
      'FL': 'Frock Length',
      'KL': 'Kurta Length',
      'PL': 'Pant Length',
      'PW': 'Pant Waist',
      'C': 'Chest',
      'L': 'Length',
      'SIZE': 'Size'
    };

    return [
      Container(
        padding: const EdgeInsets.all(12),
        decoration: BoxDecoration(
          color: Colors.purple.shade50,
          borderRadius: BorderRadius.circular(8),
          border: Border.all(color: Colors.purple.shade200),
        ),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Icon(Icons.straighten, color: Colors.purple.shade700, size: 20),
                const SizedBox(width: 8),
                Text(
                  'Measurements',
                  style: TextStyle(
                    fontWeight: FontWeight.bold,
                    fontSize: 16,
                    color: Colors.purple.shade700,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            ...measurements.entries.map((entry) => Padding(
                  padding: const EdgeInsets.symmetric(vertical: 4),
                  child: Row(
                    children: [
                      Container(
                        width: 120,
                        padding: const EdgeInsets.symmetric(
                            horizontal: 8, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.purple.shade100,
                          borderRadius: BorderRadius.circular(4),
                        ),
                        child: Text(
                          measurementLabels[entry.key] ?? entry.key,
                          style: const TextStyle(
                            fontWeight: FontWeight.w600,
                            fontSize: 13,
                          ),
                        ),
                      ),
                      const SizedBox(width: 12),
                      Text(
                        '${entry.value}${entry.key == "SIZE" ? "" : "\""}',
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.bold,
                          color: Colors.black87,
                        ),
                      ),
                    ],
                  ),
                )),
          ],
        ),
      ),
      const SizedBox(height: 12),
    ];
  }

  Widget _buildDesignNotes(String notes) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        const Text(
          'Design Notes:',
          style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
        ),
        const SizedBox(height: 8),
        Container(
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.blue.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.blue.shade200),
          ),
          child: Text(
            notes,
            style: const TextStyle(fontSize: 14),
          ),
        ),
      ],
    );
  }

  Widget _buildDetailRow(String label, String value) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          SizedBox(
            width: 80,
            child: Text(
              '$label:',
              style: const TextStyle(fontWeight: FontWeight.w500),
            ),
          ),
          Expanded(
            child: Text(value),
          ),
        ],
      ),
    );
  }

  Future<void> _acceptTask(Map<String, dynamic> task) async {
    try {
      final success = await WorkflowService.acceptTask(
        staffId: widget.staff['staffId'],
        orderId: task['orderId'],
        stageId: task['stageId'],
        token: widget.token,
      );

      if (success) {
        setState(() {
          _availableTasks.remove(task);
          task['status'] = 'assigned';
          _myTasks.add(task);
        });

        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('✅ Task accepted successfully'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        throw Exception('Failed to accept task');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('❌ Failed to accept task'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _updateTaskStatus(
      Map<String, dynamic> task, String status) async {
    try {
      final success = await WorkflowService.updateTaskStatus(
        staffId: widget.staff['staffId'],
        orderId: task['orderId'],
        stageId: task['stageId'],
        status: status,
        token: widget.token,
      );

      if (success) {
        setState(() {
          task['status'] = status;
        });

        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text('✅ Task $status successfully'),
            backgroundColor: Colors.green,
          ),
        );
      } else {
        throw Exception('Failed to update task');
      }
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('❌ Failed to update task'),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  Future<void> _completeTask(Map<String, dynamic> task) async {
    String notes = '';
    int qualityRating = 5;

    final result = await showDialog<bool>(
      context: context,
      builder: (context) => StatefulBuilder(
        builder: (context, setState) => AlertDialog(
          title: const Text('Complete Task'),
          content: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              TextField(
                decoration: const InputDecoration(
                  labelText: 'Completion Notes',
                  border: OutlineInputBorder(),
                ),
                maxLines: 3,
                onChanged: (value) => notes = value,
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  const Text('Quality Rating: '),
                  ...List.generate(
                      5,
                      (index) => GestureDetector(
                            onTap: () =>
                                setState(() => qualityRating = index + 1),
                            child: Icon(
                              index < qualityRating
                                  ? Icons.star
                                  : Icons.star_border,
                              color: Colors.amber,
                              size: 28,
                            ),
                          )),
                ],
              ),
            ],
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context, false),
              child: const Text('Cancel'),
            ),
            ElevatedButton(
              onPressed: () => Navigator.pop(context, true),
              style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
              child: const Text('Complete'),
            ),
          ],
        ),
      ),
    );

    if (result == true) {
      try {
        final success = await WorkflowService.updateTaskStatus(
          staffId: widget.staff['staffId'],
          orderId: task['orderId'],
          stageId: task['stageId'],
          status: 'completed',
          token: widget.token,
          notes: notes,
          qualityRating: qualityRating,
        );

        if (success) {
          setState(() {
            task['status'] = 'completed';
            task['notes'] = notes;
            task['qualityRating'] = qualityRating;
            _myTasks.remove(task);
          });

          ScaffoldMessenger.of(context).showSnackBar(
            const SnackBar(
              content: Text('🎉 Task completed! Next stage will be notified.'),
              backgroundColor: Colors.green,
              duration: Duration(seconds: 3),
            ),
          );
        } else {
          throw Exception('Failed to complete task');
        }
      } catch (e) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ Failed to complete task'),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }
}
