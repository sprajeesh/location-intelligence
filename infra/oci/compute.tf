data "oci_identity_availability_domains" "ads" {
  compartment_id = var.compartment_ocid
}

# Avoids hardcoding a region-specific, time-decaying image OCID: query the
# current Canonical Ubuntu Arm image for this shape and take the newest.
data "oci_core_images" "ubuntu_arm" {
  compartment_id           = var.compartment_ocid
  operating_system         = "Canonical Ubuntu"
  operating_system_version = "24.04 Minimal aarch64"
  shape                    = var.instance_shape
  sort_by                  = "TIMECREATED"
  sort_order               = "DESC"
}

resource "oci_core_instance" "app" {
  compartment_id      = var.compartment_ocid
  availability_domain = data.oci_identity_availability_domains.ads.availability_domains[0].name
  display_name        = "li-demo-app"
  shape               = var.instance_shape

  shape_config {
    ocpus         = var.instance_ocpus
    memory_in_gbs = var.instance_memory_gbs
  }

  create_vnic_details {
    subnet_id        = oci_core_subnet.public.id
    assign_public_ip = true
  }

  source_details {
    source_type = "image"
    source_id   = data.oci_core_images.ubuntu_arm.images[0].id
  }

  metadata = {
    ssh_authorized_keys = var.ssh_public_key
    user_data           = base64encode(templatefile("${path.module}/cloud-init.yaml.tpl", {}))
  }

  # Avoid destroy/recreate churn if Canonical publishes a newer image after
  # initial provisioning -- we don't want every terraform apply to replace
  # a running instance (and its manually-uploaded OSRM data) just because
  # a newer base image exists.
  lifecycle {
    ignore_changes = [source_details]
  }
}
