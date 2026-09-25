import { pgTable, uuid, varchar, text, integer, boolean, date, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users';

export const genderEnum = pgEnum('gender', ['Male', 'Female', 'Other']);
export const maritalStatusEnum = pgEnum('marital_status', ['Never Married', 'Divorced', 'Widowed', 'Awaiting Divorce']);
export const educationLevelEnum = pgEnum('education_level', ['Bachelors', 'Masters', 'Doctorate', 'Diploma', 'High School']);
export const employmentStatusEnum = pgEnum('employment_status', ['Employed', 'Business Owner', 'Freelancer', 'Not Working']);
export const companySectorEnum = pgEnum('company_sector', ['Private', 'Govt', 'MNC', 'Startup', 'Business']);
export const photoPrivacyEnum = pgEnum('photo_privacy', ['blurred', 'accepted', 'visible']);

export const profiles = pgTable('profiles', {
  id: uuid('id').defaultRandom().primaryKey(),
  userId: uuid('user_id').references(() => users.id, { onDelete: 'cascade' }).notNull().unique(),

  // Profile Ownership & Basic Identity
  createdBy: varchar('created_by', { length: 20 }).default('self').notNull(), // 'self' or 'staff'
  profileFor: varchar('profile_for', { length: 20 }).notNull(), // Myself, Son, Daughter, Brother, Sister, Relative, Friend
  fullName: varchar('full_name', { length: 100 }).notNull(),
  gender: genderEnum('gender').notNull(),
  dob: date('dob').notNull(),
  maritalStatus: maritalStatusEnum('marital_status').notNull(),

  // Conditional Children Fields (Triggered only if Divorced/Widowed)
  hasChildren: boolean('has_children').default(false),
  childrenCount: integer('children_count').default(0),
  childrenLivingWithMe: boolean('children_living_with_me'), // true = Yes, false = No

  // Physical Attributes & Bio
  heightCm: integer('height_cm'),
  aboutMe: text('about_me'),
  weightKg: integer('weight_kg'),
  complexion: varchar('complexion', { length: 50 }),
  disability: text('disability'),

  // Location
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  country: varchar('country', { length: 100 }).default('India').notNull(),
  citySlug: varchar('city_slug', { length: 120 }),
  willingToRelocate: varchar('willing_to_relocate', { length: 50 }),

  // Community & Background
  religion: varchar('religion', { length: 50 }).notNull(),
  caste: varchar('caste', { length: 100 }).notNull(),
  communitySlug: varchar('community_slug', { length: 120 }),
  subcaste: varchar('subcaste', { length: 100 }),
  gotra: varchar('gotra', { length: 100 }),
  motherTongue: varchar('mother_tongue', { length: 50 }).notNull(),

  // Education & Career Details (flat — no catalog FKs; reference package is SoT for dropdowns)
  educationLevel: educationLevelEnum('education_level'),
  degree: varchar('degree', { length: 150 }),
  collegeName: varchar('college_name', { length: 200 }),
  employmentStatus: employmentStatusEnum('employment_status'),
  profession: varchar('profession', { length: 150 }),
  companyName: varchar('company_name', { length: 150 }),
  companySector: companySectorEnum('company_sector'),
  annualIncome: varchar('annual_income', { length: 50 }),

  // Privacy Settings
  photoPrivacy: photoPrivacyEnum('photo_privacy').default('blurred').notNull(),

  /**
   * Denormalized Layer-B completeness: true when every required Discover field
   * is filled (see @astalakshimi/validation requiredFieldsComplete). Maintained
   * on profile / lifestyle / horoscope / photo writes.
   */
  requiredComplete: boolean('required_complete').default(false).notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  searchIdx: index('profiles_search_idx').on(table.gender, table.religion, table.caste, table.city),
  dobIdx: index('profiles_dob_idx').on(table.dob),
  requiredCompleteIdx: index('profiles_required_complete_idx').on(table.requiredComplete),
  discoverIdx: index('profiles_discover_idx').on(table.gender, table.requiredComplete, table.createdAt),
}));

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
