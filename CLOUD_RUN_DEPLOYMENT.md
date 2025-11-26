# EmpowerLink CRM - Google Cloud Run Deployment Guide
<!-- Last updated: 2024 -->

This guide explains how to deploy the EmpowerLink backend API to Google Cloud Run in the **australia-southeast1** (Sydney) region for Australian healthcare data sovereignty compliance.

## Architecture Overview

- **Frontend**: Hosted on Replit (app.empowerlink.au)
- **Backend API**: Google Cloud Run (australia-southeast1)
- **Database**: Cloud SQL PostgreSQL (australia-southeast1) or AlloyDB
- **File Storage**: Google Cloud Storage (australia-southeast1) for document uploads

> **IMPORTANT**: Cloud Run uses ephemeral storage. All uploaded documents must be stored in Google Cloud Storage for persistence.

## Prerequisites

1. Google Cloud account with billing enabled
2. Google Cloud CLI (`gcloud`) installed
3. Docker installed locally (for building images)
4. A Cloud SQL PostgreSQL instance in australia-southeast1

## Step 1: Set Up Google Cloud Project

```bash
# Set your project ID
export PROJECT_ID="your-project-id"
gcloud config set project $PROJECT_ID

# Enable required APIs
gcloud services enable run.googleapis.com
gcloud services enable artifactregistry.googleapis.com
gcloud services enable cloudbuild.googleapis.com
gcloud services enable sqladmin.googleapis.com
```

## Step 2: Create Artifact Registry Repository

```bash
# Create a Docker repository in Australia
gcloud artifacts repositories create empowerlink \
  --repository-format=docker \
  --location=australia-southeast1 \
  --description="EmpowerLink CRM container images"

# Configure Docker to use Artifact Registry
gcloud auth configure-docker australia-southeast1-docker.pkg.dev
```

## Step 3: Build and Push Container Image

```bash
# Build the Docker image
docker build -t empowerlink-api .

# Tag for Artifact Registry
docker tag empowerlink-api \
  australia-southeast1-docker.pkg.dev/$PROJECT_ID/empowerlink/api:latest

# Push to Artifact Registry
docker push australia-southeast1-docker.pkg.dev/$PROJECT_ID/empowerlink/api:latest
```

**Your Container Image URL will be:**
```
australia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/empowerlink/api:latest
```

## Step 4: Set Up Cloud SQL Database

```bash
# Create a PostgreSQL instance in Sydney
gcloud sql instances create empowerlink-db \
  --database-version=POSTGRES_15 \
  --tier=db-f1-micro \
  --region=australia-southeast1 \
  --storage-type=SSD \
  --storage-size=10GB

# Create the database
gcloud sql databases create empowerlink --instance=empowerlink-db

# Create a user
gcloud sql users create empowerlink-user \
  --instance=empowerlink-db \
  --password=YOUR_SECURE_PASSWORD
```

## Step 5: Deploy to Cloud Run

### Option A: Via Google Cloud Console

1. Go to Cloud Run in Google Cloud Console
2. Click "Create Service"
3. Select **"Deploy one revision from an existing container image"**
4. Enter your Container Image URL:
   ```
   australia-southeast1-docker.pkg.dev/YOUR_PROJECT_ID/empowerlink/api:latest
   ```
5. Set Region: **australia-southeast1 (Sydney)**
6. Configure settings:
   - CPU allocation: CPU is only allocated during request processing
   - Minimum instances: 0 (for cost savings) or 1 (for faster cold starts)
   - Maximum instances: 10 (adjust based on expected load)
   - Memory: 512 MiB
   - CPU: 1
7. Under "Container, Networking, Security" → "Variables & Secrets", add:
   - `DATABASE_URL`: Your PostgreSQL connection string
   - `SESSION_SECRET`: A secure random string
   - `ZOHO_CLIENT_ID`: Your Zoho OAuth client ID
   - `ZOHO_CLIENT_SECRET`: Your Zoho OAuth client secret
   - `NODE_ENV`: production
8. Under "Connections" → add Cloud SQL connection to your instance
9. Click "Create"

### Option B: Via gcloud CLI

```bash
# Deploy to Cloud Run
gcloud run deploy empowerlink-api \
  --image=australia-southeast1-docker.pkg.dev/$PROJECT_ID/empowerlink/api:latest \
  --region=australia-southeast1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --memory=512Mi \
  --cpu=1 \
  --min-instances=0 \
  --max-instances=10 \
  --add-cloudsql-instances=$PROJECT_ID:australia-southeast1:empowerlink-db \
  --set-env-vars="NODE_ENV=production" \
  --set-secrets="DATABASE_URL=empowerlink-db-url:latest,SESSION_SECRET=session-secret:latest,ZOHO_CLIENT_ID=zoho-client-id:latest,ZOHO_CLIENT_SECRET=zoho-client-secret:latest"
```

## Step 6: Configure Custom Domain (Optional)

```bash
# Map your domain to Cloud Run
gcloud run domain-mappings create \
  --service=empowerlink-api \
  --domain=api.empowerlink.au \
  --region=australia-southeast1
```

## Required Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `SESSION_SECRET` | Secret key for session encryption | Yes |
| `ZOHO_CLIENT_ID` | Zoho OAuth application client ID | Yes |
| `ZOHO_CLIENT_SECRET` | Zoho OAuth application client secret | Yes |
| `NODE_ENV` | Set to "production" | Yes |
| `PORT` | Cloud Run provides this automatically (8080) | Auto |

### Database URL Format

For Cloud SQL with Unix socket (recommended):
```
postgresql://USER:PASSWORD@/DATABASE?host=/cloudsql/PROJECT_ID:REGION:INSTANCE_NAME
```

For Cloud SQL with private IP:
```
postgresql://USER:PASSWORD@PRIVATE_IP:5432/DATABASE
```

## Step 7: Update Replit Frontend

After deploying to Cloud Run, update your Replit frontend to point to the Cloud Run API:

1. Create a `.env` file in your Replit project (if not exists)
2. Add: `VITE_API_URL=https://empowerlink-api-XXXXXX-ts.a.run.app`
3. Update API calls in the frontend to use this base URL

## Step 8: Set Up Cloud Storage for Document Uploads

Cloud Run has ephemeral storage - files saved to disk are lost when the container restarts. For persistent document storage:

```bash
# Create a Cloud Storage bucket in Australia
gsutil mb -l australia-southeast1 gs://$PROJECT_ID-empowerlink-uploads

# Set bucket to private (only service account can access)
gsutil iam ch allUsers:-objectViewer gs://$PROJECT_ID-empowerlink-uploads
```

**Note**: You will need to update the file upload code to use `@google-cloud/storage` instead of local disk storage for production. The current implementation uses local disk storage which works on Replit but not on Cloud Run.

## Security Considerations

1. **VPC Connector**: For production, set up a VPC connector to ensure the Cloud Run service connects to Cloud SQL over a private network
2. **Secret Manager**: Store all secrets in Google Secret Manager instead of environment variables
3. **IAM**: Use proper service accounts with minimal permissions
4. **Cloud Armor**: Consider adding Cloud Armor for DDoS protection
5. **Non-root User**: The Dockerfile runs as a non-root user (empowerlink) for better security
6. **Healthcare Compliance**: All data stays in australia-southeast1 region for Australian Privacy Act compliance

## Monitoring

```bash
# View logs
gcloud run services logs read empowerlink-api --region=australia-southeast1

# View metrics
gcloud monitoring dashboards create --config-from-file=dashboard.json
```

## Cost Estimation (australia-southeast1)

- Cloud Run: ~$0.000024 per vCPU-second, ~$0.0000025 per GiB-second
- Cloud SQL (db-f1-micro): ~$12/month
- Artifact Registry: First 500MB free, then $0.10/GB
- Network egress: First 1GB/month free to Australia

## Troubleshooting

### Container fails to start
- Check logs: `gcloud run services logs read empowerlink-api --region=australia-southeast1`
- Verify DATABASE_URL is correct
- Ensure Cloud SQL connection is configured

### Connection to database fails
- Verify Cloud SQL instance is running
- Check VPC connector configuration
- Ensure correct IAM permissions

### Health check fails
- The `/api/health` endpoint should return 200 OK
- Check if port 8080 is correctly exposed
