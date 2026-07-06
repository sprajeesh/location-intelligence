# Terraform state is stored in OCI Object Storage, which exposes an
# S3-compatible API — so the native `s3` backend works against it directly,
# no custom backend plugin needed.
#
# Terraform backend blocks cannot reference variables, so the namespace
# below must be hardcoded (it is NOT a secret — it's a fixed per-tenancy
# identifier shown on the bucket's details page in the OCI console).
# Replace "REPLACE_WITH_OCI_NAMESPACE" and the region below to match your
# tenancy before running `terraform init`. See README.md for the one-time
# bucket bootstrap steps.
#
# access_key / secret_key are intentionally NOT set here — they're passed
# via `-backend-config` flags on `terraform init` in CI, sourced from the
# OCI_S3_ACCESS_KEY / OCI_S3_SECRET_KEY GitHub secrets.
terraform {
  backend "s3" {
    bucket                      = "li-terraform-state"
    key                         = "oci/terraform.tfstate"
    region                      = "ap-sydney-1"
    endpoint                    = "https://REPLACE_WITH_OCI_NAMESPACE.compat.objectstorage.ap-sydney-1.oraclecloud.com"
    skip_region_validation      = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
    force_path_style            = true
  }
}
