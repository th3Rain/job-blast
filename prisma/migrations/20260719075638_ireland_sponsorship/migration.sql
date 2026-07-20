-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_JobListing" (
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
    "country" TEXT,
    "sponsorship" TEXT NOT NULL DEFAULT 'unknown',
    "sponsorshipNote" TEXT NOT NULL DEFAULT '',
    "postedDate" DATETIME,
    "fetchedAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "dedupKey" TEXT NOT NULL DEFAULT ''
);
INSERT INTO "new_JobListing" ("company", "dedupKey", "description", "fetchedAt", "id", "isRemote", "jobType", "location", "postedDate", "salaryMax", "salaryMin", "seniority", "source", "sourceJobId", "title", "url") SELECT "company", "dedupKey", "description", "fetchedAt", "id", "isRemote", "jobType", "location", "postedDate", "salaryMax", "salaryMin", "seniority", "source", "sourceJobId", "title", "url" FROM "JobListing";
DROP TABLE "JobListing";
ALTER TABLE "new_JobListing" RENAME TO "JobListing";
CREATE INDEX "JobListing_dedupKey_idx" ON "JobListing"("dedupKey");
CREATE INDEX "JobListing_fetchedAt_idx" ON "JobListing"("fetchedAt");
CREATE TABLE "new_User" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "email" TEXT NOT NULL,
    "masterResume" TEXT NOT NULL,
    "coverTemplates" TEXT NOT NULL DEFAULT '[]',
    "targetRoles" TEXT NOT NULL DEFAULT '[]',
    "targetLocations" TEXT NOT NULL DEFAULT '[]',
    "salaryFloor" INTEGER,
    "excludedCompanies" TEXT NOT NULL DEFAULT '[]',
    "dailyGoal" INTEGER NOT NULL DEFAULT 50,
    "sponsorshipRequired" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);
INSERT INTO "new_User" ("coverTemplates", "createdAt", "dailyGoal", "email", "excludedCompanies", "id", "masterResume", "salaryFloor", "targetLocations", "targetRoles") SELECT "coverTemplates", "createdAt", "dailyGoal", "email", "excludedCompanies", "id", "masterResume", "salaryFloor", "targetLocations", "targetRoles" FROM "User";
DROP TABLE "User";
ALTER TABLE "new_User" RENAME TO "User";
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
