# OCI Infrastructure (Terraform)

Provisions the Oracle Cloud VM that hosts the FastAPI API + PostGIS + Redis + OSRM via
docker-compose for the location-intelligence demo. The Next.js web app is deployed
separately to Cloudflare (see `apps/web/`) and is not managed here.

## One-time bootstrap (do this before the pipeline can run)

Terraform needs a place to store its state file, but that place (an OCI Object
Storage bucket) can't be created by Terraform itself without a chicken-and-egg
problem, so this step is manual and done once.

1. **Create the state bucket**, either via the console (Storage -> Buckets ->
   Create Bucket, name `li-terraform-state`, enable Object Versioning) or the CLI:
   ```bash
   oci os bucket create --compartment-id <compartment_ocid> \
     --name li-terraform-state --versioning Enabled
   ```
2. **Note the Object Storage namespace** (shown on the bucket's details page,
   e.g. `axabc1def2gh`) and put it into `backend.tf`'s `endpoint` value,
   replacing `REPLACE_WITH_OCI_NAMESPACE`. This is not secret.
3. **Generate a Customer Secret Key** (S3-compatible credentials, distinct from
   the OCI API signing key used by the provider itself): Console -> Identity &
   Security -> Users -> (your user) -> Customer Secret Keys -> Generate Secret
   Key. Store the access key / secret key as the `OCI_S3_ACCESS_KEY` /
   `OCI_S3_SECRET_KEY` GitHub secrets.
4. **Generate an OCI API signing key pair** for the Terraform provider itself:
   Console -> Profile -> User Settings -> API Keys -> Add API Key. Store the
   private key PEM, fingerprint, user OCID, tenancy OCID, compartment OCID,
   and region as the `OCI_PRIVATE_KEY`, `OCI_FINGERPRINT`, `OCI_USER_OCID`,
   `OCI_TENANCY_OCID`, `OCI_COMPARTMENT_OCID`, `OCI_REGION` GitHub secrets.
5. **Provide an SSH public key**: derive it from the existing `DEPLOY_SSH_KEY`
   secret's private key (`ssh-keygen -y -f <private-key-file>`) and store the
   output as the `DEPLOY_SSH_PUBLIC_KEY` GitHub secret. Terraform bakes this
   into the instance; it never generates its own keypair.

Recommended: run `terraform init` / `terraform plan` once locally with these
same values before trusting CI to apply blind:

```bash
cd infra/oci
cp terraform.tfvars.example terraform.tfvars   # fill in your real values, do not commit
terraform init \
  -backend-config="access_key=<OCI_S3_ACCESS_KEY>" \
  -backend-config="secret_key=<OCI_S3_SECRET_KEY>"
terraform plan
```

## The "out of host capacity" retry

`VM.Standard.A1.Flex` (the Always Free Ampere Arm shape) intermittently
reports "out of host capacity" in busy regions. `scripts/apply-with-retry.sh`
wraps `terraform apply` and retries only on that specific error (matched
narrowly against the OCI error text), with linear backoff, for up to 6
attempts (~21 minutes worst case) before giving up. Any other failure (bad
credentials, invalid HCL, quota errors) fails immediately on the first
attempt -- it does not get masked by the retry loop.

If your region genuinely has no A1.Flex capacity for an extended period, the
only way forward is to either try a different region/availability domain, or
manually switch to `VM.Standard.E2.1.Micro` in `terraform.tfvars` (see the
commented-out block in `terraform.tfvars.example` and its notes on what else
needs to change).

## Known gap: OSRM data file

Terraform provisions compute, not application data. After the first
successful `terraform apply`, `scp` the NZ OSRM routing graph file(s) into
`/opt/location-intelligence/osrm-data/` on the instance -- otherwise the
`osrm` service's healthcheck fails and the app falls back to Haversine
distances (not fatal, already-existing graceful degradation in
`apps/api/app/clients/osrm.py`).
