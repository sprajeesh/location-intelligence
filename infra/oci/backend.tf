# Terraform state is stored in OCI Object Storage, which exposes an
# S3-compatible API — so the native `s3` backend works against it directly,
# no custom backend plugin needed.
#
# Terraform backend blocks cannot reference variables, and the endpoint
# hostname embeds a per-tenancy Object Storage namespace that doesn't exist
# until the state bucket is created (see README.md's one-time bootstrap
# steps) -- so it can't be hardcoded here without requiring a manual edit
# that's easy to forget and breaks `terraform init` outright if missed.
# Instead, like access_key/secret_key below, it's supplied via a
# `-backend-config="endpoint=..."` flag on `terraform init` (in CI, sourced
# from the OCI_S3_ENDPOINT GitHub secret -- not actually sensitive, just
# handled the same way for consistency).
terraform {
  backend "s3" {
    bucket                      = "li-terraform-state"
    key                         = "oci/terraform.tfstate"
    region                      = "ap-sydney-1"
    skip_region_validation      = true
    skip_credentials_validation = true
    skip_metadata_api_check     = true
    skip_requesting_account_id  = true
    use_path_style              = true
  }
}
