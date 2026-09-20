/**
 * Thin re-exports so UI code can import from `@/lib/identity-fields`.
 * Canonical logic lives in `@astalakshimi/validation` (shared with API).
 */
export {
  maritalAsksChildren,
  resolveChildrenFields,
  MARITAL_STATUSES_WITH_CHILDREN as MARITAL_WITH_CHILDREN,
  MARITAL_STATUS_VALUES,
} from "@astalakshimi/validation"
