variable "tenancy_ocid" {
  description = "OCI tenancy OCID (Console -> Profile -> Tenancy)"
  type        = string
}

variable "user_ocid" {
  description = "OCID of the user owning the API signing key (Console -> Profile -> User Settings)"
  type        = string
}

variable "fingerprint" {
  description = "Fingerprint of the OCI API signing key"
  type        = string
}

variable "oci_private_key_pem" {
  description = "PEM-encoded private key matching the OCI API signing key"
  type        = string
  sensitive   = true
}

variable "region" {
  description = "OCI region identifier, e.g. ap-sydney-1"
  type        = string
  default     = "ap-sydney-1"
}

variable "compartment_ocid" {
  description = "Compartment OCID where all resources are created"
  type        = string
}

variable "instance_shape" {
  description = "Compute shape for the app VM. VM.Standard.A1.Flex is the Always Free Ampere Arm shape; do not switch this automatically on capacity errors, only override manually in terraform.tfvars."
  type        = string
  default     = "VM.Standard.A1.Flex"
}

variable "instance_ocpus" {
  description = "OCPUs allocated to the instance (Always Free ceiling is 4 total across all A1.Flex instances)"
  type        = number
  default     = 2
}

variable "instance_memory_gbs" {
  description = "Memory in GB allocated to the instance (Always Free ceiling is 24GB total across all A1.Flex instances)"
  type        = number
  default     = 12
}

variable "ssh_public_key" {
  description = "Public key baked into the instance's ssh_authorized_keys metadata. Must be the public half of the DEPLOY_SSH_KEY GitHub secret's private key -- Terraform never generates its own keypair."
  type        = string
}

variable "ssh_ingress_cidr" {
  description = "CIDR allowed to SSH into the instance. Restrict to a known IP where possible; 0.0.0.0/0 is accepted here only because this is a demo box."
  type        = string
  default     = "0.0.0.0/0"
}
