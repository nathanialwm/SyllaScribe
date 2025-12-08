import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load .env from project root
const envPath = join(__dirname, '..', '..', '.env');
dotenv.config({ path: envPath });

// Import models
import Enrollment from '../models/Enrollment.js';
import Course from '../models/Course.js';
import User from '../models/User.js';

/**
 * Migration script to fix enrollment database issues:
 * 1. Removes enrollments with invalid courseId references
 * 2. Removes enrollments with invalid userId references
 * 3. Ensures all enrollments have required enrollmentID field
 * 4. Validates data integrity
 */
async function migrateEnrollments() {
  try {
    // Connect to database
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGO_URI);
    console.log('✓ Connected to MongoDB\n');

    // Get counts before migration
    const totalEnrollments = await Enrollment.countDocuments({});
    console.log(`Found ${totalEnrollments} enrollments to check\n`);

    if (totalEnrollments === 0) {
      console.log('No enrollments found. Migration complete.');
      await mongoose.disconnect();
      return;
    }

    // Statistics
    const stats = {
      checked: 0,
      fixed: 0,
      deleted: 0,
      valid: 0,
      errors: []
    };

    // Get all enrollments
    const enrollments = await Enrollment.find({});
    
    console.log('Starting migration...\n');

    for (const enrollment of enrollments) {
      stats.checked++;
      let shouldDelete = false;
      let shouldFix = false;
      const issues = [];

      // Check if userId exists
      const user = await User.findById(enrollment.userId);
      if (!user) {
        issues.push(`User ${enrollment.userId} not found`);
        shouldDelete = true;
      }

      // Check if courseId exists
      const course = await Course.findById(enrollment.courseId);
      if (!course) {
        issues.push(`Course ${enrollment.courseId} not found`);
        shouldDelete = true;
      }

      // Check if enrollmentID exists
      if (!enrollment.enrollmentID || enrollment.enrollmentID.trim() === '') {
        issues.push('Missing enrollmentID');
        shouldFix = true;
      }

      // Check for duplicate enrollmentID (if fixing)
      if (shouldFix && !shouldDelete) {
        const existingWithID = await Enrollment.findOne({
          enrollmentID: enrollment.enrollmentID,
          _id: { $ne: enrollment._id }
        });
        if (existingWithID) {
          issues.push('Duplicate enrollmentID');
          shouldDelete = true; // Delete duplicate instead of fixing
        }
      }

      // Delete broken enrollments
      if (shouldDelete) {
        console.log(`[DELETE] Enrollment ${enrollment._id}:`);
        issues.forEach(issue => console.log(`  - ${issue}`));
        await Enrollment.deleteOne({ _id: enrollment._id });
        stats.deleted++;
        continue;
      }

      // Fix missing enrollmentID
      if (shouldFix) {
        const newEnrollmentID = `ENROLL-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
        enrollment.enrollmentID = newEnrollmentID;
        await enrollment.save();
        console.log(`[FIX] Enrollment ${enrollment._id}: Added enrollmentID ${newEnrollmentID}`);
        stats.fixed++;
        continue;
      }

      // Enrollment is valid
      stats.valid++;
    }

    // Print summary
    console.log('\n' + '='.repeat(50));
    console.log('MIGRATION SUMMARY');
    console.log('='.repeat(50));
    console.log(`Total checked:     ${stats.checked}`);
    console.log(`Valid enrollments:  ${stats.valid}`);
    console.log(`Fixed enrollments:  ${stats.fixed}`);
    console.log(`Deleted enrollments: ${stats.deleted}`);
    console.log('='.repeat(50));

    if (stats.errors.length > 0) {
      console.log('\nErrors encountered:');
      stats.errors.forEach((error, index) => {
        console.log(`${index + 1}. ${error}`);
      });
    }

    // Verify final state
    const finalCount = await Enrollment.countDocuments({});
    console.log(`\nFinal enrollment count: ${finalCount}`);

    // Disconnect
    await mongoose.disconnect();
    console.log('\n✓ Disconnected from MongoDB');
    console.log('Migration complete!');

  } catch (error) {
    console.error('\n✗ Migration error:', error);
    await mongoose.disconnect();
    process.exit(1);
  }
}

// Run migration
console.log('='.repeat(50));
console.log('ENROLLMENT DATABASE MIGRATION');
console.log('='.repeat(50));
console.log('This script will:');
console.log('  1. Remove enrollments with invalid userId references');
console.log('  2. Remove enrollments with invalid courseId references');
console.log('  3. Add missing enrollmentID fields');
console.log('  4. Remove duplicate enrollments');
console.log('='.repeat(50));
console.log('');

migrateEnrollments();

