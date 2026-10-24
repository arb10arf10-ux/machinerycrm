// Shared TypeScript database types for Machinery CRM Phase 1.
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]
type Table<Row, Insert = Partial<Row>> = { Row: Row; Insert: Insert; Update: Partial<Insert>; Relationships: [] }
type Profile = { id:string; email:string; full_name:string|null; role:'admin'|'sales'|'service'|'parts'|'operations'|'viewer'; avatar_url:string|null; is_active:boolean; branch_id:string|null; can_view_all_branches:boolean; created_at:string; updated_at:string }
type Location = { id:string; code:string; name:string; type:string; address_line1:string|null; address_line2:string|null; city:string|null; state:string|null; postal_code:string|null; country:string|null; is_active:boolean; created_at:string; updated_at:string }
type Account = { id:string; name:string; account_type:'customer'|'prospect'|'dealer'|'internal'; owner_id:string|null; billing_address_line1:string|null; billing_city:string|null; billing_state:string|null; billing_postal_code:string|null; billing_country:string|null; phone:string|null; website:string|null; notes:string|null; is_active:boolean; created_at:string; updated_at:string }
type Contact = { id:string; account_id:string; first_name:string; last_name:string|null; email:string|null; phone:string|null; title:string|null; is_primary:boolean; created_at:string; updated_at:string }
type Site = { id:string; account_id:string; name:string; address_line1:string|null; city:string|null; state:string|null; postal_code:string|null; country:string|null; notes:string|null; created_at:string; updated_at:string }
type Asset = { id:string; serial_number:string; internal_id:string|null; make:string|null; model:string|null; year:number|null; category:string|null; status:'available'|'rented'|'sold'|'in_service'|'reserved'|'retired'|'in_transit'; location_id:string|null; current_account_id:string|null; hour_meter:number|null; purchase_date:string|null; purchase_cost:number|null; notes:string|null; is_active:boolean; created_at:string; updated_at:string }
type Opportunity = { id:string; name:string; account_id:string; owner_id:string|null; branch_id:string|null; order_id:string|null; stage:'lead'|'qualified'|'proposal'|'negotiation'|'won'|'lost'; opportunity_type:'sale'|'rental'|'service'|'parts'; amount:number|null; probability:number|null; expected_close_date:string|null; asset_id:string|null; description:string|null; lost_reason:string|null; created_at:string; updated_at:string }
type Activity = { id:string; activity_type:'note'|'call'|'email'|'meeting'|'task'|'status_change'|'system'; subject:string|null; body:string|null; account_id:string|null; opportunity_id:string|null; asset_id:string|null; created_by:string|null; due_at:string|null; completed_at:string|null; created_at:string }
type Order = { id:string; order_number:number; branch_id:string; account_id:string; created_by:string; process:'sale'|'rental'|'service'|'parts'|'other'; status:'pending'|'in_progress'|'fulfilled'|'cancelled'; total_amount:number; notes:string|null; expected_completion_date:string|null; rental_start_date:string|null; rental_end_date:string|null; created_at:string; updated_at:string }
type OrderPayment = { id:string; order_id:string; amount:number; paid_at:string; notes:string|null; recorded_by:string; created_at:string }
export type Database = {
 public: {
  Tables: {
   profiles: Table<Profile, {id:string;email:string;full_name?:string|null;role?:Profile['role'];avatar_url?:string|null;is_active?:boolean}>
   locations: Table<Location, {code:string;name:string;type?:string;address_line1?:string|null;address_line2?:string|null;city?:string|null;state?:string|null;postal_code?:string|null;country?:string|null;is_active?:boolean}>
   accounts: Table<Account, {name:string;account_type?:Account['account_type'];owner_id?:string|null;billing_address_line1?:string|null;billing_city?:string|null;billing_state?:string|null;billing_postal_code?:string|null;billing_country?:string|null;phone?:string|null;website?:string|null;notes?:string|null;is_active?:boolean}>
   contacts: Table<Contact, {account_id:string;first_name:string;last_name?:string|null;email?:string|null;phone?:string|null;title?:string|null;is_primary?:boolean}>
   sites: Table<Site, {account_id:string;name:string;address_line1?:string|null;city?:string|null;state?:string|null;postal_code?:string|null;country?:string|null;notes?:string|null}>
   assets: Table<Asset, {serial_number:string;internal_id?:string|null;make?:string|null;model?:string|null;year?:number|null;category?:string|null;status?:Asset['status'];location_id?:string|null;current_account_id?:string|null;hour_meter?:number|null;purchase_date?:string|null;purchase_cost?:number|null;notes?:string|null;is_active?:boolean}>
   opportunities: Table<Opportunity, {name:string;account_id:string;owner_id?:string|null;branch_id?:string|null;order_id?:string|null;stage?:Opportunity['stage'];opportunity_type?:Opportunity['opportunity_type'];amount?:number|null;probability?:number|null;expected_close_date?:string|null;asset_id?:string|null;description?:string|null;lost_reason?:string|null}>
   activities: Table<Activity, {activity_type?:Activity['activity_type'];subject?:string|null;body?:string|null;account_id?:string|null;opportunity_id?:string|null;asset_id?:string|null;created_by?:string|null;due_at?:string|null;completed_at?:string|null}>
   orders: Table<Order, {branch_id:string;account_id:string;created_by?:string;process?:Order['process'];status?:Order['status'];total_amount?:number;notes?:string|null;expected_completion_date?:string|null;rental_start_date?:string|null;rental_end_date?:string|null}>
   order_payments: Table<OrderPayment, {order_id:string;amount:number;paid_at?:string;notes?:string|null;recorded_by?:string}>
   catalog_categories: Table<{id:string;code:string;name:string;item_type:'machine'|'part';description:string|null;is_active:boolean;created_at:string;updated_at:string},{code:string;name:string;item_type:'machine'|'part';description?:string|null;is_active?:boolean}>
   catalog_items: Table<{id:string;item_code:string;item_type:'machine'|'part';name:string;category_id:string|null;make:string|null;model:string|null;description:string|null;unit:string;cost_price:number|null;sale_price:number|null;is_active:boolean;created_at:string;updated_at:string},{item_code:string;item_type:'machine'|'part';name:string;category_id?:string|null;make?:string|null;model?:string|null;description?:string|null;unit?:string;cost_price?:number|null;sale_price?:number|null;is_active?:boolean}>
  }
  Views: Record<string, never>
  Functions: Record<string, never>
  Enums: {user_role:Profile['role'];account_type:Account['account_type'];asset_status:Asset['status'];opportunity_stage:Opportunity['stage'];opportunity_type:Opportunity['opportunity_type'];activity_type:Activity['activity_type']}
  CompositeTypes: Record<string, never>
 }
}
export type Tables<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Row']
export type Inserts<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Insert']
export type Updates<T extends keyof Database['public']['Tables']> = Database['public']['Tables'][T]['Update']
