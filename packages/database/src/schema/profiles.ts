import { pgTable, uuid, varchar, text, integer, boolean, date, timestamp, pgEnum, index } from 'drizzle-orm/pg-core';
import { users } from './users';
import { educationLevels, specializations } from './educations';
import { occupations, companies } from './careers';

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
  heightCm: integer('height_cm').notNull(), // From scrollable wheel / visual slider
  aboutMe: text('about_me'), // Generated via Bio Builder prompts and editable

  // Location
  city: varchar('city', { length: 100 }).notNull(),
  state: varchar('state', { length: 100 }).notNull(),
  country: varchar('country', { length: 100 }).default('India').notNull(),

  // Community & Background
  religion: varchar('religion', { length: 50 }).notNull(),
  caste: varchar('caste', { length: 100 }).notNull(),
  subcaste: varchar('subcaste', { length: 100 }),
  gotra: varchar('gotra', { length: 100 }),
  motherTongue: varchar('mother_tongue', { length: 50 }).notNull(),

  // Education & Career Details
  educationId: integer('education_id').references(() => educationLevels.id),
  specializationId: integer('specialization_id').references(() => specializations.id),
  educationLevel: educationLevelEnum('education_level'),
  degree: varchar('degree', { length: 150 }),
  collegeName: varchar('college_name', { length: 200 }),
  employmentStatus: employmentStatusEnum('employment_status'),
  occupationId: integer('occupation_id').references(() => occupations.id),
  profession: varchar('profession', { length: 150 }),
  companyId: integer('company_id').references(() => companies.id),
  companyName: varchar('company_name', { length: 150 }),
  companySector: companySectorEnum('company_sector'),
  annualIncome: varchar('annual_income', { length: 50 }),

  // Privacy Settings
  photoPrivacy: photoPrivacyEnum('photo_privacy').default('blurred').notNull(),

  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  searchIdx: index('profiles_search_idx').on(table.gender, table.religion, table.caste, table.city),
  dobIdx: index('profiles_dob_idx').on(table.dob),
}));

export type Profile = typeof profiles.$inferSelect;
export type NewProfile = typeof profiles.$inferInsert;
