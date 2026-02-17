import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'dart:convert';

class StaffApp extends StatefulWidget {
  const StaffApp({super.key});

  @override
  State<StaffApp> createState() => _StaffAppState();
}

class _StaffAppState extends State<StaffApp> {
  bool _isLoggedIn = false;
  Map<String, dynamic>? _currentStaff;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _checkLoginStatus();
  }

  Future<void> _checkLoginStatus() async {
    final prefs = await SharedPreferences.getInstance();
    final staffData = prefs.getString('staff_data');
    if (staffData != null) {
      setState(() {
        _currentStaff = jsonDecode(staffData);
        _isLoggedIn = true;
        _isLoading = false;
      });
    } else {
      setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (_isLoading) {
      return const Scaffold(
        body: Center(child: CircularProgressIndicator()),
      );
    }

    return _isLoggedIn 
        ? StaffDashboard(staff: _currentStaff!, onLogout: _logout)
        : StaffLogin(onLogin: _login);
  }

  void _login(Map<String, dynamic> staff) async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.setString('staff_data', jsonEncode(staff));
    setState(() {
      _currentStaff = staff;
      _isLoggedIn = true;
    });
  }

  void _logout() async {
    final prefs = await SharedPreferences.getInstance();
    await prefs.remove('staff_data');
    setState(() {
      _currentStaff = null;
      _isLoggedIn = false;
    });
  }
}

class StaffLogin extends StatefulWidget {
  final Function(Map<String, dynamic>) onLogin;

  const StaffLogin({super.key, required this.onLogin});

  @override
  State<StaffLogin> createState() => _StaffLoginState();
}

class _StaffLoginState extends State<StaffLogin> {
  String? _selectedStaff;
  final _pinController = TextEditingController();
  bool _isLoading = false;

  final List<Map<String, String>> _staffList = [
    {'id': 'staff_001', 'name': 'Rajesh Kumar', 'role': 'Dyeing Specialist', 'stage': 'dyeing'},
    {'id': 'staff_002', 'name': 'Priya Sharma', 'role': 'Finishing Expert', 'stage': 'finishing'},
    {'id': 'staff_003', 'name': 'Amit Patel', 'role': 'Quality Controller', 'stage': 'quality-check'},
    {'id': 'staff_004', 'name': 'Sneha Desai', 'role': 'Delivery Executive', 'stage': 'ready-to-deliver'},
  ];

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: Container(
        decoration: BoxDecoration(
          gradient: LinearGradient(
            begin: Alignment.topCenter,
            end: Alignment.bottomCenter,
            colors: [Colors.deepPurple.shade400, Colors.deepPurple.shade800],
          ),
        ),
        child: SafeArea(
          child: Center(
            child: SingleChildScrollView(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: const BoxDecoration(
                      color: Colors.white,
                      shape: BoxShape.circle,
                    ),
                    child: const Icon(Icons.work, size: 60, color: Colors.deepPurple),
                  ),
                  const SizedBox(height: 32),
                  const Text(
                    'SAPTHALA',
                    style: TextStyle(
                      fontSize: 32,
                      fontWeight: FontWeight.bold,
                      color: Colors.white,
                      letterSpacing: 2,
                    ),
                  ),
                  const Text(
                    'Staff Portal',
                    style: TextStyle(fontSize: 18, color: Colors.white70),
                  ),
                  const SizedBox(height: 48),
                  Container(
                    padding: const EdgeInsets.all(24),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                    ),
                    child: Column(
                      children: [
                        const Text(
                          'Staff Login',
                          style: TextStyle(
                            fontSize: 24,
                            fontWeight: FontWeight.bold,
                            color: Colors.deepPurple,
                          ),
                        ),
                        const SizedBox(height: 24),
                        DropdownButtonFormField<String>(
                          initialValue: _selectedStaff,
                          decoration: const InputDecoration(
                            labelText: 'Select Staff Member',
                            border: OutlineInputBorder(),
                          ),
                          items: _staffList.map((staff) {
                            return DropdownMenuItem<String>(
                              value: staff['id'],
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(staff['name']!, style: const TextStyle(fontWeight: FontWeight.bold)),
                                  Text(staff['role']!, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                                ],
                              ),
                            );
                          }).toList(),
                          onChanged: (value) => setState(() => _selectedStaff = value),
                        ),
                        const SizedBox(height: 16),
                        TextField(
                          controller: _pinController,
                          decoration: const InputDecoration(
                            labelText: 'PIN',
                            border: OutlineInputBorder(),
                            hintText: 'Enter PIN (1234)',
                          ),
                          obscureText: true,
                          keyboardType: TextInputType.number,
                          maxLength: 4,
                        ),
                        const SizedBox(height: 24),
                        SizedBox(
                          width: double.infinity,
                          child: ElevatedButton(
                            onPressed: _isLoading ? null : _handleLogin,
                            style: ElevatedButton.styleFrom(
                              backgroundColor: Colors.deepPurple,
                              foregroundColor: Colors.white,
                              padding: const EdgeInsets.symmetric(vertical: 16),
                            ),
                            child: _isLoading
                                ? const CircularProgressIndicator(color: Colors.white)
                                : const Text('Login', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                          ),
                        ),
                        const SizedBox(height: 16),
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.blue.shade50,
                            borderRadius: BorderRadius.circular(8),
                          ),
                          child: const Text(
                            'Demo: Select any staff and use PIN: 1234',
                            style: TextStyle(fontSize: 12, color: Colors.blue),
                            textAlign: TextAlign.center,
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
    );
  }

  Future<void> _handleLogin() async {
    if (_selectedStaff == null || _pinController.text.isEmpty) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please fill all fields')),
      );
      return;
    }

    if (_pinController.text != '1234') {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invalid PIN')),
      );
      return;
    }

    setState(() => _isLoading = true);

    final staff = _staffList.firstWhere((s) => s['id'] == _selectedStaff);
    widget.onLogin(staff);

    setState(() => _isLoading = false);
  }
}

class StaffDashboard extends StatefulWidget {
  final Map<String, dynamic> staff;
  final VoidCallback onLogout;

  const StaffDashboard({super.key, required this.staff, required this.onLogout});

  @override
  State<StaffDashboard> createState() => _StaffDashboardState();
}

class _StaffDashboardState extends State<StaffDashboard> {
  List<Map<String, dynamic>> _myTasks = [];
  List<Map<String, dynamic>> _availableTasks = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadTasks();
  }

  Future<void> _loadTasks() async {
    setState(() => _isLoading = true);
    
    try {
      // Simulate API calls
      await Future.delayed(const Duration(seconds: 1));
      
      // Mock data
      setState(() {
        _myTasks = [
          {
            'id': 'task_001',
            'orderId': 'ORD-1738051200000',
            'stageName': widget.staff['role']?.split(' ').first ?? 'Task',
            'stageIcon': _getStageIcon(widget.staff['stage']),
            'status': 'assigned',
            'customerName': 'Priya Sharma',
            'garmentType': 'Lehenga',
            'priority': 4,
            'createdAt': DateTime.now().subtract(const Duration(hours: 2)),
          },
        ];
        
        _availableTasks = [
          {
            'id': 'task_002',
            'orderId': 'ORD-1738051300000',
            'stageName': widget.staff['role']?.split(' ').first ?? 'Task',
            'stageIcon': _getStageIcon(widget.staff['stage']),
            'status': 'pending',
            'customerName': 'Anita Reddy',
            'garmentType': 'Saree Blouse',
            'priority': 3,
            'createdAt': DateTime.now().subtract(const Duration(minutes: 30)),
          },
          {
            'id': 'task_003',
            'orderId': 'ORD-1738051400000',
            'stageName': widget.staff['role']?.split(' ').first ?? 'Task',
            'stageIcon': _getStageIcon(widget.staff['stage']),
            'status': 'pending',
            'customerName': 'Kavya Nair',
            'garmentType': 'Kurta Set',
            'priority': 2,
            'createdAt': DateTime.now().subtract(const Duration(minutes: 15)),
          },
        ];
        
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('Error loading tasks: $e')),
      );
    }
  }

  String _getStageIcon(String? stage) {
    switch (stage) {
      case 'dyeing': return '🎨';
      case 'cutting': return '✂️';
      case 'stitching': return '🧵';
      case 'khakha': return '🔧';
      case 'maggam': return '✨';
      default: return '📋';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text('Welcome, ${widget.staff['name']}'),
        backgroundColor: Colors.deepPurple,
        foregroundColor: Colors.white,
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTasks,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: widget.onLogout,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadTasks,
              child: SingleChildScrollView(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildStaffCard(),
                    const SizedBox(height: 24),
                    _buildStatsCards(),
                    const SizedBox(height: 24),
                    _buildTaskSection('My Tasks', _myTasks, true),
                    const SizedBox(height: 24),
                    _buildTaskSection('Available Tasks', _availableTasks, false),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildStaffCard() {
    return Card(
      elevation: 4,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Row(
          children: [
            CircleAvatar(
              radius: 30,
              backgroundColor: Colors.deepPurple,
              child: Text(
                widget.staff['name']?.substring(0, 1) ?? 'S',
                style: const TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: Colors.white),
              ),
            ),
            const SizedBox(width: 16),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    widget.staff['name'] ?? 'Staff Member',
                    style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
                  ),
                  Text(
                    widget.staff['role'] ?? 'Role',
                    style: TextStyle(fontSize: 16, color: Colors.grey[600]),
                  ),
                  const Row(
                    children: [
                      Icon(Icons.check_circle, color: Colors.green, size: 16),
                      SizedBox(width: 4),
                      Text('Available', style: TextStyle(color: Colors.green, fontWeight: FontWeight.w600)),
                    ],
                  ),
                ],
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildStatsCards() {
    return Row(
      children: [
        Expanded(child: _buildStatCard('Active', '${_myTasks.length}', Icons.play_arrow, Colors.blue)),
        const SizedBox(width: 12),
        Expanded(child: _buildStatCard('Available', '${_availableTasks.length}', Icons.inbox, Colors.orange)),
        const SizedBox(width: 12),
        Expanded(child: _buildStatCard('Completed', '5', Icons.check_circle, Colors.green)),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, IconData icon, Color color) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Icon(icon, color: color, size: 24),
            const SizedBox(height: 8),
            Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color)),
            Text(title, style: const TextStyle(fontSize: 12)),
          ],
        ),
      ),
    );
  }

  Widget _buildTaskSection(String title, List<Map<String, dynamic>> tasks, bool isMyTask) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(title, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
        const SizedBox(height: 12),
        if (tasks.isEmpty)
          Card(
            child: Padding(
              padding: const EdgeInsets.all(24),
              child: Center(
                child: Column(
                  children: [
                    Icon(Icons.inbox, size: 48, color: Colors.grey[400]),
                    const SizedBox(height: 8),
                    Text('No ${title.toLowerCase()}', style: TextStyle(color: Colors.grey[600])),
                  ],
                ),
              ),
            ),
          )
        else
          ...tasks.map((task) => _buildTaskCard(task, isMyTask)),
      ],
    );
  }

  Widget _buildTaskCard(Map<String, dynamic> task, bool isMyTask) {
    Color statusColor = _getStatusColor(task['status']);
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: statusColor.withOpacity(0.2),
          child: Text(task['stageIcon'], style: const TextStyle(fontSize: 20)),
        ),
        title: Text(
          '${task['stageName']} - Order #${task['orderId']}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Customer: ${task['customerName']}'),
            Text('Garment: ${task['garmentType']}'),
            Text('Status: ${task['status'].toUpperCase()}', 
                 style: TextStyle(color: statusColor, fontWeight: FontWeight.w500)),
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
          onPressed: () => _startTask(task),
          style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
          child: const Text('Start'),
        );
      case 'started':
        return Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            IconButton(
              onPressed: () => _pauseTask(task),
              icon: const Icon(Icons.pause, color: Colors.orange),
            ),
            IconButton(
              onPressed: () => _completeTask(task),
              icon: const Icon(Icons.check_circle, color: Colors.green),
            ),
          ],
        );
      case 'paused':
        return ElevatedButton(
          onPressed: () => _resumeTask(task),
          style: ElevatedButton.styleFrom(backgroundColor: Colors.blue),
          child: const Text('Resume'),
        );
      default:
        return const SizedBox.shrink();
    }
  }

  Widget _buildAcceptButton(Map<String, dynamic> task) {
    return ElevatedButton(
      onPressed: () => _acceptTask(task),
      style: ElevatedButton.styleFrom(backgroundColor: Colors.green),
      child: const Text('Accept'),
    );
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case 'pending': return Colors.grey;
      case 'assigned': return Colors.blue;
      case 'started': return Colors.green;
      case 'paused': return Colors.orange;
      case 'completed': return Colors.purple;
      default: return Colors.grey;
    }
  }

  void _showTaskDetails(Map<String, dynamic> task) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text('${task['stageName']} Details'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Order ID: ${task['orderId']}'),
            Text('Customer: ${task['customerName']}'),
            Text('Garment: ${task['garmentType']}'),
            Text('Status: ${task['status'].toUpperCase()}'),
            Text('Priority: ${task['priority']}/5'),
          ],
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

  void _acceptTask(Map<String, dynamic> task) {
    setState(() {
      _availableTasks.remove(task);
      task['status'] = 'assigned';
      _myTasks.add(task);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Task accepted successfully')),
    );
  }

  void _startTask(Map<String, dynamic> task) {
    setState(() {
      task['status'] = 'started';
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Task started')),
    );
  }

  void _pauseTask(Map<String, dynamic> task) {
    setState(() {
      task['status'] = 'paused';
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Task paused')),
    );
  }

  void _resumeTask(Map<String, dynamic> task) {
    setState(() {
      task['status'] = 'started';
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Task resumed')),
    );
  }

  void _completeTask(Map<String, dynamic> task) {
    setState(() {
      task['status'] = 'completed';
      _myTasks.remove(task);
    });
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Task completed successfully')),
    );
  }
}