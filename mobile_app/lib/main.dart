import 'dart:async';
import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:permission_handler/permission_handler.dart';
import 'package:call_log/call_log.dart';
import 'package:http/http.dart' as http;
import 'package:shared_preferences/shared_preferences.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:socket_io_client/socket_io_client.dart' as IO;
import 'package:url_launcher/url_launcher.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Call Companion Mobile',
      theme: ThemeData(primarySwatch: Colors.blue, useMaterial3: true),
      home: const HomeScreen(),
    );
  }
}

class HomeScreen extends StatefulWidget {
  const HomeScreen({super.key});

  @override
  State<HomeScreen> createState() => _HomeScreenState();
}

class _HomeScreenState extends State<HomeScreen> with WidgetsBindingObserver {
  String _status = 'Idle';
  String? _token;
  String? _serverUrl;
  List<String> _logs = [];
  IO.Socket? _socket;
  final FlutterLocalNotificationsPlugin _notificationsPlugin =
      FlutterLocalNotificationsPlugin();

  String? _pendingCallRequestId;
  String? _pendingCallNumber;
  String? _pendingCallName;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _initializeNotifications();
    _loadSettings();
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _socket?.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && _token != null) {
      _connectWebSocket();
    } else if (state == AppLifecycleState.paused) {
      _socket?.disconnect();
    }
  }

  Future<void> _initializeNotifications() async {
    const androidSettings =
        AndroidInitializationSettings('@mipmap/ic_launcher');
    const initSettings = InitializationSettings(android: androidSettings);

    await _notificationsPlugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationTap,
    );
  }

  void _onNotificationTap(NotificationResponse response) {
    if (response.payload != null) {
      final data = jsonDecode(response.payload!);
      if (response.actionId == 'accept') {
        _acceptCall(
            data['request_id'], data['phone_number'], data['customer_name']);
      } else if (response.actionId == 'reject') {
        _rejectCall(data['request_id']);
      }
    }
  }

  Future<void> _loadSettings() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _token = prefs.getString('token');
      _serverUrl = prefs.getString('serverUrl');
      _status = _token != null ? 'Connecting...' : 'Not Paired';
    });

    if (_token != null) {
      _verifyConnection();
      _connectWebSocket();
    }
  }

  void _connectWebSocket() {
    if (_token == null || _serverUrl == null) return;

    _socket?.dispose();

    _socket = IO.io(_serverUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
    });

    _socket!.onConnect((_) {
      print('[WebSocket] Connected');
      _socket!.emit('mobile:authenticate', _token);
    });

    _socket!.on('mobile:authenticated', (data) {
      print('[WebSocket] Authenticated: $data');
      setState(() => _status = 'Connected (Real-time)');
    });

    _socket!.on('mobile:auth_error', (data) {
      print('[WebSocket] Auth error: $data');
      setState(() => _status = 'Authentication Failed');
    });

    _socket!.on('call:request', (data) {
      print('[WebSocket] Call request received: $data');
      _showCallRequestNotification(
        data['request_id'],
        data['customer_name'],
        data['phone_number'],
      );
    });

    _socket!.onDisconnect((_) {
      print('[WebSocket] Disconnected');
      setState(() => _status = 'Disconnected');
    });
  }

  Future<void> _showCallRequestNotification(
      String requestId, String customerName, String phoneNumber) async {
    setState(() {
      _pendingCallRequestId = requestId;
      _pendingCallNumber = phoneNumber;
      _pendingCallName = customerName;
    });

    const androidDetails = AndroidNotificationDetails(
      'call_requests',
      'Call Requests',
      channelDescription: 'Incoming call requests from CRM',
      importance: Importance.max,
      priority: Priority.high,
      actions: [
        AndroidNotificationAction('accept', 'Accept', showsUserInterface: true),
        AndroidNotificationAction('reject', 'Reject'),
      ],
    );

    final payload = jsonEncode({
      'request_id': requestId,
      'phone_number': phoneNumber,
      'customer_name': customerName,
    });

    await _notificationsPlugin.show(
      0,
      'Call Request',
      'Call $customerName - $phoneNumber?',
      const NotificationDetails(android: androidDetails),
      payload: payload,
    );
  }

  Future<void> _acceptCall(
      String requestId, String phoneNumber, String customerName) async {
    try {
      // Update status on backend
      await http.post(
        Uri.parse('$_serverUrl/api/mobile/respond-call'),
        headers: {
          'x-auth-token': _token!,
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'request_id': requestId, 'action': 'accept'}),
      );

      // Launch phone dialer
      final uri = Uri.parse('tel:$phoneNumber');
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri);
        setState(() {
          _status = 'Calling $customerName...';
          _logs
              .add('${DateTime.now().toIso8601String()}: Called $customerName');
        });
      }

      // Clear notification
      await _notificationsPlugin.cancel(0);
    } catch (e) {
      print('[Call] Error accepting call: $e');
      setState(() => _status = 'Error: $e');
    }
  }

  Future<void> _rejectCall(String requestId) async {
    try {
      await http.post(
        Uri.parse('$_serverUrl/api/mobile/respond-call'),
        headers: {
          'x-auth-token': _token!,
          'Content-Type': 'application/json',
        },
        body: jsonEncode({'request_id': requestId, 'action': 'reject'}),
      );

      setState(() {
        _status = 'Call rejected';
        _logs.add('${DateTime.now().toIso8601String()}: Rejected call');
      });

      await _notificationsPlugin.cancel(0);
    } catch (e) {
      print('[Call] Error rejecting call: $e');
    }
  }

  Future<void> _pair(String qrData) async {
    try {
      final data = jsonDecode(qrData);
      final token = data['token'];
      String url = data['serverUrl'] ?? 'http://10.0.2.2:5000';

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('token', token);
      await prefs.setString('serverUrl', url);

      setState(() {
        _token = token;
        _serverUrl = url;
        _status = 'Paired!';
      });

      _verifyConnection();
      _connectWebSocket();
    } catch (e) {
      setState(() => _status = 'Pairing Error: $e');
    }
  }

  Future<void> _verifyConnection() async {
    if (_token == null || _serverUrl == null) return;
    try {
      final response = await http.get(
        Uri.parse('$_serverUrl/api/mobile/verify'),
        headers: {'x-auth-token': _token!},
      );
      if (response.statusCode == 200) {
        final user = jsonDecode(response.body)['user'];
        setState(() => _status = 'Connected: ${user['name']}');
      } else {
        setState(() => _status = 'Connection Failed: ${response.statusCode}');
      }
    } catch (e) {
      setState(() => _status = 'Network Error: $e');
    }
  }

  Future<void> _syncCalls() async {
    if (_token == null || _serverUrl == null) {
      setState(() => _status = 'Not paired');
      return;
    }

    setState(() => _status = 'Requesting Permissions...');

    // Request permissions
    Map<Permission, PermissionStatus> statuses = await [
      Permission.phone,
      Permission.notification,
    ].request();

    if (statuses[Permission.phone]!.isGranted) {
      setState(() => _status = 'Reading Call Logs...');

      final now = DateTime.now();
      final from = now.subtract(const Duration(hours: 24));

      Iterable<CallLogEntry> entries = await CallLog.query(
        dateFrom: from.millisecondsSinceEpoch,
        dateTo: now.millisecondsSinceEpoch,
      );

      List<Map<String, dynamic>> payload = [];
      for (var entry in entries) {
        payload.add({
          'phoneNumber': entry.number,
          'type': _getCallType(entry.callType),
          'duration': entry.duration,
          'timestamp': entry.timestamp,
        });
      }

      setState(() => _status = 'Syncing ${payload.length} calls...');

      try {
        final response = await http.post(
          Uri.parse('$_serverUrl/api/mobile/sync-logs'),
          headers: {
            'x-auth-token': _token!,
            'Content-Type': 'application/json'
          },
          body: jsonEncode({'logs': payload}),
        );

        if (response.statusCode == 200) {
          final resData = jsonDecode(response.body);
          setState(() {
            _status =
                'Synced: ${resData['synced']} leads, Filtered: ${resData['filtered']} non-leads';
            _logs.add(
                '${DateTime.now().toIso8601String()}: Synced ${resData['synced']} calls');
          });
        } else {
          setState(() => _status = 'Sync Failed: ${response.body}');
        }
      } catch (e) {
        setState(() => _status = 'Sync Error: $e');
      }
    } else {
      setState(() => _status = 'Permissions Denied');
    }
  }

  String _getCallType(CallType? type) {
    if (type == CallType.incoming) return 'incoming';
    if (type == CallType.outgoing) return 'outgoing';
    if (type == CallType.missed) return 'missed';
    return 'unknown';
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Call Companion Sync'),
        actions: [
          if (_socket?.connected == true)
            const Padding(
              padding: EdgeInsets.all(16.0),
              child: Icon(Icons.wifi, color: Colors.green),
            ),
        ],
      ),
      body: Padding(
        padding: const EdgeInsets.all(16.0),
        child: Column(
          children: [
            Card(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  children: [
                    Row(
                      children: [
                        Icon(
                          _socket?.connected == true
                              ? Icons.check_circle
                              : Icons.circle_outlined,
                          color: _socket?.connected == true
                              ? Colors.green
                              : Colors.grey,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            'Status: $_status',
                            style: const TextStyle(fontWeight: FontWeight.bold),
                          ),
                        ),
                      ],
                    ),
                    if (_serverUrl != null)
                      Text('Server: $_serverUrl',
                          style: const TextStyle(fontSize: 12)),
                  ],
                ),
              ),
            ),
            const SizedBox(height: 20),

            // Pending call request card
            if (_pendingCallRequestId != null)
              Card(
                color: Colors.orange.shade50,
                child: Padding(
                  padding: const EdgeInsets.all(16.0),
                  child: Column(
                    children: [
                      Text(
                        'Call Request',
                        style: Theme.of(context).textTheme.titleMedium,
                      ),
                      const SizedBox(height: 8),
                      Text('$_pendingCallName\n$_pendingCallNumber',
                          textAlign: TextAlign.center),
                      const SizedBox(height: 12),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceEvenly,
                        children: [
                          ElevatedButton.icon(
                            onPressed: () => _acceptCall(
                              _pendingCallRequestId!,
                              _pendingCallNumber!,
                              _pendingCallName!,
                            ),
                            icon: const Icon(Icons.phone),
                            label: const Text('Accept'),
                            style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.green),
                          ),
                          ElevatedButton.icon(
                            onPressed: () =>
                                _rejectCall(_pendingCallRequestId!),
                            icon: const Icon(Icons.phone_disabled),
                            label: const Text('Reject'),
                            style: ElevatedButton.styleFrom(
                                backgroundColor: Colors.red),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
              ),

            const SizedBox(height: 20),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceEvenly,
              children: [
                ElevatedButton.icon(
                  onPressed: () {
                    Navigator.of(context).push(MaterialPageRoute(
                      builder: (context) => QRScanScreen(onScan: _pair),
                    ));
                  },
                  icon: const Icon(Icons.qr_code),
                  label: const Text('Pair Device'),
                ),
                ElevatedButton.icon(
                  onPressed: _syncCalls,
                  icon: const Icon(Icons.sync),
                  label: const Text('Sync Now'),
                ),
              ],
            ),
            const Divider(height: 40),
            Expanded(
              child: ListView.builder(
                itemCount: _logs.length,
                itemBuilder: (ctx, i) => ListTile(
                  leading: const Icon(Icons.history, size: 16),
                  title: Text(_logs[i], style: const TextStyle(fontSize: 12)),
                ),
              ),
            )
          ],
        ),
      ),
    );
  }
}

class QRScanScreen extends StatelessWidget {
  final Function(String) onScan;
  const QRScanScreen({super.key, required this.onScan});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('Scan QR Code')),
      body: MobileScanner(
        onDetect: (capture) {
          final List<Barcode> barcodes = capture.barcodes;
          for (final barcode in barcodes) {
            if (barcode.rawValue != null) {
              onScan(barcode.rawValue!);
              Navigator.pop(context);
              break;
            }
          }
        },
      ),
    );
  }
}
