output "instance_public_ip" {
  description = "Public IPv4 address of the app VM"
  value       = oci_core_instance.app.public_ip
}

output "instance_id" {
  description = "OCID of the app VM"
  value       = oci_core_instance.app.id
}

output "db_user" {
  description = "Postgres role name (not a secret, safe to expose in plan/apply output)"
  value       = var.db_user
}

output "db_password_secret_id" {
  description = "OCID of the OCI Vault secret holding the Postgres password. The password itself is never output -- fetch-secrets.sh reads it on the VM via instance principal."
  value       = oci_vault_secret.db_password.id
}
