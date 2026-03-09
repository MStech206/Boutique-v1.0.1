package com.super_admin_backend.Controller;

import com.super_admin_backend.Entity.Client;
import com.super_admin_backend.Service.ClientService;
import com.super_admin_backend.dto.ClientDTO;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutionException;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api/super-admin/clients")
public class ClientController {

    private final ClientService clientService;

    public ClientController(ClientService clientService) {
        this.clientService = clientService;
    }

    // 🔹 GET all clients (with admin count)
    @GetMapping public List<ClientDTO> getAllClients() throws Exception {
        return clientService.getAllClients()
                .stream()
                .map(this::mapToDTO)
                .collect(Collectors.toList());
    }

    // 🔹 GET client by ID
    @GetMapping("/{id}")
    public Client getClientById(@PathVariable String id) throws Exception {
        return clientService.getClientById(id);
    }

    // 🔹 ADD client
    @PostMapping
    public Client addClient(@RequestBody Client client) throws Exception {
        return clientService.saveClient(client);
    }

    // 🔹 UPDATE client
    @PutMapping("/{id}")
    public Client updateClient(
            @PathVariable String id,
            @RequestBody Client updatedClient
    ) throws Exception {
        return clientService.updateClient(id, updatedClient);
    }

    // 🔹 DELETE client
    @DeleteMapping("/{id}")
    public void deleteClient(@PathVariable String id) throws Exception {
        clientService.deleteClient(id);
    }

    // 🔹 COUNT clients
    @GetMapping("/count")
    public Map<String, Long> getClientsCount() throws Exception {
        return Map.of("count", clientService.countClients());
    }

    // 🔁 DTO mapper
    private ClientDTO mapToDTO(Client client) {
        ClientDTO dto = new ClientDTO();
        dto.setId(client.getId());
        dto.setName(client.getName());
        dto.setEmail(client.getEmail());
        dto.setStatus(client.getStatus());
        dto.setBoutiqueName(client.getBoutiqueName());
        dto.setAddress(client.getAddress());
        try {
              dto.setNumberOfAdmins(
                      clientService.countAdminsForClient(client.getId())
              );
        } catch (ExecutionException | InterruptedException e) {
            throw new RuntimeException("Failed to count admins", e);
        }
        return dto;
    }
}
