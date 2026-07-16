variable "project_name" {
  type        = string
  description = "Name of the project used for naming resources"
  default     = "bibliotech"
}

variable "environment" {
  type        = string
  description = "Deployment environment (e.g. dev, staging, prod)"
  default     = "dev"
}

variable "location" {
  type        = string
  description = "Azure region to deploy resources in"
  default     = "eastus"
}

variable "gemini_api_key" {
  type        = string
  description = "API key for Google Gemini AI service"
  sensitive   = true
}

variable "jwt_secret_key" {
  type        = string
  description = "Secret key for JWT validation and signing"
  sensitive   = true
}
