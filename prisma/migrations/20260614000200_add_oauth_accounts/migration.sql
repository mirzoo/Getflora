CREATE TYPE "OAuthProvider" AS ENUM ('GOOGLE', 'YANDEX');

CREATE TABLE "OAuthAccount" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OAuthAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "OAuthSignUpToken" (
    "id" TEXT NOT NULL,
    "provider" "OAuthProvider" NOT NULL,
    "providerAccountId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "avatarUrl" TEXT,
    "tokenHash" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "consumedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OAuthSignUpToken_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "OAuthAccount_provider_providerAccountId_key" ON "OAuthAccount"("provider", "providerAccountId");
CREATE INDEX "OAuthAccount_userId_idx" ON "OAuthAccount"("userId");
CREATE INDEX "OAuthAccount_email_idx" ON "OAuthAccount"("email");

CREATE UNIQUE INDEX "OAuthSignUpToken_tokenHash_key" ON "OAuthSignUpToken"("tokenHash");
CREATE INDEX "OAuthSignUpToken_email_idx" ON "OAuthSignUpToken"("email");
CREATE INDEX "OAuthSignUpToken_expiresAt_idx" ON "OAuthSignUpToken"("expiresAt");

ALTER TABLE "OAuthAccount" ADD CONSTRAINT "OAuthAccount_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
