resource "oci_core_vcn" "main" {
  compartment_id = var.compartment_ocid
  cidr_blocks    = ["10.0.0.0/16"]
  display_name   = "li-demo-vcn"
  dns_label      = "lidemo"
}

resource "oci_core_internet_gateway" "main" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "li-demo-igw"
  enabled        = true
}

resource "oci_core_route_table" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "li-demo-public-rt"

  route_rules {
    destination       = "0.0.0.0/0"
    destination_type  = "CIDR_BLOCK"
    network_entity_id = oci_core_internet_gateway.main.id
  }
}

# Ports 80/443 are opened for a future reverse proxy / TLS upgrade (see
# infra/oci/README.md) even though nothing listens on them yet. Port 8000
# is the FastAPI backend, exposed directly (plain HTTP, no TLS) since the
# Next.js BFF calls it server-side only (never from the browser) -- see
# repo root README for the mixed-content analysis behind that decision.
#
# var.api_ingress_cidr defaults to 0.0.0.0/0 because the only caller is a
# Cloudflare Worker (apps/web's Route Handlers), which has no fixed egress
# IP range to allowlist -- narrowing this default would break the deployed
# app. Restrict it via terraform.tfvars if you front the API with a proxy
# that has a stable source IP, or drop this rule entirely once port 80/443
# carry real traffic instead. Since this can't be closed off at the network
# layer, every route except /health also requires an X-Internal-Api-Key
# header (API_SHARED_SECRET) -- see README.md's "API access control" section.
resource "oci_core_security_list" "public" {
  compartment_id = var.compartment_ocid
  vcn_id         = oci_core_vcn.main.id
  display_name   = "li-demo-public-seclist"

  egress_security_rules {
    protocol    = "all"
    destination = "0.0.0.0/0"
  }

  ingress_security_rules {
    protocol = "6" # TCP
    source   = var.ssh_ingress_cidr
    tcp_options {
      min = 22
      max = 22
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 80
      max = 80
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = "0.0.0.0/0"
    tcp_options {
      min = 443
      max = 443
    }
  }

  ingress_security_rules {
    protocol = "6"
    source   = var.api_ingress_cidr
    tcp_options {
      min = 8000
      max = 8000
    }
  }
}

resource "oci_core_subnet" "public" {
  compartment_id             = var.compartment_ocid
  vcn_id                     = oci_core_vcn.main.id
  cidr_block                 = "10.0.1.0/24"
  display_name               = "li-demo-public-subnet"
  dns_label                  = "public"
  route_table_id             = oci_core_route_table.public.id
  security_list_ids          = [oci_core_security_list.public.id]
  prohibit_public_ip_on_vnic = false
}
