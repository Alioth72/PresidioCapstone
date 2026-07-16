output "key_vault_uri" {
  value       = azurerm_key_vault.kv.vault_uri
  description = "The URI of the Key Vault"
}

output "postgres_fqdn" {
  value       = azurerm_postgresql_flexible_server.postgres.fqdn
  description = "The fully qualified domain name of the PostgreSQL server"
}

output "backend_url" {
  value       = azurerm_container_app.backend.ingress[0].fqdn
  description = "The public URL of the backend API"
}

output "frontend_url" {
  value       = azurerm_container_app.frontend.ingress[0].fqdn
  description = "The public URL of the frontend app"
}
