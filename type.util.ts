// ! REMEMBER TO ALWAYS GENERATE TYPES USING @svene/openapi-ts-cli init and start
import { components } from './types';

/***
 * Represents the keys of the schemas property in the components object.
 * This type alias refers to the table names defined in your database schema.
 * For instance, if components["schemas"] has the keys "users" and "orders", type ExampleTableNames = "users" | "orders".
 ***/
export type TableNames = keyof components['schemas'];

/***
 * Refers to the view names within the schemas property in the components object.
 * Use this type alias to access the view names defined in your database schema.
 * Example: If components["schemas"] includes "userView" and "orderView", type ExampleViewNames = "userView" | "orderView".
 ***/
export type ViewNames = keyof components['schemas'];

/***
 * Maps a generic type `T`, constrained to `TableNames`, to the corresponding schema within components["schemas"].
 * Useful for accessing the schema of a specific table.
 * Example: If components["schemas"]["users"] is { id: number; name: string }, type ExampleUsersTable = { id: number; name: string }.
 ***/
export type Tables<T extends TableNames> = components['schemas'][T];

/***
 * Maps a generic type `T`, constrained to `ViewNames`, to the corresponding schema within components["schemas"].
 * Facilitates access to the schema of a specific view.
 * Example: If components["schemas"]["userView"] is { id: number; viewProp: string }, type ExampleUserView = { id: number; viewProp: string }.
 ***/
export type Views<T extends ViewNames> = components['schemas'][T];

/***
 * Represents either `TableNames` or `ViewNames`.
 * Provides a unified way to refer to both table and view names.
 * Example: If TableNames are "users", "orders" and ViewNames is "userView", type ExampleTableOrViewNames = "users" | "orders" | "userView".
 ***/
export type TableOrViewNames = TableNames | ViewNames;

/***
 * Conditional type that maps table or view names to their respective types.
 * Determines whether a name corresponds to a table or a view and maps it to the appropriate schema type.
 * Example: type ExampleTableTypeUsers = TableType<"users"> if `T` is a table name.
 * type ExampleTableTypeUserView = TableType<"userView"> if `T` is a view name.
 ***/
export type TableType<T extends TableOrViewNames> = T extends TableNames
  ? Tables<T>
  : Views<Extract<T, ViewNames>>;

/***
 * Represents a JSON value. It can be a string, number, boolean, null, an object with string keys and JSON values, or an array of JSON values.
 * Useful for representing any JSON-compatible data structure.
 * Example: Json can be a string like "hello", a number like 123, an object like { "key": "value" }, or an array like [1, 2, 3].
 ***/
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

/***
 * Defines the structure of the database, covering tables and views along with their rows, inserts, and updates.
 * This interface provides a comprehensive schema definition for the database, enabling structured access to table and view data.
 * Example:
 * type ExampleDatabaseSchema = {
 *   Tables: {
 *     users: { Row: { id: number; name: string }, Insert: { id?: number; name?: string }, Update: { id?: number; name?: string } },
 *     orders: { Row: { id: number; product: string }, Insert: { id?: number; product?: string }, Update: { id?: number; product?: string } }
 *   },
 *   Views: {
 *     userView: { Row: { id: number; viewProp: string } }
 *   }
 * }
 ***/
type DatabaseSchema = {
  Tables: {
    [K in TableNames]: {
      Row: Tables<K>;
      Insert: Partial<Tables<K>>;
      Update: Partial<Tables<K>>;
    };
  };
  Views: {
    [K in ViewNames]: {
      Row: Views<K>;
    };
  };
};

/***
 * Represents the row structure of a table identified by `T`.
 * Use this type alias to access the row type of a specific table.
 * Example: If `T` is "users", type ExampleTableRowUsers = TableRow<"users"> gives { id: number; name: string }.
 ***/
export type TableRow<T extends TableNames> = DatabaseSchema['Tables'][T]['Row'];

/***
 * Represents the insert structure of a table identified by `T`.
 * Access the insert type of a specific table with this type alias.
 * Example: If `T` is "users", type ExampleTableInsertUsers = TableInsert<"users"> results in { id?: number; name?: string }.
 ***/
export type TableInsert<T extends TableNames> =
  DatabaseSchema['Tables'][T]['Insert'];

/***
 * Represents the update structure of a table identified by `T`.
 * This type alias allows access to the update type of a specific table.
 * Example: If `T` is "users", type ExampleTableUpdateUsers = TableUpdate<"users"> provides { id?: number; name?: string }.
 ***/
export type TableUpdate<T extends TableNames> =
  DatabaseSchema['Tables'][T]['Update'];

/***
 * Represents the row structure of a view identified by `T`.
 * Enables access to the row type of a specific view.
 * Example: If `T` is "userView", type ExampleViewRowUserView = ViewRow<"userView"> yields { id: number; viewProp: string }.
 ***/
export type ViewRow<T extends ViewNames> = DatabaseSchema['Views'][T]['Row'];

/***
 * Maps a generic type `K`, constrained to `TableNames` or `ViewNames`, to the corresponding schema within components["schemas"].
 * Provides a unified way to access schemas for both tables and views.
 * Example: If `K` is "users", type ExampleSchemaTypeUsers = SchemaType<"users"> maps to the users table schema.
 ***/
export type SchemaType<K extends TableNames | ViewNames> =
  components['schemas'][K];
