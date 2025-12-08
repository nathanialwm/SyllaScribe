# Database Migration Scripts

This directory contains scripts to fix database schema issues and migrate existing data.

## Enrollment Migration

### What it does:
- Removes enrollments with invalid `userId` references (user doesn't exist)
- Removes enrollments with invalid `courseId` references (course doesn't exist)
- Adds missing `enrollmentID` fields to enrollments
- Removes duplicate enrollments
- Provides a detailed report of all changes

### When to run:
- After schema changes to the Enrollment model
- When users report seeing incorrect courses
- When enrollment queries are failing
- As part of database maintenance

### How to run:

```bash
# Make sure your .env file is configured with MONGO_URI
npm run migrate:enrollments
```

Or directly:
```bash
node server/migrations/fix-enrollments.js
```

### What to expect:

The script will:
1. Connect to your MongoDB database
2. Check all enrollments
3. Report what it finds (valid, broken, missing fields)
4. Fix or delete problematic enrollments
5. Provide a summary report

**Example output:**
```
==================================================
ENROLLMENT DATABASE MIGRATION
==================================================
Found 150 enrollments to check

[DELETE] Enrollment 507f1f77bcf86cd799439011:
  - Course 507f191e810c19729de860ea not found
[FIX] Enrollment 507f1f77bcf86cd799439012: Added enrollmentID ENROLL-1234567890-1234

==================================================
MIGRATION SUMMARY
==================================================
Total checked:     150
Valid enrollments:  145
Fixed enrollments:   3
Deleted enrollments: 2
==================================================
```

### Safety:
- The script only reads and modifies the Enrollment collection
- It does NOT modify User or Course data
- Always backup your database before running migrations
- The script is idempotent (safe to run multiple times)

### Backup before running:

```bash
# Using mongodump (if installed)
mongodump --uri="your-mongodb-connection-string" --out=./backup-$(date +%Y%m%d)
```

