/**
 * S3 — production mapping for MinIO in architecture.md §7. Bucket name
 * matches backend/.env.example's MINIO_BUCKET value (helpdesk-attachments)
 * so a deploy-time env swap (MinIO endpoint -> S3 endpoint/bucket) is the
 * only backend-side change needed, no app code change.
 */

resource "aws_s3_bucket" "attachments" {
  bucket = "${var.project_name}-${var.environment}-attachments"

  tags = { Name = "${var.project_name}-${var.environment}-attachments" }
}

resource "aws_s3_bucket_public_access_block" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

resource "aws_s3_bucket_versioning" "attachments" {
  bucket = aws_s3_bucket.attachments.id

  versioning_configuration {
    status = "Enabled"
  }
}
