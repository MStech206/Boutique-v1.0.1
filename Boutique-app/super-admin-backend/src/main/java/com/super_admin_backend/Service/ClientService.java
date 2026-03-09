package com.super_admin_backend.Service;

import com.google.api.core.ApiFuture;
import com.google.cloud.firestore.*;
import com.super_admin_backend.Entity.Client;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import com.google.api.core.ApiFutures;

import java.util.List;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@Service
public class ClientService {

    @Autowired
    private Firestore firestore;

    private static final String CLIENT_COLLECTION = "clients";
    private static final String ADMIN_COLLECTION = "boutique_admins";

    // ✅ Get all clients (unchanged logic, optimized mapping)
    public List<Client> getAllClients() throws ExecutionException, InterruptedException {
        QuerySnapshot snapshot = firestore.collection(CLIENT_COLLECTION).get().get();

        return snapshot.getDocuments()
                .stream()
                .map(doc -> {
                    Client c = doc.toObject(Client.class);
                    if (c != null) {
                        c.setId(doc.getId());
                    }
                    return c;
                })
                .collect(Collectors.toList());
    }

    // ✅ Get client by ID (already optimal)
    public Client getClientById(String id) throws ExecutionException, InterruptedException {
        DocumentSnapshot snapshot =
                firestore.collection(CLIENT_COLLECTION)
                        .document(id)
                        .get()
                        .get();

        if (!snapshot.exists()) {
            throw new RuntimeException("Client not found with id: " + id);
        }

        Client c = snapshot.toObject(Client.class);
        if (c != null) {
            c.setId(snapshot.getId());
        }
        return c;
    }

    // ✅ Save new client (already optimal)
    public Client saveClient(Client client) throws ExecutionException, InterruptedException {

        if (client.getId() == null || client.getId().isBlank()) {
            DocumentReference docRef =
                    firestore.collection(CLIENT_COLLECTION).document();

            client.setId(docRef.getId());
            docRef.set(client).get();
        } else {
            firestore.collection(CLIENT_COLLECTION)
                    .document(client.getId())
                    .set(client)
                    .get();
        }
        return client;
    }

    // ✅ Update client (already optimal)
    public Client updateClient(String id, Client updatedClient)
            throws ExecutionException, InterruptedException {

        DocumentReference docRef =
                firestore.collection(CLIENT_COLLECTION).document(id);

        DocumentSnapshot snapshot = docRef.get().get();
        if (!snapshot.exists()) {
            throw new RuntimeException("Client not found with id: " + id);
        }

        Client client = snapshot.toObject(Client.class);
        if (client == null) {
            throw new RuntimeException("Client data corrupted");
        }

        client.setName(updatedClient.getName());
        client.setEmail(updatedClient.getEmail());
        client.setStatus(updatedClient.getStatus());
        client.setBoutiqueName(updatedClient.getBoutiqueName());
        client.setAddress(updatedClient.getAddress());

        docRef.set(client).get();
        return client;
    }

    // ✅ Delete client (already optimal)
    public void deleteClient(String id) throws ExecutionException, InterruptedException {
        firestore.collection(CLIENT_COLLECTION)
                .document(id)
                .delete()
                .get();
    }

    // 🚀 COUNT clients (🔥 MAJOR PERFORMANCE FIX)
    public long countClients() throws ExecutionException, InterruptedException {
        return firestore.collection(CLIENT_COLLECTION)
                .count()
                .get()
                .get()
                .getCount();
    }
    public long countAdminsForClient(String clientId) throws ExecutionException, InterruptedException {
        return firestore.collection(ADMIN_COLLECTION)
                .whereEqualTo("clientId", clientId)
                .count() .get()
                .get()
                .getCount();
    }

}
