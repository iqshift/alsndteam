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

  String _formatPrice(double price) {
    final String str = price.toInt().toString();
    return '${str.replaceAllMapped(RegExp(r'(\d{1,3})(?=(\d{3})+(?!\d))'), (Match m) => '${m[1]},')} د.ع';
  }

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

        // تصفية المجموعات لتقتصر فقط على التي تحتوي أحياء مضافة ومسعرة لهذا المطعم
        final activeParentGroups = parentGroups.where((g) {
          return neighborhoods.any((n) => n['parentId'] == g['id']);
        }).toList();

        // فرز المجموعات حسب الأكبر عدداً من الأحياء
        activeParentGroups.sort((a, b) {
          final countA = neighborhoods.where((n) => n['parentId'] == a['id']).length;
          final countB = neighborhoods.where((n) => n['parentId'] == b['id']).length;
          return countB.compareTo(countA);
        });

        final categories = [
          {'id': 'all', 'name': 'الكل (${neighborhoods.length})'},
          ...activeParentGroups.map((g) {
            final count = neighborhoods.where((n) => n['parentId'] == g['id']).length;
            return {
              'id': g['id'],
              'name': '${g['name']} ($count)',
            };
          }),
        ];

        final filteredNeighborhoods = neighborhoods.where((n) {
          final matchesCategory = _selectedCategoryId == 'all' || n['parentId'] == _selectedCategoryId;
          final matchesSearch = n['name'].toString().toLowerCase().contains(_searchQuery.toLowerCase());
          return matchesCategory && matchesSearch;
        }).toList();

        return Column(
          children: [
            // حقل البحث ورأس النتيجة
            Padding(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 8),
              child: TextFormField(
                onChanged: (val) {
                  setState(() {
                    _searchQuery = val;
                  });
                },
                decoration: InputDecoration(
                  labelText: 'البحث عن حي أو منطقة...',
                  hintText: 'اكتب اسم المنطقة للبحث الفوري...',
                  prefixIcon: const Icon(Icons.search_rounded),
                  suffixIcon: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                    margin: const EdgeInsets.only(left: 8),
                    child: Center(
                      widthFactor: 1,
                      child: Text(
                        '${filteredNeighborhoods.length} منطقة',
                        style: TextStyle(
                          fontFamily: 'Cairo',
                          fontSize: 11,
                          fontWeight: FontWeight.bold,
                          color: Theme.of(context).primaryColor,
                        ),
                      ),
                    ),
                  ),
                  contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                ),
              ),
            ),

            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 2),
              child: Wrap(
                spacing: 6,
                runSpacing: 6,
                children: categories.map((cat) {
                  final isSelected = _selectedCategoryId == cat['id'].toString();
                  return ChoiceChip(
                    label: Text(
                      cat['name'].toString(),
                      style: TextStyle(
                        fontFamily: 'Cairo',
                        fontSize: 11,
                        fontWeight: isSelected ? FontWeight.bold : FontWeight.normal,
                        color: isSelected ? Colors.white : const Color(0xFF334155),
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
                  );
                }).toList(),
              ),
            ),

            const SizedBox(height: 6),

            // قائمة عرض الأسعار العصرية المكثفة
            Expanded(
              child: filteredNeighborhoods.isEmpty
                  ? Center(
                      child: Text(
                        'لا توجد مناطق تطابق خيارات البحث',
                        style: TextStyle(fontFamily: 'Cairo', color: Colors.grey[500], fontSize: 13),
                      ),
                    )
                  : ListView.builder(
                      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                      itemCount: filteredNeighborhoods.length,
                      itemBuilder: (context, index) {
                        final n = filteredNeighborhoods[index];
                        final deliveryPrice = double.tryParse((n['deliveryPrice'] ?? 0).toString()) ?? 0;
                        final parentId = n['parentId'];
                        final parentName = parentGroups.firstWhere(
                          (p) => p['id'] == parentId,
                          orElse: () => null,
                        )?['name'] ?? 'حي مستقل';

                        return Card(
                          margin: const EdgeInsets.only(bottom: 8),
                          elevation: 0,
                          shape: RoundedRectangleBorder(
                            borderRadius: BorderRadius.circular(12),
                            side: const BorderSide(color: Color(0xFFE2E8F0), width: 1.2),
                          ),
                          child: Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            child: Row(
                              children: [
                                Container(
                                  padding: const EdgeInsets.all(8),
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).primaryColor.withOpacity(0.08),
                                    borderRadius: BorderRadius.circular(10),
                                  ),
                                  child: Icon(Icons.location_on_rounded, size: 20, color: Theme.of(context).primaryColor),
                                ),
                                const SizedBox(width: 12),
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Text(
                                        n['name'].toString(),
                                        style: const TextStyle(
                                          fontFamily: 'Cairo',
                                          fontWeight: FontWeight.bold,
                                          fontSize: 14,
                                          color: Color(0xFF0F172A),
                                        ),
                                      ),
                                      const SizedBox(height: 2),
                                      Text(
                                        parentId != null ? 'منطقة: $parentName' : 'حي مستقل',
                                        style: const TextStyle(
                                          fontFamily: 'Cairo',
                                          fontSize: 11,
                                          color: Color(0xFF64748B),
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
                                  decoration: BoxDecoration(
                                    color: Theme.of(context).primaryColor.withOpacity(0.06),
                                    borderRadius: BorderRadius.circular(8),
                                  ),
                                  child: Text(
                                    _formatPrice(deliveryPrice),
                                    style: TextStyle(
                                      fontFamily: 'Cairo',
                                      fontWeight: FontWeight.w900,
                                      color: Theme.of(context).primaryColor,
                                      fontSize: 13,
                                    ),
                                  ),
                                ),
                              ],
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
