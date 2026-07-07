# Generates and stores the Postgres password in OCI Vault instead of passing
# it through GitHub Secrets / a hand-maintained .env on the VM. Terraform is
# the single source of truth: it creates the password once (stable across
# re-applies -- random_password only changes if this resource is replaced)
# and the app VM reads it back at deploy time via its own instance principal
# (see the dynamic group + policy below), so no long-lived credential ever
# needs to be stored in GitHub or on disk. See scripts/fetch-secrets.sh for
# the read side.
#
# Cost: a DEFAULT vault is free to create; Vault Secrets are free up to 150
# per tenancy (we use 1); key versions are free as long as they're
# software-protected (see protection_mode below) rather than HSM-protected.
# For this single demo secret, that's $0/month.
resource "random_password" "db_password" {
  length  = 24
  special = false
}

resource "oci_kms_vault" "main" {
  compartment_id = var.compartment_ocid
  display_name   = "li-demo-vault"
  vault_type     = "DEFAULT"
}

resource "oci_kms_key" "secrets" {
  compartment_id      = var.compartment_ocid
  display_name        = "li-demo-secrets-key"
  management_endpoint = oci_kms_vault.main.management_endpoint
  # Software-protected key versions are always free (unlike HSM-protected,
  # which is billed per key version beyond the tenancy's 20 free ones). One
  # demo secret doesn't need HSM-backed protection, so pin this explicitly
  # rather than relying on whatever OCI defaults to.
  protection_mode = "SOFTWARE"

  key_shape {
    algorithm = "AES"
    length    = 32
  }
}

resource "oci_vault_secret" "db_password" {
  compartment_id = var.compartment_ocid
  vault_id       = oci_kms_vault.main.id
  key_id         = oci_kms_key.secrets.id
  secret_name    = "li-demo-db-password"

  secret_content {
    content_type = "BASE64"
    content      = base64encode(random_password.db_password.result)
  }
}

# Dynamic groups are tenancy-wide resources (matched by instance metadata,
# not tied to a single compartment), so compartment_id here is intentionally
# the tenancy OCID, not var.compartment_ocid.
resource "oci_identity_dynamic_group" "app_vm" {
  compartment_id = var.tenancy_ocid
  name           = "li-demo-app-vm"
  description    = "Matches the location-intelligence demo app VM, so it can authenticate to OCI services (Vault) via instance principal instead of embedded credentials."
  matching_rule  = "ANY {instance.id = '${oci_core_instance.app.id}'}"
}

resource "oci_identity_policy" "vault_read" {
  compartment_id = var.compartment_ocid
  name           = "li-demo-vault-read-policy"
  description    = "Allow the app VM to read the DB password secret from Vault at deploy time."

  statements = [
    "Allow dynamic-group ${oci_identity_dynamic_group.app_vm.name} to read secret-family in compartment id ${var.compartment_ocid}",
    "Allow dynamic-group ${oci_identity_dynamic_group.app_vm.name} to use keys in compartment id ${var.compartment_ocid}",
  ]
}
