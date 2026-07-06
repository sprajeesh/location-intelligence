output "instance_public_ip" {
  description = "Public IPv4 address of the app VM"
  value       = oci_core_instance.app.public_ip
}

output "instance_id" {
  description = "OCID of the app VM"
  value       = oci_core_instance.app.id
}
