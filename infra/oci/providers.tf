terraform {
  required_version = ">= 1.7.0"

  required_providers {
    oci = {
      source  = "oracle/oci"
      version = "~> 5.46"
    }
  }
}

# All auth values are supplied via TF_VAR_* environment variables in CI
# (see .github/workflows/push.yml) rather than a ~/.oci/config file, so
# nothing environment-specific needs to exist on the runner.
provider "oci" {
  tenancy_ocid = var.tenancy_ocid
  user_ocid    = var.user_ocid
  fingerprint  = var.fingerprint
  private_key  = var.oci_private_key_pem
  region       = var.region
}
