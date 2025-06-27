-- CreateTable
CREATE TABLE "recently_viewed_products" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "sessionId" TEXT,
    "productId" TEXT NOT NULL,
    "viewedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "recently_viewed_products_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "recently_viewed_products_userId_idx" ON "recently_viewed_products"("userId");

-- CreateIndex
CREATE INDEX "recently_viewed_products_sessionId_idx" ON "recently_viewed_products"("sessionId");

-- CreateIndex
CREATE INDEX "recently_viewed_products_viewedAt_idx" ON "recently_viewed_products"("viewedAt");

-- AddForeignKey
ALTER TABLE "recently_viewed_products" ADD CONSTRAINT "recently_viewed_products_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "recently_viewed_products" ADD CONSTRAINT "recently_viewed_products_productId_fkey" FOREIGN KEY ("productId") REFERENCES "products"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
