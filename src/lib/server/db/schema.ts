import { sqliteTable, integer, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';

const table_prefix = 'luukahead_'; // luuk ahead

export const user = sqliteTable(`${table_prefix}user`, {
    id: text('id').primaryKey(),
    age: integer('age'),
    username: text('username').notNull().unique(),
    passwordHash: text('password_hash').notNull()
});
export type User = typeof user.$inferSelect;


export const session = sqliteTable(`${table_prefix}session`, {
    id: text('id').primaryKey(),
    userId: text('user_id').notNull().references(() => user.id as any),
    expiresAt: integer('expires_at', { mode: 'timestamp' }).notNull()
});
export type Session = typeof session.$inferSelect;


// New: projects table so users can own distinct projects
export const project = sqliteTable(`${table_prefix}project`, {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    ownerId: text('owner_id').notNull().references(() => user.id as any),
    createdAt: integer('created_at', { mode: 'timestamp' }).notNull().default(sql`(strftime('%s','now'))`)
});
export type Project = typeof project.$inferSelect;


/**
 * Configurable hierarchy types (scoped to a project)
 */
export const item_types = sqliteTable(`${table_prefix}item_types`, {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references((): any => project.id),
    name: text('name').notNull(),    // uniqueness per project enforced at app level or via composite constraint later
    order: integer('order').default(0),
    color: text('color')
});
export type ItemType = typeof item_types.$inferSelect;


/**
 * Configurable priorities (scoped to a project)
 */
export const priorities = sqliteTable(`${table_prefix}priorities`, {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references((): any => project.id),
    name: text('name').notNull(),
    order: integer('order').default(0),
    color: text('color')
});
export type Priority = typeof priorities.$inferSelect;


/**
 * Main hierarchical work items
 */
// Circular refs between tables (work_items.parent -> work_items.id) can confuse TS inference in this file.
// The runtime behaviour and drizzle types are correct; suppress the linter warning here.
// eslint-disable-next-line @typescript-eslint/ban-ts-comment
// @ts-ignore: circular type inference between tables
export const work_items = sqliteTable(`${table_prefix}work_items`, {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull().references(() => project.id as any),
    parent_id: text('parent_id').references(((): any => work_items.id), { onDelete: 'cascade' }),
    type_id: text('type_id').references(() => item_types.id as any),
    priority_id: text('priority_id').references(() => priorities.id as any),
    title: text('title').notNull(),
    description: text('description'),
    remarks: text('remarks'),
    deadline: integer('deadline', { mode: 'timestamp' }),
    owner_id: text('owner_id').references(() => user.id as any),
    // mark an item as the root item for a project (0/1 stored as integer)
    is_root: integer('is_root').default(0),
    // mark whether the item is completed (0/1)
    completed: integer('completed').default(0),
    created_at: integer('created_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(strftime('%s','now'))`),
    updated_at: integer('updated_at', { mode: 'timestamp' })
        .notNull()
        .default(sql`(strftime('%s','now'))`)
});
export type WorkItem = typeof work_items.$inferSelect;


/**
 * Visibility control (who can view the work item)
 * Use user_id (references users) rather than username text to be robust
 */
export const work_item_visibility = sqliteTable(
    `${table_prefix}work_item_visibility`,
    {
        work_item_id: text('work_item_id')
            .notNull()
            .references(() => work_items.id, { onDelete: 'cascade' }),
        user_id: text('user_id').notNull().references(() => user.id)
    },
    (t) => ({
        pk: primaryKey({ columns: [t.work_item_id, t.user_id] })
    })
);
export type WorkItemVisibility = typeof work_item_visibility.$inferSelect;
