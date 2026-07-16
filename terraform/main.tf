data "azurerm_client_config" "current" {}

resource "random_string" "suffix" {
  length  = 6
  special = false
  upper   = false
}

resource "random_password" "db_password" {
  length           = 16
  special          = true
  override_special = "!#$%&*()-_=+[]{}<>:?"
}

# ─── Resource Group ───
resource "azurerm_resource_group" "rg" {
  name     = "rg-${var.project_name}-${var.environment}-${random_string.suffix.result}"
  location = var.location
}

# ─── User-Assigned Managed Identity ───
resource "azurerm_user_assigned_identity" "backend_identity" {
  name                = "id-${var.project_name}-backend-${var.environment}"
  resource_group_name = azurerm_resource_group.rg.name
  location            = azurerm_resource_group.rg.location
}

# ─── Key Vault ───
resource "azurerm_key_vault" "kv" {
  name                        = "kv-${var.project_name}-${var.environment}-${random_string.suffix.result}"
  location                    = azurerm_resource_group.rg.location
  resource_group_name         = azurerm_resource_group.rg.name
  tenant_id                   = data.azurerm_client_config.current.tenant_id
  sku_name                    = "standard"
  enable_rbac_authorization   = true
  soft_delete_retention_days  = 7
  purge_protection_enabled    = false
}

# ─── Custom Least-Privilege IAM Role ───
resource "azurerm_role_definition" "kv_secrets_reader" {
  name        = "${var.project_name}-kv-secrets-reader-${random_string.suffix.result}"
  scope       = azurerm_resource_group.rg.id
  description = "Least-privilege role to read secrets from Key Vault"

  permissions {
    actions = [
      "Microsoft.KeyVault/vaults/read"
    ]
    data_actions = [
      "Microsoft.KeyVault/vaults/secrets/getSecret/action",
      "Microsoft.KeyVault/vaults/secrets/readMetadata/action"
    ]
  }

  assignable_scopes = [
    azurerm_resource_group.rg.id
  ]
}

# ─── Key Vault Access for Terraform Runner (to write secrets) ───
resource "azurerm_role_assignment" "tf_runner_kv_officer" {
  scope                = azurerm_key_vault.kv.id
  role_definition_name = "Key Vault Secrets Officer"
  principal_id         = data.azurerm_client_config.current.object_id
}

# ─── Key Vault Access for Backend Managed Identity ───
resource "azurerm_role_assignment" "backend_kv_reader" {
  scope              = azurerm_key_vault.kv.id
  role_definition_id = azurerm_role_definition.kv_secrets_reader.role_definition_resource_id
  principal_id       = azurerm_user_assigned_identity.backend_identity.principal_id
}

# ─── Key Vault Secrets ───
resource "azurerm_key_vault_secret" "db_password" {
  name         = "database-password"
  value        = random_password.db_password.result
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [azurerm_role_assignment.tf_runner_kv_officer]
}

resource "azurerm_key_vault_secret" "gemini_key" {
  name         = "gemini-api-key"
  value        = var.gemini_api_key
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [azurerm_role_assignment.tf_runner_kv_officer]
}

resource "azurerm_key_vault_secret" "jwt_secret" {
  name         = "jwt-secret-key"
  value        = var.jwt_secret_key
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [azurerm_role_assignment.tf_runner_kv_officer]
}

# ─── PostgreSQL Flexible Server ───
resource "azurerm_postgresql_flexible_server" "postgres" {
  name                         = "db-${var.project_name}-${var.environment}-${random_string.suffix.result}"
  resource_group_name          = azurerm_resource_group.rg.name
  location                     = azurerm_resource_group.rg.location
  version                      = "16"
  administrator_login          = "libadmin"
  administrator_password       = random_password.db_password.result
  zone                         = "1"
  storage_mb                   = 32768
  sku_name                     = "B_Standard_B1ms" # Cheapest student-compatible VM SKU
  backup_retention_days        = 7
  geo_redundant_backup_enabled = false
}

resource "azurerm_postgresql_flexible_server_database" "library_db" {
  name      = "library"
  server_id = azurerm_postgresql_flexible_server.postgres.id
  collation = "en_US.utf8"
  charset   = "utf8"
}

# Firewall Rule allowing other Azure services (Container Apps) to connect to PostgreSQL Flexible Server
resource "azurerm_postgresql_flexible_server_firewall_rule" "allow_azure_services" {
  name             = "AllowAzureServices"
  server_id        = azurerm_postgresql_flexible_server.postgres.id
  start_ip_address = "0.0.0.0"
  end_ip_address   = "0.0.0.0"
}

# ─── Reference Existing Container App Environment (Subscription Quota Workaround) ───
data "azurerm_container_app_environment" "env" {
  name                = "cae-simple-api"
  resource_group_name = "rg-simple-api"
}

# Construct Database Connection String Key Vault Secret
resource "azurerm_key_vault_secret" "db_url" {
  name         = "database-url"
  value        = "postgresql+asyncpg://libadmin:${random_password.db_password.result}@${azurerm_postgresql_flexible_server.postgres.fqdn}:5432/library"
  key_vault_id = azurerm_key_vault.kv.id

  depends_on = [azurerm_role_assignment.tf_runner_kv_officer]
}

# ─── Container App Backend ───
resource "azurerm_container_app" "backend" {
  name                         = "ca-${var.project_name}-backend-${var.environment}"
  container_app_environment_id = data.azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  identity {
    type         = "UserAssigned"
    identity_ids = [azurerm_user_assigned_identity.backend_identity.id]
  }

  secret {
    name                = "database-url-secret"
    key_vault_secret_id = azurerm_key_vault_secret.db_url.id
    identity            = azurerm_user_assigned_identity.backend_identity.id
  }

  secret {
    name                = "gemini-key-secret"
    key_vault_secret_id = azurerm_key_vault_secret.gemini_key.id
    identity            = azurerm_user_assigned_identity.backend_identity.id
  }

  secret {
    name                = "jwt-secret-secret"
    key_vault_secret_id = azurerm_key_vault_secret.jwt_secret.id
    identity            = azurerm_user_assigned_identity.backend_identity.id
  }

  template {
    container {
      name   = "backend"
      image  = "presidiocapstone-backend:latest" # In prod, would point to an ACR image
      cpu    = "0.25"
      memory = "0.5Gi"

      env {
        name        = "DATABASE_URL"
        secret_name = "database-url-secret"
      }

      env {
        name        = "GEMINI_API_KEY"
        secret_name = "gemini-key-secret"
      }

      env {
        name        = "JWT_SECRET_KEY"
        secret_name = "jwt-secret-secret"
      }

      env {
        name  = "APP_ENV"
        value = "production"
      }
    }

    min_replicas = 0 # Scale to zero when not in use to save student credits
    max_replicas = 1
  }

  ingress {
    external_enabled = true
    target_port      = 8000
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}

# ─── Container App Frontend ───
resource "azurerm_container_app" "frontend" {
  name                         = "ca-${var.project_name}-frontend-${var.environment}"
  container_app_environment_id = data.azurerm_container_app_environment.env.id
  resource_group_name          = azurerm_resource_group.rg.name
  revision_mode                = "Single"

  template {
    container {
      name   = "frontend"
      image  = "presidiocapstone-frontend:latest" # In prod, would point to an ACR image
      cpu    = "0.25"
      memory = "0.5Gi"
    }

    min_replicas = 0 # Scale to zero when not in use to save student credits
    max_replicas = 1
  }

  ingress {
    external_enabled = true
    target_port      = 5173
    traffic_weight {
      percentage      = 100
      latest_revision = true
    }
  }
}
