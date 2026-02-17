class AppUser {
  final String uid;
  final List<String> roles;
  final String jwt;
  final int? expiresAt;

  AppUser({required this.uid, required this.roles, required this.jwt, this.expiresAt});

  Map<String, dynamic> toJson() => {
        'uid': uid,
        'roles': roles,
        'jwt': jwt,
        'expiresAt': expiresAt,
      };

  factory AppUser.fromJson(Map<String, dynamic> json) => AppUser(
        uid: json['uid'] ?? '',
        roles: List<String>.from(json['roles'] ?? []),
        jwt: json['jwt'] ?? '',
        expiresAt: json['expiresAt'] != null ? json['expiresAt'] as int : null,
      );
}
