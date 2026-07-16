import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:restaurant_app/features/home/bloc/order_bloc.dart';

class DeliveryPricesScreen extends StatefulWidget {
  const DeliveryPricesScreen({super.key});

  @override
  State<DeliveryPricesScreen> createState() => _DeliveryPricesScreenState();
}

class _DeliveryPricesScreenState extends State<DeliveryPricesScreen> {
  String _selectedCategoryId = 'all';
  String _searchQuery = '';

  @override
  Widget build(BuildContext context) {
    return BlocBuilder<OrderBloc, OrderState>(
      builder: (context, state) {
        if (state is OrderLoading) {
          return Center(
            child: CircularProgressIndicator(
              valueColor: AlwaysStoppedAnimation<Color>(Theme.of(context).primaryColor),
            ),
          );
        }

        final zones = state is OrderReady ? state.zones : [];
        if (zones.isEmpty) {
          return Center(
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                Icon(Icons.location_off_rounded, size: 64, color: Colors.grey[400]),
                const SizedBox(height: 16),
                Text(
                  'لا توجد مناطق توصيل مضافة حالياً',
                  style: TextStyle(fontFamily: 'Cairo', color: Colors.grey[600], fontSize: 15),
                ),
              ],
            ),
          );
        }

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

        return Column(
          children: [
            // حقل البحث
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: TextFormField(
                onChanged: (val) {
                  setState(() {
                    _searchQuery = val;
                  });
                },
                decoration: const InputDecoration(
                  labelText: 'البحث عن حي أو منطقة...',
                  hintText: 'اكتب اسم المنطقة للبحث الفوري...',
                  prefixIcon: Icon(Icons.search_rounded),
                  contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
              ),
            ),

            // شريط تبويبات الأقسام الأفقية
            SizedBox(
              height: 50,
              child: ListView.builder(
                scrollDirection: Axis.horizontal,
                padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 4),
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

            // قائمة عرض الأسعار
            Expanded(
              child: filteredNeighborhoods.isEmpty
                  ? Center(
                      child: Text(
                        'لا توجد مناطق تطابق خيارات البحث',
                        style: TextStyle(fontFamily: 'Cairo', color: Colors.grey[500], fontSize: 13),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.all(16),
                      itemCount: filteredNeighborhoods.length,
                      itemBuilder: (context, index) {
                        final n = filteredNeighborhoods[index];
                        final deliveryPrice = double.tryParse((n['deliveryPrice'] ?? 0).toString()) ?? 0;
                        final parentId = n['parentId'];
                        final parentName = parentGroups.firstWhere((p) => p['id'] == parentId, orElse: () => null)?['name'] ?? 'حي مستقل';

                        return Card(
                          margin: const EdgeInsets.only(bottom: 10),
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: Color(0xFFE2E8F0), width: 1.5),
                          ),
                          child: ListTile(
                            leading: Container(
                              padding: const EdgeInsets.all(8),
                              decoration: BoxDecoration(
                                color: Theme.of(context).primaryColor.withOpacity(0.08),
                                borderRadius: BorderRadius.circular(8),
                              ),
                              child: Icon(Icons.location_on_rounded, color: Theme.of(context).primaryColor),
                            ),
                            title: Text(
                              n['name'].toString(),
                              style: const TextStyle(
                                fontFamily: 'Cairo',
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                                color: Color(0xFF1E293B),
                              ),
                            ),
                            subtitle: Text(
                              parentId != null ? 'منطقة: $parentName' : 'حي مستقل',
                              style: TextStyle(
                                fontFamily: 'Cairo',
                                fontSize: 11,
                                color: Colors.grey[500],
                              ),
                            ),
                            trailing: Text(
                              '${deliveryPrice.toInt()} د.ع',
                              style: TextStyle(
                                fontFamily: 'Cairo',
                                fontWeight: FontWeight.w800,
                                color: Theme.of(context).primaryColor,
                                fontSize: 14,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ],
        );
      },
    );
  }
}
