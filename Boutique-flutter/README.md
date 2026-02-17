# 📱 SAPTHALA Staff Mobile App

A professional Flutter mobile application for staff workflow management in the SAPTHALA Boutique system.

## ✨ Features

### 🔐 Staff Authentication
- **Secure Login** - PIN-based authentication for staff members
- **Role-based Access** - Different workflow stages based on staff roles
- **Session Management** - Persistent login with secure token storage

### 📋 Task Management
- **Real-time Task Assignment** - Automatic task assignment from admin panel
- **Workflow Stages** - Complete garment production workflow
  - 🎨 Dyeing
  - ✂️ Cutting  
  - 🧵 Stitching
  - 🔧 Khakha
  - ✨ Maggam
  - 🎭 Painting
  - 🏁 Finishing
  - 🔍 Quality Check
  - 📦 Ready to Deliver

### 🔄 Task Lifecycle
- **Start** - Begin working on assigned tasks
- **Pause** - Temporarily pause work with notes
- **Resume** - Continue paused tasks
- **Complete** - Finish tasks with quality rating and notes

### 📱 Real-time Notifications
- **Push Notifications** - Instant task assignments
- **In-app Notifications** - Task updates and reminders
- **Periodic Sync** - Automatic data refresh every 30 seconds

### 📏 Measurement Wizard
- **Step-by-step Measurements** - Guided measurement collection
- **Photo Integration** - Capture reference images
- **Template Storage** - Save measurement templates locally

## 🚀 Quick Start

### Prerequisites
- Flutter SDK (3.0.0 or higher)
- Android Studio / VS Code
- Android Emulator or Physical Device
- SAPTHALA Backend Server running on port 3000

### Installation

1. **Navigate to Flutter directory**:
   ```bash
   cd Boutique-flutter
   ```

2. **Install dependencies**:
   ```bash
   flutter pub get
   ```

3. **Run the app**:
   ```bash
   flutter run
   ```

### Quick Start Script
Use the provided batch file for Windows:
```bash
# Run this from the main Boutique directory
run-flutter-app.bat
```

## 🔧 Configuration

### API Endpoints
The app connects to different endpoints based on your environment:

- **Android Emulator**: `http://10.0.2.2:3000/api`
- **iOS Simulator**: `http://localhost:3000/api`  
- **Physical Device**: `http://YOUR_COMPUTER_IP:3000/api`

Update the `baseUrl` in `ApiService` class if needed.

### Staff Login Credentials
Default PIN for all staff members: **1234**

Available Staff Members:
- Rajesh Kumar (Dyeing Specialist)
- Priya Sharma (Master Cutter)
- Amit Patel (Senior Tailor)
- Sneha Desai (Khakha Expert)
- Vikram Singh (Maggam Artist)
- Kavya Reddy (Painting Artist)
- Ravi Kumar (Finishing Expert)
- Meera Nair (Quality Controller)
- Suresh Babu (Delivery Executive)

## 📱 App Architecture

### State Management
- **Flutter Riverpod** - Reactive state management
- **Shared Preferences** - Local data persistence
- **HTTP Client** - API communication

### Key Services
- **ApiService** - HTTP API communication
- **NotificationService** - Push notifications and local notifications
- **WorkflowService** - Task management operations

### Project Structure
```
lib/
├── main.dart                           # App entry point
├── src/
│   ├── features/
│   │   └── measurements/
│   │       └── measurement_wizard.dart # Measurement collection
│   ├── services/
│   │   ├── notification_service.dart   # Notification handling
│   │   └── workflow_service.dart       # Task management
│   └── data/
│       └── measurements/
│           └── measurements_provider.dart # State management
```

## 🔄 Workflow Integration

### Task Assignment Flow
1. **Admin creates order** in web panel
2. **System auto-assigns** first stage (Dyeing) to available staff
3. **Staff receives notification** on mobile app
4. **Staff accepts and works** on the task
5. **Upon completion**, next stage is automatically assigned
6. **Process continues** until order completion

### Real-time Updates
- Tasks sync automatically every 30 seconds
- Push notifications for new assignments
- Live status updates across all devices

## 🛠️ Development

### Running in Development Mode
```bash
flutter run --debug --hot
```

### Building for Production
```bash
# Android APK
flutter build apk --release

# Android App Bundle
flutter build appbundle --release
```

### Testing
```bash
flutter test
```

## 📊 Features in Detail

### Dashboard
- **Staff Profile** - Name, role, and availability status
- **Task Statistics** - Active, paused, and available task counts
- **My Tasks** - Currently assigned tasks with actions
- **Available Tasks** - Tasks ready for assignment

### Task Actions
- **Accept** - Take ownership of available tasks
- **Start** - Begin working on assigned tasks
- **Pause/Resume** - Manage work interruptions
- **Complete** - Finish with quality rating and notes

### Notifications
- **Task Assigned** - New task notifications
- **Status Updates** - Task progress notifications
- **System Alerts** - Important system messages

## 🔒 Security

- **JWT Authentication** - Secure API access
- **PIN-based Login** - Simple but secure staff authentication
- **Token Management** - Automatic token refresh and storage
- **Data Encryption** - Secure local data storage

## 🌐 Network Configuration

### For Android Emulator
- Backend URL: `http://10.0.2.2:3000`
- This maps to `localhost:3000` on your development machine

### For Physical Device
1. Find your computer's IP address
2. Update `baseUrl` in `ApiService`
3. Ensure firewall allows connections on port 3000

## 📞 Support

For technical support:
- **Email**: sapthalaredddydesigns@gmail.com
- **Phone**: 7794021608

## 📄 License

This project is part of the SAPTHALA Boutique Management System.

---

**Made with ❤️ for SAPTHALA Designer Workshop**