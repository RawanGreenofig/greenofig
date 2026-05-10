// Admin curation lives in admin chrome, but uses the SAME page body
// as the nutritionist version — both edit the same `products` table.
// Re-export keeps logic in one place; the layout-level requireRole()
// gates this route to admins separately from the nutritionist one.
export { default } from '@/app/[locale]/nutritionist/store/page'
