import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:firebase_messaging/firebase_messaging.dart';
import '../../data/models/workflow.dart';
import '../../services/workflow_service.dart';
import '../../services/staff_auth_service.dart';
import 'available_tasks_page.dart';
import 'task_detail_page.dart';
import '../staff_login_page.dart';

class StaffDashboard extends ConsumerStatefulWidget {
  const StaffDashboard({super.key});

  @override
  ConsumerState<StaffDashboard> createState() => _StaffDashboardState();
}

class _StaffDashboardState extends ConsumerState<StaffDashboard> {
  final WorkflowService _workflowService = WorkflowService();
  final StaffAuthService _authService = StaffAuthService();
  List<WorkflowTask> _myTasks = [];
  List<WorkflowTask> _availableTasks = [];
  bool _isLoading = true;
  String _staffId = '';
  String _staffName = '';
  Map<String, dynamic>? _currentStaff;

  @override
  void initState() {
    super.initState();
    _initializeStaffDashboard();
    _setupNotifications();
  }

  Future<void> _initializeStaffDashboard() async {
    // Get current staff from auth
    _currentStaff = await _authService.getCurrentStaff();
    if (_currentStaff != null) {
      _staffId = _currentStaff!['id'];
      _staffName = _currentStaff!['name'];
    }
    
    await _loadTasks();
    await _workflowService.registerFCMToken(_staffId);
  }

  Future<void> _loadTasks() async {
    setState(() => _isLoading = true);
    try {
      final myTasks = await _workflowService.getMyTasks(_staffId);
      final availableTasks = await _workflowService.getAvailableTasks(_staffId);
      
      setState(() {
        _myTasks = myTasks;
        _availableTasks = availableTasks;
        _isLoading = false;
      });
    } catch (e) {
      setState(() => _isLoading = false);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error loading tasks: $e')),
        );
      }
    }
  }

  void _setupNotifications() {
    FirebaseMessaging.onMessage.listen((RemoteMessage message) {
      if (message.data['type'] == 'task_assigned') {
        _loadTasks(); // Refresh tasks when new task is assigned
        _showTaskNotification(message);
      }
    });
  }

  void _showTaskNotification(RemoteMessage message) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: Text(message.notification?.title ?? 'New Task'),
        content: Text(message.notification?.body ?? 'You have a new task assigned'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('OK'),
          ),
          ElevatedButton(
            onPressed: () {
              Navigator.pop(context);
              _loadTasks();
            },
            child: const Text('View Tasks'),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final staffRole = _currentStaff?['role'] ?? 'Staff';
    
    return Scaffold(
      appBar: AppBar(
        backgroundColor: Colors.deepPurple,
        foregroundColor: Colors.white,
        elevation: 4,
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Text(
              'Welcome, $_staffName',
              style: const TextStyle(
                fontSize: 18,
                fontWeight: FontWeight.bold,
              ),
            ),
            const SizedBox(height: 2),
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
              decoration: BoxDecoration(
                color: Colors.white.withOpacity(0.2),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                staffRole,
                style: const TextStyle(
                  fontSize: 12,
                  fontWeight: FontWeight.w500,
                  color: Colors.white,
                ),
              ),
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadTasks,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            onPressed: () async {
              await _authService.logout();
              if (mounted) {
                Navigator.pushReplacement(
                  context,
                  MaterialPageRoute(builder: (context) => const StaffLoginPage()),
                );
              }
            },
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : RefreshIndicator(
              onRefresh: _loadTasks,
              child: SingleChildScrollView(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildStatsCards(),
                    const SizedBox(height: 24),
                    _buildMyTasksSection(),
                    const SizedBox(height: 24),
                    _buildAvailableTasksSection(),
                  ],
                ),
              ),
            ),
    );
  }

  Widget _buildStatsCards() {
    final activeTasks = _myTasks.where((t) => t.status == TaskStatus.started || t.status == TaskStatus.resumed).length;
    final pausedTasks = _myTasks.where((t) => t.status == TaskStatus.paused).length;
    final completedToday = _myTasks.where((t) => 
      t.status == TaskStatus.completed && 
      t.completedAt != null &&
      t.completedAt!.day == DateTime.now().day
    ).length;

    return Row(
      children: [
        Expanded(
          child: _buildStatCard(
            'Active Tasks',
            activeTasks.toString(),
            Colors.blue,
            Icons.play_arrow,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            'Paused',
            pausedTasks.toString(),
            Colors.orange,
            Icons.pause,
          ),
        ),
        const SizedBox(width: 12),
        Expanded(
          child: _buildStatCard(
            'Completed Today',
            completedToday.toString(),
            Colors.green,
            Icons.check_circle,
          ),
        ),
      ],
    );
  }

  Widget _buildStatCard(String title, String value, Color color, IconData icon) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: color.withOpacity(0.1),
        borderRadius: BorderRadius.circular(12),
        border: Border.all(color: color.withOpacity(0.3)),
      ),
      child: Column(
        children: [
          Icon(icon, color: color, size: 24),
          const SizedBox(height: 8),
          Text(
            value,
            style: TextStyle(
              fontSize: 24,
              fontWeight: FontWeight.bold,
              color: color,
            ),
          ),
          Text(
            title,
            style: TextStyle(
              fontSize: 12,
              color: color.withOpacity(0.8),
            ),
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }

  Widget _buildMyTasksSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'My Tasks',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            TextButton(
              onPressed: () => _loadTasks(),
              child: const Text('Refresh'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _myTasks.isEmpty
            ? Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Center(
                  child: Text(
                    'No tasks assigned yet',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
              )
            : Column(
                children: _myTasks.take(3).map((task) => _buildTaskCard(task, true)).toList(),
              ),
      ],
    );
  }

  Widget _buildAvailableTasksSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            const Text(
              'Available Tasks',
              style: TextStyle(fontSize: 20, fontWeight: FontWeight.bold),
            ),
            TextButton(
              onPressed: () {
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (context) => AvailableTasksPage(staffId: _staffId),
                  ),
                ).then((_) => _loadTasks());
              },
              child: const Text('View All'),
            ),
          ],
        ),
        const SizedBox(height: 12),
        _availableTasks.isEmpty
            ? Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.grey[100],
                  borderRadius: BorderRadius.circular(12),
                ),
                child: const Center(
                  child: Text(
                    'No available tasks',
                    style: TextStyle(color: Colors.grey),
                  ),
                ),
              )
            : Column(
                children: _availableTasks.take(2).map((task) => _buildTaskCard(task, false)).toList(),
              ),
      ],
    );
  }

  Widget _buildTaskCard(WorkflowTask task, bool isMyTask) {
    Color statusColor = _getStatusColor(task.status);
    
    return Card(
      margin: const EdgeInsets.only(bottom: 12),
      child: ListTile(
        leading: CircleAvatar(
          backgroundColor: statusColor.withOpacity(0.2),
          child: Text(
            task.stageIcon,
            style: const TextStyle(fontSize: 20),
          ),
        ),
        title: Text(
          '${task.stageName} - Order #${task.orderId}',
          style: const TextStyle(fontWeight: FontWeight.bold),
        ),
        subtitle: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text('Status: ${task.status.toUpperCase()}'),
            if (task.orderDetails['customerName'] != null)
              Text('Customer: ${task.orderDetails['customerName']}'),
            if (task.timeSpent != null)
              Text('Time: ${_formatDuration(task.timeSpent!)}'),
          ],
        ),
        trailing: isMyTask
            ? _buildTaskActions(task)
            : ElevatedButton(
                onPressed: () => _acceptTask(task),
                style: ElevatedButton.styleFrom(
                  backgroundColor: Colors.green,
                  foregroundColor: Colors.white,
                ),
                child: const Text('Accept'),
              ),
        onTap: () {
          Navigator.push(
            context,
            MaterialPageRoute(
              builder: (context) => TaskDetailPage(
                task: task,
                staffId: _staffId,
                onTaskUpdated: _loadTasks,
              ),
            ),
          );
        },
      ),
    );
  }

  Widget _buildTaskActions(WorkflowTask task) {
    if (task.canStart) {
      return ElevatedButton(
        onPressed: () => _startTask(task),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.blue,
          foregroundColor: Colors.white,
        ),
        child: const Text('Start'),
      );
    } else if (task.canPause) {
      return ElevatedButton(
        onPressed: () => _pauseTask(task),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.orange,
          foregroundColor: Colors.white,
        ),
        child: const Text('Pause'),
      );
    } else if (task.canResume) {
      return ElevatedButton(
        onPressed: () => _resumeTask(task),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.green,
          foregroundColor: Colors.white,
        ),
        child: const Text('Resume'),
      );
    } else if (task.canComplete) {
      return ElevatedButton(
        onPressed: () => _completeTask(task),
        style: ElevatedButton.styleFrom(
          backgroundColor: Colors.purple,
          foregroundColor: Colors.white,
        ),
        child: const Text('Complete'),
      );
    }
    return const SizedBox.shrink();
  }

  Color _getStatusColor(String status) {
    switch (status) {
      case TaskStatus.pending:
        return Colors.grey;
      case TaskStatus.assigned:
        return Colors.blue;
      case TaskStatus.started:
      case TaskStatus.resumed:
        return Colors.green;
      case TaskStatus.paused:
        return Colors.orange;
      case TaskStatus.completed:
        return Colors.purple;
      default:
        return Colors.grey;
    }
  }

  String _formatDuration(Duration duration) {
    String twoDigits(int n) => n.toString().padLeft(2, '0');
    String hours = twoDigits(duration.inHours);
    String minutes = twoDigits(duration.inMinutes.remainder(60));
    return '${hours}h ${minutes}m';
  }

  Future<void> _acceptTask(WorkflowTask task) async {
    final success = await _workflowService.acceptTask(task.id, _staffId);
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Task accepted successfully')),
      );
      _loadTasks();
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Failed to accept task')),
      );
    }
  }

  Future<void> _startTask(WorkflowTask task) async {
    final success = await _workflowService.startTask(task.id, _staffId);
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Task started')),
      );
      _loadTasks();
    }
  }

  Future<void> _pauseTask(WorkflowTask task) async {
    final success = await _workflowService.pauseTask(task.id, _staffId);
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Task paused')),
      );
      _loadTasks();
    }
  }

  Future<void> _resumeTask(WorkflowTask task) async {
    final success = await _workflowService.resumeTask(task.id, _staffId);
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Task resumed')),
      );
      _loadTasks();
    }
  }

  Future<void> _completeTask(WorkflowTask task) async {
    final success = await _workflowService.completeTask(task.id, _staffId);
    if (success) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Task completed')),
      );
      _loadTasks();
    }
  }
}