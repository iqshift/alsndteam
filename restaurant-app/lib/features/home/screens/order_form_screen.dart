import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:restaurant_app/core/services/api_service.dart';
import 'package:restaurant_app/features/home/bloc/order_bloc.dart';
import 'package:shared_preferences/shared_preferences.dart';

class OrderFormScreen extends StatefulWidget {
  const OrderFormScreen({super.key});

  @override
  State<OrderFormScreen> createState() => _OrderFormScreenState();
}

class _OrderFormScreenState extends State<OrderFormScreen> {
  final _formKey = GlobalKey<FormState>();
  final _phoneController = TextEditingController();
  final _landmarkController = TextEditingController();
  final _valueController = TextEditingController();
  String? _selectedZoneId;
  double _deliveryPrice = 0;
  double _driverDeduction = 0;   // استقطاع السائق من المنطقة
  double _restaurantCommission = 0; // عمولة المطعم من الإعدادات
  String _selectedCategoryId = 'all';
  String _searchQuery = '';
  final _scrollController = ScrollController();
  int _currentStep = 0; // 0 = بيانات العميل، 1 = تفاصيل الطلب والتوصيل
  List<String> _pinnedZoneIds = [];

  @override
  void initState() {
    super.initState();
    _loadRestaurantCommission();
    _loadPinnedZones();
  }

  Future<void> _loadPinnedZones() async {
    try {
      final prefs = await SharedPreferences.getInstance();
      setState(() {
        _pinnedZoneIds = prefs.getStringList('pinned_zones') ?? [];
      });
    } catch (_) {}
  }

  Future<void> _togglePinZone(String zoneId) async {
    try {
      final prefs = await SharedPreferences.getInstance();
      setState(() {
        if (_pinnedZoneIds.contains(zoneId)) {
          _pinnedZoneIds.remove(zoneId);
        } else {
          _pinnedZoneIds.add(zoneId);
        }
        prefs.setStringList('pinned_zones', _pinnedZoneIds);
      });
    } catch (_) {}
  }

  Future<void> _loadRestaurantCommission() async {
    try {
      final settings = await context.read<ApiService>().getRestaurantSettings();
      setState(() {
        _restaurantCommission = (settings['restaurantCommission'] ?? 0).toDouble();
      });
    } catch (_) {}
  }

  @override
  void dispose() {
    _phoneController.dispose();
    _landmarkController.dispose();
    _valueController.dispose();
    _scrollController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: Text(_currentStep == 0 ? 'بيانات العميل' : 'تفاصيل الطلب والتوصيل'),
        leading: IconButton(
          icon: const Icon(Icons.arrow_back),
          onPressed: () {
            if (_currentStep == 1) {
              setState(() {
                _currentStep = 0;
              });
            } else {
              Navigator.pop(context);
            }
          },
        ),
      ),
      body: BlocListener<OrderBloc, OrderState>(
        listener: (context, state) {
          if (state is OrderSubmitted) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: const Text(
                  '✅ تم إرسال الطلب بنجاح! جاري البحث عن سائق...',
                  textAlign: TextAlign.center,
                  style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                ),
                backgroundColor: Theme.of(context).colorScheme.secondary,
                behavior: SnackBarBehavior.floating,
                margin: const EdgeInsets.all(16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            );
            Navigator.pop(context);
          } else if (state is OrderError) {
            ScaffoldMessenger.of(context).showSnackBar(
              SnackBar(
                content: Text(
                  state.message,
                  textAlign: TextAlign.center,
                  style: const TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                ),
                backgroundColor: Theme.of(context).colorScheme.error,
                behavior: SnackBarBehavior.floating,
                margin: const EdgeInsets.all(16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
              ),
            );
          }
        },
        child: BlocBuilder<OrderBloc, OrderState>(
          builder: (context, state) {
            final zones = state is OrderReady ? state.zones : [];
            final isSubmitting = state is OrderSubmitting;

            // تصفية الأقسام الرئيسية والأحياء
            final parentGroups = zones.where((z) => z['isGroup'] == true).toList();
            final neighborhoods = zones.where((z) => z['isGroup'] != true).toList();

            final categories = [
              {'id': 'all', 'name': 'الكل'},
              ...parentGroups,
            ];

            final filteredNeighborhoods = neighborhoods.where((n) {
              final matchesCategory = _selectedCategoryId == 'all' || n['parentId'] == _selectedCategoryId;
              final matchesSearch = n['name'].toString().toLowerCase().contains(_searchQuery.toLowerCase());
              return matchesCategory && matchesSearch;
            }).toList();

            // Sort: Pinned first, then by name
            filteredNeighborhoods.sort((a, b) {
              final aPinned = _pinnedZoneIds.contains(a['id'].toString());
              final bPinned = _pinnedZoneIds.contains(b['id'].toString());
              if (aPinned && !bPinned) return -1;
              if (!aPinned && bPinned) return 1;
              return a['name'].toString().compareTo(b['name'].toString());
            });

            return Form(
              key: _formKey,
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_currentStep == 1) ...[
                    // 1. Search Box (Higher, closer to top)
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 12, 16, 4),
                      child: TextFormField(
                        key: const ValueKey('search_field'),
                        onChanged: (val) {
                          setState(() {
                            _searchQuery = val;
                          });
                        },
                        decoration: const InputDecoration(
                          labelText: 'البحث عن حي سكني...',
                          hintText: 'اكتب اسم الحي للبحث السريع...',
                          prefixIcon: Icon(Icons.search_rounded),
                          contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                        ),
                      ),
                    ),
                    
                    // 2. Categories
                    Padding(
                      padding: const EdgeInsets.fromLTRB(16, 8, 16, 12),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'الأقسام والمناطق الرئيسية',
                            style: TextStyle(
                              fontSize: 12,
                              fontWeight: FontWeight.bold,
                              fontFamily: 'Cairo',
                              color: Color(0xFF64748B),
                            ),
                          ),
                          const SizedBox(height: 6),
                          SizedBox(
                            height: 42,
                            child: ListView.builder(
                              scrollDirection: Axis.horizontal,
                              itemCount: categories.length,
                              itemBuilder: (context, index) {
                                final cat = categories[index];
                                final isSelected = _selectedCategoryId == cat['id'];
                                return Padding(
                                  padding: const EdgeInsets.only(left: 8.0),
                                  child: ChoiceChip(
                                    label: Text(
                                      cat['name'].toString(),
                                      style: TextStyle(
                                        fontFamily: 'Cairo',
                                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                                        color: isSelected ? Colors.white : Colors.black87,
                                      ),
                                    ),
                                    selected: isSelected,
                                    selectedColor: Theme.of(context).primaryColor,
                                    backgroundColor: const Color(0xFFF1F5F9),
                                    onSelected: (selected) {
                                      setState(() {
                                        _selectedCategoryId = cat['id'].toString();
                                      });
                                    },
                                  ),
                                );
                              },
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                  
                  // 3. Step Content (Customer Form in step 0, or neighborhood selection grid in step 1)
                  Expanded(
                    child: _currentStep == 0
                        ? RefreshIndicator(
                            onRefresh: () async {
                              context.read<OrderBloc>().add(OrderLoadZones());
                              await Future.delayed(const Duration(seconds: 1));
                            },
                            child: SingleChildScrollView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              padding: const EdgeInsets.all(16),
                              child: _buildSectionCard(
                                context: context,
                                icon: Icons.person_pin_circle_rounded,
                                title: 'بيانات العميل',
                                children: [
                                  TextFormField(
                                    key: const ValueKey('phone_field'),
                                    controller: _phoneController,
                                    keyboardType: TextInputType.phone,
                                    style: const TextStyle(fontWeight: FontWeight.w600),
                                    decoration: const InputDecoration(
                                      labelText: 'رقم هاتف العميل',
                                      prefixIcon: Icon(Icons.phone_android_rounded),
                                    ),
                                    validator: (value) {
                                      if (value == null || value.trim().isEmpty) {
                                        return 'يرجى إدخال رقم هاتف العميل';
                                      }
                                      return null;
                                    },
                                  ),
                                  const SizedBox(height: 16),
                                  TextFormField(
                                    key: const ValueKey('value_field'),
                                    controller: _valueController,
                                    keyboardType: TextInputType.number,
                                    style: const TextStyle(fontWeight: FontWeight.w600),
                                    decoration: const InputDecoration(
                                      labelText: 'قيمة الطلب الكلية (د.ع)',
                                      prefixIcon: Icon(Icons.shopping_bag_rounded),
                                    ),
                                    validator: (value) {
                                      if (value == null || value.trim().isEmpty) {
                                        return 'يرجى إدخال قيمة الطلب';
                                      }
                                      if (double.tryParse(value) == null) {
                                        return 'يرجى إدخال رقم صحيح';
                                      }
                                      return null;
                                    },
                                  ),
                                ],
                              ),
                            ),
                          )
                        : Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.stretch,
                              children: [
                                const Text(
                                  'أحياء التوصيل المتاحة',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                    fontFamily: 'Cairo',
                                    color: Color(0xFF64748B),
                                  ),
                                ),
                                const SizedBox(height: 8),
                                Expanded(
                                  child: filteredNeighborhoods.isEmpty
                                      ? Center(
                                          child: SingleChildScrollView(
                                            physics: const AlwaysScrollableScrollPhysics(),
                                            child: Padding(
                                              padding: const EdgeInsets.all(32),
                                              child: Text(
                                                'لا توجد أحياء تطابق البحث حالياً في هذا القسم',
                                                textAlign: TextAlign.center,
                                                style: TextStyle(
                                                  fontFamily: 'Cairo',
                                                  color: Colors.grey[500],
                                                  fontSize: 13,
                                                ),
                                              ),
                                            ),
                                          ),
                                        )
                                      : Scrollbar(
                                          controller: _scrollController,
                                          thumbVisibility: true,
                                          thickness: 5,
                                          radius: const Radius.circular(10),
                                          child: GridView.builder(
                                            controller: _scrollController,
                                            padding: const EdgeInsets.only(left: 8, bottom: 20),
                                            physics: const BouncingScrollPhysics(),
                                            gridDelegate: const SliverGridDelegateWithFixedCrossAxisCount(
                                              crossAxisCount: 2,
                                              crossAxisSpacing: 10,
                                              mainAxisSpacing: 10,
                                              childAspectRatio: 2.4,
                                            ),
                                            itemCount: filteredNeighborhoods.length,
                                            itemBuilder: (context, index) {
                                              final n = filteredNeighborhoods[index];
                                              final isSelected = _selectedZoneId == n['id'];
                                              final isPinned = _pinnedZoneIds.contains(n['id'].toString());
                                              final deliveryPrice = double.tryParse((n['deliveryPrice'] ?? 0).toString()) ?? 0;
                                              
                                              return InkWell(
                                                onTap: () {
                                                  setState(() {
                                                    _selectedZoneId = n['id'];
                                                    _deliveryPrice = deliveryPrice;
                                                    _driverDeduction = double.tryParse((n['driverDeduction'] ?? 0).toString()) ?? 0;
                                                  });
                                                },
                                                borderRadius: BorderRadius.circular(12),
                                                child: AnimatedContainer(
                                                  duration: const Duration(milliseconds: 200),
                                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                                                  decoration: BoxDecoration(
                                                    color: isSelected
                                                        ? Theme.of(context).primaryColor.withOpacity(0.06)
                                                        : Colors.white,
                                                    borderRadius: BorderRadius.circular(12),
                                                    border: Border.all(
                                                      color: isSelected
                                                          ? Theme.of(context).primaryColor
                                                          : const Color(0xFFE2E8F0),
                                                      width: isSelected ? 2 : 1.5,
                                                    ),
                                                    boxShadow: isSelected
                                                        ? [BoxShadow(color: Theme.of(context).primaryColor.withOpacity(0.08), blurRadius: 8, offset: const Offset(0, 2))]
                                                        : [BoxShadow(color: Colors.black.withOpacity(0.01), blurRadius: 4, offset: const Offset(0, 1))],
                                                  ),
                                                  child: Stack(
                                                    children: [
                                                      // Card Content
                                                      Align(
                                                        alignment: Alignment.centerRight,
                                                        child: Padding(
                                                          padding: const EdgeInsets.only(left: 24.0), // space for pin/check icons
                                                          child: Column(
                                                            crossAxisAlignment: CrossAxisAlignment.start,
                                                            mainAxisAlignment: MainAxisAlignment.center,
                                                            children: [
                                                              Text(
                                                                n['name'].toString(),
                                                                style: TextStyle(
                                                                  fontSize: 12,
                                                                  fontWeight: FontWeight.bold,
                                                                  color: isSelected ? Theme.of(context).primaryColor : const Color(0xFF1E293B),
                                                                  fontFamily: 'Cairo',
                                                                ),
                                                                maxLines: 1,
                                                                overflow: TextOverflow.ellipsis,
                                                              ),
                                                              const SizedBox(height: 2),
                                                              Text(
                                                                '${deliveryPrice.toInt()} د.ع',
                                                                style: TextStyle(
                                                                  fontSize: 11,
                                                                  color: isSelected ? Theme.of(context).primaryColor : const Color(0xFF64748B),
                                                                  fontFamily: 'Cairo',
                                                                  fontWeight: FontWeight.w600,
                                                                ),
                                                              ),
                                                            ],
                                                          ),
                                                        ),
                                                      ),
                                                      
                                                      // Pin Button (Top-Left corner)
                                                      Positioned(
                                                        left: 0,
                                                        top: 0,
                                                        child: GestureDetector(
                                                          onTap: () {
                                                            _togglePinZone(n['id'].toString());
                                                          },
                                                          child: Padding(
                                                            padding: const EdgeInsets.all(4.0),
                                                            child: Icon(
                                                              isPinned ? Icons.push_pin_rounded : Icons.push_pin_outlined,
                                                              size: 16,
                                                              color: isPinned ? const Color(0xFFF59E0B) : const Color(0xFFCBD5E1),
                                                            ),
                                                          ),
                                                        ),
                                                      ),

                                                      // Selection Check Icon (Bottom-Left corner)
                                                      if (isSelected)
                                                        Positioned(
                                                          left: 0,
                                                          bottom: 0,
                                                          child: Icon(
                                                            Icons.check_circle_rounded,
                                                            color: Theme.of(context).primaryColor,
                                                            size: 18,
                                                          ),
                                                        ),
                                                    ],
                                                  ),
                                                ),
                                              );
                                            },
                                          ),
                                        ),
                                ),
                              ],
                            ),
                          ),
                  ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.05),
                        blurRadius: 10,
                        offset: const Offset(0, -4),
                      ),
                    ],
                    border: const Border(
                      top: BorderSide(color: Color(0xFFF1F5F9), width: 1),
                    ),
                  ),
                  child: SafeArea(
                    child: _currentStep == 0
                        ? ElevatedButton(
                            onPressed: () {
                              if (_formKey.currentState!.validate()) {
                                setState(() {
                                  _currentStep = 1;
                                });
                              }
                            },
                            style: ElevatedButton.styleFrom(
                              minimumSize: const Size.fromHeight(56),
                              shape: RoundedRectangleBorder(
                                borderRadius: BorderRadius.circular(16),
                              ),
                            ),
                            child: const Row(
                              mainAxisAlignment: MainAxisAlignment.center,
                              children: [
                                Text(
                                  'التالي',
                                  style: TextStyle(fontSize: 16, fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                                ),
                                SizedBox(width: 8),
                                Icon(Icons.arrow_forward_rounded),
                              ],
                            ),
                          )
                        : Row(
                            children: [
                              Expanded(
                                flex: 2,
                                child: OutlinedButton(
                                  onPressed: () {
                                    setState(() {
                                      _currentStep = 0;
                                    });
                                  },
                                  style: OutlinedButton.styleFrom(
                                    minimumSize: const Size.fromHeight(56),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                  ),
                                  child: const Text(
                                    'السابق',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: TextStyle(fontSize: 14, fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                                  ),
                                ),
                              ),
                              const SizedBox(width: 12),
                              Expanded(
                                flex: 3,
                                child: ElevatedButton.icon(
                                  onPressed: isSubmitting
                                      ? null
                                      : () {
                                          if (_selectedZoneId == null) {
                                            ScaffoldMessenger.of(context).showSnackBar(
                                              SnackBar(
                                                content: const Text(
                                                  '⚠️ يرجى اختيار حي أو منطقة التوصيل أولاً',
                                                  textAlign: TextAlign.center,
                                                  style: TextStyle(fontFamily: 'Cairo', fontWeight: FontWeight.bold),
                                                ),
                                                backgroundColor: Colors.amber.shade800,
                                                behavior: SnackBarBehavior.floating,
                                                margin: const EdgeInsets.all(16),
                                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                                              ),
                                            );
                                            return;
                                          }
                                          if (_formKey.currentState!.validate()) {
                                            context.read<OrderBloc>().add(OrderSubmit(
                                                  customerPhone: _phoneController.text.trim(),
                                                  customerAddress: '',
                                                  nearestLandmark:
                                                      _landmarkController.text.trim().isNotEmpty
                                                          ? _landmarkController.text.trim()
                                                          : null,
                                                  orderValue:
                                                      double.parse(_valueController.text.trim()),
                                                  zoneId: _selectedZoneId!,
                                                ));
                                          }
                                        },
                                  style: ElevatedButton.styleFrom(
                                    minimumSize: const Size.fromHeight(56),
                                    shape: RoundedRectangleBorder(
                                      borderRadius: BorderRadius.circular(16),
                                    ),
                                  ),
                                  icon: isSubmitting
                                      ? const SizedBox(
                                          height: 22,
                                          width: 22,
                                          child: CircularProgressIndicator(
                                            strokeWidth: 2.5,
                                            valueColor: AlwaysStoppedAnimation<Color>(Colors.white),
                                          ),
                                        )
                                      : const Icon(Icons.send_rounded),
                                  label: Text(
                                    isSubmitting ? 'جاري الإرسال...' : 'إرسال الطلب',
                                    maxLines: 1,
                                    overflow: TextOverflow.ellipsis,
                                    style: const TextStyle(fontSize: 14, fontFamily: 'Cairo', fontWeight: FontWeight.bold),
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
        },
        ),
      ),
    );
  }

  Widget _buildSectionCard({
    required BuildContext context,
    required IconData icon,
    required String title,
    required List<Widget> children,
  }) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(20),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            if (title.isNotEmpty) ...[
              Row(
                children: [
                  Container(
                    padding: const EdgeInsets.all(8),
                    decoration: BoxDecoration(
                      color: Theme.of(context).primaryColor.withOpacity(0.1),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, color: Theme.of(context).primaryColor, size: 20),
                  ),
                  const SizedBox(width: 12),
                  Text(
                    title,
                    style: const TextStyle(
                      fontSize: 16,
                      fontWeight: FontWeight.bold,
                      color: Color(0xFF1E293B),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 20),
            ],
            ...children,
          ],
        ),
      ),
    );
  }
}
