import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:driver_app/core/services/api_service.dart';
import 'package:driver_app/core/services/socket_service.dart';
import 'package:intl/intl.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import 'package:driver_app/core/config/constants.dart';

class SupportChatScreen extends StatefulWidget {
  final String driverId;
  final String driverName;
  static bool isActive = false;

  const SupportChatScreen({
    super.key,
    required this.driverId,
    required this.driverName,
  });

  @override
  State<SupportChatScreen> createState() => _SupportChatScreenState();
}

class _SupportChatScreenState extends State<SupportChatScreen> {
  final List<Map<String, dynamic>> _messages = [];
  final TextEditingController _messageController = TextEditingController();
  final ScrollController _scrollController = ScrollController();
  bool _loading = true;
  bool _sending = false;
  XFile? _selectedImageFile;

  @override
  void initState() {
    super.initState();
    SupportChatScreen.isActive = true;
    _loadMessages();
    _setupSocketListener();
  }

  @override
  void dispose() {
    SupportChatScreen.isActive = false;
    _messageController.dispose();
    _scrollController.dispose();
    _removeSocketListener();
    super.dispose();
  }

  void _loadMessages() async {
    try {
      final messagesData = await context.read<ApiService>().getSupportMessages();
      if (!mounted) return;
      setState(() {
        _messages.addAll(List<Map<String, dynamic>>.from(messagesData));
        _loading = false;
      });
      _scrollToBottom();
    } catch (e) {
      if (!mounted) return;
      setState(() {
        _loading = false;
      });
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          content: Text('❌ فشل تحميل الرسائل السابقة', style: TextStyle(fontFamily: 'Cairo')),
          backgroundColor: Colors.red,
        ),
      );
    }
  }

  void _setupSocketListener() {
    final socket = context.read<SocketService>().socket;
    socket?.on('new_support_message', _onNewMessage);
    socket?.on('support_chat_cleared', _onChatCleared);
  }

  void _removeSocketListener() {
    final socket = context.read<SocketService>().socket;
    socket?.off('new_support_message', _onNewMessage);
    socket?.off('support_chat_cleared', _onChatCleared);
  }

  void _onChatCleared(dynamic data) {
    if (mounted) {
      final payload = Map<String, dynamic>.from(data);
      if (payload['driverId'] == widget.driverId) {
        setState(() {
          _messages.clear();
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('🔒 تم إغلاق وتصفير المحادثة بواسطة الدعم الفني', textAlign: TextAlign.center, style: TextStyle(fontFamily: 'Cairo')),
            backgroundColor: Color(0xFFEF4444),
          ),
        );
        Navigator.pop(context);
      }
    }
  }

  void _onNewMessage(dynamic data) {
    if (mounted) {
      final message = Map<String, dynamic>.from(data);
      if (message['driverId'] == widget.driverId) {
        setState(() {
          if (!_messages.any((m) => m['id'] == message['id'])) {
            _messages.add(message);
          }
        });
        _scrollToBottom();
      }
    }
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(
      source: ImageSource.gallery,
      imageQuality: 80,
    );

    if (pickedFile != null) {
      setState(() {
        _selectedImageFile = pickedFile;
      });
    }
  }

  void _sendMessage() async {
    final text = _messageController.text.trim();
    if (text.isEmpty && _selectedImageFile == null) return;

    final imageFileToUpload = _selectedImageFile;
    _messageController.clear();
    setState(() {
      _sending = true;
      _selectedImageFile = null;
    });

    try {
      final apiService = context.read<ApiService>();

      // 1. If there is an image, upload and send it first
      if (imageFileToUpload != null) {
        final imageUrl = await apiService.uploadSupportImage(imageFileToUpload.path);
        final newImgMessage = await apiService.sendSupportMessage(imageUrl);
        if (mounted) {
          setState(() {
            if (!_messages.any((m) => m['id'] == newImgMessage['id'])) {
              _messages.add(Map<String, dynamic>.from(newImgMessage));
            }
          });
        }
      }

      // 2. If there is text, send it next
      if (text.isNotEmpty) {
        final newTextMessage = await apiService.sendSupportMessage(text);
        if (mounted) {
          setState(() {
            if (!_messages.any((m) => m['id'] == newTextMessage['id'])) {
              _messages.add(Map<String, dynamic>.from(newTextMessage));
            }
          });
        }
      }

      if (mounted) {
        setState(() {
          _sending = false;
        });
        _scrollToBottom();
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _sending = false;
        });
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            content: Text('❌ فشل إرسال الرسالة', style: TextStyle(fontFamily: 'Cairo')),
            backgroundColor: Colors.red,
          ),
        );
      }
    }
  }

  String _formatTime(String dateStr) {
    try {
      final dateTime = DateTime.parse(dateStr).toLocal();
      return DateFormat('hh:mm a', 'ar').format(dateTime);
    } catch (e) {
      return '';
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF4F7FE),
      appBar: AppBar(
        title: const Text(
          'دردشة الدعم الفني',
          style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, fontSize: 16),
        ),
        centerTitle: true,
      ),
      body: Column(
        children: [
          // Warning Banner
          Container(
            width: double.infinity,
            padding: const EdgeInsets.symmetric(vertical: 8, horizontal: 16),
            color: const Color(0xFF5C73FF).withOpacity(0.08),
            child: const Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.lock_outline_rounded, size: 14, color: Color(0xFF5C73FF)),
                SizedBox(width: 6),
                Text(
                  'المحادثة آمنة ومشفرة مع الإدارة مباشرة',
                  style: TextStyle(fontFamily: 'Cairo', fontSize: 11, color: Color(0xFF5C73FF), fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          
          // Message List
          Expanded(
            child: _loading
                ? const Center(child: CircularProgressIndicator(color: Color(0xFF5C73FF)))
                : _messages.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: [
                            Container(
                              padding: const EdgeInsets.all(20),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                shape: BoxShape.circle,
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.04),
                                    blurRadius: 10,
                                  )
                                ],
                              ),
                              child: const Icon(Icons.forum_rounded, size: 40, color: Color(0xFF5C73FF)),
                            ),
                            const SizedBox(height: 16),
                            const Text(
                              'لا توجد رسائل بعد',
                              style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold, color: Color(0xFF1E293B)),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'اكتب رسالة في الأسفل للتواصل مع الدعم الفني',
                              style: TextStyle(fontFamily: 'Cairo', fontSize: 12, color: Color(0xFF64748B)),
                            ),
                          ],
                        ),
                      )
                    : ListView.builder(
                        controller: _scrollController,
                        padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        itemCount: _messages.length,
                        itemBuilder: (context, index) {
                          final msg = _messages[index];
                          final isMe = msg['sender'] == 'driver';
                          final isImage = msg['content'].startsWith('/uploads/support/');
                          
                          return Align(
                            alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
                            child: Container(
                              margin: const EdgeInsets.only(bottom: 12),
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                              constraints: BoxConstraints(
                                maxWidth: MediaQuery.of(context).size.width * 0.75,
                              ),
                              decoration: BoxDecoration(
                                color: isMe ? const Color(0xFF5C73FF) : Colors.white,
                                borderRadius: BorderRadius.only(
                                  topLeft: const Radius.circular(16),
                                  topRight: const Radius.circular(16),
                                  bottomLeft: Radius.circular(isMe ? 16 : 4),
                                  bottomRight: Radius.circular(isMe ? 4 : 16),
                                ),
                                boxShadow: [
                                  BoxShadow(
                                    color: Colors.black.withOpacity(0.03),
                                    blurRadius: 4,
                                    offset: const Offset(0, 2),
                                  )
                                ],
                              ),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  isImage
                                      ? ClipRRect(
                                          borderRadius: BorderRadius.circular(8),
                                          child: GestureDetector(
                                            onTap: () {
                                              Navigator.push(
                                                context,
                                                MaterialPageRoute(
                                                  builder: (_) => FullScreenImageScreen(
                                                    imageUrl: '${AppConstants.socketUrl}${msg['content']}',
                                                  ),
                                                ),
                                              );
                                            },
                                            child: Image.network(
                                              '${AppConstants.socketUrl}${msg['content']}',
                                              fit: BoxFit.cover,
                                              loadingBuilder: (context, child, loadingProgress) {
                                                if (loadingProgress == null) return child;
                                                return const SizedBox(
                                                  width: 120,
                                                  height: 120,
                                                  child: Center(
                                                    child: CircularProgressIndicator(
                                                      color: Color(0xFF5C73FF),
                                                      strokeWidth: 2,
                                                    ),
                                                  ),
                                                );
                                              },
                                              errorBuilder: (context, error, stackTrace) => const Icon(
                                                Icons.broken_image,
                                                size: 50,
                                                color: Colors.grey,
                                              ),
                                            ),
                                          ),
                                        )
                                      : Text(
                                          msg['content'],
                                          style: TextStyle(
                                            fontFamily: 'Cairo',
                                            fontSize: 14,
                                            color: isMe ? Colors.white : const Color(0xFF1E293B),
                                            fontWeight: FontWeight.w600,
                                            height: 1.4,
                                          ),
                                        ),
                                  const SizedBox(height: 4),
                                  Text(
                                    _formatTime(msg['createdAt']),
                                    style: TextStyle(
                                      fontFamily: 'Cairo',
                                      fontSize: 9,
                                      color: isMe ? Colors.white.withOpacity(0.7) : const Color(0xFF94A3B8),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),

          // Image Preview Container above Input Bar
          if (_selectedImageFile != null)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.white,
                border: Border(top: BorderSide(color: Colors.grey.shade200)),
              ),
              child: Row(
                children: [
                  Stack(
                    clipBehavior: Clip.none,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(8),
                        child: Image.file(
                          File(_selectedImageFile!.path),
                          width: 60,
                          height: 60,
                          fit: BoxFit.cover,
                        ),
                      ),
                      Positioned(
                        top: -6,
                        right: -6,
                        child: GestureDetector(
                          onTap: () {
                            setState(() {
                              _selectedImageFile = null;
                            });
                          },
                          child: Container(
                            decoration: const BoxDecoration(
                              color: Colors.red,
                              shape: BoxShape.circle,
                            ),
                            padding: const EdgeInsets.all(3),
                            child: const Icon(
                              Icons.close,
                              size: 12,
                              color: Colors.white,
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(width: 16),
                  const Expanded(
                    child: Text(
                      'صورة جاهزة للإرسال',
                      style: TextStyle(fontFamily: 'Cairo', fontSize: 12, color: Colors.grey, fontWeight: FontWeight.bold),
                    ),
                  ),
                ],
              ),
            ),
          
          // Input Field
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            decoration: BoxDecoration(
              color: Colors.white,
              boxShadow: [
                BoxShadow(
                  color: Colors.black.withOpacity(0.04),
                  blurRadius: 10,
                  offset: const Offset(0, -4),
                )
              ],
            ),
            child: SafeArea(
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.attach_file, color: Color(0xFF64748B)),
                    onPressed: _sending ? null : _pickImage,
                  ),
                  Expanded(
                    child: Container(
                      decoration: BoxDecoration(
                        color: const Color(0xFFF1F5F9),
                        borderRadius: BorderRadius.circular(24),
                      ),
                      child: TextField(
                        controller: _messageController,
                        maxLines: null,
                        style: const TextStyle(fontFamily: 'Cairo', fontSize: 14),
                        decoration: const InputDecoration(
                          hintText: 'اكتب رسالتك هنا...',
                          hintStyle: TextStyle(fontFamily: 'Cairo', color: Color(0xFF94A3B8), fontSize: 13),
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 10),
                          border: InputBorder.none,
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  GestureDetector(
                    onTap: _sending ? null : _sendMessage,
                    child: Container(
                      padding: const EdgeInsets.all(12),
                      decoration: const BoxDecoration(
                        color: Color(0xFF5C73FF),
                        shape: BoxShape.circle,
                      ),
                      child: _sending
                          ? const SizedBox(
                              width: 20,
                              height: 20,
                              child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2),
                            )
                          : const Icon(
                              Icons.send_rounded,
                              color: Colors.white,
                              size: 20,
                            ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class FullScreenImageScreen extends StatelessWidget {
  final String imageUrl;

  const FullScreenImageScreen({super.key, required this.imageUrl});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        iconTheme: const IconThemeData(color: Colors.white),
      ),
      body: Center(
        child: InteractiveViewer(
          child: Image.network(imageUrl),
        ),
      ),
    );
  }
}
