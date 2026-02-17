class ProductModel {
  final String id;
  final String title;
  final String description;
  final double price;
  final int inventoryCount;

  ProductModel({required this.id, required this.title, required this.description, required this.price, required this.inventoryCount});

  factory ProductModel.fromJson(Map<String, dynamic> json) => ProductModel(
        id: json['id'] ?? '',
        title: json['title'] ?? '',
        description: json['description'] ?? '',
        price: (json['price'] as num).toDouble(),
        inventoryCount: (json['inventoryCount'] as num).toInt(),
      );
}
