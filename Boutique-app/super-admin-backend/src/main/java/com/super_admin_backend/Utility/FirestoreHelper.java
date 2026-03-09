package com.super_admin_backend.Utility;

 import com.google.cloud.firestore.Firestore;
 import lombok.RequiredArgsConstructor;
 import org.springframework.beans.factory.annotation.Autowired;
 import org.springframework.stereotype.Component;

import java.util.Map;

@Component
@RequiredArgsConstructor
public class FirestoreHelper {
    @Autowired
    private final Firestore firestore;
    public Firestore getDb() {
        return this.firestore; }
    public void saveAndWait(String collection, String docId, Map<String, Object> data) throws Exception {
        firestore.collection(collection).document(docId).set(data).get(); }
}

