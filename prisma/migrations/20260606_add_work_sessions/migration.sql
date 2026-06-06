-- CreateEnum
CREATE TYPE "WorkSessionStatus" AS ENUM ('ACTIVE', 'PAUSED', 'COMPLETED');

-- CreateTable
CREATE TABLE "work_sessions" (
    "id" TEXT NOT NULL,
    "org_id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "task_id" TEXT NOT NULL,
    "user_id" TEXT NOT NULL,
    "start_dt" TIMESTAMP(3) NOT NULL,
    "completed_dt" TIMESTAMP(3),
    "total_duration_min" INTEGER NOT NULL DEFAULT 0,
    "status" "WorkSessionStatus" NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_sessions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "work_session_segments" (
    "id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "start_dt" TIMESTAMP(3) NOT NULL,
    "end_dt" TIMESTAMP(3),
    "duration_min" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "work_session_segments_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "work_sessions_project_id_user_id_status_key" ON "work_sessions"("project_id", "user_id") WHERE "status" = 'ACTIVE';

-- CreateIndex
CREATE INDEX "work_sessions_org_id_idx" ON "work_sessions"("org_id");

-- CreateIndex
CREATE INDEX "work_sessions_project_id_idx" ON "work_sessions"("project_id");

-- CreateIndex
CREATE INDEX "work_sessions_user_id_idx" ON "work_sessions"("user_id");

-- CreateIndex
CREATE INDEX "work_sessions_status_idx" ON "work_sessions"("status");

-- CreateIndex
CREATE INDEX "work_session_segments_session_id_idx" ON "work_session_segments"("session_id");

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_org_id_fkey" FOREIGN KEY ("org_id") REFERENCES "organizations"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_task_id_fkey" FOREIGN KEY ("task_id") REFERENCES "tasks"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "work_sessions" ADD CONSTRAINT "work_sessions_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "work_session_segments" ADD CONSTRAINT "work_session_segments_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "work_sessions"("id") ON DELETE CASCADE;
