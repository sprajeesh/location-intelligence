#cloud-config
package_update: true
package_upgrade: false

packages:
  - ca-certificates
  - curl
  - gnupg
  - python3-pip

write_files:
  - path: /opt/setup.sh
    permissions: "0755"
    content: |
      #!/usr/bin/env bash
      set -euo pipefail

      # ── Install Docker Engine + compose plugin (official repo, arm64) ──
      install -m 0755 -d /etc/apt/keyrings
      curl -fsSL https://download.docker.com/linux/ubuntu/gpg -o /etc/apt/keyrings/docker.asc
      chmod a+r /etc/apt/keyrings/docker.asc

      . /etc/os-release
      echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.asc] https://download.docker.com/linux/ubuntu ${VERSION_CODENAME} stable" \
        > /etc/apt/sources.list.d/docker.list

      apt-get update -y
      apt-get install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
      systemctl enable --now docker
      usermod -aG docker ubuntu

      # ── Fix Oracle's default iptables rules blocking inbound traffic ──
      # Oracle's Ubuntu images pre-load iptables rules (via netfilter-persistent)
      # that DROP most inbound traffic regardless of the OCI Security List.
      # Explicitly allow the ports our app needs, then persist across reboots.
      iptables -I INPUT -m state --state NEW -p tcp --dport 22 -j ACCEPT
      iptables -I INPUT -m state --state NEW -p tcp --dport 80 -j ACCEPT
      iptables -I INPUT -m state --state NEW -p tcp --dport 443 -j ACCEPT
      iptables -I INPUT -m state --state NEW -p tcp --dport 8000 -j ACCEPT

      if ! command -v netfilter-persistent >/dev/null 2>&1; then
        DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
      fi
      netfilter-persistent save

      # ── Install OCI CLI so scripts/fetch-secrets.sh can read the DB
      #    password from Vault via this instance's own identity (instance
      #    principal) -- no embedded credentials needed on the box.
      pip3 install --break-system-packages --quiet oci-cli

      # ── Prepare app directory for the deploy step to clone/pull into ──
      mkdir -p /opt/location-intelligence
      chown ubuntu:ubuntu /opt/location-intelligence

runcmd:
  - bash /opt/setup.sh
