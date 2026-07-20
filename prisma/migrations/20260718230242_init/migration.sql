-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "masterResume" TEXT NOT NULL,
    "coverTemplates" TEXT NOT NULL DEFAULT '[]',
    "targetRoles" TEXT NOT NULL DEFAULT '[]',
    "targetLocations" TEXT NOT NULL DEFAULT '[]',
    "salaryFloor" INTEGER,
    "excludedCompanies" TEXT NOT NULL DEFAULT '[]',
    "dailyGoal" INTEGER NOT NULL DEFAULT 50,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "JobListing" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "source" TEXT NOT NULL,
    "sourceJobId" TEXT,
    "title" TEXT NOT NULL,
    "company" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "isRemote" BOOLEAN NOT NULL DEFAULT false,
    "url" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
    "salaryMin" INTEGER,
    "salaryMax" INTEGER,
    "jobType" TEXT,
    "seniority" TEXT,
    "postedDate" DATETIME,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupKey" TEXT NOT NULL DEFAULT ''
);

-- CreateTable
CREATE TABLE "Application" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'queued',
    "resumeVersion" TEXT,
    "coverVersion" TEXT,
    "notes" TEXT NOT NULL DEFAULT '',
    "appliedAt" DATETIME,
    "followUpDate" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastUpdated" DATETIME NOT NULL,
    CONSTRAINT "Application_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Application_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "JobListing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Match" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "jobListingId" TEXT NOT NULL,
    "relevanceScore" INTEGER NOT NULL,
    "reasons" TEXT NOT NULL DEFAULT '[]',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "Match_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "Match_jobListingId_fkey" FOREIGN KEY ("jobListingId") REFERENCES "JobListing" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "JobListing_dedupKey_idx" ON "JobListing"("dedupKey");

-- CreateIndex
CREATE INDEX "JobListing_fetchedAt_idx" ON "JobListing"("fetchedAt");

-- CreateIndex
CREATE INDEX "Application_status_idx" ON "Application"("status");

-- CreateIndex
CREATE UNIQUE INDEX "Application_userId_jobListingId_key" ON "Application"("userId", "jobListingId");

-- CreateIndex
CREATE INDEX "Match_relevanceScore_idx" ON "Match"("relevanceScore");

-- CreateIndex
CREATE UNIQUE INDEX "Match_userId_jobListingId_key" ON "Match"("userId", "jobListingId");
