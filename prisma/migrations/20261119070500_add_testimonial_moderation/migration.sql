CREATE TYPE "TestimonialStatus" AS ENUM (
    'NOT_REQUESTED',
    'PENDING',
    'APPROVED',
    'REJECTED'
);

ALTER TABLE "reviews"
ADD COLUMN "testimonialConsent" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "testimonialConsentAt" TIMESTAMP(3),
ADD COLUMN "testimonialStatus" "TestimonialStatus" NOT NULL DEFAULT 'NOT_REQUESTED';

CREATE INDEX "reviews_testimonialStatus_testimonialConsent_createdAt_idx"
ON "reviews"("testimonialStatus", "testimonialConsent", "createdAt");
