-- CreateTable
CREATE TABLE "MembershipProduct" (
    "id" TEXT NOT NULL,
    "legacyId" INTEGER,
    "storeId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "totalCount" INTEGER,
    "validDays" INTEGER,
    "price" INTEGER NOT NULL DEFAULT 0,
    "appliesToAllServices" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MembershipProduct_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipProductService" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "serviceId" TEXT NOT NULL,

    CONSTRAINT "MembershipProductService_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CustomerMembership" (
    "id" TEXT NOT NULL,
    "legacyId" INTEGER,
    "storeId" TEXT NOT NULL,
    "customerId" TEXT NOT NULL,
    "productId" TEXT,
    "name" TEXT NOT NULL,
    "totalCount" INTEGER,
    "remainingCount" INTEGER,
    "issuedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "expiresAt" TIMESTAMP(3),
    "status" TEXT NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CustomerMembership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MembershipUsage" (
    "id" TEXT NOT NULL,
    "customerMembershipId" TEXT NOT NULL,
    "reservationId" TEXT,
    "delta" INTEGER NOT NULL,
    "type" TEXT NOT NULL,
    "memo" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MembershipUsage_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "MembershipProduct_storeId_legacyId_key" ON "MembershipProduct"("storeId", "legacyId");

-- CreateIndex
CREATE UNIQUE INDEX "MembershipProductService_productId_serviceId_key" ON "MembershipProductService"("productId", "serviceId");

-- CreateIndex
CREATE UNIQUE INDEX "CustomerMembership_storeId_legacyId_key" ON "CustomerMembership"("storeId", "legacyId");

-- AddForeignKey
ALTER TABLE "MembershipProduct" ADD CONSTRAINT "MembershipProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipProductService" ADD CONSTRAINT "MembershipProductService_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MembershipProduct"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipProductService" ADD CONSTRAINT "MembershipProductService_serviceId_fkey" FOREIGN KEY ("serviceId") REFERENCES "Service"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMembership" ADD CONSTRAINT "CustomerMembership_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMembership" ADD CONSTRAINT "CustomerMembership_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CustomerMembership" ADD CONSTRAINT "CustomerMembership_productId_fkey" FOREIGN KEY ("productId") REFERENCES "MembershipProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipUsage" ADD CONSTRAINT "MembershipUsage_customerMembershipId_fkey" FOREIGN KEY ("customerMembershipId") REFERENCES "CustomerMembership"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MembershipUsage" ADD CONSTRAINT "MembershipUsage_reservationId_fkey" FOREIGN KEY ("reservationId") REFERENCES "Reservation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
